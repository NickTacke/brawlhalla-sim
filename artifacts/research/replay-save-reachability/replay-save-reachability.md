# Upstream replay-save reachability in Brawlhalla 10.09.96325

Issue: [Resolve upstream replay-save reachability and lifecycle semantics](https://github.com/NickTacke/brawlhalla-sim/issues/42)

## Verdict

**The pinned ABC closes the known static dispatch chain more strongly than the prior replay-writer report.** The 27 calls across 24 methods are exact-QName `callpropvoid` references to class 164 `_-u16` method 3442 `_-22K`, not unresolved simple-name matches. There is one exact trait definition in the ABC. Fifteen calls resolve the method on controller scope. Twelve load a field named `_-Z2h` whose declaring or inherited slot is statically typed as `_-u16`.

Method 3442 has one exact-QName call to class 357 `_-16` finalizer method 6524 `_-x3N`, at PC 204. Its exact receiver slot `_-JJ` is typed as `_-16`. The call is skipped only when that slot is null at PC 194. Method 3442's optional Boolean defaults to true, but the method never reads it. The zero-argument, explicit-false, and forwarded-Boolean call sites therefore have identical replay-save reachability.

The writer slot starts null. Its complete exact-QName ledger has two writes, and its effective slot ID 143 has no `setslot` write:

- method 3329 closes the current writer and writes null at PC 33;
- method 3368 constructs the exact writer class and writes it at PC 37, then passes `(uint seed, uint playlistId, Boolean online)` to header writer 6518.

Method 3368 has three exact call sites. Methods 3282 PC 361 and 5257 PC 229 pass the header Boolean as true. Method 3514 PC 179 passes it as false, and is reached only when that method's first Boolean parameter is false. The prior format-268 proof identifies this third header value as `online`, so the combined evidence proves online and local writer-construction routes. It does not prove that every normalized playlist, custom setting, roster, variation, or lifecycle exit reaches one of them.

The static result by configuration is therefore uniform once the writer exists: method 3442 contains no configuration-specific branch before its finalizer call, and the caller's optional Boolean is dead. The static result by lifecycle is bounded: all 27 known call instructions resolve to the same cleanup method in the pinned ABC, but no authenticated trace or readable exit discriminator assigns any one site to normal completion, disconnect, forfeit, host quit, rematch, or abort. The 12-file corpus still proves completed emission only for the reviewed online playlist-108 cell.

Confidence is **high** for the exact in-ABC call ledger, receiver types, writer-slot lifecycle, and lack of argument/configuration gating in method 3442. Lifecycle-site attribution and runtime subclass or host dispatch remain **unknown**.

## Evidence grades

- **Proven:** exact typed trait, exact QName, instruction-level control flow, or complete reference ledger in the hash-pinned ABC; or direct observation in the hash-attested replay corpus.
- **Bounded static closure:** all matching definitions and instructions in the pinned ABC were enumerated and fail closed on a changed ledger. This does not include separately loaded code, native host reflection, or an executed runtime trace.
- **Unknown:** the inspected primary evidence cannot assign a configuration or lifecycle event to an executed site.

Prior reports and repository parser names were locators. The dispatch conclusions below derive from the pinned executable and the committed analyzer.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Traits, exact QNames, call sites, branch targets, receiver fields, writer setup/reset |
| Sole semantic build string | `10.09.96325` | Build identity |
| Decoded method bodies | `15,010` | Complete in-ABC search domain |
| Cleanup call-site ledger | `28ce2c68e3444dc6bb328bedf78484a3df7a484ad782702920b82db75cb36340` | 27 exact calls across 24 methods, including owners, PCs, and argument counts |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |
| Reviewed corpus manifest | `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac` | One proven completed-emission configuration inherited from prior research |

The analyzer rejects a changed ABC, build string, invalid branch target, class identity, class flags, trait definition, call-site list, call-site digest, receiver route, receiver type, writer-slot mutation, setup route, header write, or dynamic-call inventory.

## Exact dispatch closure

### Cleanup method QName

Method 3442 is the sole definition of exact QName key `36:34454`, displayed as `_-22K`, in the pinned ABC. The complete exact-QName instruction ledger contains 42 instructions:

- 27 `callpropvoid` instructions across 24 methods;
- 15 paired `findproperty` instructions for calls made from methods on the controller itself.

There are no same-simple-name references using another QName or multiname kind, no pushed runtime string `_-22K`, no `callstatic` to method 3442, and no `callmethod` instruction anywhere in the ABC.

Every known receiver is structurally typed:

- Calls owned by class 164 resolve `_-22K` from controller scope.
- Calls outside class 164 load exact field QName `_-Z2h`; the owner or an ancestor declares that slot as class 164 `_-u16`.

Class 164 is sealed but not final. The ABC contains no local descendant and no second definition of exact QName `_-22K`. Therefore every known in-ABC site resolves to method 3442 for the in-ABC receiver universe. A separately loaded subclass or host-created receiver is not excluded by static evidence.

### Complete call-site ledger

The Lifecycle column is intentionally absent. No primary evidence labels these sites with the requested exit causes. Method 5255 contains readable text `Error in Spectate. Try Again.`, which identifies a spectate-error context but does not prove any replay-producing lifecycle exit.

| Caller method | Owner | PC | Receiver | Argument to 3442 |
| ---: | --- | ---: | --- | --- |
| 3212 | `_-u16._-S68` | 79 | controller scope | default true, unused |
| 3218 | `_-u16._-A3f` | 1517 | controller scope | default true, unused |
| 3231 | `_-u16._-B2O` | 286 | controller scope | default true, unused |
| 3265 | `_-u16._-D4G` | 55 | controller scope | default true, unused |
| 3266 | `_-u16._-o4X` | 5 | controller scope | default true, unused |
| 3270 | `_-u16._-620` | 252 | controller scope | default true, unused |
| 3301 | `_-u16._-91H` | 69 | controller scope | default true, unused |
| 3328 | `_-u16._-N5b` | 198 | controller scope | default true, unused |
| 3328 | `_-u16._-N5b` | 223 | controller scope | default true, unused |
| 3328 | `_-u16._-N5b` | 322 | controller scope | default true, unused |
| 3328 | `_-u16._-N5b` | 375 | controller scope | default true, unused |
| 3433 | `_-u16._-A30` | 14 | controller scope | default true, unused |
| 3434 | `_-u16._-958` | 94 | controller scope | default true, unused |
| 3435 | `_-u16._-Ex` | 62 | controller scope | default true, unused |
| 3436 | `_-u16._-H1K` | 63 | controller scope | forwarded Boolean, unused |
| 5228 | `LinkUpdater._-q35` | 864 | slot typed `_-u16` | default true, unused |
| 5230 | `LinkUpdater._-bD` | 30 | slot typed `_-u16` | default true, unused |
| 5231 | `LinkUpdater._-j3K` | 30 | slot typed `_-u16` | explicit false, unused |
| 5255 | `LinkUpdater._-63I` | 20 | slot typed `_-u16` | default true, unused |
| 5264 | `LinkUpdater._-TE` | 136 | slot typed `_-u16` | default true, unused |
| 5268 | `LinkUpdater._-y3o` | 22 | slot typed `_-u16` | default true, unused |
| 7322 | `_-p48._-D2Z` | 22 | inherited slot typed `_-u16` | default true, unused |
| 7328 | `_-p48._-J2h` | 22 | inherited slot typed `_-u16` | default true, unused |
| 9313 | `_-523._-D32` | 29 | slot typed `_-u16` | explicit false, unused |
| 9445 | `_-f1m._-t3L` | 70 | slot typed `_-u16` | explicit false, unused |
| 11238 | `_-r59._-H5d` | 1203 | slot typed `_-u16` | default true, unused |
| 12806 | `_-n5Z._-pi` | 28 | slot typed `_-u16` | default true, unused |

### Cleanup argument is not a save discriminator

Method 3442 declares one optional Boolean whose AVM2 default is true. No instruction reads local 1. The four one-argument calls are:

- method 3436 forwards its own Boolean;
- methods 5231, 9313, and 9445 push false.

All other calls omit the argument. Since method 3442 never reads it, these values do not select replay-save behavior, cleanup branches, or lifecycle semantics in this build.

## Writer receiver lifecycle and preconditions

### Exact finalizer route

Class 357 `_-16` method 6524 `_-x3N` is the sole definition of exact QName `36:36508`. Its only exact call site in the ABC is method 3442 PC 204.

The local control flow is:

```text
method 3442
  -> read typed writer slot _-JJ
  -> PC 194: if writer == null, branch to PC 208 and skip finalizer
  -> PC 201: load the same writer slot
  -> PC 204: call exact QName _-x3N with zero arguments
  -> PC 208: continue broad cleanup
```

No earlier branch crosses PC 204. Earlier optional cleanup calls rejoin before the writer check. This makes non-null `_-JJ` the sole method-3442-local precondition for the replay finalizer.

Method 6524 retains the internal boundaries established by the prior writer investigation: candidate state must be present, and save-in-progress must be false. Once those checks pass, its observed mask branches rejoin before the common writer sequence. Native completion and final file disposition are separate from this upstream proof.

### Static writer-slot mutation ledger

Class 164 slot `_-JJ` is typed as class 357 `_-16` and has no explicit initializer, so its initial AVM2 value is null. Across all 15,010 bodies, only two instructions mutate the exact slot QName:

| Method | PC | Effect |
| ---: | ---: | --- |
| 3329 `_-v1A` | 22, 33 | call writer method 6525 `_-J2g` when non-null, then write null |
| 3368 `_-fN` | 33, 37 | construct exact class 357 with the controller, then write it to `_-JJ` |

The slot's effective AVM2 slot ID is 143, and no `setslot 143` occurs. The ABC does contain 3,718 computed-name property writes. None pushes `_-JJ` as a literal, but static analysis cannot exclude a computed write to that field. The two-row table is therefore complete for exact-QName and slot-addressed writes, not for arbitrary runtime-name mutation.

Method 3368 immediately calls writer header method 6518 at PC 49 with its three unchanged parameters. The analyzer proves their primitive types and write positions. The prior format-268 evidence identifies the state-3 semantics as seed, playlist ID, optional playlist display key, and online bit.

### Writer setup routes

| Setup caller | PC | Header origin | Structural precondition | Configuration conclusion |
| ---: | ---: | --- | --- | --- |
| 3282 `_-6e` | 361 | online `true` | static path reaches call | Online writer construction exists; later method strings include `online.Matchmaking` and `online.Custom`, but no per-category reachability is proved |
| 3514 `_-E4G` | 179 | online `false` | method parameter 1 must be false; true branches to PC 184 and skips setup | Local writer construction exists |
| 5257 `LinkUpdater._-E2t` | 229 | online `true` | static path reaches call | A second online writer-construction route exists |

These three sites are the entire exact-QName call ledger for method 3368. The analyzer proves that the first two setup parameters are `uint`, the third is `Boolean`, and the values reach header writer 6518 unchanged. Their seed, playlist ID, and online names come from the separately reviewed format-268 evidence.

## Normalized configuration disposition

Method 3442 receives no settings object, playlist, roster, scoring family, variation, bot, or team argument. Its only argument is dead. Once `_-JJ` is non-null, every known call site reaches the same exact finalizer call regardless of normalized configuration.

This is a negative guard result, not positive production proof:

| Configuration family | Writer construction evidence | Cleanup-to-finalizer result | Production status |
| --- | --- | --- | --- |
| Reviewed online playlist 108, timed four-human FFA | Online construction routes exist | Uniform non-null-writer route | **Completed emission proven by 12 authentic files; executed call site unknown** |
| Other online playlists | Online construction routes exist | No configuration-specific suppression in method 3442 | **Unproven per configuration** |
| Custom online | Online construction routes exist and method 3282 contains `online.Custom` | No configuration-specific suppression in method 3442 | **Unproven per configuration** |
| Local/couch | Offline construction route exists | No configuration-specific suppression in method 3442 | **Unproven per configuration** |
| Training/practice | No unique setup or cleanup discriminator identified | Uniform only if writer was constructed | **Unknown** |
| Human with bots or bot-only | No roster guard in method 3442 | Uniform only if writer was constructed | **Unknown** |
| Team modes | No team guard in method 3442 | Uniform only if writer was constructed | **Unknown** |
| Relay, Scramble, Shift | No variation guard in method 3442 | Uniform only if writer was constructed | **Unknown** |
| Other scoring families or off-preset tuples | No settings guard in method 3442 | Uniform only if writer was constructed | **Unknown** |

The simulator and conformance plan must not convert this table into an allowlist or denylist. Authentic format-268 bytes remain the supported input boundary.

## Lifecycle-exit disposition

Static dispatch closes the target of every known call, but not which call executes for a lifecycle cause. Format 268 has no parsed exit-reason field, and the available corpus lacks labeled non-completion exits.

| Lifecycle exit | Static replay-save route | Executed-site evidence | Disposition |
| --- | --- | --- | --- |
| Normal completion | Every known cleanup call reaches 3442; non-null writer reaches 6524 | Completed output exists for the reviewed playlist-108 cohort, but no authenticated site trace exists | **Emission proven for one cell; site unknown** |
| Disconnect | Same structural route if a cleanup site runs with non-null writer | No labeled replay or authenticated trace | **Unknown** |
| Forfeit | Same structural route if a cleanup site runs with non-null writer | No labeled replay or authenticated trace | **Unknown** |
| Host quit | Same structural route if a cleanup site runs with non-null writer | No labeled replay or authenticated trace | **Unknown** |
| Rematch | Same structural route if a cleanup site runs with non-null writer | Repeated Results sections do not identify rematch | **Unknown** |
| Abort before Results | Same structural route is possible only if writer exists and a cleanup site runs | Zero-Results files are unsupported; creation, save, or deletion is not observed | **Structural rejection proven; attempt unknown** |
| Abort after Results | Same structural route if a cleanup site runs with non-null writer | No labeled replay or authenticated trace | **Unknown** |

The important correction is that unknown lifecycle semantics no longer imply unknown in-ABC method target. The target is closed. The remaining unknown is runtime path execution and lifecycle attribution.

## Dynamic-dispatch completeness ledger

### Closed within the pinned ABC

- Exact cleanup QName definitions: 1, method 3442.
- Exact cleanup QName instructions: 42.
- Exact cleanup calls: 27 across 24 methods.
- Same simple name under another QName or multiname kind: 0.
- Pushed runtime string matching the cleanup name: 0.
- `callstatic` routes to method 3442: 0.
- `callmethod` instructions in the entire ABC: 0.
- Local subclasses of controller class 164: 0.
- Exact finalizer QName definitions: 1, method 6524.
- Exact finalizer calls: 1, method 3442 PC 204.
- Local subclasses of writer class 357: 0.

### Still unresolved

1. **Separately loaded subclasses:** controller and writer classes are sealed but not final. The pinned ABC has no descendants or overrides, but static analysis cannot exclude host- or separately-loaded subclasses.
2. **Runtime-name and host reflection:** computed property access, native code, or host reflection could invoke public QNames without an enumerable static call instruction.
3. **Executed-site reachability:** the static graph cannot show which of the 27 calls runs for a normalized configuration or lifecycle exit.
4. **Lifecycle labels:** obfuscated caller context and unlabeled replay structure cannot distinguish completion, disconnect, forfeit, host quit, rematch, or abort.
5. **Native completion:** serializer/filesystem completion after method 6524 remains outside this upstream ticket.

An authenticated non-live method/byte-PC trace remains the required evidence for items 2 through 4. No live-client capture is required or permitted by the established oracle decision.

## Reproducible validation

Keep the proprietary ABC outside version control. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:replay-save-reachability -- \
  --abc /path/to/hash-pinned/main.abc
```

Useful bounded output:

```bash
bun run provenance:replay-save-reachability -- \
  --abc /path/to/hash-pinned/main.abc \
  | jq '.status, .identity, .dispatch, .writerLifecycle, .dynamicDispatchClosure'
```

Successful output reports:

- status `proven-for-pinned-abc`;
- build `10.09.96325` and ABC digest `9fe9...ba2d`;
- 15,010 decoded bodies and valid branch targets;
- 27 cleanup calls across 24 methods;
- 15 controller-scope and 12 typed-external receiver routes;
- one finalizer call at method 3442 PC 204;
- two writer-slot mutations and three writer-setup sites;
- zero same-name alternate multinames, runtime-name string pushes, `callstatic` cleanup routes, and `callmethod` instructions.

The analyzer emits no ABC bytes, replay bytes, private replay names, player identifiers, or local input path. Operating-system errors can still reveal a caller-supplied path.

## Confidence and residual gaps

### High-confidence conclusions

- Every known in-ABC cleanup QName call resolves to method 3442 for the pinned receiver universe.
- The cleanup Boolean argument is dead and cannot distinguish lifecycle or save behavior.
- Method 3442 calls finalizer 6524 exactly once when its typed writer slot is non-null.
- The only exact-QName and slot-addressed writer mutations are reset method 3329 and setup method 3368; computed-name mutation remains unresolved.
- Combined with the prior state-3 semantic proof, setup routes exist for online and local headers.
- No normalized configuration guard occurs in method 3442 before the finalizer.

### Residual uncertainty

- Which setup route initializes the writer for every requested configuration.
- Which cleanup site executes for every requested lifecycle exit.
- Whether separately loaded code overrides or reflectively invokes either public method.
- Native serialization and final file disposition after finalizer entry.
- Any negative eligibility claim outside the reviewed corpus.

## Ticket and fog impact

This closes the static dispatch portion of [Resolve upstream replay-save reachability and lifecycle semantics](https://github.com/NickTacke/brawlhalla-sim/issues/42): all 27 known calls converge on one cleanup method, and writer non-nullness is the exact upstream save-attempt precondition. It leaves lifecycle-site attribution as explicit T3 fog rather than falsely treating exact-QName calls as unresolved targets.

No new ticket is required from this result. Native completion is already separated into [Close the native replay writer and file-disposition sequence](https://github.com/NickTacke/brawlhalla-sim/issues/43). Runtime lifecycle attribution depends on the already-selected authenticated interpreted-reference oracle and should feed conformance coverage when trustworthy traces exist.

## Sources

- **[ABC]** User-owned official-build `main.abc`, SHA-256 `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d`.
- **[Analyzer]** [`tools/avm2-provenance/replay_save_reachability_provenance.ts`](../../../tools/avm2-provenance/replay_save_reachability_provenance.ts).
- **[Eligibility]** [Replay-writer eligibility at commit `cb0040c`](https://github.com/NickTacke/brawlhalla-sim/blob/cb0040cc14e2e0e824966f559f53017cc05de9fd/artifacts/research/replay-writer-eligibility/replay-writer-eligibility.md).
- **[Format]** [Format-268 semantics at commit `327166d`](https://github.com/NickTacke/brawlhalla-sim/blob/327166d3f9a09f0d9a5c519b58039e36ea4f835f/artifacts/research/replay-format-268/format-268-semantics.md).
- **[Parser]** [Format parser baseline at commit `1492832`](https://github.com/NickTacke/brawlhalla-sim/blob/14928327bbe24e3b3ae202cd25be1c97fa5d5ff0/packages/replay-format/src/parser264.ts).
