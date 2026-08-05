# Composite entity classification in Brawlhalla 10.09.96325

Issue: [Recover composite entity classification semantics](https://github.com/NickTacke/brawlhalla-sim/issues/27)

## Verdict

**The replay roster bit is a special-mode entity classification, not a general bot flag.** Writer method 6519 emits:

```text
(entity._-56G & 0x0c808002) != 0
```

The mask is the union of five `_-V4R` entity-type flags: `_-a50` (`0x00000002`), `_-P1j` (`0x00008000`), `_-sE` (`0x00800000`), `_-b3N` (`0x04000000`), and `_-2O` (`0x08000000`). Known creation and display paths group those flags into three special-mode categories:

1. Horde `PartyBot` entities carry `_-a50 | _-P1j | _-2O` as part of a larger type mask.
2. Soccer and volley game-mode balls carry `_-b3N`.
3. Animation targets carry `_-sE`.

The narrowest stable public structural name is `isSpecialModeEntity`. This is an evidence-derived name, not a recovered declaration name. `isBot` is incorrect: ordinary party/CPU bots and the training CPU slot use other entity flags and do not satisfy the five-flag predicate.

There is an important wire-reachability qualification. Writer 6519 first skips every entity whose type contains `_-b3N | _-2O` (`0x0c000000`). Therefore the known Horde entity and game-mode ball paths never reach their roster bit. The animation-target flag satisfies the later predicate, but no positive authentic fixture or exact constructor call passing `_-sE` was found. The five-way predicate and its categories are proven; positive production of the serialized bit remains unobserved.

Confidence is **high** for the exact mask, flag values, writer control flow, ordinary human/bot/training classification, ball and Horde categories, reader behavior, and constructor/factory closure. Confidence is **medium** for using `isSpecialModeEntity` as the public structural name because no readable declaration names the union and no reviewed replay sets the bit.

## Evidence grades

- **Proven:** exact typed-trait, instruction, control-flow, or dataflow evidence in the hash-pinned ABC.
- **Structural name:** the narrowest public meaning supported by every proven category when no readable declaration survives.
- **Bounded closure:** every exact QName reference or callsite in the pinned ABC was enumerated and its ledger hash fixed.
- **Unknown:** the inspected primary evidence does not settle the claim.

Repository parser names and the earlier format report were locators only. No live-client capture, heap snapshot, decrypted asset, replay payload, or private replay content was used.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Entity flags, creation paths, writer, reader, replay restoration |
| Sole semantic build string in the ABC | `10.09.96325` | Build identity |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |
| Exact `_-V4R._-56G` reference ledger | `203e46f7ac6e594b66da0474c82b186cdca9605587de0642b58ba462f015271a` | Every entity-type read and write |
| Five exact flag-reference ledgers | `b59997e12cca0cf9acc404aa36fa7db9257e0a637188a097718674e61d7db4df` | Flag assignments and complete use closure |
| Fighter-factory callsite ledger | `0d633de093a0975d46444a37bc2654d35d0a83384da6a8582e8716c1685a531d` | Every call to factory method 3071 |
| Composite-predicate callsite ledger | `62664a787d10db3d0e9efab6197a2e679a26b7f406772d88749eb1df0158a196` | Every call to method 2960 `_-U5g` |

The analyzer decodes all 15,010 method bodies, rejects invalid branch targets, requires the exact ABC and build identity, asserts every anchor below, and fails if any complete reference ledger changes.

## The five flags and their categories

Class 147 `_-V4R` owns instance slot `_-56G`, typed as `uint`. Constructor method 2790 copies constructor argument 4 into that field at PCs 1551-1556. All direct construction funnels through static factory method 3071: its PC 16 is the only exact `constructprop _-V4R` in the ABC.

Script initializer method 3074 assigns the five mask constants. The issue's starting reference to method 14909 does not identify these definitions: method 14909 assigns the same numeric powers to different exact traits on class `_-Wv` (PCs 17643-17925), not to `_-V4R`. The analyzer asserts both tables by owner, trait, value, and PC so numeric coincidence cannot substitute for exact QName identity. The exact `_-V4R` assignments are:

| Flag | Value | Assignment PCs | Proven category evidence |
| --- | ---: | ---: | --- |
| `_-a50` | `0x00000002` | 951-953 | Included in the Horde `PartyBot` constructor mask in method 3623 PCs 212-218 |
| `_-P1j` | `0x00008000` | 1072-1074 | Included in the same Horde `PartyBot` mask at PCs 197-203 |
| `_-sE` | `0x00800000` | 1140-1142 | Method 3541 PCs 468-549 selects `a__AnimationTarget_Ready` when this flag is set |
| `_-b3N` | `0x04000000` | 1167-1170 | Method 3565 constructs literal `SoccerBall` with this flag at PCs 350-411; method 3541 PCs 163-233 selects `a__AnimationSoccerBall`, including `VOLLEY_BATTLE` |
| `_-2O` | `0x08000000` | 1176-1178 | Included in the Horde `PartyBot` mask at method 3623 PCs 204-211; power method 1513 rejects this entity category at PCs 16-62 |

Method 2960 `_-V4R._-U5g` independently implements exactly the same five-flag predicate at PCs 2-48. This confirms writer 6519 did not accidentally assemble a one-off mask.

The three Horde constituents cannot be given stronger independent category names from this build. The known Horde creation path sets all three together, and no readable declaration names their individual roles. Calling all five flags “bot flags” would be wrong because `_-b3N` is a ball and `_-sE` is an animation target.

## Writer control flow and actual wire reachability

### Record prefilter

Writer method 6519 iterates live `_-V4R` entities. Before constructing a roster record, PCs 255-283 compute:

```text
if ((entity._-56G & (_-V4R._-b3N | _-V4R._-2O)) != 0) {
  continue
}
```

The branch at PC 283 jumps to loop increment PC 1356. Thus any game-mode ball (`_-b3N`) and any entity carrying `_-2O` are omitted from the roster list completely.

This makes the known categories behave as follows:

- Soccer/volley balls satisfy the five-way predicate but are skipped by `_-b3N`.
- The known Horde `PartyBot` mask satisfies the predicate through `_-a50`, `_-P1j`, and `_-2O`, but is skipped by `_-2O`.
- An entity carrying standalone `_-sE` would reach and set the bit unless another flag caused exclusion. No exact factory producer or reviewed fixture proves that positive writer case.

### Serialized predicate

For each surviving record, writer PCs 1260-1321 compute the full mask in the exact order:

```text
_-a50 | _-b3N | _-2O | _-P1j | _-sE
```

It ANDs that mask with `entity._-56G`, normalizes nonzero to unsigned `1` and zero to unsigned `0`, then calls one-bit writer `_-PY` with width `1`. The static expression is exactly `0x0c808002`.

## Human, bot, dummy, companion, and synthetic matrix

| Category | Predicate | Serialized result | Evidence |
| --- | --- | --- | --- |
| Ordinary human fighter | False | `0` | Replay restoration method 3507 constructs the fighter with `_-6c | _-76C` at PCs 359-376; neither flag is in the mask |
| Ordinary party/CPU bot | False | `0` | Method 3623's default `PartyBot` path uses `_-76C | _-F43 | _-K2` at PCs 53-75 and calls the factory at PC 526; constructor method 2790 associates `_-F43` with readable `CPU` at PCs 3547-3594 |
| Training CPU slot, commonly called the training dummy | False | `0` | Method 3205 creates both `practiceTraining` fighters with ordinary combinations of `_-6c`, `_-76C`, and `_-F43` at PCs 592-689 and 1115-1165; none is in the five-way mask |
| Equipped companion cosmetic | Does not contribute | Owner's value unchanged | Writer PCs 727-764 serializes typed `Companion` ID separately from the fighter's later classification source; companion presence is not one of the five flags |
| Horde special `PartyBot` entity | True | No roster record on the known path | Method 3623's `HORDE` branch includes `_-P1j | _-2O | _-a50`; writer prefilter skips `_-2O` |
| Soccer/volley game-mode ball | True | No roster record | `_-b3N` is proven by literal and animation paths; writer prefilter skips `_-b3N` |
| Animation target | True | Positive wire case unobserved | `_-sE` selects `a__AnimationTarget_Ready`; no exact factory producer or positive fixture was found |

“Dummy” needs careful vocabulary. The player-facing training CPU slot is an ordinary CPU fighter and yields false. The separate `_-sE` animation target yields true at the predicate. The primary evidence does not call that animation target a training dummy, so those two concepts must not be merged.

Likewise, “synthetic” is too broad for the public field: ordinary CPU bots are synthetic but false. `isSpecialModeEntity` names the proven union without implying AI ownership.

## Reader and replay restoration

Reader method 6510 reads the one-bit value through `_-14J` at PC 1262. It does not assign a bot boolean or recreate the original five-bit mask. When true, PCs 1276-1286 append the record identity from local 19 to `_-E4h._-i5s`.

Method 6511 `_-E4h._-U5g` tests membership in that list through `indexOf` at PCs 21-38. The shared obfuscated trait name mirrors entity predicate method 2960 but does not recover a readable source name.

Replay-start method 3507 constructs the restored fighter with the normal `_-6c | _-76C` type mask. It then queries parsed-replay membership at PC 406. If true and the `_L4p` manager exists, PCs 416-454 pass the fighter to `_L4p._-51a`. Class `_L4p` is the same owner whose method 3623 constructs literal `PartyBot` and its Horde variant. Therefore the reader preserves a special-mode reconstruction marker, not general bot identity and not the original exact type flags.

No code should synthesize `entityType = 0x0c808002` from this bit. The reference reader stores only membership and applies manager-specific restoration behavior.

## Complete reference closure

The analyzer keys by exact QName namespace/name pairs, not string coincidence. It closes:

1. every exact read and write of `_-V4R._-56G`;
2. every exact reference to all five static flag traits;
3. every exact callsite of factory method 3071 and the sole direct `constructprop _-V4R`;
4. both exact callsites of composite predicate method 2960;
5. writer prefilter and classification branch targets;
6. reader list insertion, membership query, and replay-start manager handoff.

Known field mutations either copy a type mask or add/remove other exact flags. The five target constants have no hidden exact-QName write into `_-56G` beyond construction. Binary/network deserialization can still restore an arbitrary full type word, so the static closure does not prove positive wire production impossible.

The four ledger digests above make the analyzer fail closed if any member, method, PC, opcode, owner, or ordering changes.

## Reproducible validation

Keep the proprietary ABC outside version control. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:composite-entity-classification -- \
  --abc /path/to/hash-pinned/main.abc
```

Useful bounded view:

```bash
bun run provenance:composite-entity-classification -- \
  --abc /path/to/hash-pinned/main.abc \
  | jq '.status, .identity, .field, .categoryMatrix, .referenceClosure.ledgers'
```

Successful output reports `proven-for-pinned-abc`, build `10.09.96325`, ABC digest `9fe9...ba2d`, 15,010 decoded method bodies, valid branch targets, mask `0x0c808002`, the category matrix above, and all four ledger hashes.

The analyzer emits no ABC bytes, source payload, replay bytes, fixture names, player names, player IDs, account data, or local input path. Operating-system errors can still reveal a caller-supplied path.

## Confidence and residual gaps

### High-confidence conclusions

- Exact serialized predicate: `(entityType & 0x0c808002) != 0`.
- Five contributing flags, values, assignments, and order.
- Known semantic categories: Horde special `PartyBot`, game-mode ball, and animation target.
- Ordinary human, ordinary party/CPU bot, and training CPU types do not satisfy the predicate.
- Companion selection is a separate roster field and does not contribute.
- `_-b3N` and `_-2O` cause whole-record exclusion before the bit.
- Reader true values become list membership consumed by the special-mode `PartyBot`/Horde manager.
- `isBot` is not a valid public semantic name.

### Residual uncertainty

1. **Positive serialized example:** absent. The reviewed corpus has only zero values, and known `_-b3N`/`_-2O` categories are prefiltered.
2. **Standalone animation-target production:** unknown. The predicate and target display branch are exact, but no exact factory call passes `_-sE` and no fixture observes it.
3. **Individual Horde flag names:** unknown. `_-a50`, `_-P1j`, and `_-2O` are proven constituents of one Horde mask but have no surviving independent readable declarations.
4. **Original union declaration name:** unknown. `isSpecialModeEntity` is a structural name.
5. **Training “dummy” product terminology:** only `CPU` and `practiceTraining` are tied to the creation path. The common user-facing “training dummy” label is not recovered at that bytecode site.
6. **Other builds and native/network producers:** out of scope. Closure applies only to the pinned ABC; arbitrary type words can enter through binary/network deserialization.

## Ticket and fog impact

This resolves the composite-classification semantic gap for build 10.09.96325. The map gist is:

> The roster bit marks a three-category special-mode union (Horde PartyBot constituents, game-mode balls, animation targets), not ordinary bots; known ball/Horde paths are prefiltered before the bit.

A follow-up implementation ticket is now specifiable: replace or deprecate public `Entity.isBot` with a raw classification-preserving field such as `isSpecialModeEntity`, while documenting that it does not restore exact entity-type flags. This investigation does not perform that implementation.

One fog item remains: obtain or instrument a positive format-268 classification case to determine whether standalone animation targets or externally restored type words can reach writer 6519 in a replay-producing match. That observation would strengthen production-frequency and reachability evidence but would not change the proven predicate.

No other Wayfinder ticket is claimed or resolved here, and the canonical map is intentionally left unchanged for orchestrator serialization.

## Related reviewed evidence

- [Format-268 semantics and original bounded unknown](https://github.com/NickTacke/brawlhalla-sim/blob/327166d3f9a09f0d9a5c519b58039e36ea4f835f/artifacts/research/replay-format-268/format-268-semantics.md)
- [Generic roster bitset semantics](../generic-roster-bitset/generic-roster-bitset.md)
