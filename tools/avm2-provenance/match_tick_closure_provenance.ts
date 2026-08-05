import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }
type TraitMethod = MethodOwner & { methodId: number; kind: number }
type QNameIdentity = {
  kind: number
  namespaceIndex: number
  namespaceKind: number
  namespaceUri: string
  nameIndex: number
  name: string
}
type RootSite = {
  methodId: number
  pc: number
  opcode: string
  property: string | null
  qname: QNameIdentity | null
  candidateMethodIds: number[]
  nativeIdentity: string | null
  receiverEvidence: { pc: number; opcode: string; qname: QNameIdentity } | null
  resolutionBlocker: string
}

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_MODE_TYPES_SHA256 = 'cdc1409bfcb84e30d76419087656c7dfe38c549e9528198adf6ba9be5f80741e'
const EXPECTED_SCORING_TYPES_SHA256 = 'fd9efadd2f3c6f7e844ec9c52b1f685fb15d32e936934450e36e441f3e182f7d'
const EXPECTED_CUSTOM_GAME_TYPES_SHA256 = '36eab628f9e28c04c8dfb533d9e940b50dee5c73c9a33f1043e61820e3c4642b'
const EXPECTED_BODY_COUNT = 15_010
const EXPECTED_BLOCKER_LEDGER_SHA256 = '25dd3810eac554a9b20e246398a2bd5f6fc0f80bd776323cd6b6ed5c2e53ae00'

const ROOT_METHODS = new Map([
  [3507, 'replay-load candidate'],
  [3217, 'authoritative fixed-step tick'],
])
const ANCHOR_METHODS = new Map([
  [3507, 'replay load'],
  [6510, 'replay state reader'],
  [3759, 'game-settings reader'],
  [3217, 'authoritative tick'],
  [3428, 'first-step initializer'],
  [2894, 'fighter tick'],
  [2893, 'fighter post-movement'],
  [1474, 'deferred-hit arbitration'],
  [4753, 'item pre-phase'],
  [4755, 'item post-phase'],
  [6583, 'respawn/scoring pre-phase'],
  [6933, 'mode pre-phase'],
  [6935, 'standard mode terminal phase'],
  [3732, 'GameModeType parser candidate'],
  [7279, 'ScoringType parser candidate'],
])
const PROPERTY_CALLS = new Set(['callproperty', 'callproplex', 'callpropvoid', 'callsuper', 'callsupervoid'])
const INDIRECT_CALLS = new Set(['call', 'callmethod', 'construct', 'constructsuper'])
const DIRECT_CALLS = new Set(['callstatic'])
const FUNCTION_CREATION_OPCODE_ID = 0x40
const CONSTRUCT_PROPERTY = 'constructprop'
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

function readPinned(path: string, expectedHash: string, label: string): Buffer {
  const bytes = readFileSync(resolve(path))
  const actualHash = sha256(new Uint8Array(bytes))
  assert(actualHash === expectedHash, `${label} SHA-256 mismatch: ${actualHash}`)
  return bytes
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
        errors.push(`PC ${instruction.pc}`)
      }
    }
    if (instruction.name === 'lookupswitch') {
      const offsets = [instruction.params[0], ...(Array.isArray(instruction.params[2]) ? instruction.params[2] : [])]
      for (const entry of offsets) {
        const offset = Array.isArray(entry) ? entry[1] : entry
        if (typeof offset !== 'number' || !boundaries.has(instruction.pc + offset)) {
          errors.push(`PC ${instruction.pc}`)
        }
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

function qnameIdentity(value: unknown, abc: any, strings: string[]): QNameIdentity | null {
  if (!value || typeof value !== 'object' || !('kind' in value) || !('data' in value)) return null
  const candidate = value as { kind?: unknown; data?: { ns?: unknown; name?: unknown } }
  if (![7, 13].includes(Number(candidate.kind))) return null
  if (typeof candidate.data?.ns !== 'number' || typeof candidate.data.name !== 'number') return null
  const namespace = abc.constant_pool.namespace[candidate.data.ns - 1]
  if (!namespace || typeof namespace.kind !== 'number' || typeof namespace.name !== 'number') return null
  return {
    kind: Number(candidate.kind),
    namespaceIndex: candidate.data.ns,
    namespaceKind: namespace.kind,
    namespaceUri: strings[namespace.name - 1] ?? '',
    nameIndex: candidate.data.name,
    name: strings[candidate.data.name - 1] ?? '',
  }
}

function qnameKey(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('kind' in value) || !('data' in value)) return null
  const candidate = value as { kind?: unknown; data?: { ns?: unknown; name?: unknown } }
  if (![7, 13].includes(Number(candidate.kind))) return null
  if (typeof candidate.data?.ns !== 'number' || typeof candidate.data.name !== 'number') return null
  return `${candidate.data.ns}:${candidate.data.name}`
}

const RECORD_PATTERNS = {
  GameModeType: /<GameModeType\b([^>]*)>([\s\S]*?)<\/GameModeType>/g,
  ScoringType: /<ScoringType\b([^>]*)>([\s\S]*?)<\/ScoringType>/g,
  CustomGameType: /<CustomGameType\b([^>]*)>([\s\S]*?)<\/CustomGameType>/g,
} as const
const ATTRIBUTE_PATTERNS = {
  GameModeName: /\bGameModeName="([^"]*)"/,
  ScoringName: /\bScoringName="([^"]*)"/,
  CustomGameName: /\bCustomGameName="([^"]*)"/,
} as const

