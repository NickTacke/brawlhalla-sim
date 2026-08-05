# Offensive target modes in Brawlhalla 10.09.96325

Issue: [Close downstream semantics for offensive target modes](https://github.com/NickTacke/brawlhalla-sim/issues/69)

## Verdict

**Bounded target-collection and origin-state closure, but issue acceptance is unmet. Keep the issue open.**

Hash-pinned primary evidence proves:

1. all 44 nonempty `TargetMethod` spellings map to one of 14 numeric modes plus 18 orthogonal parser fields;
2. method 65 `_-M5v._-H2v` implements a complete 15-way switch over mode 0 through 14 for one supplied direct/query collection;
3. method 44 `_-M5v._-b5W` implements a separate complete 15-way switch for bounded origin-state setup;
4. all exact-QName instruction references to the 14-mode field and the 18 orthogonal parser fields have pinned ledgers;
5. prior pairwise arbitration, same-team bypass, repeat-hit boundary, and inherited-hit branch evidence remains exact.

The method-65 collection is not the final admitted target set. Other mode consumers, the complete owner/team/state admission pipeline, downstream flag meanings, collection lifecycle, and authenticated runtime behavior remain open. Issue 50 also does not yet partition the PowerType table into replay-reachable and unreachable modes and flags. These are proof gaps, not inferred behavior.

No simulator target policy should be represented as reference-exact from this result alone.

## Evidence grades

- **Proven:** unique hash-pinned AVM2 control/dataflow, typed field identity, branch destination, whole-method digest, or complete exact-QName ledger.
- **Source-derived:** inventory or value read from the hash-pinned shipped table.
- **Bounded closure:** complete for the stated method, field, or source set while broader reachability and lifecycle remain open.
- **Unknown:** the inspected evidence does not settle the claim. Source spelling is not gameplay semantics.

Issue 1 was read only as a low-resolution map and was not edited. Related evidence came from [Specify offensive target modes and pairwise hit policy](https://github.com/NickTacke/brawlhalla-sim/issues/52) and [Prove the reachable PowerType phase universe](https://github.com/NickTacke/brawlhalla-sim/issues/50).

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Reference build | `10.09.96325` | Sole semantic build string in the ABC |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Parser, mode switches, field references, arbitration, and filters |
| Extracted `powerTypes` | `715468d8eda8fa2ec3d88a8b5395c076bec937640927909add4745eda2883f27` | 182 columns and 3,671 records |
| Sorted 44-name set | `3975339aa087d48d9490a5a4bc83df5cd78c4eabcf4a9d528bad73e5532e0223` | Complete nonempty spelling set |
| Parser policy map | `e25e9ad789a8982a0becb1d47bddb9de89ec9280ab4c1cb3c27acd59d203cddc` | Name, record count, mode, and parser-write ledger |
| Target-filter ledger | `5e40d8e2e8d010e5427dd0437462404c7a771919a9056608e4df3d03c14416ed` | Power identity plus four named policy fields |
| Method 65 code | `e26273ae921e46b1bd073c3cf2c5a97af3ad27dcbc71bfe8f8c12f13a75b5673` | Complete direct/query collection method |
| Method 65 callsites | `ec6001ba9ba3af04a21c5fe903a7b1244aa9dc0e2830609e4dee5b394f672b58` | Exact calls from methods 46 and 50 |
| Method 44 code | `9b2048452f9c452ae22d693cdfd8d4463299ba274ed02a8826fc1bc9e36fa373` | Complete bounded origin-state method |
| Target-mode references | `e357e0c07fb11e8cb9b50bb87a45497e0b15079d22568a4ffb998a2026e77d50` | Every exact `_-84Z` instruction |
| Source-selection paths | `2972ae48d924acc883def49e5742791ba0906c9828e43245e8546536600a3281` | Issue-50 bounded 3,632-record closure |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |

The analyzer decodes all 15,010 method bodies, rejects invalid branch targets, verifies both primary input hashes, pins both complete switch maps and method-code digests, and pins every parser-field reference ledger.

## Parser closure

PowerType parser method 6294 reads `TargetMethod` at byte PC 8694. It recognizes `SmashRelease`, writes Boolean `_-H5k`, strips the prefix, then dispatches the remainder. Bare `SmashRelease` writes mode 1. An unknown remainder reaches `Unknown Target Method Name:`.

The pinned source has 44 nonempty spellings. Parser-only `MeteorGrab` has no nonempty source record and is not claimed source-selectable or replay-reachable.

## Direct/query collection switch

Method 65 `_-M5v._-H2v` receives six arguments; its sixth argument is the supplied mutable collection. It reads `PowerType._-84Z` at instruction 106, byte PC 273, then executes `lookupswitch` at instruction 111, byte PC 282.

Exact branch destinations:

| Mode | Instruction target | Bounded method-65 effect |
| ---: | ---: | --- |
| 0/default | 112 | truncate a nonempty supplied collection to length zero |
| 1 | 194 | append results from `_-Z2h._-4K` using caller coordinates plus PowerType geometry |
| 2 | 121 | truncate; append linked `_-3A` when nonnull |
| 3 | 139 | append results from `_-Z2h._-4K` using the stored point and PowerType geometry |
| 4 | 154 | truncate; append `_-81i` when it is an `_-e4s` |
| 5 | 173 | append results from `_-Z2h._-4K` using the stored point plus PowerType geometry |
| 6 | 194 | same caller-coordinate query branch as mode 1 |
| 7 | 112 | truncate; append nothing in this method |
| 8 | 194 | same caller-coordinate query branch as mode 1 |
| 9 | 194 | same caller-coordinate query branch as mode 1 |
| 10 | 194 | same caller-coordinate query branch as mode 1 |
| 11 | 121 | same linked-entity branch as mode 2 |
| 12 | 112 | truncate; append nothing in this method |
| 13 | 213 | truncate; use `PowerType._-03K` to select a collider; conditionally call `_-Z2h._-4K` with collider-relative coordinates |
| 14 | 194 | same caller-coordinate query branch as mode 1 |

Key anchors are method-65 instructions 119 (`length = 0`), 137 and 171 (`push`), 152, 192, 211, and 285 (`_-4K`), and 224 (`_-03K`). Both exact callers, methods 46 and 50, pass an existing collection. Method 50 later tests whether a requested entity is in that collection.

This closes only the collection mutation performed by method 65. It does not prove that the collection is freshly empty, identify every entity enumerated inside `_-4K`, or prove the final set after arbitration and admission.

## Bounded origin-state switch

Method 44 `_-M5v._-b5W` reads `_-84Z` at instruction 77, byte PC 137, then executes `lookupswitch` at instruction 82, byte PC 144.

| Modes | Instruction target | Bounded method-44 effect |
| --- | ---: | --- |
| 1, 6, 8, 9, 10, 14 | 314 | write origin coordinates from `_-81i` through fighter coordinate transforms |
| 2 | 84 | when linked `_-3A` is nonnull, write the stored point from its coordinates |
| 3 | 104 | enter the path/collision origin branch, including `_-K2O` |
| 4, 5, 7, 11, 12, 0/default | 83 | no mode-specific origin branch before common processing |
| 13 | 347 | enter the moving-platform origin branch |

These are only mode-specific effects inside method 44. Later writes, reset points, timing, and interaction with collection, collision, arbitration, and admission remain unclosed.

## Fourteen-mode disposition

| Mode | Source spelling families | Method-65 direct/query collection | Method-44 origin branch | Final admitted target set and complete state effects |
| ---: | --- | --- | --- | --- |
| 1 | `PBAoE`, `PBAoEHB`, `Grab`, bare `SmashRelease`, prefixed grab | caller-coordinate query | source actor | **Unknown** |
| 2 | `Ranged`, grab hit/release/check forms | linked entity | linked entity | **Unknown** |
| 3 | `Path`, prefixed `Path` | stored-point query | path/collision | **Unknown** |
| 4 | `Self` | source actor | common path | **Unknown** |
| 5 | `RangedAoE`, `RangedGrab`, `PathExplosion`, prefixed forms | stored-point offset query | common path | **Unknown** |
| 6 | ground-pound/check families | caller-coordinate query | source actor | **Unknown** |
| 7 | `GroundPoundRecover` | truncate only | common path | **Unknown** |
| 8 | `Smash`, `SmashGrab` | caller-coordinate query | source actor | **Unknown** |
| 9 | `MeteorPound` | caller-coordinate query | source actor | **Unknown** |
| 10 | `MeteorPoundRelease` | caller-coordinate query | source actor | **Unknown** |
| 11 | `ThrownItem` | linked entity | common path | **Unknown** |
| 12 | `Nobody`, taunt/team/assist/release/UI forms | truncate only | common path | **Unknown** |
| 13 | `Collider`, prefixed `Collider` | collider-relative query | moving-platform branch | **Unknown** |
| 14 | `Stance` | caller-coordinate query | source actor | **Unknown** |

The table reports exact branch behavior in two methods, not readable-name inference.

## Orthogonal parser-field closure

The analyzer pins the complete exact-QName reference ledger for all 18 fields written by the TargetMethod spelling parser:

| Field | Type | Reference-ledger digest |
| --- | --- | --- |
| `_-H5k` | Boolean | `2d66140d4e3675afef6bbc54515e927121dcdcb30e720207f3d38b93915a7011` |
| `_-cM` | Boolean | `b40b836449efcd5b5d549cfe57f59664fd1dd38126833beef6524ab7d5a1979d` |
| `_-h2x` | Boolean | `697a8dd06642e564485ad370b4f4cc0ab71ca4bc0d0949231505d6487a434abd` |
| `_-Q6d` | Boolean | `25d067961f6137f2f6a11eb28bfa92150cef838ab3b6b941ae5d283264e2b71a` |
| `_-n2R` | Boolean | `834e2014d4b9c1c292c68543d9e0ef9ae8604d7c5ad19f700b55e5e5acf4111f` |
| `_-x4d` | Boolean | `ca8a57e87dce4cbb3bda013924ba0b3419c1f33504a812ecec78751656278ab6` |
| `_-B6R` | uint | `402560b63a18501b3db740e9477d87665c689f0afd41d9437585763c503ed2b9` |
| `_-G67` | Boolean | `1cb6423f0aad9085ed5a9d86119829ea1be39e3d903ddb292d3b85af2676a668` |
| `_-F3s` | uint | `00f9dc1a448297141d006ce770af8c62d5b651df70edf7a39b5c394b403890b5` |
| `_-56a` | Boolean | `89d0ee4b49e12ecb243315a51cc6d51d922c88dd1a2417ae0350d31957f4e2fe` |
| `_-R1L` | Boolean | `11d8aec4e9592f0248bb5ed7a1079d0dc6b54248ce8bf4ab307ae2ba4f5e7959` |
| `_-K4C` | Boolean | `dc35fdddf53f54f40427b2ffb14996e93094d39f0dcfe05b7e9cdfd492eb04b4` |
| `_-R5g` | Boolean | `93d819c535e6ff1b35adc41f5c5b067348e1fe2cf76310accc58826b106c09b3` |
| `_-N3O` | Boolean | `27cbb34886e46b038990f9884775ae3cf1bf2b6f2718c45b4073e6893a4497e1` |
| `_-K1p` | Boolean | `a22d92349fe5ebcd85bf4aa9c4a19cdad2f1d8c7090e0bd4cb33340b4907b6cd` |
| `_-a1E` | Boolean | `1b7e98c09c24471708a954e0e046a553fefac7444a35ad9cb199d381774cb4d7` |
| `_-G4w` | Boolean | `18580351d96bd9ad7ed493ba56aa34ea627d3f81042ffcf88106b1ac655f1162` |
| `_-Q6I` | Boolean | `80e2a2e9f5bf92a0a2f58eb71b02b166d3a8dfc6549f1c48a4954708faeb5e3a` |

A complete reference ledger closes the static exact-QName instruction-reference surface. It does not assign readable semantics or global ordering to those instructions. `_-G4w`, for example, has no exact read outside parser method 6294, but absence of an exact read does not prove absence of copied, reflected, native, or dynamically named behavior.

## Known admission and arbitration order

Prior pinned evidence proves this bounded order:

1. pairwise clashes in method 1474 compare higher `Priority`, then higher source fighter `Strength`, then lower source fighter `Damage`;
2. focused losers receive `_-J2T = true`;
3. only unmarked candidates reach method 1484 `_-S6I`;
4. inside reached method 1484, `CanDamageEveryone` bypasses one same-team comparison but not the remaining method;
5. method 1540 blocks a previously hit target while `priorHitTime + MinTimeBetweenHits > currentTime`; equality is admitted;
6. method 1538 can select an inherited already-hit branch when `InheritAlreadyHit` and surrounding combo conditions hold.

The evidence does not yet connect method 65, collision enumeration, pairwise arbitration, every admission branch, repeat-hit updates, and final collection writes into one complete global order.

## Reachability dependency

Issue 50 proves a bounded source graph, not the exact replay-reachable universe:

- 3,670 non-template runtime PowerTypes;
- 2,253 declarative roots across five source families;
- 3,632 records reached through explicit transitions plus `_TESTFEATURE`;
- 38 records outside that graph, including six with non-default geometry;
- 72 exact calls to central lookup method 6304 across 47 methods.

Replay-producing configurations, match-root executable reachability, dynamic lookup values, and unreachability reasons for the 38 exclusions remain open. Therefore the 44 spelling and 18 field ledgers cannot be partitioned into replay-reachable and unreachable combinations.

## Reproduction

Keep proprietary inputs ignored or outside version control.

```bash
bun install --frozen-lockfile
bun run provenance:offensive-target-modes -- \
  --abc /path/to/hash-pinned/main.abc \
  --power-types /path/to/hash-pinned/Game.swz.38.dat
```

Expected output includes:

- status `bounded-target-collection-closure-with-acceptance-blockers`;
- build `10.09.96325`;
- both exact input hashes;
- 15,010 decoded method bodies and valid branch targets;
- 3,671 records and 44 mapped spellings;
- method-44 and method-65 digests and complete switch maps;
- all 18 parser-field reference digests;
- six explicit acceptance blockers.

A changed ABC, PowerTypes input, spelling set, parser map, target-filter ledger, method body, switch destination, anchor, type, or exact-QName reference ledger is rejected.

## Privacy

No ABC, SWF, SWZ, extracted table, bulk PowerType list, replay, player identifier, credential, proprietary payload, or local input path is committed. The analyzer emits hashes, aggregate counts, method/field identifiers, bounded semantics, ledgers, and anchors. Operating-system read errors may still expose a caller-supplied path.

No environment variables were inspected.

## Acceptance blockers

1. **Reachability:** the exact replay-producing PowerType, mode, and flag universe is not closed.
2. **Final target set:** method 65 closes one supplied direct/query collection, not all collision enumeration or the final admitted set.
3. **Other consumers:** target-mode consumers outside methods 44 and 65 remain unclassified as runtime, loader, presentation, tooling, or gameplay policy.
4. **Parser flags:** all 18 instruction-reference ledgers are pinned, but exact branch outcomes, readable meanings, interactions, and order are not closed.
5. **Admission and state lifecycle:** owner, team, mode-mask, assist, grab, throw, dead, respawn, invulnerability, inherited/repeated collection writes, resets, and global order remain incomplete.
6. **Runtime contract:** no authenticated interpreted-runtime trace covers every admitted mode/flag combination and branch boundary.

The issue acceptance condition is therefore unmet.

## Surfaced route

Use the existing issue-50 route to close replay-producing roots and match executable reachability. Then classify every `_-84Z` and parser-field consumer, connect method-65 collection production through collision enumeration, arbitration, admission, repeat-hit state, and final writes, and authenticate every admitted combination with interpreted-runtime traces. No new ticket was claimed.

## One-line map gist

All 14 modes now have hash-pinned direct/query collection and bounded origin-state switch behavior, and all 18 parser fields have complete instruction-reference ledgers; exact replay reachability, final admitted targets, full flag semantics, global admission/state order, and runtime traces remain open.
