import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }
type ReferenceLedger = Array<{
  methodId: number
  owner: MethodOwner | null
  references: Array<{ pc: number; opcode: string }>
}>

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_POWER_TYPES_SHA256 = '715468d8eda8fa2ec3d88a8b5395c076bec937640927909add4745eda2883f27'
const EXPECTED_POWER_RECORDS = 3671
const EXPECTED_POWER_COLUMNS = 182
const EXPECTED_SOURCE_LEDGER_SHA256 = '632a14fe257079a608271a3f6daabe85ea0f776555beda7ae23af3b6de0ab24a'
const EXPECTED_REFERENCE_LEDGER_SHA256: Record<string, string> = {
  minTimeBetweenHits: '17257565ce788c9f77089ccf9b57f7630769f81f2e16344254572e614cdade0a',
  inheritAlreadyHit: 'f935d99d67af9f74d03dd4cd79040ce7a0691fa816105550aa1a68291a21a6b2',
  isMultihit: 'ea649ee5a0acfc1bd580aa178e2f82ccd56968e71ccf79b1ec0fafba981ce199',
  specialCollectionOverride: '3fc826862eec0ee895561fcd4df73bee103f383e49209238d33e7dec9bb579ba',
  repeatedHitCollection: 'be9eadf3ad602d5bf3d881516493bbcd7313797c65f0ad65d2f6079c3659420e',
  repeatedHitKeys: 'deaade0745746156efbd4927472b023d700c599ad360862630d6447ea76b2a6e',
  repeatedHitValues: '35a076645af423ced0263835c19ec41946656dd0128307e58285f8ed0932f9ad',
  hitOccurred: '10a2c27570ab43a86cbdf31c1594be9183b05da4286bd4d451818f619981cdfa',
}
const EXPECTED_METHOD_SHA256: Record<number, string> = {
  39: '1dd5818b399b63456b227c0b33dd94c51efaba56a2fab752a3a56e8b48ac46e3',
  46: '6afb16ce220b29565fb1e188aa4e3ed6a6e7749b5fbbd1a6ac0d85977fb20679',
  77: '2c232d6b58dac47ae49bc498672fdc17b799bd0e740174258d33c079ba990508',
  92: 'fc80c8e1af359f020cc0adcce9db4c33a5755903e37f89209e6e07308596e138',
  94: 'aea2738411988a106ed57b806dcdc36f739503beea9e7942fd4efebdeb7650c2',
  95: '88768cbb71f3d00b3e15861620ef52bc5d1d03a11a3b5a83eeacdef0b16d5ba9',
  97: '2e17863cfc98c67ad77aed56868aebf6426276388166da1e6076400c5c96c96c',
  99: '6625a561f833960c2d9b24c25cb306922efea778b10d77ca84ea281b67a267ea',
  1474: '53e9d43d535500d42ed0f5fa30a5fef5d864427adcfecae7160708a901d2a84f',
  1484: '8946dcfe7cd438455bb5c031b247496ee70ae9f062f0c670f996dafe5575a39a',
  1497: '6166d0b5d595552d90863a1774e7aee762f260cd6661507bc895014824b0e50b',
  1538: '7c801f46d1a5ebc75b6359176d83135c20fbb3246bfd6c557044285c9ad696f0',
  1540: '938498a77cadca991e4a1b267af849c43002f024de6f0f31ae27ce6d81365126',
  1551: 'b821c000e172e6c72185d36e7e96f92a2e623a8396e1f22895bfdecc88de307a',
  2084: '9a495747862cbe328135becc04eb12cd8b1bc51c64f5997aa3a2c91afcb8408d',
  2893: '2e583bd59d7ca351e4a6add16e37960fd09d8d639e3b46ad62fc3f79a54cd34e',
  3217: '70556850f6978d726b987b138fc46ba1353d040aac22789bc2a81db1e5a4dd11',
  6294: 'c2ef2e714f35c02f98a72e5457d0b6036d54c2dca70bdba30181a7ee40781547',
  7233: 'bd46d87d4374111baf65300756ad8b0adc94a0d9264bbf4fea3235f611ae6366',
  7235: '1a71156cfe0f36328ef526fa7ea97be0f408c37f553f7c277c7af632b1a65c12',
}

