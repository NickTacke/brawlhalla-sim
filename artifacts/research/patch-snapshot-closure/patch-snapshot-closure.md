# Brawlhalla 10.09.96325 patch-snapshot closure

## Answer and disposition

A complete necessary-and-sufficient simulation closure is **not yet proven**. Keep issue #4 open.

What is proven:

1. The source snapshot examined here is pinned by `BrawlhallaAir.swf`, `main.abc`, `Engine.swz`, `Game.swz`, and `Dynamic.swz` hashes below.
2. Replay selectors reach distinct registries and tables for modes, scoring, heroes, stats, runes, dodges, items, powers, hurtboxes, spawn rules/rates, level sets, and level geometry. Unique AVM2 parser candidates for these shipped field-name conjunctions are listed below.
3. `gameDataChecksum` is not a patch-data, XML, code, physics, or replay-payload checksum. It is a weak weighted checksum of selected state-4 roster/loadout fields and `levelId`, reduced modulo 173.
4. A precise closure-manifest candidate can now be specified. Its sufficiency cannot be certified until randomness, all replay-producing mode roots, dynamic rule reachability, collision/hitbox geometry, loader normalization, and AVM2/AIR native semantics are closed.

The practical answer is therefore: use the manifest candidate in this report as a fail-closed contract, but do not label a 10.09 snapshot complete yet.

## Evidence grades

- **P (proven):** unique control/dataflow in the hash-pinned ABC, exact raw replay calculation, or byte hash.
- **S (source-derived):** exact shipped XML/delimited entry and a unique parser-method conjunction. This proves parsing, not every downstream behavior.
- **C (candidate):** required by the proposed closure contract but transitive necessity or sufficiency remains unproved.
- **U (unknown):** primary evidence inspected here does not close the claim.

Implementation names and earlier comments were locators only. The command below derives claims from ignored user-owned inputs.

## Reproduction command

Set `BRAWLHALLA_RESOURCES` to a user-owned build-10.09.96325 resource directory. From the repository root:

```bash
bun run provenance:patch-snapshot -- \
  --abc artifacts/main.abc \
  --archives "$BRAWLHALLA_RESOURCES" \
  --extracted artifacts/research/brawlhalla-physics/decrypted \
  --corpus-manifest artifacts/replay-corpus/10.09.96325/manifest.json
```

The command rejects hash mismatches, discovers parser methods by shipped field-name conjunctions, reads only state 3/state 4 from each hash-pinned replay, recomputes `gameDataChecksum`, and emits hashes/counts/derived arithmetic. It emits no name, Brawlhalla ID, local path, or raw proprietary record. Useful focused views:

```bash
bun run provenance:patch-snapshot -- ... | jq '.identities, .avm2.dataParserCandidates'
bun run provenance:patch-snapshot -- ... | jq '.avm2.checksumMethod, .avm2.writer, .avm2.reader, .fixtureChecks'
```

## Evidence identity

All hashes are SHA-256. The ABC contains exactly one semantic build string, `10.09.96325`. The provenance command validates it.

| Role | Bytes | SHA-256 | Grade |
| --- | ---: | --- | --- |
| AIR application source, `BrawlhallaAir.swf` | 1,730,834 | `40df9af5308b9a17bf015feb38edec6d9bea57d1cd53078d298aa725acceb8b2` | P |
| Extracted executable rules, `main.abc` | 3,934,088 | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | P |
| `Engine.swz` | 7,456 | `aa5b25d0351b7c2c41ccfc588f9bd7ece0c21adb4d4034aa2416d5101684f8dc` | P |
| `Game.swz` | 977,263 | `4fc9d70c1c3642b7d3e61c8bb0062bb57c46ea2169276ca1d33616a5843d4aff` | P |
| `Dynamic.swz` | 292,091 | `cd54de039bc4e3441a7ae5811ef8748a719f49e0d4917016407d83b201ddf9c4` | P |
| 261 extracted XML/delimited entries, filename-plus-leaf-hash aggregate | n/a | `4bcd0666a713d81266bd76885ed21740c4e8c4c01def2ebcd02202983a6a8d8f` | P |
| Authentic replay manifest, 12 format-268 fixtures | 23,320 | `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac` | P |

