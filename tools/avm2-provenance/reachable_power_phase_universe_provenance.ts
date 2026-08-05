import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }
type SourceRoot = { source: string; powerName: string }
type TransitionEdge = { from: string; kind: string; to: string }

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_POWER_TYPES_SHA256 = '715468d8eda8fa2ec3d88a8b5395c076bec937640927909add4745eda2883f27'
const EXPECTED_HERO_TYPES_SHA256 = '1a9c27d1e21178870dafe5746c00efb7ec154d14290af4c628eb878c054eb920'
const EXPECTED_ITEM_TYPES_SHA256 = 'd68102cbafaef4f6f9eae817f1f7c5830be4464e8cea89fbd0ee36bc28e95f3e'
const EXPECTED_POWER_SWAP_TYPES_SHA256 = 'a6eb10c26320ba18da8a1067cae09258a28c6f6c0a1a27b1adf27c46a2946b6f'
const EXPECTED_TAUNT_TYPES_SHA256 = '535bf5ee2e8446a4f352ddf5bebaefa90e535c4e739737d0d23dbaa59875780e'
const EXPECTED_EXTRACTED_ENTRY_COUNT = 261
const EXPECTED_EXTRACTED_AGGREGATE_SHA256 = '4bcd0666a713d81266bd76885ed21740c4e8c4c01def2ebcd02202983a6a8d8f'
const EXPECTED_POWER_RECORDS = 3671
const EXPECTED_POWER_COLUMNS = 182
const EXPECTED_POWER_LOOKUP_CALLSITE_SHA256 = 'c06daf99b07f7f7708bfd92ac61baaa930fb6d98549609b4050bffe03e83deac'
const EXPECTED_EXACT_ABC_POWER_NAME_COUNT = 175
const EXPECTED_EXACT_ABC_POWER_NAME_SHA256 = 'dc5719468c32ec5627be03ba6a5c1cd8e5b09d28d0681a01ddc050c8744a63e0'
const POWER_CLASS_INDEX = 342
const POWER_LOOKUP_METHOD_ID = 6304
const ROOT_EXPECTATIONS = {
  hero: { references: 414, unique: 414 },
  item: { references: 224, unique: 181 },
  level: { references: 95, unique: 39 },
  powerSwap: { references: 3735, unique: 2020 },
  taunt: { references: 245, unique: 231 },
} as const
const EXPECTED_DECLARATIVE_ROOT_UNION = 2253
const EXPECTED_SOURCE_GRAPH_RECORDS = 3632
const EXPECTED_SOURCE_GRAPH_EXCLUDED_RECORDS = 38
const EXPECTED_SOURCE_GRAPH_GEOMETRY_SLOTS = 6322
const EXPECTED_SOURCE_GRAPH_EXCLUDED_GEOMETRY_SLOTS = 6
const EXPECTED_SOURCE_GRAPH_GEOMETRY_RECORDS = 1839
const EXPECTED_SOURCE_GRAPH_EXCLUDED_GEOMETRY_RECORDS = 6
const EXPECTED_ROOT_LEDGER_SHA256 = '3a40f5d9c955ae293fe49ce319dcfdf996120910b87945665cc2c9e23716afd7'
const EXPECTED_TRANSITION_LEDGER_SHA256 = '09694f063834558865be2a400e17e73c18c751770fb49b410e284e3e2effb9e4'
const EXPECTED_SELECTION_PATH_LEDGER_SHA256 = '2972ae48d924acc883def49e5742791ba0906c9828e43245e8546536600a3281'
const EXPECTED_REACHED_PHASE_LEDGER_SHA256 = 'bd02224c25fcdfeff7e35978257415cf4d882f323ec759f0d10f0be7aab58e99'
const EXPECTED_EXCLUDED_LEDGER_SHA256 = '426a23b8fc9ee8b54be448614ce8c6214e015a742b0ca1c0acf1525a285ff545'
const EXPECTED_LEVEL_ROOT_FILE_COUNT = 13
const EXPECTED_TRANSITION_REFERENCE_LEDGER_SHA256 = '4a93278450098f43b4c156b00e0d38e5611278af3fdc53f921ca9fb3af92b3f7'
const EXPECTED_SELECTION_METHOD_LEDGER_SHA256 = '80f993c57554f2ae29e035cde04c5abdc3c4cd31e21cc607a01cf22e764dbffa'
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
const HERO_POWER_FIELDS = [
  'SpecialPower1',
  'SpecialPower1_Down',
  'SpecialPower1_Forward',
  'SpecialPower2',
  'SpecialPower2_Down',
  'SpecialPower2_Forward',
]
const ITEM_POWER_FIELDS = [
  'OnConsumePower',
  'OnCollisionPower',
  'OnTriggeredPower',
  'OnExplodePower',
  'OnActivatePower',
  'PowerType_Combo1',
  'PowerType_Forward',
  'PowerType_Down',
  'PowerType_Aerial',
  'PowerType_Aerial_Forward',
  'PowerType_Aerial_Down',
  'PowerType_Smash_Forward',
  'PowerType_Smash_Neutral',
  'PowerType_Smash_Down',
  'PowerType_Smash_Aerial_Up',
  'PowerType_Smash_Aerial_Down',
]
const TAUNT_POWER_FIELDS = ['PowerName', 'RandomPowers', 'UIOverridePowerName']
const TRANSITION_FIELDS = [
  'ComboName',
  'ComboOverrideIfHit',
  'ComboOverrideIfRelease',
  'ComboOverrideIfWall',
  'ComboOverrideIfButton',
  'OriginOverrideIfInMode',
  'ComboOverrideIfDir',
  'ComboOverrideIfInterrupt',
  'BGPowerOnFire',
  'ExhaustedVersion',
  'GCVersion',
  'MomentumVersion',
  'TeamTauntPower',
]
const TRANSITION_TRAITS = [
  '_-H1b',
  '_-G25',
  '_-q10',
  '_-Vo',
  '_-h16',
  '_-H4A',
  '_-S6o',
  '_-T4E',
  '_-V67',
  '_-V0',
  '_-76U',
  '_-q5e',
  '_-A5p',
  '_-z2k',
  '_-z1x',
  '_-x3g',
  '_-aC',
  '_-j2A',
]

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
function decodeXml(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
}
function xmlTagValues(text: string, fields: string[]): Array<{ field: string; value: string }> {
  const values: Array<{ field: string; value: string }> = []
  for (const field of fields) {
    const openingTag = `<${field}>`
    const closingTag = `</${field}>`
    let cursor = 0
    while (cursor < text.length) {
      const start = text.indexOf(openingTag, cursor)
      if (start === -1) break
      const contentStart = start + openingTag.length
      const end = text.indexOf(closingTag, contentStart)
      assert(end !== -1, `missing closing tag for ${field}`)
      values.push({ field, value: decodeXml(text.slice(contentStart, end).trim()) })
      cursor = end + closingTag.length
    }
  }
  return values
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
function exactReferences(
  methods: Map<number, LocatedInstruction[]>,
  owners: Map<number, MethodOwner>,
  qname: string,
): Array<{ methodId: number; owner: MethodOwner | null; references: Array<{ pc: number; opcode: string }> }> {
  return [...methods.entries()]
    .map(([methodId, instructions]) => ({
      methodId,
      owner: owners.get(methodId) ?? null,
      references: instructions
        .filter((instruction) => qnameKey(instruction.params[0]) === qname)
        .map((instruction) => ({ pc: instruction.pc, opcode: instruction.name })),
    }))
    .filter((entry) => entry.references.length > 0)
}
function methodQName(abc: any, methodId: number): string {
  const matches = abc.instance.flatMap((instance: any, classIndex: number) =>
    [
      ...(instance.trait ?? []).map((trait: any) => ({ trait, classIndex, static: false })),
      ...(abc.class[classIndex].traits ?? []).map((trait: any) => ({ trait, classIndex, static: true })),
    ].filter(({ trait }) => trait.data?.method === methodId),
  )
  assert(matches.length === 1, `expected one trait for method ${methodId}, found ${matches.length}`)
  const key = qnameKey(abc.constant_pool.multiname[matches[0].trait.name - 1])
  assert(key, `method ${methodId} does not use an exact QName`)
  return key
}
function requireInstruction(
  methods: Map<number, LocatedInstruction[]>,
  strings: string[],
  methodId: number,
  pc: number,
  opcode: string,
  name?: string,
): { methodId: number; pc: number; opcode: string; name: string } {
  const instruction = methods.get(methodId)?.find((candidate) => candidate.pc === pc)
  assert(instruction, `method ${methodId} lacks PC ${pc}`)
  assert(instruction.name === opcode, `method ${methodId} PC ${pc} is not ${opcode}`)
  const actualName = multinameName(instruction.params[0], strings)
  if (name !== undefined) assert(actualName === name, `method ${methodId} PC ${pc} does not name ${name}`)
  return { methodId, pc, opcode, name: actualName }
}
function headerIndex(header: string[], name: string): number {
  const index = header.indexOf(name)
  assert(index !== -1, `missing column ${name}`)
  return index
}
function countGeometrySlots(row: Record<string, string>): number {
  return Math.max(
    ...['AoERadiusX', 'AoERadiusY', 'CenterOffsetX', 'CenterOffsetY'].map((field) =>
      row[field] ? row[field].split(',').length : 0,
    ),
  )
}

const abcPath = argument('--abc')
const powerTypesPath = argument('--power-types')
const heroTypesPath = argument('--hero-types')
const itemTypesPath = argument('--item-types')
const powerSwapTypesPath = argument('--power-swap-types')
const tauntTypesPath = argument('--taunt-types')
const extractedPath = argument('--extracted')
assert(
  abcPath && powerTypesPath && heroTypesPath && itemTypesPath && powerSwapTypesPath && tauntTypesPath && extractedPath,
  'usage: bun reachable_power_phase_universe_provenance.ts --abc <main.abc> --power-types <Game.swz.38.dat> --hero-types <Game.swz.23.xml> --item-types <Game.swz.27.dat> --power-swap-types <Game.swz.39.xml> --taunt-types <Game.swz.56.xml> --extracted <directory>',
)

const inputs = {
  abc: readFileSync(resolve(abcPath)),
  powerTypes: readFileSync(resolve(powerTypesPath)),
  heroTypes: readFileSync(resolve(heroTypesPath)),
  itemTypes: readFileSync(resolve(itemTypesPath)),
  powerSwapTypes: readFileSync(resolve(powerSwapTypesPath)),
  tauntTypes: readFileSync(resolve(tauntTypesPath)),
}
const identities = {
  abcSha256: sha256(new Uint8Array(inputs.abc)),
  powerTypesSha256: sha256(new Uint8Array(inputs.powerTypes)),
  heroTypesSha256: sha256(new Uint8Array(inputs.heroTypes)),
  itemTypesSha256: sha256(new Uint8Array(inputs.itemTypes)),
  powerSwapTypesSha256: sha256(new Uint8Array(inputs.powerSwapTypes)),
  tauntTypesSha256: sha256(new Uint8Array(inputs.tauntTypes)),
}
assert(identities.abcSha256 === EXPECTED_ABC_SHA256, `ABC SHA-256 mismatch: ${identities.abcSha256}`)
assert(identities.powerTypesSha256 === EXPECTED_POWER_TYPES_SHA256, 'PowerTypes SHA-256 mismatch')
assert(identities.heroTypesSha256 === EXPECTED_HERO_TYPES_SHA256, 'HeroTypes SHA-256 mismatch')
assert(identities.itemTypesSha256 === EXPECTED_ITEM_TYPES_SHA256, 'ItemTypes SHA-256 mismatch')
assert(identities.powerSwapTypesSha256 === EXPECTED_POWER_SWAP_TYPES_SHA256, 'PowerSwapTypes SHA-256 mismatch')
assert(identities.tauntTypesSha256 === EXPECTED_TAUNT_TYPES_SHA256, 'TauntTypes SHA-256 mismatch')

const extractedEntries = readdirSync(resolve(extractedPath))
  .filter((name) => /^(Dynamic|Engine|Game)\.swz\.\d+\.(xml|dat)$/.test(name))
  .map((name) => ({ name, bytes: readFileSync(join(resolve(extractedPath), name)) }))
  .sort((left, right) => left.name.localeCompare(right.name, 'en', { numeric: true }))
const extractedAggregateSha256 = sha256(
  extractedEntries.map((entry) => `${entry.name}\0${sha256(new Uint8Array(entry.bytes))}\n`).join(''),
)
assert(
  extractedEntries.length === EXPECTED_EXTRACTED_ENTRY_COUNT,
  `extracted entry count is ${extractedEntries.length}`,
)
assert(extractedAggregateSha256 === EXPECTED_EXTRACTED_AGGREGATE_SHA256, 'extracted entry aggregate mismatch')

const powerCsv = parseCsv(inputs.powerTypes.toString('utf8'))
assert(powerCsv[0]?.length === 1 && powerCsv[0][0] === 'powerTypes', 'PowerTypes marker mismatch')
const powerHeader = powerCsv[1]
const powerRows = powerCsv.slice(2)
assert(powerHeader.length === EXPECTED_POWER_COLUMNS, `PowerTypes column count is ${powerHeader.length}`)
assert(powerRows.length === EXPECTED_POWER_RECORDS, `PowerTypes record count is ${powerRows.length}`)
assert(
  powerRows.every((row) => row.length === powerHeader.length),
  'PowerTypes row width mismatch',
)
const powerNameIndex = headerIndex(powerHeader, 'PowerName')
const templateRows = powerRows.filter((row) => row[powerNameIndex] === 'Template')
assert(templateRows.length === 1, `expected one Template power row, found ${templateRows.length}`)
const records = new Map(
  powerRows
    .filter((row) => row[powerNameIndex] !== 'Template')
    .map((row) => [row[powerNameIndex], Object.fromEntries(powerHeader.map((field, index) => [field, row[index]]))]),
)
assert(records.size === EXPECTED_POWER_RECORDS - 1, `non-template power count is ${records.size}`)
const powerNames = new Set(records.keys())
const powerNamesIn = (value: string): string[] => value.split(/[,|:;\s]+/).filter((part) => powerNames.has(part))

const sourceRoots: SourceRoot[] = []
const levelRootFiles = new Set<string>()
function addRoots(source: string, values: string[]): void {
  for (const value of values) for (const powerName of powerNamesIn(value)) sourceRoots.push({ source, powerName })
}
for (const entry of xmlTagValues(inputs.heroTypes.toString('utf8'), HERO_POWER_FIELDS)) addRoots('hero', [entry.value])
const itemCsv = parseCsv(inputs.itemTypes.toString('utf8'))
assert(itemCsv[0]?.[0] === 'itemTypes', 'ItemTypes marker mismatch')
const itemHeader = itemCsv[1]
for (const row of itemCsv.slice(2)) {
  for (const field of ITEM_POWER_FIELDS) addRoots('item', [row[headerIndex(itemHeader, field)]])
}
for (const entry of xmlTagValues(inputs.powerSwapTypes.toString('utf8'), ['TargetPower']))
  addRoots('powerSwap', [entry.value])
for (const entry of xmlTagValues(inputs.tauntTypes.toString('utf8'), TAUNT_POWER_FIELDS))
  addRoots('taunt', [entry.value])
for (const entry of extractedEntries.filter(
  (candidate) => candidate.name.startsWith('Dynamic.swz.') && candidate.name.endsWith('.xml'),
)) {
  const text = entry.bytes.toString('utf8')
  for (const match of text.matchAll(/\b(?:TrapPowers|LavaPower|MudPower)="([^"]+)"/g)) {
    const referenceCount = sourceRoots.length
    addRoots('level', [decodeXml(match[1])])
    if (sourceRoots.length > referenceCount) levelRootFiles.add(entry.name)
  }
}
assert(levelRootFiles.size === EXPECTED_LEVEL_ROOT_FILE_COUNT, `level root file count is ${levelRootFiles.size}`)
const sourceRootSummary = Object.fromEntries(
  Object.entries(ROOT_EXPECTATIONS).map(([source, expected]) => {
    const references = sourceRoots.filter((root) => root.source === source)
    const unique = new Set(references.map((root) => root.powerName))
    assert(references.length === expected.references, `${source} root reference count is ${references.length}`)
    assert(unique.size === expected.unique, `${source} unique root count is ${unique.size}`)
    return [source, { references: references.length, unique: unique.size }]
  }),
)
const declarativeRoots = new Set(sourceRoots.map((root) => root.powerName))
assert(declarativeRoots.size === EXPECTED_DECLARATIVE_ROOT_UNION, `declarative root union is ${declarativeRoots.size}`)

