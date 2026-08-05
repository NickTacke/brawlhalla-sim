import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodIdentity = {
  codeByteLength: number
  instructionCount: number
  codeSha256: string
  semanticSha256: string
}
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }
type Trait = {
  name: number
  kind: number
  data?: { method?: number; type_name?: number }
}
type Multiname = {
  kind?: number
  data?: { name?: unknown; ns?: unknown; qname?: number; params?: number[] }
}
type ParsedAbc = AbcFile & {
  constant_pool: { string: string[]; multiname: Multiname[] }
  instance: Array<{ name: number; iinit: number; trait: Trait[] }>
  class: Array<{ cinit: number; traits: Trait[] }>
}

type Anchor = {
  label: string
  methodId: number
  pc: number
  opcode: string
  value?: string | number
}

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_DYNAMIC_SHA256 = 'cd54de039bc4e3441a7ae5811ef8748a719f49e0d4917016407d83b201ddf9c4'
const EXPECTED_SECTION_LEDGER = '263810dd34872df587c8139ac5a3f83faaff429fee18f072e142a7051efa1e24'
const EXPECTED_LEVEL_LEDGER = '60630e3860e64d2d04deda1075d6cdb0f89e37cfaffd2ed8134f3dde95bbad99'
const EXPECTED_FIELD_REFERENCE_LEDGER = '8ebfd747b934a51323d1a86cdb51ea51e5392b1d6ba05ec22c2c45e79171fd85'

const EXPECTED_CODE_HASHES: Record<number, string> = {
  849: '87f93bc5b0fcbd782427302b96c4d28a846faf1fd641ed8778d35ef013a2f1ef',
  5135: '48584a6933873185dd9990dec875b559343755281066972285580c205186e593',
  5143: 'd8a545e588557d2d6e5a70a3a4cbc4d91c74cfc020bb5eaddf562f2975042b9a',
  5144: '743d49997ce3d81e7d9a949413320bb9563b0b62ab50d157ad4af5f85c98e910',
  5149: 'e52007a83fe9dfb20ba08aa13f5ab2b3ff2cc4c2b080b76da61afcf98f5e0cea',
  5153: 'a4572e4b815f046761538d5fe90f04a5b1cd7aad11669cc181220a15695cf8e1',
  5156: '802d859e55945a5ac6c34f83ab998020139a5370ee50cfdee340c52879e0b65b',
  6543: 'f328fff365bacedf862b88212405d5c732afc8081505f864d05bd9314deb065f',
  6554: '316c5601dc1f4d85863152b752a55367eeeb8f270fa6b9866d4d1eff7dda479f',
  6555: '18ddfffde127219b3da28f9d5218bfda57aff9c97b809762c21f373115127e8a',
  15059: '4d98213d6beae5615ef33912698447ea3785dd3fe55f5dd6c74db25e3a9f53f7',
}

const EXPECTED_SEMANTIC_HASHES: Record<number, string> = {
  849: '77849cf8dc21c4f1d143763d459daab787d3cf15495525d35b158ac96c72213c',
  5135: '201a286271bef1f8f4adc8f448e28feb2ac3269c4e51177d1fc0c3ce4e587822',
  5143: 'fd0c14958e694a3199c79defb54b8354d6f09bf34db3761e8b5dd7303641cdb2',
  5144: 'f5d3f812ed8e2fc4e2478f68d30b65cbac6e56c95c3dbe280a5346bee284736b',
  5149: 'c1d0ab3654ea6e029ac07e3229d280ab807cd2ee9bf395f3d537e445de458e5c',
  5153: '9ef6579248454d91b873b93d8ad341c981b47805f45267c7e882d8839da786f5',
  5156: '9c7d0ac1afbd23acfb7e024364c0226f8b31b027f66b91e5046e1d3b95ef10a4',
  6554: '6ba30a2a8ee8d1d95fb35b1f97faff193cf02340b9ee2b119cb5870a1aa913a8',
  6555: '9aecd3c5f1e3b33c06d447814e06a9c805ec6f5f93a7903fddd55217822965e9',
  15059: '9b2321afb5ddaef20abeb8d0291fc156130e4ef537302afc92dbc5c7a99dffe8',
}

