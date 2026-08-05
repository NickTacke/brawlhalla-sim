import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodIdentity = {
  methodId: number
  codeByteLength: number
  instructionCount: number
  codeSha256: string
  semanticSha256: string
}
type MethodOwner = {
  classIndex: number
  className: string
  traitName: string
  traitQName: string
  static: boolean
}
type Category = {
  name: string
  source: keyof typeof SOURCE_HASHES
  loaderClassIndex: number
  loaderClassName: string
  loadTrait: string
  recordClassIndex: number
  recordConstructorMethod: number
  loadMethod: number
  rowMethod: number
  rowTrait: string
  rowCallIndex: number
  recordType: string
  recordConstructionIndex: number
  resolutionMethods: number[]
}

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_IDENTITY_LEDGER_SHA256 = 'aa5c0fd296146735db9bbe60845d2827af60965699ea859717d96d92aa93576c'
const SOURCE_HASHES = {
  'Game.swz.11.xml': 'a0c99d2052bee75b755bb2e8b16dd2e6e8b167d154cd20a2baf6c02a93fa63e4',
  'Game.swz.17.xml': 'cdc1409bfcb84e30d76419087656c7dfe38c549e9528198adf6ba9be5f80741e',
  'Game.swz.23.xml': '1a9c27d1e21178870dafe5746c00efb7ec154d14290af4c628eb878c054eb920',
  'Game.swz.24.dat': '358aac8501dbf9051c22c7f14c8eef72a16cd0a071ad2ef398ab6695286e3333',
  'Game.swz.25.xml': 'e9d054eacf39030ea242d713bb0808b66567363f0877f150724f2a4ce7b12aa4',
  'Game.swz.26.xml': 'f1ee7530c4e0693232c8a4fdc93163f676691259dc2da9e83bc332cf21b3391c',
  'Game.swz.27.dat': 'd68102cbafaef4f6f9eae817f1f7c5830be4464e8cea89fbd0ee36bc28e95f3e',
  'Game.swz.30.xml': 'e6870349d9104bc91fddcfa329f2cf4b5a4b96e466cfed47cb92834316b54dff',
  'Game.swz.38.dat': '715468d8eda8fa2ec3d88a8b5395c076bec937640927909add4745eda2883f27',
  'Game.swz.39.xml': 'a6eb10c26320ba18da8a1067cae09258a28c6f6c0a1a27b1adf27c46a2946b6f',
  'Game.swz.42.xml': '13c32dfdc7ba3b5296c562bf69996b93b68f6b48dcdd226e15a0899f24d3e910',
  'Game.swz.43.xml': 'fd9efadd2f3c6f7e844ec9c52b1f685fb15d32e936934450e36e441f3e182f7d',
  'Game.swz.52.xml': '0744728b58c6134f5d205236ae6a34c1f05d55c9f6b80f074f0f6cf1cb694692',
} as const

