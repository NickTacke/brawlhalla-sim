import { describe, expect, test } from 'bun:test'

import {
  CLEANUP_CALL_SITES,
  HOOK_DEFINITIONS,
  canonicalJson,
  validateHookManifest,
  validateTraceEvent,
} from '../replay_lifecycle_trace_schema.js'

function requireHook(hookId: string) {
  const hook = HOOK_DEFINITIONS.find((candidate) => candidate.hookId === hookId)
  if (!hook) throw new Error(`missing test hook: ${hookId}`)
  return hook
}

const baseEvent = {
  schemaVersion: 1 as const,
  sequence: 0,
  hookId: 'setup.call.3282.361',
  originalMethodId: 3282,
  originalBytePc: 361,
  callDepth: 2,
  virtualTimeMs: 0,
  payload: [123, 108, true],
}

describe('replay lifecycle hook manifest', () => {
  test('covers every cleanup caller in canonical order', () => {
    expect(() => validateHookManifest()).not.toThrow()
    expect(HOOK_DEFINITIONS.filter((hook) => hook.hookId.startsWith('cleanup.call.'))).toHaveLength(
      CLEANUP_CALL_SITES.length,
    )
    expect(CLEANUP_CALL_SITES).toHaveLength(27)
  })

  test('exposes an immutable canonical hook ledger', () => {
    expect(() => (HOOK_DEFINITIONS as unknown as unknown[]).push({})).toThrow()
  })

  test('canonicalizes object keys without reordering arrays', () => {
    expect(canonicalJson({ z: 1, a: [{ z: 2, a: 3 }] })).toBe(
      '{\n  "a": [\n    {\n      "a": 3,\n      "z": 2\n    }\n  ],\n  "z": 1\n}\n',
    )
  })
})

describe('privacy-safe lifecycle trace events', () => {
  test('accepts a manifest-bound setup event', () => {
    expect(validateTraceEvent(baseEvent)).toEqual(baseEvent)
  })

  test('rejects a method or PC that does not match the hook', () => {
    expect(() => validateTraceEvent({ ...baseEvent, originalMethodId: 3368 })).toThrow(
      'event method does not match hook manifest',
    )
  })

  test('rejects arbitrary strings in payload extraction', () => {
    const payloadHook = requireHook('native.writeBytes.before')
    expect(() =>
      validateTraceEvent({
        ...baseEvent,
        hookId: payloadHook.hookId,
        originalMethodId: payloadHook.originalMethodId,
        originalBytePc: payloadHook.originalBytePc,
        payload: [128, '/private/replay.replay'],
      }),
    ).toThrow('invalid payload field sha256')
  })

  test('accepts only lowercase SHA-256 payload digests', () => {
    const payloadHook = requireHook('native.writeBytes.before')
    const event = {
      ...baseEvent,
      hookId: payloadHook.hookId,
      originalMethodId: payloadHook.originalMethodId,
      originalBytePc: payloadHook.originalBytePc,
      payload: [128, 'a'.repeat(64)],
    }
    expect(validateTraceEvent(event)).toEqual(event)
  })

  test('rejects undeclared hook identities', () => {
    expect(() =>
      validateTraceEvent({ ...baseEvent, hookId: 'forged', originalMethodId: -1, originalBytePc: -1 }),
    ).toThrow('unknown hook ID')
  })

  test('rejects undeclared native operation and finalizer outcome codes', () => {
    for (const hookId of ['native.error.caught', 'finalizer.return']) {
      const hook = requireHook(hookId)
      expect(() =>
        validateTraceEvent({
          ...baseEvent,
          hookId,
          originalMethodId: hook.originalMethodId,
          originalBytePc: hook.originalBytePc,
          payload: [255],
        }),
      ).toThrow('invalid payload field')
    }
  })

  test('rejects additional trace fields', () => {
    expect(() => validateTraceEvent({ ...baseEvent, sourcePath: '/private/replay.replay' })).toThrow(
      'trace event has missing or additional fields',
    )
  })
})
