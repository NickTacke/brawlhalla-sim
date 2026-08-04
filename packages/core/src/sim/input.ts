// Input adapter: replay input section -> per-frame button masks.
//
// The replay records timestamp-indexed snapshots (ms). To feed the 60fps sim
// we convert ms to frames and build a per-frame mask per entity. Between
// snapshots the held state is interpolated (a held button stays held until a
// snapshot releases it) — matches how the game's rollback sim reads inputs.

import { type InputSection, REPLAY_TIME_QUANTUM_MS } from '@brawlhalla-sim/replay-format'
import type { FrameInput } from '../types.js'

type InputEvent = {
  frame: number
  changed: FrameInput
  held: FrameInput
}

type EntityTimeline = {
  entityId: number
  events: InputEvent[]
}

function eventAtOrBefore(events: InputEvent[], frame: number): InputEvent | undefined {
  let low = 0
  let high = events.length - 1
  let match: InputEvent | undefined

  while (low <= high) {
    const middle = Math.floor((low + high) / 2)
    const event = events[middle]
    if (event.frame <= frame) {
      match = event
      low = middle + 1
    } else {
      high = middle - 1
    }
  }

  return match
}

/**
 * Convert an input section into per-frame maps. Returns a structure with
 * `get(frame)` -> Map<entityId, FrameInput> and `maxFrame`.
 */
export function inputsToFrames(inputs: InputSection): {
  get: (frame: number) => Map<number, FrameInput> | undefined
  maxFrame: number
} {
  const timelines: EntityTimeline[] = []
  let maxFrame = -1

  for (const entity of inputs.entities) {
    const events: InputEvent[] = []
    let previousMask = 0
    let previousTimestampMs = -1

    for (const snapshot of entity.snapshots) {
      if (snapshot.timestampMs < 0 || snapshot.timestampMs % REPLAY_TIME_QUANTUM_MS !== 0) {
        throw new RangeError(`input timestamp ${snapshot.timestampMs} is not aligned to the 16 ms replay clock`)
      }
      if (snapshot.timestampMs <= previousTimestampMs) {
        throw new RangeError(`input timestamps must be strictly increasing for entity ${entity.entityId}`)
      }

      const frame = snapshot.timestampMs / REPLAY_TIME_QUANTUM_MS
      const changed: FrameInput = {
        mask: snapshot.mask,
        pressed: snapshot.mask & ~previousMask,
        released: previousMask & ~snapshot.mask,
      }
      events.push({
        frame,
        changed,
        held: { mask: snapshot.mask, pressed: 0, released: 0 },
      })
      previousMask = snapshot.mask
      previousTimestampMs = snapshot.timestampMs
      maxFrame = Math.max(maxFrame, frame)
    }

    timelines.push({ entityId: entity.entityId, events })
  }

  return {
    get: (frame) => {
      const inputsAtFrame = new Map<number, FrameInput>()
      for (const timeline of timelines) {
        const event = eventAtOrBefore(timeline.events, frame)
        if (event) inputsAtFrame.set(timeline.entityId, event.frame === frame ? event.changed : event.held)
      }
      return inputsAtFrame.size > 0 ? inputsAtFrame : undefined
    },
    maxFrame,
  }
}
