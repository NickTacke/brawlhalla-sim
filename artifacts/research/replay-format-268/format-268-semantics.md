# Format-268 replay semantics in Brawlhalla 10.09.96325

## Answer and status

This investigation establishes the stream grammar, writer/reader pairing, authentic section order, conditional repeated-result behavior, replay clock, GameDuration reporting arithmetic, sparse-input playback, 13 of 14 input bits, ordinary playback cutoff, and envelope. It also disproves several current parser hypotheses.

This is **interim evidence and does not resolve the ticket**. Exact bot-production behavior, the independent meaning and producer of input bit 32, two handicap percentages, the packed weapon word's bit 15, the generic bitset's gameplay domain, several roster fields, special-mode timing, and state-7 production semantics remain unknown. The authentic build-10.09.96325 cohort has no affirmative bot case or state-7 section, so those behaviors are not invented here.

Evidence grades used below:

- **Proven**: direct writer/reader dataflow in the hash-pinned ABC, an authentic raw replay observation, or both.
- **Inferred**: a unique or strong interpretation whose final naming link is absent.
- **Unknown**: the inspected primary evidence does not settle the claim.

## Evidence identity and method map

The target ABC provenance identifier is SHA-256 `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d`. Its sole build string is `10.09.96325`. `bun run provenance:movement` decoded 15,010 method bodies with all branch targets valid. The cohort provenance identifiers are the 12 full replay hashes pinned in `tools/avm2-provenance/replay_format_268_analysis.ts`; those identifiers remain available in a remote checkout even though the source bytes do not.

Primary method map:

| Role | ABC class and method | Instruction range |
| --- | --- | ---: |
| Bit stream primitives | class 31 `_-Wr`, methods 604-623 | complete methods |
| Replay reader | class 356 `_-E4h`, method 6510 `_-N4v` | 0-808 |
| State constants 1-8 | script method 6515 | 9-40 |
| Replay writer | class 357 `_-16` | methods 6516, 6518-6524 |
| XOR transform | class 357 static method 6526 | 0-46 |
| XOR key initialization | method 14909 | 21692-21763 |
| Game settings writer/reader | class 187 `_-I37`, methods 3748/3759 | 0-63 / 0-88 |
| Result lifecycle write | class 164 `_-u16`, method 3217 | 1391-1400 |
| Input insert/sample/consume | class 330 `_-Tx`, methods 6133/6135/6125 | 0-56 / 118-226 / 150-1998 |
| Replay-to-timeline load | class 164 `_-u16`, method 3507 | 247-262 |
| Playback endpoint | class 561 `_-x5t`, method 10459 `EndTime` | 0-8 |

The existing parser and its names were used only to locate hypotheses. Claims below come from the pinned ABC and raw corpus.

### Reproduce the corpus calculations

Obtain the hash-identified ABC and replays from a user-owned local installation or archive. Keep the ABC, replay bytes, and a schema-1 manifest outside version control or under an ignored path. The manifest must name each replay file beside its full SHA-256 and identify the pinned ABC hash. From the checkout root, run:

```bash
bun run provenance:replay-268 -- \
  --abc artifacts/main.abc \
  --manifest artifacts/replay-corpus/10.09.96325/manifest.json
```

Paths are examples and may point to any local ignored location. The command rejects an ABC or replay cohort whose hashes differ from the committed provenance identifiers. Its JSON output contains only hashes and derived values: decoded section spans, canonical result-section bitstring hashes, input-bit counts, END padding, and input-tail calculations. It emits no replay payload, player name, local path, or other personal field. On the reviewed cohort it reports 49,874 snapshots, 6,288 bit-32 occurrences with zero occurrences lacking bit 1, 22 total zero-padding bits, and a 592-3,168 ms input-tail range.

## Exact envelope and primitive grammar

