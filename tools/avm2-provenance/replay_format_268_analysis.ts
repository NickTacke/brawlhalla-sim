import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { decodeEnvelope } from '../../packages/replay-format/src/envelope.js'

const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_FORMAT = 268
const EXPECTED_REPLAY_SHA256 = new Set([
  '010f78c85af90f1fbfef00e9b09583c3f5a04d63526f4e368f9de6e1e50f74ba',
  '31457427af337318846d2cc3890449160b10a9bf74cac8d512c626364f69dd0e',
  '3bb52453a44d4ce3bc9789f3aa98ed9dd153b5036874a100f2567d999fa9557f',
  '48734a529b3999851c43c983370fef25c12a75fcb455667b33b24a483d791284',
  '5f5bb9aefd4c8edf85dc3593e913cb7977276e1d40a570645a17f7718f91dd7e',
  '66da11ce37ccf07a660034d012c54353fe0d33953be96c3d826f22fb71b56b0f',
  '84ecfe20a8c9c08f1a58a6068f003b910205cde966ef235d208cd314de9f3770',
  '89e92cec682b879e9e577b5ab763cf4811197d9bdcc6580e7e2b3d2d4361efca',
  'bcc173cb790fbd28adef778901994d27d0d7a366ac92d8bdfe76d8122498b165',
  'bf0ac1ed57afdc529ab218bb1861d79baf53b12a6809d6e9cbaa0bf02e23b955',
  'ea7ae8c364a3d02062f0803ac716146c2527b30e92cfaa90522fccfb0a499c26',
  'fdd31d19d49ca2857fe294ff187e2a1eb1eda6fdcf0986018eee478501693a1c',
])
const MAX_ENTITIES = 32
const MAX_LIST_ENTRIES = 1 << 20
const INPUT_BIT_VALUES = Array.from({ length: 14 }, (_, index) => 1 << index)

type ManifestFixture = {
  file: string
  sha256: string
}

type CorpusManifest = {
  schemaVersion: number
  target: {
    build: string
    replayFormat: number
  }
  provenance: {
    abcSha256: string
  }
  fixtures: ManifestFixture[]
}

type SectionSpan = {
  state: number
  startBit: number
  endBit: number
  lengthBits: number
}

type ResultRecord = {
  resultTimeMs: number
  hasPlacements: boolean
  placementCount: number
  fanfareId: number
  bitLength: number
  bitSha256: string
}

type ReplayAnalysis = {
  replaySha256: string
  formatSpan: [number, number]
  bodyBits: number
  sections: SectionSpan[]
  results: ResultRecord[]
  repeatedResultsIdentical: boolean | null
  inputSnapshots: number
  inputBitCounts: Record<string, number>
  bit32WithBit1: number
  bit32WithoutBit1: number
  paddingBits: number
  resultTimeMs: number
  maxInputTimestampMs: number
  inputTailAfterResultMs: number
  playbackCutoffMs: number
  inputAfterPlaybackCutoffMs: number
}

class BitCursor {
  position = 0

  constructor(readonly bytes: Uint8Array) {}

  read(width: number): number {
    if (!Number.isInteger(width) || width < 0 || width > 32) throw new Error(`invalid bit width ${width}`)
    if (this.position + width > this.bytes.length * 8) {
      throw new Error(`bitstream EOF at bit ${this.position} reading ${width} bits`)
    }

    let value = 0
    for (let index = 0; index < width; index++) {
      const byte = this.bytes[this.position >> 3]
      value = value * 2 + ((byte >> (7 - (this.position & 7))) & 1)
      this.position++
    }
    return value >>> 0
  }

  bool(): boolean {
    return this.read(1) === 1
  }

  skip(width: number): void {
    if (this.position + width > this.bytes.length * 8) {
      throw new Error(`bitstream EOF at bit ${this.position} skipping ${width} bits`)
    }
    this.position += width
  }

  skipString(): void {
    this.skip(this.read(16) * 8)
  }
}

function argument(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  return index === -1 ? undefined : process.argv[index + 1]
}

function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function boundedList(cursor: BitCursor, label: string, readEntry: () => void): number {
  let count = 0
  while (cursor.bool()) {
    count++
    if (count > MAX_LIST_ENTRIES) throw new Error(`${label} exceeds ${MAX_LIST_ENTRIES} entries`)
    readEntry()
  }
  return count
}

function skipEntity(cursor: BitCursor, heroCount: number): void {
  cursor.skip(64)
  cursor.skipString()
  cursor.skip(14 * 32)
  cursor.skip(32)
  boundedList(cursor, 'entity bitset', () => cursor.skip(32))
  cursor.skip(16 + 32 + 32)
  cursor.skip(heroCount * 4 * 32)
  cursor.skip(1)
  if (cursor.bool()) cursor.skip(3 * 32)
}

