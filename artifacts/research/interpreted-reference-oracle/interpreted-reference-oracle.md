# Interpreted reference oracle for Brawlhalla 10.09.96325

Issue: [#5 Establish a non-live interpreted reference oracle](https://github.com/NickTacke/brawlhalla-sim/issues/5)

## Decision

Build one prototype around a hash-pinned, headless, full-SWF **Ruffle `core`** embedder at commit [`6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943`](https://github.com/ruffle-rs/ruffle/tree/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943). Apply a small reviewed virtual-clock and seeded-RNG patch, instrument a copy of the target ABC at narrow method boundaries, and export canonical gameplay traces through Ruffle's `ExternalInterfaceProvider`.

This is a **conditional recommendation**, not a finding that an oracle already works. Stock Ruffle is not deterministic and has material AIR stubs. No target boot, match initialization, or interpreted trace has been demonstrated. Keep issue #5 open until the prototype acceptance contract passes.

Do not build a new raw-ABC interpreter as the minimal oracle. The target is a full AIR SWF with startup, playerglobal, native, asset, event, and application-domain dependencies. A narrow evaluator over a pre-seeded object graph can remain a provenance aid, but it cannot establish match behavior.

## Evidence grades and current trust

| Grade | Meaning |
| --- | --- |
| P | Proven by a pinned source permalink, exact hash, or a repository command that fails closed. |
| R | Reviewed measurement tied to the exact local ABC/SWF cohort, but not yet enforced by a committed oracle scanner. |
| C | Candidate architecture or requirement awaiting a target experiment. |
| U | Unknown. No correctness claim is allowed. |

| Trust level | Required result | Present status |
| --- | --- | --- |
| T0, identified | Inputs, runtime source, patches, transformations, toolchain, and harness are hash-pinned. | Partial. Local inputs and the upstream runtime commit are identified; no harness, patch, or transformed ABC exists. |
| T1, booted | Full SWF reaches an offline match-ready boundary with every native call and resource read declared; prohibited capabilities fail closed. | Not reached. |
| T2, deterministic | A replay initializes and completes twice in fresh processes with byte-identical canonical tick traces. | Not reached. |
| T3, reviewed-corpus reference | VM, AIR, lifecycle, and game-layer differential gates pass, including all 12 reviewed fixtures on two architectures. | Not reached. This is the minimum level for calling traces trustworthy for the reviewed corpus. |
| T4, declared-scope reference | Coverage and conformance pass for every declared replay-producing configuration, including negative and boundary cases. | Not reached. The local corpus is too narrow to claim this scope. |

Agreement between two open-source runtimes does not raise a trace to T3 by itself. T3 needs independently obtained authorized Adobe/HARMAN AIR goldens for each reached AIR native and lifecycle behavior, plus official-build game-layer traces for selected local scenarios.

## Pinned identities

All digests are SHA-256. The local executable and data cohort is build `10.09.96325`.

| Artifact | Bytes | SHA-256 | Oracle role | Grade |
| --- | ---: | --- | --- | --- |
| `BrawlhallaAir.swf` | 1,730,834 | `40df9af5308b9a17bf015feb38edec6d9bea57d1cd53078d298aa725acceb8b2` | Original full-SWF startup input | R |
| tag-72 `main.abc` | 3,934,088 | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Main executable rules | P |
| `Dynamic.swz` | 292,091 | `cd54de039bc4e3441a7ae5811ef8748a719f49e0d4917016407d83b201ddf9c4` | Level and dynamic data candidate | R |
| `Engine.swz` | 7,456 | `aa5b25d0351b7c2c41ccfc588f9bd7ece0c21adb4d4034aa2416d5101684f8dc` | Engine data candidate | R |
| `Game.swz` | 977,263 | `4fc9d70c1c3642b7d3e61c8bb0062bb57c46ea2169276ca1d33616a5843d4aff` | Gameplay data candidate | R |
| `Init.swz` | 182,708 | `bfb56c12517b7a95927feaca7180d5a85b6952d4d53e76e614ffc06bf4fe067b` | Unresolved initialization candidate, not approved for exclusion | R/U |
| Replay manifest | 23,320 | `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac` | Reviewed 12-fixture validation cohort | P |
| 261-entry normalized aggregate | n/a | `4bcd0666a713d81266bd76885ed21740c4e8c4c01def2ebcd02202983a6a8d8f` | Snapshot provenance, not automatically the oracle allowlist | R |
| Ruffle source | n/a | Git commit `6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943` | Interpreter/player implementation | P |

The SWF review reports that legacy tag 72 contains `main.abc` byte for byte, the symbol class for character ID 0 is `_-N4u`, and nine additional small ABC blocks cover ANE, Steam, sound, Epic, and AGAL integration. These are reviewed facts, not yet T0 gates. The prototype must generate and preserve a tag manifest with every DoABC block name, flags, byte range, and digest, plus the SymbolClass table. It must reject any mismatch before execution.

Ruffle is dual licensed under MIT or Apache-2.0, as recorded in its pinned [`LICENSE.md`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/LICENSE.md#L1-L7). The prototype must record which option applies to distributed modifications and retain the required notices.

### Local reproduction

User-owned proprietary inputs remain ignored. Supply them locally; do not add them to Git.

```bash
# Identity checks
shasum -a 256 artifacts/main.abc "$BRAWLHALLA_RESOURCES/BrawlhallaAir.swf" \
  "$BRAWLHALLA_RESOURCES/Dynamic.swz" "$BRAWLHALLA_RESOURCES/Engine.swz" \
  "$BRAWLHALLA_RESOURCES/Game.swz" "$BRAWLHALLA_RESOURCES/Init.swz"
stat -f '%z %N' artifacts/main.abc "$BRAWLHALLA_RESOURCES"/{BrawlhallaAir.swf,Dynamic.swz,Engine.swz,Game.swz,Init.swz}

# Exact reviewed replay-manifest identity
shasum -a 256 artifacts/replay-corpus/10.09.96325/manifest.json
stat -f '%z %N' artifacts/replay-corpus/10.09.96325/manifest.json

# Decode all method bodies, validate byte-PC branch targets, and recover the proven replay-to-jump chain
bun install
bun run provenance:movement
```

`bun run provenance:movement` accepts only ABC hash `9fe9...ba2d`, requires the unique build string `10.09.96325`, decodes 15,010 method bodies, validates branch targets as `instruction.end + s24`, and exits nonzero when the chain is unresolved. The implementation is `tools/avm2-provenance/movement_provenance.ts`; expected evidence is documented in `docs/provenance.md`.

The current local checkout stores the user-supplied ABC at `artifacts/research/brawlhalla-physics/main.abc`, so this equivalent command was used during this review:

```bash
bun run --cwd tools/avm2-provenance build-dependency
bun tools/avm2-provenance/movement_provenance.ts \
  --abc artifacts/research/brawlhalla-physics/main.abc \
  --target grounded-jump-y
```

It returned build `10.09.96325`, the expected ABC hash, 15,010 decoded bodies, valid branch targets, `status: "proven"`, and no blockers. The path difference is local-only and must not enter a committed oracle manifest.

## Why a full SWF is the minimum load unit

Ruffle loads all classes and scripts from a DoABC and distinguishes lazy from eager blocks in [`core/src/avm2.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2.rs#L503-L547). It deliberately models SymbolClass and eager-initializer ordering in [`movie_clip.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/display_object/movie_clip.rs#L4250-L4270). Raw `main.abc` execution omits those SWF tags, root-class construction, the nine auxiliary ABCs, player lifecycle, asset domains, and AIR startup.

The reviewed ABC contains 815 classes and 815 scripts, not “about 100” startup scripts. Its application initializer, method 14909, is 29,796 instructions. The focused tick/input/fighter slice alone is 10,813 instructions across 73 opcodes. These reviewed measurements explain why startup cannot be replaced by blindly running scripts in ABC order or silently skipping unsupported instructions. A future committed capability scanner must promote these measurements from R to P before T0 acceptance.

Startup strategy:

1. Verify the full SWF and every embedded ABC identity before parsing or execution.
2. Construct Ruffle through `PlayerBuilder` in AIR mode with the AVM2 optimizer disabled for the first conformance runs.
3. Preserve native DoABC flags, SymbolClass binding, root construction, lazy script initialization, class initialization, and circular-initialization behavior. Do not manually iterate 815 script initializers.
4. Mount only hash-pinned, read-only local resources. Begin with `Game.swz` and `Dynamic.swz`; include `Engine.swz` when observed dataflow requires it. `Init.swz` remains included or execution-halting until reachability proves it unnecessary.
5. Record the first missing API, first stub invocation, first prohibited I/O, and first resource miss. Any one prevents T1.
6. Boot through original application startup. Direct invocation of coordinator method 3273 is allowed only after a lifecycle differential proves that the resulting tick-zero state equals full startup.
7. Keep the optimizer off until optimizer-on/off traces are identical. Then retain both modes as a regression dimension.

Ruffle exposes AIR classes through API-version mapping, but the pinned mapping stops at AIR 29 in [`api_version.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/api_version.rs#L87-L101) and [`api_version.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/api_version.rs#L244-L259). Target SWF version, AIR namespace/version markers, ANEs, imports, and reached native members must therefore be inventoried before T1.

## Minimal architecture

```text
hash gate
  original full SWF + local resource allowlist + replay manifest
      |
      v
patched Ruffle core at 6e69...0943
  AIR mode, optimizer initially off
  virtual monotonic clock + fixed AVM RNG seed
  null renderer/audio/video/storage/UI
  deny-all navigator and explicit read-only local-resource provider
      |
      v
instrumented copy of full SWF
  unchanged startup order
  narrow entry/exit/event hooks in selected ABC methods
      |
      v
ExternalInterfaceProvider: oracle.tick / oracle.event / oracle.fault only
      |
      v
canonical binary trace encoder -> per-run digest + optional privacy-safe diagnostics
```

Ruffle is the smallest credible base because it combines full-SWF startup ordering with an embeddable player. `tick(dt)` and `run_frame()` are public and rendering is separate in [`player.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/player.rs#L522-L580) and [`player.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/player.rs#L2003-L2039). Its own headless test runner already supplies fixed ticks and an optional renderer in [`tests/framework/src/runner.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/tests/framework/src/runner.rs#L79-L128). Host callbacks, a trace backend, and `ExternalInterfaceProvider` are public in [`external.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/external.rs#L356-L419) and [`player.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/player.rs#L2452-L2473).

### Hash-pinned oracle artifacts

A run is identified by an immutable `oracleArtifactSetId`, calculated from a canonical manifest containing:

- Ruffle commit and recursive dependency lock;
- selected Ruffle license and notices;
- deterministic patch diff, patch SHA-256, and built Ruffle library SHA-256;
- Rust toolchain, target triple, build flags, optimizer setting, and harness executable SHA-256;
- original SWF SHA-256 and the complete original tag/ABC manifest;
- instrumented SWF SHA-256 and each transformed ABC SHA-256;
- a machine-readable transformation manifest with method ID, original byte-PC anchor, inserted instruction sequence, stack/scope deltas, branch/exception-table rewrites, and before/after method-body hashes;
- virtual clock and RNG contract version, seed, native capability profile, local-resource allowlist, sandbox policy, and trace schema version.

These artifacts define **how the reference behavior was observed**. They are not simulator inputs.

### Simulator patch snapshot artifacts

The simulator's separately installed patch snapshot contains executable-rule provenance and normalized gameplay data identities: `main.abc`, required SWZ identities, normalized entry hashes, loader/default semantics, collision and hitbox data, and a closure manifest. It does not contain Ruffle, the deterministic Ruffle patch, instrumented ABCs, the oracle harness, or reference traces.

A trace header names both IDs:

```text
oracleArtifactSetId = hash(runtime + patch + instrumentation + harness + sandbox + trace schema)
simulatorPatchSnapshotId = hash(executable/data closure consumed by the simulator)
```

Never infer one ID from the other. The oracle can be rebuilt without changing the simulator snapshot, and the simulator snapshot can gain closure evidence without silently changing the oracle runtime.

## Host and native boundary

Ruffle's `NativeApplication`, `File`, and `FileStream` contain compatibility stubs at the pinned commit: [`NativeApplication.as`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/globals/flash/desktop/NativeApplication.as#L20-L88), [`File.as`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/globals/flash/filesystem/File.as#L13-L84), and [`FileStream.as`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/globals/flash/filesystem/FileStream.as#L6-L16). A game that boots through a default return is not evidence of fidelity.

Every reached native call gets one capability-manifest entry:

```text
{ QName, member, call site method/byte-PC, disposition, implementation version,
  input schema, output schema, side effects, conformance fixture, state-influence result }
```

| Boundary | Prototype disposition |
| --- | --- |
| AVM2 opcodes, multinames, closures, classes, exceptions | Use Ruffle implementation; validate reached semantics against avmplus. |
| `ByteArray`, `Array`, `Vector`, `Point`, dictionaries/maps, XML, numeric coercion, `Math` | Use only after reached-member known-answer tests. Any mismatch is a blocker, not a tolerated approximation. |
| `Date`, `getTimer`, timers | Route to one injected virtual monotonic clock. Reject wall-clock access. |
| `Math.random` and AVM RNG initialization | Route to an explicit seeded state. Preserve algorithm, seed transform, stream split, and draw order in traces. |
| Local files/resources | Read-only exact-path and hash allowlist. Reject directory enumeration and undeclared reads. |
| `NativeApplication.exit` | Trap as `oracle.fault`; never exit silently. |
| Steam, Epic, ANE keyboards, telemetry, networking | Explicit headless stubs only after proving their returns cannot influence match state. Otherwise block. |
| Renderer, Stage3D, bitmap, bounds | Null backend is conditional. Any gameplay read of renderer-derived bounds or pixels blocks headless acceptance. |
| Audio/video/UI/window/storage | Null, nonpersistent backends; any state-influencing return blocks. |
| `ExternalInterface` | Permit only instrumentation-origin `oracle.tick`, `oracle.event`, and `oracle.fault`. Reject undeclared game-origin calls and host callbacks. |
| HTTP, sockets, URL navigation | Deny and record. No fallback response. |

The capability manifest starts empty. It is populated from static import inventory plus observed calls. Observed-only coverage is insufficient, so unreached imported natives remain unresolved until static reachability or explicit exclusion closes them.

## Deterministic driving contract

Ruffle currently derives `getTimer()` and initial RNG state from wall time in [`flash/utils.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/globals/flash/utils.rs#L17-L27) and [`avm_rng.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm_rng.rs#L43-L63). Stock Ruffle runs cannot satisfy this contract.

1. The harness owns integer virtual time. Before startup it sets `t = 0` and all declared RNG states to manifest values.
2. It never reads host time, host randomness, locale, timezone, filesystem order, or network state after the hash gate.
3. Replay timestamps are sampled in exact 16 ms quanta. For input step `n`, the requested time is `t(n) = 16 * n` ms with checked integer arithmetic.
4. The harness injects all snapshots due at `t(n)` at the proven replay-input seam, then advances Ruffle by exactly 16 virtual ms. The ordering of timers, input insertion, frame events, and the authoritative update must be established by lifecycle goldens before T2.
5. A Ruffle player frame is not assumed to equal a gameplay tick. Instrumentation brackets the authoritative game update. Emit state only after the outermost successful completion of coordinator method 3273 `_-u16._-A4X`.
6. Zero, multiple, reentrant, or exceptional coordinator completions in one requested step are recorded and rejected unless an approved lifecycle fixture specifies that cadence.
7. No rendering or audio call may advance time. Worker threads are disabled or deterministically joined. All callbacks are drained in a specified order before the next step.
8. End only at the game's identified terminal match transition. Wall-clock timeout is a sandbox kill and failed trace, never a game result.

The exact local input chain is reproducible with `bun run provenance:movement`: replay timeline loader method 3507, insertion method 6133, timestamp sampler method 6135, input edge consumer method 6125, jump method 2954, and fighter movement method 2887. The report also proves timestamp field `_-D6c`, input mask `_-T4y`, grounded state `_-U5H`, pending vertical impulse `_-l16`, vertical velocity `_-30`, and motion delta `_-w2F.y` for ABC `9fe9...ba2d`.

### Replay injection seam

- Parse the authentic format-268 replay outside the Ruffle process using the hash-pinned replay decoder.
- Pass only validated state 3, state 4, and timestamped input snapshots across a length-delimited IPC boundary.
- Reconstruct original loader semantics through method 3507 or prove a direct typed-state adapter equivalent at the first coordinator entry.
- Insert snapshots through method 6133 and observe all eight reviewed `returnvalue` exits of method 6135. Trace method 6125 entry/exit to preserve edge consumption.
- Treat replay seed construction, PRNG stream construction/splitting, loader defaults, state 3/state 4 interpretation, and resource selection as U until traced end to end.
- Reject malformed ordering, duplicate timestamps outside proven semantics, arithmetic overflow, undeclared state fields, and replay/snapshot ID mismatches.

The current 12-fixture manifest is narrow: format 268, four-human online timed free-for-all, 275,166 total replay bytes, 49,874 input snapshots, and 161 KO-face events. These values are in `artifacts/replay-corpus/10.09.96325/manifest.json`; reproduce its identity with the commands above. Passing those fixtures does not establish teams, stock, bots, offline, disconnects, ties, sudden death, special modes, or all powers and maps.

## Selective trace seam and schema

Instrument an ABC copy, never the original bytes. Preferred hooks for the pinned ABC are:

| Boundary | Hook | Purpose | Status |
| --- | --- | --- | --- |
| AIR frame callback | `Main._-52Z`, method 5527, entry/exit | Lifecycle comparison | R |
| Frame registration | `Main.Init`, method 5533, instructions 92-98 | Establish callback order | R |
| Gameplay update | `_-u16._-A4X`, method 3273, outermost entry/exit | Authoritative per-tick emission | R |
| Replay load | method 3507 | State 3/state 4 and timeline load | P for input chain, U for full initialization |
| Snapshot insertion | method 6133 | Replay injection | P for input chain |
| Timestamp sample | method 6135, every `returnvalue` | Selected mask/time | P for input chain |
| Input edge consumer | method 6125 entry/exit | Changed-and-held edge behavior | P for input chain |
| Fighter movement | `_-V4R._-D38`, method 2887 entry/exit | Motion state | P for jump chain |
| Jump application | method 2954, branch markers 380/426/841/1011 | Dash, ground, wall, air jump events | R, with method identity P |
| Hit append | `OnHit`, method 2944, after instruction 69 | Ordered hit event | R |
| KO production | unresolved | Ordered KO/scoring event | U, blocks T3 |

Instrumentation must be stack- and scope-neutral at each hook, preserve byte-PC branch targets and exception ranges, and call one host function with an ordered scalar vector. Do not walk the heap. A generic mutation mode may be used during method discovery, but only inside declared methods and only for `setproperty`, `initproperty`, `setslot`, and array/map writes. It must emit method ID, original byte PC, stable object ID, resolved namespace/name, and old/new exact value bits. Full-heap or bulk proprietary traces are prohibited.

### Canonical trace boundaries

Use a versioned binary schema, not JSON floating-point text.

**Run header**

- schema version;
- `oracleArtifactSetId` and `simulatorPatchSnapshotId`;
- original and instrumented SWF/ABC digests;
- replay digest or privacy-safe fixture ID, never source filename;
- replay format, declared scenario, seed inputs, virtual tick size;
- runtime target triple, optimizer flag, and capability-profile digest.

**Tick record, emitted after method 3273**

- monotonic oracle tick index and virtual time;
- consumed snapshot time `_-D6c` and mask `_-T4y`;
- entities sorted by stable game entity ID, never host address or map iteration;
- exact `Number` IEEE-754 bits and fixed-width `int`/`uint` values for position, velocity, motion delta, damage, stun/recovery, action/state IDs, grounded state `_-U5H`, pending impulse `_-l16`, vertical velocity `_-30`, and stocks/lives;
- all PRNG stream states and draw counters;
- mode, scoring, respawn, item, and match-terminal state proved gameplay-relevant;
- ordered event list: input edges, jumps, hits, damage, item transitions, deaths/KOs, score changes, respawns, and terminal result;
- per-record domain-separated digest chained to the prior record.

**Fault/footer record**

- terminal result and duration, or one stable fault code;
- counts of requested 16 ms steps and completed authoritative updates;
- first undeclared native/resource/capability access, if any;
- final trace digest and event-count summary.

The privacy filter must reject player names, account IDs, raw replay records, raw source entries, arbitrary strings, memory addresses, and proprietary bulk data before serialization. Safe committed outputs are schemas, hashes, counts, method/config identifiers, formulas, tiny synthetic fixtures, and privacy-filtered digests.

## Sandboxing

Embedder backends are capability controls, not an operating-system sandbox. Run each replay in a fresh, unprivileged process with:

- no network namespace or equivalent deny-all network policy;
- read-only runtime and exact local-resource allowlist;
- empty read-only home where possible and a private size-limited temporary directory;
- no inherited credentials, environment secrets, clipboard, devices, or user services;
- CPU, memory, output, file-size, process-count, and virtual-tick limits;
- syscall restrictions allowing only the harness's measured minimum;
- closed standard input and length-limited IPC/output;
- parent-side kill on policy violation, crash, hang, or output overflow.

The navigator rejects every HTTP, socket, and navigation request. The resource provider rejects path traversal, symlinks escaping the allowlist, directory enumeration, hash mismatches, and case-folding ambiguity. A sandbox kill produces no valid trace.

## Candidate disposition

| Candidate | Disposition | Evidence and reason |
| --- | --- | --- |
| Patched Ruffle `6e69...0943` full-SWF `core` | **Primary, gated** | Exact SWF startup ordering, AVM2 implementation, embedding, fixed-tick precedent, and host callback seam. Requires clock/RNG patch, AIR import/boot proof, capability manifest, and game conformance. |
| Stock Ruffle | **Reject as oracle** | Wall-time `getTimer`/RNG and AIR filesystem/application stubs make it nondeterministic and potentially silently wrong. It is only the upstream base. |
| New raw-ABC custom interpreter | **Reject as minimal architecture** | Omits SymbolClass/lifecycle/AIR startup and requires a real AVM2 object model, initialization, exceptions, runtime multinames, natives, and asset loading. Several thousand runtime lines plus adapters/tests are more credible than 400-800 lines. A pre-seeded method evaluator remains a provenance tool only. |
| Lightspark `d51ab60193b7baa56b2f6ec55f9a7789f99f6ee9` | **Secondary differential** | Its single-threaded fake-time harness and fixed tick are strong in [`runner.cpp`](https://github.com/lightspark/lightspark/blob/d51ab60193b7baa56b2f6ec55f9a7789f99f6ee9/tests/test-runner/src/framework/runner.cpp#L43-L145) and [`timer.cpp`](https://github.com/lightspark/lightspark/blob/d51ab60193b7baa56b2f6ec55f9a7789f99f6ee9/tests/test-runner/src/framework/backends/timer.cpp#L28-L46). DoABC/SymbolClass startup is heuristic in [`tags.cpp`](https://github.com/lightspark/lightspark/blob/d51ab60193b7baa56b2f6ec55f9a7789f99f6ee9/src/parsing/tags.cpp#L3539-L3554), `NativeProcess.start` is a no-op in [`flashdesktop.cpp`](https://github.com/lightspark/lightspark/blob/d51ab60193b7baa56b2f6ec55f9a7789f99f6ee9/src/scripting/flash/desktop/flashdesktop.cpp#L88-L112), and its README reports broad compatibility gaps in [`README.md`](https://github.com/lightspark/lightspark/blob/d51ab60193b7baa56b2f6ec55f9a7789f99f6ee9/README.md#L115-L121). LGPL-3.0 license: [`COPYING.LESSER`](https://github.com/lightspark/lightspark/blob/d51ab60193b7baa56b2f6ec55f9a7789f99f6ee9/COPYING.LESSER#L1-L12). |
| Adobe avmplus `65a05927767f3735db37823eebf7d743531f5d37` | **VM-semantic verifier only** | Adobe's final/lazy script initialization is authoritative in [`AvmCore.cpp`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/AvmCore.cpp#L821-L889) and [`MethodEnv.cpp`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/MethodEnv.cpp#L551-L595), but its SWF support only extracts DoABC and supplies no display list, AIR, input, or game scheduler: [`ShellCore.cpp`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/shell/ShellCore.cpp#L472-L555), [`swf.cpp`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/shell/swf.cpp#L90-L151). MPL-2.0 license: [`LICENSE`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/LICENSE#L1-L15). |
| Authorized Adobe/HARMAN AIR runtime | **Golden producer only** | It is the needed AIR/lifecycle authority, but not a redistributable, source-pinned, auditable deterministic harness. Use an authorized isolated installation to produce narrow conformance goldens, not as the deliverable oracle. Record exact installer/runtime identity and licensing authorization. |
| RedTamarin `766e945a7a2842865218fb1e2fd179c732167a25` | **Reject** | It identifies itself as an AS3 command-line runtime, not AIR in [`README.md`](https://github.com/Corsaair/redtamarin/blob/766e945a7a2842865218fb1e2fd179c732167a25/README.md#L4-L17). `Sprite` is empty in [`Sprite.as`](https://github.com/Corsaair/redtamarin/blob/766e945a7a2842865218fb1e2fd179c732167a25/src/as3/flash/display/Sprite.as#L8-L37), `setTimeout` throws in [`setTimeout.as`](https://github.com/Corsaair/redtamarin/blob/766e945a7a2842865218fb1e2fd179c732167a25/src/as3/flash/utils/setTimeout.as#L67-L72), and its event loop sleeps on wall time in [`CoreEventLoop.as`](https://github.com/Corsaair/redtamarin/blob/766e945a7a2842865218fb1e2fd179c732167a25/src/as3/shell/async/CoreEventLoop.as#L65-L88). MPL-1.1 top-level license: [`license.txt`](https://github.com/Corsaair/redtamarin/blob/766e945a7a2842865218fb1e2fd179c732167a25/license.txt#L1-L19). |
| Shumway `16451d8836fa85f4b16eeda8b4bda2fa9e2b22b0` | **Reject** | Its deterministic shell is useful historically, but its own fail configuration records namespace, prototype, Proxy, and dynamic-property failures in [`failconfig.txt`](https://github.com/mozilla/shumway/blob/16451d8836fa85f4b16eeda8b4bda2fa9e2b22b0/utils/patches/tamarin-acceptance/failconfig.txt#L32-L70), it has no meaningful AIR playerglobal, and development stopped in 2016. |
| AwayFL AVM2 `09afb8dd4f8df76a2795a83ee079bafa83ff8981`, playerglobal `6c4a1a03099308b4fb70acf04ba6efbffe70e5c0` | **Reject** | AIR classes and filesystem bindings are largely absent in [`link.ts`](https://github.com/awayfl/playerglobal/blob/6c4a1a03099308b4fb70acf04ba6efbffe70e5c0/lib/link.ts#L255-L276) and [`link.ts`](https://github.com/awayfl/playerglobal/blob/6c4a1a03099308b4fb70acf04ba6efbffe70e5c0/lib/link.ts#L396-L401); frame ordering has an authoritative-order TODO in [`Stage.ts`](https://github.com/awayfl/playerglobal/blob/6c4a1a03099308b4fb70acf04ba6efbffe70e5c0/lib/display/Stage.ts#L263-L301); `getTimer` uses `Date.now()` in [`FlashUtilScript_getTimer.ts`](https://github.com/awayfl/avm2/blob/09afb8dd4f8df76a2795a83ee079bafa83ff8981/lib/nat/FlashUtilScript_getTimer.ts#L4-L7). |

## Why the existing evaluator is not an oracle

The ignored research evaluator at `artifacts/research/brawlhalla-physics/brawlhalla-swz/abc_eval.ts` is 271 lines and is useful negative evidence:

- line 7 hardcodes a deleted temporary path;
- lines 25 and 34 index 1-based AVM2 pool entries as `strs[n]` instead of `strs[n - 1]`;
- lines 232-240 apply byte-relative branch offsets to an instruction-array index;
- line 247 silently no-ops unsupported instructions;
- it does not implement correct receiver binding, closures, activations, `newclass`, constructors, slots, accessors, exceptions, namespaces, array semantics, coercion, or initialization.

Reproduce the source review without executing proprietary code:

```bash
nl -ba artifacts/research/brawlhalla-physics/brawlhalla-swz/abc_eval.ts | sed -n '1,280p'
grep -n 'strs\[nm\]\|pc +=\|unknown: no-op\|default:' \
  artifacts/research/brawlhalla-physics/brawlhalla-swz/abc_eval.ts
```

Correct 1-based multiname handling and byte-PC branch resolution are implemented in `tools/avm2-provenance/movement_provenance.ts` (`strings[name - 1]` and `instruction.end + offset`) and exercised by `bun run provenance:movement`. The corrected evidence shows method 1885 performs rounding through `Math.pow` and `Math.round`; `Roland` is a `Knight -> Roland` legend alias; and the real `_-g5e` is a normal QName used on `SpawnBot`. Earlier interpolation conclusions must not be used.

The reviewed main ABC uses 110 opcodes overall; the evaluator covers 69 and misses 41. Kind 27 is `MultinameL`, not RTQName, and its reviewed use count is 13,328 instructions in 3,760 methods. Runtime-name property semantics are foundational. Even a target-specific clean-room evaluator would need fail-closed stack/locals, byte-PC control flow, scope and activation objects, exceptions, closures, classes/constructors/slots/prototypes, namespaces/runtime multinames, exact numeric/coercion behavior, collections, ByteArray/XML, lazy initialization, and every reached native. Silently continuing is never allowed.

Planning estimate, excluding Ruffle's existing code:

| Phase | Expected effort | Main uncertainty |
| --- | ---: | --- |
| SWF/import/resource inventory and offline boot spike | 3-8 engineer-days | First missing AIR/native and ANE reachability |
| Virtual clock/RNG patch plus headless harness | 5-10 engineer-days | Timer/event order and hidden host entropy |
| ABC transformation, manifest, and canonical trace encoder | 5-12 engineer-days | Safe exception/branch rewrites and KO hook |
| Native/resource adapters and match initialization | 5-30+ engineer-days | Loader defaults, PRNG, collision/hitbox assets, stub promotion |
| VM/AIR/lifecycle/game differential suite | 10-25+ engineer-days | Authorized official goldens and cross-architecture differences |

A T2 spike is plausibly 4-8 engineer-weeks if the game boots without new behavioral natives. T3 is plausibly 6-12+ engineer-weeks and can expand materially. These are planning ranges, not feasibility evidence. A startup-capable custom interpreter would require several thousand runtime lines plus native adapters, fixtures, tracing, and differential tests; its reachability-dependent total is not currently estimable. A 400-800 line implementation is credible only for a narrow evaluator over an attested prebuilt object graph.

## Differential validation ladder

1. **Identity:** reject altered source, patch, instrumented bytes, runtime binary, replay manifest, capability profile, or resources.
2. **Decoder/control flow:** decode all 15,010 bodies with zero invalid branch targets. Validate every transformed branch target and exception range again.
3. **VM layer:** select every avmplus acceptance test touching reached opcodes/classes. Compare exact output, coercion, exception type/message boundary, namespace lookup, closure, prototype, slot, enumeration, `NaN`, and negative zero behavior.
4. **AIR native layer:** make one tiny synthetic AIR fixture per imported/reached native member. Obtain authorized official-runtime goldens. Require exact return, exception, event, and side-effect ordering.
5. **Lifecycle layer:** golden-test DoABC lazy/eager flags, SymbolClass root `_-N4u`, Haxe `Boot.start`, constructor/cinit/script order, `ENTER_FRAME`, timers, and coordinator completion.
6. **Game layer:** instrument the official build and the Ruffle copy at equivalent narrow seams for deterministic local scenarios. Compare exact ordered scalar vectors, not screenshots, heap dumps, or tolerance-based summaries.
7. **Independent implementation:** run identical instrumented SWF/microtests in Lightspark. Differences block; agreement raises confidence but is not proof.
8. **Repeatability:** require byte-identical traces across 100 fresh processes, at least two architectures, optimizer off/on, and perturbed timezone, locale, host map insertion order, and resource-directory creation order.
9. **Corpus:** all 12 hash-pinned fixtures initialize, complete, and reproduce exact ordered KO IDs/timestamps, scores, duration, state vectors, and final digest without undeclared reads.
10. **Privacy:** automated rejection confirms no names, account IDs, source filenames, raw records, arbitrary strings, or bulk proprietary data enter trace artifacts.

Rendering may remain disabled only after a static and dynamic check proves no reached gameplay path reads renderer bounds, text metrics, bitmap pixels, Stage3D results, or other visual outputs. Repeat the check with a deterministic software renderer; any trace difference promotes rendering into the behavioral native profile.

## Prototype acceptance contract

The prototype is accepted at T2 only when all items below are machine-enforced and independently reviewed:

1. Exact input/runtime/patch/instrumentation/harness identities are emitted and hash-gated before execution.
2. The original full SWF boots in AIR mode offline; tag, DoABC, SymbolClass, import, ANE, and resource manifests are complete.
3. Every imported and reached native has an explicit capability disposition. Any undeclared call, default compatibility stub, or undeclared read fails the run.
4. Virtual `Date`/`getTimer`, timers, and AVM RNG produce known-answer results. No host entropy is reachable.
5. State 3, state 4, inputs, seed transform, PRNG streams, loader defaults, and match-ready state are traced end to end.
6. Fixed 16 ms requests drive a lifecycle-proven authoritative update cadence. Method 3273 completion, not Ruffle frame count, defines trace emission.
7. Instrumentation transformation is independently verified stack/scope neutral with valid branches and exceptions.
8. The canonical schema emits exact numeric bits, stable entity ordering, complete declared PRNG state, ordered gameplay events, and stable fault records.
9. One authentic replay initializes and finishes twice in fresh sandbox processes with identical full trace bytes and digest.
10. Unknown opcode, unresolved multiname/dispatch, exception escape, undeclared native/resource, prohibited I/O, renderer dependency, callback-order ambiguity, zero/multiple update anomaly, crash, hang, and privacy violation all fail closed.

T2 does **not** make the output a trustworthy reference. T3 additionally requires the full differential-validation ladder through the reviewed corpus, reviewer approval, and a declared scope statement. Until then, label outputs `experimental interpreted trace`.

## Ticket-ready residual questions

### 1. Inventory full-SWF startup and AIR native reachability

- Starting evidence: full-SWF hash `40df...b2d`; tag-72 ABC hash `9fe9...ba2d`; root SymbolClass `_-N4u`; nine auxiliary ABC blocks; Ruffle AIR mapping ends at AIR 29 and contains key stubs.
- Required evidence: committed tag/ABC/SymbolClass/import/ANE manifest, target SWF and AIR API versions, offline boot log with stable method/byte-PC call sites, complete reached native/resource list.
- Acceptance: two fresh boots reach the same match-ready boundary with zero undeclared native calls, stub returns, prohibited I/O, or resource misses.

### 2. Make Ruffle time and randomness injectable

- Starting evidence: pinned `getTimer` and AVM RNG read wall time.
- Required evidence: minimal reviewed patch, patch and binary hashes, synthetic known-answer tests for `Date`, `getTimer`, timers, `Math.random`, seed initialization, and callback order.
- Acceptance: exact results across 100 fresh processes and two architectures with host time/random APIs denied.

### 3. Prove replay initialization and PRNG closure

- Starting evidence: methods 3507, 6133, 6135, and 6125 form the reviewed input chain; replay manifest contains 12 unique seeds. Seed transformation, stream split, draw order, loader defaults, and mode roots remain unknown.
- Required evidence: instruction-level trace from replay state 3/state 4 through tick-zero state and every PRNG stream; resource reads tied to exact hashes.
- Acceptance: independently reproduce tick-zero state and first 100 update digests for at least two distinct seeds without undeclared data.

### 4. Establish the authoritative scheduler boundary

- Starting evidence: frame callback method 5527, registration method 5533, and coordinator method 3273 are candidate hooks; Ruffle separates `tick` and rendering.
- Required evidence: official-runtime and Ruffle lifecycle microtraces for input insertion, timers, `ENTER_FRAME`, coordinator entry/exit, and post-update events.
- Acceptance: one documented ordering and cadence matches exact goldens under fixed 16 ms requests, including zero/multiple/reentrant negative cases.

### 5. Close behavioral native and resource dependencies

- Starting evidence: direct target dependencies include `getTimer`, `ByteArray`, `Point`, `IMap`, and `IntMap`; `Game.swz` and `Dynamic.swz` are candidates; `Engine.swz` and `Init.swz` are unresolved; rendering reads are untested.
- Required evidence: static reachability plus observed capability profile, official AIR microtests, exact read allowlist, and renderer-on/off comparison.
- Acceptance: all reached calls/reads conform exactly; excluded resources and null backends are proven state-irrelevant.

### 6. Define complete selective gameplay trace hooks

- Starting evidence: methods 3273, 2887, 2954, 2944 and named fighter fields give narrow update/movement/hit seams. Exact KO production is unresolved.
- Required evidence: KO/scoring/respawn/terminal hooks, stable entity identity, all gameplay-relevant state fields, PRNG counters, transformation manifest, privacy tests.
- Acceptance: exact per-tick trace explains every ordered KO, score, stock/life, respawn, and final result in all 12 fixtures without heap walking.

### 7. Build the VM, AIR, lifecycle, and game conformance matrix

- Starting evidence: avmplus is the VM semantic authority; official AIR is needed for natives/lifecycle; Lightspark is an independent differential only.
- Required evidence: reached-opcode acceptance selection, one official golden per native/member and lifecycle edge, equivalent narrow official-game traces, Lightspark comparison, architecture/optimizer matrix.
- Acceptance: zero unexplained differences. Approved, documented exclusions must be statically and dynamically unreachable from the declared scope.

### 8. Promote reviewed local measurements into fail-closed provenance

- Starting evidence: reviewed counts include 815 scripts/classes, 110 used opcodes, 61 exception entries, method 14909 size, focus-slice size, and foundational kind-27 `MultinameL` use.
- Required evidence: a small committed privacy-safe scanner pinned to `abc-disassembler#ad9714d` that emits these counts, import inventory, method-body hashes, and hook anchor uniqueness for ABC `9fe9...ba2d`.
- Acceptance: command output is stable, contains no proprietary strings or local paths, and fails on identity or hook drift.

## Fail-closed summary

No trace is valid after any hash mismatch, undeclared or incompatible native, compatibility-stub return, unknown opcode, unresolved dispatch, unhandled exception, undeclared resource read, prohibited I/O, host clock/random access, lifecycle ambiguity, instrumentation mismatch, invalid branch/exception range, renderer-dependent state, scheduler anomaly, nondeterministic ordering, trace-schema violation, privacy violation, crash, hang, or sandbox kill.

No open-source candidate currently proves conformance to Adobe/HARMAN AIR game semantics. The recommended Ruffle architecture minimizes new interpreter work and maximizes auditability, but target feasibility remains U until boot/import, initialization, deterministic driving, and trace-repeatability experiments pass.