`Init.swz` was observed at SHA-256 `bfb56c12517b7a95927feaca7180d5a85b6952d4d53e76e614ffc06bf4fe067b` (182,708 bytes) by `shasum -a 256 "$BRAWLHALLA_RESOURCES/Init.swz"`. No match-initialization dataflow to it was proven, so it is a residual source candidate, not a declared closure member.

The extracted inventory contains 120 `LevelDesc`, 66 `CutsceneType`, 13 delimited-data entries, and 62 other XML/config roots. The count is extraction provenance, not a claim that all 261 entries affect simulation.

## Closure definitions

### Initialization closure

The smallest external set that, together with a replay, deterministically constructs the match's tick-zero typed state: resolved settings/mode, entities/loadouts/stats, selected level/collisions/spawns, item and power registries, PRNG states, timers, and every default/inheritance result. It includes executable initialization rules and required VM/native semantics. It excludes later rules not reachable from initialized state.

### Behavior closure

The initialization closure plus every code/data/native dependency transitively reachable on any tick of every match that build 10.09.96325 could write as a format-268 replay. This includes lazy item/power lookups, bot or special-mode logic, collision/hit arbitration, scoring/end conditions, and all random draws with stream/call order.

### Verification/oracle closure

Artifacts useful to prove compatibility but not needed by a validated headless runtime: authentic replay bytes, corpus manifest, reference-client playback, telemetry, render/audio assets, and raw archives retained for audit. A graphics/SWF asset moves into behavior closure if AVM2 dataflow proves that collision or hitbox geometry is read from it.

## Replay-to-external dependency graph

```text
format 268 state 3/state 4
  state3 word0 ──> PRNG seed target/algorithm/stream split ........ U
  playlist ID/name, online bit ──> UI/network context ............. not proven behavioral
  15 serialized settings
    scoringTypeId ──> ScoringTypes ──> scoring/end/respawn rules .. S/C
    itemSpawnRuleSetId ──> ItemSpawnRuleSetTypes .................. S/C
    weapon/gadgetSpawnRateId ──> ItemSpawnRateTypes ............... S/C
    variation + scalar settings ──> executable mode branches ...... C
    levelSetId ──> LevelSetTypes .................................. verification/selectability C
  levelId ──> LevelType registry ──> one Dynamic LevelDesc
    ──> hard/soft collision, camera/KO bounds, respawns, item/goal spawns
  each entity/loadout
    HeroID ──> HeroTypes ──> base weapons + signature Power names
    runeIndex ──> RuneTypes ──> four stat indices/values
    resolved stats ──> StatTypes
    item/weapon actions ──> ItemTypes ──> PowerTypes ──> HurtboxTypes
    dodge branch ──> DodgeTypes
    costume/packed weapon skins ──> CostumeTypes/WeaponSkinTypes/PowerSwapTypes .. C
  all initialized state ──> executable AVM2 rules + AIR/AVM2 numeric/native semantics
```

Level-set membership is not necessary to replay a match once a valid `levelId` and its `LevelDesc` have been resolved, unless a mode branch consults the set during play. It belongs in reference initialization/verification until that absence is proved. Similarly, replay-serialized scalar settings can supersede GameMode defaults, but `ScoringType`, variation, and special-mode branches still require executable mode semantics.

## Normalized data candidate

### Proven parser/source links

Every row below is build `10.09.96325`, ABC `9fe9…ba2d`, and is reproduced by `.avm2.dataParserCandidates`. “Unique” means exactly one method contained the full field-name conjunction shown by the command.

