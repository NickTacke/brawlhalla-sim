import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

import { AbcFile, ExtendedBuffer, InstructionDisassembler } from 'abc-disassembler'
import { parse } from '../../packages/replay-format/src/parser.js'

type Instruction = { name: string; params: unknown[] }
type MethodOwner = { c: number; cn: string; t: string }
type Manifest = {
  schemaVersion: number
  target: { build: string; replayFormat: number }
  provenance: { abcSha256: string }
  fixtures: Array<{ file: string; sha256: string }>
}

const EXPECTED_BUILD = '10.09.96325'
const EXPECTED_FORMAT = 268
const EXPECTED_ABC_SHA256 = '9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d'
const EXPECTED_MANIFEST_SHA256 = 'b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac'
const EXPECTED_FIXTURE_COUNT = 12
const EXPECTED_MAP_LEDGER_SHA256 = '75524eb7df8ceeb839cfb27032c4a2393145669f3bd2803a564b49fda2a6cb1a'
const EXPECTED_WRITER_CALLSITE_LEDGER_SHA256 = '08965bc05f8a1a920744805b1f49e54c3b52469a44f8967971188c27690e196f'

function argument(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  return index === -1 ? undefined : process.argv[index + 1]
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function sha256(value: Uint8Array | string): string {
  return createHash('sha256').update(value).digest('hex')
}

const abcPath = argument('--abc')
const manifestPath = argument('--manifest')
if (!abcPath || !manifestPath) {
  console.error('usage: bun state_7_production_provenance.ts --abc <main.abc> --manifest <manifest.json>')
  process.exit(64)
}

const abcBytes = readFileSync(resolve(abcPath))
const abcSha256 = sha256(new Uint8Array(abcBytes))
assert(abcSha256 === EXPECTED_ABC_SHA256, `ABC SHA-256 mismatch: ${abcSha256}`)
const abc: any = AbcFile.read(new ExtendedBuffer(abcBytes))
const strings = abc.constant_pool.string as string[]
const disassembler = new InstructionDisassembler(abc)
const methods = new Map<number, Instruction[]>()
for (const body of abc.method_body) methods.set(body.method, disassembler.disassemble(body) as Instruction[])
assert(methods.size === 15_010, `expected 15,010 decoded bodies, found ${methods.size}`)
const buildStrings = strings.filter((value) => /^\d+\.\d+\.\d+$/.test(value))
assert(buildStrings.length === 1 && buildStrings[0] === EXPECTED_BUILD, 'ABC build string mismatch')

function multinameName(value: unknown): string {
  if (typeof value === 'string') return value
  if (!value || typeof value !== 'object' || !('data' in value)) return ''
  const name = (value as { data?: { name?: unknown } }).data?.name
  if (typeof name === 'number') return strings[name - 1] ?? ''
  return typeof name === 'string' ? name : ''
}

function qnameKey(value: unknown): string | null {
  if (!value || typeof value !== 'object' || !('kind' in value) || !('data' in value)) return null
  const candidate = value as { kind?: unknown; data?: { ns?: unknown; name?: unknown } }
  if (candidate.kind !== 7 || typeof candidate.data?.ns !== 'number' || typeof candidate.data.name !== 'number') {
    return null
  }
  return `${candidate.data.ns}:${candidate.data.name}`
}

function instruction(methodId: number, index: number, opcode: string, name?: string): Instruction {
  const candidate = methods.get(methodId)?.[index]
  assert(candidate, `method ${methodId} lacks instruction ${index}`)
  assert(candidate.name === opcode, `method ${methodId} instruction ${index} is not ${opcode}`)
  if (name !== undefined) {
    assert(multinameName(candidate.params[0]) === name, `method ${methodId} instruction ${index} does not name ${name}`)
  }
  return candidate
}

function local(methodId: number, index: number, expected: number): void {
  const candidate = instruction(methodId, index, 'getlocal')
  assert(candidate.params[0] === expected, `method ${methodId} instruction ${index} does not read local ${expected}`)
}

function buildOwners(): Map<number, MethodOwner> {
  const owners = new Map<number, MethodOwner>()
  for (let c = 0; c < abc.instance.length; c++) {
    const cn = multinameName(abc.constant_pool.multiname[abc.instance[c].name - 1])
    owners.set(abc.instance[c].iinit, { c, cn, t: '<iinit>' })
    owners.set(abc.class[c].cinit, { c, cn, t: '<cinit>' })
    for (const group of [abc.instance[c].trait ?? [], abc.class[c].traits ?? []]) {
      for (const trait of group) {
        if (trait.data?.method === undefined) continue
        owners.set(trait.data.method, {
          c,
          cn,
          t: multinameName(abc.constant_pool.multiname[trait.name - 1]),
        })
      }
    }
  }
  return owners
}

function methodQName(methodId: number): string {
  const matches = abc.instance.flatMap((instance: any, classIndex: number) =>
    [
      ...(instance.trait ?? []).map((trait: any) => ({ trait, classIndex })),
      ...(abc.class[classIndex].traits ?? []).map((trait: any) => ({ trait, classIndex })),
    ].filter(({ trait }) => trait.data?.method === methodId),
  )
  assert(matches.length === 1, `expected one trait for method ${methodId}`)
  const key = qnameKey(abc.constant_pool.multiname[matches[0].trait.name - 1])
  assert(key, `method ${methodId} does not have an exact QName`)
  return key
}

const owners = buildOwners()
const mapQName = qnameKey(instruction(6523, 37, 'getproperty', '_-E4t').params[0])
assert(mapQName, 'FaceVictory map is not an exact QName')
const mapLedger = [...methods.entries()]
  .map(([method, entries]) => ({
    method,
    owner: owners.get(method),
    hits: entries
      .map((entry, i) => ({ i, op: entry.name, n: multinameName(entry.params[0]), q: qnameKey(entry.params[0]) }))
      .filter((entry) => entry.q === mapQName),
  }))
  .filter((entry) => entry.hits.length > 0)
const mapLedgerSha256 = sha256(JSON.stringify(mapLedger))
assert(mapLedgerSha256 === EXPECTED_MAP_LEDGER_SHA256, `FaceVictory map ledger changed: ${mapLedgerSha256}`)

const writerQName = methodQName(6523)
const writerCallsiteLedger = [...methods.entries()]
  .map(([method, entries]) => ({
    method,
    owner: owners.get(method),
    hs: entries
      .map((entry, i) => ({
        i,
        op: entry.name,
        name: multinameName(entry.params[0]),
        argc: entry.params[1],
        key: qnameKey(entry.params[0]),
      }))
      .filter((entry) => entry.key === writerQName),
  }))
  .filter((entry) => entry.hs.length > 0)
const writerCallsiteLedgerSha256 = sha256(JSON.stringify(writerCallsiteLedger))
assert(
  writerCallsiteLedgerSha256 === EXPECTED_WRITER_CALLSITE_LEDGER_SHA256,
  `state-7 writer callsite ledger changed: ${writerCallsiteLedgerSha256}`,
)

// Writer gate, state discriminator, list payload, timestamp clamp, and terminator.
instruction(6523, 17, 'findproperty', '_-12p')
instruction(6523, 29, 'coerce', '_-669')
instruction(6523, 37, 'getproperty', '_-E4t')
instruction(6523, 43, 'ifne')
instruction(6523, 226, 'getlocal_2')
instruction(6523, 233, 'getproperty', '_-q3e')
instruction(6523, 234, 'pushbyte')
instruction(6523, 235, 'subtract_i')
instruction(6523, 239, 'findproperty', '_-12p')
instruction(6523, 243, 'pushbyte')
instruction(6523, 245, 'callpropvoid', '_-PY')
instruction(6523, 246, 'findpropstrict', 'IntMapKeysIterator')
instruction(6523, 256, 'callproperty', 'next')
instruction(6523, 264, 'callpropvoid', '_-PY')
instruction(6523, 272, 'getproperty')
instruction(6523, 274, 'callpropvoid', '_-PY')
instruction(6523, 279, 'greaterequals')
instruction(6523, 286, 'subtract_i')
instruction(6523, 288, 'callpropvoid', '_-S2c')
instruction(6523, 297, 'callpropvoid', '_-PY')

// Finalizer order: result, inputs, FaceKO, FaceVictory, END.
for (const [index, name] of [
  [273, '_-i3A'],
  [275, '_-i3b'],
  [277, '_-O14'],
  [279, '_-R4C'],
  [286, '_-PY'],
] as const) {
  instruction(6524, index, 'callpropvoid', name)
}

// Shared reader branch and sorted insertion into the state-specific vectors.
instruction(6510, 648, 'pushbyte')
instruction(6510, 652, 'findproperty', '_-v1W')
instruction(6510, 655, 'findproperty', '_-m29')
instruction(6510, 664, 'findproperty', '_-F2G')
instruction(6510, 667, 'findproperty', '_-B4I')
instruction(6510, 676, 'callproperty', '_-14J')
instruction(6510, 681, 'callproperty', '_-8v')
instruction(6510, 707, 'greaterthan')
instruction(6510, 713, 'callpropvoid', '_-R6U')
instruction(6510, 718, 'callpropvoid', '_-R6U')
instruction(6510, 731, 'callpropvoid', 'push')
instruction(6510, 734, 'callpropvoid', 'push')
instruction(6510, 737, 'callproperty', '_-14J')

// Readable consumer label and the two state-7 vectors.
instruction(10464, 71, 'getproperty', '_-B4I')
instruction(10464, 90, 'getproperty', '_-m29')
instruction(10464, 93, 'getproperty', '_-B4I')
const faceVictory = instruction(10464, 94, 'pushstring')
assert(faceVictory.params[0] === 'FaceVictory', 'state-7 consumer label changed')
instruction(10464, 95, 'callpropvoid', '_-9B')

// Factory ownership for all exact map initializers.
for (const [labelIndex, label, constructorIndex, className] of [
  [33, 'BRAWLBALL', 40, '_-I6K'],
  [162, 'SOCCER', 169, '_-y1x'],
  [208, 'VOLLEYBALL', 215, '_-P1'],
] as const) {
  instruction(6937, labelIndex, 'getproperty', label)
  instruction(6937, constructorIndex, 'constructprop', className)
}
for (const [methodId, index] of [
  [6797, 19],
  [7004, 31],
  [7077, 46],
] as const) {
  instruction(methodId, index, 'initproperty', '_-E4t')
}

// Producer writes happen through the map's backing storage after selecting an entity ID.
for (const [methodId, mapIndex, setIndex] of [
  [6796, 231, 236],
  [7002, 389, 394],
  [7076, 365, 370],
  [7076, 384, 389],
] as const) {
  instruction(methodId, mapIndex, 'getproperty', '_-E4t')
  instruction(methodId, setIndex, 'setproperty')
}
instruction(6796, 223, 'getproperty', '_-35a')
instruction(7002, 381, 'getproperty', '_-35a')
instruction(7076, 357, 'getproperty', '_-35a')
instruction(7076, 379, 'getproperty', '_-35a')

// Authoritative tick forwarding into mode-specific producers.
local(3217, 1307, 17)
instruction(3217, 1308, 'callproperty', '_-g2p')
instruction(6935, 23, 'findproperty', '_-x1V')
instruction(6935, 25, 'getlocal_1')
instruction(6935, 26, 'callpropvoid', '_-35B')
instruction(7001, 151, 'findproperty', '_-516')
instruction(7001, 152, 'getlocal_1')
instruction(7001, 155, 'callpropvoid', '_-516')
instruction(7001, 185, 'findproperty', '_-516')
instruction(7001, 186, 'getlocal_1')
instruction(7001, 189, 'callpropvoid', '_-516')

const manifestBytes = readFileSync(resolve(manifestPath))
const manifestSha256 = sha256(new Uint8Array(manifestBytes))
assert(manifestSha256 === EXPECTED_MANIFEST_SHA256, `manifest SHA-256 mismatch: ${manifestSha256}`)
const manifest = JSON.parse(manifestBytes.toString('utf8')) as Manifest
assert(manifest.schemaVersion === 1, 'manifest schema mismatch')
assert(manifest.target.build === EXPECTED_BUILD, 'manifest build mismatch')
assert(manifest.target.replayFormat === EXPECTED_FORMAT, 'manifest replay format mismatch')
assert(manifest.provenance.abcSha256 === EXPECTED_ABC_SHA256, 'manifest ABC identity mismatch')
assert(manifest.fixtures.length === EXPECTED_FIXTURE_COUNT, 'manifest fixture count mismatch')
let state7Sections = 0
for (const fixture of manifest.fixtures) {
  const raw = new Uint8Array(readFileSync(join(dirname(resolve(manifestPath)), fixture.file)))
  assert(sha256(raw) === fixture.sha256, `fixture SHA-256 mismatch: ${fixture.sha256}`)
  const replay = parse(raw)
  assert(replay.formatVersion === EXPECTED_FORMAT, `fixture format mismatch: ${fixture.sha256}`)
  if (replay.victoryFaces !== null) state7Sections++
}
assert(state7Sections === 0, `expected no state-7 corpus sections, found ${state7Sections}`)

console.log(
  JSON.stringify(
    {
      status: 'proven-static-with-authentic-span-gap',
      identity: {
        build: EXPECTED_BUILD,
        replayFormat: EXPECTED_FORMAT,
        abcSha256,
        abcBytes: abcBytes.length,
        decodedMethodBodies: methods.size,
        manifestSha256,
        fixtureCount: manifest.fixtures.length,
      },
      semantics: {
        name: 'FaceVictory events',
        producingScoringTypes: ['BRAWLBALL', 'SOCCER', 'VOLLEYBALL'],
        entry: '(5-bit entity ID, u32 max(0, event tick - replay origin))',
        finalizerOrder: [6, 1, 5, 7, 2],
        normalFinalizerMaximumSections: 1,
        sourceDuplicatePolicy: 'same-tick map writes replace',
        readerDuplicatePolicy: 'repeated sections merge and preserve duplicates, sorted by timestamp',
      },
      closure: {
        mapLedgerSha256,
        writerCallsiteLedgerSha256,
        exactMapMethods: mapLedger.map((entry) => entry.method),
      },
      corpus: {
        state7Sections,
        authenticState7SpanAvailable: false,
      },
    },
    null,
    2,
  ),
)