const CATEGORIES: Category[] = [
  {
    name: 'DodgeTypes',
    source: 'Game.swz.11.xml',
    loaderClassIndex: 138,
    loaderClassName: '_-P6H',
    loadTrait: '_-H2x',
    recordClassIndex: 138,
    recordConstructorMethod: 2664,
    loadMethod: 2671,
    rowMethod: 2672,
    rowTrait: '_-F2f',
    rowCallIndex: 27,
    recordType: '_-P6H',
    recordConstructionIndex: 16,
    resolutionMethods: [],
  },
  {
    name: 'GameModeTypes',
    source: 'Game.swz.17.xml',
    loaderClassIndex: 184,
    loaderClassName: '_-F5K',
    loadTrait: '_-H2x',
    recordClassIndex: 184,
    recordConstructorMethod: 3728,
    loadMethod: 3731,
    rowMethod: 3732,
    rowTrait: '_-W2o',
    rowCallIndex: 36,
    recordType: '_-F5K',
    recordConstructionIndex: 27,
    resolutionMethods: [],
  },
  {
    name: 'HeroTypes',
    source: 'Game.swz.23.xml',
    loaderClassIndex: 217,
    loaderClassName: 'HeroType',
    loadTrait: '_-H2x',
    recordClassIndex: 217,
    recordConstructorMethod: 4111,
    loadMethod: 4122,
    rowMethod: 4123,
    rowTrait: '_-H5O',
    rowCallIndex: 173,
    recordType: 'HeroType',
    recordConstructionIndex: 52,
    resolutionMethods: [4125],
  },
  {
    name: 'HurtboxTypes',
    source: 'Game.swz.24.dat',
    loaderClassIndex: 237,
    loaderClassName: '_-o1U',
    loadTrait: '_-l2j',
    recordClassIndex: 237,
    recordConstructorMethod: 4649,
    loadMethod: 4654,
    rowMethod: 4655,
    rowTrait: '_-E2Z',
    rowCallIndex: 66,
    recordType: '_-o1U',
    recordConstructionIndex: 87,
    resolutionMethods: [],
  },
  {
    name: 'ItemSpawnRateTypes',
    source: 'Game.swz.25.xml',
    loaderClassIndex: 255,
    loaderClassName: '_-X5O',
    loadTrait: '_-H2x',
    recordClassIndex: 255,
    recordConstructorMethod: 4804,
    loadMethod: 4808,
    rowMethod: 4809,
    rowTrait: '_-4',
    rowCallIndex: 31,
    recordType: '_-X5O',
    recordConstructionIndex: 25,
    resolutionMethods: [],
  },
  {
    name: 'ItemSpawnRuleSetTypes',
    source: 'Game.swz.26.xml',
    loaderClassIndex: 256,
    loaderClassName: '_-E2c',
    loadTrait: '_-H2x',
    recordClassIndex: 256,
    recordConstructorMethod: 4814,
    loadMethod: 4817,
    rowMethod: 4818,
    rowTrait: '_-14t',
    rowCallIndex: 67,
    recordType: '_-E2c',
    recordConstructionIndex: 21,
    resolutionMethods: [4819],
  },
  {
    name: 'ItemTypes',
    source: 'Game.swz.27.dat',
    loaderClassIndex: 257,
    loaderClassName: 'ItemType',
    loadTrait: '_-l2j',
    recordClassIndex: 257,
    recordConstructorMethod: 4823,
    loadMethod: 4833,
    rowMethod: 4834,
    rowTrait: '_-B5B',
    rowCallIndex: 88,
    recordType: 'ItemType',
    recordConstructionIndex: 46,
    resolutionMethods: [4839, 4840],
  },
  {
    name: 'LevelSetTypes',
    source: 'Game.swz.30.xml',
    loaderClassIndex: 275,
    loaderClassName: '_-w1p',
    loadTrait: '_-H2x',
    recordClassIndex: 275,
    recordConstructorMethod: 5094,
    loadMethod: 5097,
    rowMethod: 5098,
    rowTrait: '_-4j',
    rowCallIndex: 66,
    recordType: '_-w1p',
    recordConstructionIndex: 21,
    resolutionMethods: [5099],
  },
  {
    name: 'PowerTypes',
    source: 'Game.swz.38.dat',
    loaderClassIndex: 342,
    loaderClassName: 'PowerType',
    loadTrait: '_-l2j',
    recordClassIndex: 342,
    recordConstructorMethod: 6270,
    loadMethod: 6293,
    rowMethod: 6294,
    rowTrait: '_-L4o',
    rowCallIndex: 90,
    recordType: 'PowerType',
    recordConstructionIndex: 78,
    resolutionMethods: [6293, 6301],
  },
  {
    name: 'PowerSwapTypes',
    source: 'Game.swz.39.xml',
    loaderClassIndex: 341,
    loaderClassName: '_-D4h',
    loadTrait: '_-H2x',
    recordClassIndex: 339,
    recordConstructorMethod: 6243,
    loadMethod: 6263,
    rowMethod: 6264,
    rowTrait: '_-ru',
    rowCallIndex: 64,
    recordType: '_-03C',
    recordConstructionIndex: 31,
    resolutionMethods: [6267],
  },
  {
    name: 'RuneTypes',
    source: 'Game.swz.42.xml',
    loaderClassIndex: 393,
    loaderClassName: '_-O5l',
    loadTrait: '_-H2x',
    recordClassIndex: 393,
    recordConstructorMethod: 7103,
    loadMethod: 7107,
    rowMethod: 7108,
    rowTrait: '_-9U',
    rowCallIndex: 21,
    recordType: '_-O5l',
    recordConstructionIndex: 122,
    resolutionMethods: [7115],
  },
  {
    name: 'ScoringTypes',
    source: 'Game.swz.43.xml',
    loaderClassIndex: 406,
    loaderClassName: 'ScoringType',
    loadTrait: '_-H2x',
    recordClassIndex: 406,
    recordConstructorMethod: 7274,
    loadMethod: 7278,
    rowMethod: 7279,
    rowTrait: '_-yV',
    rowCallIndex: 168,
    recordType: 'ScoringType',
    recordConstructionIndex: 47,
    resolutionMethods: [7281],
  },
  {
    name: 'StatTypes',
    source: 'Game.swz.52.xml',
    loaderClassIndex: 629,
    loaderClassName: '_-92f',
    loadTrait: '_-H2x',
    recordClassIndex: 629,
    recordConstructorMethod: 11655,
    loadMethod: 11658,
    rowMethod: 11659,
    rowTrait: '_-j4W',
    rowCallIndex: 44,
    recordType: '_-92f',
    recordConstructionIndex: 20,
    resolutionMethods: [],
  },
]

