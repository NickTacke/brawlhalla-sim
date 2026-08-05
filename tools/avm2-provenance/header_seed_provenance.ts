// Verify the format-268 header seed flow and exact direct consumers in the
// hash-pinned Brawlhalla 10.09.96325 ABC without emitting proprietary bytecode.
// Usage: bun header_seed_provenance.ts --abc <main.abc>

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

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; start: number; end: number }
type DecodedMethod = { methodId: number; instructions: LocatedInstruction[] }
type MethodOwner = { classIndex: number; className: string; traitName: string }
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
  operation: string
  property?: string
}

const { AbcFile, ExtendedBuffer, InstructionDisassembler } = require('abc-disassembler') as AbcDisassemblerModule

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
  return index < 0 ? undefined : process.argv[index + 1]
}

function readU30(code: Buffer, cursor: { offset: number }): number {
  let value = 0
  for (let index = 0; index < 5; index++) {
    const byte = code[cursor.offset++]
    value |= (byte & 0x7f) << (index * 7)
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
    if (typeof countValue !== 'number') throw new VerificationError('array operand count is not numeric')
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
    if (opcode !== instruction.id) throw new VerificationError(`opcode mismatch at byte ${start}`)
    const values: unknown[] = []
    for (const type of instruction.types) values.push(readValue(type, code, cursor, values))
    return { ...instruction, index, start, end: cursor.offset }
  })
  if (cursor.offset !== code.length) throw new VerificationError('instruction decode did not consume method body')
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
    for (const traits of [abc.instance[classIndex].trait, abc.class[classIndex].traits]) {
      for (const trait of traits) {
        const kind = trait.kind & 0x0f
        if (kind < 1 || kind > 3 || trait.data?.method === undefined) continue
        owners.set(trait.data.method, {
          classIndex,
          className,
          traitName: nameAt(trait.name),
        })
      }
    }
  }
  return owners
}

function branchTarget(instruction: LocatedInstruction): number | undefined {
  const offset = instruction.params[0]
  return typeof offset === 'number' ? instruction.end + offset : undefined
}

function randomOutputs(seed: number, count: number): number[] {
  const state = new Uint32Array(16)
  state[0] = seed & 0xff
  for (let index = 1; index < state.length; index++) {
    const prior = state[index - 1]
    state[index] = (Math.imul(1_812_433_253, prior ^ (prior >>> 30)) + index) & 0xff
  }

  let cursor = 0
  const outputs: number[] = []
  for (let draw = 0; draw < count; draw++) {
    const first = state[cursor]
    let second = state[(cursor + 13) & 15]
    const mixed = (first ^ second ^ (first << 16) ^ (second << 15)) >>> 0
    second = state[(cursor + 9) & 15]
    second = (second ^ (second >>> 11)) >>> 0
    state[cursor] = (mixed ^ second) >>> 0
    const tempered = (state[cursor] ^ ((state[cursor] << 5) & 0xda44_2d24)) >>> 0
    cursor = (cursor + 15) & 15
    const current = state[cursor]
    state[cursor] = (current ^ mixed ^ tempered ^ (current << 2) ^ (mixed << 18) ^ (second << 28)) >>> 0
    outputs.push(state[cursor])
  }
  return outputs
}

const abcPath = argument('--abc')
if (!abcPath) {
  process.stderr.write('usage: bun header_seed_provenance.ts --abc <main.abc>\n')
  process.exit(64)
}

let bytes: Buffer
try {
  bytes = readFileSync(abcPath)
} catch {
  throw new VerificationError('unable to read ABC')
}
const sha256 = createHash('sha256').update(new Uint8Array(bytes)).digest('hex')
if (sha256 !== EXPECTED_SHA256) throw new VerificationError(`ABC SHA-256 mismatch: ${sha256}`)

