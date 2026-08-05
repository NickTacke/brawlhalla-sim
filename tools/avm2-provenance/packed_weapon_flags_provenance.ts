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
        readableSettingRelation: 'inverse contextual evidence, not a direct producer',
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
        readableSetting: [12936, 896, 907, 912, 12918, 311],
      },
      referenceClosure: {
        packedReferences,
        bit31References,
        forcePrimaryReferences,
        helperReferences,
        digests: {
          packedReferences: packedReferenceDigest,
          bit15Tests: bit15TestDigest,
          bit31References: bit31ReferenceDigest,
          helperReferences: helperReferenceDigest,
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
