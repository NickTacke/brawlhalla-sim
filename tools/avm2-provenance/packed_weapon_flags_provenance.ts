import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'
import { BitReader } from '../../packages/replay-format/src/bitstream.js'
import { decodeEnvelope } from '../../packages/replay-format/src/envelope.js'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }
type ManifestFixture = { file: string; sha256: string }
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
const EXPECTED_FIXTURE_COUNT = 12
const EXPECTED_LOADOUT_COUNT = 48
const PACKED_CLASS_INDEX = 213
const PACKED_CLASS_NAME = '_-o2f'
const PACKED_TRAIT_NAME = '_-b1T'
const BIT_15 = 0x8000
const BIT_31 = 0x80000000
const LOW_15 = 0x7fff
const HIGH_15 = 0x7fff0000
const EXPECTED_PACKED_REFERENCE_DIGEST = 'c54f7502e4040b3dc3b9c4c9a05805555b6b30e9b3a3d9ceab587d226df494d8'
const EXPECTED_BIT15_TEST_DIGEST = '3a6b7ccde2ed04af3f0d2d2f7b0184648c942147f810f9549d4da8508511c06f'
const EXPECTED_BIT31_REFERENCE_DIGEST = '040b33b3f8b6bc6b9b8e87c822bcb478c0eb45cbdaf65aad32210c9a5e747f2e'
const EXPECTED_HELPER_REFERENCE_DIGEST = '1de92407fca33d10c963495c07e09e7819c0a9949eced3a47764938840bdbb76'
const EXPECTED_PACKED_WRITE_DIGEST = '2cf98a00771e0121e078699e56df39ab14f30776ae19c02acca46d0a854afd1d'
const EXPECTED_ORDER_MUTATOR_CALLER_DIGEST = 'ef371aa5dc325b62ca183b4d9d8ff83e2b5e6499af0c8e4c0a0a75e8bb04c5fb'
const EXPECTED_MODE_START_POLICY_CALLER_DIGEST = '5800b025bed5282036a60285ed240759874117f7965d92a6f4ac09c6ac304d9e'
const EXPECTED_RUNTIME_ORDER_REFERENCE_DIGEST = 'c448b9326ccbc08e39e0b984222f607eb8f7131a439d1139431ff27cb9459f4b'

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
  if (candidate.kind !== 7 || typeof candidate.data?.ns !== 'number' || typeof candidate.data.name !== 'number')
    return null
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

function skipString(reader: BitReader): void {
  const byteLength = reader.u16()
  for (let index = 0; index < byteLength; index++) reader.u8()
}

function readPackedWords(raw: Uint8Array): number[] {
  const reader = new BitReader(decodeEnvelope(raw))
  assert(reader.u32() === EXPECTED_FORMAT, `replay format is not ${EXPECTED_FORMAT}`)
  assert(reader.bits(4) === 3, 'first replay section is not state 3')
  reader.u32()
  if (reader.u32() !== 0) skipString(reader)
  reader.bool()
  assert(reader.bits(4) === 4, 'state 3 is not followed by state 4')
  for (let index = 0; index < 15; index++) reader.u32()
  reader.u32()
  const heroCount = reader.u16()
  const packedWords: number[] = []
  while (reader.bool()) {
    reader.u32()
    reader.u32()
    skipString(reader)
    for (let index = 0; index < 6; index++) reader.u32()
    for (let index = 0; index < 8; index++) reader.u32()
    reader.u16()
    reader.u16()
    while (reader.bool()) reader.u32()
    reader.u16()
    reader.u32()
    reader.u32()
    for (let index = 0; index < heroCount; index++) {
      reader.u32()
      reader.u32()
      reader.u32()
      packedWords.push(reader.u32())
    }
    reader.bool()
    if (reader.bool()) {
      reader.u32()
      reader.u32()
      reader.u32()
    }
  }
  return packedWords
}

const abcPath = argument('--abc')
const manifestPath = argument('--manifest')
if (!abcPath || !manifestPath) {
  console.error('usage: bun packed_weapon_flags_provenance.ts --abc <main.abc> --manifest <manifest.json>')
  process.exit(64)
}

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

