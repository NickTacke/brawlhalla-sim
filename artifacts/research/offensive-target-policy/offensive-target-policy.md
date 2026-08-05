# Offensive target policy in Brawlhalla 10.09.96325

Issue: [Specify offensive target modes and pairwise hit policy](https://github.com/NickTacke/brawlhalla-sim/issues/52)

## Verdict

**Bounded static policy closure, but the ticket acceptance condition is not met.** The pinned `powerTypes` source contains 44 nonempty `TargetMethod` spellings. Static parser method 6294 maps every spelling to one numeric mode plus orthogonal flags. The committed analyzer pins that complete 44-entry map, the relevant exact-QName reference ledgers, and the reached repeat-hit, team, and pairwise-arbitration branches.

The pairwise clash policy is now structurally named and ordered:

1. higher `Priority` wins;
2. if equal, higher source-fighter `Strength` (`_-F5f`) wins;
3. if equal, lower source-fighter `Damage` (`_-V6R`) wins;
4. if all three are equal, neither candidate is marked as the loser before bilateral survivor handling;
5. a losing candidate receives Boolean `_-J2T = true`, and only candidates with `_-J2T == false` continue to hit filter method 1484 `_-S6I`.

The static evidence also proves a strict repeat-hit boundary: for a target already in the hit-time collection and a nonzero `MinTimeBetweenHits`, the candidate remains blocked while `priorHitTime + interval > currentTime`. Equality is admitted by that branch. `CanDamageEveryone` bypasses the reached same-team comparison, but it is not a universal bypass of later policy. `InheritAlreadyHit` selects an inherited combo branch under surrounding conditions.

Universal acceptance remains blocked. The evidence does not prove which source rows are reachable from every replay-producing configuration, close the downstream meaning of every numeric mode and obfuscated orthogonal flag, close every owner/team/mode/assist/grab/dead/invulnerability combination, or provide authenticated interpreted-runtime traces.

No simulator combat policy should be presented as exact from this result alone.

## Evidence grades

- **Proven:** exact hash-pinned AVM2 control flow, typed field identity, branch direction, or complete exact-QName reference ledger.
- **Source-derived:** value or inventory read from the hash-pinned shipped `powerTypes` source.
- **Bounded static closure:** every member of a fixed source set has a verified parser outcome, while runtime reachability or complete downstream behavior remains open.
- **Structural name:** the narrowest readable name proved by exact dataflow into readable fields such as `TargetStrength`, `TargetDamage`, and `Damage`.
- **Unknown:** the inspected evidence does not settle the claim.

Issue 1 was used only as a low-resolution map and was not edited. Issue 34's published bounded closure was the direct starting point. Repository behavior was not treated as reference-game evidence.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Parser, arbitration, filters, typed fighter and candidate fields |
| Sole semantic build string | `10.09.96325` | Reference build identity |
| Extracted `powerTypes` | `715468d8eda8fa2ec3d88a8b5395c076bec937640927909add4745eda2883f27` | 182-column, 3,671-record source |
| Parent `BrawlhallaAir.swf` | `40df9af5308b9a17bf015feb38edec6d9bea57d1cd53078d298aa725acceb8b2` | Same installed build containing the pinned ABC |
| Parent `Game.swz` | `4fc9d70c1c3642b7d3e61c8bb0062bb57c46ea2169276ca1d33616a5843d4aff` | Parent source archive identity |
| Sorted 44-name set | `3975339aa087d48d9490a5a4bc83df5cd78c4eabcf4a9d528bad73e5532e0223` | Complete nonempty `TargetMethod` spelling set |
| Name/count/mode/flag policy map | `e25e9ad789a8982a0becb1d47bddb9de89ec9280ab4c1cb3c27acd59d203cddc` | Complete parser outcome table below |
| Target-filter ledger | `5e40d8e2e8d010e5427dd0437462404c7a771919a9056608e4df3d03c14416ed` | Every row over power identity and four named policy fields |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |

The analyzer decodes all 15,010 method bodies and rejects invalid branch targets, changed source identities, changed ledgers, moved anchors, changed types, and changed arbitration destinations.

## Complete source spelling to parser-state map

Method 6294 reads `TargetMethod` at byte PC 8694. It first recognizes a `SmashRelease` prefix, writes `_-H5k = true`, removes the prefix, and dispatches the remainder. Bare `SmashRelease` maps to numeric mode 1. Unknown remainders reach the literal error `Unknown Target Method Name:`.

The table reports exact parser state, not a claim that the spelling itself fully describes downstream gameplay. Counts are source-record counts, not reachability counts.

| Source spelling | Records | Numeric mode `_-84Z` | Additional writes |
| --- | ---: | ---: | --- |
| `AssistTaunt` | 19 | 12 | `_-K4C`, `_-a1E`, `_-R5g` |
| `AssistTauntRelease` | 9 | 12 | `_-K4C`, `_-a1E`, `_-N3O` |
| `Collider` | 13 | 13 | none |
| `Grab` | 14 | 1 | `_-h2x`, `_-Q6d` |
| `GrabHit` | 24 | 2 | `_-cM`, `_-h2x`, `_-Q6d` |
| `GrabRelease` | 18 | 2 | `_-cM`, `_-n2R` |
| `GroundCheck` | 50 | 6 | `_-x4d`, `_-Q6I` |
| `GroundCheckGrabHit` | 2 | 2 | `_-cM`, `_-h2x`, `_-Q6d`, `_-x4d`, `_-B6R=1`, `_-G67` |
| `GroundPound` | 13 | 6 | none |
| `GroundPoundHB` | 5 | 6 | `_-x4d` |
| `GroundPoundRecover` | 15 | 7 | none |
| `MeteorPound` | 18 | 9 | `_-x4d`, `_-B6R=1` |
| `MeteorPoundRelease` | 43 | 10 | none |
| `Nobody` | 383 | 12 | none |
| `PBAoE` | 380 | 1 | none |
| `PBAoEHB` | 3 | 1 | `_-x4d` |
| `Path` | 50 | 3 | none |
| `PathExplosion` | 130 | 5 | `_-F3s=1`, `_-56a` |
| `Ranged` | 6 | 2 | `_-cM` |
| `RangedAoE` | 50 | 5 | none |
| `RangedGrab` | 1 | 5 | `_-h2x`, `_-Q6d` |
| `Self` | 18 | 4 | none |
| `Smash` | 480 | 8 | none |
| `SmashGrab` | 3 | 8 | `_-h2x`, `_-Q6d` |
| `SmashRelease` | 747 | 1 | `_-H5k` |
| `SmashReleaseCollider` | 19 | 13 | `_-H5k` |
| `SmashReleaseGrab` | 56 | 1 | `_-H5k`, `_-h2x`, `_-Q6d` |
| `SmashReleaseGrabHit` | 92 | 2 | `_-H5k`, `_-cM`, `_-h2x`, `_-Q6d` |
| `SmashReleaseGrabRelease` | 71 | 2 | `_-H5k`, `_-cM`, `_-n2R` |
| `SmashReleaseGroundCheck` | 67 | 6 | `_-H5k`, `_-x4d`, `_-Q6I` |
| `SmashReleaseGroundCheckGrabHit` | 11 | 2 | `_-H5k`, `_-cM`, `_-h2x`, `_-Q6d`, `_-x4d`, `_-B6R=1`, `_-G67` |
| `SmashReleaseGroundPound` | 4 | 6 | `_-H5k` |
| `SmashReleaseGroundPoundHB` | 9 | 6 | `_-H5k`, `_-x4d` |
| `SmashReleasePath` | 56 | 3 | `_-H5k` |
| `SmashReleasePathExplosion` | 82 | 5 | `_-H5k`, `_-F3s=1`, `_-56a` |
| `SmashReleaseRangedAoE` | 175 | 5 | `_-H5k` |
| `SmashReleaseRangedGrab` | 3 | 5 | `_-H5k`, `_-h2x`, `_-Q6d` |
| `Stance` | 24 | 14 | `_-R1L` |
| `Taunt` | 173 | 12 | `_-K4C`, `_-R5g` |
| `TauntRelease` | 199 | 12 | `_-K4C`, `_-N3O` |
| `TeamTaunt` | 34 | 12 | `_-K4C`, `_-K1p`, `_-R5g` |
| `TeamTauntRelease` | 18 | 12 | `_-K4C`, `_-K1p`, `_-N3O`, `_-cM` |
| `ThrownItem` | 55 | 11 | none |
| `UITauntOverride` | 27 | 12 | `_-G4w` |

The parser also contains a `MeteorGrab` branch, but the pinned source has no nonempty `MeteorGrab` value. It is not part of the 44-name source set and is not claimed reachable.

## Pairwise arbitration

Method 1474 `_-Wv._-Z29` pairs opposing candidates and resolves its closed clash branch in this order:

```text
if candidateA.Priority != candidateB.Priority:
  higher Priority survives
else if sourceA.Strength != sourceB.Strength:
  higher Strength survives
else if sourceA.Damage != sourceB.Damage:
  lower Damage survives
else:
  mark neither before bilateral survivor handling
```

Exact anchors:

| Stage | Method 1474 instruction indexes | Byte PCs |
| --- | --- | --- |
| Priority reads and comparison | 747, 750, 799 | 1765, 1773, 1903 |
| Strength reads and comparison | 754, 756, 782 | 1783, 1788, 1858 |
| Damage reads and lower-than branch | 760, 762, 768 | 1798, 1803, 1820 |
| Focused loser writes | 771, 775, 803, 807 | 1827, 1837, 1911, 1921 |
| Bilateral unmarked check and handler | 811, 816, 827 | 1931, 1942, 1968 |
| Survivor check and `_-S6I` call | 857, 924 | 2038, 2236 |

The numeric fields now have readable structural names:

- Fighter `uint _-F5f` is copied by method 2604 directly into readable `TargetStrength`.
- Fighter `Number _-V6R` is copied by method 2604 into `TargetDamage` and by method 2620 into `Damage`.

Candidate `Boolean _-J2T` initializes to false in method 1469. Its complete exact-QName reference set is confined to constructor method 1469 and arbitration method 1474. Method 1474 writes true on loser paths, checks both candidates before bilateral handling, and later calls `_-S6I` only for an unmarked candidate. This supports the structural name `pairwiseLoser`.

The full-tie branch targets instruction 777, then jumps through instruction 792 to instruction 809, skipping the focused loser writes. This is a structural bytecode result. An authenticated runtime trace is still required by the map's exact differential contract.

## Named policy fields

### Priority

`Priority` parses to PowerType `uint _-JB`. The constructor computes the default as `uint(100) >>> 1`, exactly 50. Method 6294 clamps explicit values to 0 through 100. Method 1474 reads it before Strength and Damage.

The pinned source contains nine explicit nonempty values: one 50, one 60, one 80, two 81, three 85, and one 100. The other 3,662 rows use the default. These are inventory counts, not reachability claims.

### CanDamageEveryone

`CanDamageEveryone` parses to Boolean `_-n59`. Method 1484 reads it at byte PC 701 before the reached source/target `_-HL` equality test at PCs 712 through 720. True bypasses that reached same-team comparison.

It does not bypass method 1484 as a whole. The surrounding method continues through owner, mode, sign, actor-state, and later hit processing. Complete readable identities and every combination are not closed, so the safe contract is:

```text
CanDamageEveryone == true
  -> bypass this same-team exclusion branch
  -> continue through remaining policy
```

The source has 86 explicit true values, three explicit false values, and 3,582 absent values.

### MinTimeBetweenHits

`MinTimeBetweenHits` parses through an unsigned accessor to PowerType `uint _-s2L`. Method 1540 first tests whether the target is already present. For a present target and nonzero interval, instruction indexes 179 through 192 implement:

```text
blocked = priorHitTime + MinTimeBetweenHits > currentTime
```

Consequences of this branch:

- equality is admitted;
- a positive interval reopens the target at `currentTime >= priorHitTime + interval`;
- zero does not enter the timed replacement branch, so the existing already-hit result remains in force unless another surrounding condition changes it.

The source has four ordinary numeric nonempty cells (`0`, `2`, `2`, `7`) and one literal `true` cell. The static analyzer records that anomaly but does not execute the source accessor, so the normalized numeric value of textual `true` remains unknown.

### InheritAlreadyHit

`InheritAlreadyHit` parses to Boolean `_-46W`. Method 1538 reads it at byte PC 462 inside a combo-selection branch and can return the existing source power's already-hit selector when the surrounding phase conditions hold.

The evidence does not yet prove whether later state is aliased or copied, all reset points, simultaneous-phase interaction, or the exact global order against method 1540's repeat-time update. Those remain blockers.

## Exact-QName closure

The analyzer hashes every exact-QName reference in all 15,010 decoded method bodies:

| Field | Type | Reference-ledger SHA-256 |
| --- | --- | --- |
| Target mode `_-84Z` | `uint` | `e357e0c07fb11e8cb9b50bb87a45497e0b15079d22568a4ffb998a2026e77d50` |
| SmashRelease flag `_-H5k` | `Boolean` | `2d66140d4e3675afef6bbc54515e927121dcdcb30e720207f3d38b93915a7011` |
| `CanDamageEveryone -> _-n59` | `Boolean` | `3074e01ec29bd8658b491ef87ff7dd3d977f4d495371c5ea5687169529ce9a8e` |
| `MinTimeBetweenHits -> _-s2L` | `uint` | `17257565ce788c9f77089ccf9b57f7630769f81f2e16344254572e614cdade0a` |
| `InheritAlreadyHit -> _-46W` | `Boolean` | `f935d99d67af9f74d03dd4cd79040ce7a0691fa816105550aa1a68291a21a6b2` |
| `Priority -> _-JB` | `uint` | `3dbd3b517ebf4f5a452bd50f2942f4b5ca4c00f6d89ae122108fe658ecfed5fb` |
| Strength `_-F5f` | `uint` | `538d6989be9a7cfae990a0b006cc1dd45a17e3bedce2bcfca466968b2212c812` |
| Damage `_-V6R` | `Number` | `1a87f8c4e09c3497481b5b84020de5f99200bca44ebd59df2ee9462a1533f8dd` |
| Pairwise loser `_-J2T` | `Boolean` | `2f641c95f505855ef2a20483050749f3e6fcca3f10072f138c28454772e3896b` |

## Reproduction

Keep proprietary inputs under ignored paths or outside the repository. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:offensive-target-policy -- \
  --abc /path/to/hash-pinned/main.abc \
  --power-types /path/to/hash-pinned/Game.swz.38.dat
```

Useful bounded view:

```bash
bun run provenance:offensive-target-policy -- ... \
  | jq '{status, identity, source, arbitration, filters, blockers}'
```

Successful output reports `bounded-static-policy-closure-with-acceptance-blockers`, build `10.09.96325`, 15,010 decoded methods, valid branch targets, 3,671 source records, 44 mapped spellings, and five explicit blockers.

The command emits no ABC bytes, source rows, power names, local paths, replay bytes, player data, or private corpus content. Operating-system errors can still reveal a caller-supplied path.

## Acceptance blockers

1. **Reachability:** no closed root proves which of 3,671 source rows and 44 source spellings are reachable from every replay-producing configuration. Existing ticket [Prove the reachable PowerType phase universe](https://github.com/NickTacke/brawlhalla-sim/issues/50) is the direct prerequisite.
2. **Downstream target semantics:** the exact parser map is closed, but every consumer and branch outcome of numeric mode `_-84Z` and all orthogonal flags is not.
3. **Complete team and state matrix:** the reached same-team bypass is exact, but owner, mode-mask, assist, grab, throw, dead, respawn, and invulnerability combinations are not closed.
4. **Inherited-state lifecycle:** `InheritAlreadyHit` reaches a combo selector, but copy/alias/reset semantics and ordering against repeat-hit updates are not closed.
5. **Runtime contract:** no authenticated interpreted-runtime trace covers each reachable mode, all arbitration branches, repeat-hit equality, or the team/mode/invulnerability matrix.

These are missing proof obligations, not inferred reference behavior. The issue must remain open.

## Surfaced route

The result makes these follow-ups precise:

- **Close downstream consumers for the 14 numeric target modes and parser flags:** acceptance requires a complete exact-QName consumer ledger and branch decision table for every mode and flag reached by issue 50's universe.
- **Close offensive team, mode, and invulnerability admission:** acceptance requires one ordered control-flow graph from candidate admission through owner/team/mode/assist/grab/dead/invulnerable gates and state writes.
- **Close inherited and repeated-hit state lifecycle:** acceptance requires exact collection identity, copy/alias behavior, updates, resets, zero behavior, equality behavior, and global order.
- **Capture authenticated target-policy and arbitration traces:** acceptance requires unequal-priority, unequal-strength, unequal-damage, exact-tie, timed-repeat equality, same-team override, and invulnerability matrix observations after oracle trust gates exist.

No new tracker ticket was claimed, and issue 1 was not edited.

## One-line map gist

All 44 source TargetMethod spellings now have a hash-pinned parser-state map, and clashes resolve by higher Priority, higher source Strength, then lower source Damage with explicit loser marking; reachable downstream mode semantics, full team/state ordering, inherited-hit lifecycle, and authenticated traces still block universal acceptance.
