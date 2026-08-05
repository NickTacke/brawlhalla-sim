import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'

type Instruction = { id: number; name: string; params: unknown[]; types: string[] }
type LocatedInstruction = Instruction & { index: number; pc: number; endPc: number }
type MethodOwner = { classIndex: number; className: string; traitName: string; static: boolean }
type TraitSummary = { name: string; kind: number; method: number | null; type: string }

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_METHOD_BODIES = 15_010
const ACTIVE_POWER_CLASS_INDEX = 4
const COMBAT_POWER_CLASS_INDEX = 87
const SCREEN_REGISTRY_CLASS_INDEX = 505
const REGION_EDITOR_CLASS_INDEX = 553
const REGION_VIEW_CLASS_INDEX = 554
const REGION_CLASS_INDEX = 729
const EXPECTED_SCREEN_SLOT_EXACT_QNAME_LEDGER_SHA256 =
  '69523d61578fd029e45c93c895c694c5f8d784f8aabed3e8b1f9b24232d62208'
const EXPECTED_REGION_CLASS_REFERENCE_LEDGER_SHA256 = '80d17126f143e2fac52aa074c29d1d6a5479180fb3e4bdd24d9e74eb17beb735'
const EXPECTED_REGION_TRAIT_LEDGER_SHA256 = 'b86745a942021601b1111b17892a74102a3fefaffea95e6e82e0182cbdd28dce'
const EXPECTED_REGION_METHOD_INVENTORY_SHA256 = '9a821870d66ca7b19036ddfaa97fec72118af1c628cec9449a38c5d834a28f6a'

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
        errors.push(`PC ${instruction.pc}`)
      }
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
        owners.set(trait.data.method, {
          classIndex,
          className,
          traitName: nameAt(trait.name),
          static: group.static,
        })
      }
    }
  }
  for (let scriptIndex = 0; scriptIndex < abc.script.length; scriptIndex++) {
    owners.set(abc.script[scriptIndex].init, {
      classIndex: -1,
      className: `<script ${scriptIndex}>`,
      traitName: '<init>',
      static: true,
    })
  }
  return owners
}

function instructionName(instruction: Instruction, strings: string[]): string {
  if (instruction.name === 'pushstring') return String(instruction.params[0] ?? '')
  return multinameName(instruction.params[0], strings)
}

function displayOperand(value: unknown, strings: string[]): unknown {
  if (Array.isArray(value)) return value.map((entry) => displayOperand(entry, strings))
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) return value
  return multinameName(value, strings) || null
}

function requireAt(
  methods: Map<number, LocatedInstruction[]>,
  strings: string[],
  methodId: number,
  instructionIndex: number,
  opcode: string,
  name?: string,
): { index: number; pc: number; opcode: string; name: string } {
  const instruction = methods.get(methodId)?.[instructionIndex]
  assert(instruction, `method ${methodId} lacks instruction ${instructionIndex}`)
  assert(instruction.name === opcode, `method ${methodId} instruction ${instructionIndex} is not ${opcode}`)
  const actualName = instructionName(instruction, strings)
  if (name !== undefined) {
    assert(actualName === name, `method ${methodId} instruction ${instructionIndex} does not name ${name}`)
  }
  return { index: instructionIndex, pc: instruction.pc, opcode, name: actualName }
}

function traceRange(
  methods: Map<number, LocatedInstruction[]>,
  strings: string[],
  methodId: number,
  startIndex: number,
  endIndex: number,
): Array<{ index: number; pc: number; opcode: string; name: string; operands: unknown[] }> {
  const instructions = methods.get(methodId)
  assert(
    instructions?.[startIndex] && instructions[endIndex],
    `method ${methodId} lacks trace ${startIndex}..${endIndex}`,
  )
  return instructions.slice(startIndex, endIndex + 1).map((instruction) => ({
    index: instruction.index,
    pc: instruction.pc,
    opcode: instruction.name,
    name: instructionName(instruction, strings),
    operands: instruction.params.map((value) => displayOperand(value, strings)),
  }))
}

