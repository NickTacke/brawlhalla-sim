import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

import { BitReader } from '../../packages/replay-format/src/bitstream.js'
import { decodeEnvelope } from '../../packages/replay-format/src/envelope.js'
import { parse } from '../../packages/replay-format/src/parser.js'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }
type TraitDefinition = {
  classIndex: number
  className: string
  trait: { kind: number; data: { type_name: number; vindex: number } }
}
type ManifestFixture = { file: string; sha256: string; sourceModifiedAt: string }
type CorpusManifest = {
  schemaVersion: number
  target: { build: string; replayFormat: number }
  provenance: { abcSha256: string }
  fixtures: ManifestFixture[]
}

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_FORMAT = 268
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_MANIFEST_SHA256 = 'b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac'
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
const EXPECTED_FIELD_LEDGER_SHA256 = '9425becc435d382a3ad58d4a8bb31636e5f6c4492ef7cde26c142158e32035fa'
const TARGET_TRAIT = '_-o1O'
const BRANCHES = new Set([
  'ifeq',
  'iffalse',
  'ifge',
  'ifgt',
  'ifle',
  'iflt',
  'ifne',
  'ifnge',
  'ifngt',
  'ifnle',
  'ifnlt',
  'ifstricteq',
  'ifstrictne',
  'iftrue',
  'jump',
])

function argument(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  return index === -1 ? undefined : process.argv[index + 1]
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function readRosterConnectionTimestamps(raw: Uint8Array): number[] {
  const reader = new BitReader(decodeEnvelope(raw))
  assert(reader.u32() === EXPECTED_FORMAT, 'fixture format changed before state-4 decoding')

  while (true) {
    const state = reader.bits(4)
    if (state === 3) {
      reader.u32()
      if (reader.u32() !== 0) reader.string()
      reader.bool()
      continue
    }
    assert(state === 4, `expected state 4 after header, got state ${state}`)

    for (let index = 0; index < 15; index++) reader.u32()
    reader.u32()
    const heroCount = reader.u16()
    assert(heroCount >= 1 && heroCount <= 5, `state-4 hero count out of range: ${heroCount}`)

    const timestamps: number[] = []
    while (reader.bool()) {
      reader.u32()
      reader.u32()
      reader.string()
      for (let index = 0; index < 6; index++) reader.u32()
      for (let index = 0; index < 8; index++) reader.u32()
      reader.u16()
      reader.u16()
      while (reader.bool()) reader.u32()
      reader.u16()
      reader.u32()
      timestamps.push(reader.u32())
      for (let index = 0; index < heroCount; index++) {
        reader.u32()
        reader.u32()
        reader.u32()
        reader.u32()
      }
      reader.bool()
      if (reader.bool()) {
        reader.u32()
        reader.u32()
        reader.u32()
      }
    }
    reader.u32()
    return timestamps
  }
}

function readU30(code: Buffer, cursor: { offset: number }): number {
  let value = 0
  for (let byteIndex = 0; byteIndex < 5; byteIndex++) {
    const byte = code[cursor.offset++]
    value |= (byte & 0x7f) << (byteIndex * 7)
    if ((byte & 0x80) === 0) return value >>> 0
  }
  return value >>> 0
}

function readS24(code: Buffer, cursor: { offset: number }): number {
  const value = code.readIntLE(cursor.offset, 3)
  cursor.offset += 3
  return value
}

function readOperand(type: string, code: Buffer, cursor: { offset: number }, prior: unknown[]): unknown {
  if (type === 'u8') return code[cursor.offset++]
  if (type === 'offset' || type === 's24') return readS24(code, cursor)
  if (type.startsWith('array')) {
    const countValue = prior.at(-1)
    assert(typeof countValue === 'number', 'array operand count is not numeric')
    const count = countValue + (type.startsWith('array1-') ? 1 : 0)
    const itemType = type.slice(type.indexOf('-') + 1)
    return Array.from({ length: count }, () => readOperand(itemType, code, cursor, prior))
  }
  return readU30(code, cursor)
}

function locateInstructions(codeBytes: Uint8Array, instructions: Instruction[]): LocatedInstruction[] {
  const code = Buffer.from(codeBytes)
  const cursor = { offset: 0 }
  const located = instructions.map((instruction, index) => {
    const pc = cursor.offset
    assert(code[cursor.offset++] === instruction.id, `opcode mismatch at PC ${pc}`)
    const values: unknown[] = []
    for (const type of instruction.types) values.push(readOperand(type, code, cursor, values))
    return { ...instruction, index, pc, endPc: cursor.offset }
  })
  assert(cursor.offset === code.length, `decode stopped at ${cursor.offset} of ${code.length}`)
  return located
}

function validateBranches(instructions: LocatedInstruction[], codeLength: number): string[] {
  const boundaries = new Set(instructions.map((instruction) => instruction.pc))
  boundaries.add(codeLength)
  const errors: string[] = []
  for (const instruction of instructions) {
    if (BRANCHES.has(instruction.name)) {
      const offset = instruction.params[0]
      if (typeof offset !== 'number' || !boundaries.has(instruction.endPc + offset)) errors.push(`PC ${instruction.pc}`)
    }
    if (instruction.name === 'lookupswitch') {
      const offsets = [instruction.params[0], ...(Array.isArray(instruction.params[2]) ? instruction.params[2] : [])]
      for (const entry of offsets) {
        const offset = Array.isArray(entry) ? entry[1] : entry
        if (typeof offset !== 'number' || !boundaries.has(instruction.pc + offset)) errors.push(`PC ${instruction.pc}`)
      }
    }
  }
  return errors
}

function multinameName(value: unknown, strings: string[]): string {
  if (!value || typeof value !== 'object' || !('data' in value)) return ''
  const name = (value as { data?: { name?: unknown } }).data?.name
  if (typeof name === 'number') return strings[name - 1] ?? ''
  return typeof name === 'string' ? name : ''
}

function qnameKey(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('kind' in value) || !('data' in value)) return null
  const candidate = value as { kind?: unknown; data?: { ns?: unknown; name?: unknown } }
  if (candidate.kind !== 7 || typeof candidate.data?.ns !== 'number' || typeof candidate.data.name !== 'number') {
    return null
  }
  return `${candidate.data.ns}:${candidate.data.name}`
}

