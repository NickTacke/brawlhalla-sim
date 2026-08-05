import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const TARGET_CLASS = '_-C5F'
const TARGET_TRAIT = '_-Z3L'
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
function displayParam(value: unknown, strings: string[]): unknown {
  const name = multinameName(value, strings)
  if (name) return name
  return value
}
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

const abcPath = argument('--abc')
assert(abcPath, 'usage: bun generic_roster_bitset_provenance.ts --abc <main.abc> [--explore]')
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
const classIndices = abc.instance
  .map((instance: any, classIndex: number) => ({ instance, classIndex }))
  .filter(
    ({ instance }: any) => multinameName(abc.constant_pool.multiname[instance.name - 1], strings) === TARGET_CLASS,
  )
assert(classIndices.length === 1, `expected one ${TARGET_CLASS} class`)
const { instance: targetClass, classIndex } = classIndices[0]
const traitDefinitions = (targetClass.trait as any[]).filter(
  (trait) => multinameName(abc.constant_pool.multiname[trait.name - 1], strings) === TARGET_TRAIT,
)
assert(traitDefinitions.length === 1, `expected one ${TARGET_TRAIT} trait`)
const traitDefinition = traitDefinitions[0]
const targetQNameKey = qnameKey(abc.constant_pool.multiname[traitDefinition.name - 1])
assert(targetQNameKey, `${TARGET_TRAIT} is not an exact QName`)
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
const references = exactReferencesForQName(targetQNameKey)
const methodTraitReferences = (targetClass.trait as any[])
  .filter((trait) => trait.data?.method !== undefined)
  .map((trait) => {
    const name = multinameName(abc.constant_pool.multiname[trait.name - 1], strings)
    const key = qnameKey(abc.constant_pool.multiname[trait.name - 1])
    assert(key, `${name} is not an exact QName`)
    return { name, methodId: trait.data.method as number, references: exactReferencesForQName(key) }
  })

const stringReferences = Object.fromEntries(
  ['TauntID', 'Taunt', 'DefaultTaunt'].map((value) => [
    value,
    [...methods.entries()]
      .map(([methodId, instructions]) => ({
        methodId,
        owner: owners.get(methodId) ?? null,
        references: instructions
          .filter((instruction) => instruction.name === 'pushstring' && instruction.params[0] === value)
          .map((instruction) => ({ pc: instruction.pc, opcode: instruction.name })),
      }))
      .filter((entry) => entry.references.length > 0),
  ]),
)
const namedReferences = Object.fromEntries(
  ['mFavoriteWeapons', '_-n3I', '_-n3Q', '_-M6S'].map((name) => [
    name,
    [...methods.entries()]
      .map(([methodId, instructions]) => ({
        methodId,
        owner: owners.get(methodId) ?? null,
        references: instructions
          .filter((instruction) => multinameName(instruction.params[0], strings) === name)
          .map((instruction) => ({ pc: instruction.pc, opcode: instruction.name })),
      }))
      .filter((entry) => entry.references.length > 0),
  ]),
)
const ledgerDigests = {
  exactTraitReferences: sha256(JSON.stringify(references)),
  methodTraitReferences: sha256(JSON.stringify(methodTraitReferences)),
  namedReferences: sha256(JSON.stringify(namedReferences)),
  stringReferences: sha256(JSON.stringify(stringReferences)),
}
assert(
  ledgerDigests.exactTraitReferences === '615c07f5ac1b0fb781ee4c28d83fd8f834d6992ca0d257b9024c1288481b6f00',
  'exact field-reference ledger changed',
)
assert(
  ledgerDigests.methodTraitReferences === 'c2c6c429a37e214ab2df2808e8d4703319abdf20582a2c6f057b7de515830d1f',
  'method-reference ledger changed',
)
assert(
  ledgerDigests.namedReferences === '5f45e071f814e588e2a1d7f5ce1e1b54f39fb9642d84560c03e1380c7cef2b02',
  'named-reference ledger changed',
)
assert(
  ledgerDigests.stringReferences === 'e137e1773fc41a4c1580839af0832a11954e25b2e8a233ed029840a623fb2732',
  'string-reference ledger changed',
)
assert((traitDefinition.kind & 0x0f) === 0, `${TARGET_TRAIT} is not a slot`)
assert(
  multinameName(abc.constant_pool.multiname[traitDefinition.data.type_name - 1], strings) === 'Array',
  `${TARGET_TRAIT} is not Array`,
)
assert(traitDefinition.data.vindex === 0, `${TARGET_TRAIT} has an explicit constant initializer`)

