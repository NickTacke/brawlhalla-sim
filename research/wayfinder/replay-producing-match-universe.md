# Replay-producing match universe for Brawlhalla 10.09.96325

## Concise answer

The finite universe is **not** a finite list of playlist names. In build
`10.09.96325`, a replay identifies a match by a serialized configuration tuple:
origin (`playlistId`, optional playlist display key, online/offline), 15
game-setting words, level, roster, one to five heroes per roster entry, one or
more result records, face events, and per-entity inputs. It does not serialize a
`GameModeID` or `CustomGameID`. The shipped rules provide 164 non-template
game-mode presets across 24 non-template scoring families, four non-template
custom-game profiles, team and non-team layouts, 1-8 preset player caps, and
Relay, Scramble, and Shift variations. Those tables bound the shipped preset
vocabulary, but custom settings can produce additional tuples.
[S1][S3][S4][S5][S7]

Only one slice has direct production evidence in the available corpus: 12
authentic format-268 files, all online playlist 108, timed four-player FFA, four
humans, no bots, no variation, with one to three result sections. No primary
source inspected proves that every shipped preset reaches the replay writer, or
exactly how disconnect, forfeit, abort, training, bot-only, and multi-round
lifecycle paths pass its guards. Therefore this note is a **taxonomy and
coverage ledger**, not a claim that all 164 presets are replay-producing.
[S6][S8]

## Scope and evidence grades

This note uses the repository's grades: **proven** for control/dataflow or an
authentic replay observation, **source-derived** for a shipped declarative rule,
and **unknown** where no qualifying evidence resolves behavior. [S2]

The target is the reference game, official Brawlhalla build `10.09.96325`. [S1]
No binary, decrypted file, or replay is copied here. Counts and names below are
small derived facts needed to state the taxonomy.

## Taxonomy

### 1. Replay identity and origin: proven representation

A structurally supported replay has this outer match identity:

```text
(formatVersion = 268,
 randomSeed,
 playlistId,
 playlistName iff playlistId != 0,
 onlineGame)
```

The parser then requires at least one header, game-data section, and result
section; state 8 is explicitly invalid. [S7]

Consequences:

- **Playlist match:** represented by nonzero `playlistId` plus a string. The
  available corpus proves playlist 108 and the display key
  `PlaylistType_FreeForAll_DisplayName`. [S7][S8]
- **Non-playlist/custom/local match:** the format reserves `playlistId == 0`,
  omits the playlist string, and separately records `onlineGame`. This is proven
  as a format branch, not proven as an emitted 10.09 file in the corpus. [S7]
- **No serialized preset identity:** neither `GameModeID` nor `CustomGameID`
  appears in the parsed record. Presets must be normalized into settings before
  or while recording. [S7]
- **Playlist universe unknown:** no `PlaylistTypes`/`PlaylistID` table exists in
  the inspected shipped XML snapshot. Playlist 108 is observed, but a complete
  historical 10.09 server playlist manifest was not available. [S8]

### 2. Normalized match configuration: proven representation

The replay stores these 15 unsigned game-setting fields, followed by `levelId`:
[S7]

1. `flags`
2. `maxPlayers`
3. `duration`
4. `roundDuration`
5. `startingLives`
6. `scoringTypeId`
7. `scoreToWin`
8. `gameSpeed`
9. `damageMultiplier`
10. `levelSetId`
11. `itemSpawnRuleSetId`
12. `weaponSpawnRateId`
13. `gadgetSpawnRateId`
14. `customGadgetSelection`
15. `variation`

This tuple, not a UI queue label, is the simulator-relevant match taxonomy. Each
field is serialized as 32 bits, so the representable configuration space is
finite. The client-accepted subset of those integer combinations is not
established by the replay parser or the shipped preset table. [S7]

### 3. Shipped game-mode presets: source-derived vocabulary

`Game.swz.17.xml` contains 165 `GameModeType` records: one template and **164
non-template presets**. Their complete high-level partition is: [S3]

