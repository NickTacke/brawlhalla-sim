# Reachable PowerType phase universe in Brawlhalla 10.09.96325

Issue: [Prove the reachable PowerType phase universe](https://github.com/NickTacke/brawlhalla-sim/issues/50)

## Verdict

**Bounded source-selection closure, but the ticket's universal acceptance condition is not proved. Keep the ticket open.**

The hash-pinned declarative sources name 2,253 distinct non-template `PowerType` roots across replay-restored hero loadouts, item command slots and triggered powers, loadout-selected power swaps, restored taunt availability, and level hazards. Following every explicit power-to-power transition in the pinned `powerTypes` table closes 3,632 of 3,670 non-template records. Those records contain 1,839 non-default geometry-bearing records and 6,322 serialized geometry slots.

This is a complete ledger for the inspected declarative root families and transition grammar. It is not the exact replay-reachable universe. Thirty-eight records remain outside that source graph, including six non-default geometry-bearing records and six serialized geometry slots. Their unreachability cannot be proved because the executable has 72 exact calls to the central `PowerType` name lookup across 47 methods, some lookup names are constructed dynamically, match-root reachability is not closed, and the accepted replay-producing configuration tuple is not closed.

One `Template` row is excluded separately. Power parser method 6294 `PowerType._-L4o` compares the parsed name with `Template` at PCs 147-151 and returns at PC 155 before runtime registry processing. The other 38 exclusions are **unknown**, not unreachable.

Confidence is **high** for the pinned source identities, source root counts, source transition closure, phase ledgers, parser/runtime anchors, and complete exact-QName lookup callsite ledger. Confidence is **insufficient** for replay-producing root eligibility and universal exclusion.

## Evidence grades

- **Proven:** exact hash-pinned source identity, exact typed-QName AVM2 control/dataflow, or a complete exact-QName callsite ledger in the pinned ABC.
- **Source-selectable:** named by a pinned declarative root or reached from one through a pinned transition field. This does not prove that a replay-producing configuration exercises the gate.
- **Bounded closure:** every member of the stated source families and transition grammar is included in a fixed ledger.
- **Unknown:** inspected primary evidence does not prove reachability or unreachability.

Repository reports and implementation names were locators only. The committed analyzer derives the result from ignored user-owned primary inputs.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Parser, root registrar, selectors, name lookup, complete lookup callsites |
| Sole semantic build string | `10.09.96325` | Build identity |
| `powerTypes` | `715468d8eda8fa2ec3d88a8b5395c076bec937640927909add4745eda2883f27` | Complete 3,671-row inventory, transition graph, phase geometry |
| `HeroTypes` | `1a9c27d1e21178870dafe5746c00efb7ec154d14290af4c628eb878c054eb920` | Six signature roots per non-template hero |
| `itemTypes` | `d68102cbafaef4f6f9eae817f1f7c5830be4464e8cea89fbd0ee36bc28e95f3e` | Command-slot and triggered item roots |
| `PowerSwapTypes` | `a6eb10c26320ba18da8a1067cae09258a28c6f6c0a1a27b1adf27c46a2946b6f` | Costume, hero, and spawn-bot replacement roots |
| `TauntTypes` | `535bf5ee2e8446a4f352ddf5bebaefa90e535c4e739737d0d23dbaa59875780e` | Taunt, random-taunt, and UI-override roots |
| 261 extracted entries | `4bcd0666a713d81266bd76885ed21740c4e8c4c01def2ebcd02202983a6a8d8f` | Complete reviewed extraction identity and level hazard roots |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |

The analyzer rejects any changed input hash, extraction aggregate, build string, table width/count, invalid branch target, moved parser/runtime anchor, changed core ledger, changed selection-method body, changed transition-reference ledger, changed root count, changed closure count, or changed central lookup callsite ledger.

## Complete PowerTypes inventory boundary

The pinned table has 3,671 records and 182 columns.

- One record is `Template`. It is not a runtime `PowerType` record.
- 3,670 records are non-template runtime vocabulary.
- All rows together contain 6,329 serialized top-level geometry slots, using the same `AoERadiusX`, `AoERadiusY`, `CenterOffsetX`, and `CenterOffsetY` slot definition established by [Locate offensive hitbox placement and timing](https://github.com/NickTacke/brawlhalla-sim/issues/34).
- The source graph reaches 6,322 slots. Six slots remain in unknown records. The remaining one slot belongs to the complete-table versus non-template accounting boundary.

The committed source-phase ledger hashes each reached `PowerName`, `CastTime`, and four geometry expressions without emitting names or source rows. Its digest is `bd02224c25fcdfeff7e35978257415cf4d882f323ec759f0d10f0be7aab58e99`.

## Replay-restored and declarative selection roots

### Hero loadouts

Format-268 state 4 restores one to five hero loadouts per entity. Runtime attack selector method 1535 reads the equipped hero and weapon state, then reads `mSpecialPower1`, `mSpecialPower1_Forward`, `mSpecialPower1_Down`, `mSpecialPower2`, `mSpecialPower2_Forward`, or `mSpecialPower2_Down` before central lookup.

The pinned `HeroTypes` source contributes 414 references to 414 unique powers across those six fields. This is complete for the named hero signature fields. It does not prove which hero IDs, hero counts, or mode-specific rotating-hero states can occur in a replay-producing configuration.

### Items and weapons

Runtime selector method 1535 reads the current `ItemType` command vector for grounded, aerial, directional, smash, and throw-related attacks. Item collision and activation paths separately consume the triggered-power fields.

The pinned `itemTypes` source contributes 224 valid references to 181 unique powers from:

- `PowerType_Combo1`, forward, down, aerial, aerial-forward, and aerial-down;
- the three grounded smash and two aerial smash slots;
- collision, trigger, explosion, activation, and consume fields.

The source includes `--` sentinels, which contribute no root. Item table presence does not prove that every item is enabled by a replay-producing scoring type, item-spawn rule set, gadget mask, or level.

### Replay-selected power swaps

State 4 restores costume, spawn-bot, and packed weapon-skin selections. `PowerSwapTypes` is keyed by owner hero, costume, or spawn bot and names replacement `TargetPower` values. The pinned source contributes 3,735 valid references to 2,020 unique powers.

This deliberately includes the complete replacement vocabulary. It does not claim every cosmetic/account ID is accepted, owned, or emitted by build 10.09.96325. Closing that gate depends on the replay-producing configuration and loadout domain.

### Taunts

State 4 restores the player's available-taunt bitset and selected taunt IDs. Prior evidence proves that gameplay method 1535 resolves a set `TauntID` to `TauntType`, then reaches its power selection. The pinned `TauntTypes` source contributes 245 valid references to 231 unique powers through `PowerName`, `RandomPowers`, and `UIOverridePowerName`.

Availability bits prove a replay-to-selection path for an admitted taunt ID. They do not prove that every shipped taunt ID can appear in an authentic replay-producing roster.

### Level hazards

The complete 261-entry extraction aggregate contains level declarations whose `TrapPowers`, `LavaPower`, and `MudPower` attributes contribute 95 references to 39 unique powers across 13 level entries. These are source roots selected after replay `levelId` resolves its level data.

The currently proved replay corpus covers one narrow playlist cohort. The complete set of replay-producing level IDs remains unknown, so these 39 roots are source-selectable rather than universally replay-reachable.

### Root aggregate

The five families overlap. Their union is 2,253 distinct roots. The privacy-safe root ledger digest is `3a40f5d9c955ae293fe49ce319dcfdf996120910b87945665cc2c9e23716afd7`.

## Power-to-power transition closure

The table contributes 3,150 valid edges through 13 explicit transition fields:

| Source field | Runtime selection condition |
| --- | --- |
| `ComboName` | ordinary phase completion |
| `ComboOverrideIfHit` | hit-conditioned continuation |
| `ComboOverrideIfRelease` | release-conditioned continuation |
| `ComboOverrideIfWall` | wall-conditioned continuation |
| `ComboOverrideIfButton` | min/max button-state continuation |
| `OriginOverrideIfInMode` | mode-conditioned origin replacement |
| `ComboOverrideIfDir` | direction-conditioned continuation |
| `ComboOverrideIfInterrupt` | interrupt-conditioned continuation |
| `BGPowerOnFire` | background power fired by active-power tick |
| `ExhaustedVersion` | exhausted substitution |
| `GCVersion` | gravity-cancel substitution |
| `MomentumVersion` | momentum-conditioned substitution |
| `TeamTauntPower` | team-taunt replacement |

The parser also supports the implicit `<PowerName>_TESTFEATURE` substitution when such a record exists. Method 6303 `PowerType._-t5J` recursively registers combo, direction, test-feature, gravity-cancel, and mode roots. Runtime methods add the background, exhausted, momentum, release, wall, hit, interrupt, and team-taunt gates.

The complete transition ledger digest is `09694f063834558865be2a400e17e73c18c751770fb49b410e284e3e2effb9e4`.

Breadth-first closure from all declarative roots reaches:

- 3,632 non-template records;
- 1,839 records with at least one non-default geometry expression;
- 6,322 serialized geometry slots.

For each reached record, the analyzer records either its root source family or one deterministic predecessor plus transition kind. Recursively following predecessors gives a source-selection path. The complete selection-path ledger digest is `2972ae48d924acc883def49e5742791ba0906c9828e43245e8546536600a3281`.

## Executable lookup closure and why it does not close reachability

Method 6304 `PowerType._-51i` is the central name-to-`PowerType` lookup. Its exact QName appears at 72 call instructions in 47 methods. The complete method, owner, PC, and opcode ledger digest is `c06daf99b07f7f7708bfd92ac61baaa930fb6d98549609b4050bffe03e83deac`.

Focused gameplay anchors include:

| Path | Method and byte PC |
| --- | --- |
| Background fire | method 46, PC 3748 |
| Combo continuation | method 75, PC 56 |
| Team taunt | method 1509, PC 327 |
| Direct selected root | method 1535, PC 895 |
| Exhausted substitution | method 1535, PC 1026 |
| Gravity-cancel substitution | method 1535, PC 1086 |
| Mode origin override | method 1535, PC 1154 |
| Momentum substitution | method 1535, PC 1311 |
| Interrupt override | method 1551, PC 1160 |
| Origin resolution | method 6306, PC 77 |

Method 1538 independently reads the hit, wall, release, and final combo fields at PCs 432, 490, 520, and 744. Parser method 6294 anchors all 13 source columns and their normalized trait writes. The combined transition-reference ledger is pinned at `4a93278450098f43b4c156b00e0d38e5611278af3fdc53f921ca9fb3af92b3f7`; the 11 complete selection-method bodies are pinned at `80f993c57554f2ae29e035cde04c5abdc3c4cd31e21cc607a01cf22e764dbffa`.

The callsite ledger is complete for exact calls to method 6304, but it is not a gameplay reachability graph. Its methods include runtime, loader, linking, presentation, and tooling owners. Several callers construct lookup names from prefixes, suffixes, mode state, or other runtime values instead of loading an exact `PowerName` string. The ABC has 175 non-template exact `PowerName` strings, ledger digest `dc5719468c32ec5627be03ba6a5c1cd8e5b09d28d0681a01ddc050c8744a63e0`, but literal intersection cannot close dynamically constructed names.

Therefore no static claim that the 38 source-graph exclusions are unreachable is justified.

## Exact acceptance disposition

### Acceptance met within the bounded source graph

- Every inspected source family is hash-pinned and completely counted.
- Every explicit table transition family is parsed and included.
- Every source-selectable record has a reproducible selection-path ledger entry.
- Every reached record's serialized phase geometry is included in a fixed ledger.
- The central runtime lookup has a complete exact-QName callsite ledger.

### Acceptance not met universally

1. **Replay-producing configuration roots:** unresolved. The format represents broad hero, cosmetic, item, taunt, level, mode, and flag domains, but the accepted and emitted subset is not closed.
2. **Match-root call reachability:** unresolved. The 47 lookup-owning methods cannot yet be partitioned into gameplay-reachable versus presentation, loader-only, or tooling paths for every mode.
3. **Dynamic lookup value domains:** unresolved. Some lookup arguments are assembled at runtime, so exact string intersection and declarative reference scans are insufficient.
4. **Thirty-eight exclusions:** unresolved. They have no declarative-root path in this closure, but no proved unreachability reason. Six contain non-default geometry.
5. **Conditional gates:** source presence proves vocabulary, not that every relevant input, mode, exhaustion, gravity-cancel, momentum, wall, hit, release, interrupt, or team-taunt condition occurs in a replay-producing match.

Issue 50 must remain open because its requirement that every excluded phase have a proved unreachability reason is unmet.

## Existing surfaced route

No new ticket is needed. Three existing open tickets cover the prerequisites exposed by this investigation:

- [Trace replay-writer setup and cleanup across configurations and exits](https://github.com/NickTacke/brawlhalla-sim/issues/53) must close the remaining writer dispatch and lifecycle configuration gates.
- [Map replay-producing modes to patch closure dependencies](https://github.com/NickTacke/brawlhalla-sim/issues/36) must map accepted replay settings, loadouts, items, levels, and modes to their initialization roots.
- [Prove match initialization and tick executable closure](https://github.com/NickTacke/brawlhalla-sim/issues/32) must classify which of the 47 lookup-owning methods and their dynamic argument producers are reachable from match initialization and authoritative ticks.

After those tickets close, rerun this analyzer with their admitted configuration and executable-root ledgers. Promote admitted roots, classify all dynamic lookup values, recompute closure, and attach a reason to every remaining record. Only then can issue 50 close and unblock the universal acceptance condition in [Locate offensive hitbox placement and timing](https://github.com/NickTacke/brawlhalla-sim/issues/34).

## Reproduction

Keep proprietary inputs outside version control or under ignored paths. From the checkout root:

```bash
bun run provenance:reachable-power-phases -- \
  --abc /path/to/hash-pinned/main.abc \
  --power-types /path/to/hash-pinned/Game.swz.38.dat \
  --hero-types /path/to/hash-pinned/Game.swz.23.xml \
  --item-types /path/to/hash-pinned/Game.swz.27.dat \
  --power-swap-types /path/to/hash-pinned/Game.swz.39.xml \
  --taunt-types /path/to/hash-pinned/Game.swz.56.xml \
  --extracted /path/to/hash-pinned/extracted
```

Useful bounded view:

```bash
bun run provenance:reachable-power-phases -- ... | jq \
  '{status, identity, inventory, declarativeRoots, sourceSelectionGraph, avm2: (.avm2 | del(.lookupCallsites)), blockers}'
```

Successful output reports `bounded-source-selection-closure-with-runtime-root-blockers`, build `10.09.96325`, 15,010 decoded methods, valid branch targets, seven exact input identities, the 261-entry extraction aggregate, 3,632 source-selectable records, 38 unresolved records, and the complete 72-instruction lookup ledger.

The analyzer emits no source rows, power names, replay bytes, player data, fixture identities, or local input paths. Operating-system errors can still reveal a caller-supplied path.

## Privacy and licensing

No ABC, SWF, SWZ, extracted table, bulk PowerType list, level payload, or private replay is committed. The artifact contains hashes, aggregate counts, method/field identifiers, ledger digests, acceptance blockers, and a reproducible analyzer only.

## One-line map gist

Five pinned declarative root families plus every table transition close 3,632 of 3,670 runtime PowerTypes and 6,322 geometry slots, but 38 records remain unclassified until replay-producing configuration, match-root call reachability, and dynamic lookup value domains are closed by the existing writer, mode-dependency, and tick-closure tickets.
