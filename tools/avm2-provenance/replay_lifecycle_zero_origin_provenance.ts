import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler, type TraitSlot, type TraitsInfo } from 'abc-disassembler'

type Instruction = {
  id: number
  name: string
  params: unknown[]
  types: string[]
}

type LocatedInstruction = Instruction & {
  index: number
  pc: number
  endPc: number
}

type MethodOwner = {
  classIndex: number
}

type LifecycleWrite = {
  methodId: number
  instruction: number
  pc: number
  value: number | null
  receiver: 'controller-scope' | 'controller-field' | 'ui-class'
}

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_REFERENCE_LEDGER_SHA256 = '0f6e1eeae0f1ed7137f3f94075bf0c6608ddca2dfbc4e9ddc2365022eb1e1586'
const EXPECTED_WRITE_LEDGER_SHA256 = 'dab113d2c06d01eb49062bd4fd9349758c6cd8bfe9f0e3548101dcb26e73cb83'
const CONTROLLER_CLASS_INDEX = 164
const UI_CLASS_INDEX = 567
const LIFECYCLE_QNAME = '36:20034'
const LIFECYCLE_SLOT_ID = 214
const REQUESTED_VALUES = new Set([2, 4, 8192, 262144, 4194304])
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

function locateInstructions(codeBytes: number[] | Uint8Array, instructions: Instruction[]): LocatedInstruction[] {
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
  const boundaries = new Set(instructions.map(({ pc }) => pc))
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

function qnameKey(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('kind' in value) || !('data' in value)) return null
  const candidate = value as { kind?: unknown; data?: { ns?: unknown; name?: unknown } }
  if (candidate.kind !== 7 || typeof candidate.data?.ns !== 'number' || typeof candidate.data.name !== 'number')
    return null
  return `${candidate.data.ns}:${candidate.data.name}`
}

function multinameName(value: unknown, strings: string[]): string {
  if (!value || typeof value !== 'object' || !('data' in value)) return ''
  const name = (value as { data?: { name?: unknown } }).data?.name
  if (typeof name === 'string') return name
  return typeof name === 'number' ? (strings[name - 1] ?? '') : ''
}

function traitMethodId(trait: TraitsInfo): number | undefined {
  return 'method' in trait.data ? trait.data.method : undefined
}

function buildOwners(abc: AbcFile): Map<number, MethodOwner> {
  const owners = new Map<number, MethodOwner>()
  for (let classIndex = 0; classIndex < abc.instance.length; classIndex++) {
    owners.set(abc.instance[classIndex].iinit, { classIndex })
    owners.set(abc.class[classIndex].cinit, { classIndex })
    for (const traits of [abc.instance[classIndex].trait, abc.class[classIndex].traits]) {
      for (const trait of traits) {
        const methodId = traitMethodId(trait)
        if (methodId !== undefined) owners.set(methodId, { classIndex })
      }
    }
  }
  return owners
}

function methodQName(abc: AbcFile, methodId: number): string {
  const matches = abc.instance.flatMap((instance) =>
    instance.trait.filter((trait) => traitMethodId(trait) === methodId),
  )
  assert(matches.length === 1, `method ${methodId} does not have one instance trait`)
  const key = qnameKey(abc.constant_pool.multiname[matches[0].name - 1])
  assert(key, `method ${methodId} does not have an exact QName`)
  return key
}

function numericLiteral(instruction: LocatedInstruction | undefined): number | null {
  if (!instruction || !['pushbyte', 'pushshort', 'pushint', 'pushuint'].includes(instruction.name)) return null
  return typeof instruction.params[0] === 'number' ? instruction.params[0] : null
}

const abcPath = argument('--abc')
assert(abcPath, 'usage: bun replay_lifecycle_zero_origin_provenance.ts --abc <main.abc>')
const abcBytes = readFileSync(resolve(abcPath))
assert(sha256(new Uint8Array(abcBytes)) === EXPECTED_ABC_SHA256, 'ABC SHA-256 mismatch')

const abc = AbcFile.read(new ExtendedBuffer(abcBytes)) as unknown as AbcFile
const strings = abc.constant_pool.string as string[]
const buildStrings = strings.filter((value) => /^\d+\.\d+\.\d+$/.test(value))
assert(buildStrings.length === 1 && buildStrings[0] === EXPECTED_BUILD, 'ABC build mismatch')
assert(abc.instance.length > UI_CLASS_INDEX, 'expected lifecycle owner classes are absent')

