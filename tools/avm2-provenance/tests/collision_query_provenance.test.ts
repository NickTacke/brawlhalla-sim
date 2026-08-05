import { describe, expect, test } from 'bun:test'
import {
  type LocatedInstruction,
  callArgumentExpressions,
  evaluateIntegerExpression,
  locateInstructions,
  qnameKey,
  validateBranches,
} from '../avm2_decoder.js'
import {
  EXPECTED_ABC_SHA256,
  EXPECTED_DIRECT_CALL_LEDGER,
  ProvenanceError,
  expectedCollisionQueryReport,
  runCollisionQueryProvenance,
  validateDirectCallLedger,
} from '../collision_query_provenance.js'

describe('AVM2 decoder guards', () => {
  test('locates variable-width operands without retaining source bytes', () => {
    const instructions = locateInstructions(new Uint8Array([0x24, 0x7f, 0x25, 0xac, 0x02]), [
      { id: 0x24, name: 'pushbyte', params: [127], types: ['u8'] },
      { id: 0x25, name: 'pushshort', params: [300], types: ['u30'] },
    ])

    expect(instructions.map(({ pc, endPc }) => ({ pc, endPc }))).toEqual([
      { pc: 0, endPc: 2 },
      { pc: 2, endPc: 5 },
    ])
  })

  test('rejects opcode and decode-length drift', () => {
    expect(() =>
      locateInstructions(new Uint8Array([0x25, 0x00]), [{ id: 0x24, name: 'pushbyte', params: [0], types: ['u8'] }]),
    ).toThrow('opcode mismatch')
    expect(() => locateInstructions(new Uint8Array([0x47]), [])).toThrow('decode stopped')
  })

  test('accepts terminal branches and reports invalid targets', () => {
    const branch: LocatedInstruction = {
      id: 0x10,
      name: 'jump',
      params: [0],
      types: ['s24'],
      index: 0,
      pc: 0,
      endPc: 4,
    }
    expect(validateBranches([branch], 4)).toEqual([])
    expect(validateBranches([{ ...branch, params: [1] }], 4)).toEqual([0])
  })

  test('splits property-call arguments and evaluates exact integer expressions', () => {
    const argumentsAndCall: LocatedInstruction[] = [
      ...Array.from({ length: 10 }, (_, index) => ({
        id: 0x24,
        name: 'pushbyte',
        params: [index],
        types: ['u8'],
        index,
        pc: index * 2,
        endPc: index * 2 + 2,
      })),
      {
        id: 0x46,
        name: 'callproperty',
        params: [{ kind: 7, data: { ns: 1, name: '_-K2O' } }, 10],
        types: ['multiname', 'u30'],
        index: 10,
        pc: 20,
        endPc: 23,
      },
    ]

    const expressions = callArgumentExpressions(argumentsAndCall, 10)
    expect(expressions).toHaveLength(10)
    expect(evaluateIntegerExpression(expressions[8], [])).toEqual({ kind: 'constant', value: 8 })
    expect(evaluateIntegerExpression(expressions[9], [])).toEqual({ kind: 'constant', value: 9 })
  })

  test('distinguishes identical local names in different QName namespaces', () => {
    expect(qnameKey({ kind: 7, data: { ns: 1, name: 2 } })).toBe('1:2')
    expect(qnameKey({ kind: 7, data: { ns: 2, name: 2 } })).toBe('2:2')
  })

  test('derives a composite value from an exact property expression', () => {
    const expression: LocatedInstruction[] = [
      { id: 0x24, name: 'pushbyte', params: [1], types: ['u8'], index: 0, pc: 0, endPc: 2 },
      {
        id: 0x60,
        name: 'getlex',
        params: [{ kind: 7, data: { ns: 1, name: '_-X2i' } }],
        types: ['multiname'],
        index: 1,
        pc: 2,
        endPc: 4,
      },
      {
        id: 0x66,
        name: 'getproperty',
        params: [{ kind: 7, data: { ns: 1, name: '_-zM' } }],
        types: ['multiname'],
        index: 2,
        pc: 4,
        endPc: 6,
      },
      { id: 0xa0, name: 'bitor', params: [], types: [], index: 3, pc: 6, endPc: 7 },
    ]

    expect(evaluateIntegerExpression(expression, [], { '_-zM': 16 })).toEqual({ kind: 'constant', value: 17 })
    expect(evaluateIntegerExpression(expression, [], {})).toEqual({ kind: 'unknown' })
  })
})

