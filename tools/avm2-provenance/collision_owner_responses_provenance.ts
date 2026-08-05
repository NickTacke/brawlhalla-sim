import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { className: string; traitName: string; static: boolean }
type ExpectedMethod = MethodOwner & { params: string[]; returnType: string; sha256: string }
type FlagExpectation = { qname: string; value: number; references: number; ledgerSha256: string }
type CompositionPart = { label: keyof typeof FLAGS; getlexPc: number; propertyPc: number; orPc?: number }
type CompositionExpectation = {
  name: string
  base?: { pc: number; value: number; convertPc: number }
  parts: CompositionPart[]
  namePc: number
  callPc: number
  value: number
}

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
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

const EXPECTED_METHODS: Record<number, ExpectedMethod> = {
  850: {
    className: '_-n2S',
    traitName: '_-W3S',
    static: true,
    params: [],
    returnType: 'void',
    sha256: '744e079cf2bb07d6a9597d4af2a0874dfb57a71f3782772dd87fffd0c5b984ff',
  },
  1390: {
    className: '_-91W',
    traitName: '_-K2O',
    static: false,
    params: ['int', 'Number', 'Number', 'Point', 'Point', '_-L3i', 'Point', 'Point', 'uint', 'uint', 'int', 'uint', ''],
    returnType: '_-L3i',
    sha256: '5c53868fc7375d4f7881d55491ab1cae00b2c6a46375731a9ba9275f161189d0',
  },
  1641: {
    className: 'Companion',
    traitName: '_-D38',
    static: false,
    params: ['uint'],
    returnType: 'void',
    sha256: '6c29696a6b6f5adacf42c50e9d25a1d2808cc5c6658dd68305bedcefdf11a361',
  },
  2887: {
    className: '_-V4R',
    traitName: '_-D38',
    static: false,
    params: ['uint'],
    returnType: 'void',
    sha256: 'd8c08bf1331469d072566e21fba6f3c0ea2cebf8a41ae0b2182ea278781911a0',
  },
  2894: {
    className: '_-V4R',
    traitName: '_-84O',
    static: false,
    params: ['uint'],
    returnType: 'void',
    sha256: 'cbd989707ff3331917144c298f01009c6e750b1a4268709b40fd6b9577386098',
  },
  2980: {
    className: '_-V4R',
    traitName: '_-rj',
    static: false,
    params: ['uint'],
    returnType: 'void',
    sha256: 'dc09cee63fa626dd825bee7a86cb13c9ed5b8cf4494d922690852cfceb48f153',
  },
  2987: {
    className: '_-V4R',
    traitName: '_-F53',
    static: false,
    params: [],
    returnType: 'Boolean',
    sha256: '4e06e369706358e396f98e6b1535247ef7996cf3612b52701836a868f8bba480',
  },
  2988: {
    className: '_-V4R',
    traitName: '_-zO',
    static: false,
    params: ['uint', 'Boolean', 'Boolean', 'Boolean'],
    returnType: 'Boolean',
    sha256: '2cf5c8d9e7d00cb932ea8fcd12f7d3ae468d55ee314c43ab6f98070546cc7be0',
  },
  3018: {
    className: '_-V4R',
    traitName: '_-N4f',
    static: false,
    params: ['uint', 'Boolean', '_-L3i'],
    returnType: 'Boolean',
    sha256: '358b6d1db3afd71e1f21e39e192b5a0e00547bba49abb4f95e7b3d477058e850',
  },
  3053: {
    className: '_-V4R',
    traitName: '_-7G',
    static: false,
    params: ['uint', '_-L3i'],
    returnType: 'void',
    sha256: '2afad8af61b227fa2d17b6ee15cec1dd4ec7b9b8627bf5e6131aa17db0667c5b',
  },
  3605: {
    className: '_-I13',
    traitName: '_-C2j',
    static: false,
    params: ['uint', '_-V4R', 'Number', 'Number', 'uint', 'uint'],
    returnType: 'void',
    sha256: '1de20b33735fd4cd68ba143a3efc52ee1546604799fb42bdac8b8fcb1d3c69c6',
  },
  4027: {
    className: '_-M6j',
    traitName: '_-F2Q',
    static: false,
    params: ['uint'],
    returnType: 'Class',
    sha256: '45e326120389d9ed7a02aaa9f3136349b3e3a4b566231f8b21e2ce87e986e3e7',
  },
  7240: {
    className: '_-04B',
    traitName: '_-W1I',
    static: false,
    params: ['uint'],
    returnType: 'void',
    sha256: '6888afe68cda0912df6d12cc235ff15bfad87358950446a75160841d4048212b',
  },
  3217: {
    className: '_-u16',
    traitName: '_-z3z',
    static: false,
    params: [],
    returnType: 'Boolean',
    sha256: 'fa38584982aecca898b7dd153da870c49e039b4d4ab952510f97c3720df19308',
  },
  14909: {
    className: '_-N4u',
    traitName: 'init',
    static: false,
    params: [],
    returnType: 'void',
    sha256: 'ed4d7791d2db819e7c24676fd6fd0652cb571718d0907322c4cdea217f1f606e',
  },
}

