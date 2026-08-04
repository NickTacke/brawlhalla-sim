import { deflateSync } from 'node:zlib'
import { STATE_END, STATE_GAME_DATA, STATE_HEADER, STATE_RESULTS } from '../src/constants'
import { applyXor } from '../src/xor-key'

class BitWriter {
  readonly bits: number[] = []

  write(value: number, width: number): void {
    for (let index = width - 1; index >= 0; index--) this.bits.push((value >>> index) & 1)
  }

  bool(value: boolean): void {
    this.bits.push(value ? 1 : 0)
  }

  string(value: string): void {
    this.write(value.length, 16)
    for (const character of value) this.write(character.charCodeAt(0), 8)
  }

  bytes(): Uint8Array {
    while (this.bits.length % 8 !== 0) this.bits.push(0)
    const bytes = new Uint8Array(this.bits.length / 8)
    for (let index = 0; index < this.bits.length; index++) {
      if (this.bits[index]) bytes[index >> 3] |= 1 << (7 - (index & 7))
    }
    return bytes
  }
}

function writeEntity(writer: BitWriter, formatVersion: number): void {
  writer.write(1, 32)
  if (formatVersion >= 268) writer.write(12345, 32)
  writer.string('Fixture')
  for (let index = 0; index < 6; index++) writer.write(0, 32)
  for (let index = 0; index < 8; index++) writer.write(0, 32)
  writer.write(0, 16)
  writer.write(0, 16)
  writer.bool(false)
  writer.write(0, 16)
  writer.write(1, 32)
  writer.write(0, 32)

  writer.write(3, 32)
  writer.write(0, 32)
  writer.write(0, 32)
  writer.bool(false)
  writer.write(0, 15)
  writer.bool(false)
  writer.write(0, 15)
  writer.bool(false)
  writer.bool(false)
}

export function buildSyntheticReplay(formatVersion: 264 | 268): Uint8Array {
  const writer = new BitWriter()
  writer.write(formatVersion, 32)

  writer.write(STATE_HEADER, 4)
  writer.write(42, 32)
  writer.write(0, 32)
  writer.bool(false)

  writer.write(STATE_GAME_DATA, 4)
  for (let index = 0; index < 15; index++) writer.write(0, 32)
  writer.write(1, 32)
  writer.write(1, 16)
  writer.bool(true)
  writeEntity(writer, formatVersion)
  writer.bool(false)
  writer.write(0, 32)

  writer.write(STATE_RESULTS, 4)
  writer.write(0, 32)
  writer.bool(false)
  writer.write(0, 32)

  writer.write(STATE_END, 4)

  return new Uint8Array(deflateSync(applyXor(writer.bytes())))
}