const disassembler = new InstructionDisassembler(abc)
const methods = new Map<number, LocatedInstruction[]>()
const branchErrors: string[] = []
for (const body of abc.method_body) {
  const instructions = locateInstructions(body.code, disassembler.disassemble(body) as Instruction[])
  methods.set(body.method, instructions)
  branchErrors.push(...validateBranches(instructions, body.code.length).map((pc) => `method ${body.method} ${pc}`))
}
assert(branchErrors.length === 0, `invalid branch targets: ${branchErrors.join(', ')}`)

const owners = buildOwners(abc)
const lifecycleDefinitions: Array<{ classIndex: number; trait: TraitsInfo }> = abc.instance.flatMap(
  (instance, classIndex) =>
    instance.trait.flatMap((trait) =>
      qnameKey(abc.constant_pool.multiname[trait.name - 1]) === LIFECYCLE_QNAME ? [{ classIndex, trait }] : [],
    ),
)
assert(
  JSON.stringify(lifecycleDefinitions.map(({ classIndex }) => classIndex)) ===
    JSON.stringify([CONTROLLER_CLASS_INDEX, UI_CLASS_INDEX]),
  'lifecycle public-QName owner set changed',
)
const controllerTrait = lifecycleDefinitions[0].trait
assert((controllerTrait.kind & 0x0f) === 0, 'controller lifecycle field is not a slot')
const controllerSlot = controllerTrait.data as TraitSlot
assert(controllerSlot.vindex === 0, 'controller lifecycle field default changed')
assert(
  multinameName(abc.constant_pool.multiname[controllerSlot.type_name - 1], strings) === 'uint',
  'controller lifecycle field is not uint',
)

let nextSlotId = 1
let lifecycleSlotId = 0
for (const trait of abc.instance[CONTROLLER_CLASS_INDEX].trait) {
  if (![0, 6].includes(trait.kind & 0x0f)) continue
  const slot = trait.data as TraitSlot
  const slotId = slot.slot_id || nextSlotId
  if (qnameKey(abc.constant_pool.multiname[trait.name - 1]) === LIFECYCLE_QNAME) lifecycleSlotId = slotId
  nextSlotId = Math.max(nextSlotId, slotId + 1)
}
assert(lifecycleSlotId === LIFECYCLE_SLOT_ID, `lifecycle slot changed to ${lifecycleSlotId}`)
const slotWrites = [...methods.entries()].flatMap(([methodId, instructions]) =>
  instructions.flatMap((instruction) =>
    instruction.name === 'setslot' && instruction.params[0] === LIFECYCLE_SLOT_ID
      ? [{ methodId, instruction: instruction.index, pc: instruction.pc }]
      : [],
  ),
)
assert(slotWrites.length === 0, 'lifecycle slot gained a setslot write')

const referenceLedger = [...methods.entries()].flatMap(([methodId, instructions]) =>
  instructions.flatMap((instruction) =>
    instruction.params.some((value) => qnameKey(value) === LIFECYCLE_QNAME)
      ? [`${methodId}:${instruction.index}:${instruction.pc}:${instruction.name}`]
      : [],
  ),
)
const referenceLedgerSha256 = sha256(`${referenceLedger.join('\n')}\n`)

const controllerFieldQName = qnameKey(methods.get(6520)?.[32]?.params[0])
assert(controllerFieldQName, 'controller field QName anchor is absent')
function hasControllerReceiver(instructions: LocatedInstruction[], writeIndex: number): boolean {
  return instructions
    .slice(Math.max(0, writeIndex - 8), writeIndex)
    .some(
      (instruction) =>
        ['findproperty', 'getproperty'].includes(instruction.name) &&
        qnameKey(instruction.params[0]) === controllerFieldQName,
    )
}

