import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_POWER_TYPES_SHA256 = '715468d8eda8fa2ec3d88a8b5395c076bec937640927909add4745eda2883f27'
const EXPECTED_HURTBOX_TYPES_SHA256 = '358aac8501dbf9051c22c7f14c8eef72a16cd0a071ad2ef398ab6695286e3333'
const EXPECTED_POWER_RECORDS = 3671
const EXPECTED_POWER_COLUMNS = 182
const EXPECTED_HURTBOX_RECORDS = 906
const EXPECTED_HURTBOX_COLUMNS = 10
const EXPECTED_TARGET_METHOD_SET_SHA256 = '3975339aa087d48d9490a5a4bc83df5cd78c4eabcf4a9d528bad73e5532e0223'
const POWER_CLASS_INDEX = 342
const COLLISION_REGION_CLASS_INDEX = 729
const EXPECTED_REFERENCE_LEDGER_SHA256: Record<string, string> = {
  '_-i57': '8fc50302d9593aa0bd6bb0e4d2adfdf5d27197a6a182adbc6d16745a65f4c1eb',
  '_-i45': '365cac1b86a76c7fa62887ce252e5af01ffe40995f698209396de4b235ab3888',
  '_-h2W': '38cd6bb3f6f60a2ae627e2f1b5dd79a88e987ce2a9d029b3cc023b5b27cdbf8a',
  '_-K5E': '80b2435cca81c0d4ca9d0d6a177faebafc781d9fe357fd47b3803c234dcbf638',
  '_-Ie': '1084a4bdeaf7a2741fd9647b5ee535fefe5d4269cac972d2192c5a8610b4afdb',
  '_-JB': '3dbd3b517ebf4f5a452bd50f2942f4b5ca4c00f6d89ae122108fe658ecfed5fb',
  '_-n59': '3074e01ec29bd8658b491ef87ff7dd3d977f4d495371c5ea5687169529ce9a8e',
  '_-s2L': '17257565ce788c9f77089ccf9b57f7630769f81f2e16344254572e614cdade0a',
  '_-46W': 'f935d99d67af9f74d03dd4cd79040ce7a0691fa816105550aa1a68291a21a6b2',
}
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
      if (typeof offset !== 'number' || !boundaries.has(instruction.endPc + offset)) {
        errors.push(`PC ${instruction.pc}`)
      }
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
  if (name !== undefined)
    assert(actualName === name, `method ${methodId} instruction ${instructionIndex} does not name ${name}`)
  return { index: instructionIndex, pc: instruction.pc, opcode, name: actualName }
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
function exactQNameAt(methods: Map<number, LocatedInstruction[]>, methodId: number, instructionIndex: number): string {
  const instruction = methods.get(methodId)?.[instructionIndex]
  assert(instruction, `method ${methodId} lacks instruction ${instructionIndex}`)
  const key = qnameKey(instruction.params[0])
  assert(key, `method ${methodId} instruction ${instructionIndex} does not use an exact QName`)
  return key
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
function headerIndex(header: string[], name: string): number {
  const index = header.indexOf(name)
  assert(index !== -1, `missing column ${name}`)
  return index
}
function delimiterFeatures(value: string): string {
  return (
    [',', '&', '~', ':', '@', '-', 't', '!', '|'].filter((delimiter) => value.includes(delimiter)).join('') || 'scalar'
  )
}
function displayOperand(value: unknown, strings: string[]): unknown {
  if (Array.isArray(value)) return value.map((entry) => displayOperand(entry, strings))
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return value
  return multinameName(value, strings) || null
}
function traceRange(
  methods: Map<number, LocatedInstruction[]>,
  strings: string[],
  methodId: number,
  startIndex: number,
  endIndex: number,
): Array<{ index: number; pc: number; opcode: string; name: string; operands: unknown[] }> {
  const instructions = methods.get(methodId)
  assert(
    instructions?.[startIndex] && instructions[endIndex],
    `method ${methodId} lacks trace ${startIndex}..${endIndex}`,
  )
  return instructions.slice(startIndex, endIndex + 1).map((instruction) => ({
    index: instruction.index,
    pc: instruction.pc,
    opcode: instruction.name,
    name: instructionName(instruction, strings),
    operands: instruction.params.map((value) => displayOperand(value, strings)),
  }))
}

const abcPath = argument('--abc')
const powerTypesPath = argument('--power-types')
const hurtboxTypesPath = argument('--hurtbox-types')
assert(
  abcPath && powerTypesPath && hurtboxTypesPath,
  'usage: bun offensive_hitbox_timing_provenance.ts --abc <main.abc> --power-types <Game.swz.38.dat> --hurtbox-types <Game.swz.24.dat>',
)

const abcBytes = readFileSync(resolve(abcPath))
const powerBytes = readFileSync(resolve(powerTypesPath))
const hurtboxBytes = readFileSync(resolve(hurtboxTypesPath))
const identities = {
  abcSha256: sha256(new Uint8Array(abcBytes)),
  powerTypesSha256: sha256(new Uint8Array(powerBytes)),
  hurtboxTypesSha256: sha256(new Uint8Array(hurtboxBytes)),
}
assert(identities.abcSha256 === EXPECTED_ABC_SHA256, `ABC SHA-256 mismatch: ${identities.abcSha256}`)
assert(identities.powerTypesSha256 === EXPECTED_POWER_TYPES_SHA256, 'PowerTypes SHA-256 mismatch')
assert(identities.hurtboxTypesSha256 === EXPECTED_HURTBOX_TYPES_SHA256, 'HurtboxTypes SHA-256 mismatch')

const powerCsv = parseCsv(powerBytes.toString('utf8'))
assert(powerCsv[0]?.length === 1 && powerCsv[0][0] === 'powerTypes', 'PowerTypes marker mismatch')
const powerHeader = powerCsv[1]
const powerRows = powerCsv.slice(2)
assert(powerHeader.length === EXPECTED_POWER_COLUMNS, `PowerTypes column count is ${powerHeader.length}`)
assert(powerRows.length === EXPECTED_POWER_RECORDS, `PowerTypes record count is ${powerRows.length}`)
assert(
  powerRows.every((row) => row.length === powerHeader.length),
  'PowerTypes row width mismatch',
)
const hurtboxCsv = parseCsv(hurtboxBytes.toString('utf8'))
assert(hurtboxCsv[0]?.length === 1 && hurtboxCsv[0][0] === 'hurtboxTypes', 'HurtboxTypes marker mismatch')
const hurtboxHeader = hurtboxCsv[1]
const hurtboxRows = hurtboxCsv.slice(2)
assert(hurtboxHeader.length === EXPECTED_HURTBOX_COLUMNS, `HurtboxTypes column count is ${hurtboxHeader.length}`)
assert(hurtboxRows.length === EXPECTED_HURTBOX_RECORDS, `HurtboxTypes record count is ${hurtboxRows.length}`)
assert(
  hurtboxRows.every((row) => row.length === hurtboxHeader.length),
  'HurtboxTypes row width mismatch',
)

const geometryColumns = ['AoERadiusX', 'AoERadiusY', 'CenterOffsetX', 'CenterOffsetY'] as const
const phaseColumns = ['CastTime', ...geometryColumns] as const
const powerNameIndex = headerIndex(powerHeader, 'PowerName')
const targetMethodIndex = headerIndex(powerHeader, 'TargetMethod')
const phaseIndices = Object.fromEntries(phaseColumns.map((name) => [name, headerIndex(powerHeader, name)])) as Record<
  (typeof phaseColumns)[number],
  number
>
const targetMethods = [...new Set(powerRows.map((row) => row[targetMethodIndex]).filter(Boolean))].sort(
  (left, right) => (left < right ? -1 : left > right ? 1 : 0),
)
assert(targetMethods.length === 44, `expected 44 named target methods, found ${targetMethods.length}`)
const targetMethodSetSha256 = sha256(JSON.stringify(targetMethods))
assert(targetMethodSetSha256 === EXPECTED_TARGET_METHOD_SET_SHA256, 'TargetMethod name set changed')
const nonDefaultGeometryExpressionRecordCount = powerRows.filter((row) =>
  geometryColumns.some((name) => row[phaseIndices[name]] !== '' && row[phaseIndices[name]] !== '0'),
).length
assert(
  nonDefaultGeometryExpressionRecordCount === 1845,
  `expected 1845 non-default geometry-expression records, found ${nonDefaultGeometryExpressionRecordCount}`,
)
const geometryPhaseSlots = powerRows.reduce(
  (total, row) =>
    total +
    Math.max(
      ...geometryColumns.map((name) => {
        const value = row[phaseIndices[name]]
        return value ? value.split(',').length : 0
      }),
    ),
  0,
)
assert(geometryPhaseSlots === 6329, `expected 6329 serialized geometry phase slots, found ${geometryPhaseSlots}`)
const phaseDelimiterForms = Object.fromEntries(
  phaseColumns.map((name) => {
    const counts = new Map<string, number>()
    for (const row of powerRows) {
      const value = row[phaseIndices[name]]
      if (!value) continue
      const form = delimiterFeatures(value)
      counts.set(form, (counts.get(form) ?? 0) + 1)
    }
    return [name, Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)))]
  }),
)
const powerLedger = powerRows.map((row) => [
  row[powerNameIndex],
  row[targetMethodIndex],
  ...phaseColumns.map((name) => row[phaseIndices[name]]),
])
const targetFilterLedger = powerRows.map((row) => [
  row[powerNameIndex],
  ...['Priority', 'CanDamageEveryone', 'MinTimeBetweenHits', 'InheritAlreadyHit'].map(
    (name) => row[headerIndex(powerHeader, name)],
  ),
])
const powerLedgerSha256 = sha256(JSON.stringify(powerLedger))
assert(
  powerLedgerSha256 === 'fcaee09b3adb51a9e133d1aa0d963ad15481aeba361eee3145d4891e62295e92',
  `power phase ledger changed: ${powerLedgerSha256}`,
)
const targetFilterLedgerSha256 = sha256(JSON.stringify(targetFilterLedger))
assert(
  targetFilterLedgerSha256 === '5e40d8e2e8d010e5427dd0437462404c7a771919a9056608e4df3d03c14416ed',
  `target-filter ledger changed: ${targetFilterLedgerSha256}`,
)
const hurtboxIndices = Object.fromEntries(
  ['HurtboxName', 'AnimClass', 'AnimName', 'Width', 'Height', 'OffsetX', 'OffsetY', 'Frames'].map((name) => [
    name,
    headerIndex(hurtboxHeader, name),
  ]),
) as Record<string, number>
const hurtboxFrameRecordCount = hurtboxRows.filter((row) => row[hurtboxIndices.Frames]).length
const hurtboxAnimClassReferenceCount = hurtboxRows.filter(
  (row) => row[hurtboxIndices.AnimClass] && row[hurtboxIndices.AnimClass] !== '--',
).length
assert(hurtboxFrameRecordCount === 886, `expected 886 frame-bearing hurtboxes, found ${hurtboxFrameRecordCount}`)
assert(
  hurtboxAnimClassReferenceCount === 901,
  `expected 901 hurtbox AnimClass references, found ${hurtboxAnimClassReferenceCount}`,
)
const hurtboxLedger = hurtboxRows.map((row) => [
  row[hurtboxIndices.HurtboxName],
  row[hurtboxIndices.AnimClass],
  row[hurtboxIndices.AnimName],
  row[hurtboxIndices.Width],
  row[hurtboxIndices.Height],
  row[hurtboxIndices.OffsetX],
  row[hurtboxIndices.OffsetY],
  row[hurtboxIndices.Frames],
])
const hurtboxLedgerSha256 = sha256(JSON.stringify(hurtboxLedger))
assert(
  hurtboxLedgerSha256 === 'a3d7d50dd9791c7e0cb8a2741fbefb9abac075966c31ffe4b3890076164187d0',
  `hurtbox ledger changed: ${hurtboxLedgerSha256}`,
)

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
assert(
  owners.get(6294)?.classIndex === POWER_CLASS_INDEX && owners.get(6294)?.static,
  'PowerTypes parser owner changed',
)
assert(
  owners.get(4655)?.classIndex === 237 && owners.get(4655)?.traitName === '_-E2Z' && owners.get(4655)?.static,
  'HurtboxTypes parser owner changed',
)
assert(owners.get(46)?.classIndex === 4 && owners.get(46)?.traitName === '_-81I', 'active-power tick owner changed')
assert(
  owners.get(10239)?.classIndex === 553 && owners.get(10239)?.traitName === '_-j5S' && !owners.get(10239)?.static,
  'collision forwarding method owner changed',
)
assert(
  owners.get(13561)?.classIndex === COLLISION_REGION_CLASS_INDEX && owners.get(13561)?.static,
  'collision factory owner changed',
)

