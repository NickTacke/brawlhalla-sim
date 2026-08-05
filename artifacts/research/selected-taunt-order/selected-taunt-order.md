# Selected-taunt slot ordering in Brawlhalla 10.09.96325

Issue: [Determine selected-taunt slot ordering](https://github.com/NickTacke/brawlhalla-sim/issues/24)

## Verdict

**Proven:** the first selected-taunt `uint16` in each state-4 roster record is `winTauntId`; the second is `loseTauntId`.

| Wire order | Exact field | Meaning |
| --- | --- | --- |
| First `uint16` | `_-Pa` | Win/victory selected taunt ID |
| Second `uint16` | `_-33m` | Lose/defeat selected taunt ID |

The existing replay parser order is correct. `packages/replay-format/src/parser264.ts` reads `winTauntId` first and `loseTauntId` second, so this result requires no parser change.

Confidence is **high** for build `10.09.96325`. The writer, reader, replay-to-fighter reconstruction, readable `WinTauntID`/`LoseTauntID` export, and outcome UI all preserve the same field identities and order.

## Evidence grades

- **Proven:** exact typed-trait or instruction-level control/dataflow in the hash-pinned ABC, including validated branch targets.
- **Bounded closure:** every instruction whose first operand is either field's exact QName was enumerated and its ordered ledger hash was fixed.
- **Observation:** a direct identity or count emitted by the analyzer without a broader behavior claim.
- **Unknown:** the inspected primary evidence does not settle the claim.

Repository parser names and earlier research were locators only. The verdict derives from the pinned executable rather than assuming the parser names are correct.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Writer, reader, reconstruction, readable labels, and outcome UI |
| Sole semantic build string in that ABC | `10.09.96325` | Build identity |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |
| First-field exact-QName instruction ledger | `0c0a4aeea4c86b25c844d0dd0537ee92c21d70bb59205e99e75ae971974142c7` | 22 instructions in 12 methods |
| Second-field exact-QName instruction ledger | `464f7a3d9f0a6aba16389f8c7d902acadf8b340a8063416dd9d79ae6bd2dfa84` | 22 instructions in 12 methods |
| Readable-name instruction ledger | `229768765a3ad9f7207a2910ed3cb68bdf34f1c201f48fba232057b1a2038dfe` | QName-bearing instruction references to `WinTauntID` and `LoseTauntID` |
| Outcome-string ledger | `4431cded6c24d99a91ab7fabf3d02ca998b23b5cbe9ee88573d1a99af936db1b` | `TauntWin`, `TauntSlowClap`, `Victory`, and `Defeat` string references |

The analyzer decodes all 15,010 ABC method bodies, rejects invalid branch targets, requires the exact ABC and build identity, asserts every anchor below, and fails if any complete instruction-reference ledger changes.

Byte PCs below are zero-based offsets within each AVM2 method body.

## Writer establishes first and second wire order

Replay writer method 6519, class 357 `_-16._-L2J`, first normalizes source fighter fields into the serializable roster record:

1. PCs 543-570 test source `_-Pa`; a non-null `TauntType._-G5t` becomes roster `_-Pa`, otherwise zero.
2. PCs 577-606 repeat the same conversion for source `_-33m` into roster `_-33m`.

It then emits the selected pair after the eight 32-bit equipped-taunt IDs:

```text
method 6519 PC 1029 get roster._-Pa
method 6519 PC 1032 call _-Wr._-B2n
method 6519 PC 1047 get roster._-33m
method 6519 PC 1051 call _-Wr._-B2n
```

Bitstream method 605 `_-Wr._-B2n` calls `ByteArray.writeShort` at PC 15. Thus the exact writer order is first `_-Pa`, then `_-33m`, each through the 16-bit writer.

## State-4 reader preserves that order

Replay reader method 6510, class 356 `_-E4h._-N4v`, constructs typed roster record `_-kv` and executes:

```text
method 6510 PC 1013 call _-Wr._-e1q -> PC 1018 init roster._-Pa
method 6510 PC 1024 call _-Wr._-e1q -> PC 1029 init roster._-33m
```

Bitstream method 614 `_-Wr._-e1q` requests two bytes at PC 19 and calls `ByteArray.readShort` at PC 41. Reader method 6510 converts both results to `uint` before assignment. The writer and reader therefore agree on both 16-bit width and field order.

The reader publishes the same local-23 roster record into parsed-replay list `_-I1a` at PCs 1358-1365. No swap occurs while reading or publishing.

## Restored replay fields reach fighter fields without swapping

Replay-start method 3507 `_-u16._-H4o` retrieves the exact reader-owned `_-I1a` roster entry into local 7 at PC 321 and passes local 7 as factory argument 5 at PCs 374-376. Static factory method 3071 `_-V4R._-HT` forwards its fifth typed `_-kv` parameter to fighter constructor method 2790.

Constructor method 2790 then preserves the pair independently:

1. PCs 2183-2189 read roster `_-Pa` from constructor parameter 5 into local 26.
2. PCs 2191-2198 read roster `_-33m` into local 27.
3. PCs 4877 and 4879 pass local 26 before local 27 to method 2921 `_-V4R._-a5C`.

Method 2921 resolves the two numeric IDs through the typed `TauntType` registry and stores them on the fighter:

- argument 2 reaches fighter `_-Pa` at PCs 87-121;
- argument 3 reaches fighter `_-33m` at PCs 124-159.

The exact QNames at the writer, reader, constructor, and fighter assignments match. This closes the replay-restoration path without relying on positional similarity alone.

## Readable labels assign win and lose semantics

Fighter method 2931 `_-V4R._-618` passes the fighter itself to method 2564 `_-E4o._-u3j` at PCs 79-80.

Method 2564 exports a readable object:

```text
fighter._-Pa  -> TauntType._-G5t -> WinTauntID
fighter._-33m -> TauntType._-G5t -> LoseTauntID
```

Exact anchors are:

- PCs 303 and 322 read `_-Pa`; PC 325 reads `_-G5t`; PC 330 initializes `WinTauntID`.
- PCs 336 and 356 read `_-33m`; PC 360 reads `_-G5t`; PC 365 initializes `LoseTauntID`.

These readable property names directly assign the semantic labels while retaining the exact restored fighter fields.

## Outcome UI independently confirms polarity

Method 13297 `_-L2t._-f4G` drives a `PaperDoll` outcome-taunt presentation. It stores an outcome predicate in local 1 at PC 126, then branches at PCs 149-150:

- true reads `_-Pa` at PC 160;
- false reads `_-33m` at PC 177.

The same local controls fallback animation names at PCs 673-692:

- true selects `TauntWin` at PC 678;
- false selects `TauntSlowClap` at PC 692.

Method 13283 `_-L2t._-wr` independently calls the exact same outcome predicate QName at PC 1982 and stores it in local 23. Its branch at PCs 2077-2079 labels:

- true as `Victory` at PC 2091;
- false as `Defeat` at PC 2123.

Therefore the shared true predicate selects both `_-Pa` and the readable `Victory` branch, while false selects both `_-33m` and `Defeat`. This outcome consumer independently matches the `WinTauntID`/`LoseTauntID` export.

## Complete field instruction-reference closure

The analyzer keys references by exact QName namespace/name pairs, not string coincidence. Each field has exactly 22 QName-bearing instructions across the same 12 methods:

| Method and owner | First `_-Pa` PCs | Second `_-33m` PCs | Disposition |
| --- | --- | --- | --- |
| 2564, `_-E4o._-u3j` | 303, 322 | 336, 356 | Readable `WinTauntID` / `LoseTauntID` export |
| 2790, `_-V4R` constructor | 2185 | 2193 | Restored roster reads |
| 2921, `_-V4R._-a5C` | 87, 121 | 124, 159 | Numeric-ID-to-`TauntType` fighter copy |
| 3282, `_-u16._-6e` | 660 | 671 | Paired roster assignment |
| 5257, `LinkUpdater._-E2t` | 513 | 523 | Paired roster assignment |
| 6240, `_-r1Y._-s2h` | 37, 44 | 47, 55 | Presentation-record initialization |
| 6241, `_-r1Y._-B1j` | 179, 183, 186 | 189, 194, 198 | Presentation-record copy |
| 6510, `_-E4h._-N4v` | 1018 | 1029 | Replay reader |
| 6519, `_-16._-L2J` | 543, 556, 570, 1029 | 577, 591, 606, 1047 | Source normalization and replay writer |
| 6527, `_-16._-U6c` static | 215 | 231 | Roster checksum |
| 13297, `_-L2t._-f4G` | 160 | 177 | Victory/defeat UI selection |
| 14520, `_-J2o._-O3Q` | 482, 496, 528 | 618, 633, 666 | Selected-taunt producers and validation |

The paired shape is confirming evidence, not the semantic proof by itself. The decisive edges are the writer-reader-restoration chain, direct readable labels, and shared outcome predicate.

## Reproducible validation

Keep the proprietary ABC under an ignored path or outside the repository. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:selected-taunt-order -- \
  --abc artifacts/research/brawlhalla-physics/main.abc
```

Useful bounded view:

```bash
bun run provenance:selected-taunt-order -- \
  --abc artifacts/research/brawlhalla-physics/main.abc \
  | jq '.status, .identity, .ordering, .referenceClosure.ledgers'
```

Successful output reports `proven-for-pinned-abc`, build `10.09.96325`, ABC digest `9fe9...ba2d`, 15,010 decoded method bodies, valid branch targets, first `uint16` `winTauntId`, second `uint16` `loseTauntId`, and the four pinned reference ledgers above.

The analyzer emits no ABC bytes, source payload, replay bytes, fixture names, player names, player IDs, account data, or local input path. Operating-system errors can still reveal a caller-supplied path.

No replay corpus was needed or read. Matching static dataflow reaches both direct readable names and a uniquely labeled outcome branch, satisfying the issue without controlled live behavior.

## Confidence and residual gaps

### High-confidence conclusions

- First selected-taunt `uint16`: `winTauntId`, exact field `_-Pa`.
- Second selected-taunt `uint16`: `loseTauntId`, exact field `_-33m`.
- Width: two bytes each through paired `writeShort`/`readShort` helpers.
- Reconstruction: reader-restored values reach the corresponding fighter fields without swapping.
- Semantic labels: exact fields export as `WinTauntID` and `LoseTauntID`.
- Outcome behavior: the same predicate maps true to `_-Pa`/`Victory` and false to `_-33m`/`Defeat`.
- Parser implication: the existing first-win, second-lose order is correct.

### Residual uncertainty

1. **Other builds:** out of scope. Obfuscated identities and ordering are proven only for ABC `9fe9...ba2d`.
2. **Controlled live observation:** not performed. A deliberately distinct win/lose equipment capture would corroborate the static result but is not needed to resolve the ordering.
3. **Broader presentation policy:** method 13297 contains fallback and random-selection behavior beyond the selected fields. That policy is outside this ticket.
4. **Server-side validation:** not inspected. The ticket asks wire ordering and client consumption, both of which are closed statically.

## Ticket and fog impact

This resolves the selected-taunt ordering unknown from the format-268 research: parsers and specifications may name the first `uint16` `winTauntId` and the second `loseTauntId` for build `10.09.96325`.

No new decision ticket is required. A controlled replay with distinct selected taunts would add behavioral corroboration only, not unblock a remaining semantic decision. This result does not resolve unrelated roster fields, taunt animation policy, state-7 production, or broader match-result presentation.

## Related reviewed evidence

- [Format-268 semantics at commit `327166d`](https://github.com/NickTacke/brawlhalla-sim/blob/327166d3f9a09f0d9a5c519b58039e36ea4f835f/artifacts/research/replay-format-268/format-268-semantics.md)
- [Generic roster bitset semantics](../generic-roster-bitset/generic-roster-bitset.md)