const POWER_INSTANCE_CLASS = 4
const REPEATED_HIT_BASE_CLASS = 5
const POWER_TYPE_CLASS = 342
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
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"'
        index++
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''))
      rows.push(row)
      row = []
      field = ''
    } else field += char
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''))
    rows.push(row)
  }
  assert(!quoted, 'unterminated quoted CSV field')
  return rows
}
function multinameName(value: unknown, strings: string[]): string {
  if (!value || typeof value !== 'object' || !('data' in value)) return ''
  const name = (value as { data?: { name?: unknown } }).data?.name
  if (typeof name === 'number') return strings[name - 1] ?? ''
  return typeof name === 'string' ? name : ''
}
function multinameTypeName(abc: any, index: number, strings: string[]): string {
  const value = abc.constant_pool.multiname[index - 1]
  if (value?.kind !== 29) return multinameName(value, strings)
  const base = multinameName(abc.constant_pool.multiname[value.data.qname - 1], strings)
  const parameters = value.data.params.map((parameter: number) => multinameTypeName(abc, parameter, strings))
  return `${base}.<${parameters.join(', ')}>`
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
function instructionName(instruction: Instruction, strings: string[]): string {
  if (instruction.name === 'pushstring') return String(instruction.params[0] ?? '')
  return multinameName(instruction.params[0], strings)
}
function requireAt(
  methods: Map<number, LocatedInstruction[]>,
  strings: string[],
  methodId: number,
  instructionIndex: number,
  opcode: string,
  name?: string,
): { index: number; pc: number; opcode: string; name: string } {
  const instruction = methods.get(methodId)?.[instructionIndex]
  assert(instruction, `method ${methodId} lacks instruction ${instructionIndex}`)
  assert(instruction.name === opcode, `method ${methodId} instruction ${instructionIndex} is not ${opcode}`)
  const actualName = instructionName(instruction, strings)
  if (name !== undefined) {
    assert(actualName === name, `method ${methodId} instruction ${instructionIndex} does not name ${name}`)
  }
  return { index: instructionIndex, pc: instruction.pc, opcode, name: actualName }
}
function requireIntegerAt(
  methods: Map<number, LocatedInstruction[]>,
  methodId: number,
  instructionIndex: number,
  opcode: string,
  value: number,
): void {
  const instruction = methods.get(methodId)?.[instructionIndex]
  assert(instruction?.name === opcode, `method ${methodId} instruction ${instructionIndex} is not ${opcode}`)
  assert(
    instruction.params[0] === value,
    `method ${methodId} instruction ${instructionIndex} does not contain ${value}`,
  )
}
function branchTargetIndex(
  methods: Map<number, LocatedInstruction[]>,
  methodId: number,
  instructionIndex: number,
): number {
  const instructions = methods.get(methodId)
  const instruction = instructions?.[instructionIndex]
  const offset = instruction?.params[0]
  assert(
    instruction && BRANCHES.has(instruction.name),
    `method ${methodId} instruction ${instructionIndex} is not a branch`,
  )
  assert(typeof offset === 'number', `method ${methodId} instruction ${instructionIndex} has no numeric offset`)
  const targetPc = instruction.endPc + offset
  const target = instructions?.find((candidate) => candidate.pc === targetPc)
  assert(target, `method ${methodId} instruction ${instructionIndex} has no target at PC ${targetPc}`)
  return target.index
}
function assertTraitReferenceAt(
  abc: any,
  methods: Map<number, LocatedInstruction[]>,
  strings: string[],
  methodId: number,
  instructionIndex: number,
  classIndex: number,
  traitName: string,
): void {
  const traits = (abc.instance[classIndex].trait as any[]).filter(
    (trait) => multinameName(abc.constant_pool.multiname[trait.name - 1], strings) === traitName,
  )
  assert(traits.length === 1, `expected one class ${classIndex} ${traitName} trait`)
  const expectedQName = qnameKey(abc.constant_pool.multiname[traits[0].name - 1])
  const actualQName = qnameKey(methods.get(methodId)?.[instructionIndex]?.params[0])
  assert(
    expectedQName && actualQName === expectedQName,
    `method ${methodId} instruction ${instructionIndex} changed QName`,
  )
}
function exactReferences(
  methods: Map<number, LocatedInstruction[]>,
  owners: Map<number, MethodOwner>,
  qname: string,
): ReferenceLedger {
  return [...methods.entries()].flatMap(([methodId, instructions]) => {
    const references = instructions.flatMap((instruction) =>
      qnameKey(instruction.params[0]) === qname ? [{ pc: instruction.pc, opcode: instruction.name }] : [],
    )
    return references.length > 0 ? [{ methodId, owner: owners.get(methodId) ?? null, references }] : []
  })
}
function traitLedger(
  abc: any,
  methods: Map<number, LocatedInstruction[]>,
  owners: Map<number, MethodOwner>,
  strings: string[],
  classIndex: number,
  traitName: string,
): { type: string; sha256: string; references: ReferenceLedger } {
  const traits = (abc.instance[classIndex].trait as any[]).filter(
    (trait) => multinameName(abc.constant_pool.multiname[trait.name - 1], strings) === traitName,
  )
  assert(traits.length === 1, `expected one class ${classIndex} ${traitName} trait`)
  const trait = traits[0]
  const qname = qnameKey(abc.constant_pool.multiname[trait.name - 1])
  assert(qname, `${traitName} is not an exact QName`)
  const references = exactReferences(methods, owners, qname)
  return {
    type: multinameTypeName(abc, trait.data.type_name, strings),
    sha256: sha256(JSON.stringify(references)),
    references,
  }
}
function valuesByFrequency(rows: string[][], index: number): Record<string, number> {
  const counts = new Map<string, number>()
  for (const row of rows) counts.set(row[index], (counts.get(row[index]) ?? 0) + 1)
  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)))
}

