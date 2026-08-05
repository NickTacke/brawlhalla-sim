import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }
type Trait = { name: number; data?: { method?: number; type_name?: number; vindex?: number } }

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_DEALT_LEDGER_SHA256 = 'a5e1088659cfc5580b5b0b648cdb11fd65d6f1f4188f30246eff961d680c2959'
const EXPECTED_TAKEN_LEDGER_SHA256 = '648b020050f42ec8eec5275e078e81c12fc213ce09486aed09be7a99d6631ffa'
const EXPECTED_HELPER_CALLSITE_LEDGER_SHA256 = '0da95779d1edb06b43dff5552a6920f16a0d58039d31f636c601a7a89f0de53b'
const EXPECTED_VARIATION_LEDGER_SHA256 = 'd5a718b2bc07ab4fb8cfc85b3c937ab99f0e3bd10da6f47ee08775ef8f325930'
const EXPECTED_RECORDER_LEDGER_SHA256 = 'a1c3a678f2b7f2b85fb7dddfed766e6c75bf3e8bb3e5a981280fc76cca29c9e5'
const EXPECTED_MODE_START_CALLSITE_SHA256 = 'f28d997bc687d2750b5788121c044c9733011d55a0d90f1b07e4ac0ddb3b6840'
const EXPECTED_MODE_SELECTION_CALLSITE_SHA256 = 'a27dacb556e8f320d596d16771c2ab936e9f8f89d023a1bc785dc95d87fd638f'
const EXPECTED_MUTATION_CALLSITE_SHA256 = '7e6d4c5e26a4aead5fe121006c0a924d30d26ee2468b15ddb58da4641231fb77'
const EXPECTED_RECORDER_FACTORY_CALLSITE_SHA256 = '1cfa3d906b2a2b5ce08c56d4fda2ad11b1ff531112c5b01d9cf26bd8439dd8a6'
const EXPECTED_SETTINGS_WRITER_CALLSITE_SHA256 = '765cbfeba8351a54d91abd217c1494c5a5e5c4a7dd7ae062a8f5a4f73e969d55'
const EXPECTED_REPLAY_WRITER_CALLSITE_SHA256 = 'ab76ff66a2dfbb2dd2649a110199eb30e8e3a364a0c2134aece1d3e6c00673bf'
const EXPECTED_MODE_START_BODY_SHA256 = '55261d25597a4447e8db3cbe62a8c82715fce31b139bfb55955e31e395a7670a'
const EXPECTED_MODE_SELECTION_BODY_SHA256 = 'd9b958b4108bdc8c87fd926b13f342eed0ba1ca910ec0d9459264eddd26e1d56'
const EXPECTED_MUTATION_BODY_SHA256 = 'c4d5b6413511db425fbaa00088b754f2b86d3bd609bd293eb1abe07a380f82e5'
const EXPECTED_MATCH_SETUP_BODY_SHA256 = '35ea81c76e8110f2b946dde420044fb4befc8cffb532308e98bf56a3b6157e3b'
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
    owners.set(abc.instance[classIndex].iinit, { classIndex, className, traitName: '<iinit>', static: false })
    owners.set(abc.class[classIndex].cinit, { classIndex, className, traitName: '<cinit>', static: true })
    for (const group of [
      { traits: abc.instance[classIndex].trait ?? [], static: false },
      { traits: abc.class[classIndex].traits ?? [], static: true },
    ]) {
      for (const trait of group.traits as Trait[]) {
        if (trait.data?.method === undefined) continue
        owners.set(trait.data.method, { classIndex, className, traitName: nameAt(trait.name), static: group.static })
      }
    }
  }
  return owners
}

const abcPath = argument('--abc')
assert(abcPath, 'usage: bun handicap_mutation_policy_provenance.ts --abc <main.abc> [--explore]')
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

function instructionName(instruction: LocatedInstruction): string {
  return multinameName(instruction.params[0], strings)
}

function requireAt(methodId: number, pc: number, opcode: string, expected?: string | number): LocatedInstruction {
  const instruction = methods.get(methodId)?.find((candidate) => candidate.pc === pc)
  assert(instruction, `method ${methodId} lacks PC ${pc}`)
  assert(instruction.name === opcode, `method ${methodId} PC ${pc} is not ${opcode}`)
  if (typeof expected === 'string') {
    assert(instructionName(instruction) === expected, `method ${methodId} PC ${pc} does not name ${expected}`)
  } else if (typeof expected === 'number') {
    assert(instruction.params[0] === expected, `method ${methodId} PC ${pc} does not contain ${expected}`)
  }
  return instruction
}