const abc: any = AbcFile.read(new ExtendedBuffer(bytes))
const strings: string[] = abc.constant_pool.string
const multinames: unknown[] = abc.constant_pool.multiname
const builds = strings.filter((value) => /^\d+\.\d+\.\d+$/.test(value))
if (builds.length !== 1 || builds[0] !== EXPECTED_BUILD) {
  throw new VerificationError(`expected sole build ${EXPECTED_BUILD}, found ${builds.join(',') || 'none'}`)
}
if (abc.method_body.length !== EXPECTED_BODY_COUNT) {
  throw new VerificationError(`expected ${EXPECTED_BODY_COUNT} method bodies, found ${abc.method_body.length}`)
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
  methods.set(body.method, { methodId: body.method, instructions })
}
if (branchErrors.length > 0) {
  throw new VerificationError(`invalid branch targets: ${branchErrors.slice(0, 10).join(', ')}`)
}

const owners = buildOwners(abc, strings)
const expectedOwners = new Map<number, [number, string, string]>([
  [1535, [87, '_-Y4C', '_-h10']],
  [1692, [91, '_-w3J', '_-12N']],
  [1797, [96, 'Random', '_-66b']],
  [1799, [96, 'Random', '_-H2L']],
  [3229, [164, '_-u16', '_-T3Q']],
  [3272, [164, '_-u16', '_-144']],
  [3282, [164, '_-u16', '_-6e']],
  [3368, [164, '_-u16', '_-fN']],
  [3507, [164, '_-u16', '_-H4o']],
  [3514, [164, '_-u16', '_-E4G']],
  [4780, [253, '_-61q', '_-h2u']],
  [6510, [356, '_-E4h', '_-N4v']],
  [6518, [357, '_-16', '_-63H']],
  [6869, [378, '_-H4f', '_-k3V']],
  [6937, [382, '_-a1B', '_-Ga']],
])
for (const [methodId, expected] of expectedOwners) {
  const owner = owners.get(methodId)
  if (
    !owner ||
    owner.classIndex !== expected[0] ||
    owner.className !== expected[1] ||
    owner.traitName !== expected[2]
  ) {
    throw new VerificationError(`method ${methodId} owner mismatch`)
  }
}

function instructionAt(site: Site): LocatedInstruction {
  const instruction = methods
    .get(site.methodId)
    ?.instructions.find((candidate) => candidate.start === site.start && candidate.end === site.end)
  if (!instruction || instruction.name !== site.operation) {
    throw new VerificationError(`${site.label}: opcode/range mismatch`)
  }
  if (site.property && instructionProperty(instruction, strings) !== site.property) {
    throw new VerificationError(`${site.label}: property mismatch`)
  }
  return instruction
}

