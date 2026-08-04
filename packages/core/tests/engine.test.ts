import { describe, expect, test } from 'bun:test'
import { runSim } from '../src/sim/engine'
import type { LegendPhysics, SimConfig } from '../src/types'

const gameSettings = {
  flags: 0,
  maxPlayers: 2,
  duration: 480,
  roundDuration: 0,
  startingLives: 3,
  scoringTypeId: 2,
  scoreToWin: 0,
  gameSpeed: 100,
  damageMultiplier: 100,
  levelSetId: 0,
  itemSpawnRuleSetId: 0,
  weaponSpawnRateId: 0,
  gadgetSpawnRateId: 0,
  customGadgetSelection: 0,
  variation: 0,
}

const physics: LegendPhysics = {
  heroId: 999,
  stats: { strength: 5, dexterity: 5, weight: 5, speed: 5 },
  physics: {
    impulseMult: 1,
    recovery: 1,
    runSpeed: 10,
    jumpXImpulse: 13.8,
    acceleration: 1,
    friction: 1,
    airRunSpeed: 8,
    airAcceleration: 1,
    airFriction: 1,
    recoverMod: 1,
    sigRecoverMod: 1,
    minChargeMod: 1,
    durabilityMod: 1,
  },
}

describe('runSim', () => {
  test('uses caller-supplied patch physics for the replay roster', () => {
    const config: SimConfig = {
      gameSettings,
      camera: { x: -100, y: -100, width: 200, height: 200 },
      physicsByHeroId: new Map([[physics.heroId, physics]]),
    }

    expect(() =>
      runSim({
        config,
        inputs: { entities: [], maxTimestampMs: -1 },
        maxFrames: 0,
        spawns: new Map([[1, { x: 0, y: 0 }]]),
        roster: new Map([[1, { heroId: physics.heroId, name: 'Fixture', team: 1, isBot: false }]]),
      }),
    ).not.toThrow()
  })
})
