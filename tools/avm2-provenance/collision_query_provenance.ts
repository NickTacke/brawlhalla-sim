import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

import {
  type Instruction,
  type IntegerExpressionValue,
  type LocatedInstruction,
  callArgumentExpressions,
  evaluateIntegerExpression,
  instructionName,
  locateInstructions,
  multinameName,
  numericLiteral,
  qnameKey,
  validateBranches,
} from './avm2_decoder.js'

export const EXPECTED_BUILD = '10.09.96325'
export const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_METHOD_BODY_COUNT = 15_010
const QUERY_METHOD_ID = 1390
const QUERY_CLASS_INDEX = 76
const FLAG_INITIALIZER_METHOD_ID = 14909
const FLAG_REGISTRATION_METHOD_ID = 850

export type DirectCallLedgerEntry = {
  methodId: number
  calls: number
  pcs: number[]
}

export const EXPECTED_DIRECT_CALL_LEDGER: DirectCallLedgerEntry[] = [
  { methodId: 44, calls: 2, pcs: [563, 2171] },
  { methodId: 53, calls: 1, pcs: [118] },
  { methodId: 66, calls: 1, pcs: [436] },
  { methodId: 763, calls: 1, pcs: [306] },
  { methodId: 784, calls: 1, pcs: [477] },
  { methodId: 801, calls: 1, pcs: [1278] },
  { methodId: 919, calls: 1, pcs: [1760] },
  { methodId: 1386, calls: 1, pcs: [93] },
  { methodId: 1501, calls: 1, pcs: [391] },
  { methodId: 1503, calls: 2, pcs: [543, 638] },
  { methodId: 1537, calls: 2, pcs: [1129, 1259] },
  { methodId: 1540, calls: 10, pcs: [1264, 1587, 1687, 1966, 2066, 2254, 2399, 2543, 2688, 3265] },
  { methodId: 1641, calls: 12, pcs: [699, 1107, 1790, 1884, 2449, 2636, 2730, 4154, 4549, 4823, 5641, 5734] },
  { methodId: 1683, calls: 1, pcs: [579] },
  { methodId: 1687, calls: 1, pcs: [1256] },
  { methodId: 1688, calls: 1, pcs: [465] },
  { methodId: 1720, calls: 1, pcs: [592] },
  { methodId: 1722, calls: 1, pcs: [258] },
  { methodId: 1739, calls: 1, pcs: [200] },
  { methodId: 1740, calls: 1, pcs: [126] },
  { methodId: 2681, calls: 1, pcs: [109] },
  { methodId: 2684, calls: 1, pcs: [187] },
  { methodId: 2685, calls: 1, pcs: [188] },
  {
    methodId: 2887,
    calls: 13,
    pcs: [3329, 4021, 6944, 7047, 7378, 7918, 8113, 8216, 10380, 11009, 11321, 12508, 12610],
  },
  { methodId: 2907, calls: 1, pcs: [267] },
  { methodId: 2914, calls: 2, pcs: [220, 398] },
  { methodId: 2972, calls: 1, pcs: [146] },
  { methodId: 3176, calls: 1, pcs: [240] },
  { methodId: 4172, calls: 5, pcs: [240, 327, 703, 852, 929] },
  { methodId: 4189, calls: 1, pcs: [376] },
  { methodId: 5076, calls: 4, pcs: [627, 674, 783, 830] },
  { methodId: 5881, calls: 2, pcs: [729, 839] },
  { methodId: 5886, calls: 3, pcs: [198, 298, 798] },
  { methodId: 5887, calls: 1, pcs: [558] },
  { methodId: 6102, calls: 1, pcs: [581] },
  { methodId: 7240, calls: 3, pcs: [823, 1574, 4634] },
  { methodId: 12611, calls: 1, pcs: [1320] },
  { methodId: 14750, calls: 8, pcs: [1413, 4804, 4910, 5518, 5694, 5800, 6570, 6675] },
]

const FLAG_VALUES: Readonly<Record<string, number>> = {
  '_-uW': 8,
  '_-zM': 16,
  '_-l3j': 32,
  '_-r2u': 64,
  '_-U5E': 128,
  '_-93C': 256,
  '_-J5i': 512,
  '_-X2Q': 1024,
}
const REGISTERED_COLLISIONS = [
  'HardCollision',
  'SoftCollision',
  'TriggerCollision',
  'StickyCollision',
  'NoSlideCollision',
  'ItemIgnoreCollision',
  'BouncyHardCollision',
  'BouncySoftCollision',
  'BouncyNoSlideCollision',
  'GameModeHardCollision',
  'PressurePlateCollision',
  'SoftPressurePlateCollision',
  'LavaCollision',
  'MudCollision',
]

