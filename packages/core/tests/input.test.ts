import { describe, expect, test } from 'bun:test'
import type { InputSection } from '@brawlhalla-sim/replay-format'
import { inputsToFrames } from '../src/sim/input'

describe('inputsToFrames', () => {
  const sec: InputSection = {
    maxTimestampMs: 32,
    entities: [
      {
        entityId: 1,
        snapshots: [
          { timestampMs: 0, mask: 0 },
          { timestampMs: 16, mask: 1 << 3 }, // right held
          { timestampMs: 32, mask: 1 << 3 },
        ],
      },
    ],
  }

  test('converts replay timestamps to replay ticks', () => {
    const f = inputsToFrames(sec)
    expect(f.maxFrame).toBe(2)
    const f0 = f.get(0)?.get(1)
    expect(f0?.mask).toBe(0)
    const f1 = f.get(1)?.get(1)
    expect(f1?.mask).toBe(1 << 3)
  })

  test('uses the replay stream 16 ms tick', () => {
    const f = inputsToFrames({
      maxTimestampMs: 960,
      entities: [{ entityId: 1, snapshots: [{ timestampMs: 960, mask: 1 << 3 }] }],
    })

    expect(f.maxFrame).toBe(60)
    expect(f.get(60)?.get(1)?.mask).toBe(1 << 3)
  })

  test('computes press edges between consecutive frames', () => {
    const f = inputsToFrames(sec)
    const f1 = f.get(1)?.get(1)
    expect(f1?.pressed).toBe(1 << 3)
    const f2 = f.get(2)?.get(1)
    expect(f2?.pressed).toBe(0) // held, not pressed
    expect(f2?.mask).toBe(1 << 3)
  })

  test('carries held state through sparse snapshots without repeating edges', () => {
    const right = 1 << 3
    const f = inputsToFrames({
      maxTimestampMs: 96,
      entities: [
        {
          entityId: 1,
          snapshots: [
            { timestampMs: 16, mask: right },
            { timestampMs: 96, mask: 0 },
          ],
        },
      ],
    })

    expect(f.get(1)?.get(1)).toEqual({ mask: right, pressed: right, released: 0 })
    for (let frame = 2; frame < 6; frame++) {
      expect(f.get(frame)?.get(1)).toEqual({ mask: right, pressed: 0, released: 0 })
    }
    expect(f.get(6)?.get(1)).toEqual({ mask: 0, pressed: 0, released: right })
  })

  test('carries the final held state through a requested simulation endpoint', () => {
    const f = inputsToFrames(sec)
    expect(f.get(999)?.get(1)).toEqual({ mask: 1 << 3, pressed: 0, released: 0 })
  })

  test('rejects timestamps outside the 16 ms replay clock', () => {
    expect(() =>
      inputsToFrames({
        maxTimestampMs: 17,
        entities: [{ entityId: 1, snapshots: [{ timestampMs: 17, mask: 0 }] }],
      }),
    ).toThrow('16 ms')
  })

  test('rejects non-increasing entity timestamps', () => {
    expect(() =>
      inputsToFrames({
        maxTimestampMs: 16,
        entities: [
          {
            entityId: 1,
            snapshots: [
              { timestampMs: 16, mask: 0 },
              { timestampMs: 16, mask: 1 },
            ],
          },
        ],
      }),
    ).toThrow('strictly increasing')
  })

  test('handles release edges', () => {
    const releaseSec: InputSection = {
      maxTimestampMs: 16,
      entities: [
        {
          entityId: 1,
          snapshots: [
            { timestampMs: 0, mask: 1 << 3 },
            { timestampMs: 16, mask: 0 },
          ],
        },
      ],
    }
    const f = inputsToFrames(releaseSec)
    const f1 = f.get(1)?.get(1)
    expect(f1?.mask).toBe(0)
    expect(f1?.released).toBe(1 << 3)
  })
})
