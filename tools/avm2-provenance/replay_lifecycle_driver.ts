export const BUILT_IN_LIFECYCLE_EVENT_CODES = [
  'normal-completion',
  'disconnect',
  'forfeit',
  'host-quit',
  'rematch',
  'abort',
] as const

export type BuiltInLifecycleEventCode = (typeof BUILT_IN_LIFECYCLE_EVENT_CODES)[number]

type Sha256 = string

type BuiltInLifecycleEventSelector = Readonly<{
  kind: 'built-in'
  code: BuiltInLifecycleEventCode
}>

type ExtensionLifecycleEventSelector = Readonly<{
  kind: 'extension'
  code: string
  manifestSha256: Sha256
}>

export type LifecycleEventSelector = BuiltInLifecycleEventSelector | ExtensionLifecycleEventSelector

export type LifecycleInputEvent = Readonly<{
  selector: LifecycleEventSelector
  virtualStep: number
  ordinal: number
}>

export type LifecycleExtensionRegistration = Readonly<{
  code: string
  manifestSha256: Sha256
}>

export type LifecycleInjectionBinding = Readonly<{
  selector: LifecycleEventSelector
  injectionPointId: string
  expectedPathId: string
}>

type LifecycleDriverPlan = Readonly<{
  scenarioSha256: Sha256
  events: readonly LifecycleInputEvent[]
  bindings: readonly LifecycleInjectionBinding[]
  extensionRegistry: readonly LifecycleExtensionRegistration[]
}>

export type SyntheticLifecycleDriverInput = LifecycleDriverPlan &
  Readonly<{
    mode: 'synthetic'
  }>

export type TargetLifecycleDriverInput = LifecycleDriverPlan &
  Readonly<{
    mode: 'target'
    oracleArtifactSetSha256: Sha256
    observationManifestSha256: Sha256
    injectionManifestSha256: Sha256
    scenarioManifestSha256: Sha256
    capabilityProfileSha256: Sha256
    quiescenceContractSha256: Sha256
  }>

export type LifecycleDriverInput = SyntheticLifecycleDriverInput | TargetLifecycleDriverInput

export type LifecycleInjectionRequest = Readonly<{
  scenarioSha256: Sha256
  eventIndex: number
  selector: LifecycleEventSelector
  virtualStep: number
  ordinal: number
  injectionPointId: string
  expectedPathId: string
}>

export type LifecycleInjectionResponse =
  | Readonly<{
      status: 'observed'
      injectionPointId: string
      pathId: string
    }>
  | Readonly<{
      status: 'rejected'
    }>

export type LifecycleAdapterCompletion =
  | Readonly<{
      status: 'complete'
      injectionCount: number
    }>
  | Readonly<{
      status: 'failed'
    }>

export type SyntheticLifecycleAdapter = Readonly<{
  inject(request: LifecycleInjectionRequest): LifecycleInjectionResponse
  finish(expectedInjectionCount: number): LifecycleAdapterCompletion
}>

export type PrivacySafeLifecycleObservation = Readonly<{
  eventIndex: number
  virtualStep: number
  ordinal: number
}>

export type LifecycleDenialCode =
  | 'target-contracts-unavailable'
  | 'synthetic-adapter-missing'
  | 'scenario-identity-invalid'
  | 'event-count-invalid'
  | 'event-invalid'
  | 'event-order-invalid'
  | 'extension-registry-invalid'
  | 'binding-set-invalid'
  | 'binding-invalid'
  | 'input-access-failed'

export type LifecycleFailureCode =
  | 'adapter-threw'
  | 'adapter-rejected'
  | 'injection-observation-mismatch'
  | 'adapter-completion-failed'
  | 'adapter-completion-mismatch'

