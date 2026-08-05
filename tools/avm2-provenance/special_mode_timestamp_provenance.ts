import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'
import { parse } from '../../packages/replay-format/src/parser.js'

type Instruction = {
  id: number
  name: string
  params: unknown[]
  rawParams: unknown[]
  types: string[]
}

type LocatedInstruction = Instruction & {
  index: number
  pc: number
  endPc: number
}

type CorpusManifest = {
  fixtures: Array<{ file: string; sha256: string }>
}

const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_MANIFEST_SHA256 = 'b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac'
const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_FIXTURE_COUNT = 12
const EXPECTED_LEDGER_SHA256 = '9fd365b71f669004df1c5015de84e1be0f26cb12667af7f5a907d953ae2da4e4'
const BRANCHES = new Set([
  'ifnlt',
  'ifnle',
  'ifngt',
  'ifnge',
  'jump',
  'iftrue',
  'iffalse',
  'ifeq',
  'ifne',
  'iflt',
  'ifle',
  'ifgt',
  'ifge',
  'ifstricteq',
  'ifstrictne',
])

function argument(flag: string): string | null {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? (process.argv[index + 1] ?? null) : null
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
  return typeof name === 'number' ? (strings[name] ?? '') : typeof name === 'string' ? name : ''
}

function qnameKey(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('kind' in value) || !('data' in value)) return null
  const candidate = value as { kind?: unknown; data?: { ns?: unknown; name?: unknown } }
  if (candidate.kind !== 7 || typeof candidate.data?.ns !== 'number' || typeof candidate.data.name !== 'number')
    return null
  return `${candidate.data.ns}:${candidate.data.name}`
}

