// Fighter entity state — position, velocity, damage, stocks, facing.
// Pure state + accessors; physics mutations live in physics/movement.ts.

import { type MoveState, applyDodge, applyGravity, applyJump, applyRun } from '../physics/movement.js'
import type { LegendPhysics } from '../types.js'
import { Button, type Entity, type FrameInput } from '../types.js'

export function createEntity(opts: {
  id: number
  heroId: number
  name: string
  team: number
  isBot: boolean
  x: number
  y: number
  lives: number
}): Entity {
  return {
    id: opts.id,
    heroId: opts.heroId,
    name: opts.name,
    team: opts.team,
    isBot: opts.isBot,
    x: opts.x,
    y: opts.y,
    vx: 0,
    vy: 0,
    grounded: false,
    facing: 1,
    damage: 0,
    lives: opts.lives,
    ko: false,
    lastInputMask: 0,
    airborneFrames: 0,
    jumpsUsed: 0,
    dodging: false,
    dodgeFrames: 0,
  }
}

/** Pull the move-state view out of an entity (mutations write back). */
export function moveStateOf(e: Entity): MoveState {
  return {
    x: e.x,
    y: e.y,
    vx: e.vx,
    vy: e.vy,
    grounded: e.grounded,
    facing: e.facing,
    dodging: e.dodging,
    dodgeFrames: e.dodgeFrames,
  }
}

/** Write a mutated move-state back into the entity. */
export function writeMoveState(e: Entity, s: MoveState): void {
  e.x = s.x
  e.y = s.y
  e.vx = s.vx
  e.vy = s.vy
  e.grounded = s.grounded
  e.facing = s.facing
  e.dodging = s.dodging
  e.dodgeFrames = s.dodgeFrames
}

/** Advance one frame of movement for an entity (no combat yet). */
export function stepMovement(
  e: Entity,
  physics: LegendPhysics,
  input: FrameInput,
  onGround: (e: Entity) => boolean,
): void {
  const s = moveStateOf(e)
  if (s.dodgeFrames > 0) {
    s.dodgeFrames--
    if (s.dodgeFrames === 0) s.dodging = false
  }

  const grounded = onGround(e)
  s.grounded = grounded

  if (grounded) {
    e.airborneFrames = 0
    e.jumpsUsed = 0
    if (s.vy > 0) s.vy = 0
  } else {
    e.airborneFrames++
    if (!s.dodging) applyGravity(s, physics.stats.weight, (input.mask & Button.Down) !== 0)
  }

  applyDodge(s, physics, input, false)

  if (!s.dodging) {
    if ((input.pressed & Button.Jump) !== 0 && grounded) {
      applyJump(s, physics)
      e.jumpsUsed = 1
    }
    applyRun(s, physics, input)
  }

  writeMoveState(e, s)
}
