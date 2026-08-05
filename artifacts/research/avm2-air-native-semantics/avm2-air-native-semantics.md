# AVM2 and AIR deterministic native semantics for Brawlhalla 10.09.96325

Issue: [Specify AVM2 and AIR deterministic native semantics](https://github.com/NickTacke/brawlhalla-sim/issues/37)

## Verdict

Adopt **`avm2-air-10.09-v1`** as the deterministic VM/native profile for the reference game. The profile has two hard rules:

1. Every reached AVM2 opcode, typed boundary, property operation, collection operation, XML operation, ByteArray operation, Math call, and AIR/native call must have an explicit semantic entry.
2. A semantic entry is admitted only from a normative rule or a hash-pinned differential known answer. Missing reachability, target behavior, ordering, exception, or side-effect evidence blocks conformance. A JavaScript or operating-system default is never a fallback.

This report defines the profile, resolves the currently proven operations, and specifies the differential known-answer tests that extend it. The parent map is planning-only, so research-ticket acceptance means an implementation-ready profile and test contract. It does not mean the tests have executed or the simulator conforms. Runtime conformance remains unearned until [Prove match initialization and tick executable closure](https://github.com/NickTacke/brawlhalla-sim/issues/32) supplies the complete ledger and the selected oracle supplies target goldens.

## Evidence grades

Semantic certainty and gameplay reachability are graded separately:

- **N, normative:** ECMA, Adobe API, or pinned first-party VM source defines the operation.
- **K, target known answer required:** a reached platform approximation, compatibility behavior, order, error, or side effect needs a hash-pinned AIR differential record.
- **U, unresolved semantic:** no acceptable meaning is available. A reached U entry fails closed.
- **P, proven reachable:** unique hash-pinned control/dataflow reaches gameplay-relevant state, a replay validity decision, or a proved caller.
- **B, body occurrence:** an operation occurs in an authoritative or proved method body, but execution and downstream effect for that operation are not unique.
- **S, structural adjacency:** an operation belongs to a parser, serializer, source resolver, or caller island whose complete native/dataflow closure remains open.

Method-body membership is not execution proof. A whole-ABC opcode count is not a reachable-operation inventory.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Target bytecode, typed boundaries, proven method islands |
| Sole semantic build string | `10.09.96325` | Reference-game build identity |
| ABC size and decode | 3,934,088 bytes; ABC 46.16; 15,010 bodies | Bounded local executable evidence |
| Branch validation | all decoded branch targets valid | Control-flow precondition |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |
| Reviewed replay manifest | `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac` | Existing 12-replay evidence cohort |
| Numeric-semantics report | commit [`f6a92e5`](https://github.com/NickTacke/brawlhalla-sim/commit/f6a92e516053245727711936b187438212244795) | Prior AVM2 numeric decision and anchored method inventory |
| Patch-closure report | commit [`629a95c`](https://github.com/NickTacke/brawlhalla-sim/commit/629a95c26a3d2a7b1fd51d43a16d0f7cbe02e996) | Checksum semantics and profile handoff |
| Header-seed report | commit [`e773abd`](https://github.com/NickTacke/brawlhalla-sim/commit/e773abd342b57f494fa4bec4050a4b39def1d056) | `Random` methods and controlled vectors |
| Installed AIR cohort recorded by oracle research | AIR 32 descriptor; runtime `33.1.1.633`; framework `171caec02b70544b14d6fd81185d14f97a389d4db13b1fe96ed9a18a74a85980` | Identity required for authorized synthetic AIR goldens only |

The current checkout reproduced the ABC hash and byte count, decoded all 15,010 bodies, validated every branch target, and reran the grounded-jump provenance command with status `proven`. Proprietary bytecode, replays, archives, extracted data, and runtime binaries remain ignored and uncommitted.

## `avm2-air-10.09-v1` profile definition

The immutable profile key is the tuple:

```text
profileName                 avm2-air-10.09-v1
referenceBuild              10.09.96325
abcSha256                   9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d
avm2LanguageBaseline        AVM2 Overview + ECMA-262 Edition 3
xmlBaseline                 ECMA-357 Edition 2 + target compatibility entries
syntheticAirGoldenRuntime   AIR 33.1.1.633 framework 171caec02b70544b14d6fd81185d14f97a389d4db13b1fe96ed9a18a74a85980
unknownPolicy               fail-closed
numberObservation           IEEE-754 binary64 bits
orderingObservation         ordered key/value/event sequence
errorObservation            class, stable error ID, and state before failure
nativeObservation           result bits, side effects, callbacks, and virtual time
```

The profile is append-only within version 1. A newly proved reachable operation adds a semantic entry and known-answer fixture without changing existing meanings. Any correction to an admitted meaning, target runtime identity, comparison policy, or fixture encoding requires a new profile version.

A patch snapshot may declare this profile only when its executable-closure manifest names every reached semantic entry and pins the complete known-answer ledger hash. Profile name alone grants no conformance.

## Semantic contract

### Number, `int`, `uint`, and operation order

AVM2 has three distinct numeric coercion domains:

- `Number` is IEEE-754 binary64, including NaN, infinities, `+0`, and `-0`.
- `int` applies ES3 `ToInt32`: Number conversion, truncation toward zero, reduction modulo `2^32`, then the signed representative. NaN, either zero, and either infinity become `+0`.
- `uint` applies ES3 `ToUint32`: the same conversion and reduction, with the representative in `0..2^32-1`.

Every explicit conversion and every typed slot, property, Vector element, argument, and return is a new runtime coercion boundary. TypeScript annotations do not perform it.

`add_i`, `subtract_i`, `multiply_i`, integer increment/decrement, and `negate_i` consume signed 32-bit operands and keep the low 32 result bits. `multiply_i` must use exact low-bit multiplication such as `Math.imul`; binary64 multiplication followed by delayed coercion can lose those bits.

Generic arithmetic converts operands according to AVM2/ES3 and executes in bytecode order. Implementations must not reassociate expressions, fuse multiply-add, defer typed stores, or replace repeated conversions with one final conversion. Generic `add` performs primitive conversion and concatenates if either primitive is a string. Generic subtract, multiply, and divide apply Number conversion. Division follows binary64 special values: nonzero divided by either zero produces the signed infinity, either zero divided by either zero is NaN, and finite nonzero divided by infinity produces the correctly signed zero.

`modulo` is truncating remainder, not Euclidean modulo. Its nonzero result has the dividend's sign. Exact negative multiples produce `-0`; zero divisor, NaN, or infinite dividend produces NaN; a finite dividend with an infinite divisor is returned unchanged.

Bitwise AND, OR, XOR, and NOT apply `ToInt32` and retain 32 bits. Left and signed-right shift return int; unsigned-right shift returns uint. Every shift count is `ToUint32(count) & 31`. Sign-extension opcodes and byte/short memory operations retain their declared widths.

Abstract equality, strict equality, and relational comparison are distinct adapters. Abstract equality follows AVM2/ES3 coercion, including object-to-primitive evaluation order. Strict equality never performs that conversion. Relational comparison returns true, false, or unordered; negated branches include unordered. For example, `ifnlt` branches unless less-than is exactly true, so it is not host `>=`. Boolean conversion treats NaN, either zero, null, undefined, and the empty string as false under their AVM2 rules.

**Semantic disposition:** these rules are N. Reachability remains separately graded in the executable-island table. NaN payload bits are not compared unless a reached ByteArray or bit-reinterpretation path exposes them; that path receives a K entry.

Primary sources: [ECMA-262 Edition 3, sections 8.5, 9.5, 9.6, 11.5, 11.8, and 11.9](https://www.ecma-international.org/wp-content/uploads/ECMA-262_3rd_edition_december_1999.pdf), the archived Adobe-authored [AVM2 Overview](https://jmendeth.com/snapshot/aa45ee3f904d62505f09ef2969d1885e8844859f/media/2014-05-17-reverse-engineering-flash/avm2overview.pdf), and pinned Adobe AVMPlus [`Interpreter.cpp`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/Interpreter.cpp).

### Math

The following special-value rules are exact profile entries after AVM2 argument conversion:

- `abs`, `ceil`, `floor`, and `round` preserve NaN and infinities as specified.
- `round` chooses the nearest integer and breaks a tie toward positive infinity. Therefore `round(-1.5) == -1` and `round(-0.5)` is `-0`.
- `min` returns NaN if any argument is NaN and chooses `-0` over `+0`.
- `max` returns NaN if any argument is NaN and chooses `+0` over `-0`.

Host implementations are acceptable for these operations only after the exact argument conversion, arity, signed-zero, and NaN tests pass.

`sqrt`, `pow`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `atan2`, `exp`, and `log` are K. Adobe permits platform approximation differences for these natives, and first-party AVMPlus delegates them to `MathUtils`. A generic host `libm` result is not evidence of target parity. Each reachable call needs target-runtime binary64 output bits over ordinary, boundary, subnormal, signed-zero, NaN, infinity, and function-specific hard cases.

`Math.random` is U until separate reachability and algorithm evidence exists. It must never map to host `Math.random`. The game's class-96 `Random` is a separate proved ActionScript PRNG and does not settle the global native.

Primary sources: [Adobe/HARMAN Math API](https://airsdk.dev/reference/actionscript/3.0/Math.html) and pinned Adobe AVMPlus [`MathClass.cpp`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/MathClass.cpp).

### Property names, values, and calls

A JavaScript bracket operation is not a general AVM2 property adapter.

- Static multinames retain namespace sets, attribute state, and QName identity.
- Runtime integer keys use the AVM2 unsigned-index path when eligible.
- Other Object keys are converted and interned under AVM string/index rules. `1` and `"1"` address the same ordinary dynamic property.
- Runtime QName keys preserve namespace and local-name identity rather than flattening to a display string.
- Typed slot and setter writes coerce before storage.
- Getters, setters, prototype lookup, method receiver binding, missing-property errors, and evaluation order are semantic.
- Dictionary object keys use object identity instead of ordinary Object stringification. Primitive Dictionary keys use ordinary property behavior.

The profile therefore requires dedicated `avm2Get`, `avm2Set`, `avm2Delete`, `avm2CallProperty`, and runtime-multiname adapters unless static proof replaces an operation with a narrower typed access.

Primary sources: pinned Adobe AVMPlus [`Interpreter.cpp`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/Interpreter.cpp), [`ScriptObject.cpp`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/ScriptObject.cpp), and [`DictionaryGlue.cpp`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/DictionaryGlue.cpp).

### Collections and iteration

Arrays preserve `length`, holes, unsigned-index recognition, and index-mutating method behavior. Index `0xffffffff` is a dynamic property, not an Array index that extends length. Numeric-index loops are ordered by index. Array `for..in` is different: first-party AVMPlus explicitly does not preserve insertion order for dense or sparse Arrays.

Vectors are dense, typed, bounds checked, and optionally fixed length. Extending length creates base-type defaults; element writes coerce or throw; numeric iteration is ascending index. Fixed-length and out-of-bounds failures are observable.

Object and Dictionary enumeration follows AVM table iteration, not modern JavaScript's integer-then-insertion-order contract. Rehash, deletion, and mutation can change the sequence. Weak Dictionary keys can disappear after garbage collection. Therefore:

- never substitute host Object or Map iteration for a reached AVM enumeration;
- require an exact ordered differential fixture for any state-influencing Object, Dictionary, or Array `for..in` site;
- reject a state-influencing weak-key Dictionary unless reachability proves collection timing irrelevant;
- require an exact differential for `Array.sort` or `Vector.sort` whenever equal comparator results can affect later state, because equal elements are documented as having no particular order.

Primary sources: [Adobe/HARMAN Array API](https://airsdk.dev/reference/actionscript/3.0/Array.html), [Vector API](https://airsdk.dev/reference/actionscript/3.0/Vector.html), [Dictionary API](https://airsdk.dev/reference/actionscript/3.0/flash/utils/Dictionary.html), and pinned Adobe AVMPlus [`ArrayObject.cpp`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/ArrayObject.cpp) and [`avmplusHashtable.cpp`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/avmplusHashtable.cpp).

### XML and E4X

Reached XML behavior uses ECMA-357 Edition 2 plus target compatibility behavior, not a generic DOM or object conversion.

The default global parse/print settings are:

```text
ignoreComments                true
ignoreProcessingInstructions  true
ignoreWhitespace              true
prettyIndent                  2
prettyPrinting                true
```

An XML object caches the whitespace setting used at its parse. With default whitespace handling, leading/trailing text whitespace is ignored and a whitespace-only text node is not created. Child and attribute lists preserve their runtime sequence. Name lookup distinguishes QName namespace identity from a non-QName argument converted to String. XML and XMLList have their own property, equality, descendants, mutation, notification, and string-conversion behavior.

The profile must preserve parse errors, comments/processing-instruction policy, node kinds, child and attribute order, namespaces, default namespace, duplicate/mutation behavior, XMLList cardinality, `toString` versus `toXMLString`, and global settings at each parse. Generic XML parser recovery, whitespace retention, namespace flattening, or object-key iteration is forbidden.

ECMA-357 is normative where target compatibility does not override it. Every reached parser or E4X operation still receives a K fixture because loader compatibility flags can differ. A future snapshot loader must reject malformed patch inputs explicitly; valid-input parse and ordering behavior remain exact.

Primary sources: [ECMA-357 Edition 2](https://www.ecma-international.org/wp-content/uploads/ECMA-357_2nd_edition_december_2005.pdf), [Adobe XML API](https://help.adobe.com/en_US/FlashPlatform/reference/actionscript/3/XML.html), and pinned Adobe AVMPlus [`XMLObject.cpp`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/XMLObject.cpp).

### ByteArray and FileStream

ByteArray is a mutable byte sequence with independent `length`, `position`, `endian`, and `objectEncoding` state. The profile includes:

- default big-endian byte order and explicit endian changes;
- exact signed and unsigned widths;
- low-bit truncation for `writeByte` and `writeShort`;
- IEEE-754 single and double reads/writes, including `-0` and target NaN policy if bits become observable;
- read/write position updates and `bytesAvailable`;
- zero fill when length grows and byte discard when it shrinks;
- short-read and range errors;
- `readUTF`/`writeUTF` unsigned-short byte length and UTF-8 bytes;
- `readUTFBytes`/`writeUTFBytes` without a length prefix;
- exact `readBytes`/`writeBytes` offset and zero-length conventions.

FileStream shares the typed read/write contract but adds file mode, file position, buffering, asynchronous progress, completion, close, and I/O errors. Its position is an integer-valued Number below `2^53`; a fractional assignment rounds down.

`readMultiByte` fallback to the host code page, `File.systemCharset`, AMF object encoding, compression, and asynchronous event timing are K if reached. Host-native TypedArray endianness, text decoders, stream buffering, and callback scheduling are not substitutes.

Primary sources: [Adobe/HARMAN ByteArray API](https://airsdk.dev/reference/actionscript/3.0/flash/utils/ByteArray.html), [FileStream API](https://airsdk.dev/reference/actionscript/3.0/flash/filesystem/FileStream.html), and pinned Adobe AVMPlus [`ByteArrayGlue.cpp`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/ByteArrayGlue.cpp).

### AIR and host services

Every statically reachable AIR or extension member must have one disposition: `include`, `deterministic-stub`, `reject`, or `unresolved`. `unresolved` blocks execution.

State-influencing clock, frame pacing, timers, Date, timezone, locale, entropy, filesystem, file metadata, directory enumeration, asynchronous completion, threads/workers, network, platform APIs, native extensions, UI, audio, and renderer returns must route through the deterministic host-services boundary selected by [Establish a non-live interpreted reference oracle](https://github.com/NickTacke/brawlhalla-sim/issues/5).

`File.getDirectoryListing` documents an Array result but no portable order. A reached consumer must either prove order-insensitivity or use an exact target ordering fixture and a hash-pinned virtual directory. Path normalization, case sensitivity, symbolic links, metadata, separators, and system charset are host-dependent. Undeclared reads and writes fail. Network, dialogs, process launch, and native payload execution are rejected.

Asynchronous work uses one virtual scheduler with a declared total order. No wall clock, host entropy, process scheduling, filesystem creation order, locale, timezone, CPU architecture, or host thread race may change accepted output.

## Currently proven executable islands

The local decoder rerun plus the two committed exact-trait analyzers give this bounded synthesis. It is not the final behavior closure.

| Island | Direct local evidence | Profile effect | Semantic | Reachability |
| --- | --- | --- | --- | --- |
| Checksum method 6527 | 298 instructions; 16 `multiply_i`; 23 `add_i`; 57 `convert_u`; one `modulo`; two `divide`; calls `Math.round` | Exact arithmetic, Array/index reads, property access, and round feed replay checksum comparison | N | P |
| Bitset score 591 and popcount 1860 | `_i` arithmetic, shifts, masks, exact word-index loop called by checksum | Indexed word order and low-32-bit arithmetic feed checksum | N | P |
| Class-96 `Random` methods 1797/1799 | seed expansion/output use `_i`, `convert_u`, masks, XOR, shifts, and indexed state; proved gameplay consumers | Exact state words and order; separate from native `Math.random` | N | P |
| Tick timestamp path in method 3217 | exact `add_i -> convert_u` dataflow | Timestamp rollover can change the authoritative branch | N | P |
| Other tick method 3217 operations | `floor`, `sqrt`, three `modulo`, and seven `multiply_i` occur in the body | Each operation needs independent execution/downstream closure; `sqrt` also needs target bits | N/K | B |
| Movement integration in method 2887 | exact ordered `multiply/add/convert_d` impulse, gravity, and motion-delta sequences | Reordering changes fighter state | N | P |
| Other movement method 2887 natives/collections | body calls `abs`, `min`, `max`, `indexOf`, and `push` | Receiver, execution, and downstream effect are not closed for every call | N | B |
| Fighter update/jump 2894/2954 | proved typed fields, rollover predicate, impulse writes, ordered conversion/arithmetic; other relations occur in body | Proved typed/ordered paths are P; unrelated body operations remain B | N | P/B |
| Input consumer/sampler 6125/6135 | proved rising-edge masks and uint timestamp sampling; further arithmetic/comparisons occur in bodies | Exact masks and rollover are P; other body occurrences remain B | N | P/B |
| Generic bitset Array methods 576/578/580/585/589/600 | construct `[]`; extend with zero words; indexed set/clear/test; ascending writer loop; reader overwrite/push/splice-tail; gameplay selects only set IDs | Array holes/length, indexed order, push, splice, and uint element semantics survive replay into gameplay | N | P |
| Gadget Vector filter methods 4779/4754/4791 | iterate ordered typed `GadgetList`; push entries whose mask bit is clear; pass filtered Vector to item selection and creation | Dense typed Vector order, index reads, `push`, length, and consumer order affect spawned item candidates | N | P |
| Replay reader/writer 6510/6519 | paired state read/write methods, roster Array mutation, and checksum call | Proved Array behavior is listed above; exact ByteArray/native member inventory remains open | N/K | P/S |
| Patch-data parser islands | ordered `GadgetList` and `AlwaysEquipItem` source flows are proved | Complete E4X call and compatibility closure is open | N/K | S |
| Object/Dictionary enumeration, AIR host calls, native transcendental calls | global presence or closure candidate only | Whole-ABC presence grants no admission | K/U | U |

The checksum's requested starter semantics are explicit. Traversal stops at unresolved dispatch and native edges; it does not label the behavior closure complete.

## Differential known-answer contract

### Canonical fixture schema

Every reached semantic entry requires a tiny non-game record with this schema shape:

```json
{
  "schemaVersion": 1,
  "profileName": "avm2-air-10.09-v1",
  "semanticId": "uint.convert.boundaries",
  "fixture": {
    "sourceSha256": "64-lowercase-hex",
    "abcSha256": "64-lowercase-hex",
    "compilerId": "product-version",
    "compilerExecutableSha256": "64-lowercase-hex",
    "compilerFlags": ["ordered", "strings"]
  },
  "runtime": {
    "role": "target-air|avmplus-corroboration|ruffle-candidate|host",
    "product": "product",
    "version": "exact-version",
    "executableSha256": "64-lowercase-hex",
    "os": "exact-os-and-version",
    "arch": "x86_64|arm64"
  },
  "inputs": [
    {
      "label": "input-0",
      "value": { "kind": "number", "match": "bits", "bits": "0000000000000000" }
    }
  ],
  "observation": {
    "outputs": [
      { "label": "result-0", "value": { "kind": "uint", "decimal": "0" } }
    ],
    "error": null,
    "orderedEvents": [],
    "orderedProperties": [],
    "state": [],
    "sideEffects": [],
    "virtualTimeMs": "0"
  }
}
```

Each input, output, property key/value, event payload, and state cell uses this closed `AvmValue` union:

```text
{kind:"undefined"}
{kind:"null"}
{kind:"boolean", value:true|false}
{kind:"int"|"uint", decimal:"canonical-base-10"}
{kind:"number", match:"bits", bits:"16-lowercase-hex"}
{kind:"number", match:"nan", bits:null}
{kind:"string", utf16be:"zero-or-more-4-hex-code-unit-groups"}
{kind:"bytes", hex:"even-length-lowercase-hex"}
{kind:"qname", uri:AvmString, localName:AvmString, isAttribute:true|false}
{kind:"array", items:[AvmValue,...]}
{kind:"object", entries:[{key:AvmValue,value:AvmValue},...]}
```

`outputs` is always an ordered array, including a one-result fixture, so batched and heterogeneous vectors have one encoding. Integer decimal strings have no leading plus or zero except `"0"`. String code units use big-endian UTF-16 hex so unpaired surrogates survive. Arrays and object entries retain runtime order. Errors are either null or `{className:AvmString,errorId:string,stateBeforeFailure:[StateEntry,...]}`. The remaining closed entry schemas are:

```text
EventEntry    = {sequence:"uint-decimal", eventType:AvmString,
                 target:AvmValue, payload:AvmValue, virtualTimeMs:"uint-decimal"}
PropertyEntry = {sequence:"uint-decimal", key:AvmValue,
                 value:AvmValue, enumerable:true|false}
StateEntry    = {path:[AvmString,...], value:AvmValue}
SideEffect    = {sequence:"uint-decimal", serviceId:AvmString,
                 operation:AvmString, request:AvmValue, response:AvmValue,
                 outcome:"returned"|"threw", virtualTimeMs:"uint-decimal"}
```

`orderedEvents`, `orderedProperties`, `state`, and `sideEffects` contain only their named entry type in ascending `sequence` order; duplicate or decreasing sequence values fail. `path` is nonempty. A thrown side effect records its error as the response `AvmValue` object rather than omitting it. Unknown object keys and omitted schema keys are rejected.

All non-NaN Number results compare exact bits. An unexposed NaN uses `{match:"nan",bits:null}` and compares by NaN classification only. If ByteArray, memory, or another reached path exposes its payload, the semantic entry instead uses `match:"bits"` with the target's exact NaN bits. This is the only allowed payload exception.

Canonical bytes are RFC 8785 JSON encoded as UTF-8 with no BOM or trailing LF. `recordSha256` is SHA-256 of those bytes. Reject duplicate records; sort record hashes as unsigned 32-byte values; then compute `ledgerSha256 = SHA-256(UTF8("brawlhalla-avm2-air-kat-v1\0") || U32BE(recordCount) || recordHash[0] || ...)`. The fixture source and generated ABC are separately hashed so compiler drift cannot hide behind the output ledger.

The semantic KAT ledger contains the target AIR and optional corroborating records, not release-host matrix membership. Its authoritative target is AIR `33.1.1.633` on macOS x86_64 with framework SHA-256 `171caec02b70544b14d6fd81185d14f97a389d4db13b1fe96ed9a18a74a85980`. AVMPlus commit `65a05927767f3735db37823eebf7d743531f5d37` is VM corroboration, never AIR authority.

Host runs produce a separate conformance report keyed by `ledgerSha256` and `hostMatrixSha256`. The host-matrix manifest is canonical RFC 8785 JSON with `{schemaVersion:1, runtimes:[RuntimeIdentity,...]}`; it rejects duplicate tuples, sorts by UTF-8 `(product,version,os,arch,executableSha256)`, and hashes the canonical bytes. Each `RuntimeIdentity` is the exact runtime object shown above.

[Decide exact conformance and release gates](https://github.com/NickTacke/brawlhalla-sim/issues/14) owns selection of those tuples. This profile deliberately does not preempt that HITL decision. The repository currently declares only Bun `1.3.14`; it declares no Node version or cross-architecture matrix, so current conformance status remains unearned. Once selected, changing matrix membership changes `hostMatrixSha256`, not this semantic profile.

The authorized AIR runtime executes only synthetic VM/AIR fixtures. It never loads, instruments, or traces Brawlhalla. Patched Ruffle and simulator hosts run the same fixtures. Host comparison follows each `AvmValue.match` rule and otherwise requires exact ordered observations.

### Mandatory seed vectors

These are normative known answers and the minimum regression seed. Number results that can be zero are checked by bits or reciprocal, never string display.

| Semantic ID | Input | Expected result |
| --- | --- | --- |
| `int.add.wrap` | `0x7fffffff`, `1` | int `-2147483648` |
| `int.add.uint-boundary` | `0xffffffff`, `160`, then `convert_u` | uint `159` |
| `int.multiply.low32-a` | `0x7fffffff`, `2` | int `-2` |
| `int.multiply.low32-b` | `0x40000000`, `4` | int `0` |
| `uint.convert.boundaries` | `-1`, `-1.9`, `4294967296`, NaN, `+Infinity` | `4294967295`, `4294967295`, `0`, `0`, `0` |
| `number.remainder.sign` | `-5 % 2`, `5 % -2`, `-4 % 2`, `5 % +Infinity`, `+Infinity % 2`, `1 % 0` | `-1`, `1`, `-0`, `5`, NaN, NaN |
| `math.round.ties` | `-1.5`, `-0.5`, `-0.1`, `0.5`, NaN, `+Infinity` | `-1`, `-0`, `-0`, `1`, NaN, `+Infinity` |
| `math.minmax.zero` | `min(+0,-0)`, `max(-0,+0)` | `-0`, `+0` |
| `branch.unordered.ifnlt` | NaN, `0` | branch taken |
| `object.key.number-string` | keys `1` and `"1"` | one ordinary dynamic property |
| `object.key.object-string` | two objects whose primitive string is `"key"` | one ordinary dynamic property |
| `dictionary.key.identity` | the same two objects | two Dictionary entries |
| `array.index.max-uint` | assign index `0xffffffff` | dynamic property; length unchanged |
| `array.bitset-extend-clear` | set bit ID 65, then clear it | words become `[0,0,2]`, then `[0,0,0]`; length stays `3` |
| `array.reader-truncate` | existing words `[1,2,3]`, restore one word `[9]` | words `[9]`; length `1` after tail splice |
| `vector.int.coercion` | store Number `4.2` in `Vector.<int>` | int `4` |
| `vector.gadget-filter-order` | ordered IDs `[a,b,c]`, mask `0b010` | active IDs `[a,c]` in that order |
| `bytearray.big-endian-u32` | write uint `0x01020304` on fresh ByteArray | bytes `01 02 03 04`; position `4` |
| `bytearray.low-byte` | `writeByte(0x123)` | byte `23` |
| `bytearray.utf` | `writeUTF("A")` | bytes `00 01 41` under default endian |
| `xml.default-whitespace` | parse `<a>   </a>` with defaults | `children().length() == 0` |
| `xml.child-order` | parse `<a><x id="1"/><x id="2"/></a>` | child/`x` sequence `1,2` |
| `xml.qname-key` | same local name in two namespaces | distinct qualified properties |

### Generated vector families

One seed case is insufficient. The conformance generator must add:

- every numeric boundary adjacent to `2^31`, `2^32`, zero, subnormal limits, finite limits, NaN, and infinities;
- every reached operand-type combination and conversion side effect, including custom `valueOf`/`toString` order;
- every reached negated branch with ordered, equal, and unordered inputs;
- each reached Math native over special values plus target-qualified hard-to-round inputs;
- Array holes, length shrink/grow, sparse conversion, deletion, splice, callback mutation, and equal-sort cases;
- Vector base types, defaults, fixed length, bounds, coercion, callbacks, and sort ties;
- Object and Dictionary insertion/deletion/rehash sequences, including a separately rejected weak-key/GC case;
- XML defaults, namespaces, attributes, children, XMLList cardinality, mutation, escaping, serialization, and valid loader edge cases;
- ByteArray endians, every reached width, offsets, overlap, EOF/error paths, UTF-8 boundaries, float bits, and length/position mutations;
- each reached File/FileStream mode, path, error, event, and callback order on a virtual hash-pinned filesystem;
- every reached AIR/native service under perturbed host wall time, locale, timezone, CPU load, filesystem creation order, and scheduler timing.

A semantic entry is complete only when its fixture covers result, exception, order, and side effects. Matching one return value while callbacks or receiver state differ is failure.

## Acceptance gates

`avm2-air-10.09-v1` conformance is earned only when all gates pass:

1. The deletion-tested initialization/tick graph names every reachable opcode and native member for every replay-producing mode family.
2. Every graph member resolves to a profile semantic ID. No dispatch, reflection, callback, exception, getter/setter, initializer, or runtime multiname edge escapes.
3. Every N semantic has normative vectors; every K semantic has a hash-pinned AIR differential record; no U semantic is reached.
4. XML and patch-loader fixtures reproduce all relevant source records with exact object values and order.
5. ByteArray/FileStream fixtures reproduce all reached widths, positions, errors, and event order.
6. Target, patched interpreter, and host outputs have no unexplained difference.
7. Host results are byte-identical across fresh processes and every tuple in the hash-pinned host-matrix manifest. The final release matrix must contain declared Node and Bun versions on x64 and arm64; the current Bun-only CI declaration does not pass this gate.
8. The closure manifest pins the semantic ledger, host-matrix manifest, fixture corpus, expected-output corpus, harness, compiler, and runtime hashes.

Until then, the only valid status is `profile-defined-conformance-unearned`.

## Reproducible local evidence

Keep user-owned inputs under ignored paths. From the checkout root:

```bash
bun install --frozen-lockfile
bun run --cwd tools/avm2-provenance build-dependency
shasum -a 256 artifacts/research/brawlhalla-physics/main.abc
wc -c artifacts/research/brawlhalla-physics/main.abc
bun tools/avm2-provenance/movement_provenance.ts \
  --abc artifacts/research/brawlhalla-physics/main.abc \
  --target grounded-jump-y
```

Expected identity is the ABC digest and byte count above. Expected provenance output reports build `10.09.96325`, 15,010 decoded bodies, valid branch targets, status `proven`, and no blocker for the grounded-jump chain.

The checksum counts and semantic grouping are independently reproduced by the fail-closed analyzer at commit [`629a95c`](https://github.com/NickTacke/brawlhalla-sim/tree/629a95c26a3d2a7b1fd51d43a16d0f7cbe02e996). The class-96 `Random` vectors and method fingerprints are reproduced by the header-seed analyzer at commit [`e773abd`](https://github.com/NickTacke/brawlhalla-sim/tree/e773abd342b57f494fa4bec4050a4b39def1d056).

## Confidence and residual gaps

### High-confidence conclusions

- The profile name, fail-closed policy, versioning rule, canonical fixture schema, ledger hash, observation formats, and acceptance gates are implementation-ready.
- `_i` arithmetic, int/uint conversion, binary64 order, remainder, comparison polarity, `Math.round`, signed zero, property-key distinctions, collection distinctions, E4X defaults/order, and ByteArray typed behavior are explicitly specified.
- The currently proven checksum, PRNG, tick, input, jump, movement, settings, and replay islands identify concrete state-divergence risks.
- Modern JavaScript arithmetic overlaps many AVM2 cases but is not a complete VM/native compatibility layer.

### Existing owners, not new tickets

1. [Prove match initialization and tick executable closure](https://github.com/NickTacke/brawlhalla-sim/issues/32) owns the exhaustive reachable-operation ledger.
2. [Prove patch-data loader normalization and defaults](https://github.com/NickTacke/brawlhalla-sim/issues/35) owns complete XML/loader call reachability and source normalization.
3. [Recover deterministic randomness and draw ordering](https://github.com/NickTacke/brawlhalla-sim/issues/6) owns every PRNG stream and draw order, including any reached global random native.
4. [Recover encoded movement numeric storage](https://github.com/NickTacke/brawlhalla-sim/issues/41) owns `_‑k17`/`_‑G1Q` representation semantics.
5. [Build a conservative AVM2 executable graph and deletion harness](https://github.com/NickTacke/brawlhalla-sim/issues/44) owns the graph construction and deletion prerequisite newly surfaced by the executable-closure research; [Prove match initialization and tick executable closure](https://github.com/NickTacke/brawlhalla-sim/issues/32) remains open and blocked by it.
6. [Decide exact conformance and release gates](https://github.com/NickTacke/brawlhalla-sim/issues/14) owns the exact Node/Bun host-matrix tuples.
7. [Establish a non-live interpreted reference oracle](https://github.com/NickTacke/brawlhalla-sim/issues/5) already selected the synthetic-golden and deterministic host-services architecture whose implementation must produce K records.

This ticket surfaces no additional ticket. The remaining fog is execution evidence: complete closure, exact AIR synthetic outputs, and a trustworthy interpreted trace. Those are already represented by existing tickets or implementation handoff, so duplicating them would split ownership.

## Primary sources

- [ECMA-262 Edition 3](https://www.ecma-international.org/wp-content/uploads/ECMA-262_3rd_edition_december_1999.pdf)
- [ECMA-357 Edition 2](https://www.ecma-international.org/wp-content/uploads/ECMA-357_2nd_edition_december_2005.pdf)
- Archived Adobe-authored [AVM2 Overview](https://jmendeth.com/snapshot/aa45ee3f904d62505f09ef2969d1885e8844859f/media/2014-05-17-reverse-engineering-flash/avm2overview.pdf)
- [Adobe/HARMAN ActionScript reference](https://airsdk.dev/reference/actionscript/3.0/)
- Adobe AVMPlus source at commit [`65a05927767f3735db37823eebf7d743531f5d37`](https://github.com/adobe-flash/avmplus/tree/65a05927767f3735db37823eebf7d743531f5d37)
- Hash-pinned local executable evidence and committed analyzers identified above
