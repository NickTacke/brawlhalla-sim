# Complete AIR host and native capability dispositions

Issue: [#88 Close complete-AIR host and native capability dispositions](https://github.com/NickTacke/brawlhalla-sim/issues/88)

**Status: OPEN. Acceptance is not met.**

This report records the strongest evidence available without proprietary binaries, extracted assets, credentials, replay/player data, or a live-client run. It keeps the result fail-closed: a static package member is not treated as a reached capability, and a missing runtime disposition is never replaced with a host default or a null stub.

## Decision and scope

The adopted profile is `avm2-air-10.09-v1`, as resolved by [issue #37](https://github.com/NickTacke/brawlhalla-sim/issues/37). Its dispositions are:

- `include`: execute through the declared deterministic VM or virtual service implementation.
- `deterministic-stub`: return only a versioned, hash-pinned, state-independent result through the deterministic host boundary.
- `reject`: refuse the operation or payload. No native payload, network, UI, renderer, or host fallback is allowed.
- `unresolved`: no accepted implementation or reachability proof exists. This status invalidates startup or replay execution.

A disposition is a policy record, not runtime acceptance. Every `unresolved` call remains a hard blocker.

The issue #5 decision selects a headless Ruffle `core` embedder at commit [`6e69eaf8`](https://github.com/ruffle-rs/ruffle/tree/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943), a complete AIR application boundary, deterministic deny-by-default host services, independent ABC verification, authenticated instrumentation, and T3 gates. It explicitly records that no trustworthy target trace or runtime feasibility result exists.

## Reviewed repository evidence

The current branch is intentionally based on the small public workspace at `origin/main` and contains no proprietary artifact payloads. The following prior evidence artifacts and analyzers were read from their immutable repository commits before this report was written:

| Evidence path | Commit | Relevance |
| --- | --- | --- |
| `artifacts/research/interpreted-reference-oracle/interpreted-reference-oracle.md` | `29770640d30558a6bb6a25229253f2bc46d9ac92` | AIR descriptor, extension/runtime identity, host boundary, T0-T3 status |
| `artifacts/research/avm2-air-native-semantics/avm2-air-native-semantics.md` | `ca39e257846adb6a5081ca280c23b148feecee9a` | `avm2-air-10.09-v1` semantics and known-answer contract |
| `artifacts/research/air-numeric-parse/air-numeric-parse.md` | `69215a6d68d3e6e33788f757e4b21fb2e43a2169` | Missing AIR target goldens and numeric reachability limits |
| `artifacts/research/dynamic-leveldesc-loader/dynamic-leveldesc-loader.md` | `1cb9847a112a165b63634e607f3fb61d997c1404` | Proven `RawData` extraction route and Dynamic data loader |
| `artifacts/research/legacy-level-graphics-reachability/legacy-level-graphics-reachability.md` | `81e1118262e5dae0630a2b6733be885f10e57365` | Complete packaged-SWF/native-import scan and downloaded-SWF escape |
| `artifacts/research/native-replay-writer/native-replay-writer.md` | `94a936c68895661f2277441282787e4ba38f6266` | Static AIR `FileStream` writer sequence and failure behavior |
| `artifacts/research/replay-save-reachability/replay-save-reachability.md` | `6bf17bf057a1b2dabe8b82e652e85a1a319d9254` | Static setup, cleanup, and finalizer dispatch |
| `artifacts/research/replay-setup-cleanup-traces/replay-setup-cleanup-traces.md` | `effd0bd15b282d6fff6c740ccef8b4b3bcc52f66` | No authenticated startup/lifecycle trace and no T3 runner |
| `artifacts/research/patch-loader-mutation-oracle/patch-loader-mutation-oracle.md` | `4eb1e43da30b78920521421151ecc7b969b23008` | Host/loader contract and absence of complete AIR boot |
| `artifacts/research/patch-postload-resolution/patch-postload-resolution.md` | `ba69217` | Patch category/post-load and native numeric gaps |
| `artifacts/research/patch-snapshot-closure/patch-snapshot-closure.md` | `629a95c26a3d2a7b1fd51d43a16d0f7cbe02e996` | Closure definition and native dependency boundary |

Those reports are evidence records, not distributed game data. Their reported package counts and hashes came from user-owned, ignored inputs. No such input is present in this worktree.

## Hash-attested AIR and packaged-SWF identity

The reviewed cohort identifies:

| Member | Identity | Evidence grade and limit |
| --- | --- | --- |
| Reference build | `10.09.96325` | Pinned semantic build string |
| Entry SWF `BrawlhallaAir.swf` | 1,730,834 bytes, SHA-256 `40df9af5308b9a17bf015feb38edec6d9bea57d1cd53078d298aa725acceb8b2` | Reviewed installed input; payload not committed |
| Entry `main.abc` | 3,934,088 bytes, SHA-256 `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Hash-pinned static evidence; payload not committed |
| AIR descriptor | SHA-256 `33d64105102fb2999ae0d4d02c9ae75dd174d0f7965ae22f5f03390bdd8c2009` | Declares `BrawlhallaAir`, `extendedDesktop`, AIR 32, entry content, and three extensions |
| AIR runtime | `33.1.1.633`; framework SHA-256 `171caec02b70544b14d6fd81185d14f97a389d4db13b1fe96ed9a18a74a85980` | Identity only; no target execution or golden ledger |
| Ruffle candidate | Git commit `6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943` | Architecture choice; no patched runtime in this repository |
| Top-level SWFs | 538 | Oracle artifact's top-level `Resources` count; membership unresolved |
| Recursive installed CWS SWFs | 658 | Later complete package ledger; conservative installed boundary |
| DoABC payloads | 663 occurrences, 659 distinct byte hashes, 25,439,726 bytes | Independently decoded in the later package report |
| Decoded packaged bodies | 441,630 method records, 441,573 bodies, 6,598,715 instructions | Bounded packaged scan, not universal runtime closure |
| Reviewed replay manifest | SHA-256 `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac` | Twelve authentic format-268 files; one completed online playlist-108 family |

The 538 and 658 counts are not silently merged. The first is a top-level SWF count in the oracle identity record; the second is the later recursive installed-package count. Neither count includes the unavailable, server-authorized `AdditionalContent`/downloaded-SWF universe. The count difference is therefore a package-boundary distinction, not proof that either set is the complete loaded-code set.

The three declared extensions and their reviewed identities are:

| Extension | `extension.xml` | library SWF | native module |
| --- | --- | --- | --- |
| `RawData` | `f4b7809e97341da31adfc194e2061f16631c774adf6618f4276f45a56d62824d` | `3e5a553a8f0d748e06d4457f9c6fd7374907c95644ca5be851bee2d46d3594df` | `3a0ca18918c246c8f5958532dadd176a6128a9f18fbb3246f2098454e1a8c9ae` |
| `SoundEngineExtension` | `20957bab181d9b3a3a25cad2c717f68d7114d7692161f46d47d54321f637e302` | `696f34b1f987d903af71e0e1ee0faeba64a2e03a2328498a92ec49d5207ecef8` | `a2ac734c2aee32971008ac2fb7f314c599b9c78784b4dc06f59b40ea51c38bdf` |
| `SteamAir` | `103b76d4d50d642290dfd36c71612d904e832fc853b1ab02a96f269bf35cbe84` | `fc0a5e4b3310481d9ab34e9dcdc632457042bff5dd7f0cef5413ccad964e7fb3` | `6995632ca3b760a4911270bf0f78b24e4c07a897902bf82c2f598e9bbbd5a810` |

The independent packaged scan decoded the four unique ANE wrapper ABCs, duplicated at two package locations: `RawData` 6 methods/6 bodies/83 instructions, `SoundEngineExtension` 19/19/393, `SteamAir` 28/28/391, and the `SteamEvent` wrapper 4/4/60. Native import identity is bounded, but wrapper presence does not prove execution.

## Static reachability findings

### RawData

The strongest positive native finding is the SWZ loader route:

```text
completed SWZ resource
  -> method 6561 (type dispatch)
  -> method 6554 (SWZ extraction)
  -> ANE_RawData.SetData at PC 41/45
  -> repeated ANE_RawData.GetData at PC 171/174
  -> custom XML parser at PC 339/343
  -> method 6555 root callback
  -> LevelDesc registration and selected-level load
```

Methods 6554 and 6555, the `Dynamic.swz` identity, 186 source leaves, and 120 `LevelDesc` roots are statically documented. The extraction result feeds gameplay level data, so a `RawData` null/default stub is not admissible. The native binary exposes ByteArray acquisition/release, `uint` conversion, and primitive return construction. Native payload execution is **reject**; an equivalent deterministic extractor is **required but unresolved**. Runtime call entry is **unknown** because no T1/T2/T3 target boot or authenticated call trace exists.

The extraction algorithm itself is not independently reversed, and complete parser/loader mutation closure remains open. This prevents a faithful replacement from being claimed.

### SoundEngineExtension

The package identity and wrapper/native import families are statically bounded. The native family performs array reads, numeric/string conversion, and `uint` return construction. The reviewed artifacts do not provide a complete main-ABC callsite ledger proving a reached `SoundEngineExtension` member during startup or a replay-producing match. Absence of a reported callsite is not an unreachability proof because the packaged code contains runtime multinames, callbacks, reflection, and a code-import sink.

Native payload execution is **reject**. A deterministic null/audio stub is **not admitted**: it requires static and runtime proof that every reached return and callback is state-irrelevant. Current static reachability is **unresolved** and runtime reachability is **unknown**.

### SteamAir

The package identity and wrapper/native import families are statically bounded. SteamAir exposes primitive conversion/construction, array writes, `FRENewObject`, and `FREDispatchStatusEventAsync`. It does not import `FRECallObjectMethod`, `FREGetObjectProperty`, or `FRESetObjectProperty`; no target method or legacy level name appears in the reviewed native modules. Therefore the direct native-extension route to an arbitrary ActionScript method is **bounded absent**.

`FREDispatchStatusEventAsync` is still a host-to-ActionScript asynchronous edge. The wrapper catalog declares `SteamAir`, `SteamEvent`, `EventDispatcher`, `StatusEvent`, and `Function`, and the unresolved AIR event/runtime-multiname boundary can affect callback reachability. Native payload execution is **reject**. A deterministic Steam stub is **unresolved** until all reached status events, callback function provenance, return values, and gameplay influence are classified. Runtime reachability is **unknown**.

### Packaged code import and reflection

The later complete package scan reports no external packaged ABC target owner/name, no target SymbolClass binding, no direct target closure, no `callstatic`/`newfunction` target route, and no `callmethod` instruction in `main.abc`. It reports four internal target-trait calls only for the unrelated dormant graphics methods 1400-1402; method 5073 has no direct packaged caller.

That bounded negative result does not close runtime code loading. Method 5475 constructs a `LoaderContext`, sets `allowCodeImport` for SWF resources, and calls `Loader.loadBytes`; scheduler method 6559 can feed it base-file or downloaded states. Method 5472 resolves `File.applicationStorageDirectory/AdditionalContent`. The reviewed local application-storage observation had no AdditionalContent SWFs, but no hash-pinned build-10.09 update manifest or historical downloaded-SWF corpus is available. Imported code can see package-public traits in the current domain or its child.

Policy: unpinned imported code, reflection that escapes the declared ledger, and host callbacks are **reject**. The corresponding static and runtime closure is **unresolved/unknown**. A future run must fail on any unclassified imported ABC, runtime multiname, callback, or host edge.

## Host-service disposition ledger

The following is the complete policy boundary required by issues #5 and #37. `Current status` describes evidence, not a permission to execute.

| Capability family | Static evidence | Policy disposition | Current status |
| --- | --- | --- | --- |
| AVM2 typed arithmetic, coercion, comparison, property, collection, E4X, and ByteArray rules | Profile-defined in `avm2-air-10.09-v1`; exact reachability is incomplete | `include` only through the profile implementation; no JavaScript fallback | Normative portions defined; target KAT ledger absent |
| AIR 32 API surface | Descriptor targets AIR 32; pinned Ruffle API table reaches only AIR 29 | `unresolved` until each reached AIR 32 member has a semantic entry and test | **BLOCKED** |
| Virtual monotonic/wall time, `Date`, timezone, locale | Issue #5 identifies host-clock/locale influence in candidate runtime | `deterministic-stub` through fixed virtual time/locale; host clock and locale reads `reject` | No target reachability or repeated golden |
| Frame pacing and execution limits | Ruffle candidate measures host duration and audio skew unless patched | `deterministic-stub` with virtual quanta and operation budgets; host elapsed time cannot affect results | Patched implementation absent |
| Timers, async completion, callbacks, workers, threads | Candidate runtime uses host executor/timer paths | `deterministic-stub` through one total-order virtual scheduler; workers/races `reject` | No lifecycle trace or quiescence proof |
| AVM `Math.random` and host entropy | Profile marks native random unresolved; game class-96 PRNG is separate | `reject` host entropy; `unresolved` until target algorithm/reachability evidence exists | **BLOCKED** |
| Hash-pinned read-only resources | Package and SWZ identities exist; resource closure is incomplete | `deterministic-stub` only for exact manifest members; undeclared read, metadata, directory order, and symlink escape `reject` | Downloaded/resource closure incomplete |
| `RawData` extraction | Method 6554 SetData/GetData statically feeds LevelDesc | Native payload `reject`; faithful deterministic extractor required | Static positive, runtime unknown, semantic unresolved |
| `SoundEngineExtension` | Package/wrapper/import family present; reached callsite not closed | Native payload `reject`; null/audio stub not admitted | Static unresolved, runtime unknown |
| `SteamAir` and status dispatch | Native status-event import present; direct FRE object-method imports absent | Native payload `reject`; callback/stub unresolved until event and return influence close | Direct target route bounded absent; runtime unknown |
| `File`, `FileStream`, replay writer | Method 6524 statically calls `open(WRITE)` PC 1103, `writeBytes` PC 1125, `close` PC 1136 | Virtual hash-pinned filesystem `deterministic-stub`; native filesystem execution `reject`; errors must be explicit | Static sequence closed; one corpus-positive result; per-family runtime unknown |
| `URLLoader`, network, sockets, navigation | Download/update paths occur in packaged code; network is outside simulator scope | `reject` network/navigation and unpinned downloads | Static capability exists; authorized download universe unavailable |
| Renderer, UI, clipboard, platform, process launch | AIR/renderer boundary is outside gameplay contract | `reject` unless a reviewed semantic entry proves state-independent behavior | No runtime closure |
| Audio and sound output | Sound extension is package-declared and semantically unclassified | `reject` native/audio payload; no null stub until state influence is proven irrelevant | Runtime unknown |
| Logging/telemetry | Static artifacts report telemetry helpers but no gameplay authorization | `deterministic-stub` only for privacy-filtered, state-independent records; arbitrary host logging `reject` | No authenticated trace channel |

This table does not claim that every row is reached. It ensures that if a row is reached before its evidence is complete, the run fails closed.

## Startup and replay-producing execution

### Startup

Static identity proves the descriptor's entry content, AIR 32 target, three extension IDs, and the available packaged boundary. It does not prove a complete startup sequence. The issue #5 artifact reports:

- T0 identity: partial;
- T1 booted: not reached;
- T2 deterministic prototype: not reached;
- T3 reviewed-corpus interpreted reference: not reached.

No authenticated startup trace shows which SWFs, extension members, native calls, host services, callbacks, or resources execute before a match-ready boundary. Therefore startup acceptance is **not met**. In particular, package presence cannot promote `SoundEngineExtension` or `SteamAir` to either reached or unreachable, and the positive `RawData` static route cannot be promoted to runtime execution.

### Replay-producing execution

The 12 hash-attested format-268 files prove a completed replay outcome for one narrow cohort: online playlist 108, timed four-player free-for-all. They do not identify the executed setup/cleanup callsite or prove any other configuration or lifecycle exit.

Static replay writer evidence is precise:

- method 3368 has three setup callsites and writes the writer slot;
- method 3442 has 27 exact cleanup calls across 24 methods;
- method 3442 checks a non-null writer at PC 194 and calls method 6524 at PC 204;
- method 6524 finalizes the envelope before the filesystem boundary;
- the exact filesystem order is `FileStream.open(finalFile, FileMode.WRITE)` at PC 1103, `writeBytes(fullReplayByteArray)` at PC 1125, then `close()` at PC 1136;
- the protected range `[943,1141)` catches `Error` without guaranteed close/delete cleanup;
- there is no writer-side temporary file, rename, retry, or delete; later replay loading may delete rejected inputs.

Issue #53 remains open because no authenticated T3 trace maps setup, writer-slot state, cleanup callsite, finalizer outcome, and terminal scheduler quiescence for each configuration/lifecycle cell. Static writer proof and the 12 files are not a runtime host-capability ledger.

## Acceptance matrix

| Required closure | Result | Severity and reason |
| --- | --- | --- |
| AIR 32 identity and profile | Partial | High: identity is hash-attested, but target AIR 32 execution and KAT ledger are absent |
| Complete packaged-SWF static boundary | Partial | High: 538 top-level and 658 recursive installed counts are bounded, but no universal loaded-code or downloaded-SWF closure |
| Startup static reachability | Partial | Blocker: descriptor and entry are known, but full SWF/extension/resource/callback graph is not closed |
| Startup runtime reachability | Not proven | Blocker: no T1 boot, authenticated call ledger, or target trace |
| `RawData` static reachability | Bounded positive | High: method 6554 SetData/GetData feeds SWZ/XML/LevelDesc data |
| `RawData` runtime and every call disposition | Not proven | Blocker: no target run and no faithful extraction implementation/golden |
| `SoundEngineExtension` static and runtime closure | Not proven | Blocker: package/import identity exists, but callsite, return, callback, and state influence are unclassified |
| `SteamAir` static and runtime closure | Partial only | High: direct FRE method-call capability is absent, but async status/callback and imported-code paths remain open |
| Every reached host service | Not proven | Blocker: no complete executed capability ledger, AIR 32 member ledger, or target KATs |
| Replay-producing startup/setup/cleanup runtime matrix | Not proven | Blocker: only one corpus-positive family, no authenticated T3 lifecycle traces |
| Fail-closed behavior | Policy defined | Satisfied as a report contract only; no executable oracle exists to enforce it |

## Findings and blockers

1. **BLOCKER: no target runtime execution.** No complete-AIR boot, match-ready boundary, authenticated instrumentation, target trace, or T3 result exists. This alone prevents issue #88 closure.
2. **BLOCKER: AIR 32 mismatch.** The selected Ruffle commit maps AIR APIs only through AIR 29 in the reviewed evidence. AIR 32 members cannot inherit a host or Ruffle default.
3. **BLOCKER: reached-call ledger absent.** Static package scans and wrapper import tables do not identify every executed AIR/native call, return, side effect, callback, exception, or scheduler event.
4. **BLOCKER: `RawData` is gameplay-adjacent and unresolved.** Its SetData/GetData route feeds level data; a null or guessed stub would violate fail-closed policy.
5. **BLOCKER: `SoundEngineExtension` and `SteamAir` are not safely stubbed.** Native payload rejection is safe; null/default replacements are not admitted without state-influence proof and target goldens.
6. **BLOCKER: downloaded code is not closed.** `Loader.loadBytes` with SWF code import and `AdditionalContent` prevent universal packaged-only reachability claims. The authorized build-10.09 manifest and imported-SWF corpus are unavailable.
7. **HIGH: replay runtime coverage is narrow.** Twelve authentic files establish one positive cohort only. Configuration and lifecycle execution remain unknown, including setup/cleanup callsite attribution.
8. **HIGH: host-service semantics lack target outputs.** AIR numeric edge cases, async ordering, filesystem metadata/order, event returns, and native side effects have no authoritative AIR result ledger.
9. **MEDIUM: package counts have distinct boundaries.** The report preserves the 538 top-level and 658 recursive counts rather than treating either as the complete loaded-code universe.

## Existing owners and next proof route

No new decision ticket is needed. Existing ownership is sufficient:

- [#5](https://github.com/NickTacke/brawlhalla-sim/issues/5): complete-AIR oracle architecture and T3 trust contract.
- [#37](https://github.com/NickTacke/brawlhalla-sim/issues/37): `avm2-air-10.09-v1` semantics and KAT contract.
- [#38](https://github.com/NickTacke/brawlhalla-sim/issues/38): startup/visual asset membership.
- [#39](https://github.com/NickTacke/brawlhalla-sim/issues/39): patch closure minimality and sufficiency.
- [#44](https://github.com/NickTacke/brawlhalla-sim/issues/44): conservative executable graph and deletion harness.
- [#53](https://github.com/NickTacke/brawlhalla-sim/issues/53): authenticated replay setup/cleanup traces.
- [#58](https://github.com/NickTacke/brawlhalla-sim/issues/58): AIR numeric parse outputs.
- [#72](https://github.com/NickTacke/brawlhalla-sim/issues/72), [#73](https://github.com/NickTacke/brawlhalla-sim/issues/73), [#74](https://github.com/NickTacke/brawlhalla-sim/issues/74), [#75](https://github.com/NickTacke/brawlhalla-sim/issues/75), and [#76](https://github.com/NickTacke/brawlhalla-sim/issues/76): complete-AIR oracle, trace hooks, scenario inputs, lifecycle driver, and terminal quiescence.
- [#83](https://github.com/NickTacke/brawlhalla-sim/issues/83) and [#84](https://github.com/NickTacke/brawlhalla-sim/issues/84): AdditionalContent universe and imported-code closure.

Required next proof sequence:

1. Build and attest the complete-AIR patched-Ruffle oracle with AIR 32 member gating and `OracleHostServices`.
2. Independently verify original/transformed ABCs and authenticate startup, extension, host, and replay lifecycle hooks.
3. Recover the authorized AdditionalContent/download manifest and every imported SWF hash, then rerun combined code/callback/reflection closure.
4. Produce AIR `33.1.1.633` synthetic goldens for every reached K semantic and native/host operation.
5. Execute the full replay-producing family x lifecycle matrix, including a terminal quiescence proof for no-attempt cells.
6. Re-run static and runtime ledgers. Any unclassified call keeps issue #88 open.

## Privacy and fail-closed notes

No proprietary binary, SWF, SWZ, ABC, replay, credential, player/account field, source payload, generated bulk table, or machine-local path is included in this artifact. Hashes, counts, method IDs, byte PCs, semantic IDs, and public repository URLs are retained because they are the minimum evidence needed to audit disposition claims.

A changed identity, missing manifest member, unknown opcode, unresolved dispatch/reflection/callback, undeclared resource, unclassified AIR/native call, host-boundary bypass, native payload execution, wall-clock/entropy read, nondeterministic scheduler result, or absent target golden must invalidate the run rather than select a fallback.

## Verification record

The report was written against the repository instructions in `CONTRIBUTING.md`, `README.md`, `CONTEXT.md`, `docs/provenance.md`, `.gitignore`, and root/package scripts in `package.json` and package manifests. Focused verification for this evidence-only change is recorded by the branch commit and includes:

```text
bun run check
bun run --cwd tools/avm2-provenance build-dependency
bun run provenance:movement                         # only with the ignored user-owned main.abc
 git diff --check
```

The movement command is intentionally not claimed as run in this clean public worktree because `artifacts/main.abc` is unavailable. Prior attested provenance reports identify its expected hash and status. This report itself requires no proprietary input to lint, hash, or inspect.

**Conclusion: leave issue #88 OPEN.** Static package identity and bounded native capability families are documented, but static and runtime reachability plus every reached call are not fully classified.