const EXPECTED_VOCABULARY_INITIALIZER = {
  methodId: 5156,
  scriptIndex: 279,
  params: [] as string[],
  returnType: 'void',
  sha256: '9c7d0ac1afbd23acfb7e024364c0226f8b31b027f66b91e5046e1d3b95ef10a4',
}

const FLAGS = {
  hard: {
    qname: '36:36022',
    value: 1,
    references: 1,
    ledgerSha256: 'b50646445fbc0547435c3c8e0328c450e0e88fa3e6f775408e0e3974b4a021bb',
  },
  soft: {
    qname: '36:36938',
    value: 2,
    references: 1,
    ledgerSha256: 'b0094587946600a58f1ce23368ff4d647789b99062e2aa7062dd438eaf379633',
  },
  trigger: {
    qname: '36:30389',
    value: 4,
    references: 1,
    ledgerSha256: '3a11ce3ba2e533b5dc37cfc3fffcaae80505bdf47c9ff251b05e71a56e975178',
  },
  sticky: {
    qname: '36:33085',
    value: 8,
    references: 4,
    ledgerSha256: '4a680a18ea99064fc061cac20db735f36135f9c5244ad7f4c4d681beabbfec55',
  },
  noSlide: {
    qname: '36:33658',
    value: 16,
    references: 17,
    ledgerSha256: '4f86de48af37b911338b53bdfece630f260739e13e6abe8e4d68a2856afb510b',
  },
  itemIgnore: {
    qname: '36:26139',
    value: 32,
    references: 11,
    ledgerSha256: '8124727624a44433ccc4db21d9bfea43057a604d4616d9efc698fa7e8581a8b6',
  },
  bounce: {
    qname: '36:32220',
    value: 64,
    references: 6,
    ledgerSha256: '08cbb152c1fcd82a6e804ceaae6029bb6be41bb083551597023b38df81f0b3ef',
  },
  gameModeMud: {
    qname: '36:15725',
    value: 128,
    references: 13,
    ledgerSha256: '8b2b24067f91cdc1df7548f32ff265903a4403b2903bdd79d980f7d9458d15d0',
  },
  pressurePlate: {
    qname: '36:1738',
    value: 256,
    references: 6,
    ledgerSha256: '96771beb1003099c3c452e4deed4b916173135e4db998f469e21270c9e81c8b0',
  },
  lava: {
    qname: '36:9869',
    value: 512,
    references: 19,
    ledgerSha256: '0b018fd422833616df32d45f1a7f79d47bdda8ca83c0b031a08dfba931ab61e8',
  },
  ice: {
    qname: '36:16415',
    value: 1024,
    references: 1,
    ledgerSha256: 'b61fc11c32c7b11e26142630e8011c257de81e9956b9bc0587c94aadcc603b6f',
  },
} satisfies Record<string, FlagExpectation>

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
    if (instruction.name !== 'lookupswitch') continue
    const offsets = [instruction.params[0], ...(Array.isArray(instruction.params[2]) ? instruction.params[2] : [])]
    for (const entry of offsets) {
      const offset = Array.isArray(entry) ? entry[1] : entry
      if (typeof offset !== 'number' || !boundaries.has(instruction.pc + offset)) errors.push(`PC ${instruction.pc}`)
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
    owners.set(abc.instance[classIndex].iinit, { className, traitName: '<iinit>', static: false })
    owners.set(abc.class[classIndex].cinit, { className, traitName: '<cinit>', static: true })
    for (const group of [
      { traits: abc.instance[classIndex].trait ?? [], static: false },
      { traits: abc.class[classIndex].traits ?? [], static: true },
    ]) {
      for (const trait of group.traits) {
        if (trait.data?.method === undefined) continue
        owners.set(trait.data.method, { className, traitName: nameAt(trait.name), static: group.static })
      }
    }
  }
  return owners
}

const abcPath = argument('--abc')
assert(abcPath, 'usage: bun collision_owner_responses_provenance.ts --abc <main.abc>')
const abcBytes = readFileSync(resolve(abcPath))
const abcSha256 = sha256(new Uint8Array(abcBytes))
assert(abcSha256 === EXPECTED_ABC_SHA256, `ABC SHA-256 mismatch: ${abcSha256}`)
const abc: any = AbcFile.read(new ExtendedBuffer(abcBytes))
const strings = abc.constant_pool.string as string[]
const buildStrings = strings.filter((value) => /^\d+\.\d+\.\d+$/.test(value))
assert(buildStrings.length === 1 && buildStrings[0] === EXPECTED_BUILD, 'ABC build mismatch')
assert(abc.method_body.length === EXPECTED_BODY_COUNT, `expected ${EXPECTED_BODY_COUNT} method bodies`)

const disassembler = new InstructionDisassembler(abc)
const methods = new Map<number, LocatedInstruction[]>()
const methodHashes = new Map<number, string>()
const branchErrors: string[] = []
for (const body of abc.method_body) {
  const decoded = disassembler.disassemble(body) as Instruction[]
  const located = locateInstructions(body.code, decoded)
  methods.set(body.method, located)
  methodHashes.set(body.method, sha256(JSON.stringify(decoded)))
  branchErrors.push(...validateBranches(located, body.code.length).map((pc) => `method ${body.method} ${pc}`))
}
assert(branchErrors.length === 0, `invalid branch targets: ${branchErrors.slice(0, 10).join(', ')}`)

