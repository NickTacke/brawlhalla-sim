import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
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

type Anchor = {
  label: string
  methodId: number
  instructionIndex: number
  opcode: string
  value?: string | number
}

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
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

const METHOD_IDENTITIES: Record<number, MethodIdentity> = {
  2672: {
    codeByteLength: 1613,
    instructionCount: 558,
    codeSha256: 'b8902acf95632a6fdb14d579ed78d7447350e36af921b5e0afb552334e9b4193',
    semanticSha256: 'c375ad98590ca7e6e8c4335a83bb053dc24119cc91ffe170c8bcdc06ee75e01d',
  },
  3732: {
    codeByteLength: 1729,
    instructionCount: 576,
    codeSha256: '45b4353a8495f6459875f69ce0e4702acb1496ed6bffe58e51797fc86b680988',
    semanticSha256: '7a65fd8724867b91dedea1d334bc67ab62bb0ae844cfed088ddf9f97769e3aa6',
  },
  4123: {
    codeByteLength: 3697,
    instructionCount: 1281,
    codeSha256: 'f428bfce4f909fd682c07d6112e8f7523f4b68d3c1ad05816b5b4f7d76625f73',
    semanticSha256: '7e97cddec709b1ceb12f19292cfaf071ddc545e125dd856f3c3376961a7726d2',
  },
  4655: {
    codeByteLength: 1793,
    instructionCount: 729,
    codeSha256: 'f8e0ff5e9e9ff3e1beb079cf40437ef5c74f4e2984ba732cbf67735eec539246',
    semanticSha256: '1c99f20bb791cf9b70c3a61c1c3cc272b59bcd383fcb375579561c06efc8d66d',
  },
  4809: {
    codeByteLength: 789,
    instructionCount: 274,
    codeSha256: '92ce6302d59db8e66373c0435a4f8f466174c1d44bcd8a115133558a91dfc3f7',
    semanticSha256: 'd6e5646fc58e12eac7c8bed31fa77a265a5bf03b2189a199a8a726aef7c89165',
  },
  4818: {
    codeByteLength: 637,
    instructionCount: 222,
    codeSha256: '22e7ca461af9bcdc48b89fb9082b1da9f5aa9b7d5456d67708d7397c13eecb35',
    semanticSha256: 'fbe530aaa39372d6152143a44d8ebbe7884738e1b8e372ddde84b0493d0d4f1d',
  },
  4834: {
    codeByteLength: 5014,
    instructionCount: 1745,
    codeSha256: 'b038cafaefacaa9c6638cc176206a5a7cc64d943016f92c9e18ff970ef9a1b69',
    semanticSha256: 'd76bbbce3448a9235cf88082facea66663db0bcf45e680761e406c8d81930a25',
  },
  5098: {
    codeByteLength: 797,
    instructionCount: 282,
    codeSha256: '21536ef14f297a5ce035b786fcacd16ab942d7e346b0660bd787fb1ef189e3a1',
    semanticSha256: '8ed6bfdac77d98fc36fc13bb9449240ecce46906a6f9d08ee40110e2d4025e84',
  },
  5156: {
    codeByteLength: 1959,
    instructionCount: 548,
    codeSha256: '802d859e55945a5ac6c34f83ab998020139a5370ee50cfdee340c52879e0b65b',
    semanticSha256: '9c7d0ac1afbd23acfb7e024364c0226f8b31b027f66b91e5046e1d3b95ef10a4',
  },
  6264: {
    codeByteLength: 933,
    instructionCount: 321,
    codeSha256: '72b6d046e0770cb01c643464a657c91361475c6991a799b26a025515cfa42379',
    semanticSha256: '111fe59caaba7d585a91a36b96124eb685c33a0e2f25283c50896aaac05a2302',
  },
  6294: {
    codeByteLength: 17824,
    instructionCount: 6928,
    codeSha256: 'c2ef2e714f35c02f98a72e5457d0b6036d54c2dca70bdba30181a7ee40781547',
    semanticSha256: 'dd6c858a6bdb6ce0ff0972f2f5a0380103887ac7d2354c9e4240a6931eba2a17',
  },
  7108: {
    codeByteLength: 804,
    instructionCount: 303,
    codeSha256: '6fe40272669d622217211c3c52dae2a0f918c8da107b824d5690b58c44988ad6',
    semanticSha256: '5c69c967a79430c875c6deb27363ba4462851f114a96c2fe56d3bf5bd9492739',
  },
  7279: {
    codeByteLength: 4552,
    instructionCount: 1559,
    codeSha256: 'e37fae93b876ddc061cfa6c705f7715497295507ae467c04c4da0f305002609c',
    semanticSha256: '4b5c048ca1789855712cce431fb5ec0e41d84a912b67e293e178be13722d3d02',
  },
  11659: {
    codeByteLength: 928,
    instructionCount: 334,
    codeSha256: '228edcc0e70cda1a7da0d7e1b5e04937848b5a3941f0b95adaad729570b4edbe',
    semanticSha256: 'ec4c8a8a1817bdf78c3b1f301af31d2a2074c43f716a5d0a1d5a0fda9d56e7c4',
  },
  4804: {
    codeByteLength: 210,
    instructionCount: 79,
    codeSha256: 'b5203b29b32060bd06600ac23998104dada87fb0c47c9f3ece8fd2477ec268c7',
    semanticSha256: 'a9280d1bc056562bc5c7e8ea6811353f3802a919bc04b7fa7a9957cfcd765ccf',
  },
  6076: {
    codeByteLength: 140,
    instructionCount: 59,
    codeSha256: '031688695c735279b0e9145160ca70c449dac20296b90db73b4ac5a59b615d9e',
    semanticSha256: 'c208b36ccf099d797fa000d366f24daa9cda31181e05623c4f2b317b82495339',
  },
  6077: {
    codeByteLength: 25,
    instructionCount: 8,
    codeSha256: '864d9ae883dbaca1f5b2d1ac0923f2840e61f56b8a126c2d079dedadb747d4f5',
    semanticSha256: '0797548005a460b3db00f9ca7f484f265b9af76b206c6964fc545e3cc031a039',
  },
  6079: {
    codeByteLength: 154,
    instructionCount: 65,
    codeSha256: 'c8b5bae9764655f2b256dee8591bfdb584b0f425bf6268acff0b7732a062cb1d',
    semanticSha256: '707c5b9400a7c79b6d116b913f15e92747f1db844a5dd5cd399615027ded565e',
  },
  6082: {
    codeByteLength: 158,
    instructionCount: 66,
    codeSha256: 'fbb697aa3976e38f8529dac1918b6981fb88999e03c36cae37644f02982bcfe2',
    semanticSha256: '25694777836d86c8bccb4e59a5535672f358fa055f000d01797786be0cf718a2',
  },
  2146: {
    codeByteLength: 278,
    instructionCount: 129,
    codeSha256: '6d1485183482150dabb1c36b2596ec2317627cedb33ae07c023ed59fee2f3804',
    semanticSha256: '8e921803573aa57c89969a5d2e648ca0949754ac85692d0994846644e68c2c6d',
  },
  2152: {
    codeByteLength: 158,
    instructionCount: 80,
    codeSha256: '3e71e44a19f94cb8bbcfe56970b129d98675b0aeac9a1d59638f4da606d8f7fd',
    semanticSha256: 'f69b1f88cf5adbae02e1daaaea2af4555616cbca142847bdba23c59355694617',
  },
  15059: {
    codeByteLength: 4275,
    instructionCount: 1543,
    codeSha256: '4d98213d6beae5615ef33912698447ea3785dd3fe55f5dd6c74db25e3a9f53f7',
    semanticSha256: '9b2321afb5ddaef20abeb8d0291fc156130e4ef537302afc92dbc5c7a99dffe8',
  },
}