const transitionEdges: TransitionEdge[] = []
for (const [powerName, row] of records) {
  for (const field of TRANSITION_FIELDS) {
    for (const target of powerNamesIn(row[field])) transitionEdges.push({ from: powerName, kind: field, to: target })
  }
  const testFeature = `${powerName}_TESTFEATURE`
  if (powerNames.has(testFeature))
    transitionEdges.push({ from: powerName, kind: 'implicitTestFeature', to: testFeature })
}
transitionEdges.sort(
  (left, right) =>
    left.from.localeCompare(right.from) || left.kind.localeCompare(right.kind) || left.to.localeCompare(right.to),
)
const edgesBySource = new Map<string, TransitionEdge[]>()
for (const edge of transitionEdges) edgesBySource.set(edge.from, [...(edgesBySource.get(edge.from) ?? []), edge])
const reached = new Set(declarativeRoots)
const predecessor = new Map<string, { from: string; kind: string }>()
const queue = [...declarativeRoots].sort((left, right) => left.localeCompare(right))
while (queue.length > 0) {
  const current = queue.shift() as string
  for (const edge of edgesBySource.get(current) ?? []) {
    if (reached.has(edge.to)) continue
    reached.add(edge.to)
    predecessor.set(edge.to, { from: edge.from, kind: edge.kind })
    queue.push(edge.to)
  }
}
const excluded = [...powerNames]
  .filter((powerName) => !reached.has(powerName))
  .sort((left, right) => left.localeCompare(right))
