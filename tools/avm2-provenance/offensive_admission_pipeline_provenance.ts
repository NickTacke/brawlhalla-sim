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
const EXPECTED_POWER_RECORDS = 3671
const EXPECTED_POWER_COLUMNS = 182
const SOURCE_FIELDS = ['CanAssist', 'CanDamageEveryone', 'IsThrow', 'LoseInvulnTime'] as const
const POWER_CLASS_INDEX = 342
const FIGHTER_CLASS_INDEX = 147
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

const EXPECTED_METHOD_BODIES = {
  45: {
    classIndex: 4,
    traitName: '_-v3l',
    instructions: 453,
    bytes: 1151,
    sha256: 'e739fec0dfbef812416bbf98a2b3cbe3d8d4074ea021a64e83a4cf1c7fbc97c3',
  },
  1474: {
    classIndex: 85,
    traitName: '_-Z29',
    instructions: 1040,
    bytes: 2517,
    sha256: '53e9d43d535500d42ed0f5fa30a5fef5d864427adcfecae7160708a901d2a84f',
  },
  1479: {
    classIndex: 85,
    traitName: '_-m59',
    instructions: 208,
    bytes: 421,
    sha256: 'ff73b657f92d25957324c1856e998f5d650bda9756e6b98db5112422e2485fcd',
  },
  1484: {
    classIndex: 85,
    traitName: '_-S6I',
    instructions: 1612,
    bytes: 3442,
    sha256: '8946dcfe7cd438455bb5c031b247496ee70ae9f062f0c670f996dafe5575a39a',
  },
  1486: {
    classIndex: 85,
    traitName: '_-24S',
    instructions: 724,
    bytes: 1648,
    sha256: 'bbcca322cc9504c159078144d78f4b6b4f823d94dd6666a417ea2cdeb77fc35b',
  },
  1496: {
    classIndex: 87,
    traitName: '_-t2u',
    instructions: 284,
    bytes: 675,
    sha256: '1543e3a5ede4dad0f0b1959180203c08548b33d446413ec62b4398c461d11379',
  },
  1540: {
    classIndex: 87,
    traitName: '_-06D',
    instructions: 1395,
    bytes: 3555,
    sha256: '938498a77cadca991e4a1b267af849c43002f024de6f0f31ae27ce6d81365126',
  },
  2894: {
    classIndex: 147,
    traitName: '_-84O',
    instructions: 699,
    bytes: 1741,
    sha256: '1d976e4f5ec716fe29ad0e8eab382d921b315be877d986e1645a985152d4f79a',
  },
  2938: {
    classIndex: 147,
    traitName: '_-T11',
    instructions: 42,
    bytes: 90,
    sha256: '2eefbe932ca6f16eb86c8b00dfa0f5c2613b7234029579c03b162278020fce21',
  },
  2988: {
    classIndex: 147,
    traitName: '_-zO',
    instructions: 141,
    bytes: 302,
    sha256: 'ddbd36177a641dc419879871d4b9a15c987795e78a61b647d78078373812c5a9',
  },
  3051: {
    classIndex: 147,
    traitName: '_-N62',
    instructions: 24,
    bytes: 43,
    sha256: '027d8e7c61bee98e60e825d6867c642846b556af27031f020ea7dcd8cbb35a35',
  },
  3217: {
    classIndex: 164,
    traitName: '_-z3z',
    instructions: 2197,
    bytes: 5154,
    sha256: '70556850f6978d726b987b138fc46ba1353d040aac22789bc2a81db1e5a4dd11',
  },
} as const

