import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }
type TargetPolicy = { mode: number; flags: string[] }

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_POWER_TYPES_SHA256 = '715468d8eda8fa2ec3d88a8b5395c076bec937640927909add4745eda2883f27'
const EXPECTED_POWER_RECORDS = 3671
const EXPECTED_POWER_COLUMNS = 182
const EXPECTED_TARGET_METHOD_SET_SHA256 = '3975339aa087d48d9490a5a4bc83df5cd78c4eabcf4a9d528bad73e5532e0223'
const EXPECTED_TARGET_FILTER_LEDGER_SHA256 = '5e40d8e2e8d010e5427dd0437462404c7a771919a9056608e4df3d03c14416ed'
const EXPECTED_TARGET_POLICY_SHA256 = 'e25e9ad789a8982a0becb1d47bddb9de89ec9280ab4c1cb3c27acd59d203cddc'
const EXPECTED_REFERENCE_LEDGER_SHA256: Record<string, string> = {
  targetMode: 'e357e0c07fb11e8cb9b50bb87a45497e0b15079d22568a4ffb998a2026e77d50',
  smashRelease: '2d66140d4e3675afef6bbc54515e927121dcdcb30e720207f3d38b93915a7011',
  canDamageEveryone: '3074e01ec29bd8658b491ef87ff7dd3d977f4d495371c5ea5687169529ce9a8e',
  minTimeBetweenHits: '17257565ce788c9f77089ccf9b57f7630769f81f2e16344254572e614cdade0a',
  inheritAlreadyHit: 'f935d99d67af9f74d03dd4cd79040ce7a0691fa816105550aa1a68291a21a6b2',
  priority: '3dbd3b517ebf4f5a452bd50f2942f4b5ca4c00f6d89ae122108fe658ecfed5fb',
  fighterStrength: '538d6989be9a7cfae990a0b006cc1dd45a17e3bedce2bcfca466968b2212c812',
  fighterDamage: '1a87f8c4e09c3497481b5b84020de5f99200bca44ebd59df2ee9462a1533f8dd',
  candidateLoser: '2f641c95f505855ef2a20483050749f3e6fcca3f10072f138c28454772e3896b',
}
const POWER_CLASS_INDEX = 342
const FIGHTER_CLASS_INDEX = 147
const CANDIDATE_CLASS_INDEX = 84
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

const BASE_TARGET_POLICIES: Record<string, TargetPolicy> = {
  AssistTaunt: { mode: 12, flags: ['_-K4C', '_-a1E', '_-R5g'] },
  AssistTauntRelease: { mode: 12, flags: ['_-K4C', '_-a1E', '_-N3O'] },
  Collider: { mode: 13, flags: [] },
  Grab: { mode: 1, flags: ['_-h2x', '_-Q6d'] },
  GrabHit: { mode: 2, flags: ['_-cM', '_-h2x', '_-Q6d'] },
  GrabRelease: { mode: 2, flags: ['_-cM', '_-n2R'] },
  GroundCheck: { mode: 6, flags: ['_-x4d', '_-Q6I'] },
  GroundCheckGrabHit: { mode: 2, flags: ['_-cM', '_-h2x', '_-Q6d', '_-x4d', '_-B6R=1', '_-G67'] },
  GroundPound: { mode: 6, flags: [] },
  GroundPoundHB: { mode: 6, flags: ['_-x4d'] },
  GroundPoundRecover: { mode: 7, flags: [] },
  MeteorPound: { mode: 9, flags: ['_-x4d', '_-B6R=1'] },
  MeteorPoundRelease: { mode: 10, flags: [] },
  Nobody: { mode: 12, flags: [] },
  PBAoE: { mode: 1, flags: [] },
  PBAoEHB: { mode: 1, flags: ['_-x4d'] },
  Path: { mode: 3, flags: [] },
  PathExplosion: { mode: 5, flags: ['_-F3s=1', '_-56a'] },
  Ranged: { mode: 2, flags: ['_-cM'] },
  RangedAoE: { mode: 5, flags: [] },
  RangedGrab: { mode: 5, flags: ['_-h2x', '_-Q6d'] },
  Self: { mode: 4, flags: [] },
  Smash: { mode: 8, flags: [] },
  SmashGrab: { mode: 8, flags: ['_-h2x', '_-Q6d'] },
  Stance: { mode: 14, flags: ['_-R1L'] },
  Taunt: { mode: 12, flags: ['_-K4C', '_-R5g'] },
  TauntRelease: { mode: 12, flags: ['_-K4C', '_-N3O'] },
  TeamTaunt: { mode: 12, flags: ['_-K4C', '_-K1p', '_-R5g'] },
  TeamTauntRelease: { mode: 12, flags: ['_-K4C', '_-K1p', '_-N3O', '_-cM'] },
  ThrownItem: { mode: 11, flags: [] },
  UITauntOverride: { mode: 12, flags: ['_-G4w'] },
}