assert(reached.size === EXPECTED_SOURCE_GRAPH_RECORDS, `source graph reached ${reached.size} records`)
assert(excluded.length === EXPECTED_SOURCE_GRAPH_EXCLUDED_RECORDS, `source graph excluded ${excluded.length} records`)
const reachedGeometrySlots = [...reached].reduce(
  (total, powerName) => total + countGeometrySlots(records.get(powerName) as Record<string, string>),
  0,
)
const excludedGeometrySlots = excluded.reduce(
  (total, powerName) => total + countGeometrySlots(records.get(powerName) as Record<string, string>),
  0,
)
assert(
  reachedGeometrySlots === EXPECTED_SOURCE_GRAPH_GEOMETRY_SLOTS,
  `source graph geometry slot count is ${reachedGeometrySlots}`,
)
assert(
  excludedGeometrySlots === EXPECTED_SOURCE_GRAPH_EXCLUDED_GEOMETRY_SLOTS,
  `excluded geometry slot count is ${excludedGeometrySlots}`,
)
const hasNonDefaultGeometry = (powerName: string): boolean => {
  const row = records.get(powerName) as Record<string, string>
  return ['AoERadiusX', 'AoERadiusY', 'CenterOffsetX', 'CenterOffsetY'].some(
    (field) => row[field] !== '' && row[field] !== '0',
  )
}
const reachedGeometryRecords = [...reached].filter(hasNonDefaultGeometry).length
const excludedGeometryRecords = excluded.filter(hasNonDefaultGeometry).length
assert(
  reachedGeometryRecords === EXPECTED_SOURCE_GRAPH_GEOMETRY_RECORDS,
  `source graph geometry record count is ${reachedGeometryRecords}`,
)
assert(
  excludedGeometryRecords === EXPECTED_SOURCE_GRAPH_EXCLUDED_GEOMETRY_RECORDS,
  `excluded geometry record count is ${excludedGeometryRecords}`,
)
const rootLedger = [...new Set(sourceRoots.map((root) => `${root.source}\0${root.powerName}`))].sort()
const sourceSelectionPathLedger = [...reached]
  .sort((left, right) => left.localeCompare(right))
  .map((powerName) => {
    const rootSources = [
      ...new Set(sourceRoots.filter((root) => root.powerName === powerName).map((root) => root.source)),
    ].sort()
    return [powerName, rootSources, predecessor.get(powerName) ?? null]
  })