const owners = buildOwners(abc, strings)
const typeName = (index: number): string => multinameName(abc.constant_pool.multiname[index - 1], strings)
for (const [methodText, expected] of Object.entries(EXPECTED_METHODS)) {
  const methodId = Number(methodText)
  const owner = owners.get(methodId)
  assert(owner, `method ${methodId} lacks an owner`)
  assert(
    JSON.stringify(owner) ===
      JSON.stringify({ className: expected.className, traitName: expected.traitName, static: expected.static }),
    `method ${methodId} owner drift`,
  )
  assert(
    JSON.stringify(abc.method[methodId].param_type.map(typeName)) === JSON.stringify(expected.params),
    `method ${methodId} parameter drift`,
  )
  assert(typeName(abc.method[methodId].return_type) === expected.returnType, `method ${methodId} return drift`)
  assert(methodHashes.get(methodId) === expected.sha256, `method ${methodId} body drift`)
}
assert(
  abc.script[EXPECTED_VOCABULARY_INITIALIZER.scriptIndex]?.init === EXPECTED_VOCABULARY_INITIALIZER.methodId,
  'collision vocabulary script initializer drift',
)
assert(
  JSON.stringify(abc.method[EXPECTED_VOCABULARY_INITIALIZER.methodId].param_type.map(typeName)) ===
    JSON.stringify(EXPECTED_VOCABULARY_INITIALIZER.params),
  'collision vocabulary initializer parameter drift',
)
assert(
  typeName(abc.method[EXPECTED_VOCABULARY_INITIALIZER.methodId].return_type) ===
    EXPECTED_VOCABULARY_INITIALIZER.returnType,
  'collision vocabulary initializer return drift',
)
assert(
  methodHashes.get(EXPECTED_VOCABULARY_INITIALIZER.methodId) === EXPECTED_VOCABULARY_INITIALIZER.sha256,
  'collision vocabulary initializer body drift',
)

function requireAt(methodId: number, pc: number, opcode: string, propertyName?: string): LocatedInstruction {
  const instruction = methods.get(methodId)?.find((candidate) => candidate.pc === pc)
  assert(instruction, `method ${methodId} lacks PC ${pc}`)
  assert(instruction.name === opcode, `method ${methodId} PC ${pc} is not ${opcode}`)
  if (propertyName !== undefined)
    assert(
      multinameName(instruction.params[0], strings) === propertyName,
      `method ${methodId} PC ${pc} does not name ${propertyName}`,
    )
  return instruction
}
function requireLiteralAt(methodId: number, pc: number, opcode: string, value: unknown): void {
  const instruction = requireAt(methodId, pc, opcode)
  assert(instruction.params[0] === value, `method ${methodId} PC ${pc} literal drift`)
}
function requireBranchTarget(methodId: number, pc: number, opcode: string, targetPc: number): void {
  const instruction = requireAt(methodId, pc, opcode)
  const offset = instruction.params[0]
  assert(typeof offset === 'number', `method ${methodId} PC ${pc} branch offset is not numeric`)
  assert(instruction.endPc + offset === targetPc, `method ${methodId} PC ${pc} branch target drift`)
}
function requireCallAt(
  methodId: number,
  pc: number,
  opcode: 'callproperty' | 'callpropvoid',
  propertyName: string,
  arity: number,
): void {
  const instruction = requireAt(methodId, pc, opcode, propertyName)
  assert(instruction.params[1] === arity, `method ${methodId} PC ${pc} call arity drift`)
}

const flagLedgers: Record<string, { references: number; sha256: string }> = {}
for (const [label, expected] of Object.entries(FLAGS)) {
  const rows: string[] = []
  for (const [methodId, instructions] of methods) {
    const owner = owners.get(methodId)
    const ownerName = owner ? `${owner.static ? 'static ' : ''}${owner.className}.${owner.traitName}` : '?'
    for (const instruction of instructions) {
      if (qnameKey(instruction.params[0]) === expected.qname)
        rows.push(`${methodId}\0${ownerName}\0${instruction.pc}\0${instruction.name}\n`)
    }
  }
  const digest = sha256(rows.join(''))
  assert(rows.length === expected.references, `${label} reference count drift`)
  assert(digest === expected.ledgerSha256, `${label} reference ledger drift: ${digest}`)
  flagLedgers[label] = { references: rows.length, sha256: digest }
}

