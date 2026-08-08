# Collision owner-family composite responses in Brawlhalla 10.09.96325

Issue: [Close collision owner-family composite responses](https://github.com/NickTacke/brawlhalla-sim/issues/67)

## Verdict

**Acceptance is unmet.**

The hash-pinned executable proves exact collision-family values, registered compositions, complete exact-QName reference ledgers, and several owner-specific response fragments. It does not prove every requested response for fighters, companions, items, projectiles, bots, and mode logic.

The strongest closed fragments are:

- fighter and companion sticky paths use the method's `uint` tick parameter to initialize a timestamp as `tick + 5000`, compare that timestamp to the current tick, and perform owner-specific zero/reset writes;
- fighter method 3053 selects numeric factor `0.9` when its collision-segment parameter has bounce bit `64`;
- eight method-14750 sites load item-ignore bit `32` directly into 13-argument collision queries, where method 1390 rejects a candidate when `segment.type & excludedTypeMask` is nonzero;
- fighter method 2887 dispatches method 3018 `_-N4f(uint, Boolean, optional _-L3i)` after game-mode bit `128` tests and dispatches `_-s4y` with `(uint tick, this)` after pressure-plate bit `256` tests;
- method 3605 has a bounded `ScoringType.RING` and bit-`128` branch that compares `tick + 560`, then writes `560`, the current tick, and conditionally the current tick to three owner fields;
- fighter method 3018 accepts an optional collision segment, tests lava bit `512`, reads the segment's `_-KF`, and resolves a typed `PowerType`;
- ice bit `1024` has no exact-QName reference beyond its initializer in the complete ABC.

These facts are not universal response closure. Hard, soft, and trigger response state machines remain unavailable. Items, projectiles, and bots cannot be safely assigned responses from obfuscated owners. Complete mode, mud, pressure-plate, lava, sticky, no-slide, bounce, and item-ignore lifecycles remain unavailable. No trusted interpreted-reference trace exists for any requested family.

**One-line map gist:** Build 10.09 closes collision bits and bounded fighter/companion/mode fragments, but universal owner-family responses, full phase order, executable reachability, and runtime agreement remain unknown.

## Evidence grades

- **Proven fragment:** exact typed owner, instruction sequence, parameter flow, constant, callback, or state write in the hash-pinned ABC.
- **Bounded exact-QName ledger:** every reference to one exact public QName in all 15,010 decoded method bodies. This is syntactic closure, not executable reachability.
- **Unavailable:** primary local evidence does not establish the requested owner-specific response. No behavior is inferred from names, inheritance proximity, an older decompilation, or another owner family.

Prior issue reports and the old Brawltome note were used only to locate candidate methods. Every claim retained here was rechecked against the pinned ABC with the committed analyzer.

## Hash-pinned primary evidence

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | 3,934,088 bytes; `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | All executable claims below |
| Sole semantic build string | `10.09.96325` | Reference-build identity |
| ABC decoder | `abc-disassembler` lockfile revision `ad9714d` | Instruction decoding and byte-PC recovery |
| Decoded method bodies | 15,010; every branch target valid | Whole-ABC ledger boundary |

Selected instruction-object hashes under the pinned decoder:

| Method and exact owner | Role | SHA-256 |
| --- | --- | --- |
| 850 static `_-n2S._-W3S` | collision registration | `744e079cf2bb07d6a9597d4af2a0874dfb57a71f3782772dd87fffd0c5b984ff` |
| 1390 `_-91W._-K2O` | collision query | `5c53868fc7375d4f7881d55491ab1cae00b2c6a46375731a9ba9275f161189d0` |
| 1641 `Companion._-D38` | companion response path | `6c29696a6b6f5adacf42c50e9d25a1d2808cc5c6658dd68305bedcefdf11a361` |
| 2887 `_-V4R._-D38` | fighter movement/response path | `d8c08bf1331469d072566e21fba6f3c0ea2cebf8a41ae0b2182ea278781911a0` |
| 2894 `_-V4R._-84O` | fighter phase entry | `cbd989707ff3331917144c298f01009c6e750b1a4268709b40fd6b9577386098` |
| 3018 `_-V4R._-N4f` | typed lava/game-mode response helper | `358b6d1db3afd71e1f21e39e192b5a0e00547bba49abb4f95e7b3d477058e850` |
| 3053 `_-V4R._-7G` | fighter collision-factor path | `2afad8af61b227fa2d17b6ee15cec1dd4ec7b9b8627bf5e6131aa17db0667c5b` |
| 5156 `<script 279>.<init>` | collision vocabulary initializer | `9c7d0ac1afbd23acfb7e024364c0226f8b31b027f66b91e5046e1d3b95ef10a4` |
| 3605 `_-I13._-C2j` | Ring-mode bounded path | `1de20b33735fd4cd68ba143a3efc52ee1546604799fb42bdac8b8fcb1d3c69c6` |
| 7240 `_-04B._-W1I` | moving-world/carry phase | `6888afe68cda0912df6d12cc235ff15bfad87358950446a75160841d4048212b` |
| 3217 `_-u16._-z3z` | authoritative tick root | `fa38584982aecca898b7dd153da870c49e039b4d4ab952510f97c3720df19308` |
| 14909 `_-N4u.init` | flag initialization | `ed4d7791d2db819e7c24676fd6fd0652cb571718d0907322c4cdea217f1f606e` |

The analyzer also pins methods 2980, 2987, 2988, and 4027 because they contain lava predicates. Instruction-object hashes are decoder-representation identities, not a cross-tool canonical bytecode format.

## Collision family values and exact-reference closure

Method 14909 initializes extra flags at PCs 12128-12228. It then initializes hard, soft, and trigger at PCs 12232-12258. Method 850 registers the readable compositions.

| Family | Field / exact QName | Value | Whole-ABC exact-QName references | Ledger SHA-256 |
| --- | --- | ---: | ---: | --- |
| Hard | `_-X2i._-42Y`, `36:36022` | 1 | 1 | `b50646445fbc0547435c3c8e0328c450e0e88fa3e6f775408e0e3974b4a021bb` |
| Soft | `_-X2i._-33F`, `36:36938` | 2 | 1 | `b0094587946600a58f1ce23368ff4d647789b99062e2aa7062dd438eaf379633` |
| Trigger | `_-X2i._-OI`, `36:30389` | 4 | 1 | `3a11ce3ba2e533b5dc37cfc3fffcaae80505bdf47c9ff251b05e71a56e975178` |
| Sticky | `_-X2i._-uW`, `36:33085` | 8 | 4 | `4a680a18ea99064fc061cac20db735f36135f9c5244ad7f4c4d681beabbfec55` |
| No-slide | `_-X2i._-zM`, `36:33658` | 16 | 17 | `4f86de48af37b911338b53bdfece630f260739e13e6abe8e4d68a2856afb510b` |
| Item-ignore | `_-X2i._-l3j`, `36:26139` | 32 | 11 | `8124727624a44433ccc4db21d9bfea43057a604d4616d9efc698fa7e8581a8b6` |
| Bounce | `_-X2i._-r2u`, `36:32220` | 64 | 6 | `08cbb152c1fcd82a6e804ceaae6029bb6be41bb083551597023b38df81f0b3ef` |
| Game-mode / mud | `_-X2i._-U5E`, `36:15725` | 128 | 13 | `8b2b24067f91cdc1df7548f32ff265903a4403b2903bdd79d980f7d9458d15d0` |
| Pressure plate | `_-X2i._-93C`, `36:1738` | 256 | 6 | `96771beb1003099c3c452e4deed4b916173135e4db998f469e21270c9e81c8b0` |
| Lava | `_-X2i._-J5i`, `36:9869` | 512 | 19 | `0b018fd422833616df32d45f1a7f79d47bdda8ca83c0b031a08dfba931ab61e8` |
| Ice | `_-X2i._-X2Q`, `36:16415` | 1024 | 1 | `b61fc11c32c7b11e26142630e8011c257de81e9956b9bc0587c94aadcc603b6f` |

Hard, soft, and trigger each have only their initializer field reference because executable consumers use literal base bits. Their one-reference ledgers do not mean the families are unused. Ice differs: method 5156 recognizes string `IceCollision`, but the exact bit field has no reference beyond initialization, and method 850 does not register an ice composition. Static consumer closure is therefore unavailable, not “ice has no gameplay effect.”

### Registered compositions

| Readable name | Exact value | Method-850 anchors |
| --- | ---: | --- |
| `HardCollision` | 1 | literal PC 24; name PC 27 |
| `SoftCollision` | 2 | literal PC 7; name PC 10 |
| `TriggerCollision` | 4 | literal PC 41; name PC 44 |
| `StickyCollision` | 9 | hard plus `_-uW`; PCs 58-68 |
| `NoSlideCollision` | 17 | hard plus `_-zM`; PCs 82-92 |
| `ItemIgnoreCollision` | 49 | hard plus `_-l3j` plus `_-zM`; PCs 106-123 |
| `BouncyHardCollision` | 65 | hard plus `_-r2u`; PCs 138-149 |
| `BouncySoftCollision` | 66 | soft plus `_-r2u`; PCs 162-173 |
| `BouncyNoSlideCollision` | 81 | hard plus `_-zM` plus `_-r2u`; PCs 261-279 |
| `GameModeHardCollision` | 129 | hard plus `_-U5E`; PCs 186-197 |
| `PressurePlateCollision` | 257 | hard plus `_-93C`; PCs 212-223 |
| `SoftPressurePlateCollision` | 258 | soft plus `_-93C`; PCs 237-248 |
| `LavaCollision` | 657 | hard plus `_-J5i` plus `_-U5E` plus `_-zM`; PCs 294-319 |
| `MudCollision` | 128 | `_-U5E` only; PCs 331-341 |

Mud does not include hard bit `1`. No ordinary hard response may be assigned to mud from its readable name.

## Owner-family response matrix

Legend: **PF** is a proven fragment, not full lifecycle closure. **BL** is a bounded ledger or predicate only. **U** is unavailable. Any U keeps overall acceptance unmet.

| Family | Fighters | Companions | Items | Projectiles | Bots | Mode logic |
| --- | --- | --- | --- | --- | --- | --- |
| Hard | U | U | U | U | U | U |
| Soft | U | U | U | U | U | U |
| Trigger | U | U | U | U | U | U |
| Sticky | PF: timestamp and zero/reset writes | PF: timestamp and zero/reset writes | U | U | U | U |
| No-slide | PF: bit tests and bounded zero-component write | BL: three exact tests, response closure U | U | U | U | U |
| Item-ignore | BL: query exclusion exists, owner classification U | U | U | U | U | U |
| Bounce | PF: factor `0.9` selected in method 3053 | U | U | U | U | U |
| Game-mode / mud | PF: bit tests and helper dispatch | U | U | U | U | PF: Ring `560` state fragment only |
| Pressure plate | PF: callback argument flow | U | U | U | U | PF: mode-state receiver reached, state machine U |
| Lava | PF: typed segment-to-`PowerType` flow | U | U | U | U | U |
| Ice | U | U | U | U | U | U |

The item and projectile-looking obfuscated owner methods are not classified here. The related reachability analysis proves that all 93 direct collision-query sites remain unclassified and that indirect executable closure is unavailable. Assigning class `_-62`, `_-Y4C`, or another obfuscated owner to items or projectiles would exceed primary evidence. Bot construction or a `SpawnBot` reference likewise does not prove a bot-specific collision response.

## Exact bounded response fragments

### Hard and soft

**Grade: bounded query predicate; owner responses unavailable.**

Method 1390 has typed parameters:

```text
(int, Number, Number, Point, Point, _-L3i, Point, Point,
 uint queryMask, uint queryOptions, int, uint excludedTypeMask, *) -> _-L3i
```

PCs 164-180 read `segment.type`, bitwise-AND parameter 9 `queryMask`, and skip when zero. This proves positive selection for literal hard `1`, soft `2`, or their composites. It does not prove the caller's state mutation after return. Fighter, companion, item, projectile, bot, and mode hard/soft response closure remains unavailable.

Soft one-sided filtering and query options are established by the related query evidence, but owner drop-through, floor attachment, velocity, callback, and repeated-contact behavior are not universally closed here.

### Trigger

**Grade: value and vocabulary proven; every owner response unavailable.**

Method 14909 PC 12258 initializes trigger to `4`; method 850 PCs 41-47 register `TriggerCollision`. Literal-trigger query branches exist in moving-world method 7240, but no complete trigger result-to-owner mutation path was closed. No trigger response is claimed for any owner family.

### Sticky

**Grade: fighter and companion fragments proven; other owners and lifecycle unavailable.**

Both response owners take `param1:uint`, establishing a tick-domain parameter without assigning milliseconds.

Companion method 1641 `Companion._-D38(uint)`:

1. PCs 5187-5209 read the current segment field `_-32b.type`, test exact sticky QName `_-uW`, and enter the branch.
2. PCs 5213-5238 read timestamp field `_-k3T`; if zero, write `uint(param1 + 5000)`.
3. PCs 5246-5266 compare `_-k3T > param1`; while true, write exact zero to field `_-93B`.
4. PCs 5274-5287 otherwise write `false` to `_-328` and zero to `_-k3T`.

Fighter method 2887 `_-V4R._-D38(uint)` repeats the same timestamp dataflow at PCs 11737-11788. While `_-k3T > param1`, PCs 11810-11826 call `_-G1Q(current _-V1I, 0)`. On expiry, PCs 11834-11847 write `false` to `_-328` and zero to `_-k3T`.

The exact duration is a uint tick offset of `5000`. It is not proven to be milliseconds. Entry phase, every reset cause, overflow behavior, and other owners remain unavailable.

### No-slide

**Grade: exact ledgers and selected fighter write proven; universal response unavailable.**

The exact-QName ledger contains 17 references: four registration references, consumers in methods 1052, 1167, 1184, 1188, three in companion method 1641, four in fighter method 2887, one in fighter method 3053, and the initializer.

In fighter method 2887, PCs 12204-12225 test `currentSegment.type & _-zM`. The true branch at PCs 12229-12245 calls `_-G1Q(current _-V1I, 0)`. This proves the arguments and zero second component, not a public semantic name for the fields or a universal no-slide formula.

Companion tests exist at PCs 3623, 4380, and 5412, but this review did not close all downstream branches and mutations. Item, projectile, bot, and mode consumers are unavailable.

### Item-ignore

**Grade: exact query exclusion proven; owner intent and response unavailable.**

Method 1390 PCs 228-245 reads `segment.type`, bitwise-ANDs parameter 12 `excludedTypeMask`, and skips the candidate when nonzero.

Eight method-14750 sites load `_-X2i._-l3j` at PCs 1405, 4796, 4902, 5510, 5686, 5792, 6562, and 6667. Each load is followed eight bytes later by a 13-argument exact-QName `_-K2O` call. Seven use `callproperty`; PC 5518 uses `callpropvoid`. This directly carries bit `32` into the optional exclusion position.

Class `_-62` is not assigned an owner family. The reason for exclusion, behavior on ignored contact, and all indirect callers remain unavailable.

### Bounce

**Grade: fighter numeric-selection fragment proven; full transform and all other owners unavailable.**

Method 3053 `_-V4R._-7G(uint tick, _-L3i segment)` receives the segment as parameter 2. PCs 228-245 test `segment.type & _-X2i._-r2u`. On true, PCs 249-253 store exact `Number 0.9` into local 3. A separate branch can store `1.2`; that value is not bounce's value.

Later PCs 337-393 write X and Y components of scratch point `_-oB`. The complete public meaning of every input field, the final owner mutation, repeated-contact behavior, and exact placement relative to every query caller are not closed here. No companion, item, projectile, bot, or mode bounce response is claimed.

### Game-mode and mud

**Grade: fighter dispatch and Ring-mode state fragment proven; mud dataflow and universal mode closure unavailable.**

Fighter method 2887 tests bit `128` at PCs 3733, 9304, 10732, and 13099. Three reviewed branches call exact QName `_-N4f` at PCs 3751, 9324, and 10751. The called fighter method 3018 has signature:

```text
_-V4R._-N4f(uint tick, Boolean option, optional _-L3i collision) -> Boolean
```

The method-2887 sites pass their `uint` parameter 1 followed by literal `false`, `true`, or `true`. ABC option metadata for the typed third parameter is kind `0`, value `0`, meaning `undefined`; it is not an explicit null constant. This is exact parameter flow, not proof of a generic mode callback contract or broader default-coercion semantics.

Method 3605 `_-I13._-C2j(uint tick, _-V4R fighter, Number, Number, uint, uint = 0)` proves one mode-specific fragment:

1. PCs 543-562 check `ScoringType.RING`.
2. PCs 581-596 test a segment-like local's type against bit `128`.
3. PCs 600-617 compare two owner fields with `tick + 560`.
4. PCs 621-630 write exact `560` to `_-G1m` and the current tick to `_-V2Q`.
5. PCs 633-646 conditionally write the current tick to `_-65M` when that field is zero.

Method 850 registers `MudCollision` as exactly `128`. Method 5156 recognizes `MudPower`, `MudFallMult`, `MudFallStunMult`, `MudXSpeedMult`, `MudKillDepth`, and `MudJumpBack`, but this investigation did not close those parameters to contact state writes. Mud response remains unavailable for every owner.

### Pressure plate

**Grade: fighter-to-mode argument flow proven; plate state machine unavailable.**

Fighter method 2887 tests bit `256` at PCs 3799, 12119, and 12884. Two reviewed paths reach a mode-state receiver through `_-Z2h._-d3F._-x1V._-56t`, then call `_-s4y`:

- PCs 3786-3875 pass `(param1:uint, this fighter)`;
- PCs 12105-12151 pass `(param1:uint, this fighter)`.

The callback receiver, argument order, and call phase within method 2887 are exact. Activation, release, debounce, team arbitration, callback implementation, and numeric plate effects are unavailable. No companion, item, projectile, or bot plate response is claimed.

### Lava

**Grade: fighter typed lookup fragment proven; complete hazard response unavailable.**

Method 3018's third parameter is an optional `_-L3i` collision segment whose raw ABC default is `undefined` (kind `0`, value `0`). PCs 629-645 read `param3.type`, test lava bit `512`, and branch. PCs 688-707 read `param3._-KF`, call `PowerType._-51i` with exactly one argument, coerce the result to `PowerType`, and store it in local 9. The method continues into power-related numeric processing, but this review stops at the typed lookup boundary rather than naming unclosed fields or inferring default coercion.

Additional exact lava consumers occur in fighter methods 2894, 2980, 2987, 2988, 3018, mode/owner method 4027, moving-world method 7240, and obfuscated methods. The complete ledger has 19 references including registration and initialization. Damage, knockback, immunity, cooldown, ownership attribution, death/respawn interaction, and all non-fighter responses remain unavailable.

### Ice

**Grade: value/vocabulary proven; every response unavailable.**

Method 14909 PC 12228 initializes `_-X2i._-X2Q` to `1024`. Method 5156 PCs 301-308 recognizes string `IceCollision`. The exact QName ledger has exactly one reference, the initializer itself. Method 850 has no ice registration entry.

No static consumer, composition, callback, numeric response, state mutation, owner family, or runtime reachability is proven. The correct result is unavailable, not absence.

## Authoritative phase ordering

**Proven only for the ordinary moving-world-to-fighter seam:**

```text
authoritative tick method 3217
  -> moving-world/carry method 7240 at tick-root PC 2642
  -> fighter entry method 2894 at tick-root PC 2738
       -> fighter response method 2887 at method-2894 PC 578
```

Method 3217's moving-world call precedes fighter entry. Method 2894 then calls method 2887 within the fighter path. This establishes the bounded order for the cited fighter fragments on that ordinary path.

It does not establish one global response phase. Companion, item, projectile, bot, and mode-local calls retain owner-local placement. Complete query-to-response order for all 93 direct query sites is blocked by unresolved executable reachability and per-PC owner classification. Callback completion order, exceptions, dynamic dispatch, reflection, host calls, and trusted runtime agreement remain unavailable.

## Acceptance disposition

| Requested acceptance item | Result | Evidence-backed reason |
| --- | --- | --- |
| Hard responses for every owner | **Not met** | Query bit is exact; owner mutations are not universally closed |
| Soft responses for every owner | **Not met** | Query/one-way structure exists; every owner response and phase is not closed |
| Trigger responses for every owner | **Not met** | Value and registration only |
| Sticky responses for every owner | **Not met** | Fighter and companion fragments only |
| No-slide responses for every owner | **Not met** | Bounded tests and one fighter zero-component call only |
| Item-ignore responses for every owner | **Not met** | Eight exact exclusions; producer family and response intent unknown |
| Bounce responses for every owner | **Not met** | Fighter `0.9` selection only |
| Game-mode/mud responses for every owner | **Not met** | Fighter dispatch and one Ring fragment; mud parameter flow unknown |
| Pressure-plate responses for every owner | **Not met** | Callback argument flow only |
| Lava responses for every owner | **Not met** | Typed fighter lookup only |
| Ice responses for every owner | **Not met** | No exact consumer beyond initializer |
| Fighters | **Partial** | Several proven fragments; no complete family lifecycle |
| Companions | **Partial** | Sticky fragment and no-slide tests only |
| Items | **Not met** | No safe owner classification or response closure |
| Projectiles | **Not met** | No safe owner classification or response closure |
| Bots | **Not met** | No safe owner classification or response closure |
| Mode logic | **Partial** | Ring and callback fragments only |
| Exact universal phase order | **Not met** | Only the ordinary moving-world-to-fighter seam is proven |
| Trusted runtime agreement | **Not met** | No interpreted-reference collision trace matrix |

**Overall acceptance: unmet.** Every universal acceptance item requires all owner families. Multiple families and owners remain unavailable.

## Reproducibility analyzer

Keep proprietary inputs outside Git and pass an explicit path:

```bash
bun install --frozen-lockfile
bun run provenance:collision-owner-responses --abc /path/to/hash-pinned/main.abc
bun run typecheck
git diff --check
git status --short
```

The issue-specific analyzer fails closed on:

1. ABC SHA-256 or sole build-string drift.
2. A decoded-body count other than 15,010.
3. Any invalid branch target.
4. Owner, static disposition, parameter, return type, or instruction-object hash drift for methods 850, 1390, 1641, 2887, 2894, 2980, 2987, 2988, 3018, 3053, 3217, 3605, 4027, 7240, and 14909, plus script-279 initializer identity, signature, and hash drift for method 5156.
5. Any count or ordered `(method, owner, PC, opcode)` ledger drift for all 11 exact flag QNames.
6. Numeric operand, shift, uint conversion, PC, or QName drift for all flag initializers from base bits `1`, `2`, and `4` through `1024`.
7. Base operand, flag QName, bitwise-OR, derived numeric value, readable name, or registration-call drift for all 14 compositions above.
8. Method-1390 positive-mask and excluded-mask predicate or skip/continue branch-target drift.
9. Any of the eight method-14750 bit-32-to-13-argument-query sites changing QName, PC, opcode, or arity.
10. Sticky contact predicate, tick operand, addition, uint conversion, timestamp comparison, branch, active write, or false/zero expiry reset drift in fighter or companion paths.
11. Bounce bit-64, `0.9`, and scratch X/Y write drift.
12. Three game-mode call argument paths, two pressure callback receiver/argument paths, the Ring predicate/comparison/state writes, method-3018 option metadata, lava segment-to-`PowerType` flow, or Ice vocabulary drift.
13. Ordinary tick ordering drift between moving-world PC 2642 and fighter PC 2738, or loss of the method-2894 to method-2887 call.

Successful output deliberately reports `status: acceptance-not-met`, the family-closure boundary, and every unavailable closure. A zero exit code means the negative evidence contract reproduced. It does not mean universal collision behavior passed.

## Exact blockers and surfaced route

1. The related direct-query reachability result leaves all 93 direct call PCs unclassified and indirect executable surfaces unresolved.
2. No replay-producing configuration matrix connects every fighter, companion, item, projectile, bot, and mode construction to a response site.
3. Obfuscated owners cannot be labeled as item or projectile systems from names or proximity.
4. Hard, soft, and trigger post-query state mutation paths are not closed per owner.
5. Sticky and no-slide reset/entry phase is not closed outside cited fighter and companion fragments.
6. Bounce's complete transform, repeated-contact behavior, and non-fighter consumers are not closed.
7. Mud parameters are vocabulary only; pressure-plate activation/release/team state and lava damage/immunity/cooldown/ownership are not closed.
8. Ice has no exact static consumer beyond initialization. Dynamic/reflection/host reachability remains unresolved.
9. No trusted interpreted-reference trace captures tick, owner, segment type, query result, callback, and ordered before/after state for the requested matrix.
10. Only the ordinary moving-world-to-fighter seam is authoritative. Universal owner-local phase order is unavailable.

**Surfaced route, no new ticket created:** extend the existing executable-graph and replay-producing configuration work with receiver-resolved rows for each admitted response. Join each row to collision segment type, query PC, callback target, owner allocation, exact tick phase, and before/after state. Exclude a row only after deletion preserves trusted interpreted-reference traces across the complete producer matrix. Capture controlled traces for each family only after that interpreted reference is authenticated.

No GitHub tracker mutation was performed.

## Privacy and licensing boundary

This note and analyzer contain only hashes, counts, obfuscated identifiers, public QNames, method signatures, byte PCs, constants, and bounded control/dataflow descriptions. They contain no ABC/SWF/SWZ bytes, decrypted assets, replay bytes, player or account data, credentials, environment values, or local filesystem paths.

The proprietary `main.abc` remains outside the repository and is supplied by the researcher. The repository distributes only independently written analysis code and small derived evidence under the repository's MIT license. Brawlhalla names and executable content remain the property of their respective owners. This work is unofficial and is not affiliated with or endorsed by Ubisoft or Blue Mammoth Games.

## Continuation audit of explicit acceptance blockers

This continuation rechecks committed, hash-pinned evidence only. It adds no executable, archive, extracted-source, replay, player, account, or trace payload. The existing owner-response analyzer is already fail-closed on the pinned ABC identity, complete decoded-body count, branch targets, method identities, exact flag ledgers, and bounded response anchors; no analyzer semantic change is justified by this audit.

### Review findings

| Severity | Finding | Evidence-backed disposition | Acceptance effect |
| --- | --- | --- | --- |
| **Blocker** | Hard, soft, and trigger post-query mutation | The collision-query report proves exact masks, filters, and outputs, but does not close a per-owner mutation path. The owner-response report proves only bounded sticky, no-slide, bounce, mode, pressure, and lava fragments. | Every hard, soft, and trigger owner-family clause remains **not met**. |
| **Blocker** | Sticky, no-slide, bounce, game-mode/mud, pressure-plate, lava, and ice lifecycles | Moving-carry evidence closes method-7240's bounded masks, state gates, and lava retention. It does not close entry/reset, duration, callback implementation, damage, immunity, team, or repeated-contact lifecycles across all owners. Ice has no exact-QName consumer beyond initialization in the pinned ABC. | Universal lifecycle closure remains **not met**. |
| **Blocker** | Item, projectile, and bot ownership | The complete direct ledger contains obfuscated owners and readable mode/companion owners, but names, inheritance proximity, or callsite proximity do not prove item, projectile, or bot ownership. | No unclassified owner is promoted into an owner family. |
| **Blocker** | Direct and indirect query reachability | The pinned query evidence enumerates 93 direct calls in 38 methods, while the reachability work leaves those sites and indirect dispatch unresolved from replay-producing roots. | Query syntax is bounded; executable owner reachability remains **not met**. |
| **Blocker** | Replay-producing configuration matrix | The pinned source-selection evidence leaves replay-producing roots and dynamic lookup values unresolved. The trace audit covers only a narrow completed online cohort and has no authenticated lifecycle/configuration matrix. | No matrix row can be promoted to universal owner-family coverage. |
| **Blocker** | Trusted trace status | The trace audit records no T3 interpreted-reference oracle, authenticated hook manifest, or trusted collision trace. Static agreement is not runtime agreement. | Trusted runtime agreement remains **not met**. |
| **Bounded finding** | Ordinary phase seams | Static phase evidence places moving-world refresh/carry before fighter entry and response on the cited path, with candidate/arbitration order bounded separately. | This does not establish one universal owner-local collision phase. |

### Acceptance disposition after continuation

The explicit blockers still resolve as follows: hard/soft/trigger every-owner responses **not met**; sticky/no-slide/bounce/game-mode/mud/pressure/lava/ice lifecycle closure **not met**; item/projectile/bot ownership **not met**; direct/indirect query reachability **not met**; replay-producing configuration matrix **not met**; trusted trace status **not met**. Overall acceptance remains **unmet** and issue 67 must remain open.

### Evidence trail

- [Owner-response closure and fail-closed analyzer](https://github.com/NickTacke/brawlhalla-sim/blob/a8231ad480bb61b4b73703bc0f61d88a5deda35a/artifacts/research/collision-owner-responses/collision-owner-responses.md) - exact pinned ABC `9fe9c830...bcfba2d`, build `10.09.96325`, 15,010 method bodies, bounded fragments, and negative acceptance contract.
- [Collision query options and composite consumers](https://github.com/NickTacke/brawlhalla-sim/blob/a0218e43ab306d9a59017c281a241b65a97d84b5/artifacts/research/collision-query-flags/collision-query-flags.md) - 93 direct `_-K2O` calls across 38 methods, masks/options, and unresolved caller classification.
- [Collision query reachability blockers](https://github.com/NickTacke/brawlhalla-sim/blob/46d5402834896ecb8a29fcb8c3010f8f3019a314/artifacts/research/collision-query-reachability/collision-query-reachability.md) - unresolved replay-root and indirect-dispatch boundary.
- [Collision phase and arbitration order](https://github.com/NickTacke/brawlhalla-sim/blob/8930a2fe792855a8b8f4fa89b634295f92e9665c/artifacts/research/collision-arbitration-order/collision-arbitration-order.md) - bounded candidate, tie, dynamic-container, refresh, and ordinary phase order.
- [Moving-platform carry states](https://github.com/NickTacke/brawlhalla-sim/blob/cea8a5c18c9d94dbaf9df17a276ba21a8a819f31/artifacts/research/moving-platform-carry-states/moving-platform-carry-states.md) - method-7240 branch-complete static contract and lava-bit use, without universal owner response closure.
- [Reachable PowerType phase universe](https://github.com/NickTacke/brawlhalla-sim/blob/b34187af16efc5b2570a19fe0285e159d83d38/artifacts/research/reachable-power-phases/reachable-power-phases.md) - source graph and unresolved replay-root/dynamic lookup reachability.
- [Replay trace capability blocker](https://github.com/NickTacke/brawlhalla-sim/blob/effd0bd15b282d6fff6c740ccef8b4b3bcc52f66/artifacts/research/replay-setup-cleanup-traces/replay-setup-cleanup-traces.md) - no authenticated T3 oracle, hook manifest, or configuration/lifecycle trace matrix.

No new ticket was created, issue #1 was not edited, and no universal simulator behavior is promoted from these bounded findings.