const EXPECTED_FIELDS: ReadonlyArray<readonly [string, string]> = [
  ['_-p4X', 'Boolean'],
  ['_-E31', 'Boolean'],
  ['_-CF', 'Boolean'],
  ['_-G16', 'Boolean'],
  ['_-83s', 'Vector.<WaveData>'],
  ['_-Q4o', '_-G3D'],
  ['_-v1D', 'Vector.<_-Z5m>'],
  ['_-IC', 'Vector.<_-V3v>'],
  ['_-a', 'Sprite'],
  ['_-nx', 'Vector.<String>'],
  ['_-v2T', 'Vector.<_-ut>'],
  ['_-P69', 'Number'],
  ['_-82g', 'int'],
  ['_-y5a', 'IMap'],
  ['_-95L', 'IMap'],
  ['_-3V', 'IMap'],
  ['_-x1X', 'IMap'],
  ['_-T2Q', 'IMap'],
  ['_-22i', 'Number'],
  ['_-g5A', 'Number'],
  ['_-B6q', 'Number'],
  ['_-u5C', 'Number'],
  ['_-O4X', 'IMap'],
  ['_-b1I', 'Vector.<_-V3v>'],
  ['_-T4W', 'Vector.<_-G3D>'],
  ['_-za', 'IMap'],
  ['_-O2r', 'String'],
  ['_-22x', 'Vector.<_-A6g>'],
  ['_-Z2h', '_-u16'],
]

