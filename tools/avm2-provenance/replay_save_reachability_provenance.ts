import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }
type CallSite = { methodId: number; pc: number; argumentCount: number }

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const CONTROLLER_CLASS_INDEX = 164
const WRITER_CLASS_INDEX = 357
const CLEANUP_METHOD_ID = 3442
const WRITER_FINALIZER_METHOD_ID = 6524
const WRITER_RESET_METHOD_ID = 3329
const WRITER_SETUP_METHOD_ID = 3368
const HEADER_WRITER_METHOD_ID = 6518
const EXPECTED_CLEANUP_CALLS: CallSite[] = [
  { methodId: 3212, pc: 79, argumentCount: 0 },
  { methodId: 3218, pc: 1517, argumentCount: 0 },
  { methodId: 3231, pc: 286, argumentCount: 0 },
  { methodId: 3265, pc: 55, argumentCount: 0 },
  { methodId: 3266, pc: 5, argumentCount: 0 },
  { methodId: 3270, pc: 252, argumentCount: 0 },
  { methodId: 3301, pc: 69, argumentCount: 0 },
  { methodId: 3328, pc: 198, argumentCount: 0 },
  { methodId: 3328, pc: 223, argumentCount: 0 },
  { methodId: 3328, pc: 322, argumentCount: 0 },
  { methodId: 3328, pc: 375, argumentCount: 0 },
  { methodId: 3433, pc: 14, argumentCount: 0 },
  { methodId: 3434, pc: 94, argumentCount: 0 },
  { methodId: 3435, pc: 62, argumentCount: 0 },
  { methodId: 3436, pc: 63, argumentCount: 1 },
  { methodId: 5228, pc: 864, argumentCount: 0 },
  { methodId: 5230, pc: 30, argumentCount: 0 },
  { methodId: 5231, pc: 30, argumentCount: 1 },
  { methodId: 5255, pc: 20, argumentCount: 0 },
  { methodId: 5264, pc: 136, argumentCount: 0 },
  { methodId: 5268, pc: 22, argumentCount: 0 },
  { methodId: 7322, pc: 22, argumentCount: 0 },
  { methodId: 7328, pc: 22, argumentCount: 0 },
  { methodId: 9313, pc: 29, argumentCount: 1 },
  { methodId: 9445, pc: 70, argumentCount: 1 },
  { methodId: 11238, pc: 1203, argumentCount: 0 },
  { methodId: 12806, pc: 28, argumentCount: 0 },
]
const EXPECTED_WRITER_SETUP_CALLS: CallSite[] = [
  { methodId: 3282, pc: 361, argumentCount: 3 },
  { methodId: 3514, pc: 179, argumentCount: 3 },
  { methodId: 5257, pc: 229, argumentCount: 3 },
]
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
assert(abcPath, 'usage: bun replay_save_reachability_provenance.ts --abc <main.abc>')
const abcBytes = readFileSync(resolve(abcPath))
const abcSha256 = sha256(new Uint8Array(abcBytes))
assert(abcSha256 === EXPECTED_ABC_SHA256, `ABC SHA-256 mismatch: ${abcSha256}`)
const abc: any = AbcFile.read(new ExtendedBuffer(abcBytes))
const strings = abc.constant_pool.string as string[]
const multinames = abc.constant_pool.multiname as unknown[]
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

function methodTrait(methodId: number): { trait: any; classIndex: number; static: boolean } {
  const matches = abc.instance.flatMap((instance: any, classIndex: number) =>
    [
      ...(instance.trait ?? []).map((trait: any) => ({ trait, classIndex, static: false })),
      ...(abc.class[classIndex].traits ?? []).map((trait: any) => ({ trait, classIndex, static: true })),
    ].filter(({ trait }) => trait.data?.method === methodId),
  )
  assert(matches.length === 1, `expected one trait for method ${methodId}`)
  return matches[0]
}

function methodQName(methodId: number): string {
  const key = qnameKey(multinames[methodTrait(methodId).trait.name - 1])
  assert(key, `method ${methodId} does not have an exact QName`)
  return key
}