| Category | Shipped entry SHA-256 | Unique parser class/method/trait | Closure role and grade |
| --- | --- | --- | --- |
| Dodge | `Game.swz.11.xml` `a0c99d2052bee75b755bb2e8b16dd2e6e8b167d154cd20a2baf6c02a93fa63e4` | class 138 `_-P6H`, method 2672 `_-F2f` (`DodgeID`, `SpeedXMaxMult`, `AccelYFormula`) | behavior S/C |
| Game mode | `Game.swz.17.xml` `cdc1409bfcb84e30d76419087656c7dfe38c549e9528198adf6ba9be5f80741e` | class 184 `_-F5K`, method 3732 `_-W2o` (`GameModeID`, `ScoringType`, `LevelSet`, `DamageRatio`, `Variation`) | initialization/mode S/C |
| Hero | `Game.swz.23.xml` `1a9c27d1e21178870dafe5746c00efb7ec154d14290af4c628eb878c054eb920` | class 217 `HeroType`, method 4123 `_-H5O` | initialization/behavior S/C |
| Hurtbox | `Game.swz.24.dat` `358aac8501dbf9051c22c7f14c8eef72a16cd0a071ad2ef398ab6695286e3333` | class 237 `_-o1U`, method 4655 `_-E2Z` | behavior S/C |
| Item spawn rate | `Game.swz.25.xml` `e9d054eacf39030ea242d713bb0808b66567363f0877f150724f2a4ce7b12aa4` | class 255 `_-X5O`, method 4809 `_-4` | behavior/randomness S/C |
| Item spawn rules | `Game.swz.26.xml` `f1ee7530c4e0693232c8a4fdc93163f676691259dc2da9e83bc332cf21b3391c` | class 256 `_-E2c`, method 4818 `_-14t` | initialization/behavior S/C |
| Item | `Game.swz.27.dat` `d68102cbafaef4f6f9eae817f1f7c5830be4464e8cea89fbd0ee36bc28e95f3e` | class 257 `ItemType`, method 4834 `_-B5B` | behavior S/C |
| Level set | `Game.swz.30.xml` `e6870349d9104bc91fddcfa329f2cf4b5a4b96e466cfed47cb92834316b54dff` | class 275 `_-w1p`, method 5098 `_-4j` | initialization/verification S/C |
| Level geometry | `Dynamic.swz`, archive `cd54…f9c4`; 120 `LevelDesc` leaves | script 279 initializer, method 5156 (`CameraBounds`, `HardCollision`, `SoftCollision`, `Respawn`) | initialization/behavior S/C |
| Power swap | `Game.swz.39.xml` `a6eb10c26320ba18da8a1067cae09258a28c6f6c0a1a27b1adf27c46a2946b6f` | class 341 `_-D4h`, method 6264 `_-ru` | loadout/behavior unresolved S/C |
| Power | `Game.swz.38.dat` `715468d8eda8fa2ec3d88a8b5395c076bec937640927909add4745eda2883f27` | class 342 `PowerType`, method 6294 `_-L4o` | behavior S/C |
| Rune | `Game.swz.42.xml` `13c32dfdc7ba3b5296c562bf69996b93b68f6b48dcdd226e15a0899f24d3e910` | class 393 `_-O5l`, method 7108 `_-9U` | initialization/behavior S/C |
| Scoring | `Game.swz.43.xml` `fd9efadd2f3c6f7e844ec9c52b1f685fb15d32e936934450e36e441f3e182f7d` | class 406 `ScoringType`, method 7279 `_-yV` | behavior S/C |
| Stat ladder | `Game.swz.52.xml` `0744728b58c6134f5d205236ae6a34c1f05d55c9f6b80f074f0f6cf1cb694692` | class 629 `_-92f`, method 11659 `_-j4W` | initialization/behavior S/C |

`PowerTypes` contains `CastTime`, `Hurtbox`, damage, and impulse fields, but the inspected evidence does not locate per-frame offensive hitbox placement. `HurtboxTypes` provides body/hurtbox size records. This is a behavior-closure blocker, not permission to assume graphics are irrelevant.

### Reference-initialization registries