function targetPolicy(name: string): TargetPolicy {
  if (name === 'SmashRelease') return { mode: 1, flags: ['_-H5k'] }
  const smashRelease = name.startsWith('SmashRelease')
  const baseName = smashRelease ? name.slice('SmashRelease'.length) : name
  const base = BASE_TARGET_POLICIES[baseName]
  assert(base, `unmapped TargetMethod ${name}`)
  return { mode: base.mode, flags: smashRelease ? ['_-H5k', ...base.flags] : base.flags }
}

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
  assert(target, `method ${methodId} instruction ${instructionIndex} has no instruction target`)
  return target.index
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
function traitReferences(
  abc: any,
  methods: Map<number, LocatedInstruction[]>,
  owners: Map<number, MethodOwner>,
  strings: string[],
  classIndex: number,
  fieldName: string,
): { type: string; sha256: string; references: ReturnType<typeof exactReferences> } {
  const instance = abc.instance[classIndex]
  const traits = (instance.trait as any[]).filter(
    (trait) => multinameName(abc.constant_pool.multiname[trait.name - 1], strings) === fieldName,
  )
  assert(traits.length === 1, `expected one class ${classIndex} ${fieldName} trait`)
  const qname = qnameKey(abc.constant_pool.multiname[traits[0].name - 1])
  assert(qname, `${fieldName} is not an exact QName`)
  const references = exactReferences(methods, owners, qname)
  return {
    type: multinameName(abc.constant_pool.multiname[traits[0].data.type_name - 1], strings),
    sha256: sha256(JSON.stringify(references)),
    references,
  }
}
function headerIndex(header: string[], name: string): number {
  const index = header.indexOf(name)
  assert(index !== -1, `missing column ${name}`)
  return index
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
  'usage: bun offensive_target_policy_provenance.ts --abc <main.abc> --power-types <Game.swz.38.dat>',
)

const abcBytes = readFileSync(resolve(abcPath))
const powerBytes = readFileSync(resolve(powerTypesPath))
const identities = {
  abcSha256: sha256(new Uint8Array(abcBytes)),
  powerTypesSha256: sha256(new Uint8Array(powerBytes)),
}
assert(identities.abcSha256 === EXPECTED_ABC_SHA256, `ABC SHA-256 mismatch: ${identities.abcSha256}`)
assert(identities.powerTypesSha256 === EXPECTED_POWER_TYPES_SHA256, 'PowerTypes SHA-256 mismatch')

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

const powerNameIndex = headerIndex(header, 'PowerName')
const targetMethodIndex = headerIndex(header, 'TargetMethod')
const targetMethods = [...new Set(rows.map((row) => row[targetMethodIndex]).filter(Boolean))].sort((left, right) =>
  left < right ? -1 : left > right ? 1 : 0,
)
assert(targetMethods.length === 44, `expected 44 named target methods, found ${targetMethods.length}`)
assert(sha256(JSON.stringify(targetMethods)) === EXPECTED_TARGET_METHOD_SET_SHA256, 'TargetMethod name set changed')
assert(
  targetMethods.every((name) => targetPolicy(name)),
  'TargetMethod parser map is incomplete',
)

