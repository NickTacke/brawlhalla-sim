import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_BUILD = '10.09.96325'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = {
  classIndex: number
  className: string
  traitName: string
  static: boolean
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

const EXPECTED_METHOD_HASHES: Record<number, string> = {
  3216: '69b7b539e9b731074c7f80e1949a48f039fbbe3db7b4b80fad3396fef736f0ed',
  5070: '8a3c6a6f41ca56c1c784e9493bb73110d9b6065bab49a62ef481a204ac1761d6',
  5139: '3d098bd7d369cc102abf7c5a5677fd11a1750797aeeb4a33067fa6a3feffdc28',
  5143: 'd8a545e588557d2d6e5a70a3a4cbc4d91c74cfc020bb5eaddf562f2975042b9a',
  5149: 'e52007a83fe9dfb20ba08aa13f5ab2b3ff2cc4c2b080b76da61afcf98f5e0cea',
  5456: 'c121470c2d7a789306197eb96ef53e018744a915f914b92b7525e7dab0239d8e',
  5462: 'b1f60957a0af4ad429f6d173349528be17768e7764bea25b4c68505ed4746b92',
  5471: 'c1f07e06bdcd958a5d18d72f79338a6e8866bd9a9e91300075d3430c54dd3427',
  5473: '2d8eb1069d375061aed0ef489bbd4ee6239f1307100e41c66f0f9e1e6f2c03e7',
  5474: '923b4a34fd9d6b62bddc4ba6f93985416b61e9fd9ba0e1533dd1172eb5941cea',
  5475: '098c52f2228a25fed4fce18340760cd4f7144901c85c7e8a3ab5bebf05f5f29f',
  6546: 'a454f13165fd3dcab7c8d4b5353334a6a24769818df302833cb12cf65eb7acdb',
  6559: '54a2681a566bd42d0eb1b8228a527a4ec7f9f320fae1f6b4c1e8da6da8981b27',
  6560: '06d60b6112a0f9bbc357582ef46a32c02eb9e76bec68bbfb79db2bc38cc7cee2',
  6561: '0e9225a04f78e8b88370ac38142eaad98b89d29f0819b63b8b09159bfd14763e',
  6563: '200e33b2f81f983977fd6f4d00c4822cea4fde0d3b3e3f74f8ba9fe731e7ed5c',
  6565: '51ba260ffb7025a746144bb979b14a9b6b4571ff3da189bb8fe66dbe62d6ae5f',
}

function argument(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  return index >= 0 ? process.argv[index + 1] : undefined
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function readU30(code: Buffer, cursor: { offset: number }): number {
  let value = 0
  for (let shift = 0; shift < 35; shift += 7) {
    const byte = code[cursor.offset++]
    value |= (byte & 0x7f) << shift
    if ((byte & 0x80) === 0) return value >>> 0
  }
  throw new Error('invalid U30')
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
  const nameAt = (index: number) => multinameName(abc.constant_pool.multiname[index - 1], strings)
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

const abcPath = argument('--abc')
assert(abcPath, 'usage: bun levelart_failure_propagation_provenance.ts --abc <main.abc>')
const abcBytes = readFileSync(resolve(abcPath))
const abcSha256 = sha256(new Uint8Array(abcBytes))
assert(abcSha256 === EXPECTED_ABC_SHA256, `ABC SHA-256 mismatch: ${abcSha256}`)
const abc: any = AbcFile.read(new ExtendedBuffer(abcBytes))
const strings = abc.constant_pool.string as string[]
const buildStrings = strings.filter((value) => /^\d+\.\d+\.\d+$/.test(value))
assert(buildStrings.length === 1 && buildStrings[0] === EXPECTED_BUILD, 'ABC build mismatch')

const disassembler = new InstructionDisassembler(abc)
const methods = new Map<number, LocatedInstruction[]>()
const methodBodies = new Map<number, any>()
const branchErrors: string[] = []
for (const body of abc.method_body) {
  const instructions = locateInstructions(body.code, disassembler.disassemble(body) as Instruction[])
  methods.set(body.method, instructions)
  methodBodies.set(body.method, body)
  branchErrors.push(...validateBranches(instructions, body.code.length).map((pc) => `method ${body.method} ${pc}`))
}
assert(branchErrors.length === 0, `invalid branch targets: ${branchErrors.join(', ')}`)
const owners = buildOwners(abc, strings)

function requireAt(methodId: number, pc: number, opcode: string, name?: string): LocatedInstruction {
  const instruction = methods.get(methodId)?.find((candidate) => candidate.pc === pc)
  assert(instruction, `method ${methodId} lacks PC ${pc}`)
  assert(instruction.name === opcode, `method ${methodId} PC ${pc} is not ${opcode}`)
  if (name !== undefined) {
    const actual =
      instruction.name === 'pushstring' ? instruction.params[0] : multinameName(instruction.params[0], strings)
    assert(actual === name, `method ${methodId} PC ${pc} does not name ${name}`)
  }
  return instruction
}

function exactQNameAt(methodId: number, pc: number): string {
  const instruction = requireAt(
    methodId,
    pc,
    methods.get(methodId)?.find((candidate) => candidate.pc === pc)?.name ?? '',
  )
  const key = qnameKey(instruction.params[0])
  assert(key, `method ${methodId} PC ${pc} does not use an exact QName`)
  return key
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

function exactReferencesForQName(key: string) {
  return [...methods.entries()]
    .map(([methodId, instructions]) => ({
      methodId,
      owner: owners.get(methodId) ?? null,
      references: instructions
        .filter((instruction) => qnameKey(instruction.params[0]) === key)
        .map((instruction) => ({ pc: instruction.pc, opcode: instruction.name })),
    }))
    .filter((entry) => entry.references.length > 0)
}

for (const [methodIdText, expectedHash] of Object.entries(EXPECTED_METHOD_HASHES)) {
  const methodId = Number(methodIdText)
  const body = methodBodies.get(methodId)
  assert(body, `method ${methodId} has no body`)
  assert(sha256(new Uint8Array(body.code)) === expectedHash, `method ${methodId} code hash changed`)
}

const pngPredicate = requireAt(5139, 41, 'ifne')
assert(pngPredicate.params[0] === 2, 'method 5139 .png branch changed')
requireAt(5139, 34, 'callproperty', 'indexOf')
requireAt(5139, 45, 'pushtrue')
requireAt(5139, 46, 'returnvalue')
requireAt(5139, 47, 'pushstring', 'mapArt')
requireAt(5139, 195, 'pushstring', 'LevelArt')
requireAt(5139, 208, 'pushstring', 'LevelArt')
requireAt(5139, 268, 'getproperty', '_-m3X')
requireAt(5139, 271, 'pushbyte')
requireAt(5139, 284, 'callproperty', '_-r1i')
requireAt(5139, 307, 'pushfalse')
requireAt(5139, 317, 'callpropvoid', 'push')

requireAt(5456, 5, 'pushbyte')
requireAt(5462, 94, 'pushstring', 'File: ')
requireAt(5462, 110, 'pushstring', ' missing.')
requireAt(5462, 141, 'callpropvoid', 'writeInt')
requireAt(5471, 20, 'pushbyte')
requireAt(5471, 26, 'pushstring', 'Failure loading resource ')
requireAt(5473, 5, 'pushbyte')
requireAt(5474, 410, 'getproperty', '_-D6m')
requireAt(5474, 415, 'initproperty', '_-D6m')
requireAt(5475, 40, 'pushbyte')
requireAt(5475, 154, 'getlex', 'IOErrorEvent')
requireAt(5475, 218, 'getlex', 'SecurityErrorEvent')
requireAt(5475, 451, 'callpropvoid', 'loadBytes')

requireAt(6559, 631, 'getlocal')
requireAt(6559, 634, 'lookupswitch')
requireAt(6559, 731, 'pushuint')
requireAt(6559, 738, 'pushuint')
requireAt(6559, 746, 'pushuint')
requireAt(6559, 755, 'multiply_i')
requireAt(6559, 793, 'callpropvoid', '_-C4T')
requireAt(6559, 799, 'callpropvoid', '_-f3U')
requireAt(6559, 892, 'pushuint')
requireAt(6559, 915, 'callpropvoid', '_-C4T')
requireAt(6559, 921, 'callpropvoid', '_-f3U')

requireAt(6561, 101, 'getproperty', '_-L5H')
requireAt(6561, 104, 'pushstring', 'PNG')
requireAt(6561, 125, 'returnvoid')
requireAt(6565, 4, 'callproperty', '_-k4R')
requireAt(6546, 9, 'callproperty', 'indexOf')

requireAt(5143, 373, 'callproperty', '_-P1G')
requireAt(5143, 392, 'callpropvoid', 'splice')
requireAt(5070, 51, 'callproperty', '_-34c')
requireAt(5070, 61, 'pushfalse')
requireAt(5070, 62, 'returnvalue')
requireAt(5070, 178, 'callpropvoid', '_-I5S')
requireAt(5070, 339, 'pushtrue')
requireAt(3216, 2117, 'callproperty', '_-f47')
requireAt(3216, 2124, 'iffalse')
requireAt(3216, 2132, 'pushtrue')
requireAt(5149, 138, 'coerce')
requireAt(5149, 305, 'callpropvoid', '_-74c')

const cleanupOption = abc.method[5474]?.options?.option?.[0]
assert(cleanupOption?.kind === 4, 'method 5474 cleanup default kind changed')
assert(abc.constant_pool.integer[cleanupOption.val] === 1, 'method 5474 cleanup default is not state 1')

const references = {
  resourceState: exactReferencesForQName(exactQNameAt(5456, 2)),
  restartCounter: exactReferencesForQName(exactQNameAt(5474, 402)),
  globalRetryStatistic: exactReferencesForQName(exactQNameAt(6559, 782)),
  managerInitialization: exactReferencesForQName(methodQName(5070)),
  levelReset: exactReferencesForQName(methodQName(5149)),
  resourceRequest: exactReferencesForQName(methodQName(6565)),
  loaderFailureHandler: exactReferencesForQName(methodQName(5471)),
}

const referenceDigests = Object.fromEntries(
  Object.entries(references).map(([name, entries]) => [name, sha256(JSON.stringify(entries))]),
)
const expectedReferenceDigests = {
  resourceState: 'b101a18ad0ecc6f13342f3e460128f505c2b7646fb82ea15b55c5c63290946b6',
  restartCounter: '2966e44f79078e39748670b9adb46134d9b701b9577556a24c22223f4ffe944f',
  globalRetryStatistic: '0b69cd34d382e56626d148402eb883d520da3765d92e7d5067f6298b06b9750f',
  managerInitialization: 'cf5c74533e56ebad2553ee4a136316f8551d0af4a8b05eb8f82b3b103eb91f12',
  levelReset: '1e296ebb2f3bccbc47c936bdad8ffe9f87db1bfeaa1adf6d5454c4a9b7d2c360',
  resourceRequest: '752b4d15c122b7226e53ff56ef06e7e8d476ee177d1526464153e3d396949479',
  loaderFailureHandler: '2beb04d908f81cce6decdbee89a3631ec14a9c12b36c1f603c079f28eb3f083c',
}
for (const [name, expectedDigest] of Object.entries(expectedReferenceDigests)) {
  assert(referenceDigests[name] === expectedDigest, `${name} reference ledger changed`)
}

assert(references.restartCounter.length === 2, 'restart-counter method count changed')
assert(
  references.restartCounter.reduce((count, entry) => count + entry.references.length, 0) === 5,
  'restart-counter instruction count changed',
)
assert(
  references.globalRetryStatistic.every((entry) =>
    entry.references.every((reference) => reference.opcode === 'getproperty' || reference.opcode === 'initproperty'),
  ),
  'global retry statistic gained a non-storage use',
)

const output = {
  status: 'partial-static-proof',
  identity: {
    build: EXPECTED_BUILD,
    abcSha256,
    decodedMethodBodies: abc.method_body.length,
    branchTargetsValid: true,
  },
  verdict: {
    errorRetryMs: 5000,
    timeoutWithoutProgressMs: '10000 + 5000 * priorRestarts',
    timeoutAfterAnyProgressMs: '30000 + 5000 * priorRestarts',
    retryLimit: null,
    resourceTerminalFailureState: null,
    primaryMatchPath: 'method 3216 PC 2117 -> method 5070 false -> initialization-complete write skipped',
    nativeBoundary:
      'The official AIR Loader API defines loadBytes as asynchronous and malformed non-empty data as an ioError event; runtime-version conformance is external to this static analyzer',
  },
  methodIdentities: Object.keys(EXPECTED_METHOD_HASHES).map((methodIdText) => {
    const methodId = Number(methodIdText)
    const body = methodBodies.get(methodId)
    return {
      methodId,
      owner: owners.get(methodId) ?? null,
      codeBytes: body.code.length,
      instructionCount: methods.get(methodId)?.length,
      codeSha256: EXPECTED_METHOD_HASHES[methodId],
    }
  }),
  referenceClosure: Object.fromEntries(
    Object.entries(references).map(([name, entries]) => [
      name,
      {
        sha256: referenceDigests[name],
        methods: entries.length,
        instructions: entries.reduce((count, entry) => count + entry.references.length, 0),
        entries,
      },
    ]),
  ),
}

console.log(JSON.stringify(output, null, 2))
