export type {
  Entity,
  EntitySnapshot,
  Facing,
  FrameInput,
  LegendPhysics,
  Power,
  SimConfig,
  SimEvent,
  SimResult,
} from './src/types.js'
export {
  Button,
  GRAVITY,
  JUMP_X_IMPULSE,
  MAX_FALL_SPEED_LADDER,
  PHYSICS_MULTIPLIER,
  TIMESTEP_MS,
  TICK_RATE,
} from './src/types.js'
export type { MoveState } from './src/physics/movement.js'
export {
  applyDodge,
  applyGravity,
  applyJump,
  applyRun,
  fallSpeed,
  jumpYImpulse,
  maxFallSpeed,
} from './src/physics/movement.js'
export { computeKnockback } from './src/physics/knockback.js'
export { createEntity, moveStateOf, stepMovement, writeMoveState } from './src/sim/entity.js'
export { inputsToFrames } from './src/sim/input.js'
export { applyScore, detectKos } from './src/sim/ko.js'
export type { EngineOptions } from './src/sim/engine.js'
export { runSim } from './src/sim/engine.js'
