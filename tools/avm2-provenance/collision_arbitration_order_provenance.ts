import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { className: string; traitName: string; static: boolean }
type ExpectedMethod = {
  className: string
  traitName: string
  params: string[]
  returnType: string
  static?: boolean
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
  1372: {
    className: '_-L3i',
    traitName: '<iinit>',
    params: ['Point', 'Point', 'uint', 'uint', 'uint'],
    returnType: 'void',
  },
  1390: {
    className: '_-91W',
    traitName: '_-K2O',
    params: ['int', 'Number', 'Number', 'Point', 'Point', '_-L3i', 'Point', 'Point', 'uint', 'uint', 'int', 'uint', ''],
    returnType: '_-L3i',
  },
  1391: {
    className: '_-91W',
    traitName: '_-K4Z',
    params: ['Number', 'Number', 'Number', 'Number', ''],
    returnType: 'int',
  },
  1392: { className: '_-91W', traitName: '_-f5H', params: [], returnType: 'void' },
  1393: { className: '_-91W', traitName: '_-pg', params: ['_-L3i'], returnType: 'void' },
  1394: { className: '_-91W', traitName: '_-51g', params: ['_-L3i'], returnType: 'void' },
  1396: {
    className: '_-91W',
    traitName: '_-w5r',
    params: ['Number', 'Number'],
    returnType: 'uint',
    static: true,
  },
  1814: {
    className: '_-f0',
    traitName: '_-t5I',
    params: ['Number', 'Number', 'Number', 'Number', '', '', 'Number'],
    returnType: 'int',
    static: true,
  },
  3217: { className: '_-u16', traitName: '_-z3z', params: [], returnType: 'Boolean' },
  3442: { className: '_-u16', traitName: '_-22K', params: ['Boolean'], returnType: 'void' },
  5151: { className: '_-h5c', traitName: '_-26R', params: ['_-L3i', ''], returnType: 'void' },
  5836: { className: 'MovingPlatform', traitName: '_-A4y', params: ['uint'], returnType: 'Boolean' },
  5842: { className: 'MovingPlatform', traitName: '_-Q1q', params: [], returnType: 'void' },
  5843: { className: 'MovingPlatform', traitName: '_-x2n', params: [], returnType: 'void' },
  5844: { className: 'MovingPlatform', traitName: '_-m3H', params: [], returnType: 'void' },
  6109: {
    className: '_-o2Z',
    traitName: '_-B14',
    params: ['Number', 'Number', 'Number', 'Number', 'Number', 'Number', 'Number', 'Number', 'Point'],
    returnType: 'Boolean',
    static: true,
  },
  7240: { className: '_-04B', traitName: '_-W1I', params: ['uint'], returnType: 'void' },
  7242: { className: '_-04B', traitName: '_-Rv', params: [], returnType: 'void' },
}