const abcPath = argument('--abc')
const powerTypesPath = argument('--power-types')
assert(
  abcPath && powerTypesPath,
  'usage: bun repeated_hit_lifecycle_provenance.ts --abc <main.abc> --power-types <Game.swz.38.dat>',
)
const abcBytes = readFileSync(resolve(abcPath))
const powerBytes = readFileSync(resolve(powerTypesPath))
const identity = {
  abcSha256: sha256(new Uint8Array(abcBytes)),
  powerTypesSha256: sha256(new Uint8Array(powerBytes)),
}
assert(identity.abcSha256 === EXPECTED_ABC_SHA256, `ABC SHA-256 mismatch: ${identity.abcSha256}`)
assert(identity.powerTypesSha256 === EXPECTED_POWER_TYPES_SHA256, 'PowerTypes SHA-256 mismatch')

const csv = parseCsv(powerBytes.toString('utf8'))
assert(csv[0]?.length === 1 && csv[0][0] === 'powerTypes', 'PowerTypes marker mismatch')
const header = csv[1]
const rows = csv.slice(2)
assert(header.length === EXPECTED_POWER_COLUMNS, `PowerTypes column count is ${header.length}`)
assert(rows.length === EXPECTED_POWER_RECORDS, `PowerTypes record count is ${rows.length}`)
assert(
  rows.every((row) => row.length === header.length),
  'PowerTypes row width mismatch',
)
const column = (name: string): number => {
  const index = header.indexOf(name)
  assert(index !== -1, `missing column ${name}`)
  return index
}
const sourceFields = ['PowerName', 'IsMultihit', 'MinTimeBetweenHits', 'InheritAlreadyHit'] as const
const sourceLedger = rows.map((row) => sourceFields.map((name) => row[column(name)]))
const sourceLedgerSha256 = sha256(JSON.stringify(sourceLedger))
if (EXPECTED_SOURCE_LEDGER_SHA256) {
  assert(sourceLedgerSha256 === EXPECTED_SOURCE_LEDGER_SHA256, 'repeated-hit source ledger changed')
}