| Scoring family | Presets | Scoring family | Presets |
| -------------- | ------: | -------------- | ------: |
| STOCK          |      49 | TIMED          |      27 |
| SNOWBALL       |      12 | SOCCER         |       7 |
| VOLLEY_BATTLE  |       7 | BRAWLBALL      |       6 |
| STREET_BRAWL   |       6 | TABLETOP       |       6 |
| TAG            |       5 | CREWBATTLE     |       5 |
| BOUNTY_V2      |       5 | BOMBSKETBALL   |       4 |
| ODDBRAWL       |       4 | CTF            |       3 |
| COLORPLATFORMS |       3 | VOLLEYBALL     |       2 |
| RICOCHETTIMED  |       2 | HORDE          |       2 |
| BUDDY          |       2 | RING           |       2 |
| ZOMBIE         |       2 | TRAINING       |       1 |
| RICOCHET       |       1 | CATCHBOMBS     |       1 |

Preset dimensions are finite:

- Team declaration: 74 team presets, 89 non-team presets, and one preset without
  an explicit `Teams` value. [S3]
- `MaxPlayers`: preset values are 1, 2, 3, 4, 6, or 8; 8 is the largest shipped
  preset value. [S3]
- Variation: 144 have none, 9 Relay, 6 Scramble, and 5 Shift. [S3]
- Round timers occur on Brawlball (30 or 45 seconds) and Tag (90 seconds)
  presets. Other presets omit `RoundDuration`. [S3]
- Presets cover timed, stock, points, rounds, waves, fixed-stamina,
  objective-item, multi-entity Buddy, and training rule shapes through their
  scoring definitions. [S3][S4]

These are **candidate normalized configurations**, not 164 proven replay
producers. Seasonal/BOTW/ranked/default/training names coexist in the same
shipped table, and table presence does not prove UI availability or save-path
eligibility.

### 4. Scoring families: source-derived vocabulary

`Game.swz.43.xml` contains one template and these **24 non-template scoring
definitions**: [S4]

- Enabled in the table: TIMED, STOCK, BRAWLBALL, BOMBSKETBALL, RICOCHET,
  VOLLEYBALL, SNOWBALL, CTF, SOCCER, HORDE, BUDDY, RING, TAG, ZOMBIE,
  CREWBATTLE, STREET_BRAWL, BOUNTY_V2, TABLETOP, VOLLEY_BATTLE, ODDBRAWL.
- Marked disabled but referenced by shipped presets: CATCHBOMBS, COLORPLATFORMS,
  RICOCHETTIMED, TRAINING.

`Enabled=False` is not evidence that a mode cannot produce a replay: each of the
four disabled scoring definitions has a shipped default or practice preset. It
only proves the declarative flag value. [S3][S4]

### 5. Custom games: source-derived profiles, unknown coverage

`Game.swz.10.xml` contains one template and four custom-game profiles: [S5]

- `Default` (enabled): allows bots and challenge stance; does not force one
  preset.
- `Circuit1v1` (enabled): forces `DefaultBCX1v1`, minimum two players,
  tournament constraints.
- `Circuit2v2` (enabled): forces `DefaultBCX2v2`, minimum four players,
  tournament constraints.
- `PaxPressBrawlball` (disabled): forces `Brawlball3v3`, allows bots, minimum
  six players.

The `Default` profile plus the 15 serialized settings establishes a
custom-settings branch beyond the 164 presets. Exact UI ranges and cross-field
validation were not recovered, so the valid custom tuple set cannot be
enumerated from these three tables alone. [S5][S7]

### 6. Roster, teams, bots, and rotating heroes: proven representation

Each replay entity stores an entity ID, player ID in format 268, name, team,
`connectionTime`, cosmetics/loadout, one or more heroes, bot flag, and optional
handicaps. `heroCount` is match-wide; the parser accepts 1-5. [S7]