const sites: Site[] = [
  {
    label: 'reader first-word read',
    methodId: 6510,
    start: 661,
    end: 665,
    operation: 'callproperty',
    property: '_-8v',
  },
  {
    label: 'reader first-word restore',
    methodId: 6510,
    start: 734,
    end: 738,
    operation: 'initproperty',
    property: '_-l4',
  },
  { label: 'writer state-3 tag', methodId: 6518, start: 41, end: 45, operation: 'callpropvoid', property: '_-PY' },
  {
    label: 'writer first-word write',
    methodId: 6518,
    start: 54,
    end: 58,
    operation: 'callpropvoid',
    property: '_-S2c',
  },
  { label: 'writer header call', methodId: 3368, start: 49, end: 53, operation: 'callpropvoid', property: '_-63H' },
  {
    label: 'replay seed argument read',
    methodId: 3272,
    start: 63,
    end: 67,
    operation: 'getproperty',
    property: '_-l4',
  },
  { label: 'replay handoff', methodId: 3272, start: 67, end: 72, operation: 'callpropvoid', property: '_-H4o' },
  {
    label: 'replay match initialization',
    methodId: 3507,
    start: 258,
    end: 262,
    operation: 'callpropvoid',
    property: '_-T3Q',
  },
  {
    label: 'default match-seed random draw',
    methodId: 3229,
    start: 61,
    end: 65,
    operation: 'callproperty',
    property: '_-H2L',
  },
  { label: 'match seed assignment', methodId: 3229, start: 85, end: 89, operation: 'initproperty', property: '_-l4' },
  { label: 'item random seeding', methodId: 3229, start: 105, end: 110, operation: 'callpropvoid', property: '_-h2u' },
  { label: 'rules random seeding', methodId: 3229, start: 127, end: 131, operation: 'callpropvoid', property: '_-66b' },
  { label: 'rules construction', methodId: 3229, start: 137, end: 142, operation: 'callpropvoid', property: '_-Ga' },
  { label: 'level initialization', methodId: 3229, start: 160, end: 164, operation: 'callpropvoid', property: '_-l3c' },
  {
    label: 'replay entity creation begins',
    methodId: 3507,
    start: 338,
    end: 341,
    operation: 'getlex',
    property: '_-V4R',
  },
  {
    label: 'replay input snapshot construction',
    methodId: 3507,
    start: 645,
    end: 649,
    operation: 'constructprop',
    property: '_-O3Y',
  },
  { label: 'item generator seed', methodId: 4780, start: 9, end: 13, operation: 'callpropvoid', property: '_-66b' },
  {
    label: 'item generator first draw',
    methodId: 4780,
    start: 22,
    end: 26,
    operation: 'callproperty',
    property: '_-H2L',
  },
  {
    label: 'item generator second draw',
    methodId: 4780,
    start: 39,
    end: 43,
    operation: 'callproperty',
    property: '_-H2L',
  },
  { label: 'random seed expansion constant', methodId: 1797, start: 57, end: 60, operation: 'pushuint' },
  { label: 'random output tempering constant', methodId: 1799, start: 148, end: 151, operation: 'pushuint' },
  { label: 'random output transition', methodId: 1799, start: 262, end: 266, operation: 'getproperty' },
  { label: 'combat power selection', methodId: 1535, start: 296, end: 300, operation: 'getproperty', property: '_-l4' },
  { label: 'companion scheduling', methodId: 1692, start: 402, end: 406, operation: 'getproperty', property: '_-l4' },
  { label: 'ColorPlatforms selection', methodId: 6869, start: 88, end: 92, operation: 'getproperty', property: '_-l4' },
]
const verifiedSites = sites.map((site) => {
  instructionAt(site)
  return { label: site.label, methodId: site.methodId, bytePc: `${site.start}-${site.end}` }
})
const seedMultiplierSite = sites.find((site) => site.label === 'random seed expansion constant')
const temperingMaskSite = sites.find((site) => site.label === 'random output tempering constant')
if (!seedMultiplierSite || !temperingMaskSite) throw new VerificationError('Random constant sites missing')
const seedMultiplier = instructionAt(seedMultiplierSite)
const temperingMask = instructionAt(temperingMaskSite)
if ((seedMultiplier.params[0] as number) >>> 0 !== 1_812_433_253) {
  throw new VerificationError('Random seed multiplier mismatch')
}
if ((temperingMask.params[0] as number) >>> 0 !== 0xda44_2d24) {
  throw new VerificationError('Random output tempering mask mismatch')
}

const readerRestore = instructionAt(sites[1])
const seedMultiname = readerRestore.params[0]
const seedMultinameIndex = multinames.indexOf(seedMultiname) + 1
if (seedMultinameIndex !== 18_206) throw new VerificationError('seed trait multiname mismatch')

const declarations: Array<{ classIndex: number; className: string }> = []
for (let classIndex = 0; classIndex < abc.instance.length; classIndex++) {
  for (const trait of abc.instance[classIndex].trait) {
    if (multinames[trait.name - 1] !== seedMultiname) continue
    declarations.push({
      classIndex,
      className: multinameName(multinames[abc.instance[classIndex].name - 1], strings),
    })
  }
}
if (
  JSON.stringify(declarations) !==
  JSON.stringify([
    { classIndex: 164, className: '_-u16' },
    { classIndex: 356, className: '_-E4h' },
  ])
) {
  throw new VerificationError('seed trait declaration closure mismatch')
}

