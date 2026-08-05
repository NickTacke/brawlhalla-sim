# Patch category constructors and post-load resolution in Brawlhalla 10.09.96325

Issue: [Close patch category constructors and post-load resolution](https://github.com/NickTacke/brawlhalla-sim/issues/57)

## Verdict

**The ticket's positive acceptance is not met.** Static analysis closes a useful loader skeleton: thirteen hash-pinned `Game.swz` category callbacks, their row constructors, source-ordered row iteration, category insertion tails, three nested helper families, and the exact global post-load resolver order. It does not close every normalized field, every constructor/helper write, callback execution order, or the complete gameplay-relevant category universe.

The correct disposition is to keep the ticket open. The evidence below is a bounded advance, not permission to label patch objects canonical, complete, or source-equivalent.

Confidence is **high** for the pinned identities and exact instruction order below, and **high** that a field-complete provenance claim would exceed the evidence.

## Map gist

Build 10.09 fixes thirteen patch row roots and an ordered global post-load pass, but canonical patch objects still need complete field/default provenance, callback execution order, and a trustworthy typed-object oracle.

## Evidence grades

- **Proven static:** exact instructions, control flow, source bytes, or whole-method identities in the hash-pinned ABC.
- **Observed source:** a property of a hash-pinned shipped entry without a complete loader-output claim.
- **Closure skeleton:** an exact root, constructor, helper, or post-load method identity whose complete field semantics remain open.
- **Unknown:** the inspected primary evidence cannot support the claim.

No game binary, archive, decrypted entry, replay, bulk normalized table, account data, or local path is committed.

## Hash-pinned identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Category callbacks, constructors, insertion tails, post-load passes |
| Sole semantic build string | `10.09.96325` | Build identity |
| `Game.swz` | `4fc9d70c1c3642b7d3e61c8bb0062bb57c46ea2169276ca1d33616a5843d4aff` | Parent archive identity inherited from patch-snapshot closure; not re-read by this analyzer |
| Exact method identity ledger | `aa5c0fd296146735db9bbe60845d2827af60965699ea859717d96d92aa93576c` | 71 method code and decoder-semantic identities |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |

The analyzer decodes all 15,010 method bodies, validates every branch target, requires the exact ABC/build, and recomputes all thirteen source-entry hashes inherited from [Prove patch-data loader normalization and defaults](https://github.com/NickTacke/brawlhalla-sim/issues/35).

## Category closure skeleton

Each load method initializes category storage, obtains the source iterator, calls the row method once for each `next()`, and loops while `hasNext()` is true. This proves source row order inside each callback. It does not prove when the callback runs relative to another callback.

| Category | Source entry SHA-256 | Loader class | Record class / constructor | Load | Row | Resolution methods |
| --- | --- | ---: | --- | ---: | ---: | --- |
| Dodge | `Game.swz.11.xml` `a0c99d...fa63e4` | 138 | 138 / 2664 | 2671 | 2672 | none located |
| Game mode | `Game.swz.17.xml` `cdc140...741e` | 184 | 184 / 3728 | 3731 | 3732 | none located |
| Hero | `Game.swz.23.xml` `1a9c27...920` | 217 | 217 / 4111 | 4122 | 4123 | 4125 global |
| Hurtbox | `Game.swz.24.dat` `358aac...3333` | 237 | 237 / 4649 | 4654 | 4655 | none located |
| Item spawn rate | `Game.swz.25.xml` `e9d054...aa4` | 255 | 255 / 4804 | 4808 | 4809 | none located |
| Item spawn rules | `Game.swz.26.xml` `f1ee75...391c` | 256 | 256 / 4814 | 4817 | 4818 | 4819 global |
| Item | `Game.swz.27.dat` `d68102...f3e` | 257 | 257 / 4823 | 4833 | 4834 | 4839 global, helper 4840 |
| Level set | `Game.swz.30.xml` `e68703...54dff` | 275 | 275 / 5094 | 5097 | 5098 | 5099 global |
| Power | `Game.swz.38.dat` `715468...f27` | 342 | 342 / 6270 | 6293 | 6294 | 6293 internal, 6301 global |
| Power swap | `Game.swz.39.xml` `a6eb10...6b6f` | 341 | 339 (`_-03C`) / 6243 | 6263 | 6264 | 6267 global |
| Rune | `Game.swz.42.xml` `13c32d...e910` | 393 | 393 / 7103 | 7107 | 7108 | 7115 global |
| Scoring | `Game.swz.43.xml` `fd9efd...2f7d` | 406 | 406 / 7274 | 7278 | 7279 | 7281 global |
| Stat ladder | `Game.swz.52.xml` `074472...692` | 629 | 629 / 11655 | 11658 | 11659 | none located |

The table names only methods proved to participate in this skeleton. Other methods on the same classes may be lookup, validation, derivation, or runtime behavior; class membership alone does not make them post-load methods.

## Logical-root registration is not execution order

Method 849 registers loader callbacks with resource manager class 359 `_-41A`. The ticket categories appear in this exact registration order among 61 logical roots:

```text
DodgeTypes
StatTypes
HurtboxTypes
PowerSwapTypes
GameModeTypes
HeroTypes
ItemSpawnRateTypes
ItemSpawnRuleSetTypes
ItemTypes
LevelSetTypes
PowerTypes
RuneTypes
ScoringTypes
```

This order is registration only. Resource dispatch method 6555 looks up a callback by the incoming logical root and invokes it. Static method 849 therefore cannot prove archive-arrival or callback execution order. A canonical loader must not treat the registration list as a load schedule.

The row iterators do prove order within one delivered source. All thirteen callback roots call their row method before `hasNext()` branches to the next row.

## Category insertion tails

The category tails are not uniform. Diagnostics generally do not reject the object, but vector/map order varies by category. The analyzer fixes each listed opcode ordinal and byte PC plus the whole-method identity. The logical map/vector labels below are manual instruction interpretation; dynamic map writes do not carry a destination QName in the `setproperty` operand itself.

| Category | Observed mutation order after row normalization |
| --- | --- |
| Dodge | ID map overwrite, main-vector append, optional special-vector append |
| Game mode | main-vector append, ID map overwrite, name map overwrite |
| Hero | name map overwrite, ID map overwrite, main-vector append, secondary weapon-pair index write |
| Hurtbox | ID map overwrite, name map overwrite, main-vector append |
| Item spawn rate | main-vector append, ID map overwrite, name map overwrite |
| Item spawn rules | main-vector append, ID map overwrite, name map overwrite |
| Item | main-vector append, ID map overwrite, name map overwrite, conditional secondary index write |
| Level set | main-vector append, name map overwrite, ID map overwrite |
| Power swap | source-ordered vector append only in the row method |
| Power | ID map overwrite, name map overwrite, main-vector append, conditional secondary-vector append |
| Rune | overwrite the hero-local rune index; no global append tail in method 7108 |
| Scoring | ID map overwrite, name map overwrite, main-vector append, conditional secondary-vector append |
| Stat ladder | name map overwrite, main-vector append |

Reserved-key and ordinary-key branches use different `StringMap` instructions but preserve the same logical write position. Whole-method identities and branch-target checks protect both paths.

The prior issue 35 evidence remains authoritative for duplicate diagnostics and last-write-wins map behavior. This report adds the per-category order distinction; it does not claim mutation-oracle coverage for synthetic duplicates.

## Exact global post-load order

Method 3452 on class 164 `_-u16` is the global post-load pass. Method 3218 invokes it at instruction 387, byte PC 1,035. Among the categories in this ticket, method 3452 executes these calls in exact instruction order:

1. `LevelSetType._-Z2` (5099)
2. `ScoringType._-M3G` (7281)
3. `HeroType._-41C` (4125)
4. `ItemType._-v5C` (4839), which can call helper 4840
5. `PowerType._-J31` (6301)
6. `PowerSwapType._-N61` (6267)
7. `RuneType._-G12` (7115)
8. `ItemSpawnRuleSetType._-g37` (4819)

Other category families execute between several listed calls. The analyzer validates the exact class QName, trait QName, ordinal, and byte PC instead of treating the eight calls as contiguous.

The ordered calls and exact ownership are analyzer-checked. The semantic consequences below are manual interpretation of the same whole-method-pinned instructions.

Important consequences:

- Power method 6293 is both the Power callback root and an immediate same-category resolver. It parses all rows, then resolves named combo/origin/release/wall/interrupt relations and required named powers before returning.
- Level-set membership resolves before scoring resolves its level-set and item-rule references.
- Hero post-load executes before Item post-load.
- Item post-load executes before the later PowerSwap and ItemSpawnRuleSet passes.
- Registration order and global post-load order are separate mechanisms.

This proves order, not successful resolution for every shipped or mutated reference.

## Nested helper families

Three non-container helper families are directly constructed by the closed row methods:

| Helper | Class | Constructor | Static boundary |
| --- | ---: | ---: | --- |
| `CustomArt` | 116 | 2155 | helper 2158; constructed four times by Item row method 4834 |
| Power cast/swap object `_-03C` | 339 | 6243 | methods 6245-6254; constructed by Power and PowerSwap rows |
| Hero nested record `_-5R` | 370 | 6723 | methods 6725-6727; constructed by Hero row method 4123 |

Their code and semantic hashes are included in the 71-method identity ledger. Standard `Vector`, `Array`, `IntMap`, and `StringMap` construction is also present but is not relabeled as a game-specific helper.

Identity closure is not field closure. In particular, `_-03C` owns 624 instructions in method 6253 alone, and Item/Power row methods construct many ordered vectors. The analyzer does not pretend that hashing those methods maps every write to a source field or default.

## Why field-complete acceptance remains unmet

The acceptance sentence requires every normalized field to resolve to a hash-pinned source or deterministic default. The available evidence does not satisfy that requirement:

1. **No complete field ledger exists.** Item row method 4834 has 1,745 instructions, Power row method 6294 has 6,928, Power callback/post-load method 6293 has 1,875, and Scoring row method 7279 has 1,559. Their whole-method hashes detect drift but do not establish field provenance.
2. **Constructors are not semantically closed.** Except for complete `ItemSpawnRateType` inheritance from issue 35, constructor writes have not been converted into an exact QName/type/default matrix.
3. **Nested helper writes remain broad.** `CustomArt`, `_-03C`, and `_-5R` are located and pinned, not mapped field-for-field.
4. **Callback execution order remains unproved.** Method 849 registers callbacks; method 6555 dispatches by arriving logical root. No static schedule proves when every source callback runs.
5. **The category universe is still a candidate.** Patch-snapshot closure identified these gameplay categories from source and replay dependencies, but necessary-and-sufficient gameplay reachability remains open.
6. **Level geometry is separately unresolved.** `Dynamic.swz` `LevelDesc` is owned by [Locate and prove the Dynamic LevelDesc loader](https://github.com/NickTacke/brawlhalla-sim/issues/55), not silently absorbed here.
7. **No trustworthy typed-object oracle exists.** Static identities cannot confirm complete final objects, vectors, maps, reference failures, and defaults against the reference loader.

Therefore no `normalizedSha256`, canonical field encoding, or complete provenance leaf is emitted.

## Acceptance matrix

| Requirement | Disposition |
| --- | --- |
| Close relevant category roots | Partial: thirteen exact `Game.swz` roots; complete gameplay universe unproved |
| Close constructors and nested helpers | Partial: identities and direct constructions pinned; field semantics incomplete |
| Close post-load mutations | Partial: exact global order and key resolver methods pinned; complete writes/failures incomplete |
| Prove source order | Proven within each callback; callback execution order unproved |
| Prove insertion order | Proven statically for the thirteen row tails |
| Map every normalized field to source/default | Unmet |

## Reproduction

Keep proprietary inputs under ignored paths. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:patch-postload-resolution -- \
  --abc /path/to/hash-pinned/main.abc \
  --source-dir /path/to/hash-pinned/decrypted
```

Expected terminal status:

```json
{
  "decodedMethodBodies": 15010,
  "branchTargetsValid": true,
  "status": "partial-static-closure"
}
```

The command validates the ABC/build, all thirteen source hashes, 71 method identities, exact loader/row/record ownership, exact callback and resolver QNames, `next()`/row/`hasNext()` loop-back structure, logical-root registration anchors, insertion opcodes, nested-helper ownership and construction sites, method 3218 dispatch, and method 3452 post-load order. Successful JSON contains no source payload, normalized table, local path, replay, or account data. Operating-system errors can still expose caller-supplied paths.

## Surfaced route

No new issue was created or claimed. The shortest honest route to this ticket's positive acceptance is:

1. use the actual level loader from **Locate and prove the Dynamic LevelDesc loader** to bound the separate geometry family;
2. use **Build a privacy-safe patch-loader mutation oracle** to capture complete typed objects, ordered vectors/maps, branch outcomes, and reference failures;
3. use **Prove AIR numeric parse edge cases for patch data** for exact numeric defaults and coercions;
4. resume this ticket with an automated source-field/default-to-QName/type ledger for every constructor, nested helper, row write, and post-load mutation;
5. compare that ledger and final canonical object bytes against the oracle before emitting normalized provenance leaves.

This route keeps decisions in their owning tickets and does not modify the canonical map.

## Blockers

- Complete normalized field/default provenance is absent.
- Callback execution order is not statically closed.
- Complete gameplay-relevant category reachability is not proven.
- The level-data loader and trustworthy mutation oracle remain separate open prerequisites.
- Stable normalized provenance leaves cannot yet be produced.

## Related reviewed evidence

- [Patch loader defaults and the original bounded gap](https://github.com/NickTacke/brawlhalla-sim/blob/bdc8b2c4caecc4b3ebae84ea845a6c0387a4500a/artifacts/research/patch-loader-defaults/patch-loader-defaults.md)
- [Patch snapshot closure](https://github.com/NickTacke/brawlhalla-sim/blob/629a95c26a3d2a7b1fd51d43a16d0f7cbe02e996/artifacts/research/patch-snapshot-closure/patch-snapshot-closure.md)
- [AVM2/AIR deterministic native semantics](https://github.com/NickTacke/brawlhalla-sim/commit/ca39e25)