const METHOD_IDS = [
  849, 3218, 3452, 6543, 6544, 6555, 2671, 2672, 2664, 3731, 3732, 3728, 4122, 4123, 4111, 4125, 4654, 4655, 4649, 4808,
  4809, 4804, 4817, 4818, 4814, 4819, 4833, 4834, 4823, 4839, 4840, 5097, 5098, 5094, 5099, 6263, 6264, 6261, 6267,
  6293, 6294, 6270, 6301, 7107, 7108, 7103, 7115, 7278, 7279, 7274, 7281, 11658, 11659, 11655, 2155, 2158, 6243, 6245,
  6246, 6247, 6248, 6249, 6250, 6251, 6252, 6253, 6254, 6723, 6725, 6726, 6727,
]
const REGISTRATION_ANCHORS = [
  { index: 7, value: 'DodgeTypes' },
  { index: 43, value: 'StatTypes' },
  { index: 67, value: 'HurtboxTypes' },
  { index: 145, value: 'PowerSwapTypes' },
  { index: 271, value: 'GameModeTypes' },
  { index: 289, value: 'HeroTypes' },
  { index: 295, value: 'ItemSpawnRateTypes' },
  { index: 301, value: 'ItemSpawnRuleSetTypes' },
  { index: 307, value: 'ItemTypes' },
  { index: 313, value: 'LevelSetTypes' },
  { index: 361, value: 'PowerTypes' },
  { index: 379, value: 'RuneTypes' },
  { index: 385, value: 'ScoringTypes' },
]
const POST_LOAD_SEQUENCE = [
  { className: '_-w1p', methodName: '_-Z2', methodId: 5099, index: 6 },
  { className: 'ScoringType', methodName: '_-M3G', methodId: 7281, index: 12 },
  { className: 'HeroType', methodName: '_-41C', methodId: 4125, index: 14 },
  { className: 'ItemType', methodName: '_-v5C', methodId: 4839, index: 16 },
  { className: 'PowerType', methodName: '_-J31', methodId: 6301, index: 20 },
  { className: '_-D4h', methodName: '_-N61', methodId: 6267, index: 32 },
  { className: '_-O5l', methodName: '_-G12', methodId: 7115, index: 38 },
  { className: '_-E2c', methodName: '_-g37', methodId: 4819, index: 46 },
]
const INSERTION_ANCHORS = [
  {
    category: 'DodgeTypes',
    methodId: 2672,
    operations: [
      [537, 'setproperty'],
      [541, 'callpropvoid'],
    ],
  },
  {
    category: 'GameModeTypes',
    methodId: 3732,
    operations: [
      [494, 'callpropvoid'],
      [500, 'setproperty'],
      [518, 'callpropvoid'],
      [524, 'setproperty'],
    ],
  },
  {
    category: 'HeroTypes',
    methodId: 4123,
    operations: [
      [1018, 'callpropvoid'],
      [1024, 'setproperty'],
      [1030, 'setproperty'],
      [1034, 'callpropvoid'],
      [1049, 'setproperty'],
    ],
  },
  {
    category: 'HurtboxTypes',
    methodId: 4655,
    operations: [
      [665, 'setproperty'],
      [717, 'callpropvoid'],
      [723, 'setproperty'],
      [727, 'callpropvoid'],
    ],
  },
  {
    category: 'ItemSpawnRateTypes',
    methodId: 4809,
    operations: [
      [240, 'callpropvoid'],
      [248, 'setproperty'],
      [266, 'callpropvoid'],
      [272, 'setproperty'],
    ],
  },
  {
    category: 'ItemSpawnRuleSetTypes',
    methodId: 4818,
    operations: [
      [188, 'callpropvoid'],
      [196, 'setproperty'],
      [214, 'callpropvoid'],
      [220, 'setproperty'],
    ],
  },
  {
    category: 'ItemTypes',
    methodId: 4834,
    operations: [
      [1690, 'callpropvoid'],
      [1696, 'setproperty'],
      [1714, 'callpropvoid'],
      [1720, 'setproperty'],
      [1743, 'setproperty'],
    ],
  },
  {
    category: 'LevelSetTypes',
    methodId: 5098,
    operations: [
      [207, 'callpropvoid'],
      [225, 'callpropvoid'],
      [231, 'setproperty'],
      [237, 'setproperty'],
    ],
  },
  { category: 'PowerSwapTypes', methodId: 6264, operations: [[319, 'callpropvoid']] },
  {
    category: 'PowerTypes',
    methodId: 6294,
    operations: [
      [6896, 'setproperty'],
      [6910, 'callpropvoid'],
      [6916, 'setproperty'],
      [6920, 'callpropvoid'],
      [6926, 'callpropvoid'],
    ],
  },
  { category: 'RuneTypes', methodId: 7108, operations: [[301, 'setproperty']] },
  {
    category: 'ScoringTypes',
    methodId: 7279,
    operations: [
      [1522, 'setproperty'],
      [1540, 'callpropvoid'],
      [1546, 'setproperty'],
      [1550, 'callpropvoid'],
      [1557, 'callpropvoid'],
    ],
  },
  {
    category: 'StatTypes',
    methodId: 11659,
    operations: [
      [322, 'callpropvoid'],
      [328, 'setproperty'],
      [332, 'callpropvoid'],
    ],
  },
] as const
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
function qnameKey(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('kind' in value) || !('data' in value)) return null
  const candidate = value as { kind?: unknown; data?: { ns?: unknown; name?: unknown } }
  if (
    typeof candidate.kind !== 'number' ||
    typeof candidate.data?.ns !== 'number' ||
    typeof candidate.data.name !== 'number'
  )
    return null
  return `${candidate.kind}:${candidate.data.ns}:${candidate.data.name}`
}
function classQName(abc: AbcFile, classIndex: number): string {
  const key = qnameKey(abc.constant_pool.multiname[abc.instance[classIndex].name - 1])
  assert(key, `class ${classIndex} does not have an exact QName`)
  return key
}
function buildOwners(abc: AbcFile, strings: string[]): Map<number, MethodOwner> {
  const owners = new Map<number, MethodOwner>()
  const nameAt = (index: number): string => multinameName(abc.constant_pool.multiname[index - 1], strings)
  for (let classIndex = 0; classIndex < abc.instance.length; classIndex++) {
    const className = nameAt(abc.instance[classIndex].name)
    for (const group of [
      { traits: abc.instance[classIndex].trait ?? [], static: false },
      { traits: abc.class[classIndex].traits ?? [], static: true },
    ]) {
      for (const trait of group.traits) {
        if (![1, 2, 3].includes(trait.kind & 0x0f)) continue
        const methodId = (trait.data as { method: number }).method
        const traitQName = qnameKey(abc.constant_pool.multiname[trait.name - 1])
        assert(traitQName, `method ${methodId} does not have an exact trait QName`)
        owners.set(methodId, {
          classIndex,
          className,
          traitName: nameAt(trait.name),
          traitQName,
          static: group.static,
        })
      }
    }
  }
  return owners
}
function requireInstruction(
  methods: Map<number, LocatedInstruction[]>,
  strings: string[],
  methodId: number,
  index: number,
  opcode: string,
  value?: string,
): LocatedInstruction {
  const instruction = methods.get(methodId)?.[index]
  assert(instruction, `method ${methodId} lacks instruction ${index}`)
  assert(instruction.name === opcode, `method ${methodId} instruction ${index} is not ${opcode}`)
  if (value !== undefined) {
    const actual = opcode === 'pushstring' ? instruction.params[0] : multinameName(instruction.params[0], strings)
    assert(actual === value, `method ${methodId} instruction ${index} does not name ${value}`)
  }
  return instruction
}
function requireExactQName(instruction: LocatedInstruction, expectedQName: string, label: string): void {
  const actualQName = qnameKey(instruction.params[0])
  assert(actualQName === expectedQName, `${label} QName mismatch: ${actualQName ?? 'not a QName'}`)
}

