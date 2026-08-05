import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }
type Reference = {
  methodId: number
  owner: MethodOwner | null
  references: Array<{ pc: number; opcode: string; argumentCount: unknown }>
}

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const FIGHTER_CLASS = '_-V4R'
const STORE_INTERFACE = '_-z5S'
const READ_HELPER = '_-k17'
const WRITE_HELPER = '_-G1Q'
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

function sha256(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex')
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

function toUint32(value: number): number {
  return value >>> 0
}

function toInt32(value: number): number {
  return value | 0
}

function rotatingIndex(mappedIndex: number, offset: number): number {
  return toUint32(toInt32(mappedIndex) + toInt32(offset)) % 128
}

const abcPath = argument('--abc')
assert(abcPath, 'usage: bun movement_numeric_storage_provenance.ts --abc <main.abc> [--explore]')
const abcBytes = readFileSync(resolve(abcPath))
const abcSha256 = sha256(new Uint8Array(abcBytes))
assert(abcSha256 === EXPECTED_ABC_SHA256, `ABC SHA-256 mismatch: ${abcSha256}`)
const abc: any = AbcFile.read(new ExtendedBuffer(abcBytes))
const strings = abc.constant_pool.string as string[]
const multinames = abc.constant_pool.multiname as unknown[]
const typeName = (index: number): string => multinameName(multinames[index - 1], strings)
const buildStrings = strings.filter((value) => /^\d+\.\d+\.\d+$/.test(value))
assert(buildStrings.length === 1 && buildStrings[0] === EXPECTED_BUILD, 'ABC build mismatch')

const owners = new Map<number, MethodOwner>()
for (let classIndex = 0; classIndex < abc.instance.length; classIndex++) {
  const className = typeName(abc.instance[classIndex].name)
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
        traitName: typeName(trait.name),
        static: group.static,
      })
    }
  }
}

const disassembler = new InstructionDisassembler(abc)
const methods = new Map<number, LocatedInstruction[]>()
const branchErrors: string[] = []
for (const body of abc.method_body) {
  const instructions = locateInstructions(body.code, disassembler.disassemble(body) as Instruction[])
  methods.set(body.method, instructions)
  branchErrors.push(...validateBranches(instructions, body.code.length).map((pc) => `method ${body.method} ${pc}`))
}
assert(branchErrors.length === 0, `invalid branch targets: ${branchErrors.join(', ')}`)

function classIndexByName(className: string): number {
  const matches = abc.instance
    .map((instance: any, classIndex: number) => ({ instance, classIndex }))
    .filter(({ instance }: any) => typeName(instance.name) === className)
  assert(matches.length === 1, `expected one class named ${className}`)
  return matches[0].classIndex
}

function traitDefinition(classIndex: number, traitName: string): any {
  const matches = (abc.instance[classIndex].trait ?? []).filter((trait: any) => typeName(trait.name) === traitName)
  assert(matches.length === 1, `expected one ${traitName} trait on class ${classIndex}`)
  return matches[0]
}

function traitMethod(classIndex: number, traitName: string): number {
  const trait = traitDefinition(classIndex, traitName)
  assert(typeof trait.data?.method === 'number', `${traitName} is not a method`)
  return trait.data.method
}

function assertSignature(methodId: number, parameterTypes: string[], returnType: string): void {
  assert(
    JSON.stringify(abc.method[methodId].param_type.map(typeName)) === JSON.stringify(parameterTypes),
    `method ${methodId} parameter types changed`,
  )
  assert(typeName(abc.method[methodId].return_type) === returnType, `method ${methodId} return type changed`)
}

function requireAt(methodId: number, pc: number, opcode: string, name?: string): LocatedInstruction {
  const instruction = methods.get(methodId)?.find((candidate) => candidate.pc === pc)
  assert(instruction, `method ${methodId} lacks PC ${pc}`)
  assert(instruction.name === opcode, `method ${methodId} PC ${pc} is not ${opcode}`)
  if (name !== undefined)
    assert(multinameName(instruction.params[0], strings) === name, `method ${methodId} PC ${pc} does not name ${name}`)
  return instruction
}