function buildOwners(abc: any, strings: string[]): Map<number, MethodOwner> {
  const owners = new Map<number, MethodOwner>()
  const nameAt = (index: number): string => multinameName(abc.constant_pool.multiname[index - 1], strings)
  for (let classIndex = 0; classIndex < abc.instance.length; classIndex++) {
    const className = nameAt(abc.instance[classIndex].name)
    owners.set(abc.instance[classIndex].iinit, { classIndex, className, traitName: '<iinit>', static: false })
    owners.set(abc.class[classIndex].cinit, { classIndex, className, traitName: '<cinit>', static: true })
    for (const group of [
      { traits: abc.instance[classIndex].trait ?? [], static: false },
      { traits: abc.class[classIndex].traits ?? [], static: true },
    ]) {
      for (const trait of group.traits) {
        if (trait.data?.method === undefined) continue
        owners.set(trait.data.method, { classIndex, className, traitName: nameAt(trait.name), static: group.static })
      }
    }
  }
  return owners
}

const abcPath = argument('--abc')
const manifestPath = argument('--manifest')
assert(
  abcPath && manifestPath,
  'usage: bun roster_connection_timestamp_provenance.ts --abc <main.abc> --manifest <manifest.json>',
)

const abcBytes = readFileSync(resolve(abcPath))
const abcSha256 = sha256(new Uint8Array(abcBytes))
assert(abcSha256 === EXPECTED_ABC_SHA256, `ABC SHA-256 mismatch: ${abcSha256}`)
const abc: any = AbcFile.read(new ExtendedBuffer(abcBytes))
const strings = abc.constant_pool.string as string[]
const buildStrings = strings.filter((value) => /^\d+\.\d+\.\d+$/.test(value))
assert(buildStrings.length === 1 && buildStrings[0] === EXPECTED_BUILD, 'ABC build mismatch')