const sourcePhaseLedger = [...reached]
  .sort((left, right) => left.localeCompare(right))
  .map((powerName) => {
    const row = records.get(powerName) as Record<string, string>
    return [powerName, row.CastTime, row.AoERadiusX, row.AoERadiusY, row.CenterOffsetX, row.CenterOffsetY]
  })
const excludedLedger = excluded.map((powerName) => {
  const row = records.get(powerName) as Record<string, string>
  return [
    powerName,
    row.PowerID,
    row.ParentItem,
    row.OriginPower,
    row.CastTime,
    row.AoERadiusX,
    row.AoERadiusY,
    row.CenterOffsetX,
    row.CenterOffsetY,
  ]
})
const rootLedgerSha256 = sha256(JSON.stringify(rootLedger))
const transitionLedgerSha256 = sha256(JSON.stringify(transitionEdges))
const selectionPathLedgerSha256 = sha256(JSON.stringify(sourceSelectionPathLedger))
const reachedPhaseLedgerSha256 = sha256(JSON.stringify(sourcePhaseLedger))
const excludedLedgerSha256 = sha256(JSON.stringify(excludedLedger))
assert(rootLedgerSha256 === EXPECTED_ROOT_LEDGER_SHA256, `root ledger changed: ${rootLedgerSha256}`)
assert(
  transitionLedgerSha256 === EXPECTED_TRANSITION_LEDGER_SHA256,
  `transition ledger changed: ${transitionLedgerSha256}`,
)
assert(
  selectionPathLedgerSha256 === EXPECTED_SELECTION_PATH_LEDGER_SHA256,
  `selection-path ledger changed: ${selectionPathLedgerSha256}`,
)
assert(
  reachedPhaseLedgerSha256 === EXPECTED_REACHED_PHASE_LEDGER_SHA256,
  `reached-phase ledger changed: ${reachedPhaseLedgerSha256}`,
)
assert(excludedLedgerSha256 === EXPECTED_EXCLUDED_LEDGER_SHA256, `excluded ledger changed: ${excludedLedgerSha256}`)