const shiftedInitializers: Array<{
  label: keyof typeof FLAGS
  getlexPc: number
  basePc: number
  shift?: number
  shiftPc?: number
  lshiftPc?: number
  convertPc: number
  initPc: number
  propertyName: string
}> = [
  { label: 'sticky', getlexPc: 12128, basePc: 12131, convertPc: 12133, initPc: 12134, propertyName: '_-uW' },
  {
    label: 'noSlide',
    getlexPc: 12137,
    basePc: 12140,
    shift: 1,
    shiftPc: 12143,
    lshiftPc: 12145,
    convertPc: 12146,
    initPc: 12147,
    propertyName: '_-zM',
  },
  {
    label: 'itemIgnore',
    getlexPc: 12150,
    basePc: 12153,
    shift: 2,
    shiftPc: 12156,
    lshiftPc: 12158,
    convertPc: 12159,
    initPc: 12160,
    propertyName: '_-l3j',
  },
  {
    label: 'bounce',
    getlexPc: 12163,
    basePc: 12166,
    shift: 3,
    shiftPc: 12169,
    lshiftPc: 12171,
    convertPc: 12172,
    initPc: 12173,
    propertyName: '_-r2u',
  },
  {
    label: 'gameModeMud',
    getlexPc: 12177,
    basePc: 12180,
    shift: 4,
    shiftPc: 12183,
    lshiftPc: 12185,
    convertPc: 12186,
    initPc: 12187,
    propertyName: '_-U5E',
  },
  {
    label: 'pressurePlate',
    getlexPc: 12191,
    basePc: 12194,
    shift: 5,
    shiftPc: 12197,
    lshiftPc: 12199,
    convertPc: 12200,
    initPc: 12201,
    propertyName: '_-93C',
  },
  {
    label: 'lava',
    getlexPc: 12205,
    basePc: 12208,
    shift: 6,
    shiftPc: 12211,
    lshiftPc: 12213,
    convertPc: 12214,
    initPc: 12215,
    propertyName: '_-J5i',
  },
  {
    label: 'ice',
    getlexPc: 12218,
    basePc: 12221,
    shift: 7,
    shiftPc: 12224,
    lshiftPc: 12226,
    convertPc: 12227,
    initPc: 12228,
    propertyName: '_-X2Q',
  },
]
for (const initializer of shiftedInitializers) {
  requireAt(14909, initializer.getlexPc, 'getlex', '_-X2i')
  requireLiteralAt(14909, initializer.basePc, 'pushbyte', 8)
  let value = 8
  if (initializer.shift !== undefined && initializer.shiftPc !== undefined && initializer.lshiftPc !== undefined) {
    requireLiteralAt(14909, initializer.shiftPc, 'pushbyte', initializer.shift)
    requireAt(14909, initializer.lshiftPc, 'lshift')
    value = (value << initializer.shift) >>> 0
  }
  requireAt(14909, initializer.convertPc, 'convert_u')
  requireAt(14909, initializer.initPc, 'initproperty', initializer.propertyName)
  assert(FLAGS[initializer.label].value === value, `${initializer.label} derived initializer value drift`)
}
const baseInitializers: Array<{
  label: 'hard' | 'soft' | 'trigger'
  getlexPc: number
  valuePc: number
  convertPc: number
  initPc: number
  propertyName: string
}> = [
  { label: 'hard', getlexPc: 12232, valuePc: 12235, convertPc: 12237, initPc: 12238, propertyName: '_-42Y' },
  { label: 'soft', getlexPc: 12242, valuePc: 12245, convertPc: 12247, initPc: 12248, propertyName: '_-33F' },
  { label: 'trigger', getlexPc: 12252, valuePc: 12255, convertPc: 12257, initPc: 12258, propertyName: '_-OI' },
]
for (const initializer of baseInitializers) {
  requireAt(14909, initializer.getlexPc, 'getlex', '_-X2i')
  requireLiteralAt(14909, initializer.valuePc, 'pushbyte', FLAGS[initializer.label].value)
  requireAt(14909, initializer.convertPc, 'convert_u')
  requireAt(14909, initializer.initPc, 'initproperty', initializer.propertyName)
}