function elementRecords(xml: string, tag: keyof typeof RECORD_PATTERNS): Array<{ attributes: string; body: string }> {
  return [...xml.matchAll(RECORD_PATTERNS[tag])].map((match) => ({ attributes: match[1], body: match[2] }))
}

function attribute(attributes: string, name: keyof typeof ATTRIBUTE_PATTERNS): string | null {
  return attributes.match(ATTRIBUTE_PATTERNS[name])?.[1] ?? null
}

function scoringType(body: string): string | null {
  return body.match(/<ScoringType>([\s\S]*?)<\/ScoringType>/)?.[1] ?? null
}

const abcPath = argument('--abc')
const modeTypesPath = argument('--mode-types')
const scoringTypesPath = argument('--scoring-types')
const customGameTypesPath = argument('--custom-game-types')
if (!abcPath || !modeTypesPath || !scoringTypesPath || !customGameTypesPath) {
  process.stderr.write(
    'usage: bun match_tick_closure_provenance.ts --abc <main.abc> --mode-types <Game.swz.17.xml> --scoring-types <Game.swz.43.xml> --custom-game-types <Game.swz.10.xml>\n',
  )
  process.exit(64)
}

const abcBytes = readPinned(abcPath, EXPECTED_ABC_SHA256, 'ABC')
const modeTypesBytes = readPinned(modeTypesPath, EXPECTED_MODE_TYPES_SHA256, 'GameModeTypes')
const scoringTypesBytes = readPinned(scoringTypesPath, EXPECTED_SCORING_TYPES_SHA256, 'ScoringTypes')
const customGameTypesBytes = readPinned(customGameTypesPath, EXPECTED_CUSTOM_GAME_TYPES_SHA256, 'CustomGameTypes')
const abc: any = AbcFile.read(new ExtendedBuffer(abcBytes))
const strings = abc.constant_pool.string as string[]
const multinames = abc.constant_pool.multiname as unknown[]
const buildStrings = strings.filter((value) => /^\d+\.\d+\.\d+$/.test(value))
assert(buildStrings.length === 1 && buildStrings[0] === EXPECTED_BUILD, 'ABC build mismatch')
assert(abc.method_body.length === EXPECTED_BODY_COUNT, `expected ${EXPECTED_BODY_COUNT} method bodies`)

const disassembler = new InstructionDisassembler(abc)
const methods = new Map<number, LocatedInstruction[]>()
const semanticInstructions = new Map<number, Instruction[]>()
const exceptionHandlerCounts = new Map<number, number>()
const branchErrors: string[] = []
for (const body of abc.method_body) {
  const decoded = disassembler.disassemble(body) as Instruction[]
  const located = locateInstructions(body.code, decoded)
  methods.set(body.method, located)
  semanticInstructions.set(body.method, decoded)
  exceptionHandlerCounts.set(body.method, body.exception?.length ?? 0)
  branchErrors.push(...validateBranches(located, body.code.length).map((pc) => `method ${body.method} ${pc}`))
}
assert(branchErrors.length === 0, `invalid branch targets: ${branchErrors.slice(0, 10).join(', ')}`)