**Proven.** The writer first emits the format word (`_-16` constructor method 6516:6-10). All fixed-width values are inserted into a most-significant-bit-first bit stream by `_-Wr._-PY` (method 611). `_-S2c` writes an AIR `ByteArray.writeInt` word and `_-B2n` writes `writeShort` before copying those bytes into the bit stream (methods 606 and 605). The reference reader returns these as `uint` (`_-8v`, method 615; `_-e1q`, method 614). Therefore replay timestamps, IDs, counts, teams, and checksum words are **unsigned bit patterns**, not signed `i32` fields. Placement is physically 16 bits.

For encoded strings up to 65,535 bytes, the effective grammar is `u16 UTF-8-byte-length` followed by that many bytes. For longer strings, method 604 caps only the encoded `u16` prefix at 65,535, while method 609 copies the full encoded `ByteArray` into the bit stream without truncation (604:2-25; complete method 609). Oversized strings therefore create a prefix/payload mismatch, not a capped payload. Reader method 613 consumes only the prefixed byte count, leaving the excess bytes to desynchronize subsequent fields.

At finalization, method 6524 writes state 2, applies a repeating 64-byte XOR (6524:280-286, 418-429; method 6526), calls AIR `ByteArray.compress()` (6524:430-440), then writes the compressed bytes (498-512). The exact key is initialized in method 14909:21692-21763 and equals the repository key. AIR's default `ByteArray.compress()` framing is zlib; [RFC 1950](https://www.rfc-editor.org/rfc/rfc1950) specifies that wrapper.

## State machine and section boundaries

**Proven.** Every section begins with a 4-bit state. The writer and reader agree:

| State | Writer | Payload | Reader behavior |
| ---: | --- | --- | --- |
| 1 | 6521:240-376 | per-entity input timelines | stores timelines by entity ID |
| 2 | 6524:280-286 | no payload, END | stops reading |
| 3 | 6518:11-59 | replay header | overwrites header fields |
| 4 | 6519:25-506 | settings, level, roster, checksum | populates settings/roster |
| 5 | 6522:222-299 | selected KO/event faces | appends into state-5 arrays |
| 6 | 6520:232-339 | result snapshot | overwrites time/fanfare; conditionally replaces placements |
| 7 | 6523:239-297 | victory/final face map | appends into state-7 arrays |
| 8 | no production writer found | invalid marker | marks read invalid |

Reader method 6510 dispatches through its `lookupswitch` at instruction 135: state 1 starts at 147, 2 at 268, 3 at 272, 4 at 317, 6 at 589, states 5/7 share the event reader at 647, and 8 takes the invalid branch at 744.

All 12 authentic files have exactly this order:

```text
format, state 3, state 4, state 6 repeated 1-3 times,
state 1, state 5, state 2, zero padding to the final byte
```

No fixture contains state 7. This order is observed, not a reader requirement. The reader loops until state 2 and accepts repeated sections. It does not preserve an ordered section ledger.

Representative raw boundaries for SHA-256 `31457427af337318846d2cc3890449160b10a9bf74cac8d512c626364f69dd0e` are: header `[32,397)`, game data `[397,5200)`, results `[5200,5358)` and `[5358,5516)`, inputs `[5516,186315)`, state 5 `[186315,187156)`, and END `[187156,187160)`. These are decoded-body bit offsets after inflate and XOR.

## Header and game settings

### Header

**Proven unless marked otherwise.** State 3 is:

```text
u32 random seed
u32 playlist ID
if playlist ID != 0: string playlist display/localization key
bit online
```

Writer method 6518 takes `(uint,uint,Boolean)` and emits precisely that sequence. The second word indexes `_-w5F._-Hr` before the string is written (31-48), proving playlist identity. The boolean distinguishes online/custom-online from offline UI paths (reader field consumed in method 12438:40-59). The first word is passed unchanged through match initialization; its random-seed name is **inferred**, consistent with the unique per-match values and all seed consumers, but no readable `RandomSeed` string was recovered.

### State 4 fixed settings

**Proven.** Methods 3748 and 3759 pair 15 `u32` words in this exact order. Method 3746 supplies readable labels for all except word 14:

