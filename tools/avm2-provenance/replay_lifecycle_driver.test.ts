import { describe, expect, test } from 'bun:test'

import {
  BUILT_IN_LIFECYCLE_EVENT_CODES,
  type BuiltInLifecycleEventCode,
  type LifecycleAdapterCompletion,
  type LifecycleDriverInput,
  type LifecycleInjectionRequest,
  type LifecycleInjectionResponse,
  type LifecycleInputEvent,
  type SyntheticLifecycleAdapter,
  runNonLiveLifecycleDriver,
} from './replay_lifecycle_driver'

const SCENARIO_SHA256 = 'a'.repeat(64)
const EXTENSION_MANIFEST_SHA256 = 'b'.repeat(64)

function builtInSelector(code: BuiltInLifecycleEventCode) {
  return { kind: 'built-in' as const, code }
}

function builtInEvent(code: BuiltInLifecycleEventCode, virtualStep: number, ordinal: number): LifecycleInputEvent {
  return { selector: builtInSelector(code), virtualStep, ordinal }
}

function binding(code: BuiltInLifecycleEventCode) {
  return {
    selector: builtInSelector(code),
    injectionPointId: `inject-${code}`,
    expectedPathId: `path-${code}`,
  }
}

function syntheticInput(overrides: Partial<LifecycleDriverInput> = {}): LifecycleDriverInput {
  return {
    mode: 'synthetic',
    scenarioSha256: SCENARIO_SHA256,
    extensionRegistry: [],
    events: [builtInEvent('normal-completion', 1, 0)],
    bindings: [binding('normal-completion')],
    ...overrides,
  } as LifecycleDriverInput
}

class RecordingAdapter implements SyntheticLifecycleAdapter {
  readonly requests: LifecycleInjectionRequest[] = []

  constructor(
    private readonly injectResult?: (request: LifecycleInjectionRequest) => LifecycleInjectionResponse,
    private readonly completionCountOffset = 0,
  ) {}

  inject(request: LifecycleInjectionRequest): LifecycleInjectionResponse {
    this.requests.push(request)
    return (
      this.injectResult?.(request) ?? {
        status: 'observed',
        injectionPointId: request.injectionPointId,
        pathId: request.expectedPathId,
      }
    )
  }

  finish(expectedInjectionCount: number) {
    return { status: 'complete' as const, injectionCount: expectedInjectionCount + this.completionCountOffset }
  }
}

