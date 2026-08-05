# Interpreted reference oracle for Brawlhalla 10.09.96325

Issue: [Establish a non-live interpreted reference oracle](https://github.com/NickTacke/brawlhalla-sim/issues/5)

## Decision and present status

Prototype one hash-pinned, headless Ruffle `core` embedder at commit [`6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943`](https://github.com/ruffle-rs/ruffle/tree/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943). Load the complete AIR application boundary, patch every reached state-influencing host service behind one deterministic interface, instrument a verified copy of the target ABC at narrow method and byte-PC boundaries, and emit authenticated canonical traces.

This is a conditional architecture recommendation. No target AIR boot, match initialization, or interpreted target trace has run. Stock Ruffle is nondeterministic and has material AIR stubs. [Establish a non-live interpreted reference oracle](https://github.com/NickTacke/brawlhalla-sim/issues/5) remains open.

Live-client capture is excluded. The official Brawlhalla application must never be instrumented, modified, or used to produce game traces. An authorized Adobe or HARMAN AIR installation may run only tiny, non-game synthetic VM, AIR-native, and lifecycle microtests. Those goldens must contain no Brawlhalla bytecode, resources, state, or events.

A raw-ABC evaluator is not the minimal oracle. It omits SWF ordering, application descriptors, native extensions, packaged resources, AIR lifecycle, and application-domain behavior.

## Evidence grades and trust levels

| Grade | Meaning |
| --- | --- |
| P | Proven by a pinned source permalink, exact hash, or committed fail-closed command. |
| R | Reviewed measurement tied to the exact local input cohort, not yet enforced by an oracle scanner. |
| C | Candidate design or trace field awaiting target execution, reachability, or state-inventory evidence. |
| U | Unknown. No correctness claim is allowed. |

| Trust | Required result | Present status |
| --- | --- | --- |
| T0, identified | Application, runtime source, patches, transformations, harness, toolchain, capability profile, and fixture identities are hash-pinned. | Partial. Local identities and upstream commits are known; no harness or transformed application exists. |
| T1, booted | The complete declared AIR application reaches an offline match-ready boundary with every descriptor, extension, native call, resource read, and prohibited capability classified. | Not reached. |
| T2, prototype feasibility | At least one authentic replay completes twice in fresh processes with byte-identical interpreted target traces in optimizer-on and optimizer-off modes, with all fail-closed gates active. | Not reached. T2 proves only that the prototype can execute deterministically. It is not trustworthy reference status and cannot resolve the issue. |
| T3, reviewed-corpus interpreted reference | Layered conformance passes and actual interpreted target traces complete for all 12 reviewed fixtures on x64 and arm64, in optimizer-on and optimizer-off modes, with byte-identical repeatability and reviewer approval. | Not reached. This is the minimum issue-closure level and the minimum for calling a trace trustworthy for the reviewed corpus. |
| T4, declared-scope interpreted reference | Coverage and conformance pass for every declared replay-producing configuration, including generated negative and boundary cases. | Not reached. The reviewed corpus is too narrow. |

Ticket closure requires an actual T3 interpreted target trace, not a plan, boot log, synthetic microtest, or T2 repeatability result. This correction pass produces none.

## What layered T3 can and cannot prove

T3 uses six independent or partially independent layers:

1. reached AVM2 semantics checked against pinned Adobe avmplus acceptance behavior;
2. authorized AIR synthetic native and lifecycle microgoldens, never game traces;
3. static target reachability and capability closure from the original complete application;
4. a pinned Lightspark differential over the same synthetic tests and instrumented target input where it can execute;
5. deterministic interpreted target traces produced only by the patched Ruffle oracle;
6. corpus self-consistency: replay-observable events, final results, cross-run equality, cross-architecture equality, optimizer equality, and declared invariants across all 12 fixtures.

Passing these layers can establish that the pinned interpreted system is deterministic, internally consistent for the reviewed corpus, exercises a statically closed declared target slice, and agrees with independent VM, synthetic AIR, lifecycle, and open-source differential evidence at reached boundaries.

It cannot prove equivalence to the official Brawlhalla runtime because no official game trace is permitted. It cannot prove behavior on unreached target paths, omitted application members, unsupported match configurations, or future builds. Agreement between Ruffle and Lightspark is corroboration, not an Adobe/HARMAN or Brawlhalla semantic proof. T3 therefore supports the scoped label `reviewed-corpus interpreted reference`, not `official behavior`. T4 still requires broader closure and coverage evidence.

## Pinned identities

All digests are SHA-256. The executable and data cohort is build `10.09.96325`.

| Artifact | Bytes | SHA-256 | Role | Grade |
| --- | ---: | --- | --- | --- |
| `BrawlhallaAir.swf` | 1,730,834 | `40df9af5308b9a17bf015feb38edec6d9bea57d1cd53078d298aa725acceb8b2` | Entry SWF inside the AIR application | R |
| tag-72 `main.abc` | 3,934,088 | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Main executable rules | P |
| `Dynamic.swz` | 292,091 | `cd54de039bc4e3441a7ae5811ef8748a719f49e0d4917016407d83b201ddf9c4` | Dynamic-data candidate | R |
| `Engine.swz` | 7,456 | `aa5b25d0351b7c2c41ccfc588f9bd7ece0c21adb4d4034aa2416d5101684f8dc` | Engine-data candidate | R |
| `Game.swz` | 977,263 | `4fc9d70c1c3642b7d3e61c8bb0062bb57c46ea2169276ca1d33616a5843d4aff` | Gameplay-data candidate | R |
| `Init.swz` | 182,708 | `bfb56c12517b7a95927feaca7180d5a85b6952d4d53e76e614ffc06bf4fe067b` | Unresolved initialization candidate | R/U |
| Replay manifest | 23,320 | `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac` | Reviewed 12-fixture cohort | P |
| 261-entry extraction-provenance aggregate | n/a | `4bcd0666a713d81266bd76885ed21740c4e8c4c01def2ebcd02202983a6a8d8f` | Extraction provenance only, never normalized data or an allowlist | R |
| Ruffle source | n/a | Git commit `6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943` | Primary interpreter/player | P |
| Lightspark source | n/a | Git commit `d51ab60193b7baa56b2f6ec55f9a7789f99f6ee9` | Independent differential | P |
| Adobe avmplus source | n/a | Git commit `65a05927767f3735db37823eebf7d743531f5d37` | VM-semantic reference | P |

The reviewed entry SWF contains 815 classes and 815 scripts. Its application initializer, method 14909, contains 29,796 instructions. The focused tick, input, and fighter slice contains 10,813 instructions across 73 opcodes. All 15,010 method bodies decode with valid byte-PC branch targets. The main ABC uses 110 opcodes overall, has 61 exception entries, and contains 13,328 kind-27 `MultinameL` instructions across 3,760 methods. These remain reviewed measurements until a committed fail-closed oracle scanner promotes them to P.

Ruffle is dual licensed under MIT or Apache-2.0 in its pinned [`LICENSE.md`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/LICENSE.md#L1-L7). A distributed patched runtime must select an option and preserve required notices.

### Portable local identity commands

Supply user-owned paths. These commands print relative product/module identifiers, sizes, and hashes. They do not claim to conceal a path printed by a failing shell or tool.

```bash
export ABC_PATH=/absolute/user-supplied/path/main.abc
export BRAWLHALLA_RESOURCES=/absolute/user-supplied/path/to/Resources
export BRAWLHALLA_APP=/absolute/user-supplied/path/to/Brawlhalla.app

sha256_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    sha256sum "$1" | awk '{print $1}'
  fi
}
identity() {
  label=$1
  file=$2
  printf '%s\t%s\t%s\n' "$label" "$(wc -c < "$file" | tr -d ' ')" "$(sha256_file "$file")"
}

identity main.abc "$ABC_PATH"
for name in BrawlhallaAir.swf Dynamic.swz Engine.swz Game.swz Init.swz; do
  identity "$name" "$BRAWLHALLA_RESOURCES/$name"
done
identity application.xml "$BRAWLHALLA_APP/Contents/Resources/META-INF/AIR/application.xml"
for module in SteamAir RawData SoundEngineExtension; do
  base="$BRAWLHALLA_APP/Contents/Resources/META-INF/AIR/extensions/$module"
  identity "$module/extension.xml" "$base/META-INF/ANE/extension.xml"
  identity "$module/catalog.xml" "$base/catalog.xml"
  identity "$module/library.swf" "$base/library.swf"
done
contents="$BRAWLHALLA_APP/Contents"
identity AIR-launcher "$contents/MacOS/Brawlhalla"
identity AIR-framework "$contents/Frameworks/Adobe AIR.framework/Versions/1.0/Adobe AIR"
identity AIR-runtime-selector "$contents/Frameworks/Adobe AIR.framework/Versions/1.0/Adobe AIR_64"
identity AIR-WebKit "$contents/Frameworks/Adobe AIR.framework/Versions/1.0/Resources/WebKit.dylib"
identity AIR-A2712-helper "$contents/Frameworks/Adobe AIR.framework/Versions/1.0/Resources/A2712Enabler"
extensions="$contents/Resources/META-INF/AIR/extensions"
identity SteamAir-framework "$extensions/SteamAir/META-INF/ANE/MacOS-x86-64/SteamAir.framework/Versions/A/SteamAir"
identity SteamAir-API "$extensions/SteamAir/META-INF/ANE/MacOS-x86-64/SteamAir.framework/Versions/A/libsteam_api.dylib"
identity RawData-framework "$extensions/RawData/META-INF/ANE/MacOS-x86-64/RawData.framework/Versions/A/RawData"
identity SoundEngineExtension-framework "$extensions/SoundEngineExtension/META-INF/ANE/MacOS-x86-64/SoundEngineExtension.framework/SoundEngineExtension"
find "$BRAWLHALLA_APP/Contents/Resources" -maxdepth 1 -type f -name '*.swf' | wc -l
bun install
bun run --cwd tools/avm2-provenance build-dependency
bun tools/avm2-provenance/movement_provenance.ts \
  --abc "$ABC_PATH" \
  --target grounded-jump-y
```

The movement command accepts only the pinned ABC hash and build string, decodes 15,010 bodies, validates branch targets as `instruction.end + s24`, and exits nonzero when its declared chain is unresolved. Its implementation is `tools/avm2-provenance/movement_provenance.ts`.

## Complete AIR application boundary

The full SWF is the minimum SWF bytecode load unit, not the complete AIR application. Ruffle loads each DoABC and models lazy/eager blocks in [`core/src/avm2.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2.rs#L503-L547), and it models SymbolClass ordering in [`movie_clip.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/display_object/movie_clip.rs#L4250-L4270). The oracle must additionally bind the AIR descriptor, API version, extensions, native payload dispositions, launcher/runtime identity where relevant, and packaged resource closure.

The reviewed installed macOS application has descriptor ID `BrawlhallaAir`, profile `extendedDesktop`, entry content `BrawlhallaAir.swf`, target namespace AIR 32, and three extension IDs: `SteamAir`, `RawData`, and `SoundEngineExtension`. Its bundled AIR runtime reports `33.1.1.633`. It contains 538 top-level SWFs. Their bulk names and bytes are not committed; membership remains unresolved pending static reachability and asset classification.

### Installed descriptor and extension identities

| Member | Bytes | SHA-256 | Oracle disposition |
| --- | ---: | --- | --- |
| `META-INF/AIR/application.xml` | 1,215 | `33d64105102fb2999ae0d4d02c9ae75dd174d0f7965ae22f5f03390bdd8c2009` | **Include** in identity and parse before execution. AIR 32, profile, entry point, and extension IDs are mandatory gates. |
| `SteamAir/extension.xml` | 398 | `103b76d4d50d642290dfd36c71612d904e832fc853b1ab02a96f269bf35cbe84` | **Include** for static interface and platform mapping only. It grants no native capability. |
| `SteamAir/catalog.xml` | 1,574 | `995fbc2eef3745139d7846b51151e9afb47e7d50749001df9fdb8b3b0a154def` | **Include** in extension identity. |
| `SteamAir/library.swf`, both packaged copies | 2,732 each | `fc0a5e4b3310481d9ab34e9dcdc632457042bff5dd7f0cef5413ccad964e7fb3` | **Include** bytecode and identity for linking. Native calls remain unresolved. |
| `RawData/extension.xml` | 396 | `f4b7809e97341da31adfc194e2061f16631c774adf6618f4276f45a56d62824d` | **Include** for static interface and platform mapping only. |
| `RawData/catalog.xml` | 995 | `86c20dae0d837d46d30ac17130b3292181a0fd34bcdcc7530323268a1909249f` | **Include** in extension identity. |
| `RawData/library.swf`, both packaged copies | 841 each | `3e5a553a8f0d748e06d4457f9c6fd7374907c95644ca5be851bee2d46d3594df` | **Include** bytecode and identity for linking. Native calls remain unresolved and may affect resource decoding. |
| `SoundEngineExtension/extension.xml` | 445 | `20957bab181d9b3a3a25cad2c717f68d7114d7692161f46d47d54321f637e302` | **Include** for static interface and platform mapping only. |
| `SoundEngineExtension/catalog.xml` | 1,014 | `ad17e9ca11c4b57f8e0746f7366fd017cea71daa6e910a7d0efaed182db484ed` | **Include** in extension identity. |
| `SoundEngineExtension/library.swf`, both packaged copies | 1,652 each | `696f34b1f987d903af71e0e1ee0faeba64a2e03a2328498a92ec49d5207ecef8` | **Include** bytecode and identity for linking. Native calls remain unresolved. |

### Installed native identities and dispositions

| Native member | Bytes | SHA-256 | Oracle disposition |
| --- | ---: | --- | --- |
| Product AIR launcher | 89,904 | `f36d503e2fec65986455911b20291677da8ca40bdf13079408e69ed3307481fb` | **Reject** for oracle execution. Ruffle is the executable. Hash only as installed-cohort evidence. |
| Adobe AIR framework | 35,132,016 | `171caec02b70544b14d6fd81185d14f97a389d4db13b1fe96ed9a18a74a85980` | **Reject** for target-game execution. It may be separately identified only when an authorized installation runs tiny synthetic goldens. |
| AIR runtime selector | 14 | `c277a6712f73f41c8419c8cbc3c9343e7e799c1528392a502558932e095181a3` | **Reject** for oracle execution. Hash as part of the bundled runtime identity only. |
| AIR WebKit native library | 7,494,960 | `2af56c9b9d9f0bd3d93c87de46ed7193ffaf92b0e0a9f55c4b4bd74eca18efa2` | **Reject**. Web content and navigation are prohibited. |
| AIR A2712 helper | 152,432 | `7c28fecc15c56ad7be5374e984deb4588ac42a19b85924d4e9d8bca498a3fa95` | **Reject**. No helper process capability. |
| `SteamAir` framework | 254,912 | `6995632ca3b760a4911270bf0f78b24e4c07a897902bf82c2f598e9bbbd5a810` | **Reject** native execution. A reached member must use a reviewed deterministic stub only after static proof that platform state cannot affect match state; otherwise fail. Current status: **unresolved**. |
| `SteamAir` API native library | 609,584 | `162b0c71e1e724582a884c95f2748cb20944a003e858c017dc6bdd10c18e1536` | **Reject** native execution and network/platform access. Same unresolved-call rule as `SteamAir`. |
| `RawData` framework | 38,312 | `3a0ca18918c246c8f5958532dadd176a6128a9f18fbb3246f2098454e1a8c9ae` | **Reject** native execution. No stub is accepted until reached semantics and resource influence are closed. Current status: **unresolved**. |
| `SoundEngineExtension` framework | 8,552,432 | `a2ac734c2aee32971008ac2fb7f314c599b9c78784b4dc06f59b40ea51c38bdf` | **Reject** native execution. A deterministic null stub is allowed only after static and dynamic proof that every reached return is state-irrelevant. Current status: **unresolved**. |

Duplicate framework aliases with identical hashes are one payload identity, not independent evidence. Every other top-level packaged SWF is **unresolved**, not silently excluded. [Classify startup and visual asset membership](https://github.com/NickTacke/brawlhalla-sim/issues/38) must classify each asset family, and [Prove patch closure minimality and sufficiency](https://github.com/NickTacke/brawlhalla-sim/issues/39) must deletion-test the resulting closure. No proprietary member is committed.

Ruffle maps AIR APIs only through AIR 29 at this commit in [`api_version.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/api_version.rs#L87-L101) and [`api_version.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/api_version.rs#L244-L259). The AIR 32 target is therefore an explicit compatibility blocker until every statically reachable API/member has a disposition and conformance result.

## Minimal architecture and hash gates

```text
complete application identity gate
  descriptor + entry SWF/tag/ABC inventory + extension metadata/library SWFs
  + resource closure + native dispositions + replay manifest
      |
      v
patched Ruffle core at 6e69...0943
  AIR mode + OracleHostServices only + deny-by-default capabilities
  optimizer-on and optimizer-off from the first target trace
      |
      v
independently verified instrumented application copy
  authenticated method/byte-PC hooks + unchanged startup ordering
      |
      v
capability-authenticated ExternalInterface provider
      |
      v
candidate canonical binary encoder -> interpreted target trace + digest
```

`oracleArtifactSetId` hashes the Ruffle commit and dependency lock, selected license, deterministic patch, runtime binary, toolchain and target triple, complete original application identity manifest, transformed SWF and ABC hashes, transformation manifest, independent-verifier identity/result, host-services contract, capability profile, sandbox policy, optimizer flag, and trace schema.

`simulatorPatchSnapshotId` separately hashes the simulator's installed patch snapshot. Neither ID is inferred from the other. Oracle runtime artifacts are not simulator inputs.

## One deterministic host-services boundary

Stock Ruffle has more host influence than `getTimer` and RNG:

- `Player::tick` measures actual `run_frame` duration and uses it in `max_frames_per_tick`; it also accepts audio skew and then advances sockets, connections, timers, streams, and audio in [`player.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/player.rs#L475-L588).
- preload execution limits include elapsed-time budgets derived from frame rate in [`player.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/player.rs#L2002-L2017).
- update contexts carry `start_time`, `update_start`, and `max_execution_duration` in [`context.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/context.rs#L181-L207), and AVM2 timeout checks compare host elapsed time in [`activation.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/activation.rs#L945-L956).
- `getTimer` reads `Instant::now()` in [`flash/utils.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/globals/flash/utils.rs#L17-L27), and AVM RNG seeding reads current time in [`avm_rng.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm_rng.rs#L48-L66).
- no-argument `Date` reads current time and local date construction reads timezone in [`date.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/globals/date.rs#L209-L258); the providers use `Utc::now()` and `Local::now()` outside deterministic test builds in [`locale.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/locale.rs#L1-L25).
- AVM timers advance from supplied `dt`, mutate during callback execution, and cap callbacks per update in [`timer.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/timer.rs#L31-L75).
- click sequencing timestamps input with `Utc::now()` in [`input.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/input.rs#L283-L300).
- text-selection blink state reads `Utc::now()` at creation, reset, and render checks in [`edit_text.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/display_object/edit_text.rs#L3274-L3383).
- navigator futures are scheduled through an executor whose completion order is a host concern in [`navigator.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/backend/navigator.rs#L308-L389).
- file-dialog metadata can expose creation time, modification time, filename, size, and contents in [`ui.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/backend/ui.rs#L66-L80).

The patch must introduce exactly one `OracleHostServices` boundary. Every state-influencing host read or scheduling decision routes through it:

| Service | Deterministic contract |
| --- | --- |
| monotonic and wall time | Checked integer virtual time. Fixed epoch and timezone from the artifact manifest. No host clock after identity gating. |
| frame pacing | Fixed requested quantum and declared frame/update cadence. Remove measured execution duration, `recent_run_frame_timings`, audio skew, sleep deadlines, and elapsed-time catch-up from semantic scheduling. |
| execution limits | Deterministic operation-count budgets and explicit virtual-step limits. Host elapsed time may kill the sandbox but cannot change VM results or produce a valid trace. |
| RNG | Manifest seed, exact algorithm/seed transform, stream identities, draw counts, and deterministic initialization. No host entropy. |
| timers and blink | One virtual scheduler with a total order `(dueVirtualTime, creationSequence, callbackSequence)`. Text blink is virtualized if reached or removed only after reachability proves it cannot influence state. |
| input time | Replay-derived virtual timestamps only. Host input is disabled. Any UI event is rejected. |
| locale and timezone | Fixed manifest locale, language, timezone offset, date parsing policy, and Unicode data version. Host environment changes are invisible. |
| resources and filesystem | Exact-path, read-only, hash-pinned allowlist. Results are sorted by canonical byte name. Directory enumeration, metadata, symlink escape, undeclared reads, and host creation order are rejected. |
| asynchronous work and threads | Single deterministic executor with manifest queue order. Workers, parallel decode, renderer threads, background I/O, and nondeterministic callbacks are disabled or deterministically joined before observation. |
| platform, renderer, audio, UI, storage, network | Deterministic explicit adapters. Any reached state-influencing return without a conformance fixture blocks the run. Network and navigation always reject. |

A static source audit must inventory all direct clock, entropy, locale, filesystem, metadata, process, thread, executor, audio-pacing, and backend calls in the pinned dependency closure. Dynamic capability accounting must prove every reached host call entered `OracleHostServices`. The oracle build fails if a forbidden symbol remains outside approved sandbox-only termination code. At runtime, an unregistered service ID, undeclared resource, host callback, thread creation, or direct provider bypass emits a stable fault and invalidates the trace. Repeatability tests perturb wall time, timezone, locale, CPU load, filesystem creation order, process scheduling, and architecture.

The authoritative game update hook and all trace fields below remain candidates until [Recover authoritative tick phases and timestamp semantics](https://github.com/NickTacke/brawlhalla-sim/issues/7) and [Derive the complete gameplay-relevant state inventory](https://github.com/NickTacke/brawlhalla-sim/issues/9) close them.

## AIR and native capability boundary

Ruffle's `NativeApplication`, `File`, and `FileStream` include compatibility stubs at this commit: [`NativeApplication.as`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/globals/flash/desktop/NativeApplication.as#L20-L88), [`File.as`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/globals/flash/filesystem/File.as#L71-L102), and [`FileStream.as`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/globals/flash/filesystem/FileStream.as#L6-L16). `File.getDirectoryListing` is therefore not a deterministic order source today, but any replacement must sort canonically and route through `OracleHostServices`. A default return is not fidelity evidence.

Every statically reachable or observed native member has one manifest record:

```text
{ QName, member, callSiteMethod, originalBytePc, disposition,
  implementationVersion, inputSchema, outputSchema, sideEffects,
  conformanceFixture, stateInfluence, hostServiceId }
```

Allowed dispositions are `include`, `deterministic-stub`, `reject`, and `unresolved`. `unresolved` always blocks T1. Observed-only coverage is insufficient. Static reachability must account for runtime multinames, virtual dispatch, callbacks, exceptions, reflection, extension contexts, and application-domain loading.

## Authenticated instrumentation and trace channel

Instrument a copy, never original bytes. The original and transformed application identities remain distinct.

A callback name alone is not authorization. The provider accepts a trace record only when all of these pass:

1. a fail-closed static scan of every original ABC proves there is no reserved oracle callback name, reserved capability-token material, or original call path capable of issuing a reserved call;
2. each run uses a manifest-bound capability token generated outside target state and injected only into verified instrumentation;
3. the callback supplies the token, hook ID, original method ID, original byte PC, call-depth marker, and ordered scalar payload;
4. the provider checks that tuple against the signed transformation manifest and the currently active verified instrumented method/PC call-stack boundary;
5. the token is never returned to ActionScript, logged, serialized into the trace, or available through a game callback;
6. any original `ExternalInterface` call, host-to-game callback, bad token, wrong call stack, duplicated sequence, or undeclared hook invalidates the run.

The transformation manifest records original and transformed body hashes, original byte-PC anchor, inserted instructions, stack and scope deltas, local changes, branch rewrites, exception-range rewrites, and hook sequence constraints. An independent transformer/verifier must confirm stack/scope neutrality, valid branches, exception coverage, and reserved-call absence.

Candidate hooks are reviewed method IDs 5527 (AIR frame callback), 5533 (registration), 3273 (gameplay coordinator), 3507 (replay load), 6133 (snapshot insertion), 6135 (timestamp sample), 6125 (input edges), 2887 (fighter movement), 2954 (jump), and 2944 (hit append). KO, scoring, respawn, terminal state, stable entity identity, and complete state fields are unresolved. These IDs identify investigation anchors, not attested trace semantics.

## Optimizer and independent verification

Optimizer-on and optimizer-off coverage is mandatory from the first executable target trace. Ruffle invokes `method.verify` when an activation is created in [`activation.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/activation.rs#L352-L367), but its verifier always calls the optimizer pipeline in [`verify.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/verify.rs#L500-L524). The optimizer itself says it runs regardless of the disable option in [`optimizer.rs`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/optimizer.rs#L16-L27). Therefore, “optimizer off” does not provide an independent unoptimized-bytecode verification path.

Before either mode executes, an independently implemented, hash-pinned ABC verifier must validate every original and transformed body, operand, stack/scope bound, local, branch target, lookup switch, exception range/target, multiname reference, method reference, and hook rewrite. Ruffle verification must also pass in both modes. T2 and later require byte-identical trace bytes between modes. A mode-specific verification failure or trace difference is a blocker, not an approved optimizer exception.

## Candidate driving and trace contract

The harness starts virtual time at zero, injects validated replay state through the proven input chain, and requests checked 16 ms quanta. The 16 ms value, injection order, coordinator method 3273, and post-update emission point are candidates until scheduler evidence closes. Zero, multiple, reentrant, or exceptional coordinator completions fail unless a reviewed synthetic lifecycle fixture and target reachability justify them.

The trace schema is entirely candidate until the state-inventory and hook work closes. It must eventually include:

- a header with schema, both artifact IDs, original/transformed application digests, privacy-safe fixture ID, replay format/scenario, seed contract, virtual quantum, target triple, optimizer mode, verifier result, and capability-profile digest;
- per-update exact IEEE-754 bits and fixed-width integers for every gameplay-relevant field, entities ordered by stable game identity, all PRNG states/draw counts, and ordered input/action/hit/KO/score/respawn/terminal events;
- a domain-separated digest chain;
- a footer with terminal result or stable fault, requested/completed update counts, first capability fault, final digest, and event counts.

The privacy filter rejects player names, account IDs, raw replay records, source filenames, arbitrary target strings, memory addresses, and bulk proprietary data. Safe committed evidence is limited to schemas, hashes, counts, method/config identifiers, formulas, tiny synthetic fixtures, and privacy-filtered digests.

## Layered validation ladder

1. **Identity:** reject any mismatch in application, extension, resource, runtime, patch, toolchain, transformer, verifier, instrumentation, harness, replay manifest, capability profile, or schema.
2. **Structural verification:** independently verify every original and transformed ABC before Ruffle; then require Ruffle verification in both optimizer modes.
3. **Reached VM semantics:** select avmplus tests for every reached opcode and semantic operation. Compare exact values, exceptions, namespaces, closures, prototypes, slots, enumeration, coercion, `NaN`, and negative zero.
4. **Synthetic AIR natives:** run one tiny non-game fixture per reached AIR member in authorized Adobe/HARMAN AIR, patched Ruffle, and Lightspark where supported. Compare exact results, exceptions, events, and side-effect order.
5. **Synthetic lifecycle:** compare tiny non-game DoABC lazy/eager, SymbolClass, root construction, constructor/class/script initialization, frame-event, input, and timer microtests. No target code is used in the authorized runtime.
6. **Static target closure:** prove original-application reachability from descriptor entry through replay initialization and update roots, including dynamic dispatch, reflection, exceptions, extensions, resources, and callbacks.
7. **Independent differential:** run the same synthetic fixtures and instrumented target application in pinned Lightspark where possible. Every difference is explained or blocks the reached scope. Agreement is corroborative only.
8. **Deterministic target execution:** produce interpreted traces only in patched Ruffle. Require optimizer equality, 100 fresh-process repeats, x64/arm64 equality, and equality under perturbed host inputs.
9. **Corpus self-consistency:** all 12 pinned fixtures initialize and finish, agree with replay-observable events and final results, satisfy declared invariants, and perform no undeclared access.
10. **Privacy and review:** automated privacy rejection passes and an independent reviewer approves the exact scope and unexplained-difference ledger.

This ladder contains no official-build game instrumentation or game trace comparison.

## Candidate and tool dispositions

| Candidate | Disposition |
| --- | --- |
| Patched Ruffle `6e69...0943` complete-application `core` embedder | **Primary, gated.** Best available startup and embedder base. Requires complete AIR boundary, deterministic host services, independent verification, and layered T3. |
| Stock Ruffle | **Reject as oracle.** Host-time pacing, clock/RNG/input/text sources, AIR stubs, and unresolved AIR 32 behavior violate the contract. |
| Lightspark `d51ab...ee9` | **Independent differential only.** Its fake-time runner is useful in [`runner.cpp`](https://github.com/lightspark/lightspark/blob/d51ab60193b7baa56b2f6ec55f9a7789f99f6ee9/tests/test-runner/src/framework/runner.cpp#L43-L145), but startup and AIR gaps prevent oracle authority. |
| Adobe avmplus `65a0...d37` | **Reached VM semantics only.** It provides initialization semantics in [`AvmCore.cpp`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/AvmCore.cpp#L821-L889) and [`MethodEnv.cpp`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/MethodEnv.cpp#L551-L595), but not the AIR application or game scheduler. |
| Authorized Adobe/HARMAN AIR | **Tiny synthetic golden producer only.** Never load, instrument, or trace the Brawlhalla application. Record runtime identity and authorization for every synthetic golden. |
| New raw-ABC interpreter | **Reject as minimal architecture.** It omits the application boundary and would duplicate a full VM and native layer. |
| Existing 271-line research evaluator | **Provenance aid only.** It has incorrect pool indexing and branch units, silently skips unsupported operations, and lacks core AVM2 semantics. |

## Non-attested planning ranges

These are non-attested planning ranges, not measurements, commitments, or feasibility evidence:

| Phase | Planning range | Main uncertainty |
| --- | ---: | --- |
| complete AIR inventory and offline boot spike | 4-10 engineer-days | AIR 32 and extension/native reachability |
| deterministic host-services patch and harness | 8-18 engineer-days | complete host-source closure and lifecycle ordering |
| authenticated transformation, verifier, and candidate trace encoder | 8-18 engineer-days | safe rewrites and complete hook discovery |
| application adapters and match initialization | 10-40+ engineer-days | loaders, assets, natives, PRNG, and executable closure |
| layered conformance and reviewed-corpus T3 | 15-35+ engineer-days | independent differentials and cross-platform differences |

A T2 spike is a non-attested planning range of 6-12 engineer-weeks. T3 is a non-attested planning range of 10-20+ engineer-weeks and may expand materially. Neither range claims that the target boots or that the architecture will reach T3.

## Existing Wayfinder ownership

Do not create duplicate oracle tickets for simulator-domain questions. Reuse these linked tickets:

- randomness: [Recover deterministic randomness and draw ordering](https://github.com/NickTacke/brawlhalla-sim/issues/6);
- ticks and timestamp phases: [Recover authoritative tick phases and timestamp semantics](https://github.com/NickTacke/brawlhalla-sim/issues/7);
- state inventory: [Derive the complete gameplay-relevant state inventory](https://github.com/NickTacke/brawlhalla-sim/issues/9);
- conformance and closure gates: [Decide exact conformance and release gates](https://github.com/NickTacke/brawlhalla-sim/issues/14);
- corpus coverage: [Decide the conformance corpus coverage model](https://github.com/NickTacke/brawlhalla-sim/issues/16);
- divergence reporting: [Prototype a canonical per-tick divergence report](https://github.com/NickTacke/brawlhalla-sim/issues/17);
- executable initialization and tick closure: [Prove match initialization and tick executable closure](https://github.com/NickTacke/brawlhalla-sim/issues/32);
- geometry and collision: [Close level resolution and collision geometry](https://github.com/NickTacke/brawlhalla-sim/issues/33);
- offensive hitboxes: [Locate offensive hitbox placement and timing](https://github.com/NickTacke/brawlhalla-sim/issues/34);
- loader normalization/defaults: [Prove patch-data loader normalization and defaults](https://github.com/NickTacke/brawlhalla-sim/issues/35);
- mode dependencies: [Map replay-producing modes to patch closure dependencies](https://github.com/NickTacke/brawlhalla-sim/issues/36);
- VM and AIR semantics: [Specify AVM2 and AIR deterministic native semantics](https://github.com/NickTacke/brawlhalla-sim/issues/37);
- startup and visual assets: [Classify startup and visual asset membership](https://github.com/NickTacke/brawlhalla-sim/issues/38);
- final closure proof: [Prove patch closure minimality and sufficiency](https://github.com/NickTacke/brawlhalla-sim/issues/39).

## Genuinely oracle-specific residual work

### Build the deterministic Ruffle host-services patch

- **Start:** pinned Ruffle host-source inventory and `OracleHostServices` contract above.
- **Evidence:** reviewed patch and binary hashes, forbidden-symbol audit, service-call coverage, synthetic known-answer tests, operation-count timeout tests, and host-perturbation repeats.
- **Acceptance:** no state-influencing direct host source remains; every bypass fails closed; results are identical across 100 fresh processes and x64/arm64.

### Boot the complete AIR application under deny-by-default capabilities

- **Start:** descriptor, AIR 32 target, runtime identity, three extension identities, native dispositions, entry SWF hash, and 538-top-level-SWF count above.
- **Evidence:** privacy-safe application manifest, static extension/native/resource reachability, stable boot log with method/byte-PC call sites, and zero unresolved capability at the match-ready boundary.
- **Acceptance:** two fresh offline boots reach the same boundary with no stub-default return, undeclared resource, native execution, network access, or unresolved disposition.

### Implement authenticated instrumentation and independent transformed-ABC verification

- **Start:** candidate hook IDs, reserved-call proof, capability-token protocol, and transformation-manifest requirements above.
- **Evidence:** independently verified original/transformed ABCs, negative forgery fixtures, call-stack/PC enforcement, optimizer-on/off execution, privacy tests, and stable transformation hashes.
- **Acceptance:** only declared instrumented method/PC boundaries can emit; all original or forged calls fail; both optimizer modes produce identical trace bytes.

### Produce and review the first T3 interpreted target trace

- **Start:** T3 definition, layered ladder, complete capability profile, closed domain tickets above, and the pinned 12-fixture manifest.
- **Evidence:** actual patched-Ruffle target traces, synthetic AIR/lifecycle goldens, avmplus and Lightspark result ledger, static target closure, 100-run and architecture/optimizer matrices, corpus invariants, and privacy report.
- **Acceptance:** every T3 gate passes with zero unexplained difference and reviewer approval. Only then may [Establish a non-live interpreted reference oracle](https://github.com/NickTacke/brawlhalla-sim/issues/5) close.

## Fail-closed summary

No trace is valid after a hash mismatch, incomplete application identity, unresolved descriptor/extension/native/resource member, independent-verifier failure, Ruffle verifier failure, optimizer divergence, unknown opcode, unresolved dispatch, unhandled exception, compatibility-stub default, undeclared host service, host-boundary bypass, prohibited I/O, native payload execution, wall-clock or entropy read, nondeterministic ordering, lifecycle ambiguity, instrumentation mismatch, reserved-call authentication failure, invalid branch/exception range, renderer-dependent state, scheduler anomaly, privacy violation, crash, hang, or sandbox kill.

No open-source candidate proves official Adobe/HARMAN AIR game semantics, and this design deliberately obtains no official game traces. Target feasibility remains unknown until the complete application boots and T2 runs. Trustworthy reviewed-corpus status remains unearned until actual T3 interpreted target traces pass the layered contract.
