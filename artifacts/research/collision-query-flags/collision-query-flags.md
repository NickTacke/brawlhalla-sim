# Collision query options and composite flag consumers in Brawlhalla 10.09.96325

Issue: [Close collision query options and composite flag consumers](https://github.com/NickTacke/brawlhalla-sim/issues/48)

## Verdict

**Bounded static closure only. Issue 48 acceptance is not met.**

The hash-pinned build proves method 1390's candidate filters, option-bit branches, output mutations, base collision bits, composite flag values, and a direct syntactic ledger of **93 calls across 38 methods**. The observed direct-call query masks reduce to hard `1`, soft `2`, hard-or-soft `3`, and no-slide flag `16`. Observed option values are `0`, `4`, `8`, `9`, and `11`.

Static consumers also prove several bounded responses: bounce selects a `0.9` reflection scale in one fighter path; sticky creates a current-tick-plus-`5000` timestamp gate in fighter and companion paths; pressure-plate and game-mode bits dispatch owner-specific callbacks; and lava reaches a `PowerType` lookup and power-processing path.

These facts are not universal behavior closure. **Acceptance remains unmet because complete reachable caller classification, exact phase closure, dynamic tie/container arbitration, and trusted differential traces remain unresolved.** Owner-specific response fragments do not establish every fighter, item, projectile, or mode response, nor their authoritative tick order.

## Evidence grades

- **Proven:** exact instruction, typed trait, constant initialization, or control/dataflow in the hash-pinned ABC.
- **Bounded direct ledger:** every syntactic `callproperty _-K2O` instruction found in the pinned ABC, grouped by containing method. This is not a reachable-callgraph proof.
- **Source-derived inventory:** counts established by the hash-pinned Dynamic archive analysis in the related level-collision resolution.
- **Unknown:** the inspected evidence does not close runtime reachability, phase, arbitration, or differential behavior.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Method 1390, callsites, constants, composite consumers; rechecked locally |
| Sole semantic build string in the ABC | `10.09.96325` | Reference-build identity; rechecked locally |
| `Dynamic.swz` | `cd54de039bc4e3441a7ae5811ef8748a719f49e0d4917016407d83b201ddf9c4` | Collision-tag inventory inherited from the related issue 33 resolution |
| Dynamic section ledger | `263810dd34872df587c8139ac5a3f83faaff429fee18f072e142a7051efa1e24` | Ordered 186-section identity inherited from issue 33 |
| LevelDesc root ledger | `60630e3860e64d2d04deda1075d6cdb0f89e37cfaffd2ed8134f3dde95bbad99` | Ordered 120-root identity inherited from issue 33 |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |

The ABC contains 15,010 decoded method bodies. Read-only decoder enumeration produces 93 direct calls across 38 containing methods; the ledger below sums to the same totals.

## Collision type and flag values

Method 14909 PCs 12128-12228 initializes the extra flag fields as successive powers of two. Static registration method 850 composes readable collision names. Method 5156 supplies the exact XML vocabulary.

| Structural meaning | Field | Value |
| --- | --- | ---: |
| Hard base | literal | `1` |
| Soft base | literal | `2` |
| Trigger base | literal | `4` |
| Sticky | `_-X2i._-uW` | `8` |
| No-slide | `_-X2i._-zM` | `16` |
| Item-ignore | `_-X2i._-l3j` | `32` |
| Bounce | `_-X2i._-r2u` | `64` |
| Game-mode / mud shared bit | `_-X2i._-U5E` | `128` |
| Pressure plate | `_-X2i._-93C` | `256` |
| Lava | `_-X2i._-J5i` | `512` |
| Next registered extra bit, used by recognized ice vocabulary | `_-X2i._-X2Q` | `1024` |

### Registered compositions

| Readable collision name | Exact value | Composition |
| --- | ---: | --- |
| `HardCollision` | `1` | hard |
| `SoftCollision` | `2` | soft |
| `TriggerCollision` | `4` | trigger |
| `StickyCollision` | `9` | `1 | 8` |
| `NoSlideCollision` | `17` | `1 | 16` |
| `ItemIgnoreCollision` | `49` | `1 | 32 | 16` |
| `BouncyHardCollision` | `65` | `1 | 64` |
| `BouncySoftCollision` | `66` | `2 | 64` |
| `BouncyNoSlideCollision` | `81` | `1 | 16 | 64` |
| `GameModeHardCollision` | `129` | `1 | 128` |
| `PressurePlateCollision` | `257` | `1 | 256` |
| `SoftPressurePlateCollision` | `258` | `2 | 256` |
| `LavaCollision` | `657` | `1 | 16 | 128 | 512` |
| `MudCollision` | `128` | game-mode / mud shared bit only, not hard |

`MudCollision` is exactly `128`. It does not carry hard bit `1`. Therefore mud cannot be given ordinary hard-collision behavior merely from its readable name.

### Reviewed Dynamic inventory

| Element | Count | Levels | Exact structural value |
| --- | ---: | ---: | ---: |
| `HardCollision` | 1,792 | 117 | `1` |
| `SoftCollision` | 272 | 92 | `2` |
| `NoSlideCollision` | 235 | 34 | `17` |
| `BouncyHardCollision` | 72 | 9 | `65` |
| `BouncySoftCollision` | 1 | 1 | `66` |
| `BouncyNoSlideCollision` | 2 | 1 | `81` |
| `GameModeHardCollision` | 2 | 1 | `129` |
| `LavaCollision` | 43 | 8 | `657` |
| `MudCollision` | 1 | 1 | `128` |
| `PressurePlateCollision` | 18 | 4 | `257` |
| `SoftPressurePlateCollision` | 3 | 1 | `258` |
| `DynamicCollision` containers | 175 | 47 | `PlatID` association, not another type bit |

`StickyCollision`, `ItemIgnoreCollision`, `TriggerCollision`, and `IceCollision` are recognized vocabulary but do not occur in the reviewed 120 Dynamic roots. Graphics-derived or unresolved level assets could still introduce them, so absence from these roots is not universal absence.

## Method 1390 exact static semantics

Method 1390 is class 76 `_-91W._-K2O`. It has 13 parameters, 10 required:

```text
(int, Number, Number, Point, Point, _-L3i, Point, Point,
 uint queryMask, uint queryOptions, int, uint excludedTypeMask, *) -> _-L3i
```

The trailing defaults decode as `0`, `0`, and `undefined`. Parameter 11 is not read by this body. Parameter 12 is an additional collision-type exclusion mask. Parameter 13 is an optional collection receiving unique accepted segments.

### Ordered algorithm

1. **Zero-motion exit, PCs 24-49.** If the input movement point has both components zero, return `null`.
2. **Ray endpoint, PCs 77-91.** Compute `end = start + movement` using AVM2 `Number` operations.
3. **Candidate range, PCs 93-154.** Call `_-K4Z(startX, startY, endX, endY, _-91W._-A1t)` and iterate the resulting ordered slice of the global segment list.
4. **Required type mask, PCs 164-180.** Skip when `(segment.type & queryMask) == 0`.
5. **Disabled dynamic line, PCs 184-193.** Skip when `segment._-62S` is true.
6. **Same-container exclusion, PCs 197-224.** When `segment._-i1K != 0` and equals parameter 1, skip it.
7. **Additional type exclusion, PCs 228-245.** Skip when `(segment.type & excludedTypeMask) != 0`. Eight direct calls explicitly pass item-ignore bit `32` here.
8. **Option bit 2 dynamic exclusion, PCs 249-280.** If `(queryOptions & 2) != 0`, skip every segment with nonzero `segment._-i1K`.
9. **Explicit segment exclusion, PCs 284-292.** Skip the exact segment supplied as parameter 6.
10. **Prior-hit / coincident-candidate branch, PCs 296-480.** The body compares a prior accepted segment, hard-versus-soft type, normal presence, sentinel-normal values, start coordinates, and the optional collection. This branch is exact bytecode but its complete tie/container arbitration is not semantically closed.
11. **Early normal-direction filter, PCs 484-801.** It runs only when `(queryOptions & (1 | 4 | 8)) == 0` and the segment has an explicit normal. It rejects direction/normal combinations through horizontal, vertical, and diagonal sign tests.
12. **Signed-side value, PCs 805-856.** Compute the ray/segment signed-side value through `_-f0._-C6F`.
13. **Soft one-sided gate, PCs 858-915.** Admit this gate when any condition is true:

```text
signedSide >= 0
or (queryMask & 2) == 0
or (segment.type & 2) == 0
or (queryOptions & 1) != 0
```

14. **Intersection, PCs 919-972.** `_-o2Z._-B14` tests the finite ray against the segment. On success, the segment becomes the current accepted hit.
15. **Outputs and continuation, PCs 974-1119.** Optional point outputs receive the computed normal/intersection values. Without a collection, accepted intersection coordinates shorten the remaining movement considered by later candidates. With parameter 13 present, the segment is appended only if not already present.
16. **Option bit 4 post-filter, PCs 1127-1403.** When bit `4` is set and a hit exists, four sign/component comparisons between the hit normal, requested movement, and accepted displacement can clear the hit. This is distinct from the early normal filter that bits `1`, `4`, and `8` bypass.
17. **Return mutation, PCs 1405-1474.** On a surviving hit, parameter 5 receives the intersection point, parameter 4 receives the accepted displacement components, and the segment is returned. Otherwise return `null`.

### Option bits

| Bit | Exact method-1390 effect | Boundary |
| ---: | --- | --- |
| `1` | Bypasses the soft signed-side rejection and suppresses the early explicit-normal direction filter | Does not itself identify fighter drop-through intent |
| `2` | Rejects every segment whose dynamic/container ID field `_-i1K` is nonzero | Dynamic lifecycle and why a caller requests this remain unresolved |
| `4` | Suppresses the early explicit-normal filter, then enables the four-component post-hit invalidation at PCs 1127-1403 | Higher-level semantic name is not proven |
| `8` | Suppresses the early explicit-normal filter | No separate method-1390 branch was found for bit `8` |

No other option bits are tested by method 1390.

### Arbitration boundary

Method 1390 processes the `_-K4Z` candidate order sequentially, can shorten the movement after a hit, and has special prior-hit/coincident logic. This investigation did not close:

- the invariant governing `_-K4Z` ordering for all static and dynamic containers;
- equal-distance and shared-endpoint tie precedence;
- how moving-container refresh changes that order;
- whether every collection-mode caller interprets the collected order identically.

Therefore “nearest segment wins” or any universal hard-over-soft tie rule would be an unsupported inference.

## Direct query-call ledger

The ledger below is complete for direct syntactic `callproperty _-K2O` instructions in the pinned ABC. It is not a proof that all 93 sites are reachable from replay-producing matches, and it does not include indirect dispatch under another trait name.

| Method | Owner | Calls | Exact PCs |
| ---: | --- | ---: | --- |
| 44 | `_-M5v._-b5W` | 2 | 563, 2171 |
| 53 | `_-M5v._-J3Q` | 1 | 118 |
| 66 | `_-M5v._-C1U` | 1 | 436 |
| 763 | `_-d1H._-HO` | 1 | 306 |
| 784 | `_-d1H._-i3F` | 1 | 477 |
| 801 | `_-m4s._-F2Q` | 1 | 1278 |
| 919 | `CTFState._-F2Q` | 1 | 1760 |
| 1386 | `_-91W._-u` | 1 | 93 |
| 1501 | `_-Y4C._-J20` | 1 | 391 |
| 1503 | `_-Y4C._-Q2f` | 2 | 543, 638 |
| 1537 | `_-Y4C._-vk` | 2 | 1129, 1259 |
| 1540 | `_-Y4C._-06D` | 10 | 1264, 1587, 1687, 1966, 2066, 2254, 2399, 2543, 2688, 3265 |
| 1641 | `Companion._-D38` | 12 | 699, 1107, 1790, 1884, 2449, 2636, 2730, 4154, 4549, 4823, 5641, 5734 |
| 1683 | `_-w3J._-d5t` | 1 | 579 |
| 1687 | `_-w3J._-u4o` | 1 | 1256 |
| 1688 | `_-w3J._-04U` | 1 | 465 |
| 1720 | `_-w3J._-841` | 1 | 592 |
| 1722 | `_-w3J._-717` | 1 | 258 |
| 1739 | `_-w3J._-P6M` | 1 | 200 |
| 1740 | `_-w3J._-K6G` | 1 | 126 |
| 2681 | `_-128._-G6j` | 1 | 109 |
| 2684 | `_-128._-r4z` | 1 | 187 |
| 2685 | `_-128._-Xe` | 1 | 188 |
| 2887 | `_-V4R._-D38` | 13 | 3329, 4021, 6944, 7047, 7378, 7918, 8113, 8216, 10380, 11009, 11321, 12508, 12610 |
| 2907 | `_-V4R._-323` | 1 | 267 |
| 2914 | `_-V4R._-fC` | 2 | 220, 398 |
| 2972 | `_-V4R._-14X` | 1 | 146 |
| 3176 | `_-d35._-D5f` | 1 | 240 |
| 4172 | `_-I5Y._-73t` static | 5 | 240, 327, 703, 852, 929 |
| 4189 | `_-u5P._-D5f` | 1 | 376 |
| 5076 | `_-82U._-2a` | 4 | 627, 674, 783, 830 |
| 5881 | `_-21m._-wc` | 2 | 729, 839 |
| 5886 | `_-21m._-vz` | 3 | 198, 298, 798 |
| 5887 | `_-21m._-y4J` | 1 | 558 |
| 6102 | `_-q4V._-O5i` | 1 | 581 |
| 7240 | `_-04B._-W1I` | 3 | 823, 1574, 4634 |
| 12611 | `_-o5r._-F2Q` | 1 | 1320 |
| 14750 | `_-62._-D38` | 8 | 1413, 4804, 4910, 5518, 5694, 5800, 6570, 6675 |
| **Total** | **38 methods** | **93** | |

Readable owners prove that the syntactic set includes at least mode logic (`CTFState`), companion logic, and several major entity systems. Most owners remain obfuscated. Inheritance and name proximity are not enough to classify every site as fighter, item, projectile, bot, or mode behavior. Complete reachable caller classification remains a blocker.

## Observed masks, options, and optional arguments

### Query masks

| Form in direct ledger | Calls | Reduced value |
| --- | ---: | ---: |
| Literal hard | 54 | `1` |
| Literal hard-or-soft | 16 | `3` |
| Literal soft-or-hard, reversed expression | 1 | `3` |
| Literal soft | 3 | `2` |
| Literal no-slide flag only | 1 | `16` |
| Five local-mask variables across 18 calls | 18 | runtime `1` or `3` only |

The local-mask definitions were traced and close to either hard `1` or hard-or-soft `3`. No direct call queries trigger bit `4`, sticky `8`, item-ignore `32`, bounce `64`, game-mode `128`, pressure `256`, or lava `512` as its positive `queryMask`.

The lone flag-only query uses no-slide `16`. Because composite no-slide lines also contain hard bit `1`, hard queries can still return them. The flag-only query asks specifically for the no-slide attribute family.

### Query options

| Option value | Calls | Composition |
| ---: | ---: | --- |
| `0` | 67 | default filters |
| `8` | 21 | bypass early explicit-normal filter |
| `9` | 2 | `1 | 8` |
| `4` | 2 | post-hit component filter plus early-filter bypass |
| `11` | 1 | `1 | 2 | 8` |

### Trailing optional arguments

- 69 calls pass only the 10 required arguments.
- 10 calls pass 12 arguments, supplying parameter 11 as zero and a runtime exclusion mask for parameter 12.
- 14 calls pass all 13 arguments.
- Eight full calls pass item-ignore bit `32` as `excludedTypeMask` and `null` as the final collection.
- Six full calls pass zero exclusion and a runtime collection/output object.

## Composite consumers and bounded responses

| Flag | Proven consumers or response | Exact numeric behavior | Unresolved boundary |
| --- | --- | --- | --- |
| No-slide `16` | Methods 1052, 1641, 2887, and 3053 contain direct tests. Branches clamp or zero owner velocity components and alter surface handling. One method-1390 call queries mask `16` alone. | Several writes use exact zero; companion fallback horizontal response selects `-10` or `10` in one no-slide-adjacent branch. | No universal no-slide formula or authoritative phase is proven. |
| Bounce `64` | Fighter method 3053 PCs 228-253 tests bounce and selects reflection scale `0.9`; the later path reflects velocity against the collision normal. | Bounce path factor `0.9`. A separate owner-state branch can select `1.2`; that value is not established as bounce's value. | Other entity families and repeated-contact ordering are unresolved. |
| Sticky `8` | Companion method 1641 PCs 5175-5270 and fighter method 2887 PCs 11725-11820 test sticky. | If the sticky timestamp is zero, write `currentTick + 5000`; while the timestamp remains greater than the current tick, one path zeros vertical velocity. | Tick placement, reset conditions, and behavior for all owners are unresolved. `5000` is a tick-domain offset in this static path, not proven milliseconds. |
| Item-ignore `32` | Method 1390 PCs 228-245 skips `segment.type & excludedTypeMask`; eight direct calls explicitly pass bit `32`. | Exact exclusion predicate, no arithmetic response. | Why each caller excludes item-ignore and all indirect callers remain unresolved. |
| Game-mode `128` | Fighter method 2887 tests it at PCs 3733, 9304, 10732, and 13099 and dispatches `_-N4f(collision, boolean)`; method 3053 dispatches `_-e2z`; method 3605 contains a ring-mode branch. | One ring-mode branch compares/assigns tick offsets including `560`. These are owner-specific, not a global collision constant. | Callback implementations, phase, and mode reachability are not closed. |
| Pressure plate `256` | Fighter method 2887 tests it at PCs 3799, 12119, and 12884 and dispatches `_-s4y(collision, entity)` through mode state. | Callback argument order is proven; no universal plate force or debounce constant is proven. | Plate state machine, team arbitration, activation phase, and release behavior remain unresolved. |
| Lava `512` | Methods 2894, 2980, 2987, 2988, 3018, 4027, and others test it. Method 3018 PCs 629-707 resolves `PowerType` from the segment's `_-KF` field and enters power processing. | Exact bit predicate and typed power lookup are proven. | Damage, knockback, immunity, cooldown, ownership, and phase are not closed. |
| Mud `128` | Mud is registered as the same `128` structural bit used by game-mode collision. Readable level vocabulary includes `MudPower`, `MudFallMult`, `MudFallStunMult`, `MudXSpeedMult`, `MudKillDepth`, and `MudJumpBack`. | Type value is exactly `128`; no hard bit. | No complete dataflow from every mud parameter through contact response was closed. |
| Trigger `4` | Registered base type and parsed vocabulary. | Exact value `4`. | No direct method-1390 query mask uses `4`, and reviewed Dynamic roots contain none. Gameplay response is unresolved. |

These response sites show that composite behavior is owner-specific. They do not justify a single generic “apply collision material” routine without per-owner and per-mode dispatch.

## Dynamic collision containers

`DynamicCollision` is structural association, not a collision-type bit. Method 5135 associates collision lines, spawns, navigation data, and animations through `PlatID`. Segment constructor method 1372 stores a numeric container identifier in `_-i1K`.

Method 1390 has three exact container controls:

1. Skip a line whose `_-62S` boolean is true.
2. Skip a nonzero `_-i1K` equal to parameter 1.
3. When option bit `2` is set, skip every line with nonzero `_-i1K`.

Field reference closure is narrow:

- `_-i1K`: six references across constructor 1372, method 53, and method 1390; digest `080ed368d7e7ee5239657adaa1d522390e590654d62bafe46ec361a5dbdc93ca`.
- `_-62S`: three references across method 1390 and `MovingPlatform` methods 5842/5843; digest `b5d7b7446a59373eea0218be8b434a22c53470ff755b672bd9dfdcb6282523a9`.

What remains unknown is gameplay-critical: when moving-platform methods toggle `_-62S`, when transformed lines are refreshed in the global candidate list, how equal-time contacts from the same or different containers arbitrate, and when entity carry occurs relative to query and response. Dynamic tie/container arbitration is therefore not closed.

## Acceptance matrix

| Issue 48 requirement | Status | Evidence and gap |
| --- | --- | --- |
| Method 1390 filters and outputs | **Partial** | Static algorithm and PCs are closed; prior-hit/coincident arbitration lacks a complete semantic invariant. |
| Every direct query call | **Satisfied, bounded** | 93 call instructions across 38 methods are enumerated. |
| Every reachable caller | **Failed** | Direct syntax is not a replay-producing reachability proof; obfuscated owners and indirect dispatch remain unclassified. |
| Exact direct-call masks | **Satisfied, bounded** | Values reduce to `1`, `2`, `3`, and `16`; conditional locals are bounded to `1` or `3`. |
| Exact option bits | **Partial** | Method effects and observed values `0/4/8/9/11` are closed; complete caller intent and phase are not. |
| Composite values and compositions | **Satisfied** | Base and extra bits, including mud `128` and lava `657`, are exact. |
| Every composite consumer and response | **Failed** | Several owner-specific consumers are proven, but complete fighter/item/projectile/mode reachability and responses are not. |
| Exact numeric behavior | **Partial** | `0.9`, `5000`, selected zero/clamp writes, and bounded callback constants are exact only at cited sites. |
| Exact phase and timing | **Failed** | Query, response, moving refresh, carry, and mode callback order within the authoritative tick are unresolved. |
| Dynamic tie/container arbitration | **Failed** | `_-i1K`, `_-62S`, and option bit `2` are known; ordering, ties, refresh, and carry are not. |
| Trusted differential traces | **Failed** | No trusted interpreted-reference collision trace exists for these cases. |

**Overall acceptance: unmet.** Complete reachable caller classification, exact phase closure, dynamic tie/container arbitration, and trusted differential traces remain unresolved.

## Verification and reproduction boundary

The identity and repository-health checks below are directly reproducible from a checkout plus caller-supplied proprietary inputs. Keep those inputs outside version control and pass paths explicitly.

```bash
shasum -a 256 /path/to/main.abc /path/to/Dynamic.swz
bun install --frozen-lockfile
bun run --cwd tools/avm2-provenance build-dependency
bun run check
```

The reviewed checkout reports 48 passing tests, 6 expected optional skips, 1 existing todo, and clean build, smoke, typecheck, and lint checks.

The bytecode ledger currently has a verification outline rather than a committed executable command. With the pinned `abc-disassembler`, decode all 15,010 method bodies, reject invalid branch targets, and assert:

1. Method 14909 PCs 12134-12228 initialize extra flags `8,16,32,64,128,256,512,1024`.
2. Method 850 registers every readable composition in the table above.
3. Method 1390 has 13 parameters, 10 required, and the exact PC predicates listed above.
4. Direct `callproperty _-K2O` enumeration yields 93 instructions in the 38-method ledger.
5. Raw direct masks consist of 54 literal hard, 17 literal hard-or-soft, 3 literal soft, 1 no-slide-only, and 18 local-mask calls bounded to `1` or `3`.
6. Direct options count as 67 value `0`, 21 value `8`, 2 value `9`, 2 value `4`, and 1 value `11`.
7. Eight calls pass item-ignore bit `32` as parameter 12.
8. Composite response anchors retain bounce `0.9`, sticky `currentTick + 5000`, pressure/game-mode callback dispatch, and lava `PowerType` lookup.

This investigation used ad hoc read-only decoder scripts rather than adding a checked-in issue-48 analyzer. Therefore the invariants are reproducible from the pinned ABC, but there is not yet a single committed fail-closed command for this ledger. Creating that analyzer is a surfaced follow-up, not evidence already completed.

The identity and repository checks are reproducible; the issue-specific bytecode assertions are not yet one-command reproducible. No differential reference test can currently be reproduced. Static formula agreement must not be reported as a reference collision match.

## Confidence and blockers

### High confidence

- Build and ABC identity.
- Base bits and extra flag values.
- Exact registered compositions, especially mud `128` and lava `657`.
- Method 1390's static filters, option branches, and mutations.
- The 93-call, 38-method direct syntactic ledger.
- Observed direct masks and option values.
- Cited owner-specific numeric fragments (`0.9`, `5000`, exact zero writes).

### Medium confidence

- Structural descriptions such as “bounce reflection scale” and “sticky timestamp gate,” because their immediate dataflow is exact but full owner lifecycle and phase are not.
- Direct-owner family descriptions where readable class names exist.

### Blockers

1. Complete replay-producing reachability and semantic classification of all 38 direct owner methods plus indirect dispatch.
2. Exact authoritative tick phase for query, response, mode callbacks, moving-line refresh, entity carry, and cleanup.
3. `_-K4Z` ordering and equal-distance/shared-endpoint arbitration across static and dynamic containers.
4. Complete responses for items, projectiles, companions, fighters, bots, and every reachable mode.
5. Complete mud parameter dataflow and pressure-plate state-machine behavior.
6. Moving-platform toggling of `_-62S`, container refresh, and `PlatID` lifecycle.
7. Trusted interpreted-reference traces for hard, soft, option overrides, slopes, bounce, no-slide, sticky, lava, mud, pressure plates, and dynamic collisions.
8. A committed fail-closed provenance analyzer for the issue-48 call and consumer ledgers.

## Surfaced ticket and fog suggestions

No additional ticket was claimed or created.

1. **Close direct and indirect collision-query reachability:** classify each of the 38 methods and prove which fighter, item, projectile, bot, companion, and mode configurations can reach it.
2. **Prove collision phase order:** place query, movement truncation, composite response, mode callback, moving refresh, carry, and cleanup in the authoritative tick.
3. **Close dynamic arbitration:** prove `_-K4Z` order, equal-time ties, shared endpoints, `_-i1K` ownership, `_-62S` toggles, and moving-container refresh.
4. **Split composite response closure by owner family:** fighter, companion, item/projectile, and mode-specific behavior should not be inferred from one another.
5. **Close mud and pressure-plate dataflow:** connect readable parameters and callbacks to exact state writes, cooldowns, team rules, and release behavior.
6. **Add a fail-closed collision-query provenance command:** pin the 93-call ledger, masks, options, method-1390 PCs, constants, and response anchors.
7. **Capture controlled oracle traces:** only after the interpreted reference is trusted, cover horizontal/vertical/sloped hard contact, soft pass-through and overrides, option `4/8/9/11`, bounce, no-slide, sticky timeout, lava, mud, pressure plates, and dynamic-container ties.
8. Keep broader locomotion, item/projectile collision, mode hazards, and moving-platform integration in fog until the above phase and trace gates pass.

**One-line map gist:** Static code closes method 1390's option branches and a 93-call direct ledger, but exact collision behavior remains blocked on reachable-call classification, phase and tie order, complete owner responses, and trusted traces.