const lifecycleWrites: LifecycleWrite[] = []
for (const [methodId, instructions] of methods) {
  for (const instruction of instructions) {
    if (
      !['initproperty', 'setproperty'].includes(instruction.name) ||
      qnameKey(instruction.params[0]) !== LIFECYCLE_QNAME
    )
      continue
    const ownerClass = owners.get(methodId)?.classIndex
    let receiver: LifecycleWrite['receiver'] | null = null
    if (ownerClass === CONTROLLER_CLASS_INDEX) receiver = 'controller-scope'
    else if (hasControllerReceiver(instructions, instruction.index)) receiver = 'controller-field'
    else if (ownerClass === UI_CLASS_INDEX) receiver = 'ui-class'
    assert(receiver, `unclassified lifecycle write at method ${methodId} PC ${instruction.pc}`)
    let value: number | null = null
    for (let index = instruction.index - 1; index >= Math.max(0, instruction.index - 3); index--) {
      value = numericLiteral(instructions[index])
      if (value !== null) break
    }
    lifecycleWrites.push({ methodId, instruction: instruction.index, pc: instruction.pc, value, receiver })
  }
}
const writeLedgerSha256 = sha256(
  `${lifecycleWrites.map((write) => `${write.methodId}:${write.instruction}:${write.pc}:${write.value ?? 'dynamic'}:${write.receiver}`).join('\n')}\n`,
)
const controllerWrites = lifecycleWrites.filter(({ receiver }) => receiver !== 'ui-class')
const requestedDirectWrites = controllerWrites.filter(({ value }) => value !== null && REQUESTED_VALUES.has(value))
assert(
  JSON.stringify(requestedDirectWrites) ===
    JSON.stringify([
      { methodId: 3209, instruction: 72, pc: 218, value: 262144, receiver: 'controller-scope' },
      { methodId: 3500, instruction: 8, pc: 19, value: 2, receiver: 'controller-scope' },
      { methodId: 3510, instruction: 8, pc: 15, value: 4, receiver: 'controller-scope' },
    ]),
  'requested direct producer ledger changed',
)
const dynamicControllerWriteLedger = controllerWrites.flatMap(({ methodId, instruction, pc, value }) =>
  value === null ? [{ methodId, instruction, pc }] : [],
)
assert(
  JSON.stringify(dynamicControllerWriteLedger) ===
    JSON.stringify([
      { methodId: 3438, instruction: 26, pc: 54 },
      { methodId: 10426, instruction: 251, pc: 541 },
    ]),
  'dynamic controller write ledger changed',
)

function at(methodId: number, index: number, opcode: string, value?: number | string): LocatedInstruction {
  const instruction = methods.get(methodId)?.[index]
  assert(instruction?.name === opcode, `method ${methodId} instruction ${index} is not ${opcode}`)
  if (value !== undefined) {
    const actual =
      typeof value === 'string' && opcode !== 'pushstring' ? qnameKey(instruction.params[0]) : instruction.params[0]
    assert(actual === value, `method ${methodId} instruction ${index} does not contain ${value}`)
  }
  return instruction
}

at(3500, 3, 'pushint', 20000)
at(3500, 6, 'pushbyte', 2)
at(3510, 6, 'pushbyte', 4)
at(3209, 70, 'pushint', 262144)
at(3505, 4, 'pushstring', 'spectate')
at(3505, 9, 'pushint', 524288)
at(3218, 722, 'pushint', 524288)
at(3218, 725, 'callpropvoid', methodQName(abc, 3209))
at(3218, 780, 'pushstring', 'TransferTimeOut')
at(3218, 789, 'pushstring', 'Error_FAILED_TRANSFER')
at(5249, 12, 'findproperty', controllerFieldQName)
at(5249, 13, 'getproperty', controllerFieldQName)
at(5249, 14, 'callpropvoid', methodQName(abc, 3506))
at(3506, 3, 'pushint', 16384)
at(3218, 702, 'pushint', 16384)
at(3218, 705, 'callpropvoid', methodQName(abc, 3210))
at(3210, 16, 'callpropvoid', methodQName(abc, 3510))
at(5361, 19, 'findproperty', controllerFieldQName)
at(5361, 20, 'getproperty', controllerFieldQName)
at(5361, 22, 'callpropvoid', methodQName(abc, 3510))
for (const [index, value] of [
  [57, 1024],
  [59, 2048],
  [62, 8192],
] as const)
  at(3509, index, 'pushint', value)
at(3509, 71, 'pushint', 2048)

