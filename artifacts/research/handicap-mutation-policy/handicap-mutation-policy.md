# Handicap dealt-multiplier mutation policy in Brawlhalla 10.09.96325

Issue: [Recover handicap dealt-multiplier mutation policy](https://github.com/NickTacke/brawlhalla-sim/issues/49)

## Verdict

**Zombie scoring mode triples the post-conversion damage-dealt multiplier of each existing fighter whose flags do not contain bit 2.** Method 7090 performs the only post-construction write to the fighter runtime dealt field in the pinned build:

```text
if ((fighter.flags & 2) == 0) {
  fighter.damageDealtMultiplier = fighter.damageDealtMultiplier * 3
}
```

For a replay handicap dealt word `p`, a selected fighter therefore starts combat with:

```text
(p == 0 ? 1 : p / 100) * 3
```

The multiplication by 3 occurs after fighter construction converts the replay percentage. It mutates the fighter-local `Number` field and is not a separate factor inside the damage formula.

Method 6937 selects method 7090's class `_-n4L` exactly when the match setting is `ScoringType.ZOMBIE`. A nearby `Variation == Shift` branch in method 6936 gates only auxiliary setup. Both variation branches converge before the current scoring-mode startup call, so the tripling is not Shift-only.

Replay-restored fighters use flags `1 | 8 == 9`, which do not contain bit 2 and are selected. Fighters spawned later by the Zombie handler use a mode mask that includes bit 2 and are excluded. The policy therefore distinguishes the existing roster from later mode-spawned fighters.

Confidence is **high** for the pinned build's mode condition, fighter predicate, arithmetic, phase, object-local lifetime, consumers, and static replay-writer reachability.

## Evidence grades

- **Proven:** exact typed trait, instruction-level control/dataflow, or complete exact-QName call/reference closure in the hash-pinned ABC.
- **Bounded closure:** every exact QName reference or callsite in the pinned ABC was enumerated and its ordered ledger was hashed.
- **Structural name:** the narrowest semantic name supported by typed dataflow and readable constants.
- **Unknown:** the inspected primary evidence does not settle the claim.

Issue 1 was read only as the low-resolution Wayfinder map. The issue 26 resolution and its committed analyzer were the proven starting point for replay conversion and damage-consumer order. Repository names were locators only. No environment variables, live-client capture, heap snapshot, decrypted asset, replay payload, or private replay content was inspected.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Mode selection, startup dispatch, fighter flags, mutation, consumers, and replay reachability |
| Sole semantic build string | `10.09.96325` | Build identity |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |
| Dealt exact-QName ledger | `a5e1088659cfc5580b5b0b648cdb11fd65d6f1f4188f30246eff961d680c2959` | All 38 dealt-field instructions in 18 methods |
| Taken exact-QName ledger | `648b020050f42ec8eec5275e078e81c12fc213ce09486aed09be7a99d6631ffa` | Confirms no corresponding taken-field mutation |
| Method 6936 callsites | `f28d997bc687d2750b5788121c044c9733011d55a0d90f1b07e4ac0ddb3b6840` | Sole scoring-mode startup dispatch |
| Method 6937 callsites | `a27dacb556e8f320d596d16771c2ab936e9f8f89d023a1bc785dc95d87fd638f` | Sole scoring-handler selection call |
| Method 7090 callsites | `7e6d4c5e26a4aead5fe121006c0a924d30d26ee2468b15ddb58da4641231fb77` | Sole direct mutation dispatch |
| Variation field ledger | `d5a718b2bc07ab4fb8cfc85b3c937ab99f0e3bd10da6f47ee08775ef8f325930` | Exact disposition of the nearby Shift branch |
| Recorder field ledger | `a1c3a678f2b7f2b85fb7dddfed766e6c75bf3e8bb3e5a981280fc76cca29c9e5` | Recorder lifecycle and writer gate |
| Recorder-factory callsites | `1cfa3d906b2a2b5ce08c56d4fda2ad11b1ff531112c5b01d9cf26bd8439dd8a6` | Recorder construction on match setup paths |
| Settings-writer callsites | `765cbfeba8351a54d91abd217c1494c5a5e5c4a7dd7ae062a8f5a4f73e969d55` | Sole game-settings serialization call |
| Replay-writer callsites | `ab76ff66a2dfbb2dd2649a110199eb30e8e3a364a0c2134aece1d3e6c00673bf` | Complete method-6519 dispatch set |
| Method 6936 body | `55261d25597a4447e8db3cbe62a8c82715fce31b139bfb55955e31e395a7670a` | Variation convergence and mode startup |
| Method 6937 body | `d9b958b4108bdc8c87fd926b13f342eed0ba1ca910ec0d9459264eddd26e1d56` | Scoring-handler selection |
| Method 7090 body | `c4d5b6413511db425fbaa00088b754f2b86d3bd609bd293eb1abe07a380f82e5` | Fighter selection and dealt tripling |
| Method 3282 body | `35ea81c76e8110f2b946dde420044fb4befc8cffb532308e98bf56a3b6157e3b` | Pins the complete shared mode-selection, recorder-creation, and replay-writer path |

The analyzer decodes all 15,010 method bodies, rejects invalid branch targets, requires the exact ABC and build identity, asserts every anchor below, and fails when any complete ledger changes.

## Replay conversion precedes mutation

Issue 26's proven chain remains unchanged:

1. Replay writer 6519 calls helper 4021, which serializes word 2 `_-f3A` before word 3 `_-YA`.
2. Replay reader 6510 calls helper 4022, which restores the same order.
3. Replay-start method 3507 passes the restored roster to factory 3071 and fighter constructor 2790.
4. Constructor 2790 initializes runtime dealt `_-f3A` to `Number(1)`, then replaces it with `p == 0 ? 1 : p / 100` at PCs 5195-5251.
5. Method 7090 later reads that runtime `Number`, multiplies it by integer literal 3 with AVM2 `multiply`, and writes the result to the same field.

There is no integer division or handicap-specific rounding in either stage. AVM2 evaluates the formula in this order:

```text
normalized = p == 0 ? Number(1) : Number(p) / Number(100)
mutated = normalized * 3
```

Examples:

| Replay dealt word | Constructor multiplier | Zombie selected-fighter multiplier |
| ---: | ---: | ---: |
| `0` | `1` | `3` |
| `50` | `0.5` | `1.5` |
| `100` | `1` | `3` |
| `150` | `1.5` | `4.5` |

## Exact scoring-mode and variation conditions

### Zombie selects the mutating handler

Method 6937 reads `game._-gs._-61s`, coerces it to `ScoringType`, and stores it in local 1 at PCs 2-18. At PCs 735-768 it compares that value with readable constant `ScoringType.ZOMBIE`. Equality constructs class 392 `_-n4L` and stores it as the current scoring handler `_-x1V`. Inequality reaches the next selection branch and, if no earlier scoring type matched, PCs 772-790 construct generic handler `_-N2y`.

Method 3229 has the sole exact callsite of method 6937 at PC 137. Method 6936 later invokes the current handler's `_-m3h`; the exact QName resolves to method 7090 on `_-n4L`.

The mode condition is therefore exactly `ScoringType.ZOMBIE`, not a playlist name, damage setting, or inferred UI preset.

### Shift does not gate the mutation

Method 3746 labels `_-71j` as `Variation`. Method 3785 maps value 3 to readable string `ScoringType_SHIFT`.

Method 6936 compares the variation with 3 at PCs 18-26. When false, PC 26 branches directly to PC 69. When true, PCs 30-68 perform auxiliary setup and then fall through to PC 69. PCs 69-80 invoke the current handler's `_-m3h` in both cases.

Consequently:

- Zombie with no variation reaches method 7090.
- Zombie with Shift variation reaches method 7090 after the auxiliary Shift setup.
- Shift on a non-Zombie scoring type invokes that scoring type's handler, not method 7090.

## Startup phase

The direct authoritative startup chain is:

```text
3216:_-t20 PC 1812
  -> 3217:_-z3z
     when _-q3e == 0 at PCs 1916-1929
  -> 3428:_-q5Q PC 1935
     ordinary path when _-V6g._-V1E() is false at PCs 167-209
  -> 6936:_-d31 PC 209
  -> current scoring handler._-m3h PC 76
  -> 7090:_-n4L._-m3h
```

Method 3428 stores its transition argument into `_-q3e` at PCs 152-156 before dispatching method 6936. If `_-V6g._-V1E()` is true, it invokes the alternate `_-V6g._-51f` path and skips method 6936. The semantic name of this obfuscated alternate service predicate is unknown; the exact branch behavior is proven.

This places tripling at the initial zero-state transition, after fighter construction and replay percentage conversion, before later combat consumers. The argument passed to method 7090 is unused by its mutation loop.

## Fighter selection

Method 7090 obtains the current fighter vector `game._-Y1k` at PCs 35-48. It loops over every existing vector entry at PCs 50-118. For each fighter:

1. PCs 72-83 compute `fighter._-56G & _-V4R._-a50`.
2. PCs 84-87 compare the result with zero.
3. A nonzero intersection branches to PC 106 and skips the write.
4. Zero executes PCs 91-102: read dealt multiplier, multiply by 3, write dealt multiplier.

Script initializer method 3074 assigns `_-V4R._-a50 = 2` at PCs 948-956. The condition is therefore bit 2 clear.

### Replay-restored fighters are selected

Replay-start method 3507 passes `_-V4R._-6c | _-V4R._-76C` as the fighter flags at PCs 359-376. Method 3074 initializes these masks to 1 and 8. Factory 3071 forwards the flags unchanged, and constructor 2790 stores them in fighter `_-56G` at PCs 1551-1556.

```text
replay-restored flags = 1 | 8 = 9
9 & 2 = 0
```

Every replay-restored roster fighter present when method 7090 runs therefore receives the tripling mutation.

### Later Zombie-mode fighters are excluded

Method 7100 creates additional fighters using mode mask `_-n4L._-K4c` at PCs 203-262 and reapplies that mask to the resulting fighter at PCs 338-353. Initializer method 14909 constructs `_-K4c` as an OR-mask that explicitly includes `_-V4R._-a50` at PCs 62125-62132.

These later fighters carry bit 2. They fail method 7090's bit-clear predicate, and the complete dealt-field ledger contains no later write that triples them.

## Lifetime and repeated invocation

The complete dealt exact-QName ledger has 38 instructions in 18 methods. Typed receiver and control/dataflow disposition leave only three writes to the fighter runtime `Number` field:

1. Constructor 2790 PC 304: initialize to 1.
2. Constructor 2790 PC 5251: assign the normalized replay/configuration value.
3. Method 7090 PC 102: multiply the current value by 3.

No inverse write, respawn reset, or separate later mutation exists. The tripled value persists on that fighter object and every later consumer reads the live field. Fighters created after the startup loop are not retroactively modified.

The operation is deliberately specified as mutation, not as an idempotent derived formula. If method 7090 is invoked again on the same bit-clear fighter, it multiplies the already-mutated value by 3 again. The static proof pins the initial zero-state dispatch but does not claim that every teardown, rematch, or external re-entry can invoke it at most once. A simulator must reproduce the hook and object lifetime rather than globally substituting `Zombie ? base * 3 : base`.

The taken multiplier `_-YA` has no corresponding method-7090 or post-construction write in its complete 35-instruction ledger.

## Damage-consumer order

Main hit method 1484 consumes the resulting fields in this bytecode order:

```text
t = local23._-n2G * target._-YA
t = t / local25._-32
D = Number(base * t)
if (attacker != null) {
  D = Number(D * attacker._-f3A)
}
```

The target damage-taken multiplier is read at PC 548. The attacker damage-dealt multiplier, including any method-7090 tripling, is read at PC 577. `convert_d` occurs after the base/factor product at PC 560 and after the attacker multiplication at PC 582.

Independent method 4169 also reads the live source fighter dealt field at PC 55 and multiplies it into its result. No consumer recomputes the replay percentage or applies a separate Zombie factor.

## Replay-producing reachability

The mutation is statically reachable on a replay-writing match path:

1. Match setup method 3282 calls method 3229 at PC 323, which selects the current scoring handler through method 6937.
2. The same setup method calls recorder factory 3368 at PC 361.
3. Method 3368 constructs recorder class 357 `_-16` and stores it in field `_-JJ` at PCs 26-37.
4. On the completion path, method 3282 checks only whether `_-JJ` is non-null at PCs 1776-1786, then calls replay writer 6519 at PC 1808. There is no scoring-type or variation exclusion in this gate. The analyzer pins the complete method-3282 body in addition to these branch anchors.
5. Writer 6519 calls settings writer 3748 at PC 91. Method 3748 serializes scoring type `_-61s._-73C` at PCs 62-72 and variation `_-71j` beginning at PC 177.
6. Writer 6519 also serializes each participant handicap object through helper 4021 at PC 1343.
7. Reader 6510 restores both settings and handicap objects. Replay-start method 3507 creates flag-9 fighters, and the common scoring-handler startup reaches method 7090 for Zombie settings.

This proves a complete static route from Zombie match configuration through recorder construction and replay serialization back to replay-restored fighters and the mutation. It does not rely on an authentic fixture. Native file disposition and empirical frequency are broader replay-corpus concerns, not alternate mutation policy.

## Complete dealt-field disposition

| Method | Runtime relevance |
| --- | --- |
| 1484 | Main attacker dealt consumer |
| 2790 | Runtime baseline and replay-percentage normalization |
| 4169 | Independent source dealt consumer |
| 7090 | Sole post-construction runtime mutation |
| 2385, 2400, 2404 | Configuration setter, roster assembly, and normalized accessor |
| 4016-4022 | Configuration application, reset, load, detection, clone, writer, and reader |
| 6527 | Deterministic summary/hash contribution |
| 13085, 13165, 13286 | Configuration display/highlighting |

There are no other exact-QName references in the 15,010 decoded method bodies. The analyzer retains the full ordered ledger under `--explore`.

## Reproducible validation

Keep the proprietary ABC outside version control or under an ignored path. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:handicap-mutation-policy -- \
  --abc /path/to/hash-pinned/main.abc
```

Useful bounded output:

```bash
bun run provenance:handicap-mutation-policy -- \
  --abc /path/to/hash-pinned/main.abc \
  | jq '.status, .identity, .fields, .mutationPolicy, .ledgers, .anchors'
```

Successful output reports `proven-for-pinned-abc`, build `10.09.96325`, the expected ABC digest, 15,010 decoded method bodies, valid branch targets, all ledger hashes above, and the exact mutation formula and selection policy.

The command emits no ABC bytes, replay data, source payload, local input path, player data, or account data. Operating-system errors can still reveal a caller-supplied path.

Repository verification:

```bash
bun run check
```

## Confidence and residual limits

### High-confidence conclusions

- Scoring condition: `ScoringType.ZOMBIE` selects class `_-n4L` and method 7090.
- Variation condition: Shift changes auxiliary setup but does not gate method 7090.
- Fighter predicate: `(flags & 2) == 0`.
- Replay-restored roster fighters use flags 9 and are selected.
- Later Zombie-mode fighters carry bit 2 and are excluded.
- Arithmetic: replay `p` becomes `p == 0 ? 1 : p / 100`, then method 7090 multiplies the runtime value by 3.
- Lifetime: object-local and persistent until object destruction or another proven write; no inverse write exists.
- Consumers: target taken is applied before attacker dealt in method 1484; method 4169 independently consumes dealt.
- Static replay route: scoring settings, handicap words, recorder construction, writer dispatch, reader restoration, and replay startup are connected without a scoring-type exclusion.

### Residual limits

1. **Original declaration names:** unknown. Semantic labels are structural names.
2. **Alternate startup service:** `_-V6g._-V1E()` true bypasses method 6936. Its exact branch is proven; its unobfuscated business meaning is unknown.
3. **Global call count:** the initial zero-state dispatch is proven, but every teardown/rematch re-entry is not closed. Re-entry behavior itself is exact and compounds by 3.
4. **Empirical fixture:** no authentic Zombie replay or dynamic damage trace was needed or inspected. Such a fixture would attest production frequency, not change the static policy.
5. **Other damage factors and builds:** out of scope.

## Map gist and surfaced route

One-line map gist:

```text
Zombie startup triples the post-conversion dealt multiplier on existing bit-2-clear roster fighters; replay-restored fighters qualify, later Zombie spawns do not, and Shift does not gate it.
```

This resolves the method-7090 caveat surfaced by [Determine replay handicap modifier order](https://github.com/NickTacke/brawlhalla-sim/issues/26). No new policy ticket is required. A future corpus-oracle ticket may add an authentic Zombie replay and first-hit trace after trusted reference tracing exists; that would provide dynamic attestation, not fill a static policy blocker.
