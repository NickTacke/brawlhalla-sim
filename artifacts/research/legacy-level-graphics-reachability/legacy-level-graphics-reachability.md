# Dormant legacy level graphics reachability in Brawlhalla 10.09.96325

Issue: [Close dormant legacy level graphics reachability](https://github.com/NickTacke/brawlhalla-sim/issues/63)

## Verdict

**Ticket acceptance is not satisfied.** The reviewed build-10.09 packaged application closes every direct packaged-code and native-extension route found for methods 1400-1402 and legacy Level method 5073, but it does not close the runtime loaded-code universe. Method 5475 can import downloaded SWF code from bytes into the current ApplicationDomain or its child, where package-public target traits remain visible.

The strongest bounded result is:

- The installed AIR package contains 658 CWS SWFs and 663 DoABC payload occurrences totaling 25,439,726 bytes. A conservative scan treats every installed SWF as potentially loaded, rather than depending on a narrower asset-load allowlist.
- Complete packaged ABC 46.16 decoding reaches 441,630 methods, 441,573 bodies, and 6,598,715 instructions. Only `BrawlhallaAir.swf`'s final ABC contains the target owner or trait strings. Across packaged code, the only target-trait instructions are method 1400's call to 1401, method 1400's recursive self-call, and method 1401's two calls to 1402. Method 5073 has no direct packaged caller.
- Methods 1400-1402 are public-package static method traits on class 77 `_-r5Y`, with dispatch IDs 1, 2, and 3. Method 5073 is a public-package instance method trait on class 273 `_-82U`; its encoded dispatch ID is zero. None is a slot trait.
- No target method is referenced by `callstatic` or `newfunction`. The target QNames are never loaded as values through `getproperty` or `getlex`, so no directly named target closure is registered or invoked. `main.abc` contains no `callmethod` instruction at all.
- No other decoded ABC contains any target method name or owner class name in its string or multiname pools. No installed SymbolClass record binds either target owner, and the sole document-class binding is `_-N4u` in `BrawlhallaAir.swf`.
- The three declared native extensions import no `FRECallObjectMethod`. SteamAir alone imports `FREDispatchStatusEventAsync`; it can emit a status event but cannot directly call an arbitrary ActionScript method through the FRE method-call API. None of the native modules, descriptors, catalogs, launcher, AIR framework binary, or package metadata contains a target name or one of the eight legacy SWF basenames.

Two related boundaries prevent closure:

1. Method 5475 `_-N5a._-f3U` constructs a `LoaderContext` and calls `Loader.loadBytes`; it sets `allowCodeImport` when resource type `_-L5H` equals `"SWF"`. It can select the current ApplicationDomain or a child whose parent is the current domain. Resource-manager scheduler method 6559 is its sole caller. Methods 5472 and 6554 prove local `AdditionalContent` and downloaded-versus-base-file states. The reviewed application storage has five ordinary state files and zero `AdditionalContent` entries or SWFs, so there is no hash-pinned build-10.09 download manifest or downloaded-code corpus to enumerate.
2. Within packaged `main.abc`, 13,328 runtime-multiname property/call instructions, one `getDefinitionByName` call in method 2166, five `ApplicationDomain.getDefinition` calls in methods 131, 3533, 3869, 5491, and 13732, and 112 `addEventListener` calls do not directly name a target. A future authorized imported SWF could directly name the package-public target QNames or provide computed names to these surfaces. The 35,132,016-byte AIR framework is hash-pinned, but a static packaged-file scan cannot close unseen imported code.

Therefore the eight absent `Level_*.swf` declarations are **not required by any proven active replay-producing level path**, but they are only bounded-unreachable, not universally unreachable. Likewise, no graphics-derived collision primitive is reached by a proven path, but an empty primitive set cannot be claimed until the authorized downloaded-SWF universe and its invocation graph are hash-pinned and closed. Keep the ticket open and release its claim.

## Evidence grades

- **Proven:** exact typed trait or instruction evidence in the hash-pinned main ABC, exact package descriptor content, or an exact native import table.
- **Bounded closure:** every member of a declared packaged-file, SWF, ABC, symbol, direct-QName, or native-import set was enumerated and hashed, without claiming closure over unavailable downloaded code or computed runtime names.
- **Source-derived:** exact LevelType declarations and Dynamic-root relationships from the related hash-pinned archive evidence.
- **Unknown:** inspected primary evidence cannot prove the universal claim.

Prior issue comments and repository artifacts were locators. New package, ABC, symbol, and native-capability counts and ledgers below were recomputed from ignored, user-owned primary inputs. No cross-build input supports a build-10.09 conclusion.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Bytes or count | Identity | Use |
| --- | ---: | --- | --- |
| `BrawlhallaAir.swf` | 1,730,834 bytes | `40df9af5308b9a17bf015feb38edec6d9bea57d1cd53078d298aa725acceb8b2` | AIR entry SWF and ten embedded ABCs |
| `main.abc` | 3,934,088 bytes | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Target traits, direct references, reflection sites, and event registration |
| AIR application descriptor | package input | `33d64105102fb2999ae0d4d02c9ae75dd174d0f7965ae22f5f03390bdd8c2009` | Names `BrawlhallaAir.swf` as initial content and three extension IDs |
| AIR signatures document | package input | `7af11af4a21a424030831374890e065db2b4d45d9af3499d2d0ec5f53bd721af` | Signed-package metadata boundary |
| macOS application plist | package input | `942fdc54d48c40b71e0f039baf5476942336aebcb9b38d8734b6b65adbfa3ec4` | Names only the AIR launcher executable |
| AIR launcher | 89,904 bytes | `f36d503e2fec65986455911b20291677da8ca40bdf13079408e69ed3307481fb` | Native process entry |
| Adobe AIR framework | 35,132,016 bytes | `171caec02b70544b14d6fd81185d14f97a389d4db13b1fe96ed9a18a74a85980` | AVM2 and AIR host runtime, hash-pinned but not semantically closed here |
| `Init.swz` | 182,708 bytes | `bfb56c12517b7a95927feaca7180d5a85b6952d4d53e76e614ffc06bf4fe067b` | Eight legacy declarations |
| `Game.swz` | 977,263 bytes | `4fc9d70c1c3642b7d3e61c8bb0062bb57c46ea2169276ca1d33616a5843d4aff` | LevelSet context |
| `Dynamic.swz` | 292,091 bytes | `cd54de039bc4e3441a7ae5811ef8748a719f49e0d4917016407d83b201ddf9c4` | 120 active Dynamic roots |
| `Engine.swz` | 7,456 bytes | `aa5b25d0351b7c2c41ccfc588f9bd7ece0c21adb4d4034aa2416d5101684f8dc` | Complete declared SWZ boundary |
| Complete packaged Resources content ledger | 7,516 files, 1,416,814,412 bytes | `8b82fbcbc5f647dee4545892de8d86ef895170142608251e00ce9e969c1f1ff9` | Every packaged relative path, byte length, and file hash |
| Application-storage observation | 5 ordinary state files, 0 `AdditionalContent` entries/SWFs | no downloaded-code corpus available | Proves the local absence that prevents a download-manifest/SWF ledger |
| Installed SWF ledger | 658 SWFs | `c0e4b462f3ddfa650af91dfccad331813b1c1ef87e8158ee567cb083771d86e9` | Every SWF relative path, byte length, and file hash |
| DoABC ledger | 663 occurrences, 25,439,726 bytes, 659 distinct byte hashes | `cbb0b8d40a1eca725d3904fc8e69ef2fc0950dae4fd8e06cdc20f7faa2c54901` | Every SWF relative path, zero-based ABC occurrence, and ABC byte hash |
| SymbolClass ledger | complete installed SWF set | `9527991d2afce6d2f83e976b9980c2c94d7bfd1bf052864ec5b646fdd3899aaf` | Every symbol ID and class name |
| Direct target-reference ledger | 4 instructions | `251bef80bb75209432ba584ee6fd8666aa2460b1c5a619fff7ae096f44107c1b` | Method ID, instruction ordinal, opcode, and exact target trait name |
| Runtime-multiname ledger | 13,328 instructions | `843219975c1bdd76ecee8dedf7a2d8241cb2836b420c3e12f0765d1362f388fa` | Method ID, instruction ordinal, opcode, and multiname kind |
| Native FRE capability ledger | 16 distinct imported APIs across three modules | `712250d06f0ea209a08bd28739d1328bf4c8ab4b9cd8d8f115898b0ed72e30c1` | Module name and imported FRE symbol |

The complete Resources ledger hashes records as:

```text
relativePath NUL decimalByteLength NUL lowercaseFileSha256 LF
```

The SWF ledger uses the same schema over the `.swf` subset. The DoABC ledger hashes:

```text
relativeSwfPath NUL zeroBasedAbcOccurrence NUL lowercaseAbcSha256 LF
```

The direct-reference and runtime-multiname ledgers use decoded instruction ordinals rather than byte PCs; the related method evidence independently validates byte PCs and branches in `main.abc`.

The three native extension identities are:

| Extension | Descriptor | ActionScript library SWF | Native module |
| --- | --- | --- | --- |
| RawData | `f4b7809e97341da31adfc194e2061f16631c774adf6618f4276f45a56d62824d` | `3e5a553a8f0d748e06d4457f9c6fd7374907c95644ca5be851bee2d46d3594df` | `3a0ca18918c246c8f5958532dadd176a6128a9f18fbb3246f2098454e1a8c9ae` |
| SoundEngineExtension | `20957bab181d9b3a3a25cad2c717f68d7114d7692161f46d47d54321f637e302` | `696f34b1f987d903af71e0e1ee0faeba64a2e03a2328498a92ec49d5207ecef8` | `a2ac734c2aee32971008ac2fb7f314c599b9c78784b4dc06f59b40ea51c38bdf` |
| SteamAir | `103b76d4d50d642290dfd36c71612d904e832fc853b1ab02a96f269bf35cbe84` | `fc0a5e4b3310481d9ab34e9dcdc632457042bff5dd7f0cef5413ccad964e7fb3` | `6995632ca3b760a4911270bf0f78b24e4c07a897902bf82c2f598e9bbbd5a810` |

The catalog identities are RawData `86c20dae0d837d46d30ac17130b3292181a0fd34bcdcc7530323268a1909249f`, SoundEngineExtension `ad17e9ca11c4b57f8e0746f7366fd017cea71daa6e910a7d0efaed182db484ed`, and SteamAir `995fbc2eef3745139d7846b51151e9afb47e7d50749001df9fdb8b3b0a154def`.

## Installed and loaded-code closure

### Conservative packaged boundary

The AIR descriptor declares:

```text
initial content: BrawlhallaAir.swf
extensions: RawData, SoundEngineExtension, SteamAir
profile: extendedDesktop
```

The packaged scan does not assume that only statically named package SWFs load. It recursively parses all 658 installed SWFs, including nested DefineSprite tag streams, and inventories every DoABC/DoABCDefine payload. There are 663 payload occurrences and no SWF parse errors. This packaged superset covers UI, bones, effects, fonts, and both packaged and platform-specific ANE library copies regardless of replay-producing match configuration. It is not a runtime loaded-code superset because method 5475 admits downloaded code bytes.

The pinned repository decoder accepts 655 occurrences. An independent ABC 46.16 parser closes the remaining eight occurrences, which represent four unique ANE wrapper ABCs duplicated at two package locations. Complete decoding yields 441,630 method records, 441,573 bodies, and 6,598,715 instructions. The four unique wrapper ABC byte hashes are:

- RawData: `6b42402ad0b19e112ddc3bb10ff17141696e24a813f8fe30a1de96569858340a`
- SoundEngineExtension: `00891427ef3db5d9e7989d0673b97cbf06720e133bf5950ad5ebe15bb20c0977`
- SteamAir main wrapper: `d4e76ec0139f07401c7ea636b32b80b2bd349c5eaef5ea5f92afda105dfe6b93`
- SteamEvent wrapper: `5efe8a9e5dfca8252719fff11834d17a3082367d1caa300e0a0ed5674c0d21d9`

All four start with valid ABC 46.16 version bytes after the DoABC flags/name header. The independent parser decodes RawData as 6 methods, 6 bodies, and 83 instructions; SoundEngineExtension as 19/19/393; SteamAir as 28/28/391; and SteamEvent as 4/4/60. Both packaged copies have identical bytes. All four have zero target strings, exact/display QNames, callmethod dispatch hits, callstatic/newfunction target hits, or function-trait aliases. Their catalogs enumerate only the corresponding wrapper definitions. The repository decoder's overrun is a tooling compatibility issue, not a remaining packaged-code evidence gap.

### Runtime downloaded-code escape

Method 5475 `_-N5a._-f3U` is a real loaded-code escape from the packaged ledger. It constructs `LoaderContext`, selects either the current ApplicationDomain or a child of it, sets `allowCodeImport = (_-L5H == "SWF")`, and passes resource bytes to `Loader.loadBytes`. Package-public traits in the parent domain are visible to code imported into that domain relationship, including all four target methods.

The only direct caller of method 5475 is resource-manager scheduler method 6559. The resource state is not base-package-only:

- method 5472 resolves `File.applicationStorageDirectory/AdditionalContent/<fileName>`;
- method 6554 explicitly logs that a file “loaded from downloads is outdated. resetting to load from base file”;
- updater strings cover manifest, download, apply, save, and failure states; and
- resource loading also includes URLLoader/download and local FileStream states.

The reviewed application-storage boundary contains five ordinary state files and no `AdditionalContent` directory entries or SWFs. That negative observation does not identify the server-authorized build-10.09 download manifest, historical downloaded SWFs, signatures, hashes, or per-match eligibility. An unseen authorized SWF could directly reference `_-r5Y._-mo` or `_-82U._-L5z`, acquire a target closure, use dispatch, or provide a reflective name. Thus the 658 packaged SWFs are a complete base-file set but not a universal runtime loaded-code set.

### Target traits and invocation forms

The exact trait definitions are:

| Method | Owner | Scope | QName namespace | Trait | Encoded dispatch ID |
| ---: | --- | --- | --- | --- | ---: |
| 1400 `_-mo` | class 77 `_-r5Y` | static | public package | final method | 1 |
| 1401 `_-Rl` | class 77 `_-r5Y` | static | public package | final method | 2 |
| 1402 `_-Q1D` | class 77 `_-r5Y` | static | public package | final method | 3 |
| 5073 `_-L5z` | class 273 `_-82U` | instance | public package | method | 0 |

They are not data slots or function-valued slot traits. Therefore `getslot` and `setslot` numeric operands cannot retrieve or overwrite these methods. The only way to obtain one as a closure is a property lookup naming its method trait, or a computed runtime lookup that resolves to the same public name.

The complete direct target-trait instruction set in decoded installed code is:

1. Method 1400 invokes method 1401 once.
2. Method 1400 invokes itself once for Sprite recursion.
3. Method 1401 invokes method 1402 twice for the two path endpoints.
4. No instruction names method 5073.

No target QName appears in `getproperty`, `getlex`, `findproperty`, `findpropstrict`, `constructprop`, `newfunction`, or an event-registration closure expression outside those calls. Across all external ABCs there are zero exact or displayed target QNames, target owner names, target reflective strings, callmethod dispatch hits, callstatic/newfunction target hits, or function-trait aliases. Numeric method IDs are ABC-local, so a `callstatic 1400` in another ABC would name that other ABC's method record; none occurs in the target ABC. `main.abc` also contains no `callmethod`, eliminating dispatch IDs 1-3 as a caller form inside the defining ABC.

### Reflection boundary

The direct string/reflection search is negative:

- zero `pushstring` instructions for any target owner or method name;
- zero target SymbolClass bindings;
- zero `describeType` references in `main.abc`;
- one `getDefinitionByName` call, in method 2166;
- five `ApplicationDomain.getDefinition` calls, in methods 131, 3533, 3869, 5491, and 13732;
- four `hasOwnProperty` calls;
- 13,328 property or call instructions using runtime multiname kinds 17, 18, 27, or 28.

The target owners and methods are public package QNames, so public runtime-name lookup is semantically capable of resolving them if code can supply both the relevant receiver/class and computed target name. A literal absence search cannot rule out concatenation, decoding, replay/patch strings, loaded symbol names, or host-provided strings. No committed analyzer performs the necessary interprocedural receiver-and-string dataflow over all 441,573 packaged bodies, unavailable downloaded ABCs, and AIR event ingress. Universal reflection closure is therefore unavailable.

## AIR and native host closure

The native undefined-symbol tables expose these FRE capability families:

- RawData: ByteArray acquisition/release, uint conversion, and primitive return construction.
- SoundEngineExtension: array reads, numeric/string conversion, and uint return construction.
- SteamAir: primitive conversion/construction, array writes, `FRENewObject`, and `FREDispatchStatusEventAsync`.

None imports `FRECallObjectMethod`, `FREGetObjectProperty`, or `FRESetObjectProperty`. No target string appears in the three native binaries. The reviewed native modules therefore have no direct FRE capability to fetch or call one of the target methods. SteamAir's asynchronous host-to-ActionScript edge is a StatusEvent dispatch. Its wrapper catalog declares `SteamAir`, `SteamEvent`, `EventDispatcher`, `StatusEvent`, and `Function`; its byte strings name `HandleStatusEvent`, not a target.

The native exports are limited to extension initializer, finalizer, context initializer/finalizer, and the registered extension API functions. The direct callback route is also negative because no target trait is ever loaded as a closure in application code. However, the AIR framework owns general event dispatch and AVM2 runtime-name semantics. Hashing the framework and proving that the document class is `_-N4u` do not replace a callback dataflow proof for all 112 main-ABC event registrations and computed lookup sites. Native direct invocation is bounded closed; universal AIR host invocation remains coupled to the unresolved computed-reflection boundary.

## Legacy SWF declarations and replay-producing matches

Related primary evidence establishes:

- The exact Init source has 162 LevelTypes. Runtime publication leaves 120 loadable, exact-name Dynamic-backed levels plus the pre-write `Random` sentinel.
- `Random` resolves to a concrete Dynamic-backed level before every replay-writer call. Replay reading performs no legacy fallback.
- Of the 120 Dynamic-root-backed records, 114 declare both a legacy FileName and AssetName. Their FileNames use exactly eight basenames: `Level_Brawlball.swf`, `Level_Events.swf`, `Level_GameModes.swf`, `Level_OneUp.swf`, `Level_Ruins.swf`, `Level_Scrolling.swf`, `Level_Tutorial.swf`, and `Level_Wacky.swf`.
- None of those basenames exists anywhere in the 7,516-file installed package. The separately searched archive boundary is also empty, but its parent identities (`4a3706...`, `329c82...`, `44de35...`, `c72738...`, and `b5baf9...`) mismatch the exact build and are inadmissible for target-build code closure.
- Active method 5143 selects a Dynamic root by LevelType name and does not read FileName or AssetName. Platform display data reaches method 5139's exact PNG path, not a SWF symbol lookup.
- Method 5073 can read FileName and obtain a loader percentage, but it has no direct caller in any decoded installed ABC.

This proves the eight declarations are not required by the known selection, Dynamic load, Platform raster, or replay-writer/reader paths. It does not prove universal unreachability while method 5073 remains public and computed-name invocation remains open. The absent files must not be synthesized or replaced by similarly named assets.

## Graphics-derived collision disposition

No reached graphics-derived primitive was found.

If method 1400 were reached, the already pinned dormant chain would:

1. recurse through Sprite children;
2. send Shape graphics to method 1401;
3. read graphics paths and solid-stroke colors;
4. apply `localToGlobal` to endpoints and an optional anchor;
5. snap each global endpoint coordinate as `10 * round(value * 0.1)`;
6. parse names beginning `am_`, including collision type, `DynamicCollision`, and `Team` tokens; and
7. emit collision segments through methods 1403-1405.

That is a conditional normalizer, not an active simulator input. Methods 5132, 5133, and 5139 do not call the graphics reader or a collision constructor. Explicit Dynamic XML through method 5137 remains the only statically reached level-collision source. Because computed reflection is unresolved, this investigation cannot prove that the graphics-derived primitive set is universally empty.

## Acceptance matrix

| Issue requirement | Result | Exact boundary |
| --- | --- | --- |
| Enumerate loaded SWF ABC routes | **Partial:** all 658 packaged SWFs and 441,573 bodies close cleanly | Method 5475 imports downloaded SWF bytes; no build-10.09 download manifest or downloaded-SWF corpus is locally available |
| Close exact QName and displayed multiname calls | **Passed for decoded direct references:** four internal calls only | Computed runtime multinames remain separate |
| Close dispatch-ID invocation | **Passed in defining ABC:** target traits classified; `main.abc` has zero `callmethod` | External decoded ABCs contain no target owner/trait names; computed receiver/name flow remains open |
| Close slot-ID invocation | **Passed:** all targets are method traits, not slot traits | Numeric slots cannot retrieve these methods |
| Close closure/newfunction invocation | **Passed for direct closures:** no `newfunction`, `getproperty`, or `getlex` target closure | A computed runtime lookup could still produce a closure |
| Close reflection | **Unmet universally:** packaged code has no target reflective string beyond trait-pool names | Authorized imported SWF bytes are unavailable and may directly or reflectively invoke the public targets |
| Close AIR/native host callbacks | **Partial:** direct native-extension invocation is absent: no native method-call capability, target identifier, or target closure registration | Universal AIR event/callback flow remains coupled to unresolved computed Function provenance and downloaded code |
| Prove eight declarations unreachable or required | **Unmet universally:** absent and unnecessary on every proven active path | Unseen authorized imported code could invoke public method 5073 |
| Normalize every reached graphics primitive or prove path absent | **Unmet universally:** no reached primitive; conditional method-1402 normalization is exact | Unseen authorized imported code could invoke public method 1400 |

The ticket must remain open.

## Reproduction outline and validation

Keep proprietary inputs outside version control. Supply paths explicitly; do not use environment variables.

```bash
shasum -a 256 \
  /path/to/BrawlhallaAir.swf \
  /path/to/main.abc \
  /path/to/Init.swz \
  /path/to/Game.swz \
  /path/to/Dynamic.swz \
  /path/to/Engine.swz \
  /path/to/application.xml \
  /path/to/Adobe-AIR-runtime
```

Recompute the complete package and SWF ledgers in relative-path order using the schemas above. Assert:

```text
Resources files:                    7,516
Resources bytes:            1,416,814,412
installed CWS SWFs:                   658
DoABC occurrences:                    663
DoABC bytes:                   25,439,726
distinct ABC hashes:                  659
decoded occurrences:                  663
decoded methods:                  441,630
decoded bodies:                   441,573
decoded instructions:           6,598,715
unique undecoded ANE ABCs:               0
target SymbolClass bindings:              0
main document class:                    _-N4u
```

Build the pinned decoder, then inspect the target main ABC:

```bash
bun run --cwd tools/avm2-provenance build-dependency
cd tools/avm2-provenance
perl -0777 -pe \
  's/const relevantIds = new Set\(\[.*?\n  \]\)/const relevantIds = new Set([1400, 1401, 1402, 5073])/s' \
  generic_roster_bitset_provenance.ts \
  | bun run - --abc /path/to/main.abc --explore \
  | jq '.methods'
```

The reader must verify ABC `9fe9...ba2d`, build `10.09.96325`, 15,010 bodies, and valid main-ABC branch targets. Independently parse every installed SWF tag stream, extract tag 72 payloads directly and tag 82 payloads after flags/name, and decode all accepted payloads. Search exact string-pool values, multinames, and instructions for:

```text
owners: _-r5Y, _-82U
targets: _-mo, _-Rl, _-Q1D, _-L5z
invocations: callproperty, callpropvoid, getproperty, getlex,
             callmethod, callstatic, newfunction, getslot
reflection: runtime multiname kinds, getDefinitionByName,
            ApplicationDomain.getDefinition, hasOwnProperty
```

Expected packaged direct result: only the four internal target-trait calls listed above, no target pushstring, no target symbol binding, and no external packaged ABC containing a target owner/trait string, exact/display QName, dispatch hit, target method ID use, or function-trait alias. A changed count, identity, QName set, target reference, native import, or legacy basename must fail closed.

Inspect application storage and updater inputs explicitly:

```bash
find /path/to/application-storage -type f -print
if [ -d /path/to/application-storage/AdditionalContent ]; then
  find /path/to/application-storage/AdditionalContent -type f \
    \( -name '*.swf' -o -name '*.manifest' \) -print
fi
```

Expected reviewed local result: five ordinary state files and zero `AdditionalContent` files or SWFs. This is a blocker, not a successful empty-universe proof. A complete rerun requires the hash-pinned build-10.09 download manifest and every SWF it authorized.

For native capability closure:

```bash
nm -u /path/to/RawData-native | grep FRE
nm -u /path/to/SoundEngineExtension-native | grep FRE
nm -u /path/to/SteamAir-native | grep FRE
if strings -a /path/to/native-or-host-binary \
  | grep -E '_-mo|_-Rl|_-Q1D|_-L5z|Level_.*\.swf'; then
  echo 'unexpected target or legacy name' >&2
  exit 1
fi
```

Expected: the 16-symbol capability set summarized above, no `FRECallObjectMethod`, and no target/legacy name.

The one-off full-package and independent ABC 46.16 scanners used for these bounded ledgers are not committed. Reproduction requires implementing the documented tag, ledger, and search schemas or committing a fail-closed analyzer in a later pass. This limitation is itself part of the unresolved acceptance boundary.

Repository validation for this evidence-only change:

```bash
bun run --cwd tools/avm2-provenance build-dependency
bun run check
git diff --cached --check
```

## Confidence and blockers

### High confidence

- The reviewed application entry, package boundary, SWF set, main ABC, descriptors, native modules, and AIR runtime identities are exact.
- Every installed SWF parses structurally, every DoABC payload is hash-pinned, and all 441,573 bodies decode through the independent ABC 46.16 parser.
- No external ABC, package symbol, descriptor, catalog, native binary, launcher, or AIR framework string directly names a target.
- Packaged direct QName closure is four internal calls only; method 5073 has zero direct packaged callers.
- Packaged dispatch-ID, slot-ID, `callstatic`, `newfunction`, and directly named closure routes do not reach a target.
- Method 5475 is the unique proven application code-import sink and method 6559 is its sole direct caller.
- Native extensions cannot directly call an arbitrary ActionScript method through the FRE API.
- The eight legacy files are absent from the exact install and searched archive and unnecessary on every proven Dynamic-backed replay level path.

### Exact blockers

1. Recover and hash-pin the exact build-10.09 download/update manifest and every authorized SWF byte identity that method 6559 can pass to method 5475. The current application storage contains no such corpus.
2. Prove updater eligibility, signature/hash validation, outdated-download fallback, and replay-producing-match reachability across the URLLoader, FileStream, `AdditionalContent`, and base-file states.
3. Decode every authorized imported ABC and rerun exact/display QName, dispatch ID, slot, closure, reflection, event, and host scans against the combined packaged-plus-downloaded universe.
4. Close runtime-multiname receiver/name provenance for the combined universe, including method 2166's `getDefinitionByName`, the five `ApplicationDomain.getDefinition` calls, and every Function-producing path.
5. Commit a fail-closed loaded-code/host analyzer so package, download-manifest, ABC, native capability, target-reference, and reflection closure are reproducible rather than one-off observations.

Until all five pass, methods 1400 and 5073 remain public dormant methods with no direct packaged caller, not universally unreachable methods.

## Surfaced route and fog

No additional ticket was claimed or created.

- **Surfaced route:** start at scheduler method 6559 and code-import sink method 5475, recover the exact authorized download manifest and SWF corpus, then extend the AVM2 provenance reader into a committed packaged-plus-downloaded analyzer with receiver-and-string abstract interpretation.
- **Fog remains:** controlled graphics-derived collision oracle cases are not specifiable until that analysis either finds a reachable method-1400 root or proves none. If it finds a root, the source SWF and symbol must be hash-pinned and every method-1402 primitive normalized. If it proves absence, remove the graphics-derived oracle fog.
- **Separate existing work:** terminal `LevelArt` failure propagation remains outside this ticket and still blocks the broader Platform asset investigation.

**Map gist:** Build 10.09's packaged code has no direct dormant legacy-graphics caller, native extensions lack direct FRE method-call capability, and all eight declared level SWFs are absent and unnecessary on proven Dynamic paths; the AdditionalContent `Loader.loadBytes` code-import capability lacks a hash-pinned download universe, so universal unreachability remains open.

## Related reviewed evidence

- [Level asset and Platform InstanceName geometry](https://github.com/NickTacke/brawlhalla-sim/blob/89dd2e64f10698e24e1078625e5f8c74a5ac1fae/artifacts/research/level-instance-geometry/level-instance-geometry.md)
- [Legacy and fallback level selection](https://github.com/NickTacke/brawlhalla-sim/blob/25e6d08f0018e26f8e41613dd994c99889c67d9b/artifacts/research/legacy-level-selection/legacy-level-selection.md)
- [Dynamic `LevelDesc` loader](https://github.com/NickTacke/brawlhalla-sim/blob/1cb9847a112a165b63634e607f3fb61d997c1404/artifacts/research/dynamic-leveldesc-loader/dynamic-leveldesc-loader.md) proves methods 6561 -> 6554 -> 6555 -> 5153 and the selected-root path through methods 5143 and 5135. Its exhaustive parser and nested-output acceptance remains open; it does not close the downloaded-SWF universe.
