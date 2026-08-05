import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }
type ReferenceEntry = {
  methodId: number
  owner: MethodOwner | null
  references: Array<{ pc: number; opcode: string }>
}

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const ENTITY_CLASS = '_-V4R'
const ENTITY_TYPE_FIELD = '_-56G'
const MASK_FLAGS = [
  { name: '_-a50', value: 0x00000002, evidenceCategory: 'Horde PartyBot constituent' },
  { name: '_-P1j', value: 0x00008000, evidenceCategory: 'Horde PartyBot constituent' },
  { name: '_-sE', value: 0x00800000, evidenceCategory: 'animation target' },
  { name: '_-b3N', value: 0x04000000, evidenceCategory: 'game-mode ball' },
  { name: '_-2O', value: 0x08000000, evidenceCategory: 'Horde PartyBot constituent' },
] as const
const EXPECTED_COMPOSITE_MASK = 0x0c808002
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
      if (typeof offset !== 'number' || !boundaries.has(instruction.endPc + offset)) {
        errors.push(`PC ${instruction.pc}`)
      }
    }
    if (instruction.name === 'lookupswitch') {
      const offsets = [instruction.params[0], ...(Array.isArray(instruction.params[2]) ? instruction.params[2] : [])]
      for (const entry of offsets) {
        const offset = Array.isArray(entry) ? entry[1] : entry
        if (typeof offset !== 'number' || !boundaries.has(instruction.pc + offset)) {
          errors.push(`PC ${instruction.pc}`)
        }
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
        owners.set(trait.data.method, {
          classIndex,
          className,
          traitName: nameAt(trait.name),
          static: group.static,
        })
      }
    }
  }
  return owners
}

const abcPath = argument('--abc')
assert(abcPath, 'usage: bun composite_entity_classification_provenance.ts --abc <main.abc>')
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