function exactReferencesForQName(key: string): Reference[] {
  return [...methods.entries()].flatMap(([methodId, instructions]) => {
    const references = instructions
      .filter((instruction) => qnameKey(instruction.params[0]) === key)
      .map((instruction) => ({
        pc: instruction.pc,
        opcode: instruction.name,
        argumentCount: instruction.params[1] ?? null,
      }))
    return references.length > 0 ? [{ methodId, owner: owners.get(methodId) ?? null, references }] : []
  })
}

function namedReferenceGroups(targetName: string): Record<string, Reference[]> {
  const keys = new Set<string>()
  for (const multiname of multinames) {
    if (multinameName(multiname, strings) !== targetName) continue
    const key = qnameKey(multiname)
    if (key) keys.add(key)
  }
  return Object.fromEntries(
    [...keys].sort((left, right) => left.localeCompare(right)).map((key) => [key, exactReferencesForQName(key)]),
  )
}

type NamedDefinition = {
  classIndex: number
  className: string
  static: boolean
  qname: string | null
  methodId: number
  parameters: string[]
  returns: string
}

function namedDefinitions(targetName: string): NamedDefinition[] {
  const definitions: NamedDefinition[] = []
  const addDefinitions = (traits: any[], classIndex: number, className: string, staticMember: boolean): void => {
    for (const trait of traits) {
      if (typeName(trait.name) !== targetName) continue
      assert(typeof trait.data?.method === 'number', `${targetName} has a non-method trait definition`)
      const methodId = trait.data.method
      definitions.push({
        classIndex,
        className,
        static: staticMember,
        qname: qnameKey(multinames[trait.name - 1]),
        methodId,
        parameters: abc.method[methodId].param_type.map(typeName),
        returns: typeName(abc.method[methodId].return_type),
      })
    }
  }
  for (let classIndex = 0; classIndex < abc.instance.length; classIndex++) {
    const className = typeName(abc.instance[classIndex].name)
    addDefinitions(abc.instance[classIndex].trait ?? [], classIndex, className, false)
    addDefinitions(abc.class[classIndex].traits ?? [], classIndex, className, true)
  }
  for (let scriptIndex = 0; scriptIndex < abc.script.length; scriptIndex++)
    addDefinitions(abc.script[scriptIndex].trait ?? [], -1, `<script ${scriptIndex}>`, true)
  return definitions
}

function allNamedInstructionReferences(targetName: string): Array<{
  methodId: number
  pc: number
  opcode: string
  qname: string | null
}> {
  return [...methods.entries()].flatMap(([methodId, instructions]) =>
    instructions.flatMap((instruction) =>
      multinameName(instruction.params[0], strings) === targetName
        ? [
            {
              methodId,
              pc: instruction.pc,
              opcode: instruction.name,
              qname: qnameKey(instruction.params[0]),
            },
          ]
        : [],
    ),
  )
}

const fighterClassIndex = classIndexByName(FIGHTER_CLASS)
const storeInterfaceIndex = classIndexByName(STORE_INTERFACE)
const directStoreIndex = classIndexByName('_-N3P')
const mappedStoreIndex = classIndexByName('_-X3G')
const rotatingStoreIndex = classIndexByName('_-b27')
const storeInterfaceMultiname = abc.instance[directStoreIndex].interface[0]
assert(typeName(storeInterfaceMultiname) === STORE_INTERFACE, 'direct-store interface identity changed')

const storeTrait = traitDefinition(fighterClassIndex, '_-V1I')
const pendingImpulseTrait = traitDefinition(fighterClassIndex, '_-l16')
const verticalVelocityTrait = traitDefinition(fighterClassIndex, '_-30')
assert(
  (storeTrait.kind & 0x0f) === 0 && typeName(storeTrait.data.type_name) === STORE_INTERFACE,
  'fighter store type changed',
)
assert(
  (pendingImpulseTrait.kind & 0x0f) === 0 && typeName(pendingImpulseTrait.data.type_name) === 'uint',
  'pending impulse handle type changed',
)
assert(
  (verticalVelocityTrait.kind & 0x0f) === 0 && typeName(verticalVelocityTrait.data.type_name) === 'uint',
  'vertical velocity handle type changed',
)