This proves that the format can represent:

- team and non-team rosters;
- human and bot entities (`isBot`, `spawnBotId`);
- multiple heroes per entity for Relay/Scramble/Shift-like modes;
- a connection-time value and per-entity input stream.

It does **not** prove that every combination is emitted. The 12-file 10.09
corpus contains only four-human, four-team-label, one-hero entities with four
input streams and no bots. [S8]

### 7. Results and multi-round structure: proven representation and narrow observation

A replay may contain multiple result sections. Each result stores match length,
optional entity-score entries, and an end-of-match fanfare ID. The parser
requires at least one result but imposes no one-result-only rule. [S7]

The corpus proves files with **one, two, and three result sections**. All
observed sections came from the same timed FFA settings; the corpus does not
prove which game lifecycle concept caused repeated results. Treating each
section as a distinct round is therefore an unproven interpretation. [S8]

### 8. Save lifecycle: proven control-flow skeleton, unresolved guards

In the hash-verified ABC, match teardown method 3442 in class 164 calls method
6524 in class 357 before clearing broad match state. Method 6524: [S6]

1. returns if no current match object exists;
2. returns if its save-in-progress flag is already set;
3. evaluates several match-state bitmask and mode-state guards;
4. finalizes match/result state;
5. constructs a unique `[10.09] <level>.replay` path; and
6. calls the downstream replay writer, then sets the save-in-progress flag.

The inspected method does not branch directly on `scoringTypeId`, `variation`,
`GameModeID`, or `CustomGameID`. This supports one common finalizer across
modes, but it does **not** make every mode eligible: the meanings of its masks
(`2`, `4`, `16`, `1024`, `2048`, `8192`, `32768`, `262144`, `524288`, and
`4194304`) have not been uniquely resolved. [S6]

## Lifecycle coverage ledger

- **Normal completed online timed FFA: proven emitted.** The corpus contains 12
  authentic format-268 files for playlist 108. [S8]
- **Repeated result sections (1-3): proven encoded.** They occur in the corpus;
  their semantic cause is unknown. [S8]
- **Team match: representable, not observed here.** The format has a team field
  and the rules have 74 team presets; the corpus is FFA. [S3][S7][S8]
- **Bot participant: representable, not observed here.** Bot fields and a custom
  profile allow bots; corpus bot count is zero. [S5][S7][S8]
- **Relay / Scramble / Shift: source-derived, not observed here.** There are 20
  presets; corpus variation is zero and `heroCount` is one. [S3][S8]
- **Custom settings / local room: representable, emission unknown.** The tuple
  and `playlistId==0` branch exist; no authentic example was inspected. [S5][S7]
- **Training / practice: unknown emission.** Presets exist, but their scoring
  definitions are disabled and save masks are unresolved. [S3][S4][S6]
- **Disconnect: unknown production semantics.** The roster has `connectionTime`
  and inputs can end, but no replay-level outcome tag or labeled sample was
  found. [S7]
- **Forfeit / early surrender: unknown.** No replay-level forfeit tag or labeled
  sample was found, and save guard semantics are unresolved. [S6][S7]
- **Abort before results: proven structurally invalid for support.** The parser
  rejects missing results. Whether the client writes or deletes such a file is
  unknown. [S7]
- **Every shipped scoring/preset family: not proven.** Declarative presence is
  not a writer reachability proof. [S3][S4][S6]
- **Complete 10.09 playlist list: unknown.** No historical playlist manifest was
  found in the inspected primary sources.

## Simulator coverage implication

The safe simulator input universe is all authentic format-268 files consistent
with the patch snapshot, not a hard-coded allowlist of the 164 preset names.
Dispatch should use the serialized tuple, roster shape, and repeated result
sections. Playlist names are provenance/UI metadata, not sufficient rules.
[S1][S7]

Before claiming exhaustive replay-producing-match coverage, obtain or generate a
labeled 10.09 matrix that crosses:

