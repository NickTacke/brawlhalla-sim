// Verify simultaneous command-selection priority in the hash-pinned
// Brawlhalla 10.09.96325 ABC without emitting proprietary bytecode.
// Usage: bun command_selection_priority_provenance.ts --abc <main.abc>

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_BODY_COUNT = 15_010

class VerificationError extends Error {}

process.on('uncaughtException', (error: unknown) => {
  const reason = error instanceof VerificationError ? error.message : 'unexpected verification failure'
  process.stderr.write(`${JSON.stringify({ status: 'failed', reason })}\n`)
  process.exit(1)
})

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

const COMMANDS = {
  heavy: 0x40,
  lightOrQuickPickup: 0x80,
  dodge: 0x100,
  throw: 0x200,
  tauntGroup: 0x3c00,
} as const

const CONTEXT_PATTERNS = [0x0c00, 0x1800, 0x3000, 0x2400, 0x0400, 0x0800, 0x1000, 0x2000]

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; start: number; end: number }
type DecodedMethod = { methodId: number; codeLength: number; instructions: LocatedInstruction[] }
type MethodOwner = { className: string; traitName: string }
type AbcDisassemblerModule = {
  AbcFile: { read(input: unknown): any }
  ExtendedBuffer: new (input: Buffer) => any
  InstructionDisassembler: new (abc: any) => { disassemble(body: unknown): Instruction[] }
}

type Site = {
  label: string
  methodId: number
  pc: number
  operation: string
  property?: string
}

type SequenceInstruction = Site & { value?: number }

type CombinationRow = {
  rising: string
  priorThrowHeld: boolean
  orderedAttempts: string[]
  result: string
}

const { AbcFile, ExtendedBuffer, InstructionDisassembler } = require('abc-disassembler') as AbcDisassemblerModule