const FLAG_COMPOSITIONS = [
  { name: 'HardCollision', value: 1, composition: [1] },
  { name: 'SoftCollision', value: 2, composition: [2] },
  { name: 'TriggerCollision', value: 4, composition: [4] },
  { name: 'StickyCollision', value: 9, composition: [1, 8] },
  { name: 'NoSlideCollision', value: 17, composition: [1, 16] },
  { name: 'ItemIgnoreCollision', value: 49, composition: [1, 16, 32] },
  { name: 'BouncyHardCollision', value: 65, composition: [1, 64] },
  { name: 'BouncySoftCollision', value: 66, composition: [2, 64] },
  { name: 'BouncyNoSlideCollision', value: 81, composition: [1, 16, 64] },
  { name: 'GameModeHardCollision', value: 129, composition: [1, 128] },
  { name: 'PressurePlateCollision', value: 257, composition: [1, 256] },
  { name: 'SoftPressurePlateCollision', value: 258, composition: [2, 256] },
  { name: 'LavaCollision', value: 657, composition: [1, 16, 128, 512] },
  { name: 'MudCollision', value: 128, composition: [128] },
]

export type CollisionQueryReport = ReturnType<typeof expectedCollisionQueryReport>

type FailureReason = 'usage' | 'input-unavailable' | 'identity-mismatch' | 'provenance-mismatch'

export class ProvenanceError extends Error {
  constructor(
    readonly reason: FailureReason,
    message: string,
  ) {
    super(message)
  }
}

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ProvenanceError('provenance-mismatch', message)
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

export function assertPinnedIdentity(bytes: Uint8Array): void {
  if (sha256(bytes) !== EXPECTED_ABC_SHA256) {
    throw new ProvenanceError('identity-mismatch', 'ABC identity does not match the pinned build')
  }
}

export function validateDirectCallLedger(actual: DirectCallLedgerEntry[]): void {
  invariant(
    JSON.stringify(actual) === JSON.stringify(EXPECTED_DIRECT_CALL_LEDGER),
    `direct call ledger changed: ${JSON.stringify(actual)}`,
  )
}

type InstructionAnchor = {
  methodId: number
  pc: number
  opcode: string
  name?: string
  literal?: number
  operand?: number
  targetPc?: number
}

function requireAnchor(
  methods: Map<number, LocatedInstruction[]>,
  strings: string[],
  anchor: InstructionAnchor,
): LocatedInstruction {
  const instruction = methods.get(anchor.methodId)?.find((candidate) => candidate.pc === anchor.pc)
  invariant(instruction, `method ${anchor.methodId} lacks PC ${anchor.pc}`)
  invariant(instruction.name === anchor.opcode, `method ${anchor.methodId} PC ${anchor.pc} opcode changed`)
  if (anchor.name !== undefined) {
    invariant(
      instructionName(instruction, strings) === anchor.name,
      `method ${anchor.methodId} PC ${anchor.pc} name changed`,
    )
  }
  if (anchor.literal !== undefined) {
    invariant(
      numericLiteral(instruction) === anchor.literal,
      `method ${anchor.methodId} PC ${anchor.pc} literal changed`,
    )
  }
  if (anchor.operand !== undefined) {
    invariant(instruction.params[0] === anchor.operand, `method ${anchor.methodId} PC ${anchor.pc} operand changed`)
  }
  if (anchor.targetPc !== undefined) {
    invariant(
      instruction.endPc + Number(instruction.params[0]) === anchor.targetPc,
      `method ${anchor.methodId} PC ${anchor.pc} branch target changed`,
    )
  }
  return instruction
}