function className(abc: any, strings: string[], classIndex: number): string {
  return multinameName(abc.constant_pool.multiname[abc.instance[classIndex].name - 1], strings)
}

function traitSummary(abc: any, strings: string[], trait: any): TraitSummary {
  return {
    name: multinameName(abc.constant_pool.multiname[trait.name - 1], strings),
    kind: trait.kind,
    method: trait.data?.method ?? null,
    type: trait.data?.type_name ? multinameName(abc.constant_pool.multiname[trait.data.type_name - 1], strings) : '',
  }
}

function requireTrait(abc: any, strings: string[], classIndex: number, name: string, staticTrait: boolean): any {
  const traits = staticTrait ? (abc.class[classIndex].traits ?? []) : (abc.instance[classIndex].trait ?? [])
  const matches = traits.filter(
    (trait: any) => multinameName(abc.constant_pool.multiname[trait.name - 1], strings) === name,
  )
  assert(matches.length === 1, `expected one ${staticTrait ? 'static' : 'instance'} ${classIndex}.${name} trait`)
  return matches[0]
}

function exactReferences(
  methods: Map<number, LocatedInstruction[]>,
  owners: Map<number, MethodOwner>,
  qname: string,
): Array<{
  methodId: number
  owner: MethodOwner | null
  references: Array<{ index: number; pc: number; opcode: string }>
}> {
  return [...methods.entries()]
    .map(([methodId, instructions]) => ({
      methodId,
      owner: owners.get(methodId) ?? null,
      references: instructions
        .filter((instruction) => qnameKey(instruction.params[0]) === qname)
        .map((instruction) => ({ index: instruction.index, pc: instruction.pc, opcode: instruction.name })),
    }))
    .filter((entry) => entry.references.length > 0)
}

function methodSignature(abc: any, strings: string[], methodId: number): { parameters: string[]; returns: string } {
  const method = abc.method[methodId]
  const nameAt = (index: number): string =>
    index ? multinameName(abc.constant_pool.multiname[index - 1], strings) : '*'
  return {
    parameters: (method.param_type ?? []).map(nameAt),
    returns: nameAt(method.return_type),
  }
}

const abcPath = argument('--abc')
assert(abcPath, 'usage: bun offensive_collision_transform_provenance.ts --abc <main.abc>')

const abcBytes = readFileSync(resolve(abcPath))
const abcSha256 = sha256(new Uint8Array(abcBytes))
assert(abcSha256 === EXPECTED_ABC_SHA256, `ABC SHA-256 mismatch: ${abcSha256}`)

const abc: any = AbcFile.read(new ExtendedBuffer(abcBytes))
const strings = abc.constant_pool.string as string[]
const buildStrings = strings.filter((value) => /^\d+\.\d+\.\d+$/.test(value))
assert(buildStrings.length === 1 && buildStrings[0] === EXPECTED_BUILD, 'ABC build mismatch')
assert(abc.method_body.length === EXPECTED_METHOD_BODIES, `decoded method count is ${abc.method_body.length}`)

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
assert(className(abc, strings, ACTIVE_POWER_CLASS_INDEX) === '_-M5v', 'active-power class changed')
assert(className(abc, strings, COMBAT_POWER_CLASS_INDEX) === '_-Y4C', 'combat power class changed')
assert(className(abc, strings, SCREEN_REGISTRY_CLASS_INDEX) === '_-Cn', 'screen registry class changed')
assert(className(abc, strings, REGION_EDITOR_CLASS_INDEX) === '_-z1K', 'region editor class changed')
assert(className(abc, strings, REGION_VIEW_CLASS_INDEX) === '_-y4v', 'region view class changed')
assert(className(abc, strings, REGION_CLASS_INDEX) === '_-b20', 'region class changed')
assert(
  owners.get(46)?.classIndex === ACTIVE_POWER_CLASS_INDEX && owners.get(46)?.traitName === '_-81I',
  'active tick changed',
)
assert(
  owners.get(1537)?.classIndex === COMBAT_POWER_CLASS_INDEX && owners.get(1537)?.traitName === '_-vk',
  'combat geometry method changed',
)
assert(
  owners.get(1540)?.classIndex === COMBAT_POWER_CLASS_INDEX && owners.get(1540)?.traitName === '_-06D',
  'combat hit-test method changed',
)
assert(
  owners.get(10239)?.classIndex === REGION_EDITOR_CLASS_INDEX && owners.get(10239)?.traitName === '_-j5S',
  'editor forwarder changed',
)
assert(
  owners.get(10280)?.classIndex === REGION_VIEW_CLASS_INDEX && owners.get(10280)?.traitName === '_-j5S',
  'view forwarder changed',
)
assert(
  owners.get(13561)?.classIndex === REGION_CLASS_INDEX &&
    owners.get(13561)?.traitName === '_-S4l' &&
    owners.get(13561)?.static,
  'factory changed',
)