const compositions: CompositionExpectation[] = [
  { name: 'SoftCollision', base: { pc: 7, value: 2, convertPc: 9 }, parts: [], namePc: 10, callPc: 13, value: 2 },
  { name: 'HardCollision', base: { pc: 24, value: 1, convertPc: 26 }, parts: [], namePc: 27, callPc: 30, value: 1 },
  { name: 'TriggerCollision', base: { pc: 41, value: 4, convertPc: 43 }, parts: [], namePc: 44, callPc: 47, value: 4 },
  {
    name: 'StickyCollision',
    base: { pc: 58, value: 1, convertPc: 60 },
    parts: [{ label: 'sticky', getlexPc: 61, propertyPc: 64, orPc: 67 }],
    namePc: 68,
    callPc: 72,
    value: 9,
  },
  {
    name: 'NoSlideCollision',
    base: { pc: 82, value: 1, convertPc: 84 },
    parts: [{ label: 'noSlide', getlexPc: 85, propertyPc: 88, orPc: 91 }],
    namePc: 92,
    callPc: 95,
    value: 17,
  },
  {
    name: 'ItemIgnoreCollision',
    base: { pc: 106, value: 1, convertPc: 108 },
    parts: [
      { label: 'itemIgnore', getlexPc: 109, propertyPc: 112, orPc: 115 },
      { label: 'noSlide', getlexPc: 116, propertyPc: 119, orPc: 122 },
    ],
    namePc: 123,
    callPc: 127,
    value: 49,
  },
  {
    name: 'BouncyHardCollision',
    base: { pc: 138, value: 1, convertPc: 140 },
    parts: [{ label: 'bounce', getlexPc: 141, propertyPc: 144, orPc: 148 }],
    namePc: 149,
    callPc: 152,
    value: 65,
  },
  {
    name: 'BouncySoftCollision',
    base: { pc: 162, value: 2, convertPc: 164 },
    parts: [{ label: 'bounce', getlexPc: 165, propertyPc: 168, orPc: 172 }],
    namePc: 173,
    callPc: 176,
    value: 66,
  },
  {
    name: 'GameModeHardCollision',
    base: { pc: 186, value: 1, convertPc: 188 },
    parts: [{ label: 'gameModeMud', getlexPc: 189, propertyPc: 192, orPc: 196 }],
    namePc: 197,
    callPc: 201,
    value: 129,
  },
  {
    name: 'PressurePlateCollision',
    base: { pc: 212, value: 1, convertPc: 214 },
    parts: [{ label: 'pressurePlate', getlexPc: 215, propertyPc: 218, orPc: 222 }],
    namePc: 223,
    callPc: 226,
    value: 257,
  },
  {
    name: 'SoftPressurePlateCollision',
    base: { pc: 237, value: 2, convertPc: 239 },
    parts: [{ label: 'pressurePlate', getlexPc: 240, propertyPc: 243, orPc: 247 }],
    namePc: 248,
    callPc: 251,
    value: 258,
  },
  {
    name: 'BouncyNoSlideCollision',
    base: { pc: 261, value: 1, convertPc: 263 },
    parts: [
      { label: 'noSlide', getlexPc: 264, propertyPc: 267, orPc: 270 },
      { label: 'bounce', getlexPc: 271, propertyPc: 274, orPc: 278 },
    ],
    namePc: 279,
    callPc: 283,
    value: 81,
  },
  {
    name: 'LavaCollision',
    base: { pc: 294, value: 1, convertPc: 296 },
    parts: [
      { label: 'lava', getlexPc: 297, propertyPc: 300, orPc: 303 },
      { label: 'gameModeMud', getlexPc: 304, propertyPc: 307, orPc: 311 },
      { label: 'noSlide', getlexPc: 312, propertyPc: 315, orPc: 318 },
    ],
    namePc: 319,
    callPc: 323,
    value: 657,
  },
  {
    name: 'MudCollision',
    parts: [{ label: 'gameModeMud', getlexPc: 334, propertyPc: 337 }],
    namePc: 341,
    callPc: 345,
    value: 128,
  },
]
for (const composition of compositions) {
  let value = 0
  if (composition.base) {
    requireLiteralAt(850, composition.base.pc, 'pushbyte', composition.base.value)
    requireAt(850, composition.base.convertPc, 'convert_u')
    value = composition.base.value
  }
  for (const part of composition.parts) {
    requireAt(850, part.getlexPc, 'getlex', '_-X2i')
    const property = requireAt(850, part.propertyPc, 'getproperty')
    assert(qnameKey(property.params[0]) === FLAGS[part.label].qname, `${composition.name} flag QName drift`)
    if (part.orPc !== undefined) requireAt(850, part.orPc, 'bitor')
    value |= FLAGS[part.label].value
  }
  assert(value === composition.value, `${composition.name} derived value drift`)
  requireLiteralAt(850, composition.namePc, 'pushstring', composition.name)
  requireCallAt(850, composition.callPc, 'callpropvoid', '_-Ah', 3)
}

// Query mask, exclusion, and selected owner-response dataflow anchors.
assert(requireAt(1390, 164, 'getlocal').params[0] === 16, 'method 1390 candidate local drift')
requireAt(1390, 166, 'getproperty', 'type')
assert(requireAt(1390, 170, 'getlocal').params[0] === 9, 'method 1390 query-mask parameter drift')
requireAt(1390, 172, 'bitand')
requireLiteralAt(1390, 173, 'pushbyte', 0)
requireAt(1390, 175, 'equals')
requireBranchTarget(1390, 176, 'iffalse', 184)
requireBranchTarget(1390, 180, 'jump', 1119)
assert(requireAt(1390, 228, 'getlocal').params[0] === 16, 'method 1390 exclusion candidate local drift')
requireAt(1390, 230, 'getproperty', 'type')
assert(requireAt(1390, 234, 'getlocal').params[0] === 12, 'method 1390 excluded-mask parameter drift')
requireAt(1390, 236, 'bitand')
requireLiteralAt(1390, 237, 'pushbyte', 0)
requireAt(1390, 239, 'equals')
requireAt(1390, 240, 'not')
requireBranchTarget(1390, 241, 'iffalse', 249)
requireBranchTarget(1390, 245, 'jump', 1119)
for (const pc of [1405, 4796, 4902, 5510, 5686, 5792, 6562, 6667]) {
  requireAt(14750, pc, 'getproperty', '_-l3j')
  requireCallAt(14750, pc + 8, pc === 5510 ? 'callpropvoid' : 'callproperty', '_-K2O', 13)
}