const abc: any = AbcFile.read(new ExtendedBuffer(inputs.abc))
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
const selectionMethodIds = [46, 75, 1509, 1535, 1538, 1551, 6294, 6302, 6303, 6304, 6306]
const selectionMethodLedger = selectionMethodIds.map((methodId) => [
  methodId,
  owners.get(methodId) ?? null,
  (methods.get(methodId) ?? []).map((instruction) => [instruction.pc, instruction.name, instruction.params]),
])
const selectionMethodLedgerSha256 = sha256(JSON.stringify(selectionMethodLedger))
assert(
  selectionMethodLedgerSha256 === EXPECTED_SELECTION_METHOD_LEDGER_SHA256,
  `selection-method ledger changed: ${selectionMethodLedgerSha256}`,
)
assert(
  owners.get(6294)?.classIndex === POWER_CLASS_INDEX && owners.get(6294)?.static,
  'PowerTypes parser owner changed',
)
assert(owners.get(6302)?.classIndex === POWER_CLASS_INDEX && owners.get(6302)?.static, 'root registrar owner changed')
assert(
  owners.get(6303)?.classIndex === POWER_CLASS_INDEX && owners.get(6303)?.static,
  'recursive registrar owner changed',
)
assert(
  owners.get(POWER_LOOKUP_METHOD_ID)?.classIndex === POWER_CLASS_INDEX && owners.get(POWER_LOOKUP_METHOD_ID)?.static,
  'PowerType lookup owner changed',
)
assert(owners.get(6306)?.classIndex === POWER_CLASS_INDEX && owners.get(6306)?.static, 'origin resolver owner changed')
const powerLookupQName = methodQName(abc, POWER_LOOKUP_METHOD_ID)
const powerLookupCallsites = exactReferences(methods, owners, powerLookupQName)
const powerLookupCallsiteSha256 = sha256(JSON.stringify(powerLookupCallsites))
assert(powerLookupCallsiteSha256 === EXPECTED_POWER_LOOKUP_CALLSITE_SHA256, 'PowerType lookup callsite ledger changed')
const exactAbcPowerNameStrings = [...new Set([...powerNames].filter((powerName) => strings.includes(powerName)))].sort(
  (left, right) => left.localeCompare(right),
)
assert(
  exactAbcPowerNameStrings.length === EXPECTED_EXACT_ABC_POWER_NAME_COUNT,
  `exact ABC PowerName string count is ${exactAbcPowerNameStrings.length}`,
)
const exactAbcPowerNameSha256 = sha256(JSON.stringify(exactAbcPowerNameStrings))
assert(
  exactAbcPowerNameSha256 === EXPECTED_EXACT_ABC_POWER_NAME_SHA256,
  `exact ABC PowerName string ledger changed: ${exactAbcPowerNameSha256}`,
)
const powerClass = abc.instance[POWER_CLASS_INDEX]
assert(
  multinameName(abc.constant_pool.multiname[powerClass.name - 1], strings) === 'PowerType',
  'PowerType class changed',
)
const transitionReferenceLedgers = Object.fromEntries(
  TRANSITION_TRAITS.map((name) => {
    const traits = (powerClass.trait as any[]).filter(
      (trait) => multinameName(abc.constant_pool.multiname[trait.name - 1], strings) === name,
    )
    assert(traits.length === 1, `expected one PowerType ${name} trait`)
    const qname = qnameKey(abc.constant_pool.multiname[traits[0].name - 1])
    assert(qname, `${name} is not an exact QName`)
    const references = exactReferences(methods, owners, qname)
    return [name, sha256(JSON.stringify(references))]
  }),
)
const transitionReferenceLedgerSha256 = sha256(JSON.stringify(transitionReferenceLedgers))
assert(
  transitionReferenceLedgerSha256 === EXPECTED_TRANSITION_REFERENCE_LEDGER_SHA256,
  `transition-reference ledger changed: ${transitionReferenceLedgerSha256}`,
)
const templateParserStringPcs = (methods.get(6294) ?? [])
  .filter((instruction) => instruction.name === 'pushstring' && instruction.params[0] === 'Template')
  .map((instruction) => instruction.pc)