const owners = new Map<number, MethodOwner>()
const traitMethodsByQName = new Map<string, TraitMethod[]>()
const constructorsByQName = new Map<string, number[]>()
const nameAt = (index: number): string => multinameName(multinames[index - 1], strings)
const addTrait = (trait: any, owner: MethodOwner): void => {
  if (trait.data?.method === undefined) return
  owners.set(trait.data.method, owner)
  const key = qnameKey(multinames[trait.name - 1])
  if (!key) return
  const entries = traitMethodsByQName.get(key) ?? []
  entries.push({ ...owner, methodId: trait.data.method, kind: trait.kind & 0x0f })
  traitMethodsByQName.set(key, entries)
}
for (let classIndex = 0; classIndex < abc.instance.length; classIndex++) {
  const className = nameAt(abc.instance[classIndex].name)
  const instanceOwner = { classIndex, className, traitName: '<iinit>', static: false }
  const classOwner = { classIndex, className, traitName: '<cinit>', static: true }
  owners.set(abc.instance[classIndex].iinit, instanceOwner)
  owners.set(abc.class[classIndex].cinit, classOwner)
  const classKey = qnameKey(multinames[abc.instance[classIndex].name - 1])
  if (classKey)
    constructorsByQName.set(classKey, [...(constructorsByQName.get(classKey) ?? []), abc.instance[classIndex].iinit])
  for (const trait of abc.instance[classIndex].trait ?? []) {
    addTrait(trait, { classIndex, className, traitName: nameAt(trait.name), static: false })
  }
  for (const trait of abc.class[classIndex].traits ?? []) {
    addTrait(trait, { classIndex, className, traitName: nameAt(trait.name), static: true })
  }
}
for (let scriptIndex = 0; scriptIndex < abc.script.length; scriptIndex++) {
  const owner = { classIndex: -1, className: `<script ${scriptIndex}>`, traitName: '<init>', static: true }
  owners.set(abc.script[scriptIndex].init, owner)
  for (const trait of abc.script[scriptIndex].trait ?? []) {
    addTrait(trait, { ...owner, traitName: nameAt(trait.name) })
  }
}

for (const methodId of ANCHOR_METHODS.keys()) assert(methods.has(methodId), `anchor method ${methodId} is missing`)
const anchorMethodHashes = [...ANCHOR_METHODS].map(([methodId, role]) => ({
  methodId,
  role,
  owner: owners.get(methodId) ?? null,
  instructionObjectSha256: sha256(JSON.stringify(semanticInstructions.get(methodId))),
}))