const abcPath = argument('--abc')
const sourceDirectory = argument('--source-dir')
assert(
  abcPath && sourceDirectory,
  'usage: bun patch_postload_resolution_provenance.ts --abc <main.abc> --source-dir <decrypted>',
)

const abcBytes = readFileSync(resolve(abcPath))
const abcSha256 = sha256(new Uint8Array(abcBytes))
assert(abcSha256 === EXPECTED_ABC_SHA256, `ABC SHA-256 mismatch: ${abcSha256}`)
const sources = Object.entries(SOURCE_HASHES).map(([name, expectedSha256]) => {
  const bytes = readFileSync(join(resolve(sourceDirectory), name))
  const actualSha256 = sha256(new Uint8Array(bytes))
  assert(actualSha256 === expectedSha256, `${name} SHA-256 mismatch: ${actualSha256}`)
  return { name, byteLength: bytes.byteLength, sha256: actualSha256 }
})

const abc = AbcFile.read(new ExtendedBuffer(abcBytes)) as unknown as AbcFile
const strings = abc.constant_pool.string as string[]
const buildStrings = strings.filter((value) => /^\d+\.\d+\.\d+$/.test(value))
assert(buildStrings.length === 1 && buildStrings[0] === EXPECTED_BUILD, 'ABC build mismatch')
const disassembler = new InstructionDisassembler(abc)
const methods = new Map<number, LocatedInstruction[]>()
const methodBodies = new Map<number, (typeof abc.method_body)[number]>()
const branchErrors: string[] = []
for (const body of abc.method_body) {
  const instructions = locateInstructions(Uint8Array.from(body.code), disassembler.disassemble(body) as Instruction[])
  methods.set(body.method, instructions)
  methodBodies.set(body.method, body)
  branchErrors.push(...validateBranches(instructions, body.code.length).map((pc) => `method ${body.method} ${pc}`))
}
assert(branchErrors.length === 0, `invalid branch targets: ${branchErrors.join(', ')}`)
const owners = buildOwners(abc, strings)

