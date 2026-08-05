# Format-268 state-3 match random seed in Brawlhalla 10.09.96325

Issue: [Prove the format-268 header seed field](https://github.com/NickTacke/brawlhalla-sim/issues/20)

## Verdict

**Proven.** The first state-3 `u32` is the **match random seed**. This is no longer an inferred parser label.

The writer serializes the initialized match object's `_-l4` word. The replay reader restores that word to its own `_-l4` slot and passes it unchanged as the explicit seed argument to the same match initializer used by live matches. When that argument is omitted, the initializer obtains a fresh value from a field whose declared type is `Random`. The initializer stores the value as the match's `_-l4`, then seeds exactly two independently constructed `Random` objects with it:

1. class 253 `_-61q._-p38`, the item/weapon/gadget spawning stream;
2. class 382 `_-a1B._-p38`, the global rules/mode stream shared by mode rules and other gameplay systems.

The stored full word also has three direct deterministic consumers outside those two PRNG states: combat power-variant selection, companion/spawn-bot scheduling, and ColorPlatforms selection. Therefore the field is not merely random-looking metadata or a replay identifier. It initializes match randomness and directly controls later deterministic choices.

This is planning evidence only. It adds no simulator implementation.

## Confidence labels

- **Proven**: direct dataflow, exact-trait cross-reference closure, typed target, or deterministic opcode behavior in the hash-pinned ABC.
- **Observed**: authentic replay-corpus property that supports but does not establish the semantic name.
- **Residual**: a boundary not needed for this ticket's naming and initialization decision.

## Primary source identity

All static claims refer to this user-owned, ignored source:

| Property | Value |
| --- | --- |
| Build | `10.09.96325` |
| ABC SHA-256 | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` |
| Bytes | `3,934,088` |
| Decoded method bodies | `15,010` |
| Branch validation | every `s24` and lookup-switch target is an instruction boundary or permitted `code_length` target |

PC ranges below are method-local byte offsets with an exclusive end. The committed verifier resolves constant-pool strings with the required `strings[index - 1]`, hash-gates the source, validates all branches, and emits no bytecode or local path.

Primary method map:

| Role | Class and method | Load-bearing PC ranges |
| --- | --- | ---: |
| Format-268 reader | class 356 `_-E4h._-N4v`, method 6510 | `661-665`, `728-738` |
| State-3 writer | class 357 `_-16._-63H`, method 6518 | `41-58` |
| Writer construction/header call | class 164 `_-u16._-fN`, method 3368 | `26-53` |
| Replay parse and handoff | class 164 `_-u16._-144`, method 3272 | `16-25`, `43-72` |
| Replay match load | class 164 `_-u16._-H4o`, method 3507 | `249-262`, `282-669` |
| Match initializer | class 164 `_-u16._-T3Q`, method 3229 | `46-164` |
| PRNG seed/output | class 96 `Random`, methods 1797/1799 | complete methods |
| Item-stream initialization | class 253 `_-61q._-h2u`, method 4780 | `2-47` |
| Rules construction | class 382 `_-a1B._-Ga`, method 6937 | complete method |

The prior format research at commit `327166d` established the state grammar but correctly graded the first word as inferred. The evidence below closes that exact gap from the primary source.

## Writer-to-reader identity

### Writer

Method 6518 receives `(uint, uint, Boolean)`. It writes state 3 through `_-PY(4, 3)` at PCs `31-45`. It then takes parameter 1 and calls the 32-bit writer `_-S2c` at PCs `45-58`. Parameter 2 is the playlist ID written next at PCs `58-71`; the optional display string and online bit follow.

Method 3368 constructs the replay writer at PCs `26-40`, then forwards its own three arguments unchanged to method 6518 at PCs `40-53`.

The two replay-recording setup paths prove the first argument's source:

- method 3282 initializes a match with an explicit network-supplied seed at PCs `317-327`, then reads match `_-l4` and calls method 3368 at PCs `346-366`;
- method 3514 initializes a local match with the optional seed omitted at PCs `119-128`, then reads the resulting match `_-l4` and calls method 3368 at PCs `164-184`.

Thus state-3 word 1 is the initialized match's `_-l4`, not a writer-local value.

### Reader and replay handoff

Reader method 6510's state-3 branch begins at PC `660`. It reads a `u32` through `_-8v` at PCs `661-665`, keeps it in local 10, reads the second word and remaining header fields, and assigns local 10 to reader `_-l4` at PCs `728-738`.

After the entire replay parses successfully, method 3272 reads `reader._-l4` at PCs `63-67` and calls replay loader method 3507 with `(reader, reader._-l4)` at PCs `57-72`. Method 3507 passes `reader._-fq` (the restored level) and its seed parameter to match initializer method 3229 at PCs `249-262`. No conversion, mask, arithmetic, or alternate source intervenes.

This proves exact roundtrip identity:

```text
match._-l4
  -> method 3368 argument 1
  -> method 6518 state-3 first u32
  -> method 6510 local 10
  -> reader._-l4
  -> method 3272 argument 2
  -> method 3507 argument 2
  -> method 3229 explicit seed argument
  -> restored match._-l4
```

## Why the semantic name is definitive

Method 3229 takes `(LevelType, Object)` and gives the second parameter an AVM2 optional default of `null`. Its two branches converge before the same store:

- if the argument is `null`, PCs `54-79` call `_-H2L()` on static field `_-f0._-01W`, whose declared type is class 96 `Random`, then reduce the result modulo `2,147,483,647`;
- if the argument is present, it is used unchanged;
- PCs `80-89` assign the selected value to match `_-l4`.

Calling a typed `Random` source only when no explicit value is supplied proves this argument is a generated seed value rather than an arbitrary header token. The following instructions establish its purpose:

1. PCs `89-110`: pass `match._-l4` to class 253 `_-61q._-h2u`;
2. PCs `110-131`: obtain class 382 `_-a1B._-p38`, whose declared type is `Random`, and call `Random._-66b(match._-l4)`;
3. PCs `131-142`: invoke `_-a1B._-Ga`, which constructs the scoring-type-specific rules object;
4. PCs `151-164`: initialize the level only after both random streams and rules are initialized.

Method 4780 proves the first target is also a real PRNG seed target. Class 253's `_-p38` field is declared `Random`; PCs `2-13` call `Random._-66b(seed)`, and PCs `13-47` immediately take the first two `Random._-H2L()` outputs into item-manager state fields `_-V2e` and `_-06p`.

Class 253 is the item manager, not a generic utility holder. It has the readable method trait `SpawnImportantItem2`; its methods are the item pre/post phases identified by the authoritative tick research. Its seeded stream is used in class-253 methods 4751, 4754, 4762, 4766, 4780, and 4783 for item-state draws or random selection. Methods 4747 and 4774 serialize and restore that same stream.

Class 382 is the rules/mode manager. Method 6937 selects and constructs rule classes for readable `ScoringType` values including `BOMBSKETBALL`, `BRAWLBALL`, `COLORPLATFORMS`, `CTF`, `HORDE`, `SOCCER`, `VOLLEYBALL`, and `ZOMBIE`. Its `_-p38` field is a separately constructed `Random` object. Proven downstream paths read `match._-d3F._-p38` in item-type choice, respawn, triggers, and multiple mode-rule classes. Serialization methods 6931 and 6939 save and restore this same PRNG state.

The seed therefore initializes two independent PRNG states, not one shared object and not one PRNG per fighter. Both begin from the same seed. The item stream consumes two outputs immediately; the rules stream's later draw order diverges according to mode and gameplay paths.

## PRNG determinism effect

Class 96 is readably named `Random`. Method 1797 resets its cursor, stores `seed & 0xff` in state word 0, and expands a 16-word `uint` state with multiplier `1,812,433,253`, shifts, XOR, `multiply_i`, `add_i`, and an `& 0xff` store. Method 1799 performs a fixed sequence of indexed state reads, shifts, XORs, masks, cursor update, state writes, and returns one `uint`.

Under normative AVM2 `uint`, bitwise, shift, and `_i` arithmetic semantics, equal seeds always produce equal state and output sequences. The verifier's controlled mirror gives:

| Seed | First four `Random._-H2L()` outputs |
| ---: | --- |
| `0` | `3664512821, 3578536085, 3671592843, 2940218815` |
| `1` | `541330531, 3767533875, 2226135129, 3006268673` |
| `255` | `2607024047, 3190304111, 254552081, 3792179193` |
| `256` | same as seed `0` |
| `4294967295` | same as seed `255` |

The collisions are expected: this PRNG's seed method consumes only the low eight bits. They do not make the replay field narrower. Direct consumers use other portions of the full `u32`, including `seed >>> 16` and `seed & 0xffff`, and the writer/reader preserve all 32 bits.

The effect is gameplay-observable in primary code:

- item stream: method 4780's first two draws initialize item-manager state before level/entity initialization; later class-253 draws select item behavior and spawn state;
- rules stream: mode, respawn, trigger, and rule methods draw from `match._-d3F._-p38` for indices, positions, delays, and choices;
- combat selection: method 1535 PCs `249-310` combines fighter ID, tick-derived input, hero data, `seed >>> 16`, and a power index; PCs `322-455` use the result to choose a `PowerType` variant;
- ColorPlatforms: method 6869 PCs `62-105` combines entity ID, `floor(time / 16)`, and `seed & 0xffff`; PCs `217-235` use the reduced value to select a platform/rule entry. Method 6937 PCs `204-235` proves class 378 `_-H4f` is the `COLORPLATFORMS` rules class;
- companion/spawn-bot scheduling: method 1692 PCs `387-431` combines the seed with companion ordering and spawn-bot-derived timing to set the next schedule value.

Consequently, replay playback must restore the field before these systems initialize. Holding replay inputs constant while changing a seed bit that survives the relevant reduction can change PRNG outputs, power variants, item behavior, mode choices, or ColorPlatforms selection. Holding the seed and all other match inputs constant gives the same choices and PRNG sequences.

## Initialization order

The replay path has this proven order:

```text
parse all replay sections
  method 6510 returns successfully
reset replay/match shell
  method 3507 PCs 50-249
initialize match seed and level argument
  method 3507 PCs 249-262 -> method 3229
    assign match._-l4
    seed item Random
    consume item Random outputs 1 and 2
    seed rules/mode Random
    construct scoring-type rules
    initialize level
create replay entities
  method 3507 loop begins at PC 282; first fighter construction at PCs 338-380
load serialized input timelines
  method 3507 PCs 488-662; snapshot construction at PCs 627-649
finalize replay mode
  method 3507 PCs 669-739
```

The seed is therefore restored before rule construction, level initialization, fighters, and input timelines. This order is part of replay determinism. Seeding after any of those consumers would not match the reference.

## Exact restored-trait consumer closure

The restored field is exact QName multiname 18,206, `_-l4`. It is declared as a `uint` slot on class 356 (reader) and class 164 (match). A full scan of all 15,010 decoded bodies finds exactly 16 opcode references. Paired `findproperty` instructions are access setup, not separate semantic consumers.

| Method and PCs | Receiver/use | Disposition |
| --- | --- | --- |
| 6510 `728-738` | reader slot write | state-3 restore |
| 3272 `63-67` | reader slot read | transports value to replay loader |
| 3229 `80-89` | match slot write | canonical match-seed assignment |
| 3229 `97-105` | match slot read | seeds item stream through method 4780 |
| 3229 `119-127` | match slot read | seeds rules/mode `Random` directly |
| 3282 `350-358` | match slot read | records explicit-seed online match header |
| 3514 `168-176` | match slot read | records generated-seed local match header |
| 1535 `296-300` | match slot read | combat `PowerType` variant derivation |
| 1692 `402-406` | match slot read | companion/spawn-bot schedule derivation |
| 6869 `88-92` | match slot read | ColorPlatforms entry derivation |

No other static read, write, call, or lexical reference to this exact trait exists in the pinned ABC. This disposes every direct consumer of the restored header trait. It does not claim that no later code consumes values produced by the two seeded `Random` objects; those downstream draws are intentionally summarized by subsystem above.

## Authentic corpus observation

**Observed, not needed for naming.** The 12 hash-attested build-10.09.96325 replays in the ignored corpus all have format 268, state 3 immediately after the format word, and 12 distinct first-header values. Values range across both halves of the `u32`; examples include `226788684`, `1721588950`, `3840171068`, and `4294967295` is representable by the grammar even though it is not present in this cohort. The second word is playlist ID 108 in every fixture.

The corpus confirms that authentic files populate the word per match and preserve it as unsigned data. Static writer/reader/initializer evidence, not uniqueness, proves the semantic name.

## Reproducible validation

Keep the hash-identified ABC and replay bytes under an ignored path. From the checkout root:

```bash
ABC=artifacts/main.abc
shasum -a 256 "$ABC"
wc -c "$ABC"
bun run provenance:header-seed -- --abc "$ABC"
bun run typecheck
bun run check
```

Expected provenance result:

```text
status: header-seed-proven
build: 10.09.96325
abcSha256: 9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d
decodedBodies: 15010
branchTargets: valid
seedTrait.exactReferenceCount: 16
seedTargets: class 253 item spawning Random; class 382 rules and modes Random
```

The report also emits the exact method/PC ledger and controlled RNG vectors. It excludes bytecode, strings unrelated to the bounded proof, local paths, replay payload, player data, and generated dumps.

Normative runtime semantics used for the controlled calculation:

- [Adobe AVM2 Overview](https://jmendeth.com/snapshot/aa45ee3f904d62505f09ef2969d1885e8844859f/media/2014-05-17-reverse-engineering-flash/avm2overview.pdf): opcode stack behavior and typed `uint` boundaries.
- [ECMA-262 Edition 3, sections 9.5 and 9.6](https://www.ecma-international.org/wp-content/uploads/ECMA-262_3rd_edition_december_1999.pdf): `ToInt32` and `ToUint32` wrapping.
- [Adobe Tamarin interpreter source](https://github.com/adobe/avmplus/blob/c414dd9af4a352d522fff200ee6601d713bc17c7/core/Interpreter.cpp): primary implementation semantics for `_i`, bitwise, and shift operations.

## Confidence and residual gaps

**Confidence: high/proven for the field name, seed targets, initialization order, exact direct-consumer closure, and deterministic effects described above.** The format model may safely call state-3 word 1 `matchRandomSeed` or `randomSeed`. `matchRandomSeed` is preferable because the word does not seed every random-looking client operation.

Residual boundaries:

1. This ticket does not recover the complete cross-subsystem PRNG draw ledger. Mode-specific interleaving and every draw's semantic label remain owned by [Recover deterministic randomness and draw ordering](https://github.com/NickTacke/brawlhalla-sim/issues/6).
2. The two PRNG targets are proven. Several downstream methods remain obfuscated, so narrower labels for every item/rule draw are not supplied here.
3. No controlled replay was executed in the proprietary reference player. Static dataflow reaches gameplay selections directly, so such an experiment is not required to establish the field name or determinism effect. It would still be useful later for a golden draw-order oracle.
4. Exact-trait closure covers all decoded ABC property references. Native code or reflective access not represented by a reference to this QName is outside that static claim; no evidence for such an alternate consumer was found.

These gaps do not justify narrowing the structural name. The field is definitively the match random seed.
