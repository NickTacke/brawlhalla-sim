# Level asset and Platform InstanceName geometry in Brawlhalla 10.09.96325

Issue: [Close level asset and Platform InstanceName geometry](https://github.com/NickTacke/brawlhalla-sim/issues/45)

## Verdict

**Ticket acceptance is not satisfied.** The reviewed build-10.09 inputs close the active Dynamic platform raster path much further than prior evidence, but they do not prove the final negative reachability and terminal failure claims required to close every possible graphics-derived collision path.

The active path does **not** bind a `Platform.InstanceName` to a symbol in one of the eight legacy `Level_*.swf` files:

- All 120 Dynamic `LevelDesc` roots contain 1,394 ordered `Platform` occurrences with 189 distinct `InstanceName` strings.
- Method 5133 creates XML-described `Sprite3D` groups. Its callback is a scoring-rule hook, not a general asset binder. The base implementation is a no-op; the only override registers `am_BlueN` and `am_RedN` sprites for `COLORPLATFORMS`.
- Platform art is loaded by method 5139 from PNG paths under `mapArt/`, using the Dynamic root's `AssetDir`. The Platform trees contain 1,416 raster references to 637 distinct PNGs. Every path exists in the reviewed installed boundary and every byte identity is pinned by a derived ledger.
- All 1,416 references declare `W` and `H`; all 637 PNGs have valid, nonzero intrinsic dimensions. Method 5132's W/H scaling inputs are therefore available for this path.
- Methods 1400 -> 1401 -> 1402 form a dormant display-tree graphics reader in the pinned ABC. The performed exact-QName, displayed-multiname, method-ID, and reflective-string searches find no external root for method 1400. Dispatch-ID, slot-ID, loaded-code, closure, and host forms remain unresolved.
- The eight `Level_*.swf` basenames declared by 114 root-backed LevelTypes are absent from both reviewed file boundaries. Level object method 5073 can look up `LevelType.FileName`, but the same bounded searches find no caller. The `LevelType.AssetName` QName has no exact-QName read after parser assignment.

This disproves the earlier working assumption that method 5133 itself performs a Platform InstanceName-to-SWF binding. It also means the PNG dimensions and method 5132 display transforms do not add collision primitives. The only statically reached level-collision source remains explicit Dynamic XML parsed by method 5137.

Two obligations remain before universal acceptance can be claimed:

1. A closed dynamic-dispatch, reflection, loaded-code, and host-callback graph must prove that dormant method 1400 and legacy method 5073 cannot become reachable for any replay-producing match. Static absence inside `main.abc` is strong bounded evidence, not whole-runtime unreachability.
2. Method 5139's immediate no-substitution and retry behavior is proven, but terminal asset-manager failure propagation to match initialization is not. All reviewed Platform PNGs exist, so that terminal branch cannot be observed from the declared snapshot.

Until those obligations close, explicit Dynamic XML collision is suitable only for bounded analysis. A simulator must fail conformance when unresolved loaded-code, host-callback, or terminal asset-failure behavior is reachable. It must not substitute a missing asset.

## Evidence grades

- **Proven:** exact typed control/dataflow, a declared bounded static reference search, or exact branch behavior in the hash-pinned ABC.
- **Source-derived:** exact ordered value, count, or relationship read from a hash-pinned shipped archive section.
- **Bounded closure:** every member of a declared local set was enumerated and hashed, without claiming that the set closes external code, host callbacks, or unobserved runtime dispatch.
- **Unknown:** the inspected primary evidence does not settle the claim.

Prior research was a locator. All new counts, call dispositions, asset resolutions, and ledgers below were recomputed from ignored user-owned primary inputs. No cross-build source was used for a build-10.09 conclusion.

## Hash-pinned evidence identity

All complete digests are SHA-256.

| Evidence | Bytes or count | Identity | Use |
| --- | ---: | --- | --- |
| `BrawlhallaAir.swf` | 1,730,834 bytes | `40df9af5308b9a17bf015feb38edec6d9bea57d1cd53078d298aa725acceb8b2` | AIR parent and SWZ key source |
| `main.abc` | 3,934,088 bytes | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Platform reader, rule callback, raster loader, dormant graphics reader |
| `Init.swz` | 182,708 bytes | `bfb56c12517b7a95927feaca7180d5a85b6952d4d53e76e614ffc06bf4fe067b` | 162 LevelTypes and their legacy file/symbol declarations |
| `Game.swz` | 977,263 bytes | `4fc9d70c1c3642b7d3e61c8bb0062bb57c46ea2169276ca1d33616a5843d4aff` | LevelSet context |
| `Dynamic.swz` | 292,091 bytes | `cd54de039bc4e3441a7ae5811ef8748a719f49e0d4917016407d83b201ddf9c4` | 120 LevelDesc roots, Platform trees, explicit geometry |
| `Engine.swz` | 7,456 bytes | `aa5b25d0351b7c2c41ccfc588f9bd7ece0c21adb4d4034aa2416d5101684f8dc` | Declared installed archive boundary; no Platform claim derives from it |
| Dynamic section ledger | 186 entries | `263810dd34872df587c8139ac5a3f83faaff429fee18f072e142a7051efa1e24` | Ordered Dynamic archive closure |
| Dynamic LevelDesc root ledger | 120 roots | `60630e3860e64d2d04deda1075d6cdb0f89e37cfaffd2ed8134f3dde95bbad99` | Ordered LevelDesc subset closure |
| Ordered Platform-source ledger | 1,394 occurrences | `a37b1391de9f8c563bf9d66abb02b9d6ce8a35a5c98fb024a1cda3033a140429` | Bounded source inventory: level name, occurrence order, InstanceName, and source attributes |
| Ordered Platform-asset ledger | 637 PNGs, 193,308,014 bytes | `c0c238c5c0e05df9dedf031d04f780d5a231ac5197c184cff6ddaf5b3965691e` | Bounded installed inventory: every distinct resolved Platform raster path and byte identity |
| Ordered PNG-dimension ledger | 637 PNGs | `4bd32848f07c7fdbd8c2051aa7479b0f85b28a098459b616c36798ff9c4d3d14` | Bounded intrinsic width and height inventory |
| ABC decoder | pinned dependency | `abc-disassembler` commit `ad9714d` | Instruction and byte-PC decoding |

The ABC contains exactly one semantic build string, `10.09.96325`. The installed boundary contains 7,516 files, including 658 SWFs and four SWZs, but no basename beginning `Level_`. Its ordered relative-filename-plus-byte-length ledger is `76b39a6dcd55effc4e5c767d76f3678df71a1d6cb28a14ea0e28273eb7ace975`.

A separate old extraction boundary was inspected only as a locator. Its parent identities begin `4a3706`, `329c82`, `44de35`, and `c72738`, which do not match the reviewed build. Its generated manifests and extracted payloads are inadmissible for 10.09 claims.

## Exact LevelType declaration inventory

In-memory extraction of the exact `Init.swz` found 10 entries and one `LevelTypes` entry containing 162 LevelTypes. Exactly 120 names join the 120 Dynamic roots.

Of those 120 root-backed records, 114 declare both a legacy `FileName` and an `AssetName`. Their eight filenames are:

| Declared filename | Root-backed LevelTypes |
| --- | ---: |
| `Level_Brawlball.swf` | 8 |
| `Level_Events.swf` | 7 |
| `Level_GameModes.swf` | 15 |
| `Level_OneUp.swf` | 2 |
| `Level_Ruins.swf` | 49 |
| `Level_Scrolling.swf` | 6 |
| `Level_Tutorial.swf` | 3 |
| `Level_Wacky.swf` | 24 |

Six root-backed records declare neither field: `StreetBrawl3`, `BP6GiantSword`, `BP6GiantSword1v1`, `Rooftop`, `RooftopFFA`, and `BP7TableTop`.

Three of those six appear in the 11-level reviewed replay cohort: `BP6GiantSword`, `BP6GiantSword1v1`, and `RooftopFFA`. Their successful Dynamic raster closure demonstrates that `LevelType.FileName` and `LevelType.AssetName` are not prerequisites for method 5143's active XML/PNG load path.

Exact-basename searches over both declared file boundaries found none of the eight SWFs. The installed boundary does contain similarly named map-art, sound, animation, and other SWFs, but no bytecode edge identifies any of them as a replacement. Filename similarity is not provenance.

## Active Dynamic load path

### Replay selection to root

Method 5143 obtains the selected typed `LevelType`, rejects null or a missing exact-name Dynamic root, and resolves the root by `LevelType.LevelName`. It does not read `LevelType.FileName` or `LevelType.AssetName`.

When the root has `AssetDir`, method 5143 stores `AssetDir + "/"` as the current raster prefix before calling method 5135 on the root. An absent `AssetDir` produces the empty prefix.

Method 5135 walks the Dynamic tree. Explicit collision elements reach method 5137. Platform elements reach method 5133. Asset leaves reach method 5139. This separates collision data from raster display data before any Platform callback is considered.

### Method 5133 is a group builder, not a symbol binder

Method 5133 `_-h5c._-72e` performs this exact sequence:

1. PCs 29-46 read `InstanceName`.
2. PCs 47-61 call the special-name/theme/scoring suppressor and return when it suppresses the node.
3. PCs 62-99 send a Platform carrying `AssetName` directly to method 5139 and return.
4. PCs 100-167 create a `Sprite3D`, attach it to its parent, classify `MovingPlatform`, and apply method 5132's XML transform.
5. PCs 172-210 call the current scoring-rule object's `_-j5B(xml, parent, instanceName, sprite)` hook when a rule object exists.
6. PCs 214-383 recursively process child `Asset` and `Platform` nodes and capture child `Animation`.
7. PCs 387-481 construct moving-platform state when the XML supplies animation and `PlatID`.

No instruction in method 5133 looks up `InstanceName` in a SWF symbol table, display list, or asset registry.

### Callback target closure

The virtual hook has exactly two method bodies by trait name in the pinned ABC:

- Class 371 `_‑N2y`, method 6745 `_-j5B`: one instruction, `returnvoid`.
- Class 378 `_‑H4f`, method 6866 `_-j5B`: the only override.

Method 6937 selects one of 21 `_‑N2y` rule subclasses by exact readable `ScoringType`. The `COLORPLATFORMS` branch at PCs 204-232 constructs `_‑H4f`; all other listed subclasses inherit the base no-op hook.

Method 6866 recognizes only names beginning `am_Blue` or `am_Red`. It parses the numeric suffix as `uint` and stores the supplied Sprite3D in the corresponding blue or red rule array at that index. It reads no asset, graphics, collision, transform, or line data and creates no collision segment.

The accurate callback name is therefore **color-platform sprite registration hook**, not general Platform instance binding callback.

### Method 5139 raster resolution

Method 5139 `_-h5c._-P1G` reads `AssetName` and constructs the active path:

```text
ordinary AssetName: mapArt/<current AssetDir>/<AssetName>
../AssetName:        mapArt/<AssetName after the leading ../>
```

It resolves that path through the installed asset registry. On success it obtains `BitmapData`, constructs the render texture/mesh, attaches the resulting display object, and calls method 5132 for the XML transform. It never calls methods 1400, 1401, 1402, 1403, 1404, 1405, or another collision constructor.

The 120 Platform trees contain:

| Platform-tree member | Count |
| --- | ---: |
| Platform occurrences | 1,394 |
| Distinct InstanceName strings | 189 |
| Platform leaves carrying `AssetName` | 216 |
| Group Platforms without direct `AssetName` | 1,178 |
| Groups with direct child Asset nodes | 977 |
| Groups with child Platform nodes | 234 |
| Empty groups | 0 |
| Total direct raster references | 1,416 |
| Distinct resolved PNG paths | 637 |
| Missing resolved paths | 0 |

Every raster reference has both source `W` and `H`. Every distinct file has a valid PNG header and nonzero intrinsic dimensions; reviewed minima are 37 by 22. Thus method 5132's `W / intrinsicWidth` and `H / intrinsicHeight` inputs are closed for the installed raster set.

The Platform-source ledger preserves Dynamic LevelDesc-root order and Platform order within each root. It hashes:

```text
levelName NUL oneBasedPlatformOccurrence NUL instanceName NUL
whitespaceCollapsedRawAttributeText LF
```

The Platform-asset ledger is generated by sorting distinct resolved relative paths and hashing:

```text
relativePath NUL decimalByteLength NUL lowercaseFileSha256 LF
```

The PNG-dimension ledger sorts the same paths and hashes:

```text
relativePath NUL decimalIntrinsicWidth NUL decimalIntrinsicHeight LF
```

## Transform and collision disposition

### Raster transform

Method 5132 applies the XML display transform:

- `X` and `Y` default to zero.
- `Scale` sets both axes; otherwise `ScaleX` and `ScaleY` independently default to one.
- `Rotation` is converted from degrees with `Math.PI / 180`.
- For a sized display object, `W` sets `scaleX = W / intrinsicWidth` when intrinsic width is nonzero; `H` analogously sets `scaleY = H / intrinsicHeight`.

Those values affect raster presentation and moving-platform Sprite3D placement. Method 5133 and method 5139 do not convert them into collision lines.

### Dormant transformed-graphics reader

Method 1400 recursively walks a `Sprite` display tree. It rejects unexpected graphics on the root, sends child `Shape` objects to method 1401, and recurses into child `Sprite` objects.

Method 1401 reads `Shape.graphics.readGraphicsData(false)`, interprets path commands and solid-stroke colors, and calls method 1402 for line endpoints.

Method 1402:

- applies `localToGlobal` to local endpoints and an optional anchor;
- snaps every resulting endpoint coordinate to `10 * round(value * 0.1)` at PCs 203-321;
- parses names beginning with `am_`, including collision type, `DynamicCollision`, and `Team` tokens;
- rejects unrecognized line names; and
- calls methods 1403-1405 to construct collision segments and optional dynamic associations.

This proves the exact behavior **if the dormant reader is invoked**. It does not prove invocation.

The performed pinned-ABC searches show:

- method 1400 references itself once for recursion and has no external exact-QName or displayed-multiname reference;
- no inspected `callstatic` or `newfunction` instruction names method ID 1400;
- no `pushstring "_-mo"` reflective lookup exists;
- method 1401 has exactly one inspected named caller, method 1400;
- method 1402 has exactly two inspected named calls, both inside method 1401;
- method 5073, the legacy LevelType FileName registry getter, has no exact-QName or displayed-multiname reference and no reflective string reference; and
- the LevelType AssetName QName is written only by parser method 5117 and has no exact-QName read.

This search does not certify dispatch-ID, slot-ID, closure invocation, loaded-code, or host invocation forms. Those forms remain part of the universal reachability blocker.

The installed 10.09 application contains other SWFs, so static whole-ABC absence is not by itself a proof against every loaded-code or host invocation. No reviewed level-load edge supports using one of those SWFs as a replacement, but complete loaded-code and native callback closure is still required for a universal negative.

## Reviewed replay cohort

The 11 distinct Dynamic roots selected by the 12 authenticated replays contain:

- 91 Platform occurrences;
- 52 distinct InstanceName strings;
- 85 Platforms without source W/H on the group node; and
- six direct raster Platform leaves.

All group-node descendants resolve through the same complete raster ledger. Three cohort roots have no legacy LevelType file/symbol declaration, yet their Dynamic `AssetDir` and Platform raster paths resolve completely. This is direct evidence against treating a missing `LevelType.FileName` as a missing active raster dependency.

The corpus remains an observation, not the replay-producing universe. Enumerating all 120 roots above provides a conservative source superset for every currently root-backed LevelType, including all reviewed replay levels.

## Missing-asset behavior

Method 5139 has no silent substitute path.

1. It looks up the exact normalized raster path in the asset registry.
2. If the registry entry or its Loader is absent and loading is allowed, it requests the exact path in load group `LevelArt`, queues the XML node, creates and attaches an empty Sprite3D placeholder, records the node-to-placeholder mapping, and returns `false`.
3. If loading is not allowed, an absent entry returns `false` without creating a substitute.
4. A Loader whose state is not `5` returns `false`.
5. A loaded entry whose `BitmapData` is null returns `false`.
6. Only a non-null bitmap reaches texture creation, attachment, method 5132, and `true`.

Method 5143 retries queued nodes and removes a node only after method 5139 returns `true`. The inspected path proves exact-name retry and non-substitution. It does not close the asset manager's terminal error state, timeout policy, or the caller's final match-abort behavior after an unrecoverable `LevelArt` load failure.

For a simulator snapshot installer, the safe contract is stronger and simpler: recompute the Platform-asset ledger before accepting a patch snapshot and reject any absent or mismatched member before simulation. Do not reproduce an asynchronous presentation-loader stall in a headless simulator.

## Acceptance matrix

| Issue 45 acceptance | Result | Evidence boundary |
| --- | --- | --- |
| Enumerate every reachable Platform InstanceName for replay-producing levels | **Partial source inventory:** all 1,394 occurrences across the 120 root-backed LevelDescs are ledgered | Replay-producing LevelTypes outside the 120 roots remain a separate level-selection problem |
| Resolve every active Platform asset to a provenance-pinned input | **Pass for the Dynamic raster path:** 1,416 references resolve to 637 hash-pinned PNGs, zero missing | Does not authorize legacy SWF substitution |
| Prove method 5133 callback binding | **Pass, corrected:** base no-op plus one `COLORPLATFORMS` blue/red registration override | The callback is not an asset binder and emits no collision |
| Normalize every Platform-derived collision primitive | **Partial:** methods 5132, 5133, and 5139 emit no collision; explicit XML collision is separate | No empty primitive set is claimed until loaded-code/native reachability to dormant method 1400 closes |
| Prove transforms and snapping | **Partial:** raster transforms and dormant graphics snapping are exact | No reachable call connects the two paths; complete runtime unreachability remains open |
| Prove missing-asset failure behavior | **Partial:** exact request/retry/no-substitution behavior is proven | Terminal asset-manager failure and match-abort propagation remain unknown |
| Resolve the eight directly declared level SWFs | **Failed as an asset-acquisition claim, but narrowed:** all are absent and the only legacy getter is statically uncalled | Loaded-code/host reachability must prove the declarations are dormant universally |
| Prevent undeclared or cross-build asset reads | **Pass for the active raster ledger:** exact normalized paths and hashes only; mismatched old manifests excluded | Future dynamic or host edges must fail closure rather than expand implicitly |

Because the universal dormant-path and terminal-failure obligations remain open, the issue must remain open.

## Bounded interim disposition

An analysis tool may adopt the rules below. A simulator must not claim conformance from them while the blocking reachability and terminal-failure obligations remain open.

1. Resolve replay level ID to exact LevelType name and exact Dynamic root as specified by the related level-resolution evidence.
2. Parse explicit Dynamic XML through method 5137's proven Number, offset, endpoint, anchor, normal, flag, and team rules only for bounded analysis. Fail conformance when unresolved collision sources may be reachable.
3. Do not interpret `Platform.InstanceName` as a SWF symbol, collision name, or asset path.
4. Treat the method 5133 callback as a scoring-rule registration hook. Only the `COLORPLATFORMS` `am_BlueN`/`am_RedN` side effect is proven.
5. Keep Platform PNGs outside behavior closure unless another proven gameplay read reaches their dimensions or pixels. Their current use is raster presentation.
6. Do not implement dormant method 1400/1401/1402 graphics collision without a newly proven reachable call root and hash-pinned caller asset.
7. Reject a future patch if the complete reference ledger adds a caller of methods 1400 or 5073, reads `LevelType.AssetName`, or changes method 5133/5139 behavior.
8. If presentation assets are installed, require the exact Platform-asset ledger and fail installation on any missing or mismatched path. Never substitute a similarly named SWF or current-patch image.

## Reproducible validation

Keep proprietary inputs outside version control. Pass every path explicitly; do not use environment variables.

```bash
shasum -a 256 \
  /path/to/BrawlhallaAir.swf \
  /path/to/main.abc \
  /path/to/Init.swz \
  /path/to/Game.swz \
  /path/to/Dynamic.swz \
  /path/to/Engine.swz
```

Build the pinned decoder, then use the existing provenance reader without creating a modified source file:

```bash
bun run --cwd tools/avm2-provenance build-dependency
cd tools/avm2-provenance
perl -0777 -pe \
  's/const relevantIds = new Set\(\[.*?\n  \]\)/const relevantIds = new Set([1400, 1401, 1402, 5073, 5133, 6745, 6866, 6937])/s' \
  generic_roster_bitset_provenance.ts \
  | bun run - --abc /path/to/main.abc --explore \
  | jq '.methods'
```

The underlying reader verifies the exact ABC digest and build string, decodes all 15,010 method bodies, and rejects invalid branch targets. Inspect complete exact-QName, multiname, method-ID, and reflective-string references for:

```text
method 5133 callback trait _-j5B and all implementations
method 1400 trait _-mo, method ID, and reflective string
method 1401 trait _-Rl
method 1402 trait _-Q1D
method 5073 trait _-L5z and reflective string
LevelType AssetName field _-L6h
```

Expected static results are the dispositions above. The command prints method bodies but does not itself certify the complete negative reachability claim, which remains a blocker.

Decode `Init.swz` and `Dynamic.swz` only in ignored storage or memory. Assert:

```text
Init entries:                         10
LevelTypes:                          162
Dynamic entries:                    186
Dynamic LevelDesc roots:            120
root-backed LevelTypes:             120
root-backed records with FileName:  114
root-backed records without either:   6
Platform occurrences:             1,394
unique InstanceNames:               189
Platform raster references:       1,416
distinct resolved Platform PNGs:    637
missing Platform PNGs:                0
```

Resolve each Platform raster exactly as method 5139 does, validate PNG signatures and nonzero intrinsic dimensions, and recompute the three Platform ledgers using the byte formats defined above.

Search both declared boundaries for the legacy names:

```bash
find /path/to/installed-resources /path/to/source-archive -type f \
  \( -name 'Level_Brawlball.swf' -o -name 'Level_Events.swf' \
     -o -name 'Level_GameModes.swf' -o -name 'Level_OneUp.swf' \
     -o -name 'Level_Ruins.swf' -o -name 'Level_Scrolling.swf' \
     -o -name 'Level_Tutorial.swf' -o -name 'Level_Wacky.swf' \) -print
```

Expected reviewed result: no paths.

The current branch does not commit a one-command archive/asset-ledger analyzer. Those ledger values are bounded observations independently recomputed during this investigation, not Proven-grade universal claims. A public fail-closed reproducer is surfaced below.

These analyses emit hashes, counts, method identifiers, and bounded derived ledgers only. Do not commit SWF/SWZ/ABC bytes, extracted XML, PNGs, bulk Platform records, local paths, or private replay data.

## Confidence and blockers

### High confidence

- The active build-10.09 level display path uses Dynamic XML and `mapArt` PNGs.
- Method 5133 does not perform general InstanceName asset binding.
- The callback is closed to a base no-op and one `COLORPLATFORMS` registration override.
- Every Platform tree in all 120 Dynamic roots is nonempty and all 637 distinct PNG dependencies are present and hash-pinned.
- Raster transforms do not produce collision in methods 5132, 5133, or 5139.
- Method 1402's graphics parsing and 10-unit snapping are exact but have no statically visible external call root in `main.abc`.
- The eight legacy SWFs are absent, and no reviewed edge supports substituting a nearby installed file.
- Cross-build extraction manifests are inadmissible.

### Blocking unknowns

1. Complete loaded-SWF, dispatch-ID, slot-ID, closure-invocation, reflection, and AIR host-callback closure proving that methods 1400 and 5073 are unreachable for every replay-producing match.
2. Terminal `LevelArt` load failure, timeout, and match-initialization propagation beyond method 5139's exact `false`/retry contract.
3. Whether a future lawful copy of one of the eight legacy SWFs contains code capable of invoking the dormant graphics reader. Such a copy would require its own hash and loaded-code graph; it must not be assumed equivalent to this build.
4. Replay-producing level families without a Dynamic root remain outside this ticket's 120-root conservative closure and belong to legacy/fallback level selection.

## Surfaced ticket and fog suggestions

Suggestions only. No ticket was claimed or created.

- **Ticket:** Close dormant legacy graphics reachability by enumerating every loaded SWF ABC, dispatch-ID, slot-ID, closure, reflection, and AIR host target that can reach methods 1400 or 5073.
- **Ticket:** Prove terminal `LevelArt` loader failure propagation from asset-registry state through match initialization.
- **Fog:** Controlled graphics-derived collision cases should be specified only if a reachable caller asset is found. If full loaded-code closure proves no caller, remove this fog rather than inventing a test path.
- **Related existing work:** legacy/fallback LevelTypes, moving-platform runtime behavior, collision query options, and trusted collision oracle traces remain separate obligations from Platform raster closure.

## Related reviewed evidence

- [Level resolution and collision geometry](https://github.com/NickTacke/brawlhalla-sim/blob/e308fc680be98bf55d28ab3ce3f34750c41e5b28/artifacts/research/level-collision-geometry/level-collision-geometry.md)
- [Patch-snapshot closure](https://github.com/NickTacke/brawlhalla-sim/blob/629a95c26a3d2a7b1fd51d43a16d0f7cbe02e996/artifacts/research/patch-snapshot-closure/patch-snapshot-closure.md)