const screenField = requireTrait(abc, strings, SCREEN_REGISTRY_CLASS_INDEX, '_-ix', true)
assert(screenField.kind === 0, '_-Cn._-ix is no longer a slot')
assert(
  multinameName(abc.constant_pool.multiname[screenField.data.type_name - 1], strings) === '_-y4v',
  '_-Cn._-ix no longer has static type _-y4v',
)
const regionViewSubclasses = abc.instance
  .map((instance: any, classIndex: number) => ({ instance, classIndex }))
  .filter(({ instance }: { instance: any }) => instance.super_name === abc.instance[REGION_VIEW_CLASS_INDEX].name)
assert(regionViewSubclasses.length === 0, '_-y4v gained a subclass')
const screenSlotQName = qnameKey(abc.constant_pool.multiname[screenField.name - 1])
assert(screenSlotQName, '_-Cn._-ix is not an exact QName')
const screenSlotReferences = exactReferences(methods, owners, screenSlotQName)
const screenSlotExactQNameLedgerSha256 = sha256(JSON.stringify(screenSlotReferences))
assert(
  screenSlotExactQNameLedgerSha256 === EXPECTED_SCREEN_SLOT_EXACT_QNAME_LEDGER_SHA256,
  `screen slot exact-QName ledger changed: ${screenSlotExactQNameLedgerSha256}`,
)
const screenSlotExactQNameWrites = screenSlotReferences.flatMap((entry) =>
  entry.references
    .filter((reference) => reference.opcode === 'initproperty' || reference.opcode === 'setproperty')
    .map((reference) => ({ methodId: entry.methodId, index: reference.index, opcode: reference.opcode })),
)
assert(
  JSON.stringify(screenSlotExactQNameWrites) ===
    JSON.stringify([
      { methodId: 9235, index: 1621, opcode: 'initproperty' },
      { methodId: 9236, index: 427, opcode: 'initproperty' },
    ]),
  `unexpected exact-QName _-Cn._-ix writes: ${JSON.stringify(screenSlotExactQNameWrites)}`,
)

const activeForwardQName = qnameKey(methods.get(46)?.[1334]?.params[0])
assert(activeForwardQName, 'active forwarding call is not an exact QName')
const editorForwardQName = qnameKey(
  abc.constant_pool.multiname[requireTrait(abc, strings, REGION_EDITOR_CLASS_INDEX, '_-j5S', false).name - 1],
)
const viewForwardQName = qnameKey(
  abc.constant_pool.multiname[requireTrait(abc, strings, REGION_VIEW_CLASS_INDEX, '_-j5S', false).name - 1],
)
assert(
  activeForwardQName === editorForwardQName && activeForwardQName === viewForwardQName,
  '_-j5S QName relation changed',
)

const regionClassQName = qnameKey(abc.constant_pool.multiname[abc.instance[REGION_CLASS_INDEX].name - 1])
assert(regionClassQName, '_-b20 is not an exact QName')
const regionClassReferences = exactReferences(methods, owners, regionClassQName)
const regionClassReferenceLedgerSha256 = sha256(JSON.stringify(regionClassReferences))
assert(
  regionClassReferenceLedgerSha256 === EXPECTED_REGION_CLASS_REFERENCE_LEDGER_SHA256,
  `region class reference ledger changed: ${regionClassReferenceLedgerSha256}`,
)

