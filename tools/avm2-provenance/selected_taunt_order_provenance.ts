import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
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
  if (candidate.kind !== 7 || typeof candidate.data?.ns !== 'number' || typeof candidate.data.name !== 'number')
    return null
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
function displayParam(value: unknown, strings: string[]): unknown {
  const name = multinameName(value, strings)
  if (name) return name
  return value
}

const abcPath = argument('--abc')
assert(abcPath, 'usage: bun selected_taunt_order_provenance.ts --abc <main.abc> [--explore]')
const abcBytes = readFileSync(resolve(abcPath))
const abcSha256 = sha256(new Uint8Array(abcBytes))
assert(abcSha256 === EXPECTED_ABC_SHA256, `ABC SHA-256 mismatch: ${abcSha256}`)
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
  const key = qnameKey(
    requireAt(methodId, pc, methods.get(methodId)?.find((entry) => entry.pc === pc)?.name ?? '').params[0],
  )
  assert(key, `method ${methodId} PC ${pc} does not use an exact QName`)
  return key
}
function requireBranchTarget(methodId: number, pc: number, opcode: string, expectedTarget: number): void {
  const instruction = requireAt(methodId, pc, opcode)
  const offset = instruction.params[0]
  assert(typeof offset === 'number', `method ${methodId} PC ${pc} has no numeric branch offset`)
  assert(
    instruction.endPc + offset === expectedTarget,
    `method ${methodId} PC ${pc} does not target PC ${expectedTarget}`,
  )
}
function classQName(classIndex: number): string {
  const key = qnameKey(abc.constant_pool.multiname[abc.instance[classIndex].name - 1])
  assert(key, `class ${classIndex} does not use an exact QName`)
  return key
}
function methodQName(methodId: number): string {
  const matches = abc.instance.flatMap((instance: any, classIndex: number) =>
    [
      ...(instance.trait ?? []).map((trait: any) => ({ trait, classIndex, static: false })),
      ...(abc.class[classIndex].traits ?? []).map((trait: any) => ({ trait, classIndex, static: true })),
    ].filter(({ trait }) => trait.data?.method === methodId),
  )
  assert(matches.length === 1, `expected one trait for method ${methodId}`)
  const key = qnameKey(abc.constant_pool.multiname[matches[0].trait.name - 1])
  assert(key, `method ${methodId} does not have an exact QName`)
  return key
}
function methodParamTypeQName(methodId: number, parameterIndex: number): string {
  const typeIndex = abc.method[methodId]?.param_type[parameterIndex]
  assert(typeof typeIndex === 'number', `method ${methodId} lacks parameter ${parameterIndex + 1}`)
  const key = qnameKey(abc.constant_pool.multiname[typeIndex - 1])
  assert(key, `method ${methodId} parameter ${parameterIndex + 1} does not use an exact QName`)
  return key
}
function exactReferencesForQName(key: string): Array<{
  methodId: number
  owner: MethodOwner | null
  references: Array<{ pc: number; opcode: string }>
}> {
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
function namedReferences(name: string): Array<{
  methodId: number
  owner: MethodOwner | null
  references: Array<{ pc: number; opcode: string }>
}> {
  return [...methods.entries()]
    .map(([methodId, instructions]) => ({
      methodId,
      owner: owners.get(methodId) ?? null,
      references: instructions
        .filter((instruction) => multinameName(instruction.params[0], strings) === name)
        .map((instruction) => ({ pc: instruction.pc, opcode: instruction.name })),
    }))
    .filter((entry) => entry.references.length > 0)
}
function stringReferences(value: string): Array<{
  methodId: number
  owner: MethodOwner | null
  references: Array<{ pc: number; opcode: string }>
}> {
  return [...methods.entries()]
    .map(([methodId, instructions]) => ({
      methodId,
      owner: owners.get(methodId) ?? null,
      references: instructions
        .filter((instruction) => instruction.name === 'pushstring' && instruction.params[0] === value)
        .map((instruction) => ({ pc: instruction.pc, opcode: instruction.name })),
    }))
    .filter((entry) => entry.references.length > 0)
}

const firstFieldQName = exactQNameAt(6519, 543)
const secondFieldQName = exactQNameAt(6519, 577)
assert(firstFieldQName !== secondFieldQName, 'selected-taunt fields share one QName')
const firstFieldReferences = exactReferencesForQName(firstFieldQName)
const secondFieldReferences = exactReferencesForQName(secondFieldQName)
const readableReferences = {
  WinTauntID: namedReferences('WinTauntID'),
  LoseTauntID: namedReferences('LoseTauntID'),
}
const outcomeStrings = {
  TauntWin: stringReferences('TauntWin'),
  TauntSlowClap: stringReferences('TauntSlowClap'),
  Victory: stringReferences('Victory'),
  Defeat: stringReferences('Defeat'),
}
const ledgers = {
  firstField: sha256(JSON.stringify(firstFieldReferences)),
  secondField: sha256(JSON.stringify(secondFieldReferences)),
  readableNames: sha256(JSON.stringify(readableReferences)),
  outcomeStrings: sha256(JSON.stringify(outcomeStrings)),
}

requireAt(6519, 543, 'getproperty', '_-Pa')
requireAt(6519, 556, 'getproperty', '_-Pa')
requireAt(6519, 559, 'getproperty', '_-G5t')
requireAt(6519, 570, 'initproperty', '_-Pa')
requireAt(6519, 577, 'getproperty', '_-33m')
requireAt(6519, 591, 'getproperty', '_-33m')
requireAt(6519, 595, 'getproperty', '_-G5t')
requireAt(6519, 606, 'initproperty', '_-33m')
requireAt(6519, 1029, 'getproperty', '_-Pa')
requireAt(6519, 1032, 'callpropvoid', '_-B2n')
requireAt(6519, 1047, 'getproperty', '_-33m')
requireAt(6519, 1051, 'callpropvoid', '_-B2n')
assert(exactQNameAt(6519, 1032) === methodQName(605), 'writer does not call exact uint16 method 605')
requireAt(605, 15, 'callpropvoid', 'writeShort')
assert(exactQNameAt(6519, 543) === exactQNameAt(6519, 570), 'first source and roster fields differ')
assert(exactQNameAt(6519, 577) === exactQNameAt(6519, 606), 'second source and roster fields differ')
assert(exactQNameAt(6519, 570) === exactQNameAt(6519, 1029), 'first copied and serialized fields differ')
assert(exactQNameAt(6519, 606) === exactQNameAt(6519, 1047), 'second copied and serialized fields differ')

requireAt(6510, 883, 'findpropstrict', '_-kv')
requireAt(6510, 887, 'constructprop', '_-kv')
assert(requireAt(6510, 896, 'setlocal').params[0] === 23, 'reader does not store roster in local 23')
requireAt(6510, 1013, 'callproperty', '_-e1q')
requireAt(6510, 1018, 'initproperty', '_-Pa')
requireAt(6510, 1024, 'callproperty', '_-e1q')
requireAt(6510, 1029, 'initproperty', '_-33m')
assert(exactQNameAt(6510, 1013) === methodQName(614), 'reader does not call exact uint16 method 614')
requireAt(614, 19, 'pushbyte')
assert(requireAt(614, 19, 'pushbyte').params[0] === 2, 'reader does not request two bytes')
requireAt(614, 41, 'callproperty', 'readShort')
assert(exactQNameAt(6519, 1029) === exactQNameAt(6510, 1018), 'first writer and reader fields differ')
assert(exactQNameAt(6519, 1047) === exactQNameAt(6510, 1029), 'second writer and reader fields differ')

requireAt(6510, 1358, 'getproperty', '_-I1a')
assert(requireAt(6510, 1363, 'getlocal').params[0] === 23, 'reader does not publish restored roster local 23')
requireAt(6510, 1365, 'setproperty')
requireAt(3507, 304, 'getproperty', '_-I1a')
requireAt(3507, 309, 'getproperty')
requireAt(3507, 313, 'coerce', '_-kv')
assert(requireAt(3507, 321, 'setlocal').params[0] === 7, 'replay bridge does not store restored roster local 7')
requireAt(3507, 338, 'getlex', '_-V4R')
requireAt(3507, 341, 'getlocal_0')
requireAt(3507, 342, 'getlocal_1')
requireAt(3507, 343, 'getproperty', '_-652')
assert(requireAt(3507, 347, 'getlocal').params[0] === 6, 'replay bridge factory argument 2 changed')
requireAt(3507, 349, 'getproperty')
requireAt(3507, 353, 'coerce', 'String')
assert(requireAt(3507, 357, 'getlocal').params[0] === 6, 'replay bridge factory argument 3 changed')
requireAt(3507, 359, 'getlex', '_-V4R')
requireAt(3507, 362, 'getproperty', '_-6c')
requireAt(3507, 366, 'getlex', '_-V4R')
requireAt(3507, 369, 'getproperty', '_-76C')
requireAt(3507, 373, 'bitor')
assert(requireAt(3507, 374, 'getlocal').params[0] === 7, 'replay bridge does not pass restored roster local 7')
const factoryCall = requireAt(3507, 376, 'callproperty', '_-HT')
assert(factoryCall.params[1] === 5, 'replay bridge factory argument count changed')
requireAt(3071, 0, 'findpropstrict', '_-V4R')
requireAt(3071, 3, 'getlocal_1')
requireAt(3071, 4, 'getlocal_2')
requireAt(3071, 5, 'getlocal_3')
for (const [pc, local] of [
  [6, 4],
  [8, 5],
  [10, 6],
  [12, 7],
  [14, 8],
]) {
  assert(requireAt(3071, pc, 'getlocal').params[0] === local, `fighter factory does not forward local ${local}`)
}
const constructorCall = requireAt(3071, 16, 'constructprop', '_-V4R')
assert(constructorCall.params[1] === 8, 'fighter factory constructor argument count changed')
const rosterRecordQName = exactQNameAt(6510, 887)
const fighterClassOwner = owners.get(2790)
assert(fighterClassOwner, 'fighter constructor has no class owner')
assert(methodParamTypeQName(3507, 0) === classQName(356), 'replay bridge input is not exact parsed replay type')
assert(methodParamTypeQName(3071, 4) === rosterRecordQName, 'factory parameter 5 is not restored roster type')
assert(methodParamTypeQName(2790, 4) === rosterRecordQName, 'fighter parameter 5 is not restored roster type')
assert(
  exactQNameAt(3071, 16) === classQName(fighterClassOwner.classIndex),
  'factory constructprop is not exact fighter class',
)
assert(abc.instance[fighterClassOwner.classIndex].iinit === 2790, 'fighter class constructor is not method 2790')
assert(exactQNameAt(6510, 1358) === exactQNameAt(3507, 304), 'reader and replay bridge use different roster lists')
assert(exactQNameAt(3507, 376) === methodQName(3071), 'replay bridge does not call exact fighter factory')

assert(requireAt(2790, 2183, 'getlocal').params[0] === 5, 'fighter does not read roster parameter 5 first slot')
requireAt(2790, 2185, 'getproperty', '_-Pa')
assert(requireAt(2790, 2189, 'setlocal').params[0] === 26, 'fighter does not retain first slot as local 26')
assert(requireAt(2790, 2191, 'getlocal').params[0] === 5, 'fighter does not read roster parameter 5 second slot')
requireAt(2790, 2193, 'getproperty', '_-33m')
assert(requireAt(2790, 2198, 'setlocal').params[0] === 27, 'fighter does not retain second slot as local 27')
assert(requireAt(2790, 4877, 'getlocal').params[0] === 26, 'fighter does not forward first slot local 26')
assert(requireAt(2790, 4879, 'getlocal').params[0] === 27, 'fighter does not forward second slot local 27')
const copyCall = requireAt(2790, 4906, 'callpropvoid', '_-a5C')
assert(copyCall.params[1] === 4, 'fighter selected-taunt copy argument count changed')
assert(exactQNameAt(2790, 4906) === methodQName(2921), 'fighter calls a different selected-taunt copy method')
assert(exactQNameAt(2790, 2185) === firstFieldQName, 'fighter constructor first field changed')
assert(exactQNameAt(2790, 2193) === secondFieldQName, 'fighter constructor second field changed')

requireAt(2921, 87, 'findproperty', '_-Pa')
requireAt(2921, 90, 'getlocal_2')
requireAt(2921, 102, 'getproperty', '_-73e')
requireAt(2921, 121, 'initproperty', '_-Pa')
requireAt(2921, 124, 'findproperty', '_-33m')
requireAt(2921, 128, 'getlocal_3')
requireAt(2921, 140, 'getproperty', '_-73e')
requireAt(2921, 159, 'initproperty', '_-33m')
assert(exactQNameAt(2921, 121) === firstFieldQName, 'fighter first selected-taunt field changed')
assert(exactQNameAt(2921, 159) === secondFieldQName, 'fighter second selected-taunt field changed')

requireAt(2931, 79, 'getlocal_0')
requireAt(2931, 80, 'callpropvoid', '_-u3j')
assert(exactQNameAt(2931, 80) === methodQName(2564), 'fighter does not call the readable selected-taunt exporter')
requireAt(2564, 303, 'getproperty', '_-Pa')
requireAt(2564, 322, 'getproperty', '_-Pa')
requireAt(2564, 325, 'getproperty', '_-G5t')
requireAt(2564, 330, 'initproperty', 'WinTauntID')
requireAt(2564, 336, 'getproperty', '_-33m')
requireAt(2564, 356, 'getproperty', '_-33m')
requireAt(2564, 360, 'getproperty', '_-G5t')
requireAt(2564, 365, 'initproperty', 'LoseTauntID')
assert(exactQNameAt(2564, 303) === firstFieldQName, 'WinTauntID exporter reads a different first field')
assert(exactQNameAt(2564, 336) === secondFieldQName, 'LoseTauntID exporter reads a different second field')

requireAt(13297, 118, 'callproperty', '_-05X')
requireAt(13297, 126, 'setlocal_1')
requireAt(13297, 149, 'getlocal_1')
requireBranchTarget(13297, 150, 'iffalse', 171)
requireAt(13297, 160, 'getproperty', '_-Pa')
requireBranchTarget(13297, 167, 'jump', 185)
requireAt(13297, 177, 'getproperty', '_-33m')
requireAt(13297, 673, 'getlocal_1')
requireBranchTarget(13297, 674, 'iffalse', 692)
requireAt(13297, 678, 'pushstring', 'TauntWin')
requireBranchTarget(13297, 688, 'jump', 702)
requireAt(13297, 692, 'pushstring', 'TauntSlowClap')
assert(exactQNameAt(13297, 160) === firstFieldQName, 'true-outcome UI branch reads a different first field')
assert(exactQNameAt(13297, 177) === secondFieldQName, 'false-outcome UI branch reads a different second field')

requireAt(13283, 1982, 'callproperty', '_-05X')
assert(requireAt(13283, 1990, 'setlocal').params[0] === 23, 'outcome label method does not store predicate in local 23')
assert(requireAt(13283, 2077, 'getlocal').params[0] === 23, 'outcome label method does not branch on local 23')
requireBranchTarget(13283, 2079, 'iffalse', 2115)
requireAt(13283, 2091, 'pushstring', 'Victory')
requireBranchTarget(13283, 2111, 'jump', 2145)
requireAt(13283, 2123, 'pushstring', 'Defeat')
assert(
  exactQNameAt(13297, 118) === exactQNameAt(13283, 1982),
  'taunt and label UI paths use different outcome predicates',
)

const expectedLedgers = {
  firstField: '0c0a4aeea4c86b25c844d0dd0537ee92c21d70bb59205e99e75ae971974142c7',
  secondField: '464f7a3d9f0a6aba16389f8c7d902acadf8b340a8063416dd9d79ae6bd2dfa84',
  readableNames: '229768765a3ad9f7207a2910ed3cb68bdf34f1c201f48fba232057b1a2038dfe',
  outcomeStrings: '4431cded6c24d99a91ab7fabf3d02ca998b23b5cbe9ee88573d1a99af936db1b',
}
for (const [name, expected] of Object.entries(expectedLedgers)) {
  assert(ledgers[name as keyof typeof ledgers] === expected, `${name} reference ledger changed`)
}

const anchors = {
  writerCopy: [6519, 543, 556, 559, 570, 577, 591, 595, 606],
  writerWireOrder: [6519, 1029, 1032, 1047, 1051, 605, 15],
  readerWireOrder: [6510, 1013, 1018, 1024, 1029, 614, 19, 41],
  readerPublication: [6510, 1358, 1363, 1365],
  replayBridge: [3507, 304, 309, 313, 321, 338, 341, 342, 343, 347, 349, 353, 357, 359, 362, 366, 369, 373, 374, 376],
  fighterFactory: [3071, 0, 3, 4, 5, 6, 8, 10, 12, 14, 16],
  fighterConstructor: [2790, 2183, 2185, 2189, 2191, 2193, 2198, 4877, 4879, 4906],
  fighterSelectedTauntCopy: [2921, 87, 90, 102, 121, 124, 128, 140, 159],
  readableLabels: [2931, 79, 80, 2564, 303, 322, 325, 330, 336, 356, 360, 365],
  outcomeUi: [13297, 118, 126, 149, 150, 160, 167, 177, 673, 674, 678, 688, 692],
  outcomeLabels: [13283, 1982, 1990, 2077, 2079, 2091, 2111, 2123],
}
const output: Record<string, unknown> = {
  status: 'proven-for-pinned-abc',
  identity: { build: EXPECTED_BUILD, abcSha256, decodedMethodBodies: abc.method_body.length, branchTargetsValid: true },
  ordering: {
    firstUint16: { field: '_-Pa', semanticName: 'winTauntId' },
    secondUint16: { field: '_-33m', semanticName: 'loseTauntId' },
  },
  anchors,
  referenceClosure: {
    firstFieldMethodCount: firstFieldReferences.length,
    firstFieldInstructionCount: firstFieldReferences.reduce((count, entry) => count + entry.references.length, 0),
    secondFieldMethodCount: secondFieldReferences.length,
    secondFieldInstructionCount: secondFieldReferences.reduce((count, entry) => count + entry.references.length, 0),
    ledgers,
    firstFieldReferences,
    secondFieldReferences,
    readableReferences,
    outcomeStrings,
  },
  corpus: { used: false, reason: 'matching static writer-reader-label-and-outcome dataflow proves slot order' },
}
if (process.argv.includes('--explore')) {
  const relevantIds = [605, 614, 2564, 2790, 2921, 2931, 3071, 3507, 6510, 6519, 13283, 13297]
  output.methods = relevantIds.map((methodId) => ({
    methodId,
    owner: owners.get(methodId) ?? null,
    instructions: methods.get(methodId)?.map((instruction) => ({
      pc: instruction.pc,
      opcode: instruction.name,
      params: instruction.params.map((value) => displayParam(value, strings)),
    })),
  }))
}
console.log(JSON.stringify(output, null, 2))