const directReferences: Array<{
  methodId: number
  owner: string
  bytePc: string
  operation: string
}> = []
for (const method of methods.values()) {
  for (const instruction of method.instructions) {
    if (!instruction.params.some((parameter) => parameter === seedMultiname)) continue
    const owner = owners.get(method.methodId)
    directReferences.push({
      methodId: method.methodId,
      owner: owner ? `${owner.className}.${owner.traitName}` : 'unowned',
      bytePc: `${instruction.start}-${instruction.end}`,
      operation: instruction.name,
    })
  }
}
const directReferenceKey = directReferences.map(
  (reference) => `${reference.methodId}:${reference.bytePc}:${reference.operation}`,
)
const expectedDirectReferenceKey = [
  '1535:296-300:getproperty',
  '1692:402-406:getproperty',
  '3229:80-84:findproperty',
  '3229:85-89:initproperty',
  '3229:97-101:findproperty',
  '3229:101-105:getproperty',
  '3229:119-123:findproperty',
  '3229:123-127:getproperty',
  '3272:63-67:getproperty',
  '3282:350-354:findproperty',
  '3282:354-358:getproperty',
  '3514:168-172:findproperty',
  '3514:172-176:getproperty',
  '6510:728-732:findproperty',
  '6510:734-738:initproperty',
  '6869:88-92:getproperty',
]
if (JSON.stringify(directReferenceKey) !== JSON.stringify(expectedDirectReferenceKey)) {
  throw new VerificationError('seed trait exact-xref closure mismatch')
}

const typeName = (index: number): string => multinameName(multinames[index - 1], strings)
function verifyRandomField(classIndex: number): void {
  const trait = abc.instance[classIndex].trait.find(
    (candidate: any) => typeName(candidate.name) === '_-p38' && typeName(candidate.data?.type_name) === 'Random',
  )
  if (!trait) throw new VerificationError(`class ${classIndex} Random field mismatch`)
}
verifyRandomField(253)
verifyRandomField(382)
const globalRandomClassIndex = abc.instance.findIndex((instance: any) => typeName(instance.name) === '_-f0')
const defaultSeedSource = abc.class[globalRandomClassIndex]?.traits.find(
  (candidate: any) => typeName(candidate.name) === '_-01W' && typeName(candidate.data?.type_name) === 'Random',
)
if (!defaultSeedSource) throw new VerificationError('default match-seed Random source mismatch')

const seedMethod = methods.get(1797)
const nextMethod = methods.get(1799)
if (!seedMethod || !nextMethod) throw new VerificationError('Random methods missing')
const requiredSeedOperations = ['bitand', 'urshift', 'bitxor', 'multiply_i', 'add_i']
const requiredNextOperations = ['lshift', 'urshift', 'bitand', 'bitxor', 'add_i']
for (const operation of requiredSeedOperations) {
  if (!seedMethod.instructions.some((instruction) => instruction.name === operation)) {
    throw new VerificationError(`Random seed operation ${operation} missing`)
  }
}
for (const operation of requiredNextOperations) {
  if (!nextMethod.instructions.some((instruction) => instruction.name === operation)) {
    throw new VerificationError(`Random output operation ${operation} missing`)
  }
}

const vectors = [0, 1, 255, 256, 0xffff_ffff].map((seed) => ({
  seed,
  firstFourOutputs: randomOutputs(seed, 4),
}))
if (JSON.stringify(vectors[0].firstFourOutputs) !== JSON.stringify(vectors[3].firstFourOutputs)) {
  throw new VerificationError('controlled low-byte seed collision vector mismatch')
}

process.stdout.write(
  `${JSON.stringify(
    {
      status: 'header-seed-proven',
      source: {
        build: EXPECTED_BUILD,
        abcSha256: sha256,
        decodedBodies: methods.size,
        branchTargets: 'valid',
      },
      seedTrait: {
        multinameIndex: seedMultinameIndex,
        name: '_-l4',
        declarations,
        exactReferenceCount: directReferences.length,
        directReferences,
      },
      verifiedSites,
      seedTargets: [
        { classIndex: 253, className: '_-61q', field: '_-p38', type: 'Random', role: 'item spawning' },
        { classIndex: 382, className: '_-a1B', field: '_-p38', type: 'Random', role: 'rules and modes' },
      ],
      controlledRandomVectors: vectors,
    },
    null,
    2,
  )}\n`,
)
