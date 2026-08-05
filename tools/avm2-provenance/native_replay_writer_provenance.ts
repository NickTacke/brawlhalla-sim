import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = {
  id: number
  name: string
  params: unknown[]
  rawParams: unknown[]
  types: string[]
}
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_MANIFEST_SHA256 = 'b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac'
const EXPECTED_REPLAY_SCANNER_SHA256 = '8f8ce520c14f9ebc3badb03db6aed3becdb39cb624e4968f17f354282bffa949'
const EXPECTED_WRITER_SCANNER_SHA256 = '317e23156888b2123d87bdd703106b81ba45f1bcdf092692c314a7f43cfc1e7b'
const EXPECTED_DECODER_COMMIT = 'ad9714d'
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
const PUBLIC_MOVE_DELETE_NAMES = new Set([
  'deleteFile',
  'deleteFileAsync',
  'moveTo',
  'moveToAsync',
  'moveToTrash',
  'moveToTrashAsync',
])
const EXPECTED_WRITER_SEQUENCE_LEDGER_SHA256 = '5840c978905599ba3e311a5cd99b57ad43b37e0e571955ca0fcab7b600da871e'
const EXPECTED_PUBLIC_CANDIDATE_LEDGER_SHA256 = 'f813915cedf3d5a0728580641a34ce7b1b80eb2e6640dbb6b88c3f958cf6373b'
const EXPECTED_FILE_DELETE_LEDGER_SHA256 = 'cb597048c27d1a4c33d84c82e8a1d0d65132a9dd850db6e1e6fcda2532ba0757'

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
function multinameName(value: unknown, strings: string[], namespaces: any[]): string {
  if (!value || typeof value !== 'object' || !('data' in value)) return ''
  const candidate = value as { data?: { name?: unknown; ns?: unknown } }
  const rawName = candidate.data?.name
  const name = typeof rawName === 'number' ? (strings[rawName - 1] ?? '') : typeof rawName === 'string' ? rawName : ''
  const rawNamespace = candidate.data?.ns
  if (typeof rawNamespace !== 'number') return name
  const namespace = namespaces[rawNamespace - 1]
  const namespaceName = typeof namespace?.name === 'number' ? (strings[namespace.name - 1] ?? '') : ''
  return namespaceName ? `${namespaceName}::${name}` : name
}
function buildOwners(abc: any, strings: string[], namespaces: any[]): Map<number, MethodOwner> {
  const owners = new Map<number, MethodOwner>()
  const nameAt = (index: number): string => multinameName(abc.constant_pool.multiname[index - 1], strings, namespaces)
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
function ledgerHash(value: unknown): string {
  return sha256(JSON.stringify(value))
}

const abcPath = argument('--abc')
const manifestPath = argument('--manifest')
const replayScannerPath = argument('--replay-scanner')
const writerScannerPath = argument('--writer-scanner')
assert(
  abcPath && manifestPath && replayScannerPath && writerScannerPath,
  'usage: bun native_replay_writer_provenance.ts --abc <main.abc> --manifest <manifest.json> --replay-scanner <find_replay.ts> --writer-scanner <find_replay_write.ts>',
)
const abcBytes = readFileSync(resolve(abcPath))
const manifestBytes = readFileSync(resolve(manifestPath))
const replayScannerBytes = readFileSync(resolve(replayScannerPath))
const writerScannerBytes = readFileSync(resolve(writerScannerPath))
const abcSha256 = sha256(new Uint8Array(abcBytes))
const manifestSha256 = sha256(new Uint8Array(manifestBytes))
const replayScannerSha256 = sha256(new Uint8Array(replayScannerBytes))
const writerScannerSha256 = sha256(new Uint8Array(writerScannerBytes))
assert(abcSha256 === EXPECTED_ABC_SHA256, `ABC SHA-256 mismatch: ${abcSha256}`)
assert(manifestSha256 === EXPECTED_MANIFEST_SHA256, `manifest SHA-256 mismatch: ${manifestSha256}`)
assert(
  replayScannerSha256 === EXPECTED_REPLAY_SCANNER_SHA256,
  `replay scanner SHA-256 mismatch: ${replayScannerSha256}`,
)
assert(
  writerScannerSha256 === EXPECTED_WRITER_SCANNER_SHA256,
  `writer scanner SHA-256 mismatch: ${writerScannerSha256}`,
)
const manifest = JSON.parse(manifestBytes.toString())
assert(
  manifest.target?.build === EXPECTED_BUILD &&
    manifest.target?.replayFormat === 268 &&
    manifest.coverage?.fixtureCount === 12,
  'manifest target or fixture count changed',
)
const lockfile = readFileSync(resolve(import.meta.dir, '../../bun.lock'), 'utf8')
assert(lockfile.includes(EXPECTED_DECODER_COMMIT), 'abc-disassembler lockfile commit changed')
const abc: any = AbcFile.read(new ExtendedBuffer(abcBytes))
const strings = abc.constant_pool.string as string[]
const namespaces = abc.constant_pool.namespace as any[]
const nameOf = (value: unknown): string => multinameName(value, strings, namespaces)
const nameAt = (index: number): string => nameOf(abc.constant_pool.multiname[index - 1])
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
const owners = buildOwners(abc, strings, namespaces)

function requireAt(methodId: number, pc: number, opcode: string, expectedName?: string, argumentCount?: number) {
  const instruction = methods.get(methodId)?.find((candidate) => candidate.pc === pc)
  assert(instruction, `method ${methodId} lacks PC ${pc}`)
  assert(instruction.name === opcode, `method ${methodId} PC ${pc} is not ${opcode}`)
  if (expectedName !== undefined) {
    const actual = instruction.name === 'pushstring' ? instruction.params[0] : nameOf(instruction.params[0])
    assert(actual === expectedName, `method ${methodId} PC ${pc} names ${String(actual)}, not ${expectedName}`)
  }
  if (argumentCount !== undefined) {
    assert(instruction.rawParams.at(-1) === argumentCount, `method ${methodId} PC ${pc} has wrong argument count`)
  }
  return instruction
}
function methodInfo(methodId: number) {
  const body = methodBodies.get(methodId)
  const instructions = methods.get(methodId)
  assert(body && instructions, `missing method ${methodId}`)
  return { body, instructions }
}
function methodHasName(methodId: number, name: string): boolean {
  return methodInfo(methodId).instructions.some((instruction) =>
    instruction.params.some((param) => nameOf(param) === name),
  )
}
function assertStackReceiver(methodId: number, producerIndex: number, callPc: number): void {
  const instructions = methodInfo(methodId).instructions
  const call = instructions.find((instruction) => instruction.pc === callPc)
  assert(call?.name === 'callpropvoid', `method ${methodId} PC ${callPc} is not callpropvoid`)
  const stack = ['target-receiver']
  const binaryOperations = new Set(['add', 'add_i', 'divide', 'multiply', 'subtract', 'subtract_i'])
  for (let index = producerIndex + 1; index < instructions.length; index++) {
    const instruction = instructions[index]
    if (instruction.pc === callPc) {
      const argumentCount = instruction.rawParams.at(-1)
      assert(typeof argumentCount === 'number', `method ${methodId} PC ${callPc} lacks argument count`)
      assert(stack.length === argumentCount + 1, `method ${methodId} PC ${callPc} stack shape changed`)
      assert(stack[0] === 'target-receiver', `method ${methodId} PC ${callPc} receiver provenance changed`)
      return
    }
    if (
      instruction.name.startsWith('getlocal') ||
      instruction.name === 'getlex' ||
      instruction.name === 'findproperty' ||
      instruction.name.startsWith('push')
    ) {
      stack.push('value')
      continue
    }
    if (instruction.name === 'getproperty') {
      const consumedValues = nameOf(instruction.params[0]) ? 1 : 2
      assert(stack.length >= consumedValues, `method ${methodId} stack underflow at instruction ${index}`)
      stack.splice(stack.length - consumedValues, consumedValues, 'value')
      continue
    }
    if (instruction.name === 'callproperty') {
      const argumentCount = instruction.rawParams.at(-1)
      assert(typeof argumentCount === 'number', `method ${methodId} callproperty lacks argument count`)
      assert(stack.length >= argumentCount + 1, `method ${methodId} stack underflow at instruction ${index}`)
      stack.splice(stack.length - argumentCount - 1, argumentCount + 1, 'value')
      continue
    }
    if (instruction.name.startsWith('convert_')) continue
    if (binaryOperations.has(instruction.name)) {
      assert(stack.length >= 2, `method ${methodId} stack underflow at instruction ${index}`)
      stack.splice(stack.length - 2, 2, 'value')
      continue
    }
    throw new Error(
      `unsupported receiver-trace opcode ${instruction.name} in method ${methodId} at PC ${instruction.pc}`,
    )
  }
  throw new Error(`method ${methodId} lacks receiver call PC ${callPc}`)
}

const writer = methodInfo(6524)
assert(writer.body.code.length === 1162, 'method 6524 code length changed')
assert(writer.instructions.length === 524, 'method 6524 instruction count changed')
assert(writer.body.exception.length === 1, 'method 6524 exception count changed')
const writerException = writer.body.exception[0]
assert(
  writerException.from === 943 &&
    writerException.to === 1141 &&
    writerException.target === 1145 &&
    nameAt(writerException.exc_type) === 'Error',
  'method 6524 filesystem Error handler changed',
)

requireAt(6524, 893, 'getproperty', '_-om')
requireAt(6524, 897, 'callpropvoid', '_-m57', 1)
requireAt(6524, 927, 'getproperty', '_-om')
requireAt(6524, 931, 'callpropvoid', 'compress', 0)
requireAt(6524, 943, 'getlex', '_-X2i')
requireAt(6524, 946, 'callproperty', '_-ag', 0)
requireAt(6524, 950, 'coerce', 'flash.filesystem::File')
requireAt(6524, 962, 'callpropvoid', 'createDirectory', 0)
requireAt(6524, 1022, 'initproperty', 'nativePath')
requireAt(6524, 1076, 'initproperty', 'nativePath')
requireAt(6524, 1081, 'getproperty', 'exists')
requireAt(6524, 1096, 'getlex', 'flash.filesystem::FileMode')
requireAt(6524, 1099, 'getproperty', 'WRITE')
requireAt(6524, 1103, 'callpropvoid', 'open', 2)
requireAt(6524, 1121, 'getproperty', '_-om')
requireAt(6524, 1125, 'callpropvoid', 'writeBytes', 1)
requireAt(6524, 1136, 'callpropvoid', 'close', 0)
requireAt(6524, 1149, 'coerce', 'Error')
requireAt(6524, 1158, 'initproperty', '_-w1J')
assert(
  !writer.instructions.some((instruction) =>
    instruction.params.some((param) => PUBLIC_MOVE_DELETE_NAMES.has(nameOf(param))),
  ),
  'method 6524 gained a move or delete candidate',
)

assert(nameAt(abc.method[997].return_type) === 'flash.filesystem::File', 'method 997 return type changed')
requireAt(997, 0, 'getlex', 'flash.filesystem::File')
requireAt(997, 4, 'getproperty', 'userDirectory')
requireAt(997, 13, 'pushstring', 'BrawlhallaReplays')
requireAt(997, 17, 'callproperty', 'resolvePath', 1)

const writerClassIndex = owners.get(6524)?.classIndex
assert(typeof writerClassIndex === 'number', 'method 6524 owner missing')
const streamFields = (abc.instance[writerClassIndex].trait as any[]).filter(
  (trait) => nameAt(trait.name) === '_-m5V' && nameAt(trait.data?.type_name) === 'flash.filesystem::FileStream',
)
assert(streamFields.length === 1, 'writer FileStream field changed')
requireAt(6516, 40, 'findpropstrict', 'flash.filesystem::FileStream')
requireAt(6516, 43, 'constructprop', 'flash.filesystem::FileStream', 0)

const falseDeleteCandidates = [2559, 2602, 2603]
const scannerCorrectionCalls = falseDeleteCandidates.flatMap((methodId) =>
  methodInfo(methodId).instructions.flatMap((instruction) =>
    instruction.name === 'callpropvoid' && nameOf(instruction.params[0]) === '_-K2d'
      ? [{ methodId, pc: instruction.pc, argumentCount: instruction.rawParams.at(-1) }]
      : [],
  ),
)
const expectedScannerCorrectionCalls = [
  { methodId: 2559, pc: 253, argumentCount: 1 },
  { methodId: 2602, pc: 67, argumentCount: 1 },
  { methodId: 2602, pc: 146, argumentCount: 1 },
  { methodId: 2603, pc: 464, argumentCount: 1 },
]
assert(
  JSON.stringify(scannerCorrectionCalls) === JSON.stringify(expectedScannerCorrectionCalls),
  'scanner correction ledger changed',
)
for (const methodId of falseDeleteCandidates) {
  assert(!methodHasName(methodId, 'deleteFile'), `method ${methodId} unexpectedly contains deleteFile`)
  assert(methodHasName(methodId, '_-K2d'), `method ${methodId} lost telemetry helper _-K2d`)
}
assert(owners.get(2607)?.traitName === '_-K2d', 'method 2607 no longer defines telemetry helper _-K2d')
for (const forbiddenName of ['flash.filesystem::File', 'flash.filesystem::FileStream', ...PUBLIC_MOVE_DELETE_NAMES]) {
  assert(!methodHasName(2607, forbiddenName), `telemetry helper method 2607 gained ${forbiddenName}`)
}

const publicNameCandidates = [...methods.entries()]
  .flatMap(([methodId, instructions]) =>
    instructions.flatMap((instruction) => {
      const name = nameOf(instruction.params[0])
      if (instruction.name !== 'callpropvoid' || !PUBLIC_MOVE_DELETE_NAMES.has(name)) return []
      return [
        { methodId, pc: instruction.pc, opcode: instruction.name, name, argumentCount: instruction.rawParams.at(-1) },
      ]
    }),
  )
  .sort((left, right) => left.methodId - right.methodId || left.pc - right.pc)
const expectedPublicNameCandidates = [
  { methodId: 1812, pc: 104, opcode: 'callpropvoid', name: 'moveTo', argumentCount: 2 },
  { methodId: 1813, pc: 136, opcode: 'callpropvoid', name: 'moveTo', argumentCount: 2 },
  { methodId: 3286, pc: 143, opcode: 'callpropvoid', name: 'deleteFile', argumentCount: 0 },
  { methodId: 5758, pc: 514, opcode: 'callpropvoid', name: 'moveTo', argumentCount: 2 },
  { methodId: 5941, pc: 153, opcode: 'callpropvoid', name: 'deleteFile', argumentCount: 0 },
  { methodId: 10216, pc: 28, opcode: 'callpropvoid', name: 'moveTo', argumentCount: 2 },
  { methodId: 11317, pc: 222, opcode: 'callpropvoid', name: 'moveTo', argumentCount: 2 },
  { methodId: 12434, pc: 12, opcode: 'callpropvoid', name: 'deleteFile', argumentCount: 0 },
  { methodId: 13553, pc: 567, opcode: 'callpropvoid', name: 'moveTo', argumentCount: 2 },
]
assert(
  JSON.stringify(publicNameCandidates) === JSON.stringify(expectedPublicNameCandidates),
  'complete public move/delete candidate ledger changed',
)
assert(
  ledgerHash(publicNameCandidates) === EXPECTED_PUBLIC_CANDIDATE_LEDGER_SHA256,
  'public candidate ledger hash changed',
)

for (const { methodId, producerIndex, callPc } of [
  { methodId: 1812, producerIndex: 47, callPc: 104 },
  { methodId: 1813, producerIndex: 47, callPc: 136 },
  { methodId: 10216, producerIndex: 9, callPc: 28 },
]) {
  const producer = methodInfo(methodId).instructions[producerIndex]
  assert(
    nameAt(abc.method[methodId].param_type[0]) === 'flash.display::Graphics',
    `method ${methodId} parameter changed`,
  )
  assert(producer.name === 'getlocal_1', `method ${methodId} Graphics receiver producer changed`)
  assertStackReceiver(methodId, producerIndex, callPc)
}
for (const { methodId, fieldName, fieldLoadIndex, producerIndex, callPc } of [
  { methodId: 5758, fieldName: '_-v23', fieldLoadIndex: 176, producerIndex: 177, callPc: 514 },
  { methodId: 11317, fieldName: '_-M2H', fieldLoadIndex: 90, producerIndex: 91, callPc: 222 },
]) {
  const owner = owners.get(methodId)
  assert(owner, `method ${methodId} owner missing`)
  const movieClipFields = (abc.instance[owner.classIndex].trait as any[]).filter(
    (trait) => nameAt(trait.name) === fieldName && nameAt(trait.data?.type_name) === 'flash.display::MovieClip',
  )
  assert(movieClipFields.length === 1, `method ${methodId} display field type changed`)
  const instructions = methodInfo(methodId).instructions
  assert(
    instructions[fieldLoadIndex].name === 'getproperty' && nameOf(instructions[fieldLoadIndex].params[0]) === fieldName,
    `method ${methodId} display field load changed`,
  )
  const producer = instructions[producerIndex]
  assert(
    producer.name === 'getproperty' && nameOf(producer.params[0]) === 'graphics',
    `method ${methodId} Graphics receiver producer changed`,
  )
  assertStackReceiver(methodId, producerIndex, callPc)
}
const method13553 = methodInfo(13553).instructions
assert(nameAt(abc.method[13553].param_type[0]) === 'flash.display::MovieClip', 'method 13553 parameter changed')
assert(method13553[246].name === 'getlocal_1', 'method 13553 display receiver load changed')
assert(
  method13553[247].name === 'getproperty' && nameOf(method13553[247].params[0]) === 'graphics',
  'method 13553 Graphics receiver producer changed',
)
assertStackReceiver(13553, 247, 567)
const graphicsMoveCalls = publicNameCandidates.filter((call) => call.name === 'moveTo')

const method3286 = methodInfo(3286).instructions
assert(nameOf(method3286[13].params[0]) === 'flash.filesystem::File', 'method 3286 local File type changed')
assert(
  nameOf(method3286[44].params[0]) === 'flash.filesystem::File' &&
    nameOf(method3286[45].params[0]) === 'flash.filesystem::File' &&
    method3286[46].name === 'setlocal' &&
    method3286[46].rawParams[0] === 4,
  'method 3286 local File assignment changed',
)
assert(method3286[59].name === 'getlocal' && method3286[59].rawParams[0] === 4, 'method 3286 delete receiver changed')
assertStackReceiver(3286, 59, 143)
const method5941Owner = owners.get(5941)
assert(method5941Owner, 'method 5941 owner missing')
const method5941FileFields = (abc.instance[method5941Owner.classIndex].trait as any[]).filter(
  (trait) => nameAt(trait.name) === '_-S4z' && nameAt(trait.data?.type_name) === 'flash.filesystem::File',
)
assert(method5941FileFields.length === 1, 'method 5941 delete receiver type changed')
const method5941Producer = methodInfo(5941).instructions[64]
assert(
  method5941Producer.name === 'getproperty' && nameOf(method5941Producer.params[0]) === '_-S4z',
  'method 5941 delete receiver changed',
)
assertStackReceiver(5941, 64, 153)
assert(nameAt(abc.method[12434].param_type[0]) === 'flash.filesystem::File', 'method 12434 parameter changed')
assert(methodInfo(12434).instructions[9].name === 'getlocal_1', 'method 12434 delete receiver changed')
assertStackReceiver(12434, 9, 12)
const fileDeleteCalls = publicNameCandidates.filter((call) => call.name === 'deleteFile')
assert(fileDeleteCalls.length === 3, 'File delete call count changed')
assert(ledgerHash(fileDeleteCalls) === EXPECTED_FILE_DELETE_LEDGER_SHA256, 'File delete ledger hash changed')

const deleteHelper = methodInfo(12434)
assert(deleteHelper.body.code.length === 30 && deleteHelper.body.exception.length === 1, 'delete helper changed')
assert(
  deleteHelper.body.exception[0].from === 11 &&
    deleteHelper.body.exception[0].to === 17 &&
    deleteHelper.body.exception[0].target === 21 &&
    nameAt(deleteHelper.body.exception[0].exc_type) === 'Error',
  'delete helper Error handler changed',
)
requireAt(12434, 12, 'callpropvoid', 'deleteFile', 0)

const replayLoader = methodInfo(12473)
assert(replayLoader.body.code.length === 313 && replayLoader.body.exception.length === 1, 'replay loader changed')
assert(
  replayLoader.body.exception[0].from === 86 &&
    replayLoader.body.exception[0].to === 175 &&
    replayLoader.body.exception[0].target === 179 &&
    nameAt(replayLoader.body.exception[0].exc_type) === 'Error',
  'replay loader Error handler changed',
)
requireAt(12473, 98, 'callpropvoid', 'open', 2)
requireAt(12473, 105, 'callpropvoid', 'readBytes', 1)
requireAt(12473, 171, 'callpropvoid', '_-N4v', 3)
requireAt(12473, 189, 'callpropvoid', 'close', 0)
for (const pc of [201, 238, 293]) requireAt(12473, pc, 'callpropvoid', '_-51X', 1)
requireAt(12473, 215, 'callpropvoid', 'close', 0)

const writerSequenceLedger = ledgerHash(
  writer.instructions
    .filter((instruction) => instruction.pc >= 943)
    .map((instruction) => [instruction.pc, instruction.name, instruction.rawParams]),
)
assert(writerSequenceLedger === EXPECTED_WRITER_SEQUENCE_LEDGER_SHA256, 'writer sequence ledger hash changed')

const output = {
  status: 'proven-for-pinned-abc',
  identity: {
    build: EXPECTED_BUILD,
    abcSha256,
    manifestSha256,
    replayScannerSha256,
    writerScannerSha256,
    decoderCommit: EXPECTED_DECODER_COMMIT,
    decodedMethodBodies: methods.size,
    branchTargets: 'valid',
  },
  writer: {
    methodId: 6524,
    owner: owners.get(6524),
    codeBytes: writer.body.code.length,
    instructionCount: writer.instructions.length,
    directory: {
      methodId: 997,
      base: 'File.userDirectory',
      child: 'BrawlhallaReplays',
    },
    bufferFinalization: [
      { pc: 897, operation: 'application XOR transform' },
      { pc: 931, operation: 'ByteArray.compress()' },
    ],
    filesystemSequence: [
      { pc: 962, operation: 'File.createDirectory()' },
      { pc: 1022, operation: 'set final nativePath with .replay suffix' },
      { pc: 1076, operation: 'set collision-suffixed nativePath' },
      { pc: 1081, operation: 'File.exists collision loop' },
      { pc: 1103, operation: 'FileStream.open(file, FileMode.WRITE)' },
      { pc: 1125, operation: 'FileStream.writeBytes(full ByteArray)' },
      { pc: 1136, operation: 'FileStream.close()' },
    ],
    exception: {
      fromPc: writerException.from,
      toPcExclusive: writerException.to,
      targetPc: writerException.target,
      type: nameAt(writerException.exc_type),
      postHandlerAssignmentPc: 1158,
      cleanupInHandler: false,
    },
    moveOrDeleteCalls: [],
  },
  candidateCorrection: {
    priorScannerMethods: falseDeleteCandidates,
    actualName: '_-K2d',
    actualDefinitionMethod: 2607,
    calls: scannerCorrectionCalls,
    cause: 'scanner displayed strings[nameIndex] instead of strings[nameIndex - 1]',
  },
  publicNameCandidateLedger: {
    graphicsMoveCalls,
    fileDeleteCalls,
    fileMoveCalls: [],
  },
  replayLoaderDisposition: {
    loaderMethodId: 12473,
    deleteHelperMethodId: 12434,
    deleteHelperCallPcs: [201, 238, 293],
    deleteOperationPc: 12,
    relationship: 'later replay read/validation cleanup, not writer failure cleanup',
  },
  ledgers: {
    writerSequence: writerSequenceLedger,
    publicMoveDeleteCandidates: ledgerHash(publicNameCandidates),
    fileDeleteCalls: ledgerHash(fileDeleteCalls),
  },
}

console.log(JSON.stringify(output, null, 2))