1. online playlist, custom online, couch/local, training, and practice origins;
2. all 24 scoring families, including the four declaratively disabled families;
3. team/non-team, humans/bots, and 1-5 hero roster shapes;
4. no variation, Relay, Scramble, and Shift;
5. normal completion, disconnect, forfeit, host quit, rematch, and abort; and
6. one-result and repeated-result files.

For each cell, record whether a file is emitted, whether it parses as format
268, and which method-6524 guard was taken. Without that matrix or a complete
semantic deobfuscation of the save masks, “every replay-producing match” remains
an open proof obligation.

## Sources

- **[S1] Repository contract:** `CONTEXT.md`, especially reference build,
  replay-producing match, and supported replay definitions.
- **[S2] Repository evidence policy:** `CONTRIBUTING.md`, “Evidence
  requirements” and “Repository hygiene.”
- **[S3] Official-build declarative artifact:** `Game.swz.17.xml`
  (`GameModeTypes`), SHA-256
  `cdc1409bfcb84e30d76419087656c7dfe38c549e9528198adf6ba9be5f80741e`.
- **[S4] Official-build declarative artifact:** `Game.swz.43.xml`
  (`ScoringTypes`), SHA-256
  `fd9efadd2f3c6f7e844ec9c52b1f685fb15d32e936934450e36e441f3e182f7d`.
- **[S5] Official-build declarative artifact:** `Game.swz.10.xml`
  (`CustomGameTypes`), SHA-256
  `36eab628f9e28c04c8dfb533d9e940b50dee5c73c9a33f1043e61820e3c4642b`.
- **[S6] Official-build ABC:** SHA-256
  `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d`; methods
  3442 (teardown caller) and 6524 (replay finalizer). Build/hash association is
  also recorded in `docs/provenance.md`.
- **[S7] Repository replay implementation:**
  `packages/replay-format/src/types.ts`,
  `packages/replay-format/src/parser264.ts`, and
  `packages/replay-format/src/constants.ts`.
- **[S8] Local authentic 10.09 corpus:** 12 personal replay files were read in
  place and reduced to aggregate structural metadata only. All 12 parsed as
  format 268. No replay bytes, names, filenames, or bulk extracted data are
  committed.

## Reproduction

Set `ARTIFACTS` to the official-build research snapshot. These commands emit
only counts, field names, and hashes:

```bash
shasum -a 256 \
  "$ARTIFACTS/main.abc" \
  "$ARTIFACTS/decrypted/Game.swz.17.xml" \
  "$ARTIFACTS/decrypted/Game.swz.43.xml" \
  "$ARTIFACTS/decrypted/Game.swz.10.xml"

python3 - <<'PY'
import collections
import os
import xml.etree.ElementTree as ET

base = os.environ["ARTIFACTS"]
modes = ET.parse(f"{base}/decrypted/Game.swz.17.xml").getroot()
scoring = ET.parse(f"{base}/decrypted/Game.swz.43.xml").getroot()
custom = ET.parse(f"{base}/decrypted/Game.swz.10.xml").getroot()
rows = []
for node in modes:
    if node.attrib.get("GameModeName") == "Template":
        continue
    values = {child.tag: child.text or "" for child in node}
    rows.append(values)
print("non-template modes", len(rows))
partition = collections.Counter(row["ScoringType"] for row in rows)
print("scoring partition", sorted(partition.items()))
print("non-template scoring", len(scoring) - 1)
print("non-template custom", len(custom) - 1)
PY

BRAWLHALLA_REPLAY_DIR="$HOME/BrawlhallaReplays" \
  bun test packages/replay-format/tests/parser268.test.ts
```

[S1]: ../../CONTEXT.md
[S2]: ../../CONTRIBUTING.md
[S3]: #sources
[S4]: #sources
[S5]: #sources
[S6]: ../../docs/provenance.md
[S7]: ../../packages/replay-format/src/types.ts
[S8]: #sources
