import { describe, expect, test } from 'bun:test'
import { applyGravity, applyJump, applyRun, fallSpeed, jumpYImpulse, maxFallSpeed } from '../src/physics/movement'
import type { MoveState } from '../src/physics/movement'
import { createEntity, moveStateOf, stepMovement } from '../src/sim/entity'
import { Button, GRAVITY, JUMP_X_IMPULSE, MAX_FALL_SPEED_LADDER } from '../src/types'
import type { FrameInput, LegendPhysics } from '../src/types'

const makePhysics = (over: Partial<LegendPhysics['physics']> = {}): LegendPhysics => ({
  heroId: 3,
  stats: { strength: 6, dexterity: 6, weight: 5, speed: 5 },
  physics: {
    impulseMult: 1.074,
    recovery: 8.4353,
    runSpeed: 42.74,
    jumpXImpulse: 13.8,
    acceleration: 7.5,
    friction: 3.4,
    airRunSpeed: 34.4,
    airAcceleration: 5.8,
    airFriction: 2.1,
    recoverMod: 1.4,
    sigRecoverMod: 1.1,
    minChargeMod: 1.1,
    durabilityMod: 5.9,
    ...over,
  },
})

const input = (mask: number): FrameInput => ({ mask, pressed: 0, released: 0 })

const moveState = (over: Partial<MoveState> = {}): MoveState => ({
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  grounded: false,
  facing: 1,
  dodging: false,
  dodgeFrames: 0,
  ...over,
})

describe('gravity', () => {
  test('accelerates downward in the level coordinate system', () => {
    const s = moveState()
    applyGravity(s)
    expect(s.vy).toBeCloseTo(-GRAVITY, 5)
  })

  test('clamps at MaxFallSpeed (never exceeds fall speed)', () => {
    const s = moveState({ vy: 900 })
    applyGravity(s)
    expect(s.vy).toBeLessThanOrEqual(MAX_FALL_SPEED_LADDER[0][0])
  })
})

describe('jump', () => {
  test('preserves the provisional vertical impulse (97.2)', () => {
    const s = moveState()
    applyJump(s, makePhysics())
    expect(s.vy).toBeCloseTo(-jumpYImpulse(makePhysics()), 5)
    expect(s.grounded).toBe(false)
  })

  test('moves away from a floor whose surface is below the fighter', () => {
    const entity = createEntity({
      id: 1,
      heroId: 3,
      name: 'Bödvar',
      team: 1,
      isBot: false,
      x: 0,
      y: 0,
      lives: 3,
    })
    const jumpInput: FrameInput = { mask: Button.Jump, pressed: Button.Jump, released: 0 }

    stepMovement(entity, makePhysics(), jumpInput, (fighter) => fighter.y >= 0 && fighter.vy >= 0)
    entity.y += entity.vy

    expect(entity.y).toBeLessThan(0)
  })

  test('jump X impulse matches the source-derived 13.8', () => {
    expect(JUMP_X_IMPULSE).toBe(13.8)
  })
})

describe('fall speed ladder', () => {
  test('preserves the provisional normal and fast-fall ladder', () => {
    expect(fallSpeed(0, false)).toBe(822.12)
    expect(fallSpeed(0, true)).toBe(824.46)
    expect(fallSpeed(5, false)).toBe(890.79)
    expect(fallSpeed(5, true)).toBe(893.53)
  })

  test('clamps weight index to the ladder', () => {
    expect(maxFallSpeed(99, false)).toBe(890.79)
    expect(maxFallSpeed(-1, false)).toBe(822.12)
  })

  test('stepMovement uses the entity weight rung', () => {
    const entity = createEntity({
      id: 1,
      heroId: 3,
      name: 'Bödvar',
      team: 1,
      isBot: false,
      x: 0,
      y: -100,
      lives: 3,
    })
    entity.vy = 1000

    stepMovement(entity, makePhysics(), input(0), () => false)

    expect(entity.vy).toBe(MAX_FALL_SPEED_LADDER[5][0])
  })

  test('holding down in air uses the fast-fall cap', () => {
    const entity = createEntity({
      id: 1,
      heroId: 3,
      name: 'Bödvar',
      team: 1,
      isBot: false,
      x: 0,
      y: -100,
      lives: 3,
    })
    entity.vy = 1000

    stepMovement(entity, makePhysics(), input(Button.Down), () => false)

    expect(entity.vy).toBe(MAX_FALL_SPEED_LADDER[5][1])
  })
})

describe('dodge movement', () => {
  test('persists dodge state across movement ticks', () => {
    const entity = createEntity({
      id: 1,
      heroId: 3,
      name: 'Bödvar',
      team: 1,
      isBot: false,
      x: 0,
      y: 0,
      lives: 3,
    })
    const dodgeRight: FrameInput = {
      mask: Button.Dodge | Button.Right,
      pressed: Button.Dodge | Button.Right,
      released: 0,
    }

    stepMovement(entity, makePhysics(), dodgeRight, () => true)
    expect(moveStateOf(entity).dodging).toBe(true)
    expect(moveStateOf(entity).dodgeFrames).toBe(14)
    expect(entity.vx).toBeCloseTo(makePhysics().physics.runSpeed * 0.8818)

    stepMovement(entity, makePhysics(), input(Button.Dodge | Button.Right), () => true)
    expect(moveStateOf(entity).dodgeFrames).toBe(13)

    for (let frame = 0; frame < 13; frame++) {
      stepMovement(entity, makePhysics(), input(Button.Dodge | Button.Right), () => true)
    }
    expect(moveStateOf(entity).dodging).toBe(false)
    expect(moveStateOf(entity).dodgeFrames).toBe(0)
  })
})

describe('run movement', () => {
  test('accelerates toward runSpeed when holding right', () => {
    const s = moveState({ grounded: true })
    applyRun(s, makePhysics(), input(1 << 3)) // Right
    expect(s.vx).toBeGreaterThan(0)
    expect(s.facing).toBe(1)
  })

  test('accelerates left and faces left when holding left', () => {
    const s = moveState({ grounded: true })
    applyRun(s, makePhysics(), input(1 << 2)) // Left
    expect(s.vx).toBeLessThan(0)
    expect(s.facing).toBe(-1)
  })

  test('brakes before reversing direction', () => {
    const movingRight = moveState({ grounded: true, vx: 10 })
    applyRun(movingRight, makePhysics(), input(Button.Left))
    expect(movingRight.vx).toBeLessThan(10)

    const movingLeft = moveState({ grounded: true, vx: -10 })
    applyRun(movingLeft, makePhysics(), input(Button.Right))
    expect(movingLeft.vx).toBeGreaterThan(-10)
  })

  test('friction decays velocity toward zero with no input', () => {
    const s = moveState({ grounded: true, vx: 10 })
    applyRun(s, makePhysics(), input(0))
    expect(Math.abs(s.vx)).toBeLessThan(10)
  })

  test('uses air acceleration while airborne', () => {
    const physics = makePhysics()
    const s = moveState({ grounded: false })

    applyRun(s, physics, input(Button.Right))

    expect(s.vx).toBe(physics.physics.airAcceleration)
  })
})
