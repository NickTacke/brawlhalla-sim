# Inherited and repeated-hit lifecycle in Brawlhalla 10.09.96325

Issue: [Close inherited and repeated-hit lifecycle semantics](https://github.com/NickTacke/brawlhalla-sim/issues/71)

## Verdict

**Bounded static lifecycle closure, with ticket acceptance still unmet.** The hash-pinned executable proves that qualifying powers own distinct target-ID-to-last-hit-time collections. Inheritance copies entries into a separately allocated destination and does not alias collection or vector identity. Repeat admission distinguishes absent targets from timestamp zero, blocks a present target with a zero interval, blocks a positive interval only while `priorTime + interval > currentTime`, and therefore admits equality.

Successful target hits write `currentTime` before target `OnHit`. Transition detach, spawned-combo copy, ordinary teardown, and rollback replacement have separate exact timings. In the authoritative tick, active-power repeat processing and combo lifecycle run before pairwise arbitration, whose survivors then reach admission.

Static proof does not establish replay-producing reachability for every relevant PowerType combination. No authenticated interpreted-runtime trace covers the lifecycle matrix. Under this ticket's acceptance rule, it must remain open.

## Evidence grades

- **Proven static:** unique typed AVM2 construction, collection operation, branch direction, call order, or serialization dataflow in the pinned ABC.
- **Source-derived:** inventory or value read from the pinned shipped PowerTypes table.
- **Bounded static closure:** complete exact-QName and method-code ledgers for the fixed inputs without universal runtime reachability.
- **Unknown:** no authenticated trace or executable-root proof closes the claim.

Issue 1 was read only as a low-resolution map. Related evidence came from [Specify offensive target modes and pairwise hit policy](https://github.com/NickTacke/brawlhalla-sim/issues/52) and [Close downstream semantics for offensive target modes](https://github.com/NickTacke/brawlhalla-sim/issues/69). Repository implementation was not treated as reference-game evidence.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Reference build | `10.09.96325` | Sole semantic build string in the ABC |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Collection lifecycle, repeat gates, copies, resets, and ordering |
| Extracted `powerTypes` | `715468d8eda8fa2ec3d88a8b5395c076bec937640927909add4745eda2883f27` | Parser values and source frequencies |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |
| Lifecycle source ledger | `632a14fe257079a608271a3f6daabe85ea0f776555beda7ae23af3b6de0ab24a` | Power identity, `IsMultihit`, `MinTimeBetweenHits`, and `InheritAlreadyHit` |
| Repeated-hit collection references | `be9eadf3ad602d5bf3d881516493bbcd7313797c65f0ad65d2f6079c3659420e` | Complete `_-M5v._-D3h` lifecycle |
| Collection-key references | `deaade0745746156efbd4927472b023d700c599ad360862630d6447ea76b2a6e` | Complete `_-06J._-p4i` lifecycle |
| Collection-value references | `35a076645af423ced0263835c19ec41946656dd0128307e58285f8ed0932f9ad` | Complete `_-06J._-4i` lifecycle |
| `MinTimeBetweenHits` references | `17257565ce788c9f77089ccf9b57f7630769f81f2e16344254572e614cdade0a` | Complete PowerType `_-s2L` references |
| `InheritAlreadyHit` references | `f935d99d67af9f74d03dd4cd79040ce7a0691fa816105550aa1a68291a21a6b2` | Complete PowerType `_-46W` references |
| `IsMultihit` references | `ea649ee5a0acfc1bd580aa178e2f82ccd56968e71ccf79b1ec0fafba981ce199` | Allocation and normalization policy |
| Special allocation-override references | `3fc826862eec0ee895561fcd4df73bee103f383e49209238d33e7dec9bb579ba` | Complete PowerType `_-B24` references |
| Hit-occurred references | `10a2c27570ab43a86cbdf31c1594be9183b05da4286bd4d451818f619981cdfa` | Complete power-instance `_-f1Z` references |

The analyzer decodes all 15,010 method bodies, rejects invalid branches, pins the source and exact-QName ledgers, pins 20 lifecycle method bodies, and asserts every anchor below. It also asserts twelve branch destinations, exact QNames for copy and call-chain edges, timestamp-write argument order, and rollback sentinel, length, replacement, and destroy edges. The full method-code digest table is emitted by the reproducible command rather than duplicated here.

## Collection model and allocation

Power-instance field `_-M5v._-D3h : _-948` is structurally the per-power `targetId -> lastHitTime` collection. Class `_-948` extends `_-06J`. Base constructor method 92 creates separate `Vector.<uint>` key and value objects:

- `_-p4i`: target IDs, stored at PC 35;
- `_-4i`: unsigned hit timestamps, stored at PC 17.

Method 94 `Set(key, value, updateExisting)` checks the key vector with `indexOf` at PC 9. A missing key appends to both vectors at PCs 32 and 46. An existing key is replaced only when `updateExisting` is true.

Power constructor method 39 allocates the collection at PCs 246 through 251 exactly when:

```text
!IsMultihit || MinTimeBetweenHits != 0 || special _-B24
```

The three predicate reads occur at PCs 191, 209, and 230. Otherwise the typed field remains null. A null collection means no collection-based repeat tracking. A nonnull empty collection means tracking is active but no target has been recorded.

## Copy versus alias

Method 95 `_-s4d(source)` iterates the source vectors and calls destination `Set(key, value, true)` at PC 59. It never assigns either source vector or the source collection to the destination.

Inheritance is therefore an entry copy into independently allocated vectors, not an alias. Later writes, teardown, or rollback replacement of one collection cannot mutate another collection's vectors.

Method 97 separately proves that lookup returns unsigned zero when a key is absent. Repeat admission does not infer presence from that value: method 1540 tests `keys.indexOf(targetId)` first. Timestamp zero and absence remain distinct states.

## Source absence and zero normalization

PowerType parser method 6294 binds:

- `InheritAlreadyHit -> Boolean _-46W` at PCs 7005 through 7022;
- `IsMultihit -> Boolean _-i5R` at PCs 7139 through 7155;
- `MinTimeBetweenHits -> uint _-s2L` at PCs 7520 through 7538.

Concrete unsigned accessor method 2084 calls `parseInt` at PC 43, followed by the caller's uint coercion. Empty text and the source anomaly `true` become `NaN`, then unsigned zero under the pinned AVM2 numeric contract. A missing uint slot also defaults to zero. Explicit `0`, empty/absent, and literal `true` therefore reach the same initial uint value.

Parser method 6294 has one later normalization: when `IsMultihit` is true, a combo array exists, and the interval is zero, PCs 13547 through 13562 write interval `1`.

Source frequencies are not reachability counts:

| `MinTimeBetweenHits` source text | Records |
| --- | ---: |
| empty | 3,666 |
| `0` | 1 |
| `2` | 2 |
| `7` | 1 |
| `true` | 1 |

An absent `InheritAlreadyHit` Boolean remains false. The source has 259 case-insensitive true values, five case-insensitive false values, and 3,407 empty values.

## Repeat-gate truth table

Method 1540 applies the same policy to two target branches. The first presence lookup is PC 343; the second is PC 674.

| Collection state | Interval | Result at repeat gate |
| --- | ---: | --- |
| null | any | collection-based repeat gate is bypassed |
| nonnull, target absent | any | not blocked; a successful hit writes the target |
| nonnull, target present | `0` | blocked because the timed replacement branch is skipped |
| nonnull, target present | positive | blocked while `priorTime + interval > currentTime` |
| nonnull, target present | positive, equality | admitted when `priorTime + interval == currentTime` |

For the first branch, method 1540 reads interval at PCs 371 and 399, reads prior time at PC 392, adds at PC 402, and compares with `greaterthan` at PC 405. The second comparison is PC 736. The strict comparison proves equality admission without an inferred boundary.

AVM2 `add_i` and unsigned conversions remain part of the pinned numeric contract. A simulator must preserve their 32-bit behavior rather than substituting unbounded host arithmetic.

## Hit-time write timing

For an admitted successful target, method 1540 calls:

```text
collection.Set(targetId, currentTime, true)
```

The two write sites are PCs 2986 and 3073. Both precede target `OnHit` at PC 3519. A first hit appends; an equality-admitted repeat replaces the prior time.

Method 46 separately may bulk-write every enumerated target ID after method 1540 returns a nonzero hit count. Its `Set` call is PC 2525. This bulk propagation is later than method 1540's direct successful-hit decisions and earlier than the spawned-combo inheritance path. The two write mechanisms must not be collapsed.

## `InheritAlreadyHit` conditions

### Combo selection

Method 1538 considers a nonnull combo override `_-G25` at PC 432. It returns that override when either:

```text
activePower._-t3M != 0
OR (currentPowerType.InheritAlreadyHit && activePower._-f1Z)
```

The prior-combo count, inheritance flag, hit-occurred flag, and selected override are read at PCs 447, 462, 472, and 484. This chooses a combo name. It is not itself a collection copy.

### Phase-transition copy

Method 1551 captures the old collection at PC 419. If nonnull, it immediately writes source `_-D3h = null` at PC 446. Later it copies old entries only when:

1. the successor PowerType has `InheritAlreadyHit == true` (PC 2133);
2. the successor has a nonnull, separately allocated destination (PC 2144);
3. the captured old collection is nonnull.

The destination calls `_-s4d(old)` at PC 2183. The source field has already been detached, but collection identity is still not transferred to the successor: entries are copied.

### Spawned-combo copy

Method 46 has an independent path. It requires the current collection nonnull at PC 3884, successor `InheritAlreadyHit` true at PC 3904, and successor destination nonnull at PC 3916. It calls destination `_-s4d(source)` at PC 3946.

This path does not detach the source. Both source and successor retain independent collections after the copy. Neither path manufactures destination storage when the constructor allocation predicate left it null.

## Reset and rollback timing

Ordinary power teardown method 77 calls collection `Destroy` at PC 533, then writes `_-D3h = null` at PC 546. Base method 99 implements `Destroy` by nulling key and value vectors at PCs 10 and 22.

Rollback uses exact replacement, not merge semantics:

- writer method 7233 reads `_-D3h` at PC 1014;
- null writes signed `-1`;
- nonnull writes vector length, then ordered keys and values at PCs 1106 and 1124;
- reader method 7235 allocates or reuses a collection, replaces both lengths and entries at PCs 1358 and 1377, and stores it at PC 1438;
- a `-1` snapshot destroys an existing collection and restores null.

Vector order survives rollback even though gameplay lookup is by target ID.

## Global ordering against arbitration and admission

The hash-pinned call chain is:

```text
method 3217 fighter _-LV update, PC 2788
  -> fighter method 2893 manager _-V6Z, PC 98
    -> manager method 1497 phase _-kn, PC 43
      -> method 1551 active power _-81I, PC 227
        -> method 46 repeat application _-06D, PC 2400
          -> repeat reads, direct writes, bulk writes, combo copy/reset
method 3217 pairwise arbitration _-Z29, PC 2822
  -> method 1474 survivor admission _-S6I, PC 2236
```

Thus active repeat reads/writes and combo lifecycle happen before same-tick pairwise arbitration, and arbitration happens before survivor admission. A power admitted by the later arbitration path does not retroactively join the already completed active-power update phase in this tick.

Related issue 52 pins arbitration within method 1474 as higher Priority, then higher source Strength, then lower source Damage, followed by loser marking and survivor admission. This report closes where repeated-hit lifecycle sits around that policy; it does not claim the still-open complete target-mode or owner/team/state matrix.

## Reproduction

Keep proprietary inputs ignored or outside the repository. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:repeated-hit-lifecycle -- \
  --abc /path/to/hash-pinned/main.abc \
  --power-types /path/to/hash-pinned/Game.swz.38.dat
```

Useful bounded view:

```bash
bun run provenance:repeated-hit-lifecycle -- ... \
  | jq '{status, identity, source, collection, repeatGate, inheritance, reset, globalOrder, blockers}'
```

Expected status is `bounded-static-repeated-hit-lifecycle-closure-with-trace-and-reachability-blockers`, with build `10.09.96325`, 15,010 decoded methods, valid branch targets, 3,671 source records, eight fixed exact-QName ledgers, and 20 fixed method-code digests.

A mismatched ABC, PowerTypes source, source ledger, QName ledger, method body, owner, instruction anchor, or branch target fails closed.

The command emits no ABC bytes, source rows, power names, local paths, replay bytes, player data, or private corpus content. Operating-system errors can still reveal a caller-supplied path.

## Closed static contract

A reference-compatible implementation must preserve:

1. allocation under the exact constructor predicate;
2. target presence independently from timestamp value;
3. present-zero blocking and absent-target admission;
4. strict positive-interval comparison with equality admitted;
5. successful-hit timestamp writes before target `OnHit`;
6. entry-copy inheritance into a preallocated independent destination;
7. transition detach versus spawned-copy non-detach;
8. teardown destroy/null and rollback exact replacement;
9. active lifecycle before same-tick arbitration before admission.

This is evidence for a later combat specification, not a combat implementation.

## Acceptance blockers

1. **Reachability:** no closed replay-producing root proves every relevant PowerType row and lifecycle branch is executable across the supported match universe.
2. **Runtime traces:** no authenticated interpreted-runtime trace covers absent and timestamp-zero distinction, present-zero blocking, equality admission, both inheritance paths, write-before-`OnHit`, teardown, rollback, or same-tick arbitration interaction.
3. **Broader admission policy:** downstream target-mode and complete owner/team/mode/assist/grab/dead/invulnerability semantics remain owned by related open research, not this ticket.

These are missing proof obligations, not inferred behavior. Complete reachability and traces remain unavailable, so the ticket acceptance condition is unmet and the issue must stay open.

## Surfaced route

Leave unclaimed:

- close replay-producing PowerType executable roots and lifecycle-path reachability through the existing reachability route;
- capture authenticated interpreted-runtime traces after the trusted reference oracle can run complete-AIR scenarios;
- use this analyzer's exact zero, equality, inheritance, teardown, rollback, and phase-order matrix as the trace contract.

## One-line map gist

Pinned AVM2 proves per-power non-aliased hit histories, strict positive timing with equality admission, unconditional present-zero blocking, conditional deep-copy inheritance, exact write/reset timing, and lifecycle-before-arbitration-before-admission; complete reachability and authenticated traces remain open.
