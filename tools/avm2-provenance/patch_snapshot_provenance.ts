import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'
import { BitReader } from '../../packages/replay-format/src/bitstream.js'
import { decodeEnvelope } from '../../packages/replay-format/src/envelope.js'

type Instruction = {
  name: string
  params: unknown[]
}

type CorpusFixture = {
  file: string
  sha256: string
  gameDataChecksum: number
}

type CorpusManifest = {
  target: { build: string; replayFormat: number }
  provenance: { abcSha256: string; gameSwzSha256: string }
  fixtures: CorpusFixture[]
}

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_REPLAY_FORMAT = 268
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_ARCHIVE_SHA256 = {
  'BrawlhallaAir.swf': '40df9af5308b9a17bf015feb38edec6d9bea57d1cd53078d298aa725acceb8b2',
  'Dynamic.swz': 'cd54de039bc4e3441a7ae5811ef8748a719f49e0d4917016407d83b201ddf9c4',
  'Engine.swz': 'aa5b25d0351b7c2c41ccfc588f9bd7ece0c21adb4d4034aa2416d5101684f8dc',
  'Game.swz': '4fc9d70c1c3642b7d3e61c8bb0062bb57c46ea2169276ca1d33616a5843d4aff',
} as const
const CHECKSUM_METHOD_ID = 6527
const REPLAY_WRITER_METHOD_ID = 6519
const REPLAY_READER_METHOD_ID = 6510
const CHECKSUM_MODULUS = 173

