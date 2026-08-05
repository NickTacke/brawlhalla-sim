import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }
type ExpectedMethod = {
  className: string
  traitName: string
  params: string[]
  returnType: string
}

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_BODY_COUNT = 15_010
const EXPECTED_DYNAMIC = {
  sectionCount: 186,
  levelDescRoots: 120,
  cutsceneRoots: 66,
  levelDescLedgerSha256: '60630e3860e64d2d04deda1075d6cdb0f89e37cfaffd2ed8134f3dde95bbad99',
  movingPlatforms: 167,
  animations: 167,
  dynamicCollisions: 167,
  dynamicRespawns: 28,
  dynamicItemSpawns: 28,
}
const EXPECTED_STRUCTURAL_FAILURES = ['Dynamic.swz.103.xml', 'Dynamic.swz.122.xml']
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
  1390: {
    className: '_-91W',
    traitName: '_-K2O',
    params: ['int', 'Number', 'Number', 'Point', 'Point', '_-L3i', 'Point', 'Point', 'uint', 'uint', 'int', 'uint', ''],
    returnType: '_-L3i',
  },
  3217: { className: '_-u16', traitName: '_-z3z', params: [], returnType: 'Boolean' },
  5141: {
    className: '_-h5c',
    traitName: '_-p3s',
    params: ['MovingPlatform', '_-G3D', 'Number', 'Number'],
    returnType: 'void',
  },
  5834: {
    className: 'MovingPlatform',
    traitName: '<iinit>',
    params: ['_-u16', 'String', '_-13E', '_-G3D', 'Number', 'uint', 'Sprite3D'],
    returnType: 'void',
  },
  5836: { className: 'MovingPlatform', traitName: '_-A4y', params: ['uint'], returnType: 'Boolean' },
  5837: { className: 'MovingPlatform', traitName: '_-x2m', params: ['uint'], returnType: 'void' },
  5838: { className: 'MovingPlatform', traitName: '_-C3c', params: ['uint', 'int'], returnType: 'Number' },
  5839: { className: 'MovingPlatform', traitName: '_-M3H', params: ['Number'], returnType: 'uint' },
  5840: {
    className: 'MovingPlatform',
    traitName: '_-5i',
    params: ['uint', 'Point', 'Point'],
    returnType: 'Number',
  },
  5841: { className: 'MovingPlatform', traitName: '_-X6J', params: ['_-Y44'], returnType: 'void' },
  5842: { className: 'MovingPlatform', traitName: '_-Q1q', params: [], returnType: 'void' },
  5843: { className: 'MovingPlatform', traitName: '_-x2n', params: [], returnType: 'void' },
  5844: { className: 'MovingPlatform', traitName: '_-m3H', params: [], returnType: 'void' },
  5845: { className: 'MovingPlatform', traitName: '_-A1q', params: ['uint'], returnType: 'Boolean' },
  5846: { className: 'MovingPlatform', traitName: '_-u3M', params: [], returnType: 'void' },
  5847: { className: 'MovingPlatform', traitName: '_-K5p', params: [''], returnType: 'void' },
  5848: { className: 'MovingPlatform', traitName: '_-a1v', params: [''], returnType: 'void' },
  5849: { className: 'MovingPlatform', traitName: '_-L2c', params: [''], returnType: 'void' },
  7240: { className: '_-04B', traitName: '_-W1I', params: ['uint'], returnType: 'void' },
}

const EXPECTED_METHOD_HASHES: Record<number, string> = {
  1390: '5c53868fc7375d4f7881d55491ab1cae00b2c6a46375731a9ba9275f161189d0',
  3217: 'fa38584982aecca898b7dd153da870c49e039b4d4ab952510f97c3720df19308',
  5141: 'b6cbec79b91e8d6899b5bf0e036beb619b24dec5c6135b17a0143da937041879',
  5834: 'ea3eb88ab59e473c82f7ad0f384d757a0e028d648ca37e20de7aeac633297685',
  5836: '23936b119932825526e37f80452e71e5a57eba3dc9ee162f34382436eb867711',
  5837: '005c035bb38c1b742144dcea5be6558e8e2ba2863c1ad2852a00ee856f539483',
  5838: 'a14212521841c292140eec328495deb18ba8af3b9d681848a8876ca57b6f2383',
  5839: '370ecf46d613f8f2d1ac4078de2b855ecc17cc4d86e576848c68859b80fb0d92',
  5840: '2b5a70134a262743a3c504e64ad08e3d3ad116d551f90c7d1e2846cc1b40e22c',
  5841: '18adb9283125b3594891b5814db671d02103c75f6cc7b411ad10c8466ce1d384',
  5842: '8e13dd9d7671797dea25d34e7b4901ae1cccab1abe8f03c3291afa6faefb42d4',
  5843: 'b1ea914b90e13a056960c08746b6df753c9ef09b89c3001d76b8ea150b74dfc2',
  5844: 'ccd7d6ba4b0cba02d3dd512aab37b1e260c36956888498cd645e099f39671c57',
  5845: '0f13b4e97ecdf4c150d62e22e5eaf0dc10de608c56c3a3757f317d34b25e9b07',
  5846: '1c56afa01fd050125c104342fe7f2cd276b84ddcba7edd816c70d458014e1ba4',
  5847: '5d2427de06d15d80fc04b057ee5567951020c965e159fc1724d1160206f1c512',
  5848: '8537beb2f559b5811ea7ab40abfb4cbde1119f3e90df7754bac3780d67759fe0',
  5849: '8a22d0a7d1798e251b71e786dd5e87ae094f1accaf5fc0f85dd0e6ba905ac9cf',
  7240: '6888afe68cda0912df6d12cc235ff15bfad87358950446a75160841d4048212b',
}

