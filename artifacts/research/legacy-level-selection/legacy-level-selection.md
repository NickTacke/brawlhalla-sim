# Legacy and fallback level selection in Brawlhalla 10.09.96325

Issue: [Resolve legacy and fallback level selection](https://github.com/NickTacke/brawlhalla-sim/issues/46)

## Verdict

The legacy and fallback level-selection gaps are closed for replay-producing matches.

The apparent `162 LevelTypes / 120 Dynamic roots / 42 gaps` mismatch mixes source vocabulary with the published runtime registry. The hash-pinned `LevelTypes` source contains 162 records, but method 5117 publishes only 121 of them:

- `Template` has `LevelID=0` and returns before publication.
- Forty records have `DevOnly=true` and return before publication.
- The remaining 121 records are published by ID and exact name.
- Exactly 120 published records have exact-name `Dynamic.swz` roots.
- The sole published no-root record is `Random`, an explicit selection sentinel.

`Random` is replaced before match startup and replay writing. Method 2304 chooses from an already filtered LevelSet candidate vector; if that vector is empty it chooses the published, Dynamic-backed `Stadium` LevelType. Replay writer callsites pass the resulting concrete `LevelType.LevelID`, not ID 6 for `Random`.

The seven names used by LevelSets but lacking Dynamic roots are also closed. Five are `DevOnly` source records and therefore absent from the name registry. `RealDemon` and `ReverseGrove` have no LevelType source record. LevelSet linker method 5099 skips all seven after exact-name lookup fails. Every affected LevelSet retains at least one Dynamic-backed candidate.

There is no alias path. No inspected selector rewrites a legacy name to another map name, and no file or asset name participates in selection. A simulator must fail closed if replay bytes directly select `Template`, `Random`, one of the 40 unpublished DevOnly IDs, an absent ID, or any LevelType without an exact Dynamic root. Such bytes are outside the proven replay-writer output contract.

Confidence is **high** for the complete source inventory, published registry, LevelSet linking, random and empty-vector fallbacks, mode-specific LevelSet transforms, replay-writer boundary, and all classifications below.

## Evidence grades

- **Proven reachable resolution:** exact pinned-ABC control/dataflow replaces a selection sentinel or fallback with one published Dynamic-backed LevelType before replay writing.
- **Proven unreachable vocabulary:** the pinned parser does not publish the source entry, exact-name linking drops the name, or no source record exists.
- **Explicit fail-closed simulator case:** a replay value cannot be produced by the proven writer path and has no exact supported resolution.
- **Source-derived:** an exact inventory or flag from a hash-pinned shipped archive section.
- **Unknown:** the reviewed primary evidence does not settle a claim.

The 10.05 decompiler output was a locator only. All verdict claims were rechecked against the pinned 10.09 ABC and archives.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Registry publication, LevelSet linking, selection, fallback, and writer control flow |
| Sole semantic build string in the ABC | `10.09.96325` | Build identity |
| `Init.swz` | `bfb56c12517b7a95927feaca7180d5a85b6952d4d53e76e614ffc06bf4fe067b` | Parent of exact LevelTypes vocabulary |
| `Init.swz` LevelTypes section | entry 8, 111,030 bytes, `05255d10597aa4bdafcaefa115ab4a4d6789d860acdb5cd77711d9b3a024a2f7` | 162 source records and flags |
| `Game.swz` | `4fc9d70c1c3642b7d3e61c8bb0062bb57c46ea2169276ca1d33616a5843d4aff` | Parent of LevelSetTypes |
| `Game.swz` LevelSetTypes section | `e6870349d9104bc91fddcfa329f2cf4b5a4b96e466cfed47cb92834316b54dff` | 90 sets, 842 references, 127 unique names |
| `Dynamic.swz` | `cd54de039bc4e3441a7ae5811ef8748a719f49e0d4917016407d83b201ddf9c4` | 120 exact-name LevelDesc roots |
| Authentic format-268 manifest | `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac` | 12-fixture observed level-ID cohort |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |
| Read-only ABC probe | `56c394f622e4e7f1f9d80aab4b86edfa690ebaf50eb410bf68f8953de28e00b7` | Exact methods, traits, and QName references |
| Read-only SWZ driver | `7c8b3c156fcb3f447d5415a82c1dc19c87486a45ed9dd94dd14fe9208fd20f55` | Archive extraction |
| SWZ reader components | `fe28db7c928a652bf5f77aa6880e30bed336fe39301e3981b39fed492b4cf6c9`, `9cb8234d3208174fe0918b36bdf6b24664538bb910be75cd5309b5e73c2d76be`, `63a94f60de675cf5c5c5864a42a2c394bafce6e1dc2441ae3e3a814e6936f856` | Header validation and in-memory section reads |

The archive inventory also produced these ordered ledger hashes:

| Ledger | Definition | SHA-256 |
| --- | --- | --- |
| LevelType source records | `LevelID`, NUL, `LevelName`, NUL, DevOnly bit, NUL, TestLevel bit, newline, in source order | `e6555b9a80b8fd75e4c8452005cd8c3f98805d3234888be01eda357c9178ab08` |
| Published runtime registry | `LevelID`, NUL, `LevelName`, newline, in source order after parser exclusions | `ac11db18e4f378d54f116f274f585a83f919211db8d2f01f019d42ca2c3d6e13` |
| Dynamic root names | `LevelName`, newline, in Dynamic archive order | `cd09223d0320342308f5604b97f636b7906206779837936a3ef6d62fa90c13f0` |
| LevelSet references | `LevelSetID`, NUL, `LevelSetName`, NUL, zero-based reference index, NUL, level name, newline, in source order | `8a5cf003aa3a84acebde59c3b7860c64cde30c77804728a32e33e79a1a7418ea` |

These ledgers contain names and IDs only. They contain no archive payload, replay bytes, player data, or local paths.

## Exact LevelType registry

### Source vocabulary versus runtime publication

Method 5114 `LevelType._-H2x` creates the published vector `_‑X6Q`, ID array `_‑k56`, and name map `_‑83m` at PCs 5-41. It iterates every source child and calls parser method 5117 `_‑d3p` at PCs 58-75. The return value is discarded.

Method 5117 parses `DevOnly` into boolean `_‑E6N` at PCs 132-187 and `LevelID` into uint `_‑Y1H` at PCs 646-668. Its publication gates are exact:

1. If `LevelID == 0`, PCs 1658-1673 return null.
2. Otherwise, if `DevOnly` is true, PCs 1674-1683 return the object immediately.
3. Only after both gates does the method reject duplicate names and IDs, then publish the object to `_‑X6Q`, `_‑k56`, and `_‑83m` at PCs 1684-2559.

The source section has 162 unique names and 162 unique IDs. Its exact disposition is:

| Source class | Count | Published by ID/name | Dynamic root |
| --- | ---: | ---: | ---: |
| `Template`, ID 0 | 1 | No | No |
| `DevOnly=true`, nonzero ID | 40 | No | No |
| Normal records | 121 | Yes | 120 |
| `Random`, ID 6, within normal records | 1 | Yes | No, by design |

Therefore the actual runtime equation is:

```text
121 published LevelTypes = 120 exact Dynamic roots + 1 Random sentinel
```

It is not 162 runtime-selectable LevelTypes.

### Exact Dynamic join

Dynamic registry method 5153 `_‑h5c._‑06T` reads `LevelName` and publishes each root into exact-name map `_‑h5c._‑XY` at PCs 27-89. Methods 5152 `_‑z2u` and 5154 `_‑F1C` test and return `_‑XY[levelType._‑554]` without consulting `FileName`, `AssetName`, display name, LevelSet position, or numeric ID.

All 120 Dynamic roots match one of the 120 published non-sentinel LevelTypes. No Dynamic root is missing from the published name registry. The only published name missing from Dynamic is `Random`.

## Complete classification of the 42 source-to-Dynamic gaps

### Proven reachable resolution path

| Name | Source state | Classification | Exact resolution |
| --- | --- | --- | --- |
| `Random` | ID 6, normal published record | Proven reachable selection sentinel | Method 2304 replaces it with a candidate from a filtered LevelSet vector; an empty vector becomes `Stadium` |

`Random` is reachable in selection UI and settings state, but it is not a loadable level and is not proven reachable as a serialized replay level ID.

### Proven unreachable source vocabulary

| Name | Source state | Why unreachable in a replay-producing match |
| --- | --- | --- |
| `Template` | ID 0, DevOnly | Method 5117 returns null before all registry publication |

The 14 nonzero DevOnly test records, shown as `LevelName (LevelID)`, are:

`Grove2 (4)`, `SmallKingsPass2 (13)`, `SmallKingsPass3 (14)`, `ShortSide (49)`, `Pillars (50)`, `WallyMcSpinzor3 (54)`, `DangerZone (68)`, `Chute (72)`, `Sanctuary (93)`, `SmallLostLabyrinth (102)`, `Spike (103)`, `SmallCave2 (104)`, `LittleBoat (214)`, and `FrozenPlains (215)`.

The 26 nonzero DevOnly non-test records are:

`Brawlball_4_30 (53)`, `Brawlball2 (27)`, `Grid (45)`, `Pit (51)`, `Plain (66)`, `SmallTitansEnd (67)`, `BigEnigma (96)`, `BigShipwreckFalls (97)`, `BigBrawlhaven (98)`, `SmallTempleComp (101)`, `Paintbrawl (106)`, `CTF3v3 (110)`, `CrazyShipwreckFalls (116)`, `CrazyFangwild (117)`, `CrazyTitansEnd (118)`, `CrazyMoltenSmall (119)`, `CrazyStadium (120)`, `CrazyBattleHill (121)`, `BigCrazyFangwild (125)`, `CrazyFangwildRicochet (126)`, `HidingPlats2 (147)`, `Synthwave1v1 (148)`, `FeudingFlats (150)`, `SmallPlain (176)`, `CannonballMania (188)`, and `DragonPort (263)`.

All 40 have the same proven disposition: method 5117 returns the object at PCs 1674-1683 before vector, ID-array, or name-map publication. Method 5114 discards that return value. No inspected selection callsite can recover them by name or ID from the runtime registries.

`TestLevel=true` does not make a DevOnly record selectable. LevelSet test-vector construction happens later and only receives records already found through the published exact-name registry.

### Simulator fail-closed boundary

A structurally parsed replay can still contain any 32-bit level word. For conformance simulation, reject explicitly when the word is:

- `0` for `Template`;
- `6` for `Random`;
- any of the 40 DevOnly source IDs;
- absent from the published ID registry;
- mapped to a LevelType whose exact Dynamic root is absent.

Do not apply the `Random -> candidate/Stadium` selection transform while reading a replay. Reader method 6510 treats the serialized word as an already resolved concrete ID. Applying selection again would consume fresh randomness and invent behavior not present in the replay.

## Exact LevelSet registry and the seven rootless names

### Raw registry

Method 5097 `_‑w1p._‑H2x` initializes the LevelSet ID array `_‑C5l`, name map `_‑63e`, and vector `_‑k4G`. Method 5098 `_‑4j` parses:

- `LevelSetName` at PCs 31-64;
- `LevelSetID` at PCs 189-213;
- `SkipOrderValidation` at PCs 253-276;
- the ordered comma-separated `LevelTypes` strings into `_‑74s` at PCs 283-375;
- duplicate names and IDs before publication at PCs 431-674.

The pinned LevelSetTypes source contains 90 unique sets, 842 ordered references, and 127 unique referenced names.

Method 5097 also binds exact special sets after parsing:

- `Auto` to `_‑A5d` at PCs 188-238;
- `StandardFFA` to `_‑R2m` at PCs 289-342;
- `StandardAll` to `_‑a2j` at PCs 374-427.

### Linker filtering

Method 5099 `_‑Z2` converts raw names to candidates:

1. PCs 155-191 read each raw name and call exact LevelType name lookup method 5120 `_‑v1K`.
2. A null lookup takes the skip path at PCs 193-248. It does not add an alias or placeholder.
3. With ordinary non-dev loading, PCs 252-283 also skip a published LevelType lacking a Dynamic root.
4. PCs 287-337 append a non-test LevelType to normal vector `_‑d1F` with maintained ordering.
5. PCs 341-348 append a `TestLevel` LevelType to test vector `_‑U4f`.

The seven raw names without roots are:

| Raw LevelSet name | LevelType source record | Raw LevelSets | Classification |
| --- | --- | --- | --- |
| `BigEnigma` | DevOnly, ID 96 | `StandardAll`, `StandardBig` | Proven unreachable vocabulary, null name lookup, skipped |
| `BigShipwreckFalls` | DevOnly, ID 97 | `StandardAll`, `StandardBig`, `TableTopALL`, `TableTopBig`, `SnowbrawlNewSmall`, `SnowbrawlNewBig` | Proven unreachable vocabulary, null name lookup, skipped |
| `BigCrazyFangwild` | DevOnly, ID 125 | `StandardAll` | Proven unreachable vocabulary, null name lookup, skipped |
| `FrozenPlains` | DevOnly, TestLevel, ID 215 | `StandardAll`, `Standard1v1`, `Ranked1v1` | Proven unreachable vocabulary, null name lookup, skipped before test-vector construction |
| `Plain` | DevOnly, ID 66 | `StandardAll` | Proven unreachable vocabulary, null name lookup, skipped |
| `RealDemon` | No LevelType record | `StandardAll`, `Crazy` | Proven unreachable vocabulary, null name lookup, skipped |
| `ReverseGrove` | No LevelType record | `StandardAll` | Proven unreachable vocabulary, null name lookup, skipped |

Every affected set remains nonempty after filtering:

| LevelSet | Raw references | Root-backed candidates after the seven gaps are removed |
| --- | ---: | ---: |
| `StandardAll` | 94 | 87 |
| `Standard1v1` | 48 | 47 |
| `StandardBig` | 31 | 29 |
| `TableTopALL` | 68 | 67 |
| `TableTopBig` | 22 | 21 |
| `Ranked1v1` | 34 | 33 |
| `Crazy` | 14 | 13 |
| `SnowbrawlNewSmall` | 25 | 24 |
| `SnowbrawlNewBig` | 23 | 22 |

No one-entry fallback, order shift, or alias is needed beyond removal of the failed exact-name entries. The remaining vector preserves source order through method 5099's indexed insertion.

## Mode-specific selection and fallbacks

### ScoringType admissibility

ScoringType linker method 7281 `_‑M3G` collects LevelSet IDs only after the set's normal linked vector `_‑d1F` is nonempty at PCs 504-588. It parses mode-specific default, 1v1, 2v2, FFA, big, 3v3, and additional LevelSet names at PCs 297-519. Invalid or empty linked sets are not admitted to the scoring type's valid set vector `_‑M6J`.

Method 7282 `_‑z3F` resolves a requested set ID against that valid vector. A null ScoringType returns `Auto`; an unknown requested ID returns the first valid set; otherwise it returns a deterministic indexed valid set. This transforms set selection only. It never transforms one level name into another.

### Match candidate construction

Method 2305 `_‑V2p._‑G6h` constructs the candidate vector used by match selection:

- If game settings select `Auto`, PCs 95-450 choose a ScoringType LevelSet name according to player count, team mode, and the mode's 1v1, 2v2, FFA, big, or 3v3 fields.
- Otherwise PCs 455-483 read the selected LevelSet directly by ID.
- An eligible active-mode override can replace the set by another exact LevelSet name at PCs 484-668.
- If any exact set lookup is null, PCs 669-687 replace it with exact `StandardFFA`.
- Settings bit `32` selects the linked test vector `_‑U4f`; otherwise PCs 688-744 copy the linked normal vector `_‑d1F`.
- Later filters remove banned or recently used concrete LevelTypes. They do not add names or aliases.

The seven rootless LevelSet names cannot reappear during these transforms because they were never inserted into either linked vector.

### Random and empty-vector fallback

Method 2304 `_‑s1t` is the final concrete-level selector:

1. If the current selected level is null or exact `LevelType._‑kC` (`Random`), PCs 11-78 call method 2305 for the filtered candidate vector.
2. If the vector is nonempty, PCs 79-137 use the match selection PRNG, calculate a bounded index, and install that concrete LevelType.
3. If the vector is empty, PCs 141-187 install exact `LevelType._‑Z2W` (`Stadium`).
4. PCs 191-199 return the installed concrete LevelType.

Method 5117 binds `_‑kC` only from exact source name `Random` at PCs 2164-2183 and `_‑Z2W` only from exact source name `Stadium` at PCs 2184-2203. `Stadium` is published and has an exact Dynamic root.

This is the only proven fallback from a no-root published LevelType to a root-backed level. It is sentinel behavior, not an alias between map names.

### Direct name lookup closure

The pinned ABC has 13 exact calls to LevelType name lookup method 5120 `_‑v1K` across eight methods:

| Method | Call PC(s) | Disposition |
| ---: | --- | --- |
| 839 | 4 | Generic exclusion-list insertion |
| 3416 | 27 | Developer default-level lookup, followed by normal selection fallback if absent |
| 3513 | 19 | Tutorial configuration lookup |
| 5099 | 181 | Raw LevelSet linking |
| 5114 | 179, 226, 270, 318, 366 | Required exact bindings for `SynthwaveSoccer`, `NorseSoccer`, `Soccer4`, `Horde`, and `RefineryDoors` |
| 5717 | 2023 | Event/objective parser lookup |
| 7054 | 47 | Exact `VolleyBattleSmall` mode comparison |
| 11238 | 1066, 1365 | Event/objective match consumers |

Every literal required or mode-specific name above is one of the 120 published Dynamic-backed names. Within this complete pinned-ABC exact-name callsite set, no call maps any of the 42 gaps or seven raw LevelSet gaps to another LevelType.

## Replay-writer and reader boundary

Method 3514 `_‑u16._‑E4G` calls final selector method 2304 at PCs 100-117 and immediately passes the returned concrete LevelType to match setup. It stores that object's `_‑Y1H` ID at PCs 281-288. At PCs 1983-2000 it passes the same selected object's `_‑Y1H` to replay writer method 6519 `_‑L2J`.

Method 6519 receives that concrete uint as parameter 2. It writes the parameter into the state-4 payload at PCs 96-105. Its later ID-array lookup at PCs 166-203 is used only to derive a display label; it does not replace or rewrite the serialized ID.

The complete `_‑L2J` callsite set is:

| Method | Call PC | Level argument |
| ---: | ---: | --- |
| 3282 | 1808 | Selected object's `_‑Y1H`, loaded at PCs 1802-1805 |
| 3514 | 2000 | Final selector result's `_‑Y1H`, loaded at PCs 1995-1997 |
| 5257 | 1215 | Selected object's `_‑Y1H`, loaded at PCs 1207-1210 |

No writer callsite passes `Random` by name or independently performs a legacy alias.

Reader method 6510 `_‑E4h._‑N4v` reads the state-4 level word and indexes `LevelType._‑k56` directly at PCs 766-814. It performs no fallback. The supported replay contract therefore requires the writer-resolved concrete ID.

The reviewed 12-replay format-268 cohort contains 11 distinct IDs: `7`, `115`, `136`, `141`, `144`, `174`, `210`, `211`, `217`, `234`, and `246`. Every one resolves to a published LevelType and exact Dynamic root. None is ID `0`, ID `6`, or a DevOnly source ID.

## Acceptance matrix

| Ticket requirement | Result |
| --- | --- |
| Start from exact LevelType registry | Met: 162 source records reduce to 121 published runtime entries by explicit parser gates |
| Start from exact LevelSet registry | Met: 90 sets, 842 references, 127 unique names, and complete seven-name gap disposition |
| Trace level selection and fallbacks | Met: exact ScoringType set validation, Auto transforms, StandardFFA fallback, candidate filters, Random replacement, and Stadium empty-vector fallback |
| Trace mode-specific transforms | Met: player/team/mode set-name selection and all exact LevelType name-lookup callsites are disposed |
| Classify all 42 no-root source records | Met: 40 unpublished DevOnly records, one unpublished ID-zero template, and one reachable Random sentinel resolved before writing |
| Classify all seven LevelSet root gaps | Met: five unpublished DevOnly records and two absent records are skipped; every affected set remains nonempty |
| Classify names without LevelType records | Met: `RealDemon` and `ReverseGrove` are exact null lookups and proven unreachable vocabulary |
| Invent no alias | Met: no alias appears in the complete pinned exact-name lookup and writer callsite sets; unresolved replay IDs fail closed |

Issue 46's acceptance is satisfied.

## Simulator contract

1. Build the runtime LevelType registry with method-5117-equivalent publication gates. Do not expose ID-zero or DevOnly source records as supported replay levels.
2. Treat `Random` as a pre-match selection sentinel only. Never resolve it during replay reading.
3. Link LevelSet entries by exact LevelType name. Skip names absent from the published registry. Do not infer from display, file, asset, source order, or similar names.
4. Admit a LevelSet to ordinary selection only when its linked root-backed vector is nonempty.
5. Apply ScoringType, player-count, team-mode, active-mode, ban, and recent-level transforms before random choice.
6. Fall back from an unknown selected LevelSet to exact `StandardFFA` where method 2305 does so.
7. Fall back from an empty final candidate vector to exact `Stadium` where method 2304 does so.
8. Serialize only the concrete selected LevelType ID.
9. On replay input, resolve the serialized ID directly. Reject ID zero, `Random`, unpublished DevOnly IDs, absent IDs, or missing exact Dynamic roots.
10. Preserve raw unknown values for diagnostics, but do not continue conformance simulation with an invented alias.

## Reproduction outline and verification

Keep proprietary inputs outside version control and supply all paths explicitly. Consistent with repository hygiene and the issue-33 evidence convention, this branch does not commit the user-owned archives, ABC, replay manifest, read-only probe, SWZ reader, extracted registries, or bulk 121-entry and 90-set tables. The identities and ordered ledger hashes above pin the reviewed inputs and derived registries, but reproduction requires independently supplying the named tools and legally obtained inputs.

```bash
shasum -a 256 \
  /path/to/main.abc \
  /path/to/Init.swz \
  /path/to/Game.swz \
  /path/to/Dynamic.swz \
  /path/to/replay-manifest.json
```

Using the hash-pinned read-only ABC probe:

```bash
bun /path/to/input32_probe.ts --method 5097
bun /path/to/input32_probe.ts --method 5098
bun /path/to/input32_probe.ts --method 5099
bun /path/to/input32_probe.ts --method 5114
bun /path/to/input32_probe.ts --method 5117
bun /path/to/input32_probe.ts --method 2304
bun /path/to/input32_probe.ts --method 2305
bun /path/to/input32_probe.ts --method 7281
bun /path/to/input32_probe.ts --method 7282
bun /path/to/input32_probe.ts --method 3514
bun /path/to/input32_probe.ts --method 6510
bun /path/to/input32_probe.ts --method 6519
bun /path/to/input32_probe.ts --refs _-v1K
bun /path/to/input32_probe.ts --refs _-L2J
```

Using the declared SWZ reader, validate archive headers and decode sections in memory. Recompute and assert:

```text
LevelTypes source: 162 unique names, 162 unique IDs
parser exclusions: 1 ID-zero record, 40 nonzero DevOnly records
runtime registry: 121 entries
Dynamic roots: 120 names, all in runtime registry
runtime no-root entries: Random only
LevelSets: 90 records, 842 references, 127 unique referenced names
LevelSet root gaps: exactly seven listed above
post-link empty LevelSets: zero
corpus: 12 hashes, 11 distinct level IDs, all exact Dynamic-backed entries
```

A changed source hash, section hash, ledger hash, count, parser PC, name-lookup callsite set, fallback target, writer callsite, or join result must fail the analysis.

Repository verification for this evidence-only change:

```bash
bun run --cwd tools/avm2-provenance build-dependency
bun run check
git diff --check
```

## Confidence and residual limits

### High-confidence conclusions

- The source/runtime distinction fully explains the 42 apparent no-root records.
- No ordinary published LevelType lacks a Dynamic root.
- `Random` resolves to a root-backed concrete LevelType before replay writing, with exact `Stadium` fallback on an empty vector.
- All seven LevelSet root gaps are skipped before selection.
- `RealDemon` and `ReverseGrove` are stale or unavailable vocabulary entries, not aliases. Their historical intent is unnecessary and remains unclaimed.
- Supported replay reading must never run selection fallback again.

### Residual limits outside this ticket

1. The exact archive-loader dispatch that supplies the LevelTypes section to method 5114 remains outside this selection classification. The source section, parser, and resulting registries are hash-pinned.
2. Platform InstanceName assets and graphical collision geometry remain unresolved under [Close level asset and Platform InstanceName geometry](https://github.com/NickTacke/brawlhalla-sim/issues/45).
3. Moving-platform runtime semantics remain unresolved under [Prove moving-platform runtime collision semantics](https://github.com/NickTacke/brawlhalla-sim/issues/47).
4. Collision query options and composite flag consumers remain unresolved under [Close collision query options and composite flag consumers](https://github.com/NickTacke/brawlhalla-sim/issues/48).
5. The 12-replay corpus observes only one online timed FFA cohort. Static writer closure, not corpus breadth, proves sentinel elimination and fail-closed boundaries.

## Ticket and fog impact

This resolves the legacy/fallback blocker surfaced by [Close level resolution and collision geometry](https://github.com/NickTacke/brawlhalla-sim/issues/33). It does not close that parent investigation because asset, moving-platform, query, and controlled-oracle blockers remain.

No new ticket or fog item is surfaced. Historical intent for unpublished names is not needed by the destination because supported simulation follows the proven build-10.09 runtime and fails closed outside it.

**Map gist:** Build 10.09 publishes 120 loadable levels plus a pre-write Random sentinel; legacy and LevelSet-only names are filtered, never aliased, and replay readers fail closed on them.