function classQName(classIndex: number): string {
  const key = qnameKey(multinames[abc.instance[classIndex].name - 1])
  assert(key, `class ${classIndex} does not have an exact QName`)
  return key
}

function methodInstructions(methodId: number): LocatedInstruction[] {
  const instructions = methods.get(methodId)
  assert(instructions, `method ${methodId} has no body`)
  return instructions
}

function at(methodId: number, pc: number, opcode?: string, name?: string): LocatedInstruction {
  const instruction = methodInstructions(methodId).find((candidate) => candidate.pc === pc)
  assert(instruction, `method ${methodId} lacks PC ${pc}`)
  if (opcode) assert(instruction.name === opcode, `method ${methodId} PC ${pc} is not ${opcode}`)
  if (name) assert(multinameName(instruction.params[0], strings) === name, `method ${methodId} PC ${pc} is not ${name}`)
  return instruction
}

function exactTraitDefinitions(key: string): Array<{
  ownerKind: 'instance' | 'class' | 'script' | 'activation'
  ownerIndex: number
  ownerName: string
  kind: number
  methodId: number | null
  typeName: string | null
}> {
  const definition = (
    trait: any,
    ownerKind: 'instance' | 'class' | 'script' | 'activation',
    ownerIndex: number,
    ownerName: string,
  ) => ({
    ownerKind,
    ownerIndex,
    ownerName,
    kind: trait.kind & 0x0f,
    methodId: trait.data?.method ?? null,
    typeName: trait.data?.type_name ? multinameName(multinames[trait.data.type_name - 1], strings) : null,
  })
  const classDefinitions = abc.instance.flatMap((instance: any, classIndex: number) => {
    const className = multinameName(multinames[instance.name - 1], strings)
    return [
      ...(instance.trait ?? []).map((trait: any) => ({ trait, ownerKind: 'instance' as const })),
      ...(abc.class[classIndex].traits ?? []).map((trait: any) => ({ trait, ownerKind: 'class' as const })),
    ]
      .filter(({ trait }) => qnameKey(multinames[trait.name - 1]) === key)
      .map(({ trait, ownerKind }) => definition(trait, ownerKind, classIndex, className))
  })
  const scriptDefinitions = abc.script.flatMap((script: any, scriptIndex: number) =>
    (script.trait ?? [])
      .filter((trait: any) => qnameKey(multinames[trait.name - 1]) === key)
      .map((trait: any) => definition(trait, 'script', scriptIndex, `script ${scriptIndex}`)),
  )
  const activationDefinitions = abc.method_body.flatMap((body: any) =>
    (body.trait ?? [])
      .filter((trait: any) => qnameKey(multinames[trait.name - 1]) === key)
      .map((trait: any) => definition(trait, 'activation', body.method, `method ${body.method} activation`)),
  )
  return [...classDefinitions, ...scriptDefinitions, ...activationDefinitions]
}

function exactInstructionReferences(key: string): Array<{
  methodId: number
  owner: MethodOwner | null
  pc: number
  opcode: string
}> {
  return [...methods.entries()].flatMap(([methodId, instructions]) =>
    instructions
      .filter((instruction) => qnameKey(instruction.params[0]) === key)
      .map((instruction) => ({
        methodId,
        owner: owners.get(methodId) ?? null,
        pc: instruction.pc,
        opcode: instruction.name,
      })),
  )
}

function exactCalls(key: string): Array<CallSite & { owner: MethodOwner | null }> {
  return [...methods.entries()].flatMap(([methodId, instructions]) =>
    instructions
      .filter(
        (instruction) =>
          (instruction.name === 'callproperty' || instruction.name === 'callpropvoid') &&
          qnameKey(instruction.params[0]) === key,
      )
      .map((instruction) => ({
        methodId,
        owner: owners.get(methodId) ?? null,
        pc: instruction.pc,
        argumentCount: instruction.params[1] as number,
      })),
  )
}

function methodParameterType(methodId: number, parameterIndex: number): string {
  const typeIndex = abc.method[methodId]?.param_type[parameterIndex]
  assert(typeof typeIndex === 'number', `method ${methodId} lacks parameter ${parameterIndex + 1}`)
  return multinameName(multinames[typeIndex - 1], strings)
}