requireAt(576, 5, 'newarray')
requireAt(576, 7, 'initproperty', TARGET_TRAIT)
requireAt(6118, 8, 'findpropstrict', TARGET_CLASS)
requireAt(6118, 12, 'constructprop', TARGET_CLASS)
requireAt(6118, 17, 'initproperty', '_-n3I')
requireAt(578, 14, 'getproperty', TARGET_TRAIT)
requireAt(578, 44, 'callpropvoid', '_-PY')
requireAt(578, 51, 'callpropvoid', '_-S2c')
requireAt(578, 71, 'callpropvoid', '_-PY')
requireAt(585, 10, 'getproperty', TARGET_TRAIT)
requireAt(585, 30, 'callproperty', '_-8v')
requireAt(585, 70, 'callpropvoid', 'push')
requireAt(585, 82, 'callproperty', '_-14J')
requireAt(585, 114, 'callpropvoid', 'splice')
requireAt(580, 5, 'divide')
requireAt(580, 14, 'modulo')
requireAt(580, 15, 'lshift')
requireAt(580, 21, 'iffalse')
requireAt(580, 106, 'bitor')
requireAt(580, 136, 'bitnot')
requireAt(580, 137, 'bitand')
requireAt(600, 5, 'divide')
requireAt(600, 14, 'modulo')
requireAt(600, 15, 'lshift')
requireAt(600, 48, 'bitand')
requireAt(600, 52, 'not')
requireAt(12625, 150, 'pushstring', 'TauntID')
requireAt(12625, 171, 'initproperty', '_-G5t')
requireAt(14370, 711, 'getlex', '_-c1a')
requireAt(14370, 714, 'getproperty', '_-ol')
requireAt(14370, 736, 'getproperty', '_-n3Q')
requireAt(14370, 742, 'getproperty', '_-G5t')
requireAt(14370, 746, 'pushtrue')
requireAt(14370, 747, 'callpropvoid', '_-H2Z')
requireAt(14344, 948, 'getlocal_1')
requireAt(14344, 949, 'getproperty', '_-A2a')
requireAt(14344, 997, 'getproperty', '_-n3Q')
requireAt(14344, 1003, 'getproperty', '_-G5t')
requireAt(14344, 1007, 'pushtrue')
requireAt(14344, 1008, 'callpropvoid', '_-H2Z')
requireAt(5269, 1535, 'pushstring', 'Taunt')
requireAt(5269, 1579, 'getproperty', '_-n3Q')
requireAt(5269, 1585, 'getproperty', '_-G5t')
requireAt(5269, 1589, 'pushfalse')
requireAt(5269, 1590, 'callpropvoid', '_-H2Z')
requireAt(14520, 875, 'getproperty', '_-n3I')
requireAt(14520, 882, 'getproperty', '_-n3Q')
requireAt(14520, 886, 'getproperty', TARGET_TRAIT)
requireAt(14520, 889, 'callpropvoid', '_-r5D')
requireAt(6519, 612, 'getproperty', '_-n3I')
requireAt(6519, 617, 'getproperty', '_-n3I')
requireAt(6519, 620, 'getproperty', TARGET_TRAIT)
requireAt(6519, 623, 'callpropvoid', '_-r5D')
requireAt(6519, 1058, 'getproperty', '_-n3I')
requireAt(6519, 1069, 'callpropvoid', '_-Q5R')
requireAt(6510, 1035, 'getproperty', '_-n3I')
requireAt(6510, 1039, 'callpropvoid', '_-N4v')
requireAt(2921, 177, 'getproperty', '_-n3I')
requireAt(2921, 182, 'getproperty', TARGET_TRAIT)
requireAt(2921, 185, 'callpropvoid', '_-r5D')
requireAt(1535, 334, 'getproperty', '_-n3I')
requireAt(1535, 342, 'getproperty', '_-ol')
requireAt(1535, 345, 'getproperty', '_-G5t')
requireAt(1535, 349, 'callproperty', '_-O1D')

const anchors = {
  constructorEmptyArray: [576, 5, 7],
  rosterRecordDefault: [6118, 8, 12, 17],
  bitSetter: [580, 5, 14, 15, 106, 136, 137],
  bitTest: [600, 5, 14, 15, 48, 52],
  writer: [578, 14, 44, 51, 71],
  reader: [585, 10, 30, 70, 82, 114],
  tauntIdParser: [12625, 150, 171],
  defaultTauntProducer: [14370, 711, 714, 736, 742, 746, 747],
  entitlementProducer: [14344, 948, 949, 997, 1003, 1007, 1008],
  storeRemoval: [5269, 1535, 1579, 1585, 1589, 1590],
  rosterAssembly: [14520, 875, 882, 886, 889],
  replayWriter: [6519, 612, 617, 620, 623, 1058, 1069],
  replayReader: [6510, 1035, 1039],
  restoredCopy: [2921, 177, 182, 185],
  tauntConsumer: [1535, 334, 342, 345, 349],
}
const output: Record<string, unknown> = {
  status: 'proven-for-pinned-abc',
  identity: { build: EXPECTED_BUILD, abcSha256, decodedMethodBodies: abc.method_body.length, branchTargetsValid: true },
  field: {
    structuralName: 'availableTauntIds',
    classIndex,
    className: TARGET_CLASS,
    traitName: TARGET_TRAIT,
    type: 'Array<uint>',
    defaultValue: [],
    bitIndex: 'TauntID n maps to word floor(n / 32), bit n modulo 32',
    polarity: 'set means the TauntID is available; clear means unavailable',
    emptyEncoding: 'a zero presence bit and no uint words; reader truncates the array to zero words',
  },
  anchors,
  referenceClosure: {
    exactFieldMethodCount: references.length,
    exactFieldInstructionCount: references.reduce((count, entry) => count + entry.references.length, 0),
    ledgers: ledgerDigests,
    exactFieldReferences: references,
  },
  corpus: { used: false, reason: 'static producer-to-gameplay-consumer closure proves the requested semantics' },
}
if (process.argv.includes('--explore')) {
  const relevantIds = new Set([
    578,
    585,
    6519,
    5269,
    1535,
    3282,
    6118,
    6241,
    6527,
    12625,
    ...references.map((entry) => entry.methodId),
    ...methodTraitReferences.flatMap((trait) => trait.references.map((entry) => entry.methodId)),
  ])
  output.methods = [...relevantIds]
    .sort((a, b) => a - b)
    .map((methodId) => ({
      methodId,
      owner: owners.get(methodId) ?? null,
      instructions: methods.get(methodId)?.map((instruction) => ({
        pc: instruction.pc,
        opcode: instruction.name,
        params: instruction.params.map((value) => displayParam(value, strings)),
      })),
    }))
}
console.log(JSON.stringify(output, null, 2))
