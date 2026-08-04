import { describe, expect, test } from 'bun:test'
import { deflateSync } from 'node:zlib'
import { EnvelopeError, FormatVersionUnsupportedError, ParseBoundsError } from '../src/errors'
import { parse, peekFormatVersion } from '../src/parser'
import { applyXor } from '../src/xor-key'

describe('parse error paths', () => {
  test('throws FormatVersionUnsupportedError on unsupported version', () => {
    // Build an envelope whose first u32 is 999 (not in SUPPORTED_FORMAT_VERSIONS).
    // Bit layout: version=999 then state=2 (End) packed into the next 4 bits.
    // 999 dec = 0x000003E7, then nibble 0x2 for End, then zero padding.
    const body = new Uint8Array([0x00, 0x00, 0x03, 0xe7, 0x20, 0x00, 0x00, 0x00])
    const xored = applyXor(body)
    const raw = new Uint8Array(deflateSync(xored))
    expect(() => parse(raw)).toThrow(FormatVersionUnsupportedError)
  })

  test('throws EnvelopeError on garbage bytes', () => {
    expect(() => parse(new Uint8Array([1, 2, 3]))).toThrow(EnvelopeError)
  })

  test('peekFormatVersion returns null on garbage', () => {
    expect(peekFormatVersion(new Uint8Array([1, 2, 3]))).toBe(null)
  })

  test('throws ParseBoundsError on input-entity overflow', () => {
    // Build an envelope: formatVersion=264, state=STATE_INPUTS(1), then 17 input
    // entity iterations where each is bool=1 + bits(5)=0 + i32 ic=0 (no inner inputs).
    // The 17th iteration's leading bool should trip MAX_INPUT_ENTITIES=16.
    const bits: number[] = []
    const pushBits = (value: number, width: number) => {
      for (let i = width - 1; i >= 0; i--) bits.push((value >>> i) & 1)
    }
    pushBits(264, 32)
    pushBits(1, 4) // STATE_INPUTS
    for (let i = 0; i < 17; i++) {
      bits.push(1) // outer bool
      pushBits(0, 5) // entityId
      pushBits(0, 32) // input count = 0
    }
    while (bits.length % 8 !== 0) bits.push(0)
    const body = new Uint8Array(bits.length / 8)
    for (let i = 0; i < bits.length; i++) {
      if (bits[i]) body[i >> 3] |= 1 << (7 - (i & 7))
    }
    const xored = applyXor(body)
    const raw = new Uint8Array(deflateSync(xored))
    expect(() => parse(raw)).toThrow(ParseBoundsError)
    expect(() => parse(raw)).toThrow(/exceeded/)
  })

  test('throws ParseBoundsError on inputs-per-entity overflow', () => {
    // Build envelope: STATE_INPUTS with one entity declaring ic = MAX_INPUTS_PER_ENTITY + 1.
    const bits: number[] = []
    const pushBits = (value: number, width: number) => {
      for (let i = width - 1; i >= 0; i--) bits.push((value >>> i) & 1)
    }
    pushBits(264, 32)
    pushBits(1, 4) // STATE_INPUTS
    bits.push(1) // outer bool: one input entity present
    pushBits(0, 5) // entityId
    pushBits(1048577, 32) // ic = (1 << 20) + 1
    while (bits.length % 8 !== 0) bits.push(0)
    const body = new Uint8Array(bits.length / 8)
    for (let i = 0; i < bits.length; i++) {
      if (bits[i]) body[i >> 3] |= 1 << (7 - (i & 7))
    }
    const xored = applyXor(body)
    const raw = new Uint8Array(deflateSync(xored))
    expect(() => parse(raw)).toThrow(ParseBoundsError)
    expect(() => parse(raw)).toThrow(/inputs per entity exceeded/)
  })
})