function assertMethod1390(methods: Map<number, LocatedInstruction[]>, strings: string[]): void {
  const anchors: InstructionAnchor[] = [
    { methodId: 1390, pc: 250, opcode: 'getlocal', operand: 10 },
    { methodId: 1390, pc: 252, opcode: 'pushbyte', literal: 2 },
    { methodId: 1390, pc: 255, opcode: 'bitand' },
    { methodId: 1390, pc: 260, opcode: 'iffalse', targetPc: 276 },
    { methodId: 1390, pc: 267, opcode: 'getproperty', name: '_-i1K' },
    { methodId: 1390, pc: 280, opcode: 'jump', targetPc: 1119 },
    { methodId: 1390, pc: 485, opcode: 'getlocal', operand: 10 },
    { methodId: 1390, pc: 487, opcode: 'pushbyte', literal: 8 },
    { methodId: 1390, pc: 490, opcode: 'pushbyte', literal: 4 },
    { methodId: 1390, pc: 493, opcode: 'bitor' },
    { methodId: 1390, pc: 494, opcode: 'pushbyte', literal: 1 },
    { methodId: 1390, pc: 497, opcode: 'bitor' },
    { methodId: 1390, pc: 498, opcode: 'bitand' },
    { methodId: 1390, pc: 502, opcode: 'iffalse', targetPc: 521 },
    { methodId: 1390, pc: 521, opcode: 'iffalse', targetPc: 805 },
    { methodId: 1390, pc: 872, opcode: 'pushbyte', literal: 2 },
    { methodId: 1390, pc: 875, opcode: 'bitand' },
    { methodId: 1390, pc: 904, opcode: 'getlocal', operand: 10 },
    { methodId: 1390, pc: 906, opcode: 'pushbyte', literal: 1 },
    { methodId: 1390, pc: 909, opcode: 'bitand' },
    { methodId: 1390, pc: 915, opcode: 'iffalse', targetPc: 1119 },
    { methodId: 1390, pc: 956, opcode: 'callproperty', name: '_-B14' },
    { methodId: 1390, pc: 962, opcode: 'iffalse', targetPc: 1119 },
    { methodId: 1390, pc: 1128, opcode: 'getlocal', operand: 10 },
    { methodId: 1390, pc: 1130, opcode: 'pushbyte', literal: 4 },
    { methodId: 1390, pc: 1133, opcode: 'bitand' },
    { methodId: 1390, pc: 1138, opcode: 'iffalse', targetPc: 1153 },
    { methodId: 1390, pc: 1153, opcode: 'iffalse', targetPc: 1405 },
    { methodId: 1390, pc: 1412, opcode: 'ifeq', targetPc: 1469 },
    { methodId: 1390, pc: 1429, opcode: 'initproperty', name: 'x' },
    { methodId: 1390, pc: 1446, opcode: 'initproperty', name: 'y' },
    { methodId: 1390, pc: 1454, opcode: 'initproperty', name: 'x' },
    { methodId: 1390, pc: 1462, opcode: 'initproperty', name: 'y' },
    { methodId: 1390, pc: 1468, opcode: 'returnvalue' },
    { methodId: 1390, pc: 1474, opcode: 'returnvalue' },
  ]
  for (const anchor of anchors) requireAnchor(methods, strings, anchor)
}

type FlagInitializer = { field: string; valuePc: number; initPc: number; shift?: number; shiftPc?: number }

function assertFlagInitializers(methods: Map<number, LocatedInstruction[]>, strings: string[]): void {
  const initializers: FlagInitializer[] = [
    { field: '_-uW', valuePc: 12131, initPc: 12134 },
    { field: '_-zM', valuePc: 12140, initPc: 12147, shift: 1, shiftPc: 12143 },
    { field: '_-l3j', valuePc: 12153, initPc: 12160, shift: 2, shiftPc: 12156 },
    { field: '_-r2u', valuePc: 12166, initPc: 12173, shift: 3, shiftPc: 12169 },
    { field: '_-U5E', valuePc: 12180, initPc: 12187, shift: 4, shiftPc: 12183 },
    { field: '_-93C', valuePc: 12194, initPc: 12201, shift: 5, shiftPc: 12197 },
    { field: '_-J5i', valuePc: 12208, initPc: 12215, shift: 6, shiftPc: 12211 },
    { field: '_-X2Q', valuePc: 12221, initPc: 12228, shift: 7, shiftPc: 12224 },
  ]
  for (const initializer of initializers) {
    requireAnchor(methods, strings, {
      methodId: FLAG_INITIALIZER_METHOD_ID,
      pc: initializer.valuePc,
      opcode: 'pushbyte',
      literal: 8,
    })
    if (initializer.shift !== undefined && initializer.shiftPc !== undefined) {
      requireAnchor(methods, strings, {
        methodId: FLAG_INITIALIZER_METHOD_ID,
        pc: initializer.shiftPc,
        opcode: 'pushbyte',
        literal: initializer.shift,
      })
      requireAnchor(methods, strings, {
        methodId: FLAG_INITIALIZER_METHOD_ID,
        pc: initializer.shiftPc + 2,
        opcode: 'lshift',
      })
    }
    requireAnchor(methods, strings, {
      methodId: FLAG_INITIALIZER_METHOD_ID,
      pc: initializer.initPc,
      opcode: 'initproperty',
      name: initializer.field,
    })
    invariant(8 << (initializer.shift ?? 0) === FLAG_VALUES[initializer.field], 'flag value changed')
  }
}

type RegistrationSpec = {
  name: string
  stringPc: number
  callPc: number
  base: number
  basePc?: number
  fields: Array<{ pc: number; name: string }>
  bitorPcs: number[]
}