const interfaceWriteMethod = traitMethod(storeInterfaceIndex, WRITE_HELPER)
const interfaceReadMethod = traitMethod(storeInterfaceIndex, READ_HELPER)
assert(interfaceWriteMethod === 3100 && interfaceReadMethod === 3101, 'store interface method identities changed')
assert(
  !methods.has(interfaceWriteMethod) && !methods.has(interfaceReadMethod),
  'interface helpers unexpectedly have bodies',
)
assertSignature(interfaceWriteMethod, ['uint', 'Number'], 'Number')
assertSignature(interfaceReadMethod, ['uint'], 'Number')

const implementations = [
  { classIndex: directStoreIndex, className: '_-N3P', write: 3105, read: 3106, mode: 'direct' },
  { classIndex: mappedStoreIndex, className: '_-X3G', write: 3110, read: 3111, mode: 'mapped' },
  { classIndex: rotatingStoreIndex, className: '_-b27', write: 3115, read: 3116, mode: 'rotating-mapped' },
]
for (const implementation of implementations) {
  assert(
    traitMethod(implementation.classIndex, WRITE_HELPER) === implementation.write,
    `${implementation.className} writer changed`,
  )
  assert(
    traitMethod(implementation.classIndex, READ_HELPER) === implementation.read,
    `${implementation.className} reader changed`,
  )
  assertSignature(implementation.write, ['uint', 'Number'], 'Number')
  assertSignature(implementation.read, ['uint'], 'Number')
}
assert(
  (abc.instance[directStoreIndex].interface ?? []).includes(storeInterfaceMultiname),
  'direct store no longer implements the numeric-store interface',
)
assert(
  (abc.instance[mappedStoreIndex].interface ?? []).includes(storeInterfaceMultiname),
  'mapped store no longer implements the numeric-store interface',
)
assert(typeName(abc.instance[rotatingStoreIndex].super_name) === '_-X3G', 'rotating store superclass changed')

// Direct Vector.<Number> construction and identity read/write.
requireAt(3103, 5, 'getlex', 'Vector')
requireAt(3103, 9, 'getlex', 'Number')
requireAt(3103, 12, 'applytype')
requireAt(3103, 17, 'initproperty', '_-05e')
requireAt(3105, 10, 'setproperty')
requireAt(3105, 21, 'getproperty')
requireAt(3105, 25, 'convert_d')
requireAt(3106, 9, 'getproperty')
requireAt(3106, 13, 'convert_d')

// Mapped storage uses Vector.<uint> handles into a 128-cell Vector.<Number>.
requireAt(3108, 24, 'getlex', 'Vector')
requireAt(3108, 28, 'getlex', 'uint')
requireAt(3108, 43, 'getlex', 'Vector')
requireAt(3108, 47, 'getlex', 'Number')
const mappedCapacity = requireAt(3108, 52, 'pushuint').params[0]
assert(mappedCapacity === 128, 'mapped store capacity changed')
requireAt(3110, 21, 'convert_u')
requireAt(3110, 23, 'setproperty')
requireAt(3110, 46, 'convert_u')
requireAt(3110, 47, 'getproperty')
requireAt(3110, 51, 'convert_d')
requireAt(3111, 21, 'convert_u')
requireAt(3111, 22, 'getproperty')
requireAt(3111, 26, 'convert_d')

// Rotating storage adds a wrapped global offset only to the physical storage index.
for (const methodId of [3115, 3116]) {
  requireAt(methodId, 21, 'convert_u')
  requireAt(methodId, 26, 'getproperty', '_-C5i')
  requireAt(methodId, 30, 'add_i')
  requireAt(methodId, 31, 'convert_u')
  assert(requireAt(methodId, 32, 'pushuint').params[0] === 128, `method ${methodId} ring capacity changed`)
  requireAt(methodId, 34, 'modulo')
}
requireAt(3115, 36, 'setproperty')
requireAt(3115, 77, 'convert_d')
requireAt(3116, 35, 'getproperty')
requireAt(3116, 39, 'convert_d')

// Fighter construction can select all three implementations, each with 32 logical handles.
for (const methodId of [2790, 3017]) {
  const instructions = methods.get(methodId) ?? []
  for (const className of ['_-N3P', '_-X3G', '_-b27']) {
    const constructions = instructions.filter(
      (instruction) =>
        instruction.name === 'constructprop' && multinameName(instruction.params[0], strings) === className,
    )
    assert(
      constructions.length === 1 && constructions[0].params[1] === 1,
      `method ${methodId} ${className} construction changed`,
    )
    const capacity = instructions[constructions[0].index - 2]
    assert(
      capacity.name === 'pushbyte' && capacity.params[0] === 32,
      `method ${methodId} ${className} capacity changed`,
    )
    const assignment = instructions[constructions[0].index + 1]
    assert(
      assignment.name === 'initproperty' && multinameName(assignment.params[0], strings) === '_-V1I',
      `method ${methodId} ${className} store assignment changed`,
    )
  }
}

