# Generic roster bitset semantics in Brawlhalla 10.09.96325

Issue: [Recover generic roster bitset semantics](https://github.com/NickTacke/brawlhalla-sim/issues/22)

## Verdict

**The state-4 roster instance of `_-C5F._-Z3L` is the player's available-taunt bitset.** It combines shipped default taunt availability with account entitlements. For a `TauntID` `n`, word `floor(n / 32)` bit `n % 32` is set when that taunt is available and clear when it is unavailable. The bit within each 32-bit word is least-significant-bit first: mask `1 << (n % 32)`.

A precise structural name for the roster field is `availableTauntIds`. `unlockedTaunts` is also defensible, but `availableTauntIds` better covers the shipped default taunt as well as account-granted entitlements. This is not a recovered unobfuscated declaration name.

`_-C5F` is a generic bitset container, so `_-Z3L` must not be renamed globally to a taunt-specific name. The same exact array trait appears behind readable `mFavoriteWeapons` in class 345. The taunt meaning is proven for the `_-n3Q -> roster._-n3I -> replay -> fighter._-n3I` instance dataflow, not for every `_-C5F` instance.

Confidence is **high** for the domain, bit index, polarity, writer-reader roundtrip, initialized empty value, and gameplay consumer in the pinned build.

## Evidence grades

- **Proven:** exact typed trait or instruction-level control/dataflow in the hash-pinned ABC, including branch targets.
- **Observation:** a direct value or identity reported by the analyzer without a broader behavioral inference.
- **Bounded closure:** every exact QName reference or callsite in the pinned ABC was enumerated and its ledger hash was fixed; this is not a claim about another build.
- **Unknown:** the inspected primary evidence does not settle the claim.

Repository parser names and prior reports were locators only. The verdict derives from the pinned executable. No live-client capture, heap snapshot, decrypted asset, replay payload, or private replay content was used.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Container, producers, replay writer-reader, restored copy, gameplay consumer |
| Sole semantic build string in the ABC | `10.09.96325` | Build identity |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |
| Exact `_-Z3L` reference ledger | `615c07f5ac1b0fb781ee4c28d83fd8f834d6992ca0d257b9024c1288481b6f00` | 137 exact-QName instructions in 37 methods |
| All class-30 bitset-method callsites | `c2c6c429a37e214ab2df2808e8d4703319abdf20582a2c6f057b7de515830d1f` | Broad consumer/producer search |
| Named-reference search ledger | `5f45e071f814e588e2a1d7f5ce1e1b54f39fb9642d84560c03e1380c7cef2b02` | `mFavoriteWeapons`, `_-n3I`, `_-n3Q`, and `_-M6S` disposition |
| Readable-string search ledger | `e137e1773fc41a4c1580839af0832a11954e25b2e8a233ed029840a623fb2732` | `TauntID`, `Taunt`, and default-name search |

The analyzer decodes all 15,010 method bodies, rejects invalid branch targets, requires the exact ABC and build identity, asserts every anchor below, and fails if any complete reference ledger changes.

## Generic container and exact bit convention

Class 30 `_-C5F` has slot `_-Z3L` typed as `Array`, with no constant initializer. Constructor method 576 explicitly creates `newarray 0` at PC 5 and assigns it to `_-Z3L` at PC 7.

Method 580 `_-H2Z(index, value)` proves both layout and mutation polarity:

1. PCs 2-8 compute integer word index `floor(index / 32)`.
2. PCs 9-18 compute unsigned mask `1 << (index % 32)`.
3. If `value` is true, PCs 29-55 extend the array with zero words as needed and PCs 85-107 OR the mask into that word.
4. If `value` is false and the word exists, PCs 115-138 AND the word with the complemented mask. Clearing an out-of-range bit returns at PC 79 without extending the array.

Method 600 `_-T5L(index)` independently computes the same word and mask at PCs 2-18. PCs 19-53 return `(word & mask) != 0`; an out-of-range word returns false at PCs 58-59. These two methods prove zero-based `TauntID` indexing, LSB-first bit order, and positive polarity without relying on a suggestive callsite.

Clearing the highest set bit does not trim trailing zero words. That length difference can survive the writer-reader roundtrip, but no bit in a zero word is available.

## Why this roster instance means available taunts

### Readable identifier and availability producers

Taunt parser method 12625 compares the source key `TauntID` at PC 150 and assigns its parsed unsigned value to `TauntType._-G5t` at PC 171. This proves that the indices below are taunt IDs, not array ordinals inferred from registry order.

Unlock manager method 14370 first clears `_-n3Q` at PCs 113-121. It then reads the shipped/default `TauntType` from `TauntType._-ol` at PCs 711-720, reads that object's `_-G5t` at PC 742, pushes true at PC 746, and calls bit setter 580 at PC 747. Thus the normal manager initialization affirmatively marks the default taunt ID available.

Entitlement method 14344 supplies the account edge. Its input is typed `EntitlementType` at PCs 116-122. The taunt-name path resolves `EntitlementType._-A2a` through the typed taunt registry at PCs 948-981, reads manager bitset `_-n3Q` at PC 997 and the resolved `TauntType._-G5t` at PC 1003, then pushes true and calls setter 580 at PCs 1007-1008. Account taunt entitlements therefore add set bits.

A complementary removal edge appears in `LinkUpdater` method 5269. Its literal `Taunt` case starts at PC 1535, resolves a typed taunt, reads `_-n3Q` and `_-G5t` at PCs 1579 and 1585, pushes false at PC 1589, and calls setter 580 at PC 1590. The enclosing business reason for that removal pass is obfuscated, so only its exact clear effect is claimed.

Method 14537 provides a confirming readable query. Its literal `Taunt` path at PC 44 reads `_-n3Q`, supplies `TauntType._-G5t`, and returns bit-test method 600 at PCs 88-106.

Together these independent default, entitlement, removal, and query paths prove the narrow name `availableTauntIds`. “Purchased taunts” would be too narrow because method 14370 adds a shipped default. “Equipped taunts” would be wrong because state 4 serializes eight equipped taunt IDs separately before this bitset.

### Generic reuse prevents over-naming

The complete trait search also finds `_-Z3L` behind readable `mFavoriteWeapons`. Methods 6336 PCs 2-16 and 14428 PCs 243-253 test that separate container by a weapon index. Method 6343 PCs 281-323 disposes its array and container. This proves `_-C5F._-Z3L` is a generic storage mechanism. The roster domain must come from the specific `_-n3Q`/`_-n3I` producer-consumer chain above, not from the class name or one readable use elsewhere.

## Writer to reader to consumer dataflow

The complete pinned-build chain is:

```text
TauntType source key "TauntID" -> TauntType._-G5t
  -> default/entitlement setter on manager._-n3Q (true = available)
  -> method 14520 copies manager._-n3Q._-Z3L to roster._-n3I
  -> replay writer 6519 copies and calls roster._-n3I._-Q5R
  -> method 578 emits (presence 1, uint word)* then presence 0
  -> replay reader 6510 calls restoredRoster._-n3I._-N4v
  -> method 585 restores/truncates the word array
  -> method 2921 copies restoredRoster._-n3I._-Z3L to fighter._-n3I
  -> gameplay method 1535 selects a set TauntID through method 589
  -> typed TauntType registry lookup
```

### Roster assembly and replay writer

Method 14520 reads destination `_-n3I` at PC 875 and source `_-n3Q._-Z3L` at PCs 882-886, then calls array-copy method 595 `_-r5D` at PC 889. Alternate assembly method 14522 repeats the same edge at PCs 468-482.

Replay writer 6519 copies the source record's `_-n3I._-Z3L` into its roster record at PCs 612-623. Later it reads that `_-n3I` at PC 1058 and invokes bitset writer method 578 `_-Q5R` at PC 1069.

Method 578 reads `_-Z3L` at PC 14. For every array word it emits a one-bit true marker through `_-PY` at PC 44 and the 32-bit unsigned word through `_-S2c` at PC 51. After the loop it emits the one-bit false terminator at PC 71. The exact wire shape is therefore:

```text
(1, uint32 word[0]), (1, uint32 word[1]), ... , 0
```

The serialized word order is ascending array index. Within each word, logical bit identity is the `1 << (TauntID % 32)` convention proven above; it does not depend on how the bitstream class packs bytes.

### Reader and restored field

Replay reader method 6510 reads each roster record's `_-n3I` and calls method 585 `_-N4v` at PCs 1035-1039.

Method 585 first records the existing word-array length at PCs 7-13. Each true marker read through `_-14J` at PC 82 admits one unsigned word read through `_-8v` at PC 30. The reader overwrites an existing array cell at PC 54 or pushes a new cell at PC 70. When the false marker ends the list, PCs 103-114 splice any old tail beyond the new count. Thus writer words become the restored `_-n3I._-Z3L` exactly, including zero words and their serialized length.

### Gameplay consumer

Method 2921 copies restored `_-n3I._-Z3L` into the fighter's `_-n3I` at PCs 177-185.

Gameplay method 1535 then reads that fighter bitset at PC 334. It supplies a `TauntType._-G5t` at PC 345 to bitset selection method 589 `_-O1D` at PC 349, and indexes the typed `TauntType` registry with the returned ID at PC 354. Method 589's PCs 141-151, 187-197, and 423-492 use bit-test method 600 and return only an ID whose corresponding bit is set. This is a downstream gameplay decision, not a UI-only display.

## Empty, zero-length, and default behavior

**Container default:** empty array. Method 576 constructs `_-Z3L = []` at PCs 5-7. Roster-record constructor method 6118 constructs a fresh `_-C5F` for `_-n3I` at PCs 8-17, so a new roster record inherits that empty word array.

**Wire encoding:** an empty array writes only the false terminator from method 578 PC 71. There is no uint word.

**Reader replacement:** an immediate false marker causes method 585 to read no word and splice every prior word at PCs 103-114. Reading an empty encoding into either a fresh or reused object therefore leaves `_-Z3L.length == 0`. The bit test returns false for every ID.

**Selection behavior:** method 589 counts no set bits and returns unsigned `0` at PCs 111-122. Method 1535 then performs its typed registry lookup with that result. The inspected static path does not prove whether every surrounding mode treats ID 0 as a null sentinel, a special entry, or substitutes another taunt later, so no stronger animation claim is made.

**Normal availability initialization is not necessarily empty:** method 14370 adds `TauntType._-ol._-G5t` as a set default bit when that typed default is present. Therefore “empty on construction” is the storage default, while “default taunt available after unlock-manager initialization” is the normal producer behavior. The readable name of that shipped default taunt was not recovered.

There is no distinct absent/null bitset encoding inside a present roster record. A roster record itself is optional in the surrounding list, but once present its `_-n3I` is constructed and the bitset is represented by the terminated word list.

## Complete reference closure

The analyzer keys by exact QName namespace/name pairs, not string coincidence. It finds 137 exact `_-Z3L` instructions in 37 methods and hashes the ordered method/PC/opcode ledger. It separately hashes every exact callsite of all 23 class-30 methods, including 68 setter references and 56 bit-test references. Named searches cover all references to `mFavoriteWeapons`, `_-n3I`, `_-n3Q`, and `_-M6S`; readable-string searches cover `TauntID`, every literal `Taunt`, and the absence of a literal `DefaultTaunt`.

This broad search has two consequences:

1. It proves the container is generic and prevents a global taunt-specific rename.
2. It closes the roster-specific taunt chain across independent producers, serializer, reader, restored copy, query, and gameplay selection rather than naming from one suggestive site.

The detailed exact-field ledger is emitted as privacy-safe JSON by the command below. The four ledger digests make the analyzer fail closed if any member, PC, opcode, owner, or ordering changes.

## Reproducible validation

Keep the proprietary ABC outside version control. From the checkout root:

```bash
bun install --frozen-lockfile
bun run --cwd tools/avm2-provenance build-dependency
bun tools/avm2-provenance/generic_roster_bitset_provenance.ts \
  --abc /path/to/hash-pinned/main.abc
```

Useful bounded view:

```bash
bun tools/avm2-provenance/generic_roster_bitset_provenance.ts \
  --abc /path/to/hash-pinned/main.abc \
  | jq '.status, .identity, .field, .anchors, .referenceClosure.ledgers'
```

Successful output reports `proven-for-pinned-abc`, build `10.09.96325`, ABC digest `9fe9...ba2d`, 15,010 decoded method bodies, valid branch targets, 37 exact-field methods, 137 exact-field instructions, and the four ledger hashes above.

The analyzer emits no ABC bytes, source payload, replay bytes, fixture names, player names, player IDs, account data, or local input path. Operating-system errors can still reveal a caller-supplied path.

No replay corpus was needed or read. The static chain includes affirmative non-default producers and a consuming gameplay branch, so corpus values would only observe production frequency, not establish the semantic identity.

## Confidence and residual gaps

### High-confidence conclusions

- Roster structural domain: taunt IDs available to that player.
- Index: `TauntID n -> word floor(n / 32), mask 1 << (n % 32)`.
- Polarity: set is available; clear is unavailable.
- Default storage: empty word array.
- Normal producer behavior: shipped default taunt plus account entitlements set bits; a LinkUpdater path can clear bits.
- Encoding: `(1, uint32 word)*, 0`, with an empty list encoded by the lone zero marker.
- Reader behavior: exact replacement, including truncation to zero words.
- Gameplay effect: restored bits constrain the taunt ID selected by method 1535.

### Residual uncertainty

1. **Original declaration names:** unknown. `availableTauntIds` is an evidence-derived structural name.
2. **Default taunt identity:** unknown. The typed default field `TauntType._-ol` is proven, but no readable literal name was recovered or asset inspected.
3. **Empty-selection presentation:** unknown. The selector returns ID 0; later animation/UI handling of that sentinel is outside the closed chain.
4. **LinkUpdater removal reason:** unknown. Its literal `Taunt` branch and clear operation are exact, but the enclosing business policy remains obfuscated.
5. **Other builds and server policy:** out of scope. Closure applies only to ABC `9fe9...ba2d`.
6. **Authentic frequency and maximum serialized length:** unobserved. No private replay corpus was needed or read.

## Ticket and fog impact

This graduates issue 22's “generic roster bitset gameplay domain” node from unknown to proved for build 10.09.96325. It invalidates only the recommendation to preserve this roster field as semantically generic/unknown: parsers may expose it as `availableTauntIds` or an equivalently precise taunt-availability bitset while preserving raw words for fidelity.

It does not resolve or invalidate map/level fog, map-selection tickets, the separate roster word `_-o1O`, packed weapon bit 15, handicap fields, bot behavior, or special-mode timing. It also does not justify renaming `_-C5F._-Z3L` globally because that generic container serves other domains.

## Related reviewed evidence

- [State-4 format and the original bounded unknown](https://github.com/NickTacke/brawlhalla-sim/blob/327166d3f9a09f0d9a5c519b58039e36ea4f835f/artifacts/research/replay-format-268/format-268-semantics.md)
- [State-4 game-settings word 14](../game-settings-word-14/game-settings-word-14.md)
