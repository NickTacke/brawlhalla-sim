import { describe, expect, test } from 'bun:test'
import { Button, TICK_RATE, TIMESTEP_MS } from '../index'

describe('@brawlhalla-sim/core public interface', () => {
  test('exports runtime button values', () => {
    expect(Button.Jump).toBe(1 << 4)
  })

  test('exports the 16 ms deterministic simulation clock', () => {
    expect(TIMESTEP_MS).toBe(16)
    expect(TICK_RATE).toBe(62.5)
  })
})
