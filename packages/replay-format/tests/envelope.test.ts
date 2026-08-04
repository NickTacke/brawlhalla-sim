import { describe, expect, test } from 'bun:test'
import { decodeEnvelope, peekFormatVersion } from '../src/envelope'
import { EnvelopeError } from '../src/errors'
import { buildSyntheticReplay } from './synthetic-replay'

describe('peekFormatVersion', () => {
  test('returns the version from a valid envelope', () => {
    expect(peekFormatVersion(buildSyntheticReplay(264))).toBe(264)
    expect(peekFormatVersion(buildSyntheticReplay(268))).toBe(268)
  })

  test('returns null on non-zlib input', () => {
    expect(peekFormatVersion(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0]))).toBe(null)
  })
})

describe('decodeEnvelope', () => {
  test('decompresses and XORs to a version-prefixed body', () => {
    const output = decodeEnvelope(buildSyntheticReplay(264))
    const data = new DataView(output.buffer, output.byteOffset, 4)
    expect(data.getUint32(0)).toBe(264)
  })

  test('throws EnvelopeError on garbage', () => {
    expect(() => decodeEnvelope(new Uint8Array([1, 2, 3]))).toThrow(EnvelopeError)
  })
})
