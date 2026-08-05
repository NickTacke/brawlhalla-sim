# State-4 game-settings word 14 in Brawlhalla 10.09.96325

Issue: [Recover format-268 game-settings word 14](https://github.com/NickTacke/brawlhalla-sim/issues/21)

## Verdict

**Proven structural semantic name: `disabledGadgetsMask`.** State-4 game-settings word 14 (`_-I37._-Ii`) is a `uint` exclusion mask over the selected `ItemSpawnRuleSet`'s ordered `GadgetList`. Bit `i = 1` removes gadget-list entry `i` from the active gadget vector; bit `i = 0` leaves it eligible. Indices are zero-based. Value `0` is the normal default and means no listed gadget is disabled.

The parser name `customGadgetSelection` should not be treated as primary evidence. It obscures both the value shape and polarity: this is not one selected gadget ID. It is a bit mask whose set bits exclude entries. `disabledGadgetsMask` is an evidence-derived structural name, not a recovered unobfuscated source identifier.

This result closes the requested semantic name, storage and validation domains, default behavior, writer-reader roundtrip, and gameplay consumer. Confidence is **high** for those structural claims. No authentic replay in the reviewed 12-file corpus has a nonzero value, so authentic non-default production frequency and server-side acceptance remain unobserved.

## Evidence grades

- **Proven:** exact typed-trait control/dataflow in the hash-pinned ABC, exact source parsing in the same ABC, a hash-pinned shipped source value, or an authentic replay observation.
- **Structural name:** the narrowest semantic name uniquely supported by proven bit polarity and consumer behavior when no readable declaration names the trait itself.
- **Unknown:** inspected primary evidence does not settle the claim.

Repository parser names and prior research were locators only. Claims below derive from ignored user-owned primary inputs and the committed fail-closed analyzer.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Typed trait, serializers, validators, UI producers, active-list builder, spawn consumer |
| Sole semantic build string in that ABC | `10.09.96325` | Build identity |
| Parent `Game.swz` | `4fc9d70c1c3642b7d3e61c8bb0062bb57c46ea2169276ca1d33616a5843d4aff` | Parent archive identity recorded by the reviewed corpus manifest |
| Extracted `Game.swz.26.xml` | `f1ee7530c4e0693232c8a4fdc93163f676691259dc2da9e83bc332cf21b3391c` | `ItemSpawnRuleSetTypes`, including ordered `GadgetList` values |
| Authentic format-268 manifest | `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac` | Exact 12-replay cohort and per-file hashes |
| ABC decoder | `abc-disassembler` commit `ad9714d` pinned by `bun.lock` | Instruction and byte-PC decoding |
| Repository source base | commit [`14928327bbe24e3b3ae202cd25be1c97fa5d5ff0`](https://github.com/NickTacke/brawlhalla-sim/tree/14928327bbe24e3b3ae202cd25be1c97fa5d5ff0) | Parser hypothesis and committed source baseline |

The analyzer decodes all 15,010 ABC method bodies, rejects any invalid branch target, requires the exact ABC/source/manifest identities, verifies all 12 replay hashes, and fails if the exact QName reference ledger changes.

## Typed field and readable naming closure

Class 187 `_-I37` is the normalized game-settings object. Its instance trait `_-Ii` is a slot typed as AVM2 `uint`. The trait has no explicit constant initializer. Constructor method 3744 initializes only the two percentage defaults and does not override `_-Ii`.

Method 3746 `toString` labels the other fixed settings with strings such as `ItemSpawnRuleSetID:`, `WeaponSpawnRateID:`, and `GadgetSpawnRateID:`. It contains no exact reference to `_-Ii` and supplies no label for word 14. Therefore a literal original field name is not recovered from that method.

The semantic closure comes from exact typed dataflow:

1. Method 4818 PC 143 recognizes the shipped `GadgetList` source element. Method 4819 PC 492 resolves its ordered strings to the typed `Vector.<ItemType>` field `_-E2c._-W4N`.
2. Method 8530 PC 140 declares the readable UI/settings enum `Game_GadgetsSelections` with index 18.
3. The index-18 cases in methods 8597 and 8617 read and mutate exact trait `_-Ii`. Method 8597 reads the current mask at PC 1327. Method 8617 PCs 1715-1756 toggles `1 << selectedIndex` in that mask.
4. Method 8612 PC 1371 separately associates the lobby enum `Lobby_BanGadgets` with `UI_GameSettings_Ban_Gadgets`. This supports the exclusion interpretation, but it is not treated as the trait's recovered declaration name.
5. Match item-list builder method 4779 PCs 307-449 uses each bit to decide whether the corresponding gadget entry is copied into the active gadget vector. The direct gameplay chain below consumes that filtered vector.

These edges establish the narrower and polarity-correct name `disabledGadgetsMask`. The readable `Game_GadgetsSelections` label describes the UI control, while the actual stored value is the control's exclusion mask.

## State-4 writer-reader roundtrip

State-4 writer method 6519 emits state `4`, then at PC 91 calls settings method 3748 `_-33g`. Method 3748 writes 15 consecutive 32-bit words. Its exact `_-Ii` read is PC 168, in position 14 between gadget spawn rate and variation, and the value goes to the same `_-S2c` 32-bit writer used by the other fixed words.

Reader method 6510 enters its state-4 branch and at PC 773 calls settings reader method 3759 `_-N4v`. Method 3759 reads the same 15 `uint` words in the same order and assigns the fourteenth to exact `_-Ii` at PC 178. Thus the reference roundtrip is:

```text
settings._-Ii
  -> method 3748, 32-bit write at word 14
  -> method 6519 state-4 payload
  -> method 6510 state-4 dispatch
  -> method 3759, 32-bit read and assignment
  -> settings._-Ii
```

Alternate fixed-settings pair 3747/3758 does the same field-position roundtrip through another stream API: writer reference PCs 177/181 and reader reference PCs 181/192. Copy method 3790 preserves the value from a source settings object at PCs 162-171.

There is no reader-side numeric range check beyond conversion to `uint`. The serialized storage domain is therefore every 32-bit unsigned pattern, `0` through `0xffffffff`.

## Bit layout, allowed values, and validation

Let:

- `M` be `disabledGadgetsMask`;
- `G` be the selected item-spawn rule set's resolved ordered `GadgetList`;
- `N = G.length`;
- `L_N = (1 << N) - 1` as computed by the reference method for the active low-bit mask.

### Gameplay interpretation

Builder method 4779 receives `(ruleSet, weaponSpawnRate, gadgetSpawnRate, M)` from methods 4771, 4774, 4780, and 6884. On its gadget pass it sets the current mask to `M`. For every zero-based list index `i`, PCs 307-449 apply:

```text
if ((M & (1 << i)) == 0) activeGadgets.push(G[i])
else                       skip G[i]
```

Only the low `N` bits affect that rule set. Higher bits survive serialization and copying but are inert for this consumer.

### Reference validation

Settings validator method 3783 PCs 19-141 implements the exact conditional policy. Method 7279 PC 1198 parses readable source element `AlwaysEquipItem`; when its value is nonempty, method 7279 sets scoring flag `_-A1Y`.

Method 3783 returns:

1. `false` if the scoring type is absent;
2. `true` if the scoring type has no `AlwaysEquipItem`, regardless of `M`;
3. `true` if `M == 0`;
4. otherwise `false` if the rule set or its typed gadget vector is absent;
5. otherwise `(M & L_N) != L_N`.

For an always-equip scoring type, a nonzero mask may not disable every active gadget entry. High bits are not rejected. For other scoring types, this validator imposes no mask restriction. This is more precise than describing an unqualified `0..(2^N - 1)` range.

### UI-produced values

Method 8617 provides two concrete non-default producers:

- PCs 1715-1756 toggle `1 << selectedIndex` with XOR for the ordinary multi-selection control.
- PCs 851-976 implement random/single always-equip behavior. The single-item path writes `~(1 << selectedIndex)`, disabling every represented entry except the chosen one. The random path resets the mask to zero.

The bitwise-complement path proves that high set bits are intentional UI output, not necessarily malformed data. Consumers still consult only indices present in `G`.

### Reviewed shipped and corpus values

The reviewed `ItemSpawnRuleSetTypes` source contains 26 rule-set records and no `GadgetList` longer than 15 entries. The 12 authentic replays all use rule-set ID 2, whose shipped ordered `GadgetList` has seven entries. All 12 store word 14 as `0`. Those observations prove the default cell only; they do not bound other authentic configurations.

## Default behavior and overrides

**Default is `0`, meaning every gadget in the selected rule set remains eligible.** Three direct edges support this:

1. Game-mode-to-settings method 3766 explicitly writes zero to `_-Ii` at PC 132 when deriving normalized settings from a mode object.
2. UI method 8617's random-selection branch explicitly resets the field to zero within PCs 851-976.
3. Every replay in the exact 12-file reviewed cohort has word 14 equal to zero.

Copy method 3790 retains a prior value. Settings readers 3758/3759 override the default with the stored word. UI method 8617 overrides it through the random/single and per-gadget branches above. No authentic nonzero replay is present to observe a persisted override, but the static UI producer, 32-bit writer, paired reader, and consumer form a complete non-default dataflow in the pinned executable.

## Gameplay consuming control flow

The primary gameplay consumer is the match item-spawn chain, not merely the UI:

1. Methods 4771 PC 53, 4774 PC 108, 4780 PC 98, and 6884 PC 120 pass `settings._-Ii` as the fourth argument to class 253 method 4779 `_-33T` together with the selected item-spawn rule set and spawn rates.
2. Method 4779 PCs 307-449 builds active weapon and gadget vectors. The mask is zero on the weapon pass and `M` on the gadget pass. A set gadget bit takes the skip branch; a clear bit pushes the `ItemType` into active gadget vector `_-W4N`.
3. During item-spawn processing, method 4754 PCs 494-576 passes the filtered `_-W4N` vector to method 4791 `_-Fp`.
4. Method 4791 PCs 0-61 selects an `ItemType` from that vector through method 4783 `_-ME`; a null selection returns without creating an item, while a non-null selection calls method 4762 `_-I3c` to create the spawn result.

Therefore changing one relevant bit changes the candidate vector that reaches item selection and item creation. This is a consuming gameplay control-flow branch.

Static method 5573 supplies an independent confirming consumer at PCs 74-185. It loops over the same resolved gadget list, tests `M & (1 << i)`, and skips processing the gadget's power when the bit is set. This matches the exclusion polarity established by the active-list builder.

## Complete exact-trait reference disposition

The analyzer keys references by the trait's exact QName namespace/name pair, not by string coincidence. It finds exactly 30 QName-bearing instructions across 14 methods. `findproperty` plus `getproperty`/`initproperty` pairs are one logical access where shown.

| Method and owner | Exact reference PCs | Disposition |
| --- | --- | --- |
| 3747, class 187 `_-B5g` | 177, 181 | Alternate fixed-settings writer, word 14 |
| 3748, class 187 `_-33g` | 164, 168 | Replay bitstream settings writer, word 14 |
| 3758, class 187 `_-pE` | 181, 192 | Alternate fixed-settings reader, word 14 |
| 3759, class 187 `_-N4v` | 168, 178 | Replay bitstream settings reader, word 14 |
| 3766, class 187 `_-t6` | 126, 132 | Mode-derived default override to zero |
| 3783, class 187 `_-U53` | 36, 40, 128, 132 | Always-equip mask validation |
| 3790, class 187 `_-Z5S` | 162, 167, 171 | Settings copy |
| 4771, class 253 `_-H6w` | 53 | Pass to active item-list builder |
| 4774, class 253 `_-K1f` | 108 | Pass to active item-list builder |
| 4780, class 253 `_-h2u` | 98 | Pass to active item-list builder |
| 5573, class 296 static `_-i1F` | 78 | Gadget power filtering branch |
| 6884, class 380 `_-V4Z` | 120 | Pass to active item-list builder |
| 8597, class 472 `_-66t` | 542, 1327 | Always-equip and ordinary UI display state |
| 8617, class 472 `_-CC` | 889, 909, 960, 967, 1737, 1744 | UI reset, single-item complement, and bit toggle writes |

There are no other exact QName references in the 15,010 decoded bodies. In particular, method 3746 has none. This complete disposition is limited to the pinned ABC identity; it is not a claim about other builds.

## Reproducible validation

Keep all proprietary inputs under ignored paths or outside the repository. From the checkout root:

```bash
bun run provenance:game-settings-word-14 -- \
  --abc artifacts/research/brawlhalla-physics/main.abc \
  --manifest artifacts/replay-corpus/10.09.96325/manifest.json \
  --item-spawn-rules artifacts/research/brawlhalla-physics/decrypted/Game.swz.26.xml
```

Useful bounded views:

```bash
bun run provenance:game-settings-word-14 -- ... | jq '.identity, .field, .anchors'
bun run provenance:game-settings-word-14 -- ... | jq '.exactTraitReferences, .reviewedCorpus'
```

Successful output reports `proven-for-reviewed-inputs`, 15,010 decoded bodies, valid branch targets, 30 exact-trait instructions in the 14 methods above, 12 fixtures, the sole observed value `[0]`, and rule-set ID 2 with seven gadgets. It emits no replay bytes, names, player IDs, fixture filenames, local paths, or source XML payload. Operating-system errors can still reveal a user-supplied path.

The command fails closed on a changed ABC, manifest, fixture, item-spawn source, build string, branch target, typed trait definition, reference method/count, source label, or corpus count.

## Confidence and residual gaps

### High-confidence conclusions

- Semantic structural name: `disabledGadgetsMask`.
- Storage: unsigned 32-bit state-4 word 14.
- Polarity: a set bit excludes the gadget at the same zero-based `GadgetList` index.
- Default: zero, with all listed gadgets eligible.
- Reference validation: exact conditional policy in method 3783.
- Non-default producers: per-gadget XOR and always-equip single-item complement in method 8617.
- Gameplay effect: filtered active gadget vector reaches item selection and creation.
- Completeness: all exact QName references in the pinned ABC are disposed above.

### Residual uncertainty

1. **Original unobfuscated declaration name:** unknown. No readable source declaration labels `_-Ii`, and method 3746 omits it. `disabledGadgetsMask` is the proven structural name.
2. **Authentic nonzero fixture:** absent. The reviewed cohort proves only value zero. A hash-attested nonzero build-10.09 replay would add production-frequency evidence but is not needed to establish the static meaning.
3. **Server and cross-field policy:** unknown. Method 3783 proves the inspected client validator, not every server-side or UI reachability rule.
4. **Other builds:** out of scope. Bit ordering, lists, and validators are proven only for ABC `9fe9...ba2d` and the pinned shipped source.

## Related reviewed evidence

- [Format-268 replay semantics at commit `327166d`](https://github.com/NickTacke/brawlhalla-sim/blob/327166d3f9a09f0d9a5c519b58039e36ea4f835f/artifacts/research/replay-format-268/format-268-semantics.md)
- [Replay-producing match universe at commit `da6b4f0`](https://github.com/NickTacke/brawlhalla-sim/blob/da6b4f09260205d15b19cf3924777e0ed3a7ee03/research/wayfinder/replay-producing-match-universe.md)
- [Patch-snapshot closure at commit `629a95c`](https://github.com/NickTacke/brawlhalla-sim/blob/629a95c26a3d2a7b1fd51d43a16d0f7cbe02e996/artifacts/research/patch-snapshot-closure/patch-snapshot-closure.md)