function readGameData(cursor: BitCursor): void {
  cursor.skip(15 * 32 + 32)
  const heroCount = cursor.read(16)
  if (heroCount < 1 || heroCount > 5) throw new Error(`hero count ${heroCount} is outside 1..5`)

  let entityCount = 0
  boundedList(cursor, 'roster', () => {
    entityCount++
    if (entityCount > MAX_ENTITIES) throw new Error(`roster exceeds ${MAX_ENTITIES} entities`)
    skipEntity(cursor, heroCount)
  })
  cursor.skip(32)
}

function canonicalBits(bytes: Uint8Array, startBit: number, endBit: number): string {
  let bits = ''
  for (let position = startBit; position < endBit; position++) {
    bits += String((bytes[position >> 3] >> (7 - (position & 7))) & 1)
  }
  return bits
}

function readResult(cursor: BitCursor, startBit: number): ResultRecord {
  const resultTimeMs = cursor.read(32)
  const hasPlacements = cursor.bool()
  const placementCount = hasPlacements
    ? boundedList(cursor, 'result placements', () => {
        cursor.skip(5 + 16)
      })
    : 0
  const fanfareId = cursor.read(32)
  const bitLength = cursor.position - startBit
  return {
    resultTimeMs,
    hasPlacements,
    placementCount,
    fanfareId,
    bitLength,
    bitSha256: sha256(canonicalBits(cursor.bytes, startBit, cursor.position)),
  }
}

function readInputs(
  cursor: BitCursor,
  bitCounts: Record<string, number>,
): { snapshots: number; maxTimestampMs: number; bit32WithBit1: number; bit32WithoutBit1: number } {
  let snapshots = 0
  let maxTimestampMs = -1
  let bit32WithBit1 = 0
  let bit32WithoutBit1 = 0

  boundedList(cursor, 'input entities', () => {
    cursor.skip(5)
    const inputCount = cursor.read(32)
    if (inputCount > MAX_LIST_ENTRIES) throw new Error(`input timeline exceeds ${MAX_LIST_ENTRIES} snapshots`)
    snapshots += inputCount

    for (let index = 0; index < inputCount; index++) {
      const timestampMs = cursor.read(32)
      if (timestampMs > maxTimestampMs) maxTimestampMs = timestampMs
      const mask = cursor.bool() ? cursor.read(14) : 0
      for (const value of INPUT_BIT_VALUES) {
        if ((mask & value) !== 0) bitCounts[String(value)]++
      }
      if ((mask & 32) !== 0) {
        if ((mask & 1) !== 0) bit32WithBit1++
        else bit32WithoutBit1++
      }
    }
  })

  return { snapshots, maxTimestampMs, bit32WithBit1, bit32WithoutBit1 }
}

function readEvents(cursor: BitCursor): void {
  boundedList(cursor, 'events', () => cursor.skip(5 + 32))
}

function analyzeReplay(raw: Uint8Array, expectedHash: string): ReplayAnalysis {
  const replaySha256 = sha256(raw)
  if (replaySha256 !== expectedHash) {
    throw new Error(`replay SHA-256 mismatch: expected ${expectedHash}, found ${replaySha256}`)
  }

  const body = decodeEnvelope(raw)
  const cursor = new BitCursor(body)
  const format = cursor.read(32)
  if (format !== EXPECTED_FORMAT) throw new Error(`expected format ${EXPECTED_FORMAT}, found ${format}`)

  const sections: SectionSpan[] = []
  const results: ResultRecord[] = []
  const inputBitCounts = Object.fromEntries(INPUT_BIT_VALUES.map((value) => [String(value), 0]))
  let inputSnapshots = 0
  let maxInputTimestampMs = -1
  let bit32WithBit1 = 0
  let bit32WithoutBit1 = 0
  let ended = false

  while (!ended) {
    const startBit = cursor.position
    const state = cursor.read(4)
    switch (state) {
      case 1: {
        const inputs = readInputs(cursor, inputBitCounts)
        inputSnapshots += inputs.snapshots
        maxInputTimestampMs = Math.max(maxInputTimestampMs, inputs.maxTimestampMs)
        bit32WithBit1 += inputs.bit32WithBit1
        bit32WithoutBit1 += inputs.bit32WithoutBit1
        break
      }
      case 2:
        ended = true
        break
      case 3:
        cursor.skip(32)
        if (cursor.read(32) !== 0) cursor.skipString()
        cursor.skip(1)
        break
      case 4:
        readGameData(cursor)
        break
      case 5:
      case 7:
        readEvents(cursor)
        break
      case 6:
        results.push(readResult(cursor, startBit))
        break
      case 8:
        throw new Error('replay contains invalid state 8')
      default:
        throw new Error(`unknown state ${state} at bit ${startBit}`)
    }
    sections.push({ state, startBit, endBit: cursor.position, lengthBits: cursor.position - startBit })
  }

  const paddingBits = body.length * 8 - cursor.position
  for (let index = 0; index < paddingBits; index++) {
    if (cursor.read(1) !== 0) throw new Error(`non-zero post-END padding at bit ${cursor.position - 1}`)
  }
  if (results.length === 0) throw new Error('replay has no result section')

  const lastResult = results.at(-1)
  if (!lastResult) throw new Error('replay has no last result')
  const playbackCutoffMs = lastResult.resultTimeMs + 2500
  const hashes = new Set(results.map((result) => result.bitSha256))

  return {
    replaySha256,
    formatSpan: [0, 32],
    bodyBits: body.length * 8,
    sections,
    results,
    repeatedResultsIdentical: results.length > 1 ? hashes.size === 1 : null,
    inputSnapshots,
    inputBitCounts,
    bit32WithBit1,
    bit32WithoutBit1,
    paddingBits,
    resultTimeMs: lastResult.resultTimeMs,
    maxInputTimestampMs,
    inputTailAfterResultMs: maxInputTimestampMs - lastResult.resultTimeMs,
    playbackCutoffMs,
    inputAfterPlaybackCutoffMs: Math.max(0, maxInputTimestampMs - playbackCutoffMs),
  }
}

