import { describe, expect, test } from 'bun:test'
import { computeKnockback } from '../src/physics/knockback'
import type { LegendPhysics, Power } from '../src/types'

const lucien = (): LegendPhysics => ({
  heroId: 3,
  stats: { strength: 3, dexterity: 6, weight: 5, speed: 5 },
  physics: {
    impulseMult: 0.95,
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
  },
})

const bodvar = (): LegendPhysics => ({
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
  },
})

const pistolAir = (): Power => ({
  powerId: 1,
  powerName: 'PistolAir',
  baseDamage: 8,
  fixedImpulse: 0,
  variableImpulse: 12,
  minimumImpulse: 0,
  castTime: '',
  recoverTime: '',
  fixedRecoverTime: '',
  fixedStunTime: 0,
  cooldownTime: 0,
  onHitCooldownTime: 0,
  aoeRadiusX: 0,
  aoeRadiusY: 0,
  isAirPower: true,
  isSignature: false,
  isMultihit: false,
  isAntiair: false,
  endOnHit: false,
  cancelGravity: false,
  wallCancel: false,
  hurtboxName: null,
})

const swordNeutral = (): Power => ({
  ...pistolAir(),
  powerName: 'SwordNeutral',
  baseDamage: 8,
  variableImpulse: 21,
})

describe('provisional knockback seed formula', () => {
  test('PistolAir at 0% — matches measured 379.5', () => {
    const r = computeKnockback({ power: pistolAir(), damage: 0, attacker: lucien(), victimWeight: 5 })
    expect(r.force).toBeCloseTo((170 + 12 * 19) * 0.95, 0) // 378.1 ≈ measured 379.5
  })

  test('PistolAir damage scaling: +54.4 per damage point', () => {
    const d0 = computeKnockback({ power: pistolAir(), damage: 0, attacker: lucien(), victimWeight: 5 })
    const d10 = computeKnockback({ power: pistolAir(), damage: 10, attacker: lucien(), victimWeight: 5 })
    const d20 = computeKnockback({ power: pistolAir(), damage: 20, attacker: lucien(), victimWeight: 5 })
    // Slopes between measured points: 54.4 / 54.5
    expect((d10.force - d0.force) / 10).toBeCloseTo(54.4, 1)
    expect((d20.force - d10.force) / 10).toBeCloseTo(54.4, 1)
  })

  test('SwordNeutral cross-validates: (170 + 21×19) × 1.074 ≈ 607', () => {
    const r = computeKnockback({ power: swordNeutral(), damage: 0, attacker: bodvar(), victimWeight: 5 })
    expect(r.force).toBeCloseTo((170 + 21 * 19) * 1.074, 0) // 611 ≈ measured 607
  })

  test('clamps at MaxFallSpeed for heavy damage', () => {
    const r = computeKnockback({ power: pistolAir(), damage: 999, attacker: lucien(), victimWeight: 5 })
    expect(r.velocity).toBeLessThanOrEqual(890.79)
    expect(r.velocity).toBeGreaterThan(0)
  })

  test('applies match damage multiplier', () => {
    const base = computeKnockback({ power: pistolAir(), damage: 0, attacker: lucien(), victimWeight: 5 })
    const x2 = computeKnockback({
      power: pistolAir(),
      damage: 0,
      attacker: lucien(),
      victimWeight: 5,
      damageMultiplier: 2,
    })
    expect(x2.force).toBeCloseTo(base.force * 2, 3)
  })
})
