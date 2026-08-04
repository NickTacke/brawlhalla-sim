// The fixed-timestep simulation loop. Deterministic: same inputs + seed ->
// same output. Runs pure computation; the replay verification harness drives
// it with real replay input streams and compares KO timelines.

import type { InputSection } from '@brawlhalla-sim/replay-format'
import type { Entity, FrameInput, LegendPhysics, SimConfig, SimResult } from '../types.js'
import { EMPTY_INPUT } from '../types.js'
import { createEntity, stepMovement } from './entity.js'
import { inputsToFrames } from './input.js'
import { type KoDetection, applyScore, detectKos } from './ko.js'

export type EngineOptions = {
  config: SimConfig
  /** Replay input section (the sim's fuel). */
  inputs: InputSection
  /** Total frames to simulate (defaults to the input frame count). */
  maxFrames?: number
  /** Level spawn points per entity id (initial positions). */
  spawns: Map<number, { x: number; y: number }>
  /** Replay entity roster: id -> hero/stance/spawn info. */
  roster: Map<number, { heroId: number; name: string; team: number; isBot: boolean }>
}

export function runSim(opts: EngineOptions): SimResult {
  const { config, inputs } = opts
  const settings = config.gameSettings
  const startingLives = settings.startingLives || 3

  const entities = new Map<number, Entity>()
  const physicsByEntityId = new Map<number, LegendPhysics>()
  const koTimeline: Array<{ entityId: number; frame: number }> = []
  const scores: Record<number, number> = {}

  const frameInputs = inputsToFrames(inputs)

  // Spawn entities from the roster (replay entities + resolved physics).
  for (const [id, spawn] of opts.spawns) {
    const r = opts.roster.get(id)
    const resolvedPhysics = r ? config.physicsByHeroId.get(r.heroId) : undefined
    if (!resolvedPhysics) throw new Error(`missing physics for replay entity ${id}`)
    const ent = createEntity({
      id,
      heroId: r?.heroId ?? 0,
      name: r?.name ?? '',
      team: r?.team ?? 0,
      isBot: r?.isBot ?? false,
      x: spawn.x,
      y: spawn.y,
      lives: startingLives,
    })
    entities.set(id, ent)
    physicsByEntityId.set(id, resolvedPhysics)
  }

  const frameCount = opts.maxFrames ?? frameInputs.maxFrame + 1

  const koDetect: KoDetection = {
    camera: config.camera,
  }

  for (let frame = 0; frame < frameCount; frame++) {
    const inputsThisFrame = frameInputs.get(frame)
    for (const [id, ent] of entities) {
      const fi: FrameInput = inputsThisFrame?.get(id) ?? EMPTY_INPUT
      // Grounded check: seed uses a flat floor at y=0 (level collision later).
      const onGround = (e: Entity) => e.y >= 0 && e.vy >= 0
      const physics = physicsByEntityId.get(id)
      if (!physics) throw new Error(`missing resolved physics for replay entity ${id}`)
      stepMovement(ent, physics, fi, onGround)
      // Integrate velocity -> position.
      ent.x += ent.vx
      ent.y += ent.vy
      if (ent.y > 0) ent.y = 0 // hard floor
      ent.lastInputMask = fi.mask
    }

    const k = detectKos(entities, koDetect, frame)
    for (const ko of k) {
      koTimeline.push({ entityId: ko.entityId, frame })
      const e = entities.get(ko.entityId)
      if (e) {
        e.ko = true
        e.lives--
        applyScore(scores, ko.entityId, -1)
      }
    }
  }

  return { koTimeline, scores, frameCount }
}
