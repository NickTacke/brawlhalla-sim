# Packed weapon-order producer policy in Brawlhalla 10.09.96325

Issue: [Recover packed weapon-order producer policy](https://github.com/NickTacke/brawlhalla-sim/issues/54)

## Verdict

**Bounded static closure only. Ticket acceptance is not met.**

The pinned client proves that packed `weapon2First` and ordinary gameplay weapon pickup order are separate state machines:

- Packed bit 31 set selects weapon skin 2 as the first or primary skin in selection and first-pickup display construction. Clear selects weapon skin 1.
- Within the pinned exact-QName writer and mask ledgers, the only direct replay-loadout bit-31 mutator is method 3703. It balances base weapon types across a supplied loadout range and uses a random draw only when both candidate type counts tie.
- Default costume construction and shuffled-loadout construction both pass `false` to the packed helper, so their produced bit is clear.
- `ForcePrimaryWeaponFirst` does not invert into packed bit 31. It is a Boolean tutorial setting whose only runtime consumer writes `0` to a separate modulo-two gameplay order counter.
- That gameplay counter normally initializes from the item PRNG as `nextUint() % 2`. Two gameplay item-creation paths consume the old counter modulo two, increment it, and select base weapon 1 for zero or base weapon 2 for one.

There is therefore no exact conversion `weapon2First = !ForcePrimaryWeaponFirst` in the pinned ABC. The inverse wording is product-language context only: packed `weapon2First` names skin slot 2 as first, while readable `ForcePrimaryWeaponFirst` forces gameplay base weapon slot 1 by writing counter value zero.

Acceptance remains unmet because the build's complete replay-producing universe is not proved, raw whole-word ingress includes client/server and loaded-code boundaries that static ABC search cannot universally close, and the runtime counter's complete first-pickup, reset, KO, respawn, morph, reconnect, and special-mode lifecycle is not established for every replay-producing path.

## Evidence grades

- **Proven:** exact typed trait or instruction-level control/dataflow in the hash-pinned ABC.
- **Bounded static closure:** every member of a declared exact-QName or exact-callsite set in `main.abc` was enumerated and hashed. This does not close loaded code, native host callbacks, or server-authored values.
- **Observation:** a direct value from the authenticated local replay cohort.
- **Unknown:** the inspected primary evidence does not settle the claim.

Repository parser names and prior reports were locators only. The findings derive from the pinned executable and authenticated replay bytes.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Producer, randomization, readable setting, and gameplay order paths |
| Sole semantic build string | `10.09.96325` | Build identity |
| Authentic format-268 manifest | `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac` | Exact 12-replay cohort and fixture hashes |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |
| Packed-field reference ledger | `c54f7502e4040b3dc3b9c4c9a05805555b6b30e9b3a3d9ceab587d226df494d8` | Every exact QName `36:21060` reference |
| Packed-field write ledger | `2cf98a00771e0121e078699e56df39ab14f30776ae19c02acca46d0a854afd1d` | Every `initproperty` or `setproperty` under that QName, including disposed QName reuse |
| Bit-31 exact-reference ledger | `040b33b3f8b6bc6b9b8e87c822bcb478c0eb45cbdaf65aad32210c9a5e747f2e` | Every exact reference to mask QName `36:29928` |
| Pack/select helper ledger | `1de92407fca33d10c963495c07e09e7819c0a9949eced3a47764938840bdbb76` | Exact helper callsites |
| Order-mutator caller ledger | `ef371aa5dc325b62ca183b4d9d8ff83e2b5e6499af0c8e4c0a0a75e8bb04c5fb` | Both exact calls to method 3703 |
| Mode-start policy caller ledger | `5800b025bed5282036a60285ed240759874117f7965d92a6f4ac09c6ac304d9e` | Sole exact call to method 3696 |
| Runtime-order reference ledger | `c448b9326ccbc08e39e0b984222f607eb8f7131a439d1139431ff27cb9459f4b` | Every exact reference to counter QName `36:25997` |

The analyzer decodes all 15,010 method bodies, rejects invalid branch targets, verifies every replay hash, and fails when any pinned identity, anchor, caller set, or ledger changes.

## Packed producer closure

The packed field is `_-o2f._-b1T`, QName `36:21060`, typed as AVM2 `uint`. Bit 31 uses `_t4x._-Gz`, QName `36:29928`, initialized to `0x80000000`.

### Clear defaults

Costume default builder method 2037 reads `mWeaponSkin1` and `mWeaponSkin2` at PCs 190 and 194, pushes `false` at PC 197, and calls exact object packer method 14711 at PC 198. The helper conditionally ORs bit 31 only when that Boolean is true. The produced default is therefore clear.

`_-o2f.Reset`, method 4076, writes zero to the complete packed field at PCs 31-37. A reset loadout consequently has no skin IDs and a clear order bit.

### Shuffled loadouts

Method 3688 `_-C4M._-i5z` constructs shuffled hero and weapon combinations. Its generated packed vector is built at PCs 1462-1482 by supplying two resolved weapon skins and literal `false` at PC 1476 to exact packer method 14711. PCs 1583-1608 can copy each generated whole word into the supplied replay loadout vector.

This path randomizes hero and weapon combinations but not packed order polarity. Every whole word it semantically packs has `weapon2First` clear.

### Balanced-order mutator

Method 3703 `_-P2C._-l2Z` is the only direct set-or-clear mutation of bit 31 on an `_-o2f` loadout found in the pinned exact-QName writer and mask ledgers.

It first builds, for the supplied loadout range:

- a Boolean used-type table;
- a count per base weapon `ItemType` ID; and
- one encoded record per loadout containing its index and both base weapon type IDs.

The two count increments occur at PCs 314 and 335. For each encoded loadout, the method applies this ordered policy:

1. Select weapon 2 when weapon 1's type is already marked used.
2. Otherwise select weapon 2 when weapon 2's type is not used and its global occurrence count is lower than weapon 1's count.
3. Otherwise select weapon 1 when weapon 2's type is already used or weapon 1's count is lower.
4. If neither type is used and counts are equal, draw a tie breaker.

The used-type and count comparisons are at PCs 458-558. A true decision ORs `0x80000000` into the whole word at PCs 619-634 and marks weapon 2's type used. A false decision ANDs the whole word with `~0x80000000` at PCs 651-667 and marks weapon 1's type used. Both branches preserve every other bit.

The tie breaker has two exact forms:

- When the optional third parameter is a `Random`, PCs 571-584 evaluate `random.nextUint() % 2 == 0`.
- When it is null, PCs 590-611 evaluate `globalRandom.nextUint() / 4294967295 >= 0.5`.

Those forms are numerically distinct at the midpoint and must not be normalized into one host-language coin flip.

The complete exact caller set contains two methods:

| Caller | PC | Arguments | Policy context |
| --- | ---: | ---: | --- |
| Method 3696 `_-P2C._-M3o` | `304` | 3 | Supplies the match rules `Random`; invoked from the mode-3 setup path after detecting a zero packed loadout |
| Method 10753 `_-s52._-E5M` | `1375` | 2 | Runtime player/loadout path; omits the optional `Random`, so exact ties use the global fallback |

Method 10753 gates its call on game-mode value `3` at PCs 1343-1360. Method 3696's only exact caller is method 6936 PC 64, itself under the same mode-3 gate. The higher-level readable mode name is not proven and is not inferred.

### Configured whole-word ingress

Not every set bit is created by method 3703. Several paths accept or decode a complete caller-supplied `uint`, so bit 31 can arrive already set:

- Interface setters methods 2369 and 2418 assign a supplied whole word.
- Methods 3228 and 3282 populate whole words from client protocol readers.
- LinkUpdater methods 5257 and 5342 read the packed word as an unsigned value.
- Replay reader method 6510 restores the complete word at PCs 1171-1176.
- Copy and fallback methods, including 2238, 2431, 4080, 4081, 6361, and 11238, preserve or replace a whole packed value.

Class 123 method 2378 separately sets or clears bit 31 in staging field `_-ao._-m4S`; later interface calls can transfer that whole word into a loadout. This is a configuration producer, but it is not the `_-o2f._-b1T` field itself.

QName `36:21060` is reused by unrelated class-345 `IMap` storage. The packed-write ledger deliberately retains those syntactic references and the evidence disposes them by owner and type rather than pretending QName identity alone proves receiver identity.

The pinned writer/reader and copy ledger closes the exact-QName syntactic set in `main.abc`. It does not close `setslot`, runtime multinames, indirect dispatch, loaded code, or native host writes. It also cannot prove what values a server, native host, or loaded SWF supplies to a whole-word ingress.

## `ForcePrimaryWeaponFirst` is not a packed producer

Parser method 12936 is class 704 `_-R16`, static trait `_-l2j`. It parses the sole exact string `ForcePrimaryWeaponFirst` at PC 896, reads a Boolean at PC 907, and initializes field `_-X5Q`, QName `36:16784`, at PC 912.

The field is typed `Boolean`, has no explicit initializer, and therefore defaults to false. Its complete exact-reference set is only:

- parser assignment in method 12936 PC 912; and
- consumer read in method 12918 PC 311.

When true, method 12918 follows PCs 318-325 and writes literal zero to nested runtime field `_-l2q`, QName `36:25997`. When false or absent, it skips that write. No method in the runtime-order reference ledger directly references packed QName `36:21060`, and no method in the packed-field ledger directly references runtime-order QName `36:25997`.

The exact relationship is:

```text
ForcePrimaryWeaponFirst == true
  -> runtimeWeaponOrderCounter = 0
  -> next modulo-two item selection chooses mBaseWeapon1

ForcePrimaryWeaponFirst == false or absent
  -> no override
  -> independently initialized runtime counter remains in effect
```

There is no packed-bit assignment, bitwise inversion, or repack call on this path.

## Gameplay spawn and pickup ordering

### Default runtime order

Class 87 `_-Y4C` constructor method 1492 initializes runtime counter `_-l2q` at PCs 564-588 from:

```text
match item PRNG nextUint() % 2
```

This is a separate random draw from method 3703's packed-order balancing. It produces initial counter value zero or one.

### Two item-creation consumers

Method 1518 `_-Y4C._-G5l` reads the counter, preserves its old value, increments the stored value, and evaluates `old % 2 == 0` at PCs 440-470. The true branch resolves hero `mBaseWeapon1` at PC 488; the false branch resolves `mBaseWeapon2` at PC 505. It then constructs and admits the selected item through the enclosing gameplay path.

Method 3578 `_-W1n._-x31` independently performs the same operation at PCs 126-178:

```text
old = runtimeWeaponOrderCounter
runtimeWeaponOrderCounter++
selected = old % 2 == 0 ? mBaseWeapon1 : mBaseWeapon2
```

These paths prove alternating base-weapon selection and exact parity. They do not prove that either method is the first reachable grant for every replay-producing mode.

### Other overrides and persistence

Method 1613 writes runtime counter `1` when an independent state value equals `2`, otherwise `0`, for two fighter references at PCs 15-90. This special-state override is separate from both the packed word and the tutorial setting.

Methods 7188 and 7195 write and read the counter as an unsigned value in another runtime state serialization path. Counter persistence therefore cannot be modeled as unconditional reconstruction from packed bit 31.

## Corpus observation

The authenticated local cohort contains 12 format-268 replays and 48 loadouts:

- bit 31 set: 2
- bit 31 clear: 46

The cohort proves that both packed values occur in authentic replay bytes. It covers completed online timed four-player free-for-all matches under the already reviewed playlist-108 boundary. It does not identify which semantic producer created each value and does not cover the full replay-producing match universe.

## Why ticket acceptance remains unmet

Four precise blockers remain:

1. **Replay-producing universe:** prior writer-eligibility research proves only the authenticated playlist-108 completed-match cohort. It does not enumerate every configuration whose upstream runtime can dispatch replay saving.
2. **Whole-word origin:** client protocol, LinkUpdater, server-authored, native host, and loaded-code boundaries can provide an already packed uint. The pinned `main.abc` proves decoding and preservation, not every external producer policy.
3. **Force timing:** static control flow proves the tutorial setting's write, but not that method 12918 dominates the first weapon-item creation on every replay-producing tutorial or special-mode lifecycle.
4. **Complete gameplay lifecycle:** two alternating item-creation paths and one special override are exact, but reset, KO, respawn, morph, reconnect, dynamically dispatched grant, and every mode-specific bypass are not closed into one reachable lifecycle graph.

Until these close, a simulator may preserve packed `weapon2First` and may implement only the proven bounded order rules behind an explicit conformance boundary. It must not derive ordinary gameplay pickup order from packed bit 31 or treat `ForcePrimaryWeaponFirst` as its inverse producer.

## Reproducible validation

Keep proprietary inputs under ignored paths or outside the repository. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:weapon-order-producer-policy -- \
  --abc /path/to/hash-pinned/main.abc \
  --manifest /path/to/hash-pinned/manifest.json
```

Useful bounded output:

```bash
bun run provenance:weapon-order-producer-policy -- ... \
  | jq '.status, .identity, .weaponOrderProducerPolicy, .referenceClosure.digests, .reviewedCorpus'
```

Successful analysis reports the prior packed-flag status `proven-for-reviewed-inputs` and nested producer-policy status `bounded-static-closure` with `acceptanceMet: false`. It reports 15,010 decoded bodies, valid branch targets, 12 fixtures, 48 loadouts, and the ledger hashes above.

The analyzer emits no ABC bytes, replay bytes, fixture names, player names, player IDs, account data, or local input paths. Operating-system errors can still reveal a caller-supplied path.

## Ticket and map impact

The bounded result prevents one incorrect route: `ForcePrimaryWeaponFirst` must not be specified as an inverse packed-bit producer. Packed skin preference, mode-3 loadout balancing, and ordinary gameplay base-weapon alternation are separate concerns.

The surfaced route is to close **runtime weapon pickup-order lifecycle and whole-word ingress reachability** after the replay-producing match universe and trusted runtime tracing are available. That route must join first-grant dominance, counter resets and persistence, mode-specific overrides, and external whole-word producers before this ticket can be closed.

No other ticket was claimed or modified during this investigation.
