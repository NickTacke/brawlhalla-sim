// Verify the scheduler, within-tick phase edges, timestamp sources, and trace-hook anchors
// in the hash-pinned Brawlhalla 10.09.96325 ABC without emitting proprietary bytecode.
// Usage: bun tick_phase_provenance.ts --abc <main.abc>

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_BODY_COUNT = 15_010

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
  start: number
  end: number
  operation?: string
  property?: string
}

const { AbcFile, ExtendedBuffer, InstructionDisassembler } = require('abc-disassembler') as AbcDisassemblerModule

function argument(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  return index < 0 ? undefined : process.argv[index + 1]
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
    if (typeof countValue !== 'number') throw new Error('array operand count is not numeric')
    const count = countValue + (type.startsWith('array1-') ? 1 : 0)
    const itemType = type.slice(type.indexOf('-') + 1)
    return Array.from({ length: count }, () => readValue(itemType, code, cursor, prior))
  }
  return readU30(code, cursor)
}

function locateInstructions(codeBytes: Uint8Array, instructions: Instruction[]): LocatedInstruction[] {
  const code = Buffer.from(codeBytes)
  const cursor = { offset: 0 }
  return instructions.map((instruction, index) => {
    const start = cursor.offset
    const opcode = code[cursor.offset++]
    if (opcode !== instruction.id) throw new Error(`opcode mismatch at byte ${start}`)
    const values: unknown[] = []
    for (const type of instruction.types) values.push(readValue(type, code, cursor, values))
    return { ...instruction, index, start, end: cursor.offset }
  })
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

const abcPath = argument('--abc')
if (!abcPath) {
  console.error('usage: bun tick_phase_provenance.ts --abc <main.abc>')
  process.exit(64)
}

const bytes = readFileSync(abcPath)
const sha256 = createHash('sha256').update(new Uint8Array(bytes)).digest('hex')
if (sha256 !== EXPECTED_SHA256) throw new Error(`ABC SHA-256 mismatch: ${sha256}`)

const abc: any = AbcFile.read(new ExtendedBuffer(bytes))
const strings: string[] = abc.constant_pool.string
const builds = strings.filter((value) => /^\d+\.\d+\.\d+$/.test(value))
if (builds.length !== 1 || builds[0] !== EXPECTED_BUILD) {
  throw new Error(`expected sole build ${EXPECTED_BUILD}, found ${builds.join(',') || 'none'}`)
}
if (abc.method_body.length !== EXPECTED_BODY_COUNT) {
  throw new Error(`expected ${EXPECTED_BODY_COUNT} method bodies, found ${abc.method_body.length}`)
}

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
if (branchErrors.length > 0) throw new Error(`invalid branch targets: ${branchErrors.slice(0, 10).join(', ')}`)

const owners = buildOwners(abc, strings)
const requiredMethods = new Map<number, [string, string]>([
  [3217, ['_-u16', '_-z3z']],
  [3273, ['_-u16', '_-A4X']],
  [2894, ['_-V4R', '_-84O']],
  [2893, ['_-V4R', '_-LV']],
  [2944, ['_-V4R', 'OnHit']],
  [1474, ['_-Wv', '_-Z29']],
  [6133, ['_-Tx', '_-PB']],
  [6135, ['_-Tx', '_-72L']],
  [6125, ['_-Tx', '_-B1i']],
  [6520, ['_-16', '_-i3A']],
  [6521, ['_-16', '_-i3b']],
  [6522, ['_-16', '_-O14']],
  [6523, ['_-16', '_-R4C']],
  [6524, ['_-16', '_-x3N']],
])
for (const [methodId, expected] of requiredMethods) {
  const owner = owners.get(methodId)
  if (!owner || owner.className !== expected[0] || owner.traitName !== expected[1]) {
    throw new Error(`method ${methodId} owner mismatch: ${JSON.stringify(owner)}`)
  }
}

const sites: Site[] = [
  { label: 'frame calls lifecycle', methodId: 5527, start: 228, end: 233, property: '_-U3n' },
  { label: 'lifecycle calls fixed-step loop', methodId: 3216, start: 1812, end: 1816, property: '_-z3z' },
  { label: 'post-frame roundtrip', methodId: 5527, start: 302, end: 306, property: '_-A4X' },
  { label: 'tick plus 16', methodId: 3217, start: 1900, end: 1903, operation: 'add_i' },
  { label: 'publish tick timestamp', methodId: 3217, start: 1907, end: 1916, property: '_-L67' },
  { label: 'first-step marker call', methodId: 3217, start: 1929, end: 1940, property: '_-q5Q' },
  { label: 'mode pre-tick', methodId: 3217, start: 2604, end: 2617, property: '_-j2F' },
  { label: 'moving geometry', methodId: 3217, start: 2632, end: 2646, property: '_-W1I' },
  { label: 'item pre-phase', methodId: 3217, start: 2672, end: 2688, property: '_-wY' },
  { label: 'respawn scheduler', methodId: 3217, start: 2688, end: 2700, property: '_-25J' },
  { label: 'fighter update', methodId: 3217, start: 2713, end: 2750, property: '_-84O' },
  { label: 'fighter post-movement death', methodId: 3217, start: 2763, end: 2800, property: '_-LV' },
  { label: 'item post-phase', methodId: 3217, start: 2800, end: 2814, property: '_-A3a' },
  { label: 'hit arbitration and application', methodId: 3217, start: 2814, end: 2827, property: '_-Z29' },
  { label: 'fighter post-hit pass', methodId: 3217, start: 2840, end: 2877, property: '_-U6U' },
  { label: 'special-mode fork', methodId: 3217, start: 2950, end: 2986, property: '_-p1g' },
  { label: 'standard terminal decision', methodId: 3217, start: 2986, end: 3003, property: '_-g2p' },
  { label: 'terminal timestamp detection', methodId: 3217, start: 3003, end: 3013, property: '_-z1s' },
  { label: 'terminal fighter finalization', methodId: 3217, start: 3030, end: 3067, property: '_-E5T' },
  { label: 'result serialization call', methodId: 3217, start: 3187, end: 3219, property: '_-i3A' },
  { label: 'outer tick backedge', methodId: 3217, start: 4051, end: 4055, operation: 'iflt' },
  { label: 'origin marker write', methodId: 3428, start: 152, end: 159, property: '_-q3e' },
  { label: 'result origin', methodId: 6520, start: 404, end: 420, property: '_-q3e' },
  { label: 'result normalization', methodId: 6520, start: 420, end: 428, operation: 'subtract_i' },
  { label: 'input origin', methodId: 6521, start: 417, end: 433, property: '_-q3e' },
  { label: 'input timestamp normalization', methodId: 6521, start: 642, end: 673, property: '_-D6c' },
  { label: 'state-5 origin', methodId: 6522, start: 383, end: 399, property: '_-q3e' },
  { label: 'state-5 timestamp normalization', methodId: 6522, start: 577, end: 615, property: 'mTimeStamp' },
  { label: 'state-7 map source', methodId: 6523, start: 44, end: 94, property: '_-E4t' },
  { label: 'state-7 origin', methodId: 6523, start: 446, end: 462, property: '_-q3e' },
  { label: 'state-7 timestamp normalization', methodId: 6523, start: 556, end: 590, operation: 'subtract_i' },
  { label: 'finalizer clock selection', methodId: 6524, start: 485, end: 517, operation: 'setlocal' },
  { label: 'finalizer result then sections', methodId: 6524, start: 517, end: 569, property: '_-i3A' },
]

function verifySite(site: Site): { label: string; methodId: number; bytePc: string } {
  const method = methods.get(site.methodId)
  if (!method) throw new Error(`missing method ${site.methodId}`)
  const range = method.instructions.filter(
    (instruction) => instruction.start >= site.start && instruction.end <= site.end,
  )
  const operationFound = !site.operation || range.some((instruction) => instruction.name === site.operation)
  const propertyFound =
    !site.property || range.some((instruction) => instructionProperty(instruction, strings) === site.property)
  if (!operationFound || !propertyFound) throw new Error(`site mismatch: ${site.label}`)
  return { label: site.label, methodId: site.methodId, bytePc: `${site.start}..${site.end}` }
}
const verifiedSites = sites.map(verifySite)

const tick = methods.get(3217)
if (!tick) throw new Error('missing authoritative tick method 3217')
const timestampPublications = tick.instructions.filter(
  (instruction) =>
    instructionProperty(instruction, strings) === '_-L67' &&
    instruction.name === 'initproperty' &&
    instruction.start >= 1890 &&
    instruction.start < 4055,
)
const outerBackedges = tick.instructions.filter(
  (instruction) => instruction.name === 'iflt' && branchTarget(instruction) === 1890,
)
if (timestampPublications.length !== 1 || timestampPublications[0].end !== 1916) {
  throw new Error('tick-loop timestamp publication is not unique at pc 1916')
}
if (outerBackedges.length !== 1 || outerBackedges[0].start !== 4051) {
  throw new Error('outer tick backedge is not unique at pc 4051')
}

const roundtrip = methods.get(3273)
if (!roundtrip) throw new Error('missing post-frame method 3273')
const forbiddenCoordinatorCalls = roundtrip.instructions.filter((instruction) =>
  ['_-z3z', '_-t20'].includes(instructionProperty(instruction, strings)),
)
if (forbiddenCoordinatorCalls.length > 0) throw new Error('post-frame method reaches lifecycle tick methods')

const report = {
  status: 'proven',
  game: { build: EXPECTED_BUILD, abcSha256: sha256 },
  decoder: { methodsDecoded: methods.size, branchTargetsValid: true, multinameStringIndex: 'index - 1' },
  authoritativeTick: {
    methodId: 3217,
    owner: owners.get(3217),
    beginHookOriginalBytePc: 1916,
    completionHookOriginalBytePc: 4051,
    timestampPublicationCount: timestampPublications.length,
    outerBackedgeCount: outerBackedges.length,
  },
  rejectedTickCandidate: {
    methodId: 3273,
    owner: owners.get(3273),
    lifecycleTickCallCount: forbiddenCoordinatorCalls.length,
    frameCallbackCallPc: 302,
  },
  phaseAndTimestampSites: verifiedSites,
}

console.log(JSON.stringify(report, null, 2))