A reference-equivalent initializer also resolves serialized cosmetic/account IDs. Their parent boundary is `Game.swz` `4fc9…4aff`: avatar (`Game.swz.1.dat`, `71128d…9dbf`), color exceptions (`6.dat`, `1b8c0f…edd6`), color schemes (`7.xml`, `3c7841…60af`), companion (`8.xml`, `1a1d3e…db9a`), costume (`9.dat`, `85c6cf…4358`), spawn bot (`50.xml`, `0b3833…a5cc`), taunt (`56.xml`, `535bf5…780e`), trail (`61.xml`, `aec03c…241d`), and weapon skins (`65.dat`, `017319…36a`). Emitter/group and player-theme entries are also present in the same archive.

For a headless behavior-only simulator, these may be stored as opaque replay values unless a behavior dataflow reaches them. Costume/weapon-skin to `PowerSwapTypes` is specifically unresolved and must not be dropped yet. Cosmetic inclusion in `gameDataChecksum` is not proof of gameplay effect.

## Necessary-and-sufficient manifest candidate

This is a precise candidate, not a completeness claim.

```json
{
  "schemaVersion": 1,
  "target": {
    "patch": "10.09",
    "build": "10.09.96325",
    "replayFormats": [268],
    "platformNumericProfile": "avm2-air-10.09-v1"
  },
  "producer": {
    "repositoryCommit": "40-lowercase-hex",
    "bunVersion": "1.3.14",
    "abcDisassemblerCommit": "ad9714d"
  },
  "sources": [
    {
      "id": "source-id",
      "role": "abc|archive|container|native-runtime",
      "sha256": "64-lowercase-hex",
      "byteLength": 0,
      "requiredAtRuntime": false
    }
  ],
  "datasets": [
    {
      "id": "logical-category",
      "sourceId": "source-id",
      "sourceEntryOrdinal": 0,
      "sourceEntrySha256": "64-lowercase-hex",
      "sourceGrammar": "air-xml|game-delimited-v1|swf-timeline|other",
      "loader": { "classIndex": 0, "methodId": 0, "semanticSha256": "64-lowercase-hex" },
      "normalizedSha256": "64-lowercase-hex",
      "selectionKeys": ["LevelID"],
      "requiredFor": ["initialization", "behavior"],
      "status": "required|optional|derived|oracle-only"
    }
  ],
  "rules": {
    "abcSourceId": "source-id",
    "roots": [{ "classIndex": 0, "methodId": 0, "reason": "match-init|tick|mode" }],
    "methods": [
      {
        "classIndex": 0,
        "methodId": 0,
        "semanticSha256": "64-lowercase-hex",
        "calls": [0],
        "readsDatasets": ["logical-category"],
        "nativeDependencies": ["Number", "uint", "Math.round"]
      }
    ],
    "dynamicDispatchPolicy": "closed-world-proven-target-set",
    "rulesRootSha256": "64-lowercase-hex"
  },
  "randomness": {
    "seedReplayField": "state3.word0",
    "algorithm": "required-no-default",
    "streams": [],
    "initializationOrder": [],
    "drawOrderRuleSha256": "required-no-default"
  },
  "roots": {
    "initializationSha256": "64-lowercase-hex",
    "behaviorSha256": "64-lowercase-hex",
    "oracleSha256": "64-lowercase-hex"
  },
  "compatibility": {
    "gameDataChecksum": { "algorithm": "format268-roster-level-mod173", "oracleOnly": true }
  }
}
```

Required fields are all shown except fields marked by an empty array whose contents depend on the traced graph. Optional source-location/display metadata must not participate in hashes. Derived fields are method call edges, dataset-read edges, category/Merkle roots, and per-replay selected subsets. `status=oracle-only` members must not enter initialization or behavior roots.

### Hash boundaries

1. **Raw provenance:** SHA-256 exact container/archive/entry bytes before decoding.
2. **Normalized data:** hash exact canonical semantic records plus loader semantic hash and source-entry hash. A normalized leaf cannot silently survive a loader-code change.
3. **Executable rules:** hash class index, method ID, opcode/operand/control-flow representation, call/read edges, VM profile, and native dependencies. An opcode-only hash is insufficient.
4. **Closure roots:** domain-separated Merkle roots over sorted logical member IDs and their leaf hashes. Source order remains a hashed field inside each leaf.
5. **Per-replay selection:** derived resolution ledger from replay selectors to closure member IDs. It is not a replacement patch root.

