import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number; raw: unknown[] }
type MethodOwner = { className: string; traitName: string; static: boolean }
type ExpectedMethod = MethodOwner & { params: string[]; returnType: string; sha256: string }

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
  1671: {
    className: 'Companion',
    traitName: '_-z2Q',
    static: false,
    params: [],
    returnType: 'Boolean',
    sha256: '6bb48fe1be61b6bd9ab91d51976ca98e2734ca8969926ecb543f0120065776b3',
  },
  2815: {
    className: '_-V4R',
    traitName: '_-w5T',
    static: false,
    params: ['Number'],
    returnType: 'Number',
    sha256: '9f2b02901738d22167285fdb39cab3e3234ba602eeb8d272e0f1a534c6e309b8',
  },
  2816: {
    className: '_-V4R',
    traitName: '_-43x',
    static: false,
    params: ['Number'],
    returnType: 'Number',
    sha256: 'd68b8538895a464914908f6c511364a16715ca992ea57dc2674a2010c9af183e',
  },
  2857: {
    className: '_-V4R',
    traitName: '_-MJ',
    static: false,
    params: [],
    returnType: 'Number',
    sha256: '29a3c37763fbbba8fd173d5283b2a269b55ff7ccf91ae45fd8b934d70465a52a',
  },
  2858: {
    className: '_-V4R',
    traitName: '_-c2g',
    static: false,
    params: [],
    returnType: 'Number',
    sha256: 'ed46d98ebd2588973fd9c0c84bb53770b5e1adbc3bbaeb67409789b5461e4c64',
  },
  3217: {
    className: '_-u16',
    traitName: '_-z3z',
    static: false,
    params: [],
    returnType: 'Boolean',
    sha256: 'fa38584982aecca898b7dd153da870c49e039b4d4ab952510f97c3720df19308',
  },
  7240: {
    className: '_-04B',
    traitName: '_-W1I',
    static: false,
    params: ['uint'],
    returnType: 'void',
    sha256: '6888afe68cda0912df6d12cc235ff15bfad87358950446a75160841d4048212b',
  },
  7247: {
    className: '_-04B',
    traitName: '_-Z2g',
    static: false,
    params: ['_-L3i', 'Point'],
    returnType: 'Boolean',
    sha256: '8d8d68b504cb7f8bc6efaae8b8e8251fd7978bbb90ca9ea5226827119350b6e8',
  },
  14737: {
    className: '_-62',
    traitName: '_-w5T',
    static: false,
    params: ['Number'],
    returnType: 'Number',
    sha256: 'efb22694d81c2dbdcf8b48cb0ea48885d2c2f15ee6a8de2c421315533d34353d',
  },
  14738: {
    className: '_-62',
    traitName: '_-43x',
    static: false,
    params: ['Number'],
    returnType: 'Number',
    sha256: 'cde6fa781a33b9b473b492e574f0abf7f48bf6ac4df5687679e94d6f6ec21a42',
  },
  14741: {
    className: '_-62',
    traitName: '_-MJ',
    static: false,
    params: [],
    returnType: 'Number',
    sha256: '2921a91a50aba8c821ac1c3b376e0effaf17733fc6c3d0dc7238c0a97fff22e2',
  },
  14742: {
    className: '_-62',
    traitName: '_-c2g',
    static: false,
    params: [],
    returnType: 'Number',
    sha256: 'e91cf03fdb58224d37260d6d4a2e34ef242a7bc34dd6ddc7e458926b2630c6b7',
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

const EXPECTED_BRANCH_STAGES = [
  ['platform-refresh', 0, 565, 17, '5895b8e3e8b1aa7259ec57bf44ba38a8d931d29f7e647fd129af22eed9982f5f'],
  ['entity-support-carry', 565, 905, 4, 'c307640d92dccb06430c021452cb27e0ee1a8719b3fd534ca708d0ab595a507b'],
  ['fighter-state-gate', 905, 1079, 4, 'e9cf0a6ef9c41edf9d9bccae6f254b56ad261193d1595573e0fda5ceca7452c4'],
  ['fighter-support-vector', 1079, 1408, 12, '9d26548f5a05041bba22b651cf6246ba89256fe6e9a0944111296fd6236ae476'],
  ['fighter-carry-clip', 1408, 1964, 12, '0caa015da516fc51a6ace11eda6f09947da6e1efba4551d23a2fa346e698e2e4'],
  ['fighter-moving-line-sweep', 1964, 2847, 33, '49afefe9e3aa9e84e72b3c67b34db098135061c47592c86af929fff90880838a'],
  ['fighter-side-correction', 2847, 3417, 20, '7ac565e1f97b03c0015ad53e0e85076df9c78dd6480373d119a854759984cd41'],
  ['entity-side-correction', 3417, 4014, 17, '45966ec6a28427bf22643b93785c869d8e4134469826fb235aab2fd4d61d2b16'],
  ['companion-state-gate', 4014, 4140, 7, '1a20540b5d36bb37675b8b42123581b80728cb127bfd04a6c20efc691aac1a11'],
  ['companion-support-vector', 4140, 4489, 11, '19df0c5e394eac71a1b99b435cd41d2d74881233d58ca102ed04de177a8e8224'],
  ['companion-carry-clip', 4489, 5006, 13, 'fc0e01229631424bb45a44046dcd50153d46fb67e766e4c80dbcef1bab1166e3'],
  [
    'companion-unconsumed-side-sweep',
    5006,
    5842,
    32,
    'e9bdceea870aedc28030aa27ceca302be5fcdff882372f507bd3b8cd0ec2700d',
  ],
] as const

const EXPECTED_MUTATION_LEDGER_SHA256 = 'c56353ccc4875e91fdcb4f0e010e716836484c35007dad3c3011a2fe3c827c93'
const EXPECTED_LAVA_LEDGER_SHA256 = 'c553a7800cf19c342e2b5970d24c1277c69859911a7ecf38c6be83176894c6d5'

function argument(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  return index === -1 ? undefined : process.argv[index + 1]
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
function sha256(value: Buffer | string): string {
  const hash = createHash('sha256')
  return hash.update(typeof value === 'string' ? value : Uint8Array.from(value)).digest('hex')
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
    const raw: unknown[] = []
    for (const type of instruction.types) raw.push(readOperand(type, code, cursor, raw))
    return { ...instruction, index, pc, endPc: cursor.offset, raw }
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
      const offset = instruction.raw[0]
      if (typeof offset !== 'number' || !boundaries.has(instruction.endPc + offset)) errors.push(`PC ${instruction.pc}`)
    }
    if (instruction.name === 'lookupswitch') {
      const offsets = [instruction.raw[0], ...(Array.isArray(instruction.raw[2]) ? instruction.raw[2] : [])]
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
assert(abcPath, 'usage: moving_platform_carry_states_provenance.ts --abc /path/to/main.abc')
const abcBytes = readFileSync(resolve(abcPath))
const abcSha256 = sha256(abcBytes)
assert(abcSha256 === EXPECTED_ABC_SHA256, `ABC SHA-256 mismatch: ${abcSha256}`)

const abc: any = AbcFile.read(new ExtendedBuffer(abcBytes))
const strings = abc.constant_pool.string as string[]
assert(strings.filter((value) => value === EXPECTED_BUILD).length === 1, 'reference build identity drift')
assert(abc.method_body.length === EXPECTED_BODY_COUNT, `expected ${EXPECTED_BODY_COUNT} method bodies`)

const disassembler = new InstructionDisassembler(abc)
const methods = new Map<number, LocatedInstruction[]>()
const methodHashes = new Map<number, string>()
const branchErrors: string[] = []
for (const body of abc.method_body) {
  const disassembled = disassembler.disassemble(body) as Instruction[]
  const instructions = locateInstructions(body.code, disassembled)
  methods.set(body.method, instructions)
  methodHashes.set(body.method, sha256(JSON.stringify(disassembled)))
  branchErrors.push(...validateBranches(instructions, body.code.length).map((pc) => `method ${body.method} ${pc}`))
}
assert(branchErrors.length === 0, `invalid branch targets: ${branchErrors.join(', ')}`)

const owners = buildOwners(abc, strings)
const typeName = (index: number): string => multinameName(abc.constant_pool.multiname[index - 1], strings)
for (const [methodText, expected] of Object.entries(EXPECTED_METHODS)) {
  const methodId = Number(methodText)
  const owner = owners.get(methodId)
  assert(owner, `method ${methodId} lacks an owner`)
  assert(owner.className === expected.className, `method ${methodId} owner drift`)
  assert(owner.traitName === expected.traitName, `method ${methodId} trait drift`)
  assert(owner.static === expected.static, `method ${methodId} static disposition drift`)
  const method = abc.method[methodId]
  assert(
    JSON.stringify(method.param_type.map(typeName)) === JSON.stringify(expected.params),
    `method ${methodId} parameter drift`,
  )
  assert(typeName(method.return_type) === expected.returnType, `method ${methodId} return drift`)
  assert(methodHashes.get(methodId) === expected.sha256, `method ${methodId} body drift`)
}

function requireAt(methodId: number, pc: number, opcode: string, propertyName?: string): LocatedInstruction {
  const instruction = methods.get(methodId)?.find((candidate) => candidate.pc === pc)
  assert(instruction, `method ${methodId} lacks PC ${pc}`)
  assert(instruction.name === opcode, `method ${methodId} PC ${pc} is not ${opcode}`)
  if (propertyName !== undefined) {
    assert(
      multinameName(instruction.params[0], strings) === propertyName,
      `method ${methodId} PC ${pc} does not name ${propertyName}`,
    )
  }
  return instruction
}
function switchTargets(instruction: LocatedInstruction): number[] {
  assert(instruction.name === 'lookupswitch', `PC ${instruction.pc} is not a lookupswitch`)
  const offsets = [instruction.raw[0], ...(Array.isArray(instruction.raw[2]) ? instruction.raw[2] : [])]
  return offsets.map((entry) => {
    const offset = Array.isArray(entry) ? entry[1] : entry
    assert(typeof offset === 'number', `PC ${instruction.pc} switch offset is not numeric`)
    return instruction.pc + offset
  })
}

const carry = methods.get(7240)
assert(carry, 'method 7240 has no body')
const branchStages = Object.fromEntries(
  EXPECTED_BRANCH_STAGES.map(([name, start, end, count, digest]) => {
    const rows = carry
      .filter(
        (instruction) =>
          (BRANCHES.has(instruction.name) || instruction.name === 'lookupswitch') &&
          instruction.pc >= start &&
          instruction.pc < end,
      )
      .map((instruction) => `${instruction.pc}:${instruction.name}`)
    const actualDigest = sha256(rows.join('\n'))
    assert(rows.length === count, `${name} branch count drift`)
    assert(actualDigest === digest, `${name} branch ledger drift`)
    return [name, { count: rows.length, sha256: actualDigest }]
  }),
)

const mutations = carry
  .filter((instruction) => ['initproperty', 'setproperty', 'setslot', 'callpropvoid'].includes(instruction.name))
  .map(
    (instruction) =>
      `${instruction.pc}:${instruction.name}:${multinameName(instruction.params[0], strings)}:${instruction.raw[1] ?? ''}`,
  )
const mutationLedgerSha256 = sha256(mutations.join('\n'))
assert(mutations.length === 46, 'method 7240 mutation count drift')
assert(mutationLedgerSha256 === EXPECTED_MUTATION_LEDGER_SHA256, 'method 7240 mutation ledger drift')

const fighterSwitch = requireAt(7240, 1039, 'lookupswitch')
const fighterTargets = switchTargets(fighterSwitch)
assert(
  JSON.stringify(fighterTargets) === JSON.stringify([1071, 1071, 1071, 1071, 1075, 1071, 1071, 1071, 1075, 1075]),
  'fighter carry-state gate drift',
)
const fighterCases = fighterTargets.slice(1)
const fighterAdmitted = fighterCases.flatMap((target, state) => (target === 1071 ? [state] : []))
const fighterRejected = fighterCases.flatMap((target, state) => (target === 1075 ? [state] : []))
const companionSwitch = requireAt(7240, 4075, 'lookupswitch')
const companionTargets = switchTargets(companionSwitch)
assert(
  JSON.stringify(companionTargets) ===
    JSON.stringify([4113, 4136, 4117, 4113, 4113, 4113, 4113, 4113, 4113, 4113, 4113, 4136]),
  'companion carry-state gate drift',
)
const companionCases = companionTargets.slice(1)
const companionAdmitted = companionCases.flatMap((target, state) => (target === 4113 ? [state] : []))
const companionRejected = companionCases.flatMap((target, state) => (target === 4136 ? [state] : []))
const companionConditional = companionCases.flatMap((target, state) => (target === 4117 ? [state] : []))
assert(JSON.stringify(companionConditional) === JSON.stringify([1]), 'companion conditional state drift')
requireAt(7240, 1030, 'getproperty', '_-N14')
requireAt(7240, 4065, 'getproperty', '_-h48')
requireAt(7240, 4119, 'callproperty', '_-z2Q')
requireAt(1671, 8, 'getproperty', '_-16A')
assert(requireAt(1671, 15, 'pushbyte').raw[0] === 2, 'companion conditional state predicate drift')

const queryCalls = carry.filter((instruction) => multinameName(instruction.params[0], strings) === '_-K2O')
assert(
  JSON.stringify(queryCalls.map(({ pc, name, raw }) => [pc, name, raw[1]])) ===
    JSON.stringify([
      [823, 'callpropvoid', 10],
      [1574, 'callproperty', 10],
      [4634, 'callproperty', 10],
    ]),
  'method 7240 collision-query ledger drift',
)
function numericOperandAt(methodId: number, pc: number, opcode: string): number {
  const value = requireAt(methodId, pc, opcode).raw[0]
  assert(typeof value === 'number', `method ${methodId} PC ${pc} lacks a numeric operand`)
  return value
}
const entityQueryMask = numericOperandAt(7240, 818, 'pushbyte')
const entityQueryOption = numericOperandAt(7240, 821, 'pushbyte')
assert(entityQueryMask === 1 && entityQueryOption === 0, 'entity query mask/options drift')
const clippedQueryContracts = [
  [1564, 1567, 1570, 1571],
  [4624, 4627, 4630, 4631],
].map(([hardPc, softPc, orPc, optionPc]) => {
  const hard = numericOperandAt(7240, hardPc, 'pushbyte')
  const soft = numericOperandAt(7240, softPc, 'pushbyte')
  const option = numericOperandAt(7240, optionPc, 'pushbyte')
  assert(hard === 1, `query hard mask drift at PC ${hardPc}`)
  assert(soft === 2, `query soft mask drift at PC ${softPc}`)
  requireAt(7240, orPc, 'bitor')
  assert(option === 4, `query option drift at PC ${optionPc}`)
  return { mask: hard | soft, option }
})
const queryMasks = [entityQueryMask, ...clippedQueryContracts.map(({ mask }) => mask)]
const queryOptions = [entityQueryOption, ...clippedQueryContracts.map(({ option }) => option)]

for (const [pc, propertyName] of [
  [857, '_-43x'],
  [892, '_-w5T'],
  [1943, '_-G1Q'],
  [1960, '_-G1Q'],
  [3383, '_-G1Q'],
  [3400, '_-G1Q'],
  [3908, '_-43x'],
  [3959, '_-w5T'],
] as const)
  requireAt(7240, pc, 'callpropvoid', propertyName)
requireAt(7240, 4994, 'initproperty', '_-W1P')
requireAt(7240, 5002, 'initproperty', '_-U4G')
assert(
  !carry.some(
    (instruction) =>
      instruction.pc >= 5006 &&
      instruction.pc < 5842 &&
      ['initproperty', 'setproperty', 'setslot', 'callpropvoid'].includes(instruction.name),
  ),
  'companion side sweep gained an external mutation',
)
assert(
  !carry.some((instruction) => instruction.pc >= 5006 && instruction.name === 'getlocal' && instruction.raw[0] === 10),
  'companion side-sweep result gained a consumer',
)

requireAt(7240, 252, 'callproperty', '_-A4y')
requireAt(7240, 653, 'getproperty', '_-l1Q')
requireAt(7240, 1203, 'getproperty', '_-l1Q')
requireAt(7240, 1225, 'callproperty', '_-Z2g')
requireAt(7240, 4268, 'getproperty', '_-l1Q')
requireAt(7240, 4291, 'callproperty', '_-Z2g')
requireAt(7240, 1589, 'pushdouble')
requireAt(7240, 1660, 'pushdouble')
requireAt(7240, 1757, 'pushdouble')
requireAt(7240, 1823, 'callpropvoid', 'normalize')
requireAt(7240, 4649, 'getlocal')
requireAt(7240, 4719, 'pushdouble')
requireAt(7240, 4816, 'pushdouble')
requireAt(7240, 4882, 'callpropvoid', 'normalize')

const lavaReference = requireAt(7240, 369, 'getproperty', '_-J5i')
const lavaKey = qnameKey(lavaReference.params[0])
assert(lavaKey === '36:9869', 'lava exact QName drift')
const lavaReferences = [...methods.entries()].flatMap(([methodId, instructions]) =>
  instructions
    .filter((instruction) => qnameKey(instruction.params[0]) === lavaKey)
    .map((instruction) => `${methodId}:${instruction.pc}:${instruction.name}`),
)
const lavaLedgerSha256 = sha256(lavaReferences.join('\n'))
assert(lavaReferences.length === 19, 'lava reference count drift')
assert(lavaLedgerSha256 === EXPECTED_LAVA_LEDGER_SHA256, 'lava reference ledger drift')
requireAt(14909, 12215, 'initproperty', '_-J5i')
assert(
  requireAt(14909, 12208, 'pushbyte').raw[0] === 8 && requireAt(14909, 12211, 'pushbyte').raw[0] === 6,
  'lava 8 << 6 initializer drift',
)
requireAt(14909, 12213, 'lshift')
requireAt(850, 300, 'getproperty', '_-J5i')
requireAt(850, 307, 'getproperty', '_-U5E')
requireAt(850, 315, 'getproperty', '_-zM')
const lavaNameIndex = requireAt(850, 319, 'pushstring').raw[0]
assert(
  typeof lavaNameIndex === 'number' && strings[lavaNameIndex - 1] === 'LavaCollision',
  'lava readable registration drift',
)
for (const pc of [369, 2782, 3972]) requireAt(7240, pc, 'getproperty', '_-J5i')
requireAt(7240, 2797, 'initproperty', '_-32b')
requireAt(7240, 2826, 'callpropvoid', '_-G5K')
requireAt(7240, 3987, 'initproperty', '_-32b')
requireAt(7247, 8, 'getproperty', '_-J5i')
requireAt(7247, 25, 'getproperty', '_-KF')
requireAt(7247, 29, 'callproperty', '_-51i')
requireAt(7247, 43, 'getproperty', '_-O4H')
requireAt(7247, 54, 'getproperty', '_-a2z')
requireAt(7247, 77, 'initproperty', 'x')
requireAt(7247, 92, 'initproperty', 'y')

const tickMoving = requireAt(3217, 2642, 'callpropvoid', '_-W1I').pc
const tickFighter = requireAt(3217, 2738, 'callpropvoid', '_-84O').pc
assert(tickMoving < tickFighter, 'moving-world/fighter phase order drift')

console.log(
  JSON.stringify(
    {
      status: 'proven-for-pinned-abc',
      identity: { build: EXPECTED_BUILD, abcSha256, decodedMethodBodies: methods.size, branchTargets: 'valid' },
      method7240: {
        instructionObjectSha256: methodHashes.get(7240),
        mutationInstructions: mutations.length,
        mutationLedgerSha256,
        branchStages,
      },
      stateGates: {
        fighter: {
          admitted: [...fighterAdmitted, ...(fighterTargets[0] === 1071 ? ['out-of-range'] : [])],
          rejected: fighterRejected,
        },
        companion: {
          admitted: [...companionAdmitted, ...(companionTargets[0] === 4113 ? ['out-of-range'] : [])],
          rejected: companionRejected,
          conditional: `state ${companionConditional[0]} is admitted only when CompanionType._-16A == 2`,
        },
      },
      queryContract: {
        masks: queryMasks,
        options: queryOptions,
        triggerMaskUsed: false,
        fighterProbes: 'base Y and base Y - 120',
        companionProbes: 'base Y and base Y - CompanionType._-wW',
      },
      coordinateWrites: {
        entity: ['_-43x(x)', '_-w5T(y)'],
        fighter: ['_-V1I._-G1Q(_-E1J, x)', '_-V1I._-G1Q(_-b1S, y)'],
        companion: ['_-W1P = x', '_-U4G = y'],
        companionSideSweepResult: 'computed but unconsumed',
      },
      composite: {
        onlyExtraFlagReadByMethod7240: 'lava 512 (_-X2i._-J5i)',
        registeredValue: 'LavaCollision 657 = 1 | 16 | 128 | 512',
        exactQNameReferences: lavaReferences.length,
        ledgerSha256: lavaLedgerSha256,
      },
      phase: { movingWorld: tickMoving, fighter: tickFighter },
    },
    null,
    2,
  ),
)