const abc: any = AbcFile.read(new ExtendedBuffer(abcBytes))
const strings = abc.constant_pool.string as string[]
const buildStrings = strings.filter((value) => /^\d+\.\d+\.\d+$/.test(value))
assert(buildStrings.length === 1 && buildStrings[0] === EXPECTED_BUILD, 'ABC build mismatch')
const disassembler = new InstructionDisassembler(abc)
const methods = new Map<number, LocatedInstruction[]>()
const methodDigests = new Map<number, string>()
const branchErrors: string[] = []
for (const body of abc.method_body) {
  const instructions = locateInstructions(body.code, disassembler.disassemble(body) as Instruction[])
  methods.set(body.method, instructions)
  methodDigests.set(body.method, sha256(new Uint8Array(body.code)))
  branchErrors.push(...validateBranches(instructions, body.code.length).map((pc) => `method ${body.method} ${pc}`))
}
assert(branchErrors.length === 0, `invalid branch targets: ${branchErrors.join(', ')}`)
const owners = buildOwners(abc, strings)
const className = (classIndex: number): string =>
  multinameName(abc.constant_pool.multiname[abc.instance[classIndex].name - 1], strings)
const superName = (classIndex: number): string =>
  multinameName(abc.constant_pool.multiname[abc.instance[classIndex].super_name - 1], strings)
assert(className(POWER_INSTANCE_CLASS) === '_-M5v', 'power-instance class changed')
assert(className(REPEATED_HIT_BASE_CLASS) === '_-06J', 'repeated-hit base class changed')
assert(className(REPEATED_HIT_BASE_CLASS + 1) === '_-948', 'repeated-hit collection class changed')
assert(superName(REPEATED_HIT_BASE_CLASS + 1) === '_-06J', 'repeated-hit collection inheritance changed')

const expectedOwners: Record<number, Partial<MethodOwner>> = {
  39: { classIndex: 4, traitName: '<iinit>' },
  46: { classIndex: 4, traitName: '_-81I' },
  77: { classIndex: 4, traitName: '_-k4i' },
  92: { classIndex: 5, traitName: '<iinit>' },
  94: { classIndex: 5, traitName: 'Set' },
  95: { classIndex: 5, traitName: '_-s4d' },
  97: { classIndex: 5, traitName: '_-v1x' },
  99: { classIndex: 5, traitName: 'Destroy' },
  1474: { classIndex: 85, traitName: '_-Z29' },
  1484: { classIndex: 85, traitName: '_-S6I' },
  1497: { classIndex: 87, traitName: '_-V6Z' },
  1538: { classIndex: 87, traitName: '_-CS' },
  1540: { classIndex: 87, traitName: '_-06D' },
  1551: { classIndex: 87, traitName: '_-kn' },
  2084: { classIndex: 107, traitName: '_-562' },
  2893: { classIndex: 147, traitName: '_-LV' },
  3217: {},
  6294: { classIndex: POWER_TYPE_CLASS, traitName: '_-L4o', static: true },
  7233: { classIndex: 403, traitName: '<iinit>' },
  7235: { classIndex: 403, traitName: '_-5F' },
}
for (const [methodIdText, expected] of Object.entries(expectedOwners)) {
  const methodId = Number(methodIdText)
  const owner = owners.get(methodId)
  assert(owner, `method ${methodId} has no owner`)
  for (const [key, value] of Object.entries(expected)) {
    assert(owner[key as keyof MethodOwner] === value, `method ${methodId} owner ${key} changed`)
  }
  const digest = methodDigests.get(methodId)
  assert(digest, `method ${methodId} has no code digest`)
  if (EXPECTED_METHOD_SHA256[methodId]) {
    assert(digest === EXPECTED_METHOD_SHA256[methodId], `method ${methodId} code changed`)
  }
}

