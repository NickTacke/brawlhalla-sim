import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from '../src/parser'
import { buildSyntheticReplay } from './synthetic-replay'

describe('supported replay formats', () => {
  test('parses a synthetic format 264 replay', () => {
    const replay = parse(buildSyntheticReplay(264))
    expect(replay.formatVersion).toBe(264)
    expect(replay.entities).toHaveLength(1)
    expect(replay.entities[0].name).toBe('Fixture')
    expect(replay.entities[0].playerId).toBeUndefined()
  })

  test('parses a synthetic format 268 replay with playerId', () => {
    const replay = parse(buildSyntheticReplay(268))
    expect(replay.formatVersion).toBe(268)
    expect(replay.entities).toHaveLength(1)
    expect(replay.entities[0].name).toBe('Fixture')
    expect(replay.entities[0].playerId).toBe(12345)
  })
})

const replayDirectory = process.env.BRAWLHALLA_REPLAY_DIR ?? ''
const readReplay = (name: string): Uint8Array | null => {
  if (!replayDirectory) return null
  const path = join(replayDirectory, name)
  return existsSync(path) ? new Uint8Array(readFileSync(path)) : null
}

describe('optional local replay corpus', () => {
  const files = ['[10.09] FabledCity.replay', "[10.09] Lich'sTomb.replay"]
  for (const file of files) {
    const raw = readReplay(file)
    test.if(raw !== null)(`parses ${file}`, () => {
      if (!raw) return
      const replay = parse(raw)
      expect(replay.formatVersion).toBe(268)
      expect(replay.entities.length).toBeGreaterThan(1)
      expect(replay.entities.every((entity) => typeof entity.playerId === 'number')).toBe(true)
    })
  }
})