describe('runNonLiveLifecycleDriver', () => {
  test('drives every built-in event through its declared synthetic path in canonical order', () => {
    const events = BUILT_IN_LIFECYCLE_EVENT_CODES.map((code, index) => builtInEvent(code, Math.floor(index / 2), index))
    const adapter = new RecordingAdapter()

    const result = runNonLiveLifecycleDriver(
      syntheticInput({
        events,
        bindings: BUILT_IN_LIFECYCLE_EVENT_CODES.map(binding),
      }),
      adapter,
    )

    expect(result.status).toBe('completed')
    expect(Object.isFrozen(result.observations)).toBe(true)
    expect(adapter.requests.map((request) => request.selector.code)).toEqual([...BUILT_IN_LIFECYCLE_EVENT_CODES])
    expect(adapter.requests.map((request) => [request.virtualStep, request.ordinal])).toEqual(
      events.map((event) => [event.virtualStep, event.ordinal]),
    )
    expect(result).toMatchObject({
      evidenceScope: 'synthetic-driver-only',
      targetRuntimeExecuted: false,
      scenarioSha256: SCENARIO_SHA256,
      completion: { kind: 'all-events-observed', injectionCount: BUILT_IN_LIFECYCLE_EVENT_CODES.length },
    })
  })

  test('supports only manifest-registered extension events', () => {
    const selector = {
      kind: 'extension' as const,
      code: 'transfer-timeout',
      manifestSha256: EXTENSION_MANIFEST_SHA256,
    }
    const adapter = new RecordingAdapter()

    const result = runNonLiveLifecycleDriver(
      syntheticInput({
        extensionRegistry: [{ code: selector.code, manifestSha256: selector.manifestSha256 }],
        events: [{ selector, virtualStep: 4, ordinal: 0 }],
        bindings: [{ selector, injectionPointId: 'inject-transfer-timeout', expectedPathId: 'path-transfer-timeout' }],
      }),
      adapter,
    )

    expect(result.status).toBe('completed')
    expect(adapter.requests).toHaveLength(1)
    expect(adapter.requests[0].selector).toEqual(selector)
    expect(JSON.stringify(result)).not.toContain(selector.code)
    expect(JSON.stringify(result)).not.toContain('inject-transfer-timeout')
    expect(JSON.stringify(result)).not.toContain('path-transfer-timeout')
  })

  test('produces byte-identical output for the same plan', () => {
    const input = syntheticInput({
      events: [builtInEvent('disconnect', 3, 0), builtInEvent('abort', 3, 1)],
      bindings: [binding('disconnect'), binding('abort')],
    })

    const first = runNonLiveLifecycleDriver(input, new RecordingAdapter())
    const second = runNonLiveLifecycleDriver(input, new RecordingAdapter())

    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  test('denies target execution while authenticated contracts are unavailable', () => {
    const adapter = new RecordingAdapter()
    const result = runNonLiveLifecycleDriver(
      {
        mode: 'target',
        scenarioSha256: SCENARIO_SHA256,
        events: [builtInEvent('disconnect', 0, 0)],
        bindings: [binding('disconnect')],
        extensionRegistry: [],
        oracleArtifactSetSha256: '1'.repeat(64),
        observationManifestSha256: '2'.repeat(64),
        injectionManifestSha256: '3'.repeat(64),
        scenarioManifestSha256: '4'.repeat(64),
        capabilityProfileSha256: '5'.repeat(64),
        quiescenceContractSha256: '6'.repeat(64),
      },
      adapter,
    )

    expect(result).toEqual({
      status: 'denied',
      evidenceScope: 'synthetic-driver-only',
      targetRuntimeExecuted: false,
      observations: [],
      failure: { code: 'target-contracts-unavailable' },
    })
    expect(adapter.requests).toHaveLength(0)
  })

  test('denies missing adapters and malformed plans without side effects', () => {
    const adapter = new RecordingAdapter()
    const missingAdapter = runNonLiveLifecycleDriver(syntheticInput())
    const invalidScenario = runNonLiveLifecycleDriver(
      syntheticInput({ scenarioSha256: '/private/scenario.replay' }),
      adapter,
    )
    const emptyPlan = runNonLiveLifecycleDriver(syntheticInput({ events: [], bindings: [] }), adapter)

    expect(missingAdapter).toMatchObject({ status: 'denied', failure: { code: 'synthetic-adapter-missing' } })
    expect(invalidScenario).toMatchObject({ status: 'denied', failure: { code: 'scenario-identity-invalid' } })
    expect(JSON.stringify(invalidScenario)).not.toContain('/private')
    expect(emptyPlan).toMatchObject({ status: 'denied', failure: { code: 'event-count-invalid' } })
    expect(adapter.requests).toHaveLength(0)
  })

  test('converts hostile input accessors into a stable denial', () => {
    const secret = '/private/input-accessor'
    const input = syntheticInput()
    Object.defineProperty(input, 'events', {
      get() {
        throw new Error(secret)
      },
    })

    const result = runNonLiveLifecycleDriver(input, new RecordingAdapter())

    expect(result).toMatchObject({ status: 'denied', failure: { code: 'input-access-failed' } })
    expect(JSON.stringify(result)).not.toContain(secret)
  })

  test('preflights the full plan before invoking the adapter', () => {
    const adapter = new RecordingAdapter()
    const result = runNonLiveLifecycleDriver(
      syntheticInput({
        events: [builtInEvent('disconnect', 0, 0), builtInEvent('forfeit', 1, 0)],
        bindings: [binding('disconnect')],
      }),
      adapter,
    )

    expect(result).toMatchObject({ status: 'denied', failure: { code: 'binding-set-invalid' } })
    expect(adapter.requests).toHaveLength(0)
  })

  test('denies decreasing and duplicate order keys before invoking the adapter', () => {
    for (const events of [
      [builtInEvent('disconnect', 2, 0), builtInEvent('forfeit', 1, 0)],
      [builtInEvent('disconnect', 1, 0), builtInEvent('forfeit', 1, 0)],
    ]) {
      const adapter = new RecordingAdapter()
      const result = runNonLiveLifecycleDriver(
        syntheticInput({ events, bindings: [binding('disconnect'), binding('forfeit')] }),
        adapter,
      )

      expect(result).toMatchObject({ status: 'denied', failure: { code: 'event-order-invalid', eventIndex: 1 } })
      expect(adapter.requests).toHaveLength(0)
    }
  })

  test('denies unregistered extensions before invoking the adapter', () => {
    const selector = {
      kind: 'extension' as const,
      code: 'unregistered-exit',
      manifestSha256: EXTENSION_MANIFEST_SHA256,
    }
    const adapter = new RecordingAdapter()
    const result = runNonLiveLifecycleDriver(
      syntheticInput({
        events: [{ selector, virtualStep: 0, ordinal: 0 }],
        bindings: [{ selector, injectionPointId: 'inject-extension', expectedPathId: 'path-extension' }],
      }),
      adapter,
    )

    expect(result).toMatchObject({ status: 'denied', failure: { code: 'event-invalid', eventIndex: 0 } })
    expect(adapter.requests).toHaveLength(0)
  })

  test('returns a stable failure without exposing adapter exceptions', () => {
    const secret = '/private/player-name.replay access token'
    const adapter: SyntheticLifecycleAdapter = {
      inject() {
        throw new Error(secret)
      },
      finish() {
        throw new Error(secret)
      },
    }

    const result = runNonLiveLifecycleDriver(syntheticInput(), adapter)

    expect(result).toMatchObject({ status: 'failed', failure: { code: 'adapter-threw', eventIndex: 0 } })
    expect(JSON.stringify(result)).not.toContain(secret)
    expect(JSON.stringify(result)).not.toContain('/private')
  })

  test('redacts exceptions from hostile adapter response accessors', () => {
    const secret = '/private/response-accessor'
    const adapter: SyntheticLifecycleAdapter = {
      inject() {
        const response = {} as LifecycleInjectionResponse
        Object.defineProperty(response, 'status', {
          get() {
            throw new Error(secret)
          },
        })
        return response
      },
      finish(expectedInjectionCount) {
        return { status: 'complete', injectionCount: expectedInjectionCount }
      },
    }

    const result = runNonLiveLifecycleDriver(syntheticInput(), adapter)

    expect(result).toMatchObject({ status: 'failed', failure: { code: 'adapter-threw', eventIndex: 0 } })
    expect(JSON.stringify(result)).not.toContain(secret)
  })

  test('does not echo mismatched adapter paths', () => {
    const secretPath = '/private/player-name.replay'
    const result = runNonLiveLifecycleDriver(
      syntheticInput(),
      new RecordingAdapter((request) => ({
        status: 'observed',
        injectionPointId: request.injectionPointId,
        pathId: secretPath,
      })),
    )

    expect(result).toMatchObject({
      status: 'failed',
      observations: [],
      failure: { code: 'injection-observation-mismatch', eventIndex: 0 },
    })
    expect(JSON.stringify(result)).not.toContain(secretPath)
  })

  test('surfaces adapter rejection, completion failure, and completion mismatch separately', () => {
    const rejected = runNonLiveLifecycleDriver(syntheticInput(), new RecordingAdapter(() => ({ status: 'rejected' })))
    const completionFailed = runNonLiveLifecycleDriver(syntheticInput(), {
      inject(request) {
        return {
          status: 'observed',
          injectionPointId: request.injectionPointId,
          pathId: request.expectedPathId,
        }
      },
      finish() {
        return { status: 'failed' }
      },
    })
    const incomplete = runNonLiveLifecycleDriver(syntheticInput(), new RecordingAdapter(undefined, -1))

    expect(rejected).toMatchObject({ status: 'failed', failure: { code: 'adapter-rejected', eventIndex: 0 } })
    expect(completionFailed).toMatchObject({ status: 'failed', failure: { code: 'adapter-completion-failed' } })
    expect(incomplete).toMatchObject({ status: 'failed', failure: { code: 'adapter-completion-mismatch' } })
  })

  test('rejects undeclared adapter response fields without echoing them', () => {
    const secret = 'private-adapter-field'
    const result = runNonLiveLifecycleDriver(
      syntheticInput(),
      new RecordingAdapter(
        (request) =>
          ({
            status: 'observed',
            injectionPointId: request.injectionPointId,
            pathId: request.expectedPathId,
            extra: secret,
          }) as LifecycleInjectionResponse,
      ),
    )

    const completionResult = runNonLiveLifecycleDriver(syntheticInput(), {
      inject(request) {
        return {
          status: 'observed',
          injectionPointId: request.injectionPointId,
          pathId: request.expectedPathId,
        }
      },
      finish(expectedInjectionCount) {
        return {
          status: 'complete',
          injectionCount: expectedInjectionCount,
          extra: secret,
        } as LifecycleAdapterCompletion
      },
    })

    expect(result).toMatchObject({ status: 'failed', failure: { code: 'injection-observation-mismatch' } })
    expect(completionResult).toMatchObject({ status: 'failed', failure: { code: 'adapter-completion-mismatch' } })
    expect(JSON.stringify(result)).not.toContain(secret)
    expect(JSON.stringify(completionResult)).not.toContain(secret)
  })

  test('rejects undeclared fields without echoing their values', () => {
    const secret = 'private-player-name'
    const input = syntheticInput()
    const eventWithPrivatePayload = {
      ...input.events[0],
      playerName: secret,
    }
    const result = runNonLiveLifecycleDriver(
      {
        ...input,
        events: [eventWithPrivatePayload],
      } as LifecycleDriverInput,
      new RecordingAdapter(),
    )

    expect(result).toMatchObject({ status: 'denied', failure: { code: 'event-invalid', eventIndex: 0 } })
    expect(JSON.stringify(result)).not.toContain(secret)
  })
})
