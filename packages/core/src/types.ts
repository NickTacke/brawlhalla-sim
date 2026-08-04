// Core engine types: deterministic fixed-timestep Brawlhalla physics sim.
//
// All spatial units are game units (the same space as CameraBounds / level
// geometry). Replay playback and this simulator advance in deterministic 16 ms
// ticks. Rendering cadence is outside this engine's contract.

import { type GameSettings, REPLAY_TIME_QUANTUM_MS } from '@brawlhalla-sim/replay-format'

export type LegendPhysics = {
  heroId: number
  stats: { strength: number; dexterity: number; weight: number; speed: number }
  physics: {
    impulseMult: number
    recovery: number
    runSpeed: number
    jumpXImpulse: number
    acceleration: number
    friction: number
    airRunSpeed: number
    airAcceleration: number
    airFriction: number
    recoverMod: number
    sigRecoverMod: number
    minChargeMod: number
    durabilityMod: number
  }
}

export type Power = {
  powerId: number
  powerName: string
  baseDamage: number
  fixedImpulse: number
  variableImpulse: number
  minimumImpulse: number
  castTime: string
  recoverTime: string
  fixedRecoverTime: string
  fixedStunTime: number
  cooldownTime: number
  onHitCooldownTime: number
  aoeRadiusX: number
  aoeRadiusY: number
  isAirPower: boolean
  isSignature: boolean
  isMultihit: boolean
  isAntiair: boolean
  endOnHit: boolean
  cancelGravity: boolean
  wallCancel: boolean
  hurtboxName: string | null
}

/** Deterministic replay/simulation ticks per serialized replay second. */
export const TICK_RATE = 1000 / REPLAY_TIME_QUANTUM_MS
/** Milliseconds per deterministic replay/simulation tick. */
export const TIMESTEP_MS = REPLAY_TIME_QUANTUM_MS
// ---------------------------------------------------------------------------
// Provisional runtime constants. Verified replacements are tracked separately.
// ---------------------------------------------------------------------------

/** Provisional gravity retained from the original scaffold. */
export const GRAVITY = -0.05946

/** Provisional physics multiplier retained for unported consumers. */
export const PHYSICS_MULTIPLIER = 194.4

/**
 * Provisional weight-indexed clamp ladder. These values are not the proven
 * locomotion thresholds and must be replaced before replay-accuracy claims.
 */
export const MAX_FALL_SPEED_LADDER: ReadonlyArray<readonly [number, number]> = [
  [822.12, 824.46], // W0
  [832.45, 834.79], // W1
  [845.13, 846.09], // W2
  [853.12, 855.46], // W3
  [863.45, 865.79], // W4
  [890.79, 893.53], // W5
]

/** Jump X impulse (speed ladder JumpXImpulse — constant across the ladder). */
export const JUMP_X_IMPULSE = 13.8

// ---------------------------------------------------------------------------
// Input / action model
// ---------------------------------------------------------------------------

/** Raw button-state bits from the replay mask (low ~10 bits observed in use). */
export enum Button {
  Up = 1 << 0,
  Down = 1 << 1,
  Left = 1 << 2,
  Right = 1 << 3,
  Jump = 1 << 4,
  Dodge = 1 << 7,
}

/** Per-frame input state for one entity. */
export type FrameInput = {
  /** Raw mask this frame (0 = no buttons held). */
  mask: number
  /** Buttons pressed this frame (present now, absent last frame). */
  pressed: number
  /** Buttons released this frame (absent now, present last frame). */
  released: number
}

export const EMPTY_INPUT: FrameInput = { mask: 0, pressed: 0, released: 0 }

// ---------------------------------------------------------------------------
// Entity / sim state
// ---------------------------------------------------------------------------

export type Facing = 1 | -1

/** Simulated fighter state. */
export type Entity = {
  /** Replay entity id (matches replay Entity.id). */
  id: number
  heroId: number
  name: string
  team: number
  isBot: boolean

  // Position / velocity (game units, velocity per frame).
  x: number
  y: number
  vx: number
  vy: number

  /** Grounded state — on a hard surface (no platform collision yet). */
  grounded: boolean
  /** Facing direction, 1 = right, -1 = left. Derived from input. */
  facing: Facing

  /** Accumulated damage percent (0-999+). */
  damage: number
  /** Stocks remaining (lives). */
  lives: number
  /** KO'd this match (recorded by ko.ts when out of camera bounds). */
  ko: boolean
  /** Last input frame applied (for input diffing). */
  lastInputMask: number
  /** Frames since last ground contact (for jump/double-jump). */
  airborneFrames: number
  /** Jump "gas" — double-jump / aerial availability. */
  jumpsUsed: number
  /** Whether a dodge movement is currently active. */
  dodging: boolean
  /** Remaining active dodge ticks. */
  dodgeFrames: number
}

export type EntitySnapshot = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  damage: number
  grounded: boolean
  facing: Facing
}

export type SimEvent =
  | { type: 'ko'; entityId: number; frame: number }
  | { type: 'score'; entityId: number; score: number; frame: number }

export type SimConfig = {
  /** Game settings from the replay (seed, lives, damage multiplier...). */
  gameSettings: GameSettings
  /** Camera bounds — KO detection boundary (from level geometry). */
  camera: { x: number; y: number; width: number; height: number }
  /** Patch-resolved physics supplied by the caller. */
  /** Patch-resolved physics supplied by the caller. */
  physicsByHeroId: Map<number, LegendPhysics>
}

export type SimResult = {
  /** KO timeline: entity id + frame it left camera bounds. */
  koTimeline: Array<{ entityId: number; frame: number }>
  /** Final scoreboard: entityId -> score. */
  scores: Record<number, number>
  /** Total frames simulated. */
  frameCount: number
}

export type { GameSettings }