const ANCHORS: Anchor[] = [
  {
    label: 'xml duplicate attribute error',
    methodId: 15059,
    instructionIndex: 470,
    opcode: 'pushstring',
    value: 'Duplicate attribute [',
  },
  { label: 'xml required equals', methodId: 15059, instructionIndex: 500, opcode: 'pushstring', value: 'Expected =' },
  {
    label: 'xml required double quote',
    methodId: 15059,
    instructionIndex: 509,
    opcode: 'pushstring',
    value: 'Expected "',
  },
  {
    label: 'xml closing-tag validation',
    methodId: 15059,
    instructionIndex: 808,
    opcode: 'pushstring',
    value: 'Expected </',
  },
  { label: 'xml close delimiter', methodId: 15059, instructionIndex: 836, opcode: 'pushstring', value: 'Expected >' },
  {
    label: 'xml unexpected end',
    methodId: 15059,
    instructionIndex: 1537,
    opcode: 'pushstring',
    value: 'Unexpected end',
  },
  { label: 'csv line feed', methodId: 2146, instructionIndex: 49, opcode: 'pushbyte', value: 10 },
  { label: 'csv carriage return', methodId: 2146, instructionIndex: 52, opcode: 'pushbyte', value: 13 },
  { label: 'csv quote', methodId: 2146, instructionIndex: 76, opcode: 'pushbyte', value: 34 },
  { label: 'csv escaped quote', methodId: 2146, instructionIndex: 86, opcode: 'pushbyte', value: 34 },
  { label: 'csv comma', methodId: 2146, instructionIndex: 103, opcode: 'pushbyte', value: 44 },
  { label: 'direct string empty default', methodId: 6076, instructionIndex: 6, opcode: 'pushstring', value: '' },
  { label: 'comma-list delimiter', methodId: 6077, instructionIndex: 4, opcode: 'pushstring', value: ',' },
  { label: 'number empty default', methodId: 6079, instructionIndex: 6, opcode: 'pushbyte', value: 0 },
  { label: 'boolean empty default', methodId: 6082, instructionIndex: 6, opcode: 'pushfalse' },
  { label: 'boolean true token', methodId: 6082, instructionIndex: 63, opcode: 'pushstring', value: 'TRUE' },
  { label: 'spawn parent empty test', methodId: 4804, instructionIndex: 18, opcode: 'pushstring', value: '' },
  { label: 'spawn inheritance return', methodId: 4804, instructionIndex: 78, opcode: 'returnvoid' },
  {
    label: 'spawn duplicate ID diagnostic',
    methodId: 4809,
    instructionIndex: 196,
    opcode: 'pushstring',
    value: '[ItemSpawnRateType] duplicate ID: ',
  },
  {
    label: 'spawn duplicate name diagnostic',
    methodId: 4809,
    instructionIndex: 230,
    opcode: 'pushstring',
    value: '[ItemSpawnRateType] duplicate name: ',
  },
  { label: 'spawn vector append after checks', methodId: 4809, instructionIndex: 240, opcode: 'callpropvoid' },
  { label: 'spawn ID map overwrite', methodId: 4809, instructionIndex: 248, opcode: 'setproperty' },
  { label: 'spawn name map overwrite', methodId: 4809, instructionIndex: 272, opcode: 'setproperty' },
  { label: 'level locator constant', methodId: 5156, instructionIndex: 19, opcode: 'pushstring', value: 'LevelDesc' },
]

