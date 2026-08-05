import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
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
assert(abcPath, 'usage: bun bot_replay_regeneration_provenance.ts --abc <main.abc> [--explore]')
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
      ...(instance.trait ?? []).map((trait: any) => ({ trait, classIndex, static: false })),
      ...(abc.class[classIndex].traits ?? []).map((trait: any) => ({ trait, classIndex, static: true })),
    ].filter(({ trait }) => trait.data?.method === methodId),
  )
  assert(matches.length === 1, `expected one trait for method ${methodId}`)
  const key = qnameKey(abc.constant_pool.multiname[matches[0].trait.name - 1])
  assert(key, `method ${methodId} does not have an exact QName`)
  return key
}

function exactReferencesForQName(key: string) {
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

function displayParam(value: unknown): unknown {
  const name = multinameName(value, strings)
  return name || value
}

function methodInfo(methodId: number) {
  const method = abc.method[methodId]
  return {
    methodId,
    owner: owners.get(methodId) ?? null,
    parameterTypes: method.param_type.map((index: number) =>
      multinameName(abc.constant_pool.multiname[index - 1], strings),
    ),
    returnType: multinameName(abc.constant_pool.multiname[method.return_type - 1], strings),
  }
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

function requireLocal(methodId: number, pc: number, opcode: 'getlocal' | 'setlocal', local: number): void {
  assert(requireAt(methodId, pc, opcode).params[0] === local, `method ${methodId} PC ${pc} does not use local ${local}`)
}

function branchTargetPc(methodId: number, pc: number): number {
  const instruction = methods.get(methodId)?.find((candidate) => candidate.pc === pc)
  assert(instruction && BRANCHES.has(instruction.name), `method ${methodId} PC ${pc} is not a branch`)
  const offset = instruction.params[0]
  assert(typeof offset === 'number', `method ${methodId} PC ${pc} branch offset is not numeric`)
  return instruction.endPc + offset
}

const botControllerClassIndex = abc.instance.findIndex(
  (instance: any) => multinameName(abc.constant_pool.multiname[instance.name - 1], strings) === '_-d1H',
)
assert(botControllerClassIndex >= 0, 'bot controller class _-d1H was not found')
const botControllerMethodIds: number[] = (abc.instance[botControllerClassIndex].trait ?? [])
  .filter((trait: any) => trait.data?.method !== undefined)
  .map((trait: any) => trait.data.method as number)
const botInputAdapterClassIndex = abc.instance.findIndex(
  (instance: any) => multinameName(abc.constant_pool.multiname[instance.name - 1], strings) === '_-E6o',
)
assert(botInputAdapterClassIndex >= 0, 'bot input adapter class _-E6o was not found')
const botInputAdapterMethodIds: number[] = (abc.instance[botInputAdapterClassIndex].trait ?? [])
  .filter((trait: any) => trait.data?.method !== undefined)
  .map((trait: any) => trait.data.method as number)
const targetMethods = [
  718, 730, 1566, 1584, 2790, 2898, 3071, 3074, 3205, 3217, 3228, 3282, 3371, 3507, 3514, 3529, 3565, 3623, 4737, 4894,
  4896, 4898, 4906, 5408, 5427, 6124, 6125, 6129, 6133, 6135, 6510, 6521, 11416, 11421, 12800,
]
const methodReferences = Object.fromEntries(
  [730, 3071, 3371, 3507, 5408, 5427, 6129, 6133, 6135, 6521, 11416, 11421].map((methodId) => [
    methodId,
    exactReferencesForQName(methodQName(methodId)),
  ]),
)
const controllerMethodByQName = new Map<string, number>(
  botControllerMethodIds.map((methodId: number) => [methodQName(methodId), methodId]),
)
const adapterMethodByQName = new Map<string, number>(
  botInputAdapterMethodIds.map((methodId: number) => [methodQName(methodId), methodId]),
)
const reachableControllerMethods = new Set<number>([730])
const reachableAdapterMethods = new Set<number>()
const pendingControllerMethods = [730]
while (pendingControllerMethods.length > 0) {
  const methodId = pendingControllerMethods.pop() as number
  for (const instruction of methods.get(methodId) ?? []) {
    if (!instruction.name.startsWith('call')) continue
    const key = qnameKey(instruction.params[0])
    if (!key) continue
    const controllerTarget = controllerMethodByQName.get(key)
    if (controllerTarget !== undefined && !reachableControllerMethods.has(controllerTarget)) {
      reachableControllerMethods.add(controllerTarget)
      pendingControllerMethods.push(controllerTarget)
    }
    const adapterTarget = adapterMethodByQName.get(key)
    if (adapterTarget !== undefined) reachableAdapterMethods.add(adapterTarget)
  }
}
const botDecisionCallGraph = {
  reachableControllerMethods: [...reachableControllerMethods].sort((a, b) => a - b).map(methodInfo),
  reachableAdapterMethods: [...reachableAdapterMethods].sort((a, b) => a - b).map(methodInfo),
}
const replayState1References = {
  entityIds: exactReferencesForQName(exactQNameAt(3507, 461)),
  timelineArrays: exactReferencesForQName(exactQNameAt(3507, 474)),
}
const commandMaskReferences = exactReferencesForQName(exactQNameAt(6521, 689))
const fighterClassReferences = exactReferencesForQName(exactQNameAt(3071, 16))
const botControllerClassReferences = exactReferencesForQName(exactQNameAt(2790, 4564))
const botControllerFieldReferences = exactReferencesForQName(exactQNameAt(2790, 4538))
const botConversionHandlerQName = qnameKey(abc.constant_pool.multiname[abc.instance[602].name - 1])
assert(botConversionHandlerQName, 'bot conversion handler class does not use an exact QName')
const botConversionHandlerClassReferences = exactReferencesForQName(botConversionHandlerQName)
const botAdapterMaskReferences = {
  heldMask: exactReferencesForQName(exactQNameAt(6129, 783)),
  pulseMask: exactReferencesForQName(exactQNameAt(6129, 794)),
}
const fighterFlagReferences = Object.fromEntries(
  [
    ['replayBase', 3507, 362],
    ['timeline', 3507, 369],
    ['timelineAlternate', 2790, 4459],
    ['timelineThird', 2790, 4467],
    ['bot', 2790, 4526],
    ['timelineDisable', 6129, 602],
  ].map(([name, methodId, pc]) => [name, exactReferencesForQName(exactQNameAt(methodId as number, pc as number))]),
)
const timelineBotInputAdapterReferences = exactReferencesForQName(exactQNameAt(718, 607))
const timestampQNameKeys = [
  ...new Set(
    [...methods.values()].flatMap((instructions) =>
      instructions
        .filter((instruction) => multinameName(instruction.params[0], strings) === '_-D6c')
        .map((instruction) => qnameKey(instruction.params[0]))
        .filter((key): key is string => key !== null),
    ),
  ),
]
const timestampReferences = Object.fromEntries(timestampQNameKeys.map((key) => [key, exactReferencesForQName(key)]))
const factoryReferences = methodReferences[3071] as Array<{ methodId: number }>
const botFlagReferenceMethods = new Set(
  (fighterFlagReferences.bot as Array<{ methodId: number }>).map((entry) => entry.methodId),
)
const botFactoryCallerIds = factoryReferences
  .map((entry) => entry.methodId)
  .filter((methodId) => botFlagReferenceMethods.has(methodId))
  .sort((a, b) => a - b)
const expectedBotFactoryCallerIds = [3205, 3228, 3282, 3514, 3529, 3565, 3623, 12800]
assert(
  JSON.stringify(botFactoryCallerIds) === JSON.stringify(expectedBotFactoryCallerIds),
  `bot-producing fighter-factory callers changed: ${botFactoryCallerIds.join(', ')}`,
)

const fighterConstructReferences = fighterClassReferences.flatMap((entry) =>
  entry.references
    .filter((reference) => reference.opcode === 'constructprop')
    .map((reference) => ({ methodId: entry.methodId, pc: reference.pc })),
)
assert(
  JSON.stringify(fighterConstructReferences) === JSON.stringify([{ methodId: 3071, pc: 16 }]),
  'fighter construction no longer closes through factory method 3071',
)
const botControllerConstructReferences = botControllerClassReferences.flatMap((entry) =>
  entry.references
    .filter((reference) => reference.opcode === 'constructprop')
    .map((reference) => ({ methodId: entry.methodId, pc: reference.pc })),
)
assert(
  JSON.stringify(botControllerConstructReferences) ===
    JSON.stringify([
      { methodId: 2790, pc: 4564 },
      { methodId: 11421, pc: 137 },
    ]),
  `bot-controller construction sites changed: ${JSON.stringify(botControllerConstructReferences)}`,
)

for (const [pc, opcode, value, name] of [
  [942, 'pushbyte', 1, '_-6c'],
  [959, 'pushbyte', 4, '_-t1T'],
  [968, 'pushbyte', 8, '_-76C'],
  [986, 'pushbyte', 32, '_-F43'],
  [1011, 'pushint', 256, '_-N3K'],
  [1122, 'pushint', 2097152, '_-64t'],
] as const) {
  assert(requireAt(3074, pc, opcode).params[0] === value, `fighter flag ${name} value changed`)
  requireAt(3074, pc + (pc === 1011 ? 3 : 2), 'initproperty', name)
}

requireLocal(2790, 4447, 'getlocal', 4)
requireAt(2790, 4452, 'getproperty', '_-76C')
requireAt(2790, 4459, 'getproperty', '_-t1T')
requireAt(2790, 4467, 'getproperty', '_-N3K')
requireAt(2790, 4471, 'bitand')
requireAt(2790, 4476, 'iffalse')
requireAt(2790, 4484, 'findpropstrict', '_-Tx')
requireAt(2790, 4494, 'constructprop', '_-Tx')
requireAt(2790, 4498, 'initproperty', '_-xZ')
requireLocal(2790, 4521, 'getlocal', 4)
requireAt(2790, 4526, 'getproperty', '_-F43')
requireAt(2790, 4529, 'bitand')
requireAt(2790, 4534, 'iffalse')
requireAt(2790, 4541, 'findpropstrict', '_-d1H')
requireAt(2790, 4556, 'getproperty', '_-xZ')
requireAt(2790, 4564, 'constructprop', '_-d1H')
requireAt(2790, 4569, 'initproperty', '_-13k')
assert(exactQNameAt(2790, 4498) === exactQNameAt(6521, 510), 'writer does not read the fighter timeline field')
assert(exactQNameAt(2790, 4556) === exactQNameAt(6521, 510), 'bot controller and writer use different timelines')

for (const [methodId, flags] of [
  [
    3205,
    [
      [595, '_-76C'],
      [644, '_-F43'],
      [1151, '_-F43'],
      [1158, '_-76C'],
    ],
  ],
  [
    3228,
    [
      [315, '_-6c'],
      [322, '_-76C'],
      [495, '_-F43'],
    ],
  ],
  [
    3282,
    [
      [954, '_-6c'],
      [983, '_-F43'],
      [989, '_-t1T'],
    ],
  ],
  [
    3514,
    [
      [980, '_-F43'],
      [986, '_-76C'],
    ],
  ],
  [
    3529,
    [
      [283, '_-6c'],
      [290, '_-76C'],
      [324, '_-F43'],
    ],
  ],
  [
    3565,
    [
      [389, '_-F43'],
      [396, '_-76C'],
    ],
  ],
  [
    3623,
    [
      [56, '_-76C'],
      [63, '_-F43'],
    ],
  ],
  [
    12800,
    [
      [530, '_-F43'],
      [536, '_-6c'],
      [544, '_-76C'],
    ],
  ],
] as Array<[number, Array<[number, string]>]>) {
  for (const [pc, name] of flags) requireAt(methodId, pc, 'getproperty', name)
}
for (const [methodId, callPcs] of [
  [3205, [689, 1165]],
  [3228, [720, 1189]],
  [3282, [1446]],
  [3514, [1025, 1226]],
  [3529, [879]],
  [3565, [411]],
  [3623, [526]],
  [12800, [657]],
] as Array<[number, number[]]>) {
  for (const pc of callPcs)
    assert(
      exactQNameAt(methodId, pc) === methodQName(3071),
      `method ${methodId} PC ${pc} does not call fighter factory 3071`,
    )
}
requireLocal(3205, 600, 'setlocal', 18)
requireLocal(3205, 602, 'getlocal', 18)
requireAt(3205, 647, 'bitor')
requireAt(3205, 648, 'bitor')
requireLocal(3205, 650, 'setlocal', 18)
requireLocal(3205, 685, 'getlocal', 18)
requireAt(3205, 1154, 'bitor')
requireAt(3205, 1162, 'bitor')
requireLocal(3228, 328, 'setlocal', 16)
requireLocal(3228, 464, 'getlocal', 16)
requireAt(3228, 498, 'bitor')
requireLocal(3228, 500, 'setlocal', 16)
requireLocal(3228, 716, 'getlocal', 16)
requireLocal(3228, 1185, 'getlocal', 16)
requireLocal(3282, 959, 'setlocal', 23)
requireLocal(3282, 978, 'getlocal', 23)
requireAt(3282, 993, 'bitor')
requireAt(3282, 994, 'bitor')
requireLocal(3282, 996, 'setlocal', 23)
requireLocal(3282, 1438, 'getlocal', 23)
requireAt(3514, 990, 'bitor')
requireAt(3514, 991, 'bitor')
requireLocal(3514, 993, 'setlocal', 17)
requireLocal(3514, 1021, 'getlocal', 17)
requireLocal(3514, 1222, 'getlocal', 17)
requireLocal(3529, 296, 'setlocal', 12)
requireLocal(3529, 319, 'getlocal', 12)
requireAt(3529, 327, 'bitor')
requireLocal(3529, 329, 'setlocal', 12)
requireLocal(3529, 875, 'getlocal', 12)
requireAt(3565, 392, 'bitor')
requireAt(3565, 400, 'bitor')
requireAt(3565, 408, 'bitor')
requireAt(3623, 75, 'setlocal_2')
requireAt(3623, 66, 'bitor')
requireAt(3623, 73, 'bitor')
requireAt(3623, 523, 'getlocal_2')
requireAt(12800, 540, 'bitor')
requireAt(12800, 548, 'bitor')
requireLocal(12800, 569, 'setlocal', 13)
requireLocal(12800, 653, 'getlocal', 13)

const referenceSites = (methodId: number) =>
  (
    methodReferences[methodId] as Array<{ methodId: number; references: Array<{ pc: number; opcode: string }> }>
  ).flatMap((entry) => entry.references.map((reference) => ({ methodId: entry.methodId, ...reference })))
assert(
  JSON.stringify(referenceSites(11421)) ===
    JSON.stringify([
      { methodId: 11416, pc: 5, opcode: 'findproperty' },
      { methodId: 11416, pc: 8, opcode: 'getproperty' },
    ]),
  'bot conversion method gained a non-wrapper reference',
)
assert(
  JSON.stringify(referenceSites(11416)) === JSON.stringify([{ methodId: 5408, pc: 314, opcode: 'callpropvoid' }]),
  'bot conversion wrapper gained a non-LinkUpdater callsite',
)
assert(
  JSON.stringify(referenceSites(5408)) ===
    JSON.stringify([
      { methodId: 5427, pc: 1245, opcode: 'findproperty' },
      { methodId: 5427, pc: 1248, opcode: 'getproperty' },
    ]),
  'bot conversion LinkUpdater handler gained another reference',
)
assert(
  owners.get(5408)?.className === 'LinkUpdater' && owners.get(5427)?.className === 'LinkUpdater',
  'bot conversion is no longer LinkUpdater-only',
)

requireAt(11421, 13, 'callproperty', 'get')
requireAt(11421, 17, 'coerce', '_-V4R')
requireAt(11421, 64, 'getproperty', '_-76C')
requireAt(11421, 71, 'getproperty', '_-F43')
requireAt(11421, 76, 'initproperty', '_-56G')
requireAt(11421, 116, 'findpropstrict', '_-d1H')
requireAt(11421, 130, 'getproperty', '_-xZ')
requireAt(11421, 137, 'constructprop', '_-d1H')
requireAt(11421, 142, 'initproperty', '_-13k')
assert(exactQNameAt(11421, 130) === exactQNameAt(6521, 510), 'bot conversion and writer use different timelines')

requireAt(718, 571, 'findpropstrict', '_-E6o')
requireAt(718, 575, 'getlocal_1')
requireAt(718, 598, 'getlocal_3')
requireAt(718, 607, 'initproperty', '_-aE')
requireAt(3217, 671, 'getproperty', '_-F43')
requireAt(3217, 674, 'bitand')
requireAt(3217, 679, 'iffalse')
requireAt(3217, 687, 'callpropvoid', '_-D2l')
requireAt(3217, 693, 'getproperty', '_-xZ')
requireAt(3217, 699, 'callpropvoid', '_-91w')
assert(exactQNameAt(3217, 699) === methodQName(6129), 'authoritative tick no longer calls bot timeline capture')
requireAt(2898, 15, 'getproperty', '_-13k')
requireAt(2898, 19, 'coerce', '_-d1H')
requireAt(2898, 37, 'callpropvoid', 'Think')
assert(exactQNameAt(2898, 37) === methodQName(730), 'fighter bot entry no longer calls the exact Think method')
assert(
  JSON.stringify([...reachableAdapterMethods].sort((a, b) => a - b)) === JSON.stringify([4894, 4896, 4898, 4906]),
  'Think-to-input-adapter call closure changed',
)
for (const methodId of [4894, 4898]) {
  for (const pc of [26, 43]) requireAt(methodId, pc, 'getproperty', '_-U1F')
  for (const pc of [34, 50]) requireAt(methodId, pc, 'initproperty', '_-U1F')
}
requireAt(4896, 44, 'getproperty', '_-U1F')
requireAt(4896, 49, 'initproperty', '_-U1F')
requireAt(4896, 87, 'getproperty', '_-c5l')
requireAt(4896, 92, 'initproperty', '_-c5l')
requireAt(4906, 9, 'getproperty', '_-U1F')
requireAt(4906, 13, 'initproperty', '_-U1F')
requireAt(4906, 16, 'findproperty', '_-c5l')
requireAt(4906, 21, 'initproperty', '_-c5l')
requireAt(6129, 775, 'findproperty', '_-aE')
requireAt(6129, 783, 'getproperty', '_-U1F')
requireAt(6129, 790, 'getproperty', '_-aE')
requireAt(6129, 794, 'getproperty', '_-c5l')
requireAt(6129, 797, 'bitor')
requireAt(6129, 798, 'bitor')
requireAt(6129, 812, 'initproperty', '_-c5l')
requireAt(6129, 1143, 'getproperty', '_-j3W')
requireAt(6129, 1147, 'equals')
requireAt(6129, 1153, 'findpropstrict', '_-O3Y')
requireAt(6129, 1159, 'constructprop', '_-O3Y')
requireAt(6129, 1239, 'getproperty', '_-W5y')
requireAt(6129, 1245, 'callpropvoid', 'push')
requireAt(6129, 1257, 'getproperty', '_-P4G')
requireAt(6129, 1262, 'callpropvoid', 'push')
requireAt(6129, 1272, 'callpropvoid', '_-R4p')
assert(exactQNameAt(6129, 1239) === exactQNameAt(6521, 540), 'bot capture and writer use different timeline arrays')

requireAt(6521, 459, 'getproperty', '_-Z2h')
requireAt(6521, 462, 'getproperty', '_-Y1k')
const writerEligibilityBranches = (methods.get(6521) ?? [])
  .filter((instruction) => instruction.pc >= 477 && instruction.pc < 552 && BRANCHES.has(instruction.name))
  .map((instruction) => ({
    pc: instruction.pc,
    opcode: instruction.name,
    targetPc: branchTargetPc(6521, instruction.pc),
  }))
assert(
  JSON.stringify(writerEligibilityBranches) === JSON.stringify([{ pc: 525, opcode: 'ifeq', targetPc: 763 }]),
  `state-1 writer eligibility branches changed: ${JSON.stringify(writerEligibilityBranches)}`,
)
requireAt(6521, 510, 'getproperty', '_-xZ')
requireAt(6521, 525, 'ifeq')
requireAt(6521, 540, 'getproperty', '_-W5y')
requireAt(6521, 564, 'callpropvoid', '_-PY')
requireAt(6521, 581, 'callpropvoid', '_-PY')
requireAt(6521, 595, 'callpropvoid', '_-S2c')
requireAt(6521, 646, 'getproperty', '_-D6c')
requireAt(6521, 683, 'callpropvoid', '_-S2c')
requireAt(6521, 689, 'getproperty', '_-T4y')
requireAt(6521, 711, 'callpropvoid', '_-PY')
requireAt(6521, 731, 'callpropvoid', '_-PY')
requireAt(6521, 751, 'callpropvoid', '_-PY')
requireAt(6521, 783, 'callpropvoid', '_-PY')
assert(
  !(fighterFlagReferences.bot as Array<{ methodId: number }>).some((entry) => entry.methodId === 6521),
  'state-1 writer gained a bot-specific branch',
)

requireAt(6510, 298, 'callproperty', '_-14J')
requireAt(6510, 310, 'lookupswitch')
requireAt(6510, 379, 'callproperty', '_-14J')
requireAt(6510, 389, 'callproperty', '_-8v')
requireAt(6510, 425, 'findproperty', '_-V5z')
requireAt(6510, 471, 'findproperty', '_-X1d')
requireAt(6510, 541, 'callproperty', '_-8v')
requireAt(6510, 552, 'callproperty', '_-14J')
requireAt(6510, 570, 'callproperty', '_-14J')
assert(exactQNameAt(6510, 425) === exactQNameAt(3507, 474), 'reader and loader use different timeline maps')
assert(exactQNameAt(6510, 471) === exactQNameAt(3507, 461), 'reader and loader use different entity maps')
requireAt(3507, 624, 'findpropstrict', '_-O3Y')
requireAt(3507, 645, 'constructprop', '_-O3Y')
requireAt(3507, 649, 'callpropvoid', '_-PB')
assert(exactQNameAt(3507, 649) === methodQName(6133), 'replay loader no longer uses exact timeline insertion')
requireAt(6133, 9, 'getproperty', '_-W5y')
requireAt(6133, 60, 'callpropvoid', 'push')
requireAt(6133, 121, 'callpropvoid', 'insert')
requireAt(6125, 352, 'callproperty', '_-72L')
requireAt(6125, 1619, 'callproperty', '_-72L')
requireAt(6125, 1659, 'callproperty', '_-72L')
assert(exactQNameAt(6125, 352) === methodQName(6135), 'gameplay input no longer samples the restored timeline')

requireAt(3507, 362, 'getproperty', '_-6c')
requireAt(3507, 369, 'getproperty', '_-76C')
requireAt(3507, 373, 'bitor')
requireLocal(3507, 374, 'getlocal', 7)
requireAt(3507, 376, 'callproperty', '_-HT')
const replayFlags: number = 1 | 8
const botFlag: number = 32
assert((replayFlags & botFlag) === 0, 'replay flags unexpectedly include the bot flag')

const relevantMethodLedger = [
  718, 730, 2790, 2898, 3071, 3074, 3205, 3217, 3228, 3282, 3371, 3507, 3514, 3529, 3565, 3623, 4737, 4894, 4896, 4898,
  4906, 5408, 5427, 6124, 6125, 6129, 6133, 6135, 6510, 6521, 11416, 11421, 12800,
].map((methodId) => ({
  methodId,
  owner: owners.get(methodId) ?? null,
  instructions: methods.get(methodId)?.map((instruction) => ({
    pc: instruction.pc,
    opcode: instruction.name,
    params: instruction.params.map(displayParam),
  })),
}))
const ledgers = {
  methodReferences: sha256(JSON.stringify(methodReferences)),
  botDecisionCallGraph: sha256(JSON.stringify(botDecisionCallGraph)),
  replayState1References: sha256(JSON.stringify(replayState1References)),
  commandMaskReferences: sha256(JSON.stringify(commandMaskReferences)),
  fighterClassReferences: sha256(JSON.stringify(fighterClassReferences)),
  botControllerClassReferences: sha256(JSON.stringify(botControllerClassReferences)),
  botControllerFieldReferences: sha256(JSON.stringify(botControllerFieldReferences)),
  botConversionHandlerClassReferences: sha256(JSON.stringify(botConversionHandlerClassReferences)),
  botAdapterMaskReferences: sha256(JSON.stringify(botAdapterMaskReferences)),
  fighterFlagReferences: sha256(JSON.stringify(fighterFlagReferences)),
  timelineBotInputAdapterReferences: sha256(JSON.stringify(timelineBotInputAdapterReferences)),
  timestampReferences: sha256(JSON.stringify(timestampReferences)),
  relevantMethods: sha256(JSON.stringify(relevantMethodLedger)),
}

const expectedLedgers: Record<keyof typeof ledgers, string> = {
  methodReferences: 'd53bbd66cfba5147655047a845a94127b2d66dca7b86aadb60946f387eabb861',
  botDecisionCallGraph: '0a6adb1332bfc438f1f08263ad56e1b85352e27322644b447e1fb0a08746d5f4',
  replayState1References: '2b5138b1294967d9b9a6a5d6220cb33656ecdaa0c327f4c27254aa9b30bf9f7a',
  commandMaskReferences: '4289fb7f7ddfa5b40b7bdb1cd4fbe59ccbc5f366e7f8260e0c0ba094786345de',
  fighterClassReferences: '19611cf47ba0dad0549a2b2e4ff5efe56aff57d2b7b33528e7d4a7ab81bd0454',
  botControllerClassReferences: '37b378d9d493302671d24821980bda521099a0117fb712acfd2613739f8615f8',
  botControllerFieldReferences: '78f0d55c4594d6d61ac259965bb101777a98fcce25b4ba0050519d8385f82817',
  botConversionHandlerClassReferences: 'be986776ca726b35415d22579ffdaf4797839dd80fbb2fe6759da714806bf946',
  botAdapterMaskReferences: 'deb2cecbdc3a01458e9353767b6b6aed4466de5c3de3192a6db2f3b24b5ae42f',
  fighterFlagReferences: '15eff107e8d544d7e8893fff0b8f9b67298370c1d583382520063b18120ee8c4',
  timelineBotInputAdapterReferences: '9f7dd6dc4857cc41b2d19793d1d2eb19a596a0725d2fc61da8c0f71f3bcadc8d',
  timestampReferences: '5e9f52e95adf6f25d11b5fc27b8d9d5ab5813838b82bfe89f78e1adf365effa5',
  relevantMethods: '935ee18ff885266018a4b1fed539a2fca9a5d987a70a5d2256517f213392f2aa',
}
for (const key of Object.keys(expectedLedgers) as Array<keyof typeof ledgers>) {
  assert(ledgers[key] === expectedLedgers[key], `${key} ledger changed: ${ledgers[key]}`)
}

const output: Record<string, unknown> = {
  status: 'proven-static',
  identity: {
    build: EXPECTED_BUILD,
    abcSha256,
    decodedMethodBodies: abc.method_body.length,
    branchTargetsValid: true,
  },
  verdict: {
    recording: 'bot decisions are sampled into the same per-fighter state-1 timeline serialized for other fighters',
    playback: 'serialized state-1 snapshots are restored and sampled by gameplay',
    liveBotRegeneration: false,
    reason:
      'replay startup uses flags 1|8 and excludes bot flag 32; the only later conversion path is LinkUpdater ingress, not replay loader or match-tick control flow',
  },
  botEntityCoverage: {
    fighterClass: { classIndex: 147, className: '_-V4R', constructorMethodId: 2790 },
    botFlag: { traitName: '_-F43', value: botFlag },
    timelineFlags: [
      { traitName: '_-t1T', value: 4 },
      { traitName: '_-76C', value: 8 },
      { traitName: '_-N3K', value: 256 },
    ],
    fighterFactoryCallerCount: factoryReferences.length,
    botProducingFactoryCallerIds: botFactoryCallerIds,
    controllerConstructionSites: botControllerConstructReferences,
    factoryBotPathsHaveTimeline: true,
    conversionPathReusesExistingTimeline: true,
    conversionReachability: 'LinkUpdater 5427 -> handler 5408 -> wrapper 11416 -> conversion 11421',
    state1PresenceRule: 'writer emits a record exactly when the fighter timeline is non-null; there is no bot branch',
  },
  recording: {
    authoritativeTickMethodId: 3217,
    botDecisionMethodId: 730,
    botTimelineCaptureMethodId: 6129,
    state1WriterMethodId: 6521,
    inputAdapterMethodIds: [...reachableAdapterMethods].sort((a, b) => a - b),
    state1WireShape:
      '(presence 1, entityId:5, snapshotCount:uint32, (timestamp:uint32, maskPresent:1, mask?:14)*)*, presence 0',
  },
  playback: {
    state1ReaderMethodId: 6510,
    replayLoaderMethodId: 3507,
    timelineInsertMethodId: 6133,
    timelineSampleMethodId: 6135,
    gameplayInputMethodId: 6125,
    fighterFlags: replayFlags,
  },
  referenceClosure: {
    fighterConstructionSites: fighterConstructReferences.length,
    botControllerConstructionSites: botControllerConstructReferences.length,
    replayInternalConversionCallsites: 0,
    state1CommandMaskReferenceMethods: commandMaskReferences.length,
    exactLedgers: ledgers,
  },
  corpus: {
    used: false,
    reason: 'complete static bot-decision-to-timeline and replay-loader-to-gameplay closure proves the verdict',
  },
}

if (process.argv.includes('--explore')) {
  output.references = {
    methodReferences,
    replayState1References,
    fighterFlagReferences,
    fighterClassReferences,
    botControllerClassReferences,
    botControllerFieldReferences,
    botConversionHandlerClassReferences,
    botAdapterMaskReferences,
    timelineBotInputAdapterReferences,
    timestampReferences,
  }
  output.methods = targetMethods.map((methodId) => ({
    ...methodInfo(methodId),
    instructions: methods.get(methodId)?.map((instruction) => ({
      pc: instruction.pc,
      opcode: instruction.name,
      params: instruction.params.map(displayParam),
    })),
  }))
}

console.log(JSON.stringify(output, null, 2))