// Jump reads and rewrites the pending-impulse Number through its uint handle.
requireAt(2954, 1021, 'getproperty', '_-V1I')
requireAt(2954, 1026, 'getproperty', '_-l16')
requireAt(2954, 1029, 'callproperty', READ_HELPER)
requireAt(2954, 1033, 'convert_d')
requireAt(2954, 1036, 'subtract')
requireAt(2954, 1037, 'convert_d')
requireAt(2954, 1042, 'getproperty', '_-V1I')
requireAt(2954, 1047, 'getproperty', '_-l16')
requireAt(2954, 1052, 'callpropvoid', WRITE_HELPER)

// Movement adds the pending-impulse Number to the vertical-velocity Number, then writes via the same store.
requireAt(2887, 4295, 'getproperty', '_-V1I')
requireAt(2887, 4301, 'getproperty', '_-l16')
requireAt(2887, 4304, 'callproperty', READ_HELPER)
requireAt(2887, 4308, 'convert_d')
requireAt(2887, 4312, 'getproperty', '_-V1I')
requireAt(2887, 4319, 'getproperty', '_-30')
requireAt(2887, 4323, 'callproperty', READ_HELPER)
requireAt(2887, 4327, 'convert_d')
requireAt(2887, 4328, 'add')
const movementResultWrite = requireAt(2887, 4419, 'callpropvoid', WRITE_HELPER)
assert(movementResultWrite.params[1] === 2, 'movement result writer arity changed')

const interfaceReadQName = qnameKey(multinames[traitDefinition(storeInterfaceIndex, READ_HELPER).name - 1])
const interfaceWriteQName = qnameKey(multinames[traitDefinition(storeInterfaceIndex, WRITE_HELPER).name - 1])
assert(interfaceReadQName && interfaceWriteQName, 'interface helper QName missing')
const interfaceReadReferences = exactReferencesForQName(interfaceReadQName)
const interfaceWriteReferences = exactReferencesForQName(interfaceWriteQName)
const allReadReferenceGroups = namedReferenceGroups(READ_HELPER)
const allWriteReferenceGroups = namedReferenceGroups(WRITE_HELPER)
const allReadDefinitions = namedDefinitions(READ_HELPER)
const allWriteDefinitions = namedDefinitions(WRITE_HELPER)
const allNamedReadReferences = allNamedInstructionReferences(READ_HELPER)
const allNamedWriteReferences = allNamedInstructionReferences(WRITE_HELPER)
assert(
  allNamedReadReferences.every((reference) => reference.qname),
  'non-QName read-helper reference found',
)
assert(
  allNamedWriteReferences.every((reference) => reference.qname),
  'non-QName write-helper reference found',
)
const qnameGroupedReadCount = Object.values(allReadReferenceGroups).reduce(
  (count, references) => count + references.reduce((sum, entry) => sum + entry.references.length, 0),
  0,
)
const qnameGroupedWriteCount = Object.values(allWriteReferenceGroups).reduce(
  (count, references) => count + references.reduce((sum, entry) => sum + entry.references.length, 0),
  0,
)
assert(allNamedReadReferences.length === qnameGroupedReadCount, 'read-helper QName groups omit references')
assert(allNamedWriteReferences.length === qnameGroupedWriteCount, 'write-helper QName groups omit references')
const referenceLedgers = {
  interfaceReads: sha256(JSON.stringify(interfaceReadReferences)),
  interfaceWrites: sha256(JSON.stringify(interfaceWriteReferences)),
  allReadQNameGroups: sha256(JSON.stringify(allReadReferenceGroups)),
  allWriteQNameGroups: sha256(JSON.stringify(allWriteReferenceGroups)),
  allReadDefinitions: sha256(JSON.stringify(allReadDefinitions)),
  allWriteDefinitions: sha256(JSON.stringify(allWriteDefinitions)),
  allNamedReadReferences: sha256(JSON.stringify(allNamedReadReferences)),
  allNamedWriteReferences: sha256(JSON.stringify(allNamedWriteReferences)),
}
assert(
  referenceLedgers.interfaceReads === '7bc3bd3790e02a3adeb2d377511f12d60a2e8c89f6e82a78e3edd50344c6721e',
  'interface-read ledger changed',
)
assert(
  referenceLedgers.interfaceWrites === '6f173dbe8100620c16872c55399562d7d5b406ab2cc49b796cd4e6e4e5024d18',
  'interface-write ledger changed',
)
assert(
  referenceLedgers.allReadQNameGroups === 'a83a7863438d5ab704a3d732da411fbe0490b9c3e307e57fc8951ee57a4fea77',
  'all-read QName ledger changed',
)
assert(
  referenceLedgers.allWriteQNameGroups === 'ea48ad97c9db04ba386affba2903306d50553382cb415278048f085f3cbace98',
  'all-write QName ledger changed',
)
assert(
  referenceLedgers.allReadDefinitions === '4abf394f33f073f2b85a866ab40968076f65b12048f4105624bb040a2df2da24',
  'all-read definition ledger changed',
)
assert(
  referenceLedgers.allWriteDefinitions === 'b34fe14bfbc50cf682e4bf649cf811befe8fb3da0e6fb5302e13521b01409ca3',
  'all-write definition ledger changed',
)
assert(
  referenceLedgers.allNamedReadReferences === 'c33a63e7ed82dac39ef56f89a7bd065a9fc97e658e3ed263571e74e33c61ce1f',
  'all named read-reference ledger changed',
)
assert(
  referenceLedgers.allNamedWriteReferences === 'c5fde840096ffe0e1d9a190349ba01cbf09d79288706f581736c4c84fc77f416',
  'all named write-reference ledger changed',
)

