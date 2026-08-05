type PayloadScalar = boolean | number | string | null

type PayloadScalarType =
  | 'boolean'
  | 'finalizer-outcome-code'
  | 'i32'
  | 'native-operation-code'
  | 'sha256'
  | 'slot-state'
  | 'u32'

type HookCategory =
  | 'cleanup'
  | 'finalizer'
  | 'native-completion'
  | 'origin'
  | 'payload-extraction'
  | 'setup'
  | 'writer-slot'

type HookPosition = 'after' | 'before' | 'entry' | 'handler'

export type PayloadField = {
  name: string
  type: PayloadScalarType
}

export type HookDefinition = {
  hookId: string
  category: HookCategory
  originalMethodId: number
  originalBytePc: number
  position: HookPosition
  expectedOpcode?: string
  expectedName?: string
  expectedArgumentCount?: number
  payloadSchemaId: keyof typeof PAYLOAD_SCHEMAS
}

export type TraceEvent = {
  schemaVersion: 1
  sequence: number
  hookId: string
  originalMethodId: number
  originalBytePc: number
  callDepth: number
  virtualTimeMs: number
  payload: PayloadScalar[]
}

export const PAYLOAD_SCHEMAS = {
  none: [] as PayloadField[],
  setupArguments: [
    { name: 'seed', type: 'u32' },
    { name: 'playlistId', type: 'u32' },
    { name: 'online', type: 'boolean' },
  ],
  slotTransition: [
    { name: 'before', type: 'slot-state' },
    { name: 'after', type: 'slot-state' },
  ],
  slotState: [{ name: 'state', type: 'slot-state' }],
  branchDecision: [
    { name: 'slotState', type: 'slot-state' },
    { name: 'branchTaken', type: 'boolean' },
  ],
  originSelection: [
    { name: 'lifecycleMask', type: 'u32' },
    { name: 'transitionHistoryMask', type: 'u32' },
    { name: 'lifecycleSubtype', type: 'i32' },
    { name: 'firstQuantizedTick', type: 'u32' },
    { name: 'selectedOrigin', type: 'u32' },
  ],
  payloadDigest: [
    { name: 'byteLength', type: 'u32' },
    { name: 'sha256', type: 'sha256' },
  ],
  nativeError: [{ name: 'pendingOperation', type: 'native-operation-code' }],
  finalizerOutcome: [{ name: 'outcome', type: 'finalizer-outcome-code' }],
} as const

export const CLEANUP_CALL_SITES = [
  [3212, 79],
  [3218, 1517],
  [3231, 286],
  [3265, 55],
  [3266, 5],
  [3270, 252],
  [3301, 69],
  [3328, 198],
  [3328, 223],
  [3328, 322],
  [3328, 375],
  [3433, 14],
  [3434, 94],
  [3435, 62],
  [3436, 63],
  [5228, 864],
  [5230, 30],
  [5231, 30],
  [5255, 20],
  [5264, 136],
  [5268, 22],
  [7322, 22],
  [7328, 22],
  [9313, 29],
  [9445, 70],
  [11238, 1203],
  [12806, 28],
] as const

const setupHooks: HookDefinition[] = [
  [3282, 361],
  [3514, 179],
  [5257, 229],
].map(([originalMethodId, originalBytePc]) => ({
  hookId: `setup.call.${originalMethodId}.${originalBytePc}`,
  category: 'setup',
  originalMethodId,
  originalBytePc,
  position: 'before',
  expectedOpcode: 'callpropvoid',
  expectedName: '_-fN',
  expectedArgumentCount: 3,
  payloadSchemaId: 'setupArguments',
}))

const cleanupHooks: HookDefinition[] = CLEANUP_CALL_SITES.map(([originalMethodId, originalBytePc]) => ({
  hookId: `cleanup.call.${originalMethodId}.${originalBytePc}`,
  category: 'cleanup',
  originalMethodId,
  originalBytePc,
  position: 'before',
  expectedOpcode: 'callpropvoid',
  expectedName: '_-22K',
  payloadSchemaId: 'slotState',
}))

const nativeOperations = [
  { name: 'open', pc: 1103, argumentCount: 2 },
  { name: 'writeBytes', pc: 1125, argumentCount: 1 },
  { name: 'close', pc: 1136, argumentCount: 0 },
] as const