const EXPECTED_CALLSITE_LEDGERS: Record<string, { methodId: number; references: number; sha256: string }> = {
  '_-p3s': {
    methodId: 5141,
    references: 1,
    sha256: '22055aab7df312718bd73f1cc97052c9b676f08408214bc248b3ce6e16a68dfe',
  },
  '_-A4y': {
    methodId: 5836,
    references: 3,
    sha256: 'cc1fb506360446503e086c7ffc54eea7bc1d44f448af40541f0706947ff78154',
  },
  '_-x2m': {
    methodId: 5837,
    references: 4,
    sha256: '5f3d62d072e0c3f2cebbcbbed21a046ddd365564771590a816d95afadf3dcef5',
  },
  '_-C3c': {
    methodId: 5838,
    references: 4,
    sha256: '3e837e6792a530bb4320285eebe8a946a09b2c496aeeaccfbbdbf9cc74ab7516',
  },
  '_-M3H': {
    methodId: 5839,
    references: 0,
    sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  },
  '_-5i': {
    methodId: 5840,
    references: 4,
    sha256: '0cac263173da06ed50e16a3e996a78508b6fbe9833ba20f76b59d91764959a26',
  },
  '_-X6J': {
    methodId: 5841,
    references: 2,
    sha256: '0cea97ed56e99d24030b6f6c0e071a4185a5da1e52f811f8bcdac64da5f733c1',
  },
  '_-m3H': {
    methodId: 5844,
    references: 1,
    sha256: '73ab748091620f091175369d32d651c2dcba1fc49d599a6bd278a3eab5862bdf',
  },
  '_-A1q': {
    methodId: 5845,
    references: 1,
    sha256: 'bca149519dab1421f61cf7e3e67bae8f0587fea4b3bbde33e55510b0a61e9cff',
  },
  '_-u3M': {
    methodId: 5846,
    references: 2,
    sha256: '299b4a92e5a0aed2da38c00d8cba95b2bcd6db0f7c2a3ed93ffe0412c858ed97',
  },
  '_-K5p': {
    methodId: 5847,
    references: 1,
    sha256: '4e74b1a4409b1961474f60df016091eff73b29cc97fe1ba1b7d31735dbe3cc43',
  },
  '_-a1v': {
    methodId: 5848,
    references: 1,
    sha256: '5f69a367edd300b6b88f8d05429515d287597af64a0e9460e7c1b071a2fdde3e',
  },
  '_-L2c': {
    methodId: 5849,
    references: 1,
    sha256: '91032af1d9ee5f206df08dd8e3a2117ce831a59fb2090599639bfe801f87a7bf',
  },
}