// Both typed owner methods require the current uint tick, test sticky contact, initialize tick + 5000,
// retain the timestamp while it exceeds the current tick, and perform their distinct active/expiry writes.
requireAt(1641, 5176, 'findproperty', '_-328')
requireAt(1641, 5179, 'getproperty', '_-328')
requireBranchTarget(1641, 5182, 'iffalse', 5209)
requireAt(1641, 5187, 'findproperty', '_-32b')
requireAt(1641, 5190, 'getproperty', '_-32b')
requireAt(1641, 5193, 'getproperty', 'type')
requireAt(1641, 5197, 'getlex', '_-X2i')
requireAt(1641, 5200, 'getproperty', '_-uW')
requireAt(1641, 5203, 'bitand')
requireLiteralAt(1641, 5204, 'pushbyte', 0)
requireAt(1641, 5206, 'equals')
requireAt(1641, 5207, 'not')
requireBranchTarget(1641, 5209, 'iffalse', 5295)
requireAt(1641, 5213, 'findproperty', '_-k3T')
requireAt(1641, 5217, 'getproperty', '_-k3T')
requireLiteralAt(1641, 5221, 'pushbyte', 0)
requireAt(1641, 5223, 'equals')
requireBranchTarget(1641, 5224, 'iffalse', 5246)
requireAt(1641, 5228, 'findproperty', '_-k3T')
requireAt(1641, 5232, 'getlocal_1')
requireLiteralAt(1641, 5233, 'pushdouble', 5000)
requireAt(1641, 5236, 'add_i')
requireAt(1641, 5237, 'convert_u')
requireAt(1641, 5238, 'initproperty', '_-k3T')
requireAt(1641, 5246, 'findproperty', '_-k3T')
requireAt(1641, 5250, 'getproperty', '_-k3T')
requireAt(1641, 5254, 'getlocal_1')
requireAt(1641, 5255, 'greaterthan')
requireBranchTarget(1641, 5256, 'iffalse', 5274)
requireAt(1641, 5260, 'findproperty', '_-93B')
requireLiteralAt(1641, 5264, 'pushbyte', 0)
requireAt(1641, 5266, 'initproperty', '_-93B')
requireAt(1641, 5274, 'findproperty', '_-328')
requireAt(1641, 5277, 'pushfalse')
requireAt(1641, 5278, 'initproperty', '_-328')
requireAt(1641, 5281, 'findproperty', '_-k3T')
requireLiteralAt(1641, 5285, 'pushbyte', 0)
requireAt(1641, 5287, 'initproperty', '_-k3T')

requireAt(2887, 11726, 'findproperty', '_-328')
requireAt(2887, 11729, 'getproperty', '_-328')
requireBranchTarget(2887, 11732, 'iffalse', 11759)
requireAt(2887, 11737, 'findproperty', '_-32b')
requireAt(2887, 11740, 'getproperty', '_-32b')
requireAt(2887, 11743, 'getproperty', 'type')
requireAt(2887, 11747, 'getlex', '_-X2i')
requireAt(2887, 11750, 'getproperty', '_-uW')
requireAt(2887, 11753, 'bitand')
requireLiteralAt(2887, 11754, 'pushbyte', 0)
requireAt(2887, 11756, 'equals')
requireAt(2887, 11757, 'not')
requireBranchTarget(2887, 11759, 'iffalse', 11855)
requireAt(2887, 11763, 'findproperty', '_-k3T')
requireAt(2887, 11767, 'getproperty', '_-k3T')
requireLiteralAt(2887, 11771, 'pushbyte', 0)
requireAt(2887, 11773, 'equals')
requireBranchTarget(2887, 11774, 'iffalse', 11796)
requireAt(2887, 11778, 'findproperty', '_-k3T')
requireAt(2887, 11782, 'getlocal_1')
requireLiteralAt(2887, 11783, 'pushdouble', 5000)
requireAt(2887, 11786, 'add_i')
requireAt(2887, 11787, 'convert_u')
requireAt(2887, 11788, 'initproperty', '_-k3T')
requireAt(2887, 11796, 'findproperty', '_-k3T')
requireAt(2887, 11800, 'getproperty', '_-k3T')
requireAt(2887, 11804, 'getlocal_1')
requireAt(2887, 11805, 'greaterthan')
requireBranchTarget(2887, 11806, 'iffalse', 11834)
requireAt(2887, 11810, 'findproperty', '_-V1I')
requireAt(2887, 11813, 'getproperty', '_-V1I')
requireAt(2887, 11816, 'findproperty', '_-30')
requireAt(2887, 11820, 'getproperty', '_-30')
requireLiteralAt(2887, 11824, 'pushbyte', 0)
requireCallAt(2887, 11826, 'callpropvoid', '_-G1Q', 2)
requireAt(2887, 11834, 'findproperty', '_-328')
requireAt(2887, 11837, 'pushfalse')
requireAt(2887, 11838, 'initproperty', '_-328')
requireAt(2887, 11841, 'findproperty', '_-k3T')
requireLiteralAt(2887, 11845, 'pushbyte', 0)
requireAt(2887, 11847, 'initproperty', '_-k3T')