function exactReferencesForQName(key: string): ReferenceEntry[] {
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

function methodQName(methodId: number): string {
  const matches = abc.instance.flatMap((instance: any, classIndex: number) =>
    [
      ...(instance.trait ?? []).map((trait: any) => ({ trait, classIndex, static: false })),
      ...(abc.class[classIndex].traits ?? []).map((trait: any) => ({ trait, classIndex, static: true })),
    ].filter(({ trait }) => trait.data?.method === methodId),
  )
  assert(matches.length === 1, `expected one trait for method ${methodId}`)
  const key = qnameKey(abc.constant_pool.multiname[matches[0].trait.name - 1])
  assert(key, `method ${methodId} does not have an exact QName`)
  return key
}

function traitQName(trait: any): string {
  const key = qnameKey(abc.constant_pool.multiname[trait.name - 1])
  assert(key, 'trait does not use an exact QName')
  return key
}

const entityClasses = abc.instance
  .map((instance: any, classIndex: number) => ({ instance, classIndex }))
  .filter(
    ({ instance }: any) => multinameName(abc.constant_pool.multiname[instance.name - 1], strings) === ENTITY_CLASS,
  )
assert(entityClasses.length === 1, `expected one ${ENTITY_CLASS} class`)
const { instance: entityClass, classIndex } = entityClasses[0]
assert(entityClass.iinit === 2790, 'entity constructor changed')

function findTrait(traits: any[], name: string): any {
  const matches = traits.filter((trait) => multinameName(abc.constant_pool.multiname[trait.name - 1], strings) === name)
  assert(matches.length === 1, `expected one ${name} trait`)
  return matches[0]
}

const entityTypeTrait = findTrait(entityClass.trait, ENTITY_TYPE_FIELD)
assert((entityTypeTrait.kind & 0x0f) === 0, `${ENTITY_TYPE_FIELD} is not a slot`)
assert(
  multinameName(abc.constant_pool.multiname[entityTypeTrait.data.type_name - 1], strings) === 'uint',
  `${ENTITY_TYPE_FIELD} is not uint`,
)
assert(entityTypeTrait.data.vindex === 0, `${ENTITY_TYPE_FIELD} has an explicit initializer`)
const entityTypeQName = traitQName(entityTypeTrait)
const entityTypeReferences = exactReferencesForQName(entityTypeQName)

const staticTraits = new Map<string, any>()
for (const flag of MASK_FLAGS) {
  const trait = findTrait(abc.class[classIndex].traits, flag.name)
  assert((trait.kind & 0x0f) === 0, `${flag.name} is not a slot`)
  assert(
    multinameName(abc.constant_pool.multiname[trait.data.type_name - 1], strings) === 'uint',
    `${flag.name} is not uint`,
  )
  assert(trait.data.vindex === 0, `${flag.name} has an explicit initializer`)
  staticTraits.set(flag.name, trait)
}

const initializationAnchors = new Map<string, { valuePc: number; initPc: number }>([
  ['_-a50', { valuePc: 951, initPc: 953 }],
  ['_-P1j', { valuePc: 1072, initPc: 1074 }],
  ['_-sE', { valuePc: 1140, initPc: 1142 }],
  ['_-b3N', { valuePc: 1167, initPc: 1170 }],
  ['_-2O', { valuePc: 1176, initPc: 1178 }],
])
for (const flag of MASK_FLAGS) {
  const anchor = initializationAnchors.get(flag.name)
  assert(anchor, `missing initialization anchor for ${flag.name}`)
  const valueInstruction = requireAt(3074, anchor.valuePc, flag.value < 0x80 ? 'pushbyte' : 'pushint')
  assert(valueInstruction.params[0] === flag.value, `${flag.name} value changed`)
  requireAt(3074, anchor.initPc, 'initproperty', flag.name)
}
for (const [ownerPc, valuePc, initPc, value, trait] of [
  [17643, 17647, 17650, 0x00000002, '_-W50'],
  [17789, 17793, 17796, 0x00008000, '_-P1d'],
  [17874, 17878, 17881, 0x00800000, '_-V6s'],
  [17907, 17911, 17915, 0x04000000, '_-R2B'],
  [17918, 17922, 17925, 0x08000000, '_-l4E'],
] as const) {
  requireAt(14909, ownerPc, 'getlex', '_-Wv')
  const duplicateValue = requireAt(14909, valuePc, value < 0x80 ? 'pushbyte' : 'pushint')
  assert(duplicateValue.params[0] === value, `method 14909 duplicate value ${value} changed`)
  requireAt(14909, initPc, 'initproperty', trait)
}
for (const [valuePc, initPc, value, trait] of [
  [942, 944, 0x00000001, '_-6c'],
  [968, 970, 0x00000008, '_-76C'],
  [986, 988, 0x00000020, '_-F43'],
  [1055, 1057, 0x00002000, '_-K2'],
] as const) {
  const baseValue = requireAt(3074, valuePc, value < 0x80 ? 'pushbyte' : 'pushint')
  assert(baseValue.params[0] === value, `${trait} value changed`)
  requireAt(3074, initPc, 'initproperty', trait)
}
const computedMask = MASK_FLAGS.reduce((mask, flag) => mask | flag.value, 0) >>> 0
assert(computedMask === EXPECTED_COMPOSITE_MASK, 'composite mask changed')

for (const [pc, name] of [
  [257, ENTITY_TYPE_FIELD],
  [263, '_-b3N'],
  [269, '_-2O'],
] as const) {
  requireAt(6519, pc, 'getproperty', name)
}
requireAt(6519, 273, 'bitor')
requireAt(6519, 274, 'bitand')
requireAt(6519, 278, 'not')
const skipBranch = requireAt(6519, 279, 'iffalse')
assert(skipBranch.endPc + Number(skipBranch.params[0]) === 287, 'writer exclusion branch changed')
const skipJump = requireAt(6519, 283, 'jump')
assert(skipJump.endPc + Number(skipJump.params[0]) === 1356, 'writer exclusion no longer skips the record')

const writerWidth = requireAt(6519, 1260, 'pushbyte')
assert(writerWidth.params[0] === 1, 'classification writer width literal changed')
requireAt(6519, 1264, 'getproperty', ENTITY_TYPE_FIELD)
for (const [pc, name] of [
  [1270, '_-a50'],
  [1276, '_-b3N'],
  [1283, '_-2O'],
  [1291, '_-P1j'],
  [1298, '_-sE'],
] as const) {
  requireAt(6519, pc, 'getproperty', name)
}
for (const pc of [1279, 1287, 1294, 1301]) requireAt(6519, pc, 'bitor')
requireAt(6519, 1302, 'bitand')
const writerZero = requireAt(6519, 1303, 'pushbyte')
assert(writerZero.params[0] === 0, 'classification comparison literal changed')
requireAt(6519, 1305, 'equals')
requireAt(6519, 1306, 'not')
const falseBranch = requireAt(6519, 1307, 'iffalse')
assert(falseBranch.endPc + Number(falseBranch.params[0]) === 1318, 'classification false branch changed')
const writerTrue = requireAt(6519, 1311, 'pushbyte')
assert(writerTrue.params[0] === 1, 'classification true literal changed')
requireAt(6519, 1313, 'convert_u')
const writerFalse = requireAt(6519, 1318, 'pushbyte')
assert(writerFalse.params[0] === 0, 'classification false literal changed')
requireAt(6519, 1320, 'convert_u')
const classificationWrite = requireAt(6519, 1321, 'callpropvoid', '_-PY')
assert(classificationWrite.params[1] === 2, 'classification writer argument count changed')

requireAt(2960, 5, 'getproperty', ENTITY_TYPE_FIELD)
for (const [pc, name] of [
  [11, '_-a50'],
  [17, '_-b3N'],
  [24, '_-2O'],
  [32, '_-P1j'],
  [39, '_-sE'],
] as const) {
  requireAt(2960, pc, 'getproperty', name)
}
requireAt(2960, 43, 'bitand')
requireAt(2960, 47, 'not')
requireAt(2960, 48, 'returnvalue')

const readerWidth = requireAt(6510, 1260, 'pushbyte')
assert(readerWidth.params[0] === 1, 'classification reader width literal changed')
const classificationRead = requireAt(6510, 1262, 'callproperty', '_-14J')
assert(classificationRead.params[1] === 1, 'classification reader argument count changed')
const readerFalseBranch = requireAt(6510, 1272, 'iffalse')
assert(readerFalseBranch.endPc + Number(readerFalseBranch.params[0]) === 1291, 'classification reader branch changed')
requireAt(6510, 1276, 'findproperty', '_-i5s')
requireAt(6510, 1280, 'getproperty', '_-i5s')
requireAt(6510, 1286, 'callpropvoid', 'push')
requireAt(6511, 25, 'getproperty', '_-i5s')
requireAt(6511, 30, 'callproperty', 'indexOf')

for (const [pc, name] of [
  [362, '_-6c'],
  [369, '_-76C'],
] as const) {
  requireAt(3507, pc, 'getproperty', name)
}
requireAt(3507, 373, 'bitor')
assert(requireAt(3507, 374, 'getlocal').params[0] === 7, 'human factory roster argument changed')
const humanFactoryCall = requireAt(3507, 376, 'callproperty', '_-HT')
assert(humanFactoryCall.params[1] === 5, 'human factory argument count changed')
requireAt(3507, 406, 'callproperty', '_-U5g')
requireAt(3507, 430, 'coerce', '_-L4p')
requireAt(3507, 454, 'callpropvoid', '_-51a')

requireAt(3623, 56, 'getproperty', '_-76C')
requireAt(3623, 63, 'getproperty', '_-F43')
requireAt(3623, 66, 'bitor')
requireAt(3623, 70, 'getproperty', '_-K2')
requireAt(3623, 73, 'bitor')
assert(requireAt(3623, 75, 'setlocal_2'), 'ordinary PartyBot mask is not stored in local 2')
requireAt(3623, 141, 'getproperty', 'HORDE')
const nonHordeBranch = requireAt(3623, 144, 'ifne')
assert(nonHordeBranch.endPc + Number(nonHordeBranch.params[0]) === 233, 'Horde mask branch changed')
for (const [pc, name, orPc] of [
  [200, '_-P1j', 203],
  [207, '_-2O', 211],
  [215, '_-a50', 218],
] as const) {
  requireAt(3623, pc, 'getproperty', name)
  requireAt(3623, orPc, 'bitor')
}
requireAt(3623, 228, 'setlocal_2')
requireAt(3623, 508, 'getlex', '_-V4R')
requireAt(3623, 517, 'pushstring', 'PartyBot')
requireAt(3623, 523, 'getlocal_2')
const partyBotFactoryCall = requireAt(3623, 526, 'callproperty', '_-HT')
assert(partyBotFactoryCall.params[1] === 5, 'PartyBot factory argument count changed')

requireAt(3205, 595, 'getproperty', '_-76C')
requireAt(3205, 626, 'getproperty', '_-6c')
requireAt(3205, 644, 'getproperty', '_-F43')
assert(requireAt(3205, 685, 'getlocal').params[0] === 18, 'training type mask is not factory argument 4')
const firstTrainingFactoryCall = requireAt(3205, 689, 'callproperty', '_-HT')
assert(firstTrainingFactoryCall.params[1] === 5, 'training factory argument count changed')
requireAt(3205, 1144, 'getproperty', '_-6c')
requireAt(3205, 1151, 'getproperty', '_-F43')
requireAt(3205, 1158, 'getproperty', '_-76C')
requireAt(3205, 1162, 'bitor')
assert(requireAt(3205, 1163, 'getlocal').params[0] === 14, 'second training roster argument changed')
const secondTrainingFactoryCall = requireAt(3205, 1165, 'callproperty', '_-HT')
assert(secondTrainingFactoryCall.params[1] === 5, 'second training factory argument count changed')
requireAt(3205, 1271, 'pushstring', 'practiceTraining')
requireAt(2790, 3547, 'getproperty', ENTITY_TYPE_FIELD)
requireAt(2790, 3553, 'getproperty', '_-F43')
requireAt(2790, 3556, 'bitand')
requireAt(2790, 3560, 'not')
requireAt(2790, 3567, 'increment')
requireAt(2790, 3583, 'equals')
requireAt(2790, 3591, 'pushstring', 'CPU')

requireAt(3565, 350, 'getlex', '_-V4R')
requireAt(3565, 359, 'pushstring', 'SoccerBall')
requireAt(3565, 376, 'getproperty', '_-b3N')
for (const pc of [385, 392, 400, 408]) requireAt(3565, pc, 'bitor')
assert(requireAt(3565, 409, 'getlocal').params[0] === 4, 'ball roster argument changed')
const ballFactoryCall = requireAt(3565, 411, 'callproperty', '_-HT')
assert(ballFactoryCall.params[1] === 5, 'ball factory argument count changed')
requireAt(3541, 184, 'getproperty', '_-b3N')
requireAt(3541, 187, 'bitand')
requireAt(3541, 211, 'pushstring', 'a__AnimationSoccerBall')
requireAt(3541, 473, 'getproperty', '_-sE')
requireAt(3541, 476, 'bitand')
const targetBranch = requireAt(3541, 481, 'iffalse')
assert(targetBranch.endPc + Number(targetBranch.params[0]) === 553, 'animation-target branch changed')
requireAt(3541, 507, 'pushstring', 'a__AnimationTarget_Ready')

requireAt(6519, 731, 'getproperty', '_-J5M')
requireAt(6519, 736, 'coerce', 'Companion')
requireAt(6519, 753, 'getproperty', '_-91D')
requireAt(6519, 764, 'initproperty', '_-91D')

const constructorReferences = exactReferencesForQName(
  qnameKey(abc.constant_pool.multiname[entityClass.name - 1]) ?? '',
).flatMap((entry) =>
  entry.references
    .filter((reference) => reference.opcode === 'constructprop')
    .map((reference) => ({ methodId: entry.methodId, owner: entry.owner, ...reference })),
)
assert(
  JSON.stringify(constructorReferences.map(({ methodId, pc, opcode }) => ({ methodId, pc, opcode }))) ===
    JSON.stringify([{ methodId: 3071, pc: 16, opcode: 'constructprop' }]),
  'direct entity-constructor closure changed',
)
const factoryReferences = exactReferencesForQName(methodQName(3071))
const predicateReferences = exactReferencesForQName(methodQName(2960))
const flagReferences = Object.fromEntries(
  MASK_FLAGS.map((flag) => [flag.name, exactReferencesForQName(traitQName(staticTraits.get(flag.name)))]),
)
const ledgers = {
  entityTypeReferences: sha256(JSON.stringify(entityTypeReferences)),
  flagReferences: sha256(JSON.stringify(flagReferences)),
  factoryReferences: sha256(JSON.stringify(factoryReferences)),
  predicateReferences: sha256(JSON.stringify(predicateReferences)),
}
assert(
  ledgers.entityTypeReferences === '203e46f7ac6e594b66da0474c82b186cdca9605587de0642b58ba462f015271a',
  'entity-type reference ledger changed',
)
assert(
  ledgers.flagReferences === 'b59997e12cca0cf9acc404aa36fa7db9257e0a637188a097718674e61d7db4df',
  'composite-flag reference ledger changed',
)
assert(
  ledgers.factoryReferences === '0d633de093a0975d46444a37bc2654d35d0a83384da6a8582e8716c1685a531d',
  'entity-factory reference ledger changed',
)
assert(
  ledgers.predicateReferences === '62664a787d10db3d0e9efab6197a2e679a26b7f406772d88749eb1df0158a196',
  'composite-predicate reference ledger changed',
)

const output = {
  status: 'proven-for-pinned-abc',
  identity: {
    build: EXPECTED_BUILD,
    abcSha256,
    decodedMethodBodies: abc.method_body.length,
    branchTargetsValid: true,
  },
  field: {
    structuralName: 'isSpecialModeEntity',
    classIndex,
    className: ENTITY_CLASS,
    traitName: ENTITY_TYPE_FIELD,
    type: 'uint',
    serializedPredicate: `(entityType & 0x${EXPECTED_COMPOSITE_MASK.toString(16).padStart(8, '0')}) != 0`,
    prefilter: '(entityType & 0x0c000000) != 0 skips the entire roster record before the bit',
    flags: MASK_FLAGS,
  },
  categoryMatrix: {
    humanFighter: false,
    ordinaryPartyOrCpuBot: false,
    trainingCpuOrDummy: false,
    equippedCompanion: false,
    hordePartyBot: 'predicate true through three flags, but record skipped because _-2O is set',
    gameModeBall: 'predicate true through _-b3N, but record skipped before serialization',
    animationTarget: 'predicate true through _-sE; positive writer reachability remains unobserved',
  },
  anchors: {
    flagInitialization: Object.fromEntries(initializationAnchors),
    method14909DifferentOwnerTable: [
      14909, 17643, 17647, 17650, 17789, 17793, 17796, 17874, 17878, 17881, 17907, 17911, 17915, 17918, 17922, 17925,
    ],
    entityPredicate: [2960, 5, 11, 17, 24, 32, 39, 43, 47, 48],
    replayWriterPrefilter: [6519, 257, 263, 269, 273, 274, 279, 283],
    replayWriterClassification: [6519, 1264, 1270, 1276, 1283, 1291, 1298, 1302, 1306, 1321],
    replayReaderClassification: [6510, 1262, 1276, 1280, 1286],
    replayMembershipQuery: [6511, 25, 30],
    replayRestorationConsumer: [3507, 406, 430, 454],
    hordePartyBot: [3623, 141, 200, 207, 215, 517, 526],
    ordinaryPartyBot: [3623, 56, 63, 70, 517, 526],
    trainingCpu: [3205, 595, 626, 644, 689, 1144, 1151, 1158, 1165, 1271],
    cpuLabel: [2790, 3547, 3553, 3591],
    gameModeBall: [3565, 359, 376, 411, 3541, 184, 211],
    animationTarget: [3541, 473, 507],
    companionSeparateField: [6519, 731, 736, 753, 764],
  },
  referenceClosure: {
    directConstructorCalls: constructorReferences,
    factoryReferences,
    predicateReferences,
    ledgers,
  },
  corpus: {
    used: false,
    limitation: 'no reviewed fixture sets the bit; static evidence proves the predicate and known category paths',
  },
}

console.log(JSON.stringify(output, null, 2))