const parserAnchors = {
  powerName: requireAt(methods, strings, 6294, 67, 'pushstring', 'PowerName'),
  radiusX: requireAt(methods, strings, 6294, 439, 'pushstring', 'AoERadiusX'),
  radiusY: requireAt(methods, strings, 6294, 463, 'pushstring', 'AoERadiusY'),
  castTime: requireAt(methods, strings, 6294, 862, 'pushstring', 'CastTime'),
  offsetX: requireAt(methods, strings, 6294, 874, 'pushstring', 'CenterOffsetX'),
  offsetY: requireAt(methods, strings, 6294, 898, 'pushstring', 'CenterOffsetY'),
  targetMethod: requireAt(methods, strings, 6294, 3050, 'pushstring', 'TargetMethod'),
  castDurationParse: requireAt(methods, strings, 6294, 4071, 'callproperty', 'parseInt'),
  castRangeStart: requireAt(methods, strings, 6294, 4133, 'callpropvoid', '_-p3o'),
  castRangeEnd: requireAt(methods, strings, 6294, 4155, 'callpropvoid', '_-p3o'),
  phaseRadiusX: requireAt(methods, strings, 6294, 4362, 'getproperty', '_-i45'),
  phaseRadiusY: requireAt(methods, strings, 6294, 4372, 'getproperty', '_-h2W'),
  phaseOffsetX: requireAt(methods, strings, 6294, 4382, 'getproperty', '_-K5E'),
  phaseOffsetY: requireAt(methods, strings, 6294, 4392, 'getproperty', '_-Ie'),
  hurtboxName: requireAt(methods, strings, 4655, 48, 'pushstring', 'HurtboxName'),
  hurtboxFrames: requireAt(methods, strings, 4655, 138, 'pushstring', 'Frames'),
  hurtboxOffsetX: requireAt(methods, strings, 4655, 150, 'pushstring', 'OffsetX'),
  hurtboxOffsetY: requireAt(methods, strings, 4655, 162, 'pushstring', 'OffsetY'),
  hurtboxWidth: requireAt(methods, strings, 4655, 174, 'pushstring', 'Width'),
  hurtboxHeight: requireAt(methods, strings, 4655, 186, 'pushstring', 'Height'),
}
const runtimeAnchors = {
  phaseDurationBounds: requireAt(methods, strings, 46, 1829, 'getproperty', '_-i57'),
  phaseDurationRead: requireAt(methods, strings, 46, 1852, 'getproperty', '_-i57'),
  activeOffsetX: requireAt(methods, strings, 46, 1303, 'getproperty', '_-K5E'),
  activeOffsetY: requireAt(methods, strings, 46, 1309, 'getproperty', '_-Ie'),
  activeRadiusX: requireAt(methods, strings, 46, 1315, 'getproperty', '_-i45'),
  activeRadiusY: requireAt(methods, strings, 46, 1321, 'getproperty', '_-h2W'),
  collisionCreate: requireAt(methods, strings, 46, 1334, 'callpropvoid', '_-j5S'),
  collisionForwardToFactory: requireAt(methods, strings, 10239, 18, 'callproperty', '_-S4l'),
  collisionQueue: requireAt(methods, strings, 10239, 52, 'callpropvoid', 'push'),
  factoryFacingIndex: requireAt(methods, strings, 13561, 73, 'callproperty', '_-03K'),
  factorySubtractX: requireAt(methods, strings, 13561, 83, 'subtract'),
  factorySubtractY: requireAt(methods, strings, 13561, 92, 'subtract'),
  factoryFacingAddX: requireAt(methods, strings, 13561, 141, 'add'),
  factoryRegionCenter: requireAt(methods, strings, 13561, 160, 'callpropvoid', '_-J4i'),
  factoryRegionSize: requireAt(methods, strings, 13561, 164, 'callpropvoid', '_-j4Z'),
  priorityFirst: requireAt(methods, strings, 1474, 747, 'getproperty', '_-JB'),
  prioritySecond: requireAt(methods, strings, 1474, 750, 'getproperty', '_-JB'),
  priorityComparison: requireAt(methods, strings, 1474, 799, 'greaterthan'),
  firstTieBreakFirst: requireAt(methods, strings, 1474, 754, 'getproperty', '_-F5f'),
  firstTieBreakSecond: requireAt(methods, strings, 1474, 756, 'getproperty', '_-F5f'),
  secondTieBreakFirst: requireAt(methods, strings, 1474, 760, 'getproperty', '_-V6R'),
  secondTieBreakSecond: requireAt(methods, strings, 1474, 762, 'getproperty', '_-V6R'),
  losingCandidateMarks: [
    requireAt(methods, strings, 1474, 771, 'initproperty', '_-J2T'),
    requireAt(methods, strings, 1474, 775, 'initproperty', '_-J2T'),
  ],
  globalDamageFilter: requireAt(methods, strings, 1484, 335, 'getproperty', '_-n59'),
  repeatedHitWindow: requireAt(methods, strings, 1540, 186, 'getproperty', '_-s2L'),
  inheritedHitFilter: requireAt(methods, strings, 1538, 234, 'getproperty', '_-46W'),
  powerHurtboxReference: requireAt(methods, strings, 59, 60, 'getproperty', '_-114'),
  hurtboxLookup: requireAt(methods, strings, 59, 68, 'callproperty', '_-g5S'),
  presentationForceFacing: requireAt(methods, strings, 1558, 325, 'getproperty', '_-h2Q'),
  presentationFacing: requireAt(methods, strings, 1558, 332, 'initproperty', 'scaleX'),
}
assert(
  exactQNameAt(methods, 46, 1334) === methodQName(abc, 10239),
  'active-power tick no longer calls exact collision forwarding method 10239',
)
assert(
  exactQNameAt(methods, 10239, 18) === methodQName(abc, 13561),
  'collision forwarding method no longer calls exact collision factory method 13561',
)
const powerClass = abc.instance[POWER_CLASS_INDEX]
assert(
  multinameName(abc.constant_pool.multiname[powerClass.name - 1], strings) === 'PowerType',
  'PowerType class changed',
)
const fieldNames = ['_-i57', '_-i45', '_-h2W', '_-K5E', '_-Ie', '_-JB', '_-n59', '_-s2L', '_-46W']
const referenceLedgers = Object.fromEntries(
  fieldNames.map((name) => {
    const traits = (powerClass.trait as any[]).filter(
      (trait) => multinameName(abc.constant_pool.multiname[trait.name - 1], strings) === name,
    )
    assert(traits.length === 1, `expected one PowerType ${name} trait`)
    const qname = qnameKey(abc.constant_pool.multiname[traits[0].name - 1])
    assert(qname, `${name} is not an exact QName`)
    const references = exactReferences(methods, owners, qname)
    const digest = sha256(JSON.stringify(references))
    assert(digest === EXPECTED_REFERENCE_LEDGER_SHA256[name], `${name} exact-QName reference ledger changed`)
    return [name, { sha256: digest, references }]
  }),
)
const referenceTraces = {
  powerGeometryParsing: traceRange(methods, strings, 6294, 439, 484),
  castTimeRangeParsing: traceRange(methods, strings, 6294, 4064, 4160),
  normalizedPhaseGeometry: traceRange(methods, strings, 6294, 4349, 4400),
  activePhaseGeometryAndCreate: traceRange(methods, strings, 46, 1288, 1334),
  activePhaseDuration: traceRange(methods, strings, 46, 1825, 1865),
  collisionForwarding: traceRange(methods, strings, 10239, 4, 21),
  collisionFacingAndPlacement: traceRange(methods, strings, 13561, 73, 164),
  pairwiseArbitration: traceRange(methods, strings, 1474, 745, 807),
  canDamageEveryoneFilter: traceRange(methods, strings, 1484, 327, 370),
  repeatedHitWindow: traceRange(methods, strings, 1540, 178, 202),
  inheritedAlreadyHit: traceRange(methods, strings, 1538, 226, 248),
  hurtboxLookup: traceRange(methods, strings, 59, 59, 68),
  presentationFacing: traceRange(methods, strings, 1558, 318, 332),
}