function exactQNameAt(methodId: number, pc: number): string {
  const key = qnameKey(
    requireAt(methodId, pc, methods.get(methodId)?.find((candidate) => candidate.pc === pc)?.name ?? '').params[0],
  )
  assert(key, `method ${methodId} PC ${pc} does not use an exact QName`)
  return key
}

function methodParameterQName(methodId: number, parameterIndex: number): string {
  const typeIndex = abc.method[methodId]?.param_type[parameterIndex]
  assert(typeof typeIndex === 'number', `method ${methodId} lacks parameter ${parameterIndex + 1}`)
  const key = qnameKey(abc.constant_pool.multiname[typeIndex - 1])
  assert(key, `method ${methodId} parameter ${parameterIndex + 1} does not use an exact QName`)
  return key
}

function classIndexNamed(className: string): number {
  const matches = abc.instance
    .map((instance: any, classIndex: number) => ({ instance, classIndex }))
    .filter(({ instance }: any) => multinameName(abc.constant_pool.multiname[instance.name - 1], strings) === className)
  assert(matches.length === 1, `expected one class ${className}`)
  return matches[0].classIndex
}

function traitNamed(traits: Trait[], name: string): Trait {
  const matches = traits.filter((trait) => multinameName(abc.constant_pool.multiname[trait.name - 1], strings) === name)
  assert(matches.length === 1, `expected one trait ${name}`)
  return matches[0]
}

function traitQName(trait: Trait): string {
  const key = qnameKey(abc.constant_pool.multiname[trait.name - 1])
  assert(key, 'trait is not an exact QName')
  return key
}