1. flags (`Flags`)
2. maximum players (`mMaxPlayers`)
3. duration seconds (`Duration`)
4. round duration seconds (`RoundDuration`)
5. starting lives (`StartingLives`)
6. scoring type ID (`ScoringType._-73C`)
7. score-to-win (`ScoreToWin`)
8. game speed (`GameSpeed`)
9. damage ratio (`DamageRatio`)
10. level-set ID (`LevelSetID`)
11. item-spawn rule-set ID (`ItemSpawnRuleSetID`)
12. weapon-spawn-rate ID (`WeaponSpawnRateID`)
13. gadget-spawn-rate ID (`GadgetSpawnRateID`)
14. `_-Ii`, **unknown**; `customGadgetSelection` remains a parser hypothesis
15. variation (`Variation`)

Next are `u32 level ID`, `u16 loadouts-per-entity`, a bit-terminated entity list, and `u32 roster checksum`. The level word indexes `LevelType._-k56` (6519:62-76). The `u16` controls each entity's hero/loadout loop (406-450), so `heroCount` is a safe structural name. The last word is recomputed by static method 6527 and reduced modulo 173; reader 6510:787-803 rejects a mismatch. It is a roster/level integrity checksum, not random game data.

## Roster record and discarded values

State 4 repeats the following entity record behind a `1` presence bit and ends the list with `0`. Grades are per row.

| Bits | Meaning | Grade and proof |
| ---: | --- | --- |
| 32 | entity ID | proven; source `_-V4R._-35a`, used for entity-map lookup |
| 32 | Brawlhalla ID | proven for format 268; telemetry method 3835:77-81 labels word `_-S6l` as `BrawlhallaID` |
| string | player name | proven; telemetry method 3835:62-75 labels source `_-q2w` as `PlayerName` |
| 32 | color-scheme ID | proven; source type `_B2E`, XML parser labels `_X49` `ColorSchemeID` |
| 32 | spawn-bot cosmetic ID | proven; source type `_9y`, parser labels `_y1y` `SpawnBotID` |
| 32 | companion ID | proven; source is `Companion._-C4B._-91D` |
| 32 | trail-effect ID | proven; source `_L1D._-s2e`; method 12854:49-56 labels it `TrailEffectID` |
| 32 | emitter-group ID | proven; source `_-9._-I58`; method 2706:51-58 labels it `EmitterGroupID` |
| 32 | player-theme ID | proven; method 6172:95-102 labels `_e4m._-2h` `PlayerThemeID` |
| 8 x 32 | equipped taunt IDs | proven; source array entries are `TauntType._-G5t`, which its XML parser labels `TauntID` |
| 16, 16 | two selected taunt IDs | inferred as win/lose slots; exact first/second labels not recovered |
| repeated `(1,u32)`, then `0` | generic bitset words | proven structurally; `_-C5F._-Q5R` writes its `_Z3L` uint-word array (method 578), reader 585 restores it; gameplay domain unknown |
| 16 | avatar ID | proven; source `_-S5N._-C3U`, labeled `AvatarID` by method 201 |
| 32 | team number | proven; source `_HL`; readable consumers label it `Team`/`TeamNum` |
| 32 | `_-o1O` | unknown; `connectionTime` is an unsupported parser name |

The current parser has **emitter and trail effect reversed**. The writer order is trail first (6519:339-343), emitter second (344-348).

Each loadout is four words:

1. low 16 bits of the encoded hero value: Hero ID (proven by `HeroType._-d2C` and hero registry use),
2. costume ID (proven; `_66d` is labeled `CostumeID`),
3. rune/stance index (proven; `_m3K` is labeled `RuneIndex`),
4. packed weapon-skin word.

The packed word is proven to contain low-15 and high-15 weapon-skin IDs: consumers mask `0x7fff` and `0x7fff0000 >>> 16` (method 3845:237-279 and 2790:2335-2356). Bit 31 selects which packed skin is treated as primary in method 3845:237-294. Bit 15's meaning is **unknown**; `morphWeapon2` is only a parser hypothesis. Thus the parser's discarded leading boolean is not disposable: it is a consumed selector.

After loadouts:

