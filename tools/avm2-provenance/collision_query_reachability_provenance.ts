import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = {
  classIndex: number
  className: string
  traitName: string
  static: boolean
}
type TraitMethod = MethodOwner & {
  methodId: number
  kind: number
  dispatchId: number
  qname: string | null
}
type DirectCall = {
  methodId: number
  owner: MethodOwner
  pc: number
  opcode: string
  arity: number
  disposition: 'unclassified'
}

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_BODY_COUNT = 15_010
const TARGET_METHOD_ID = 1390
const TARGET_CLASS_INDEX = 76
const TARGET_CLASS_NAME = '_-91W'
const TARGET_TRAIT_NAME = '_-K2O'
const EXPECTED_CALL_COUNT = 93
const EXPECTED_CALLER_METHOD_COUNT = 38
const EXPECTED_DIRECT_LEDGER_SHA256 = 'c826cbf889831a2cde0863e37d17792f12a3cb468c045f9e5101a77daa873ad7'
const EXPECTED_EXACT_REFERENCE_LEDGER_SHA256 = '71552d5a6e4c32937f1f8bef28fd4e362ae5f45f09aae5265ffca9894883050b'
const EXPECTED_METHOD_SEMANTIC_SHA256 = '5c53868fc7375d4f7881d55491ab1cae00b2c6a46375731a9ba9275f161189d0'
const PROPERTY_CALL_OPCODES = new Set(['callproperty', 'callpropvoid'])
const RUNTIME_PROPERTY_OPCODES = new Set([
  'callproperty',
  'callproplex',
  'callpropvoid',
  'constructprop',
  'deleteproperty',
  'finddef',
  'findproperty',
  'findpropstrict',
  'getdescendants',
  'getlex',
  'getproperty',
  'getsuper',
  'initproperty',
  'setproperty',
  'setsuper',
])
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
      if (typeof offset !== 'number' || !boundaries.has(instruction.endPc + offset)) {
        errors.push(`PC ${instruction.pc} ${instruction.name}`)
      }
    }
    if (instruction.name !== 'lookupswitch') continue
    const offsets = [instruction.params[0], ...(Array.isArray(instruction.params[2]) ? instruction.params[2] : [])]
    for (const entry of offsets) {
      const offset = Array.isArray(entry) ? entry[1] : entry
      if (typeof offset !== 'number' || !boundaries.has(instruction.pc + offset)) {
        errors.push(`PC ${instruction.pc} lookupswitch`)
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
  if (![7, 13].includes(Number(candidate.kind))) return null
  if (typeof candidate.data?.ns !== 'number' || typeof candidate.data.name !== 'number') return null
  return `${candidate.data.ns}:${candidate.data.name}`
}

function countBy<T>(values: T[], key: (value: T) => string): Record<string, number> {
  const counts = new Map<string, number>()
  for (const value of values) {
    const group = key(value)
    counts.set(group, (counts.get(group) ?? 0) + 1)
  }
  return Object.fromEntries([...counts].sort(([left], [right]) => left.localeCompare(right)))
}

const abcPath = argument('--abc')
if (!abcPath) {
  process.stderr.write('usage: bun collision_query_reachability_provenance.ts --abc <main.abc>\n')
  process.exit(64)
}

const abcBytes = readFileSync(resolve(abcPath))
const abcSha256 = sha256(new Uint8Array(abcBytes))
assert(abcSha256 === EXPECTED_ABC_SHA256, `ABC SHA-256 mismatch: ${abcSha256}`)
const abc: any = AbcFile.read(new ExtendedBuffer(abcBytes))
const strings = abc.constant_pool.string as string[]
const multinames = abc.constant_pool.multiname as unknown[]
const nameAt = (index: number): string => multinameName(multinames[index - 1], strings)
const buildStrings = strings.filter((value) => /^\d+\.\d+\.\d+$/.test(value))
assert(buildStrings.length === 1 && buildStrings[0] === EXPECTED_BUILD, 'ABC build mismatch')
assert(abc.method_body.length === EXPECTED_BODY_COUNT, `expected ${EXPECTED_BODY_COUNT} method bodies`)

const disassembler = new InstructionDisassembler(abc)
const methods = new Map<number, LocatedInstruction[]>()
const semanticInstructions = new Map<number, Instruction[]>()
const branchErrors: string[] = []
for (const body of abc.method_body) {
  const decoded = disassembler.disassemble(body) as Instruction[]
  const located = locateInstructions(body.code, decoded)
  methods.set(body.method, located)
  semanticInstructions.set(body.method, decoded)
  branchErrors.push(...validateBranches(located, body.code.length).map((error) => `method ${body.method} ${error}`))
}
assert(branchErrors.length === 0, `invalid branch targets: ${branchErrors.slice(0, 10).join(', ')}`)

const owners = new Map<number, MethodOwner>()
const ownerCandidates = new Map<number, MethodOwner[]>()
const traitMethods: TraitMethod[] = []
const registerOwner = (methodId: number, owner: MethodOwner): void => {
  ownerCandidates.set(methodId, [...(ownerCandidates.get(methodId) ?? []), owner])
  if (!owners.has(methodId)) owners.set(methodId, owner)
}
const addTrait = (trait: any, owner: MethodOwner): void => {
  if (trait.data?.method === undefined) return
  registerOwner(trait.data.method, owner)
  traitMethods.push({
    ...owner,
    methodId: trait.data.method,
    kind: trait.kind & 0x0f,
    dispatchId: trait.data.disp_id,
    qname: qnameKey(multinames[trait.name - 1]),
  })
}
for (let classIndex = 0; classIndex < abc.instance.length; classIndex++) {
  const className = nameAt(abc.instance[classIndex].name)
  registerOwner(abc.instance[classIndex].iinit, {
    classIndex,
    className,
    traitName: '<iinit>',
    static: false,
  })
  registerOwner(abc.class[classIndex].cinit, { classIndex, className, traitName: '<cinit>', static: true })
  for (const trait of abc.instance[classIndex].trait ?? []) {
    addTrait(trait, { classIndex, className, traitName: nameAt(trait.name), static: false })
  }
  for (const trait of abc.class[classIndex].traits ?? []) {
    addTrait(trait, { classIndex, className, traitName: nameAt(trait.name), static: true })
  }
}
for (let scriptIndex = 0; scriptIndex < abc.script.length; scriptIndex++) {
  const owner = { classIndex: -1, className: `<script ${scriptIndex}>`, traitName: '<init>', static: true }
  registerOwner(abc.script[scriptIndex].init, owner)
  for (const trait of abc.script[scriptIndex].trait ?? []) {
    addTrait(trait, { ...owner, traitName: nameAt(trait.name) })
  }
}

const targetOwners = traitMethods.filter((trait) => trait.methodId === TARGET_METHOD_ID)
assert(targetOwners.length === 1, `target method ${TARGET_METHOD_ID} does not have one exact trait owner`)
const targetTrait = targetOwners[0]
assert(
  targetTrait.classIndex === TARGET_CLASS_INDEX &&
    targetTrait.className === TARGET_CLASS_NAME &&
    targetTrait.traitName === TARGET_TRAIT_NAME &&
    !targetTrait.static &&
    targetTrait.kind === 1 &&
    targetTrait.dispatchId === 0,
  'method 1390 owner, trait, or dispatch ID changed',
)
assert(nameAt(abc.instance[TARGET_CLASS_INDEX].super_name) === 'Object', 'method-1390 owner superclass changed')
const targetQName = targetTrait.qname
assert(targetQName, 'method-1390 trait is not an exact QName')
const declaredTargets = traitMethods.filter((trait) => trait.qname === targetQName)
assert(declaredTargets.length === 1 && declaredTargets[0].methodId === TARGET_METHOD_ID, 'declared target set changed')
const directSubclasses = abc.instance
  .map((instance: any, classIndex: number) => ({ classIndex, superName: nameAt(instance.super_name) }))
  .filter((entry: { classIndex: number; superName: string }) => entry.superName === TARGET_CLASS_NAME)
assert(directSubclasses.length === 0, 'method-1390 owner gained an ABC subclass')

const exactReferences: Array<{
  methodId: number
  owner: MethodOwner
  pc: number
  opcode: string
  arity: number | null
}> = []
const methodIdReferences: Array<{ methodId: number; pc: number; opcode: string }> = []
const literalNameReferences: Array<{ methodId: number; pc: number }> = []
const genericStackCalls: Array<{ methodId: number; pc: number }> = []
const nonQnamePropertyAccesses: Array<{ methodId: number; pc: number; opcode: string }> = []
for (const [methodId, instructions] of methods) {
  const owner = owners.get(methodId) ?? {
    classIndex: -2,
    className: '<anonymous function>',
    traitName: '<anonymous>',
    static: false,
  }
  for (const instruction of instructions) {
    if (qnameKey(instruction.params[0]) === targetQName) {
      assert(
        ownerCandidates.get(methodId)?.length === 1,
        `exact target reference in method ${methodId} does not have one exact trait owner`,
      )
      exactReferences.push({
        methodId,
        owner,
        pc: instruction.pc,
        opcode: instruction.name,
        arity: typeof instruction.params[1] === 'number' ? instruction.params[1] : null,
      })
    }
    if (
      ((instruction.name === 'callstatic' || instruction.id === 0x40) && instruction.params[0] === TARGET_METHOD_ID) ||
      (instruction.name === 'callmethod' && instruction.params[0] === targetTrait.dispatchId)
    ) {
      methodIdReferences.push({ methodId, pc: instruction.pc, opcode: instruction.name })
    }
    if (instruction.name === 'pushstring' && instruction.params[0] === TARGET_TRAIT_NAME) {
      literalNameReferences.push({ methodId, pc: instruction.pc })
    }
    if (instruction.name === 'call') genericStackCalls.push({ methodId, pc: instruction.pc })
    if (RUNTIME_PROPERTY_OPCODES.has(instruction.name) && qnameKey(instruction.params[0]) === null) {
      nonQnamePropertyAccesses.push({ methodId, pc: instruction.pc, opcode: instruction.name })
    }
  }
}

const directCalls: DirectCall[] = exactReferences
  .filter((reference) => PROPERTY_CALL_OPCODES.has(reference.opcode))
  .map((reference) => {
    assert(reference.arity !== null, `method ${reference.methodId} PC ${reference.pc} has no arity`)
    return {
      methodId: reference.methodId,
      owner: reference.owner,
      pc: reference.pc,
      opcode: reference.opcode,
      arity: reference.arity,
      disposition: 'unclassified',
    }
  })
assert(directCalls.length === EXPECTED_CALL_COUNT, `expected ${EXPECTED_CALL_COUNT} direct calls`)
assert(new Set(directCalls.map((call) => call.methodId)).size === EXPECTED_CALLER_METHOD_COUNT, 'caller count changed')
assert(exactReferences.length === EXPECTED_CALL_COUNT + 1, 'exact QName reference count changed')
assert(
  exactReferences.filter((reference) => !PROPERTY_CALL_OPCODES.has(reference.opcode)).length === 1 &&
    exactReferences.find((reference) => !PROPERTY_CALL_OPCODES.has(reference.opcode))?.opcode === 'findproperty',
  'non-call exact QName references changed',
)
assert(methodIdReferences.length === 0, 'method 1390 gained a method-ID or dispatch-ID reference')
assert(literalNameReferences.length === 0, 'method 1390 gained a literal reflected-name reference')
assert(genericStackCalls.length === 189, 'generic stack-call surface changed')
assert(nonQnamePropertyAccesses.length === 13_328, 'non-QName property-access surface changed')

const directLedger = directCalls
  .map(
    (call) =>
      `${call.methodId}\0${call.owner.classIndex}\0${call.owner.className}\0${call.owner.traitName}\0${call.pc}\0${call.opcode}\0${call.arity}\n`,
  )
  .join('')
const exactReferenceLedger = exactReferences
  .map(
    (reference) =>
      `${reference.methodId}\0${reference.owner.classIndex}\0${reference.pc}\0${reference.opcode}\0${reference.arity ?? ''}\n`,
  )
  .join('')
const directLedgerSha256 = sha256(directLedger)
const exactReferenceLedgerSha256 = sha256(exactReferenceLedger)
const methodSemanticSha256 = sha256(JSON.stringify(semanticInstructions.get(TARGET_METHOD_ID)))
assert(directLedgerSha256 === EXPECTED_DIRECT_LEDGER_SHA256, `direct ledger changed: ${directLedgerSha256}`)
assert(
  exactReferenceLedgerSha256 === EXPECTED_EXACT_REFERENCE_LEDGER_SHA256,
  `exact reference ledger changed: ${exactReferenceLedgerSha256}`,
)
assert(methodSemanticSha256 === EXPECTED_METHOD_SEMANTIC_SHA256, `method 1390 changed: ${methodSemanticSha256}`)

const report = {
  status: 'acceptance-not-met',
  verdict:
    'direct target identity is bounded, but replay-producing root reachability and indirect execution remain open',
  identity: {
    build: EXPECTED_BUILD,
    abcSha256,
    decodedMethodBodies: methods.size,
    branchTargetsValid: true,
  },
  target: {
    methodId: TARGET_METHOD_ID,
    owner: targetTrait,
    qname: targetQName,
    semanticSha256: methodSemanticSha256,
    declaredTargets,
    directAbcSubclassCount: directSubclasses.length,
  },
  directCalls: {
    callCount: directCalls.length,
    callerMethodCount: new Set(directCalls.map((call) => call.methodId)).size,
    ledgerSha256: directLedgerSha256,
    arityCounts: countBy(directCalls, (call) => String(call.arity)),
    opcodeCounts: countBy(directCalls, (call) => call.opcode),
    dispositionCounts: countBy(directCalls, (call) => call.disposition),
    sites: directCalls,
  },
  exactTargetReferences: {
    referenceCount: exactReferences.length,
    ledgerSha256: exactReferenceLedgerSha256,
    opcodeCounts: countBy(exactReferences, (reference) => reference.opcode),
    methodIdReferences,
    literalNameReferences,
  },
  unresolvedIndirectSurface: {
    genericStackCallCount: genericStackCalls.length,
    nonQnamePropertyAccessCount: nonQnamePropertyAccesses.length,
    nonQnamePropertyOpcodeCounts: countBy(nonQnamePropertyAccesses, (reference) => reference.opcode),
    limitation:
      'counts are whole-ABC syntactic surfaces; non-QName includes namespace-set and runtime multinames, and no transitive executable graph proves which sites are replay-reachable or can produce method 1390',
  },
  acceptance: {
    everyDirectCallReachableOrExcluded: false,
    everyIndirectTargetReachableOrExcluded: false,
    exactOwnerFamilyPerCall: false,
    exactMaskAndOptionPerCall: false,
    replayProducingConfigurationPathPerCall: false,
    deletionTestedExclusions: false,
  },
  blockers: [
    'no complete replay-producing configuration matrix',
    'no receiver-resolved transitive executable graph from replay construction and authoritative tick roots',
    'no initializer, callback, function-value, reflection, exception, or reachable-native closure',
    'no PC-indexed mask, option, excluded-mask, collection, owner-family, and configuration-path join',
    'no deletion-tested interpreted-reference trace matrix over every producer family',
  ],
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
