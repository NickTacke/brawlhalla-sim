# Collision query call reachability in Brawlhalla 10.09.96325

Issue: [Close collision query call reachability](https://github.com/NickTacke/brawlhalla-sim/issues/65)

## Verdict

**Executable closure is unavailable, and issue acceptance is not met. Keep the ticket open.**

The hash-pinned ABC closes the direct target identity more tightly than the prior 93-call report:

- all 93 syntactic calls use the exact public QName `36:8827` for `_-K2O`;
- that QName has exactly one declared method trait in the complete ABC, method 1390 on class 76 `_-91W`;
- class 76 has no ABC subclass, and no same-QName override exists;
- there is no `callstatic`, `callmethod`, `newfunction`, exact `getproperty`, exact `setproperty`, or `pushstring "_-K2O"` reference to method 1390;
- the only additional exact-QName reference is method 1386's `findproperty` immediately preceding one of the 93 calls.

This proves a singleton **declared target set** for the 93 exact-QName calls. It does not prove that a call executes, that its receiver is valid, or that its owner is reached by every replay-producing configuration.

Every direct site therefore remains **unclassified**, not excluded. The complete ABC also contains 189 generic stack `call` instructions and 13,328 non-QName property accesses. No receiver-resolved transitive graph exists to decide which of those indirect surfaces are replay-reachable or can produce method 1390 through a function value, namespace-set lookup, runtime multiname, callback, or reflection.

## Evidence grades

- **Proven:** exact instruction, QName, method trait, owner, byte PC, semantic hash, or complete reference ledger in the hash-pinned ABC.
- **Method-path proven:** an owner method belongs to a narrow replay-to-gameplay path, without proof that a conditional callsite inside it executes.
- **Unclassified:** neither replay-producing reachability nor safe exclusion is proven.
- **Unknown:** the current primary evidence does not establish a finite target or configuration set.

Obfuscated owner names, shared method names, same-QName coincidence, and source-table presence are not treated as semantic owner or replay-production proof.

## Hash-pinned primary evidence

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Complete direct and indirect syntactic scan, trait target set, method semantic hash |
| Sole semantic build string | `10.09.96325` | Reference-build identity |
| Method 1390 instruction-object ledger | `5c53868fc7375d4f7881d55491ab1cae00b2c6a46375731a9ba9275f161189d0` | Target body identity under the pinned decoder |
| Ordered 93-call ledger | `c826cbf889831a2cde0863e37d17792f12a3cb468c045f9e5101a77daa873ad7` | Method, class, owner, PC, opcode, and arity identity |
| Ordered 94-reference ledger | `71552d5a6e4c32937f1f8bef28fd4e362ae5f45f09aae5265ffca9894883050b` | Every exact-QName reference, including method 1386 `findproperty` |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |

The analyzer decodes all 15,010 bodies, validates every branch target, and fails closed on ABC/build drift, target trait drift, semantic body drift, call/reference ledger drift, changed direct counts, new declared targets or subclasses, explicit method-ID/name references, or changed whole-ABC indirect surface counts.

## Direct target identity

Method 1390 is the instance method trait `_-91W._-K2O` on class index 76. The exact QName is public `36:8827`. Its complete declared target set is:

```text
class 76 _-91W._-K2O -> method 1390
```

No other instance, class, or script trait in the ABC has that QName. Class 76 directly extends `Object`, has no interfaces, and has no ABC subclass. The 93 call instructions split into 85 `callproperty` and eight `callpropvoid` instructions.

This closes ordinary declared-trait override selection for the exact calls. It does not close receiver construction, dynamic values, or whether execution reaches a callsite.

## Complete direct-call disposition

Each row is complete for its containing method. Every listed PC has disposition **Unclassified**. `10`, `12`, and `13` denote argument arity. The analyzer output provides one normalized row per PC with opcode and arity.

| Method | Exact owner | Calls and PCs | Evidence-safe owner family | Arity | Disposition |
| ---: | --- | --- | --- | --- | --- |
| 44 | `_-M5v._-b5W` | `563`, `2171` | unresolved obfuscated family | `10`, `13` | Unclassified |
| 53 | `_-M5v._-J3Q` | `118` | unresolved obfuscated family | `13` | Unclassified |
| 66 | `_-M5v._-C1U` | `436` | unresolved obfuscated family | `10` | Unclassified |
| 763 | `_-d1H._-HO` | `306` | unresolved obfuscated family | `10` | Unclassified |
| 784 | `_-d1H._-i3F` | `477` | unresolved obfuscated family | `10` | Unclassified |
| 801 | `_-m4s._-F2Q` | `1278` | obfuscated `_-Pe` subclass | `10` | Unclassified |
| 919 | `CTFState._-F2Q` | `1760` | readable CTF mode state | `10` | Unclassified |
| 1386 | `_-91W._-u` | `93` | collision-world owner | `10` | Unclassified |
| 1501 | `_-Y4C._-J20` | `391` | unresolved obfuscated family | `10` | Unclassified |
| 1503 | `_-Y4C._-Q2f` | `543`, `638` | unresolved obfuscated family | `10` | Unclassified |
| 1537 | `_-Y4C._-vk` | `1129`, `1259` | unresolved obfuscated family | `10` | Unclassified |
| 1540 | `_-Y4C._-06D` | `1264`, `1587`, `1687`, `1966`, `2066`, `2254`, `2399`, `2543`, `2688`, `3265` | unresolved obfuscated family | `12` | Unclassified |
| 1641 | `Companion._-D38` | `699`, `1107`, `1790`, `1884`, `2449`, `2636`, `2730`, `4154`, `4549`, `4823`, `5641`, `5734` | readable companion | `10` | Unclassified |
| 1683 | `_-w3J._-d5t` | `579` | unresolved obfuscated family | `10` | Unclassified |
| 1687 | `_-w3J._-u4o` | `1256` | unresolved obfuscated family | `10` | Unclassified |
| 1688 | `_-w3J._-04U` | `465` | unresolved obfuscated family | `10` | Unclassified |
| 1720 | `_-w3J._-841` | `592` | unresolved obfuscated family | `10` | Unclassified |
| 1722 | `_-w3J._-717` | `258` | unresolved obfuscated family | `10` | Unclassified |
| 1739 | `_-w3J._-P6M` | `200` | unresolved obfuscated family | `10` | Unclassified |
| 1740 | `_-w3J._-K6G` | `126` | unresolved obfuscated family | `10` | Unclassified |
| 2681 | `_-128._-G6j` | `109` | unresolved obfuscated family | `10` | Unclassified |
| 2684 | `_-128._-r4z` | `187` | unresolved obfuscated family | `10` | Unclassified |
| 2685 | `_-128._-Xe` | `188` | unresolved obfuscated family | `10` | Unclassified |
| 2887 | `_-V4R._-D38` | `3329`, `4021`, `6944`, `7047`, `7378`, `7918`, `8113`, `8216`, `10380`, `11009`, `11321`, `12508`, `12610` | fighter movement | `10` | Owner method is narrow-path proven; each PC Unclassified |
| 2907 | `_-V4R._-323` | `267` | fighter | `10` | Unclassified |
| 2914 | `_-V4R._-fC` | `220`, `398` | fighter | `10` | Unclassified |
| 2972 | `_-V4R._-14X` | `146` | fighter | `10` | Unclassified |
| 3176 | `_-d35._-D5f` | `240` | `Companion` subclass | `10` | Unclassified |
| 4172 | static `_-I5Y._-73t` | `240`, `327`, `703`, `852`, `929` | unresolved static utility | `10` | Unclassified |
| 4189 | `_-u5P._-D5f` | `376` | `Companion` subclass | `10` | Unclassified |
| 5076 | `_-82U._-2a` | `627`, `674`, `783`, `830` | unresolved obfuscated family | `13` | Unclassified |
| 5881 | `_-21m._-wc` | `729`, `839` | unresolved obfuscated family | `10` | Unclassified |
| 5886 | `_-21m._-vz` | `198`, `298`, `798` | unresolved obfuscated family | `10` | Unclassified |
| 5887 | `_-21m._-y4J` | `558` | unresolved obfuscated family | `10` | Unclassified |
| 6102 | `_-q4V._-O5i` | `581` | unresolved obfuscated family | `10` | Unclassified |
| 7240 | `_-04B._-W1I` | `823`, `1574`, `4634` | unresolved obfuscated family | `10` | Unclassified |
| 12611 | `_-o5r._-F2Q` | `1320` | obfuscated `_-Pe` subclass | `10` | Unclassified |
| 14750 | `_-62._-D38` | `1413`, `4804`, `4910`, `5518`, `5694`, `5800`, `6570`, `6675` | unresolved obfuscated family | `13` | Unclassified |
| **Total** | **38 methods** | **93 calls** |  | **69 ten, 10 twelve, 14 thirteen** | **93 Unclassified** |

Shared names such as `_-D38`, `_-D5f`, and `_-F2Q` are not treated as shared semantic families. Inheritance proves only that classes 161 `_-d35` and 222 `_-u5P` are `Companion` subclasses, and that classes 43 `_-m4s`, 50 `CTFState`, and 678 `_-o5r` share base `_-Pe`.

## Masks, options, and optional arguments

The prior hash-pinned collision investigation establishes these complete aggregate partitions for the same 93 calls:

### Query masks

| Form | Calls | Reduced value |
| --- | ---: | ---: |
| Literal hard | 54 | `1` |
| Literal hard-or-soft | 16 | `3` |
| Reversed literal soft-or-hard | 1 | `3` |
| Literal soft | 3 | `2` |
| Literal no-slide flag only | 1 | `16` |
| Five traced local-mask variables | 18 | runtime `1` or `3` only |

### Query options

| Option | Calls | Exact composition |
| ---: | ---: | --- |
| `0` | 67 | default filters |
| `8` | 21 | bypass early explicit-normal filter |
| `9` | 2 | `1 | 8` |
| `4` | 2 | post-hit component filter plus early-filter bypass |
| `11` | 1 | `1 | 2 | 8` |

Ten calls pass 12 arguments with a runtime exclusion mask. Fourteen pass all 13 arguments: eight pass item-ignore bit `32` with a null collection, and six pass zero exclusion with a runtime collection.

These totals are exact but are not a PC-indexed join. The current evidence cannot provide the ticket's required per-call mask, option, owner family, and replay-producing configuration path. That missing join is an explicit acceptance blocker, not a reason to project aggregates onto individual PCs.

## Direct and indirect edge disposition

| Edge class | Primary local result | Reachability disposition |
| --- | --- | --- |
| 93 exact-QName property calls | Complete method/owner/PC/opcode/arity ledger; singleton declared target method 1390 | Every call Unclassified |
| Same-QName override targets | Exactly zero additional declared traits; class 76 has zero ABC subclasses | No declared override target exists |
| Explicit method closures or direct method-ID calls | Zero `newfunction`, `callstatic`, `callmethod` dispatch-ID, or exact `getproperty` references to method 1390 | No explicit static indirect edge exists |
| Literal reflection | Zero `pushstring "_-K2O"` references | No literal-name reflected edge exists |
| Generic stack calls | 189 `call` instructions in the complete ABC | Reachable subset and values Unknown |
| Non-QName property access | 13,328 namespace-set or runtime-multiname `getproperty`/`setproperty`/`deleteproperty` instructions | Reachable subset and target names Unknown |
| Callback registration and invocation | No transitive assignment-to-invocation graph | Dynamic target set Unknown |
| Constructors, factories, and initializers | No replay-root allocation/type graph | Receiver set Unknown |
| Exceptions and native edges | No transitive executable graph | Fallback and dispatch effects Unknown |

The zero explicit-indirect findings are bounded syntactic facts. They are not deletion-tested proof that generic function values or runtime names can never reach method 1390.

## Configuration-path boundary

The requested universal path is not available:

```text
format-268 replay bytes
  -> replay-writer-eligible configuration tuple
  -> normalized patch configuration
  -> concrete mode/world/entity construction
  -> class and script initialization
  -> authoritative tick method 3217
  -> receiver-resolved owner method
  -> exact method-1390 call PC
```

Existing movement evidence proves one narrow path from replay record method 6509 through replay load 3507, snapshot insertion 6133, sampler 6135, input consumer 6125, fighter jump 2954, and fighter movement method 2887. This proves method 2887 belongs to one attested `TIMED` replay path. It does not prove that any of method 2887's 13 conditional collision calls executes, and it does not cover every replay-producing configuration.

The executable audit finds 164 non-template mode presets across 24 scoring families and four custom profiles. The reviewed authentic corpus directly attests only `TIMED`. Its replay-load and tick roots have 134 unresolved first-frontier call or constructor sites, before transitive traversal.

## Exact blockers

1. [Build a conservative AVM2 executable graph and deletion harness](https://github.com/NickTacke/brawlhalla-sim/issues/44) is open with no completed graph. Receiver types, overrides, constructors, initializers, callbacks, function values, reflection, exceptions, natives, and deletion tests remain unresolved.
2. [Prove match initialization and tick executable closure](https://github.com/NickTacke/brawlhalla-sim/issues/32) remains open. Its first frontier has 134 unresolved sites, and method 3507 remains a replay-load candidate rather than a complete initialization-root set.
3. The replay-producing configuration matrix is incomplete: 24 source scoring families exist, while direct corpus evidence covers only `TIMED`.
4. Patch-loader normalization, defaults, and config-selected concrete type construction are not connected to every replay tuple.
5. The published mask and option evidence is aggregate, not joined to every call PC, owner family, and configuration path.
6. No trusted interpreted-reference trace matrix exists across every replay-producing family, so deletion cannot prove exclusions preserve gameplay traces.

Collision phase, tie arbitration, and composite responses remain separate issue-48 blockers. They do not repair call reachability.

## Acceptance disposition

| Requirement | Result | Reason |
| --- | --- | --- |
| Every direct call reachable or excluded | **Not met** | 93 of 93 remain Unclassified |
| Every dynamic target reachable or excluded | **Not met** | explicit exact-QName targets are bounded, but generic function/runtime-name surfaces lack executable traversal |
| Exact owner family per call | **Not met** | fighter, companion, CTF, and structural inheritance are bounded; most owners remain semantically unresolved |
| Exact mask and option per call | **Not met** | complete aggregate partitions exist, but no PC-indexed join |
| Replay-producing configuration path per reachable call | **Not met** | only one narrow `TIMED` owner-method path is proven |
| Deletion-tested exclusion | **Not met** | graph membership, producer matrix, and trusted traces are incomplete |
| Determine whether closure is available now | **Satisfied** | no; exact blockers are listed above |

## Reproduction

Keep proprietary inputs under ignored storage or outside the checkout and pass paths explicitly:

```bash
bun install --frozen-lockfile
bun run provenance:collision-query-reachability -- \
  --abc /path/to/hash-pinned/main.abc
```

Expected bounded output reports:

- status `acceptance-not-met`;
- build `10.09.96325` and ABC hash `9fe9...ba2d`;
- 15,010 decoded bodies and valid branch targets;
- one declared target, method 1390, with zero ABC subclasses;
- 93 calls in 38 methods, all `unclassified`;
- arities `69 / 10 / 14` for `10 / 12 / 13` arguments;
- 94 exact-QName references, with the extra reference being `findproperty`;
- zero explicit method-ID or literal-name references;
- 189 generic stack calls and 13,328 non-QName property accesses as unresolved whole-ABC surfaces.

A successful command verifies the negative evidence contract. It does not prove executable closure.

Repository verification:

```bash
bun run check
git diff --check
git status --short
```

## Map gist and surfaced route

**Map gist:** The exact 93-call ledger resolves to one declared collision-query target with no ABC override or explicit reflected/callback reference, but all callsite execution and residual indirect reachability remain unclassified until the replay-producing configuration matrix and conservative executable graph are deletion-tested.

**Surfaced route:** Complete the existing executable-graph ticket, replay-producing mode matrix, and patch-loader type-selection path. Then extend this analyzer with one row per admitted direct or indirect edge containing root path, configuration predicate, receiver allocation/type, target semantic hash, call PC, mask, options, excluded mask, collection mode, and binary disposition. Exclude a row only after deletion preserves trusted interpreted-reference traces over the complete producer matrix.

No new ticket is required by this bounded result. No other ticket was claimed.

## Related reviewed evidence

- [Collision query options and composite flag consumers](https://github.com/NickTacke/brawlhalla-sim/blob/a0218e43ab306d9a59017c281a241b65a97d84b5/artifacts/research/collision-query-flags/collision-query-flags.md)
- [Match initialization and tick executable closure](https://github.com/NickTacke/brawlhalla-sim/blob/af8b75dc3f423f95ef2fdf01b48be5f4b5b26c79/artifacts/research/match-tick-closure/match-tick-closure.md)
- [Issue 44 executable-graph acceptance contract](https://github.com/NickTacke/brawlhalla-sim/issues/44)
- [Movement provenance](../../../docs/provenance.md)

## Privacy and licensing

The analyzer and report contain hashes, counts, method/class identifiers, byte PCs, and bounded graph metadata only. They contain no ABC/SWF/SWZ bytes, decrypted assets, replay bytes, fixture identities, player data, credentials, or local filesystem paths.