function classLineage(classIndex: number): number[] {
  const lineage = [classIndex]
  let superQName = qnameKey(multinames[abc.instance[classIndex].super_name - 1])
  while (superQName) {
    const superIndex = abc.instance.findIndex((instance: any) => qnameKey(multinames[instance.name - 1]) === superQName)
    if (superIndex === -1) break
    lineage.push(superIndex)
    superQName = qnameKey(multinames[abc.instance[superIndex].super_name - 1])
  }
  return lineage
}

const controllerName = multinameName(multinames[abc.instance[CONTROLLER_CLASS_INDEX].name - 1], strings)
const writerName = multinameName(multinames[abc.instance[WRITER_CLASS_INDEX].name - 1], strings)
assert(controllerName === '_-u16', 'controller class identity changed')
assert(writerName === '_-16', 'writer class identity changed')
assert(abc.instance[CONTROLLER_CLASS_INDEX].flags === 1, 'controller class flags changed')
assert(abc.instance[WRITER_CLASS_INDEX].flags === 1, 'writer class flags changed')
assert(
  !abc.instance.some(
    (instance: any, classIndex: number) =>
      classIndex !== CONTROLLER_CLASS_INDEX &&
      qnameKey(multinames[instance.super_name - 1]) === classQName(CONTROLLER_CLASS_INDEX),
  ),
  'controller gained a direct subclass',
)
assert(
  !abc.instance.some(
    (instance: any, classIndex: number) =>
      classIndex !== WRITER_CLASS_INDEX &&
      qnameKey(multinames[instance.super_name - 1]) === classQName(WRITER_CLASS_INDEX),
  ),
  'writer gained a direct subclass',
)

const cleanupQName = methodQName(CLEANUP_METHOD_ID)
const writerFinalizerQName = methodQName(WRITER_FINALIZER_METHOD_ID)
const cleanupDefinitions = exactTraitDefinitions(cleanupQName)
const writerFinalizerDefinitions = exactTraitDefinitions(writerFinalizerQName)
assert(
  cleanupDefinitions.length === 1 &&
    cleanupDefinitions[0].ownerKind === 'instance' &&
    cleanupDefinitions[0].ownerIndex === CONTROLLER_CLASS_INDEX &&
    cleanupDefinitions[0].methodId === CLEANUP_METHOD_ID,
  'cleanup QName no longer has one instance definition',
)
assert(
  writerFinalizerDefinitions.length === 1 &&
    writerFinalizerDefinitions[0].ownerKind === 'instance' &&
    writerFinalizerDefinitions[0].ownerIndex === WRITER_CLASS_INDEX &&
    writerFinalizerDefinitions[0].methodId === WRITER_FINALIZER_METHOD_ID,
  'writer-finalizer QName no longer has one instance definition',
)

const cleanupCalls = exactCalls(cleanupQName)
assert(
  JSON.stringify(cleanupCalls.map(({ methodId, pc, argumentCount }) => ({ methodId, pc, argumentCount }))) ===
    JSON.stringify(EXPECTED_CLEANUP_CALLS),
  'cleanup call-site ledger changed',
)
const cleanupCallLedgerSha256 = sha256(JSON.stringify(cleanupCalls))
assert(
  cleanupCallLedgerSha256 === '28ce2c68e3444dc6bb328bedf78484a3df7a484ad782702920b82db75cb36340',
  'cleanup call-site digest changed',
)