const TICK_PHASES = [
  { methodId: 6933, role: 'mode-pre' },
  { methodId: 7240, role: 'moving-world' },
  { methodId: 4753, role: 'item-pre' },
  { methodId: 6583, role: 'respawn-scoring-pre' },
  { methodId: 2894, role: 'fighter' },
  { methodId: 2893, role: 'fighter-post' },
  { methodId: 4755, role: 'item-post' },
  { methodId: 1474, role: 'deferred-hit' },
  { methodId: 6935, role: 'terminal' },
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
        owners.set(trait.data.method, { classIndex, className, traitName: nameAt(trait.name), static: group.static })
      }
    }
  }
  return owners
}
function methodQName(abc: any, methodId: number): string {
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
const COUNTED_TAGS = new Set(['Animation', 'DynamicCollision', 'DynamicItemSpawn', 'DynamicRespawn'])
function countTag(xml: string, tag: string): number {
  assert(COUNTED_TAGS.has(tag), `unsupported tag counter: ${tag}`)
  const needle = `<${tag}`
  let count = 0
  let offset = 0
  while (offset < xml.length) {
    const index = xml.indexOf(needle, offset)
    if (index === -1) break
    const boundary = xml[index + needle.length]
    if (boundary === '>' || boundary === '/' || /\s/.test(boundary)) count++
    offset = index + needle.length
  }
  return count
}
function rootTag(xml: string): string {
  const match = xml.match(/^\s*<([A-Za-z_][\w:.-]*)\b/)
  assert(match, 'section lacks a root element')
  return match[1]
}
function stripComments(xml: string): string {
  return xml.replace(/<!--[\s\S]*?-->/g, '')
}
function structuralXmlFailure(xml: string): string | null {
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-fA-F]+;)/.test(xml)) return 'unescaped ampersand'
  if (/"(?=[A-Za-z_:][\w:.-]*\s*=)/.test(xml)) return 'missing attribute separator'

  const stack: string[] = []
  for (const match of xml.matchAll(/<[^>]*>/g)) {
    const token = match[0]
    if (/^<\?|^<!/.test(token)) continue
    const close = token.match(/^<\/\s*([A-Za-z_][\w:.-]*)\s*>$/)
    if (close) {
      if (stack.pop() !== close[1]) return `mismatched closing tag ${close[1]}`
      continue
    }
    const open = token.match(/^<\s*([A-Za-z_][\w:.-]*)\b/)
    if (!open) return 'invalid tag'
    if (!/\/\s*>$/.test(token)) stack.push(open[1])
  }
  return stack.length === 0 ? null : `unclosed tag ${stack.at(-1)}`
}
function normalizeLevelDesc103(xml: string): string {
  let replacements = 0
  const normalized = xml.replace(/"(?=[A-Za-z_:][\w:.-]*\s*=)/g, () => {
    replacements++
    return '" '
  })
  assert(replacements === 1, `expected one section-103 attribute-separator repair, found ${replacements}`)
  return normalized
}

const abcPath = argument('--abc')
const dynamicDir = argument('--dynamic-dir')
assert(abcPath && dynamicDir, 'usage: bun moving_platform_semantics_provenance.ts --abc <main.abc> --dynamic-dir <dir>')

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
  const method = abc.method[methodId]
  const params = method.param_type.map(typeName)
  assert(JSON.stringify(params) === JSON.stringify(expected.params), `method ${methodId} parameter drift`)
  assert(typeName(method.return_type) === expected.returnType, `method ${methodId} return drift`)
  assert(methodHashes.get(methodId) === EXPECTED_METHOD_HASHES[methodId], `method ${methodId} body drift`)
}

const callsiteLedgers = Object.fromEntries(
  Object.entries(EXPECTED_CALLSITE_LEDGERS).map(([traitName, expected]) => {
    const key = methodQName(abc, expected.methodId)
    const references = [...methods.entries()]
      .flatMap(([methodId, instructions]) =>
        instructions
          .filter((instruction) => qnameKey(instruction.params[0]) === key)
          .map((instruction) => ({
            methodId,
            instructionOrdinal: instruction.index,
            opcode: instruction.name,
            argumentCount: typeof instruction.params[1] === 'number' ? instruction.params[1] : '',
          })),
      )
      .sort((left, right) => left.methodId - right.methodId || left.instructionOrdinal - right.instructionOrdinal)
    const ledger = references
      .map(
        (reference) =>
          `${reference.methodId}\0${reference.instructionOrdinal}\0${reference.opcode}\0${reference.argumentCount}\n`,
      )
      .join('')
    const digest = sha256(ledger)
    assert(references.length === expected.references, `${traitName} reference count drift`)
    assert(digest === expected.sha256, `${traitName} ledger drift: ${digest}`)
    return [traitName, { references: references.length, sha256: digest }]
  }),
)

const tickInstructions = methods.get(3217)
assert(tickInstructions, 'tick root method 3217 has no body')
const tickPhases = TICK_PHASES.map((phase) => {
  const key = methodQName(abc, phase.methodId)
  const references = tickInstructions.filter((instruction) => qnameKey(instruction.params[0]) === key)
  assert(references.length === 1, `tick root does not call ${phase.role} exactly once`)
  return { ...phase, pc: references[0].pc, instructionOrdinal: references[0].index }
})
for (let index = 1; index < tickPhases.length; index++) {
  assert(tickPhases[index - 1].pc < tickPhases[index].pc, `tick phase order drift at ${tickPhases[index].role}`)
}
assert(tickPhases.find((phase) => phase.role === 'moving-world')?.pc === 2642, 'moving-world tick anchor drift')

const sectionNames = readdirSync(resolve(dynamicDir))
  .filter((name) => /^Dynamic\.swz\.\d+\.xml$/.test(name))
  .sort((left, right) => Number(left.split('.')[2]) - Number(right.split('.')[2]))
assert(
  sectionNames.length === EXPECTED_DYNAMIC.sectionCount,
  `expected ${EXPECTED_DYNAMIC.sectionCount} Dynamic sections`,
)