const anchors = {
  construction: {
    isMultihit: requireAt(methods, strings, 39, 68, 'getproperty', '_-i5R'),
    interval: requireAt(methods, strings, 39, 74, 'getproperty', '_-s2L'),
    specialOverride: requireAt(methods, strings, 39, 83, 'getproperty', '_-B24'),
    allocate: requireAt(methods, strings, 39, 88, 'constructprop', '_-948'),
    store: requireAt(methods, strings, 39, 89, 'initproperty', '_-D3h'),
  },
  map: {
    keys: requireAt(methods, strings, 92, 13, 'initproperty', '_-p4i'),
    values: requireAt(methods, strings, 92, 7, 'initproperty', '_-4i'),
    existingIndex: requireAt(methods, strings, 94, 5, 'callproperty', 'indexOf'),
    appendKey: requireAt(methods, strings, 94, 15, 'callpropvoid', 'push'),
    appendValue: requireAt(methods, strings, 94, 19, 'callpropvoid', 'push'),
    copyKey: requireAt(methods, strings, 95, 21, 'getproperty', '_-p4i'),
    copyValue: requireAt(methods, strings, 95, 26, 'getproperty', '_-4i'),
    copySet: requireAt(methods, strings, 95, 31, 'callpropvoid', 'Set'),
    missingValue: requireAt(methods, strings, 97, 37, 'returnvalue'),
    destroyKeys: requireAt(methods, strings, 99, 5, 'initproperty', '_-p4i'),
    destroyValues: requireAt(methods, strings, 99, 9, 'initproperty', '_-4i'),
  },
  sourceNormalization: {
    unsignedParse: requireAt(methods, strings, 2084, 17, 'callproperty', 'parseInt'),
    minTimeColumn: requireAt(methods, strings, 6294, 2652, 'pushstring', 'MinTimeBetweenHits'),
    minTimeWrite: requireAt(methods, strings, 6294, 2658, 'initproperty', '_-s2L'),
    inheritColumn: requireAt(methods, strings, 6294, 2474, 'pushstring', 'InheritAlreadyHit'),
    inheritWrite: requireAt(methods, strings, 6294, 2480, 'initproperty', '_-46W'),
    isMultihitColumn: requireAt(methods, strings, 6294, 2519, 'pushstring', 'IsMultihit'),
    isMultihitWrite: requireAt(methods, strings, 6294, 2525, 'initproperty', '_-i5R'),
    multihitIntervalRead: requireAt(methods, strings, 6294, 5025, 'getproperty', '_-s2L'),
    multihitIntervalOne: requireAt(methods, strings, 6294, 5032, 'initproperty', '_-s2L'),
  },
  repeatGate: {
    firstPresence: requireAt(methods, strings, 1540, 158, 'callproperty', 'indexOf'),
    firstInterval: requireAt(methods, strings, 1540, 173, 'getproperty', '_-s2L'),
    firstPriorTime: requireAt(methods, strings, 1540, 183, 'callproperty', '_-v1x'),
    firstAdd: requireAt(methods, strings, 1540, 187, 'add_i'),
    firstComparison: requireAt(methods, strings, 1540, 190, 'greaterthan'),
    secondPresence: requireAt(methods, strings, 1540, 306, 'callproperty', 'indexOf'),
    secondComparison: requireAt(methods, strings, 1540, 338, 'greaterthan'),
  },
  writes: {
    firstTargetId: requireAt(methods, strings, 1540, 1169, 'callproperty', '_-24v'),
    firstCurrentTime: requireAt(methods, strings, 1540, 1171, 'getlocal_2'),
    firstTimestamp: requireAt(methods, strings, 1540, 1173, 'callpropvoid', 'Set'),
    secondTargetId: requireAt(methods, strings, 1540, 1207, 'callproperty', '_-24v'),
    secondCurrentTime: requireAt(methods, strings, 1540, 1209, 'getlocal_2'),
    secondTimestamp: requireAt(methods, strings, 1540, 1211, 'callpropvoid', 'Set'),
    onHit: requireAt(methods, strings, 1540, 1382, 'callpropvoid', 'OnHit'),
    bulkTimestamp: requireAt(methods, strings, 46, 1031, 'callpropvoid', 'Set'),
  },
  comboSelection: {
    override: requireAt(methods, strings, 1538, 219, 'getproperty', '_-G25'),
    priorComboCount: requireAt(methods, strings, 1538, 226, 'getproperty', '_-t3M'),
    inheritFlag: requireAt(methods, strings, 1538, 234, 'getproperty', '_-46W'),
    hitOccurred: requireAt(methods, strings, 1538, 238, 'getproperty', '_-f1Z'),
    selectedOverride: requireAt(methods, strings, 1538, 244, 'getproperty', '_-G25'),
  },
  transitionInheritance: {
    capture: requireAt(methods, strings, 1551, 214, 'getproperty', '_-D3h'),
    detach: requireAt(methods, strings, 1551, 224, 'initproperty', '_-D3h'),
    successorFlag: requireAt(methods, strings, 1551, 955, 'getproperty', '_-46W'),
    destination: requireAt(methods, strings, 1551, 959, 'getproperty', '_-D3h'),
    copy: requireAt(methods, strings, 1551, 977, 'callpropvoid', '_-s4d'),
  },
  spawnedComboInheritance: {
    source: requireAt(methods, strings, 46, 1574, 'getproperty', '_-D3h'),
    successorFlag: requireAt(methods, strings, 46, 1581, 'getproperty', '_-46W'),
    destination: requireAt(methods, strings, 46, 1586, 'getproperty', '_-D3h'),
    copy: requireAt(methods, strings, 46, 1597, 'callpropvoid', '_-s4d'),
  },
  reset: {
    destroy: requireAt(methods, strings, 77, 194, 'callpropvoid', 'Destroy'),
    nullCollection: requireAt(methods, strings, 77, 198, 'initproperty', '_-D3h'),
  },
  rollback: {
    writeCollection: requireAt(methods, strings, 7233, 374, 'getproperty', '_-D3h'),
    nullWriteSentinel: requireAt(methods, strings, 7233, 385, 'pushbyte'),
    writeLength: requireAt(methods, strings, 7233, 395, 'callpropvoid', 'writeInt'),
    writeKeys: requireAt(methods, strings, 7233, 413, 'getproperty', '_-p4i'),
    writeValues: requireAt(methods, strings, 7233, 420, 'getproperty', '_-4i'),
    readLength: requireAt(methods, strings, 7235, 483, 'callproperty', 'readInt'),
    nonnegativeLength: requireAt(methods, strings, 7235, 489, 'ifnge'),
    replaceKeyLength: requireAt(methods, strings, 7235, 501, 'initproperty', 'length'),
    replaceValueLength: requireAt(methods, strings, 7235, 505, 'initproperty', 'length'),
    restoreKeys: requireAt(methods, strings, 7235, 519, 'getproperty', '_-p4i'),
    restoreValues: requireAt(methods, strings, 7235, 526, 'getproperty', '_-4i'),
    nullPrior: requireAt(methods, strings, 7235, 537, 'pushnull'),
    destroyPrior: requireAt(methods, strings, 7235, 541, 'callpropvoid', 'Destroy'),
    nullReplacement: requireAt(methods, strings, 7235, 542, 'pushnull'),
    storeReplacementLocal: requireAt(methods, strings, 7235, 545, 'setlocal'),
    loadReplacementLocal: requireAt(methods, strings, 7235, 547, 'getlocal'),
    restoreCollection: requireAt(methods, strings, 7235, 548, 'initproperty', '_-D3h'),
  },
  globalOrder: {
    fighterPowerUpdate: requireAt(methods, strings, 3217, 1224, 'callpropvoid', '_-LV'),
    arbitration: requireAt(methods, strings, 3217, 1235, 'callpropvoid', '_-Z29'),
    managerUpdate: requireAt(methods, strings, 2893, 40, 'callpropvoid', '_-V6Z'),
    phaseUpdate: requireAt(methods, strings, 1497, 20, 'callpropvoid', '_-kn'),
    activePowerUpdate: requireAt(methods, strings, 1551, 125, 'callproperty', '_-81I'),
    repeatApplication: requireAt(methods, strings, 46, 973, 'callproperty', '_-06D'),
    admission: requireAt(methods, strings, 1474, 924, 'callpropvoid', '_-S6I'),
  },
}
requireAt(methods, strings, 95, 30, 'pushtrue')
requireIntegerAt(methods, 97, 36, 'pushbyte', 0)
requireAt(methods, strings, 1540, 1172, 'pushtrue')
requireAt(methods, strings, 1540, 1210, 'pushtrue')
requireIntegerAt(methods, 6294, 5031, 'pushbyte', 1)
requireIntegerAt(methods, 7233, 385, 'pushbyte', 255)
requireIntegerAt(methods, 7235, 545, 'setlocal', 18)
requireIntegerAt(methods, 7235, 547, 'getlocal', 18)
const controlFlow = {
  firstAbsentTarget: branchTargetIndex(methods, 1540, 170),
  firstZeroInterval: branchTargetIndex(methods, 1540, 178),
  firstBlockedTarget: branchTargetIndex(methods, 1540, 196),
  secondAbsentTarget: branchTargetIndex(methods, 1540, 318),
  secondZeroInterval: branchTargetIndex(methods, 1540, 326),
  secondBlockedTarget: branchTargetIndex(methods, 1540, 342),
  inheritedOverrideFromPriorCombo: branchTargetIndex(methods, 1538, 230),
  inheritedOverrideFlagDisabled: branchTargetIndex(methods, 1538, 235),
  rollbackNonNullWrite: branchTargetIndex(methods, 7233, 384),
  rollbackLengthJoin: branchTargetIndex(methods, 7233, 386),
  rollbackNonNullLength: branchTargetIndex(methods, 7235, 489),
  rollbackAlreadyNull: branchTargetIndex(methods, 7235, 539),
}
assert(
  JSON.stringify(controlFlow) ===
    JSON.stringify({
      firstAbsentTarget: 178,
      firstZeroInterval: 193,
      firstBlockedTarget: 201,
      secondAbsentTarget: 326,
      secondZeroInterval: 341,
      secondBlockedTarget: 344,
      inheritedOverrideFromPriorCombo: 241,
      inheritedOverrideFlagDisabled: 240,
      rollbackNonNullWrite: 387,
      rollbackLengthJoin: 391,
      rollbackNonNullLength: 536,
      rollbackAlreadyNull: 546,
    }),
  `lifecycle branch destinations changed: ${JSON.stringify(controlFlow)}`,
)
for (const [methodId, instructionIndex, classIndex, traitName] of [
  [95, 31, REPEATED_HIT_BASE_CLASS, 'Set'],
  [1540, 1173, REPEATED_HIT_BASE_CLASS, 'Set'],
  [1540, 1211, REPEATED_HIT_BASE_CLASS, 'Set'],
  [1551, 977, REPEATED_HIT_BASE_CLASS, '_-s4d'],
  [46, 1597, REPEATED_HIT_BASE_CLASS, '_-s4d'],
  [3217, 1224, 147, '_-LV'],
  [3217, 1235, 85, '_-Z29'],
  [2893, 40, 87, '_-V6Z'],
  [1497, 20, 87, '_-kn'],
  [1551, 125, POWER_INSTANCE_CLASS, '_-81I'],
  [46, 973, 87, '_-06D'],
  [1474, 924, 85, '_-S6I'],
] as const) {
  assertTraitReferenceAt(abc, methods, strings, methodId, instructionIndex, classIndex, traitName)
}
assert(anchors.writes.firstTimestamp.index < anchors.writes.onHit.index, 'first timestamp write moved after OnHit')
assert(anchors.writes.secondTimestamp.index < anchors.writes.onHit.index, 'second timestamp write moved after OnHit')
assert(
  anchors.globalOrder.fighterPowerUpdate.index < anchors.globalOrder.arbitration.index,
  'repeat phase moved after arbitration',
)