function assertRegisteredCompositions(methods: Map<number, LocatedInstruction[]>, strings: string[]): void {
  const registrations: RegistrationSpec[] = [
    { name: 'SoftCollision', stringPc: 10, callPc: 13, base: 2, basePc: 7, fields: [], bitorPcs: [] },
    { name: 'HardCollision', stringPc: 27, callPc: 30, base: 1, basePc: 24, fields: [], bitorPcs: [] },
    { name: 'TriggerCollision', stringPc: 44, callPc: 47, base: 4, basePc: 41, fields: [], bitorPcs: [] },
    {
      name: 'StickyCollision',
      stringPc: 68,
      callPc: 72,
      base: 1,
      basePc: 58,
      fields: [{ pc: 64, name: '_-uW' }],
      bitorPcs: [67],
    },
    {
      name: 'NoSlideCollision',
      stringPc: 92,
      callPc: 95,
      base: 1,
      basePc: 82,
      fields: [{ pc: 88, name: '_-zM' }],
      bitorPcs: [91],
    },
    {
      name: 'ItemIgnoreCollision',
      stringPc: 123,
      callPc: 127,
      base: 1,
      basePc: 106,
      fields: [
        { pc: 112, name: '_-l3j' },
        { pc: 119, name: '_-zM' },
      ],
      bitorPcs: [115, 122],
    },
    {
      name: 'BouncyHardCollision',
      stringPc: 149,
      callPc: 152,
      base: 1,
      basePc: 138,
      fields: [{ pc: 144, name: '_-r2u' }],
      bitorPcs: [148],
    },
    {
      name: 'BouncySoftCollision',
      stringPc: 173,
      callPc: 176,
      base: 2,
      basePc: 162,
      fields: [{ pc: 168, name: '_-r2u' }],
      bitorPcs: [172],
    },
    {
      name: 'GameModeHardCollision',
      stringPc: 197,
      callPc: 201,
      base: 1,
      basePc: 186,
      fields: [{ pc: 192, name: '_-U5E' }],
      bitorPcs: [196],
    },
    {
      name: 'PressurePlateCollision',
      stringPc: 223,
      callPc: 226,
      base: 1,
      basePc: 212,
      fields: [{ pc: 218, name: '_-93C' }],
      bitorPcs: [222],
    },
    {
      name: 'SoftPressurePlateCollision',
      stringPc: 248,
      callPc: 251,
      base: 2,
      basePc: 237,
      fields: [{ pc: 243, name: '_-93C' }],
      bitorPcs: [247],
    },
    {
      name: 'BouncyNoSlideCollision',
      stringPc: 279,
      callPc: 283,
      base: 1,
      basePc: 261,
      fields: [
        { pc: 267, name: '_-zM' },
        { pc: 274, name: '_-r2u' },
      ],
      bitorPcs: [270, 278],
    },
    {
      name: 'LavaCollision',
      stringPc: 319,
      callPc: 323,
      base: 1,
      basePc: 294,
      fields: [
        { pc: 300, name: '_-J5i' },
        { pc: 307, name: '_-U5E' },
        { pc: 315, name: '_-zM' },
      ],
      bitorPcs: [303, 311, 318],
    },
    { name: 'MudCollision', stringPc: 341, callPc: 345, base: 0, fields: [{ pc: 337, name: '_-U5E' }], bitorPcs: [] },
  ]
  invariant(
    registrations
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right))
      .join() === [...REGISTERED_COLLISIONS].sort((left, right) => left.localeCompare(right)).join(),
    'registered collision set changed',
  )
  const registrationMethod = methods.get(FLAG_REGISTRATION_METHOD_ID)
  invariant(registrationMethod, 'registration method is absent')
  const registeredNames = registrationMethod.flatMap((instruction, index) => {
    if (instruction.name !== 'callpropvoid' || instructionName(instruction, strings) !== '_-Ah') return []
    const nameInstruction = registrationMethod[index - 1]
    invariant(nameInstruction?.name === 'pushstring', `registration call at PC ${instruction.pc} lacks a name`)
    return [instructionName(nameInstruction, strings)]
  })
  invariant(
    JSON.stringify(registeredNames.sort((left, right) => left.localeCompare(right))) ===
      JSON.stringify([...REGISTERED_COLLISIONS].sort((left, right) => left.localeCompare(right))),
    'registration call set changed',
  )
  for (const registration of registrations) {
    requireAnchor(methods, strings, {
      methodId: FLAG_REGISTRATION_METHOD_ID,
      pc: registration.stringPc,
      opcode: 'pushstring',
      name: registration.name,
    })
    requireAnchor(methods, strings, {
      methodId: FLAG_REGISTRATION_METHOD_ID,
      pc: registration.callPc,
      opcode: 'callpropvoid',
      name: '_-Ah',
    })
    if (registration.basePc !== undefined) {
      requireAnchor(methods, strings, {
        methodId: FLAG_REGISTRATION_METHOD_ID,
        pc: registration.basePc,
        opcode: 'pushbyte',
        literal: registration.base,
      })
    }
    for (const field of registration.fields) {
      requireAnchor(methods, strings, {
        methodId: FLAG_REGISTRATION_METHOD_ID,
        pc: field.pc,
        opcode: 'getproperty',
        name: field.name,
      })
    }
    for (const pc of registration.bitorPcs) {
      requireAnchor(methods, strings, { methodId: FLAG_REGISTRATION_METHOD_ID, pc, opcode: 'bitor' })
    }
    const value = registration.fields.reduce((result, field) => result | FLAG_VALUES[field.name], registration.base)
    const expected = FLAG_COMPOSITIONS.find((entry) => entry.name === registration.name)
    invariant(expected?.value === value, `${registration.name} composition changed`)
  }
}