export type LifecycleDriverResult =
  | Readonly<{
      status: 'completed'
      evidenceScope: 'synthetic-driver-only'
      targetRuntimeExecuted: false
      scenarioSha256: Sha256
      observations: readonly PrivacySafeLifecycleObservation[]
      completion: Readonly<{
        kind: 'all-events-observed'
        injectionCount: number
      }>
    }>
  | Readonly<{
      status: 'denied'
      evidenceScope: 'synthetic-driver-only'
      targetRuntimeExecuted: false
      observations: readonly []
      failure: Readonly<{
        code: LifecycleDenialCode
        eventIndex?: number
      }>
    }>
  | Readonly<{
      status: 'failed'
      evidenceScope: 'synthetic-driver-only'
      targetRuntimeExecuted: false
      observations: readonly PrivacySafeLifecycleObservation[]
      failure: Readonly<{
        code: LifecycleFailureCode
        eventIndex?: number
      }>
    }>

const BUILT_IN_EVENT_SET = new Set<string>(BUILT_IN_LIFECYCLE_EVENT_CODES)
const MAX_EVENT_COUNT = 1024
const SHA256_PATTERN = /^[0-9a-f]{64}$/
const SAFE_IDENTIFIER_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/
const NO_OBSERVATIONS = Object.freeze([]) as readonly []

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasExactKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const compare = (left: string, right: string) => {
    if (left === right) return 0
    return left < right ? -1 : 1
  }
  const actual = Object.keys(record).sort(compare)
  const expected = [...keys].sort(compare)
  return actual.length === expected.length && actual.every((key, index) => key === expected[index])
}

function isSha256(value: unknown): value is Sha256 {
  return typeof value === 'string' && SHA256_PATTERN.test(value)
}

function isSafeIdentifier(value: unknown): value is string {
  return typeof value === 'string' && SAFE_IDENTIFIER_PATTERN.test(value)
}

function selectorKey(selector: LifecycleEventSelector): string {
  return selector.kind === 'built-in' ? `built-in:${selector.code}` : `extension:${selector.code}`
}

function denial(code: LifecycleDenialCode, eventIndex?: number): LifecycleDriverResult {
  const failure = Object.freeze(eventIndex === undefined ? { code } : { code, eventIndex })
  return Object.freeze({
    status: 'denied',
    evidenceScope: 'synthetic-driver-only',
    targetRuntimeExecuted: false,
    observations: NO_OBSERVATIONS,
    failure,
  })
}

function failure(
  code: LifecycleFailureCode,
  observations: readonly PrivacySafeLifecycleObservation[],
  eventIndex?: number,
): LifecycleDriverResult {
  const safeObservations = Object.freeze([...observations])
  const failure = Object.freeze(eventIndex === undefined ? { code } : { code, eventIndex })
  return Object.freeze({
    status: 'failed',
    evidenceScope: 'synthetic-driver-only',
    targetRuntimeExecuted: false,
    observations: safeObservations,
    failure,
  })
}

function validateExtensionRegistry(value: unknown): ReadonlyMap<string, Sha256> | undefined {
  if (!Array.isArray(value)) return undefined

  const byCode = new Map<string, Sha256>()
  for (const candidate of value) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, ['code', 'manifestSha256'])) return undefined
    if (!isSafeIdentifier(candidate.code) || !isSha256(candidate.manifestSha256) || byCode.has(candidate.code)) {
      return undefined
    }
    byCode.set(candidate.code, candidate.manifestSha256)
  }
  return byCode
}

function validateSelector(
  value: unknown,
  extensionRegistry: ReadonlyMap<string, Sha256>,
): LifecycleEventSelector | undefined {
  if (!isRecord(value) || typeof value.kind !== 'string') return undefined
  if (value.kind === 'built-in') {
    if (
      !hasExactKeys(value, ['kind', 'code']) ||
      typeof value.code !== 'string' ||
      !BUILT_IN_EVENT_SET.has(value.code)
    ) {
      return undefined
    }
    return Object.freeze({ kind: 'built-in', code: value.code as BuiltInLifecycleEventCode })
  }
  if (value.kind === 'extension') {
    if (
      !hasExactKeys(value, ['kind', 'code', 'manifestSha256']) ||
      !isSafeIdentifier(value.code) ||
      !isSha256(value.manifestSha256) ||
      extensionRegistry.get(value.code) !== value.manifestSha256
    ) {
      return undefined
    }
    return Object.freeze({ kind: 'extension', code: value.code, manifestSha256: value.manifestSha256 })
  }
  return undefined
}

