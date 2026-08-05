import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

import { parse } from '../../packages/replay-format/src/parser.js'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }
type ReferenceEntry = {
  methodId: number
  owner: MethodOwner | null
  references: Array<{ pc: number; opcode: string }>
}
type Manifest = {
  target: { patch: string; build: string; replayFormat: number }
  coverage: { fixtureCount: number }
  fixtures: Array<{ file: string; sha256: string; byteLength: number; formatVersion: number }>
}

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_MANIFEST_SHA256 = 'b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac'
const EXPECTED_TARGET_FLAG_LEDGER = 'b59997e12cca0cf9acc404aa36fa7db9257e0a637188a097718674e61d7db4df'
const EXPECTED_MODE_MASK_LEDGER = '7bf5b5bc4e23c6492dadbf8944ab3a2b630b31fd4fec7425d43aa0da5a3cbd86'
const EXPECTED_PRODUCER_LEDGER = '63e5da8f86d74c04073dcc004149f457bd7080e8fa65affac1cfb38f017ebaf7'
const EXPECTED_WRITER_LEDGER = 'ab76ff66a2dfbb2dd2649a110199eb30e8e3a364a0c2134aece1d3e6c00673bf'
const EXPECTED_BRIDGE_LEDGER = '5d9c839966a84821fb11b3ae06f784c57d137d69cb5b5a8391b0dd2be2c9bcd7'
const EXPECTED_RELEVANT_METHOD_LEDGER = 'd2e35ecca74db214cf734c7bca61109546134c8006b5dcb15bb8c58ac98d07ce'
const CLASSIFICATION_MASK = 0x0c808002
const PREFILTER_MASK = 0x0c000000
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