console.log(
  JSON.stringify(
    {
      status: 'bounded-static-closure-with-reachability-blocker',
      identity: {
        build: EXPECTED_BUILD,
        ...identities,
        decodedMethodBodies: abc.method_body.length,
        branchTargetsValid: true,
      },
      powerTypes: {
        columns: powerHeader.length,
        records: powerRows.length,
        namedTargetMethodCount: targetMethods.length,
        targetMethodSetSha256,
        nonDefaultGeometryExpressionRecordCount,
        serializedGeometryPhaseSlots: geometryPhaseSlots,
        phaseDelimiterForms,
        powerPhaseLedgerSha256: sha256(JSON.stringify(powerLedger)),
        targetFilterLedgerSha256: sha256(JSON.stringify(targetFilterLedger)),
      },
      hurtboxTypes: {
        columns: hurtboxHeader.length,
        records: hurtboxRows.length,
        frameRecordCount: hurtboxFrameRecordCount,
        animClassReferenceCount: hurtboxAnimClassReferenceCount,
        ledgerSha256: sha256(JSON.stringify(hurtboxLedger)),
      },
      parserAnchors,
      runtimeAnchors,
      referenceLedgers,
      referenceTraces,
      blockers: [
        'Static inputs do not prove which of all PowerType records and combo phases are reachable from every replay-producing configuration.',
        'The focused trace does not prove the collision primitive implemented behind _-b20.',
        'No authenticated interpreted-runtime trace exists to prove exact per-tick activation and pairwise arbitration for every reachable phase.',
        'The focused trace does not establish complete gameplay semantics for all 44 TargetMethod names and every surrounding policy combination.',
        'The creation call has a facing-sign branch, but later owner or bone transforms have not been exhaustively excluded.',
        'Pairwise ordering uses _-JB, _-F5f, then _-V6R, but the latter two fields lack readable semantic names.',
      ],
    },
    null,
    2,
  ),
)
