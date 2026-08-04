// Provisional movement scaffold. Proven 10.09 replacements are tracked by the
// AVM2 provenance tool and have not all been ported into this module yet.

import { type FrameInput, GRAVITY, JUMP_X_IMPULSE, type LegendPhysics, MAX_FALL_SPEED_LADDER } from '../types.js'

export type MoveState = {
  x: number
  y: number
  vx: number
  vy: number
  grounded: boolean
  facing: 1 | -1
  /** True when the entity just started a dodge (dodge state consumed). */
  dodging: boolean
  /** Frames remaining in the dodge (0 = not dodging). */
  dodgeFrames: number
}

/** Apply one frame of gravity in the level coordinate system (positive Y is down). */
export function applyGravity(s: MoveState, weight = 0, fastFall = false): void {
  // The dumped gravity constant is negative and the bytecode subtracts it,
  // producing positive downward acceleration in level coordinates.
  s.vy -= GRAVITY
  s.vy = Math.min(s.vy, maxFallSpeed(weight, fastFall))
}

/**
 * Apply the current provisional jump impulse. The verified 10.09 grounded
 * impulse has not yet replaced this deterministic scaffold.
 */
export function applyJump(s: MoveState, physics: LegendPhysics): void {
  const jumpY = jumpYImpulse(physics)
  s.vy = -jumpY
  s.grounded = false
}

/** Vertical jump impulse, derived from the PM chain (PM * 0.5 = 97.2 for the
 * base ladder; the per-stat interpolation is not yet resolved, so we use the
 * base value — validated against replay KO drift later). */
export function jumpYImpulse(_physics: LegendPhysics): number {
  return 97.2
}

/** Horizontal run movement: accel toward runSpeed, capped, with friction when
 * no direction held. */
function moveToward(current: number, target: number, maximumDelta: number): number {
  if (current < target) return Math.min(current + maximumDelta, target)
  if (current > target) return Math.max(current - maximumDelta, target)
  return target
}

export function applyRun(s: MoveState, physics: LegendPhysics, input: FrameInput): void {
  const { runSpeed, acceleration, friction } = s.grounded
    ? physics.physics
    : {
        runSpeed: physics.physics.airRunSpeed,
        acceleration: physics.physics.airAcceleration,
        friction: physics.physics.airFriction,
      }
  const left = (input.mask & 0b0100) !== 0
  const right = (input.mask & 0b1000) !== 0
  const target = right ? runSpeed : left ? -runSpeed : 0
  if (target === 0) {
    s.vx = moveToward(s.vx, 0, friction)
    return
  }

  s.facing = target > 0 ? 1 : -1
  const reversing = s.vx !== 0 && Math.sign(s.vx) !== Math.sign(target)
  const overSpeed = Math.abs(s.vx) > Math.abs(target)
  s.vx = reversing ? moveToward(s.vx, 0, friction) : moveToward(s.vx, target, overSpeed ? friction : acceleration)
}

/** Provisional dodge application from source-derived DodgeTypes values. */
export function applyDodge(s: MoveState, physics: LegendPhysics, input: FrameInput, fast: boolean): boolean {
  // Direction from input.
  const left = (input.mask & 0b0100) !== 0
  const right = (input.mask & 0b1000) !== 0
  const up = (input.mask & 0b0001) !== 0
  const down = (input.mask & 0b0010) !== 0
  if (s.dodgeFrames > 0) return false
  // Dodge only when the input pressed dodge this frame (edge).
  if ((input.pressed & 0b10000000) === 0) return false
  s.dodging = true
  s.dodgeFrames = fast ? 19 : 14
  const dir = right ? 1 : left ? -1 : 0
  if (dir !== 0) {
    s.vx = dir * physics.physics.runSpeed * (fast ? 1.1 : 0.8818)
    s.vy = 0
  } else if (up) {
    s.vy = -physics.physics.runSpeed * (fast ? 0.825 : 0.5859)
  } else if (down) {
    s.vy = physics.physics.runSpeed * (fast ? 0.9 : 0.6963)
  }
  return true
}

/** Max fall speed by weight index (fast-fall = second value). */
export function maxFallSpeed(weight: number, fastFall = false): number {
  const index = Math.max(0, Math.min(MAX_FALL_SPEED_LADDER.length - 1, Math.floor(weight)))
  const pair = MAX_FALL_SPEED_LADDER[index]
  return fastFall ? pair[1] : pair[0]
}

export function fallSpeed(weight: number, fastFall: boolean): number {
  return maxFallSpeed(weight, fastFall)
}

export { JUMP_X_IMPULSE }