const identityLedger: MethodIdentity[] = METHOD_IDS.map((methodId) => {
  const body = methodBodies.get(methodId)
  const instructions = methods.get(methodId)
  assert(body && instructions, `method ${methodId} was not decoded`)
  const code = Uint8Array.from(body.code)
  return {
    methodId,
    codeByteLength: code.byteLength,
    instructionCount: instructions.length,
    codeSha256: sha256(code),
    semanticSha256: sha256(
      JSON.stringify(instructions.map(({ index: _index, pc: _pc, endPc: _endPc, ...rest }) => rest)),
    ),
  }
})
const identityLedgerSha256 = sha256(JSON.stringify(identityLedger))
assert(
  identityLedgerSha256 === EXPECTED_IDENTITY_LEDGER_SHA256,
  `method identity ledger mismatch: ${identityLedgerSha256}`,
)

const categoryAnchors = CATEGORIES.map((category) => {
  const loadOwner = owners.get(category.loadMethod)
  const rowOwner = owners.get(category.rowMethod)
  assert(loadOwner, `load method ${category.loadMethod} has no owner`)
  assert(rowOwner, `row method ${category.rowMethod} has no owner`)
  assert(
    loadOwner.classIndex === category.loaderClassIndex &&
      loadOwner.className === category.loaderClassName &&
      loadOwner.traitName === category.loadTrait &&
      loadOwner.static,
    `${category.name} load-method ownership mismatch`,
  )
  assert(
    rowOwner.classIndex === category.loaderClassIndex && rowOwner.traitName === category.rowTrait && rowOwner.static,
    `${category.name} row-method ownership mismatch`,
  )
  assert(
    abc.instance[category.recordClassIndex].iinit === category.recordConstructorMethod,
    `${category.name} record constructor mismatch`,
  )
  assert(
    multinameName(abc.constant_pool.multiname[abc.instance[category.recordClassIndex].name - 1], strings) ===
      category.recordType,
    `${category.name} record-class name mismatch`,
  )

  const loadInstructions = methods.get(category.loadMethod)
  assert(loadInstructions, `load method ${category.loadMethod} was not decoded`)
  const rowCall = requireInstruction(
    methods,
    strings,
    category.loadMethod,
    category.rowCallIndex,
    'callpropvoid',
    category.rowTrait,
  )
  requireExactQName(rowCall, rowOwner.traitQName, `${category.name} row call`)
  const nextCall = loadInstructions
    .slice(0, category.rowCallIndex)
    .toReversed()
    .find(
      (instruction) => instruction.name === 'callproperty' && multinameName(instruction.params[0], strings) === 'next',
    )
  assert(nextCall, `load method ${category.loadMethod} has no next() before its row callback`)
  const hasNext = requireInstruction(
    methods,
    strings,
    category.loadMethod,
    category.rowCallIndex + 2,
    'callproperty',
    'hasNext',
  )
  const loopBranch = loadInstructions
    .slice(category.rowCallIndex + 3, category.rowCallIndex + 8)
    .find((instruction) => instruction.name === 'iftrue')
  assert(loopBranch, `load method ${category.loadMethod} has no loop branch after hasNext()`)
  const loopOffset = loopBranch.params[0]
  assert(typeof loopOffset === 'number', `${category.name} loop branch has no numeric offset`)
  const loopTargetPc = loopBranch.endPc + loopOffset
  assert(loopTargetPc <= nextCall.pc, `${category.name} loop branch does not return to its iterator`)
  const construction = requireInstruction(
    methods,
    strings,
    category.rowMethod,
    category.recordConstructionIndex,
    'constructprop',
    category.recordType,
  )
  requireExactQName(construction, classQName(abc, category.recordClassIndex), `${category.name} construction`)
  return {
    ...category,
    sourceSha256: SOURCE_HASHES[category.source],
    loaderTraitQName: loadOwner.traitQName,
    rowTraitQName: rowOwner.traitQName,
    recordClassQName: classQName(abc, category.recordClassIndex),
    nextCallPc: nextCall.pc,
    rowCallPc: rowCall.pc,
    hasNextPc: hasNext.pc,
    loopBranchPc: loopBranch.pc,
    loopTargetPc,
    recordConstructionPc: construction.pc,
  }
})
const registrationAnchors = REGISTRATION_ANCHORS.map((anchor) => {
  const category = CATEGORIES.find((candidate) => candidate.name === anchor.value)
  assert(category, `registration anchor ${anchor.value} has no category`)
  const loadOwner = owners.get(category.loadMethod)
  assert(loadOwner, `${category.name} load method has no owner`)
  const nameInstruction = requireInstruction(methods, strings, 849, anchor.index, 'pushstring', anchor.value)
  const classInstruction = requireInstruction(
    methods,
    strings,
    849,
    anchor.index + 1,
    'getlex',
    category.loaderClassName,
  )
  const callbackInstruction = requireInstruction(
    methods,
    strings,
    849,
    anchor.index + 2,
    'getproperty',
    category.loadTrait,
  )
  requireExactQName(classInstruction, classQName(abc, category.loaderClassIndex), `${category.name} registration class`)
  requireExactQName(callbackInstruction, loadOwner.traitQName, `${category.name} registration callback`)
  return {
    ...anchor,
    namePc: nameInstruction.pc,
    classPc: classInstruction.pc,
    callbackPc: callbackInstruction.pc,
  }
})
const postLoadAnchors = POST_LOAD_SEQUENCE.map((anchor) => {
  const owner = owners.get(anchor.methodId)
  assert(owner, `post-load method ${anchor.methodId} has no owner`)
  assert(
    owner.className === anchor.className && owner.traitName === anchor.methodName && owner.static,
    `post-load method ${anchor.methodId} ownership mismatch`,
  )
  const classInstruction = requireInstruction(methods, strings, 3452, anchor.index, 'getlex', anchor.className)
  const callInstruction = requireInstruction(
    methods,
    strings,
    3452,
    anchor.index + 1,
    'callpropvoid',
    anchor.methodName,
  )
  requireExactQName(classInstruction, classQName(abc, owner.classIndex), `post-load class ${anchor.className}`)
  requireExactQName(callInstruction, owner.traitQName, `post-load call ${anchor.methodName}`)
  return {
    ...anchor,
    classIndex: owner.classIndex,
    traitQName: owner.traitQName,
    classPc: classInstruction.pc,
    callPc: callInstruction.pc,
  }
})
const dispatcherOwner = owners.get(3452)
assert(dispatcherOwner, 'post-load dispatcher method 3452 has no owner')
assert(
  dispatcherOwner.classIndex === 164 && dispatcherOwner.traitName === '_-24x' && !dispatcherOwner.static,
  'post-load dispatcher ownership mismatch',
)
const postLoadDispatch = requireInstruction(methods, strings, 3218, 387, 'callpropvoid', '_-24x')
requireExactQName(postLoadDispatch, dispatcherOwner.traitQName, 'post-load dispatcher call')
const nestedHelperClasses = [
  { classIndex: 116, className: 'CustomArt', constructorMethod: 2155, methods: [2158] },
  {
    classIndex: 339,
    className: '_-03C',
    constructorMethod: 6243,
    methods: [6245, 6246, 6247, 6248, 6249, 6250, 6251, 6252, 6253, 6254],
  },
  { classIndex: 370, className: '_-5R', constructorMethod: 6723, methods: [6725, 6726, 6727] },
]
for (const helper of nestedHelperClasses) {
  assert(abc.instance[helper.classIndex].iinit === helper.constructorMethod, `${helper.className} constructor mismatch`)
  assert(
    multinameName(abc.constant_pool.multiname[abc.instance[helper.classIndex].name - 1], strings) === helper.className,
    `${helper.className} class-name mismatch`,
  )
  for (const methodId of helper.methods) {
    const owner = owners.get(methodId)
    assert(owner?.classIndex === helper.classIndex, `${helper.className} method ${methodId} ownership mismatch`)
  }
}
const nestedHelperSpecs = [
  ...[511, 1400, 1417, 1470].map((index) => ({ methodId: 4834, index, classIndex: 116, type: 'CustomArt' })),
  { methodId: 4123, index: 1039, classIndex: 370, type: '_-5R' },
  { methodId: 6294, index: 82, classIndex: 339, type: '_-03C' },
]
const nestedHelperAnchors = nestedHelperSpecs.map((spec) => {
  const instruction = requireInstruction(methods, strings, spec.methodId, spec.index, 'constructprop', spec.type)
  requireExactQName(instruction, classQName(abc, spec.classIndex), `${spec.type} construction`)
  return { ...spec, classQName: classQName(abc, spec.classIndex), pc: instruction.pc }
})
const insertionAnchors = INSERTION_ANCHORS.map((entry) => ({
  category: entry.category,
  methodId: entry.methodId,
  operations: entry.operations.map(([index, opcode]) => ({
    index,
    opcode,
    pc: requireInstruction(methods, strings, entry.methodId, index, opcode).pc,
  })),
}))