- one bit is a composite non-human/synthetic entity classification (`_-V4R._-56G` masked against five entity-type flags), **inferred** to include bots but not proven equivalent to `isBot`;
- one bit indicates a present handicap block;
- if present, three `u32` values follow. The first overrides lives (method 4019:17-33). The latter two are percentage-like values whose defaults are 100 (4019:36-68); their exact dealt/taken ordering is **unknown**.

The available corpus has four entities, one loadout each, and a zero composite-classification bit for every entity. Because that bit is not proven equivalent to `isBot`, the cohort supplies no affirmative bot case and cannot validate the unknown branches.

## Results and repetition

**Proven.** State 6 is:

```text
u32 result time
bit has placements
if set: repeated (bit 1, 5-bit entity ID, 16-bit placement), then bit 0
u32 fanfare ID
```

The 16-bit values are **finish placements**, not scores. The source field `_-V4R._-i1Y` is tested as `== 1` on winner paths (method 5540:191-203); every authentic four-player vector is a permutation of 1-4. The last word is `FanfareID`, proven by method 5539:82-99.

Repetition has field-specific semantics. Match lifecycle method 3217:1391-1400 can call result writer 6520, and finalizer 6524:271-273 calls it again. Each occurrence is a fresh snapshot. Reader 6510:589-640 unconditionally assigns result time and fanfare ID, so those fields are last-write-wins. It allocates and assigns a replacement placement map only inside the `has placements` branch. A later result with placements replaces the prior map; a later result without placements retains the prior map. The reader neither appends nor deduplicates occurrences. The current parser's array is preservation behavior, not reference-reader semantics.

All repeated state-6 bitstrings in each authentic fixture are exactly identical. For the two-result fixture above, each segment is 158 bits and the SHA-256 of its canonical ASCII bitstring is `e5815c47fbdb28570daec6d4fcdc84b0bc7db31cb29468abb6694b0a67f15358`. Six files contain one result, three contain two, and three contain three.

## Input masks, clock, sparsity, bots, and tail

### Input section

**Proven.** State 1 is a bit-terminated entity list. Each entry is `5-bit entity ID`, `u32 snapshot count`, then exactly that many `(u32 timestamp, bit mask-present, optional 14-bit mask)` records. Zero is represented only by a zero presence bit. Writer 6521:283-376 and reader 6510:147-267 pair exactly.

The writer serializes every snapshot in `_-Tx._-W5y`; it does not compare adjacent masks (6521:283-368). Network insertion method 6128 inserts a new timestamp even when its mask equals the prior mask. Therefore “only changes are serialized” is false.

### Observed 14-bit masks

**Proven for the named actions below; bit 32 remains unknown.** Method 14909 initializes the command bits and readable maps; controller-map parser method 1993 supplies action names.

| Value | Meaning |
| ---: | --- |
| 1 | UP (14909:7011-7015) |
| 2 | DOWN (7016-7021) |
| 4 | LEFT (7022-7027) |
| 8 | RIGHT (7028-7033) |
| 16 | JUMP (1993:190-211; rising-edge call to fighter jump in 6125; existing provenance resolves method 2954) |
| 32 | unknown; playback HUD tests the union `(1 | 32)` for its UP display (13649:267-285) |
| 64 | HEAVY (1993:168-189) |
| 128 | LIGHT / quick pickup (1993:222-243; method 8099:166-180 labels the context-sensitive action `Command_Name_QuickPickup`) |
| 256 | DODGE (1993:146-167) |
| 512 | THROW (1993:442-461) |
| 1024 | Taunt 0; participates in taunts 1 and 7 |
| 2048 | Taunt 2; participates in taunts 1 and 3 |
| 4096 | Taunt 4; participates in taunts 3 and 5 |
| 8192 | Taunt 6; participates in taunts 5 and 7 |

Taunt chords are: 0=`1024`, 1=`1024|2048`, 2=`2048`, 3=`2048|4096`, 4=`4096`, 5=`4096|8192`, 6=`8192`, 7=`1024|8192` (method 1993:254-439). In this 12-replay cohort, bit 32 occurs 6,288 times in 49,874 snapshots and always co-occurs with bit 1. Together with the proven HUD union behavior above, that is the full supported claim. An independent producer and gameplay meaning for bit 32 remain unknown.