const rootSites: RootSite[] = []
for (const methodId of ROOT_METHODS.keys()) {
  for (const instruction of methods.get(methodId) ?? []) {
    if (instruction.id === FUNCTION_CREATION_OPCODE_ID) {
      const functionMethodId = typeof instruction.params[0] === 'number' ? instruction.params[0] : null
      rootSites.push({
        methodId,
        pc: instruction.pc,
        opcode: instruction.name,
        property: null,
        qname: null,
        candidateMethodIds: functionMethodId === null ? [] : [functionMethodId],
        nativeIdentity: null,
        receiverEvidence: null,
        resolutionBlocker: 'function target is direct but callback invocation sites are not proven',
      })
      continue
    }
    if (DIRECT_CALLS.has(instruction.name)) {
      const directMethodId = typeof instruction.params[0] === 'number' ? instruction.params[0] : null
      rootSites.push({
        methodId,
        pc: instruction.pc,
        opcode: instruction.name,
        property: null,
        qname: null,
        candidateMethodIds: directMethodId === null ? [] : [directMethodId],
        nativeIdentity: null,
        receiverEvidence: null,
        resolutionBlocker: directMethodId === null ? 'direct method operand is not numeric' : 'none-direct-method-id',
      })
      continue
    }
    if (INDIRECT_CALLS.has(instruction.name)) {
      rootSites.push({
        methodId,
        pc: instruction.pc,
        opcode: instruction.name,
        property: null,
        qname: null,
        candidateMethodIds: [],
        nativeIdentity: null,
        receiverEvidence: null,
        resolutionBlocker: 'stack callable or receiver type is not proven',
      })
      continue
    }
    if (!PROPERTY_CALLS.has(instruction.name) && instruction.name !== CONSTRUCT_PROPERTY) continue
    const multiname = instruction.params[0]
    const qname = qnameIdentity(multiname, abc, strings)
    const key = qnameKey(multiname)
    const candidates =
      instruction.name === CONSTRUCT_PROPERTY
        ? key
          ? (constructorsByQName.get(key) ?? [])
          : []
        : key
          ? (traitMethodsByQName.get(key) ?? []).map(({ methodId: targetMethodId }) => targetMethodId)
          : []
    rootSites.push({
      methodId,
      pc: instruction.pc,
      opcode: instruction.name,
      property: multinameName(multiname, strings) || null,
      qname,
      candidateMethodIds: [...new Set(candidates)].sort((left, right) => left - right),
      nativeIdentity: null,
      receiverEvidence: null,
      resolutionBlocker:
        key === null
          ? 'runtime or namespace-set multiname target is not closed'
          : 'receiver type and override target are not proven',
    })
  }
}

const nativeBoundarySpecs = [
  { callPc: 1712, receiverPc: 1695, methodName: 'floor', methodNameIndex: 3341 },
  { callPc: 1862, receiverPc: 1853, methodName: 'floor', methodNameIndex: 3341 },
  { callPc: 3556, receiverPc: 3550, methodName: 'sqrt', methodNameIndex: 38545 },
] as const
for (const spec of nativeBoundarySpecs) {
  const call = methods.get(3217)?.find((instruction) => instruction.pc === spec.callPc)
  const receiver = methods.get(3217)?.find((instruction) => instruction.pc === spec.receiverPc)
  assert(call?.name === 'callproperty', `method 3217 PC ${spec.callPc} is not callproperty`)
  assert(receiver?.name === 'getlex', `method 3217 PC ${spec.receiverPc} is not getlex`)
  assert(call.params[1] === 1, `method 3217 PC ${spec.callPc} does not pass one argument`)
  const callQName = qnameIdentity(call.params[0], abc, strings)
  const receiverQName = qnameIdentity(receiver.params[0], abc, strings)
  assert(
    callQName?.kind === 7 &&
      callQName.namespaceIndex === 36 &&
      callQName.namespaceKind === 22 &&
      callQName.namespaceUri === '' &&
      callQName.nameIndex === spec.methodNameIndex &&
      callQName.name === spec.methodName,
    `method 3217 PC ${spec.callPc} native method QName changed`,
  )
  assert(
    receiverQName?.kind === 7 &&
      receiverQName.namespaceIndex === 36 &&
      receiverQName.namespaceKind === 22 &&
      receiverQName.namespaceUri === '' &&
      receiverQName.nameIndex === 16384 &&
      receiverQName.name === 'Math',
    `method 3217 PC ${spec.receiverPc} Math receiver QName changed`,
  )
  const site = rootSites.find((candidate) => candidate.methodId === 3217 && candidate.pc === spec.callPc)
  assert(site && site.candidateMethodIds.length === 0, `method 3217 PC ${spec.callPc} native site changed`)
  site.nativeIdentity = `Math.${spec.methodName}`
  site.receiverEvidence = { pc: spec.receiverPc, opcode: receiver.name, qname: receiverQName }
  site.resolutionBlocker = 'native ABC-external method is not closed'
}

const unresolvedRootSites = rootSites.filter((site) => site.resolutionBlocker !== 'none-direct-method-id')
assert(unresolvedRootSites.length > 0, 'expected unresolved executable edges at candidate roots')