function argument(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  return index === -1 ? undefined : process.argv[index + 1]
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function requireFileHash(path: string, expected: string): { bytes: Buffer; sha256: string; byteLength: number } {
  const bytes = readFileSync(path)
  const actual = sha256(new Uint8Array(bytes))
  if (actual !== expected) throw new Error(`${basename(path)} SHA-256 mismatch: expected ${expected}, found ${actual}`)
  return { bytes, sha256: actual, byteLength: bytes.length }
}

function multinameName(value: unknown, strings: string[]): string {
  if (!value || typeof value !== 'object' || !('data' in value)) return ''
  const name = (value as { data?: { name?: unknown } }).data?.name
  if (typeof name === 'number') return strings[name - 1] ?? ''
  return typeof name === 'string' ? name : ''
}

function xmlRoot(bytes: Buffer): string | null {
  const head = bytes
    .subarray(0, Math.min(bytes.length, 2048))
    .toString('utf8')
    .replace(/^\uFEFF/, '')
  return head.match(/<([A-Za-z_][\w:.-]*)/)?.[1] ?? null
}

function addUint32(left: number, right: number): number {
  return (left + right) >>> 0
}

function multiplyUint32(left: number, right: number): number {
  return Math.imul(left, right) >>> 0
}

function popcount32(value: number): number {
  const pairCounts = (value - ((value >>> 1) & 0x55555555)) >>> 0
  const nibbleCounts = ((pairCounts & 0x33333333) + ((pairCounts >>> 2) & 0x33333333)) >>> 0
  return Math.imul((nibbleCounts + (nibbleCounts >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24
}

function skipString(reader: BitReader): void {
  const length = reader.u16()
  for (let index = 0; index < length; index++) reader.u8()
}

function checksumFromReplay(raw: Uint8Array): {
  format: number
  accumulatorUint32: number
  calculated: number
  stored: number
  entityCount: number
  heroCount: number
} {
  const reader = new BitReader(decodeEnvelope(raw))
  const format = reader.u32()
  if (format !== EXPECTED_REPLAY_FORMAT) throw new Error(`expected replay format 268, found ${format}`)

  let state = reader.bits(4)
  if (state !== 3) throw new Error(`expected state 3 before game data, found ${state}`)
  reader.u32()
  const playlistId = reader.u32()
  if (playlistId !== 0) skipString(reader)
  reader.bool()

  state = reader.bits(4)
  if (state !== 4) throw new Error(`expected state 4 after header, found ${state}`)
  for (let index = 0; index < 15; index++) reader.u32()
  const levelId = reader.u32()
  const heroCount = reader.u16()
  let accumulator = 0
  let entityCount = 0

  while (reader.bool()) {
    entityCount++
    reader.u32()
    reader.u32()
    skipString(reader)

    const colorSchemeId = reader.u32()
    const spawnBotId = reader.u32()
    reader.u32()
    const trailEffectId = reader.u32()
    reader.u32()
    const playerThemeId = reader.u32()
    accumulator = addUint32(accumulator, multiplyUint32(colorSchemeId, 5))
    accumulator = addUint32(accumulator, multiplyUint32(spawnBotId, 93))
    accumulator = addUint32(accumulator, multiplyUint32(trailEffectId, 97))
    accumulator = addUint32(accumulator, multiplyUint32(playerThemeId, 53))

    for (let index = 0; index < 8; index++) {
      accumulator = addUint32(accumulator, multiplyUint32(reader.u32(), 13 + index))
    }
    accumulator = addUint32(accumulator, multiplyUint32(reader.u16(), 37))
    accumulator = addUint32(accumulator, multiplyUint32(reader.u16(), 41))

    let bitsetWordIndex = 0
    let bitsetScore = 0
    while (reader.bool()) {
      bitsetScore = addUint32(bitsetScore, multiplyUint32(11 + bitsetWordIndex, popcount32(reader.u32())))
      bitsetWordIndex++
    }
    accumulator = addUint32(accumulator, bitsetScore)

    reader.u16()
    accumulator = addUint32(accumulator, multiplyUint32(reader.u32(), 43))
    reader.u32()

    for (let index = 0; index < heroCount; index++) {
      accumulator = addUint32(accumulator, multiplyUint32(reader.u32() & 0xffff, 17 + index))
      accumulator = addUint32(accumulator, multiplyUint32(reader.u32(), 7 + index))
      accumulator = addUint32(accumulator, multiplyUint32(reader.u32(), 3 + index))
      accumulator = addUint32(accumulator, multiplyUint32(reader.u32(), 2 + index))
    }

    reader.bool()
    if (!reader.bool()) {
      accumulator = addUint32(accumulator, 29)
    } else {
      accumulator = addUint32(accumulator, multiplyUint32(reader.u32(), 31))
      accumulator = addUint32(accumulator, multiplyUint32(Math.round(reader.u32() / 10), 3))
      accumulator = addUint32(accumulator, multiplyUint32(Math.round(reader.u32() / 10), 23))
    }
  }

  accumulator = addUint32(accumulator, multiplyUint32(levelId, 47))
  const calculated = accumulator % CHECKSUM_MODULUS
  const stored = reader.u32()
  return { format, accumulatorUint32: accumulator, calculated, stored, entityCount, heroCount }
}

const abcPath = argument('--abc')
const archiveDirectory = argument('--archives')
const extractedDirectory = argument('--extracted')
const corpusManifestPath = argument('--corpus-manifest')
if (!abcPath || !archiveDirectory || !extractedDirectory || !corpusManifestPath) {
  console.error(
    'usage: bun patch_snapshot_provenance.ts --abc <main.abc> --archives <directory> --extracted <directory> --corpus-manifest <manifest.json>',
  )
  process.exit(64)
}

const abcIdentity = requireFileHash(resolve(abcPath), EXPECTED_ABC_SHA256)
const archiveIdentities = Object.entries(EXPECTED_ARCHIVE_SHA256).map(([name, expected]) => ({
  name,
  ...requireFileHash(join(resolve(archiveDirectory), name), expected),
}))
const manifest = JSON.parse(readFileSync(resolve(corpusManifestPath), 'utf8')) as CorpusManifest
if (manifest.target.build !== EXPECTED_BUILD || manifest.target.replayFormat !== EXPECTED_REPLAY_FORMAT) {
  throw new Error('corpus manifest target does not match build 10.09.96325 format 268')
}
if (manifest.provenance.abcSha256 !== EXPECTED_ABC_SHA256) throw new Error('corpus manifest ABC hash mismatch')
if (manifest.provenance.gameSwzSha256 !== EXPECTED_ARCHIVE_SHA256['Game.swz']) {
  throw new Error('corpus manifest Game.swz hash mismatch')
}

const abc: any = AbcFile.read(new ExtendedBuffer(abcIdentity.bytes))
const strings = abc.constant_pool.string as string[]
const buildStrings = strings.filter((value) => /^\d+\.\d+\.\d+$/.test(value))
if (buildStrings.length !== 1 || buildStrings[0] !== EXPECTED_BUILD) {
  throw new Error(`ABC build string mismatch: ${JSON.stringify(buildStrings)}`)
}
const disassembler = new InstructionDisassembler(abc)
const method = (methodId: number): Instruction[] => {
  const body = abc.method_body.find((candidate: { method: number }) => candidate.method === methodId)
  if (!body) throw new Error(`method ${methodId} has no body`)
  return disassembler.disassemble(body) as Instruction[]
}
const traitMethods = (
  traitName: string,
): Array<{ classIndex: number; className: string; methodId: number; static: boolean }> => {
  const matches: Array<{ classIndex: number; className: string; methodId: number; static: boolean }> = []
  for (let classIndex = 0; classIndex < abc.instance.length; classIndex++) {
    const className = multinameName(abc.constant_pool.multiname[abc.instance[classIndex].name - 1], strings)
    for (const group of [
      { traits: abc.instance[classIndex].trait ?? [], static: false },
      { traits: abc.class[classIndex].traits ?? [], static: true },
    ]) {
      for (const trait of group.traits) {
        const name = multinameName(abc.constant_pool.multiname[trait.name - 1], strings)
        if (name === traitName && trait.data?.method !== undefined) {
          matches.push({ classIndex, className, methodId: trait.data.method, static: group.static })
        }
      }
    }
  }
  return matches
}
const checksumInstructions = method(CHECKSUM_METHOD_ID)
const writerInstructions = method(REPLAY_WRITER_METHOD_ID)
const readerInstructions = method(REPLAY_READER_METHOD_ID)
const owners = new Map<number, { classIndex: number; className: string; traitName: string; static: boolean }>()
for (let classIndex = 0; classIndex < abc.instance.length; classIndex++) {
  const className = multinameName(abc.constant_pool.multiname[abc.instance[classIndex].name - 1], strings)
  owners.set(abc.instance[classIndex].iinit, { classIndex, className, traitName: '<iinit>', static: false })
  owners.set(abc.class[classIndex].cinit, { classIndex, className, traitName: '<cinit>', static: true })
  for (const group of [
    { traits: abc.instance[classIndex].trait ?? [], static: false },
    { traits: abc.class[classIndex].traits ?? [], static: true },
  ]) {
    for (const trait of group.traits) {
      if (trait.data?.method === undefined) continue
      owners.set(trait.data.method, {
        classIndex,
        className,
        traitName: multinameName(abc.constant_pool.multiname[trait.name - 1], strings),
        static: group.static,
      })
    }
  }
}
for (let scriptIndex = 0; scriptIndex < abc.script.length; scriptIndex++) {
  const className = `<script ${scriptIndex}>`
  owners.set(abc.script[scriptIndex].init, { classIndex: -1, className, traitName: '<init>', static: true })
  for (const trait of abc.script[scriptIndex].trait ?? []) {
    if (trait.data?.method === undefined) continue
    owners.set(trait.data.method, {
      classIndex: -1,
      className,
      traitName: multinameName(abc.constant_pool.multiname[trait.name - 1], strings),
      static: true,
    })
  }
}
const parserProbes: Record<string, string[]> = {
  dodgeTypes: ['DodgeID', 'SpeedXMaxMult', 'AccelYFormula'],
  gameModeTypes: ['GameModeID', 'ScoringType', 'LevelSet', 'DamageRatio', 'Variation'],
  heroTypes: ['HeroID', 'BaseWeapon1', 'SpecialPower1', 'Strength', 'Dexterity', 'Weight', 'Speed'],
  hurtboxTypes: ['HurtboxID', 'HurtboxName', 'Width', 'Height', 'Frames'],
  itemSpawnRateTypes: ['SpawnRateID', 'InitSpawnDelay', 'RandomTimeBetweenSpawns'],
  itemSpawnRuleSetTypes: ['RuleSetID', 'WeaponList', 'GadgetList'],
  itemTypes: ['ItemID', 'ItemName', 'Elasticity', 'ThrownGravity', 'PowerType_Combo1'],
  levelGeometry: ['CameraBounds', 'HardCollision', 'SoftCollision', 'Respawn'],
  levelSetTypes: ['LevelSetID', 'LevelTypes'],
  powerSwapTypes: ['TargetPower', 'CastAnim', 'HitGfx'],
  powerTypes: ['PowerID', 'PowerName', 'VariableImpulse', 'FixedImpulse', 'MinimumImpulse', 'CastTime', 'Hurtbox'],
  runeTypes: ['RuneIndex', 'HeroName', 'Strength', 'Dexterity', 'Weight', 'Speed'],
  scoringTypes: ['ScoringID', 'DefaultGameModeType', 'RespawnDuration', 'ItemSpawnRuleSet'],
  statTypes: ['StatName', 'RunSpeed', 'AirRunSpeed', 'JumpXImpulse', 'ImpulseMult'],
}
const methodStringSets = new Map<number, Set<string>>()
for (const body of abc.method_body) {
  const instructions = disassembler.disassemble(body) as Instruction[]
  methodStringSets.set(
    body.method,
    new Set(
      instructions
        .filter((instruction) => instruction.name === 'pushstring')
        .map((instruction) => String(instruction.params[0] ?? '')),
    ),
  )
}
const dataParserCandidates = Object.fromEntries(
  Object.entries(parserProbes).map(([label, requiredStrings]) => [
    label,
    {
      requiredStrings,
      candidates: [...methodStringSets.entries()]
        .filter(([, methodStrings]) => requiredStrings.every((value) => methodStrings.has(value)))
        .map(([methodId]) => ({ methodId, owner: owners.get(methodId) })),
    },
  ]),
)

const instructionSemanticHash = (instructions: Instruction[]): string =>
  sha256(new TextEncoder().encode(JSON.stringify(instructions)))
const checksumOpcodeSha256 = sha256(new TextEncoder().encode(checksumInstructions.map(({ name }) => name).join('\n')))
const checksumSemanticSha256 = instructionSemanticHash(checksumInstructions)
if (checksumInstructions.length !== 298)
  throw new Error(`expected 298 checksum instructions, found ${checksumInstructions.length}`)

const checksumTrait = abc.class[357].traits.find((trait: any) => trait.data?.method === CHECKSUM_METHOD_ID)
const checksumTraitName = multinameName(abc.constant_pool.multiname[checksumTrait?.name - 1], strings)
const checksumCallIndex = (instructions: Instruction[]): number =>
  instructions.findIndex(
    (instruction) =>
      (instruction.name === 'callproperty' || instruction.name === 'callpropvoid') &&
      multinameName(instruction.params[0], strings) === checksumTraitName,
  )
const writerChecksumCallIndex = checksumCallIndex(writerInstructions)
if (writerChecksumCallIndex < 0) throw new Error('replay writer method 6519 does not call checksum method 6527')

const checksumModuloIndex = checksumInstructions.findIndex(
  (instruction, index) =>
    instruction.name === 'modulo' &&
    checksumInstructions[index - 1]?.name === 'pushint' &&
    checksumInstructions[index - 1]?.params[0] === CHECKSUM_MODULUS,
)
if (checksumModuloIndex < 0) throw new Error('checksum method 6527 does not reduce modulo 173')
const readerChecksumCallIndex = checksumCallIndex(readerInstructions)
if (readerChecksumCallIndex < 0) throw new Error('replay reader method 6510 does not call checksum method 6527')
const bitsetAccessor = traitMethods('_-KK')
const bitsetWordScore = traitMethods('_-M6E')
if (bitsetAccessor.length !== 1 || bitsetAccessor[0].methodId !== 591) {
  throw new Error('expected unique bitset checksum accessor method 591')
}
if (bitsetWordScore.length !== 1 || bitsetWordScore[0].methodId !== 1860) {
  throw new Error('expected unique bitset popcount method 1860')
}

const corpusDirectory = dirname(resolve(corpusManifestPath))
const fixtureChecks = manifest.fixtures.map((fixture) => {
  const raw = readFileSync(join(corpusDirectory, fixture.file))
  const replaySha256 = sha256(new Uint8Array(raw))
  if (replaySha256 !== fixture.sha256) throw new Error(`replay SHA-256 mismatch for ${fixture.file}`)
  const result = checksumFromReplay(new Uint8Array(raw))
  if (result.stored !== fixture.gameDataChecksum || result.calculated !== result.stored) {
    throw new Error(
      `game-data checksum mismatch for ${fixture.sha256}: calculated ${result.calculated}, raw ${result.stored}, manifest ${fixture.gameDataChecksum}`,
    )
  }
  return {
    replaySha256,
    accumulatorUint32: result.accumulatorUint32,
    modulus: CHECKSUM_MODULUS,
    calculated: result.calculated,
    stored: result.stored,
    entityCount: result.entityCount,
    heroCount: result.heroCount,
  }
})

const extractedEntries = readdirSync(resolve(extractedDirectory))
  .filter((name) => /^(Dynamic|Engine|Game)\.swz\.\d+\.(xml|dat)$/.test(name))
  .map((name) => {
    const path = join(resolve(extractedDirectory), name)
    const bytes = readFileSync(path)
    return {
      name,
      byteLength: statSync(path).size,
      sha256: sha256(new Uint8Array(bytes)),
      root: name.endsWith('.xml') ? xmlRoot(bytes) : null,
    }
  })
  .sort((left, right) => left.name.localeCompare(right.name, 'en', { numeric: true }))

const categoryCounts: Record<string, number> = {}
for (const entry of extractedEntries) {
  const category = entry.root ?? (entry.name.endsWith('.dat') ? 'delimited-data' : 'unknown')
  categoryCounts[category] = (categoryCounts[category] ?? 0) + 1
}

console.log(
  JSON.stringify(
    {
      target: { build: EXPECTED_BUILD, replayFormat: EXPECTED_REPLAY_FORMAT },
      identities: {
        abc: { sha256: abcIdentity.sha256, byteLength: abcIdentity.byteLength },
        archives: archiveIdentities.map(({ name, sha256: hash, byteLength }) => ({ name, sha256: hash, byteLength })),
        extracted: {
          entryCount: extractedEntries.length,
          aggregateSha256: sha256(
            new TextEncoder().encode(extractedEntries.map((entry) => `${entry.name}\0${entry.sha256}\n`).join('')),
          ),
          categoryCounts,
        },
      },
      avm2: {
        checksumMethod: {
          classIndex: 357,
          methodId: CHECKSUM_METHOD_ID,
          instructionCount: checksumInstructions.length,
          opcodeSha256: checksumOpcodeSha256,
          semanticSha256: checksumSemanticSha256,
          modulo: CHECKSUM_MODULUS,
          moduloInstruction: checksumModuloIndex,
          arithmetic: 'AVM2 multiply_i/add_i with uint conversion after each operation; final uint % 173',
          orderedWeights: {
            perEntity: {
              colorSchemeId: 5,
              spawnBotId: 93,
              trailEffectId: 97,
              playerThemeId: 53,
              tauntIds: '13 + taunt index (0..7)',
              selectedTauntIds: [37, 41],
              genericBitset: 'sum((11 + word index) * popcount32(word))',
              team: 43,
              loadout: {
                heroIdLow16: '17 + loadout index',
                costumeId: '7 + loadout index',
                runeIndex: '3 + loadout index',
                packedWeaponSkins: '2 + loadout index',
              },
              handicapAbsent: 29,
              handicapPresent: ['word0 * 31', 'round(word1 / 10) * 3', 'round(word2 / 10) * 23'],
            },
            afterEntities: { levelId: 47 },
          },
          bitsetAccessor: { ...bitsetAccessor[0], semanticSha256: instructionSemanticHash(method(591)) },
          bitsetPopcount: { ...bitsetWordScore[0], semanticSha256: instructionSemanticHash(method(1860)) },
        },
        writer: {
          methodId: REPLAY_WRITER_METHOD_ID,
          semanticSha256: instructionSemanticHash(writerInstructions),
          checksumCallInstruction: writerChecksumCallIndex,
        },
        reader: {
          methodId: REPLAY_READER_METHOD_ID,
          semanticSha256: instructionSemanticHash(readerInstructions),
          rawChecksumReadInstructions: [580, 584],
          checksumCallInstruction: readerChecksumCallIndex,
          comparisonInstructions: [787, 803],
        },
        dataParserCandidates,
      },
      fixtureChecks,
      status: 'proven-for-reviewed-corpus',
    },
    null,
    2,
  ),
)
