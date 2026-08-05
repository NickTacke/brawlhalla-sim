# Level resolution and collision geometry in Brawlhalla 10.09.96325

Issue: [Close level resolution and collision geometry](https://github.com/NickTacke/brawlhalla-sim/issues/33)

## Verdict

The replay-to-level join is closed for the reviewed replay corpus, but the ticket's universal geometry acceptance is **not satisfied**.

A format-268 replay level ID indexes `LevelType._-k56`. The selected `LevelType` supplies a `LevelName`, and the level loader resolves that name through `_-h5c._-XY` to one `Dynamic.swz` `LevelDesc`. All 11 distinct level IDs in the 12-replay corpus resolve uniquely to one of the 120 Dynamic roots.

The universal claim fails for three independently proven reasons:

1. `Init.swz` contains 162 unique `LevelType` records, while `Dynamic.swz` contains only 120 unique `LevelDesc` roots. Forty-two declared LevelTypes have no Dynamic root. Seven names used by shipped LevelSets have no Dynamic root, and two of those names have no LevelType record.
2. Dynamic XML does not close platform-instance geometry. The 120 roots contain 1,394 `Platform` elements with `InstanceName`; 1,178 have neither `W` nor `H`. Pinned method 5133 invokes an external instance-binding callback, and pinned method 1402 derives additional collision lines from transformed display-object graphics. The eight root-backed `LevelType.FileName` SWFs are absent from the reviewed local snapshot, so those lines cannot be enumerated or tested.
3. No trusted reference collision trace exists yet. Static bytecode proves tag bits and the soft-collision side gate, but controlled differential collision tests, moving-platform tick behavior, and the behavior of every composite collision flag remain unobserved.

The implementation-safe conclusion is narrower: use the chain and normalization rules below for explicit Dynamic XML geometry, require `Init.swz` in the declared patch snapshot, and keep graphical platform collision, legacy/fallback levels, moving runtime behavior, and differential conformance as explicit blockers. Do not present the current snapshot as complete level-collision closure.

## Evidence grades

- **Proven:** unique control/dataflow or exact branch behavior in the hash-pinned ABC, exact byte identity, or exact corpus observation.
- **Source-derived:** exact value or inventory read from a hash-pinned shipped archive section.
- **Bounded closure:** every member of a named reviewed set was enumerated, but the set is not claimed to cover unobserved external assets or runtime branches.
- **Unknown:** the inspected primary evidence does not settle the claim.

Prior reports and 10.05 decompiler output were locators only. Claims below were checked against the pinned 10.09 ABC, archives, archive sections, and authentic replay manifest.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Bytes or count | Identity | Use |
| --- | ---: | --- | --- |
| `BrawlhallaAir.swf` | 1,730,834 bytes | `40df9af5308b9a17bf015feb38edec6d9bea57d1cd53078d298aa725acceb8b2` | AIR application parent |
| `main.abc` | 3,934,088 bytes | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Level registries, readers, geometry parsing, collision query behavior |
| `Init.swz` | 182,708 bytes | `bfb56c12517b7a95927feaca7180d5a85b6952d4d53e76e614ffc06bf4fe067b` | Parent of `LevelTypes` |
| `Init.swz` `LevelTypes` section | entry 8, 111,030 bytes | `05255d10597aa4bdafcaefa115ab4a4d6789d860acdb5cd77711d9b3a024a2f7` | 162 LevelType records |
| `Game.swz` | 977,263 bytes | `4fc9d70c1c3642b7d3e61c8bb0062bb57c46ea2169276ca1d33616a5843d4aff` | Parent of LevelSets |
| `Game.swz.30.xml` | 26,299 bytes | `e6870349d9104bc91fddcfa329f2cf4b5a4b96e466cfed47cb92834316b54dff` | 127 referenced LevelSet names |
| `Dynamic.swz` | 292,091 bytes | `cd54de039bc4e3441a7ae5811ef8748a719f49e0d4917016407d83b201ddf9c4` | Parent of level descriptions |
| Dynamic section ledger | 186 entries | `263810dd34872df587c8139ac5a3f83faaff429fee18f072e142a7051efa1e24` | Ordered `ordinal\0byteLength\0leafSha256\n` ledger |
| LevelDesc root ledger | 120 roots | `60630e3860e64d2d04deda1075d6cdb0f89e37cfaffd2ed8134f3dde95bbad99` | Ordered Dynamic LevelDesc subset ledger |
| Replay manifest | 12 fixtures | `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac` | Authentic format-268 level-ID cohort |
| ABC decoder | pinned dependency | `abc-disassembler` commit `ad9714d` | Instruction and byte-PC decoding |
| Read-only SWZ driver | local tool | `extract.ts` `7c8b3c156fcb3f447d5415a82c1dc19c87486a45ed9dd94dd14fe9208fd20f55` | Archive-section extraction |
| Read-only SWZ reader components | three local files | `index.js` `fe28db7c928a652bf5f77aa6880e30bed336fe39301e3981b39fed492b4cf6c9`; `prng.js` `9cb8234d3208174fe0918b36bdf6b24664538bb910be75cd5309b5e73c2d76be`; `swz-reader.js` `63a94f60de675cf5c5c5864a42a2c394bafce6e1dc2441ae3e3a814e6936f856` | Header validation and in-memory section reads |

The ABC contains exactly one semantic build string, `10.09.96325`. The archive identities match the repository's reviewed 10.09 patch snapshot. `Init.swz` was previously treated as a residual source candidate; this investigation proves that its `LevelTypes` section is required for level-ID resolution and must move into initialization closure.

## Replay level ID to LevelType

### Reader

Replay reader method 6510 `_-E4h._-N4v` resolves the stored state-4 level word directly:

1. PCs 766-793 read the level word into local 10.
2. PC 799 gets `LevelType`.
3. PC 802 reads static table `LevelType._-k56`.
4. PC 805 performs the runtime-keyed lookup with local 10.
5. PC 811 coerces the result to `LevelType`.
6. PC 814 stores it in restored replay field `_-fq`.

This is an ID lookup, not a LevelSet selection. LevelSet membership is irrelevant after a supported replay has supplied a valid level ID unless a later mode branch independently consults the set.

### LevelType source and registry

The hash-pinned `Init.swz` LevelTypes section contains 162 `<LevelType>` records. Their 162 `LevelID` values and 162 `LevelName` values are each unique.

Static parser method 5117 `LevelType._-d3p` establishes the registry fields:

- PCs 54-68 parse `LevelName` into `_-554`.
- PCs 368-398 parse optional `FileName` into `_-ZO`.
- PCs 402-432 parse optional `AssetName` into `_-L6h`.
- PCs 646-668 parse `LevelID` into uint `_-Y1H`.
- PCs 1782-1803 reject a duplicate ID in `LevelType._-k56`.
- PCs 2484-2497 write `LevelType._-k56[level._-Y1H] = level`.
- PCs 2509-2559 separately index by level name and reject duplicate names.

The exact archive-loader call that passes Init entry 8 to method 5117 remains untraced. The shipped record shape, unique field parser, and resulting static registries are exact; the container-to-parser dispatch edge is a residual loader proof obligation.

## LevelType to Dynamic LevelDesc

Dynamic registry method 5153 `_-h5c._-06T` requires a `LevelName` attribute and writes the XML element into static StringMap `_-h5c._-XY` under that exact name at PCs 27-93.

Resolver method 5152 `_-h5c._-z2u` tests whether a non-null LevelType's `_-554` name has a non-null entry in `_‑XY`. Resolver method 5154 `_-h5c._-F1C` reads the same `LevelType._-554` and returns `_‑XY[levelName]` at PCs 0-63.

Instance method 5143 `_-h5c._-34c` closes the load edge:

1. PCs 12-54 obtain the match's selected `LevelType`.
2. PCs 55-126 reject null LevelType or a missing `_‑XY` entry.
3. PCs 127-192 retrieve the exact XML root keyed by `LevelType._-554`.
4. PCs 205-288 derive the optional `AssetDir` prefix and call method 5135 `_-UQ` on that root.

Every one of the 120 Dynamic roots has a unique `LevelName`, and every root name matches exactly one of the 162 LevelTypes. There are no orphan Dynamic roots.

### Corpus closure

| Replay level ID | LevelType and Dynamic root |
| ---: | --- |
| 7 | `GreatHall` |
| 115 | `BattleHill` |
| 136 | `BigCrystalTemple` |
| 141 | `SynthwaveFFA` |
| 144 | `SmallMovingPlatform` |
| 174 | `NorseWinterFFA` |
| 210 | `BP6GiantSword` |
| 211 | `BP6GiantSword1v1` |
| 217 | `RooftopFFA` |
| 234 | `ThreeShips` |
| 246 | `SmallRefineryDoors` |

All 12 authentic fixtures resolve. Level ID 144 occurs twice; every other reviewed ID occurs once.

### Universal mismatch

The 42 LevelTypes without a Dynamic root are:

`Template`, `Grove2`, `Random`, `SmallKingsPass2`, `SmallKingsPass3`, `Brawlball_4_30`, `Brawlball2`, `Grid`, `ShortSide`, `Pillars`, `Pit`, `WallyMcSpinzor3`, `Plain`, `SmallTitansEnd`, `DangerZone`, `Chute`, `Sanctuary`, `BigEnigma`, `BigShipwreckFalls`, `BigBrawlhaven`, `SmallTempleComp`, `SmallLostLabyrinth`, `Spike`, `SmallCave2`, `Paintbrawl`, `CTF3v3`, `CrazyShipwreckFalls`, `CrazyFangwild`, `CrazyTitansEnd`, `CrazyMoltenSmall`, `CrazyStadium`, `CrazyBattleHill`, `BigCrazyFangwild`, `CrazyFangwildRicochet`, `HidingPlats2`, `Synthwave1v1`, `FeudingFlats`, `SmallPlain`, `CannonballMania`, `LittleBoat`, `FrozenPlains`, and `DragonPort`.

The 127 names referenced by LevelSetTypes include seven without a Dynamic root: `BigEnigma`, `BigShipwreckFalls`, `BigCrazyFangwild`, `FrozenPlains`, `RealDemon`, `Plain`, and `ReverseGrove`. `RealDemon` and `ReverseGrove` also lack LevelType records. The inspected evidence does not prove whether these are aliases, stale source entries, server-inaccessible entries, SWF-only fallback levels, or explicit load failures.

## Explicit Dynamic geometry inventory

The 120 Dynamic roots contain the following gameplay-relevant source elements.

### Collision elements

| Element | Count | Levels | Parsed type |
| --- | ---: | ---: | --- |
| `HardCollision` | 1,792 | 117 | base bit `1` |
| `SoftCollision` | 272 | 92 | base bit `2` |
| `NoSlideCollision` | 235 | 34 | hard plus no-slide flag |
| `BouncyHardCollision` | 72 | 9 | hard plus bounce flag |
| `BouncySoftCollision` | 1 | 1 | soft plus bounce flag |
| `BouncyNoSlideCollision` | 2 | 1 | hard plus bounce and no-slide flags |
| `GameModeHardCollision` | 2 | 1 | hard plus game-mode flag |
| `LavaCollision` | 43 | 8 | hard plus lava, game-mode, and no-slide flags |
| `MudCollision` | 1 | 1 | mud/game-mode flag combination |
| `PressurePlateCollision` | 18 | 4 | hard plus pressure-plate flag |
| `SoftPressurePlateCollision` | 3 | 1 | soft plus pressure-plate flag |
| `DynamicCollision` containers | 175 | 47 | child segments associated by `PlatID` |

The script-279 initializer, method 5156, gives exact readable identities to these tags. Static registration method 850 maps `HardCollision` to bit `1`, `SoftCollision` to bit `2`, and `TriggerCollision` to bit `4`; it constructs the composite types listed above by OR-ing named flag fields.

`StickyCollision`, `ItemIgnoreCollision`, `TriggerCollision`, and `IceCollision` are recognized vocabulary but do not occur in the reviewed 120 roots.

### Spawn and bounds elements

| Element | Count | Levels |
| --- | ---: | ---: |
| `CameraBounds` | 120 | 120 |
| `SpawnBotBounds` | 120 | 120 |
| `Respawn` | 979 | 120 |
| `DynamicRespawn` | 28 | 9 |
| `ItemSpawn` | 714 | 116 |
| `ItemInitSpawn` | 101 | 98 |
| `TeamItemInitSpawn` | 58 | 29 |
| `DynamicItemSpawn` | 28 | 8 |
| `Goal` | 48 | 16 |

Method 5131 parses rectangles from `X`, `Y`, `W`, and `H`. Missing values retain the supplied default rectangle component or zero. Method 5130 parses point spawns from `X` and `Y`, adds caller-supplied offsets, and preserves the `Initial` and `ExpandedInit` booleans. Method 5135 supplies Dynamic container offsets and associates dynamic collisions, respawns, item spawns, navigation nodes, and animations by `PlatID`.

This inventory is source closure, not spawn-selection behavior. Which spawn candidate gameplay chooses, how it randomizes, and when a dynamic spawn becomes active belong to separate behavior paths.

## Collision-segment normalization

Method 5137 `_-h5c._-T1L` is the exact XML segment parser.

1. PCs 202-268 map the XML tag through `_-91W._-n2s` to the collision type bitset.
2. PCs 313-378 parse `X` as both endpoint X coordinates and add the supplied X offset.
3. PCs 382-491 otherwise parse `X1` and `X2`, adding the same offset.
4. PCs 495-560 parse `Y` as both endpoint Y coordinates and add the supplied Y offset.
5. PCs 564-673 otherwise parse `Y1` and `Y2`, adding the same offset.
6. PCs 677-862 parse an optional readable `Flag`; an unknown flag becomes zero.
7. PCs 864-902 swap whole endpoints when endpoint 1 X exceeds endpoint 2 X. Segments are normalized left-to-right. Vertical segments preserve their source Y order.
8. PCs 904-963 parse optional `Team`, defaulting to uint zero.
9. PCs 965-1171 expand an anchored line through method 1403 when both `AnchorX` and `AnchorY` exist.
10. PCs 1175-1208 otherwise construct `_‑L3i(point1, point2, type, flag, team)` and publish it.
11. PCs 1213-1393 parse optional `NormalX`/`NormalY`, normalize that vector to length one, and derive the steep-normal marker using `normal.y < 0 && abs(normal.x / normal.y) >= 1.6666666666666667`.

XML numeric values enter AVM2 `Number` directly. No XML-to-world scale factor appears in methods 5130, 5131, 5132, 5135, or 5137. The safe unit name is **level world coordinate**, not pixel, meter, or physics unit. A physical calibration is not proven.

## Platform InstanceName and hidden geometry

The 120 roots contain:

- 1,394 `Platform` elements, all with `InstanceName`;
- 175 `MovingPlatform` elements, each associated through `PlatID`;
- 216 Platform elements with `AssetName`, `W`, and `H`;
- 1,178 Platform elements with `InstanceName` and neither `W` nor `H`.

Method 5133 `_-h5c._-72e` handles platforms:

1. PCs 29-61 read `InstanceName` and allow method 5125 to suppress special names, theme/scoring mismatches, or platform-asset-swap variants.
2. PCs 62-99 route an element with `AssetName` through method 5139 and return.
3. PCs 100-167 otherwise construct a Sprite3D, attach it, detect `MovingPlatform`, and apply method 5132's transform.
4. PCs 172-210 invoke callback `_-j5B(xml, parent, instanceName, sprite)` when the loader callback exists.
5. PCs 214-372 recursively process child `Asset` and `Platform` elements and capture child `Animation`.
6. PCs 387-481 construct a `MovingPlatform` for a moving element with animation data and the element's `PlatID`.

Method 5132 applies the XML display transform:

- `X` and `Y` default to zero.
- `Scale` sets both axes; otherwise `ScaleX` and `ScaleY` independently default to one.
- `Rotation` is multiplied by `Math.PI / 180`, initialized at method 14909, so XML rotation is degrees and runtime rotation is radians.
- For the sized display-object subtype, `W` sets `scaleX = W / intrinsicWidth` when intrinsic width is nonzero; `H` analogously sets `scaleY = H / intrinsicHeight`.

The callback is not presentation-only by static reachability. Method 1402 `_-r5Y._-Q1D` reads display-object graphics:

- It converts local endpoints and an optional anchor with `localToGlobal`.
- PCs 203-321 snap each global endpoint coordinate to `10 * round(value * 0.1)`. Method 1406 pins the multiplier as `0.1`.
- It reads display-object names beginning with `am_`, parses collision type, `DynamicCollision`, and `Team` tokens, and constructs collision segments through methods 1403-1405.
- It rejects unrecognized collision names and can associate generated segments with dynamic platform IDs.

Therefore the exact collision set is the union of explicit Dynamic XML segments and collision graphics reachable through bound Platform instances. Dynamic XML alone cannot reproduce every primitive.

For the 120 root-backed LevelTypes, the declared `FileName` set is:

`Level_Brawlball.swf`, `Level_Events.swf`, `Level_GameModes.swf`, `Level_OneUp.swf`, `Level_Ruins.swf`, `Level_Scrolling.swf`, `Level_Tutorial.swf`, and `Level_Wacky.swf`.

None of these eight files is present anywhere in the reviewed local snapshot. Some newer root-backed LevelTypes omit both `FileName` and `AssetName`, so `AssetDir` and the runtime asset loader may introduce additional map-specific dependencies. Those dependencies are not enumerated.

## Hard, soft, and one-sided behavior

Static method 850 proves the base type bits:

```text
HardCollision = 1
SoftCollision = 2
TriggerCollision = 4
```

Collision query method 1390 `_-91W._-K2O` filters candidate segments by `segment.type & queryMask`. After computing a signed ray/segment-side value, its soft gate admits the candidate when any of these conditions holds:

```text
signedSide >= 0
or (queryMask & 2) == 0
or (segment.type & 2) == 0
or (queryOptions & 1) != 0
```

Thus soft bit `2` is one-sided by default. Hard bit `1` does not take that side rejection. Query option bit `1` overrides the soft one-sided gate. Directional rejection against an explicit segment normal happens separately unless query options `1`, `4`, or `8` disable that family of checks.

This proves the static one-sided rule and hard/soft distinction. It does not prove every gameplay caller's query mask and option bits, fighter drop-through state, item behavior, or tick-phase ordering. Those caller-specific behaviors must not be inferred from the tag names alone.

Bounce, no-slide, sticky, game-mode, pressure-plate, lava, mud, and item-ignore meanings are encoded as extra type bits. Their exact parser compositions are proven, but the complete consumer ledger and gameplay effects are not closed here.

## Moving geometry

Method 5141 `_-h5c._-p3s` parses moving-platform animation data.

- PCs 108-163 use `Animation.NumFrames` or the level default.
- PCs 191-357 parse optional center coordinates.
- PCs 359-471 parse `EaseIn` and `EaseOut`.
- PCs 483-569 call method 5146 with `EasePower`, defaulting to script constant 2.
- PCs 640-1498 interpolate keyframe position and rotation, including a center/arc branch.
- PCs 1263-1405 round generated X and Y coordinates to two decimal places.
- PCs 1506-1572 apply `SlowMult`.
- PCs 1575-1639 add optional `StartFrame` to the moving object's current frame.

The parser generates frame-position, local-position, rotation, and easing vectors. The runtime consumer that advances frames, applies moving collision deltas, carries entities, handles wraparound, and orders movement against fighter collision was not closed. Moving geometry is therefore structurally parsed but not behaviorally proven.

## Controlled tests and acceptance disposition

### Checks supported by declared inputs

A fail-closed analysis can currently verify:

1. Exact ABC/archive/manifest identities.
2. `Init.swz` header and the unique 162-record LevelTypes section.
3. `Dynamic.swz` header, 186-section ledger, 120 LevelDesc roots, and 66 CutsceneType roots.
4. Uniqueness and the exact 120-of-162 LevelName join.
5. Exact resolution of all 11 corpus IDs.
6. The explicit XML collision/spawn inventory.
7. Synthetic parser cases for point segments, endpoint segments, offsets, left-to-right swapping, teams, explicit normals, and rectangular/point spawns.

### Checks not currently controlled

A controlled reference collision test requires a trusted executable oracle, the exact bound platform assets, authenticated instrumentation, declared test setup, and exact ordered traces. The map records that no trustworthy reference trace exists yet. The eight directly named level SWFs are absent, and map-specific asset closure is unknown.

Consequently, no claim that a synthetic collision result “matches reference behavior” is admissible today. Static agreement with decompiled formulas is not a differential test.

### Acceptance matrix

| Ticket acceptance | Result |
| --- | --- |
| Every build-10.09 LevelType resolves uniquely to one Dynamic root | **Failed:** 120 of 162 resolve; 42 do not |
| Every collision and spawn primitive is normalized | **Failed:** explicit XML is bounded; Platform graphics inject additional primitives |
| Units and transforms are proven | **Partial:** XML world coordinates, degrees-to-radians, W/H ratios, and graphics snapping are proven; physical calibration and missing intrinsic assets are not |
| Moving behavior is proven | **Failed:** parser interpolation is bounded; runtime advancement/carry/collision order is unresolved |
| One-way, hard, and soft behavior is proven | **Partial:** type bits and soft side gate are proven; complete caller/query behavior is unresolved |
| Controlled collision tests match | **Failed:** no trusted reference trace and required platform assets are absent |
| No undeclared asset read | **Failed as a universal closure claim:** Init was previously undeclared, and level/map assets remain unenumerated |

## Implementation contract

A simulator may safely implement only this bounded contract from current evidence:

1. Add hash-pinned `Init.swz` to patch-snapshot initialization closure.
2. Reject duplicate LevelType IDs or names and reject replay level IDs absent from the static ID registry.
3. Resolve a root by exact `LevelType.LevelName`; do not use LevelSet order or filename heuristics.
4. Reject a selected LevelType when its exact Dynamic root is absent.
5. Preserve AVM2 `Number`, parse order, left-to-right endpoint swap, optional normal normalization, team/flag values, and Dynamic parent offsets.
6. Preserve XML values in level world coordinates. Do not introduce an arbitrary pixel, meter, or motion-unit conversion.
7. Treat explicit XML geometry as analysis-only until platform-instance asset closure has been installed and verified. Reject conformance simulation when a reachable platform-instance path cannot be resolved completely.
8. Keep moving, composite collision flags, and gameplay query options unknown until their runtime consumers and controlled traces are closed. Reject conformance simulation when any unresolved moving or composite/query behavior is reachable.
9. Reject the two LevelSet-only names and every no-root LevelType unless a separately proven fallback/alias contract exists.

## Reproduction outline

Keep all proprietary inputs outside version control. Supply them as explicit CLI arguments rather than reading an implicit game installation or environment variable.

```bash
shasum -a 256 \
  /path/to/BrawlhallaAir.swf \
  /path/to/main.abc \
  /path/to/Init.swz \
  /path/to/Game.swz \
  /path/to/Dynamic.swz \
  /path/to/replay-manifest.json
```

The reviewed extraction used the exact SWZ driver and three reader components pinned in the identity table. It decoded `Init.swz`, `Game.swz`, and `Dynamic.swz` only in memory. The current branch does not commit that reader or a single-command analyzer for this report; adding a public, reviewed reproducer is a follow-up requirement, not evidence that may be assumed complete.

An equivalent independent reader must validate each archive header and assert:

```text
Init.swz:    10 entries; entry 8 root LevelTypes; 162 unique IDs and names
Game.swz:    72 entries; unique LevelSetTypes root; 127 referenced names
Dynamic.swz: 186 entries; 120 LevelDesc; 66 CutsceneType
joins:       120 exact root-to-LevelType names; 42 LevelTypes without roots
corpus:      12 fixture hashes; 11 unique IDs; all mapped to exact roots
```

Generate each ordered section ledger by appending UTF-8 `ordinal`, NUL, decimal byte length, NUL, lowercase leaf SHA-256, and newline, then SHA-256 the concatenation. Preserve archive order. A changed archive, section count, root count, leaf hash, duplicate ID/name, corpus hash, or join count must fail closed.

The absent-SWF observation used exact-basename search over two declared boundaries: the complete installed 10.09 resource tree and the complete user-owned source archive used to assemble the snapshot. Reproduce it without an implicit path:

```bash
find /path/to/installed-resource-tree /path/to/user-owned-source-archive -type f \
  \( -name 'Level_Brawlball.swf' -o -name 'Level_Events.swf' \
     -o -name 'Level_GameModes.swf' -o -name 'Level_OneUp.swf' \
     -o -name 'Level_Ruins.swf' -o -name 'Level_Scrolling.swf' \
     -o -name 'Level_Tutorial.swf' -o -name 'Level_Wacky.swf' \) -print
```

Expected reviewed result: no paths. A different installation must declare and hash any returned asset before collision analysis.

## Confidence and blockers

### High confidence

- Replay level ID directly indexes `LevelType._-k56`.
- `Init.swz` is required to source the shipped LevelType records.
- Dynamic roots are keyed and resolved by exact `LevelName`.
- Every reviewed corpus ID resolves uniquely.
- The 162/120/42 mismatch and the two LevelSet-only names are exact.
- Explicit XML segment, bounds, and spawn normalization is exact.
- Platform display transforms and graphics-derived collision snapping are exact static behavior.
- Hard is base bit 1, soft is base bit 2, and soft queries have a one-sided gate.

### Blocking unknowns

1. Exact Init archive-loader dispatch into method 5117.
2. Semantics or unreachability of 42 no-root LevelTypes and seven LevelSet names without roots.
3. Complete Platform InstanceName asset closure, including the absent level SWFs and newer map-specific assets.
4. Intrinsic dimensions and display-list transforms needed by W/H and `localToGlobal`.
5. Runtime moving-platform frame progression, carry, collision update, and tick order.
6. Complete consumers for composite collision flags and every gameplay query mask/option.
7. Trusted controlled collision traces from the hash-pinned interpreted reference oracle.
8. Physical interpretation of level world coordinates, if one is needed beyond exact numerical reproduction.

## Surfaced ticket and fog suggestions

These are suggestions only. No additional ticket was claimed or created.

1. **Close level asset and Platform InstanceName closure:** enumerate every level/map asset read, hash-pin it, and prove `InstanceName` to display object to generated collision lines.
2. **Resolve legacy and fallback LevelTypes:** classify the 42 no-root LevelTypes and the `RealDemon`/`ReverseGrove` LevelSet names as reachable, aliased, stale, or explicit failures.
3. **Prove moving-platform runtime behavior:** close frame advancement, easing, wrap, entity carry, dynamic spawn/collision updates, and tick phase.
4. **Close collision query option semantics:** enumerate fighter, item, projectile, and mode callsites for hard/soft masks, drop-through overrides, no-slide, bounce, sticky, hazards, and game-mode flags.
5. **Capture controlled collision oracle traces:** after the interpreted oracle trust gates pass, run declared horizontal, vertical, slope, soft pass-through/drop-through, moving-platform, and graphics-derived collision cases.
6. Keep broader fighter locomotion and combat collision interaction in the existing movement/combat fog until the geometry and query contracts above are stable.