const abcPath = argument('--abc')
const manifestPath = argument('--manifest')
assert(
  abcPath && manifestPath,
  'usage: bun special_mode_timestamp_provenance.ts --abc <main.abc> --manifest <manifest.json>',
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

function at(methodId: number, index: number, opcode: string, value?: string | number): LocatedInstruction {
  const instruction = methods.get(methodId)?.[index]
  assert(instruction, `method ${methodId} lacks instruction ${index}`)
  assert(instruction.name === opcode, `method ${methodId} instruction ${index} is not ${opcode}`)
  if (value !== undefined) {
    const actual =
      typeof value === 'string'
        ? instruction.name === 'pushstring'
          ? instruction.params[0]
          : multinameName(instruction.params[0], strings)
        : instruction.params[0]
    assert(actual === value, `method ${methodId} instruction ${index} does not contain ${value}`)
  }
  return instruction
}

const writerSpecs = [
  {
    methodId: 6520,
    state: 6,
    predicateStart: 32,
    originBranch: 214,
    zero: 215,
    clock: 220,
    subtract: 222,
    originStore: 225,
    stateCall: 238,
    sourceSubtract: 228,
    timestampWrite: 242,
  },
  {
    methodId: 6521,
    state: 1,
    predicateStart: 46,
    originBranch: 228,
    zero: 229,
    clock: 234,
    subtract: 236,
    originStore: 239,
    stateCall: 246,
    sourceSubtract: 335,
    timestampWrite: 342,
  },
  {
    methodId: 6522,
    state: 5,
    predicateStart: 28,
    originBranch: 210,
    zero: 211,
    clock: 216,
    subtract: 218,
    originStore: 221,
    stateCall: 228,
    sourceSubtract: 289,
    timestampWrite: 291,
  },
  {
    methodId: 6523,
    state: 7,
    predicateStart: 45,
    originBranch: 227,
    zero: 228,
    clock: 233,
    subtract: 235,
    originStore: 238,
    stateCall: 245,
    sourceSubtract: 286,
    timestampWrite: 288,
  },
]

for (const writer of writerSpecs) {
  at(writer.methodId, writer.originBranch, 'iffalse')
  at(writer.methodId, writer.zero, 'pushbyte', 0)
  at(writer.methodId, writer.clock, 'getproperty', '_-q4F')
  at(writer.methodId, writer.clock + 1, 'pushbyte', 16)
  at(writer.methodId, writer.subtract, 'subtract_i')
  at(writer.methodId, writer.originStore, 'setlocal')
  at(writer.methodId, writer.stateCall - 2, 'pushbyte', writer.state)
  at(writer.methodId, writer.stateCall, 'callpropvoid', '_-t28')
  at(writer.methodId, writer.sourceSubtract, 'subtract_i')
  at(writer.methodId, writer.timestampWrite, 'callpropvoid', '_-S2d')
}

for (const [methodId, index, expectedPc] of [
  [6520, 214, 393],
  [6520, 215, 397],
  [6520, 220, 410],
  [6520, 221, 413],
  [6520, 222, 415],
  [6520, 225, 418],
  [6521, 228, 406],
  [6521, 229, 410],
  [6521, 234, 423],
  [6521, 235, 426],
  [6521, 236, 428],
  [6521, 239, 431],
  [6522, 210, 372],
  [6522, 211, 376],
  [6522, 216, 389],
  [6522, 217, 392],
  [6522, 218, 394],
  [6522, 221, 397],
  [6523, 227, 435],
  [6523, 228, 439],
  [6523, 233, 452],
  [6523, 234, 455],
  [6523, 235, 457],
  [6523, 238, 460],
  [6520, 227, 421],
  [6520, 230, 425],
  [6520, 242, 456],
  [6521, 324, 642],
  [6521, 342, 683],
  [6522, 278, 581],
  [6522, 291, 611],
  [6523, 277, 564],
  [6523, 288, 586],
  [3217, 1400, 3215],
] as const) {
  const instruction = methods.get(methodId)?.[index]
  assert(instruction?.pc === expectedPc, `method ${methodId} instruction ${index} PC changed`)
}

function branchTargetIndex(methodId: number, index: number): number {
  const instructions = methods.get(methodId)
  const instruction = instructions?.[index]
  assert(
    instructions && instruction && BRANCHES.has(instruction.name),
    `method ${methodId} index ${index} is not a branch`,
  )
  const offset = instruction.params[0]
  assert(typeof offset === 'number', `method ${methodId} index ${index} has no branch offset`)
  const targetPc = instruction.endPc + offset
  const target = instructions.find((candidate) => candidate.pc === targetPc)
  assert(target, `method ${methodId} index ${index} target is not an instruction`)
  return target.index
}

function canReachWithout(methodId: number, targetIndex: number, excludedIndex: number): boolean {
  const instructions = methods.get(methodId)
  assert(instructions, `method ${methodId} is absent`)
  const pcToIndex = new Map(instructions.map((instruction) => [instruction.pc, instruction.index]))
  const pending = [0]
  const visited = new Set<number>()
  while (pending.length > 0) {
    const index = pending.pop()
    if (index === undefined || index === excludedIndex || visited.has(index)) continue
    if (index === targetIndex) return true
    visited.add(index)
    const instruction = instructions[index]
    if (!instruction || ['returnvoid', 'returnvalue', 'throw'].includes(instruction.name)) continue
    if (instruction.name === 'lookupswitch') {
      const offsets = [instruction.params[0], ...(instruction.params[2] as number[])]
      for (const offset of offsets) {
        const target = typeof offset === 'number' ? pcToIndex.get(instruction.pc + offset) : undefined
        if (target !== undefined) pending.push(target)
      }
      continue
    }
    if (BRANCHES.has(instruction.name)) {
      pending.push(branchTargetIndex(methodId, index))
      if (instruction.name !== 'jump') pending.push(index + 1)
      continue
    }
    pending.push(index + 1)
  }
  return false
}

function normalizedPredicate(writer: (typeof writerSpecs)[number]): unknown[] {
  const instructions = methods.get(writer.methodId)
  assert(instructions, `method ${writer.methodId} is absent`)
  return instructions.slice(writer.predicateStart, writer.originStore + 1).map((instruction) => {
    const localOpcode = /^(get|set)local(?:_\d)?$/.test(instruction.name)
    return {
      opcode: localOpcode ? `${instruction.name.slice(0, 3)}local` : instruction.name,
      params: BRANCHES.has(instruction.name)
        ? [branchTargetIndex(writer.methodId, instruction.index) - writer.predicateStart]
        : localOpcode
          ? []
          : instruction.params.map((parameter) => multinameName(parameter, strings) || parameter),
    }
  })
}

const normalizedPredicates = writerSpecs.map(normalizedPredicate)
for (const predicate of normalizedPredicates.slice(1))
  assert(JSON.stringify(predicate) === JSON.stringify(normalizedPredicates[0]), 'writer origin predicates diverged')

// Representative branch targets close the compiler-expanded predicate's CFG.
for (const [index, target] of [
  [48, 87],
  [68, 83],
  [92, 210],
  [109, 131],
  [120, 130],
  [132, 183],
  [138, 179],
  [151, 175],
  [160, 171],
  [188, 206],
  [214, 218],
] as const)
  assert(branchTargetIndex(6520, index) === target, `method 6520 index ${index} branch target changed`)

// The shared compiler-expanded zero-origin predicate uses these exact state masks.
for (const methodId of writerSpecs.map(({ methodId }) => methodId)) {
  const constants = methods
    .get(methodId)
    ?.slice(0, writerSpecs.find((writer) => writer.methodId === methodId)?.originStore)
    .filter((instruction) => instruction.name === 'pushint' || instruction.name === 'pushbyte')
    .map((instruction) => instruction.params[0])
  for (const expected of [2, 4, 16, 32, 1024, 2048, 8192, 32768, 262144, 524288, 4194304])
    assert(constants?.includes(expected), `method ${methodId} origin predicate lacks mask ${expected}`)
  for (const field of ['_-b4a', '_-HS', '_-p5G'])
    assert(
      methods
        .get(methodId)
        ?.slice(0, writerSpecs.find((writer) => writer.methodId === methodId)?.originStore)
        .some((instruction) => multinameName(instruction.params[0], strings) === field),
      `method ${methodId} origin predicate lacks ${field}`,
    )
}

// Result wraps subtraction. Input and face-event writers clamp sources at or before the origin to zero.
at(6520, 226, 'getlocal_1')
at(6520, 228, 'subtract_i')
at(6521, 324, 'getlocal', 5)
at(6521, 326, 'getproperty', '_-D6d')
at(6521, 327, 'greaterequals')
assert(branchTargetIndex(6521, 328) === 332, 'input clamp target changed')
at(6521, 329, 'pushbyte', 0)
at(6521, 335, 'subtract_i')
at(6522, 278, 'getlocal', 5)
at(6522, 280, 'getproperty', '_-y3l')
at(6522, 281, 'greaterequals')
assert(branchTargetIndex(6522, 282) === 286, 'KO clamp target changed')
at(6522, 283, 'pushbyte', 0)
at(6522, 289, 'subtract_i')
at(6523, 277, 'getlocal', 6)
at(6523, 279, 'greaterequals')
assert(branchTargetIndex(6523, 280) === 284, 'victory clamp target changed')
at(6523, 281, 'pushbyte', 0)
at(6523, 286, 'subtract_i')

// q4F is initialized once from the first quantized tick, and result state 6 receives z35 directly.
at(3217, 863, 'findproperty', '_-q4F')
at(3217, 864, 'getproperty', '_-q4F')
at(3217, 865, 'pushbyte', 0)
at(3217, 868, 'findproperty', '_-q4Q')
at(3217, 869, 'getlocal', 17)
at(3217, 870, 'callpropvoid', '_-q4Q')
at(3428, 62, 'findproperty', '_-q4F')
at(3428, 63, 'getlocal_1')
at(3428, 64, 'initproperty', '_-q4F')
at(3217, 1398, 'findproperty', '_-z35')
at(3217, 1399, 'getproperty', '_-z35')
at(3217, 1400, 'callpropvoid', '_-i3B')

// Cleanup resets p5G before the sole finalizer call. Only result state 6 has an earlier direct writer call.
at(3442, 51, 'findproperty', '_-p5G')
at(3442, 52, 'pushbyte', 0)
at(3442, 54, 'initproperty', '_-p5G')
at(3442, 70, 'findproperty', '_-Ii')
at(3442, 72, 'callpropvoid', '_-x40')
const finalizerBody = abc.method_body.find((body: any) => body.method === 3442)
assert((finalizerBody?.exception ?? []).length === 0, 'method 3442 gained exception edges')
assert(!canReachWithout(3442, 72, 54), 'p5G reset no longer dominates the finalizer call')
at(6524, 260, 'getlocal_2')
at(6524, 261, 'iffalse')
assert(branchTargetIndex(6524, 261) === 266, 'fallback clock branch changed')
at(6524, 264, 'getproperty', '_-21L')
at(6524, 265, 'jump')
assert(branchTargetIndex(6524, 265) === 269, 'fallback clock join changed')
at(6524, 268, 'getproperty', '_-X6B')
at(6524, 270, 'setlocal', 8)
at(6524, 272, 'getlocal', 8)
at(6524, 273, 'callpropvoid', '_-i3B')
at(6524, 275, 'callpropvoid', '_-i4C')
at(6524, 277, 'callpropvoid', '_-O15')
at(6524, 279, 'callpropvoid', '_-R4D')

const expectedWriterReferences = new Map<number, string[]>([
  [6520, ['3217:1400:callpropvoid', '6524:271:findproperty', '6524:273:callpropvoid']],
  [6521, ['6524:274:findproperty', '6524:275:callpropvoid']],
  [6522, ['6524:276:findproperty', '6524:277:callpropvoid']],
  [6523, ['6524:278:findproperty', '6524:279:callpropvoid']],
  [6524, ['3442:72:callpropvoid']],
])
for (const [targetMethodId, expected] of expectedWriterReferences) {
  const trait = abc.instance
    .flatMap((instance: any) => instance.trait ?? [])
    .find((candidate: any) => candidate.data?.method === targetMethodId)
  assert(trait, `method ${targetMethodId} has no instance trait`)
  const targetKey = qnameKey(abc.constant_pool.multiname[trait.name - 1])
  assert(targetKey, `method ${targetMethodId} trait is not an exact QName`)
  const actual: string[] = []
  for (const [callerMethodId, instructions] of methods) {
    for (const instruction of instructions) {
      if (instruction.params.some((parameter) => qnameKey(parameter) === targetKey))
        actual.push(`${callerMethodId}:${instruction.index}:${instruction.name}`)
    }
  }
  assert(
    JSON.stringify(actual.sort()) === JSON.stringify(expected.sort()),
    `method ${targetMethodId} callsite set changed`,
  )
}

// Both telemetry sites define GameDuration as z35 - q4F - 6000.
at(3833, 59, 'pushstring', 'GameDuration')
at(3833, 62, 'getproperty', '_-z35')
at(3833, 65, 'getproperty', '_-q4F')
at(3833, 66, 'subtract_i')
at(3833, 68, 'pushuint', 6000)
at(3833, 69, 'subtract_i')
at(3833, 72, 'setproperty')
at(3805, 204, 'getlocal_1')
at(3805, 207, 'getproperty', '_-q4F')
at(3805, 208, 'subtract_i')
at(3805, 210, 'pushuint', 6000)
at(3805, 211, 'subtract_i')
at(3805, 214, 'setlocal', 4)
at(3805, 216, 'pushbyte', 16)
at(3805, 217, 'divide')

// Literal startup anchors give narrow evidence-derived names to the strongest special states.
at(3501, 5, 'pushint', 32768)
at(3501, 7, 'initproperty', '_-b4a')
at(3501, 11, 'pushstring', 'training')
at(3507, 27, 'pushstring', 'replay')
at(3507, 49, 'pushint', 1024)
at(3507, 51, 'initproperty', '_-b4a')
at(3509, 57, 'pushint', 1024)
at(3509, 59, 'pushint', 2048)
at(3509, 62, 'pushint', 8192)
at(3509, 71, 'pushint', 2048)
at(3509, 76, 'initproperty', '_-b4a')
at(3505, 4, 'pushstring', 'spectate')
at(3505, 9, 'pushint', 524288)
at(3508, 35, 'findproperty', '_-p5G')
at(3508, 36, 'pushbyte', 2)
at(3508, 38, 'initproperty', '_-p5G')
at(3508, 104, 'findproperty', '_-b4a')
at(3508, 105, 'pushint', 8388608)
at(3508, 107, 'initproperty', '_-b4a')
at(3218, 794, 'getlocal', 8)
at(3218, 795, 'pushint', 8388608)
at(3218, 797, 'findproperty', '_-g2L')
at(3218, 798, 'callpropvoid', '_-g2L')
at(3205, 65, 'pushbyte', 16)
at(3205, 67, 'initproperty', '_-b4a')
at(3205, 505, 'pushstring', 'practiceTraining')
assert(
  !methods
    .get(3205)
    ?.some(
      (instruction) => instruction.name === 'initproperty' && multinameName(instruction.params[0], strings) === '_-p5G',
    ),
  'state-16 startup now resets p5G',
)

const ledgerMethodIds = [
  3205, 3217, 3218, 3428, 3442, 3501, 3505, 3507, 3508, 3509, 3805, 3833, 6520, 6521, 6522, 6523, 6524,
]
const ledger = ledgerMethodIds.flatMap((methodId) =>
  (methods.get(methodId) ?? []).map((instruction) => ({
    methodId,
    index: instruction.index,
    pc: instruction.pc,
    opcode: instruction.name,
    params: instruction.params.map((parameter) => multinameName(parameter, strings) || parameter),
  })),
)
const ledgerSha256 = sha256(JSON.stringify(ledger))
assert(ledgerSha256 === EXPECTED_LEDGER_SHA256, `instruction ledger mismatch: ${ledgerSha256}`)

const manifestBytes = readFileSync(resolve(manifestPath))
const manifestSha256 = sha256(new Uint8Array(manifestBytes))
assert(manifestSha256 === EXPECTED_MANIFEST_SHA256, `manifest SHA-256 mismatch: ${manifestSha256}`)
const manifest = JSON.parse(manifestBytes.toString('utf8')) as CorpusManifest
assert(manifest.fixtures.length === EXPECTED_FIXTURE_COUNT, 'fixture count mismatch')

const corpusRows = manifest.fixtures.map((fixture) => {
  const raw = readFileSync(resolve(dirname(resolve(manifestPath)), fixture.file))
  assert(sha256(new Uint8Array(raw)) === fixture.sha256, 'fixture SHA-256 mismatch')
  const replay = parse(new Uint8Array(raw))
  const inputTimestamps = replay.inputs.entities.flatMap((entity) =>
    entity.snapshots.map((snapshot) => snapshot.timestampMs),
  )
  assert(inputTimestamps.length > 0, 'fixture has no input timestamps')
  assert(Math.min(...inputTimestamps) === 0, 'ordinary fixture input timeline does not start at zero')
  assert(
    replay.results.every((result) => result.lengthMs === replay.gameSettings.duration * 1000 + 6016),
    'ordinary timed result does not equal configured duration + 6016',
  )
  return {
    resultCount: replay.results.length,
    resultLengthMs: replay.results[0]?.lengthMs,
    configuredGameDurationMs: replay.gameSettings.duration * 1000,
    inputMinimumMs: Math.min(...inputTimestamps),
    inputMaximumMs: Math.max(...inputTimestamps),
  }
})

const unique = (values: number[]): number[] => [...new Set(values)].sort((left, right) => left - right)

process.stdout.write(
  `${JSON.stringify(
    {
      status: 'proven-for-pinned-abc-and-reviewed-ordinary-corpus',
      identity: {
        build: EXPECTED_BUILD,
        abcSha256,
        manifestSha256,
        decodedMethodBodies: methods.size,
        validBranchTargets: true,
        instructionLedgerSha256: ledgerSha256,
      },
      zeroOriginPredicate: {
        expression: 'state&(2|4|1024|2048|8192|262144|524288|4194304) || active(32768) || (p5G==2 && active(16))',
        activeDefinition: 'state&flag || (state&32 && priorState&flag)',
        ordinaryOrigin: 'q4F - 16',
        specialOrigin: '0',
      },
      formulas: {
        result: 'uint32(sourceTimestamp - origin)',
        inputAndEvents: 'uint32(max(0, sourceTimestamp - origin))',
        gameDuration: 'uint32(z35 - q4F - 6000)',
        ordinaryTerminalResult: 'GameDuration + 6016',
        specialTerminalResult: 'GameDuration + q4F + 6000',
      },
      reachability: {
        state6ResultBeforeCleanup: 'p5G==2 branch reachable',
        states1_5_7AfterCleanup: 'p5G reset to 0; p5G==2 branch unreachable',
      },
      ordinaryCorpus: {
        fixtures: corpusRows.length,
        resultCounts: unique(corpusRows.map(({ resultCount }) => resultCount)),
        configuredGameDurationMs: unique(corpusRows.map(({ configuredGameDurationMs }) => configuredGameDurationMs)),
        resultLengthMs: unique(corpusRows.map(({ resultLengthMs }) => resultLengthMs ?? -1)),
        inputMinimumMs: unique(corpusRows.map(({ inputMinimumMs }) => inputMinimumMs)),
        inputMaximumRangeMs: [
          Math.min(...corpusRows.map(({ inputMaximumMs }) => inputMaximumMs)),
          Math.max(...corpusRows.map(({ inputMaximumMs }) => inputMaximumMs)),
        ],
      },
    },
    null,
    2,
  )}\n`,
)
