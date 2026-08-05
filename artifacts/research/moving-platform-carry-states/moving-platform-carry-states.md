# Moving-platform carry states and composite bits in Brawlhalla 10.09.96325

Issue: [Classify moving-platform carry states and composite bits](https://github.com/NickTacke/brawlhalla-sim/issues/62)

## Verdict

**The named method-7240 static branches are closed for the pinned build.**

Method 7240 `_-04B._-W1I(uint):void` has 182 control-flow branches grouped into 12 ordered stages and 46 mutating instructions. The complete body, every branch target, each stage ledger, and the mutation ledger are fail-closed in the committed analyzer.

The exact carry gates are numeric state contracts:

- fighters with `_-N14` values `0`, `1`, `2`, `4`, `5`, or `6` are admitted; values `3`, `7`, and `8` are rejected; an out-of-range value follows the admitted default;
- companions with `_-m4f._-h48` values `2` through `9` are admitted; values `0` and `10` are rejected; state `1` is admitted only when `CompanionType._-16A == 2`; an out-of-range value follows the admitted default.

The formerly unresolved composite field `_-X2i._-J5i` is lava bit `512`. `LavaCollision` is `657 = 1 | 16 | 128 | 512`. It is the only extra collision-flag field read by method 7240. Method 7240 does not query trigger bit `4`: its three method-1390 positive masks are exactly `1`, `3`, and `3`, with options `0`, `4`, and `4`.

There is no separate crush damage, KO, or crush-state transition in method 7240. The crush-looking path is a moving-line sweep followed by direction-gated geometric coordinate correction. The companion version computes the nearest side-sweep result but never consumes it and performs no external mutation.

One-line map gist:

> Build 10.09 admits fighter states 0/1/2/4/5/6 and companion states 2-9 plus conditional state 1, clips carry through hard/soft queries, treats crush as coordinate correction rather than a separate response, and identifies lava 512 as the moving manager's sole composite flag.

## Evidence grades and boundary

- **Proven:** exact instruction, branch, trait, signature, field reference, or control/dataflow in the hash-pinned ABC.
- **Branch-complete static contract:** every control-flow instruction in method 7240 belongs to a named stage whose ordered PC/opcode ledger is pinned.
- **Not claimed:** trusted interpreted-reference agreement, readable lifecycle names for the numeric state values, or universal collision behavior outside methods 7240 and 7247.

Numeric state values are not renamed as death, respawn, dodge, or another lifecycle state without primary evidence. Their exact meaning for this ticket is whether method 7240 admits or rejects carry processing.

## Hash-pinned primary evidence

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | 3,934,088 bytes; `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Method 7240, helper 7247, setters, collision query, lava registration/initialization, whole-ABC references |
| Sole semantic build string | `10.09.96325` | Reference-build identity |
| Decoded bodies | 15,010; every branch target valid | Whole-ABC closure boundary |
| ABC decoder | `abc-disassembler` lockfile revision `ad9714d` | Instruction decoding and byte-PC recovery |
| Method 7240 instruction objects | `6888afe68cda0912df6d12cc235ff15bfad87358950446a75160841d4048212b` | Complete moving-manager body identity |
| Method 7240 mutations | 46; ledger `c56353ccc4875e91fdcb4f0e010e716836484c35007dad3c3011a2fe3c827c93` | Every `initproperty`, `setproperty`, `setslot`, and `callpropvoid` |
| Lava exact-QName references | 19; analyzer ledger `c553a7800cf19c342e2b5970d24c1277c69859911a7ecf38c6be83176894c6d5` | Every `36:9869` producer/consumer in the complete ABC |

Instruction-object and ledger hashes are representations under the pinned decoder, not cross-tool canonical bytecode hashes.

## Total method-7240 evaluation order

Method 3217 calls method 7240 at tick-root PC 2642 before fighter method 2894 at PC 2738. Within method 7240, stages execute in this order:

| Stage | PC range | Branches | Exact behavior |
| --- | ---: | ---: | --- |
| Platform refresh | `0-564` | 17 | Reset manager flags, snapshot the prior lava boundary, call method 5836 for each platform in stored order, classify changed platforms, optionally scan associated lava lines, publish/fallback the lava boundary, run the gated manager callback, or return when no platform changed |
| `_62` retained-support carry | `565-904` | 4 | Admit active retained segment, derive its displacement, run a hard-only clipping query, then write X/Y through `_62` setters |
| Fighter state gate | `905-1078` | 4 | Read `_-N14`; reject exactly 3/7/8 |
| Fighter support vector | `1079-1407` | 12 | Fold active retained segments from `_-Y5U` into the carry vector, including lava helper behavior |
| Fighter carry clip | `1408-1963` | 12 | Query base and upper probes, apply endpoint/normal correction with `1.01`, and write clipped X/Y through numeric storage |
| Fighter moving-line sweep | `1964-2846` | 33 | Visit changed platforms and lines, skip retained floor/wall identities, evaluate base and soft upper probes, retain the nearest swept contact, and process lava contact |
| Fighter side correction | `2847-3416` | 20 | Convert the retained swept contact to a `1.01` normal-offset target, apply four direction/crossing guards, then write corrected X/Y |
| `_62` support reprojection | `3417-4013` | 17 | For each retained moving line, intersect the `_62` position, write projected X/Y, and retain lava contact |
| Companion state gate | `4014-4139` | 7 | Read `_-m4f._-h48`; apply the exact direct and conditional rejection table |
| Companion support vector | `4140-4488` | 11 | Fold active retained segments into the companion carry vector, including lava helper behavior |
| Companion carry clip | `4489-5005` | 13 | Query base and `CompanionType._-wW` upper probes, apply `1.01` correction, and write `_-W1P`/`_-U4G` |
| Companion side sweep | `5006-5841` | 32 | Compute nearest changed-line contacts, including the soft upper probe, but do not consume the result or mutate external state |

The 12 stage ledgers account for all 182 branch instructions. Loop exits, null checks, support rejection, hard/soft gates, nearest-contact comparisons, endpoint cases, and direction gates are therefore named rather than hidden behind only a whole-body hash.

## Platform refresh and manager state

Method 7240 begins by:

1. setting `_-Lx = false` and `_-B2m = false`;
2. copying prior boundary `_-Fd` to `_-j1y` and setting `_-Fd` to `4294967295`;
3. iterating moving platforms in `_-T5U` stored order and calling method 5836 `_-A4y(tick)` at PC 252;
4. setting `_-Lx = true` for a changed platform with associated collision lines;
5. setting `_-B2m = true` when that platform has more than one associated line;
6. when the level gate is enabled, scanning those lines for `type & lava`, normal Y equal to raw `-1`, and the minimum `startY`, then writing that minimum to `_-Fd`;
7. restoring `_-Fd` from `_-j1y` if the gated scan found no value;
8. conditionally calling `_-E7`, then returning immediately when `_-Lx` is false.

Method 5836 has already refreshed moving endpoint coordinates before returning changed status. Carry and side sweeps therefore see the refreshed geometry.

## Carry eligibility and rejection

### `_62` entity family

Method 7240 does not apply a numeric state gate to `_-62`. It admits the retained-support path only when:

```text
entity._-32b != null && entity._-32b._-l1Q
```

It derives the retained line's movement into scratch point `_-K1q`, calls method 1390 with mask `1` and options `0`, ignores the returned segment but retains method-1390 mutation of the requested displacement, then adds the resulting X/Y displacement through coordinate setters.

The later `_-62` reprojection path only considers a moving line equal to `entity._-32b`. It intersects the entity coordinate against that line's swept geometry, writes projected X, chooses a vertical side sign from the current Y comparison, offsets by `_-62._-p1b`, and writes Y.

### Fighters

Method 7240 reads `fighter._-N14` at PC 1030 and switches at PC 1039.

| `_-N14` | Carry and moving-line processing |
| ---: | --- |
| `0`, `1`, `2`, `4`, `5`, `6` | Admitted |
| `3`, `7`, `8` | Rejected; jump directly to the next fighter |
| Any other uint | Admitted through the switch default |

An admitted fighter folds active `_-Y5U` segment references into one displacement. Null/inactive references are skipped. If method 7247 handles a lava reference, generic endpoint-delta folding for that reference is skipped.

A zero displacement skips support-carry clipping but does not erase the later changed-line sweep. A nonzero displacement is clipped by two method-1390 calls in a two-iteration loop using the fighter's base Y and base Y minus `120`.

### Companions

Method 7240 reads `companion._-m4f._-h48` at PC 4065 and switches at PC 4075.

| `_-h48` | Carry and moving-line processing |
| ---: | --- |
| `0`, `10` | Rejected; jump directly to the next companion |
| `1` | Call `Companion._-z2Q`; admitted only when it returns false |
| `2` through `9` | Admitted |
| Any other uint | Admitted through the switch default |

Method 1671 proves:

```text
Companion._-z2Q() = (CompanionType._-16A != 2)
```

Therefore state `1` is admitted only when `CompanionType._-16A == 2`.

The companion support fold matches the fighter's active-reference and lava-helper gates. Its two carry probes use base Y and base Y minus `CompanionType._-wW`, not the fighter's fixed `120` offset.

## Collision-query results and exact options

Method 7240 has exactly three direct method-1390 calls:

| PC | Owner path | Query mask | Options | Return use |
| ---: | --- | ---: | ---: | --- |
| 823 | `_62` retained-support carry | `1` hard | `0` | Return ignored; mutable displacement/output arguments retained |
| 1574 | Fighter carry clip | `1 | 2 = 3` hard/soft | `4` | Returned segment selects endpoint/normal correction |
| 4634 | Companion carry clip | `1 | 2 = 3` hard/soft | `4` | Returned segment selects endpoint/normal correction |

No call uses trigger mask `4`. Prior moving-platform notes that described hard/soft/trigger combinations were too broad. Literal `pushbyte 4` at the fighter and companion calls is method-1390 **option 4**, not the trigger query mask.

Method-1390 option 4 bypasses the early normal filter and enables its post-hit component filter. Soft lines still retain their base bit `2` and one-way treatment.

## Coordinate setters and writes

### `_62`

The exact helper bodies prove:

```text
_-c2g() -> _-W1P        // X getter
_-MJ()  -> _-U4G        // Y getter
_-43x(x): _-W1P = x     // X setter
_-w5T(y): _-U4G = y     // Y setter
```

Method 7240 calls X/Y setters at PCs `857/892` for retained-support carry and `3908/3959` for support reprojection.

### Fighter

Issue [Recover encoded movement numeric storage](https://github.com/NickTacke/brawlhalla-sim/issues/41) proves `_-V1I._-k17` and `_-V1I._-G1Q` store AVM2 binary64 `Number` values behind uint handles. The fighter wrappers prove:

```text
X = _-V1I._-k17(_-E1J)
Y = _-V1I._-k17(_-b1S)
set X: _-V1I._-G1Q(_-E1J, x)
set Y: _-V1I._-G1Q(_-b1S, y)
```

Method 7240 writes clipped carry X/Y at PCs `1943/1960` and side-corrected X/Y at PCs `3383/3400`.

### Companion

Companion coordinates are typed `Number` slots. Method 7240 writes carry-clipped X directly to `_-W1P` at PC 4994 and Y directly to `_-U4G` at PC 5002.

The subsequent companion side sweep sets nearest-segment locals but has:

- no `getlocal 10` consumer after PC 5006;
- no `initproperty`, `setproperty`, `setslot`, or `callpropvoid` from PCs 5006-5841.

Its side-contact result is therefore computed and discarded in this method.

## Side contact and the crush-looking path

Fighter and companion carry clipping use the same endpoint classification:

1. vertical segment: interpolate along X; when the accepted point is exactly the endpoint, add `normal.x * 1.01`;
2. horizontal segment: retain the soft-side gate, interpolate along Y, and add `normal.y * 1.01` at the exact endpoint;
3. sloped segment: normalize the segment normal to length `1.01` and add it to the accepted coordinate.

The fighter changed-line sweep then retains the nearest base or soft upper-probe contact. It negates the selected line normal, normalizes it to `1.01`, and derives a correction target. Four ordered direction guards reject a correction when line motion and target position do not show the line approaching/crossing the fighter on X or Y. Only a surviving target reaches the X/Y storage writes.

This is the complete crush-looking behavior in method 7240. The 46-instruction mutation ledger contains no separate crush state, damage, health, KO, or death mutation. Method 7240 geometrically clips or corrects coordinates. Broader collision-owner damage and runtime traces remain outside this ticket.

The `_62` path reprojects onto its retained moving line as described above. The companion changed-line sweep has no consumed result and therefore no side/crush correction in this method.

## Lava composite identity and moving-manager semantics

### Producer and readable composition

Method 14909 initializes `_-X2i._-J5i` at PCs 12208-12215 as:

```text
uint(8) << 6 = 512
```

Method 850 registers `LavaCollision` at PCs 287-323 as:

```text
1 | _-J5i | _-U5E | _-zM
= 1 | 512 | 128 | 16
= 657
```

This proves hard, lava, shared game-mode/mud, and no-slide composition.

### Every direct method-7240 effect

Method 7240 reads lava at exactly three PCs:

1. **PC 369:** during changed-platform scanning, require lava plus normal Y `-1`, then retain the minimum `startY` in manager field `_-Fd`.
2. **PC 2782:** after a fighter changed-line swept contact, write the lava segment to `fighter._-32b`; if `fighter._-i2f._-qL` is non-null, call `_-G5K()`.
3. **PC 3972:** after `_62` support reprojection, write the lava segment to `entity._-32b`.

There is no direct companion lava read in method 7240.

Method 7247 `_-04B._-Z2g(_-L3i, Point):Boolean` supplies the retained-support lava branch used by fighters and companions:

1. non-lava returns false;
2. lava resolves `segment._-KF` through `PowerType._-51i`;
3. when `PowerType._-O4H != 0 || PowerType._-a2z != 0`, write those two values to scratch displacement `_-K1q.x/y` and return true;
4. when both values are zero, return false and let method 7240 continue generic retained-segment delta folding.

This is the stable moving-manager meaning of the composite bit. It is not inferred from the readable tag alone.

### Whole-ABC producer/consumer closure

The exact QName `36:9869` has 19 references in all 15,010 bodies:

| Method | Owner | PC(s) | Role boundary |
| ---: | --- | --- | --- |
| 850 | `_-n2S._-W3S` static | 300 | Readable `LavaCollision` composition producer |
| 2894 | `_-V4R._-84O` | 461 | Fighter consumer |
| 2980 | `_-V4R._-rj` | 250 | Fighter consumer |
| 2987 | `_-V4R._-F53` | 15 | Fighter consumer |
| 2988 | `_-V4R._-zO` | 79 | Fighter consumer |
| 3018 | `_-V4R._-N4f` | 637 | Fighter typed segment-to-`PowerType` consumer |
| 4027 | `_-M6j._-F2Q` | 3280, 4894 | Owner/mode consumers |
| 4043 | `_-623._-Hk` | 215 | Obfuscated-owner consumer |
| 7240 | `_-04B._-W1I` | 369, 2782, 3972 | Moving-manager direct consumers |
| 7247 | `_-04B._-Z2g` | 8 | Moving-manager retained-support helper |
| 14749 | `_-62._-E3A` | 65 | `_62` consumer |
| 14750 | `_-62._-D38` | 7046 | `_62` consumer |
| 14752 | `_-62._-X6u` | 35 | `_62` consumer |
| 14767 | `_-62._-16Q` | 2108 | `_62` consumer |
| 14771 | `_-62._-s4D` | 33 | `_62` consumer |
| 14909 | `_-N4u.init` | 12215 | Sole exact-QName initializer |

The ledger classifies exact owners without inventing public item/projectile labels for obfuscated `_62` systems. Broader owner response semantics remain with the related collision tickets.

## External state-write disposition

The complete mutation ledger separates scratch writes from gameplay-visible writes:

| Family | Writes in method 7240 |
| --- | --- |
| Manager | `_-Lx`, `_-B2m`, `_-j1y`, `_-Fd`; optional `_-E7()` callback |
| Scratch geometry | Point X/Y writes and `normalize(1.01)` |
| `_62` | X/Y setters; lava `_-32b` retention |
| Fighter | X/Y `_-G1Q` writes; lava `_-32b` retention; conditional `_-G5K()` |
| Companion | Direct X `_-W1P` and Y `_-U4G` writes only |
| Collision query | One ignored-return mutable-output call and two returned-segment calls |

No external mutation occurs in the final companion side-sweep stage.

## Acceptance matrix

| Issue-62 requirement | Result | Evidence-backed disposition |
| --- | --- | --- |
| Every fighter carry state | **Met** | Exact admitted/rejected/default table from PC-1039 switch |
| Every companion carry state | **Met** | Exact direct/conditional/default table plus method-1671 predicate |
| Carry eligibility | **Met** | Active retained-reference gates and state gates are exact |
| Rejection | **Met** | Numeric state rejection, null/inactive support rejection, zero-displacement bypass, query miss, soft-side, nearest-contact, and direction guards are named by stage |
| Side contact | **Met** | Fighter correction, `_62` reprojection, and unconsumed companion result are exact |
| Crush | **Met negatively** | No separate response; complete path is direction-gated coordinate correction with no damage/KO mutation |
| Coordinate setters | **Met** | `_62`, fighter numeric-store, and direct companion writes are exact |
| Collision results/options | **Met** | Three calls, masks `1/3/3`, options `0/4/4`, probes, and return/output use are exact |
| Composite identity | **Met** | `_-J5i = lava 512`; `LavaCollision = 657` |
| Composite producers/consumers | **Met syntactically** | Complete 19-reference exact-QName ledger |
| Composite moving effect | **Met** | Three direct reads plus method-7247 `PowerType` displacement branch |
| Evaluation order | **Met for method 7240 and ordinary tick seam** | 12 stages, all 182 branches, 46 mutations, refresh before carry, moving manager before fighter tick |
| No unnamed method-7240 branch | **Met** | Every branch belongs to a named, hash-pinned stage |

Issue 62 can close. Trusted differential traces, universal collision-owner behavior, dynamic toggles, and broad query reachability remain separate existing tickets rather than blockers to this branch-complete static classification.

## Corrections to prior notes

Two prior statements should not be propagated:

1. Method 7240 does **not** query trigger bit `4`. Its `4` operands at PCs 1571 and 4631 are query option 4. Positive masks are only `1`, `3`, and `3`.
2. Companion state 1 is not generally admitted or rejected. It is admitted exactly when `CompanionType._-16A == 2` because method 1671 returns true for every other value and a true result skips that companion.

## Reproducible validation

Keep proprietary inputs outside Git and pass an explicit path:

```bash
bun install --frozen-lockfile
bun run provenance:moving-platform-carry-states --abc /path/to/hash-pinned/main.abc
bun run check
```

The issue-specific command fails closed on:

1. ABC hash, build string, body count, or any branch-target drift.
2. Owner, signature, static disposition, or instruction-object drift for method 7240, helper 7247, method 1390, tick root 3217, lava registration/initialization, fighter and `_62` coordinate helpers, and companion state helper 1671.
3. Any branch count or ordered PC/opcode drift in the 12 named method-7240 stages.
4. Any mutation count or ordered PC/opcode/property/arity drift.
5. Fighter or companion switch-target drift.
6. Query call, mask, option, support gate, setter, probe, `1.01`, or phase-anchor drift.
7. A new companion side-sweep mutation or consumer of its nearest-result local.
8. Lava value, registration, exact-QName reference count/ledger, direct moving-manager branch, or `PowerType` helper drift.

Successful output reports `status: proven-for-pinned-abc`. That status covers this static contract, not differential runtime agreement.

## Residual risks and surfaced route

No new ticket is required or claimed.

- [Prove moving-platform runtime collision semantics](https://github.com/NickTacke/brawlhalla-sim/issues/47) retains missing platform assets and trusted moving-platform trace closure.
- [Close collision query options and composite flag consumers](https://github.com/NickTacke/brawlhalla-sim/issues/48) retains universal reachable callers and owner responses.
- [Prove collision phase, candidate, and dynamic arbitration order](https://github.com/NickTacke/brawlhalla-sim/issues/66) retains dynamic toggle reachability and authenticated arbitration traces.
- The companion side-sweep's unconsumed result is a proven pinned-build behavior, not repaired or generalized here.
- Numeric carry-state lifecycle names remain unknown; only their exact method-7240 admission semantics are claimed.

## Privacy and licensing

This note and analyzer contain hashes, counts, method/field identifiers, constants, branch-derived rules, and small ledgers only. They contain no executable/archive bytes, decrypted assets, replay bytes, player data, credentials, environment values, or local filesystem paths.