function readManifest(path: string): CorpusManifest {
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as CorpusManifest
  if (parsed.schemaVersion !== 1) throw new Error(`expected manifest schema 1, found ${parsed.schemaVersion}`)
  if (parsed.target.build !== EXPECTED_BUILD) {
    throw new Error(`expected manifest build ${EXPECTED_BUILD}, found ${parsed.target.build}`)
  }
  if (parsed.target.replayFormat !== EXPECTED_FORMAT) {
    throw new Error(`expected manifest format ${EXPECTED_FORMAT}, found ${parsed.target.replayFormat}`)
  }
  if (parsed.provenance.abcSha256 !== EXPECTED_ABC_SHA256) {
    throw new Error(`manifest ABC SHA-256 is not the pinned build: ${parsed.provenance.abcSha256}`)
  }
  if (!Array.isArray(parsed.fixtures) || parsed.fixtures.length === 0) throw new Error('manifest has no fixtures')
  const replayHashes = new Set(parsed.fixtures.map((fixture) => fixture.sha256))
  if (
    replayHashes.size !== parsed.fixtures.length ||
    replayHashes.size !== EXPECTED_REPLAY_SHA256.size ||
    [...EXPECTED_REPLAY_SHA256].some((hash) => !replayHashes.has(hash))
  ) {
    throw new Error('manifest replay hashes do not match the pinned 12-replay cohort')
  }
  return parsed
}

const abcPath = argument('--abc')
const manifestPath = argument('--manifest')
if (!abcPath || !manifestPath) {
  console.error('usage: bun replay_format_268_analysis.ts --abc <main.abc> --manifest <manifest.json>')
  process.exit(64)
}

const abcBytes = new Uint8Array(readFileSync(resolve(abcPath)))
const abcSha256 = sha256(abcBytes)
if (abcSha256 !== EXPECTED_ABC_SHA256) {
  throw new Error(`ABC SHA-256 mismatch: expected ${EXPECTED_ABC_SHA256}, found ${abcSha256}`)
}

const absoluteManifestPath = resolve(manifestPath)
const manifest = readManifest(absoluteManifestPath)
const analyses = manifest.fixtures
  .map((fixture) => {
    if (fixture.file !== basename(fixture.file) || !fixture.file.endsWith('.replay')) {
      throw new Error(`unsafe replay filename in manifest: ${fixture.file}`)
    }
    if (!/^[0-9a-f]{64}$/.test(fixture.sha256)) throw new Error(`invalid replay SHA-256: ${fixture.sha256}`)
    const replayBytes = new Uint8Array(readFileSync(resolve(dirname(absoluteManifestPath), fixture.file)))
    return analyzeReplay(replayBytes, fixture.sha256)
  })
  .sort((left, right) => left.replaySha256.localeCompare(right.replaySha256))

const aggregateBitCounts = Object.fromEntries(INPUT_BIT_VALUES.map((value) => [String(value), 0]))
for (const analysis of analyses) {
  for (const value of INPUT_BIT_VALUES) {
    aggregateBitCounts[String(value)] += analysis.inputBitCounts[String(value)]
  }
}

console.log(
  JSON.stringify(
    {
      schemaVersion: 1,
      target: {
        build: manifest.target.build,
        replayFormat: EXPECTED_FORMAT,
        abcSha256,
        replayCount: analyses.length,
      },
      aggregate: {
        inputSnapshots: analyses.reduce((sum, analysis) => sum + analysis.inputSnapshots, 0),
        inputBitCounts: aggregateBitCounts,
        bit32WithBit1: analyses.reduce((sum, analysis) => sum + analysis.bit32WithBit1, 0),
        bit32WithoutBit1: analyses.reduce((sum, analysis) => sum + analysis.bit32WithoutBit1, 0),
        paddingBits: analyses.reduce((sum, analysis) => sum + analysis.paddingBits, 0),
        inputTailAfterResultRangeMs: [
          Math.min(...analyses.map((analysis) => analysis.inputTailAfterResultMs)),
          Math.max(...analyses.map((analysis) => analysis.inputTailAfterResultMs)),
        ],
      },
      replays: analyses,
    },
    null,
    2,
  ),
)