function validateEvents(
  value: unknown,
  extensionRegistry: ReadonlyMap<string, Sha256>,
): { events: readonly LifecycleInputEvent[] } | { denial: LifecycleDriverResult } {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_EVENT_COUNT) {
    return { denial: denial('event-count-invalid') }
  }

  const events: LifecycleInputEvent[] = []
  let previousVirtualStep = -1
  let previousOrdinal = -1
  for (let eventIndex = 0; eventIndex < value.length; eventIndex++) {
    const candidate = value[eventIndex]
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate, ['selector', 'virtualStep', 'ordinal']) ||
      !Number.isSafeInteger(candidate.virtualStep) ||
      (candidate.virtualStep as number) < 0 ||
      !Number.isSafeInteger(candidate.ordinal) ||
      (candidate.ordinal as number) < 0
    ) {
      return { denial: denial('event-invalid', eventIndex) }
    }
    const selector = validateSelector(candidate.selector, extensionRegistry)
    if (!selector) return { denial: denial('event-invalid', eventIndex) }

    const virtualStep = candidate.virtualStep as number
    const ordinal = candidate.ordinal as number
    if (virtualStep < previousVirtualStep || (virtualStep === previousVirtualStep && ordinal <= previousOrdinal)) {
      return { denial: denial('event-order-invalid', eventIndex) }
    }
    previousVirtualStep = virtualStep
    previousOrdinal = ordinal
    events.push(Object.freeze({ selector, virtualStep, ordinal }))
  }
  return { events: Object.freeze(events) }
}

function validateBindings(
  value: unknown,
  events: readonly LifecycleInputEvent[],
  extensionRegistry: ReadonlyMap<string, Sha256>,
): { bindings: ReadonlyMap<string, LifecycleInjectionBinding> } | { denial: LifecycleDriverResult } {
  if (!Array.isArray(value)) return { denial: denial('binding-set-invalid') }

  const bindings = new Map<string, LifecycleInjectionBinding>()
  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate, ['selector', 'injectionPointId', 'expectedPathId']) ||
      !isSafeIdentifier(candidate.injectionPointId) ||
      !isSafeIdentifier(candidate.expectedPathId)
    ) {
      return { denial: denial('binding-invalid') }
    }
    const selector = validateSelector(candidate.selector, extensionRegistry)
    if (!selector) return { denial: denial('binding-invalid') }
    const key = selectorKey(selector)
    if (bindings.has(key)) return { denial: denial('binding-set-invalid') }
    bindings.set(
      key,
      Object.freeze({
        selector,
        injectionPointId: candidate.injectionPointId,
        expectedPathId: candidate.expectedPathId,
      }),
    )
  }

  const requiredKeys = new Set(events.map((event) => selectorKey(event.selector)))
  if (bindings.size !== requiredKeys.size || [...requiredKeys].some((key) => !bindings.has(key))) {
    return { denial: denial('binding-set-invalid') }
  }
  return { bindings }
}

