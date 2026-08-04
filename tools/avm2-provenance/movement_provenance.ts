// PROTOTYPE: determine whether main.abc contains one statically provable fighter
// grounded-jump input path whose vertical-velocity value can be derived without
// fabricated globals, live state, or guessed constants.
// Usage: bun movement_provenance.ts --abc ../main.abc --target grounded-jump-y

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

type Instruction = {
  id: number
  name: string
  params: unknown[]
  types: string[]
}

type AbcDisassemblerModule = {
  AbcFile: { read(input: unknown): any }
  ExtendedBuffer: new (input: Buffer) => any
  InstructionDisassembler: new (
    abc: any,
  ) => {
    disassemble(body: unknown): Instruction[]
  }
}

const { AbcFile, ExtendedBuffer, InstructionDisassembler } = require('abc-disassembler') as AbcDisassemblerModule

type LocatedInstruction = Instruction & {
  index: number
  start: number
  end: number
}

type MethodOwner = {
  classIndex: number
  className: string
  traitName: string
  static: boolean
}

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

function readValue(type: string, code: Buffer, cursor: { offset: number }, priorValues: unknown[]): unknown {
  if (type === 'u8') return code[cursor.offset++]
  if (type === 'offset' || type === 's24') return readS24(code, cursor)
  if (type.startsWith('array')) {
    const countValue = priorValues[priorValues.length - 1]
    if (typeof countValue !== 'number') throw new Error(`array operand has non-numeric count: ${String(countValue)}`)
    const count = countValue + (type.startsWith('array1-') ? 1 : 0)
    const itemType = type.slice(type.indexOf('-') + 1)
    return Array.from({ length: count }, () => readValue(itemType, code, cursor, priorValues))
  }
  return readU30(code, cursor)
}

function locateInstructions(codeBytes: Uint8Array, instructions: Instruction[]): LocatedInstruction[] {
  const code = Buffer.from(codeBytes)
  const cursor = { offset: 0 }
  return instructions.map((instruction, index) => {
    const start = cursor.offset
    const opcode = code[cursor.offset++]
    if (opcode !== instruction.id) {
      throw new Error(`opcode mismatch at byte ${start}: expected ${instruction.id}, got ${opcode}`)
    }
    const values: unknown[] = []
    for (const type of instruction.types) values.push(readValue(type, code, cursor, values))
    return { ...instruction, index, start, end: cursor.offset }
  })
}