const EXPECTED_METHOD_HASHES: Record<number, string> = {
  1372: 'a6a193e01f0f32a5b5fde948f5a1c05edefc5b8ed039af6cfadb834d348c2fa4',
  1390: '5c53868fc7375d4f7881d55491ab1cae00b2c6a46375731a9ba9275f161189d0',
  1391: 'de33a32305b64ef2c9e33ee8c46b390c16724bd48e62cf0346e69e1c79ddc873',
  1392: '2d25ad8d6c9541a85f60017dbba46837cc8b4d1b4b6e98be0780842a36213def',
  1393: 'ee9ea8b4a2adaff095dacf5e9690e2fd84f769b46594194e9c3b8a966dd27a17',
  1394: 'b6c7705132f1a31e75b67f1cf6e452e56275f1b4da2aab102ecafd1f579b13ba',
  1396: '00136478908c9a2f692ced943f01f8fe5f1d405188ae3acafb9b9a0c845030ee',
  1814: 'df63267ffbe1fc7609a81eb05f6e6e0672152014fa33b7cbb483ca1667af18b7',
  3217: 'fa38584982aecca898b7dd153da870c49e039b4d4ab952510f97c3720df19308',
  3442: '23cc5817c98a170c95abe5ae9f34f85deaed777c3561d14ccf6f7026dfc09e93',
  5151: 'ec2c9833b7417bb59ef758183c9f0aed03bdaa9a28e378cb41ec73a08ca60597',
  5836: '23936b119932825526e37f80452e71e5a57eba3dc9ee162f34382436eb867711',
  5842: '8e13dd9d7671797dea25d34e7b4901ae1cccab1abe8f03c3291afa6faefb42d4',
  5843: 'b1ea914b90e13a056960c08746b6df753c9ef09b89c3001d76b8ea150b74dfc2',
  5844: 'ccd7d6ba4b0cba02d3dd512aab37b1e260c36956888498cd645e099f39671c57',
  6109: 'd5ffa7bffbb6d9b51ca3e5e9340bd07e0f67e7b3df55709ab271d0bd4b8161e1',
  7240: '6888afe68cda0912df6d12cc235ff15bfad87358950446a75160841d4048212b',
  7242: '19f08d0cbb52b998484740f287e80c9d41eac424b888b093e08a456d3f0bc356',
}