const disassembler = new InstructionDisassembler(abc)
const methods = new Map<number, LocatedInstruction[]>()
const branchErrors: string[] = []
for (const body of abc.method_body) {
  const instructions = locateInstructions(body.code, disassembler.disassemble(body) as Instruction[])
  methods.set(body.method, instructions)
  branchErrors.push(...validateBranches(instructions, body.code.length).map((pc) => `method ${body.method} ${pc}`))
}
assert(branchErrors.length === 0, `invalid branch targets: ${branchErrors.join(', ')}`)
const owners = buildOwners(abc, strings)

function requireAt(methodId: number, pc: number, opcode: string, name?: string): LocatedInstruction {
  const instruction = methods.get(methodId)?.find((candidate) => candidate.pc === pc)
  assert(instruction, `method ${methodId} lacks PC ${pc}`)
  assert(instruction.name === opcode, `method ${methodId} PC ${pc} is not ${opcode}`)
  if (name !== undefined) {
    const actual =
      instruction.name === 'pushstring' ? instruction.params[0] : multinameName(instruction.params[0], strings)
    assert(actual === name, `method ${methodId} PC ${pc} does not name ${name}`)
  }
  return instruction
}

function branchTarget(instruction: LocatedInstruction): number {
  const offset = instruction.params[0]
  assert(typeof offset === 'number', `branch at PC ${instruction.pc} lacks a numeric offset`)
  return instruction.endPc + offset
}

function exactQNameAt(methodId: number, pc: number): string {
  const instruction = methods.get(methodId)?.find((candidate) => candidate.pc === pc)
  assert(instruction, `method ${methodId} lacks PC ${pc}`)
  const key = qnameKey(instruction.params[0])
  assert(key, `method ${methodId} PC ${pc} does not use an exact QName`)
  return key
}

function methodQName(methodId: number): string {
  const matches = abc.instance.flatMap((instance: any, classIndex: number) =>
    [
      ...(instance.trait ?? []).map((trait: any) => ({ trait, classIndex })),
      ...(abc.class[classIndex].traits ?? []).map((trait: any) => ({ trait, classIndex })),
    ].filter(({ trait }) => trait.data?.method === methodId),
  )
  assert(matches.length === 1, `expected one trait for method ${methodId}`)
  const key = qnameKey(abc.constant_pool.multiname[matches[0].trait.name - 1])
  assert(key, `method ${methodId} does not have an exact QName`)
  return key
}

function methodParamTypeQName(methodId: number, parameterIndex: number): string {
  const typeIndex = abc.method[methodId]?.param_type[parameterIndex]
  assert(typeof typeIndex === 'number', `method ${methodId} lacks parameter ${parameterIndex + 1}`)
  const key = qnameKey(abc.constant_pool.multiname[typeIndex - 1])
  assert(key, `method ${methodId} parameter ${parameterIndex + 1} does not use an exact QName`)
  return key
}

function classQName(classIndex: number): string {
  const key = qnameKey(abc.constant_pool.multiname[abc.instance[classIndex].name - 1])
  assert(key, `class ${classIndex} does not use an exact QName`)
  return key
}

const targetQNameKey = exactQNameAt(6519, 1118)
const traitDefinitions: TraitDefinition[] = abc.instance.flatMap((instance: any, classIndex: number) =>
  (instance.trait ?? []).flatMap((trait: any) =>
    qnameKey(abc.constant_pool.multiname[trait.name - 1]) === targetQNameKey
      ? [
          {
            classIndex,
            className: multinameName(abc.constant_pool.multiname[instance.name - 1], strings),
            trait,
          },
        ]
      : [],
  ),
)
assert(
  JSON.stringify(traitDefinitions.map(({ classIndex, className }) => ({ classIndex, className }))) ===
    JSON.stringify([
      { classIndex: 123, className: '_-ao' },
      { classIndex: 125, className: '_-Y10' },
      { classIndex: 147, className: '_-V4R' },
      { classIndex: 329, className: '_-kv' },
    ]),
  'target trait definitions changed',
)
for (const { trait } of traitDefinitions) {
  assert((trait.kind & 0x0f) === 0, `${TARGET_TRAIT} is not a slot`)
  assert(
    multinameName(abc.constant_pool.multiname[trait.data.type_name - 1], strings) === 'uint',
    `${TARGET_TRAIT} is not uint`,
  )
  assert(trait.data.vindex === 0, `${TARGET_TRAIT} has an explicit constant initializer`)
}

