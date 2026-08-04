import { SUPPORTED_FORMAT_VERSIONS } from './constants.js'
import { decodeEnvelope } from './envelope.js'
import { FormatVersionUnsupportedError } from './errors.js'
import { parse264 } from './parser264.js'
import type { ParsedReplay } from './types.js'

export { peekFormatVersion } from './envelope.js'
export { ParseBoundsError } from './errors.js'

export function parse(raw: Uint8Array): ParsedReplay {
  const body = decodeEnvelope(raw)
  if (body.length < 4) throw new FormatVersionUnsupportedError(-1)
  const dv = new DataView(body.buffer, body.byteOffset, 4)
  const v = dv.getUint32(0)
  if (!SUPPORTED_FORMAT_VERSIONS.has(v)) throw new FormatVersionUnsupportedError(v)
  switch (v) {
    case 264:
    case 268:
      return parse264(body)
    default:
      throw new FormatVersionUnsupportedError(v)
  }
}