requireAt(2887, 12217, 'getproperty', '_-zM')
requireLiteralAt(2887, 12243, 'pushbyte', 0)
requireCallAt(2887, 12245, 'callpropvoid', '_-G1Q', 2)
requireAt(3053, 236, 'getproperty', '_-r2u')
requireLiteralAt(3053, 249, 'pushdouble', 0.9)
requireAt(3053, 363, 'initproperty', 'x')
requireAt(3053, 393, 'initproperty', 'y')

const gameModeCalls: Array<{
  getlexPc: number
  bitPc: number
  findCallPc: number
  tickPc: number
  booleanPc: number
  booleanOpcode: 'pushfalse' | 'pushtrue'
  callPc: number
}> = [
  {
    getlexPc: 3730,
    bitPc: 3733,
    findCallPc: 3746,
    tickPc: 3749,
    booleanPc: 3750,
    booleanOpcode: 'pushfalse',
    callPc: 3751,
  },
  {
    getlexPc: 9301,
    bitPc: 9304,
    findCallPc: 9319,
    tickPc: 9322,
    booleanPc: 9323,
    booleanOpcode: 'pushtrue',
    callPc: 9324,
  },
  {
    getlexPc: 10729,
    bitPc: 10732,
    findCallPc: 10746,
    tickPc: 10749,
    booleanPc: 10750,
    booleanOpcode: 'pushtrue',
    callPc: 10751,
  },
]
for (const call of gameModeCalls) {
  requireAt(2887, call.getlexPc, 'getlex', '_-X2i')
  requireAt(2887, call.bitPc, 'getproperty', '_-U5E')
  requireAt(2887, call.findCallPc, 'findproperty', '_-N4f')
  requireAt(2887, call.tickPc, 'getlocal_1')
  requireAt(2887, call.booleanPc, call.booleanOpcode)
  requireCallAt(2887, call.callPc, 'callproperty', '_-N4f', 2)
}

for (const pc of [3799, 12119, 12884]) requireAt(2887, pc, 'getproperty', '_-93C')
const pressureCallbacks = [
  { receiverPcs: [3832, 3835, 3838, 3841, 3844], tickPc: 3873, thisPc: 3874, callPc: 3875 },
  { receiverPcs: [12133, 12136, 12139, 12142, 12145], tickPc: 12149, thisPc: 12150, callPc: 12151 },
]
for (const callback of pressureCallbacks) {
  const [findContext, context, modeState, modeOwner, receiver] = callback.receiverPcs
  requireAt(2887, findContext, 'findproperty', '_-Z2h')
  requireAt(2887, context, 'getproperty', '_-Z2h')
  requireAt(2887, modeState, 'getproperty', '_-d3F')
  requireAt(2887, modeOwner, 'getproperty', '_-x1V')
  requireAt(2887, receiver, 'getproperty', '_-56t')
  requireAt(2887, callback.tickPc, 'getlocal_1')
  requireAt(2887, callback.thisPc, 'getlocal_0')
  requireCallAt(2887, callback.callPc, 'callpropvoid', '_-s4y', 2)
}

requireAt(3605, 543, 'findproperty', '_-Z2h')
requireAt(3605, 546, 'getproperty', '_-Z2h')
requireAt(3605, 549, 'getproperty', '_-gs')
requireAt(3605, 552, 'getproperty', '_-61s')
requireAt(3605, 555, 'getlex', 'ScoringType')
requireAt(3605, 559, 'getproperty', 'RING')
requireBranchTarget(3605, 562, 'ifne', 576)
assert(requireAt(3605, 581, 'getlocal').params[0] === 5, 'method 3605 Ring collision local drift')
requireAt(3605, 583, 'getlex', '_-X2i')
requireAt(3605, 586, 'getproperty', '_-U5E')
requireAt(3605, 590, 'bitand')
requireLiteralAt(3605, 591, 'pushbyte', 0)
requireAt(3605, 593, 'equals')
requireAt(3605, 594, 'not')
requireBranchTarget(3605, 596, 'iffalse', 857)
requireAt(3605, 600, 'getlocal_2')
requireAt(3605, 601, 'getproperty', '_-G1m')
requireAt(3605, 605, 'getlocal_2')
requireAt(3605, 606, 'getproperty', '_-V2Q')
requireAt(3605, 609, 'add_i')
requireAt(3605, 611, 'getlocal_1')
requireLiteralAt(3605, 612, 'pushuint', 560)
requireAt(3605, 614, 'add_i')
requireAt(3605, 616, 'lessthan')
requireBranchTarget(3605, 617, 'iffalse', 649)
requireAt(3605, 621, 'getlocal_2')
requireLiteralAt(3605, 622, 'pushuint', 560)
requireAt(3605, 624, 'initproperty', '_-G1m')
requireAt(3605, 628, 'getlocal_2')
requireAt(3605, 629, 'getlocal_1')
requireAt(3605, 630, 'initproperty', '_-V2Q')
requireAt(3605, 633, 'getlocal_2')
requireAt(3605, 634, 'getproperty', '_-65M')
requireLiteralAt(3605, 637, 'pushbyte', 0)
requireAt(3605, 639, 'equals')
requireBranchTarget(3605, 640, 'iffalse', 649)
requireAt(3605, 644, 'getlocal_2')
requireAt(3605, 645, 'getlocal_1')
requireAt(3605, 646, 'initproperty', '_-65M')