const controllerFieldQName = qnameKey(at(5230, 27, 'getproperty', '_-Z2h').params[0])
assert(controllerFieldQName, 'controller receiver field is not an exact QName')
const internalCalls = cleanupCalls.filter((site) => site.owner?.classIndex === CONTROLLER_CLASS_INDEX)
const externalCalls = cleanupCalls.filter((site) => site.owner?.classIndex !== CONTROLLER_CLASS_INDEX)
assert(internalCalls.length === 15 && externalCalls.length === 12, 'cleanup receiver-route counts changed')
for (const site of internalCalls) {
  const instructions = methodInstructions(site.methodId)
  const call = at(site.methodId, site.pc, 'callpropvoid', '_-22K')
  const receiver = instructions[call.index - site.argumentCount - 1]
  assert(receiver.name === 'findproperty', `method ${site.methodId} does not resolve cleanup on controller scope`)
  assert(qnameKey(receiver.params[0]) === cleanupQName, `method ${site.methodId} uses a different cleanup QName`)
}
for (const site of externalCalls) {
  const instructions = methodInstructions(site.methodId)
  const call = at(site.methodId, site.pc, 'callpropvoid', '_-22K')
  const receiver = instructions[call.index - site.argumentCount - 1]
  assert(receiver.name === 'getproperty', `method ${site.methodId} does not load a controller receiver slot`)
  assert(
    qnameKey(receiver.params[0]) === controllerFieldQName,
    `method ${site.methodId} uses a different receiver slot`,
  )
  const owner = site.owner
  assert(owner, `method ${site.methodId} has no owner`)
  const receiverTraits = classLineage(owner.classIndex).flatMap((classIndex) =>
    (abc.instance[classIndex].trait ?? []).filter(
      (trait: any) => qnameKey(multinames[trait.name - 1]) === controllerFieldQName,
    ),
  )
  assert(receiverTraits.length === 1, `method ${site.methodId} lineage lacks one controller slot`)
  assert((receiverTraits[0].kind & 0x0f) === 0, `method ${site.methodId} receiver is not a slot`)
  assert(
    qnameKey(multinames[receiverTraits[0].data.type_name - 1]) === classQName(CONTROLLER_CLASS_INDEX),
    `method ${site.methodId} receiver is not typed as controller`,
  )
}

const cleanupMethod = abc.method[CLEANUP_METHOD_ID]
assert(cleanupMethod.param_count === 1, 'cleanup parameter count changed')
assert(methodParameterType(CLEANUP_METHOD_ID, 0) === 'Boolean', 'cleanup parameter type changed')
assert(cleanupMethod.flags === 8, 'cleanup optional-parameter flag changed')
assert(cleanupMethod.options.option.length === 1, 'cleanup optional value count changed')
assert(cleanupMethod.options.option[0].kind === 11, 'cleanup default is no longer true')
assert(
  !methodInstructions(CLEANUP_METHOD_ID).some(
    (instruction) =>
      instruction.name === 'getlocal_1' || (instruction.name === 'getlocal' && instruction.params[0] === 1),
  ),
  'cleanup Boolean parameter became live',
)
for (const methodId of [5231, 9313, 9445]) {
  const site = cleanupCalls.find((candidate) => candidate.methodId === methodId)
  assert(site, `cleanup call from method ${methodId} disappeared`)
  const call = at(methodId, site.pc, 'callpropvoid', '_-22K')
  assert(methodInstructions(methodId)[call.index - 1].name === 'pushfalse', `method ${methodId} no longer passes false`)
}
const forwardedSite = cleanupCalls.find((candidate) => candidate.methodId === 3436)
assert(forwardedSite, 'cleanup call from method 3436 disappeared')
const forwardedCall = at(3436, forwardedSite.pc, 'callpropvoid', '_-22K')
assert(
  methodInstructions(3436)[forwardedCall.index - 1].name === 'getlocal_1',
  'method 3436 no longer forwards its Boolean',
)

