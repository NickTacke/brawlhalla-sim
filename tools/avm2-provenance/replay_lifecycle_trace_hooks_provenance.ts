import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

import {
  HOOK_DEFINITIONS,
  PAYLOAD_SCHEMAS,
  canonicalJson,
  validateHookManifest,
} from './replay_lifecycle_trace_schema.js'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }
type CallSite = { methodId: number; pc: number; argumentCount: number }

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_DECODER_COMMIT = 'ad9714d'
const ORACLE_SPEC_COMMIT = '29770640d30558a6bb6a25229253f2bc46d9ac92'
const RUFFLE_SOURCE_COMMIT = '6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943'
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

const abcPath = argument('--abc') ?? resolve(import.meta.dir, '../../artifacts/main.abc')
const lockfile = readFileSync(resolve(import.meta.dir, '../../bun.lock'), 'utf8')
assert(lockfile.includes(EXPECTED_DECODER_COMMIT), 'abc-disassembler lockfile commit changed')
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
const methodBodies = new Map<number, any>()
const branchErrors: string[] = []
for (const body of abc.method_body) {
  const instructions = locateInstructions(body.code, disassembler.disassemble(body) as Instruction[])
  methods.set(body.method, instructions)
  methodBodies.set(body.method, body)
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

function at(methodId: number, pc: number, opcode?: string, name?: string, argumentCount?: number): LocatedInstruction {
  const instruction = methodInstructions(methodId).find((candidate) => candidate.pc === pc)
  assert(instruction, `method ${methodId} lacks PC ${pc}`)
  if (opcode) assert(instruction.name === opcode, `method ${methodId} PC ${pc} is not ${opcode}`)
  if (name) {
    const actualName = multinameName(instruction.params[0], strings)
    assert(actualName === name, `method ${methodId} PC ${pc} names ${actualName}, not ${name}`)
  }
  if (argumentCount !== undefined)
    assert(instruction.params.at(-1) === argumentCount, `method ${methodId} PC ${pc} argument count changed`)
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
    ].flatMap(({ trait, ownerKind }) =>
      qnameKey(multinames[trait.name - 1]) === key ? [definition(trait, ownerKind, classIndex, className)] : [],
    )
  })
  const scriptDefinitions = abc.script.flatMap((script: any, scriptIndex: number) =>
    (script.trait ?? []).flatMap((trait: any) =>
      qnameKey(multinames[trait.name - 1]) === key
        ? [definition(trait, 'script', scriptIndex, `script ${scriptIndex}`)]
        : [],
    ),
  )
  const activationDefinitions = abc.method_body.flatMap((body: any) =>
    (body.trait ?? []).flatMap((trait: any) =>
      qnameKey(multinames[trait.name - 1]) === key
        ? [definition(trait, 'activation', body.method, `method ${body.method} activation`)]
        : [],
    ),
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
    instructions.flatMap((instruction) =>
      qnameKey(instruction.params[0]) === key
        ? [
            {
              methodId,
              owner: owners.get(methodId) ?? null,
              pc: instruction.pc,
              opcode: instruction.name,
            },
          ]
        : [],
    ),
  )
}