function assertOwnerResponseAnchors(methods: Map<number, LocatedInstruction[]>, strings: string[]): void {
  const anchors: InstructionAnchor[] = [
    { methodId: 3053, pc: 236, opcode: 'getproperty', name: '_-r2u' },
    { methodId: 3053, pc: 240, opcode: 'bitand' },
    { methodId: 3053, pc: 245, opcode: 'iffalse', targetPc: 258 },
    { methodId: 3053, pc: 249, opcode: 'pushdouble', literal: 0.9 },
    { methodId: 3053, pc: 253, opcode: 'setlocal_3' },
    { methodId: 1641, pc: 5200, opcode: 'getproperty', name: '_-uW' },
    { methodId: 1641, pc: 5233, opcode: 'pushdouble', literal: 5000 },
    { methodId: 1641, pc: 5236, opcode: 'add_i' },
    { methodId: 1641, pc: 5238, opcode: 'initproperty', name: '_-k3T' },
    { methodId: 2887, pc: 11750, opcode: 'getproperty', name: '_-uW' },
    { methodId: 2887, pc: 11783, opcode: 'pushdouble', literal: 5000 },
    { methodId: 2887, pc: 11786, opcode: 'add_i' },
    { methodId: 2887, pc: 11788, opcode: 'initproperty', name: '_-k3T' },
    { methodId: 3053, pc: 103, opcode: 'getproperty', name: '_-zM' },
    { methodId: 1052, pc: 5507, opcode: 'getproperty', name: '_-zM' },
    { methodId: 1641, pc: 3623, opcode: 'getproperty', name: '_-zM' },
    { methodId: 1641, pc: 4380, opcode: 'getproperty', name: '_-zM' },
    { methodId: 1641, pc: 5412, opcode: 'getproperty', name: '_-zM' },
    { methodId: 2887, pc: 7373, opcode: 'getproperty', name: '_-zM' },
    { methodId: 2887, pc: 9781, opcode: 'getproperty', name: '_-zM' },
    { methodId: 2887, pc: 10815, opcode: 'getproperty', name: '_-zM' },
    { methodId: 2887, pc: 12217, opcode: 'getproperty', name: '_-zM' },
    { methodId: 2887, pc: 3733, opcode: 'getproperty', name: '_-U5E' },
    { methodId: 2887, pc: 3741, opcode: 'iftrue', targetPc: 3758 },
    { methodId: 2887, pc: 3751, opcode: 'callproperty', name: '_-N4f' },
    { methodId: 2887, pc: 9304, opcode: 'getproperty', name: '_-U5E' },
    { methodId: 2887, pc: 9324, opcode: 'callproperty', name: '_-N4f' },
    { methodId: 2887, pc: 10732, opcode: 'getproperty', name: '_-U5E' },
    { methodId: 2887, pc: 10751, opcode: 'callproperty', name: '_-N4f' },
    { methodId: 2887, pc: 13099, opcode: 'getproperty', name: '_-U5E' },
    { methodId: 2887, pc: 13117, opcode: 'callpropvoid', name: '_-N4f' },
    { methodId: 3053, pc: 172, opcode: 'getproperty', name: '_-U5E' },
    { methodId: 3053, pc: 216, opcode: 'callproperty', name: '_-e2z' },
    { methodId: 2887, pc: 3799, opcode: 'getproperty', name: '_-93C' },
    { methodId: 2887, pc: 3808, opcode: 'iffalse', targetPc: 3879 },
    { methodId: 2887, pc: 3875, opcode: 'callpropvoid', name: '_-s4y' },
    { methodId: 2887, pc: 12119, opcode: 'getproperty', name: '_-93C' },
    { methodId: 2887, pc: 12129, opcode: 'iffalse', targetPc: 12155 },
    { methodId: 2887, pc: 12151, opcode: 'callpropvoid', name: '_-s4y' },
    { methodId: 2887, pc: 12884, opcode: 'getproperty', name: '_-93C' },
    { methodId: 2887, pc: 12894, opcode: 'iffalse', targetPc: 12920 },
    { methodId: 2887, pc: 12916, opcode: 'callpropvoid', name: '_-s4y' },
    { methodId: 3018, pc: 637, opcode: 'getproperty', name: '_-J5i' },
    { methodId: 3018, pc: 640, opcode: 'bitand' },
    { methodId: 3018, pc: 645, opcode: 'iffalse', targetPc: 983 },
    { methodId: 3018, pc: 688, opcode: 'getlex', name: 'PowerType' },
    { methodId: 3018, pc: 692, opcode: 'getproperty', name: '_-KF' },
    { methodId: 3018, pc: 696, opcode: 'callproperty', name: '_-51i' },
    { methodId: 3018, pc: 701, opcode: 'coerce', name: 'PowerType' },
  ]
  for (const anchor of anchors) requireAnchor(methods, strings, anchor)
}