const exactFieldReferences = [...methods.entries()].flatMap(([methodId, instructions]) => {
  const hits = instructions.flatMap((instruction) =>
    qnameKey(instruction.params[0]) === targetQNameKey ? [{ pc: instruction.pc, opcode: instruction.name }] : [],
  )
  return hits.length > 0 ? [{ methodId, owner: owners.get(methodId) ?? null, hits }] : []
})
const fieldLedgerSha256 = sha256(JSON.stringify(exactFieldReferences))
assert(fieldLedgerSha256 === EXPECTED_FIELD_LEDGER_SHA256, 'exact field-reference ledger changed')
assert(exactFieldReferences.length === 42, 'exact field-reference method count changed')
assert(
  exactFieldReferences.reduce((count, entry) => count + entry.hits.length, 0) === 80,
  'exact field-reference instruction count changed',
)

requireAt(2366, 140, 'findproperty', TARGET_TRAIT)
assert(requireAt(2366, 143, 'pushbyte').params[0] === 0, 'constructor default is not zero')
requireAt(2366, 145, 'initproperty', TARGET_TRAIT)
requireAt(2381, 2, 'findproperty', TARGET_TRAIT)
requireAt(2381, 5, 'getlocal_1')
requireAt(2381, 6, 'initproperty', TARGET_TRAIT)
requireAt(5386, 69, 'getlocal_1')
requireAt(5386, 70, 'callproperty', '_-A17')
requireAt(5386, 75, 'convert_u')
assert(requireAt(5386, 77, 'setlocal').params[0] === 5, 'join update does not store the third uint in local 5')
assert(requireAt(5386, 150, 'getlocal').params[0] === 6, 'join update does not target the roster record')
assert(requireAt(5386, 152, 'getlocal').params[0] === 5, 'join update does not pass the third uint')
assert(exactQNameAt(5386, 154) === methodQName(2381), 'join update does not call the exact timestamp setter')
requireAt(5386, 459, 'pushstring', 'UI_CharacterSlot_Notification_HasJoined')
assert(requireAt(5388, 196, 'getlocal').params[0] === 8, 'leave update does not target the roster record')
assert(requireAt(5388, 198, 'pushbyte').params[0] === 0, 'leave update does not clear with zero')
assert(exactQNameAt(5388, 200) === methodQName(2381), 'leave update does not call the exact timestamp setter')

requireAt(2289, 115, 'getproperty', TARGET_TRAIT)
requireAt(2289, 119, 'greaterequals')
assert(branchTarget(requireAt(2289, 121, 'iffalse')) === 136, 'next-value maximum branch changed')
requireAt(2289, 127, 'getproperty', TARGET_TRAIT)
assert(requireAt(2289, 130, 'pushbyte').params[0] === 1, 'synthetic timestamp increment is not one')
requireAt(2289, 132, 'add_i')
requireAt(2289, 135, 'setlocal_2')
requireAt(2289, 143, 'getlocal_2')
requireAt(2289, 144, 'returnvalue')
requireAt(3205, 513, 'getproperty', TARGET_TRAIT)
requireAt(3205, 525, 'getproperty', TARGET_TRAIT)
assert(requireAt(3205, 1103, 'getlocal').params[0] === 14, 'synthetic assignment target changed')
assert(requireAt(3205, 1105, 'getlocal').params[0] === 7, 'synthetic max timestamp local changed')
requireAt(3205, 1107, 'increment')
requireAt(3205, 1112, 'initproperty', TARGET_TRAIT)