const regionTraits = [
  ...(abc.instance[REGION_CLASS_INDEX].trait ?? []),
  ...(abc.class[REGION_CLASS_INDEX].traits ?? []),
]
const regionMethodInventory = regionTraits.map((trait: any) => traitSummary(abc, strings, trait))
const regionMethodInventorySha256 = sha256(JSON.stringify(regionMethodInventory))
assert(
  regionMethodInventorySha256 === EXPECTED_REGION_METHOD_INVENTORY_SHA256,
  `region method inventory changed: ${regionMethodInventorySha256}`,
)
const regionTraitLedger = regionTraits
  .filter((trait: any) => trait.data?.method !== undefined)
  .map((trait: any) => {
    const qname = qnameKey(abc.constant_pool.multiname[trait.name - 1])
    assert(qname, 'region method trait is not an exact QName')
    return {
      trait: traitSummary(abc, strings, trait),
      references: exactReferences(methods, owners, qname),
    }
  })
const regionTraitLedgerSha256 = sha256(JSON.stringify(regionTraitLedger))
assert(
  regionTraitLedgerSha256 === EXPECTED_REGION_TRAIT_LEDGER_SHA256,
  `region trait ledger changed: ${regionTraitLedgerSha256}`,
)

const classConsumerIndexes = [...new Set(regionClassReferences.map((entry) => entry.owner?.classIndex ?? -1))].sort(
  (left, right) => left - right,
)
assert(
  JSON.stringify(classConsumerIndexes) ===
    JSON.stringify([-1, REGION_EDITOR_CLASS_INDEX, REGION_VIEW_CLASS_INDEX, REGION_CLASS_INDEX]),
  `unexpected _-b20 consumer classes: ${classConsumerIndexes.join(', ')}`,
)

const anchors = {
  activeCombatHitTest: requireAt(methods, strings, 46, 973, 'callproperty', '_-06D'),
  combatGeometryMethod: requireAt(methods, strings, 1540, 410, 'callproperty', '_-vk'),
  screenSlotConstruct: requireAt(methods, strings, 9235, 1617, 'constructprop', '_-y4v'),
  screenSlotAssign: requireAt(methods, strings, 9235, 1621, 'initproperty', '_-ix'),
  screenSlotClear: requireAt(methods, strings, 9236, 427, 'initproperty', '_-ix'),
  activeReceiverClass: requireAt(methods, strings, 46, 1295, 'getlex', '_-Cn'),
  activeReceiverSlot: requireAt(methods, strings, 46, 1296, 'getproperty', '_-ix'),
  activeCenterX: requireAt(methods, strings, 46, 1303, 'getproperty', '_-K5E'),
  activeCenterY: requireAt(methods, strings, 46, 1309, 'getproperty', '_-Ie'),
  activeRadiusX: requireAt(methods, strings, 46, 1315, 'getproperty', '_-i45'),
  activeRadiusY: requireAt(methods, strings, 46, 1321, 'getproperty', '_-h2W'),
  activeForward: requireAt(methods, strings, 46, 1334, 'callpropvoid', '_-j5S'),
  viewFactory: requireAt(methods, strings, 10280, 38, 'callproperty', '_-S4l'),
  viewQueue: requireAt(methods, strings, 10280, 45, 'callpropvoid', 'push'),
  factoryConstruct: requireAt(methods, strings, 13561, 25, 'constructprop', '_-b20'),
  factoryPhaseIndex: requireAt(methods, strings, 13561, 73, 'callproperty', '_-03K'),
  factorySpecialSubtractX: requireAt(methods, strings, 13561, 83, 'subtract'),
  factorySpecialSubtractY: requireAt(methods, strings, 13561, 92, 'subtract'),
  factoryPointSubtractX: requireAt(methods, strings, 13561, 127, 'subtract'),
  factoryPointAddX: requireAt(methods, strings, 13561, 141, 'add'),
  factoryPointSubtractY: requireAt(methods, strings, 13561, 155, 'subtract'),
  factorySetCenter: requireAt(methods, strings, 13561, 160, 'callpropvoid', '_-J4i'),
  factorySetRadii: requireAt(methods, strings, 13561, 164, 'callpropvoid', '_-j4Z'),
  factorySetOwner: requireAt(methods, strings, 13561, 169, 'callpropvoid', '_-w2C'),
  radiusInputXToInt: requireAt(methods, strings, 13537, 4, 'convert_i'),
  radiusInputYToInt: requireAt(methods, strings, 13537, 8, 'convert_i'),
  radiusRootScaleX: requireAt(methods, strings, 13537, 14, 'getproperty', 'scaleX'),
  radiusLayerScaleX: requireAt(methods, strings, 13537, 30, 'getproperty', 'scaleX'),
  radiusWorldScaleX: requireAt(methods, strings, 13537, 46, 'getproperty', 'scaleX'),
  radiusToDiameterX: requireAt(methods, strings, 13537, 63, 'multiply'),
  centerMirror: requireAt(methods, strings, 13540, 15, 'multiply'),
  centerRootScaleX: requireAt(methods, strings, 13540, 22, 'getproperty', 'scaleX'),
  centerLayerScaleX: requireAt(methods, strings, 13540, 38, 'getproperty', 'scaleX'),
  centerWorldScaleX: requireAt(methods, strings, 13540, 54, 'getproperty', 'scaleX'),
  ownerLocalToGlobal: requireAt(methods, strings, 13535, 114, 'callpropvoid', 'localToGlobal'),
  ownerGlobalToLocal: requireAt(methods, strings, 13535, 119, 'callproperty', 'globalToLocal'),
  ownerAddsCenterX: requireAt(methods, strings, 13535, 152, 'add'),
  targetMethodThreeSkipsCenter: requireAt(methods, strings, 13535, 146, 'iffalse'),
  containsLeftInclusive: requireAt(methods, strings, 13557, 6, 'ifnle'),
  containsRightInclusive: requireAt(methods, strings, 13557, 15, 'lessequals'),
  containsTopInclusive: requireAt(methods, strings, 13557, 21, 'ifnle'),
  containsBottomInclusive: requireAt(methods, strings, 13557, 29, 'lessequals'),
  queuedOwnerRefresh: requireAt(methods, strings, 10247, 27, 'callpropvoid', '_-w2C'),
}