const structuralFailures: Array<{ section: string; reason: string }> = []
const roots: Record<string, number> = {}
const levelDescLedger: string[] = []
let movingPlatforms = 0
let animations = 0
let dynamicCollisions = 0
let dynamicRespawns = 0
let dynamicItemSpawns = 0
for (const section of sectionNames) {
  const sectionPath = join(resolve(dynamicDir), section)
  const sourceBytes = readFileSync(sectionPath)
  const commentFree = stripComments(sourceBytes.toString('utf8'))
  const structuralFailure = structuralXmlFailure(commentFree)
  if (structuralFailure) structuralFailures.push({ section: basename(section), reason: structuralFailure })

  let activeXml = commentFree
  if (section === 'Dynamic.swz.103.xml') {
    assert(structuralFailure === 'missing attribute separator', 'section 103 structural failure drift')
    activeXml = normalizeLevelDesc103(commentFree)
    assert(structuralXmlFailure(activeXml) === null, 'section 103 remains malformed after compatibility normalization')
  }

  const root = rootTag(activeXml)
  roots[root] = (roots[root] ?? 0) + 1
  if (root !== 'LevelDesc') continue
  assert(
    section === 'Dynamic.swz.103.xml' || structuralFailure === null,
    `${section} is an unhandled malformed LevelDesc`,
  )
  const ordinal = Number(section.split('.')[2])
  levelDescLedger.push(`${ordinal}\0${sourceBytes.length}\0${sha256(new Uint8Array(sourceBytes))}\n`)

  const movingBlocks = [...activeXml.matchAll(/<MovingPlatform\b[\s\S]*?<\/MovingPlatform>/g)].map((match) => match[0])
  movingPlatforms += movingBlocks.length
  for (const block of movingBlocks) {
    const childAnimations = countTag(block, 'Animation')
    assert(childAnimations === 1, `${section} MovingPlatform does not contain exactly one Animation`)
    animations += childAnimations
  }
  dynamicCollisions += countTag(activeXml, 'DynamicCollision')
  dynamicRespawns += countTag(activeXml, 'DynamicRespawn')
  dynamicItemSpawns += countTag(activeXml, 'DynamicItemSpawn')
}

assert(
  JSON.stringify(structuralFailures.map((failure) => failure.section)) === JSON.stringify(EXPECTED_STRUCTURAL_FAILURES),
  'structural Dynamic failure set drift',
)
assert(sha256(levelDescLedger.join('')) === EXPECTED_DYNAMIC.levelDescLedgerSha256, 'LevelDesc ledger drift')
assert(roots.LevelDesc === EXPECTED_DYNAMIC.levelDescRoots, 'LevelDesc root count drift')
assert(roots.CutsceneType === EXPECTED_DYNAMIC.cutsceneRoots, 'CutsceneType root count drift')
assert(movingPlatforms === EXPECTED_DYNAMIC.movingPlatforms, 'MovingPlatform count drift')
assert(animations === EXPECTED_DYNAMIC.animations, 'Animation count drift')
assert(dynamicCollisions === EXPECTED_DYNAMIC.dynamicCollisions, 'DynamicCollision count drift')
assert(dynamicRespawns === EXPECTED_DYNAMIC.dynamicRespawns, 'DynamicRespawn count drift')
assert(dynamicItemSpawns === EXPECTED_DYNAMIC.dynamicItemSpawns, 'DynamicItemSpawn count drift')

console.log(
  JSON.stringify(
    {
      status: 'bounded-static-closure-with-runtime-blockers',
      identity: {
        build: EXPECTED_BUILD,
        abcSha256,
        decodedMethodBodies: methods.size,
        branchTargets: 'valid',
      },
      movingPlatformMethods: Object.fromEntries(
        Object.entries(EXPECTED_METHODS).map(([methodId, expected]) => [
          methodId,
          { ...expected, instructionObjectSha256: EXPECTED_METHOD_HASHES[Number(methodId)] },
        ]),
      ),
      callsiteLedgers,
      tickPhases,
      dynamicSource: {
        sections: sectionNames.length,
        roots,
        levelDescLedgerSha256: EXPECTED_DYNAMIC.levelDescLedgerSha256,
        structuralFailures,
        compatibilityNormalization: {
          section: 'Dynamic.swz.103.xml',
          repair: 'insert one missing attribute separator',
        },
        active: {
          movingPlatforms,
          animations,
          dynamicCollisions,
          dynamicRespawns,
          dynamicItemSpawns,
        },
      },
      blockers: [
        'branch-complete entity and companion carry semantics',
        'composite collision-bit identities and effects',
        'platform-instance asset closure',
        'trusted controlled runtime traces',
      ],
    },
    null,
    2,
  ),
)