requireAt(6519, 655, 'getproperty', TARGET_TRAIT)
requireAt(6519, 658, 'initproperty', TARGET_TRAIT)
requireAt(6519, 1118, 'getproperty', TARGET_TRAIT)
requireAt(6519, 1121, 'callpropvoid', '_-S2c')
requireAt(6510, 883, 'findpropstrict', '_-kv')
requireAt(6510, 887, 'constructprop', '_-kv')
assert(requireAt(6510, 896, 'setlocal').params[0] === 23, 'reader does not store the roster in local 23')
requireAt(6510, 1068, 'callproperty', '_-8v')
requireAt(6510, 1072, 'convert_u')
requireAt(6510, 1073, 'initproperty', TARGET_TRAIT)
requireAt(6510, 1358, 'getproperty', '_-I1a')
assert(requireAt(6510, 1363, 'getlocal').params[0] === 23, 'reader does not publish local 23')
requireAt(6510, 1365, 'setproperty')
requireAt(3507, 304, 'getproperty', '_-I1a')
requireAt(3507, 313, 'coerce', '_-kv')
assert(requireAt(3507, 321, 'setlocal').params[0] === 7, 'replay startup does not retain the restored roster')
assert(requireAt(3507, 374, 'getlocal').params[0] === 7, 'replay startup does not pass the restored roster')
assert(requireAt(3507, 376, 'callproperty', '_-HT').params[1] === 5, 'replay startup factory argument count changed')
assert(requireAt(3071, 8, 'getlocal').params[0] === 5, 'fighter factory does not forward roster parameter 5')
assert(requireAt(3071, 16, 'constructprop', '_-V4R').params[1] === 8, 'fighter constructor argument count changed')
requireAt(2790, 2224, 'findproperty', TARGET_TRAIT)
assert(requireAt(2790, 2227, 'getlocal').params[0] === 5, 'fighter constructor does not read roster parameter 5')
requireAt(2790, 2229, 'getproperty', TARGET_TRAIT)
requireAt(2790, 2232, 'initproperty', TARGET_TRAIT)
const rosterRecordQName = exactQNameAt(6510, 887)
assert(rosterRecordQName === classQName(329), 'reader does not construct the exact replay roster class')
assert(
  methodParamTypeQName(3071, 4) === rosterRecordQName,
  'fighter factory parameter 5 is not the restored roster type',
)
assert(
  methodParamTypeQName(2790, 4) === rosterRecordQName,
  'fighter constructor parameter 5 is not the restored roster type',
)
assert(exactQNameAt(6510, 1358) === exactQNameAt(3507, 304), 'reader and replay startup use different roster lists')
assert(exactQNameAt(3507, 376) === methodQName(3071), 'replay startup does not call the exact fighter factory')
assert(exactQNameAt(3071, 16) === classQName(147), 'fighter factory does not construct the exact fighter class')
assert(abc.instance[147].iinit === 2790, 'fighter class constructor is not method 2790')
assert(exactQNameAt(6519, 655) === exactQNameAt(6519, 658), 'writer copy uses different field QNames')
assert(exactQNameAt(6519, 658) === exactQNameAt(6510, 1073), 'writer and reader use different field QNames')
assert(exactQNameAt(6510, 1073) === exactQNameAt(2790, 2229), 'reader and fighter copy use different field QNames')

