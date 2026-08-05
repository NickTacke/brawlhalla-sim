# Match initialization and tick executable closure in Brawlhalla 10.09.96325

Issue: [Prove match initialization and tick executable closure](https://github.com/NickTacke/brawlhalla-sim/issues/32)

## Verdict

**The requested positive closure is not proven, and the ticket's acceptance contract cannot currently be met.** The pinned executable and shipped mode tables establish two useful roots and a finite source vocabulary, but they do not establish a deletion-tested executable graph for every replay-producing mode.

The strongest evidence-backed result is a closed **blocker ledger**, not a closed executable graph:

- method 3217 is the proven authoritative fixed-step tick root;
- method 3507 is a replay-load candidate that reaches restored roster/input construction, but it is not proved to be the only match-initialization root;
- the shipped tables contain 164 non-template mode presets across 24 scoring families and four non-template custom-game profiles;
- the reviewed authentic corpus covers only scoring type ID 1 (`TIMED`), so it cannot enumerate replay-producing families;
- the two candidate roots alone contain 134 executable call/constructor sites that still require receiver-type or override proof;
- three of those sites have no ABC trait target because they call native `Math.floor` or `Math.sqrt` behavior;
- 27 sites have two or more same-QName candidate methods before receiver-type resolution;
- no transitive class/script initializer, callback, reflection, exception, or native dependency traversal has been published;
- no required-member deletion matrix exists because neither the complete producer matrix nor the complete graph exists.

Closing this research ticket as **not planned / acceptance-not-met** records that negative result. It does **not** label initialization/tick closure complete, and it must not be used as a patch-closure or simulator-completeness claim.

## Evidence grades

- **Proven:** exact identity, count, byte-PC, owner, opcode, or control-flow property verified directly against the hash-pinned primary input.
- **Source-derived:** exact count or family name parsed from a hash-pinned shipped configuration entry.
- **Candidate:** a root or target located by prior proven dataflow or exact QName matching, without a complete incoming/outgoing reachability proof.
- **Unknown:** the reviewed primary evidence and analyzer do not close the claim.

Prior reports were locators. The audit below reads the ignored user-owned executable and shipped source entries directly and fails closed on identity or ledger drift.

## Hash-pinned primary evidence

All digests are SHA-256.

| Evidence | Bytes | SHA-256 | Use |
| --- | ---: | --- | --- |
| Official-build `main.abc` | 3,934,088 | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Root sites, method bodies, traits, initializers, semantic hashes, branch validation |
| `Game.swz.17.xml` | 70,233 | `cdc1409bfcb84e30d76419087656c7dfe38c549e9528198adf6ba9be5f80741e` | `GameModeTypes` vocabulary |
| `Game.swz.43.xml` | 23,818 | `fd9efadd2f3c6f7e844ec9c52b1f685fb15d32e936934450e36e441f3e182f7d` | `ScoringTypes` vocabulary |
| `Game.swz.10.xml` | 2,629 | `36eab628f9e28c04c8dfb533d9e940b50dee5c73c9a33f1043e61820e3c4642b` | `CustomGameTypes` vocabulary |
| Authentic format-268 manifest | 23,320 | `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac` | Exact 12-replay cohort used by the existing reviewed-input analyzer |
| ABC decoder | commit `ad9714d`, pinned by `bun.lock` | n/a | Instruction-object decoding and semantic hashes |

The ABC contains one semantic build string, `10.09.96325`. The new analyzer decodes all 15,010 bodies and validates every `s24` and lookup-switch target against method-local instruction boundaries. It observes 15,067 method declarations, 57 declarations without bodies, 815 classes, 1,630 instance/class initializers, and 815 script initializers.

A declaration without a body is not automatically called native. It may also be an interface or other bodyless declaration. Reachability and owner semantics must classify each one before a native dependency claim is made.

## Proven starting points

### Replay load

Existing exact dataflow proves that method 3507 retrieves replay-restored roster entries, passes them into fighter factory method 3071, constructs replay input snapshots, and inserts them through method 6133. That makes method 3507 a justified graph start candidate.

It is not a complete initialization-root proof. Its incoming lifecycle callers, alternate construction paths, config-selected factories, class/script initialization dependencies, and every late-bound target have not been closed.

### Authoritative tick

Prior hash-pinned tick evidence proves that method 3217 `_-u16._-z3z` is the fixed 16 ms authoritative loop. It publishes the new tick boundary before systems, calls the first-step initializer through method 3428, and executes the proven partial phase DAG. Method 3273 is post-frame work and is not a tick.

This identifies the outer tick root. It does not resolve the target of every property call made directly or transitively from that root.

### Narrow replay-input-to-gameplay path

The movement analyzer independently reproduces this exact narrow chain:

```text
replay record method 6509
  -> replay load method 3507
  -> snapshot insertion method 6133
  -> timestamp sampler method 6135
  -> rising-edge input consumer method 6125
  -> fighter jump method 2954
  -> fighter movement method 2887
```

That proof establishes one path through the graph. It is not evidence that all sibling branches, modes, managers, constructors, callbacks, or native calls were traversed.

## Anchor method semantic hashes

These are SHA-256 hashes of `JSON.stringify` over instruction objects emitted by `abc-disassembler` commit `ad9714d`. They are reproducible tool-representation hashes, not a cross-tool canonical executable-rule format.

| Method | Owner | Role | Instruction-object SHA-256 |
| ---: | --- | --- | --- |
| 3507 | class 164 `_-u16._-H4o` | replay load | `4196845e296fc6d868c7ec695f9ba7efb46be2bf9f1cb4d234f698a03459c486` |
| 6510 | class 356 `_-E4h._-N4v` | replay state reader | `0da30450caf3f8d99884760ec0e12a6ce1c818173ac57d976392268d7c3ce531` |
| 3759 | class 187 `_-I37._-N4v` | game-settings reader | `ea7481151746750266ebb66134d195c0f8caa709a46e673ef634094199bf7fba` |
| 3217 | class 164 `_-u16._-z3z` | authoritative tick | `fa38584982aecca898b7dd153da870c49e039b4d4ab952510f97c3720df19308` |
| 3428 | class 164 `_-u16._-q5Q` | first-step initializer | `8b02fe227ddf83d46b95d62f5506426571db7dab8aeab72cc42523f5146410ed` |
| 2894 | class 147 `_-V4R._-84O` | fighter tick | `cbd989707ff3331917144c298f01009c6e750b1a4268709b40fd6b9577386098` |
| 2893 | class 147 `_-V4R._-LV` | fighter post-movement | `907888e83bca190836b0d142d0e45e875fdd5e97c6999a2f79ea3d144f486a30` |
| 1474 | class 85 `_-Wv._-Z29` | deferred-hit arbitration | `d49e4aff0005aee39dd4dce5ff9e5cc5df99056f8a3d13223fe401e006bb0505` |
| 4753 | class 253 `_-61q._-wY` | item pre-phase | `878846818f1b7c38ce916cd8253a4c7d466473ec8a705988937f2ef7e1421dc7` |
| 4755 | class 253 `_-61q._-A3a` | item post-phase | `53f79fe892167472d039199ab480e43b3786d9e2b018856467c05bfdf69f9bf0` |
| 6583 | class 361 `_-v1J._-25J` | respawn/scoring pre-phase | `5627aeb14a165c745d8d551b0c02f6231b1f5d075c8d567fa6c852334d692561` |
| 6933 | class 382 `_-a1B._-j2F` | mode pre-phase | `7dbab35126f2594ef977089e3fcb673cddbc71ec0626ea1d35d0bc2fe8d9b04f` |
| 6935 | class 382 `_-a1B._-g2p` | standard terminal phase | `047885f84269d4193d79a27c28357d82e2007010d446b4f22fc88cd43e1b2229` |
| 3732 | class 184 static `_-F5K._-W2o` | `GameModeType` parser candidate | `7a65fd8724867b91dedea1d334bc67ab62bb0ae844cfed088ddf9f97769e3aa6` |
| 7279 | class 406 static `ScoringType._-yV` | `ScoringType` parser candidate | `4b5c048ca1789855712cce431fb5ec0e41d84a912b67e293e178be13722d3d02` |

These hashes pin known anchors. They are not the requested hash set for a closed graph because no closed graph member set exists.

## Mode-family coverage blocker

The shipped source contains:

- 164 non-template `GameModeType` presets;
- 24 non-template scoring families;
- four non-template `CustomGameType` profiles.

The 24 scoring families are:

```text
BOMBSKETBALL, BOUNTY_V2, BRAWLBALL, BUDDY, CATCHBOMBS,
COLORPLATFORMS, CREWBATTLE, CTF, HORDE, ODDBRAWL, RICOCHET,
RICOCHETTIMED, RING, SNOWBALL, SOCCER, STOCK, STREET_BRAWL,
TABLETOP, TAG, TIMED, TRAINING, VOLLEY_BATTLE, VOLLEYBALL, ZOMBIE
```

Table presence proves source vocabulary, not replay production. The existing reviewed-input analyzer hash-verifies 12 authentic format-268 replays and reports only scoring type ID 1, rule-set ID 2, and disabled-gadget-mask value 0. Prior writer-eligibility research classifies that cohort as completed online playlist-108 timed four-human FFA.

Therefore the evidence has one directly attested scoring family, `TIMED`, versus 24 source-derived families. It has no complete producer matrix for team modes, bots, custom/local games, Relay/Scramble/Shift, training, disconnect, forfeit, abort, or special lifecycle exits. A graph cannot be deletion-tested "for every enumerated mode family" until the producer set and each family's runtime dispatch are classified.

## Root executable-frontier blocker

The analyzer enumerates executable call and constructor sites directly in methods 3507 and 3217. It does not pretend that exact QName coincidence resolves a virtual call. Receiver type, inheritance, override selection, and the operand stack still require proof.

| Root | Inspected executable sites |
| --- | ---: |
| Replay-load candidate, method 3507 | 21 |
| Authoritative tick, method 3217 | 113 |
| **Total** | **134** |

Opcode shape:

| Opcode | Sites |
| --- | ---: |
| `callproperty` | 28 |
| `callpropvoid` | 100 |
| `constructprop` | 6 |

Candidate-cardinality before receiver-type resolution:

| Same-QName ABC candidates | Sites |
| ---: | ---: |
| 0 | 3 |
| 1 | 104 |
| 2 | 11 |
| 3 | 2 |
| 4 | 5 |
| 5 | 2 |
| 8 | 2 |
| 21 | 2 |
| 39 | 1 |
| 54 | 2 |

The three zero-candidate calls are direct tick-root native boundaries. The analyzer requires exact public QNames in namespace index 36 (namespace kind 22, empty URI), one argument, and the exact `getlex Math` receiver before naming them:

- method 3217 PC 1695 `getlex Math` -> PC 1712 `callproperty floor`;
- method 3217 PC 1853 `getlex Math` -> PC 1862 `callproperty floor`;
- method 3217 PC 3550 `getlex Math` -> PC 3556 `callproperty sqrt`.

It pins `Math` name index 16384, `floor` name index 3341, and `sqrt` name index 38545. Zero ABC trait candidates alone are not used to infer native ownership.

Examples of unresolved multi-target sites in the tick root include:

- method 3217 PC 1332 and PC 1586, property `_-aq`, two same-QName candidate methods;
- method 3217 PC 1362 and PC 1613, property `_-N1J`, four candidates;
- method 3217 PC 1644, property `_-H1`, three candidates.

The complete ordered blocker ledger has SHA-256:

```text
25dd3810eac554a9b20e246398a2bd5f6fc0f80bd776323cd6b6ed5c2e53ae00
```

The analyzer fails if that ledger changes. All 134 sites remain conservatively unresolved. Of these, 104 may become unique once receiver types are proven. The 27 multi-candidate sites require override-set resolution, and the three native sites require the pinned AVM2/AIR native contract.

This is only the first frontier. It does not expand those candidate targets transitively, so it cannot make claims about callbacks, reflected names, exception handlers, or native calls reached later in the graph.

## Initializer, exception, callback, reflection, and native disposition

### Initializers

The ABC declares 815 instance initializers, 815 class initializers, and 815 script initializers. The audit identifies their universe but does not prove which initializers run before or during replay load, first-step initialization, entity construction, mode selection, or lazy static access.

### Exceptions

Methods 3507 and 3217 each have zero local exception-table entries. That does not close exception behavior. No transitive graph exists, so exception handlers in reached callees, thrown native errors, and lifecycle fallback paths remain unclassified.

### Callbacks and reflection

No callback-registration or reflected-target traversal has been performed. The absence of a runtime multiname at the two inspected roots would not prove absence in their callees. Callback and reflection acceptance remains false.

### Native calls

The root frontier directly reaches `Math.floor` and `Math.sqrt`, neither of which has an ABC trait body. The complete reachable set among the 57 bodyless declarations and other AIR host APIs is unknown. A host-language substitution cannot be accepted without the versioned AVM2/AIR semantics and differential tests.

## Why deletion testing cannot begin

A valid deletion test needs a declared member set, a complete replay-producing mode matrix, and an oracle that can classify initialization failure or tick-level behavior divergence.

None is complete:

1. the producer matrix is incomplete;
2. receiver types and overrides are unresolved at the first executable frontier;
3. the transitive graph is unpublished;
4. class/script initializers, callbacks, reflection, exceptions, and natives are unclassified;
5. no trustworthy complete interpreted differential trace exists for every family.

Deleting one known anchor can prove that a narrow path breaks. It cannot prove minimality or sufficiency of a graph whose remaining members and test universe are unknown. Reporting deletion tests as passed would therefore be circular.

## Acceptance disposition

| Acceptance requirement | Result | Evidence-backed reason |
| --- | --- | --- |
| Roots for replay load, initialization, and every tick | **Partial** | Method 3217 is the tick root; method 3507 is an initialization candidate, not a complete root set |
| Every replay-producing mode family | **Not met** | 24 source families exist; only `TIMED` has direct corpus production evidence |
| Complete call/property/callback graph | **Not met** | 134 root executable sites still require receiver/override proof; no transitive graph exists |
| Class/script initializers | **Not met** | 2,445 initializer methods are inventoried, not reachability-classified |
| Virtual resolution | **Not met** | 27 root sites already have multiple same-QName candidate methods |
| Exceptions | **Not met** | Candidate roots have no local handlers, but transitive exception paths are unknown |
| Native calls | **Not met** | Root directly reaches `Math.floor` and `Math.sqrt`; reachable native closure is unknown |
| Reflection | **Not met** | No transitive reflected-target proof exists |
| Method semantic hashes | **Partial** | Fifteen anchors are pinned; no closed member set exists to hash |
| Deletion-tested closure | **Not met** | Neither graph membership nor complete mode/oracle matrix exists |

## Reproducible validation

Keep proprietary inputs under ignored storage. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:match-tick-closure -- \
  --abc /path/to/hash-pinned/main.abc \
  --mode-types /path/to/decrypted/Game.swz.17.xml \
  --scoring-types /path/to/decrypted/Game.swz.43.xml \
  --custom-game-types /path/to/decrypted/Game.swz.10.xml
```

Useful bounded output:

```bash
bun run provenance:match-tick-closure -- ... | jq \
  '{status, identity, decode, modeVocabulary,
    rootExecutableFrontier: {
      inspectedSiteCount: .rootExecutableFrontier.inspectedSiteCount,
      unresolvedSiteCount: .rootExecutableFrontier.unresolvedSiteCount,
      blockerLedgerSha256: .rootExecutableFrontier.blockerLedgerSha256
    }, anchorMethodHashes, acceptance}'