describe('collision query contract', () => {
  test('pins the complete direct call ledger', () => {
    expect(EXPECTED_DIRECT_CALL_LEDGER).toHaveLength(38)
    expect(EXPECTED_DIRECT_CALL_LEDGER.reduce((count, entry) => count + entry.calls, 0)).toBe(93)
    expect(() => validateDirectCallLedger(EXPECTED_DIRECT_CALL_LEDGER.map((entry) => ({ ...entry })))).not.toThrow()
  })

  test('fails closed when one direct call PC drifts', () => {
    const changed = EXPECTED_DIRECT_CALL_LEDGER.map((entry) => ({ ...entry, pcs: [...entry.pcs] }))
    changed[0].pcs[0] += 1

    expect(() => validateDirectCallLedger(changed)).toThrow(ProvenanceError)
  })

  test('emits only bounded derived evidence', () => {
    const report = expectedCollisionQueryReport()
    const serialized = JSON.stringify(report)

    expect(report.identity.abcSha256).toBe(EXPECTED_ABC_SHA256)
    expect(report.directCalls.callCount).toBe(93)
    expect(report.directCalls.queryOptions).toEqual({ zero: 67, four: 2, eight: 21, nine: 2, eleven: 1 })
    expect(report.directCalls.queryMasks.runtimeLocalMasks).toBe(18)
    expect(report.flags.compositions.find((entry) => entry.name === 'LavaCollision')?.value).toBe(657)
    expect(report.flags.compositions.find((entry) => entry.name === 'MudCollision')?.value).toBe(128)
    expect(report.boundedOwnerResponses.bounce.factor).toBe(0.9)
    expect(report.boundedOwnerResponses.sticky.tickDomainOffset).toBe(5000)
    expect(serialized).not.toContain('inputPath')
    expect(serialized).not.toContain('instructions')
    expect(serialized).not.toContain('constant_pool')
  })
})

describe('privacy-safe command failures', () => {
  test('rejects unsupported arguments without echoing them', async () => {
    const secretPath = 'private-input-location'
    const result = await runCollisionQueryProvenance(['--wrong', secretPath], {
      readInput: async () => new Uint8Array(),
      analyze: async () => expectedCollisionQueryReport(),
    })

    expect(result.exitCode).toBe(64)
    expect(result.stderr).toBe('{"status":"rejected","reason":"usage"}\n')
    expect(result.stderr).not.toContain(secretPath)
  })

  test('redacts filesystem failures', async () => {
    const secretPath = 'unavailable-private-input'
    const result = await runCollisionQueryProvenance(['--abc', secretPath], {
      readInput: async () => {
        throw new Error(`cannot read ${secretPath}`)
      },
      analyze: async () => expectedCollisionQueryReport(),
    })

    expect(result.exitCode).toBe(66)
    expect(result.stderr).toBe('{"status":"rejected","reason":"input-unavailable"}\n')
    expect(result.stderr).not.toContain(secretPath)
  })

  test('rejects identity drift before invoking the decoder and hides the observed hash', async () => {
    let analyzed = false
    const driftedBytes = new TextEncoder().encode('private payload')
    const result = await runCollisionQueryProvenance(['--abc', 'redacted'], {
      readInput: async () => driftedBytes,
      analyze: async () => {
        analyzed = true
        return expectedCollisionQueryReport()
      },
    })

    expect(analyzed).toBe(false)
    expect(result.exitCode).toBe(65)
    expect(result.stderr).toBe('{"status":"rejected","reason":"identity-mismatch"}\n')
    expect(result.stderr).not.toContain('private payload')
    expect(result.stderr).not.toContain(EXPECTED_ABC_SHA256)
  })
})