const BRANCHES = new Set([
  'ifeq',
  'iffalse',
  'ifge',
  'ifgt',
  'if' + 'le',
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

const abcPath = argument('--abc')
const sourceDirectory = argument('--source-dir')
assert(
  abcPath && sourceDirectory,
  'usage: bun patch_loader_defaults_provenance.ts --abc <main.abc> --source-dir <decrypted>',
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
const identities: Record<number, MethodIdentity> = {}
const branchErrors: string[] = []
for (const body of abc.method_body) {
  const rawInstructions = disassembler.disassemble(body) as Instruction[]
  const code = Uint8Array.from(body.code)
  const instructions = locateInstructions(code, rawInstructions)
  methods.set(body.method, instructions)
  branchErrors.push(...validateBranches(instructions, code.byteLength).map((pc) => `method ${body.method} ${pc}`))

  if (METHOD_IDENTITIES[body.method]) {
    identities[body.method] = {
      codeByteLength: code.byteLength,
      instructionCount: rawInstructions.length,
      codeSha256: sha256(code),
      semanticSha256: sha256(JSON.stringify(rawInstructions)),
    }
  }
}
assert(branchErrors.length === 0, `invalid branch targets: ${branchErrors.join(', ')}`)

for (const [methodIdText, expected] of Object.entries(METHOD_IDENTITIES)) {
  const methodId = Number(methodIdText)
  const actual = identities[methodId]
  assert(actual, `method ${methodId} was not decoded`)
  assert(JSON.stringify(actual) === JSON.stringify(expected), `method ${methodId} identity mismatch`)
}

const anchorLedger = ANCHORS.map((anchor) => {
  const instruction = methods.get(anchor.methodId)?.[anchor.instructionIndex]
  assert(instruction, `method ${anchor.methodId} lacks instruction ${anchor.instructionIndex}`)
  assert(instruction.name === anchor.opcode, `${anchor.label} opcode mismatch`)
  if (anchor.value !== undefined) {
    assert(instruction.params[0] === anchor.value, `${anchor.label} value mismatch`)
  }
  return {
    ...anchor,
    pc: instruction.pc,
  }
})

process.stdout.write(
  `${JSON.stringify(
    {
      target: { build: EXPECTED_BUILD, abcSha256 },
      sources,
      decodedMethodBodies: abc.method_body.length,
      branchTargetsValid: true,
      methodIdentities: identities,
      anchorLedger,
      provenStaticBoundaries: [
        'selected AIR XML parser branches',
        'CSV comma, quote, CR, and LF tokens',
        'common string, list, number, and boolean default anchors',
        'ItemSpawnRateType copy-before-override inheritance anchors',
        'representative duplicate diagnostic then vector/map insertion order',
        'LevelDesc string locator is script-initializer evidence only',
      ],
      blockers: [
        'no field-for-field reference loader object output',
        'no mutation execution against the pinned loader',
        'actual Dynamic LevelDesc loader not identified',
        'no canonical normalized provenance leaves',
      ],
      status: 'partial-static-proof',
    },
    null,
    2,
  )}\n`,
)