const nativeHooks: HookDefinition[] = nativeOperations.flatMap((operation) =>
  (['before', 'after'] as const).map((position) => {
    const extractsPayload = operation.name === 'writeBytes' && position === 'before'
    return {
      hookId: `native.${operation.name}.${position}`,
      category: extractsPayload ? ('payload-extraction' as const) : ('native-completion' as const),
      originalMethodId: 6524,
      originalBytePc: operation.pc,
      position,
      expectedOpcode: 'callpropvoid',
      expectedName: operation.name,
      expectedArgumentCount: operation.argumentCount,
      payloadSchemaId: extractsPayload ? ('payloadDigest' as const) : ('none' as const),
    }
  }),
)

const hookDefinitions: HookDefinition[] = [
  ...setupHooks,
  {
    hookId: 'setup.header-forward',
    category: 'setup',
    originalMethodId: 3368,
    originalBytePc: 49,
    position: 'before',
    expectedOpcode: 'callpropvoid',
    expectedName: '_-63H',
    expectedArgumentCount: 3,
    payloadSchemaId: 'setupArguments',
  },
  {
    hookId: 'writer-slot.setup-write',
    category: 'writer-slot',
    originalMethodId: 3368,
    originalBytePc: 37,
    position: 'after',
    expectedOpcode: 'initproperty',
    expectedName: '_-JJ',
    payloadSchemaId: 'slotTransition',
  },
  {
    hookId: 'writer-slot.reset-close',
    category: 'writer-slot',
    originalMethodId: 3329,
    originalBytePc: 22,
    position: 'before',
    expectedOpcode: 'callpropvoid',
    expectedName: '_-J2g',
    payloadSchemaId: 'slotState',
  },
  {
    hookId: 'writer-slot.reset-write',
    category: 'writer-slot',
    originalMethodId: 3329,
    originalBytePc: 33,
    position: 'after',
    expectedOpcode: 'initproperty',
    expectedName: '_-JJ',
    payloadSchemaId: 'slotTransition',
  },
  {
    hookId: 'writer-slot.cleanup-read',
    category: 'writer-slot',
    originalMethodId: 3442,
    originalBytePc: 187,
    position: 'after',
    expectedOpcode: 'getproperty',
    expectedName: '_-JJ',
    payloadSchemaId: 'slotState',
  },
  ...cleanupHooks,
  {
    hookId: 'cleanup.writer-null-decision',
    category: 'cleanup',
    originalMethodId: 3442,
    originalBytePc: 194,
    position: 'before',
    expectedOpcode: 'ifeq',
    payloadSchemaId: 'branchDecision',
  },
  {
    hookId: 'cleanup.finalizer-dispatch',
    category: 'cleanup',
    originalMethodId: 3442,
    originalBytePc: 204,
    position: 'before',
    expectedOpcode: 'callpropvoid',
    expectedName: '_-x3N',
    expectedArgumentCount: 0,
    payloadSchemaId: 'slotState',
  },
  ...[
    [6520, 418, 'result'],
    [6521, 431, 'inputs'],
    [6522, 397, 'ko-faces'],
    [6523, 460, 'victory-faces'],
  ].map(([originalMethodId, originalBytePc, section]) => ({
    hookId: `origin.${section}.selected`,
    category: 'origin' as const,
    originalMethodId: originalMethodId as number,
    originalBytePc: originalBytePc as number,
    position: 'after' as const,
    expectedOpcode: 'setlocal',
    payloadSchemaId: 'originSelection' as const,
  })),
  {
    hookId: 'finalizer.entry',
    category: 'finalizer',
    originalMethodId: 6524,
    originalBytePc: 0,
    position: 'entry',
    payloadSchemaId: 'none',
  },
  ...nativeHooks,
  {
    hookId: 'native.error.caught',
    category: 'native-completion',
    originalMethodId: 6524,
    originalBytePc: 1145,
    position: 'handler',
    payloadSchemaId: 'nativeError',
  },
  {
    hookId: 'finalizer.return',
    category: 'finalizer',
    originalMethodId: 6524,
    originalBytePc: 1161,
    position: 'before',
    expectedOpcode: 'returnvoid',
    payloadSchemaId: 'finalizerOutcome',
  },
]