const referenceLedgers = {
  minTimeBetweenHits: traitLedger(abc, methods, owners, strings, POWER_TYPE_CLASS, '_-s2L'),
  inheritAlreadyHit: traitLedger(abc, methods, owners, strings, POWER_TYPE_CLASS, '_-46W'),
  isMultihit: traitLedger(abc, methods, owners, strings, POWER_TYPE_CLASS, '_-i5R'),
  specialCollectionOverride: traitLedger(abc, methods, owners, strings, POWER_TYPE_CLASS, '_-B24'),
  repeatedHitCollection: traitLedger(abc, methods, owners, strings, POWER_INSTANCE_CLASS, '_-D3h'),
  repeatedHitKeys: traitLedger(abc, methods, owners, strings, REPEATED_HIT_BASE_CLASS, '_-p4i'),
  repeatedHitValues: traitLedger(abc, methods, owners, strings, REPEATED_HIT_BASE_CLASS, '_-4i'),
  hitOccurred: traitLedger(abc, methods, owners, strings, POWER_INSTANCE_CLASS, '_-f1Z'),
}
for (const [name, ledger] of Object.entries(referenceLedgers)) {
  const expected = EXPECTED_REFERENCE_LEDGER_SHA256[name]
  if (expected) assert(ledger.sha256 === expected, `${name} exact-QName reference ledger changed`)
}
assert(referenceLedgers.minTimeBetweenHits.type === 'uint', 'MinTimeBetweenHits type changed')
assert(referenceLedgers.inheritAlreadyHit.type === 'Boolean', 'InheritAlreadyHit type changed')
assert(referenceLedgers.isMultihit.type === 'Boolean', 'IsMultihit type changed')
assert(referenceLedgers.specialCollectionOverride.type === 'Boolean', 'special collection override type changed')
assert(referenceLedgers.repeatedHitCollection.type === '_-948', 'repeated-hit collection field type changed')
assert(referenceLedgers.repeatedHitKeys.type === 'Vector.<uint>', 'repeated-hit key vector type changed')
assert(referenceLedgers.repeatedHitValues.type === 'Vector.<uint>', 'repeated-hit value vector type changed')
assert(referenceLedgers.hitOccurred.type === 'Boolean', 'hit-occurred type changed')