function argument(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  return index < 0 ? undefined : process.argv[index + 1]
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

function readValue(type: string, code: Buffer, cursor: { offset: number }, prior: unknown[]): unknown {
  if (type === 'u8') return code[cursor.offset++]
  if (type === 'offset' || type === 's24') return readS24(code, cursor)
  if (type.startsWith('array')) {
    const countValue = prior[prior.length - 1]
    assert(typeof countValue === 'number', 'array operand count is not numeric')
    const count = countValue + (type.startsWith('array1-') ? 1 : 0)
    const itemType = type.slice(type.indexOf('-') + 1)
    return Array.from({ length: count }, () => readValue(itemType, code, cursor, prior))
  }
  return readU30(code, cursor)
}

function locateInstructions(codeBytes: Uint8Array, instructions: Instruction[]): LocatedInstruction[] {
  const code = Buffer.from(codeBytes)
  const cursor = { offset: 0 }
  const located = instructions.map((instruction, index) => {
    const start = cursor.offset
    const opcode = code[cursor.offset++]
    assert(opcode === instruction.id, `opcode mismatch at byte ${start}`)
    const values: unknown[] = []
    for (const type of instruction.types) values.push(readValue(type, code, cursor, values))
    return { ...instruction, index, start, end: cursor.offset }
  })
  assert(cursor.offset === code.length, 'instruction decode did not consume method body')
  return located
}

function multinameName(value: unknown, strings: string[]): string {
  if (!value || typeof value !== 'object' || !('data' in value)) return ''
  const name = (value as { data?: { name?: unknown } }).data?.name
  if (typeof name === 'number') return strings[name - 1] ?? ''
  return typeof name === 'string' ? name : ''
}

function instructionProperty(instruction: Instruction, strings: string[]): string {
  return multinameName(instruction.params[0], strings)
}

function buildOwners(abc: any, strings: string[]): Map<number, MethodOwner> {
  const owners = new Map<number, MethodOwner>()
  const multinames = abc.constant_pool.multiname
  const nameAt = (index: number): string => multinameName(multinames[index - 1], strings)
  for (let classIndex = 0; classIndex < abc.instance.length; classIndex++) {
    const className = nameAt(abc.instance[classIndex].name)
    for (const group of [abc.instance[classIndex].trait, abc.class[classIndex].traits]) {
      for (const trait of group) {
        const kind = trait.kind & 0x0f
        if (kind < 1 || kind > 3 || trait.data?.method === undefined) continue
        owners.set(trait.data.method, { className, traitName: nameAt(trait.name) })
      }
    }
  }
  return owners
}

function branchTarget(instruction: LocatedInstruction): number | undefined {
  const offset = instruction.params[0]
  return typeof offset === 'number' ? instruction.end + offset : undefined
}

function contextPatternFor(current: number, previous = 0): number | null {
  for (const pattern of CONTEXT_PATTERNS) {
    if ((current & pattern) === pattern && (previous & pattern) !== pattern) return pattern
  }
  return null
}

function buildCombinationTable(): CombinationRow[] {
  const dimensions = [
    ['D', COMMANDS.dodge],
    ['T', COMMANDS.throw],
    ['L', COMMANDS.lightOrQuickPickup],
    ['H', COMMANDS.heavy],
    ['P', COMMANDS.tauntGroup],
  ] as const
  return Array.from({ length: 32 }, (_, subset) => subset).flatMap((subset) => {
    const present = new Set<string>()
    dimensions.forEach(([label], index) => {
      if ((subset & (1 << index)) !== 0) present.add(label)
    })
    const priorThrowStates = present.has('T') ? [false] : [false, true]
    return priorThrowStates.map((priorThrowHeld) => {
      const attempts: string[] = []
      if (present.has('D')) attempts.push('dodge')
      if (present.has('T')) attempts.push('throw-driven pickup')
      if (present.has('L')) attempts.push('light/quick-pickup')
      if (present.has('H')) attempts.push('heavy')
      if ((present.has('T') || priorThrowHeld) && !present.has('L')) {
        attempts.push('mode-specific throw context')
      }
      if (present.has('T') && !present.has('L')) attempts.push('ordinary throw action')
      if ((present.has('T') || priorThrowHeld) && present.has('L')) {
        attempts.push('mode-specific throw suppressed: lightTime != 0')
      }
      if (present.has('T') && present.has('L')) {
        attempts.push('ordinary throw suppressed: throwTime == lightTime')
      }
      if (present.has('P')) attempts.push('taunt-group context action')
      return {
        rising:
          dimensions
            .filter((_, index) => (subset & (1 << index)) !== 0)
            .map(([label]) => label)
            .join('+') || 'none',
        priorThrowHeld,
        orderedAttempts: attempts,
        result:
          attempts.length === 0
            ? 'no-action'
            : 'first eligible attempt that accepts; no-action if every non-suppressed attempt rejects',
      }
    })
  })
}

const abcPath = argument('--abc')
if (!abcPath) {
  process.stderr.write('usage: bun command_selection_priority_provenance.ts --abc <main.abc>\n')
  process.exit(64)
}

let bytes: Buffer
try {
  bytes = readFileSync(abcPath)
} catch {
  throw new VerificationError('unable to read ABC')
}
const sha256 = createHash('sha256').update(new Uint8Array(bytes)).digest('hex')
assert(sha256 === EXPECTED_SHA256, `ABC SHA-256 mismatch: ${sha256}`)

const abc: any = AbcFile.read(new ExtendedBuffer(bytes))
const strings: string[] = abc.constant_pool.string
const builds = strings.filter((value) => /^\d+\.\d+\.\d+$/.test(value))
assert(
  builds.length === 1 && builds[0] === EXPECTED_BUILD,
  `expected sole build ${EXPECTED_BUILD}, found ${builds.join(',') || 'none'}`,
)
assert(
  abc.method_body.length === EXPECTED_BODY_COUNT,
  `expected ${EXPECTED_BODY_COUNT} method bodies, found ${abc.method_body.length}`,
)

const disassembler = new InstructionDisassembler(abc)
const methods = new Map<number, DecodedMethod>()
const branchErrors: string[] = []
for (const body of abc.method_body) {
  const instructions = locateInstructions(body.code, disassembler.disassemble(body))
  const boundaries = new Set(instructions.map((instruction) => instruction.start))
  boundaries.add(body.code.length)
  for (const instruction of instructions) {
    if (BRANCHES.has(instruction.name)) {
      const target = branchTarget(instruction)
      if (target === undefined || !boundaries.has(target)) {
        branchErrors.push(`method ${body.method} pc ${instruction.start}`)
      }
    }
    if (instruction.name === 'lookupswitch') {
      const offsets = [instruction.params[0], ...(Array.isArray(instruction.params[2]) ? instruction.params[2] : [])]
      for (const entry of offsets) {
        const offset = Array.isArray(entry) ? entry[1] : entry
        const target = typeof offset === 'number' ? instruction.start + offset : undefined
        if (target === undefined || !boundaries.has(target)) {
          branchErrors.push(`method ${body.method} pc ${instruction.start} switch`)
        }
      }
    }
  }
  methods.set(body.method, { methodId: body.method, codeLength: body.code.length, instructions })
}
assert(branchErrors.length === 0, `invalid branch targets: ${branchErrors.slice(0, 10).join(', ')}`)

const owners = buildOwners(abc, strings)
const requiredMethods = new Map<number, [string, string]>([
  [1510, ['_-Y4C', '_-T1O']],
  [1555, ['_-Y4C', '_-E6M']],
  [6125, ['_-Tx', '_-B1i']],
  [6144, ['_-Tx', '_-74Z']],
  [6145, ['_-Tx', '_-K1A']],
  [6146, ['_-Tx', '_-l4J']],
  [6147, ['_-Tx', '_-S5o']],
])
for (const [methodId, expected] of requiredMethods) {
  const owner = owners.get(methodId)
  assert(owner?.className === expected[0] && owner.traitName === expected[1], `method ${methodId} owner mismatch`)
}

function requireAt(site: Site): Site & { endPc: number } {
  const method = methods.get(site.methodId)
  assert(method, `missing method ${site.methodId}`)
  const instruction = method.instructions.find((candidate) => candidate.start === site.pc)
  assert(instruction?.name === site.operation, `site opcode mismatch: ${site.label}`)
  if (site.property) {
    assert(instructionProperty(instruction, strings) === site.property, `site property mismatch: ${site.label}`)
  }
  return { ...site, endPc: instruction.end }
}

function requireSequence(sequence: SequenceInstruction[]): void {
  for (const site of sequence) {
    const verified = requireAt(site)
    if (site.value === undefined) continue
    const method = methods.get(site.methodId)
    assert(method, `missing method ${site.methodId}`)
    const instruction = method.instructions.find((candidate) => candidate.start === verified.pc)
    assert(instruction?.params[0] === site.value, `site value mismatch: ${site.label}`)
  }
}

const sites: Site[] = [
  { label: 'current held-mask write', methodId: 6125, pc: 387, operation: 'initproperty', property: '_-th' },
  { label: 'edge mask write', methodId: 6125, pc: 1040, operation: 'setlocal' },
  { label: 'light/quick-pickup edge test', methodId: 6125, pc: 1076, operation: 'pushint' },
  { label: 'heavy edge test', methodId: 6125, pc: 1112, operation: 'pushbyte' },
  { label: 'context edge test', methodId: 6125, pc: 1152, operation: 'getproperty', property: '_-15K' },
  { label: 'dodge edge test', methodId: 6125, pc: 1183, operation: 'pushint' },
  { label: 'throw edge test', methodId: 6125, pc: 1251, operation: 'pushint' },
  { label: 'dodge attempt', methodId: 6125, pc: 2431, operation: 'callproperty', property: '_-d3a' },
  { label: 'jump attempt', methodId: 6125, pc: 2564, operation: 'callpropvoid', property: '_-61V' },
  { label: 'throw-pickup light-absence argument', methodId: 6125, pc: 2612, operation: 'equals' },
  {
    label: 'first throw-driven pickup attempt',
    methodId: 6125,
    pc: 2613,
    operation: 'callproperty',
    property: '_-T1O',
  },
  {
    label: 'first throw-pickup admitted timestamp write',
    methodId: 6125,
    pc: 2631,
    operation: 'initproperty',
    property: '_-b5Y',
  },
  {
    label: 'second throw-driven pickup attempt',
    methodId: 6125,
    pc: 2694,
    operation: 'callproperty',
    property: '_-T1O',
  },
  {
    label: 'second throw-pickup admitted timestamp write',
    methodId: 6125,
    pc: 2712,
    operation: 'initproperty',
    property: '_-b5Y',
  },
  { label: 'light special attempt', methodId: 6125, pc: 2832, operation: 'callproperty', property: '_-S5o' },
  { label: 'light ordinary attempt', methodId: 6125, pc: 2918, operation: 'callproperty', property: '_-l4J' },
  { label: 'light admitted timestamp write', methodId: 6125, pc: 2960, operation: 'initproperty', property: '_-b5Y' },
  { label: 'heavy special attempt', methodId: 6125, pc: 3037, operation: 'callproperty', property: '_-S5o' },
  { label: 'heavy ordinary attempt', methodId: 6125, pc: 3100, operation: 'callproperty', property: '_-l4J' },
  { label: 'heavy admitted timestamp write', methodId: 6125, pc: 3142, operation: 'initproperty', property: '_-b5Y' },
  { label: 'mode throw light-absence gate', methodId: 6125, pc: 3188, operation: 'equals' },
  { label: 'special throw action attempt', methodId: 6125, pc: 3244, operation: 'callproperty', property: '_-021' },
  {
    label: 'special throw accepted timestamp write',
    methodId: 6125,
    pc: 3259,
    operation: 'initproperty',
    property: '_-b5Y',
  },
  { label: 'ordinary throw newer-than-light gate', methodId: 6125, pc: 3337, operation: 'greaterthan' },
  { label: 'ordinary throw eligibility', methodId: 6125, pc: 3353, operation: 'callproperty', property: '_-74Z' },
  { label: 'ordinary throw action start', methodId: 6125, pc: 3369, operation: 'callpropvoid', property: '_-E6M' },
  { label: 'ordinary throw timestamp write', methodId: 6125, pc: 3378, operation: 'initproperty', property: '_-b5Y' },
  { label: 'ordinary throw consumed write', methodId: 6125, pc: 3384, operation: 'setlocal' },
  { label: 'context command attempt', methodId: 6125, pc: 3641, operation: 'callproperty', property: '_-K1A' },
  { label: 'post-decision power input', methodId: 6125, pc: 3717, operation: 'callpropvoid', property: 'HandleInput' },
  { label: 'pickup commit', methodId: 1510, pc: 287, operation: 'callpropvoid', property: '_-G5l' },
  { label: 'power start time write', methodId: 1555, pc: 116, operation: 'initproperty', property: '_-n3E' },
  { label: 'context pattern vector read', methodId: 6145, pc: 93, operation: 'getproperty', property: '_-o3n' },
  { label: 'context action attempt', methodId: 6145, pc: 169, operation: 'callproperty', property: '_-S45' },
  { label: 'ordinary attack table read', methodId: 6146, pc: 639, operation: 'getproperty', property: '_-73T' },
  { label: 'ordinary attack attempt', methodId: 6146, pc: 670, operation: 'callproperty', property: '_-S45' },
]
const verifiedSites = sites.map(requireAt)

requireSequence([
  { label: 'light edge source local', methodId: 6125, pc: 1074, operation: 'getlocal', value: 28 },
  { label: 'light edge literal', methodId: 6125, pc: 1076, operation: 'pushint', value: COMMANDS.lightOrQuickPickup },
  { label: 'heavy edge source local', methodId: 6125, pc: 1110, operation: 'getlocal', value: 28 },
  { label: 'heavy edge literal', methodId: 6125, pc: 1112, operation: 'pushbyte', value: COMMANDS.heavy },
  { label: 'dodge edge source local', methodId: 6125, pc: 1181, operation: 'getlocal', value: 28 },
  { label: 'dodge edge literal', methodId: 6125, pc: 1183, operation: 'pushint', value: COMMANDS.dodge },
  { label: 'throw edge source local', methodId: 6125, pc: 1249, operation: 'getlocal', value: 28 },
  { label: 'throw edge literal', methodId: 6125, pc: 1251, operation: 'pushint', value: COMMANDS.throw },
  { label: 'throw-pickup compares light local', methodId: 6125, pc: 2608, operation: 'getlocal', value: 18 },
  { label: 'mode throw compares light local', methodId: 6125, pc: 3184, operation: 'getlocal', value: 18 },
  { label: 'ordinary throw timestamp local', methodId: 6125, pc: 3333, operation: 'getlocal', value: 26 },
  { label: 'ordinary throw comparison light local', methodId: 6125, pc: 3335, operation: 'getlocal', value: 18 },
  { label: 'power input light local', methodId: 6125, pc: 3705, operation: 'getlocal', value: 18 },
  { label: 'power input light Boolean conversion', methodId: 6125, pc: 3709, operation: 'equals' },
  { label: 'power input heavy local', methodId: 6125, pc: 3711, operation: 'getlocal', value: 20 },
  { label: 'power input heavy Boolean conversion', methodId: 6125, pc: 3715, operation: 'equals' },
  { label: 'power input call', methodId: 6125, pc: 3717, operation: 'callpropvoid', property: 'HandleInput' },
])

const commandInitializer = methods.get(14909)
if (!commandInitializer) throw new VerificationError('missing command initializer method 14909')
const verifiedCommandInitializer: DecodedMethod = commandInitializer
function requireStaticAssignment(property: string, expectedExpression: Array<[string, number?]>): void {
  const writes = verifiedCommandInitializer.instructions.filter(
    (instruction) => instruction.name === 'initproperty' && instructionProperty(instruction, strings) === property,
  )
  assert(writes.length === 1, `expected one ${property} initializer`)
  const write = writes[0]
  const start = write.index - expectedExpression.length
  assert(start >= 0, `initializer expression underflow for ${property}`)
  expectedExpression.forEach(([operation, value], offset) => {
    const instruction = verifiedCommandInitializer.instructions[start + offset]
    assert(instruction.name === operation, `${property} initializer opcode mismatch`)
    if (value !== undefined) assert(instruction.params[0] === value, `${property} initializer value mismatch`)
  })
}

requireStaticAssignment('_-n24', [['pushbyte', COMMANDS.heavy], ['convert_u']])
requireStaticAssignment('_-ml', [['pushint', COMMANDS.lightOrQuickPickup], ['convert_u']])
requireStaticAssignment('_-O1N', [['pushint', COMMANDS.dodge], ['convert_u']])
requireStaticAssignment('_-i3p', [['pushint', COMMANDS.throw], ['convert_u']])
requireStaticAssignment('_-15K', [
  ['pushint', 0x0400],
  ['convert_u'],
  ['pushint', 0x0800],
  ['convert_u'],
  ['bitor'],
  ['pushint', 0x1000],
  ['convert_u'],
  ['pushint', 0x2000],
  ['convert_u'],
  ['bitor'],
  ['bitor'],
])

const contextInitializer = verifiedCommandInitializer
const contextWrite = contextInitializer.instructions.find(
  (instruction) => instruction.name === 'initproperty' && instructionProperty(instruction, strings) === '_-o3n',
)
assert(contextWrite, 'missing context pattern vector initializer')
const contextArray = contextInitializer.instructions[contextWrite.index - 1]
assert(contextArray.name === 'newarray' && contextArray.params[0] === 8, 'context pattern vector length mismatch')
const contextValues = contextInitializer.instructions
  .slice(contextWrite.index - 29, contextWrite.index - 1)
  .filter((instruction) => instruction.name === 'pushint')
  .map((instruction) => instruction.params[0])
assert(
  JSON.stringify(contextValues) ===
    JSON.stringify([0x0400, 0x0800, 0x0800, 0x1000, 0x1000, 0x2000, 0x0400, 0x2000, ...CONTEXT_PATTERNS.slice(4)]),
  'context pattern vector values mismatch',
)

const contextSubsetTable = Array.from({ length: 15 }, (_, index) => {
  const mask = (index + 1) << 10
  return {
    mask: `0x${mask.toString(16).padStart(4, '0')}`,
    selectedPattern: `0x${(contextPatternFor(mask) ?? 0).toString(16).padStart(4, '0')}`,
  }
})

const report = {
  status: 'proven-for-pinned-abc',
  attestationScope: {
    verifies:
      'hash, build, decode integrity, method owners, command constants, selected opcode/property anchors, explicit mask/local dataflow sequences, candidate call order, context-pattern order, selected callee commits, and post-decision power-input argument order',
    doesNotVerify:
      'a general symbolic proof of every documented predicate, semantic labels without reviewed static interpretation, runtime-dispatched helper outcomes, item availability, mode-specific eligibility, server input production, or native callback behavior',
  },
  game: { build: EXPECTED_BUILD, abcSha256: sha256 },
  decoder: { methodsDecoded: methods.size, branchTargetsValid: true, multinameStringIndex: 'index - 1' },
  commandMasks: COMMANDS,
  contextPatterns: {
    evaluationOrder: CONTEXT_PATTERNS.map((value) => `0x${value.toString(16).padStart(4, '0')}`),
    simultaneousRisingSubsets: contextSubsetTable,
  },
  simultaneousSameInterval: {
    notation: {
      D: 'dodge 0x0100',
      T: 'throw 0x0200',
      L: 'light/quick-pickup 0x0080',
      H: 'heavy 0x0040',
      P: 'one or more taunt-group bits in 0x3c00',
    },
    selectionRule:
      'attempts follow bytecode order and accepted helpers normally consume later candidates; local32 can explicitly reopen later action-context paths; equal-time L suppresses both later T paths even when L rejects, but not the earlier T-driven pickup attempt',
    jumpInterposition:
      'the first eligible jump attempt is after dodge and before T/L/H/P; if its time-window gate blocks it, a fallback jump remains after ordinary throw',
    combinations: buildCombinationTable(),
  },
  sideEffects: {
    beforeSelection: [
      'method 6125 writes the current held mask before edge classification',
      'the edge scan retains the first rising timestamp and held mask for each candidate across the sampled window',
      'pre-selection callbacks and dodge-window maintenance can mutate fighter timestamps and can consume the interval',
    ],
    onAcceptedCandidate: [
      'accepted dodge, throw-driven pickup, light, heavy, and throw paths set local consumed state',
      'admitted throw-driven pickup, light, and heavy attempts write _-b5Y = inputTime even when their helper rejects; accepted throw paths also write it',
      'method 1510 commits pickup through _-G5l(time,item) and clears _-w5P',
      'method 1555 writes power start time, selected power identity, argument 1, and related start timestamps',
    ],
    afterSelection: [
      'method 6125 continues after selection rather than returning',
      'an active power receives HandleInput(time,direction,lightEdge,heavyEdge), preserving both simultaneous L/H booleans even when one candidate won',
      'held-command release/continuation callbacks and direction-state maintenance still run',
    ],
  },
  structuralAnchors: verifiedSites,
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