const modeRecords = elementRecords(modeTypesBytes.toString('utf8'), 'GameModeType')
const nonTemplateModes = modeRecords.filter((record) => attribute(record.attributes, 'GameModeName') !== 'Template')
const modeFamilyCounts = new Map<string, number>()
for (const record of nonTemplateModes) {
  const family = scoringType(record.body)
  assert(family, 'non-template GameModeType lacks ScoringType')
  modeFamilyCounts.set(family, (modeFamilyCounts.get(family) ?? 0) + 1)
}
const scoringRecords = elementRecords(scoringTypesBytes.toString('utf8'), 'ScoringType')
const scoringFamilies = scoringRecords
  .map((record) => attribute(record.attributes, 'ScoringName'))
  .filter((name): name is string => name !== null && name !== 'XLTemplate')
const customGameRecords = elementRecords(customGameTypesBytes.toString('utf8'), 'CustomGameType')
const nonTemplateCustomGames = customGameRecords.filter(
  (record) => attribute(record.attributes, 'CustomGameName') !== 'Template',
)
assert(modeRecords.length === 165 && nonTemplateModes.length === 164, 'GameModeType count changed')
assert(scoringRecords.length === 25 && scoringFamilies.length === 24, 'ScoringType family count changed')
assert(customGameRecords.length === 5 && nonTemplateCustomGames.length === 4, 'CustomGameType count changed')
assert(
  [...modeFamilyCounts.keys()].every((family) => scoringFamilies.includes(family)),
  'GameModeType references an unknown ScoringType family',
)

const blockerLedger = {
  roots: [...ROOT_METHODS].map(([methodId, role]) => ({ methodId, role })),
  unresolvedRootSites,
  modeFamilies: scoringFamilies.sort(),
  nonTemplateModeCount: nonTemplateModes.length,
  nonTemplateCustomGameCount: nonTemplateCustomGames.length,
  methodDeclarationsWithoutBodies: abc.method.length - abc.method_body.length,
}
const blockerLedgerSha256 = sha256(JSON.stringify(blockerLedger))
assert(
  blockerLedgerSha256 === EXPECTED_BLOCKER_LEDGER_SHA256,
  `executable-closure blocker ledger changed: ${blockerLedgerSha256}`,
)

const report = {
  status: 'acceptance-not-met',
  verdict: 'no deletion-tested closed initialization/tick executable graph is established',
  identity: {
    build: EXPECTED_BUILD,
    abcSha256: EXPECTED_ABC_SHA256,
    modeTypesSha256: EXPECTED_MODE_TYPES_SHA256,
    scoringTypesSha256: EXPECTED_SCORING_TYPES_SHA256,
    customGameTypesSha256: EXPECTED_CUSTOM_GAME_TYPES_SHA256,
  },
  decode: {
    methodDeclarations: abc.method.length,
    decodedMethodBodies: methods.size,
    declarationsWithoutBodies: abc.method.length - abc.method_body.length,
    classCount: abc.instance.length,
    classInitializerCount: abc.instance.length * 2,
    scriptInitializerCount: abc.script.length,
    candidateRootExceptionHandlers: Object.fromEntries(
      [...ROOT_METHODS.keys()].map((methodId) => [methodId, exceptionHandlerCounts.get(methodId) ?? 0]),
    ),
    branchTargetsValid: true,
  },
  modeVocabulary: {
    nonTemplateModes: nonTemplateModes.length,
    scoringFamilies: scoringFamilies.length,
    nonTemplateCustomGames: nonTemplateCustomGames.length,
    modeFamilyCounts: Object.fromEntries([...modeFamilyCounts].sort(([left], [right]) => left.localeCompare(right))),
  },
  candidateRoots: [...ROOT_METHODS].map(([methodId, role]) => ({ methodId, role })),
  rootExecutableFrontier: {
    inspectedSiteCount: rootSites.length,
    unresolvedSiteCount: unresolvedRootSites.length,
    blockerLedgerSha256,
    sites: rootSites,
  },
  anchorMethodHashes,
  acceptance: {
    completeProducerFamilyMatrix: false,
    transitiveGraphPublished: false,
    classAndScriptInitializersClosed: false,
    virtualAndPropertyDispatchClosed: false,
    callbackAndReflectionClosed: false,
    nativeCallsClosed: false,
    deletionTestsPassed: false,
  },
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
