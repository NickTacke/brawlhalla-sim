# Replay-writer eligibility for Brawlhalla 10.09.96325

Issue: [Prove replay-writer eligibility across match configurations and lifecycle exits](https://github.com/NickTacke/brawlhalla-sim/issues/18)

## Decision summary

Only one normalized configuration and lifecycle class has direct corpus proof of a structurally valid format-268 replay:

```text
origin              = online playlist
playlistId          = 108
settings             = flags 0, maxPlayers 4, duration 180, roundDuration 0,
                       startingLives 0, scoringTypeId 1, scoreToWin 0,
                       gameSpeed 100, damageMultiplier 100, levelSetId 2,
                       itemSpawnRuleSetId 2, weaponSpawnRateId 2,
                       gadgetSpawnRateId 4, customGadgetSelection 0, variation 0
roster               = 4 human entities, no bots, one hero per entity,
                       non-team/FFA shape
lifecycle            = completed timed match
serialized structure = format 268, Header, GameData, 1-3 Results sections,
                       KO faces, per-entity input streams, End
```

Twelve authentic files independently attest that cell. The corrected static proof establishes that candidate method 6524 has no proven mode or configuration eligibility guard beyond candidate-state existence and save-in-progress suppression. Its unresolved masks control finalization or other side effects, not entry to the common path/file/writer sequence.

That correction does not prove any additional matrix cell. Upstream sites matching method 3442's property QName, their runtime dispatch and receiver-state preconditions, and downstream native serializer/filesystem completion remain unresolved. No available primary evidence proves emission for custom online, local, training, bots, team modes, Relay, Scramble, Shift, disconnect, forfeit, host quit, rematch, or abort. Every non-corpus configuration and lifecycle cell therefore remains unavailable or unproven rather than negative.

## Scope, provenance, and evidence grades

Target: official build `10.09.96325`, replay format 268. The executable anchor is tag-72 `main.abc`, SHA-256 `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d`. The same digest is recorded independently in the replay manifest and the oracle decision. [ABC][C][O]

This investigation used no live-client capture. It reports no player identifiers, private filenames, replay contents, proprietary strings, obfuscated identifiers, decrypted bulk data, or private absolute paths.

Evidence grades:

- **Proven**: directly observed in the 12-file authentic corpus, or a structural branch/check directly implemented by the reviewed parser or verified in the hash-pinned ABC.
- **Strongly indicated**: static control flow reported by analysis of the hash-pinned ABC, but with unresolved native targets, dynamic dispatch, receiver preconditions, or caller meaning.
- **Unproven**: representation or shipped vocabulary exists, but writer reachability and completed emission are not attested.
- **Unavailable (T3)**: answering reliably requires interpreted lifecycle execution or an equivalent reviewed runtime trace. The selected oracle has not booted the target and has produced no trustworthy trace. [O]

The prior taxonomy is incorporated by reference rather than duplicated. It establishes 164 non-template presets, 24 scoring families, four custom-game profiles, team/bot/multi-hero representation, and the normalized 15-word settings tuple. It explicitly does not prove writer eligibility. [T][I2]

## Normalized eligibility matrix

“Valid structure” means a format-268 envelope accepted by the repository parser with Header, GameData, at least one Results section, and End. Parser acceptance is structural evidence, not proof that the reference writer emitted an arbitrary synthetic tuple. [P]

| Category | Normalized discriminator | Guard pass | Valid format-268 emission | Grade | Primary evidence and implementation rule |
| --- | --- | --- | --- | --- | --- |
| Playlist | `playlistId=108`, online, exact settings and roster in summary | Unknown for method 6524 | Yes, 12/12 | **Proven emission** | Authentic aggregate manifest proves completed files, not candidate-chain invocation or state. Static analysis adds no mode allowlist. [C][ABC] |
| Other playlists | nonzero `playlistId`; playlist display field present | No mode/configuration guard proven in 6524; upstream reachability unknown | Unknown | **Unproven** | Format branch represents nonzero playlist IDs; no other playlist is in the cohort, upstream receiver/dispatch conditions are unresolved, and native completion is open. [P][T][ABC] |
| Custom online | `playlistId=0`, `onlineGame=true`, normalized settings | No mode/configuration guard proven in 6524; upstream reachability unknown | Unknown | **Unproven** | Header can represent this origin and shipped custom profiles exist; no emitted sample or upstream closure exists. [P][T][ABC] |
| Local/couch | `playlistId=0`, `onlineGame=false`, normalized settings | No mode/configuration guard proven in 6524; upstream reachability unknown | Unknown | **Unproven** | Representable header branch only. Upstream QName-cross-reference meaning, runtime dispatch, and receiver preconditions remain unresolved. [P][T][ABC] |
| Training/practice | training scoring/preset plus local/online origin | No mode/configuration guard proven in 6524; upstream reachability unknown | Unknown | **Unproven** | One shipped training preset exists and its scoring definition is declaratively disabled. Neither fact determines upstream save reachability or native completion. [T][ABC] |
| Human with bots | one or more entities with bot flag set | No mode/configuration guard proven in 6524; upstream reachability unknown | Unknown | **Unproven** | Entity encoding and custom profiles represent bots; corpus bot count is zero. [P][C][T][ABC] |
| Bot-only | all entities bot-flagged | No mode/configuration guard proven in 6524; upstream reachability unknown | Unknown | **Unproven** | Structurally representable within parser bounds, but no source proves upstream invocation or completed writing. [P][ABC] |
| Team modes | repeated team membership rather than FFA labels | No mode/configuration guard proven in 6524; upstream reachability unknown | Unknown | **Unproven** | Team field and 74 shipped team presets exist; corpus has only FFA shape. [P][C][T][ABC] |
| Relay | variation preset and multi-hero roster | No mode/configuration guard proven in 6524; upstream reachability unknown | Unknown | **Unproven** | Nine shipped Relay presets and hero count 1-5 representation; corpus variation 0, hero count 1. [P][T][C][ABC] |
| Scramble | variation preset and multi-hero roster | No mode/configuration guard proven in 6524; upstream reachability unknown | Unknown | **Unproven** | Six shipped Scramble presets and multi-hero representation only. [P][T][ABC] |
| Shift | variation preset and multi-hero roster | No mode/configuration guard proven in 6524; upstream reachability unknown | Unknown | **Unproven** | Five shipped Shift presets and multi-hero representation only. [P][T][ABC] |
| Other shipped scoring families | normalized settings from remaining preset families | No mode/configuration guard proven in 6524; upstream reachability unknown | Unknown | **Unproven** | Table membership proves vocabulary, not runtime dispatch through the method-3442 QName cross-references or native completion. [T][I2][ABC] |
| Off-preset custom tuple | arbitrary client-accepted values in 15 words | No mode/configuration guard proven in 6524; upstream reachability unknown | Unknown | **Unproven** | The format can encode 32-bit words, but client validation, upstream reachability, and completed writing are unresolved. [P][T][ABC] |

### Required consumer behavior

The Wayfinder map and simulator must not convert this matrix into a playlist or preset allowlist. A supported replay remains an authentic, structurally valid format-268 replay consistent with the patch snapshot. Dispatch must use the serialized origin, 15 settings words, level, roster/hero shape, result sections, and inputs. Unknown matrix cells are coverage obligations, not rejection rules. [T][I2]

## Lifecycle-exit matrix

| Exit | Writer attempt/reachability | Structurally valid emission | Grade | Evidence and exact boundary |
| --- | --- | --- | --- | --- |
| Normal completion | Reached for the attested configuration | Yes, 12 files | **Proven** | Each authentic replay has at least one Results section, full timed length, inputs, and End. Static analysis does not identify which method-3442 QName cross-reference, if any, dispatches on completion. [C][ABC] |
| Disconnect | Unknown | Unknown | **Unavailable (T3)** | `connectionTime` and truncated entity input are representable, but there is no replay-level disconnect outcome or labeled sample. The 24 methods containing matching method-3442 QName cross-references have unresolved lifecycle meanings, runtime dispatch, and receiver preconditions. [P][O][ABC] |
| Forfeit | Unknown | Unknown | **Unavailable (T3)** | No labeled sample, outcome tag, or semantically identified runtime path through a method-3442 QName cross-reference. [P][O][ABC] |
| Host quit | Unknown | Unknown | **Unavailable (T3)** | No labeled sample or resolved host/controller ownership and dispatch path through a method-3442 QName cross-reference. [O][ABC] |
| Rematch | Unknown | Unknown | **Unavailable (T3)** | Files with 1, 2, and 3 Results sections are proven, but interpreting repeated Results as rematches is unsupported. [C][O] |
| Abort before Results | Unknown save/delete behavior | No, if the file lacks Results | **Proven structural rejection; emission unknown** | Parser rejects a replay with zero Results and explicitly rejects state 8. Whether the client invokes 3442/6524, writes, marks invalid, deletes, or never creates an abort file is unavailable. [P][O][ABC] |
| Abort after Results | Unknown | Potentially representable, not attested | **Unavailable (T3)** | Structural validity depends on the actual emitted sections; no labeled lifecycle evidence or resolved caller meaning exists. [P][O][ABC] |

A disconnect, forfeit, or host quit that happens to leave a parseable file would not by itself identify its lifecycle cause because format 268 has no parsed exit-reason field. Labeled provenance or authenticated method/byte-PC lifecycle traces are required.

## Static call and guard proof

### Verified candidate discovery

The executable evidence is pinned to SHA-256 `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d`. Lexical discovery finds replay-path literals in methods 6510 and 6524. The writer-oriented scanner reports delete-file candidates 2559, 2602, and 2603, and method 6524 as the only replay-path-literal candidate. These results are candidate discovery only. They do not establish call semantics, deletion behavior, or writer completion. [ABC][A1][A2]

### Proven control flow in method 6524

Method 6524 contains 1,162 code bytes and 524 instructions. It has two early returns and one terminal return:

1. A null candidate state returns at PC 79. The branch at PC 75 continues to PC 80 when the state is non-null.
2. A truthy save-in-progress state returns at PC 90. The branch at PC 86 continues to PC 91 when that state is false.
3. No additional return occurs between PC 91 and the terminal return at PC 1161.

Branch PC 98 may jump to PC 526 and bypass mask-controlled finalization, but both paths continue to common path/file/writer logic. Every later mask branch also rejoins before that writer sequence. The observed masks are `2`, `4`, `16`, `32`, `1024`, `2048`, `8192`, `32768`, `262144`, `524288`, and `4194304`.

Therefore, the unresolved masks are finalization or side-effect controls, not replay-writer eligibility guards within method 6524. Method 6524 contains no proven mode or configuration eligibility guard beyond candidate-state existence and save-in-progress suppression. Publishing a mode mapping for any mask would still exceed the evidence. [ABC]

Candidate downstream native calls occur at PCs 1103 (two arguments), 1125 (one argument), and 1136 (zero arguments). None resolves to an ABC trait definition. On normal completion, all three calls precede the candidate save-in-progress assignment at PC 1158. A typed exception handler protects PCs 943 through 1140 and targets PC 1145, so a matching exception can bypass one or more later native calls and still reach the flag assignment and terminal return. This ordering supports a save-attempt interpretation, but does not prove native serialization, filesystem success, close, rename, exception disposition, or final file disposition. [ABC]

### QName cross-references and unresolved upstream closure

Method 3442 PC 204 is the sole property-call QName cross-reference statically associated with method 6524. Method 3442 checks a receiver or candidate value at PC 194. The null branch goes to PC 208 and skips the call site; otherwise execution reaches the property call at PC 204. No earlier branch crosses PC 204. Because property calls are late-bound and neither owner is proven final, runtime dispatch to method 6524 remains unresolved. [ABC]

The property QName associated with method 3442 has 27 matching call-site cross-references across 24 unique methods: 3212, 3218, 3231, 3265, 3266, 3270, 3301, 3328 (four sites), 3433, 3434, 3435, 3436, 5228, 5230, 5231, 5255, 5264, 5268, 7322, 7328, 9313, 9445, 11238, and 12806. These are candidate late-bound invocations, not proven direct calls. Their lifecycle meanings, runtime receiver types, and receiver-state preconditions remain unresolved. Dynamic-dispatch completeness is not proven. [ABC]

The static result is consequently narrow: if runtime dispatch enters method 6524 with a non-null candidate and no save already in progress, no internal mask is proven to suppress the common writer sequence. It does not establish that any non-corpus configuration or lifecycle exit dispatches through the upstream cross-references with the required receiver state, nor that the downstream native sequence completes a file.

### Why this is not a completed static eligibility proof

The ignored `find_replay.ts` and `find_replay_write.ts` utilities are lexical scanners over disassembled operands. They find candidates but do not:

- verify the ABC digest before analysis;
- emit byte-PC-addressed control-flow graphs;
- resolve dynamic or virtual dispatch completely;
- resolve runtime dispatch, lifecycle semantics, or receiver-state preconditions for method-3442 QName cross-references;
- resolve the native calls at PCs 1103, 1125, and 1136;
- prove serializer/filesystem success, close, rename, deletion, or exception handling; or
- distinguish normal completion, disconnect, forfeit, host quit, rematch, and abort callers.

They also embed a transient input location, so they are not portable reproducers as written. Their output can seed analysis but cannot promote unknown matrix cells to proven. [A1][A2]

A provenance-grade static closure must fail closed on the ABC hash, decode all method bodies with byte-PC branch targets and exception ranges, preserve the corrected rejoin proof, produce a QName cross-reference graph with an explicit runtime-dispatch uncertainty ledger, resolve upstream site meanings and receiver preconditions, and identify native serializer/filesystem completion and file-disposition paths. No such committed closure report is available.

## Corpus evidence

The privacy-reduced manifest attests: [C]

- 12 fixtures, 12 unique hashes, 275,166 aggregate bytes;
- format 268 and the same build-cohort ABC/SWZ digests;
- one playlist ID, one settings tuple, online true for every fixture;
- four entities per file, four humans, zero bots, FFA team-label shape;
- variation 0 and one hero per entity;
- 11 distinct level IDs;
- 1-3 Results sections, with all recorded result lengths 186,016 ms;
- nonempty KO and input structures, including 49,874 aggregate input snapshots.

The repository parser structurally validates format 268 through the format-264 layout plus the added player-ID word. It requires Header, GameData, and at least one Results section; allows hero count 1-5; represents bot/team/origin fields; rejects unknown states and state 8; and validates input ordering/alignment. [P]

This corpus proves production only for its one normalized configuration. Level diversity demonstrates multiple levels within that cell, not another mode or lifecycle class. Repeated Results sections demonstrate encoding, not rematch semantics.

## Explicit unknowns and unavailable evidence

1. **Upstream configuration reachability:** method 6524 has no proven internal mode/configuration eligibility guard after its two early exits, but it is unknown which configurations dispatch through the upstream QName cross-references and satisfy their receiver-state preconditions.
2. **Lifecycle site semantics:** the 27 matching sites across 24 methods have not been mapped to completion, disconnect, forfeit, host quit, rematch, or abort.
3. **Dynamic-dispatch closure:** QName cross-references do not prove their runtime targets or that all dynamic or virtual routes have been enumerated.
4. **Writer completion:** native calls at PCs 1103, 1125, and 1136 do not resolve to ABC trait definitions, so serializer/filesystem success and failure handling remain open.
5. **Mask semantics:** the masks are proven not to gate the common writer sequence within 6524, but their finalization and side-effect meanings remain unresolved.
6. **File disposition:** delete candidates are lexical discoveries only; successful close, rename, cleanup, deletion, and exception outcomes are unproven.
7. **Playlist universe:** only playlist 108 is observed; a complete historical server playlist table is absent.
8. **Custom acceptance:** valid off-preset combinations and UI/cross-field validation are unknown.
9. **Exit labels:** replay format 268 exposes no parsed exit-reason discriminator, so unlabeled files cannot prove disconnect, forfeit, host quit, or rematch.
10. **T3 runtime:** the selected interpreted oracle is a planning decision only. No target boot, match initialization, trustworthy trace, or T3 corpus execution exists. [O][I5]
11. **Negative claims:** absence from 12 files does not prove suppression. No named category should be marked ineligible from current evidence.

Live-client capture is intentionally not a remedy.

## Decision implications for the Wayfinder map

1. **Close issue 18 only as a bounded evidence decision, not exhaustive eligibility closure.** The answer is one corpus-proven positive cell, many explicit unknowns, and one structural negative (zero Results is not a supported replay).
2. **Record the corrected static result precisely.** Method 6524 has only candidate-existence and save-in-progress eligibility suppression. Its masks do not justify a configuration allowlist or denylist.
3. **Do not promote non-corpus cells.** Upstream QName-cross-reference semantics, runtime dispatch and receiver preconditions, and native writer completion remain necessary for every configuration and lifecycle claim.
4. **Do not block parser/simulator intake on this matrix.** Accept authentic format-268 inputs consistent with the patch snapshot, then dispatch by normalized serialized data. Do not hard-code playlist 108 or the 164 presets as the supported universe.
5. **Treat writer eligibility as conformance coverage metadata.** Proven cells can enter baseline coverage. Unknown cells require labeled provenance before becoming mandatory positive or negative tests.
6. **Keep T3 claims separate.** Static writer reachability cannot substitute for interpreted gameplay correctness; absent T3, no lifecycle runtime result can be called a reviewed-corpus interpreted reference.
7. **Preserve fail-closed language.** “Representable,” “shipped,” “candidate native call,” and “completed emitted file” are different claims.

## Newly sharp follow-up decision tickets

These are narrower than repeating issue 18:

1. **Resolve upstream replay-save reachability and lifecycle semantics.** Input: the pinned ABC hash and the 27 matching method-3442 QName cross-references across 24 methods. Output: runtime dispatch, receiver-state preconditions, configuration and lifecycle meanings for completion, disconnect, forfeit, host quit, rematch, and abort, plus a dynamic-dispatch completeness ledger. Acceptance: each site is mapped or explicitly unknown using the authenticated non-live method/byte-PC evidence and privacy boundary already selected by the interpreted-reference-oracle decision; no non-corpus cell is promoted from method-6524 control flow alone.
2. **Close the native writer and file-disposition sequence.** Input: method 6524 native call sites at PCs 1103, 1125, and 1136, its typed exception path, and the lexical delete candidates. Output: serializer/filesystem target resolution, success/failure/exception paths, close/rename behavior, and deletion disposition. Acceptance: a completed file outcome is proven or explicitly left unknown without treating lexical candidates as semantics.

Do not open separate tickets for the already-decided instrumentation/privacy contract, shipped-preset enumeration, or corpus coverage model. Those belong to the interpreted-reference-oracle decision, prior taxonomy, and conformance-corpus coverage decision respectively. Corpus acquisition is implementation work outside this planning map. [T][I2][O]

## Reproduction and review notes

Safe commands for an environment with the ignored evidence available:

```bash
shasum -a 256 artifacts/research/brawlhalla-physics/main.abc
bun artifacts/research/brawlhalla-physics/brawlhalla-swz/find_replay.ts
bun artifacts/research/brawlhalla-physics/brawlhalla-swz/find_replay_write.ts
bun test packages/replay-format/tests/parser268.test.ts
```

Fail closed unless the digest is exactly `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d`. The two scanners require their input argument or path handling to be corrected before their output is reproducible. Even after correction, use them only to reproduce lexical candidate discovery: replay-path literals in methods 6510 and 6524; delete-file candidates 2559, 2602, and 2603; and method 6524 as the writer scanner’s only replay-path-literal candidate.

The scanners do not reproduce the byte-PC control-flow, direct-call-site, caller-count, or native-resolution findings. Reproducing those findings requires a hash-checking ABC decoder that reports instruction counts, byte-PC branch targets, return sites, trait-resolved calls, unresolved native targets, and dynamic-dispatch uncertainty. Until that analyzer and its output are reviewed, the enumerated static facts are verified evidence inputs, not a portable committed reproduction.

A review must verify the following invariants against the pinned artifact:

- method 6524 has 1,162 code bytes, 524 instructions, early returns at PCs 79 and 90, no additional return between PC 91 and the terminal return at PC 1161;
- PC 98 may bypass finalization by branching to PC 526, but all mask-controlled paths rejoin before the common path/file/writer sequence;
- candidate native calls occur at PCs 1103, 1125, and 1136 with argument counts 2, 1, and 0, and none resolves to an ABC trait definition;
- the typed exception range from PCs 943 through 1140 targets PC 1145 and may bypass later native calls before the flag assignment at PC 1158;
- method 3442 PC 204 is the sole property-call QName cross-reference statically associated with 6524; its PC-194 null branch skips that site at PC 208; and
- method 3442's property QName has 27 matching call-site cross-references across the 24 methods listed above, without proving runtime dispatch.

Finally, verify that only this research asset changed and that no ignored or private artifact is staged.

## Sources

- **[ABC]** Ignored official-build executable artifact: `../brawlhalla-physics/main.abc`, SHA-256 `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d`.
- **[A1]** Ignored lexical scanner: `../brawlhalla-physics/brawlhalla-swz/find_replay.ts`.
- **[A2]** Ignored writer lexical scanner: `../brawlhalla-physics/brawlhalla-swz/find_replay_write.ts`.
- **[C]** Ignored privacy-reduced replay manifest: `../../replay-corpus/10.09.96325/manifest.json`.
- **[P]** [Format parser at repository commit 1492832](https://github.com/NickTacke/brawlhalla-sim/blob/14928327bbe24e3b3ae202cd25be1c97fa5d5ff0/packages/replay-format/src/parser264.ts).
- **[T]** [Prior replay-producing match taxonomy at commit da6b4f0](https://github.com/NickTacke/brawlhalla-sim/blob/da6b4f09260205d15b19cf3924777e0ed3a7ee03/research/wayfinder/replay-producing-match-universe.md).
- **[O]** [Interpreted reference oracle decision at commit 2977064](https://github.com/NickTacke/brawlhalla-sim/blob/29770640d30558a6bb6a25229253f2bc46d9ac92/artifacts/research/interpreted-reference-oracle/interpreted-reference-oracle.md).
- **[I2]** [Issue 2 reviewed resolution](https://github.com/NickTacke/brawlhalla-sim/issues/2#issuecomment-5184515260).
- **[I5]** [Issue 5 reviewed resolution](https://github.com/NickTacke/brawlhalla-sim/issues/5#issuecomment-5186339961).
- **[I18]** [Issue 18](https://github.com/NickTacke/brawlhalla-sim/issues/18).

[ABC]: #sources
[A1]: #sources
[A2]: #sources
[C]: #sources
[P]: #sources
[T]: #sources
[O]: #sources
[I2]: #sources
[I5]: #sources
[I18]: #sources
