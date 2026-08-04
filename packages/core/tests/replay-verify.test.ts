// Optional replay diagnostics for the local corpus.
//
// These report drift from recorded replay outcomes. They are not accuracy
// gates while the simulator still lacks level collision, respawn, and combat.

import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { REPLAY_TIME_QUANTUM_MS, parse } from '@brawlhalla-sim/replay-format'
import type { ParsedReplay } from '@brawlhalla-sim/replay-format'
import { runSim } from '../src/sim/engine'
import type { LegendPhysics, SimConfig } from '../src/types'

const REPLAY_DIR = process.env.BRAWLHALLA_REPLAY_DIR ?? ''

function replayFiles(): string[] {
  if (!REPLAY_DIR || !existsSync(REPLAY_DIR)) return []
  return readdirSync(REPLAY_DIR)
    .filter((f) => f.endsWith('.replay'))
    .sort()
}

// Seed camera bounds: matches the smallest map (SmallBrawlhaven-era); the
// real per-level CameraBounds come from level geometry once collision lands.
const SEED_CAMERA = { x: -150, y: -340, width: 300, height: 340 }

function fixturePhysics(heroId: number): LegendPhysics {
  return {
    heroId,
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
}

function buildConfig(r: ParsedReplay): SimConfig {
  const heroIds = r.entities.flatMap((entity) => entity.playerData.heroes.map((hero) => hero.heroId))
  return {
    gameSettings: r.gameSettings,
    camera: SEED_CAMERA,
    physicsByHeroId: new Map(heroIds.map((heroId) => [heroId, fixturePhysics(heroId)])),
  }
}

function spawnsFor(r: ParsedReplay): Map<number, { x: number; y: number }> {
  const spawns = new Map<number, { x: number; y: number }>()
  // Spread entities horizontally across the stage floor; y=0 is the floor.
  const n = r.entities.length
  r.entities.forEach((e, i) => {
    const x = -60 + (i / Math.max(1, n - 1)) * 120
    spawns.set(e.id, { x, y: 0 })
  })
  return spawns
}

function rosterFor(r: ParsedReplay): Map<number, { heroId: number; name: string; team: number; isBot: boolean }> {
  const m = new Map<number, { heroId: number; name: string; team: number; isBot: boolean }>()
  for (const e of r.entities) {
    const hero = e.playerData.heroes[0]
    m.set(e.id, {
      heroId: hero?.heroId ?? 0,
      name: e.name,
      team: e.team,
      isBot: e.isBot,
    })
  }
  return m
}

describe('optional replay diagnostics', () => {
  const files = replayFiles()
  test.if(files.length > 0)('finds the replay corpus', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  test.todo('strict ordered KO ids, timestamps, scores, and duration await collision, respawn, and combat', () => {})

  for (const file of files) {
    test(`reports KO count: ${file}`, () => {
      const raw = new Uint8Array(readFileSync(join(REPLAY_DIR, file)))
      const r = parse(raw)
      const cfg = buildConfig(r)
      const sim = runSim({
        config: cfg,
        inputs: r.inputs,
        spawns: spawnsFor(r),
        roster: rosterFor(r),
      })
      console.log(`${file}: sim ${sim.koTimeline.length}/${r.koFaces.length} KOs`)
      expect(sim.koTimeline.length).toBeGreaterThan(0)
    })
  }

  test.if(files.length > 0)('reports KO counts across the full corpus', () => {
    let matched = 0
    let total = 0
    for (const file of files) {
      const r = parse(new Uint8Array(readFileSync(join(REPLAY_DIR, file))))
      const sim = runSim({
        config: buildConfig(r),
        inputs: r.inputs,
        spawns: spawnsFor(r),
        roster: rosterFor(r),
      })
      total += r.koFaces.length
      matched += sim.koTimeline.length
    }
    console.log(`corpus: sim KOs ${matched} vs recorded ${total}`)
    expect(matched).toBeGreaterThan(0)
  })

  test.if(files.length > 0)('reports KO entity-id coverage', () => {
    let match = 0
    let total = 0
    const misses: string[] = []
    for (const file of files) {
      const r = parse(new Uint8Array(readFileSync(join(REPLAY_DIR, file))))
      const sim = runSim({
        config: buildConfig(r),
        inputs: r.inputs,
        spawns: spawnsFor(r),
        roster: rosterFor(r),
      })
      const recorded = new Set(r.koFaces.map((k) => k.entityId))
      const simulated = new Set(sim.koTimeline.map((k) => k.entityId))
      for (const id of recorded) {
        total++
        if (simulated.has(id)) match++
      }
      if (!recorded.size) continue
      const missIds = [...recorded].filter((id) => !simulated.has(id))
      if (missIds.length) misses.push(`${file}: missing ${missIds.join(',')}`)
    }
    console.log(`KO entity coverage ${match}/${total}`)
    if (misses.length) console.log('misses:', misses.slice(0, 5).join(' | '))
    expect(match).toBeGreaterThan(0)
  })

  test.if(files.length > 0)('reports ordered per-entity KO timestamp drift', () => {
    let exact = 0
    let within3 = 0
    let total = 0
    const drifts: number[] = []
    for (const file of files) {
      const r = parse(new Uint8Array(readFileSync(join(REPLAY_DIR, file))))
      const sim = runSim({
        config: buildConfig(r),
        inputs: r.inputs,
        spawns: spawnsFor(r),
        roster: rosterFor(r),
      })
      const recordedById = new Map<number, number[]>()
      for (const ko of r.koFaces) {
        const timestamps = recordedById.get(ko.entityId) ?? []
        timestamps.push(ko.timestampMs)
        recordedById.set(ko.entityId, timestamps)
      }
      for (const timestamps of recordedById.values()) timestamps.sort((a, b) => a - b)
      const nextRecordedIndex = new Map<number, number>()
      for (const ko of sim.koTimeline) {
        const timestamps = recordedById.get(ko.entityId)
        const index = nextRecordedIndex.get(ko.entityId) ?? 0
        const recordedTimestampMs = timestamps?.[index]
        if (recordedTimestampMs === undefined) continue
        nextRecordedIndex.set(ko.entityId, index + 1)
        total++
        const simMs = ko.frame * REPLAY_TIME_QUANTUM_MS
        const drift = simMs - recordedTimestampMs
        drifts.push(drift)
        if (Math.abs(drift) <= REPLAY_TIME_QUANTUM_MS) exact++
        if (Math.abs(drift) <= REPLAY_TIME_QUANTUM_MS * 3) within3++
      }
    }
    console.log(`KO timestamps: exact(±1 tick) ${exact}/${total}, within 3 ticks ${within3}/${total}`)
    if (drifts.length) {
      const sorted = [...drifts].sort((a, b) => Math.abs(a) - Math.abs(b))
      console.log('min drift (ms):', sorted[0], 'median:', sorted[Math.floor(sorted.length / 2)])
    }
    expect(total).toBeGreaterThan(0)
  })
})