const constructorSignature = methodSignature(abc, strings, 13533)
const factorySignature = methodSignature(abc, strings, 13561)
const viewForwardSignature = methodSignature(abc, strings, 10280)
const pointContainmentSignature = methodSignature(abc, strings, 13557)
assert(
  JSON.stringify(constructorSignature.parameters) ===
    JSON.stringify(['_-u16', 'uint', 'Boolean', 'PowerType', 'Boolean', 'Boolean']),
  'region constructor signature changed',
)
assert(factorySignature.parameters.length === 12 && factorySignature.returns === '_-b20', 'factory signature changed')
assert(
  viewForwardSignature.parameters.length === 11 && viewForwardSignature.returns === 'void',
  'view forwarder signature changed',
)
assert(
  JSON.stringify(pointContainmentSignature) ===
    JSON.stringify({ parameters: ['Number', 'Number'], returns: 'Boolean' }),
  'point containment signature changed',
)

const traces = {
  activeSelectionAndTypedDispatch: traceRange(methods, strings, 46, 1295, 1334),
  selectedViewForwarder: traceRange(methods, strings, 10280, 20, 60),
  factory: traceRange(methods, strings, 13561, 18, 190),
  constructor: traceRange(methods, strings, 13533, 20, 72),
  ownerAnchorAndBounds: traceRange(methods, strings, 13535, 57, 188),
  radiusScale: traceRange(methods, strings, 13537, 2, 75),
  centerScale: traceRange(methods, strings, 13540, 2, 96),
  pointContainment: traceRange(methods, strings, 13557, 2, 36),
  laterOwnerRefresh: traceRange(methods, strings, 10247, 17, 27),
}