const historyQName = qnameKey(at(3509, 13, 'findproperty').params[0])
assert(historyQName, 'transition-history QName is absent')
const historyWrites = [...methods.entries()].flatMap(([methodId, instructions]) =>
  instructions.flatMap((instruction) =>
    ['initproperty', 'setproperty'].includes(instruction.name) && qnameKey(instruction.params[0]) === historyQName
      ? [{ methodId, instruction: instruction.index, pc: instruction.pc, instructions }]
      : [],
  ),
)
assert(
  JSON.stringify(historyWrites.map(({ methodId, instruction, pc }) => ({ methodId, instruction, pc }))) ===
    JSON.stringify([
      { methodId: 3438, instruction: 29, pc: 63 },
      { methodId: 3509, instruction: 16, pc: 33 },
      { methodId: 9934, instruction: 109, pc: 197 },
    ]),
  `transition-history write ledger changed: ${JSON.stringify(historyWrites.map(({ methodId, instruction, pc }) => ({ methodId, instruction, pc })))}`,
)
assert(numericLiteral(historyWrites[0].instructions[28]) === 0, 'method 3438 no longer resets transition history')
assert(numericLiteral(historyWrites[2].instructions[108]) === 0, 'method 9934 no longer resets transition history')
assert(qnameKey(historyWrites[1].instructions[15].params[0]) === LIFECYCLE_QNAME, 'transition history source changed')

const returnStateQName = qnameKey(at(10426, 241, 'findproperty').params[0])
assert(returnStateQName, 'UI return-state QName is absent')
const returnStateWrites = [...methods.entries()].flatMap(([methodId, instructions]) =>
  instructions.flatMap((instruction) =>
    ['initproperty', 'setproperty'].includes(instruction.name) && qnameKey(instruction.params[0]) === returnStateQName
      ? [{ methodId, instruction: instruction.index, pc: instruction.pc, instructions }]
      : [],
  ),
)
const returnStateValues = returnStateWrites.map(({ methodId, instruction, pc, instructions }) => ({
  methodId,
  instruction,
  pc,
  value: numericLiteral(instructions[instruction - 2]) ?? numericLiteral(instructions[instruction - 1]),
}))
assert(
  JSON.stringify(returnStateValues) ===
    JSON.stringify([
      { methodId: 10426, instruction: 254, pc: 549, value: 0 },
      { methodId: 10440, instruction: 46, pc: 117, value: 1024 },
      { methodId: 10441, instruction: 18, pc: 30, value: 2048 },
      { methodId: 10444, instruction: 92, pc: 241, value: 0 },
    ]),
  `UI return-state write ledger changed: ${JSON.stringify(returnStateValues)}`,
)

if (EXPECTED_REFERENCE_LEDGER_SHA256)
  assert(referenceLedgerSha256 === EXPECTED_REFERENCE_LEDGER_SHA256, 'lifecycle reference ledger changed')
if (EXPECTED_WRITE_LEDGER_SHA256)
  assert(writeLedgerSha256 === EXPECTED_WRITE_LEDGER_SHA256, 'lifecycle write ledger changed')

process.stdout.write(
  `${JSON.stringify(
    {
      status: 'proven-for-pinned-abc-static-universe',
      identity: {
        build: EXPECTED_BUILD,
        abcSha256: EXPECTED_ABC_SHA256,
        decodedMethodBodies: methods.size,
        validBranchTargets: true,
      },
      lifecycleField: {
        controllerClass: CONTROLLER_CLASS_INDEX,
        uiQNameCollisionClass: UI_CLASS_INDEX,
        qname: LIFECYCLE_QNAME,
        type: 'uint',
        default: 0,
        slotId: lifecycleSlotId,
        setslotWrites: slotWrites.length,
      },
      referenceClosure: {
        definitions: lifecycleDefinitions.map(({ classIndex }) => classIndex),
        instructions: referenceLedger.length,
        methods: new Set(referenceLedger.map((entry) => entry.split(':')[0])).size,
        sha256: referenceLedgerSha256,
      },
      writeClosure: {
        instructions: lifecycleWrites.length,
        controllerWrites: controllerWrites.length,
        uiWrites: lifecycleWrites.length - controllerWrites.length,
        sha256: writeLedgerSha256,
      },
      requestedDirectWrites,
      producerlessInStaticControllerUniverse: [8192, 4194304],
      dynamicControllerWrites: ['HS restore', 'V6d restore'],
      transitionHistorySources: ['current b4a', 0],
      uiReturnStateValues: returnStateValues.map(({ value }) => value),
      limitations: [
        'computed-name writes',
        'native or host mutation',
        'separately loaded code',
        'executed reachability',
      ],
    },
    null,
    2,
  )}\n`,
)