process.stdout.write(
  `${JSON.stringify(
    {
      target: { build: EXPECTED_BUILD, abcSha256 },
      sources,
      decodedMethodBodies: abc.method_body.length,
      branchTargetsValid: true,
      methodIdentityLedger: { methods: METHOD_IDS.length, sha256: identityLedgerSha256 },
      categoryAnchors,
      registration: {
        methodId: 849,
        anchors: registrationAnchors,
        limitation: 'registration order is not callback execution order',
      },
      postLoad: {
        callerMethodId: 3218,
        dispatcherMethodId: 3452,
        dispatchPc: postLoadDispatch.pc,
        sequence: postLoadAnchors,
      },
      insertionAnchors,
      nestedHelperAnchors,
      nestedHelpers: nestedHelperClasses,
      provenStaticBoundaries: [
        'thirteen hash-pinned Game.swz category callback roots and row constructors',
        'source-ordered row iteration inside each category callback',
        'global post-load resolver order for LevelSet, Scoring, Hero, Item, Power, PowerSwap, Rune, and ItemSpawnRuleSet',
        'nested CustomArt, power-cast _-03C, and hero _-5R helper class identities',
      ],
      blockers: [
        'the complete gameplay-relevant category universe is not proven',
        'callback registration does not prove callback execution or archive arrival order',
        'no complete source-field/default-to-normalized-QName provenance ledger exists',
        'constructor and helper writes are identity-pinned but not closed field-for-field',
        'Dynamic LevelDesc is owned by a separate unresolved loader ticket',
        'no trustworthy loader oracle confirms complete typed objects and post-load mutations',
      ],
      status: 'partial-static-closure',
    },
    null,
    2,
  )}\n`,
)