const ANCHORS: Anchor[] = [
  { label: 'register LevelDesc root', methodId: 849, pc: 347, opcode: 'pushstring', value: 'LevelDesc' },
  { label: 'register exact callback', methodId: 849, pc: 355, opcode: 'getproperty', value: '_-06T' },
  { label: 'commit callback registration', methodId: 849, pc: 363, opcode: 'callpropvoid', value: '_-m1u' },
  { label: 'resource type read', methodId: 6561, pc: 52, opcode: 'getproperty', value: '_-L5H' },
  { label: 'SWZ resource token', methodId: 6561, pc: 55, opcode: 'pushstring', value: 'SWZ' },
  { label: 'SWZ extraction dispatch', methodId: 6561, pc: 66, opcode: 'callpropvoid', value: '_-W2H' },
  { label: 'native extraction input', methodId: 6554, pc: 41, opcode: 'getlex', value: 'ANE_RawData' },
  { label: 'native extraction output', methodId: 6554, pc: 174, opcode: 'callproperty', value: 'GetData' },
  { label: 'custom XML parse', methodId: 6554, pc: 343, opcode: 'callproperty', value: 'parse' },
  { label: 'root callback dispatch', methodId: 6554, pc: 450, opcode: 'callproperty', value: '_-71V' },
  { label: 'exact callback map', methodId: 6555, pc: 187, opcode: 'getproperty', value: '_-M2L' },
  { label: 'invoke root callback', methodId: 6555, pc: 296, opcode: 'call' },
  { label: 'read LevelName', methodId: 5153, pc: 12, opcode: 'pushstring', value: 'LevelName' },
  { label: 'reserved-name root overwrite', methodId: 5153, pc: 74, opcode: 'callpropvoid', value: 'setReserved' },
  { label: 'resolve selected level root', methodId: 5143, pc: 82, opcode: 'callproperty', value: '_-z2u' },
  { label: 'read AssetDir', methodId: 5143, pc: 223, opcode: 'pushstring', value: 'AssetDir' },
  { label: 'walk selected root', methodId: 5143, pc: 288, opcode: 'callpropvoid', value: '_-UQ' },
  { label: 'initialize NumFrames', methodId: 5135, pc: 203, opcode: 'pushstring', value: 'NumFrames' },
  { label: 'initialize SlowMult', methodId: 5135, pc: 534, opcode: 'pushstring', value: 'SlowMult' },
  { label: 'insert DynamicCollision map', methodId: 5135, pc: 1690, opcode: 'callpropvoid', value: 'set' },
  { label: 'final nested sizing pass', methodId: 5135, pc: 4732, opcode: 'callpropvoid', value: '_-l3m' },
  { label: 'manager post-load pass', methodId: 5070, pc: 178, opcode: 'callpropvoid', value: '_-I5S' },
  { label: 'post-load texture pass', methodId: 3388, pc: 165, opcode: 'callpropvoid', value: '_-qd' },
  {
    label: 'XML duplicate attribute error',
    methodId: 15059,
    pc: 1502,
    opcode: 'pushstring',
    value: 'Duplicate attribute [',
  },
  { label: 'XML required equals', methodId: 15059, pc: 1569, opcode: 'pushstring', value: 'Expected =' },
  { label: 'XML required double quote', methodId: 15059, pc: 1712, opcode: 'pushstring', value: 'Expected "' },
  { label: 'XML closing name validation', methodId: 15059, pc: 2582, opcode: 'pushstring', value: 'Expected </' },
  { label: 'XML unexpected end', methodId: 15059, pc: 4264, opcode: 'pushstring', value: 'Unexpected end' },
  { label: '5156 LevelDesc locator', methodId: 5156, pc: 53, opcode: 'pushstring', value: 'LevelDesc' },
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

function multinameDisplay(abc: ParsedAbc, index: number, strings: string[]): string {
  const multiname = abc.constant_pool.multiname[index - 1]
  if (!multiname) return ''
  if (multiname.kind === 29) {
    assert(typeof multiname.data?.qname === 'number', 'generic multiname lacks base type')
    const base = multinameDisplay(abc, multiname.data.qname, strings)
    const parameters = (multiname.data.params ?? []).map((parameter) => multinameDisplay(abc, parameter, strings))
    return `${base}.<${parameters.join(',')}>`
  }
  return multinameName(multiname, strings)
}

function qnameKey(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('kind' in value) || !('data' in value)) return null
  const candidate = value as { kind?: unknown; data?: { ns?: unknown; name?: unknown } }
  if (candidate.kind !== 7 || typeof candidate.data?.ns !== 'number' || typeof candidate.data.name !== 'number') {
    return null
  }
  return `${candidate.data.ns}:${candidate.data.name}`
}