function exactQNameAt(methodId: number, pc: number): string {
  const instruction = requireAt(
    methodId,
    pc,
    methods.get(methodId)?.find((candidate) => candidate.pc === pc)?.name ?? '',
  )
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

function exactReferencesForQName(key: string): Array<{
  methodId: number
  owner: MethodOwner | null
  references: Array<{ pc: number; opcode: string }>
}> {
  return [...methods.entries()]
    .map(([methodId, instructions]) => ({
      methodId,
      owner: owners.get(methodId) ?? null,
      references: instructions
        .filter((instruction) => qnameKey(instruction.params[0]) === key)
        .map((instruction) => ({ pc: instruction.pc, opcode: instruction.name })),
    }))
    .filter((entry) => entry.references.length > 0)
}

const packedClass = abc.instance[PACKED_CLASS_INDEX]
assert(
  multinameName(abc.constant_pool.multiname[packedClass.name - 1], strings) === PACKED_CLASS_NAME,
  'packed class mismatch',
)
const packedTraits = (packedClass.trait as any[]).filter(
  (trait) => multinameName(abc.constant_pool.multiname[trait.name - 1], strings) === PACKED_TRAIT_NAME,
)
assert(packedTraits.length === 1, `expected one ${PACKED_TRAIT_NAME} trait`)
const packedTrait = packedTraits[0]
assert((packedTrait.kind & 0x0f) === 0, `${PACKED_TRAIT_NAME} is not a slot`)
assert(packedTrait.data.vindex === 0, `${PACKED_TRAIT_NAME} has an explicit initializer`)
assert(
  multinameName(abc.constant_pool.multiname[packedTrait.data.type_name - 1], strings) === 'uint',
  `${PACKED_TRAIT_NAME} is not uint`,
)
const packedKey = qnameKey(abc.constant_pool.multiname[packedTrait.name - 1])
assert(packedKey, `${PACKED_TRAIT_NAME} does not use an exact QName`)
const packedReferences = exactReferencesForQName(packedKey)
const packedReferenceDigest = sha256(JSON.stringify(packedReferences))

const bit31Key = exactQNameAt(3845, 571)
const high15Key = exactQNameAt(3845, 640)
const bit31References = exactReferencesForQName(bit31Key)
const bit31ReferenceDigest = sha256(JSON.stringify(bit31References))
const helperReferences = {
  packWeaponSkinObjects: exactReferencesForQName(methodQName(14711)),
  selectWeaponSkinId: exactReferencesForQName(methodQName(14713)),
}
const helperReferenceDigest = sha256(JSON.stringify(helperReferences))
const packedWrites = packedReferences.flatMap((entry) =>
  entry.references
    .filter((reference) => reference.opcode === 'initproperty' || reference.opcode === 'setproperty')
    .map((reference) => ({ methodId: entry.methodId, owner: entry.owner, ...reference })),
)
const packedWriteDigest = sha256(JSON.stringify(packedWrites))
const orderMutatorCallers = exactReferencesForQName(methodQName(3703))
const orderMutatorCallerDigest = sha256(JSON.stringify(orderMutatorCallers))
const modeStartPolicyCallers = exactReferencesForQName(methodQName(3696))
const modeStartPolicyCallerDigest = sha256(JSON.stringify(modeStartPolicyCallers))
const runtimeOrderKey = exactQNameAt(1518, 448)
const runtimeOrderReferences = exactReferencesForQName(runtimeOrderKey)
const runtimeOrderReferenceDigest = sha256(JSON.stringify(runtimeOrderReferences))

const bit15Tests = [...methods.entries()].flatMap(([methodId, instructions]) =>
  instructions.flatMap((literal) => {
    if (!['pushint', 'pushuint', 'pushshort'].includes(literal.name) || Number(literal.params[0]) !== BIT_15) return []
    let cursor = literal.index + 1
    if (instructions[cursor]?.name === 'convert_u') cursor++
    const bitand = instructions[cursor]
    const zero = instructions[cursor + 1]
    const comparison = instructions[cursor + 2]
    if (bitand?.name !== 'bitand' || zero?.name !== 'pushbyte' || zero.params[0] !== 0 || comparison?.name !== 'equals')
      return []
    return [{ methodId, owner: owners.get(methodId) ?? null, literalPc: literal.pc, bitandPc: bitand.pc }]
  }),
)
const bit15TestDigest = sha256(JSON.stringify(bit15Tests))
const packedMethodIds = new Set(packedReferences.map((entry) => entry.methodId))
assert(
  bit15Tests.every((test) => !packedMethodIds.has(test.methodId)),
  'a 0x8000 test reads the packed weapon field',
)
for (const test of bit15Tests) {
  const directCallers = exactReferencesForQName(methodQName(test.methodId))
  assert(
    directCallers.every((caller) => !packedMethodIds.has(caller.methodId)),
    `a direct caller of method ${test.methodId} reads the packed weapon field`,
  )
}

requireAt(6519, 1236, 'getproperty', PACKED_TRAIT_NAME)
requireAt(6519, 1240, 'callpropvoid', '_-S2c')
requireAt(6510, 1171, 'callproperty', '_-8v')
requireAt(6510, 1176, 'initproperty', PACKED_TRAIT_NAME)

requireAt(2037, 190, 'getproperty', 'mWeaponSkin1')
requireAt(2037, 194, 'getproperty', 'mWeaponSkin2')
requireAt(2037, 197, 'pushfalse')
assert(exactQNameAt(2037, 198) === methodQName(14711), 'costume default does not call the exact object packer')
requireAt(14711, 10, 'getproperty', '_-M6S')
requireAt(14711, 34, 'getproperty', '_-M6S')
requireAt(14711, 55, 'lshift')
assert(exactQNameAt(14711, 66) === bit31Key, 'object packer does not use the exact bit-31 mask')
requireAt(14711, 76, 'bitor')
assert(
  !(methods.get(14711) ?? []).some(
    (instruction) =>
      ['pushint', 'pushuint', 'pushshort'].includes(instruction.name) && Number(instruction.params[0]) === BIT_15,
  ),
  'object packer unexpectedly uses bit 15',
)
assert(
  helperReferences.packWeaponSkinObjects.map((entry) => entry.methodId).join(',') === '2037,3688,6363',
  'object packer callsites changed',
)

const bit31Initializer = requireAt(14722, 39, 'pushint')
assert(Number(bit31Initializer.params[0]) === -2147483648, 'bit-31 initializer changed')
assert(exactQNameAt(14722, 41) === bit31Key, 'bit-31 initializer targets another field')
const high15Initializer = requireAt(14909, 78427, 'pushuint')
assert(Number(high15Initializer.params[0]) === HIGH_15, 'high-15 initializer changed')
assert(exactQNameAt(14909, 78430) === high15Key, 'high-15 initializer targets another field')

assert(exactQNameAt(3845, 564) === packedKey, 'primary selector reads another packed field')
assert(exactQNameAt(3845, 571) === bit31Key, 'primary selector reads another bit-31 mask')
requireAt(3845, 574, 'bitand')
const selectorZero = requireAt(3845, 575, 'pushbyte')
assert(selectorZero.params[0] === 0, 'primary selector no longer compares bit 31 with zero')
requireAt(3845, 577, 'equals')
requireAt(3845, 578, 'not')
requireAt(3845, 579, 'not')
const selectWeapon2 = requireAt(3845, 594, 'iffalse')
assert(
  selectWeapon2.endPc + Number(selectWeapon2.params[0]) === 625,
  'false selector no longer enters the weapon-2 resolver',
)
assert(Number(requireAt(3845, 610, 'pushuint').params[0]) === LOW_15, 'low-15 mask changed')
requireAt(3845, 643, 'bitand')
requireAt(3845, 647, 'urshift')
requireAt(3845, 679, 'getproperty', 'mWeaponSkin1')
requireAt(3845, 693, 'getproperty', 'mWeaponSkin2')
assert(exactQNameAt(5578, 926) === packedKey, 'pickup builder reads another packed field')
assert(exactQNameAt(5578, 933) === bit31Key, 'pickup builder uses another bit-31 mask')
requireAt(5578, 936, 'bitand')
const bit31Clear = requireAt(5578, 941, 'iffalse')
assert(
  bit31Clear.endPc + Number(bit31Clear.params[0]) === 953,
  'clear bit 31 no longer enters the weapon-2 disable branch',
)
const weapon1Disabled = requireAt(5578, 947, 'setlocal')
const joinPickupBranches = requireAt(5578, 949, 'jump')
assert(
  joinPickupBranches.endPc + Number(joinPickupBranches.params[0]) === 957,
  'set bit 31 no longer skips the weapon-2 disable branch',
)
const weapon2Disabled = requireAt(5578, 955, 'setlocal')
assert(weapon1Disabled.params[0] === 22, 'set bit 31 does not disable the weapon-1 branch')
assert(weapon2Disabled.params[0] === 23, 'clear bit 31 does not disable the weapon-2 branch')
requireAt(5578, 969, 'getproperty', 'mBaseWeapon1')
requireAt(5578, 1056, 'getproperty', 'mWeaponSkin1')
requireAt(5578, 1240, 'getproperty', 'mBaseWeapon2')
requireAt(5578, 1327, 'getproperty', 'mWeaponSkin2')
assert(exactQNameAt(2790, 5765) === packedKey, 'fighter constructor reads another packed field')
assert(Number(requireAt(2790, 5784, 'pushuint').params[0]) === LOW_15, 'fighter low-15 mask changed')
assert(exactQNameAt(2790, 5808) === high15Key, 'fighter constructor uses another high-15 mask')
requireAt(2790, 5815, 'urshift')

const forcePrimaryKey = exactQNameAt(12936, 912)
const forcePrimaryReferences = exactReferencesForQName(forcePrimaryKey)
requireAt(12936, 896, 'pushstring', 'ForcePrimaryWeaponFirst')
requireAt(12936, 907, 'callproperty', '_-n4E')
requireAt(12936, 912, 'initproperty', '_-X5Q')
requireAt(12918, 311, 'getproperty', '_-X5Q')
assert(forcePrimaryReferences.length === 2, 'ForcePrimaryWeaponFirst field reference closure changed')
const forcePrimaryTrait = (abc.instance[704].trait as any[]).find(
  (trait) => qnameKey(abc.constant_pool.multiname[trait.name - 1]) === forcePrimaryKey,
)
assert(forcePrimaryTrait, 'ForcePrimaryWeaponFirst trait is missing')
assert((forcePrimaryTrait.kind & 0x0f) === 0, 'ForcePrimaryWeaponFirst is not a slot')
assert(forcePrimaryTrait.data.vindex === 0, 'ForcePrimaryWeaponFirst no longer has the Boolean default')
assert(
  multinameName(abc.constant_pool.multiname[forcePrimaryTrait.data.type_name - 1], strings) === 'Boolean',
  'ForcePrimaryWeaponFirst is not Boolean',
)

// Costume and shuffled-loadout construction always pack the order bit clear.
requireAt(3688, 1469, 'getlex', '_-t4x')
requireAt(3688, 1476, 'pushfalse')
assert(exactQNameAt(3688, 1477) === methodQName(14711), 'shuffle path does not call the exact object packer')
requireAt(3688, 1608, 'initproperty', PACKED_TRAIT_NAME)

// Method 3703 is the only direct replay-loadout bit-31 mutator in the pinned
// exact-QName ledgers. It balances base weapon types and consumes randomness
// only when both candidate counts tie.
assert(orderMutatorCallers.map((entry) => entry.methodId).join(',') === '3696,10753', 'order mutator callers changed')
assert(exactQNameAt(3696, 244) === packedKey, 'mode-start zero gate reads another packed field')
assert(requireAt(3696, 248, 'pushbyte').params[0] === 0, 'mode-start zero sentinel changed')
requireAt(3696, 250, 'equals')
requireAt(3696, 255, 'pushtrue')
const skipModeStartOrder = requireAt(3696, 275, 'iffalse')
assert(skipModeStartOrder.endPc + Number(skipModeStartOrder.params[0]) === 308, 'mode-start zero-loadout skip changed')
assert(modeStartPolicyCallers.map((entry) => entry.methodId).join(',') === '6936', 'mode-start policy callers changed')
assert(requireAt(6936, 22, 'pushbyte').params[0] === 3, 'mode-start game-mode gate changed')
requireAt(6936, 25, 'equals')
const modeStartGate = requireAt(6936, 26, 'iffalse')
assert(modeStartGate.endPc + Number(modeStartGate.params[0]) === 69, 'mode-start game-mode skip changed')
assert(exactQNameAt(6936, 64) === methodQName(3696), 'mode-start gate no longer calls the exact policy method')
const modeStartOrderCall = requireAt(3696, 304, 'callpropvoid', '_-l2Z')
assert(modeStartOrderCall.params[1] === 3, 'mode-start order call no longer supplies an explicit Random')
assert(requireAt(10753, 1356, 'pushbyte').params[0] === 3, 'runtime-join game-mode gate changed')
requireAt(10753, 1359, 'equals')
const runtimeJoinGate = requireAt(10753, 1360, 'iffalse')
assert(runtimeJoinGate.endPc + Number(runtimeJoinGate.params[0]) === 1379, 'runtime-join game-mode skip changed')
const runtimeJoinOrderCall = requireAt(10753, 1375, 'callpropvoid', '_-l2Z')
assert(runtimeJoinOrderCall.params[1] === 2, 'runtime-join order call no longer uses the optional Random default')
assert(abc.method[3703].param_count === 3 && abc.method[3703].flags === 8, 'order mutator signature changed')
assert(
  abc.method[3703].options?.option?.length === 1 &&
    abc.method[3703].options.option[0].val === 0 &&
    abc.method[3703].options.option[0].kind === 0,
  'order mutator optional Random default changed',
)
requireAt(3703, 269, 'getproperty', '_-M3c')
requireAt(3703, 288, 'getproperty', '_-M3c')
requireAt(3703, 314, 'increment_i')
requireAt(3703, 335, 'increment_i')
requireAt(3703, 458, 'pushtrue')
assert(requireAt(3703, 459, 'getlocal').params[0] === 4, 'used-type table local changed')
assert(requireAt(3703, 461, 'getlocal').params[0] === 17, 'weapon-1 type local changed')
const weapon1AlreadyUsed = requireAt(3703, 468, 'iftrue')
assert(weapon1AlreadyUsed.endPc + Number(weapon1AlreadyUsed.params[0]) === 510, 'weapon-1 used branch changed')
requireAt(3703, 473, 'pushfalse')
assert(requireAt(3703, 474, 'getlocal').params[0] === 4, 'used-type table local changed')
assert(requireAt(3703, 476, 'getlocal').params[0] === 18, 'weapon-2 type local changed')
requireAt(3703, 483, 'not')
assert(requireAt(3703, 489, 'getlocal').params[0] === 5, 'weapon-type count table local changed')
assert(requireAt(3703, 491, 'getlocal').params[0] === 18, 'weapon-2 count index changed')
assert(requireAt(3703, 498, 'getlocal').params[0] === 5, 'weapon-type count table local changed')
assert(requireAt(3703, 500, 'getlocal').params[0] === 17, 'weapon-1 count index changed')
requireAt(3703, 507, 'lessthan')
const preferWeapon2 = requireAt(3703, 510, 'iffalse')
assert(preferWeapon2.endPc + Number(preferWeapon2.params[0]) === 522, 'weapon-2 preference branch changed')
requireAt(3703, 522, 'pushfalse')
assert(requireAt(3703, 523, 'getlocal').params[0] === 4, 'used-type table local changed')
assert(requireAt(3703, 525, 'getlocal').params[0] === 18, 'weapon-2 type local changed')
requireAt(3703, 532, 'not')
assert(requireAt(3703, 538, 'getlocal').params[0] === 5, 'weapon-type count table local changed')
assert(requireAt(3703, 540, 'getlocal').params[0] === 18, 'weapon-2 count index changed')
assert(requireAt(3703, 547, 'getlocal').params[0] === 5, 'weapon-type count table local changed')
assert(requireAt(3703, 549, 'getlocal').params[0] === 17, 'weapon-1 count index changed')
requireAt(3703, 556, 'equals')
const countsTie = requireAt(3703, 558, 'iffalse')
assert(countsTie.endPc + Number(countsTie.params[0]) === 613, 'weapon-count tie branch changed')
requireAt(3703, 562, 'getlocal_3')
requireAt(3703, 571, 'getlocal_3')
requireAt(3703, 572, 'callproperty', '_-H2L')
assert(requireAt(3703, 577, 'pushbyte').params[0] === 2, 'explicit Random tie modulus changed')
requireAt(3703, 579, 'modulo')
assert(requireAt(3703, 580, 'pushbyte').params[0] === 0, 'explicit Random tie polarity changed')
requireAt(3703, 582, 'equals')
requireAt(3703, 594, 'getproperty', '_-01W')
requireAt(3703, 597, 'callproperty', '_-H2L')
assert(Number(requireAt(3703, 602, 'pushdouble').params[0]) === 4294967295, 'global Random divisor changed')
assert(Number(requireAt(3703, 606, 'pushdouble').params[0]) === 0.5, 'global Random threshold changed')
requireAt(3703, 609, 'greaterequals')
const clearOrderBit = requireAt(3703, 615, 'iffalse')
assert(clearOrderBit.endPc + Number(clearOrderBit.params[0]) === 651, 'tie result no longer selects the clear branch')
assert(exactQNameAt(3703, 623) === packedKey, 'order mutator set branch reads another packed field')
assert(exactQNameAt(3703, 630) === bit31Key, 'order mutator set branch uses another bit')
requireAt(3703, 633, 'bitor')
requireAt(3703, 634, 'initproperty', PACKED_TRAIT_NAME)
assert(requireAt(3703, 638, 'getlocal').params[0] === 4, 'set-branch used-type table local changed')
assert(requireAt(3703, 640, 'getlocal').params[0] === 18, 'set branch no longer marks weapon 2 used')
requireAt(3703, 642, 'pushtrue')
requireAt(3703, 643, 'setproperty')
const joinOrderBranches = requireAt(3703, 647, 'jump')
assert(
  joinOrderBranches.endPc + Number(joinOrderBranches.params[0]) === 680,
  'set branch no longer skips the clear branch',
)
assert(exactQNameAt(3703, 655) === packedKey, 'order mutator clear branch reads another packed field')
assert(exactQNameAt(3703, 662) === bit31Key, 'order mutator clear branch uses another bit')
requireAt(3703, 665, 'bitnot')
requireAt(3703, 666, 'bitand')
requireAt(3703, 667, 'initproperty', PACKED_TRAIT_NAME)
assert(requireAt(3703, 671, 'getlocal').params[0] === 4, 'clear-branch used-type table local changed')
assert(requireAt(3703, 673, 'getlocal').params[0] === 17, 'clear branch no longer marks weapon 1 used')
requireAt(3703, 675, 'pushtrue')
requireAt(3703, 676, 'setproperty')
requireAt(3703, 692, 'decrement_i')
requireAt(3703, 709, 'decrement_i')

// The ordinary gameplay pickup order is a separate modulo-two counter. It is
// initialized from the item PRNG, incremented before each selection, and can be
// overridden by tutorial or special-mode state without touching the packed word.
assert(exactQNameAt(1492, 588) === runtimeOrderKey, 'runtime order constructor writes another field')
requireAt(1492, 568, 'findproperty', '_-Z2h')
requireAt(1492, 577, 'getproperty', '_-p38')
requireAt(1492, 580, 'callproperty', '_-H2L')
assert(requireAt(1492, 585, 'pushbyte').params[0] === 2, 'runtime order modulus changed')
requireAt(1492, 587, 'modulo')
requireAt(1492, 588, 'initproperty', '_-l2q')
requireAt(1518, 448, 'getproperty', '_-l2q')
requireAt(1518, 452, 'dup')
assert(requireAt(1518, 454, 'setlocal').params[0] === 8, 'pickup old-counter local changed')
requireAt(1518, 456, 'increment')
requireAt(1518, 457, 'initproperty', '_-l2q')
assert(requireAt(1518, 461, 'getlocal').params[0] === 8, 'pickup no longer compares the old counter')
assert(requireAt(1518, 463, 'pushbyte').params[0] === 2, 'pickup order modulus changed')
requireAt(1518, 465, 'modulo')
assert(requireAt(1518, 466, 'pushbyte').params[0] === 0, 'pickup order polarity changed')
requireAt(1518, 468, 'equals')
const pickupWeapon2 = requireAt(1518, 474, 'iffalse')
assert(pickupWeapon2.endPc + Number(pickupWeapon2.params[0]) === 495, 'pickup weapon-2 branch changed')
requireAt(1518, 488, 'getproperty', 'mBaseWeapon1')
const joinPickupSelection = requireAt(1518, 491, 'jump')
assert(joinPickupSelection.endPc + Number(joinPickupSelection.params[0]) === 508, 'pickup selection join changed')
requireAt(1518, 505, 'getproperty', 'mBaseWeapon2')
requireAt(3578, 130, 'getproperty', '_-l2q')
requireAt(3578, 134, 'dup')
assert(requireAt(3578, 136, 'setlocal').params[0] === 4, 'spawn old-counter local changed')
requireAt(3578, 138, 'increment')
requireAt(3578, 139, 'initproperty', '_-l2q')
assert(requireAt(3578, 143, 'getlocal').params[0] === 4, 'spawn no longer compares the old counter')
assert(requireAt(3578, 145, 'pushbyte').params[0] === 2, 'spawn order modulus changed')
requireAt(3578, 147, 'modulo')
assert(requireAt(3578, 148, 'pushbyte').params[0] === 0, 'spawn order polarity changed')
requireAt(3578, 150, 'equals')
const spawnWeapon2 = requireAt(3578, 154, 'iffalse')
assert(spawnWeapon2.endPc + Number(spawnWeapon2.params[0]) === 170, 'spawn weapon-2 branch changed')
requireAt(3578, 163, 'getproperty', 'mBaseWeapon1')
const joinSpawnSelection = requireAt(3578, 166, 'jump')
assert(joinSpawnSelection.endPc + Number(joinSpawnSelection.params[0]) === 178, 'spawn selection join changed')
requireAt(3578, 175, 'getproperty', 'mBaseWeapon2')
assert(requireAt(1613, 15, 'pushbyte').params[0] === 2, 'special-state selector changed')
assert(requireAt(1613, 22, 'pushbyte').params[0] === 1, 'special-state weapon-2 value changed')
assert(requireAt(1613, 29, 'pushbyte').params[0] === 0, 'special-state weapon-1 value changed')
requireAt(1613, 58, 'initproperty', '_-l2q')
requireAt(1613, 90, 'initproperty', '_-l2q')
const skipForcePrimary = requireAt(12918, 314, 'iffalse')
assert(skipForcePrimary.endPc + Number(skipForcePrimary.params[0]) === 329, 'ForcePrimaryWeaponFirst branch changed')
assert(exactQNameAt(12918, 325) === runtimeOrderKey, 'ForcePrimaryWeaponFirst writes another runtime field')
assert(requireAt(12918, 323, 'pushbyte').params[0] === 0, 'ForcePrimaryWeaponFirst no longer forces slot zero')
const packedReferenceMethodIds = new Set(packedReferences.map((entry) => entry.methodId))
assert(
  runtimeOrderReferences.every((entry) => !packedReferenceMethodIds.has(entry.methodId)),
  'packed weapon order and runtime pickup order now share a direct method',
)

assert(exactQNameAt(6527, 391) === packedKey, 'checksum reads another packed field')
assert(Number(requireAt(6527, 395, 'pushbyte').params[0]) === 2, 'packed checksum base weight changed')
requireAt(6527, 399, 'add_i')
requireAt(6527, 400, 'multiply_i')

const manifestBytes = readFileSync(resolve(manifestPath))
const manifestSha256 = sha256(new Uint8Array(manifestBytes))
assert(manifestSha256 === EXPECTED_MANIFEST_SHA256, `manifest SHA-256 mismatch: ${manifestSha256}`)
let manifest: CorpusManifest
try {
  manifest = JSON.parse(manifestBytes.toString('utf8')) as CorpusManifest
} catch (error) {
  throw new Error('manifest is not valid JSON', { cause: error })
}
assert(manifest.schemaVersion === 1, 'manifest schema mismatch')
assert(manifest.target.build === EXPECTED_BUILD && manifest.target.replayFormat === EXPECTED_FORMAT, 'target mismatch')
assert(manifest.provenance.abcSha256 === EXPECTED_ABC_SHA256, 'manifest ABC identity mismatch')
assert(manifest.fixtures.length === EXPECTED_FIXTURE_COUNT, 'fixture count mismatch')
const packedWords = manifest.fixtures.flatMap((fixture) => {
  const raw = new Uint8Array(readFileSync(join(dirname(resolve(manifestPath)), fixture.file)))
  assert(sha256(raw) === fixture.sha256, `fixture SHA-256 mismatch for ${fixture.sha256}`)
  return readPackedWords(raw)
})
assert(packedWords.length === EXPECTED_LOADOUT_COUNT, `loadout count mismatch: ${packedWords.length}`)
const bit15SetCount = packedWords.filter((value) => (value & BIT_15) !== 0).length
const bit31SetCount = packedWords.filter((value) => (value & BIT_31) !== 0).length
assert(bit15SetCount === 0, `unexpected bit-15 corpus count: ${bit15SetCount}`)
assert(bit31SetCount === 2, `unexpected bit-31 corpus count: ${bit31SetCount}`)

assert(packedReferenceDigest === EXPECTED_PACKED_REFERENCE_DIGEST, 'packed-field reference ledger changed')
assert(bit15TestDigest === EXPECTED_BIT15_TEST_DIGEST, 'bit-15 test ledger changed')
assert(bit31ReferenceDigest === EXPECTED_BIT31_REFERENCE_DIGEST, 'bit-31 reference ledger changed')
assert(helperReferenceDigest === EXPECTED_HELPER_REFERENCE_DIGEST, 'helper reference ledger changed')
assert(packedWriteDigest === EXPECTED_PACKED_WRITE_DIGEST, 'packed-write ledger changed')
assert(orderMutatorCallerDigest === EXPECTED_ORDER_MUTATOR_CALLER_DIGEST, 'order-mutator caller ledger changed')
assert(
  modeStartPolicyCallerDigest === EXPECTED_MODE_START_POLICY_CALLER_DIGEST,
  'mode-start policy caller ledger changed',
)
assert(
  runtimeOrderReferenceDigest === EXPECTED_RUNTIME_ORDER_REFERENCE_DIGEST,
  'runtime-order reference ledger changed',
)

console.log(
  JSON.stringify(
    {
      status: 'proven-for-reviewed-inputs',
      identity: {
        build: EXPECTED_BUILD,
        abcSha256,
        decodedMethodBodies: abc.method_body.length,
        branchTargetsValid: true,
        manifestSha256,
      },
      packedField: {
        structuralName: 'packedWeaponSkins',
        classIndex: PACKED_CLASS_INDEX,
        className: PACKED_CLASS_NAME,
        traitName: PACKED_TRAIT_NAME,
        qname: packedKey,
        type: 'uint',
        layout: {
          bits0To14: 'weaponSkin1Id',
          bit15: 'reservedWeaponSkinBit15',
          bits16To30: 'weaponSkin2Id',
          bit31: 'weapon2First',
        },
      },
      bit15: {
        structuralName: 'reservedWeaponSkinBit15',
        mask: BIT_15,
        directWeaponOrCostumeProducerFound: false,
        directWeaponOrCostumeConsumerFound: false,
        replayRoundtripPreservesIt: true,
        gameDataChecksumIncludesIt: true,
        unrelatedLiteralTests: bit15Tests,
      },
      bit31: {
        structuralName: 'weapon2First',
        mask: BIT_31,
        maskQName: bit31Key,
        effect: 'set selects weaponSkin2Id and mWeaponSkin2 first; clear selects weaponSkin1Id and mWeaponSkin1 first',
        readableSetting: 'ForcePrimaryWeaponFirst',
        readableSettingQName: forcePrimaryKey,
        readableSettingRelation: 'separate runtime override, not a packed-bit producer or inverse conversion',
      },
      weaponOrderProducerPolicy: {
        status: 'bounded-static-closure',
        acceptanceMet: false,
        packedProducers: {
          defaults: ['method 2037 packs false', 'method 4076 resets the whole word to zero'],
          configuredWholeWord: [
            'methods 2369 and 2418 accept caller-supplied uint values',
            'methods 3228, 3282, 5257, and 5342 decode whole uint values',
          ],
          shuffledLoadout:
            'method 3688 repacks generated skins with false and copies the generated whole word into replay loadouts',
          balancedOrder:
            'method 3703 is the only direct replay-loadout bit-31 set/clear mutator in the pinned exact-QName ledgers',
          preservation: [
            'copy and fallback paths retain the incoming bit',
            'replay reader 6510 restores the whole uint',
          ],
        },
        balancedOrderRule: {
          preferWeapon2When: 'weapon 1 type was already assigned, or weapon 2 is unassigned and globally less frequent',
          preferWeapon1When: 'weapon 2 type was already assigned, or weapon 1 is globally less frequent',
          exactTie:
            'explicit Random nextUint modulo 2 equals 0; optional-null path uses global nextUint / 4294967295 >= 0.5',
          callers: orderMutatorCallers,
        },
        gameplayOrder: {
          fieldQName: runtimeOrderKey,
          default: 'item PRNG nextUint modulo 2',
          selection:
            'consume old counter modulo 2, then increment; zero selects mBaseWeapon1 and one selects mBaseWeapon2',
          forcePrimaryWeaponFirst:
            'true writes counter 0; false or absent leaves the independently initialized counter unchanged',
          packedConversion: 'none in the pinned ABC',
        },
        blockers: [
          'the proven replay-producing universe remains limited to the authenticated playlist-108 cohort',
          'static exact-QName closure cannot prove all dynamic, loaded-code, host, and server-authored whole-word ingress paths unreachable',
          'ForcePrimaryWeaponFirst application is not proven to dominate every first pickup on every replay-producing tutorial or special-mode path',
          'the complete reset and alternation lifecycle of the runtime order counter is not closed for every spawn, KO, respawn, morph, and reconnect path',
        ],
      },
      anchors: {
        replayWriter: [6519, 1236, 1240],
        replayReader: [6510, 1171, 1176],
        defaultPacker: [2037, 190, 194, 197, 198],
        packHelper: [14711, 10, 34, 55, 66, 76],
        bit31Initializer: [14722, 39, 41],
        high15Initializer: [14909, 78427, 78430],
        primarySelection: [3845, 564, 571, 574, 575, 577, 578, 579, 594, 610, 643, 647, 679, 693],
        pickupBranchSelection: [5578, 926, 933, 936, 947, 955, 969, 1056, 1240, 1327],
        fighterSkinIds: [2790, 5765, 5784, 5808, 5815],
        checksum: [6527, 391, 395, 399, 400],
        readableSetting: [12936, 896, 907, 912, 12918, 311, 323, 325],
        shuffledLoadout: [3688, 1469, 1476, 1477, 1608],
        balancedOrderMutator: [
          3703, 562, 571, 572, 577, 579, 594, 597, 602, 606, 609, 623, 630, 633, 634, 655, 662, 665, 666, 667,
        ],
        runtimeOrderDefault: [1492, 568, 577, 580, 585, 587, 588],
        firstPickupOrder: [1518, 448, 457, 463, 465, 488, 505],
        spawnOrder: [3578, 130, 139, 145, 147, 163, 175],
      },
      referenceClosure: {
        packedReferences,
        packedWrites,
        bit31References,
        forcePrimaryReferences,
        helperReferences,
        orderMutatorCallers,
        modeStartPolicyCallers,
        runtimeOrderReferences,
        digests: {
          packedReferences: packedReferenceDigest,
          packedWrites: packedWriteDigest,
          bit15Tests: bit15TestDigest,
          bit31References: bit31ReferenceDigest,
          helperReferences: helperReferenceDigest,
          orderMutatorCallers: orderMutatorCallerDigest,
          modeStartPolicyCallers: modeStartPolicyCallerDigest,
          runtimeOrderReferences: runtimeOrderReferenceDigest,
        },
      },
      reviewedCorpus: {
        fixtureCount: manifest.fixtures.length,
        loadoutCount: packedWords.length,
        bit15: { set: bit15SetCount, clear: packedWords.length - bit15SetCount },
        bit31: { set: bit31SetCount, clear: packedWords.length - bit31SetCount },
      },
    },
    null,
    2,
  ),
)