export const HOOK_DEFINITIONS: readonly Readonly<HookDefinition>[] = Object.freeze(
  hookDefinitions.map((hook) => Object.freeze(hook)),
)

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function compareText(left: string, right: string): number {
  if (left < right) return -1
  if (left > right) return 1
  return 0
}

function isUnsignedInteger(value: unknown, maximum: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= maximum
}

function validatePayloadScalar(value: unknown, type: PayloadScalarType): boolean {
  if (type === 'boolean') return typeof value === 'boolean'
  if (type === 'sha256') return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
  if (type === 'slot-state') return value === 0 || value === 1
  if (type === 'native-operation-code') return isUnsignedInteger(value, 3)
  if (type === 'finalizer-outcome-code') return isUnsignedInteger(value, 2)
  if (type === 'u32') return isUnsignedInteger(value, 0xffffffff)
  return Number.isSafeInteger(value) && Number(value) >= -0x80000000 && Number(value) <= 0x7fffffff
}

export function validateHookManifest(): void {
  const hookIds = new Set<string>()
  for (const hook of HOOK_DEFINITIONS) {
    assert(!hookIds.has(hook.hookId), `duplicate hook ID: ${hook.hookId}`)
    hookIds.add(hook.hookId)
    assert(hook.originalMethodId >= 0, `invalid method ID: ${hook.originalMethodId}`)
    assert(hook.originalBytePc >= 0, `invalid byte PC: ${hook.originalBytePc}`)
    assert(hook.payloadSchemaId in PAYLOAD_SCHEMAS, `unknown payload schema: ${hook.payloadSchemaId}`)
  }

  const cleanupAnchors = HOOK_DEFINITIONS.flatMap((hook) =>
    hook.hookId.startsWith('cleanup.call.') ? [`${hook.originalMethodId}:${hook.originalBytePc}`] : [],
  )
  const expectedCleanupAnchors = CLEANUP_CALL_SITES.map(([methodId, pc]) => `${methodId}:${pc}`)
  assert(
    JSON.stringify(cleanupAnchors) === JSON.stringify(expectedCleanupAnchors),
    'cleanup hook ledger does not cover all 27 callers in canonical order',
  )
}

export function validateTraceEvent(value: unknown): TraceEvent {
  assert(value !== null && typeof value === 'object' && !Array.isArray(value), 'trace event must be an object')
  const event = value as Partial<TraceEvent>
  const keys = Object.keys(event).sort(compareText)
  assert(
    JSON.stringify(keys) ===
      JSON.stringify(
        [
          'callDepth',
          'hookId',
          'originalBytePc',
          'originalMethodId',
          'payload',
          'schemaVersion',
          'sequence',
          'virtualTimeMs',
        ].sort(compareText),
      ),
    'trace event has missing or additional fields',
  )
  assert(event.schemaVersion === 1, 'trace schema version must be 1')
  assert(isUnsignedInteger(event.sequence, Number.MAX_SAFE_INTEGER), 'sequence must be a non-negative safe integer')
  assert(typeof event.hookId === 'string', 'hook ID must be a string')
  const hook = HOOK_DEFINITIONS.find((candidate) => candidate.hookId === event.hookId)
  assert(hook, `unknown hook ID: ${String(event.hookId)}`)
  assert(event.originalMethodId === hook.originalMethodId, 'event method does not match hook manifest')
  assert(event.originalBytePc === hook.originalBytePc, 'event PC does not match hook manifest')
  assert(isUnsignedInteger(event.callDepth, 0xffffffff), 'call depth must be a u32')
  assert(isUnsignedInteger(event.virtualTimeMs, Number.MAX_SAFE_INTEGER), 'virtual time must be non-negative')
  assert(Array.isArray(event.payload), 'payload must be an array')
  const schema = PAYLOAD_SCHEMAS[hook.payloadSchemaId]
  assert(event.payload.length === schema.length, `payload length does not match ${hook.payloadSchemaId}`)
  for (let index = 0; index < schema.length; index++) {
    assert(
      validatePayloadScalar(event.payload[index], schema[index].type),
      `invalid payload field ${schema[index].name}`,
    )
  }
  return event as TraceEvent
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    )
  }
  return value
}

export function canonicalJson(value: unknown): string {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`
}

validateHookManifest()