function assertMethodOwners(abc: any, strings: string[]): void {
  const expectedOwners = [
    { methodId: 1052, classIndex: 55, className: '_-C1o', traitName: '_-q3r' },
    { methodId: 1641, classIndex: 90, className: 'Companion', traitName: '_-D38' },
    { methodId: 2887, classIndex: 147, className: '_-V4R', traitName: '_-D38' },
    { methodId: 3018, classIndex: 147, className: '_-V4R', traitName: '_-N4f' },
    { methodId: 3053, classIndex: 147, className: '_-V4R', traitName: '_-7G' },
  ]
  for (const expected of expectedOwners) {
    const instance = abc.instance[expected.classIndex]
    invariant(instance, `owner class ${expected.classIndex} is absent`)
    invariant(
      multinameName(abc.constant_pool.multiname[instance.name - 1], strings) === expected.className,
      `owner class for method ${expected.methodId} changed`,
    )
    const traits = (instance.trait as any[]).filter((trait) => trait.data?.method === expected.methodId)
    invariant(traits.length === 1, `method ${expected.methodId} owner trait changed`)
    invariant(
      multinameName(abc.constant_pool.multiname[traits[0].name - 1], strings) === expected.traitName,
      `method ${expected.methodId} trait name changed`,
    )
  }
}

type DirectCallObservation = {
  methodId: number
  pc: number
  argumentCount: number
  instructionIndex: number
  instructions: LocatedInstruction[]
}

type LocalArgument = { methodId: number; pc: number; local: number }

const EXPECTED_LOCAL_MASKS: LocalArgument[] = [
  { methodId: 44, pc: 563, local: 7 },
  { methodId: 44, pc: 2171, local: 29 },
  { methodId: 66, pc: 436, local: 4 },
  { methodId: 1386, pc: 93, local: 6 },
  { methodId: 1641, pc: 699, local: 4 },
  { methodId: 1641, pc: 1107, local: 4 },
  { methodId: 1641, pc: 1790, local: 4 },
  { methodId: 1641, pc: 2636, local: 4 },
  { methodId: 1641, pc: 5641, local: 4 },
  { methodId: 2887, pc: 3329, local: 3 },
  { methodId: 2887, pc: 4021, local: 3 },
  { methodId: 2887, pc: 6944, local: 3 },
  { methodId: 2887, pc: 8113, local: 3 },
  { methodId: 2887, pc: 12508, local: 3 },
  { methodId: 14750, pc: 1413, local: 6 },
  { methodId: 14750, pc: 4804, local: 6 },
  { methodId: 14750, pc: 5694, local: 6 },
  { methodId: 14750, pc: 6570, local: 6 },
]

const EXPECTED_RUNTIME_EXCLUSIONS: LocalArgument[] = [
  { methodId: 1540, pc: 1264, local: 29 },
  { methodId: 1540, pc: 1587, local: 29 },
  { methodId: 1540, pc: 1687, local: 29 },
  { methodId: 1540, pc: 1966, local: 29 },
  { methodId: 1540, pc: 2066, local: 29 },
  { methodId: 1540, pc: 2254, local: 29 },
  { methodId: 1540, pc: 2399, local: 29 },
  { methodId: 1540, pc: 2543, local: 29 },
  { methodId: 1540, pc: 2688, local: 29 },
  { methodId: 1540, pc: 3265, local: 29 },
]

function recordIntegerArgument(
  value: IntegerExpressionValue,
  call: DirectCallObservation,
  constants: Map<number, number>,
  locals: LocalArgument[],
): void {
  if (value.kind === 'constant') {
    constants.set(value.value, (constants.get(value.value) ?? 0) + 1)
    return
  }
  invariant(value.kind === 'local', `call ${call.methodId}:${call.pc} argument is not statically bounded`)
  locals.push({ methodId: call.methodId, pc: call.pc, local: value.index })
}

function assertCounts(actual: Map<number, number>, expected: Array<[number, number]>, label: string): void {
  invariant(
    JSON.stringify([...actual].sort((left, right) => left[0] - right[0])) === JSON.stringify(expected),
    `${label} partition changed`,
  )
}