const writerFieldQName = qnameKey(at(CLEANUP_METHOD_ID, 187, 'getproperty', '_-JJ').params[0])
assert(writerFieldQName, 'writer field is not an exact QName')
const writerFieldDefinitions = exactTraitDefinitions(writerFieldQName)
assert(writerFieldDefinitions.length === 1, 'writer field definition count changed')
assert(
  writerFieldDefinitions[0].ownerKind === 'instance' &&
    writerFieldDefinitions[0].ownerIndex === CONTROLLER_CLASS_INDEX &&
    writerFieldDefinitions[0].kind === 0 &&
    writerFieldDefinitions[0].typeName === writerName,
  'writer field owner or type changed',
)
const writerFieldTrait = abc.instance[CONTROLLER_CLASS_INDEX].trait.find(
  (trait: any) => qnameKey(multinames[trait.name - 1]) === writerFieldQName,
)
assert(writerFieldTrait?.data?.vindex === 0, 'writer field gained an explicit initializer')
const writerFieldMutations = exactInstructionReferences(writerFieldQName).filter(
  (reference) => reference.opcode === 'setproperty' || reference.opcode === 'initproperty',
)
let nextControllerSlotId = 1
let writerFieldSlotId: number | null = null
for (const trait of abc.instance[CONTROLLER_CLASS_INDEX].trait) {
  if ((trait.kind & 0x0f) !== 0 && (trait.kind & 0x0f) !== 6) continue
  const assignedSlotId = trait.data.slot_id || nextControllerSlotId
  nextControllerSlotId = Math.max(nextControllerSlotId, assignedSlotId + 1)
  if (qnameKey(multinames[trait.name - 1]) === writerFieldQName) writerFieldSlotId = assignedSlotId
}
assert(writerFieldSlotId === 143, 'writer field slot ID changed')
const writerSetslotReferences = [...methods.entries()].flatMap(([methodId, instructions]) =>
  instructions
    .filter((instruction) => instruction.name === 'setslot' && instruction.params[0] === writerFieldSlotId)
    .map((instruction) => ({ methodId, pc: instruction.pc })),
)
assert(writerSetslotReferences.length === 0, 'writer field gained a setslot mutation')
const runtimeNamePropertyWrites = [...methods.values()]
  .flat()
  .filter(
    (instruction) =>
      (instruction.name === 'setproperty' || instruction.name === 'initproperty' || instruction.name === 'setsuper') &&
      qnameKey(instruction.params[0]) === null,
  )
assert(runtimeNamePropertyWrites.length === 3718, 'runtime-name property-write count changed')
const pushedWriterFieldNames = [...methods.values()]
  .flat()
  .filter((instruction) => instruction.name === 'pushstring' && instruction.params[0] === '_-JJ')
assert(pushedWriterFieldNames.length === 0, 'writer field name became a pushed runtime string')
assert(
  JSON.stringify(writerFieldMutations.map(({ methodId, pc, opcode }) => ({ methodId, pc, opcode }))) ===
    JSON.stringify([
      { methodId: WRITER_RESET_METHOD_ID, pc: 33, opcode: 'initproperty' },
      { methodId: WRITER_SETUP_METHOD_ID, pc: 37, opcode: 'initproperty' },
    ]),
  'writer field exact-QName mutation ledger changed',
)
at(CLEANUP_METHOD_ID, 184, 'findproperty', '_-JJ')
at(CLEANUP_METHOD_ID, 187, 'getproperty', '_-JJ')
at(CLEANUP_METHOD_ID, 190, 'pushnull')
at(CLEANUP_METHOD_ID, 191, 'coerce', writerName)
const writerNullBranch = at(CLEANUP_METHOD_ID, 194, 'ifeq')
assert(writerNullBranch.endPc + (writerNullBranch.params[0] as number) === 208, 'writer-null branch target changed')
at(CLEANUP_METHOD_ID, 198, 'findproperty', '_-JJ')
at(CLEANUP_METHOD_ID, 201, 'getproperty', '_-JJ')
at(CLEANUP_METHOD_ID, 204, 'callpropvoid', '_-x3N')
const finalizerCalls = exactCalls(writerFinalizerQName)
assert(
  finalizerCalls.length === 1 &&
    finalizerCalls[0].methodId === CLEANUP_METHOD_ID &&
    finalizerCalls[0].pc === 204 &&
    finalizerCalls[0].argumentCount === 0,
  'writer-finalizer call ledger changed',
)