### Timestamp origin and 6,016 ms GameDuration arithmetic

**Proven for timestamp serialization and reporting arithmetic; not proven as an exact gameplay-state transition.** Internal simulation time advances in 16 ms steps (method 3217:830-859). The first simulation step sets match marker `_-q3e` one 16 ms tick after the preceding clock value through method 3428:62-64. Replay writers for results, inputs, and both event sections subtract `_-q3e - 16` unless special-mode guards select zero (6520:214-231; 6521:227-239; 6522:209-221; 6523:226-238). Thus ordinary serialized timestamp zero is the simulation tick immediately preceding the marker.

The reporting calculation is explicitly `end - _-q3e - 6000` (GameStats method 3805:204-217; telemetry method 3833:59-72 labels it `GameDuration`). Relative to replay origin `_-q3e - 16`, that arithmetic differs by `6000 + 16 = 6016` ms and explains the cohort relation `186016 = 180000 + 6016`. The inspected evidence does not identify the exact gameplay-state transition at serialized time 6,016 ms, so this offset must not be described as a proven gameplay start or intro boundary. Special-mode guards can select origin zero; applicability beyond this cohort remains unknown.

### Sparse-input rule

**Proven.** Sampler method 6135 returns an exact timestamp's mask, otherwise the last snapshot with timestamp less than the query (118-226). Before the first record it returns a default snapshot. Missing timestamps therefore mean **hold last**, not neutral and not “input change event.” Fighter consumer method 6125 samples 16 ms slots and computes rising edges from adjacent masks (481-500).

### Bot timeline

**Partially proven, ultimately unknown.** Writer 6521 iterates every match entity, checks only for a non-null `_-Tx` timeline, and emits its `_-W5y` records; there is no bot exclusion (257-371). Reader 3507 loads serialized records into the matching entity timeline through the same insertion method (247-262). This proves a common representational path.

It does **not** prove whether build 10.09.96325 creates a non-null timeline for each bot, whether bot AI regenerates commands during replay, or which records are emitted. The 12 authentic fixtures contain no entity with the composite-classification bit set and therefore provide no affirmative bot case. Remaining evidence required: a user-owned format-268 replay captured from this exact build with at least one bot, hash attestation, raw state-1 entity IDs correlated to the roster's classification bit, and playback observation with AI execution disabled or instrumented. Alternatively, a complete static dataflow from bot decision output into `_-Tx._-W5y` and its replay-mode guard would settle it.

### Replay tail and END

**Proven.** Finalizer writes, in order, a final result, inputs, state 5 events, state 7 if available, then END (6524:271-286). It immediately XORs and compresses the bitstream. There is no semantic post-END section or trailing byte payload, only zero padding in the partially used final byte.

Stored input can outlive result time because timelines are dumped after the result snapshot. In the cohort, maximum input minus result ranges from 592 to 3,168 ms. Normal replay UI endpoint is exactly `result time + 2500` (method 10459 `EndTime`:2-8; method 3191:665-672). Two fixtures store snapshots beyond that cutoff: SHA-256 `010f78c85af90f1fbfef00e9b09583c3f5a04d63526f4e368f9de6e1e50f74ba` by 188 ms and `bcc173cb790fbd28adef778901994d27d0d7a366ac92d8bdfe76d8122498b165` by 668 ms. Those records are present but not reached by ordinary playback. The tail is not the result duration and not the END boundary.

## Corrections now specifiable

These are evidence-backed decision tickets, not implementation changes:

1. **Correct field signedness and naming.** Specify fixed IDs/timestamps/counts as unsigned bit patterns; rename result `scores` to placements; rename `playerId` to `brawlhallaId`; swap emitter/trail fields.
2. **Preserve unknown roster data.** Expose the generic bitset words, packed weapon selector/unknown bit, `_-o1O`, composite entity classification, and all three handicap words without semantic invention.
3. **Make repeated-section policy explicit.** Decide whether the public model mirrors reference field-specific overwrite behavior or preserves ordered occurrences plus bit spans. Preservation is safer for research.
4. **Specify replay timing conservatively.** Preserve serialized time, expose the proven `GameDuration` reporting relation and reference playback cutoff separately, and do not label 6,016 ms as a gameplay-state transition without new evidence.
5. **Specify command 32 conservatively.** Represent it as unknown and model the proven HUD `(1 | 32)` union separately until its producer and gameplay meaning are traced.
6. **Acquire bot evidence.** Add a privacy-safe, hash-attested bot replay investigation or finish the static bot-decision-to-timeline trace before promising bot replay semantics.

## Residual gap tickets

Each gap below is scoped so it can be copied into a follow-up evidence ticket.

### Input bit 32 producer and meaning

- **Question:** Which producer sets mask value 32, and does it have any gameplay meaning independent of bit 1?
- **Start:** Method 14909 command-bit initialization, controller parser 1993, HUD method 13649:267-285, fighter consumer 6125, and the cohort result `bit32WithBit1=6288`, `bit32WithoutBit1=0`.
- **Required evidence:** A complete producer-to-timeline static dataflow, or instrumented build-10.09.96325 captures that independently vary bits 1 and 32 and trace gameplay consumers.
- **Acceptance:** Identify the producer and all independent consumers, or prove that no independent production/consumption path exists within the pinned ABC.

### Random-seed field name

- **Question:** Is the first state-3 word definitively the match random seed, and which random subsystem consumes it?
- **Start:** Writer 6518, reader 6510 state-3 branch, match initialization, and all consumers of the restored first header word.
- **Required evidence:** Trace the word into a uniquely identified PRNG seed write or recover a readable telemetry/configuration label, then correlate controlled values with deterministic PRNG output.
- **Acceptance:** Prove the seed target, initialization order, and replay determinism effect, or replace `random seed` with a narrower structural name.

### Unknown game-settings word 14

- **Question:** What does state-4 game-settings word 14 (`_-Ii`) represent?
- **Start:** Paired settings methods 3748/3759, label method 3746, replay writer/reader 6519/6510, and all references to `_-Ii`; `customGadgetSelection` is only a parser hypothesis.
- **Required evidence:** Resolve the field to a readable settings/UI/configuration label and trace a non-default value through serialization into a runtime consumer.
- **Acceptance:** Establish the semantic name, allowed values, default behavior, and at least one consuming control-flow branch.

### Generic roster bitset domain

- **Question:** What gameplay or account domain is encoded by the variable-length `_-C5F._-Z3L` word array?
- **Start:** Writer method 578, reader method 585, and replay writer 6519 around the roster bitset call.
- **Required evidence:** Trace writes into `_Z3L` from a readable registry/configuration source and trace at least one restored bit to a downstream consumer.
- **Acceptance:** Name the domain, bit-index convention, and empty/default behavior with writer-reader-consumer dataflow.

### Roster word `_-o1O`

- **Question:** What does the final 32-bit roster word before loadouts represent?
- **Start:** Replay writer 6519 and reader 6510 state-4 branches, plus all references to entity field `_-o1O`; `connectionTime` is only an existing parser hypothesis.
- **Required evidence:** A readable telemetry/configuration label or unique source-to-field-to-consumer trace, supported by fixtures where the word varies.
- **Acceptance:** Establish a stable semantic name, units/signedness if applicable, and at least one consuming behavior.

### Selected-taunt slot ordering

- **Question:** Which of the two 16-bit selected-taunt fields is the win slot and which is the lose slot?
- **Start:** Writer 6519 selected-taunt writes, reader 6510 state-4 reads, and victory/defeat UI consumers of the restored fields.
- **Required evidence:** Trace each field independently to a readable win/lose selection or observe a controlled replay with deliberately distinct slot values.
- **Acceptance:** Assign first/second ordering with matching static dataflow or controlled raw values and UI behavior.

### Packed weapon bits 15 and 31