const targetFilterNames = ['Priority', 'CanDamageEveryone', 'MinTimeBetweenHits', 'InheritAlreadyHit'] as const
const targetFilterLedger = rows.map((row) => [
  row[powerNameIndex],
  ...targetFilterNames.map((name) => row[headerIndex(header, name)]),
])
assert(
  sha256(JSON.stringify(targetFilterLedger)) === EXPECTED_TARGET_FILTER_LEDGER_SHA256,
  'target-filter ledger changed',
)
const targetMethodPolicies = targetMethods.map((name) => ({
  name,
  sourceRecordCount: rows.filter((row) => row[targetMethodIndex] === name).length,
  ...targetPolicy(name),
}))
assert(
  sha256(JSON.stringify(targetMethodPolicies)) === EXPECTED_TARGET_POLICY_SHA256,
  'TargetMethod policy map changed',
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
assert(owners.get(1474)?.classIndex === 85 && owners.get(1474)?.traitName === '_-Z29', 'arbitration owner changed')
assert(owners.get(1484)?.classIndex === 85 && owners.get(1484)?.traitName === '_-S6I', 'hit filter owner changed')

const parserAnchors = {
  targetMethod: requireAt(methods, strings, 6294, 3050, 'pushstring', 'TargetMethod'),
  smashReleasePrefix: requireAt(methods, strings, 6294, 3059, 'pushstring', 'SmashRelease'),
  smashReleaseFlag: requireAt(methods, strings, 6294, 3065, 'initproperty', '_-H5k'),
  smashReleaseEmptyMode: requireAt(methods, strings, 6294, 3079, 'initproperty', '_-84Z'),
  lastKnownMethod: requireAt(methods, strings, 6294, 3484, 'pushstring', 'UITauntOverride'),
  unknownMethodError: requireAt(methods, strings, 6294, 3495, 'pushstring', 'Unknown Target Method Name:'),
  priority: requireAt(methods, strings, 6294, 2903, 'pushstring', 'Priority'),
  priorityClamp: requireAt(methods, strings, 6294, 2914, 'callproperty', '_-x4i'),
  canDamageEveryone: requireAt(methods, strings, 6294, 645, 'pushstring', 'CanDamageEveryone'),
  minTimeBetweenHits: requireAt(methods, strings, 6294, 2652, 'pushstring', 'MinTimeBetweenHits'),
  inheritAlreadyHit: requireAt(methods, strings, 6294, 2474, 'pushstring', 'InheritAlreadyHit'),
}
requireIntegerAt(methods, 6294, 3077, 'pushbyte', 1)
requireIntegerAt(methods, 6294, 2910, 'pushbyte', 100)
requireIntegerAt(methods, 6294, 2912, 'pushbyte', 0)

const baseParserAnchors = [
  ['PBAoE', 3082, 1, 3085],
  ['Path', 3090, 3, 3093],
  ['Collider', 3098, 13, 3101],
  ['Self', 3106, 4, 3109],
  ['RangedAoE', 3114, 5, 3117],
  ['ThrownItem', 3122, 11, 3125],
  ['GroundPound', 3130, 6, 3133],
  ['GroundPoundRecover', 3138, 7, 3141],
  ['MeteorPoundRelease', 3146, 10, 3149],
  ['Smash', 3154, 8, 3157],
  ['Nobody', 3162, 12, 3165],
  ['Ranged', 3170, 2, 3173],
  ['Grab', 3181, 1, 3184],
  ['GrabHit', 3195, 2, 3198],
  ['GrabRelease', 3212, 2, 3215],
  ['RangedGrab', 3226, 5, 3229],
  ['SmashGrab', 3240, 8, 3243],
  ['GroundCheckGrabHit', 3254, 2, 3257],
  ['MeteorPound', 3300, 9, 3303],
  ['GroundPoundHB', 3314, 6, 3317],
  ['GroundCheck', 3325, 6, 3328],
  ['PBAoEHB', 3339, 1, 3342],
  ['PathExplosion', 3350, 5, 3353],
  ['Stance', 3365, 14, 3368],
  ['Taunt', 3376, 12, 3379],
  ['TauntRelease', 3393, 12, 3396],
  ['TeamTaunt', 3407, 12, 3410],
  ['TeamTauntRelease', 3427, 12, 3430],
  ['AssistTaunt', 3447, 12, 3450],
  ['AssistTauntRelease', 3467, 12, 3470],
  ['UITauntOverride', 3484, 12, 3487],
] as const
for (const [name, nameIndex, mode, modeIndex] of baseParserAnchors) {
  requireAt(methods, strings, 6294, nameIndex, 'pushstring', name)
  requireIntegerAt(methods, 6294, modeIndex, 'pushbyte', mode)
}
const parserFlagAnchors = [
  ['_-cM', 3178],
  ['_-h2x', 3189],
  ['_-Q6d', 3192],
  ['_-cM', 3203],
  ['_-h2x', 3206],
  ['_-Q6d', 3209],
  ['_-cM', 3220],
  ['_-n2R', 3223],
  ['_-h2x', 3234],
  ['_-Q6d', 3237],
  ['_-h2x', 3248],
  ['_-Q6d', 3251],
  ['_-cM', 3262],
  ['_-h2x', 3265],
  ['_-Q6d', 3268],
  ['_-x4d', 3271],
  ['_-B6R', 3274],
  ['_-G67', 3277],
  ['_-x4d', 3308],
  ['_-B6R', 3311],
  ['_-x4d', 3322],
  ['_-x4d', 3333],
  ['_-Q6I', 3336],
  ['_-x4d', 3347],
  ['_-F3s', 3359],
  ['_-56a', 3362],
  ['_-R1L', 3373],
  ['_-K4C', 3384],
  ['_-R5g', 3387],
  ['_-K4C', 3401],
  ['_-N3O', 3404],
  ['_-K4C', 3415],
  ['_-K1p', 3418],
  ['_-R5g', 3421],
  ['_-K4C', 3435],
  ['_-K1p', 3438],
  ['_-N3O', 3441],
  ['_-cM', 3444],
  ['_-K4C', 3455],
  ['_-a1E', 3458],
  ['_-R5g', 3461],
  ['_-K4C', 3475],
  ['_-a1E', 3478],
  ['_-N3O', 3481],
  ['_-G4w', 3492],
] as const
for (const [flag, index] of parserFlagAnchors) requireAt(methods, strings, 6294, index, 'initproperty', flag)
requireIntegerAt(methods, 6294, 3273, 'pushbyte', 1)
requireIntegerAt(methods, 6294, 3310, 'pushbyte', 1)
requireIntegerAt(methods, 6294, 3357, 'pushbyte', 1)

const arbitrationBranchTargets = {
  fullTie: branchTargetIndex(methods, 1474, 763),
  fullTieExit: branchTargetIndex(methods, 1474, 777),
  fullTieFinalExit: branchTargetIndex(methods, 1474, 792),
  sourceDamageNotLower: branchTargetIndex(methods, 1474, 768),
  sourceStrengthNotHigher: branchTargetIndex(methods, 1474, 783),
  sourcePriorityNotHigher: branchTargetIndex(methods, 1474, 800),
}
assert(
  JSON.stringify(arbitrationBranchTargets) ===
    JSON.stringify({
      fullTie: 777,
      fullTieExit: 792,
      fullTieFinalExit: 809,
      sourceDamageNotLower: 773,
      sourceStrengthNotHigher: 788,
      sourcePriorityNotHigher: 805,
    }),
  `arbitration branch targets changed: ${JSON.stringify(arbitrationBranchTargets)}`,
)
const arbitrationAnchors = {
  priority: [
    requireAt(methods, strings, 1474, 747, 'getproperty', '_-JB'),
    requireAt(methods, strings, 1474, 750, 'getproperty', '_-JB'),
    requireAt(methods, strings, 1474, 799, 'greaterthan'),
  ],
  strength: [
    requireAt(methods, strings, 1474, 754, 'getproperty', '_-F5f'),
    requireAt(methods, strings, 1474, 756, 'getproperty', '_-F5f'),
    requireAt(methods, strings, 1474, 782, 'greaterthan'),
  ],
  damage: [
    requireAt(methods, strings, 1474, 760, 'getproperty', '_-V6R'),
    requireAt(methods, strings, 1474, 762, 'getproperty', '_-V6R'),
    requireAt(methods, strings, 1474, 768, 'ifnlt'),
  ],
  loserMarks: [
    requireAt(methods, strings, 1474, 771, 'initproperty', '_-J2T'),
    requireAt(methods, strings, 1474, 775, 'initproperty', '_-J2T'),
    requireAt(methods, strings, 1474, 803, 'initproperty', '_-J2T'),
    requireAt(methods, strings, 1474, 807, 'initproperty', '_-J2T'),
  ],
  bilateralSurvivorCheck: [
    requireAt(methods, strings, 1474, 811, 'getproperty', '_-J2T'),
    requireAt(methods, strings, 1474, 816, 'getproperty', '_-J2T'),
    requireAt(methods, strings, 1474, 827, 'callpropvoid', '_-s4Y'),
  ],
  survivorPass: [
    requireAt(methods, strings, 1474, 857, 'getproperty', '_-J2T'),
    requireAt(methods, strings, 1474, 924, 'callpropvoid', '_-S6I'),
  ],
}
const semanticAnchors = {
  strength: [
    requireAt(methods, strings, 2604, 160, 'getproperty', '_-F5f'),
    requireAt(methods, strings, 2604, 161, 'initproperty', 'TargetStrength'),
  ],
  damage: [
    requireAt(methods, strings, 2604, 81, 'getproperty', '_-V6R'),
    requireAt(methods, strings, 2604, 82, 'initproperty', 'TargetDamage'),
    requireAt(methods, strings, 2620, 53, 'getproperty', '_-V6R'),
    requireAt(methods, strings, 2620, 54, 'initproperty', 'Damage'),
  ],
  loserDefault: [
    requireAt(methods, strings, 1469, 38, 'findproperty', '_-J2T'),
    requireAt(methods, strings, 1469, 40, 'initproperty', '_-J2T'),
  ],
}
requireAt(methods, strings, 1469, 39, 'pushfalse')

const filterAnchors = {
  canDamageEveryone: requireAt(methods, strings, 1484, 335, 'getproperty', '_-n59'),
  sameTeamComparison: [
    requireAt(methods, strings, 1484, 339, 'getproperty', '_-HL'),
    requireAt(methods, strings, 1484, 341, 'getproperty', '_-HL'),
    requireAt(methods, strings, 1484, 342, 'equals'),
  ],
  repeatHit: [
    requireAt(methods, strings, 1540, 173, 'getproperty', '_-s2L'),
    requireAt(methods, strings, 1540, 186, 'getproperty', '_-s2L'),
    requireAt(methods, strings, 1540, 187, 'add_i'),
    requireAt(methods, strings, 1540, 190, 'greaterthan'),
  ],
  inheritAlreadyHit: requireAt(methods, strings, 1538, 234, 'getproperty', '_-46W'),
}

const referenceLedgers = {
  targetMode: traitReferences(abc, methods, owners, strings, POWER_CLASS_INDEX, '_-84Z'),
  smashRelease: traitReferences(abc, methods, owners, strings, POWER_CLASS_INDEX, '_-H5k'),
  canDamageEveryone: traitReferences(abc, methods, owners, strings, POWER_CLASS_INDEX, '_-n59'),
  minTimeBetweenHits: traitReferences(abc, methods, owners, strings, POWER_CLASS_INDEX, '_-s2L'),
  inheritAlreadyHit: traitReferences(abc, methods, owners, strings, POWER_CLASS_INDEX, '_-46W'),
  priority: traitReferences(abc, methods, owners, strings, POWER_CLASS_INDEX, '_-JB'),
  fighterStrength: traitReferences(abc, methods, owners, strings, FIGHTER_CLASS_INDEX, '_-F5f'),
  fighterDamage: traitReferences(abc, methods, owners, strings, FIGHTER_CLASS_INDEX, '_-V6R'),
  candidateLoser: traitReferences(abc, methods, owners, strings, CANDIDATE_CLASS_INDEX, '_-J2T'),
}
for (const [name, ledger] of Object.entries(referenceLedgers)) {
  assert(ledger.sha256 === EXPECTED_REFERENCE_LEDGER_SHA256[name], `${name} exact-QName reference ledger changed`)
}
assert(referenceLedgers.priority.type === 'uint', 'Priority type changed')
assert(referenceLedgers.fighterStrength.type === 'uint', 'fighter strength type changed')
assert(referenceLedgers.fighterDamage.type === 'Number', 'fighter damage type changed')
assert(referenceLedgers.candidateLoser.type === 'Boolean', 'candidate loser type changed')
assert(
  referenceLedgers.candidateLoser.references.map((entry) => entry.methodId).join(',') === '1469,1474',
  'candidate loser field escaped its constructor/arbitration lifecycle',
)

console.log(
  JSON.stringify(
    {
      status: 'bounded-static-policy-closure-with-acceptance-blockers',
      identity: {
        build: EXPECTED_BUILD,
        ...identities,
        decodedMethodBodies: abc.method_body.length,
        branchTargetsValid: true,
      },
      source: {
        columns: header.length,
        records: rows.length,
        targetMethodCount: targetMethods.length,
        targetMethodSetSha256: sha256(JSON.stringify(targetMethods)),
        targetFilterLedgerSha256: sha256(JSON.stringify(targetFilterLedger)),
        values: Object.fromEntries(
          targetFilterNames.map((name) => [name, valuesByFrequency(rows, headerIndex(header, name))]),
        ),
      },
      targetMethodPolicies,
      parserAnchors,
      baseParserAnchors: baseParserAnchors.map(([name, nameIndex, mode, modeIndex]) => ({
        name,
        nameIndex,
        mode,
        modeIndex,
      })),
      parserFlagAnchors: parserFlagAnchors.map(([flag, index]) => ({ flag, index })),
      arbitration: {
        order: ['higher Priority', 'higher source fighter Strength', 'lower source fighter Damage'],
        exactFullTie: 'mark neither candidate before bilateral survivor handling',
        loserField: '_-J2T',
        branchTargets: arbitrationBranchTargets,
        anchors: arbitrationAnchors,
      },
      filters: {
        canDamageEveryone: 'bypasses the reached same-team comparison, not every later filter',
        minTimeBetweenHits:
          'for a previously hit target and nonzero interval, block while priorHitTime + interval > currentTime; equality is admitted by this gate',
        inheritAlreadyHit: 'selects an inherited already-hit branch under surrounding combo conditions',
        anchors: filterAnchors,
      },
      semanticAnchors,
      referenceLedgers,
      blockers: [
        'No closed root proves which of the 3,671 PowerType rows and 44 source TargetMethod names are reachable from every replay-producing configuration.',
        'The parser map is exact, but complete downstream gameplay semantics for every target-mode enum and orthogonal flag are not closed.',
        'CanDamageEveryone reaches a same-team bypass, but the complete owner, mode-mask, assist, grab, dead, and invulnerability interaction matrix is not closed.',
        'InheritAlreadyHit is anchored in combo selection, but alias/copy/reset behavior and its exact global order relative to repeat-hit state are not closed.',
        'No authenticated interpreted-runtime trace covers each reachable target mode, all arbitration branches, repeat-hit equality, or the team/mode/invulnerability matrix.',
      ],
    },
    null,
    2,
  ),
)