function validateBranches(instructions: LocatedInstruction[], codeLength: number): string[] {
  const boundaries = new Set(instructions.map((instruction) => instruction.start))
  // The shipped ABC uses terminal jumps whose target is exactly code_length.
  boundaries.add(codeLength)
  const errors: string[] = []

  for (const instruction of instructions) {
    if (BRANCHES.has(instruction.name)) {
      const offset = instruction.params[0]
      if (typeof offset !== 'number') {
        errors.push(`instruction ${instruction.index} ${instruction.name} has a non-numeric offset`)
        continue
      }
      const target = instruction.end + offset
      if (!boundaries.has(target))
        errors.push(`instruction ${instruction.index} ${instruction.name} targets byte ${target}`)
    }

    if (instruction.name === 'lookupswitch') {
      const offsets = [instruction.params[0], ...(Array.isArray(instruction.params[2]) ? instruction.params[2] : [])]
      for (const entry of offsets) {
        const offset = Array.isArray(entry) ? entry[1] : entry
        if (typeof offset !== 'number') {
          errors.push(`instruction ${instruction.index} lookupswitch has a non-numeric offset`)
          continue
        }
        const target = instruction.start + offset
        if (!boundaries.has(target)) errors.push(`instruction ${instruction.index} lookupswitch targets byte ${target}`)
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

function instructionName(instruction: Instruction, strings: string[]): string {
  if (instruction.name === 'pushstring') return String(instruction.params[0] ?? '')
  return multinameName(instruction.params[0], strings)
}

function instructionNames(instructions: Instruction[], strings: string[]): string[] {
  const names: string[] = []
  for (const instruction of instructions) {
    const name = instructionName(instruction, strings)
    if (name) names.push(name)
  }
  return names
}

function buildMethodOwners(abc: any, strings: string[]): Map<number, MethodOwner> {
  const owners = new Map<number, MethodOwner>()
  const multinames = abc.constant_pool.multiname
  const nameAt = (index: number) => multinameName(multinames[index - 1], strings)

  for (let classIndex = 0; classIndex < abc.instance.length; classIndex++) {
    const className = nameAt(abc.instance[classIndex].name)
    owners.set(abc.instance[classIndex].iinit, { classIndex, className, traitName: '<iinit>', static: false })
    owners.set(abc.class[classIndex].cinit, { classIndex, className, traitName: '<cinit>', static: true })
    const groups = [
      { traits: abc.instance[classIndex].trait, static: false },
      { traits: abc.class[classIndex].traits, static: true },
    ]
    for (const group of groups) {
      for (const trait of group.traits) {
        const kind = trait.kind & 0x0f
        if (kind < 1 || kind > 3 || trait.data?.method === undefined) continue
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

function describeMethod(
  methodId: number,
  owners: Map<number, MethodOwner>,
): { methodId: number; owner: MethodOwner | null } {
  return { methodId, owner: owners.get(methodId) ?? null }
}

const abcPath = argument('--abc')
const target = argument('--target')
if (!abcPath || target !== 'grounded-jump-y') {
  console.error('usage: bun movement_provenance.ts --abc <main.abc> --target grounded-jump-y')
  process.exit(64)
}

const absoluteAbcPath = resolve(abcPath)
const abcBytes = readFileSync(absoluteAbcPath)
const abcSha256 = createHash('sha256').update(new Uint8Array(abcBytes)).digest('hex')
const abc: any = AbcFile.read(new ExtendedBuffer(abcBytes))
const strings = abc.constant_pool.string
const disassembler = new InstructionDisassembler(abc)
const owners = buildMethodOwners(abc, strings)
const methods: Array<{ methodId: number; instructions: LocatedInstruction[] }> = []
const branchErrors: string[] = []

for (const body of abc.method_body) {
  const disassembled = disassembler.disassemble(body) as Instruction[]
  const instructions = locateInstructions(body.code, disassembled)
  branchErrors.push(
    ...validateBranches(instructions, body.code.length).map((error) => `method ${body.method}: ${error}`),
  )
  methods.push({ methodId: body.method, instructions })
}

const multinames = abc.constant_pool.multiname
const methodsById = new Map(methods.map((method) => [method.methodId, method]))
const issues: string[] = []
const buildVersions = strings.filter((value: string) => /^\d+\.\d+\.\d+$/.test(value))
const gameBuild = buildVersions.length === 1 ? buildVersions[0] : undefined
if (!gameBuild) issues.push(`game build: expected one semantic build string, found ${buildVersions.length}`)
if (gameBuild !== EXPECTED_BUILD) issues.push(`game build: expected ${EXPECTED_BUILD}, found ${gameBuild ?? 'none'}`)
if (abcSha256 !== EXPECTED_ABC_SHA256) issues.push(`ABC SHA-256: expected ${EXPECTED_ABC_SHA256}, found ${abcSha256}`)
const gamePatch = gameBuild?.split('.').slice(0, 2).join('.')
const typeName = (index: number): string => multinameName(multinames[index - 1], strings)
const methodTypeNames = (methodId: number): string[] => abc.method[methodId].param_type.map(typeName)
const refersTo = (method: { instructions: LocatedInstruction[] }, name: string): boolean =>
  method.instructions.some((instruction) => instructionName(instruction, strings) === name)
const calls = (method: { instructions: LocatedInstruction[] }, name: string, argumentCount?: number): boolean =>
  method.instructions.some(
    (instruction) =>
      (instruction.name === 'callproperty' || instruction.name === 'callpropvoid') &&
      instructionName(instruction, strings) === name &&
      (argumentCount === undefined || instruction.params[1] === argumentCount),
  )
const findUnique = (
  label: string,
  predicate: (method: { methodId: number; instructions: LocatedInstruction[] }) => boolean,
): { methodId: number; instructions: LocatedInstruction[] } | undefined => {
  const matches = methods.filter(predicate)
  if (matches.length !== 1) issues.push(`${label}: expected one method, found ${matches.length}`)
  return matches.length === 1 ? matches[0] : undefined
}
const classIndexByName = (className: string): number =>
  abc.instance.findIndex((instance: any) => typeName(instance.name) === className)
const classMethods = (classIndex: number): number[] =>
  (abc.instance[classIndex]?.trait ?? [])
    .filter((trait: any) => {
      const kind = trait.kind & 0x0f
      return kind >= 1 && kind <= 3 && trait.data?.method !== undefined
    })
    .map((trait: any) => trait.data.method)
const classTraitMethod = (classIndex: number, traitName: string): number | undefined => {
  const trait = (abc.instance[classIndex]?.trait ?? []).find(
    (candidate: any) => typeName(candidate.name) === traitName && candidate.data?.method !== undefined,
  )
  return trait?.data.method
}
const numericLiteral = (instruction: LocatedInstruction | undefined): number | undefined => {
  if (!instruction) return undefined
  return ['pushbyte', 'pushshort', 'pushint', 'pushuint', 'pushdouble'].includes(instruction.name) &&
    typeof instruction.params[0] === 'number'
    ? instruction.params[0]
    : undefined
}
const literalAssignedTo = (
  propertyName: string,
  candidateMethods: Array<{ methodId: number; instructions: LocatedInstruction[] }>,
): { methodId: number; value: number } | undefined => {
  const matches: Array<{ methodId: number; value: number }> = []
  for (const method of candidateMethods) {
    for (const instruction of method.instructions) {
      if (
        (instruction.name !== 'setproperty' && instruction.name !== 'initproperty') ||
        instructionName(instruction, strings) !== propertyName
      )
        continue
      const prior = method.instructions.slice(Math.max(0, instruction.index - 3), instruction.index).reverse()
      const value = prior.map(numericLiteral).find((candidate) => candidate !== undefined)
      if (value !== undefined) matches.push({ methodId: method.methodId, value })
    }
  }
  return matches.length === 1 ? matches[0] : undefined
}
const localIndex = (
  instruction: LocatedInstruction | undefined,
  operation: 'getlocal' | 'setlocal',
): number | undefined => {
  if (!instruction) return undefined
  if (instruction.name === operation && typeof instruction.params[0] === 'number') return instruction.params[0]
  const match = instruction.name.match(new RegExp(`^${operation}_(\\d)$`))
  return match ? Number(match[1]) : undefined
}
const branchTargetIndex = (
  instructions: LocatedInstruction[],
  branch: LocatedInstruction | undefined,
): number | undefined => {
  if (!branch || typeof branch.params[0] !== 'number') return undefined
  const target = branch.end + branch.params[0]
  const instruction = instructions.find((candidate) => candidate.start === target)
  return instruction?.index
}

const replayDiagnostic = findUnique('replay input diagnostic', (method) =>
  method.instructions.some(
    (instruction) => instruction.name === 'pushstring' && String(instruction.params[0]).includes('Inputs for entId'),
  ),
)
const replayClassName = replayDiagnostic ? owners.get(replayDiagnostic.methodId)?.className : undefined
if (!replayClassName) issues.push('replay record class owner was not resolved')

const jumpMethod = findUnique('fighter jump application', (method) =>
  ['jump.Ground', 'jump.Wall', 'jump.Air'].every((name) => refersTo(method, name)),
)
const jumpOwner = jumpMethod ? owners.get(jumpMethod.methodId) : undefined
if (!jumpOwner || jumpOwner.classIndex < 0) issues.push('fighter jump owner class was not resolved')
const entityClassIndex = jumpOwner?.classIndex ?? -1
const jumpTraitName = jumpOwner?.traitName

const inputMethod = jumpTraitName
  ? findUnique('rising-edge jump input consumer', (method) => {
      const names = method.instructions.map((instruction) => instruction.name)
      return calls(method, jumpTraitName, 1) && names.includes('bitxor') && names.includes('bitand')
    })
  : undefined
const inputOwner = inputMethod ? owners.get(inputMethod.methodId) : undefined
const inputClassIndex = inputOwner?.classIndex ?? -1
if (!inputOwner || inputClassIndex < 0) issues.push('input timeline owner class was not resolved')

const snapshotInsertMethod =
  inputClassIndex >= 0
    ? findUnique('input snapshot insertion', (method) => {
        if (!classMethods(inputClassIndex).includes(method.methodId)) return false
        const parameterTypes = methodTypeNames(method.methodId)
        if (parameterTypes.length !== 1 || !calls(method, 'push')) return false
        const parameterClassIndex = classIndexByName(parameterTypes[0])
        return (
          parameterClassIndex >= 0 &&
          methodTypeNames(abc.instance[parameterClassIndex].iinit).length === 2 &&
          methodTypeNames(abc.instance[parameterClassIndex].iinit).every((name) => name === 'uint')
        )
      })
    : undefined
const snapshotInsertTrait = snapshotInsertMethod ? owners.get(snapshotInsertMethod.methodId)?.traitName : undefined
const snapshotClassName = snapshotInsertMethod ? methodTypeNames(snapshotInsertMethod.methodId)[0] : undefined
const snapshotClassIndex = snapshotClassName ? classIndexByName(snapshotClassName) : -1
if (!snapshotInsertTrait || snapshotClassIndex < 0)
  issues.push('input snapshot class or insertion trait was not resolved')

const snapshotConstructor =
  snapshotClassIndex >= 0 ? methodsById.get(abc.instance[snapshotClassIndex].iinit) : undefined
const constructorProperty = (parameter: number): string | undefined => {
  if (!snapshotConstructor) return undefined
  for (let index = 0; index < snapshotConstructor.instructions.length - 1; index++) {
    if (localIndex(snapshotConstructor.instructions[index], 'getlocal') !== parameter) continue
    const next = snapshotConstructor.instructions[index + 1]
    if (next.name === 'initproperty') return instructionName(next, strings)
  }
  return undefined
}
const timestampField = constructorProperty(1)
const inputMaskField = constructorProperty(2)
if (!timestampField || !inputMaskField)
  issues.push('snapshot timestamp/mask fields were not resolved from its constructor')

const inputSampleMethod =
  inputClassIndex >= 0 && timestampField && inputMaskField
    ? findUnique(
        'timestamp-indexed input sampler',
        (method) =>
          classMethods(inputClassIndex).includes(method.methodId) &&
          typeName(abc.method[method.methodId].return_type) === 'uint' &&
          refersTo(method, timestampField) &&
          refersTo(method, inputMaskField) &&
          method.instructions.length > 100,
      )
    : undefined
const inputSampleTrait = inputSampleMethod ? owners.get(inputSampleMethod.methodId)?.traitName : undefined
const inputSampleCallCount =
  inputMethod && inputSampleTrait
    ? inputMethod.instructions.filter(
        (instruction) =>
          instruction.name === 'callproperty' &&
          instructionName(instruction, strings) === inputSampleTrait &&
          instruction.params[1] === 1,
      ).length
    : 0
if (!inputSampleTrait || inputSampleCallCount === 0)
  issues.push('input consumer does not call the timestamp-indexed snapshot sampler')

const replayLoader =
  replayClassName && snapshotClassName && snapshotInsertTrait
    ? findUnique(
        'replay-to-input timeline loader',
        (method) =>
          methodTypeNames(method.methodId).includes(replayClassName) &&
          method.instructions.some(
            (instruction) =>
              instruction.name === 'constructprop' && instructionName(instruction, strings) === snapshotClassName,
          ) &&
          calls(method, snapshotInsertTrait),
      )
    : undefined

const statParser = findUnique('fighter stat parser', (method) =>
  ['RunSpeed', 'AirRunSpeed', 'JumpXImpulse'].every((name) => refersTo(method, name)),
)
const parsedField = (sourceName: string): string | undefined => {
  if (!statParser) return undefined
  const sourceIndex = statParser.instructions.findIndex(
    (instruction) => instruction.name === 'pushstring' && instruction.params[0] === sourceName,
  )
  const assignment = statParser.instructions
    .slice(sourceIndex + 1, sourceIndex + 16)
    .find((instruction) => instruction.name === 'initproperty')
  return assignment ? instructionName(assignment, strings) : undefined
}
const runSpeedField = parsedField('RunSpeed')
const airRunSpeedField = parsedField('AirRunSpeed')
const jumpXField = parsedField('JumpXImpulse')
if (!runSpeedField || !airRunSpeedField || !jumpXField) issues.push('fighter stat fields were not resolved')

const heroApplyMethod =
  entityClassIndex >= 0 && runSpeedField && airRunSpeedField && jumpXField
    ? findUnique(
        'HeroType/stat application',
        (method) =>
          classMethods(entityClassIndex).includes(method.methodId) &&
          methodTypeNames(method.methodId).includes('HeroType') &&
          [runSpeedField, airRunSpeedField, jumpXField].every((name) => refersTo(method, name)),
      )
    : undefined

const movementMethod =
  entityClassIndex >= 0 && runSpeedField && airRunSpeedField
    ? findUnique(
        'fighter movement update',
        (method) =>
          classMethods(entityClassIndex).includes(method.methodId) &&
          refersTo(method, runSpeedField) &&
          refersTo(method, airRunSpeedField) &&
          method.instructions.length > 1000,
      )
    : undefined

let groundBranchIndex = -1
let groundedStateField: string | undefined
let verticalImpulseField: string | undefined
let jumpImpulseInternal: number | undefined
let conditionalJumpImpulseInternal: number | undefined
let conditionalJumpGateLocal: number | undefined
let conditionalJumpWindowField: string | undefined
let conditionalJumpWindowMs: number | undefined
let conditionalJumpObjectField: string | undefined
let conditionalJumpGroundedField: string | undefined
let conditionalJumpPredicateVerified = false
let conditionalJumpSkipsGroundBranch = false
let jumpOptionalDefaults: boolean[] = []
let defaultJumpScale: number | undefined
let alternateJumpScale: number | undefined
if (jumpMethod) {
  jumpOptionalDefaults = (abc.method[jumpMethod.methodId].options?.option ?? []).map(
    (option: any) => option.kind === 0x0a,
  )
  const scaleSequenceIndex = jumpMethod.instructions.findIndex(
    (instruction, index, instructions) =>
      localIndex(instruction, 'getlocal') === 2 &&
      instructions[index + 1]?.name === 'iffalse' &&
      numericLiteral(instructions[index + 2]) === 0.86 &&
      instructions[index + 3]?.name === 'jump' &&
      numericLiteral(instructions[index + 4]) === 1 &&
      instructions[index + 5]?.name === 'convert_d' &&
      localIndex(instructions[index + 6], 'setlocal') === 7,
  )
  if (scaleSequenceIndex >= 0) {
    alternateJumpScale = numericLiteral(jumpMethod.instructions[scaleSequenceIndex + 2])
    defaultJumpScale = numericLiteral(jumpMethod.instructions[scaleSequenceIndex + 4])
  }
  groundBranchIndex = jumpMethod.instructions.findIndex(
    (instruction) => instruction.name === 'pushstring' && instruction.params[0] === 'jump.Ground',
  )
  for (let index = groundBranchIndex - 1; index >= 4; index--) {
    const window = jumpMethod.instructions.slice(index - 4, index + 1)
    if (
      window[0].name === 'findproperty' &&
      window[1].name === 'getproperty' &&
      numericLiteral(window[2]) === 1 &&
      window[4].name === 'equals'
    ) {
      groundedStateField = instructionName(window[1], strings)
      break
    }
  }
  const defaultAssignments: number[] = []
  for (let index = 0; index < groundBranchIndex - 4; index++) {
    const window = jumpMethod.instructions.slice(index, index + 5)
    const value = numericLiteral(window[0])
    if (
      value !== undefined &&
      localIndex(window[1], 'getlocal') === 7 &&
      window[2].name === 'multiply' &&
      localIndex(window[4], 'setlocal') === 8
    )
      defaultAssignments.push(value)
  }
  jumpImpulseInternal = defaultAssignments[defaultAssignments.length - 1]

  const impulseAssignments = jumpMethod.instructions
    .slice(0, groundBranchIndex)
    .filter((instruction) => localIndex(instruction, 'setlocal') === 8)
    .map((instruction) => {
      const prior = jumpMethod.instructions.slice(Math.max(0, instruction.index - 4), instruction.index).reverse()
      return { instruction, value: prior.map(numericLiteral).find((value) => value !== undefined) }
    })
    .filter(
      (assignment): assignment is { instruction: LocatedInstruction; value: number } => assignment.value !== undefined,
    )
  const alternateAssignments = impulseAssignments.filter((assignment) => assignment.value !== jumpImpulseInternal)
  if (alternateAssignments.length === 1) {
    const override = alternateAssignments[0]
    conditionalJumpImpulseInternal = override.value
    const gateBranches = jumpMethod.instructions
      .slice(Math.max(0, override.instruction.index - 30), override.instruction.index)
      .filter((instruction) => {
        const targetIndex = branchTargetIndex(jumpMethod.instructions, instruction)
        return (
          instruction.name === 'iffalse' &&
          targetIndex !== undefined &&
          targetIndex > override.instruction.index &&
          targetIndex < groundBranchIndex
        )
      })
      .filter((instruction) => localIndex(jumpMethod.instructions[instruction.index - 1], 'getlocal') !== undefined)
    if (gateBranches.length === 1) {
      const gateBranch = gateBranches[0]
      conditionalJumpGateLocal = localIndex(jumpMethod.instructions[gateBranch.index - 1], 'getlocal')
      const predicateWrite = jumpMethod.instructions
        .slice(0, gateBranch.index)
        .reverse()
        .find((instruction) => localIndex(instruction, 'setlocal') === conditionalJumpGateLocal)
      if (predicateWrite) {
        const start = predicateWrite.index - 25
        const firstBranch = jumpMethod.instructions[start + 8]
        const secondBranch = jumpMethod.instructions[start + 15]
        const instructions = jumpMethod.instructions
        conditionalJumpWindowField = instructionName(instructions[start + 2], strings)
        conditionalJumpWindowMs = numericLiteral(instructions[start + 3])
        conditionalJumpObjectField = instructionName(instructions[start + 12], strings)
        conditionalJumpGroundedField = instructionName(instructions[start + 18], strings)
        conditionalJumpPredicateVerified =
          instructions[start]?.name === 'pushfalse' &&
          instructions[start + 1]?.name === 'findproperty' &&
          instructions[start + 2]?.name === 'getproperty' &&
          conditionalJumpWindowMs === 160 &&
          instructions[start + 4]?.name === 'add_i' &&
          instructions[start + 5]?.name === 'convert_u' &&
          localIndex(instructions[start + 6], 'getlocal') === 1 &&
          instructions[start + 7]?.name === 'greaterthan' &&
          firstBranch?.name === 'iffalse' &&
          branchTargetIndex(instructions, firstBranch) === predicateWrite.index - 1 &&
          instructions[start + 9]?.name === 'pop' &&
          instructions[start + 10]?.name === 'pushtrue' &&
          instructions[start + 11]?.name === 'findproperty' &&
          instructions[start + 12]?.name === 'getproperty' &&
          instructions[start + 13]?.name === 'pushnull' &&
          instructions[start + 14]?.name === 'coerce' &&
          secondBranch?.name === 'ifne' &&
          branchTargetIndex(instructions, secondBranch) === predicateWrite.index - 2 &&
          instructions[start + 16]?.name === 'pop' &&
          instructions[start + 17]?.name === 'findproperty' &&
          instructions[start + 18]?.name === 'getproperty' &&
          numericLiteral(instructions[start + 19]) === 1 &&
          instructions[start + 20]?.name === 'convert_u' &&
          instructions[start + 21]?.name === 'equals' &&
          localIndex(predicateWrite, 'setlocal') === conditionalJumpGateLocal &&
          conditionalJumpGroundedField === groundedStateField
      }
    }

    const dashJumpMarker = jumpMethod.instructions.find(
      (instruction) => instruction.name === 'pushstring' && instruction.params[0] === 'dash.Jump',
    )
    const dashJumpExit = dashJumpMarker
      ? jumpMethod.instructions
          .slice(dashJumpMarker.index + 1, dashJumpMarker.index + 5)
          .find((instruction) => instruction.name === 'jump')
      : undefined
    const dashJumpExitTarget = branchTargetIndex(jumpMethod.instructions, dashJumpExit)
    conditionalJumpSkipsGroundBranch =
      dashJumpMarker !== undefined &&
      dashJumpMarker.index > override.instruction.index &&
      dashJumpMarker.index < groundBranchIndex &&
      dashJumpExitTarget !== undefined &&
      dashJumpExitTarget > groundBranchIndex
  }

  const subtractIndex = jumpMethod.instructions.findIndex(
    (instruction) =>
      instruction.index > groundBranchIndex &&
      instruction.index < groundBranchIndex + 40 &&
      instruction.name === 'subtract',
  )
  const impulseResultLocal = localIndex(jumpMethod.instructions[subtractIndex + 2], 'setlocal')
  const impulseReadField = instructionName(jumpMethod.instructions[subtractIndex - 4], strings)
  if (
    jumpMethod.instructions[subtractIndex - 4]?.name === 'getproperty' &&
    jumpMethod.instructions[subtractIndex - 3]?.name === 'callproperty' &&
    jumpMethod.instructions[subtractIndex - 2]?.name === 'convert_d' &&
    localIndex(jumpMethod.instructions[subtractIndex - 1], 'getlocal') === 8 &&
    jumpMethod.instructions[subtractIndex + 1]?.name === 'convert_d' &&
    impulseResultLocal !== undefined &&
    jumpMethod.instructions[subtractIndex + 6]?.name === 'getproperty' &&
    instructionName(jumpMethod.instructions[subtractIndex + 6], strings) === impulseReadField &&
    localIndex(jumpMethod.instructions[subtractIndex + 7], 'getlocal') === impulseResultLocal &&
    jumpMethod.instructions[subtractIndex + 8]?.name === 'callpropvoid' &&
    jumpMethod.instructions[subtractIndex + 8]?.params[1] === 2
  )
    verticalImpulseField = impulseReadField
}
if (!groundedStateField || !verticalImpulseField || jumpImpulseInternal === undefined)
  issues.push('grounded jump gate, vertical impulse field, or impulse literal was not resolved')
if (
  jumpOptionalDefaults.length !== 2 ||
  !jumpOptionalDefaults.every((value) => value === true) ||
  defaultJumpScale !== 1 ||
  alternateJumpScale !== 0.86
)
  issues.push('jump optional defaults or their impulse scaling branch were not uniquely resolved')

if (
  !conditionalJumpPredicateVerified ||
  conditionalJumpImpulseInternal === undefined ||
  !conditionalJumpSkipsGroundBranch
)
  issues.push('dash-jump predicate, impulse, or exit around the grounded branch was not uniquely resolved')

let jumpInputBit: number | undefined
let jumpInputArgumentCount: number | undefined
let risingEdgeMaskVerified = false
if (inputMethod && jumpTraitName) {
  const instructions = inputMethod.instructions
  const edgeExpressions = instructions.flatMap((instruction, index) => {
    if (instruction.name !== 'bitxor') return []
    const currentMaskLocal = localIndex(instructions[index + 1], 'getlocal')
    const edgeMaskLocal = localIndex(instructions[index + 4], 'setlocal')
    const currentMaskAssignment = instructions[index - 9]
    const currentMaskRead = instructions[index - 8]
    if (
      currentMaskLocal === undefined ||
      edgeMaskLocal === undefined ||
      instructions[index + 2]?.name !== 'bitand' ||
      instructions[index + 3]?.name !== 'convert_u' ||
      localIndex(currentMaskAssignment, 'setlocal') !== currentMaskLocal ||
      localIndex(currentMaskRead, 'getlocal') !== currentMaskLocal ||
      instructions[index - 2]?.name !== 'getproperty' ||
      instructions[index - 1]?.name !== 'convert_u'
    )
      return []
    return [{ currentMaskLocal, edgeMaskLocal }]
  })
  risingEdgeMaskVerified = edgeExpressions.length === 1

  const bitGates = risingEdgeMaskVerified
    ? instructions.flatMap((instruction, index) => {
        const edgeMaskLocal = edgeExpressions[0].edgeMaskLocal
        const bit = numericLiteral(instructions[index + 1])
        const gateLocal = localIndex(instructions[index + 11], 'setlocal')
        if (
          localIndex(instruction, 'getlocal') !== edgeMaskLocal ||
          bit === undefined ||
          instructions[index + 2]?.name !== 'convert_u' ||
          instructions[index + 3]?.name !== 'bitand' ||
          numericLiteral(instructions[index + 4]) !== 0 ||
          instructions[index + 5]?.name !== 'equals' ||
          instructions[index + 6]?.name !== 'not' ||
          instructions[index + 7]?.name !== 'convert_b' ||
          instructions[index + 8]?.name !== 'iffalse' ||
          localIndex(instructions[index + 9], 'getlocal') === undefined ||
          instructions[index + 10]?.name !== 'convert_u' ||
          gateLocal === undefined ||
          branchTargetIndex(instructions, instructions[index + 8]) !== index + 12
        )
          return []
        return [{ bit, gateLocal }]
      })
    : []

  const jumpCalls = instructions.filter(
    (instruction) =>
      instruction.name === 'callpropvoid' &&
      instructionName(instruction, strings) === jumpTraitName &&
      instruction.params[1] === 1,
  )
  const linkedJumpCalls = jumpCalls.flatMap((jumpCall) => {
    const gateStart = jumpCall.index - 9
    const gateLocal = localIndex(instructions[gateStart], 'getlocal')
    const bitGate = bitGates.find((candidate) => candidate.gateLocal === gateLocal)
    const jumpGateTarget = branchTargetIndex(instructions, instructions[gateStart + 5])
    if (
      !bitGate ||
      numericLiteral(instructions[gateStart + 1]) !== 0 ||
      instructions[gateStart + 2]?.name !== 'equals' ||
      instructions[gateStart + 3]?.name !== 'not' ||
      instructions[gateStart + 4]?.name !== 'convert_b' ||
      instructions[gateStart + 5]?.name !== 'iffalse' ||
      jumpGateTarget === undefined ||
      jumpGateTarget <= jumpCall.index ||
      jumpGateTarget > jumpCall.index + 5
    )
      return []
    return [{ jumpCall, bit: bitGate.bit }]
  })
  if (linkedJumpCalls.length === 1) {
    jumpInputBit = linkedJumpCalls[0].bit
    jumpInputArgumentCount = linkedJumpCalls[0].jumpCall.params[1] as number
  }
}
if (!risingEdgeMaskVerified || jumpInputBit === undefined)
  issues.push('jump input bit was not resolved through the rising-edge dataflow')
if (jumpInputArgumentCount !== 1) issues.push('replay jump invocation did not uniquely omit both optional arguments')

let verticalVelocityField: string | undefined
let pendingImpulseToVerticalVelocityVerified = false
if (movementMethod && verticalImpulseField) {
  const additions = movementMethod.instructions.flatMap((instruction, index, instructions) => {
    if (
      instruction.name !== 'add' ||
      instructions[index - 9]?.name !== 'getproperty' ||
      instructionName(instructions[index - 9], strings) !== verticalImpulseField ||
      instructions[index - 8]?.name !== 'callproperty' ||
      instructions[index - 7]?.name !== 'convert_d' ||
      instructions[index - 3]?.name !== 'getproperty' ||
      instructions[index - 2]?.name !== 'callproperty' ||
      instructions[index - 1]?.name !== 'convert_d' ||
      instructions[index + 1]?.name !== 'convert_d' ||
      instructions[index + 2]?.name !== 'convert_d'
    )
      return []
    const resultLocal = localIndex(instructions[index + 3], 'setlocal')
    const velocityField = instructionName(instructions[index - 3], strings)
    if (resultLocal === undefined || !velocityField || velocityField === verticalImpulseField) return []
    const writes = instructions
      .slice(index + 4, index + 40)
      .filter(
        (candidate) =>
          candidate.name === 'callpropvoid' &&
          candidate.params[1] === 2 &&
          localIndex(instructions[candidate.index - 1], 'getlocal') === resultLocal &&
          instructions
            .slice(Math.max(0, candidate.index - 8), candidate.index)
            .some((prior) => prior.name === 'getproperty' && instructionName(prior, strings) === velocityField),
      )
    return writes.length === 1 ? [{ velocityField }] : []
  })
  if (additions.length === 1) {
    verticalVelocityField = additions[0].velocityField
    pendingImpulseToVerticalVelocityVerified = true
  }
}
if (!pendingImpulseToVerticalVelocityVerified)
  issues.push('pending jump impulse was not uniquely linked to the vertical-velocity write')

let gravityField: string | undefined
let timeScaleField: string | undefined
let timeScaleClass: string | undefined
let gravitySequenceIndex = -1
if (movementMethod && verticalVelocityField) {
  for (let index = 4; index < movementMethod.instructions.length - 3; index++) {
    const instruction = movementMethod.instructions[index]
    if (instruction.name !== 'multiply' || movementMethod.instructions[index + 1].name !== 'add') continue
    const window = movementMethod.instructions.slice(index - 18, index)
    if (!window.some((candidate) => instructionName(candidate, strings) === verticalVelocityField)) continue
    if (
      movementMethod.instructions[index - 6].name !== 'getproperty' ||
      instructionName(movementMethod.instructions[index - 6], strings) !== verticalVelocityField ||
      movementMethod.instructions[index - 4].name !== 'findproperty' ||
      movementMethod.instructions[index - 3].name !== 'getproperty' ||
      movementMethod.instructions[index - 2].name !== 'getlex' ||
      movementMethod.instructions[index - 1].name !== 'getproperty' ||
      movementMethod.instructions[index + 2].name !== 'convert_d' ||
      movementMethod.instructions[index + 3].name !== 'callpropvoid' ||
      movementMethod.instructions[index + 3].params[1] !== 2
    )
      continue
    gravityField = instructionName(movementMethod.instructions[index - 3], strings)
    timeScaleClass = instructionName(movementMethod.instructions[index - 2], strings)
    timeScaleField = instructionName(movementMethod.instructions[index - 1], strings)
    gravitySequenceIndex = index
    break
  }
}
if (!verticalVelocityField || !gravityField || !timeScaleField || !timeScaleClass)
  issues.push('vertical velocity/gravity/time-scale integration was not resolved')

const entityConstructor = entityClassIndex >= 0 ? methodsById.get(abc.instance[entityClassIndex].iinit) : undefined
const gravityAssignment =
  gravityField && entityConstructor ? literalAssignedTo(gravityField, [entityConstructor]) : undefined
const timeScaleAssignment = timeScaleField ? literalAssignedTo(timeScaleField, methods) : undefined
if (!gravityAssignment || !timeScaleAssignment) issues.push('gravity or time-scale literal was not uniquely resolved')

let motionDeltaField: string | undefined
let motionDeltaCoordinate: string | undefined
let verticalVelocityToMotionDeltaVerified = false
if (movementMethod && verticalVelocityField && timeScaleClass && timeScaleField) {
  const motionWrites = movementMethod.instructions.flatMap((instruction, index, instructions) => {
    const velocityLocal = localIndex(instructions[index - 4], 'getlocal')
    if (
      instruction.name !== 'initproperty' ||
      instructionName(instruction, strings) !== 'y' ||
      instructions[index - 1]?.name !== 'multiply' ||
      instructions[index - 2]?.name !== 'getproperty' ||
      instructionName(instructions[index - 2], strings) !== timeScaleField ||
      instructions[index - 3]?.name !== 'getlex' ||
      instructionName(instructions[index - 3], strings) !== timeScaleClass ||
      velocityLocal === undefined ||
      localIndex(instructions[index - 7], 'setlocal') !== velocityLocal ||
      instructions[index - 11]?.name !== 'getproperty' ||
      instructionName(instructions[index - 11], strings) !== verticalVelocityField ||
      instructions[index - 10]?.name !== 'callproperty' ||
      instructions[index - 6]?.name !== 'getlex' ||
      instructions[index - 5]?.name !== 'getproperty'
    )
      return []
    return [{ field: instructionName(instructions[index - 5], strings), coordinate: 'y' }]
  })
  if (motionWrites.length === 1) {
    motionDeltaField = motionWrites[0].field
    motionDeltaCoordinate = motionWrites[0].coordinate
    verticalVelocityToMotionDeltaVerified = true
  }
}
if (!verticalVelocityToMotionDeltaVerified)
  issues.push('vertical velocity to per-tick motion-delta write was not uniquely resolved')

const velocityThresholdAssignments = movementMethod
  ? movementMethod.instructions.flatMap((instruction, index, instructions) => {
      const value = numericLiteral(instruction)
      const local = localIndex(instructions[index + 2], 'setlocal')
      if (
        (value !== 70 && value !== 85) ||
        instructions[index + 1]?.name !== 'convert_d' ||
        local === undefined ||
        index < gravitySequenceIndex - 120 ||
        index > gravitySequenceIndex
      )
        return []
      return [{ value, local }]
    })
  : []
const thresholdUsesVerticalVelocity = (local: number): boolean => {
  if (!movementMethod || !verticalVelocityField) return false
  const comparisons = movementMethod.instructions.filter(
    (instruction, index, instructions) =>
      (instruction.name === 'ifngt' || instruction.name === 'ifnlt') &&
      localIndex(instructions[index - 1], 'getlocal') === local &&
      instructions
        .slice(Math.max(0, index - 10), index)
        .some(
          (candidate) =>
            candidate.name === 'getproperty' && instructionName(candidate, strings) === verticalVelocityField,
        ),
  )
  const writes = movementMethod.instructions.filter(
    (instruction, index, instructions) =>
      instruction.name === 'callpropvoid' &&
      instruction.params[1] === 2 &&
      localIndex(instructions[index - 1], 'getlocal') === local &&
      instructions
        .slice(Math.max(0, index - 8), index)
        .some(
          (candidate) =>
            candidate.name === 'getproperty' && instructionName(candidate, strings) === verticalVelocityField,
        ),
  )
  return comparisons.length > 0 && writes.length > 0
}
const verticalVelocityThresholds = velocityThresholdAssignments
  .filter((assignment) => thresholdUsesVerticalVelocity(assignment.local))
  .map((assignment) => assignment.value)
if (
  verticalVelocityThresholds.length !== 2 ||
  !verticalVelocityThresholds.includes(70) ||
  !verticalVelocityThresholds.includes(85)
)
  issues.push('vertical-velocity thresholds 70/85 were not linked through comparisons and writes')

const entityHasOnHit =
  entityClassIndex >= 0 &&
  (abc.instance[entityClassIndex].trait ?? []).some((trait: any) => typeName(trait.name) === 'OnHit')
if (!entityHasOnHit) issues.push('fighter/entity root lacks the expected OnHit trait')

const gravityInternalPerTick =
  gravityAssignment && timeScaleAssignment ? gravityAssignment.value * timeScaleAssignment.value : undefined
const jumpDisplacementPerTick =
  jumpImpulseInternal !== undefined && timeScaleAssignment ? jumpImpulseInternal * timeScaleAssignment.value : undefined
const conditionalJumpDisplacementPerTick =
  conditionalJumpImpulseInternal !== undefined && timeScaleAssignment
    ? conditionalJumpImpulseInternal * timeScaleAssignment.value
    : undefined
const proven = branchErrors.length === 0 && issues.length === 0

const report = {
  target,
  abc: absoluteAbcPath,
  game: {
    patch: gamePatch ?? null,
    build: gameBuild ?? null,
    abcSha256,
  },
  controlFlow: {
    methodsDecoded: methods.length,
    branchTargetsValid: branchErrors.length === 0,
    errors: branchErrors.slice(0, 20),
  },
  chain: {
    replayRecord: replayDiagnostic ? describeMethod(replayDiagnostic.methodId, owners) : null,
    replayTimelineLoader: replayLoader ? describeMethod(replayLoader.methodId, owners) : null,
    inputSnapshot: {
      classIndex: snapshotClassIndex,
      className: snapshotClassName ?? null,
      timestampField: timestampField ?? null,
      maskField: inputMaskField ?? null,
      insertMethod: snapshotInsertMethod ? describeMethod(snapshotInsertMethod.methodId, owners) : null,
      sampleMethod: inputSampleMethod ? describeMethod(inputSampleMethod.methodId, owners) : null,
      consumerCallCount: inputSampleCallCount,
    },
    inputConsumer: inputMethod ? describeMethod(inputMethod.methodId, owners) : null,
    fighterRoot: jumpOwner
      ? { classIndex: jumpOwner.classIndex, className: jumpOwner.className, hasOnHit: entityHasOnHit }
      : null,
    heroStatApplication: heroApplyMethod ? describeMethod(heroApplyMethod.methodId, owners) : null,
    jumpApplication: jumpMethod ? describeMethod(jumpMethod.methodId, owners) : null,
    movementUpdate: movementMethod ? describeMethod(movementMethod.methodId, owners) : null,
    jumpInvocation: {
      suppliedArguments: jumpInputArgumentCount ?? null,
      optionalDefaults: jumpOptionalDefaults.length === 2 ? [false, false] : null,
      defaultImpulseScale: defaultJumpScale ?? null,
      alternateImpulseScale: alternateJumpScale ?? null,
    },
    alternateDashJump: {
      gateLocal: conditionalJumpGateLocal ?? null,
      predicate: conditionalJumpPredicateVerified
        ? `${conditionalJumpWindowField} + ${conditionalJumpWindowMs} > inputTime && (${conditionalJumpObjectField} != null || ${conditionalJumpGroundedField} == 1)`
        : null,
      windowField: conditionalJumpWindowField ?? null,
      windowMs: conditionalJumpWindowMs ?? null,
      objectField: conditionalJumpObjectField ?? null,
      groundedField: conditionalJumpGroundedField ?? null,
      skipsGroundBranch: conditionalJumpSkipsGroundBranch,
    },
  },
  fields: {
    groundedState: groundedStateField ?? null,
    pendingVerticalImpulse: verticalImpulseField ?? null,
    verticalVelocity: verticalVelocityField ?? null,
    gravity: gravityField ?? null,
    timeScale: timeScaleField ?? null,
    runSpeed: runSpeedField ?? null,
    airRunSpeed: airRunSpeedField ?? null,
    jumpXImpulse: jumpXField ?? null,
    motionDeltaVector: motionDeltaField ?? null,
    motionDeltaCoordinate: motionDeltaCoordinate ?? null,
  },
  values: {
    jumpInputBit: jumpInputBit ?? null,
    groundedJumpImpulseInternal: jumpImpulseInternal === undefined ? null : -jumpImpulseInternal,
    dashJumpImpulseInternal: conditionalJumpImpulseInternal === undefined ? null : -conditionalJumpImpulseInternal,
    verticalVelocityToMotionDeltaPerTick: timeScaleAssignment?.value ?? null,
    groundedJumpMotionDeltaEquivalentPerTick: jumpDisplacementPerTick === undefined ? null : -jumpDisplacementPerTick,
    dashJumpMotionDeltaEquivalentPerTick:
      conditionalJumpDisplacementPerTick === undefined ? null : -conditionalJumpDisplacementPerTick,
    gravityInternal: gravityAssignment?.value ?? null,
    gravityInternalPerTick: gravityInternalPerTick ?? null,
    gravityMotionDeltaContributionPerTick:
      gravityInternalPerTick === undefined || !timeScaleAssignment
        ? null
        : gravityInternalPerTick * timeScaleAssignment.value,
    verticalVelocityThresholdsInternal: verticalVelocityThresholds.sort((left, right) => left - right),
  },
  status: proven ? 'proven' : 'blocked',
  blockers: issues,
}

console.log(JSON.stringify(report, null, 2))
process.exit(branchErrors.length > 0 ? 1 : proven ? 0 : 2)