function parseManifest(bytes: Buffer): Manifest {
  try {
    return JSON.parse(bytes.toString('utf8')) as Manifest
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`invalid manifest JSON: ${message}`)
  }
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
const manifestPath = argument('--manifest')
assert(
  abcPath && manifestPath,
  'usage: bun special_mode_writer_reachability_provenance.ts --abc <main.abc> --manifest <manifest.json>',
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
const owners = buildOwners(abc, strings)

function requireAt(methodId: number, pc: number, opcode: string, name?: string, value?: number): LocatedInstruction {
  const instruction = methods.get(methodId)?.find((candidate) => candidate.pc === pc)
  assert(instruction, `method ${methodId} lacks PC ${pc}`)
  assert(instruction.name === opcode, `method ${methodId} PC ${pc} is not ${opcode}`)
  if (name !== undefined) {
    const actual =
      instruction.name === 'pushstring' ? instruction.params[0] : multinameName(instruction.params[0], strings)
    assert(actual === name, `method ${methodId} PC ${pc} does not name ${name}`)
  }
  if (value !== undefined) assert(instruction.params[0] === value, `method ${methodId} PC ${pc} value changed`)
  return instruction
}

function exactReferencesForQName(key: string): ReferenceEntry[] {
  return [...methods.entries()]
    .map(([methodId, instructions]) => ({
      methodId,
      owner: owners.get(methodId) ?? null,
      references: instructions.flatMap((instruction) =>
        qnameKey(instruction.params[0]) === key ? [{ pc: instruction.pc, opcode: instruction.name }] : [],
      ),
    }))
    .filter((entry) => entry.references.length > 0)
}

function findClass(className: string): { classIndex: number; instance: any; staticClass: any } {
  const matches = abc.instance
    .map((instance: any, classIndex: number) => ({ classIndex, instance, staticClass: abc.class[classIndex] }))
    .filter(({ instance }: any) => multinameName(abc.constant_pool.multiname[instance.name - 1], strings) === className)
  assert(matches.length === 1, `expected one ${className} class`)
  return matches[0]
}

function traitQName(className: string, traitName: string, staticTrait: boolean): string {
  const owner = findClass(className)
  const traits = staticTrait ? owner.staticClass.traits : owner.instance.trait
  const matches = traits.filter(
    (trait: any) => multinameName(abc.constant_pool.multiname[trait.name - 1], strings) === traitName,
  )
  assert(matches.length === 1, `expected one ${className}.${traitName} trait`)
  const key = qnameKey(abc.constant_pool.multiname[matches[0].name - 1])
  assert(key, `${className}.${traitName} does not have an exact QName`)
  return key
}

function methodQName(methodId: number): string {
  const matches = abc.instance.flatMap((instance: any, classIndex: number) =>
    [
      ...(instance.trait ?? []).map((trait: any) => ({ trait, classIndex })),
      ...(abc.class[classIndex].traits ?? []).map((trait: any) => ({ trait, classIndex })),
    ].filter(({ trait }) => trait.data?.method === methodId),
  )
  assert(matches.length === 1, `expected one trait for method ${methodId}`)
  const key = qnameKey(abc.constant_pool.multiname[matches[0].trait.name - 1])
  assert(key, `method ${methodId} does not have an exact QName`)
  return key
}

function requireExactQNameAt(methodId: number, pc: number, opcode: string, expectedQName: string): void {
  const instruction = requireAt(methodId, pc, opcode)
  assert(qnameKey(instruction.params[0]) === expectedQName, `method ${methodId} PC ${pc} exact QName changed`)
}

const componentValues = new Map<string, number>([
  ['_-a50', 0x00000002],
  ['_-F43', 0x00000020],
  ['_-K2', 0x00002000],
  ['_-X5N', 0x00004000],
  ['_-J4K', 0x00020000],
  ['_-R5d', 0x20000000],
  ['_-sE', 0x00800000],
  ['_-b3N', 0x04000000],
  ['_-2O', 0x08000000],
  ['_-P1j', 0x00008000],
])
const componentAnchors = new Map<string, [number, number]>([
  ['_-a50', [951, 953]],
  ['_-F43', [986, 988]],
  ['_-K2', [1055, 1057]],
  ['_-X5N', [1063, 1065]],
  ['_-J4K', [1088, 1090]],
  ['_-P1j', [1072, 1074]],
  ['_-sE', [1140, 1142]],
  ['_-b3N', [1167, 1170]],
  ['_-2O', [1176, 1178]],
  ['_-R5d', [1194, 1196]],
])
for (const [name, value] of componentValues) {
  const anchor = componentAnchors.get(name)
  assert(anchor, `missing component anchor for ${name}`)
  requireAt(3074, anchor[0], value < 0x80 ? 'pushbyte' : 'pushint', undefined, value)
  requireAt(3074, anchor[1], 'initproperty', name)
}

const hordeComponents = ['_-F43', '_-a50', '_-K2', '_-X5N', '_-J4K']
const zombieComponents = [...hordeComponents, '_-R5d']
const hordeMask = hordeComponents.reduce((mask, name) => mask | (componentValues.get(name) ?? 0), 0) >>> 0
const zombieMask = zombieComponents.reduce((mask, name) => mask | (componentValues.get(name) ?? 0), 0) >>> 0
assert(hordeMask === 0x00026022, 'Horde mode mask changed')
assert(zombieMask === 0x20026022, 'Zombie mode mask changed')
assert((hordeMask & CLASSIFICATION_MASK) !== 0 && (hordeMask & PREFILTER_MASK) === 0, 'Horde mask disposition changed')
assert(
  (zombieMask & CLASSIFICATION_MASK) !== 0 && (zombieMask & PREFILTER_MASK) === 0,
  'Zombie mask disposition changed',
)

for (const [pc, name] of [
  [61815, '_-S3K'],
  [61818, '_-V4R'],
  [61824, '_-V4R'],
  [61831, '_-V4R'],
  [61838, '_-V4R'],
  [61846, '_-V4R'],
] as const)
  requireAt(14909, pc, 'getlex', name)
for (const [pc, name] of [
  [61821, '_-F43'],
  [61827, '_-a50'],
  [61834, '_-K2'],
  [61841, '_-X5N'],
  [61849, '_-J4K'],
] as const)
  requireAt(14909, pc, 'getproperty', name)
requireAt(14909, 61854, 'initproperty', '_-V18')
for (const pc of [61830, 61837, 61845, 61853]) requireAt(14909, pc, 'bitor')
for (const [pc, name] of [
  [62115, '_-n4L'],
  [62119, '_-V4R'],
  [62125, '_-V4R'],
  [62132, '_-V4R'],
  [62139, '_-V4R'],
  [62147, '_-V4R'],
  [62155, '_-V4R'],
] as const)
  requireAt(14909, pc, 'getlex', name)
for (const [pc, name] of [
  [62122, '_-F43'],
  [62128, '_-a50'],
  [62135, '_-K2'],
  [62142, '_-X5N'],
  [62150, '_-J4K'],
  [62158, '_-R5d'],
] as const)
  requireAt(14909, pc, 'getproperty', name)
requireAt(14909, 62163, 'initproperty', '_-K4c')
for (const pc of [62131, 62138, 62146, 62154, 62162]) requireAt(14909, pc, 'bitor')

requireAt(6937, 350, 'getproperty', 'HORDE')
requireAt(6937, 361, 'findpropstrict', '_-S3K')
requireAt(6937, 370, 'constructprop', '_-S3K')
requireAt(6937, 739, 'getproperty', 'ZOMBIE')
requireAt(6937, 750, 'findpropstrict', '_-n4L')
requireAt(6937, 760, 'constructprop', '_-n4L')

const addFighterQName = methodQName(3528)
const matchVectorQName = traitQName('_-u16', '_-Y1k', false)

requireAt(6926, 329, 'getproperty', '_-V18')
requireAt(6926, 358, 'callproperty', '_-HT')
requireExactQNameAt(6926, 383, 'callpropvoid', addFighterQName)
requireAt(6926, 397, 'callpropvoid', '_-S3l')
requireAt(6927, 39, 'getproperty', '_-56G')
requireAt(6927, 45, 'getproperty', '_-V18')
requireAt(6927, 49, 'bitor')
requireAt(6927, 50, 'initproperty', '_-56G')

requireAt(7100, 223, 'getproperty', '_-K4c')
requireAt(7100, 252, 'callproperty', '_-HT')
requireExactQNameAt(7100, 302, 'callpropvoid', addFighterQName)
requireAt(7100, 342, 'getproperty', '_-56G')
requireAt(7100, 349, 'getproperty', '_-K4c')
requireAt(7100, 352, 'bitor')
requireAt(7100, 353, 'initproperty', '_-56G')
for (const methodId of [7095, 7101]) {
  requireAt(methodId, 2, 'getproperty', '_-56G')
  requireAt(methodId, 9, 'getproperty', '_-K4c')
  requireAt(methodId, 12, 'bitor')
  requireAt(methodId, 13, 'initproperty', '_-56G')
}

requireExactQNameAt(3528, 196, 'findproperty', matchVectorQName)
requireExactQNameAt(3528, 199, 'getproperty', matchVectorQName)
requireExactQNameAt(3528, 329, 'findproperty', matchVectorQName)
requireExactQNameAt(3528, 332, 'getproperty', matchVectorQName)
requireAt(3528, 336, 'callpropvoid', 'push')
requireAt(3282, 1793, 'getproperty', '_-JJ')
requireExactQNameAt(3282, 1799, 'getproperty', matchVectorQName)
requireAt(3282, 1808, 'callpropvoid', '_-L2J')
requireAt(3514, 1986, 'getproperty', '_-JJ')
requireExactQNameAt(3514, 1992, 'getproperty', matchVectorQName)
requireAt(3514, 2000, 'callpropvoid', '_-L2J')
requireAt(5257, 1201, 'getproperty', '_-JJ')
requireExactQNameAt(5257, 1210, 'getproperty', matchVectorQName)
requireAt(5257, 1215, 'callpropvoid', '_-L2J')
requireAt(7190, 941, 'callproperty', 'readUnsignedInt')
requireAt(7190, 946, 'convert_u')
requireAt(7190, 947, 'initproperty', '_-56G')
requireAt(3217, 1590, 'coerce', '_-M5S')
requireAt(3217, 1610, 'getlocal')
requireAt(3217, 1613, 'callpropvoid', '_-N1J')
for (const [pc, name] of [
  [257, '_-56G'],
  [263, '_-b3N'],
  [269, '_-2O'],
  [1264, '_-56G'],
  [1270, '_-a50'],
  [1276, '_-b3N'],
  [1283, '_-2O'],
  [1291, '_-P1j'],
  [1298, '_-sE'],
] as const)
  requireAt(6519, pc, 'getproperty', name)
requireAt(6519, 273, 'bitor')
requireAt(6519, 274, 'bitand')
requireAt(6519, 283, 'jump')
requireAt(6519, 1302, 'bitand')
requireAt(6519, 1321, 'callpropvoid', '_-PY')

const targetFlagReferences = Object.fromEntries(
  ['_-a50', '_-P1j', '_-sE', '_-b3N', '_-2O'].map((name) => [
    name,
    exactReferencesForQName(traitQName('_-V4R', name, true)),
  ]),
)
const modeMaskReferences = {
  horde: exactReferencesForQName(traitQName('_-S3K', '_-V18', true)),
  zombie: exactReferencesForQName(traitQName('_-n4L', '_-K4c', true)),
}
const producerReferences = Object.fromEntries(
  [6926, 6927, 7095, 7100, 7101, 7190].map((methodId) => [methodId, exactReferencesForQName(methodQName(methodId))]),
)
const writerReferences = exactReferencesForQName(methodQName(6519))
const bridgeReferences = {
  addFighter: exactReferencesForQName(addFighterQName),
  matchVector: exactReferencesForQName(matchVectorQName),
}
assert(
  JSON.stringify(writerReferences.map(({ methodId, references }) => ({ methodId, references }))) ===
    JSON.stringify([
      { methodId: 3282, references: [{ pc: 1808, opcode: 'callpropvoid' }] },
      { methodId: 3514, references: [{ pc: 2000, opcode: 'callpropvoid' }] },
      { methodId: 5257, references: [{ pc: 1215, opcode: 'callpropvoid' }] },
    ]),
  'writer callsite closure changed',
)
const relevantMethodIds = [
  3074, 3217, 3282, 3514, 3528, 5257, 3623, 6519, 6926, 6927, 6937, 7095, 7100, 7101, 7190, 14909,
]
const relevantMethods = relevantMethodIds.map((methodId) => ({
  methodId,
  instructions: methods.get(methodId)?.map(({ pc, name, params }) => ({
    pc,
    opcode: name,
    operands: params.map((param) => ({
      display: multinameName(param, strings) || param,
      exactQName: qnameKey(param),
    })),
  })),
}))
const ledgers = {
  targetFlagReferences: sha256(JSON.stringify(targetFlagReferences)),
  modeMaskReferences: sha256(JSON.stringify(modeMaskReferences)),
  producerReferences: sha256(JSON.stringify(producerReferences)),
  writerReferences: sha256(JSON.stringify(writerReferences)),
  bridgeReferences: sha256(JSON.stringify(bridgeReferences)),
  relevantMethods: sha256(JSON.stringify(relevantMethods)),
}
assert(ledgers.targetFlagReferences === EXPECTED_TARGET_FLAG_LEDGER, 'target-flag reference ledger changed')
assert(ledgers.modeMaskReferences === EXPECTED_MODE_MASK_LEDGER, 'mode-mask reference ledger changed')
assert(ledgers.producerReferences === EXPECTED_PRODUCER_LEDGER, 'producer reference ledger changed')
assert(ledgers.writerReferences === EXPECTED_WRITER_LEDGER, 'writer reference ledger changed')
assert(ledgers.bridgeReferences === EXPECTED_BRIDGE_LEDGER, 'bridge reference ledger changed')
assert(ledgers.relevantMethods === EXPECTED_RELEVANT_METHOD_LEDGER, 'relevant-method ledger changed')

const manifestBytes = readFileSync(resolve(manifestPath))
const manifestSha256 = sha256(new Uint8Array(manifestBytes))
assert(manifestSha256 === EXPECTED_MANIFEST_SHA256, `manifest SHA-256 mismatch: ${manifestSha256}`)
const manifest = parseManifest(manifestBytes)
assert(
  manifest.target.patch === '10.09' && manifest.target.build === EXPECTED_BUILD && manifest.target.replayFormat === 268,
  'manifest target changed',
)
assert(manifest.coverage.fixtureCount === 12 && manifest.fixtures.length === 12, 'reviewed fixture count changed')
let entityCount = 0
let positiveEntityCount = 0
const configurations = new Set<string>()
for (const fixture of manifest.fixtures) {
  const replayBytes = readFileSync(join(dirname(resolve(manifestPath)), fixture.file))
  assert(sha256(new Uint8Array(replayBytes)) === fixture.sha256, 'fixture SHA-256 mismatch')
  assert(replayBytes.length === fixture.byteLength, 'fixture byte length changed')
  const replay = parse(new Uint8Array(replayBytes))
  assert(replay.formatVersion === fixture.formatVersion && replay.formatVersion === 268, 'fixture format changed')
  entityCount += replay.entities.length
  positiveEntityCount += replay.entities.filter((entity) => entity.isBot).length
  configurations.add(
    JSON.stringify({
      playlistId: replay.playlistId,
      onlineGame: replay.onlineGame,
      gameSettings: replay.gameSettings,
      entityCount: replay.entities.length,
      teams: replay.entities.map((entity) => entity.team),
    }),
  )
}
assert(entityCount === 48, 'reviewed roster-record count changed')
assert(
  positiveEntityCount === 0,
  'reviewed corpus now contains a positive classification and requires attestation review',
)
assert(configurations.size === 1, 'reviewed configuration count changed')

const output = {
  status: 'bounded-static-positive-route-without-attestation',
  acceptanceMet: false,
  identity: {
    build: EXPECTED_BUILD,
    abcSha256,
    manifestSha256,
    decodedMethodBodies: abc.method_body.length,
    branchTargetsValid: true,
  },
  staticRoutes: {
    horde: {
      scoringType: 'HORDE',
      mask: `0x${hordeMask.toString(16).padStart(8, '0')}`,
      producerMethods: [6926, 6927],
      writerDisposition: 'classification true through _-a50; neither _-b3N nor _-2O is set',
    },
    zombie: {
      scoringType: 'ZOMBIE',
      mask: `0x${zombieMask.toString(16).padStart(8, '0')}`,
      producerMethods: [7095, 7100, 7101],
      writerDisposition: 'classification true through _-a50; neither _-b3N nor _-2O is set',
    },
    restoredTypeWord: {
      source: 'method 7190 reads an unrestricted uint and writes it to live fighter._-56G',
      tickRoute: 'method 3217 invokes method 7190 with an _-M5S state object and a live fighter',
      writerDisposition: 'a word containing _-a50, _-P1j, or _-sE without _-b3N or _-2O would serialize true',
    },
    sharedWriter:
      'mode-created fighters enter _-u16._-Y1k through method 3528; all three writer-6519 calls receive _-Y1k',
  },
  boundedNegativeClosure: {
    animationTarget:
      '_-sE has no exact named factory or mask producer; unrestricted method-7190 restoration can still introduce its numeric bit',
    ball: '_-b3N producers are removed by the writer prefilter',
    hordePartyBot: 'the separate method-3623 PartyBot aggregate includes _-2O and is removed by the writer prefilter',
    directNetworkFactoryFlags:
      'LinkUpdater method 5257 fixes factory flags to _-6c | _-76C; it does not pass a network type word',
    clone: 'Buddy method 3583 copies an existing type word and introduces no classification bit',
  },
  corpus: {
    fixtures: manifest.fixtures.length,
    configurations: configurations.size,
    rosterRecords: entityCount,
    positiveClassificationValues: positiveEntityCount,
  },
  blockers: [
    'No privacy-safe authentic format-268 replay in the reviewed corpus sets the classification bit.',
    'No authenticated interpreted-reference trace executes a Horde or Zombie positive producer and then writer 6519.',
    'No authenticated ordering trace shows whether unrestricted method-7190 restoration can precede or re-enter state-4 writing.',
    'Static reachability cannot attest that a positive entity remains live at the executed final write in a replay-producing match.',
  ],
  ledgers,
}

process.stdout.write(`${JSON.stringify(output, null, 2)}\n`)