- **Question:** What is bit 15, and what readable product behavior should name the proven bit-31 primary-skin selector?
- **Start:** Packed-word writer 6519, masks in methods 3845:237-294 and 2790:2335-2356, and all tests of masks `0x8000` and `0x80000000`.
- **Required evidence:** Trace both flags from loadout construction through serialization and into distinct weapon/costume behavior, with a fixture exercising each set and unset where obtainable.
- **Acceptance:** Name each flag independently and demonstrate its effect without relying on the parser hypotheses `morphWeapon2` or a discarded boolean.

### Handicap modifier order

- **Question:** Which of the second and third handicap words is damage dealt and which is damage taken, and what are their exact percentage units?
- **Start:** Method 4019:17-68 defaults/overrides and replay writer/reader handicap branches in 6519/6510.
- **Required evidence:** Trace each restored word to the outgoing and incoming damage calculation, including conversion from the stored value and a non-100 controlled fixture.
- **Acceptance:** Prove field order, names, default 100 interpretation, and runtime multiplier formula for both words.

### Composite entity classification

- **Question:** Which five entity-type flags contribute to the serialized classification bit, and what stable public meaning covers the resulting union?
- **Start:** Writer 6519 source `_-V4R._-56G`, its five-flag mask, reader 6510, and entity-type constant initialization in method 14909.
- **Required evidence:** Resolve every masked constant to creation paths and collect or construct cases for each contributing type.
- **Acceptance:** Enumerate the included entity categories and show whether human, bot, dummy, companion, or other synthetic entities set the bit.

### Bot recording and regeneration

- **Question:** Does build 10.09.96325 serialize bot timelines, regenerate bot commands during replay, or combine both paths?
- **Start:** Timeline writer 6521:257-371, replay-to-timeline load 3507:247-262, input insert/sample methods 6133/6135, and bot decision entry points.
- **Required evidence:** A hash-attested, user-owned format-268 bot replay correlated to roster classification with AI disabled/instrumented during playback, or complete static bot-decision-to-`_-Tx._-W5y` dataflow including replay guards.
- **Acceptance:** Account for each bot entity's state-1 presence/absence and prove whether playback consumes serialized commands or live AI output.

### Special-mode timestamp origin

- **Question:** Which modes select replay origin zero instead of `_-q3e - 16`, and how should their timestamps relate to `GameDuration`?
- **Start:** Guards in writers 6520:214-231, 6521:227-239, 6522:209-221, and 6523:226-238, plus GameStats 3805 and telemetry 3833.
- **Required evidence:** Resolve each guard to mode constants and obtain at least one hash-attested replay for every reachable origin branch, or prove the branch unreachable for format 268.
- **Acceptance:** Publish a mode-to-origin table whose formulas reproduce raw result, input, and event timestamps for every covered branch.

### Exact 6,016 ms gameplay transition

- **Question:** Which concrete gameplay-state transition, if any, occurs at serialized time 6,016 ms on the ordinary timed path?
- **Start:** Marker write 3428:62-64, simulation clock 3217:830-859, writer origins 6520-6523, and `GameDuration` arithmetic in 3805:204-217/3833:59-72.
- **Required evidence:** A static control-flow trace from countdown or match-state logic to the transition write, correlated with tick ordering, or an instrumented trace on the pinned build.
- **Acceptance:** Identify the transition and exact tick, or document that 6,016 ms is only reporting arithmetic and specify the actual transition offset.

### State-7 production semantics

- **Question:** When is state 7 emitted, and what gameplay events do its `(entity ID, timestamp)` entries represent?
- **Start:** Writer 6523:239-297, finalizer 6524 ordering, and shared reader branch 6510:647 onward; the current cohort has no state 7.
- **Required evidence:** Trace the writer's source collection to readable victory/final-face consumers and obtain a hash-attested format-268 replay containing state 7, or prove why this build cannot produce one in reachable modes.
- **Acceptance:** Establish the production condition, entry meaning, timestamp origin, repetition behavior, and at least one authentic raw section span.

Issue [#3](https://github.com/NickTacke/brawlhalla-sim/issues/3) should remain open until the requested unknown semantics are resolved.