requireAt(6879, 70, 'getproperty', TARGET_TRAIT)
requireAt(6879, 74, 'getproperty', TARGET_TRAIT)
requireAt(6879, 77, 'equals')
requireAt(6879, 78, 'not')
assert(branchTarget(requireAt(6879, 79, 'iffalse')) === 93, 'timestamp equality does not branch to entity-ID tie-break')
requireAt(6879, 84, 'getproperty', TARGET_TRAIT)
requireAt(6879, 88, 'getproperty', TARGET_TRAIT)
requireAt(6879, 91, 'lessthan')
requireAt(6879, 92, 'returnvalue')
requireAt(6879, 94, 'getproperty', '_-35a')
requireAt(6879, 99, 'getproperty', '_-35a')
requireAt(6879, 103, 'lessthan')
requireAt(6879, 104, 'returnvalue')
requireAt(8781, 136, 'getproperty', TARGET_TRAIT)
requireAt(8781, 140, 'getproperty', TARGET_TRAIT)
requireAt(8781, 143, 'equals')
requireAt(8781, 144, 'not')
assert(
  branchTarget(requireAt(8781, 145, 'iffalse')) === 160,
  'timestamp equality does not branch to entity-ID tie-break',
)
requireAt(8781, 150, 'getproperty', TARGET_TRAIT)
requireAt(8781, 154, 'getproperty', TARGET_TRAIT)
requireAt(8781, 157, 'subtract_i')
requireAt(8781, 158, 'convert_u')
requireAt(8781, 159, 'returnvalue')
requireAt(8781, 161, 'getproperty', '_-35a')
requireAt(8781, 166, 'getproperty', '_-35a')
requireAt(8781, 170, 'subtract_i')
requireAt(8781, 171, 'convert_u')
requireAt(8781, 172, 'returnvalue')
assert(exactQNameAt(8759, 1392) === methodQName(8781), 'screen sort does not use exact timestamp comparator')
requireAt(8759, 1395, 'coerce', 'Function')
requireAt(8759, 1399, 'callpropvoid', 'sort')

const manifestBytes = readFileSync(resolve(manifestPath))
const manifestSha256 = sha256(new Uint8Array(manifestBytes))
assert(manifestSha256 === EXPECTED_MANIFEST_SHA256, `manifest SHA-256 mismatch: ${manifestSha256}`)
let manifest: CorpusManifest
try {
  manifest = JSON.parse(manifestBytes.toString('utf8')) as CorpusManifest
} catch (error) {
  throw new Error(`invalid manifest JSON: ${error instanceof Error ? error.message : String(error)}`)
}
assert(manifest.schemaVersion === 1, 'manifest schema changed')
assert(manifest.target.build === EXPECTED_BUILD, 'manifest build changed')
assert(manifest.target.replayFormat === EXPECTED_FORMAT, 'manifest format changed')
assert(manifest.provenance.abcSha256 === EXPECTED_ABC_SHA256, 'manifest ABC identity changed')
assert(manifest.fixtures.length === EXPECTED_REPLAY_SHA256.size, 'manifest fixture count changed')
assert(
  new Set(manifest.fixtures.map((fixture) => fixture.sha256)).size === EXPECTED_REPLAY_SHA256.size &&
    manifest.fixtures.every((fixture) => EXPECTED_REPLAY_SHA256.has(fixture.sha256)),
  'manifest replay identities changed',
)

const corpusRows = manifest.fixtures.map((fixture) => {
  const replayBytes = readFileSync(resolve(dirname(manifestPath), fixture.file))
  assert(sha256(new Uint8Array(replayBytes)) === fixture.sha256, `fixture hash mismatch: ${fixture.sha256}`)
  const raw = new Uint8Array(replayBytes)
  const values = readRosterConnectionTimestamps(raw)
  const replay = parse(raw)
  assert(replay.formatVersion === EXPECTED_FORMAT, `fixture format mismatch: ${fixture.sha256}`)
  assert(replay.onlineGame, `fixture is not online: ${fixture.sha256}`)
  assert(
    replay.entities.every((entity) => !entity.isBot),
    `fixture contains a bot: ${fixture.sha256}`,
  )
  assert(replay.results.length > 0, `fixture has no results: ${fixture.sha256}`)
  assert(
    replay.results.every((result) => result.lengthMs === 186_016),
    `fixture match duration changed: ${fixture.sha256}`,
  )
  assert(values.length === replay.entities.length, `independent roster decode count mismatch: ${fixture.sha256}`)
  assert(values.length > 0, `fixture has no roster values: ${fixture.sha256}`)
  assert(
    values.every((value) => value > 0),
    `fixture has zero timestamp: ${fixture.sha256}`,
  )
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const sourceModifiedSeconds = Math.floor(Date.parse(fixture.sourceModifiedAt) / 1000)
  assert(Number.isFinite(sourceModifiedSeconds), `fixture has invalid sourceModifiedAt: ${fixture.sha256}`)
  return {
    entityCount: values.length,
    spreadSeconds: maximum - minimum,
    secondsFromLatestTimestampToSourceModifiedAt: sourceModifiedSeconds - maximum,
    utcDates: [...new Set(values.map((value) => new Date(value * 1000).toISOString().slice(0, 10)))],
  }
})
const spreads = corpusRows.map((row) => row.spreadSeconds)
const modificationOffsets = corpusRows.map((row) => row.secondsFromLatestTimestampToSourceModifiedAt)
const utcDates = [...new Set(corpusRows.flatMap((row) => row.utcDates))]
assert(
  corpusRows.every((row) => row.entityCount === 4),
  'reviewed corpus roster shape changed',
)
assert(Math.min(...spreads) === 8 && Math.max(...spreads) === 787, 'reviewed timestamp spread changed')
assert(
  Math.min(...modificationOffsets) === 205 && Math.max(...modificationOffsets) === 212,
  'reviewed timestamp-to-file offset changed',
)
assert(JSON.stringify(utcDates) === JSON.stringify(['2026-08-04']), 'reviewed timestamp UTC dates changed')
assert(
  modificationOffsets.every((offset) => offset >= 0),
  'a timestamp follows its source file modification time',
)

