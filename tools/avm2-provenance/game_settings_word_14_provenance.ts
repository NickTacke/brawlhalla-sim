import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'
import { BitReader } from '../../packages/replay-format/src/bitstream.js'
import { decodeEnvelope } from '../../packages/replay-format/src/envelope.js'

type Instruction = {
  id: number
  name: string
  params: unknown[]
  types: string[]
}

type LocatedInstruction = Instruction & {
  index: number
  pc: number
  endPc: number
}

type MethodOwner = {
  classIndex: number
  className: string
  traitName: string
  static: boolean
}

type ManifestFixture = {
  file: string
  sha256: string
}

type CorpusManifest = {
  schemaVersion: number
  target: { build: string; replayFormat: number }
  provenance: { abcSha256: string }
  fixtures: ManifestFixture[]
}

type RuleSetSummary = {
  ruleSetId: number
  gadgetCount: number
}

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_FORMAT = 268
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_MANIFEST_SHA256 = 'b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac'
const EXPECTED_RULES_SHA256 = 'f1ee7530c4e0693232c8a4fdc93163f676691259dc2da9e83bc332cf21b3391c'
const EXPECTED_FIXTURE_COUNT = 12
const SETTINGS_CLASS_INDEX = 187
const SETTINGS_TRAIT_NAME = '_-Ii'
const EXPECTED_REFERENCE_COUNTS = new Map([
  [3747, 2],
  [3748, 2],
  [3758, 2],
  [3759, 2],
  [3766, 2],
  [3783, 4],
  [3790, 3],
  [4771, 1],
  [4774, 1],
  [4780, 1],
  [5573, 1],
  [6884, 1],
  [8597, 2],
  [8617, 6],
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

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
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
    assert(typeof countValue === 'number', `array operand has non-numeric count ${String(countValue)}`)
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
    const opcode = code[cursor.offset++]
    assert(opcode === instruction.id, `opcode mismatch at PC ${pc}: expected ${instruction.id}, found ${opcode}`)
    const values: unknown[] = []
    for (const type of instruction.types) values.push(readOperand(type, code, cursor, values))
    return { ...instruction, index, pc, endPc: cursor.offset }
  })
  assert(cursor.offset === code.length, `instruction decode stopped at ${cursor.offset} of ${code.length} bytes`)
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
        errors.push(`PC ${instruction.pc} ${instruction.name} has invalid target`)
      }
    }
    if (instruction.name === 'lookupswitch') {
      const offsets = [instruction.params[0], ...(Array.isArray(instruction.params[2]) ? instruction.params[2] : [])]
      for (const entry of offsets) {
        const offset = Array.isArray(entry) ? entry[1] : entry
        if (typeof offset !== 'number' || !boundaries.has(instruction.pc + offset)) {
          errors.push(`PC ${instruction.pc} lookupswitch has invalid target`)
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
  return owners
}

function instructionName(instruction: Instruction, strings: string[]): string {
  if (instruction.name === 'pushstring') return String(instruction.params[0] ?? '')
  return multinameName(instruction.params[0], strings)
}

function requireInstruction(
  methods: Map<number, LocatedInstruction[]>,
  strings: string[],
  methodId: number,
  opcode: string,
  name: string,
): LocatedInstruction {
  const match = methods
    .get(methodId)
    ?.find((instruction) => instruction.name === opcode && instructionName(instruction, strings) === name)
  assert(match, `method ${methodId} lacks ${opcode} ${name}`)
  return match
}

function instructionRange(
  methods: Map<number, LocatedInstruction[]>,
  methodId: number,
  firstIndex: number,
  lastIndex: number,
): [number, number] {
  const instructions = methods.get(methodId)
  assert(instructions, `method ${methodId} is missing`)
  const first = instructions[firstIndex]
  const last = instructions[lastIndex]
  assert(first && last, `method ${methodId} lacks instruction range ${firstIndex}..${lastIndex}`)
  return [first.pc, last.endPc]
}

function skipString(reader: BitReader): void {
  const byteLength = reader.u16()
  for (let index = 0; index < byteLength; index++) reader.u8()
}

function readState4Prefix(raw: Uint8Array): { word14: number; itemSpawnRuleSetId: number; scoringTypeId: number } {
  const reader = new BitReader(decodeEnvelope(raw))
  assert(reader.u32() === EXPECTED_FORMAT, `replay format is not ${EXPECTED_FORMAT}`)
  assert(reader.bits(4) === 3, 'first replay section is not state 3')
  reader.u32()
  if (reader.u32() !== 0) skipString(reader)
  reader.bool()
  assert(reader.bits(4) === 4, 'state 3 is not followed by state 4')
  const words = Array.from({ length: 15 }, () => reader.u32())
  return { word14: words[13], itemSpawnRuleSetId: words[10], scoringTypeId: words[5] }
}

function readRuleSets(xml: string): RuleSetSummary[] {
  const summaries: RuleSetSummary[] = []
  const records = xml.matchAll(/<ItemSpawnRuleSetType\b[^>]*>(.*?)<\/ItemSpawnRuleSetType>/gs)
  for (const record of records) {
    const body = record[1]
    const idText = body.match(/<RuleSetID>(\d+)<\/RuleSetID>/)?.[1]
    if (!idText) continue
    const gadgetText = body.match(/<GadgetList>(.*?)<\/GadgetList>/s)?.[1]
    const gadgetCount = gadgetText ? gadgetText.split(',').filter((value) => value !== '' && value !== '--').length : 0
    summaries.push({ ruleSetId: Number(idText), gadgetCount })
  }
  return summaries
}

const abcPath = argument('--abc')
const manifestPath = argument('--manifest')
const rulesPath = argument('--item-spawn-rules')
if (!abcPath || !manifestPath || !rulesPath) {
  console.error(
    'usage: bun game_settings_word_14_provenance.ts --abc <main.abc> --manifest <manifest.json> --item-spawn-rules <Game.swz.26.xml>',
  )
  process.exit(64)
}

const abcBytes = readFileSync(resolve(abcPath))
const abcSha256 = sha256(new Uint8Array(abcBytes))
assert(abcSha256 === EXPECTED_ABC_SHA256, `ABC SHA-256 mismatch: found ${abcSha256}`)
const abc: any = AbcFile.read(new ExtendedBuffer(abcBytes))
const strings = abc.constant_pool.string as string[]
const buildStrings = strings.filter((value) => /^\d+\.\d+\.\d+$/.test(value))
assert(buildStrings.length === 1 && buildStrings[0] === EXPECTED_BUILD, 'ABC build string mismatch')
const disassembler = new InstructionDisassembler(abc)
const methods = new Map<number, LocatedInstruction[]>()
const branchErrors: string[] = []
for (const body of abc.method_body) {
  const instructions = locateInstructions(body.code, disassembler.disassemble(body) as Instruction[])
  methods.set(body.method, instructions)
  branchErrors.push(
    ...validateBranches(instructions, body.code.length).map((error) => `method ${body.method}: ${error}`),
  )
}
assert(branchErrors.length === 0, branchErrors.join('\n'))

const owners = buildOwners(abc, strings)
const settingsClass = abc.instance[SETTINGS_CLASS_INDEX]
assert(
  multinameName(abc.constant_pool.multiname[settingsClass.name - 1], strings) === '_-I37',
  'settings class mismatch',
)
const traitDefinitions = (settingsClass.trait as any[]).filter(
  (trait) => multinameName(abc.constant_pool.multiname[trait.name - 1], strings) === SETTINGS_TRAIT_NAME,
)
assert(
  traitDefinitions.length === 1,
  `expected one ${SETTINGS_TRAIT_NAME} definition, found ${traitDefinitions.length}`,
)
const traitDefinition = traitDefinitions[0]
assert((traitDefinition.kind & 0x0f) === 0, `${SETTINGS_TRAIT_NAME} is not a slot trait`)
assert(
  multinameName(abc.constant_pool.multiname[traitDefinition.data.type_name - 1], strings) === 'uint',
  `${SETTINGS_TRAIT_NAME} is not uint`,
)
const targetQName = abc.constant_pool.multiname[traitDefinition.name - 1]
const targetQNameKey = qnameKey(targetQName)
assert(targetQNameKey, `${SETTINGS_TRAIT_NAME} is not an exact QName`)

const exactReferences = [...methods.entries()]
  .map(([methodId, instructions]) => ({
    methodId,
    owner: owners.get(methodId) ?? null,
    references: instructions
      .filter((instruction) => qnameKey(instruction.params[0]) === targetQNameKey)
      .map((instruction) => ({ pc: instruction.pc, opcode: instruction.name })),
  }))
  .filter((entry) => entry.references.length > 0)
assert(exactReferences.length === EXPECTED_REFERENCE_COUNTS.size, 'unexpected exact-trait reference method count')
for (const entry of exactReferences) {
  assert(
    EXPECTED_REFERENCE_COUNTS.get(entry.methodId) === entry.references.length,
    `unexpected ${SETTINGS_TRAIT_NAME} reference count in method ${entry.methodId}`,
  )
}
for (const [methodId] of EXPECTED_REFERENCE_COUNTS) {
  assert(
    exactReferences.some((entry) => entry.methodId === methodId),
    `missing method ${methodId} exact references`,
  )
}

const manifestBytes = readFileSync(resolve(manifestPath))
const manifestSha256 = sha256(new Uint8Array(manifestBytes))
assert(manifestSha256 === EXPECTED_MANIFEST_SHA256, `manifest SHA-256 mismatch: found ${manifestSha256}`)
const manifest = JSON.parse(manifestBytes.toString('utf8')) as CorpusManifest
assert(manifest.schemaVersion === 1, 'manifest schema mismatch')
assert(manifest.target.build === EXPECTED_BUILD && manifest.target.replayFormat === EXPECTED_FORMAT, 'target mismatch')
assert(manifest.provenance.abcSha256 === EXPECTED_ABC_SHA256, 'manifest ABC identity mismatch')
assert(manifest.fixtures.length === EXPECTED_FIXTURE_COUNT, 'fixture count mismatch')
const corpusRows = manifest.fixtures.map((fixture) => {
  const raw = new Uint8Array(readFileSync(join(dirname(resolve(manifestPath)), fixture.file)))
  assert(sha256(raw) === fixture.sha256, `fixture SHA-256 mismatch for ${fixture.sha256}`)
  return readState4Prefix(raw)
})

const rulesBytes = readFileSync(resolve(rulesPath))
const rulesSha256 = sha256(new Uint8Array(rulesBytes))
assert(rulesSha256 === EXPECTED_RULES_SHA256, `item-spawn rules SHA-256 mismatch: found ${rulesSha256}`)
const ruleSets = readRuleSets(rulesBytes.toString('utf8'))
assert(ruleSets.length === 26, `expected 26 item-spawn rule sets, found ${ruleSets.length}`)
const cohortRuleSetIds = [...new Set(corpusRows.map((row) => row.itemSpawnRuleSetId))].sort(
  (left, right) => left - right,
)
const cohortRuleSets = cohortRuleSetIds.map((ruleSetId) => {
  const summary = ruleSets.find((candidate) => candidate.ruleSetId === ruleSetId)
  assert(summary, `cohort rule-set ID ${ruleSetId} is absent from reviewed source`)
  return summary
})

const anchors = {
  settingsWriter: requireInstruction(methods, strings, 3748, 'getproperty', SETTINGS_TRAIT_NAME).pc,
  settingsReader: requireInstruction(methods, strings, 3759, 'initproperty', SETTINGS_TRAIT_NAME).pc,
  replayWriterCall: requireInstruction(methods, strings, 6519, 'callpropvoid', '_-33g').pc,
  replayReaderCall: requireInstruction(methods, strings, 6510, 'callpropvoid', '_-N4v').pc,
  defaultOverride: requireInstruction(methods, strings, 3766, 'initproperty', SETTINGS_TRAIT_NAME).pc,
  validatorMaskRead: requireInstruction(methods, strings, 3783, 'getproperty', SETTINGS_TRAIT_NAME).pc,
  spawnBuilderMaskBranch: requireInstruction(methods, strings, 4779, 'bitand', '').pc,
  gameplayFilterMaskRead: requireInstruction(methods, strings, 5573, 'getproperty', SETTINGS_TRAIT_NAME).pc,
  uiMaskRead: requireInstruction(methods, strings, 8597, 'getproperty', SETTINGS_TRAIT_NAME).pc,
  uiMaskWrite: requireInstruction(methods, strings, 8617, 'initproperty', SETTINGS_TRAIT_NAME).pc,
  gadgetListSourceLabel: requireInstruction(methods, strings, 4818, 'pushstring', 'GadgetList').pc,
  gadgetListTypedResolution: requireInstruction(methods, strings, 4819, 'initproperty', '_-W4N').pc,
  alwaysEquipSourceLabel: requireInstruction(methods, strings, 7279, 'pushstring', 'AlwaysEquipItem').pc,
  gadgetSelectionsEnumLabel: requireInstruction(methods, strings, 8530, 'pushstring', 'Game_GadgetsSelections').pc,
  banGadgetsUiLabel: requireInstruction(methods, strings, 8612, 'pushstring', 'UI_GameSettings_Ban_Gadgets').pc,
  controlFlowRanges: {
    alwaysEquipValidator: instructionRange(methods, 3783, 9, 65),
    spawnBuilderGadgetFilter: instructionRange(methods, 4779, 124, 186),
    spawnTickFilteredVectorUse: instructionRange(methods, 4754, 220, 250),
    itemSelectionAndSpawn: instructionRange(methods, 4791, 0, 23),
    gameplayPowerFilter: instructionRange(methods, 5573, 30, 77),
    uiRandomSingleOverride: instructionRange(methods, 8617, 292, 353),
    uiMultiSelectionToggle: instructionRange(methods, 8617, 693, 713),
  },
}

const word14Values = [...new Set(corpusRows.map((row) => row.word14))].sort((left, right) => left - right)
const scoringTypeIds = [...new Set(corpusRows.map((row) => row.scoringTypeId))].sort((left, right) => left - right)
const output = {
  status: 'proven-for-reviewed-inputs',
  identity: {
    build: EXPECTED_BUILD,
    abcSha256,
    decodedMethodBodies: abc.method_body.length,
    branchTargetsValid: true,
    manifestSha256,
    itemSpawnRulesSha256: rulesSha256,
  },
  field: {
    structuralName: 'disabledGadgetsMask',
    classIndex: SETTINGS_CLASS_INDEX,
    className: '_-I37',
    traitName: SETTINGS_TRAIT_NAME,
    type: 'uint',
    defaultValue: 0,
    bitPolarity: '1 disables the GadgetList entry at the same zero-based index; 0 leaves it enabled',
    serializedRange: [0, 0xffffffff],
    activeBits: 'zero-based indices below the selected ItemSpawnRuleSet GadgetList length',
    alwaysEquipValidation: 'zero is accepted; nonzero requires a gadget list and may not set every active low bit',
  },
  anchors,
  exactTraitReferences: {
    instructionCount: exactReferences.reduce((count, entry) => count + entry.references.length, 0),
    methods: exactReferences,
  },
  reviewedSource: {
    ruleSetCount: ruleSets.length,
    maximumGadgetCount: Math.max(...ruleSets.map((ruleSet) => ruleSet.gadgetCount)),
  },
  reviewedCorpus: {
    fixtureCount: corpusRows.length,
    word14Values,
    scoringTypeIds,
    cohortRuleSets,
  },
}

console.log(JSON.stringify(output, null, 2))