function traitTypeName(trait: Trait): string {
  assert(typeof trait.data?.type_name === 'number', 'slot trait lacks a type')
  return multinameName(abc.constant_pool.multiname[trait.data.type_name - 1], strings)
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

function methodQName(methodId: number): string {
  const matchingTraits: Trait[] = []
  for (let classIndex = 0; classIndex < abc.instance.length; classIndex++) {
    for (const trait of [...(abc.instance[classIndex].trait ?? []), ...(abc.class[classIndex].traits ?? [])]) {
      if (trait.data?.method === methodId) matchingTraits.push(trait)
    }
  }
  assert(matchingTraits.length === 1, `expected one trait for method ${methodId}`)
  return traitQName(matchingTraits[0])
}

function methodBodySha256(methodId: number): string {
  const body = abc.method_body.find((candidate: any) => candidate.method === methodId)
  assert(body, `method ${methodId} has no body`)
  return sha256(new Uint8Array(body.code))
}

function methodCallsiteLedger(methodId: number) {
  return exactReferencesForQName(methodQName(methodId))
}

const configClassIndex = classIndexNamed('_-G47')
const fighterClassIndex = classIndexNamed('_-V4R')
assert(configClassIndex === 206, 'handicap configuration class index changed')
assert(fighterClassIndex === 147, 'fighter class index changed')
const configTraits = abc.instance[configClassIndex].trait as Trait[]
const fighterTraits = abc.instance[fighterClassIndex].trait as Trait[]
const configDealtTrait = traitNamed(configTraits, '_-f3A')
const configTakenTrait = traitNamed(configTraits, '_-YA')
const fighterDealtTrait = traitNamed(fighterTraits, '_-f3A')
const fighterTakenTrait = traitNamed(fighterTraits, '_-YA')
assert(traitTypeName(configDealtTrait) === 'uint', 'configuration dealt field is not uint')
assert(traitTypeName(configTakenTrait) === 'uint', 'configuration taken field is not uint')
assert(traitTypeName(fighterDealtTrait) === 'Number', 'fighter dealt field is not Number')
assert(traitTypeName(fighterTakenTrait) === 'Number', 'fighter taken field is not Number')
assert((configDealtTrait.data?.vindex ?? 0) === 0, 'configuration dealt field has a constant initializer')
assert((configTakenTrait.data?.vindex ?? 0) === 0, 'configuration taken field has a constant initializer')
assert((fighterDealtTrait.data?.vindex ?? 0) === 0, 'fighter dealt field has a constant initializer')
assert((fighterTakenTrait.data?.vindex ?? 0) === 0, 'fighter taken field has a constant initializer')
const dealtQName = traitQName(configDealtTrait)
const takenQName = traitQName(configTakenTrait)
assert(traitQName(fighterDealtTrait) === dealtQName, 'configuration and fighter dealt QNames differ')
assert(traitQName(fighterTakenTrait) === takenQName, 'configuration and fighter taken QNames differ')

requireAt(4017, 6, 'pushbyte', 0)
requireAt(4017, 18, 'initproperty', '_-f3A')
requireAt(4017, 25, 'pushbyte', 0)
requireAt(4017, 27, 'initproperty', '_-YA')
for (const [pc, opcode, expected] of [
  [81, 'getproperty', '_-f3A'],
  [85, 'pushbyte', 0],
  [98, 'getproperty', '_-f3A'],
  [102, 'pushbyte', 100],
  [117, 'getproperty', '_-YA'],
  [120, 'pushbyte', 0],
  [132, 'getproperty', '_-YA'],
  [135, 'pushbyte', 100],
] as const) {
  requireAt(4019, pc, opcode, expected)
}

requireAt(2404, 29, 'getproperty', '_-f3A')
requireAt(2404, 50, 'getproperty', '_-f3A')
requireAt(2404, 59, 'pushbyte', 100)
requireAt(2403, 29, 'getproperty', '_-YA')
requireAt(2403, 49, 'getproperty', '_-YA')
requireAt(2403, 57, 'pushbyte', 100)
requireAt(2400, 157, 'callproperty', '_-O2u')
requireAt(2400, 163, 'initproperty', '_-f3A')
requireAt(2400, 175, 'callproperty', '_-y5A')
requireAt(2400, 180, 'initproperty', '_-YA')

for (const [pc, opcode, expected] of [
  [11, 'getlocal_2', undefined],
  [14, 'getlocal_1', undefined],
  [15, 'pushnull', undefined],
  [20, 'ifeq', 7],
  [24, 'pushbyte', 1],
  [31, 'pushbyte', 0],
  [34, 'callpropvoid', '_-PY'],
  [38, 'getlocal_1', undefined],
  [39, 'pushnull', undefined],
  [44, 'ifne', 1],
  [48, 'returnvoid', undefined],
  [51, 'getproperty', '_-9H'],
  [55, 'callpropvoid', '_-S2c'],
  [61, 'getproperty', '_-f3A'],
  [65, 'callpropvoid', '_-S2c'],
  [71, 'getproperty', '_-YA'],
  [74, 'callpropvoid', '_-S2c'],
] as const) {
  requireAt(4021, pc, opcode, expected)
}
for (const [pc, opcode, expected] of [
  [16, 'getlocal_1', undefined],
  [17, 'pushbyte', 1],
  [19, 'callproperty', '_-14J'],
  [25, 'pushbyte', 0],
  [27, 'equals', undefined],
  [28, 'iffalse', 6],
  [32, 'pushnull', undefined],
  [33, 'coerce', '_-G47'],
  [37, 'returnvalue', undefined],
  [38, 'findpropstrict', '_-G47'],
  [42, 'constructprop', '_-G47'],
  [54, 'callproperty', '_-8v'],
  [59, 'initproperty', '_-9H'],
  [65, 'callproperty', '_-8v'],
  [70, 'initproperty', '_-f3A'],
  [76, 'callproperty', '_-8v'],
  [81, 'initproperty', '_-YA'],
] as const) {
  requireAt(4022, pc, opcode, expected)
}
requireAt(6519, 1331, 'getproperty', '_-w3a')
requireAt(6519, 1343, 'callpropvoid', '_-a4a')
requireAt(6510, 1298, 'callproperty', '_-J18')
requireAt(6510, 1306, 'initproperty', '_-w3a')
requireAt(6510, 1358, 'getproperty', '_-I1a')
requireAt(6510, 1361, 'getlocal', 19)
requireAt(6510, 1363, 'getlocal', 23)
requireAt(6510, 1365, 'setproperty')
requireAt(3507, 304, 'getproperty', '_-I1a')
assert(exactQNameAt(6510, 1358) === exactQNameAt(3507, 304), 'reader and replay start use different roster lists')
requireAt(3507, 309, 'getproperty')
requireAt(3507, 313, 'coerce', '_-kv')
requireAt(3507, 321, 'setlocal', 7)
requireAt(3507, 374, 'getlocal', 7)
requireAt(3507, 376, 'callproperty', '_-HT')
assert(
  exactQNameAt(3507, 376) === traitQName(traitNamed(abc.class[147].traits, '_-HT')),
  'replay start does not call the exact fighter factory',
)
requireAt(3071, 8, 'getlocal', 5)
requireAt(3071, 16, 'constructprop', '_-V4R')
assert(methodParameterQName(3071, 4) === methodParameterQName(2790, 4), 'factory changes roster parameter type')
requireAt(2790, 2357, 'getlocal', 5)
requireAt(2790, 2359, 'getproperty', '_-w3a')
requireAt(2790, 2363, 'callproperty', '_-J5y')
requireAt(2790, 2372, 'initproperty', '_-w3a')

for (const [pc, opcode, expected] of [
  [291, 'pushdouble', 1],
  [294, 'initproperty', '_-YA'],
  [301, 'pushdouble', 1],
  [304, 'initproperty', '_-f3A'],
  [5102, 'findproperty', '_-w3a'],
  [5106, 'getproperty', '_-w3a'],
  [5110, 'pushnull', undefined],
  [5115, 'equals', undefined],
  [5116, 'not', undefined],
  [5118, 'setlocal', 34],
  [5195, 'findproperty', '_-f3A'],
  [5200, 'getlocal', 34],
  [5202, 'iffalse', 18],
  [5215, 'getproperty', '_-f3A'],
  [5219, 'pushbyte', 0],
  [5221, 'equals', undefined],
  [5222, 'not', undefined],
  [5224, 'iffalse', 20],
  [5236, 'getproperty', '_-f3A'],
  [5240, 'pushdouble', 100],
  [5243, 'divide', undefined],
  [5244, 'jump', 3],
  [5248, 'pushdouble', 1],
  [5251, 'initproperty', '_-f3A'],
  [5255, 'findproperty', '_-YA'],
  [5259, 'getlocal', 34],
  [5261, 'iffalse', 17],
  [5274, 'getproperty', '_-YA'],
  [5277, 'pushbyte', 0],
  [5279, 'equals', undefined],
  [5280, 'not', undefined],
  [5282, 'iffalse', 19],
  [5294, 'getproperty', '_-YA'],
  [5297, 'pushdouble', 100],
  [5300, 'divide', undefined],
  [5301, 'jump', 3],
  [5305, 'pushdouble', 1],
  [5308, 'initproperty', '_-YA'],
] as const) {
  requireAt(2790, pc, opcode, expected)
}

for (const [pc, opcode, expected] of [
  [90, 'getlocal', 5],
  [92, 'getlex', '_-V4R'],
  [95, 'istypelate', undefined],
  [96, 'iffalse', 6],
  [100, 'getlocal', 5],
  [106, 'pushnull', undefined],
  [107, 'coerce', '_-V4R'],
  [110, 'coerce', '_-V4R'],
  [113, 'setlocal', 22],
  [539, 'getlocal', 28],
  [541, 'getlocal', 23],
  [543, 'getproperty', '_-n2G'],
  [546, 'getlocal', 6],
  [548, 'getproperty', '_-YA'],
  [551, 'multiply', undefined],
  [552, 'getlocal', 25],
  [554, 'getproperty', '_-32'],
  [558, 'divide', undefined],
  [559, 'multiply', undefined],
  [560, 'convert_d', undefined],
  [561, 'setlocal', 28],
  [563, 'getlocal', 22],
  [565, 'pushnull', undefined],
  [566, 'coerce', '_-V4R'],
  [569, 'ifeq', 12],
  [573, 'getlocal', 28],
  [575, 'getlocal', 22],
  [577, 'getproperty', '_-f3A'],
  [581, 'multiply', undefined],
  [582, 'convert_d', undefined],
  [583, 'setlocal', 28],
  [900, 'getlocal', 6],
  [902, 'getlocal', 34],
  [905, 'callpropvoid', '_-p5m'],
  [1755, 'getlocal', 6],
  [1757, 'getlocal', 28],
  [1764, 'callpropvoid', '_-B6f'],
  [3061, 'getlocal', 6],
  [3063, 'getlocal', 28],
  [3069, 'callpropvoid', '_-J6Q'],
  [3186, 'getlocal', 22],
  [3188, 'getlocal', 34],
  [3191, 'callpropvoid', '_-t2'],
] as const) {
  requireAt(1484, pc, opcode, expected)
}
requireAt(2604, 191, 'getlocal_2')
requireAt(2604, 192, 'getlocal_1')
requireAt(2604, 193, 'getproperty', '_-V6R')
requireAt(2604, 196, 'initproperty', 'TargetDamage')
requireAt(2620, 118, 'getlocal_2')
requireAt(2620, 119, 'getlocal_1')
requireAt(2620, 120, 'getproperty', '_-V6R')
requireAt(2620, 123, 'initproperty', 'Damage')
for (const [pc, opcode, expected] of [
  [36, 'getlocal_1', undefined],
  [37, 'getlex', '_-V4R'],
  [40, 'istypelate', undefined],
  [45, 'getlocal_1', undefined],
  [46, 'coerce', '_-V4R'],
  [49, 'setlocal', 8],
  [51, 'getlocal', 7],
  [53, 'getlocal', 8],
  [55, 'getproperty', '_-f3A'],
  [59, 'multiply', undefined],
  [142, 'getlocal', 7],
  [147, 'returnvalue', undefined],
] as const) {
  requireAt(4169, pc, opcode, expected)
}
requireAt(7090, 95, 'getproperty', '_-f3A')
requireAt(7090, 99, 'pushbyte', 3)
requireAt(7090, 101, 'multiply')
requireAt(7090, 102, 'initproperty', '_-f3A')

for (const [methodId, accessor, setter, minimumPc, maximumPc, stepPc, setterPc] of [
  [9882, '_-O2u', '_-e52', 176, 179, 182, 201],
  [9881, '_-y5A', '_-xI', 175, 178, 181, 200],
] as const) {
  requireAt(methodId, 170, 'callproperty', accessor)
  requireAt(methodId, minimumPc, 'pushbyte', 50)
  requireAt(methodId, maximumPc, 'pushuint', 300)
  requireAt(methodId, stepPc, 'pushbyte', 10)
  requireAt(methodId, setterPc, 'callpropvoid', setter)
}

assert(methodBodySha256(3282) === EXPECTED_MATCH_SETUP_BODY_SHA256, 'match-setup body changed')
assert(methodBodySha256(6936) === EXPECTED_MODE_START_BODY_SHA256, 'mode-start body changed')
assert(methodBodySha256(6937) === EXPECTED_MODE_SELECTION_BODY_SHA256, 'mode-selection body changed')
assert(methodBodySha256(7090) === EXPECTED_MUTATION_BODY_SHA256, 'mutation body changed')
assert(
  JSON.stringify(owners.get(7090)) ===
    JSON.stringify({ classIndex: 392, className: '_-n4L', traitName: '_-m3h', static: false }),
  'mutation owner changed',
)

for (const [pc, opcode, expected] of [
  [2, 'findproperty', '_-Z2h'],
  [5, 'getproperty', '_-Z2h'],
  [8, 'getproperty', '_-gs'],
  [11, 'getproperty', '_-61s'],
  [14, 'coerce', 'ScoringType'],
  [18, 'setlocal_1', undefined],
  [735, 'getlex', 'ScoringType'],
  [739, 'getproperty', 'ZOMBIE'],
  [742, 'getlocal_1', undefined],
  [743, 'ifne', 25],
  [750, 'findpropstrict', '_-n4L'],
  [760, 'constructprop', '_-n4L'],
  [765, 'initproperty', '_-x1V'],
  [772, 'findproperty', '_-x1V'],
  [775, 'findpropstrict', '_-N2y'],
] as const) {
  requireAt(6937, pc, opcode, expected)
}

for (const [pc, opcode, expected] of [
  [9, 'findproperty', '_-Z2h'],
  [12, 'getproperty', '_-Z2h'],
  [15, 'getproperty', '_-gs'],
  [18, 'getproperty', '_-71j'],
  [22, 'pushbyte', 3],
  [25, 'equals', undefined],
  [26, 'iffalse', 39],
  [69, 'findproperty', '_-x1V'],
  [72, 'getproperty', '_-x1V'],
  [75, 'getlocal_1', undefined],
  [76, 'callpropvoid', '_-m3h'],
] as const) {
  requireAt(6936, pc, opcode, expected)
}
assert(requireAt(3746, 34, 'pushstring').params[0] === 'Variation: ', 'variation label changed')
requireAt(3746, 49, 'getproperty', '_-71j')
requireAt(3785, 55, 'getproperty', '_-71j')
requireAt(3785, 59, 'pushbyte', 3)
assert(requireAt(3785, 67, 'pushstring').params[0] === 'ScoringType_SHIFT', 'Shift variation label changed')

for (const [pc, opcode, expected] of [
  [35, 'findproperty', '_-Z2h'],
  [38, 'getproperty', '_-Z2h'],
  [41, 'getproperty', '_-Y1k'],
  [50, 'jump', 52],
  [54, 'label', undefined],
  [55, 'getlocal', 4],
  [57, 'getlocal_3', undefined],
  [62, 'coerce', '_-V4R'],
  [68, 'setlocal', 5],
  [70, 'inclocal_i', 3],
  [72, 'getlocal', 5],
  [74, 'getproperty', '_-56G'],
  [77, 'getlex', '_-V4R'],
  [80, 'getproperty', '_-a50'],
  [83, 'bitand', undefined],
  [84, 'pushbyte', 0],
  [86, 'equals', undefined],
  [87, 'iffalse', 15],
  [91, 'getlocal', 5],
  [93, 'getlocal', 5],
  [95, 'getproperty', '_-f3A'],
  [99, 'pushbyte', 3],
  [101, 'multiply', undefined],
  [102, 'initproperty', '_-f3A'],
  [106, 'getlocal_3', undefined],
  [109, 'getproperty', 'length'],
  [114, 'iflt', -64],
] as const) {
  requireAt(7090, pc, opcode, expected)
}

requireAt(3074, 942, 'pushbyte', 1)
requireAt(3074, 944, 'initproperty', '_-6c')
requireAt(3074, 951, 'pushbyte', 2)
requireAt(3074, 953, 'initproperty', '_-a50')
requireAt(3074, 968, 'pushbyte', 8)
requireAt(3074, 970, 'initproperty', '_-76C')
requireAt(3507, 359, 'getlex', '_-V4R')
requireAt(3507, 362, 'getproperty', '_-6c')
requireAt(3507, 369, 'getproperty', '_-76C')
requireAt(3507, 373, 'bitor')
requireAt(3507, 376, 'callproperty', '_-HT')
requireAt(2790, 1554, 'getlocal', 4)
requireAt(2790, 1556, 'initproperty', '_-56G')

requireAt(14909, 62119, 'getlex', '_-V4R')
requireAt(14909, 62122, 'getproperty', '_-F43')
requireAt(14909, 62125, 'getlex', '_-V4R')
requireAt(14909, 62128, 'getproperty', '_-a50')
requireAt(14909, 62131, 'bitor')
requireAt(14909, 62163, 'initproperty', '_-K4c')
requireAt(7100, 219, 'getlex', '_-n4L')
requireAt(7100, 223, 'getproperty', '_-K4c')
requireAt(7100, 249, 'bitor')
requireAt(7100, 252, 'callproperty', '_-HT')
requireAt(7100, 342, 'getproperty', '_-56G')
requireAt(7100, 349, 'getproperty', '_-K4c')
requireAt(7100, 352, 'bitor')
requireAt(7100, 353, 'initproperty', '_-56G')

requireAt(3216, 1809, 'findproperty', '_-z3z')
requireAt(3216, 1812, 'callproperty', '_-z3z')
requireAt(3217, 1919, 'getproperty', '_-q3e')
requireAt(3217, 1922, 'pushbyte', 0)
requireAt(3217, 1924, 'equals')
requireAt(3217, 1925, 'iffalse', 22)
requireAt(3217, 1935, 'callpropvoid', '_-q5Q')
requireAt(3428, 152, 'findproperty', '_-q3e')
requireAt(3428, 156, 'initproperty', '_-q3e')
requireAt(3428, 175, 'callproperty', '_-V1E')
requireAt(3428, 180, 'iffalse', 18)
requireAt(3428, 209, 'callpropvoid', '_-d31')
requireAt(3229, 137, 'callpropvoid', '_-Ga')

requireAt(3282, 317, 'findproperty', '_-T3Q')
requireAt(3282, 323, 'callpropvoid', '_-T3Q')
requireAt(3282, 346, 'findproperty', '_-fN')
requireAt(3282, 361, 'callpropvoid', '_-fN')
requireAt(3368, 29, 'findpropstrict', '_-16')
requireAt(3368, 33, 'constructprop', '_-16')
requireAt(3368, 37, 'initproperty', '_-JJ')
requireAt(3282, 1779, 'getproperty', '_-JJ')
requireAt(3282, 1786, 'ifeq', 23)
requireAt(3282, 1793, 'getproperty', '_-JJ')
requireAt(3282, 1808, 'callpropvoid', '_-L2J')
requireAt(6519, 80, 'getproperty', '_-gs')
requireAt(6519, 91, 'callpropvoid', '_-33g')
requireAt(3748, 65, 'getproperty', '_-61s')
requireAt(3748, 68, 'getproperty', '_-73C')
requireAt(3748, 72, 'callpropvoid', '_-S2c')
requireAt(3748, 181, 'getproperty', '_-71j')

const variationReferences = exactReferencesForQName(exactQNameAt(6936, 18))
const recorderReferences = exactReferencesForQName(exactQNameAt(3282, 1779))
const modeStartCallsites = methodCallsiteLedger(6936)
const modeSelectionCallsites = methodCallsiteLedger(6937)
const mutationCallsites = methodCallsiteLedger(7090)
const recorderFactoryCallsites = methodCallsiteLedger(3368)
const settingsWriterCallsites = methodCallsiteLedger(3748)
const replayWriterCallsites = methodCallsiteLedger(6519)
for (const [label, ledger, callerMethodId, pc, opcode] of [
  ['mode-start', modeStartCallsites, 3428, 209, 'callpropvoid'],
  ['mode-selection', modeSelectionCallsites, 3229, 137, 'callpropvoid'],
  ['mutation', mutationCallsites, 6936, 76, 'callpropvoid'],
  ['settings-writer', settingsWriterCallsites, 6519, 91, 'callpropvoid'],
] as const) {
  assert(ledger.length === 1, `${label} does not have one direct caller`)
  assert(ledger[0].methodId === callerMethodId, `${label} caller changed`)
  assert(ledger[0].references.length === 1, `${label} callsite count changed`)
  assert(ledger[0].references[0].pc === pc && ledger[0].references[0].opcode === opcode, `${label} callsite changed`)
}
assert(sha256(JSON.stringify(variationReferences)) === EXPECTED_VARIATION_LEDGER_SHA256, 'variation ledger changed')
assert(sha256(JSON.stringify(recorderReferences)) === EXPECTED_RECORDER_LEDGER_SHA256, 'recorder ledger changed')
assert(
  sha256(JSON.stringify(modeStartCallsites)) === EXPECTED_MODE_START_CALLSITE_SHA256,
  'mode-start callsites changed',
)
assert(
  sha256(JSON.stringify(modeSelectionCallsites)) === EXPECTED_MODE_SELECTION_CALLSITE_SHA256,
  'mode-selection callsites changed',
)
assert(sha256(JSON.stringify(mutationCallsites)) === EXPECTED_MUTATION_CALLSITE_SHA256, 'mutation callsites changed')
assert(
  sha256(JSON.stringify(recorderFactoryCallsites)) === EXPECTED_RECORDER_FACTORY_CALLSITE_SHA256,
  'recorder-factory callsites changed',
)
assert(
  sha256(JSON.stringify(settingsWriterCallsites)) === EXPECTED_SETTINGS_WRITER_CALLSITE_SHA256,
  'settings-writer callsites changed',
)
assert(
  sha256(JSON.stringify(replayWriterCallsites)) === EXPECTED_REPLAY_WRITER_CALLSITE_SHA256,
  'replay-writer callsites changed',
)

const dealtReferences = exactReferencesForQName(dealtQName)
const takenReferences = exactReferencesForQName(takenQName)
const dealtLedgerSha256 = sha256(JSON.stringify(dealtReferences))
const takenLedgerSha256 = sha256(JSON.stringify(takenReferences))
assert(dealtLedgerSha256 === EXPECTED_DEALT_LEDGER_SHA256, 'dealt exact-QName ledger changed')
assert(takenLedgerSha256 === EXPECTED_TAKEN_LEDGER_SHA256, 'taken exact-QName ledger changed')
const dealtInstructionCount = dealtReferences.reduce((sum, entry) => sum + entry.references.length, 0)
const takenInstructionCount = takenReferences.reduce((sum, entry) => sum + entry.references.length, 0)
assert(dealtReferences.length === 18 && dealtInstructionCount === 38, 'dealt reference cardinality changed')
assert(takenReferences.length === 16 && takenInstructionCount === 35, 'taken reference cardinality changed')

const helperCallsites = [
  { helperMethodId: 4021, references: exactReferencesForQName(traitQName(traitNamed(abc.class[206].traits, '_-a4a'))) },
  { helperMethodId: 4022, references: exactReferencesForQName(traitQName(traitNamed(abc.class[206].traits, '_-J18'))) },
]
const helperCallsiteLedgerSha256 = sha256(JSON.stringify(helperCallsites))
assert(helperCallsiteLedgerSha256 === EXPECTED_HELPER_CALLSITE_LEDGER_SHA256, 'helper callsite ledger changed')
assert(
  JSON.stringify(helperCallsites.map((entry) => entry.references)) ===
    JSON.stringify([
      [{ methodId: 6519, owner: owners.get(6519), references: [{ pc: 1343, opcode: 'callpropvoid' }] }],
      [{ methodId: 6510, owner: owners.get(6510), references: [{ pc: 1298, opcode: 'callproperty' }] }],
    ]),
  'replay helper callsites changed',
)

const output: Record<string, unknown> = {
  status: 'proven-for-pinned-abc',
  identity: {
    build: EXPECTED_BUILD,
    abcSha256,
    decodedMethodBodies: abc.method_body.length,
    branchTargetsValid: true,
  },
  fields: {
    word2: {
      structuralName: 'damageDealtPercent',
      qname: dealtQName,
      storageType: 'uint',
      multiplier: 'p == 0 ? 1 : p / 100',
    },
    word3: {
      structuralName: 'damageTakenPercent',
      qname: takenQName,
      storageType: 'uint',
      multiplier: 'p == 0 ? 1 : p / 100',
    },
    normalSerializedDefault: 100,
    zeroFallbackMultiplier: 1,
  },
  mutationPolicy: {
    scoringType: 'ScoringType.ZOMBIE',
    neighboringVariationGuard:
      'Variation == Shift gates auxiliary setup only; both branches converge before mutation dispatch',
    startupDispatch: 'method 3217 calls method 3428 when _-q3e == 0; the ordinary method-3428 path calls method 6936',
    selection: '(fighter._-56G & 2) == 0',
    replayRestoredFlags: '1 | 8 == 9, so replay-restored fighters are selected',
    spawnedFighterExclusion: '_-n4L._-K4c includes bit 2, so later Zombie-mode fighters are excluded',
    arithmetic: '(p == 0 ? 1 : p / 100) * 3',
    lifetime: 'object-local; no later dealt-field write resets it, and re-entry would compound by another factor of 3',
    replayReachability:
      'the same setup path selects the scoring handler and creates the recorder; writer dispatch has no scoring or variation exclusion',
  },
  ledgers: {
    dealt: { sha256: dealtLedgerSha256, methods: dealtReferences.length, instructions: dealtInstructionCount },
    taken: { sha256: takenLedgerSha256, methods: takenReferences.length, instructions: takenInstructionCount },
    helperCallsites: { sha256: helperCallsiteLedgerSha256, entries: helperCallsites },
    variation: { sha256: sha256(JSON.stringify(variationReferences)), methods: variationReferences.length },
    recorder: { sha256: sha256(JSON.stringify(recorderReferences)), methods: recorderReferences.length },
    modeStartCallsites: { sha256: sha256(JSON.stringify(modeStartCallsites)), entries: modeStartCallsites },
    modeSelectionCallsites: { sha256: sha256(JSON.stringify(modeSelectionCallsites)), entries: modeSelectionCallsites },
    mutationCallsites: { sha256: sha256(JSON.stringify(mutationCallsites)), entries: mutationCallsites },
    recorderFactoryCallsites: {
      sha256: sha256(JSON.stringify(recorderFactoryCallsites)),
      entries: recorderFactoryCallsites,
    },
    settingsWriterCallsites: {
      sha256: sha256(JSON.stringify(settingsWriterCallsites)),
      entries: settingsWriterCallsites,
    },
    replayWriterCallsites: { sha256: sha256(JSON.stringify(replayWriterCallsites)), entries: replayWriterCallsites },
  },
  anchors: {
    replayWriter: { methodId: 4021, order: ['_-9H', '_-f3A', '_-YA'] },
    replayReader: { methodId: 4022, order: ['_-9H', '_-f3A', '_-YA'] },
    runtimeNormalization: { methodId: 2790, divisor: 100, zeroFallback: 1 },
    scoringModeSelection: { methodId: 6937, scoringType: 'ZOMBIE', handlerClass: '_-n4L' },
    modeStartup: { methods: [3217, 3428, 6936, 7090], initialState: '_-q3e == 0' },
    mutation: { methodId: 7090, flagMask: 2, operation: '_-f3A = _-f3A * 3' },
    replayRestoredFlags: { methodId: 3507, expression: '_-6c | _-76C', value: 9 },
    spawnedFighterExclusion: { methods: [14909, 7100], maskIncludes: '_-V4R._-a50' },
    mainDamageConsumer: { methodId: 1484, order: ['target._-YA', 'attacker._-f3A'] },
    roleLabels: { target: '2604:196 TargetDamage', source: '2620:123 Damage' },
  },
}
if (process.argv.includes('--explore')) {
  output.exactReferences = {
    dealt: dealtReferences,
    taken: takenReferences,
    variation: variationReferences,
    recorder: recorderReferences,
  }
}
console.log(JSON.stringify(output, null, 2))