const output = {
  status: 'proven-for-reviewed-inputs',
  identity: {
    build: EXPECTED_BUILD,
    abcSha256,
    manifestSha256,
    decodedMethodBodies: abc.method_body.length,
    branchTargetsValid: true,
  },
  field: {
    structuralName: 'connectionTimestampSeconds',
    traitName: TARGET_TRAIT,
    type: 'uint',
    serializedType: 'uint32',
    units: 'whole seconds since the Unix epoch',
    zeroMeaning: 'not joined or cleared from the active roster slot',
  },
  anchors: {
    constructorDefault: [2366, 140, 143, 145],
    setter: [2381, 2, 5, 6],
    joinUpdate: [5386, 69, 70, 75, 77, 150, 152, 154, 459],
    clearUpdate: [5388, 196, 198, 200],
    syntheticNextValue: [2289, 115, 119, 127, 130, 132, 143, 144, 3205, 513, 525, 1103, 1105, 1107, 1112],
    replayWriter: [6519, 655, 658, 1118, 1121],
    replayReader: [6510, 883, 887, 896, 1068, 1072, 1073, 1358, 1363, 1365],
    replayStartup: [3507, 304, 313, 321, 374, 376, 3071, 16],
    fighterCopy: [2790, 2224, 2227, 2229, 2232],
    orderingConsumer: [
      6879, 70, 74, 77, 78, 79, 84, 88, 91, 92, 94, 99, 103, 104, 8781, 136, 140, 143, 144, 145, 150, 154, 157, 158,
      159, 161, 166, 170, 171, 172, 8759, 1392, 1395, 1399,
    ],
  },
  referenceClosure: {
    exactQName: targetQNameKey,
    definitionClasses: traitDefinitions.map(({ classIndex, className }) => ({ classIndex, className })),
    methodCount: exactFieldReferences.length,
    instructionCount: exactFieldReferences.reduce((count, entry) => count + entry.hits.length, 0),
    ledgerSha256: fieldLedgerSha256,
    exactFieldReferences,
  },
  reviewedCorpus: {
    fixtureCount: corpusRows.length,
    onlineFixtureCount: corpusRows.length,
    humanEntityCount: corpusRows.reduce((count, row) => count + row.entityCount, 0),
    matchDurationMs: 186_016,
    entityCount: corpusRows.reduce((count, row) => count + row.entityCount, 0),
    withinFixtureSpreadSecondsRange: [Math.min(...spreads), Math.max(...spreads)],
    secondsFromLatestTimestampToSourceModifiedAtRange: [
      Math.min(...modificationOffsets),
      Math.max(...modificationOffsets),
    ],
    utcDates,
    allTimestampsPrecedeSourceModifiedAt: modificationOffsets.every((offset) => offset >= 0),
  },
}

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