function assertDirectCallArguments(calls: DirectCallObservation[], strings: string[]): void {
  const masks = new Map<number, number>()
  const options = new Map<number, number>()
  const exclusions = new Map<number, number>()
  const localMasks: LocalArgument[] = []
  const runtimeExclusions: LocalArgument[] = []

  for (const call of calls) {
    const expressions = callArgumentExpressions(call.instructions, call.instructionIndex)
    const mask = evaluateIntegerExpression(expressions[8], strings, FLAG_VALUES)
    const option = evaluateIntegerExpression(expressions[9], strings, FLAG_VALUES)
    recordIntegerArgument(mask, call, masks, localMasks)
    recordIntegerArgument(option, call, options, [])
    if (expressions.length >= 12) {
      const exclusion = evaluateIntegerExpression(expressions[11], strings, FLAG_VALUES)
      recordIntegerArgument(exclusion, call, exclusions, runtimeExclusions)
    }
  }

  assertCounts(
    masks,
    [
      [1, 54],
      [2, 3],
      [3, 17],
      [16, 1],
    ],
    'query mask',
  )
  assertCounts(
    options,
    [
      [0, 67],
      [4, 2],
      [8, 21],
      [9, 2],
      [11, 1],
    ],
    'query option',
  )
  assertCounts(
    exclusions,
    [
      [0, 6],
      [32, 8],
    ],
    'type exclusion',
  )
  invariant(JSON.stringify(localMasks) === JSON.stringify(EXPECTED_LOCAL_MASKS), 'runtime local-mask ledger changed')
  invariant(
    JSON.stringify(runtimeExclusions) === JSON.stringify(EXPECTED_RUNTIME_EXCLUSIONS),
    'runtime exclusion-mask ledger changed',
  )
}

export function expectedCollisionQueryReport() {
  return {
    status: 'proven-for-pinned-abc',
    identity: {
      build: EXPECTED_BUILD,
      abcSha256: EXPECTED_ABC_SHA256,
      decodedMethodBodies: EXPECTED_METHOD_BODY_COUNT,
      branchTargetsValid: true,
    },
    method1390: {
      methodId: QUERY_METHOD_ID,
      parameterCount: 13,
      requiredParameterCount: 10,
      testedOptionBits: [1, 2, 4, 8],
      outputMutationPcs: [1429, 1446, 1454, 1462],
      returnPcs: [1468, 1474],
      arbitrationBoundary: 'candidate ordering and coincident-hit precedence remain unresolved',
    },
    directCalls: {
      methodCount: EXPECTED_DIRECT_CALL_LEDGER.length,
      callCount: EXPECTED_DIRECT_CALL_LEDGER.reduce((count, entry) => count + entry.calls, 0),
      ledger: EXPECTED_DIRECT_CALL_LEDGER,
      argumentCounts: { required10: 69, twelve: 10, thirteen: 14 },
      queryMasks: {
        hard: 54,
        hardOrSoft: 17,
        soft: 3,
        noSlideOnly: 1,
        runtimeLocalMasks: 18,
      },
      queryOptions: { zero: 67, four: 2, eight: 21, nine: 2, eleven: 1 },
      itemIgnoreExclusions: 8,
      boundary: 'complete direct syntactic ledger; replay-producing reachability and indirect dispatch are not claimed',
    },
    flags: {
      bases: { hard: 1, soft: 2, trigger: 4 },
      extras: {
        sticky: 8,
        noSlide: 16,
        itemIgnore: 32,
        bounce: 64,
        gameModeOrMud: 128,
        pressurePlate: 256,
        lava: 512,
        iceRelated: 1024,
      },
      compositions: FLAG_COMPOSITIONS,
    },
    boundedOwnerResponses: {
      bounce: { factor: 0.9, ownerFamily: 'fighter' },
      sticky: { tickDomainOffset: 5000, ownerFamilies: ['fighter', 'companion'] },
      noSlide: { testedOwnerMethods: [1052, 1641, 2887, 3053], universalFormulaClaimed: false },
      itemIgnore: { exclusionPredicateCalls: 8 },
      pressurePlate: { ownerCallbackDispatch: true },
      gameMode: { ownerCallbackDispatch: true },
      lava: { typedPowerLookup: true },
      boundary: 'owner-complete responses and authoritative tick placement remain unresolved',
    },
  } as const
}