function exactCalls(key: string): Array<CallSite & { owner: MethodOwner | null }> {
  return [...methods.entries()].flatMap(([methodId, instructions]) =>
    instructions.flatMap((instruction) =>
      (instruction.name === 'callproperty' || instruction.name === 'callpropvoid') &&
      qnameKey(instruction.params[0]) === key
        ? [
            {
              methodId,
              owner: owners.get(methodId) ?? null,
              pc: instruction.pc,
              argumentCount: instruction.params[1] as number,
            },
          ]
        : [],
    ),
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
  instructions.flatMap((instruction) =>
    instruction.name === 'setslot' && instruction.params[0] === writerFieldSlotId
      ? [{ methodId, pc: instruction.pc }]
      : [],
  ),
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
  instructions.flatMap((instruction) =>
    multinameName(instruction.params[0], strings) === '_-22K'
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
assert(
  namedCleanupReferences.every((reference) => reference.qname === cleanupQName),
  'cleanup name has a non-QName route',
)
const pushedCleanupNames = [...methods.values()]
  .flat()
  .filter((instruction) => instruction.name === 'pushstring' && instruction.params[0] === '_-22K')
assert(pushedCleanupNames.length === 0, 'cleanup name became a pushed runtime string')
const directStaticCleanupCalls = [...methods.entries()].flatMap(([methodId, instructions]) =>
  instructions.flatMap((instruction) =>
    instruction.name === 'callstatic' && instruction.params[0] === CLEANUP_METHOD_ID
      ? [{ methodId, pc: instruction.pc }]
      : [],
  ),
)
assert(directStaticCleanupCalls.length === 0, 'cleanup gained a callstatic route')
const callmethodCount = [...methods.values()].flat().filter((instruction) => instruction.name === 'callmethod').length
assert(callmethodCount === 0, 'ABC gained callmethod instructions')

validateHookManifest()

const originAnchors = [
  { methodId: 6520, branchPc: 393, zeroPc: 397, clockPc: 410, constantPc: 413, subtractPc: 415, storePc: 418 },
  { methodId: 6521, branchPc: 406, zeroPc: 410, clockPc: 423, constantPc: 426, subtractPc: 428, storePc: 431 },
  { methodId: 6522, branchPc: 372, zeroPc: 376, clockPc: 389, constantPc: 392, subtractPc: 394, storePc: 397 },
  { methodId: 6523, branchPc: 435, zeroPc: 439, clockPc: 452, constantPc: 455, subtractPc: 457, storePc: 460 },
]
const originMasks = [2, 4, 16, 32, 1024, 2048, 8192, 32768, 262144, 524288, 4194304]
for (const anchor of originAnchors) {
  at(anchor.methodId, anchor.branchPc, 'iffalse')
  assert(
    at(anchor.methodId, anchor.zeroPc, 'pushbyte').params[0] === 0,
    `method ${anchor.methodId} zero origin changed`,
  )
  at(anchor.methodId, anchor.clockPc, 'getproperty', '_-q3e')
  assert(
    at(anchor.methodId, anchor.constantPc, 'pushbyte').params[0] === 16,
    `method ${anchor.methodId} origin offset changed`,
  )
  at(anchor.methodId, anchor.subtractPc, 'subtract_i')
  at(anchor.methodId, anchor.storePc, 'setlocal')
  const predicate = methodInstructions(anchor.methodId).filter((instruction) => instruction.pc <= anchor.storePc)
  const constants = predicate.flatMap((instruction) =>
    instruction.name === 'pushint' || instruction.name === 'pushbyte' ? [instruction.params[0]] : [],
  )
  for (const mask of originMasks)
    assert(constants.includes(mask), `method ${anchor.methodId} origin predicate lacks mask ${mask}`)
  for (const [field, expectedQName] of [
    ['_-b5B', '36:20034'],
    ['_-Gr', '36:29696'],
    ['_-p4f', '36:28525'],
  ] as const)
    assert(
      predicate.some(
        (instruction) =>
          multinameName(instruction.params[0], strings) === field && qnameKey(instruction.params[0]) === expectedQName,
      ),
      `method ${anchor.methodId} origin predicate lacks ${field} ${expectedQName}`,
    )
  assert(
    qnameKey(at(anchor.methodId, anchor.clockPc).params[0]) === '36:27581',
    `method ${anchor.methodId} ordinary-origin QName changed`,
  )
}

const finalizerBody = methodBodies.get(WRITER_FINALIZER_METHOD_ID)
assert(finalizerBody, 'writer finalizer body is absent')
assert(finalizerBody.code.length === 1162, 'writer finalizer body length changed')
assert(methodInstructions(WRITER_FINALIZER_METHOD_ID).length === 524, 'writer finalizer instruction count changed')
assert(finalizerBody.exception.length === 1, 'writer finalizer exception count changed')
const filesystemException = finalizerBody.exception[0]
assert(
  filesystemException.from === 943 &&
    filesystemException.to === 1141 &&
    filesystemException.target === 1145 &&
    multinameName(multinames[filesystemException.exc_type - 1], strings) === 'Error',
  'writer finalizer filesystem exception boundary changed',
)
at(WRITER_FINALIZER_METHOD_ID, 897, 'callpropvoid', '_-m57', 1)
at(WRITER_FINALIZER_METHOD_ID, 931, 'callpropvoid', 'compress', 0)
at(WRITER_FINALIZER_METHOD_ID, 1103, 'callpropvoid', 'open', 2)
at(WRITER_FINALIZER_METHOD_ID, 1121, 'getproperty', '_-om')
at(WRITER_FINALIZER_METHOD_ID, 1125, 'callpropvoid', 'writeBytes', 1)
at(WRITER_FINALIZER_METHOD_ID, 1136, 'callpropvoid', 'close', 0)
at(WRITER_FINALIZER_METHOD_ID, 1145)
at(WRITER_FINALIZER_METHOD_ID, 1161, 'returnvoid')

const authenticatedHooks = HOOK_DEFINITIONS.map((hook) => {
  const instruction = at(
    hook.originalMethodId,
    hook.originalBytePc,
    hook.expectedOpcode,
    hook.expectedName,
    hook.expectedArgumentCount,
  )
  const body = methodBodies.get(hook.originalMethodId)
  const owner = owners.get(hook.originalMethodId)
  assert(body, `hook ${hook.hookId} method body is absent`)
  assert(owner, `hook ${hook.hookId} method owner is absent`)
  return {
    ...hook,
    ownerClassIndex: owner.classIndex,
    ownerClassName: owner.className,
    methodTraitName: owner.traitName,
    methodQName: methodQName(hook.originalMethodId),
    methodBodySha256: sha256(new Uint8Array(body.code)),
    authenticatedOpcode: instruction.name,
    authenticatedOperandQName: qnameKey(instruction.params[0]),
  }
})

const hookManifest = {
  schemaVersion: 1,
  target: {
    build: EXPECTED_BUILD,
    abcSha256,
    decodedMethodBodies: abc.method_body.length,
    branchTargetsValid: true,
    abcDecoderCommit: EXPECTED_DECODER_COMMIT,
  },
  oracleContract: {
    specificationCommit: ORACLE_SPEC_COMMIT,
    selectedRuffleSourceCommit: RUFFLE_SOURCE_COMMIT,
  },
  sourceAttestations: {
    replaySaveReachabilityCommit: '6bf17bf057a1b2dabe8b82e652e85a1a319d9254',
    specialModeTimestampCommit: 'b159ff24d6a3b8970c4a90ca87338ce633bf460b',
    specialModeTimestampQNameCorrection:
      'That analyzer displayed strings[name] instead of the ABC one-based strings[name - 1]. Raw pinned QNames are _-b5B, _-Gr, _-p4f, and _-q3e.',
    replayLifecycleStateCommit: 'b7ba0a2cd1e6ab0c2228b2f5ec198ddee87636c1',
    nativeReplayWriterCommit: '94a936c68895661f2277441282787e4ba38f6266',
    traceCapabilityAuditCommit: 'effd0bd15b282d6fff6c740ccef8b4b3bcc52f66',
  },
  staticClosure: {
    cleanupCallSiteCount: cleanupCalls.length,
    cleanupCallerMethodCount: new Set(cleanupCalls.map((site) => site.methodId)).size,
    cleanupCallSiteLedgerSha256: cleanupCallLedgerSha256,
    setupCallSiteCount: writerSetupCalls.length,
    writerFieldSlotId,
    exactWriterFieldMutationCount: writerFieldMutations.length,
    runtimeNamePropertyWriteCount: runtimeNamePropertyWrites.length,
    finalizerFilesystemException: {
      fromPc: filesystemException.from,
      toPc: filesystemException.to,
      handlerPc: filesystemException.target,
      type: 'Error',
    },
  },
  hooks: authenticatedHooks,
  payloadSchemas: PAYLOAD_SCHEMAS,
  scalarCodes: {
    slotState: { null: 0, present: 1 },
    nativeOperation: { none: 0, open: 1, writeBytes: 2, close: 3 },
    finalizerOutcome: { noNativeAttempt: 0, completed: 1, handledError: 2 },
  },
  sequencing: [
    'setup.call.* precedes writer-slot.setup-write for one method-3368 activation',
    'one cleanup.call.* precedes cleanup.writer-null-decision for one method-3442 activation',
    'cleanup.finalizer-dispatch occurs only when cleanup.writer-null-decision observes a present slot',
    'origin.*.selected records the stored origin after the shared lifecycle predicate',
    'native.writeBytes.before records only payload length and SHA-256 before the synchronous write call',
    'each native operation emits before then after; a caught Error omits after and emits native.error.caught',
    'finalizer.return follows completed, handled-error, or no-native-attempt classification',
    'writer-slot.reset-write records the null transition after reset close dispatch',
  ],
  privacy: {
    allowedPayload: 'fixed-position booleans, bounded integers, slot-state codes, and lowercase SHA-256 only',
    forbidden: [
      'capability tokens',
      'filesystem paths or filenames',
      'replay bytes',
      'player or account identifiers',
      'player names or arbitrary target strings',
      'memory addresses or object identities',
      'native Error messages',
      'bulk proprietary data',
    ],
  },
  runtimeAuthenticationRequirements: [
    'hash-pinned complete-AIR runtime and original/transformed application identities',
    'independent transformed-ABC verification including stack, scope, branch, and exception neutrality',
    'manifest-bound capability token kept outside target state and serialized traces',
    'active original method, byte-PC, call-depth, and sequence enforcement in the trace provider',
    'optimizer-on/off trace equality and deterministic host-services gates',
    'terminal lifecycle barrier and scheduler quiescence before any no-attempt claim',
  ],
}

const hookManifestSha256 = sha256(canonicalJson(hookManifest))
const output = {
  status: 'static-hook-anchors-authenticated-runtime-blocked',
  hookManifestSha256,
  hookManifest,
  acceptance: {
    originalAbcIdentity: 'pass',
    setupCleanupWriterSlotAnchors: 'pass',
    originBranchAnchors: 'pass',
    nativeCallAndPayloadAnchors: 'pass',
    privacySafePayloadSchema: 'pass',
    transformedApplicationVerification: 'not-run',
    nonPerturbationExecution: 'not-run',
    authenticatedRuntimeTrace: 'not-run',
  },
  blockers: [
    'Issue 72 has not supplied the hash-pinned complete-AIR patched-Ruffle runtime, deterministic host-services implementation, or runtime artifact-set identity required to execute these hooks.',
    'Issue 73 still lacks a transformed application, authenticated provider, and independent transformer/verifier result, so stack/scope neutrality, branch and exception rewrites, capability enforcement, and optimizer equality cannot be attested.',
    'No authenticated trace exists, so runtime reachability, native completion outcomes, payload extraction, and nonperturbation remain unproven.',
  ],
}

process.stdout.write(canonicalJson(output))