const lifecycleMethodIds = Object.keys(expectedOwners).map(Number)
const lifecycleMethodSha256 = Object.fromEntries(
  lifecycleMethodIds.map((methodId) => [methodId, methodDigests.get(methodId)]),
)

console.log(
  JSON.stringify(
    {
      status: 'bounded-static-repeated-hit-lifecycle-closure-with-trace-and-reachability-blockers',
      identity: {
        build: EXPECTED_BUILD,
        ...identity,
        decoder: 'abc-disassembler@ad9714d',
        decodedMethodBodies: abc.method_body.length,
        branchTargetsValid: true,
      },
      source: {
        columns: header.length,
        records: rows.length,
        sourceLedgerSha256,
        values: {
          IsMultihit: valuesByFrequency(rows, column('IsMultihit')),
          MinTimeBetweenHits: valuesByFrequency(rows, column('MinTimeBetweenHits')),
          InheritAlreadyHit: valuesByFrequency(rows, column('InheritAlreadyHit')),
        },
        normalization: {
          emptyOrAbsentUint: 0,
          literalTrueUint: 0,
          multihitComboZeroInterval: 1,
          absentBoolean: false,
        },
      },
      collection: {
        structuralName: 'per-power targetId-to-lastHitTime collection',
        runtimeType: '_-948 extends _-06J',
        storage: ['Vector.<uint> keys _-p4i', 'Vector.<uint> timestamps _-4i'],
        copyBehavior: 'entry copy through Set(key, value, true); vectors and collection are not aliased',
        absentRead: 0,
        allocation: 'allocate when !IsMultihit || MinTimeBetweenHits != 0 || special _-B24; otherwise leave null',
      },
      repeatGate: {
        absentTarget: 'not blocked by repeat state; successful hit writes currentTime',
        presentTargetZeroInterval: 'blocked because the timed replacement branch is skipped',
        presentTargetPositiveInterval: 'blocked while priorTime + interval > currentTime',
        equality: 'admitted when priorTime + interval == currentTime',
        timestampWrite: 'Set(targetId, currentTime, true) before target OnHit',
      },
      inheritance: {
        comboSelection:
          'non-null _-G25 is selected when prior combo count is nonzero, or when InheritAlreadyHit and the source power has hit',
        phaseTransition:
          'detach the source collection, then copy entries into a non-null fresh successor collection when successor InheritAlreadyHit is true',
        spawnedCombo:
          'copy entries from the still-owned source collection into a non-null successor collection when successor InheritAlreadyHit is true',
      },
      reset: {
        ordinaryTeardown: 'Destroy nulls both vectors, then power teardown nulls the collection field',
        rollback:
          'serialize null as -1 or exact ordered key/value pairs; restore replaces lengths and entries, or destroys/nulls on -1',
      },
      globalOrder: [
        'fighter _-LV power update',
        'manager _-V6Z phase update',
        'power _-kn / _-81I update',
        'repeat application _-06D and collection writes/copies',
        'pairwise arbitration _-Z29',
        'survivor admission _-S6I',
      ],
      anchors,
      controlFlow,
      referenceLedgers,
      lifecycleMethodSha256,
      blockers: [
        'No closed replay-producing root proves complete reachability for every PowerType lifecycle combination.',
        'No authenticated interpreted-runtime trace covers zero, equality, both inheritance paths, teardown, rollback, and same-tick arbitration/admission order.',
      ],
    },
    null,
    2,
  ),
)
