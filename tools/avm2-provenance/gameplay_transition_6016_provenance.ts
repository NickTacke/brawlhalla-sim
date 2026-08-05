import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_METHOD_BODY_COUNT = 15_010
const MARKER_CLASS_INDEX = 164
const MARKER_TRAIT = '_-q3e'
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

class VerificationError extends Error {}

process.on('uncaughtException', (error: unknown) => {
  const reason = error instanceof VerificationError ? error.message : 'unexpected verification failure'
  process.stderr.write(`${JSON.stringify({ status: 'failed', reason })}\n`)
  process.exit(1)
})

function argument(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  return index === -1 ? undefined : process.argv[index + 1]
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new VerificationError(message)
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
    const params: unknown[] = []
    for (const type of instruction.types) params.push(readOperand(type, code, cursor, params))
    return { ...instruction, index, pc, endPc: cursor.offset }
  })
  assert(cursor.offset === code.length, `decode stopped at ${cursor.offset} of ${code.length}`)
  return located
}

function branchTarget(instruction: LocatedInstruction): number | null {
  const offset = instruction.params[0]
  return typeof offset === 'number' ? instruction.endPc + offset : null
}

function validateBranches(instructions: LocatedInstruction[], codeLength: number): string[] {
  const boundaries = new Set(instructions.map((instruction) => instruction.pc))
  boundaries.add(codeLength)
  const errors: string[] = []
  for (const instruction of instructions) {
    if (BRANCHES.has(instruction.name)) {
      const target = branchTarget(instruction)
      if (target === null || !boundaries.has(target)) errors.push(`PC ${instruction.pc}`)
    }
    if (instruction.name === 'lookupswitch') {
      const offsets = [instruction.params[0], ...(Array.isArray(instruction.params[2]) ? instruction.params[2] : [])]
      for (const entry of offsets) {
        const offset = Array.isArray(entry) ? entry[1] : entry
        const target = typeof offset === 'number' ? instruction.pc + offset : null
        if (target === null || !boundaries.has(target)) errors.push(`PC ${instruction.pc} switch`)
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
if (!abcPath) {
  process.stderr.write('usage: bun gameplay_transition_6016_provenance.ts --abc <main.abc>\n')
  process.exit(64)
}

let abcBytes: Buffer
try {
  abcBytes = readFileSync(abcPath)
} catch {
  throw new VerificationError('unable to read ABC')
}
const abcSha256 = createHash('sha256').update(new Uint8Array(abcBytes)).digest('hex')
assert(abcSha256 === EXPECTED_ABC_SHA256, `ABC SHA-256 mismatch: ${abcSha256}`)

const abc: any = AbcFile.read(new ExtendedBuffer(abcBytes))
const strings = abc.constant_pool.string as string[]
const buildStrings = strings.filter((value) => /^\d+\.\d+\.\d+$/.test(value))
assert(buildStrings.length === 1 && buildStrings[0] === EXPECTED_BUILD, 'ABC build mismatch')
assert(abc.method_body.length === EXPECTED_METHOD_BODY_COUNT, 'method-body count mismatch')

const disassembler = new InstructionDisassembler(abc)
const methods = new Map<number, LocatedInstruction[]>()
const branchErrors: string[] = []
for (const body of abc.method_body) {
  const instructions = locateInstructions(body.code, disassembler.disassemble(body) as Instruction[])
  methods.set(body.method, instructions)
  branchErrors.push(
    ...validateBranches(instructions, body.code.length).map((error) => `method ${body.method} ${error}`),
  )
}
assert(branchErrors.length === 0, `invalid branch targets: ${branchErrors.slice(0, 10).join(', ')}`)

const owners = buildOwners(abc, strings)
for (const [methodId, expectedClass, expectedTrait] of [
  [1052, '_-C1o', '_-q3r'],
  [3217, '_-u16', '_-z3z'],
  [3428, '_-u16', '_-q5Q'],
  [3805, 'GameStats', '_-12K'],
  [3833, '_-O2T', '_-a1X'],
  [3836, '_-O2T', 'Tick'],
  [6520, '_-16', '_-i3A'],
  [6521, '_-16', '_-i3b'],
  [6522, '_-16', '_-O14'],
  [6523, '_-16', '_-R4C'],
  [6595, '_-v1J', '_-T4T'],
  [6598, '_-v1J', '_-T1t'],
  [6599, '_-v1J', '_-c17'],
  [6733, '_-N2y', '_-m3h'],
  [6935, '_-a1B', '_-g2p'],
  [6937, '_-a1B', '_-Ga'],
  [6955, '_-a1B', '_-X2n'],
  [7034, '_-81Z', '_-35B'],
  [7053, '_-54f', '_-35B'],
  [7089, '_-n4L', '_-35B'],
] as const) {
  const owner = owners.get(methodId)
  assert(owner?.className === expectedClass && owner.traitName === expectedTrait, `method ${methodId} owner changed`)
}

function instructionName(instruction: LocatedInstruction): string {
  return multinameName(instruction.params[0], strings)
}

function requireAt(methodId: number, index: number, opcode: string, name?: string, value?: number): LocatedInstruction {
  const instruction = methods.get(methodId)?.[index]
  assert(instruction, `method ${methodId} lacks instruction ${index}`)
  assert(instruction.name === opcode, `method ${methodId} instruction ${index} is not ${opcode}`)
  if (name !== undefined)
    assert(instructionName(instruction) === name, `method ${methodId} instruction ${index} does not name ${name}`)
  if (value !== undefined)
    assert(instruction.params[0] === value, `method ${methodId} instruction ${index} value changed`)
  return instruction
}

function range(methodId: number, firstIndex: number, lastIndex: number): [number, number] {
  const first = methods.get(methodId)?.[firstIndex]
  const last = methods.get(methodId)?.[lastIndex]
  assert(first && last, `method ${methodId} lacks range ${firstIndex}..${lastIndex}`)
  return [first.pc, last.endPc]
}

function requireBranchTarget(methodId: number, index: number, targetIndex: number): void {
  const instruction = methods.get(methodId)?.[index]
  const target = methods.get(methodId)?.[targetIndex]
  assert(instruction && target, `method ${methodId} lacks branch ${index} or target ${targetIndex}`)
  assert(BRANCHES.has(instruction.name), `method ${methodId} instruction ${index} is not a branch`)
  assert(branchTarget(instruction) === target.pc, `method ${methodId} instruction ${index} branch target changed`)
}

function normalizedParam(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(normalizedParam)
  const exactQName = qnameKey(value)
  if (exactQName) return { exactQName, name: multinameName(value, strings) }
  return value
}

function ledgerRange(methodId: number, firstIndex: number, lastIndex: number): object[] {
  const instructions = methods.get(methodId)?.slice(firstIndex, lastIndex + 1)
  assert(instructions?.length === lastIndex - firstIndex + 1, `method ${methodId} ledger range changed`)
  return instructions.map((instruction) => ({
    methodId,
    index: instruction.index,
    pc: instruction.pc,
    endPc: instruction.endPc,
    opcode: instruction.name,
    params: instruction.params.map(normalizedParam),
  }))
}

// The fixed-step loop advances and publishes T before testing and writing the first-step marker.
requireAt(3217, 854, 'getlocal')
requireAt(3217, 855, 'pushbyte', undefined, 16)
requireAt(3217, 856, 'add_i')
requireAt(3217, 859, 'setlocal')
requireAt(3217, 860, 'getlex', '_-X6r')
requireAt(3217, 862, 'initproperty', '_-L67')
requireAt(3217, 863, 'findproperty', MARKER_TRAIT)
requireAt(3217, 864, 'getproperty', MARKER_TRAIT)
requireAt(3217, 868, 'findproperty', '_-q5Q')
requireAt(3217, 870, 'callpropvoid', '_-q5Q')
requireAt(3428, 62, 'findproperty', MARKER_TRAIT)
requireAt(3428, 63, 'getlocal_1')
requireAt(3428, 64, 'initproperty', MARKER_TRAIT)
requireAt(3217, 1305, 'findproperty', '_-d3F')
requireAt(3217, 1307, 'getlocal')
requireAt(3217, 1308, 'callproperty', '_-g2p')
requireAt(3217, 1310, 'iffalse')
requireAt(3217, 1311, 'findproperty', '_-z1s')
requireAt(3217, 1312, 'getlocal')
requireAt(3217, 1313, 'initproperty', '_-z1s')
requireAt(3217, 1398, 'findproperty', '_-z1s')
requireAt(3217, 1399, 'getproperty', '_-z1s')
requireAt(3217, 1400, 'callpropvoid', '_-i3A')

// All ordinary replay timestamp writers select q3e - 16 rather than q3e + 6000.
const writerOrigins = [
  { methodId: 6520, first: 213, firstOpcode: 'getlocal_2', marker: 220, literal: 221, subtract: 222, store: 225 },
  { methodId: 6521, first: 227, firstOpcode: 'getlocal_1', marker: 234, literal: 235, subtract: 236, store: 239 },
  { methodId: 6522, first: 209, firstOpcode: 'getlocal_1', marker: 216, literal: 217, subtract: 218, store: 221 },
  { methodId: 6523, first: 226, firstOpcode: 'getlocal_2', marker: 233, literal: 234, subtract: 235, store: 238 },
]
for (const origin of writerOrigins) {
  requireAt(origin.methodId, origin.first, origin.firstOpcode)
  requireAt(origin.methodId, origin.first + 1, 'iffalse')
  requireBranchTarget(origin.methodId, origin.first + 1, origin.marker - 2)
  requireAt(origin.methodId, origin.marker, 'getproperty', MARKER_TRAIT)
  requireAt(origin.methodId, origin.literal, 'pushbyte', undefined, 16)
  requireAt(origin.methodId, origin.subtract, 'subtract_i')
  requireAt(origin.methodId, origin.store, 'setlocal')
}
requireAt(6520, 226, 'getlocal_1')
requireAt(6520, 227, 'getlocal')
requireAt(6520, 228, 'subtract_i')
requireAt(6520, 241, 'getlocal')
requireAt(6520, 242, 'callpropvoid', '_-S2c')

// Both GameDuration paths preserve the exact left-associative integer expression source - q3e - 6000.
for (const site of [
  { methodId: 3805, source: 204, marker: 207, firstSubtract: 208, literal: 210, secondSubtract: 211, end: 214 },
  { methodId: 3833, source: 62, marker: 65, firstSubtract: 66, literal: 68, secondSubtract: 69, end: 72 },
]) {
  requireAt(
    site.methodId,
    site.source,
    site.methodId === 3805 ? 'getlocal_1' : 'getproperty',
    site.methodId === 3833 ? '_-z1s' : undefined,
  )
  requireAt(site.methodId, site.marker, 'getproperty', MARKER_TRAIT)
  requireAt(site.methodId, site.firstSubtract, 'subtract_i')
  requireAt(site.methodId, site.literal, 'pushuint', undefined, 6000)
  requireAt(site.methodId, site.secondSubtract, 'subtract_i')
  requireAt(site.methodId, site.end, site.methodId === 3805 ? 'setlocal' : 'setproperty')
}
requireAt(3833, 59, 'pushstring', undefined)
assert(methods.get(3833)?.[59].params[0] === 'GameDuration', 'GameDuration label changed')

// Ordinary timed rules use the default base rules object. The base initialization hook is empty.
const timedReferencesInFactory = methods.get(6937)?.filter((instruction) => instructionName(instruction) === 'TIMED')
assert(timedReferencesInFactory?.length === 0, 'ordinary TIMED gained an explicit factory branch')
requireAt(6937, 240, 'findproperty', '_-x1V')
requireAt(6937, 241, 'findpropstrict', '_-N2y')
requireAt(6937, 244, 'constructprop', '_-N2y')
requireAt(6937, 245, 'initproperty', '_-x1V')
requireAt(6733, 0, 'returnvoid')
assert(methods.get(6733)?.length === 1, 'base rules initialization is no longer empty')
const baseRulesClass = abc.instance[371]
const roundTimerTrait = (baseRulesClass.trait as any[]).find(
  (trait) => multinameName(abc.constant_pool.multiname[trait.name - 1], strings) === '_-S6s',
)
assert(roundTimerTrait && (roundTimerTrait.kind & 0x0f) === 0, 'base rules round-timer slot changed')
assert(roundTimerTrait.data.vindex === 0, 'base rules round-timer slot gained an initializer')
assert(
  multinameName(abc.constant_pool.multiname[roundTimerTrait.data.type_name - 1], strings) === '_-R1f',
  'base rules round-timer type changed',
)
const roundTimerQName = qnameKey(abc.constant_pool.multiname[roundTimerTrait.name - 1])
assert(roundTimerQName, 'base rules round-timer slot is not an exact QName')
assert(
  methods.get(6729)?.every((instruction) => qnameKey(instruction.params[0]) !== roundTimerQName),
  'base rules constructor now writes the round-timer slot',
)
requireAt(6595, 6, 'getproperty', '_-S6s')
requireAt(6595, 12, 'ifne')
requireBranchTarget(6595, 12, 15)
requireAt(6595, 13, 'pushfalse')
requireAt(6595, 14, 'returnvalue')
requireAt(6598, 21, 'getproperty', '_-S6s')
requireAt(6598, 27, 'ifne')
requireBranchTarget(6598, 27, 30)
requireAt(6599, 22, 'getproperty', '_-S6s')
requireAt(6599, 28, 'ifne')
requireBranchTarget(6599, 28, 31)
requireAt(6937, 197, 'callproperty', '_-Q5v')
requireAt(6937, 201, 'findpropstrict', '_-81Z')
requireAt(6937, 204, 'constructprop', '_-81Z')
requireAt(6937, 218, 'getlex', 'ScoringType')
requireAt(6937, 219, 'getproperty', 'VOLLEY_BATTLE')
requireAt(6937, 223, 'findpropstrict', '_-54f')
requireAt(6937, 226, 'constructprop', '_-54f')
requireAt(6937, 229, 'getlex', 'ScoringType')
requireAt(6937, 230, 'getproperty', 'ZOMBIE')
requireAt(6937, 234, 'findpropstrict', '_-n4L')
requireAt(6937, 237, 'constructprop', '_-n4L')

// The standard per-tick path invokes the rule tick and then ordinary terminal/timer arithmetic.
requireAt(6935, 23, 'findproperty', '_-x1V')
requireAt(6935, 26, 'callpropvoid', '_-35B')
requireAt(6935, 158, 'findproperty', '_-X2n')
requireAt(6935, 159, 'getlocal_1')
requireAt(6935, 160, 'callproperty', '_-X2n')
requireAt(6955, 58, 'getproperty', 'mDuration')
requireAt(6955, 59, 'pushint', undefined, 1000)
requireAt(6955, 60, 'multiply_i')
requireAt(6955, 92, 'getproperty', MARKER_TRAIT)
requireAt(6955, 93, 'add_i')
requireAt(6955, 95, 'pushuint', undefined, 6000)
requireAt(6955, 96, 'add_i')
requireAt(6955, 101, 'getlocal_1')
requireAt(6955, 102, 'greaterthan')
requireBranchTarget(6955, 103, 110)
requireAt(6955, 105, 'getlocal_1')
requireAt(6955, 106, 'subtract_i')
requireAt(6955, 111, 'getlocal_3')
requireAt(6955, 112, 'greaterthan')
requireBranchTarget(6955, 113, 117)
requireAt(6955, 118, 'pushbyte', undefined, 0)
requireAt(6955, 119, 'lessequals')
requireBranchTarget(6955, 120, 124)
requireAt(6955, 209, 'initproperty', '_-x1')

// Startup accounting and presentation gates exclude q3e + 6000, so downstream work first runs on the next 16 ms tick.
requireAt(1052, 3559, 'getlocal_1')
requireAt(1052, 3562, 'getproperty', MARKER_TRAIT)
requireAt(1052, 3563, 'pushuint', undefined, 6000)
requireAt(1052, 3564, 'add_i')
requireAt(1052, 3566, 'greaterthan')
requireBranchTarget(1052, 3568, 3573)
requireAt(1052, 3571, 'setlocal')
assert(
  methods
    .get(1052)
    ?.some(
      (instruction) =>
        instruction.name === 'pushstring' &&
        instruction.params[0] === "[Camera.hx] No children on parallax background layer, can't get bounds.",
    ),
  'camera method readable identity changed',
)
requireAt(3805, 29, 'getlocal_1')
requireAt(3805, 32, 'getproperty', MARKER_TRAIT)
requireAt(3805, 33, 'pushuint', undefined, 6000)
requireAt(3805, 34, 'add_i')
requireAt(3805, 36, 'lessequals')
requireBranchTarget(3805, 38, 40)
requireAt(3805, 39, 'returnvoid')
requireAt(3836, 7, 'getlocal_1')
requireAt(3836, 10, 'getproperty', MARKER_TRAIT)
requireAt(3836, 11, 'pushuint', undefined, 6000)
requireAt(3836, 12, 'add_i')
requireAt(3836, 14, 'lessequals')
requireBranchTarget(3836, 15, 17)
requireAt(3836, 16, 'returnvoid')

const reviewedRanges = [
  [3217, 854, 870],
  [3428, 62, 64],
  [3217, 1305, 1313],
  [3217, 1391, 1400],
  ...writerOrigins.map((origin) => [origin.methodId, origin.first, origin.store]),
  [3805, 20, 39],
  [3805, 204, 214],
  [3833, 59, 72],
  [3836, 0, 17],
  [6595, 0, 35],
  [6598, 17, 79],
  [6599, 18, 77],
  [6729, 0, (methods.get(6729)?.length ?? 1) - 1],
  [6733, 0, 0],
  [6935, 0, 162],
  [6937, 194, 245],
  [6955, 55, 209],
  [1052, 3527, 3577],
  [7034, 189, 203],
  [7053, 31, 47],
  [7089, 0, 14],
] as const
const reviewedRangeLedger = reviewedRanges.flatMap(([methodId, firstIndex, lastIndex]) =>
  ledgerRange(methodId, firstIndex, lastIndex),
)
const reviewedRangeLedgerSha256 = createHash('sha256').update(JSON.stringify(reviewedRangeLedger)).digest('hex')
assert(
  reviewedRangeLedgerSha256 === '9bac554cf9373754da3504ff26277ffd0a308b3e50fe8818b7a569b608083abe',
  `reviewed range ledger changed: ${reviewedRangeLedgerSha256}`,
)

const markerClass = abc.instance[MARKER_CLASS_INDEX]
const markerDefinition = (markerClass.trait as any[]).find(
  (trait) => multinameName(abc.constant_pool.multiname[trait.name - 1], strings) === MARKER_TRAIT,
)
assert(markerDefinition, 'marker trait definition missing')
const markerQName = qnameKey(abc.constant_pool.multiname[markerDefinition.name - 1])
assert(markerQName, 'marker trait is not an exact QName')

const markerPlus6000Sites = [...methods.entries()]
  .flatMap(([methodId, instructions]) =>
    instructions.flatMap((instruction) => {
      if (instruction.name !== 'pushuint' || instruction.params[0] !== 6000) return []
      const preceding = instructions.slice(Math.max(0, instruction.index - 8), instruction.index)
      if (!preceding.some((candidate) => qnameKey(candidate.params[0]) === markerQName)) return []
      const adjacentAdd =
        instructions[instruction.index - 1]?.name === 'add_i' || instructions[instruction.index + 1]?.name === 'add_i'
      if (!adjacentAdd) return []
      return [{ methodId, instructionIndex: instruction.index, pc: instruction.pc }]
    }),
  )
  .sort((left, right) => left.methodId - right.methodId || left.instructionIndex - right.instructionIndex)
const expectedMarkerPlus6000Sites = [
  [1052, 3563],
  [3673, 74],
  [3805, 33],
  [3836, 11],
  [6595, 28],
  [6598, 45],
  [6599, 46],
  [6955, 95],
  [6955, 169],
  [7034, 198],
  [7053, 40],
  [7089, 9],
]
assert(
  JSON.stringify(markerPlus6000Sites.map((site) => [site.methodId, site.instructionIndex])) ===
    JSON.stringify(expectedMarkerPlus6000Sites),
  `bounded marker-plus-6000 adjacency ledger changed: ${JSON.stringify(markerPlus6000Sites.map((site) => [site.methodId, site.instructionIndex]))}`,
)

const ordinaryOriginOffsetMs = 16
const reportingOffsetMs = 6000 + ordinaryOriginOffsetMs
const reportingTick = reportingOffsetMs / 16
const firstPostBoundaryOffsetMs = reportingOffsetMs + 16
const firstPostBoundaryTick = firstPostBoundaryOffsetMs / 16
assert(reportingOffsetMs === 6016 && Number.isInteger(reportingTick), 'reporting offset arithmetic changed')
assert(firstPostBoundaryOffsetMs === 6032 && Number.isInteger(firstPostBoundaryTick), 'next-tick arithmetic changed')

const output = {
  status: 'proven-for-pinned-abc',
  identity: {
    build: EXPECTED_BUILD,
    abcSha256,
    decodedMethodBodies: methods.size,
    branchTargetsValid: true,
    reviewedRangeLedgerSha256,
  },
  verdict: {
    serialized6016: 'reporting epoch only; no ordinary timed gameplay-state write is established at this offset',
    activationMarkerOffsetMs: 16,
    activationMarkerTick: 1,
    impliedDurationEpochOffsetMs: reportingOffsetMs,
    impliedDurationEpochTick: reportingTick,
    firstPostBoundaryOffsetMs,
    firstPostBoundaryTick,
    firstPostBoundaryMeaning: 'first tick for which inclusive q3e + 6000 accounting gates no longer return',
  },
  arithmetic: {
    ordinarySerializedResult: 'resultTick - (q3e - 16)',
    gameDuration: 'resultTick - q3e - 6000',
    differenceMs: reportingOffsetMs,
  },
  anchors: {
    tickIncrementAndPublication: { methodId: 3217, instructionRange: [854, 862], bytePc: range(3217, 854, 862) },
    activationMarkerWrite: { methodId: 3428, instructionRange: [62, 64], bytePc: range(3428, 62, 64) },
    standardTerminalCapture: { methodId: 3217, instructionRange: [1305, 1313], bytePc: range(3217, 1305, 1313) },
    standardResultWrite: { methodId: 3217, instructionRange: [1398, 1400], bytePc: range(3217, 1398, 1400) },
    writerOrigins: writerOrigins.map((origin) => ({
      methodId: origin.methodId,
      instructionRange: [origin.first, origin.store],
      bytePc: range(origin.methodId, origin.first, origin.store),
    })),
    gameDurationStats: { methodId: 3805, instructionRange: [204, 214], bytePc: range(3805, 204, 214) },
    gameDurationReport: { methodId: 3833, instructionRange: [59, 72], bytePc: range(3833, 59, 72) },
    ordinaryTimer: { methodId: 6955, instructionRange: [89, 123], bytePc: range(6955, 89, 123) },
    inclusiveStartupGates: [
      { methodId: 3805, instructionRange: [29, 39], bytePc: range(3805, 29, 39) },
      { methodId: 3836, instructionRange: [7, 16], bytePc: range(3836, 7, 16) },
    ],
  },
  markerPlus6000Review: {
    siteCount: markerPlus6000Sites.length,
    sites: markerPlus6000Sites,
    ordinaryTimedDisposition: {
      presentationOnlyCameraGate: [1052],
      reportingAndTimerArithmetic: [3673, 3805, 3836, 6955],
      nullDefaultRoundTimerEqualityBypassed: [6595, 6598, 6599],
      conditionalOrNamedNonDefaultScoringSubtypes: [7034, 7053, 7089],
    },
  },
}

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