function buildOwners(abc: ParsedAbc, strings: string[]): Map<number, MethodOwner> {
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

function rootTagAndAttributes(source: string): { tag: string; attributes: Map<string, string> } {
  const match = source.match(/^\s*<([A-Za-z0-9:._-]+)((?:[^"<>]|"[^"]*")*)>/s)
  assert(match, 'Dynamic section lacks a readable root tag')
  const attributes = new Map<string, string>()
  const attributePattern = /([A-Za-z0-9:._-]+)="([^"]*)"/g
  for (const attribute of match[2].matchAll(attributePattern)) {
    assert(!attributes.has(attribute[1]), `duplicate root attribute ${attribute[1]}`)
    attributes.set(attribute[1], attribute[2])
  }
  return { tag: match[1], attributes }
}

const abcPath = argument('--abc')
const dynamicPath = argument('--dynamic')
const sourceDirectory = argument('--source-dir')
assert(
  abcPath && dynamicPath && sourceDirectory,
  'usage: bun dynamic_leveldesc_loader_provenance.ts --abc <main.abc> --dynamic <Dynamic.swz> --source-dir <decrypted>',
)

const abcBytes = readFileSync(resolve(abcPath))
const abcSha256 = sha256(new Uint8Array(abcBytes))
assert(abcSha256 === EXPECTED_ABC_SHA256, `ABC SHA-256 mismatch: ${abcSha256}`)
const dynamicSha256 = sha256(new Uint8Array(readFileSync(resolve(dynamicPath))))
assert(dynamicSha256 === EXPECTED_DYNAMIC_SHA256, `Dynamic.swz SHA-256 mismatch: ${dynamicSha256}`)

const abc = AbcFile.read(new ExtendedBuffer(abcBytes)) as ParsedAbc
const strings = abc.constant_pool.string as string[]
const buildStrings = strings.filter((value) => /^\d+\.\d+\.\d+$/.test(value))
assert(buildStrings.length === 1 && buildStrings[0] === EXPECTED_BUILD, 'ABC build mismatch')

const disassembler = new InstructionDisassembler(abc)
const methods = new Map<number, LocatedInstruction[]>()
const identities: Record<number, MethodIdentity> = {}
const branchErrors: string[] = []
for (const body of abc.method_body) {
  const rawInstructions = disassembler.disassemble(body) as Instruction[]
  const code = Uint8Array.from(body.code)
  const instructions = locateInstructions(code, rawInstructions)
  methods.set(body.method, instructions)
  branchErrors.push(...validateBranches(instructions, code.byteLength).map((pc) => `method ${body.method} ${pc}`))
  if (EXPECTED_CODE_HASHES[body.method] || EXPECTED_SEMANTIC_HASHES[body.method]) {
    identities[body.method] = {
      codeByteLength: code.byteLength,
      instructionCount: instructions.length,
      codeSha256: sha256(code),
      semanticSha256: sha256(JSON.stringify(rawInstructions)),
    }
  }
}
assert(branchErrors.length === 0, `invalid branch targets: ${branchErrors.join(', ')}`)

for (const [methodIdText, expected] of Object.entries(EXPECTED_CODE_HASHES)) {
  const methodId = Number(methodIdText)
  assert(identities[methodId]?.codeSha256 === expected, `method ${methodId} code SHA-256 mismatch`)
}
for (const [methodIdText, expected] of Object.entries(EXPECTED_SEMANTIC_HASHES)) {
  const methodId = Number(methodIdText)
  assert(identities[methodId]?.semanticSha256 === expected, `method ${methodId} semantic SHA-256 mismatch`)
}

const anchorLedger = ANCHORS.map((anchor) => {
  const instruction = methods.get(anchor.methodId)?.find((candidate) => candidate.pc === anchor.pc)
  assert(instruction, `${anchor.label}: method ${anchor.methodId} lacks PC ${anchor.pc}`)
  assert(instruction.name === anchor.opcode, `${anchor.label}: opcode mismatch`)
  if (anchor.value !== undefined) {
    const actual =
      instruction.name === 'pushstring' ? instruction.params[0] : multinameName(instruction.params[0], strings)
    assert(actual === anchor.value, `${anchor.label}: value mismatch (${String(actual)})`)
  }
  return { ...anchor, instructionIndex: instruction.index }
})

const method5156 = methods.get(5156)
assert(method5156, 'method 5156 was not decoded')
const method5156Calls = method5156.filter((instruction) => instruction.name.startsWith('call'))
const method5156Constructs = method5156.filter(
  (instruction) => instruction.name === 'construct' || instruction.name === 'constructprop',
)
assert(method5156Calls.length === 0, 'method 5156 unexpectedly calls a method')
assert(method5156Constructs.length === 0, 'method 5156 unexpectedly constructs an object')
assert(
  method5156.filter((instruction) => instruction.name === 'pushstring').length === 175,
  'method 5156 string count changed',
)
assert(
  method5156.filter((instruction) => instruction.name === 'initproperty').length === 180,
  'method 5156 write count changed',
)

const owners = buildOwners(abc, strings)
assert(!owners.has(5156), 'method 5156 unexpectedly has a class-method owner')
assert(owners.get(5135)?.classIndex === 279 && owners.get(5135)?.traitName === '_-UQ', 'root walker owner changed')
assert(owners.get(5153)?.classIndex === 279 && owners.get(5153)?.static, 'root callback owner changed')
assert(owners.get(6554)?.classIndex === 359 && owners.get(6554)?.static, 'SWZ extractor owner changed')

const levelDescClass = abc.instance[279]
assert(multinameName(abc.constant_pool.multiname[levelDescClass.name - 1], strings) === '_-h5c', 'class 279 changed')
const dataTraits = levelDescClass.trait.flatMap((trait) =>
  (trait.kind & 0x0f) === 0 ? [trait as unknown as Trait] : [],
)
const actualFields = dataTraits.map((trait) => {
  assert(typeof trait.data?.type_name === 'number', 'LevelDesc field lacks a declared type')
  return [
    multinameName(abc.constant_pool.multiname[trait.name - 1], strings),
    multinameDisplay(abc, trait.data.type_name, strings),
  ]
})
assert(JSON.stringify(actualFields) === JSON.stringify(EXPECTED_FIELDS), 'LevelDesc 29-field declaration changed')

const fieldByQName = new Map(
  dataTraits.map((trait, index) => {
    const key = qnameKey(abc.constant_pool.multiname[trait.name - 1])
    assert(key, `field ${actualFields[index][0]} is not an exact QName`)
    return [key, actualFields[index]] as const
  }),
)
const fieldReferences = new Map(actualFields.map(([name]) => [name, [] as string[]]))
for (const body of abc.method_body) {
  for (const instruction of methods.get(body.method) ?? []) {
    const field = fieldByQName.get(qnameKey(instruction.params[0]) ?? '')
    if (!field) continue
    fieldReferences
      .get(field[0])
      ?.push(`${field[0]}\0${field[1]}\0${body.method}\0${instruction.pc}\0${instruction.name}\n`)
  }
}
const fieldReferenceLines = actualFields.flatMap(([name]) => fieldReferences.get(name) ?? [])
const fieldReferenceLedgerSha256 = sha256(fieldReferenceLines.join(''))
assert(fieldReferenceLedgerSha256 === EXPECTED_FIELD_REFERENCE_LEDGER, 'LevelDesc field-reference ledger changed')

const dynamicFiles = readdirSync(resolve(sourceDirectory))
  .flatMap((name) => {
    const match = name.match(/^Dynamic\.swz\.(\d+)\.xml$/)
    return match ? [{ name, ordinal: Number(match[1]) }] : []
  })
  .sort((left, right) => left.ordinal - right.ordinal)
assert(dynamicFiles.length === 186, `expected 186 Dynamic sections, found ${dynamicFiles.length}`)
assert(
  dynamicFiles.every((entry, index) => entry.ordinal === index),
  'Dynamic section ordinals are not contiguous 0-185',
)

const rootCounts = new Map<string, number>()
const rootAttributeCounts = new Map<string, number>()
const levelNames = new Set<string>()
const sectionLedgerLines: string[] = []
const levelLedgerLines: string[] = []
let adjacentAttributeSection = false
let rawAmpersandSection = false
for (const entry of dynamicFiles) {
  const bytes = readFileSync(join(resolve(sourceDirectory), entry.name))
  const source = bytes.toString('utf8')
  const leafSha256 = sha256(new Uint8Array(bytes))
  const root = rootTagAndAttributes(source)
  rootCounts.set(root.tag, (rootCounts.get(root.tag) ?? 0) + 1)
  const line = `${entry.ordinal}\0${bytes.byteLength}\0${leafSha256}\n`
  sectionLedgerLines.push(line)
  if (root.tag === 'LevelDesc') {
    levelLedgerLines.push(line)
    for (const attribute of root.attributes.keys()) {
      rootAttributeCounts.set(attribute, (rootAttributeCounts.get(attribute) ?? 0) + 1)
    }
    const levelName = root.attributes.get('LevelName')
    assert(levelName, `LevelDesc ordinal ${entry.ordinal} lacks LevelName`)
    assert(!levelNames.has(levelName), `duplicate shipped LevelName at ordinal ${entry.ordinal}`)
    levelNames.add(levelName)
  }
  if (entry.ordinal === 103) {
    assert(leafSha256 === '58af422cb81897f97c48dde88ccad73162271a86aacd970c18788c0241febc3e', 'ordinal 103 changed')
    adjacentAttributeSection = /"[A-Za-z0-9:._-]+="/.test(source)
  }
  if (entry.ordinal === 122) {
    assert(leafSha256 === 'aba7133c9c3c08afb7614aadd854669321ddb8485ef5c40bd77b136e7d4534e9', 'ordinal 122 changed')
    rawAmpersandSection = /&(?!#(?:x[0-9A-Fa-f]+|\d+);|[A-Za-z][A-Za-z0-9]+;)/.test(source)
  }
}

const sectionLedgerSha256 = sha256(sectionLedgerLines.join(''))
const levelLedgerSha256 = sha256(levelLedgerLines.join(''))
assert(sectionLedgerSha256 === EXPECTED_SECTION_LEDGER, 'Dynamic section ledger mismatch')
assert(levelLedgerSha256 === EXPECTED_LEVEL_LEDGER, 'Dynamic LevelDesc ledger mismatch')
assert(rootCounts.size === 2, 'unexpected Dynamic root class')
assert(rootCounts.get('LevelDesc') === 120, 'LevelDesc root count changed')
assert(rootCounts.get('CutsceneType') === 66, 'CutsceneType root count changed')
assert(levelNames.size === 120, 'LevelDesc LevelName uniqueness changed')
assert(
  JSON.stringify(Object.fromEntries(rootAttributeCounts)) ===
    JSON.stringify({ AssetDir: 120, LevelName: 120, NumFrames: 8, SlowMult: 8 }),
  'LevelDesc root attribute inventory changed',
)
assert(adjacentAttributeSection, 'expected adjacent-attribute source marker is absent')
assert(rawAmpersandSection, 'expected raw-ampersand source marker is absent')

process.stdout.write(
  `${JSON.stringify(
    {
      target: {
        build: EXPECTED_BUILD,
        abcSha256,
        dynamicSha256,
        decodedMethodBodies: abc.method_body.length,
        branchTargetsValid: true,
      },
      dynamicExtraction: {
        sectionCount: dynamicFiles.length,
        rootCounts: Object.fromEntries(rootCounts),
        uniqueLevelNames: levelNames.size,
        rootAttributeCounts: Object.fromEntries(rootAttributeCounts),
        sectionLedgerSha256,
        levelLedgerSha256,
        sourceSyntaxMarkers: {
          adjacentAttributes: adjacentAttributeSection,
          rawAmpersand: rawAmpersandSection,
        },
      },
      loader: {
        methodIdentities: identities,
        anchorLedger,
        chain: [849, 6561, 6554, 6555, 5153, 5143, 5135, 5070, 5144, 3388, 5127],
        duplicatePolicy: 'exact LevelName map overwrite; last callback wins; no duplicate diagnostic',
        falseLead5156: {
          owner: null,
          calls: method5156Calls.length,
          constructs: method5156Constructs.length,
          pushedStrings: 175,
          propertyInitializations: 180,
        },
      },
      levelDesc: {
        classIndex: 279,
        declaredInstanceFields: actualFields,
        fieldReferenceLedgerSha256,
      },
      blockers: [
        'complete malformed-input and entity grammar is not statically closed',
        'no trusted complete typed LevelDesc execution oracle exists',
        'nested object fields and every mutation branch are not field-for-field differential-tested',
        'native SWZ extraction ancestry is ledger-pinned but the native algorithm is not independently reversed',
      ],
      status: 'partial-static-proof',
    },
    null,
    2,
  )}\n`,
)