const EXPECTED_FIELD_LEDGERS = {
  targetMode: 'e357e0c07fb11e8cb9b50bb87a45497e0b15079d22568a4ffb998a2026e77d50',
  canDamageEveryone: '3074e01ec29bd8658b491ef87ff7dd3d977f4d495371c5ea5687169529ce9a8e',
  canAssist: '85e120b9e65dbe0bbeda5a9d8900ddd04053a881815dd55b5ccdfe2947d4fbde',
  isThrow: '80944088e8c724075a85a58a36cf62fb9b41f4e6472677ef655d7fff3081ee0b',
  loseInvulnTime: '530f404313fd421ef227557ee348763e1d269405cb6d0f9701e5b53d9b41001c',
  grabRelease: '834e2014d4b9c1c292c68543d9e0ef9ae8604d7c5ad19f700b55e5e5acf4111f',
  grabGateA: '25d067961f6137f2f6a11eb28bfa92150cef838ab3b6b941ae5d283264e2b71a',
  grabGateB: '697a8dd06642e564485ad370b4f4cc0ab71ca4bc0d0949231505d6487a434abd',
  fighterTeam: '4a1508eacabdae15f6ade816f9259d58bd4dc1d079d907c74e800db5a1aeacf2',
  fighterState: '841b9d9240ab7cdc95d7a0de9064dec38dafe7ac859a6a34a0cbd43553284479',
  invulnerabilityUntil: '6d7a5a942acc36b788760983e21ecadf19ec4c940e822e0ba4d751ba3cf0a9e3',
} as const

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
function requireOperandAt(
  methods: Map<number, LocatedInstruction[]>,
  methodId: number,
  instructionIndex: number,
  opcode: string,
  operand: number,
): void {
  const instruction = methods.get(methodId)?.[instructionIndex]
  assert(instruction?.name === opcode, `method ${methodId} instruction ${instructionIndex} is not ${opcode}`)
  assert(instruction.params[0] === operand, `method ${methodId} instruction ${instructionIndex} operand changed`)
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
      references: instructions.flatMap((instruction) =>
        qnameKey(instruction.params[0]) === qname ? [{ pc: instruction.pc, opcode: instruction.name }] : [],
      ),
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
  const traits = (abc.instance[classIndex].trait as any[]).filter(
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

const abcPath = argument('--abc')
const powerTypesPath = argument('--power-types')
assert(
  abcPath && powerTypesPath,
  'usage: bun offensive_admission_pipeline_provenance.ts --abc <main.abc> --power-types <Game.swz.38.dat>',
)
const abcBytes = readFileSync(resolve(abcPath))
const powerTypesBytes = readFileSync(resolve(powerTypesPath))
const identities = {
  abcSha256: sha256(new Uint8Array(abcBytes)),
  powerTypesSha256: sha256(new Uint8Array(powerTypesBytes)),
}
assert(identities.abcSha256 === EXPECTED_ABC_SHA256, `ABC SHA-256 mismatch: ${identities.abcSha256}`)
assert(identities.powerTypesSha256 === EXPECTED_POWER_TYPES_SHA256, 'PowerTypes SHA-256 mismatch')
const powerTypesCsv = parseCsv(powerTypesBytes.toString('utf8'))
assert(powerTypesCsv[0]?.length === 1 && powerTypesCsv[0][0] === 'powerTypes', 'PowerTypes marker mismatch')
const powerTypesHeader = powerTypesCsv[1]
const powerTypesRows = powerTypesCsv.slice(2)
assert(powerTypesHeader.length === EXPECTED_POWER_COLUMNS, 'PowerTypes column count changed')
assert(powerTypesRows.length === EXPECTED_POWER_RECORDS, 'PowerTypes record count changed')
assert(
  powerTypesRows.every((row) => row.length === powerTypesHeader.length),
  'PowerTypes row width mismatch',
)
assert(
  SOURCE_FIELDS.every((name) => powerTypesHeader.includes(name)),
  'required PowerTypes policy field missing',
)

const abc: any = AbcFile.read(new ExtendedBuffer(abcBytes))
const strings = abc.constant_pool.string as string[]
const buildStrings = strings.filter((value) => /^\d+\.\d+\.\d+$/.test(value))
assert(buildStrings.length === 1 && buildStrings[0] === EXPECTED_BUILD, 'ABC build mismatch')
const disassembler = new InstructionDisassembler(abc)
const methods = new Map<number, LocatedInstruction[]>()
const methodBodies = new Map<number, Uint8Array>()
const branchErrors: string[] = []
for (const body of abc.method_body) {
  const instructions = locateInstructions(body.code, disassembler.disassemble(body) as Instruction[])
  methods.set(body.method, instructions)
  methodBodies.set(body.method, body.code)
  branchErrors.push(...validateBranches(instructions, body.code.length).map((pc) => `method ${body.method} ${pc}`))
}
assert(branchErrors.length === 0, `invalid branch targets: ${branchErrors.join(', ')}`)
const owners = buildOwners(abc, strings)

const bodyEvidence = Object.entries(EXPECTED_METHOD_BODIES).map(([methodText, expected]) => {
  const methodId = Number(methodText)
  const owner = owners.get(methodId)
  const body = methodBodies.get(methodId)
  const instructions = methods.get(methodId)
  assert(
    owner?.classIndex === expected.classIndex && owner.traitName === expected.traitName,
    `method ${methodId} owner changed`,
  )
  assert(body && body.length === expected.bytes, `method ${methodId} byte length changed`)
  assert(instructions?.length === expected.instructions, `method ${methodId} instruction count changed`)
  const actualSha256 = sha256(new Uint8Array(body))
  assert(actualSha256 === expected.sha256, `method ${methodId} body changed`)
  return { methodId, owner, instructions: instructions.length, bytes: body.length, sha256: actualSha256 }
})

const parserAnchors = {
  canAssist: [
    requireAt(methods, strings, 6294, 627, 'pushstring', 'CanAssist'),
    requireAt(methods, strings, 6294, 633, 'initproperty', '_-L1z'),
  ],
  canDamageEveryone: [
    requireAt(methods, strings, 6294, 645, 'pushstring', 'CanDamageEveryone'),
    requireAt(methods, strings, 6294, 651, 'initproperty', '_-n59'),
  ],
  isThrow: [
    requireAt(methods, strings, 6294, 2537, 'pushstring', 'IsThrow'),
    requireAt(methods, strings, 6294, 2543, 'initproperty', '_-O2D'),
  ],
  loseInvulnTime: [
    requireAt(methods, strings, 6294, 2634, 'pushstring', 'LoseInvulnTime'),
    requireAt(methods, strings, 6294, 2640, 'initproperty', '_-R1Q'),
  ],
}

const fieldLedgers = {
  targetMode: traitReferences(abc, methods, owners, strings, POWER_CLASS_INDEX, '_-84Z'),
  canDamageEveryone: traitReferences(abc, methods, owners, strings, POWER_CLASS_INDEX, '_-n59'),
  canAssist: traitReferences(abc, methods, owners, strings, POWER_CLASS_INDEX, '_-L1z'),
  isThrow: traitReferences(abc, methods, owners, strings, POWER_CLASS_INDEX, '_-O2D'),
  loseInvulnTime: traitReferences(abc, methods, owners, strings, POWER_CLASS_INDEX, '_-R1Q'),
  grabRelease: traitReferences(abc, methods, owners, strings, POWER_CLASS_INDEX, '_-n2R'),
  grabGateA: traitReferences(abc, methods, owners, strings, POWER_CLASS_INDEX, '_-Q6d'),
  grabGateB: traitReferences(abc, methods, owners, strings, POWER_CLASS_INDEX, '_-h2x'),
  fighterTeam: traitReferences(abc, methods, owners, strings, FIGHTER_CLASS_INDEX, '_-HL'),
  fighterState: traitReferences(abc, methods, owners, strings, FIGHTER_CLASS_INDEX, '_-N14'),
  invulnerabilityUntil: traitReferences(abc, methods, owners, strings, FIGHTER_CLASS_INDEX, '_-c5h'),
}
for (const [name, ledger] of Object.entries(fieldLedgers)) {
  assert(
    ledger.sha256 === EXPECTED_FIELD_LEDGERS[name as keyof typeof EXPECTED_FIELD_LEDGERS],
    `${name} reference ledger changed`,
  )
}
assert(fieldLedgers.canDamageEveryone.type === 'Boolean', 'CanDamageEveryone type changed')
assert(fieldLedgers.canAssist.type === 'Boolean', 'CanAssist type changed')
assert(fieldLedgers.isThrow.type === 'Boolean', 'IsThrow type changed')
assert(fieldLedgers.loseInvulnTime.type === 'uint', 'LoseInvulnTime type changed')
assert(fieldLedgers.fighterTeam.type === 'uint', 'fighter team type changed')
assert(fieldLedgers.fighterState.type === 'uint', 'fighter state type changed')
assert(fieldLedgers.invulnerabilityUntil.type === 'uint', 'invulnerability timestamp type changed')

requireOperandAt(methods, 1484, 45, 'getlocal', 5)
requireAt(methods, strings, 1484, 47, 'istypelate')
requireOperandAt(methods, 1484, 54, 'setlocal', 22)
const relationGateAnchors = {
  canDamageEveryone: requireAt(methods, strings, 1484, 335, 'getproperty', '_-n59'),
  team: [
    requireAt(methods, strings, 1484, 339, 'getproperty', '_-HL'),
    requireAt(methods, strings, 1484, 341, 'getproperty', '_-HL'),
    requireAt(methods, strings, 1484, 342, 'equals'),
  ],
  modeMask: [
    requireAt(methods, strings, 1484, 348, 'findproperty', '_-Z2h'),
    requireAt(methods, strings, 1484, 350, 'getproperty', '_-gs'),
    requireAt(methods, strings, 1484, 351, 'getproperty', '_-p2p'),
    requireAt(methods, strings, 1484, 352, 'getlex', '_-I37'),
    requireAt(methods, strings, 1484, 353, 'getproperty', '_-Fk'),
    requireAt(methods, strings, 1484, 354, 'bitand'),
    requireAt(methods, strings, 1484, 356, 'getproperty', '_-Fk'),
    requireAt(methods, strings, 1484, 357, 'equals'),
  ],
  ownerTargetInequality: requireAt(methods, strings, 1484, 362, 'equals'),
  sign: [
    requireAt(methods, strings, 1484, 375, 'lessthan'),
    requireAt(methods, strings, 1484, 381, 'not'),
    requireAt(methods, strings, 1484, 386, 'greaterthan'),
    requireAt(methods, strings, 1484, 390, 'returnvoid'),
  ],
}
requireOperandAt(methods, 1484, 338, 'getlocal', 5)
requireOperandAt(methods, 1484, 340, 'getlocal', 6)
requireOperandAt(methods, 1484, 360, 'getlocal', 22)
requireOperandAt(methods, 1484, 361, 'getlocal', 6)
const relationGateBranchTargets = {
  canDamageEveryoneTrue: branchTargetIndex(methods, 1484, 336),
  relationTrue: branchTargetIndex(methods, 1484, 345),
  modeMaskAbsent: branchTargetIndex(methods, 1484, 358),
  relationFalse: branchTargetIndex(methods, 1484, 371),
  negativeRelationSignAccepted: branchTargetIndex(methods, 1484, 377),
  positiveRelationPathSkipped: branchTargetIndex(methods, 1484, 382),
  rejected: branchTargetIndex(methods, 1484, 389),
}
assert(
  JSON.stringify(relationGateBranchTargets) ===
    JSON.stringify({
      canDamageEveryoneTrue: 345,
      relationTrue: 366,
      modeMaskAbsent: 365,
      relationFalse: 377,
      negativeRelationSignAccepted: 389,
      positiveRelationPathSkipped: 388,
      rejected: 391,
    }),
  'method 1484 relation-gate branch targets changed',
)

const candidateAnchors = {
  repeatHit: [
    requireAt(methods, strings, 1540, 173, 'getproperty', '_-s2L'),
    requireAt(methods, strings, 1540, 186, 'getproperty', '_-s2L'),
    requireAt(methods, strings, 1540, 187, 'add_i'),
    requireAt(methods, strings, 1540, 190, 'greaterthan'),
  ],
  grabRelease: [
    requireAt(methods, strings, 1540, 213, 'getproperty', '_-n2R'),
    requireAt(methods, strings, 1540, 217, 'getproperty', '_-N14'),
    requireAt(methods, strings, 1540, 231, 'callpropvoid', '_-T11'),
  ],
  stateAndInvulnerability: [
    requireAt(methods, strings, 1540, 236, 'callproperty', '_-N62'),
    requireAt(methods, strings, 1540, 1100, 'callproperty', '_-N62'),
  ],
  grabFlags: [
    requireAt(methods, strings, 1540, 247, 'getproperty', '_-Q6d'),
    requireAt(methods, strings, 1540, 1192, 'getproperty', '_-h2x'),
  ],
}
requireAt(methods, strings, 1540, 235, 'pushtrue')
const candidateBranchTargets = {
  grabReleaseFalse: branchTargetIndex(methods, 1540, 214),
  stateNotSix: branchTargetIndex(methods, 1540, 222),
  alreadyHit: branchTargetIndex(methods, 1540, 227),
  bypassedStateGateAccepted: branchTargetIndex(methods, 1540, 239),
  bypassedStateGateRejected: branchTargetIndex(methods, 1540, 240),
  ordinaryStateGateRejected: branchTargetIndex(methods, 1540, 1103),
  ordinaryStateGateRejectedExit: branchTargetIndex(methods, 1540, 1109),
}
assert(
  JSON.stringify(candidateBranchTargets) ===
    JSON.stringify({
      grabReleaseFalse: 222,
      stateNotSix: 227,
      alreadyHit: 232,
      bypassedStateGateAccepted: 241,
      bypassedStateGateRejected: 1386,
      ordinaryStateGateRejected: 1110,
      ordinaryStateGateRejectedExit: 1386,
    }),
  'method 1540 state-gate branch targets changed',
)

const statePredicateAnchors = {
  stateZero: [
    requireAt(methods, strings, 3051, 3, 'getproperty', '_-N14'),
    requireAt(methods, strings, 3051, 6, 'equals'),
    requireAt(methods, strings, 3051, 10, 'returnvalue'),
  ],
  bypass: [
    requireAt(methods, strings, 3051, 13, 'iffalse'),
    requireAt(methods, strings, 3051, 17, 'callproperty', '_-zO'),
    requireAt(methods, strings, 3051, 19, 'not'),
    requireAt(methods, strings, 3051, 23, 'returnvalue'),
  ],
  invulnerability: [
    requireAt(methods, strings, 2988, 47, 'getproperty', '_-c5h'),
    requireAt(methods, strings, 2988, 48, 'lessequals'),
    requireAt(methods, strings, 2988, 55, 'pushtrue'),
    requireAt(methods, strings, 2988, 56, 'returnvalue'),
  ],
  grabReleaseStateWrite: [
    requireAt(methods, strings, 2938, 25, 'getproperty', '_-N14'),
    requireAt(methods, strings, 2938, 33, 'initproperty', '_-N14'),
    requireAt(methods, strings, 2938, 34, 'findproperty', 'mHeldByPower'),
    requireAt(methods, strings, 2938, 37, 'initproperty', 'mHeldByPower'),
  ],
}
requireOperandAt(methods, 2938, 26, 'pushbyte', 6)
requireOperandAt(methods, 2938, 31, 'pushbyte', 0)
const statePredicateOptions = abc.method[3051].options?.option as Array<{ val: number; kind: number }> | undefined
assert(
  statePredicateOptions?.length === 2 && statePredicateOptions.every((option) => option.kind === 10),
  'method 3051 optional Boolean defaults changed',
)

const invulnerabilityStateOrder = {
  parserRead: requireAt(methods, strings, 6294, 2634, 'pushstring', 'LoseInvulnTime'),
  elapsedRead: requireAt(methods, strings, 45, 106, 'getproperty', '_-R1Q'),
  elapsedComparison: requireAt(methods, strings, 45, 107, 'greaterequals'),
  currentProtectionRead: requireAt(methods, strings, 45, 97, 'getproperty', '_-c5h'),
  expiryWrite: requireAt(methods, strings, 45, 138, 'initproperty', '_-c5h'),
  fighterUpdate: requireAt(methods, strings, 3217, 1202, 'callpropvoid', '_-84O'),
  activePowerCalls: [73, 193, 532, 662].map((index) =>
    requireAt(methods, strings, 2894, index, 'callpropvoid', '_-t2u'),
  ),
  activePowerTick: requireAt(methods, strings, 1496, 268, 'callpropvoid', '_-v3l'),
  arbitration: requireAt(methods, strings, 3217, 1235, 'callpropvoid', '_-Z29'),
  hitReset: requireAt(methods, strings, 1479, 106, 'initproperty', '_-c5h'),
}
requireOperandAt(methods, 45, 135, 'pushbyte', 16)
requireAt(methods, strings, 45, 136, 'subtract_i')
requireOperandAt(methods, 1479, 105, 'pushbyte', 0)

const arbitrationAndApplyOrder = {
  loserCheck: requireAt(methods, strings, 1474, 857, 'getproperty', '_-J2T'),
  admissionCall: requireAt(methods, strings, 1474, 924, 'callpropvoid', '_-S6I'),
  postRelationTargetModes: [
    requireAt(methods, strings, 1484, 953, 'getproperty', '_-84Z'),
    requireAt(methods, strings, 1484, 960, 'getproperty', '_-84Z'),
  ],
  innerApply: requireAt(methods, strings, 1484, 1050, 'callproperty', '_-24S'),
  innerApplyResult: requireAt(methods, strings, 1484, 1053, 'setlocal'),
}
requireOperandAt(methods, 1484, 954, 'pushbyte', 1)
requireOperandAt(methods, 1484, 961, 'pushbyte', 8)
requireOperandAt(methods, 1484, 1053, 'setlocal', 42)

const assistAnchors = {
  preAttributionWrite: requireAt(methods, strings, 1486, 373, 'initproperty', '_-w2O'),
  optionalActor: requireAt(methods, strings, 1486, 420, 'ifeq'),
  canAssist: requireAt(methods, strings, 1486, 424, 'getproperty', '_-L1z'),
  team: [
    requireAt(methods, strings, 1486, 429, 'getproperty', '_-HL'),
    requireAt(methods, strings, 1486, 431, 'getproperty', '_-HL'),
    requireAt(methods, strings, 1486, 432, 'equals'),
  ],
  attributionWrites: [
    requireAt(methods, strings, 1486, 458, 'initproperty', '_-OV'),
    requireAt(methods, strings, 1486, 464, 'initproperty', '_-H32'),
    requireAt(methods, strings, 1486, 481, 'initproperty', '_-A6B'),
    requireAt(methods, strings, 1486, 485, 'initproperty', '_-H3j'),
    requireAt(methods, strings, 1486, 491, 'initproperty', '_-t2c'),
    requireAt(methods, strings, 1486, 495, 'initproperty', '_-M5A'),
    requireAt(methods, strings, 1486, 498, 'initproperty', '_-j4S'),
    requireAt(methods, strings, 1486, 503, 'initproperty', '_-C4i'),
  ],
  laterHitStateCall: requireAt(methods, strings, 1486, 646, 'callpropvoid', '_-m59'),
}
const assistBranchTargets = {
  noOptionalActor: branchTargetIndex(methods, 1486, 420),
  canAssistFalse: branchTargetIndex(methods, 1486, 426),
  skipAttributionWrites: branchTargetIndex(methods, 1486, 436),
}
assert(
  JSON.stringify(assistBranchTargets) ===
    JSON.stringify({
      noOptionalActor: 436,
      canAssistFalse: 435,
      skipAttributionWrites: 504,
    }),
  'method 1486 assist branch targets changed',
)

const primaryChainMethods = new Set([45, 1474, 1479, 1484, 1486, 1496, 1540, 2894, 2938, 2988, 3051, 3217])
const isThrowPrimaryReferences = fieldLedgers.isThrow.references.filter((entry) =>
  primaryChainMethods.has(entry.methodId),
)
assert(
  isThrowPrimaryReferences.length === 1 && isThrowPrimaryReferences[0].methodId === 45,
  'IsThrow entered the pinned admission chain',
)

const summarizeLedger = (ledger: (typeof fieldLedgers)[keyof typeof fieldLedgers]) => ({
  type: ledger.type,
  sha256: ledger.sha256,
  methodCount: ledger.references.length,
})

console.log(
  JSON.stringify(
    {
      status: 'bounded-static-admission-state-order-with-reachability-and-trace-blockers',
      identity: {
        build: EXPECTED_BUILD,
        ...identities,
        decodedMethodBodies: abc.method_body.length,
        branchTargetsValid: true,
      },
      source: {
        powerTypesColumns: powerTypesHeader.length,
        powerTypesRecords: powerTypesRows.length,
        requiredFields: SOURCE_FIELDS,
      },
      methodBodies: bodyEvidence,
      parserAnchors,
      fieldLedgers: Object.fromEntries(
        Object.entries(fieldLedgers).map(([name, ledger]) => [name, summarizeLedger(ledger)]),
      ),
      boundedOrder: {
        invulnerabilityExpiryBeforeArbitration: invulnerabilityStateOrder,
        candidateConstruction: {
          order: [
            'repeat-hit presence and MinTimeBetweenHits',
            'GrabRelease state-6 held-state transition',
            'state-zero gate with explicit invulnerability bypass on one path',
            'state-zero gate plus invulnerability predicate on the ordinary path',
          ],
          anchors: candidateAnchors,
          branchTargets: candidateBranchTargets,
          statePredicateAnchors,
          optionalBooleanDefaults: 'false',
        },
        arbitrationAndApply: arbitrationAndApplyOrder,
        relationGate: {
          expression:
            'relation = CanDamageEveryone || source.team != target.team || (modeMaskPresent && owner != target)',
          signGate:
            'continue iff (relation && amount < 0) || (!relation && amount > 0); zero returns before later processing',
          anchors: relationGateAnchors,
          branchTargets: relationGateBranchTargets,
        },
        assistState: {
          expression:
            'write attribution state iff optional actor exists && (!CanAssist || target.team != optionalActor.team)',
          effect: 'both branch outcomes join later processing at instruction 504; the branch itself does not return',
          anchors: assistAnchors,
          branchTargets: assistBranchTargets,
        },
        throw: {
          isThrowField: '_-O2D',
          primaryChainReferences: isThrowPrimaryReferences,
          conclusion: 'no direct IsThrow read occurs in methods 1474, 1484, 1486, 1540, 2938, 2988, or 3051',
        },
      },
      blockers: [
        'Issue 50 does not close replay-producing roots, executable lookup reachability, dynamic PowerType names, or 38 source-graph exclusions.',
        'Issue 69 does not close downstream target sets and state effects for every numeric target mode and parser-flag combination.',
        'Fighter state _-N14 must equal zero at the pinned gate, but all state writers and the semantic dead/respawn partition are not closed.',
        'The ordinary invulnerability predicate contains additional state, mode, and caller-flag branches beyond the pinned _-c5h boundary; complete bypass semantics are not closed.',
        'IsThrow has consumers outside the pinned admission methods, so throw-path reachability and interaction order are not closed.',
        'No authenticated interpreted-runtime trace covers every admitted mode, owner/team/mask combination, grab-release transition, state code, invulnerability boundary, assist branch, or throw path.',
      ],
    },
    null,
    2,
  ),
)