at(WRITER_RESET_METHOD_ID, 22, 'callpropvoid', '_-J2g')
at(WRITER_RESET_METHOD_ID, 29, 'pushnull')
at(WRITER_RESET_METHOD_ID, 33, 'initproperty', '_-JJ')
at(WRITER_SETUP_METHOD_ID, 29, 'findpropstrict', writerName)
const constructWriter = at(WRITER_SETUP_METHOD_ID, 33, 'constructprop', writerName)
assert(constructWriter.params[1] === 1, 'writer constructor argument count changed')
at(WRITER_SETUP_METHOD_ID, 37, 'initproperty', '_-JJ')
at(WRITER_SETUP_METHOD_ID, 43, 'getproperty', '_-JJ')
at(WRITER_SETUP_METHOD_ID, 46, 'getlocal_1')
at(WRITER_SETUP_METHOD_ID, 47, 'getlocal_2')
at(WRITER_SETUP_METHOD_ID, 48, 'getlocal_3')
const headerCall = at(WRITER_SETUP_METHOD_ID, 49, 'callpropvoid', '_-63H')
assert(headerCall.params[1] === 3, 'header writer argument count changed')
assert(methodParameterType(WRITER_SETUP_METHOD_ID, 0) === 'uint', 'writer setup seed type changed')
assert(methodParameterType(WRITER_SETUP_METHOD_ID, 1) === 'uint', 'writer setup playlist type changed')
assert(methodParameterType(WRITER_SETUP_METHOD_ID, 2) === 'Boolean', 'writer setup online type changed')

const writerSetupQName = methodQName(WRITER_SETUP_METHOD_ID)
const writerSetupCalls = exactCalls(writerSetupQName)
assert(
  JSON.stringify(writerSetupCalls.map(({ methodId, pc, argumentCount }) => ({ methodId, pc, argumentCount }))) ===
    JSON.stringify(EXPECTED_WRITER_SETUP_CALLS),
  'writer setup call-site ledger changed',
)
at(3282, 360, 'pushtrue')
at(3514, 158, 'getlocal_1')
at(3514, 159, 'not')
const localSetupBranch = at(3514, 160, 'iffalse')
assert(
  localSetupBranch.endPc + (localSetupBranch.params[0] as number) === 184,
  'local writer-setup skip target changed',
)
at(3514, 178, 'pushfalse')
at(5257, 228, 'pushtrue')

assert(methodParameterType(HEADER_WRITER_METHOD_ID, 0) === 'uint', 'header seed type changed')
assert(methodParameterType(HEADER_WRITER_METHOD_ID, 1) === 'uint', 'header playlist type changed')
assert(methodParameterType(HEADER_WRITER_METHOD_ID, 2) === 'Boolean', 'header online type changed')
at(HEADER_WRITER_METHOD_ID, 53, 'getlocal_1')
at(HEADER_WRITER_METHOD_ID, 54, 'callpropvoid', '_-S2c')
at(HEADER_WRITER_METHOD_ID, 66, 'getlocal_2')
at(HEADER_WRITER_METHOD_ID, 67, 'callpropvoid', '_-S2c')
at(HEADER_WRITER_METHOD_ID, 148, 'getlocal_3')
at(HEADER_WRITER_METHOD_ID, 163, 'callpropvoid', '_-PY')

const namedCleanupReferences = [...methods.entries()].flatMap(([methodId, instructions]) =>
  instructions
    .filter((instruction) => multinameName(instruction.params[0], strings) === '_-22K')
    .map((instruction) => ({
      methodId,
      pc: instruction.pc,
      opcode: instruction.name,
      qname: qnameKey(instruction.params[0]),
    })),
)
assert(
  namedCleanupReferences.every((reference) => reference.qname === cleanupQName),
  'cleanup name has a non-QName route',
)
const pushedCleanupNames = [...methods.values()]
  .flat()
  .filter((instruction) => instruction.name === 'pushstring' && instruction.params[0] === '_-22K')
assert(pushedCleanupNames.length === 0, 'cleanup name became a pushed runtime string')
const directStaticCleanupCalls = [...methods.entries()].flatMap(([methodId, instructions]) =>
  instructions
    .filter((instruction) => instruction.name === 'callstatic' && instruction.params[0] === CLEANUP_METHOD_ID)
    .map((instruction) => ({ methodId, pc: instruction.pc })),
)
assert(directStaticCleanupCalls.length === 0, 'cleanup gained a callstatic route')
const callmethodCount = [...methods.values()].flat().filter((instruction) => instruction.name === 'callmethod').length
assert(callmethodCount === 0, 'ABC gained callmethod instructions')