A member is necessary only after a deletion test shows some reachable replay-producing match fails initialization or changes behavior. Sufficiency requires every selector to resolve, every default to be explicit, and static/dynamic/native dependency traversal to terminate entirely inside the behavior root.

## Deterministic normalization rules

1. Decode/decrypt user-owned archives only in ignored storage. Record archive hash, extraction ordinal, exact entry hash, byte length, and logical root. Do not infer identity from numeric extraction filename alone.
2. Reproduce the pinned AVM2 loader, including child iteration order, duplicate handling, template/default inheritance, sentinels such as absent/empty/`--`, and registry insertion order. A generic XML or CSV parser is not evidence-equivalent.
3. Preserve order unless AVM2 dataflow proves order-insensitivity: entity/loadout/taunt arrays, level elements, power phases, delimited rows, and registry overwrite order are ordered.
4. Represent `uint`/`int` as exact 32-bit bit patterns. Represent AVM2 `Number` as an IEEE-754 binary64 hexadecimal bit string, preserving `-0`, infinities, and NaN policy. Record unit metadata only when proven. Do not silently convert source coordinates, frames, milliseconds, ratios, or percentages.
5. Resolve inheritance/defaults into explicit fields while retaining a provenance pointer to every contributing source record and loader branch. Missing, inherited, and explicit-default values remain distinguishable in audit metadata.
6. Canonical encoding candidate: UTF-8 RFC 8785 JSON with binary64 values encoded as tagged hex strings, object keys sorted by UTF-16 code units, arrays in source/runtime order, no insignificant whitespace, and LF termination. Hash the bytes with SHA-256.
7. Reject duplicate logical IDs, unknown references, unresolved sentinels, non-finite values not accepted by the pinned loader, and normalized/source hash mismatch.

Raw SWF/SWZ/XML/delimited artifacts are not required at runtime after a normalized dataset and executable-rule graph pass equivalence and deletion tests. They remain required to rebuild/audit provenance. Today they should be retained by the user because normalization and behavior closure are not complete. If rules are interpreted directly, `main.abc` and the specified AVM2/AIR native profile remain runtime members; a proved translation can replace them with hash-pinned IR.

## Executable-rule provenance

The full ABC hash is a safe source superset, not a minimal executable closure. For focused evidence, the command hashes `UTF8(JSON.stringify(disassemblerInstructions))`, including every emitted opcode and operand/control-flow parameter. These hashes are reproducible with `abc-disassembler` commit `ad9714d`, pinned by `bun.lock`, but are tool-representation hashes, not the future cross-tool canonical rule hashes in the manifest candidate.

| Rule | Method | Instruction-object SHA-256 |
| --- | --- | --- |
| state-4 writer | class 357 method 6519 | `d0ce3c879fbb64912453fb8aa3c831142edc94fde8ce331fa97d95fd731ccc7d` |
| state reader | class 356 method 6510 | `0da30450caf3f8d99884760ec0e12a6ce1c818173ac57d976392268d7c3ce531` |
| checksum | class 357 static method 6527 `_-U6c` | `bd596b5e1bf1d60877843b378fce1164f1244be9df0c9259c92c026f6bc2bea0` |
| bitset score | class 30 `_-C5F`, method 591 `_-KK` | `bfd26e02e3c7e83fe88131cac7e804be203da48d7c3120f630014df8a9011cc5` |
| popcount32 | class 97 `_-f0`, static method 1860 `_-M6E` | `eeae445cf3afadb2cea7a4561a3ba322066623b447a9b0efb597f9170132069f` |

A complete rules root must start at proven match-initialization, tick, and mode roots; include every direct call, resolved virtual target, callback, constructor/class initializer, property getter/setter with behavior, exception path, and reflected/dynamic target; then include AVM2 coercion, signed/unsigned overflow, `Number`, `Math`, `ByteArray`, XML, and collection-order semantics. Whole-ABC hashing detects code drift but does not prove that a new simulator executes those rules.