export async function analyzePinnedAbc(bytes: Uint8Array): Promise<CollisionQueryReport> {
  assertPinnedIdentity(bytes)
  const { AbcFile, ExtendedBuffer, InstructionDisassembler } = await import('abc-disassembler')
  const abc: any = AbcFile.read(new ExtendedBuffer(Buffer.from(bytes)))
  const strings = abc.constant_pool.string as string[]
  const buildStrings = strings.filter((value) => /^\d+\.\d+\.\d+$/.test(value))
  invariant(buildStrings.length === 1 && buildStrings[0] === EXPECTED_BUILD, 'ABC build string changed')
  invariant(abc.method_body.length === EXPECTED_METHOD_BODY_COUNT, 'decoded method-body count changed')

  const disassembler = new InstructionDisassembler(abc)
  const methods = new Map<number, LocatedInstruction[]>()
  const invalidBranches: Array<{ methodId: number; pcs: number[] }> = []
  for (const body of abc.method_body) {
    const instructions = locateInstructions(body.code, disassembler.disassemble(body) as Instruction[])
    methods.set(body.method, instructions)
    const pcs = validateBranches(instructions, body.code.length)
    if (pcs.length > 0) invalidBranches.push({ methodId: body.method, pcs })
  }
  invariant(invalidBranches.length === 0, 'invalid branch targets detected')

  const queryClass = abc.instance[QUERY_CLASS_INDEX]
  invariant(queryClass, 'query class is absent')
  invariant(
    multinameName(abc.constant_pool.multiname[queryClass.name - 1], strings) === '_-91W',
    'query class identity changed',
  )
  const queryTraits = (queryClass.trait as any[]).filter(
    (trait) =>
      trait.data?.method === QUERY_METHOD_ID &&
      multinameName(abc.constant_pool.multiname[trait.name - 1], strings) === '_-K2O',
  )
  invariant(queryTraits.length === 1, 'query method trait identity changed')
  const queryQName = qnameKey(abc.constant_pool.multiname[queryTraits[0].name - 1])
  invariant(queryQName, 'query method is not an exact QName')

  const directCalls: DirectCallObservation[] = []
  for (const [methodId, instructions] of methods) {
    for (const [instructionIndex, instruction] of instructions.entries()) {
      if (!['callproperty', 'callpropvoid'].includes(instruction.name)) continue
      if (instructionName(instruction, strings) !== '_-K2O') continue
      if (qnameKey(instruction.params[0]) !== queryQName) continue
      const argumentCount = instruction.params[1]
      invariant(typeof argumentCount === 'number', 'direct call argument count is not numeric')
      directCalls.push({ methodId, pc: instruction.pc, argumentCount, instructionIndex, instructions })
    }
  }
  directCalls.sort((left, right) => left.methodId - right.methodId || left.pc - right.pc)
  const pcsByMethod = new Map<number, number[]>()
  for (const call of directCalls) {
    const pcs = pcsByMethod.get(call.methodId) ?? []
    pcs.push(call.pc)
    pcsByMethod.set(call.methodId, pcs)
  }
  const directCallLedger = [...pcsByMethod].map(([methodId, pcs]) => ({ methodId, calls: pcs.length, pcs }))
  validateDirectCallLedger(directCallLedger)

  const argumentCounts = directCalls.reduce<Record<number, number>>((counts, call) => {
    counts[call.argumentCount] = (counts[call.argumentCount] ?? 0) + 1
    return counts
  }, {})
  invariant(
    JSON.stringify(argumentCounts) === JSON.stringify({ 10: 69, 12: 10, 13: 14 }),
    'direct call argument-count partition changed',
  )

  const queryMethod = abc.method[QUERY_METHOD_ID]
  invariant(queryMethod?.param_count === 13, 'method 1390 parameter count changed')
  invariant(queryMethod.options?.option?.length === 3, 'method 1390 optional parameter count changed')
  assertDirectCallArguments(directCalls, strings)
  assertMethod1390(methods, strings)
  assertFlagInitializers(methods, strings)
  assertRegisteredCompositions(methods, strings)
  assertMethodOwners(abc, strings)
  assertOwnerResponseAnchors(methods, strings)

  return expectedCollisionQueryReport()
}

export type CommandResult = {
  exitCode: number
  stdout: string
  stderr: string
}

type CommandDependencies = {
  readInput: (path: string) => Promise<Uint8Array>
  analyze: (bytes: Uint8Array) => Promise<CollisionQueryReport>
}

const DEFAULT_DEPENDENCIES: CommandDependencies = {
  readInput: async (path) => new Uint8Array(await readFile(path)),
  analyze: analyzePinnedAbc,
}

function failureResult(reason: FailureReason): CommandResult {
  const exitCodes: Record<FailureReason, number> = {
    usage: 64,
    'input-unavailable': 66,
    'identity-mismatch': 65,
    'provenance-mismatch': 65,
  }
  return {
    exitCode: exitCodes[reason],
    stdout: '',
    stderr: `${JSON.stringify({ status: 'rejected', reason })}\n`,
  }
}

export async function runCollisionQueryProvenance(
  args: string[],
  dependencies: CommandDependencies = DEFAULT_DEPENDENCIES,
): Promise<CommandResult> {
  if (args.length !== 2 || args[0] !== '--abc' || args[1].length === 0) return failureResult('usage')

  let bytes: Uint8Array
  try {
    bytes = await dependencies.readInput(args[1])
  } catch {
    return failureResult('input-unavailable')
  }

  try {
    assertPinnedIdentity(bytes)
    const report = await dependencies.analyze(bytes)
    return { exitCode: 0, stdout: `${JSON.stringify(report, null, 2)}\n`, stderr: '' }
  } catch (error) {
    if (error instanceof ProvenanceError) return failureResult(error.reason)
    return failureResult('provenance-mismatch')
  }
}

if (import.meta.main) {
  const result = await runCollisionQueryProvenance(process.argv.slice(2))
  if (result.stdout) process.stdout.write(result.stdout)
  if (result.stderr) process.stderr.write(result.stderr)
  process.exitCode = result.exitCode
}