assert(
  templateParserStringPcs.length === 1,
  `expected one Template parser anchor, found ${templateParserStringPcs.length}`,
)
const templateNameLoad = requireInstruction(methods, strings, 6294, 146, 'getlocal_3')
const templateSkipBranch = requireInstruction(methods, strings, 6294, 151, 'ifne')
const templateSkipReturn = requireInstruction(methods, strings, 6294, 155, 'returnvoid')
const templateBranchInstruction = (methods.get(6294) ?? []).find((instruction) => instruction.pc === 151)
const templateBranchOffset = templateBranchInstruction?.params[0]
assert(typeof templateBranchOffset === 'number', 'Template branch offset is not numeric')
const templateNonTemplateTargetPc = (templateBranchInstruction as LocatedInstruction).endPc + templateBranchOffset
assert(templateNonTemplateTargetPc === 156, `non-template parser target is PC ${templateNonTemplateTargetPc}`)
const parserColumnAnchors = Object.fromEntries(
  TRANSITION_FIELDS.map((field) => {
    const matches = (methods.get(6294) ?? []).filter(
      (instruction) => instruction.name === 'pushstring' && instruction.params[0] === field,
    )
    assert(matches.length === 1, `expected one parser anchor for ${field}, found ${matches.length}`)
    return [field, matches[0].pc]
  }),
)
const parserTraitAnchors = {
  combo: requireInstruction(methods, strings, 6294, 2596, 'initproperty', '_-H1b'),
  hit: requireInstruction(methods, strings, 6294, 3628, 'initproperty', '_-G25'),
  release: requireInstruction(methods, strings, 6294, 3809, 'initproperty', '_-q10'),
  wall: requireInstruction(methods, strings, 6294, 3898, 'initproperty', '_-Vo'),
  buttonMinimum: requireInstruction(methods, strings, 6294, 2810, 'initproperty', '_-h16'),
  buttonMaximum: requireInstruction(methods, strings, 6294, 2908, 'initproperty', '_-H4A'),
  buttonMinimumTarget: requireInstruction(methods, strings, 6294, 2994, 'initproperty', '_-S6o'),
  buttonMaximumTarget: requireInstruction(methods, strings, 6294, 3012, 'initproperty', '_-T4E'),
  mode: requireInstruction(methods, strings, 6294, 7877, 'initproperty', '_-V67'),
  directionMasks: requireInstruction(methods, strings, 6294, 3223, 'initproperty', '_-V0'),
  directionTargets: requireInstruction(methods, strings, 6294, 3256, 'initproperty', '_-76U'),
  interrupt: requireInstruction(methods, strings, 6294, 3717, 'initproperty', '_-q5e'),
  background: requireInstruction(methods, strings, 6294, 1465, 'initproperty', '_-A5p'),
  exhausted: requireInstruction(methods, strings, 6294, 4539, 'initproperty', '_-z2k'),
  gravityCancel: requireInstruction(methods, strings, 6294, 5803, 'initproperty', '_-z1x'),
  momentum: requireInstruction(methods, strings, 6294, 7686, 'initproperty', '_-x3g'),
  teamTaunt: requireInstruction(methods, strings, 6294, 9850, 'initproperty', '_-aC'),
}
const runtimeAnchors = {
  backgroundLookup: requireInstruction(methods, strings, 46, 3748, 'callproperty', '_-51i'),
  comboLookup: requireInstruction(methods, strings, 75, 56, 'callproperty', '_-51i'),
  teamTauntLookup: requireInstruction(methods, strings, 1509, 327, 'callproperty', '_-51i'),
  directSelectionLookup: requireInstruction(methods, strings, 1535, 895, 'callproperty', '_-51i'),
  exhaustedSelectionLookup: requireInstruction(methods, strings, 1535, 1026, 'callproperty', '_-51i'),
  gravityCancelSelectionLookup: requireInstruction(methods, strings, 1535, 1086, 'callproperty', '_-51i'),
  modeOverrideSelectionLookup: requireInstruction(methods, strings, 1535, 1154, 'callproperty', '_-51i'),
  momentumSelectionLookup: requireInstruction(methods, strings, 1535, 1311, 'callproperty', '_-51i'),
  hitOverrideRead: requireInstruction(methods, strings, 1538, 432, 'getproperty', '_-G25'),
  wallOverrideRead: requireInstruction(methods, strings, 1538, 490, 'getproperty', '_-Vo'),
  releaseOverrideRead: requireInstruction(methods, strings, 1538, 520, 'getproperty', '_-q10'),
  finalComboRead: requireInstruction(methods, strings, 1538, 744, 'getproperty', '_-H1b'),
  interruptLookup: requireInstruction(methods, strings, 1551, 1160, 'callproperty', '_-51i'),
  originResolutionLookup: requireInstruction(methods, strings, 6306, 77, 'callproperty', '_-51i'),
}