function sameNumber(actual: number, expected: number): boolean {
  return (Number.isNaN(actual) && Number.isNaN(expected)) || Object.is(actual, expected)
}

function directNumberRoundTrip(value: number): number {
  const values = [0]
  values[0] = Number(value)
  return Number(values[0])
}

function displayNumber(value: number): string {
  if (Number.isNaN(value)) return 'NaN'
  if (Object.is(value, -0)) return '-0'
  return String(value)
}

const numberCases = [
  { input: Number.NEGATIVE_INFINITY, expected: Number.NEGATIVE_INFINITY },
  { input: -170, expected: -170 },
  { input: -57, expected: -57 },
  { input: -0, expected: -0 },
  { input: 0, expected: 0 },
  { input: 1.5, expected: 1.5 },
  { input: 70, expected: 70 },
  { input: 85, expected: 85 },
  { input: Number.POSITIVE_INFINITY, expected: Number.POSITIVE_INFINITY },
  { input: Number.NaN, expected: Number.NaN },
]
const uintHandleCases = [
  { input: -1, expected: 4294967295 },
  { input: 0, expected: 0 },
  { input: 2 ** 32 - 1, expected: 4294967295 },
  { input: 2 ** 32, expected: 0 },
  { input: Number.NaN, expected: 0 },
  { input: Number.POSITIVE_INFINITY, expected: 0 },
]
const rotatingIndexCases = [
  { mappedIndex: 127, offset: 1, expected: 0 },
  { mappedIndex: 0, offset: 0xffffffff, expected: 127 },
  { mappedIndex: 0xffffffff, offset: 1, expected: 0 },
]
for (const vector of numberCases)
  assert(
    sameNumber(directNumberRoundTrip(vector.input), vector.expected),
    `Number vector ${displayNumber(vector.input)} failed`,
  )
for (const vector of uintHandleCases)
  assert(toUint32(vector.input) === vector.expected, `uint vector ${displayNumber(vector.input)} failed`)
for (const vector of rotatingIndexCases)
  assert(
    rotatingIndex(vector.mappedIndex, vector.offset) === vector.expected,
    `rotating-index vector ${vector.mappedIndex} + ${vector.offset} failed`,
  )