const EXPECTED_CALLSITE_LEDGERS: Record<number, { references: number; sha256: string }> = {
  1391: { references: 2, sha256: 'e0416403a2fcd1409ed3e8b71e108979b9e6e415ee29389a3dd713f6613b35e4' },
  1392: { references: 1, sha256: '55270ed63563ec6ca5905e5bacbc3fc6144e373af5affba6f77d0ad267ad9cce' },
  1393: { references: 2, sha256: 'cca4600a94e9fd6ee82aa97ab3763f215baaebef8f482d05270d40cc5ddd746a' },
  1394: { references: 4, sha256: 'ba9d2bd1855a009914fc0cd0792442a7ab56e11856533d6cb01f162c612da85e' },
  5842: { references: 0, sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
  5843: { references: 0, sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' },
  5844: { references: 1, sha256: '73ab748091620f091175369d32d651c2dcba1fc49d599a6bd278a3eab5862bdf' },
  7242: { references: 3, sha256: '7a59b36e3d2954291b7b13e7015327662a066ab88d80c0bc73649fd11730f639' },
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
assert(abcPath, 'usage: bun collision_arbitration_order_provenance.ts --abc <main.abc>')
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
  assert(owner.static === (expected.static ?? false), `method ${methodId} static disposition drift`)
  const method = abc.method[methodId]
  assert(
    JSON.stringify(method.param_type.map(typeName)) === JSON.stringify(expected.params),
    `method ${methodId} parameter drift`,
  )
  assert(typeName(method.return_type) === expected.returnType, `method ${methodId} return drift`)
  assert(methodHashes.get(methodId) === EXPECTED_METHOD_HASHES[methodId], `method ${methodId} body drift`)
}

function methodQName(methodId: number): string {
  const matches = abc.instance.flatMap((instance: any, classIndex: number) =>
    [
      ...(instance.trait ?? []).map((trait: any) => ({ trait, classIndex })),
      ...(abc.class[classIndex].traits ?? []).map((trait: any) => ({ trait, classIndex })),
    ].filter(({ trait }) => trait.data?.method === methodId),
  )
  assert(matches.length === 1, `expected one trait for method ${methodId}`)
  const key = qnameKey(abc.constant_pool.multiname[matches[0].trait.name - 1])
  assert(key, `method ${methodId} does not have an exact QName`)
  return key
}
function referencesForQName(
  key: string,
): Array<{ methodId: number; index: number; opcode: string; argumentCount: number | '' }> {
  return [...methods.entries()]
    .flatMap(([methodId, instructions]) =>
      instructions.flatMap((instruction) =>
        qnameKey(instruction.params[0]) === key
          ? [
              {
                methodId,
                index: instruction.index,
                opcode: instruction.name,
                argumentCount: typeof instruction.params[1] === 'number' ? instruction.params[1] : ('' as const),
              },
            ]
          : [],
      ),
    )
    .sort((left, right) => left.methodId - right.methodId || left.index - right.index)
}
function ledgerSha256(
  references: Array<{ methodId: number; index: number; opcode: string; argumentCount: number | '' }>,
): string {
  return sha256(
    references
      .map(
        (reference) => `${reference.methodId}\0${reference.index}\0${reference.opcode}\0${reference.argumentCount}\n`,
      )
      .join(''),
  )
}
const callsiteLedgers = Object.fromEntries(
  Object.entries(EXPECTED_CALLSITE_LEDGERS).map(([methodText, expected]) => {
    const methodId = Number(methodText)
    const references = referencesForQName(methodQName(methodId))
    const digest = ledgerSha256(references)
    assert(references.length === expected.references, `method ${methodId} reference count drift`)
    assert(digest === expected.sha256, `method ${methodId} reference ledger drift`)
    return [methodId, { references: references.length, sha256: digest }]
  }),
)

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
function exactQNameAt(methodId: number, pc: number): string {
  const instruction = methods.get(methodId)?.find((candidate) => candidate.pc === pc)
  assert(instruction, `method ${methodId} lacks PC ${pc}`)
  const key = qnameKey(instruction.params[0])
  assert(key, `method ${methodId} PC ${pc} does not use an exact QName`)
  return key
}

requireAt(1390, 93, 'findproperty', '_-K4Z')
requireAt(1390, 110, 'callproperty', '_-K4Z')
requireAt(1390, 184, 'getlocal')
requireAt(1390, 186, 'getproperty', '_-62S')
requireAt(1390, 200, 'getproperty', '_-i1K')
requireAt(1390, 213, 'getproperty', '_-i1K')
requireAt(1390, 267, 'getproperty', '_-i1K')
requireAt(1390, 919, 'getlex', '_-o2Z')
requireAt(1390, 956, 'callproperty', '_-B14')
requireAt(1390, 966, 'getlocal')
requireAt(1390, 1049, 'getlex', '_-91W')
requireAt(1390, 1095, 'getlocal')
requireAt(1390, 1119, 'getlocal')
requireAt(1391, 39, 'getlex', '_-f0')
requireAt(1391, 66, 'callproperty', '_-t5I')
requireAt(1391, 139, 'findproperty', '_-D3I')
requireAt(1391, 208, 'getlocal')
requireAt(1391, 251, 'findproperty', '_-A2S')
requireAt(1391, 277, 'getlocal')
requireAt(1393, 2, 'findproperty', '_-A2S')
requireAt(1393, 19, 'callpropvoid', 'push')
requireAt(1393, 24, 'getlocal_1')
requireAt(1394, 24, 'getlex', '_-f0')
requireAt(1394, 62, 'callproperty', '_-t5I')
requireAt(1394, 213, 'findproperty', '_-72A')
requireAt(1394, 251, 'getlocal_1')
requireAt(1394, 264, 'findproperty', '_-91r')
requireAt(5151, 12, 'findproperty', '_-Z2h')
requireAt(5151, 23, 'callpropvoid', '_-pg')
requireAt(5151, 39, 'findproperty', '_-Z2h')
requireAt(5151, 50, 'callpropvoid', '_-51g')
requireAt(6109, 23, 'getlocal')
requireAt(6109, 31, 'pushfalse')
requireAt(6109, 96, 'getlocal')
requireAt(6109, 110, 'lessequals')
requireAt(6109, 117, 'getlocal')
requireAt(6109, 133, 'lessequals')

const containerIdKey = exactQNameAt(1372, 70)
const disabledKey = exactQNameAt(1390, 186)
const containerIdReferences = referencesForQName(containerIdKey)
const disabledReferences = referencesForQName(disabledKey)
assert(containerIdReferences.length === 6, 'dynamic container ID reference count drift')
assert(
  containerIdReferences.filter((reference) => reference.opcode === 'initproperty').length === 1 &&
    containerIdReferences.some((reference) => reference.methodId === 1372 && reference.index === 29),
  'dynamic container ID is no longer constructor-only mutation',
)
assert(disabledReferences.length === 3, 'dynamic disabled-state reference count drift')
assert(
  JSON.stringify(disabledReferences.map(({ methodId, index, opcode }) => ({ methodId, index, opcode }))) ===
    JSON.stringify([
      { methodId: 1390, index: 87, opcode: 'getproperty' },
      { methodId: 5842, index: 25, opcode: 'initproperty' },
      { methodId: 5843, index: 25, opcode: 'initproperty' },
    ]),
  'dynamic disabled-state mutation ledger drift',
)

const phaseAnchors = {
  movingWorld: requireAt(3217, 2642, 'callpropvoid', '_-W1I').pc,
  fighter: requireAt(3217, 2738, 'callpropvoid', '_-84O').pc,
  platformRefresh: requireAt(7240, 252, 'callproperty', '_-A4y').pc,
  carryQueries: [
    requireAt(7240, 823, 'callpropvoid', '_-K2O').pc,
    requireAt(7240, 1574, 'callproperty', '_-K2O').pc,
    requireAt(7240, 4634, 'callproperty', '_-K2O').pc,
  ],
}
assert(phaseAnchors.movingWorld < phaseAnchors.fighter, 'moving-world/fighter phase order drift')
assert(phaseAnchors.platformRefresh < phaseAnchors.carryQueries[0], 'moving refresh/carry query order drift')

const cleanupAnchors = {
  movingManager: requireAt(3442, 786, 'callpropvoid', '_-Rv').pc,
  collisionManager: requireAt(3442, 798, 'callpropvoid', '_-f5H').pc,
  platformRelease: requireAt(7242, 167, 'callpropvoid', '_-m3H').pc,
}
assert(cleanupAnchors.movingManager < cleanupAnchors.collisionManager, 'moving/collision cleanup order drift')

console.log(
  JSON.stringify(
    {
      status: 'bounded-static-order-with-runtime-blockers',
      identity: {
        build: EXPECTED_BUILD,
        abcSha256,
        decodedMethodBodies: methods.size,
        branchTargets: 'valid',
      },
      methodHashes: Object.fromEntries(
        Object.keys(EXPECTED_METHODS).map((methodId) => [methodId, EXPECTED_METHOD_HASHES[Number(methodId)]]),
      ),
      callsiteLedgers,
      candidateOrder: {
        spatialTraversal: 'method 1814 output order',
        staticBuckets: 'method 1391 bucket order then bucket stored order',
        dynamicTail: 'method 1391 appends the dynamic vector after static buckets',
        intersectionBounds: 'method 6109 accepts both parameter endpoints inclusively',
        equalDistance: 'later eligible candidate overwrites the earlier hit after endpoint shortening',
        collectionMode: 'candidate order is preserved while duplicate accepted segments are suppressed',
        specialCoincidence:
          'method 1390 PCs 296-480 can retain an earlier hard candidate over one narrow later soft sentinel-normal case',
      },
      dynamicMutation: {
        containerIdReferences: containerIdReferences.length,
        containerIdWrites: 1,
        disabledStateReferences: disabledReferences.length,
        toggleMethodReferences: { 5842: 0, 5843: 0 },
        refresh: 'dynamic endpoints mutate in place before carry queries; no spatial reindex is used',
      },
      phaseAnchors,
      cleanupAnchors,
      blockers: [
        'no exact static caller reaches either dynamic disabled-state toggle method',
        'dynamic/reflection/host reachability and transition timing are not closed',
        'no trusted runtime trace covers equal-distance, shared-endpoint, toggle, refresh, or teardown scenarios',
      ],
    },
    null,
    2,
  ),
)