const output = {
  status: 'proven-for-pinned-abc',
  identity: {
    build: EXPECTED_BUILD,
    abcSha256,
    decodedMethodBodies: abc.method_body.length,
    branchTargetsValid: true,
  },
  dispatch: {
    controller: {
      classIndex: CONTROLLER_CLASS_INDEX,
      className: controllerName,
      sealed: true,
      final: false,
      localDescendantCount: 0,
    },
    cleanup: {
      methodId: CLEANUP_METHOD_ID,
      traitName: owners.get(CLEANUP_METHOD_ID)?.traitName,
      exactQName: cleanupQName,
      exactDefinitionCount: cleanupDefinitions.length,
      callSiteCount: cleanupCalls.length,
      callerMethodCount: new Set(cleanupCalls.map((site) => site.methodId)).size,
      internalReceiverCount: internalCalls.length,
      typedExternalReceiverCount: externalCalls.length,
      optionalBooleanDefault: true,
      optionalBooleanReadCount: 0,
      callSiteLedgerSha256: cleanupCallLedgerSha256,
      callSites: cleanupCalls.map((site) => ({
        methodId: site.methodId,
        owner: site.owner,
        pc: site.pc,
        argument:
          site.argumentCount === 0
            ? 'default true (unused)'
            : site.methodId === 3436
              ? 'forwarded Boolean (unused)'
              : 'explicit false (unused)',
        receiverRoute:
          site.owner?.classIndex === CONTROLLER_CLASS_INDEX ? 'controller scope' : 'owner slot typed as controller',
      })),
    },
    writerFinalizer: {
      writerClassIndex: WRITER_CLASS_INDEX,
      writerClassName: writerName,
      writerSealed: true,
      writerFinal: false,
      localDescendantCount: 0,
      methodId: WRITER_FINALIZER_METHOD_ID,
      traitName: owners.get(WRITER_FINALIZER_METHOD_ID)?.traitName,
      exactQName: writerFinalizerQName,
      exactDefinitionCount: writerFinalizerDefinitions.length,
      exactCallSites: finalizerCalls,
      receiverField: { traitName: '_-JJ', type: writerName, default: null },
      precondition: 'method 3442 PC 194 skips the sole finalizer call when the typed writer field is null',
    },
  },
  writerLifecycle: {
    exactQNameFieldMutations: writerFieldMutations,
    writerFieldSlotId,
    setslotFieldMutations: writerSetslotReferences,
    runtimeNamePropertyWriteCount: runtimeNamePropertyWrites.length,
    pushedWriterFieldNameCount: pushedWriterFieldNames.length,
    reset: { methodId: WRITER_RESET_METHOD_ID, closePc: 22, nullWritePc: 33 },
    setup: {
      methodId: WRITER_SETUP_METHOD_ID,
      constructorPc: 33,
      fieldWritePc: 37,
      headerCallPc: 49,
      parameterTypes: ['uint', 'uint', 'Boolean'],
      callSites: [
        { methodId: 3282, pc: 361, headerBoolean: true },
        { methodId: 3514, pc: 179, headerBoolean: false, precondition: 'method parameter 1 is false' },
        { methodId: 5257, pc: 229, headerBoolean: true },
      ],
    },
  },
  dynamicDispatchClosure: {
    exactCleanupQNameInstructionCount: exactInstructionReferences(cleanupQName).length,
    exactCleanupCallCount: cleanupCalls.length,
    sameSimpleNameNonQNameCount: namedCleanupReferences.filter((reference) => reference.qname !== cleanupQName).length,
    pushedCleanupNameCount: pushedCleanupNames.length,
    callstaticCleanupCount: directStaticCleanupCalls.length,
    callmethodCount,
    unresolved: [
      'The controller and writer classes are sealed but not final; the pinned ABC has no descendants or overrides, but host- or separately-loaded subclasses are not excluded by static ABC evidence.',
      'Runtime-name property access and native or host reflection cannot be assigned to method 3442 without an authenticated runtime trace.',
      'The ABC contains runtime-name property writes. None pushes the writer field name as a literal, but computed writes cannot be excluded as writer-field mutations by static exact-QName analysis.',
      'Static call-site reachability does not identify which lifecycle event exercised a site for any authentic match.',
    ],
  },
}

console.log(JSON.stringify(output, null, 2))