const knownAnswerVectors = {
  numberRoundTrips: numberCases.map((vector) => ({
    input: displayNumber(vector.input),
    expected: displayNumber(vector.expected),
    actual: displayNumber(directNumberRoundTrip(vector.input)),
  })),
  uintHandleCoercion: uintHandleCases.map((vector) => ({
    input: displayNumber(vector.input),
    expected: vector.expected,
    actual: toUint32(vector.input),
  })),
  rotatingPhysicalIndex: rotatingIndexCases.map((vector) => ({
    ...vector,
    actual: rotatingIndex(vector.mappedIndex, vector.offset),
  })),
}

const countReferences = (references: Reference[]): number =>
  references.reduce((count, entry) => count + entry.references.length, 0)
const output: Record<string, unknown> = {
  status: 'proven-for-pinned-abc',
  identity: {
    build: EXPECTED_BUILD,
    abcSha256,
    decodedMethodBodies: abc.method_body.length,
    branchTargetsValid: true,
  },
  verdict: {
    uintSlotsAreHandles: true,
    semanticValueType: 'AVM2 Number (IEEE-754 binary64)',
    valueScale: 1,
    valueRounding: 'none',
    valueWraparound: 'none',
    specialValues: 'NaN, infinities, and signed zero remain Number values; NaN payload identity is not claimed',
    canonicalSimulatorState: 'named binary64 movement values; do not expose store handles as semantic state',
  },
  equations: {
    directRead: 'read(h) = Number(values[ToUint32(h)])',
    directWrite: 'write(h, x): values[ToUint32(h)] = Number(x); return Number(values[ToUint32(h)])',
    mappedIndex: 'physical(h) = ToUint32(mapping[ToUint32(h)])',
    rotatingIndex: 'physical(h) = ToUint32(ToInt32(mapping[ToUint32(h)]) + ToInt32(offset)) % 128',
  },
  fields: {
    store: { className: FIGHTER_CLASS, traitName: '_-V1I', declaredType: STORE_INTERFACE },
    pendingImpulse: { className: FIGHTER_CLASS, traitName: '_-l16', declaredType: 'uint', role: 'store handle' },
    verticalVelocity: { className: FIGHTER_CLASS, traitName: '_-30', declaredType: 'uint', role: 'store handle' },
  },
  helpers: {
    interface: {
      className: STORE_INTERFACE,
      write: { methodId: interfaceWriteMethod, signature: '(uint, Number) -> Number' },
      read: { methodId: interfaceReadMethod, signature: '(uint) -> Number' },
    },
    implementations,
  },
  anchors: {
    directStore: [3103, 3105, 3106],
    mappedStore: [3108, 3110, 3111],
    rotatingStore: [3113, 3115, 3116],
    fighterConstructors: [2790, 3017],
    jumpPendingImpulse: [2954, 1021, 1026, 1029, 1033, 1036, 1037, 1042, 1047, 1052],
    movementImpulseVelocity: [2887, 4295, 4301, 4304, 4312, 4319, 4323, 4328, 4419],
  },
  referenceClosure: {
    readDefinitionCount: allReadDefinitions.length,
    writeDefinitionCount: allWriteDefinitions.length,
    nonQNameReadReferenceCount: allNamedReadReferences.filter((reference) => !reference.qname).length,
    nonQNameWriteReferenceCount: allNamedWriteReferences.filter((reference) => !reference.qname).length,
    interfaceReadMethodCount: interfaceReadReferences.length,
    interfaceReadInstructionCount: countReferences(interfaceReadReferences),
    interfaceWriteMethodCount: interfaceWriteReferences.length,
    interfaceWriteInstructionCount: countReferences(interfaceWriteReferences),
    qnameGroupCounts: {
      reads: Object.fromEntries(
        Object.entries(allReadReferenceGroups).map(([key, references]) => [key, countReferences(references)]),
      ),
      writes: Object.fromEntries(
        Object.entries(allWriteReferenceGroups).map(([key, references]) => [key, countReferences(references)]),
      ),
    },
    ledgers: referenceLedgers,
  },
  knownAnswerVectors,
}

if (process.argv.includes('--explore')) {
  output.referenceClosure = {
    ...(output.referenceClosure as Record<string, unknown>),
    interfaceReadReferences,
    interfaceWriteReferences,
    allReadReferenceGroups,
    allWriteReferenceGroups,
    allReadDefinitions,
    allWriteDefinitions,
    allNamedReadReferences,
    allNamedWriteReferences,
  }
}

console.log(JSON.stringify(output, null, 2))
