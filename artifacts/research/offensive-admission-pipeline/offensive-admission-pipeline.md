# Offensive admission pipeline in Brawlhalla 10.09.96325

Issue: [Close the offensive admission pipeline](https://github.com/NickTacke/brawlhalla-sim/issues/70)

## Verdict

**Bounded static gate and state-order closure, but acceptance is not met. Keep the issue open.**

Hash-pinned primary evidence closes one central owner/team/mode-mask relation gate, the state-zero and invulnerability split reached during candidate construction, a GrabRelease state transition, one active-power invulnerability-expiry order, and the downstream `CanAssist` attribution-write branch.

It does not close every replay-reachable target-policy path. [Prove the reachable PowerType phase universe](https://github.com/NickTacke/brawlhalla-sim/issues/50) leaves 38 source-graph exclusions and executable/dynamic lookup reachability unresolved. [Close downstream semantics for offensive target modes](https://github.com/NickTacke/brawlhalla-sim/issues/69) leaves exact target sets and state effects for the 14 numeric modes and parser flags unresolved. No authenticated interpreted-runtime trace covers the requested matrix.

No simulator offensive-admission policy should be represented as reference-exact from this bounded result.

## Worktree verification and review findings

The existing fail-closed analyzer was rerun in this worktree against local primary inputs whose SHA-256 values match the identities below. It emitted `bounded-static-admission-state-order-with-reachability-and-trace-blockers`, decoded 15,010 method bodies, validated all branch targets, checked 3,671 `PowerTypes` records across 182 columns, and verified all 12 method-body and 11 exact-QName field ledgers. This is static verification only; no interpreted-runtime trace was available or inferred.

| Severity | Finding | Evidence path | Disposition |
| --- | --- | --- | --- |
| **Blocker** | Replay-producing PowerType roots, executable lookup reachability, dynamic names, and 38 source-graph exclusions remain open. | `artifacts/research/offensive-admission-pipeline/offensive-admission-pipeline.md:209` | Universal reachability acceptance is not met. |
| **Blocker** | All 14 downstream target modes, parser-flag combinations, final target sets, and state effects remain open. | `artifacts/research/offensive-admission-pipeline/offensive-admission-pipeline.md:210` | Universal target-policy acceptance is not met. |
| **High** | Fighter state and ordinary invulnerability branches are not partitioned beyond the exact state-zero/timestamp boundaries. | `tools/avm2-provenance/offensive_admission_pipeline_provenance.ts:744-745` | Fail closed; no lifecycle semantics are promoted. |
| **High** | `IsThrow` consumers outside the pinned admission methods can affect selection and state, but their reachable order is unknown. | `tools/avm2-provenance/offensive_admission_pipeline_provenance.ts:746` | No throw-path interaction claim is made. |
| **Blocker** | Full owner/team/mask, assist, grab, dead, respawn, and later method-1484/1486 ordering is not semantically closed. | `artifacts/research/offensive-admission-pipeline/offensive-admission-pipeline.md:211-214` | No universal admission policy is implemented. |
| **Blocker** | Authenticated interpreted-runtime traces for the complete matrix are unavailable. | `artifacts/research/offensive-admission-pipeline/offensive-admission-pipeline.md:215` | Static evidence is not runtime proof. |

The verification command used hash-pinned inputs supplied outside the repository and emitted no source rows, replay bytes, player data, or local input paths. The issue remains open because every blocker above is part of its universal acceptance clause.

## Evidence grades

- **Proven:** unique hash-pinned AVM2 control/dataflow, complete exact-QName reference ledger, full method-body hash, or exact branch destination.
- **Source-derived:** readable field identity parsed from the hash-pinned shipped `powerTypes` table.
- **Bounded static closure:** exact for the pinned methods and source fields while runtime reachability or semantic state partitioning remains open.
- **Unknown:** the inspected evidence does not settle the claim. Obfuscated field names and numeric states are not promoted to semantics without a readable producer or consumer.

Issue 1 was read only as the low-resolution map and was not edited. Related evidence came from [Specify offensive target modes and pairwise hit policy](https://github.com/NickTacke/brawlhalla-sim/issues/52), [Close downstream semantics for offensive target modes](https://github.com/NickTacke/brawlhalla-sim/issues/69), and [Prove the reachable PowerType phase universe](https://github.com/NickTacke/brawlhalla-sim/issues/50). No other ticket was claimed.

## Hash-pinned evidence identity

All artifact digests are SHA-256.

| Evidence | Exact identity | Use |
| --- | --- | --- |
| Reference build | `10.09.96325` | Sole semantic build string in the pinned ABC |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Candidate, arbitration, relation, state, assist, and hit-state methods |
| Extracted `powerTypes` | `715468d8eda8fa2ec3d88a8b5395c076bec937640927909add4745eda2883f27` | Readable parser identities for the named policy fields |
| Parent `BrawlhallaAir.swf` | `40df9af5308b9a17bf015feb38edec6d9bea57d1cd53078d298aa725acceb8b2` | Installed-build parent established by prior evidence |
| Parent `Game.swz` | `4fc9d70c1c3642b7d3e61c8bb0062bb57c46ea2169276ca1d33616a5843d4aff` | Source-archive parent established by prior evidence |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |

The analyzer decodes 15,010 method bodies, validates every branch target, and pins 12 relevant whole-method bodies. It rejects changed input hashes, owners, method bodies, instruction counts, branch destinations, parser anchors, field types, and exact-QName reference ledgers.

## Source field to runtime field map

PowerType parser method 6294 proves these readable mappings:

| Source field | Runtime field | Type | Exact-QName ledger SHA-256 |
| --- | --- | --- | --- |
| `CanDamageEveryone` | `_-n59` | Boolean | `3074e01ec29bd8658b491ef87ff7dd3d977f4d495371c5ea5687169529ce9a8e` |
| `CanAssist` | `_-L1z` | Boolean | `85e120b9e65dbe0bbeda5a9d8900ddd04053a881815dd55b5ccdfe2947d4fbde` |
| `IsThrow` | `_-O2D` | Boolean | `80944088e8c724075a85a58a36cf62fb9b41f4e6472677ef655d7fff3081ee0b` |
| `LoseInvulnTime` | `_-R1Q` | uint | `530f404313fd421ef227557ee348763e1d269405cb6d0f9701e5b53d9b41001c` |

Related closed ledgers:

- fighter team `uint _-HL`: `4a1508eacabdae15f6ade816f9259d58bd4dc1d079d907c74e800db5a1aeacf2`;
- fighter state `uint _-N14`: `841b9d9240ab7cdc95d7a0de9064dec38dafe7ac859a6a34a0cbd43553284479`;
- invulnerability-until timestamp `uint _-c5h`: `6d7a5a942acc36b788760983e21ecadf19ec4c940e822e0ba4d751ba3cf0a9e3`;
- GrabRelease flag `Boolean _-n2R`: `834e2014d4b9c1c292c68543d9e0ef9ae8604d7c5ad19f700b55e5e5acf4111f`;
- grab-family flag `Boolean _-Q6d`: `25d067961f6137f2f6a11eb28bfa92150cef838ab3b6b941ae5d283264e2b71a`;
- grab-family flag `Boolean _-h2x`: `697a8dd06642e564485ad370b4f4cc0ab71ca4bc0d0949231505d6487a434abd`.

These names and types are stable. They do not by themselves prove every downstream behavior.

## Bounded total order

### 1. Active-power invulnerability expiry can precede arbitration in the same tick

Authoritative tick method 3217 calls fighter update method 2894 at PC 2738, then collision arbitration method 1474 at PC 2822. Each reached active-power branch in method 2894 calls method 1496, which calls active-power tick method 45 at PC 625.

Method 45 computes active-power elapsed ticks, reads `LoseInvulnTime -> _-R1Q` at PC 238, and compares elapsed time with `>=` at PC 241. Under its surrounding fighter and timing conditions, it writes fighter `_-c5h = currentTime - 16` at PC 306. Therefore, on a reached active-power update path:

```text
method 3217 fighter update
  -> method 2894 active-power branch
  -> method 1496
  -> method 45 LoseInvulnTime check and possible _-c5h expiry write
  -> method 3217 method 1474 arbitration
```

This is a conditional same-tick order, not proof that every fighter and PowerType reaches method 45 every tick.

### 2. Candidate construction applies repeat, grab-release, state, then invulnerability gates

Method 1540 establishes this reached order:

1. Test prior-target presence.
2. If `MinTimeBetweenHits -> _-s2L` is nonzero, remain blocked while `priorHitTime + interval > currentTime` at instruction indexes 173 through 192. Equality is admitted by this branch.
3. Read GrabRelease flag `_-n2R` at PC 449.
4. On the reached `_-n2R && target._-N14 == 6 && !alreadyHit` path, call fighter method 2938 `_-T11` at PC 491.
5. Method 2938 can write `_-N14` from 6 to 0 and clear readable `mHeldByPower` when its held-owner predicate matches.
6. Call fighter predicate method 3051 `_-N62` at PC 502 with an explicit final `true`. State `_-N14` must still equal zero, but the final `true` bypasses its call to the invulnerability predicate.
7. On the ordinary candidate path, call `_-N62` at PC 2806 without the final argument. Its pinned optional Boolean default is false, so state must equal zero and `_-N62` returns the negation of method 2988 `_-zO`.
8. Method 2988 returns protected on the reached boundary `currentTime <= _-c5h` when its caller flag does not bypass that timestamp test. Equality is protected.

The two calls prove a real state-versus-invulnerability split:

```text
special candidate path:
  state == 0 -> explicit invulnerability-predicate bypass -> continue

ordinary candidate path:
  state == 0 -> evaluate _-zO -> reject when protected
```

State zero is exact. Naming all nonzero values as dead, KO, respawn, grabbed, or another lifecycle state is not justified. The `_-N14` field has 114 owning-method reference groups and many writers; the readable `Respawn` method reads it, but the complete state enum and transition graph are not closed.

### 3. Pairwise arbitration precedes method 1484 admission

Prior issue-52 evidence remains exact. Method 1474 orders candidate clashes by higher Priority, higher source Strength, then lower source Damage. Losing candidates receive `_-J2T = true`. At PC 2038 method 1474 reads `_-J2T`; only an unmarked candidate reaches method 1484 `_-S6I` at PC 2236.

### 4. Method 1484 closes the owner/team/mode-mask relation subgate

Method 1484 derives local 22 by casting source local 5 to fighter type, then evaluates this exact Boolean:

```text
relation =
  CanDamageEveryone
  || source._-HL != target._-HL
  || (
    (global._-p2p & _-I37._-Fk) == _-I37._-Fk
    && owner != target
  )
```

Exact order and short circuits:

1. Read `CanDamageEveryone -> _-n59` at PC 701.
2. If true, bypass both the team comparison and conditional mode-mask/owner term, joining with `relation = true`.
3. Otherwise read source and target team `_-HL` at PCs 712 and 717.
4. If teams differ, bypass the mode-mask/owner term and join with `relation = true`.
5. If teams are equal, evaluate the exact global bitmask expression at PCs 729 through 754.
6. Only when that mask is present, compare owner local 22 with target local 6 at PCs 760 through 766.
7. Store the resulting relation Boolean at PC 769.
8. Apply a sign gate to computed local 28: continue only when `(relation && local28 < 0) || (!relation && local28 > 0)`. Zero and the opposite sign return at PC 811 before later hit processing.

`CanDamageEveryone` is therefore not a global admission bypass. It forces this relation branch true, then remains subject to the sign gate and all later method-1484 processing.

The global bitmask fields remain structural identifiers. Their complete mode vocabulary and all producers are not closed, so this report does not assign a broader readable mode meaning.

### 5. Target-mode positioning and hit application occur later

After the relation/sign gate, method 1484 continues through additional source, target, geometry, mode, item, and actor-state branches. Reached target-mode checks for numeric modes 1 and 8 occur at PCs 1980 and 1993, after the relation gate. Method 1484 calls inner Boolean hit method 1486 `_-24S` at PC 2187 and stores its result in local 42.

This proves that `CanDamageEveryone`, team, mask/owner, and sign do not replace later mode and actor-state policy. The 1,612-instruction method 1484 has 140 branches, and method 1486 adds 724 instructions and 68 branches. Their whole bodies are pinned, but unlabelled branches are not claimed as semantically closed.

### 6. `CanAssist` gates a downstream attribution-write block

Method 1486 structurally writes target-side `_-w2O = true` at PC 857 before the `CanAssist` branch. The semantic name of `_-w2O` remains unknown. At PCs 969 through 998 the method evaluates:

```text
source actor exists
&& (!CanAssist || target._-HL != source._-HL)
```

When true, it executes an attribution-state block writing `_-OV`, `_-H32`, `_-A6B`, `_-H3j`, `_-t2c`, `_-M5A`, `_-j4S`, and `_-C4i` at PCs 1047 through 1156. When false, it skips to instruction 504. Both paths rejoin later processing without returning at this branch; method 1486 eventually calls method 1479 `_-m59` at PC 1460.

Therefore the reached `CanAssist` branch itself does not reject by returning. It controls whether attribution state is written, with a team-dependent short circuit. Broader acceptance semantics remain bounded by the surrounding unlabelled method-1486 branches.

### 7. Hit state resets the invulnerability timestamp after assist processing

Method 1479 `_-m59`, reached after the assist branch, writes fighter `_-c5h = 0` at PC 206 alongside other hit-state resets. This gives the bounded order:

```text
candidate state/invulnerability gate
  -> pairwise arbitration
  -> relation/sign gate
  -> inner hit method
  -> optional assist-attribution writes
  -> hit-state method resets _-c5h to zero
```

This does not prove all later respawn or lifecycle resets.

### 8. `IsThrow` is not a direct read in the pinned admission methods

`IsThrow -> _-O2D` has ten exact owning-method reference groups. None occurs in methods 1474, 1484, 1486, 1540, 2938, 2988, or 3051. One read occurs in active-power method 45, before arbitration on the reached call chain; the remaining consumers sit in power-selection, update, input, and other paths.

The safe result is negative and bounded: the primary relation/state methods do not directly read `IsThrow`. Throw selection and lifecycle can still change the state presented to those methods, so complete throw-path interaction order remains unknown.

## Acceptance disposition

### Proven within the bounded static subgraph

- Exact parser identities for `CanDamageEveryone`, `CanAssist`, `IsThrow`, and `LoseInvulnTime`.
- Exact active-power `LoseInvulnTime` read and conditional invulnerability-expiry write before arbitration on reached fighter-update paths.
- Repeat-hit strict `>` boundary before the reached GrabRelease and state/invulnerability paths.
- GrabRelease state-6 held-state transition before the state-zero gate.
- State-zero admission requirement plus explicit bypassed and ordinary invulnerability-predicate call paths.
- Pairwise-loser gating before method 1484.
- Exact `CanDamageEveryone -> team -> mode-mask/owner -> sign` relation subgate and short circuits.
- `CanAssist` as a downstream attribution-write condition whose branch rejoins without returning.
- Hit-state invulnerability timestamp reset after the assist block.
- No direct `IsThrow` read in the pinned candidate, arbitration, relation, and inner-hit methods.

### Acceptance not met

1. **Reachability:** issue 50 leaves replay-producing roots, executable lookup methods, dynamic names, and 38 PowerTypes unresolved.
2. **Target modes:** issue 69 leaves complete target sets, state effects, and filtering order for all 14 numeric modes and parser-flag combinations unresolved.
3. **Dead and respawn semantics:** the state-zero gate is exact, but all 114 `_-N14` reference groups and state writers are not partitioned into dead, KO, respawn, grabbed, mode-object, and other reachable meanings.
4. **Invulnerability closure:** method 2988 contains additional state, mode, and caller-flag branches beyond the pinned timestamp boundary. Every bypass and interaction is not semantically closed.
5. **Throw closure:** `IsThrow` consumers outside the pinned admission methods can alter earlier state and selection. Their replay-reachable call order is not closed.
6. **Full method closure:** method 1484 and method 1486 contain many unlabelled branches and writes. Whole-body hashes detect drift but do not establish semantic total order.
7. **Runtime traces:** no authenticated interpreted-runtime trace covers every admitted mode, relation combination, GrabRelease transition, state code, invulnerability equality/bypass, assist branch, or throw path.

These are missing proof obligations, not inferred behavior. The issue must remain open.

## Reproduction

Keep proprietary inputs under ignored paths or outside the repository. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:offensive-admission-pipeline -- \
  --abc /path/to/hash-pinned/main.abc \
  --power-types /path/to/hash-pinned/Game.swz.38.dat
```

Expected status:

```text
bounded-static-admission-state-order-with-reachability-and-trace-blockers
```

Expected identity includes build `10.09.96325`, 15,010 decoded method bodies, valid branch targets, the two input hashes above, 12 pinned method bodies, 11 exact field ledgers, and six explicit blockers. A mismatched ABC or PowerTypes file exits nonzero.

The command emits input hashes but no ABC bytes, source rows, power names, replay bytes, player data, or private corpus content. Operating-system errors can still reveal a caller-supplied path.

## Privacy statement

No ABC, SWF, SWZ, extracted table, replay, player identifier, credential, proprietary payload, or user-specific local path is committed. This artifact contains hashes, aggregate method counts, public source field names, obfuscated runtime identifiers, control-flow anchors, bounded conclusions, and path placeholders.

## Surfaced route

No duplicate ticket was created or claimed. The existing route is:

1. close replay-producing roots and executable/dynamic PowerType reachability through the prerequisites already recorded by issue 50;
2. close all downstream mode and parser-flag target sets in issue 69;
3. partition every reachable `_-N14` writer and invulnerability-predicate branch into exact lifecycle semantics;
4. close every `IsThrow` consumer reachable from admitted PowerTypes;
5. capture authenticated interpreted-runtime traces for the resulting complete matrix.

## One-line map gist

The pinned static chain orders repeat-hit, GrabRelease state repair, state-zero/invulnerability admission, arbitration, `CanDamageEveryone` team/mask-owner relation, sign, assist attribution, and hit-state reset, but reachable mode sets, dead/respawn and throw closure, remaining invulnerability branches, and authenticated traces still block a universal pipeline.