```

The narrow starting paths remain independently reproducible:

```bash
bun run --cwd tools/avm2-provenance build-dependency
bun tools/avm2-provenance/movement_provenance.ts \
  --abc /path/to/hash-pinned/main.abc \
  --target grounded-jump-y

bun run provenance:game-settings-word-14 -- \
  --abc /path/to/hash-pinned/main.abc \
  --manifest /path/to/hash-pinned/manifest.json \
  --item-spawn-rules /path/to/decrypted/Game.swz.26.xml
```

Expected closure-audit output reports:

- status `acceptance-not-met`;
- build `10.09.96325` and the four exact source hashes above;
- 15,010 decoded bodies with valid branch targets;
- 164 mode presets, 24 scoring families, and four custom profiles;
- 134 inspected and unresolved root sites;
- blocker-ledger hash `25dd...e00`;
- every acceptance boolean `false`.

The command exits nonzero on source identity drift, build drift, method-body count drift, invalid branches, source-count drift, unknown mode-family references, missing anchors, an unexpectedly empty unresolved frontier, or blocker-ledger drift. A successful command proves the negative evidence contract, not executable closure.

## Resolution and map impact

One-line map gist:

> Exact replay-load and tick anchors are pinned, but mode-production coverage and the first dispatch/native frontier remain open, so a deletion-tested executable closure cannot yet be claimed.

### Existing ticket dependencies

- [Map replay-producing modes to patch closure dependencies](https://github.com/NickTacke/brawlhalla-sim/issues/36) must classify producer families and bind each serialized configuration to runtime roots before a mode-complete graph can be tested.
- [Specify AVM2 and AIR deterministic native semantics](https://github.com/NickTacke/brawlhalla-sim/issues/37) owns the `Math.floor`, `Math.sqrt`, coercion, collection, ByteArray, XML, and other reachable native behavior contract.
- [Prove patch-data loader normalization and defaults](https://github.com/NickTacke/brawlhalla-sim/issues/35) owns exact config parser/default/inheritance behavior needed to select initialized runtime types.
- [Prove patch closure minimality and sufficiency](https://github.com/NickTacke/brawlhalla-sim/issues/39) remains the final member-deletion and sufficiency gate after the graph and mode matrix exist.

### Surfaced ticket suggestion

**Build a conservative AVM2 executable graph and deletion harness.** Start from methods 3507 and 3217, infer stack/receiver types, resolve inheritance and override sets, include constructors and class/script initializers, follow callback registration and invocation, enumerate exception and native edges, and emit a hash-pinned graph whose unresolved frontier fails the command. Add member deletion only after graph membership is closed.

This is a suggestion only. No additional ticket was created or claimed during this resolution.

### Fog suggestions

- Which lifecycle entry points join or bypass method 3507 during replay-backed match construction?
- Which config fields select concrete mode, scoring, world, entity, item, and callback implementations?
- Which of the 57 bodyless method declarations are reachable native/interface boundaries?
- Which visually oriented replay-load calls can be deletion-proved irrelevant to gameplay initialization?
- Which reflected names or function-valued properties become reachable after the first root frontier expands?

## Privacy and licensing

The committed analyzer and report contain hashes, counts, method identifiers, byte PCs, source-family names, and graph-frontier metadata only. They contain no ABC/SWF/SWZ bytes, decrypted XML payload, replay bytes, fixture names, player/account data, bulk extracted tables, or local filesystem paths.

## Related reviewed evidence

- [Authoritative tick phases and timestamp semantics](https://github.com/NickTacke/brawlhalla-sim/blob/54a0d782/artifacts/research/tick-phase-semantics/tick-phase-semantics.md)
- [Patch-snapshot closure](https://github.com/NickTacke/brawlhalla-sim/blob/629a95c/artifacts/research/patch-snapshot-closure/patch-snapshot-closure.md)
- [Replay-producing match universe](https://github.com/NickTacke/brawlhalla-sim/blob/da6b4f0/research/wayfinder/replay-producing-match-universe.md)
- [Replay-writer eligibility](https://github.com/NickTacke/brawlhalla-sim/blob/cb0040c/artifacts/research/replay-writer-eligibility/replay-writer-eligibility.md)
- [State-4 game-settings word 14](../game-settings-word-14/game-settings-word-14.md)
- [Generic roster bitset semantics](../generic-roster-bitset/generic-roster-bitset.md)