process.stdout.write(
  `${JSON.stringify(
    {
      status: 'proven-b20-axis-aligned-screen-region',
      identity: {
        build: EXPECTED_BUILD,
        abcSha256,
        decodedMethodBodies: abc.method_body.length,
        branchTargetsValid: true,
      },
      correctedDispatch: {
        gameplayPathBeforeProjection: { hitTestMethodId: 1540, geometryMethodId: 1537 },
        activeCall: { methodId: 46, receiver: '_-Cn._-ix', receiverStaticType: '_-y4v' },
        receiverEvidence: {
          exactConstructedClass: '_-y4v',
          subclassCountInPinnedAbc: regionViewSubclasses.length,
          exactQNameWrites: screenSlotExactQNameWrites,
          exactQNameLedgerSha256: screenSlotExactQNameLedgerSha256,
          scope: 'exact-QName accesses in the pinned ABC; runtime multiname accesses are not claimed closed',
        },
        sharedQNameImplementations: [
          { classIndex: REGION_EDITOR_CLASS_INDEX, methodId: 10239 },
          { classIndex: REGION_VIEW_CLASS_INDEX, methodId: 10280 },
        ],
        selectedImplementation: { classIndex: REGION_VIEW_CLASS_INDEX, methodId: 10280 },
        factoryMethodId: 13561,
      },
      primitive: {
        representation: 'axis-aligned rectangle stored as left, top, width, height',
        offensiveInput: 'center plus X/Y radii; type 0 doubles transformed radii into width/height',
        pointContainment: 'left <= x && x <= left + width && top <= y && y <= top + height',
        boundary: {
          left: 'included',
          top: 'included',
          right: 'included',
          bottom: 'included',
        },
        gameplayDisposition:
          'Direct exact class-QName references occur only in the two screen/tooling classes, _-b20 itself, and script initialization; the reached combat path uses methods 1540 and 1537 instead.',
      },
      worldTransform: {
        scaleX: 'root.scaleX * levelLayer3D.scaleX / world.scaleX',
        scaleY: 'root.scaleY * levelLayer3D.scaleY / world.scaleY',
        facing: 'when the constructor facing flag is true, center X is multiplied by AVM2 pushbyte 255 (-1)',
        width: '2 * radiusX * scaleX for offensive type 0',
        height: '2 * radiusY * scaleY for offensive type 0',
        anchor:
          'world.globalToLocal(root.localToGlobal(sourcePoint)); sourcePoint is the supplied Point for target enums 3/5/13, otherwise the source actor numeric position',
        ordinaryLeft: 'anchorX + transformedCenterX - width / 2',
        ordinaryTop: 'anchorY + transformedCenterY - height / 2',
        targetMethodThreeLeft: 'anchorX - width / 2',
        targetMethodThreeTop: 'anchorY - height / 2',
        laterMutation:
          'queued regions rerun _-w2C to refresh the owner anchor; size is not rescaled there, and no symbol or bone read occurs in the reached factory, setter, anchor, predicate, or refresh traces',
      },
      numericBehavior: {
        selectedGeometryInputs: 'AVM2 int32 after convert_i in method 46',
        transformedStorage: 'AVM2 Number after multiply/divide in bytecode order',
        clampsOrAbsoluteValue: false,
        negativeOrZeroExtent:
          'not normalized; a zero extent includes its single boundary coordinate, while a negative extent admits no finite point',
        nan: 'not normalized; ordered containment comparisons return false',
      },
      closure: {
        classConsumerIndexes,
        screenSlotExactQNameReferences: screenSlotReferences,
        screenSlotExactQNameLedgerSha256,
        regionClassReferences,
        regionClassReferenceLedgerSha256,
        regionTraitLedgerSha256,
        regionMethodInventorySha256,
        regionMethodInventory,
      },
      anchors,
      signatures: {
        constructor: constructorSignature,
        factory: factorySignature,
        selectedViewForwarder: viewForwardSignature,
        pointContainment: pointContainmentSignature,
      },
      traces,
      blockers: [],
      surfacedRoutes: [
        'Issue 77: recover the actual gameplay offensive hitbox-hurtbox intersection routine; _-b20 is a screen/tooling projection and cannot close combat collision semantics.',
        'Correct the issue 34 QName-only dispatch claim from method 10239 to the statically selected method 10280.',
      ],
    },
    null,
    2,
  )}\n`,
)
