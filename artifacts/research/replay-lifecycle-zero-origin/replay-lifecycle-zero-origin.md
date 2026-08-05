# Replay lifecycle zero-origin states in Brawlhalla 10.09.96325

Issue: [Recover replay lifecycle state names and zero-origin reachability](https://github.com/NickTacke/brawlhalla-sim/issues/59)

## Verdict

**Issue acceptance is not met.** The pinned ABC supports stable structural semantics for all five requested values, but it does not establish production reachability by normalized configuration and lifecycle exit. The reviewed authentic corpus contains no fixture authenticated as zero-origin.

The narrow names justified by the local primary evidence are:

| Lifecycle value | Stable structural semantic | Pinned in-ABC producer result |
| ---: | --- | --- |
| `2` | **transfer-wait / transfer-timeout state** | Direct controller producer exists |
| `4` | **post-link-update state** | Direct controller producer exists |
| `8192` | **reserved replay-family state** | No controller producer found |
| `262144` | **post-startup spectate state** | Direct controller producer exists from the spectate dispatch path |
| `4194304` | **reserved link-transfer-family state** | No controller producer found |

“Reserved” is intentional. Values `8192` and `4194304` are consumed throughout the pinned application, but the closed exact-QName and slot-addressed controller ledger has no source that can assign either value. Computed-name writes, native or host mutation, and separately loaded code remain outside that closure. The evidence therefore proves producerlessness only inside the pinned ABC’s statically addressable controller universe. It does not prove absolute runtime unreachability.

The replay timestamp selector remains:

```text
active(F) = (b4a & F) != 0 || ((b4a & 32) != 0 && (HS & F) != 0)

zeroOrigin =
  (b4a & (2 | 4 | 1024 | 2048 | 8192 | 262144 | 524288 | 4194304)) != 0
  || active(32768)
  || (p5G == 2 && active(16))

O = zeroOrigin ? 0 : q4F - 16
```

A writer branch is not proof that a replay-producing match reaches it. The available T3 evidence cannot connect any requested state to writer setup, an executed cleanup site, finalizer dispatch, native completion, or a normalized configuration-by-exit cell.

## Evidence grades

- **Proven static:** exact QName, typed trait, instruction, branch, or complete statically addressable ledger in the hash-pinned ABC.
- **Structural semantic:** the narrowest repeatable name supported by a producer, dispatcher, grouped consumers, and readable literals.
- **Attested observation:** aggregate behavior in a hash-verified authentic replay corpus.
- **Unknown:** local evidence cannot justify a positive or negative production claim.
- **Unavailable:** the selected trust contract requires an authenticated runtime trace or fixture that is not locally present.

Repository parser names and prior reports were locators. The state and reachability conclusions derive from the ignored user-owned ABC, the privacy-reduced corpus manifest, and fail-closed analyzers.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Reference build | `10.09.96325` | Target build |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Lifecycle traits, producers, consumers, timestamp writers, setup, cleanup |
| Decoded method bodies | `15,010` | Whole-ABC static search domain |
| Reviewed corpus manifest | `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac` | Twelve authentic format-268 files |
| Timestamp instruction ledger | `9fd365b71f669004df1c5015de84e1be0f26cb12667af7f5a907d953ae2da4e4` | Seventeen complete methods covering origin and clock assertions |
| Cleanup call-site ledger | `28ce2c68e3444dc6bb328bedf78484a3df7a484ad782702920b82db75cb36340` | Twenty-seven cleanup calls across twenty-four methods |
| Lifecycle reference ledger | `0f6e1eeae0f1ed7137f3f94075bf0c6608ddca2dfbc4e9ddc2365022eb1e1586` | All 1,029 exact public-QName instructions across 251 methods |
| Lifecycle write ledger | `dab113d2c06d01eb49062bd4fd9349758c6cd8bfe9f0e3548101dcb26e73cb83` | Forty controller writes and one UI-class write |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |

The committed lifecycle analyzer reproduces both ledgers and rejects any changed reference, write, receiver classification, branch target, or load-bearing anchor. The public QName has two instance definitions, on controller class 164 and UI class 567. Receiver context is separated before assigning controller producer semantics.

## Lifecycle field and producer closure

### Field identity

Controller class 164 owns public QName `36:20034`, displayed as `_-b4a`, with:

- AVM2 type `uint`;
- effective slot ID `214`;
- no explicit initializer (`vindex = 0`), so the default is `0`;
- zero `setslot 214` writes in all 15,010 decoded method bodies.

A second instance trait with the same public QName exists on UI class 567. A simple-name or QName-only scan therefore overcounts controller writes. The producer conclusions below require a controller receiver or controller scope.

### Direct requested-value producers

The complete statically addressable controller write scan found exactly these direct requested-value producers:

| Value | Producer | Exact anchor | Structural semantic evidence |
| ---: | --- | --- | --- |
| `2` | Controller method 3500 | `f1Z = 20000` at indices 2-4, PCs 2-11; `b4a = 2` at indices 5-8, PCs 13-22, write PC 19 | Dispatcher method 3218 shares its state-`2` and state-`2097152` path at indices 733-738, then emits readable `TransferTimeOut` at index 780, PC 2115, and `Error_FAILED_TRANSFER` at index 789, PC 2146. This supports transfer-wait / transfer-timeout, not a broader network-disconnect name. |
| `4` | Controller method 3510 | indices 5-8, PCs 9-18, write PC 15 | LinkUpdater method 5249 calls state-`16384` producer 3506. Dispatcher method 3218 routes `16384` to method 3210, whose gated path calls 3510; LinkUpdater method 5361 is the other exact 3510 caller. This supports post-link-update without importing the unrelated UI class-567 state vocabulary. |
| `262144` | Controller method 3209 | indices 69-72, PCs 212-221, write PC 218 | Literal-anchored spectate startup method 3505 writes `524288` beside `spectate`. Dispatcher method 3218 indices 721-725 routes state `524288` to method 3209, which writes `262144`. This supports post-startup spectate state without claiming active-versus-exit behavior. |

No literal controller producer exists for `8192` or `4194304`.

### Dynamic controller writes do not fill the gap

Two statically bounded restore paths can write a nonliteral controller state:

1. **Transition-history restore:** method 3509 indices 13-16, PCs 23-36, copies current `b4a` into `HS`. Method 3438 restores `b4a = HS` at indices 23-26, PCs 43-57, then resets `HS = 0` at indices 27-29, PCs 57-66. Since `HS` receives only a prior controller state, it cannot originate a producerless value.
2. **UI return restore:** method 10426 restores `b4a = V6d` at indices 247-251, PCs 529-544, then clears `V6d = 0` at indices 252-254, PCs 544-552. The complete `V6d` write ledger is that reset plus method 10440 value `1024`, method 10441 value `2048`, and method 10444 value `0`. This restore cannot produce `8192` or `4194304`.

Method 3509 groups `1024 | 2048 | 8192` at indices 55-65 and transitions that family to `2048` at indices 71-76, PCs 127-140. The readable `replay` anchor in method 3507 fixes `1024` as replay startup. Method 3217 and method 3509 already fix `2048` as replay-family end. With no producer for `8192`, the strongest stable name is reserved replay-family state.

Across the application, `4194304` repeatedly appears in the exact mask `2 | 4 | 4194304`. The canonical consumer scan found 93 such expressions in 73 methods. With the two produced values anchored to transfer and link-update behavior, the strongest stable name for producerless `4194304` is reserved link-transfer-family state.

### Static closure limitations

The pinned ABC producer result is bounded, not absolute:

- runtime-name `setproperty` and `initproperty` instructions cannot always be assigned to a field statically;
- separately loaded classes or host-created subclasses are not excluded;
- native or host reflection can mutate public properties without a visible ABC property-write instruction;
- executed path reachability requires authenticated runtime evidence.

Accordingly, `8192` and `4194304` are **statically producerless**, not globally impossible.

## Consumer closure

The lifecycle analyzer enumerates all 1,029 exact public-QName instructions across 251 methods. This complete discovery ledger includes both controller class 164 and the unrelated UI class 567 definition, so QName presence alone is not treated as controller dataflow.

The recurring controller families are `2 | 4 | 4194304`, `1024 | 2048 | 8192`, and `262144 | 524288`. Load-bearing anchored consumers are lifecycle dispatcher 3218, tick methods 3217 and 3273, transition/history methods 3438 and 3509, section writers 6520-6523, and finalizer 6524. The analyzer pins the producer, dispatcher, replay-family, and spectate-family anchors; the inherited timestamp analyzer pins the complete normalized writer predicate.

## Timestamp and fallback-clock closure

The four section writers use the same zero-origin predicate:

| Section | Method | Origin anchor | Timestamp formula |
| --- | ---: | --- | --- |
| State 6 result | 6520 | zero PC 397; ordinary `q4F - 16` PCs 410-415; origin store PC 418 | `uint32(sourceTimestamp - O)` |
| State 1 input | 6521 | zero PC 410; ordinary PCs 423-428; origin store PC 431 | `uint32(max(0, sourceTimestamp - O))` |
| State 5 KO face | 6522 | zero PC 376; ordinary PCs 389-394; origin store PC 397 | `uint32(max(0, sourceTimestamp - O))` |
| State 7 victory face | 6523 | zero PC 439; ordinary PCs 452-457; origin store PC 460 | `uint32(max(0, sourceTimestamp - O))` |

Method 6524 covers both fallback result clocks:

- local predicate branch at index 261, PC 486;
- `_21L` source at index 264, PC 496;
- `_X6B` source at index 268, PC 510;
- joined local write at index 270, PC 515;
- fallback result call at index 273, PC 522;
- input, KO, and victory section calls at indices 275, 277, and 279, PCs 530, 539, and 547.

Both fallback sources obey the same result formula. Their original unobfuscated semantic names remain unknown.

Cleanup method 3442 resets `p5G = 0` at indices 51-54, PCs 137-147, before its sole finalizer call at index 72, PC 204. Therefore the subtype-2 state-16 clause can select zero for the earlier direct state-6 result, but it cannot select zero for finalizer-written states 1, 5, or 7.

`GameDuration` remains independent:

```text
GameDuration = uint32(z35 - q4F - 6000)
ordinary direct terminal result = GameDuration + 6016
zero-origin direct terminal result = GameDuration + q4F + 6000
```

## Replay setup and cleanup boundary

Static writer construction and cleanup are hook-ready but do not prove execution:

- writer setup method 3368 constructs the writer at PC 33, stores it at PC 37, and forwards `(uint seed, uint playlistId, Boolean online)` at PC 49;
- its complete exact call ledger is method 3282 PC 361 with online `true`, method 3514 PC 179 with online `false` when parameter 1 is false, and method 5257 PC 229 with online `true`;
- all 27 exact cleanup calls across 24 methods converge on controller method 3442 in the pinned receiver universe;
- method 3442 checks its typed writer slot at PC 194, and null skips the sole method-6524 finalizer call at PC 204;
- no normalized configuration guard occurs in method 3442 before that finalizer call.

These facts prove online and local setup routes exist and identify every static hook. They do not show which route or cleanup site executes for a match configuration or lifecycle exit.

## Production reachability matrix

### Requested lifecycle states

| State | Static state reachability | Replay-production reachability | Authentic zero-origin evidence |
| ---: | --- | --- | --- |
| `2` | Direct transfer-wait producer and dispatcher consumers exist | **Unknown** for every normalized family and exit. No authenticated trace ties the state to a non-null writer and executed cleanup. | None |
| `4` | Direct post-link-update producer and controller dispatch path exist | **Unknown** for every normalized family and exit | None |
| `8192` | Writer and replay-family consumers exist, but no statically addressable controller producer exists | **Unreachable only in the closed exact-QName/slot-addressed pinned-ABC producer universe. Absolute runtime and production reachability unknown.** | None |
| `262144` | Spectate startup `524288` dispatches to a direct `262144` producer | **Unknown.** Static post-startup spectate transition does not prove spectate replay emission or cleanup execution. | None |
| `4194304` | Link-transfer-family consumers exist, but no statically addressable controller producer exists | **Unreachable only in the closed exact-QName/slot-addressed pinned-ABC producer universe. Absolute runtime and production reachability unknown.** | None |

### Normalized configuration families

| Family | Available evidence | Disposition |
| --- | --- | --- |
| Online playlist 108, timed, four-human FFA | Twelve completed authentic replays satisfy the ordinary timestamp relation; online setup route exists statically | **Completed emission proven. The serialized bytes do not authenticate which origin branch executed.** |
| Other online playlists | Static online setup routes only | **Unknown** |
| Custom online | Static online setup and vocabulary only | **Unknown** |
| Local/couch | Static offline setup route only | **Unknown** |
| Training/practice | Static lifecycle consumers only | **Unknown** |
| Spectate | Literal startup and post-startup transition only | **Unknown** |
| Human with bots or bot-only | Representable format/configuration only | **Unknown** |
| Team modes | Representable format/configuration only | **Unknown** |
| Relay, Scramble, or Shift | Representable variation and roster only | **Unknown** |
| Other scoring families or off-preset tuples | Shipped or serializable vocabulary only | **Unknown** |

### Lifecycle exits

| Exit | Available evidence | Disposition |
| --- | --- | --- |
| Normal completion | Completed files exist for one online configuration | **No executed setup/cleanup site trace; requested zero-origin states unobserved** |
| Disconnect | No labeled authenticated scenario or trace | **Unknown** |
| Forfeit | No labeled authenticated scenario or trace | **Unknown** |
| Host quit | No labeled authenticated scenario or trace | **Unknown** |
| Rematch | Repeated Results sections do not identify rematch | **Unknown** |
| Abort before Results | Zero-Results structure is unsupported; save attempt and file disposition unobserved | **Structural rejection only; production behavior unknown** |
| Abort after Results | No labeled authenticated scenario or trace | **Unknown** |
| Any additional replay-producing exit | No complete executed exit inventory | **Unknown** |

Unknown cells must not become an allowlist or denylist. A supported input remains an authentic, structurally valid format-268 replay consistent with the patch snapshot.

## Authentic corpus audit

The reviewed manifest attests twelve authentic format-268 files from the build-10.09 cohort. All twelve are:

- online playlist `108`;
- timed scoring type `1`, duration `180,000` ms;
- four-human FFA, no bots, variation `0`;
- completed files with one through three Results sections;
- result length exactly `186,016` ms;
- input minimum timestamp `0`.

The fail-closed timestamp analyzer verifies every fixture hash and reports the ordinary relation `result = configured duration + 6016` for all twelve. The corpus has no team, stock, bot, custom, offline, disconnect, forfeit, tie, sudden-death, or special lifecycle sample.

**No hash-attested authentic fixture is locally attested as zero-origin.** Static state values and the selected origin branch do not appear in replay bytes, so configuration vocabulary and the ordinary timestamp relation alone cannot authenticate which branch executed. The twelve fixtures are consistent with ordinary-origin arithmetic, but they do not supply the required zero-origin attestation.

No replay bytes, source filenames, player identifiers, private absolute paths, or proprietary ABC content are committed here.

## Acceptance status and exact blockers

Issue acceptance requires all five stable semantics, production reachability or unreachability by normalized configuration and lifecycle exit, and an authentic hash-attested zero-origin fixture whenever production is reachable.

Current status: **not met**.

Exact blockers:

1. **No authentic zero-origin attestation:** the only local attested corpus is the twelve-file playlist-108 cohort, and replay bytes do not carry the executed origin branch.
2. **No authenticated runtime traces:** there is no accepted T3 trace connecting method 3368 setup, writer-slot state, one of 27 cleanup sites, method 3442 PCs 194/204, method 6524, and native completion for any requested state.
3. **No configuration-by-exit scenario matrix:** authenticated inputs are absent for disconnect, forfeit, host quit, rematch, abort, spectate, local, custom, bot, team, variation, and other replay-producing families.
4. **No trustworthy negative runtime proof:** computed-name writes, native/host behavior, and separately loaded code prevent promoting the producerless `8192` and `4194304` result to absolute unreachability without runtime trace and terminal quiescence.

Residual naming limitation: local executable evidence supports stable structural family names for the reserved values, not unobfuscated source identifiers.

Issue 59 should remain open and its session claim should be released.

## Surfaced route

The ticket becomes answerable through the already-native prerequisite chain established by the replay setup/cleanup investigation:

1. Build and accept the hash-pinned complete-AIR interpreted reference oracle.
2. Authenticate hooks and payloads for all three method-3368 setup sites, controller lifecycle writes, writer-slot transitions, all 27 cleanup caller PCs, method 3442 PCs 194/204, method 6524 entry/outcome, and reset method 3329.
3. Assemble privacy-reviewed authentic or deterministic scenario inputs for every normalized replay-producing family and applicable lifecycle exit.
4. Drive transfer timeout, rematch, the post-startup spectate transition, disconnect, forfeit, host quit, abort, and additional exits through authenticated non-live injection points.
5. Prove a terminal lifecycle barrier and scheduler quiescence for every no-attempt or unreachable claim.
6. Acquire and hash-attest any authentic zero-origin replay reached by a production-positive cell, then verify its raw result/input/event formulas against the traced `q4F`, `z35`, and source clocks.

This route is owned by [Build and attest the complete-AIR reference oracle](https://github.com/NickTacke/brawlhalla-sim/issues/72), [Authenticate replay-writer lifecycle trace hooks](https://github.com/NickTacke/brawlhalla-sim/issues/73), [Assemble authenticated replay lifecycle scenario inputs](https://github.com/NickTacke/brawlhalla-sim/issues/74), [Build a deterministic non-live lifecycle event driver](https://github.com/NickTacke/brawlhalla-sim/issues/75), and [Prove replay lifecycle terminal barriers and scheduler quiescence](https://github.com/NickTacke/brawlhalla-sim/issues/76). No new ticket is needed from this audit.

## Map gist

Transfer-wait `2`, post-link-update `4`, and post-startup spectate `262144` have direct pinned-ABC producers; `8192` and `4194304` are producerless reserved replay and link-transfer family states, while all zero-origin production and fixture attestation remain T3 fog.

## Reproducible verification

Keep proprietary ABC and replay inputs under ignored paths or outside version control.

Verify evidence identity:

```bash
shasum -a 256 /path/to/main.abc /path/to/manifest.json
find /path/to/corpus -maxdepth 1 -type f -name '*.replay' | wc -l
```

Reproduce the lifecycle producer and consumer closure:

```bash
bun run provenance:replay-lifecycle-zero-origin -- --abc /path/to/main.abc
```

Expected output includes status `proven-for-pinned-abc-static-universe`, 15,010 bodies, valid branches, 1,029 lifecycle-QName instructions, 41 classified writes, the three direct requested-value writes, and producerless static values `8192` and `4194304`.

Reproduce timestamp and corpus closure from the reviewed analyzer commit:

```bash
git show b159ff24d6a3b8970c4a90ca87338ce633bf460b:\
tools/avm2-provenance/special_mode_timestamp_provenance.ts \
  | (cd tools/avm2-provenance && bun - --abc /path/to/main.abc --manifest /path/to/manifest.json)
```

Expected bounded output includes:

```text
status: proven-for-pinned-abc-and-reviewed-ordinary-corpus
build: 10.09.96325
method bodies: 15010
valid branch targets: true
fixtures: 12
configured duration: 180000
result length: 186016
input minimum: 0
```

Reproduce writer setup and cleanup closure:

```bash
git show 6bf17bf057a1b2dabe8b82e652e85a1a319d9254:\
tools/avm2-provenance/replay_save_reachability_provenance.ts \
  | (cd tools/avm2-provenance && bun - --abc /path/to/main.abc)
```

Expected bounded output includes status `proven-for-pinned-abc`, 15,010 bodies, 27 cleanup calls across 24 methods, one finalizer call at method 3442 PC 204, two exact writer-slot mutations, and three writer-setup sites.

The lifecycle producer audit must fail closed unless it reproduces all of these invariants:

```text
controller class: 164
lifecycle QName: 36:20034
type/default/effective slot: uint / 0 / 214
setslot 214 writes: 0
direct requested-value writes:
  3500 index 8 PC 19 = 2
  3510 index 8 PC 15 = 4
  3209 index 72 PC 218 = 262144
literal controller writes of 8192: 0
literal controller writes of 4194304: 0
HS source/reset: 3509 current b4a / 3438 zero
V6d writes: method 10426 reset 0; methods 10440/10441 values 1024/2048; method 10444 value 0
```

Repository validation:

```bash
bun run check
git diff --check
git status --short
```

## Sources

- **[ABC]** User-owned official-build `main.abc`, SHA-256 `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d`.
- **[Analyzer]** [`tools/avm2-provenance/replay_lifecycle_zero_origin_provenance.ts`](../../../tools/avm2-provenance/replay_lifecycle_zero_origin_provenance.ts).
- **[Timestamp]** [Special-mode replay timestamp origins at commit `b159ff2`](https://github.com/NickTacke/brawlhalla-sim/blob/b159ff24d6a3b8970c4a90ca87338ce633bf460b/artifacts/research/special-mode-timestamps/special-mode-timestamps.md).
- **[Save reachability]** [Upstream replay-save reachability at commit `6bf17bf`](https://github.com/NickTacke/brawlhalla-sim/blob/6bf17bf057a1b2dabe8b82e652e85a1a319d9254/artifacts/research/replay-save-reachability/replay-save-reachability.md).
- **[Trace blocker]** [Replay-writer setup and cleanup trace blocker at commit `effd0bd`](https://github.com/NickTacke/brawlhalla-sim/blob/effd0bd15b282d6fff6c740ccef8b4b3bcc52f66/artifacts/research/replay-setup-cleanup-traces/replay-setup-cleanup-traces.md).
- **[Eligibility]** [Replay-writer eligibility at commit `cb0040c`](https://github.com/NickTacke/brawlhalla-sim/blob/cb0040cc14e2e0e824966f559f53017cc05de9fd/artifacts/research/replay-writer-eligibility/replay-writer-eligibility.md).
- **[Context]** [`CONTEXT.md`](../../../CONTEXT.md), [`CONTRIBUTING.md`](../../../CONTRIBUTING.md), and [`docs/provenance.md`](../../../docs/provenance.md).
