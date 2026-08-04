// Provisional knockback scaffold based on a small live-measured sample.
//
// Seed formula (validated against 2 moves / 3 damage points, live-measured):
//   knockback_force = (170 + total_impulse × 19) × ImpulseMult(Strength)
//   damage scaling:  force = force_0 + 54.4 × damage  (adds to the impulse term)
//   velocity clamps at MaxFallSpeed (~865, Weight-dependent)
//
// The 170/19/54.4 constants remain provisional until a unique runtime
// provenance chain replaces this bounded sample.

import type { LegendPhysics, Power } from '../types.js'
import { maxFallSpeed } from './movement.js'

export type KnockbackInput = {
  /** Power (attack) delivering the hit. */
  power: Power
  /** Accumulated damage of the victim (0-999+). */
  damage: number
  /** Attacker physics (for ImpulseMult from Strength). */
  attacker: LegendPhysics
  /** Victim weight (for the MaxFallSpeed clamp). */
  victimWeight: number
  /** Stance-modified damage multiplier (default 1). */
  damageMultiplier?: number
}

export type KnockbackResult = {
  /** Launch velocity magnitude (per frame), pre-clamp. */
  force: number
  /** Final launch velocity after MaxFallSpeed clamp. */
  velocity: number
  /** Damage applied to the victim by this hit. */
  damage: number
}

/**
 * Compute the knockback for a hit. The impulse term comes from the attack's
 * VariableImpulse (the `t`-notation strength-scaled value) with the fixed
 * impulse added; damage scales it linearly.
 */
export function computeKnockback(k: KnockbackInput): KnockbackResult {
  const { power, damage, attacker, victimWeight, damageMultiplier = 1 } = k

  // Impulse: variable + fixed, scaled by strength ImpulseMult.
  const impulseMult = attacker.physics.impulseMult
  const variable = power.variableImpulse ?? 0
  const fixed = power.fixedImpulse ?? 0
  const totalImpulse = variable + fixed

  // Seed: (170 + impulse×19) × ImpulseMult.
  let force = (170 + totalImpulse * 19) * impulseMult
  // Linear damage scaling: +54.4 per damage point.
  force += 54.4 * damage
  // Apply match damage multiplier.
  force *= damageMultiplier

  // Clamp at MaxFallSpeed (weight-dependent, normal fall speed).
  const cap = maxFallSpeed(victimWeight, false)
  const velocity = Math.min(force, cap)

  const base = power.baseDamage ?? 0
  return { force, velocity, damage: base }
}