const result = {
  status: 'bounded-source-selection-closure-with-runtime-root-blockers',
  identity: {
    build: EXPECTED_BUILD,
    ...identities,
    extractedEntryCount: extractedEntries.length,
    extractedAggregateSha256,
    decodedMethodBodies: abc.method_body.length,
    branchTargetsValid: true,
  },
  inventory: {
    recordsIncludingTemplate: powerRows.length,
    templateRecords: templateRows.length,
    runtimeRecords: records.size,
    serializedGeometrySlotsIncludingTemplate: powerRows.reduce(
      (total, row) =>
        total + countGeometrySlots(Object.fromEntries(powerHeader.map((field, index) => [field, row[index]]))),
      0,
    ),
  },
  declarativeRoots: {
    bySource: sourceRootSummary,
    union: declarativeRoots.size,
    levelRootFiles: levelRootFiles.size,
    ledgerSha256: rootLedgerSha256,
  },
  sourceSelectionGraph: {
    transitionFieldCount: TRANSITION_FIELDS.length,
    transitionEdgeCount: transitionEdges.length,
    transitionLedgerSha256,
    reachedRecords: reached.size,
    excludedRecords: excluded.length,
    reachedGeometryRecords,
    excludedGeometryRecords,
    reachedGeometrySlots,
    excludedGeometrySlots,
    selectionPathLedgerSha256,
    reachedPhaseLedgerSha256,
    excludedLedgerSha256,
  },
  avm2: {
    parserMethodId: 6294,
    rootRegistrarMethodId: 6302,
    recursiveRegistrarMethodId: 6303,
    lookupMethodId: POWER_LOOKUP_METHOD_ID,
    originResolverMethodId: 6306,
    templateParserStringPc: templateParserStringPcs[0],
    templateNameLoad,
    templateSkipBranch,
    templateNonTemplateTargetPc,
    templateSkipReturn,
    templateParserWindow: (methods.get(6294) ?? [])
      .filter((instruction) => instruction.pc >= 140 && instruction.pc <= 170)
      .map((instruction) => ({ pc: instruction.pc, opcode: instruction.name })),
    parserColumnAnchors,
    parserTraitAnchors,
    runtimeAnchors,
    transitionReferenceLedgerSha256,
    transitionReferenceLedgers,
    selectionMethodLedgerSha256,
    exactPowerNameStringCount: exactAbcPowerNameStrings.length,
    exactPowerNameStringSha256: exactAbcPowerNameSha256,
    lookupCallsiteMethodCount: powerLookupCallsites.length,
    lookupInstructionCount: powerLookupCallsites.reduce((total, entry) => total + entry.references.length, 0),
    lookupCallsiteSha256: powerLookupCallsiteSha256,
    lookupCallsites: powerLookupCallsites,
  },
  proved: [
    'The pinned source graph contains one parser-skipped Template row and 3,670 non-template PowerType records.',
    'Five pinned declarative source families name 2,253 distinct PowerType roots before transition closure.',
    'Thirteen explicit transition columns plus the implicit _TESTFEATURE naming rule close 3,632 source-selectable records and 6,322 serialized geometry slots.',
    'The pinned ABC routes named PowerType resolution through method 6304 and has a complete exact-QName callsite ledger.',
    'Methods 46, 75, 1509, 1535, 1538, 1551, and 6306 consume background, combo, team-taunt, direct, exhausted, gravity-cancel, mode, momentum, interrupt, and origin paths.',
  ],
  blockers: [
    'The accepted replay-producing configuration tuple is not closed, so declarative hero, item, power-swap, taunt, level, mode, and test-feature roots cannot be partitioned into reachable and unreachable configurations.',
    'The complete PowerType lookup ledger spans runtime, loader, presentation, and tooling methods whose reachability from every match tick root is not closed.',
    'Some lookup arguments are constructed dynamically rather than stored as exact PowerName strings; all argument producers and value domains are not closed.',
    'The 38 records outside the declarative transition closure, including six serialized geometry slots, therefore have no proved unreachability reason.',
    'Source presence proves selection vocabulary, not that a replay-producing build-10.09.96325 configuration can exercise each root or transition gate.',
  ],
}

console.log(JSON.stringify(result, null, 2))