const lavaMethod = abc.method[3018]
assert(lavaMethod.flags === 8, 'method 3018 optional-parameter flag drift')
assert(
  JSON.stringify(lavaMethod.options?.option) === JSON.stringify([{ val: 0, kind: 0 }]),
  'method 3018 optional undefined default drift',
)
requireAt(3018, 629, 'getlocal_3')
requireAt(3018, 630, 'getproperty', 'type')
requireAt(3018, 634, 'getlex', '_-X2i')
requireAt(3018, 637, 'getproperty', '_-J5i')
requireAt(3018, 640, 'bitand')
requireLiteralAt(3018, 641, 'pushbyte', 0)
requireAt(3018, 643, 'equals')
requireAt(3018, 644, 'not')
requireBranchTarget(3018, 645, 'iffalse', 983)
requireAt(3018, 688, 'getlex', 'PowerType')
requireAt(3018, 691, 'getlocal_3')
requireAt(3018, 692, 'getproperty', '_-KF')
requireCallAt(3018, 696, 'callproperty', '_-51i', 1)
requireAt(3018, 701, 'coerce', 'PowerType')
requireAt(3018, 704, 'coerce', 'PowerType')
assert(requireAt(3018, 707, 'setlocal').params[0] === 9, 'method 3018 PowerType output local drift')

requireLiteralAt(5156, 305, 'pushstring', 'IceCollision')
requireAt(5156, 308, 'initproperty', '_-J4b')

const phaseAnchors = {
  movingWorld: requireAt(3217, 2642, 'callpropvoid', '_-W1I').pc,
  fighterEntry: requireAt(3217, 2738, 'callpropvoid', '_-84O').pc,
  fighterResponses: requireAt(2894, 578, 'callpropvoid', '_-D38').pc,
}
assert(phaseAnchors.movingWorld < phaseAnchors.fighterEntry, 'moving-world/fighter phase order drift')

const familyClosure = {
  fighters: 'bounded response fragments only',
  companions: 'bounded sticky/no-slide fragments only',
  items: 'unavailable',
  projectiles: 'unavailable',
  bots: 'unavailable',
  modeLogic: 'bounded callbacks and ring-mode fragment only',
}
const unavailable = [
  'hard response closure for every owner family',
  'soft response closure for every owner family',
  'trigger response closure for every owner family',
  'sticky response closure outside cited fighter and companion paths',
  'no-slide response closure outside cited owner-specific paths',
  'item-ignore intent and response closure beyond eight direct exclusion arguments',
  'bounce response closure outside method 3053',
  'game-mode and mud parameter/state-machine closure',
  'pressure-plate activation, release, debounce, and team closure',
  'lava damage, knockback, immunity, cooldown, and ownership closure',
  'ice consumers: exact QName has no reference beyond initialization',
  'complete replay-producing owner reachability and trusted interpreted-reference traces',
]

process.stdout.write(
  `${JSON.stringify(
    {
      status: 'acceptance-not-met',
      verdict:
        'bounded static owner-response fragments are reproducible; universal owner-family composite responses remain unavailable',
      identity: { build: EXPECTED_BUILD, abcSha256, decodedMethodBodies: methods.size, branchTargetsValid: true },
      methodHashes: {
        ...Object.fromEntries(Object.entries(EXPECTED_METHODS).map(([id, method]) => [id, method.sha256])),
        [EXPECTED_VOCABULARY_INITIALIZER.methodId]: EXPECTED_VOCABULARY_INITIALIZER.sha256,
      },
      flagLedgers,
      values: Object.fromEntries(Object.entries(FLAGS).map(([label, flag]) => [label, flag.value])),
      compositionValues: Object.fromEntries(compositions.map((composition) => [composition.name, composition.value])),
      optionalDefaults: {
        method3018Parameter3: { abcKind: 0, abcValue: 0, meaning: 'undefined' },
      },
      phaseAnchors,
      provenFragments: {
        query: 'method 1390 applies positive queryMask and excludedTypeMask before intersection',
        itemIgnore: 'eight method-14750 sites load bit 32 directly into 13-argument collision queries',
        sticky:
          'fighter and companion paths initialize current uint tick + 5000 and later compare against current tick',
        bounce: 'method 3053 selects 0.9 for the bit-64 branch and later writes scratch point x/y components',
        gameMode: 'fighter method 2887 calls uint/Boolean response method _-N4f after bit 128 tests',
        pressurePlate: 'fighter method 2887 passes its uint parameter and this to _-s4y after bit 256 tests',
        lava: 'method 3018 receives an optional collision segment, reads _-KF, and resolves a PowerType',
        ringMode: 'method 3605 tests bit 128 under ScoringType.RING and writes 560 plus the uint tick to owner state',
        ice: 'recognized bit 1024 has no exact-QName consumer in the complete ABC',
      },
      familyClosure,
      acceptance: {
        everyRequestedFamilyClosedForEveryOwnerFamily: false,
        authoritativeUniversalPhaseOrder: false,
        trustedRuntimeAgreement: false,
      },
      unavailable,
    },
    null,
    2,
  )}\n`,
)