function preflight(input: SyntheticLifecycleDriverInput):
  | {
      scenarioSha256: Sha256
      events: readonly LifecycleInputEvent[]
      bindings: ReadonlyMap<string, LifecycleInjectionBinding>
    }
  | { denial: LifecycleDriverResult } {
  if (!isRecord(input) || !hasExactKeys(input, ['mode', 'scenarioSha256', 'events', 'bindings', 'extensionRegistry'])) {
    return { denial: denial('event-invalid') }
  }
  if (!isSha256(input.scenarioSha256)) return { denial: denial('scenario-identity-invalid') }

  const extensionRegistry = validateExtensionRegistry(input.extensionRegistry)
  if (!extensionRegistry) return { denial: denial('extension-registry-invalid') }

  const eventsResult = validateEvents(input.events, extensionRegistry)
  if ('denial' in eventsResult) return eventsResult

  const bindingsResult = validateBindings(input.bindings, eventsResult.events, extensionRegistry)
  if ('denial' in bindingsResult) return bindingsResult

  return {
    scenarioSha256: input.scenarioSha256,
    events: eventsResult.events,
    bindings: bindingsResult.bindings,
  }
}

export function runNonLiveLifecycleDriver(
  input: LifecycleDriverInput,
  adapter?: SyntheticLifecycleAdapter,
): LifecycleDriverResult {
  if (!isRecord(input)) return denial('target-contracts-unavailable')
  try {
    if (input.mode !== 'synthetic') return denial('target-contracts-unavailable')
  } catch {
    return denial('input-access-failed')
  }
  if (!adapter) return denial('synthetic-adapter-missing')

  let plan: ReturnType<typeof preflight>
  try {
    plan = preflight(input)
  } catch {
    return denial('input-access-failed')
  }
  if ('denial' in plan) return plan.denial

  const observations: PrivacySafeLifecycleObservation[] = []
  for (let eventIndex = 0; eventIndex < plan.events.length; eventIndex++) {
    const event = plan.events[eventIndex]
    const binding = plan.bindings.get(selectorKey(event.selector))
    if (!binding) return denial('binding-set-invalid', eventIndex)

    const request: LifecycleInjectionRequest = Object.freeze({
      scenarioSha256: plan.scenarioSha256,
      eventIndex,
      selector: event.selector,
      virtualStep: event.virtualStep,
      ordinal: event.ordinal,
      injectionPointId: binding.injectionPointId,
      expectedPathId: binding.expectedPathId,
    })

    try {
      const response = adapter.inject(request)
      if (!isRecord(response)) return failure('injection-observation-mismatch', observations, eventIndex)
      if (response.status === 'rejected') {
        return hasExactKeys(response, ['status'])
          ? failure('adapter-rejected', observations, eventIndex)
          : failure('injection-observation-mismatch', observations, eventIndex)
      }
      if (
        response.status !== 'observed' ||
        !hasExactKeys(response, ['status', 'injectionPointId', 'pathId']) ||
        response.injectionPointId !== binding.injectionPointId ||
        response.pathId !== binding.expectedPathId
      ) {
        return failure('injection-observation-mismatch', observations, eventIndex)
      }
    } catch {
      return failure('adapter-threw', observations, eventIndex)
    }

    observations.push(
      Object.freeze({
        eventIndex,
        virtualStep: event.virtualStep,
        ordinal: event.ordinal,
      }),
    )
  }

  try {
    const completion = adapter.finish(plan.events.length)
    if (!isRecord(completion)) return failure('adapter-completion-mismatch', observations)
    if (completion.status === 'failed') {
      return hasExactKeys(completion, ['status'])
        ? failure('adapter-completion-failed', observations)
        : failure('adapter-completion-mismatch', observations)
    }
    if (
      completion.status !== 'complete' ||
      !hasExactKeys(completion, ['status', 'injectionCount']) ||
      completion.injectionCount !== plan.events.length
    ) {
      return failure('adapter-completion-mismatch', observations)
    }
  } catch {
    return failure('adapter-threw', observations)
  }

  const completion = Object.freeze({ kind: 'all-events-observed' as const, injectionCount: observations.length })
  return Object.freeze({
    status: 'completed',
    evidenceScope: 'synthetic-driver-only',
    targetRuntimeExecuted: false,
    scenarioSha256: plan.scenarioSha256,
    observations: Object.freeze([...observations]),
    completion,
  })
}
