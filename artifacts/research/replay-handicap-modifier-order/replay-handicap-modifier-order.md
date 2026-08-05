# Replay handicap modifier order in Brawlhalla 10.09.96325

Issue: [Determine replay handicap modifier order](https://github.com/NickTacke/brawlhalla-sim/issues/26)

## Verdict

**The second handicap word is damage dealt percent, and the third handicap word is damage taken percent.** Both are unsigned integer percentage points. For a nonzero serialized value `p`, fighter construction converts the word to the AVM2 `Number` multiplier `p / 100`. Thus `50 -> 0.5`, `100 -> 1`, and `150 -> 1.5`. A missing handicap object or an individual zero word also produces multiplier `1`.

One-line replay map gist:

```text
handicap payload = presence bit, word 1, damageDealtPercent, damageTakenPercent
```

The normal roster assembly materializes `100` for each modifier when the modifier state gate is false or the configured value is zero. Therefore `100` is the normal serialized default, `1` is the corresponding runtime multiplier, and raw `0` is a supported fallback sentinel with the same runtime multiplier as `100`.

The proof is high confidence for field order, integer percentage units, initialized/default behavior, replay roundtrip, and runtime multiplication in the pinned build. The semantic names are structural names derived from typed control/dataflow, not recovered unobfuscated declaration names.

## Evidence grades

- **Proven:** exact typed trait, instruction-level control/dataflow, or complete exact-QName reference closure in the hash-pinned ABC.
- **Structural name:** the narrowest semantic name supported by the roles of the typed source and target in consuming combat formulas.
- **Bounded closure:** every exact QName reference in the pinned ABC is enumerated and its ordered ledger is hashed.
- **Unknown:** the inspected primary evidence does not settle the claim.

Issue 1 was used only as a low-resolution map. Repository parser names and prior notes were locators, not semantic evidence. No replay corpus, replay payload, live-client capture, heap snapshot, or decrypted asset was needed or read.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Traits, defaults, replay helpers, roster bridge, fighter initialization, runtime consumers |
| Sole semantic build string in the ABC | `10.09.96325` | Build identity |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |
| `_-f3A` exact-QName ledger | `a5e1088659cfc5580b5b0b648cdb11fd65d6f1f4188f30246eff961d680c2959` | 38 instructions in 18 methods across both typed receiver contexts |
| `_-YA` exact-QName ledger | `648b020050f42ec8eec5275e078e81c12fc213ce09486aed09be7a99d6631ffa` | 35 instructions in 16 methods across both typed receiver contexts |
| Replay-helper callsite ledger | `0da95779d1edb06b43dff5552a6920f16a0d58039d31f636c601a7a89f0de53b` | Sole calls from writer 6519 to 4021 and reader 6510 to 4022 |
| Repository source base | commit `61e27e5be5df6e3de7f08398253019d075d41539` | Research baseline |

The decoder reports 15,010 method bodies and valid branch targets throughout the pinned ABC.

## Typed storage and initialized values

The same two exact QNames occur as slots on two typed receivers:

| Receiver | `_-f3A` | `_-YA` | Role |
| --- | --- | --- | --- |
| Class 206 `_-G47` | `uint`, no explicit constant initializer | `uint`, no explicit constant initializer | Replay/configuration percentage words |
| Class 147 `_-V4R` | `Number`, no explicit constant initializer | `Number`, no explicit constant initializer | Fighter runtime multipliers |

QName spelling alone is therefore insufficient. Receiver type and dataflow distinguish serialized percentages from runtime multipliers.

Class 206 constructor method 4015 is empty. AVM2 slot initialization gives both `uint` fields zero. Reset method 4017 explicitly writes zero to `_-f3A` at PCs 12-18 and `_-YA` at PCs 22-27.

Class 147 fighter constructor method 2790 first writes `Number(1)` to runtime `_-YA` at PCs 288-294 and runtime `_-f3A` at PCs 297-304. Its later replay/configuration normalization is definitive:

- PCs 5102-5118 set local 34 to whether the fighter's `_-w3a` handicap object is non-null.
- PCs 5195-5251 assign runtime `_-f3A`. If the object exists and its `_-f3A` word is nonzero, PCs 5228-5243 compute `word / 100`; otherwise PC 5248 supplies `1`.
- PCs 5255-5308 assign runtime `_-YA`. If the object exists and its `_-YA` word is nonzero, PCs 5286-5300 compute `word / 100`; otherwise PC 5305 supplies `1`.

These are AVM2 `Number` operations. There is no integer division or rounding at either conversion.

## Why the normal serialized default is 100

The zero slot value is an internal absence/fallback sentinel, not the normal percentage displayed or assembled into a roster.

Methods 2404 and 2403 are the normalized accessors:

- Method 2404 PCs 20-54 returns configured `_-f3A` only when the match is in the relevant initialized state and the word is nonzero. Otherwise PCs 55-61 return literal `100`.
- Method 2403 PCs 20-52 does the same for `_-YA`; PCs 53-59 return literal `100` otherwise.

Roster assembly method 2400 calls method 2404 and assigns its result to the participant handicap object's `_-f3A` at PCs 148-163. It then calls method 2403 and assigns the result to `_-YA` at PCs 167-180. Consequently the normal assembled second and third replay words are each `100`.

Method 4019 supplies an independent default/custom test. After its word-1 checks at requested PCs 17-68, it treats `_-f3A` as custom only when it is neither zero nor 100 at PCs 76-112. It applies the identical test to `_-YA` at PCs 113-145. This proves that 100 is the semantic no-modifier percentage while zero is treated as unset.

Two adjustment paths corroborate the unit scale. Method 9882 PCs 164-201 adjusts the method-2404 value with bounds 50 and 300 in increments of `10 * delta`, then writes through method 2385. Method 9881 PCs 164-200 does the same for method 2403 and writes through method 2384. These UI-produced bounds do not narrow the raw replay storage domain.

## Replay writer-reader order

### Writer

Replay writer method 6519 reads the fighter's `_-w3a` object at PCs 1325-1335 and invokes the exact class-206 writer method 4021 at PC 1343. This is the sole exact callsite of method 4021.

Method 4021 writes:

1. a one-bit presence marker at PCs 11-34;
2. word 1, `_-9H`, through 32-bit writer `_-S2c` at PCs 49-55;
3. word 2, `_-f3A`, through `_-S2c` at PCs 59-65;
4. word 3, `_-YA`, through `_-S2c` at PCs 69-74.

A null object writes presence zero and no words. A present object writes presence one followed by all three unsigned 32-bit words.

### Reader

Replay reader method 6510 invokes the exact class-206 reader method 4022 at PC 1298 and assigns its result to restored roster local 23's `_-w3a` at PC 1306. This is the sole exact callsite of method 4022.

Method 4022 reads:

1. the one-bit presence marker at PCs 16-28 and returns null at PCs 32-37 when it is zero;
2. word 1 through 32-bit reader `_-8v`, assigning `_-9H` at PCs 52-59;
3. word 2 through `_-8v`, assigning `_-f3A` at PCs 63-70;
4. word 3 through `_-8v`, assigning `_-YA` at PCs 74-81.

The writer and reader therefore agree exactly on second/third order. The raw domain accepted by this reader is every `uint32` pattern for each word. No percentage range validation occurs in these helpers.

### Reader-to-fighter bridge

Reader 6510 publishes restored roster local 23 into parsed roster list `_-I1a` at PCs 1355-1365. Replay-start method 3507 retrieves the same list at PC 304, stores its typed roster entry in local 7 at PCs 309-321, and passes that entry as factory argument 5 at PCs 338-376. Factory method 3071 forwards argument 5 to constructor 2790. Constructor 2790 clones the roster entry's `_-w3a` through method 4020 at PCs 2349-2372, then performs the `/ 100` normalization described above.

This closes the dataflow from replay word position to the runtime fighter fields. It does not rely on similarly spelled fields belonging to another object.

## Runtime consuming formulas

### Main hit path, method 1484

Method 1484 establishes actor roles before consuming either field:

- PCs 90-113 coerce local 5 to fighter local 22 when the hit source is a fighter. Local 22 is therefore the attacker/source fighter or null.
- Local 6 is the hit target. The method performs target-state checks on local 6 from PC 45 onward and later passes local 6 as the target to hit/damage calls.

Let `B` be local 28 immediately before the handicap-specific block, `T` be target local 6, and `A` be attacker local 22 when non-null. PCs 539-583 execute in exact stack order:

```text
t = local23._-n2G * T._-YA
t = t / local25._-32
D = Number(B * t)
if (A != null) D = Number(D * A._-f3A)
```

The exact target-field read is `T._-YA` at PC 548. The exact attacker-field read is `A._-f3A` at PC 577. `convert_d` occurs after the base/factor product at PC 560 and after the attacker multiplication at PC 582; there is no handicap-specific integer rounding. Local 28 continues through the damage pipeline, including calls at PCs 1752-1764 and 3058-3069 with local 6 as target.

Therefore:

```text
damageTakenMultiplier = replayWord3 == 0 ? 1 : replayWord3 / 100
damageDealtMultiplier = replayWord2 == 0 ? 1 : replayWord2 / 100
handicap factor on fighter-sourced damage = damageTakenMultiplier(target) * damageDealtMultiplier(attacker)
```

The multiplication order in the main path is target damage-taken first, attacker damage-dealt second. For ordinary finite positive percentages the mathematical product is commutative, but an exact simulator must preserve the bytecode order and intervening AVM2 `Number` conversions.

### Independent dealt-damage consumer, method 4169

Method 4169 provides an independent source-role confirmation. It coerces parameter/local 1 to fighter local 8 at PCs 36-49, then multiplies computed local 7 by `local8._-f3A` at PCs 51-61. Later factors are applied at PCs 63-140 before returning the result at PCs 142-147. This path has no target `_-YA` read, so it independently identifies `_-f3A` as a source/dealt modifier rather than a received/taken modifier.

### Runtime mutation

Method 7090 PCs 70-102 checks fighter flag `_-V4R._-a50` and, for matching fighters, replaces runtime `_-f3A` with `_-f3A * 3`. The main consumers use the resulting runtime field. Thus the replay conversion formula is exact, but a simulator must also preserve this later mode-specific mutation when that flag is reachable. No corresponding `_-YA` mutation exists in the complete exact-QName ledger.

## Complete exact-field reference disposition

The two slot definitions share their exact QName with the configuration and runtime receiver classes. The ledger hashes include every reference below; the typed definitions above were checked separately.

| Method | Exact PCs for `_-f3A` | Exact PCs for `_-YA` | Disposition |
| --- | --- | --- | --- |
| 1484 | 577 | 548 | Main combat consumer: attacker dealt, target taken |
| 2384 | - | 11 | Configuration setter |
| 2385 | 11 | - | Configuration setter |
| 2400 | 163 | 180 | Normalized roster assembly in wire order |
| 2403 | - | 29, 49 | Taken-percent accessor, default 100 |
| 2404 | 29, 50 | - | Dealt-percent accessor, default 100 |
| 2790 | 297, 304, 5195, 5215, 5236, 5251 | 288, 294, 5255, 5274, 5294, 5308 | Runtime initialization and replay-percent conversion |
| 4016 | 41, 45 | 55, 58 | Conditional configuration application |
| 4017 | 12, 18 | 22, 27 | Reset to zero sentinel |
| 4018 | 41, 52 | 56, 66 | Configuration load |
| 4019 | 77, 81, 94, 98 | 114, 117, 129, 132 | Nonzero/non-100 custom detection |
| 4020 | 42, 46 | 52, 55 | Handicap object clone |
| 4021 | 61 | 71 | Replay writer, words 2 and 3 |
| 4022 | 70 | 81 | Replay reader, words 2 and 3 |
| 4169 | 55 | - | Independent source/dealt runtime consumer |
| 6527 | 476 | 509 | Deterministic summary/hash contribution in the same order |
| 7090 | 95, 102 | - | Flagged runtime dealt-multiplier tripling |
| 13085 | 196, 209, 241 | 279, 291, 319 | Percentage display and custom highlighting |
| 13165 | 243, 257, 290 | 329, 342, 371 | Percentage display and custom highlighting |
| 13286 | 194, 207, 239 | 277, 289, 317 | Percentage display and custom highlighting |

There are no other exact-QName references in the 15,010 decoded bodies. In particular, there is no second runtime `_-YA` consumer that could reverse its target/taken role, and the only additional runtime `_-f3A` consumer confirms its source/dealt role.

## Reproducible validation

Keep the proprietary ABC outside version control or under an ignored path. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:replay-handicap-modifier-order -- \
  --abc /path/to/hash-pinned/main.abc \
  | jq '.status, .identity, .fields, .ledgers, .anchors'
```

Successful output reports `proven-for-pinned-abc`, build `10.09.96325`, the expected ABC digest, 15,010 decoded bodies, valid branch targets, word 2 as `damageDealtPercent`, word 3 as `damageTakenPercent`, and all three expected ledger hashes.

The dedicated analyzer fails closed on a changed ABC or build string; invalid branch target; typed slot, initializer, writer-reader order, default accessor, normalization formula, runtime consumer, source/target role label, UI range, runtime mutation, exact-QName ledger, or replay-helper callsite. `--explore` adds the complete exact-reference ledgers.

The command emits no ABC bytes, replay data, source payload, local input path, player data, or account data. Operating-system errors can still reveal a caller-supplied path.

## Confidence and residual gaps

### High-confidence conclusions

- Wire word 2 is `damageDealtPercent`.
- Wire word 3 is `damageTakenPercent`.
- Each unit is one percentage point; nonzero `p` becomes runtime multiplier `p / 100`.
- The normal assembled/default value is 100; raw zero and absent object both fall back to runtime 1.
- Writer 6519 and reader 6510 use one exact helper each and roundtrip the same order.
- Main fighter-sourced damage applies target taken then attacker dealt in bytecode order.
- Complete exact-QName closure finds one independent dealt consumer and one flagged dealt-field mutation, with no contradictory consumer.

### Residual uncertainty and limits

1. **Original declaration names:** unknown. `damageDealtPercent` and `damageTakenPercent` are evidence-derived structural names.
2. **Word 1:** not resolved here. It is deliberately retained as `word 1`; this note investigates only issue 26's second/third-word question.
3. **Raw range versus produced range:** the replay helpers accept every `uint32` pattern. Inspected adjustment controls produce 50 through 300 in steps of 10, but this does not prove all producer, server, or cross-field restrictions.
4. **Special values:** uint-to-Number conversion is exact over the uint32 domain, but very large authentic values were not observed. No replay corpus was used.
5. **Mode-specific mutation:** method 7090 can triple runtime dealt multiplier after replay conversion. Its enclosing mode policy is outside this field-order proof.
6. **Other damage factors:** methods 1484 and 4169 apply other power, mode, and state factors. This note identifies the handicap factors and their order, not the complete damage algorithm.
7. **Other builds:** out of scope. All closure claims apply only to ABC `9fe9...ba2d`.

## Ticket and fog suggestions

After review, issue 26 can be marked proved for build 10.09.96325. Replay-facing code may expose the fields as `damageDealtPercent` then `damageTakenPercent`, while preserving the presence bit and raw uint32 words for fidelity. Runtime code should normalize each with `p == 0 ? 1 : p / 100` and preserve the method-1484 application order.

Map fog should remove only the second/third handicap-order ambiguity and add the method-7090 post-conversion mutation as an implementation caveat. This evidence does not settle word 1, producer/server validation, complete damage arithmetic, other handicap behavior, or any other ticket.