## Exact `gameDataChecksum` semantics

### Writer calculation

**P.** Build `10.09.96325`, ABC `9fe9…ba2d`.

Replay writer class 357 method 6519 constructs canonical entity records `_-kv` (instructions 138-299), serializes them (300-486), appends each record to local array 6 (487-489), emits the roster terminator (493-497), then calls static `_-16._-U6c(array, levelId, heroCount)` at instruction 504 and writes its `uint` result through bit-writer `_-S2c` at 506.

Method 6527 initializes a `uint` accumulator to zero and iterates canonical entities in array order (20-281). Null entries are skipped. For each entity, it performs the following additions in this exact order. `i` is zero-based loadout or taunt index:

```text
colorSchemeId                         * 5
spawnBotId                            * 93
trailEffectId                         * 97
playerThemeId                         * 53
tauntId[i], i=0..7                    * (13 + i)
selectedTauntId[0]                    * 37
selectedTauntId[1]                    * 41
genericBitsetScore(11)                * 1
team                                  * 43
for each loadout i:
  (encodedHeroValue & 0xffff)          * (17 + i)
  costumeId                           * (7 + i)
  runeIndex                           * (3 + i)
  packedWeaponSkinWord                * (2 + i)
if handicap block absent:              + 29
else:
  handicapWord0                       * 31
  Math.round(handicapWord1 / uint(10))* 3
  Math.round(handicapWord2 / uint(10))* 23
after all entities:
  levelId                             * 47
```

`genericBitsetScore(11)` is method 591: for each serialized uint word at word index `j`, add `(11 + j) * popcount32(word)`. Static method 1860 implements the standard parallel 32-bit popcount using masks `0x55555555`, `0x33333333`, `0x0f0f0f0f`, and multiplier `0x01010101`.

Every `multiply_i` and `add_i` is followed by `convert_u`; equivalently, multiplication and addition wrap modulo 2^32 after each operation. At instructions 291-295 the final unsigned accumulator is reduced by AVM2 `% 173` and converted to `uint`. There is no byte serialization, string normalization, cryptographic hash, or archive input.

### Reader comparison

**P.** Reader method 6510 reads the stored state-4 `u32` at instructions 580-584. At 787-803, if the restored `LevelType` is non-null and entity array `_-I1a` is nonempty, it calls the same `_-U6c(_-I1a, _-fq._-Y1H, heroCount)`, compares direct equality with the stored word, and sets the reader-valid boolean false on mismatch. It skips this comparison when the level is null or roster empty. A simulator/validator should be stricter and reject those malformed prerequisites before checksum comparison.

The provenance command reproduced all 12 authentic fixtures exactly. Pre-modulus accumulators ranged from `357131407` to `962077826`; stored/calculated values were `98, 68, 166, 152, 1, 9, 81, 97, 0, 90, 87, 22` in manifest order. Corpus manifest SHA-256 is `b044…d1ac`.

### What it binds

It is sensitive to the selected fields above, loadout/taunt indices, bitset **population count per word index**, and uint overflow. Entity ordering alone does not matter because every entity uses the same weights and addition is commutative modulo 2^32. Loadout ordering does matter because weights depend on loadout index.

It does **not** bind:

- patch/build/replay-format identity, ABC/SWF/SWZ/XML/delimited bytes, normalized data, or executable rules;
- random seed, playlist ID/name, online bit, or any of the 15 serialized game-setting words;
- entity ID, Brawlhalla ID, player name, companion ID, emitter-group ID, avatar ID, final roster word `_-o1O`, or composite entity-classification bit;
- generic-bitset bit positions within a word (only each word's popcount), nor changes that preserve the weighted total;
- high 16 bits of the encoded hero value, though it does bind the full packed weapon-skin word;
- inputs, timestamps, results, placements, fanfare, KO/final-face events, match duration, physics state, or simulation output.

Modulo 173 and linear weighted addition make collisions routine. Equal checksum is neither evidence of patch compatibility nor evidence that two matches initialize or simulate identically.

## Failure behavior for a future snapshot loader

Fail closed before simulation when:

1. any required source, entry, normalized leaf, rule method, native profile, or closure root is absent or hash-mismatched;
2. replay build/format compatibility is not explicitly declared;
3. a replay selector has zero or multiple resolutions;
4. a default/inheritance/source-order decision is unresolved;
5. dynamic dispatch, reflection, callback, or native dependency escapes the declared rules graph;
6. PRNG algorithm, stream initialization, or draw ordering is unspecified;
7. a required geometry/power/hurtbox reference is unresolved;
8. recomputed `gameDataChecksum` differs, even though equality alone grants no compatibility;
9. a member is marked optional but a reachable rule reads it.

Never substitute zero, current-patch data, closest name/ID, host collection order, host floating-point shortcut, or guessed mode rule. Report the logical member ID, expected/actual hash, selecting replay field, and dependency edge without exposing personal replay data.

## Privacy and licensing

- SWF/SWZ/ABC, decrypted entries, raw replays, bulk tables, and player/account fields remain ignored and user-owned. None are committed by this work.
- The committed artifact contains hashes, category inventory, method/config identifiers, formulas, and a focused analysis command only.
- A normalized proprietary table may still be a derivative bulk asset and must not be committed. Publish schemas, hashes, counts, and tiny synthetic fixtures instead.
- Replay hashes are provenance identifiers. Names, Brawlhalla IDs, source filenames, timestamps, and local paths are excluded.
- The provenance command requires users to supply lawful local inputs and does not decrypt or export archives.

## Ticket-ready residual questions

### 1. Close random-seed and PRNG streams

- **Question:** What exact PRNG object(s), algorithm, seed transformation, stream split, initialization tick, and draw order consume state-3 word 0?
- **Starting evidence:** ABC `9fe9…ba2d`; replay writer/reader methods 6518/6510; 12 fixtures have distinct state-3 first words. The field name remains inferred.
- **Required evidence:** Unique dataflow from reader-restored word through PRNG construction/state writes, all random consumers for spawn/item/mode/bot behavior, and controlled output for known seeds.
- **Acceptance:** Publish algorithm/state width, unsigned coercions, initialization order, stream ownership, draw ordering, reset behavior, and focused known-answer tests for every reachable stream.

### 2. Prove match-init and tick executable closure

- **Question:** Which method roots and dynamic targets initialize and tick every replay-producing mode?
- **Starting evidence:** full ABC hash; unique config parsers in this report; movement provenance already proves one replay-input-to-jump path, but not the whole match graph.
- **Required evidence:** Call/property/callback graph from replay load through entity/world/mode construction and each tick, including class/script initializers, virtual resolution, exceptions, and native calls.
- **Acceptance:** Deletion-tested closed graph with method semantic hashes and no unresolved dispatch/reflection edge for every enumerated mode family.

### 3. Close level ID, map load, and platform collision geometry

- **Question:** How does replay `levelId` resolve to `LevelType`, a specific `Dynamic.swz` `LevelDesc`, and every collision primitive, especially `Platform InstanceName` geometry?
- **Starting evidence:** reader method 6510 uses restored `LevelType`; script-279 method 5156 uniquely contains `CameraBounds`, `HardCollision`, `SoftCollision`, `Respawn`; Dynamic archive has 120 `LevelDesc` roots.
- **Required evidence:** ID-to-LevelName/file mapping, loader order/defaults, coordinate units/transforms, platform asset dimension source, one-way/hard/soft rules, moving geometry, KO/camera/spawn bounds, and all referenced asset hashes.
- **Acceptance:** Every build-10.09 LevelType resolves uniquely to normalized collision/spawn geometry and controlled collision tests match reference behavior without an undeclared asset read.

### 4. Locate offensive hitbox placement and timing

- **Question:** Where are per-frame offensive hitbox transforms and active windows sourced?
- **Starting evidence:** `PowerTypes` SHA `715468…3f27` includes `CastTime` and `Hurtbox`; `HurtboxTypes` SHA `358aac…3333` supplies size records; current local evidence does not locate placement.
- **Required evidence:** Static dataflow from power execution to hitbox creation/transform, including any SWF timeline/symbol/bone reads and their exact hashes.
- **Acceptance:** For every reachable power phase, normalize active ticks, shape, offset, facing/scale transform, target filters, and arbitration order, with focused reference traces.

### 5. Prove loader normalization and defaults

- **Question:** What exact AIR XML and game-delimited grammar, template inheritance, duplicate policy, numeric coercion, and registry insertion order do the parser methods implement?
- **Starting evidence:** unique parser methods and exact source entry hashes in this report; some extracted XML is not accepted by a generic strict XML parser, proving generic-tool equivalence cannot be assumed.
- **Required evidence:** Instruction-level traces for loader helpers and representative absent/empty/sentinel/template/duplicate/numeric cases.
- **Acceptance:** A canonical normalizer reproduces loader objects field-for-field on all relevant entries, has mutation tests for every default branch, and produces stable leaf hashes.

### 6. Enumerate all replay-producing mode families

- **Question:** Which `GameModeTypes`, `ScoringTypes`, variations, teams/rounds/waves, bots, handicaps, and special timestamp-origin branches can produce format 268?
- **Starting evidence:** GameMode parser 3732, Scoring parser 7279, authentic corpus covers only four-human online timed FFA.
- **Required evidence:** Registry reachability plus authentic or instrumented fixture for each reachable branch, including bots and multi-loadout modes.
- **Acceptance:** Mode matrix maps replay settings to init/tick roots, required datasets, timestamp origin, PRNG streams, and end/scoring behavior with no unclassified producer.

### 7. Specify AVM2/AIR native numeric semantics

- **Question:** Which VM/native behaviors can change deterministic state compared with JavaScript or another host runtime?
- **Starting evidence:** checksum already depends on `multiply_i`, `add_i`, `convert_u`, `%`, `Math.round`, array order, and property coercion; ABC is `9fe9…ba2d`.
- **Required evidence:** Inventory of reachable coercion/arithmetic/Math/XML/ByteArray/collection/native operations and known-answer differential tests against the pinned AIR runtime.
- **Acceptance:** Versioned `avm2-air-10.09-v1` profile with explicit semantics and differential tests for every reachable operation.

### 8. Decide `Init.swz`, graphics, bones, and animation membership

- **Question:** Are startup or visual assets read by match behavior, collision, power swaps, or hitbox transforms?
- **Starting evidence:** `Init.swz` hash above; `PowerSwapTypes` parser 6264; unresolved platform/offensive geometry.
- **Required evidence:** Negative read-reachability proof or positive dataflow for every candidate asset family.
- **Acceptance:** Each family is classified required, optional, or oracle-only with a dependency edge and hash boundary; required families have complete manifests.

### 9. Prove minimality and sufficiency of the closure manifest

- **Question:** After residual traces close, is every member necessary and is the set sufficient?
- **Starting evidence:** schema candidate and source/parser/checksum identities in this report.
- **Required evidence:** Automated member deletion/mutation tests over the enumerated mode matrix plus deterministic replay-to-state differential oracles.
- **Acceptance:** Removing/mutating each required member causes a classified init failure or behavior divergence; removing every optional/oracle member does not; all fixtures initialize and simulate without undeclared reads.

## Newly specifiable follow-up tickets

1. **Implement a privacy-safe format-268 `gameDataChecksum` verifier.** The exact formula, arithmetic, writer inputs, and reader behavior are now proven. It must preserve generic bitset words, packed weapon word, loadout order, and all three handicap words.
2. **Define closure-manifest schema 1 and a fail-closed validator.** Implement structure/hash validation only; do not claim behavior completeness until issue #4 residuals close.
3. **Build method/dataset dependency graph extraction.** Start with the unique parser methods in this report and emit identifiers/hashes/edges, not decompiled proprietary bodies.
4. **Specify canonical numeric/data encoding.** Gate implementation on the loader-normalization ticket, particularly AIR XML/delimited and binary64 semantics.

Issue #4 remains open: checksum semantics are resolved, but complete initialization and behavior closure are not.
