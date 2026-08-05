# Replay lifecycle scenario input availability for Brawlhalla 10.09.96325

Issue: [Assemble authenticated replay lifecycle scenario inputs](https://github.com/NickTacke/brawlhalla-sim/issues/74)

## Verdict

**Issue acceptance is not met. Keep the issue open and release the session claim.**

The complete authentic input set required to publish hash-attested scenario manifests and normalized inputs is unavailable. The audited scope contains no private replay payload, lifecycle scenario manifest, normalized lifecycle input, or consent and privacy approval package for this ticket.

Prior public research reports a narrow external observation: twelve authentic format-268 files were emitted by one completed online playlist-108 timed four-human free-for-all cohort. That observation is not issue-74 coverage. Its private source manifest, consent package, and authenticated lifecycle labels were not available to this task, and it covers no other configuration family or exit.

No empty, synthetic, or placeholder coverage manifest is published. Such an artifact could be mistaken for authenticated coverage. Every issue-74 cell remains unknown.

No replay bytes, player or account data, credentials, proprietary assets, source filenames, private paths, personal identifiers, or environment variables were inspected or committed by this task.

## Evidence grades and identities

- **External prior observation:** aggregate facts already published by earlier research. Not accepted as issue-74 input coverage.
- **Representable:** the replay format or shipped vocabulary can encode a configuration. This does not prove replay production.
- **Required HITL input:** authentic private material or a human attestation required before a cell can enter the scenario manifest.
- **Unknown:** the available evidence cannot justify a positive, negative, or not-applicable lifecycle cell.
- **Unavailable:** no input satisfying this ticket's authenticity, consent, coverage, and privacy requirements was available in the audited scope.

All digests referenced by the source evidence are SHA-256.

| Evidence | Identity | Use and limitation |
| --- | --- | --- |
| Reference build | `10.09.96325` | Required target |
| Replay format | `268` | Required emitted replay format |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Target identity only; ABC bytes are not distributed |
| Replay setup/cleanup blocker | commit `effd0bd15b282d6fff6c740ccef8b4b3bcc52f66` | Establishes missing family-by-exit inputs and traces |
| Zero-origin lifecycle blocker | commit `b7ba0a2cd1e6ab0c2228b2f5ec198ddee87636c1` | Establishes missing zero-origin and lifecycle-labeled inputs |
| Replay-producing taxonomy | commit `da6b4f09260205d15b19cf3924777e0ed3a7ee03` | Coverage vocabulary only, not writer eligibility |
| Replay-writer eligibility | commit `cb0040cc14e2e0e824966f559f53017cc05de9fd` | Reports the narrow external emission cohort only |

Issue 72 reports that no accepted complete-AIR reference runtime or runtime artifact-set identity exists. Issue 73 remains open and has not published an accepted authenticated runtime trace. Those facts prevent runtime evidence from resolving ambiguous lifecycle labels or negative cells. They do not replace this ticket's missing human-provided inputs.

## Coverage obligations requiring HITL input

A family must be normalized from serialized configuration and roster topology, not from a preset allowlist. Shipped tables bound vocabulary but do not prove replay emission.

The minimum candidate family dimensions are:

1. serialized origin: nonzero online playlist, zero-playlist custom online, and zero-playlist local/couch;
2. scoring or runtime family: all 24 shipped scoring families, including training and practice configurations and four declaratively disabled families;
3. roster topology: team and non-team, all-human, human with bots, bot-only, and one through five heroes per entity;
4. variation: none, Relay, Scramble, and Shift; and
5. configuration: the complete serialized 15-word settings tuple plus level and origin fields.

Observed output coverage must separately include one-result and repeated-result files. Repeated Results sections are not an input-family discriminator and do not authenticate rematch.

Each replay-producing normalized family must be crossed with every applicable lifecycle exit:

1. normal completion;
2. disconnect;
3. forfeit;
4. host quit;
5. rematch;
6. abort before Results;
7. abort after Results; and
8. every additional exit discovered during capture.

Applicability is itself unknown. A missing file cannot prove no replay attempt or non-applicability. Until authenticated runtime evidence and terminal quiescence exist, negative and not-applicable cells remain unknown.

## Exact HITL input package

A human capture owner must supply a privacy-reviewed private package for every applicable family-by-exit cell. The package must remain outside version control or under an ignored path.

### 1. Capture authority and consent

For each scenario, provide:

- affirmative authority to use the replay or deterministic scenario for this research;
- affirmative consent from every human whose play produced the input;
- confirmation that approved hashes and aggregate coverage metadata may be redistributed;
- a privacy-review result that explicitly approves the proposed public row; and
- a cryptographically random, non-derived scenario ID that contains no player name, account ID, filename, date, queue token, source hash prefix, or other personal or linkable value.

The public row needs only boolean approval and policy/version identifiers. Signer and participant identities remain private.

### 2. Target and source attestation

For each scenario, provide privately:

- reference build `10.09.96325`;
- replay format `268` when a replay is emitted;
- target ABC SHA-256 `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d`;
- source replay SHA-256 and byte length when a replay exists;
- canonical normalized-input SHA-256;
- capture procedure or driver-manifest SHA-256;
- normalizer implementation and schema identities; and
- accepted hook, runtime artifact-set, trace, and terminal-completeness identities when the cell is used as runtime evidence.

The source replay path and filename must never enter the public row.

### 3. Canonical normalized execution input

The private normalized input must use a closed, versioned schema and include every value needed to execute the scenario deterministically. Schema version 1 contains:

- `schemaVersion = 1`;
- random, non-derived `scenarioId`;
- target build, replay format, and target artifact hashes;
- exact `randomSeed`;
- exact serialized origin: `playlistId`, exact private `playlistName` when `playlistId != 0` and otherwise `null`, and `onlineGame`;
- all 15 serialized settings words in parser order;
- exact `levelId` and global `heroCount`;
- ordered private roster records in the closed schema below;
- exact deterministic action timeline or an authenticated private source plus normalizer identity that reproduces it;
- exact lifecycle-exit label;
- exact trigger time, order, parameters, actor-role enum, and authenticated injection-boundary ID;
- expected emitted, no-emission, or unknown disposition;
- parse disposition and Results-section count when bytes exist; and
- hashes binding the normalized input, private source bytes, capture procedure, and approved public row.

Each ordered private roster record preserves these serialized-width values:

```text
entityId: u32 bit pattern
brawlhallaId: u32
playerName: private UTF-8 string
colorSchemeId: u32
spawnBotId: u32
companionId: u32
trailEffectId: u32
emitterGroupId: u32
playerThemeId: u32
tauntIds: exactly 8 u32 values
selectedTauntIds: exactly 2 u16 values
availableTauntBitsetWords: ordered u32 array
avatarId: u16
teamNumber: u32 bit pattern
connectionTime: u32 bit pattern
heroes: exactly heroCount ordered records
  heroId: u32
  costumeId: u32
  stanceIndex: u32
  packedWeaponWord: u32
compositeEntityClassification: boolean
handicap: null or exactly 3 ordered u32 values
```

The normalizer must preserve raw bit patterns and field order rather than relying on parser names for unresolved fields. Random seed, action timelines, event times, names, account identifiers, private roster values, and source replay bytes remain private. The public row exposes only approved aggregates and the canonical normalized-input digest.

### 4. Lifecycle label authentication

Replay bytes alone are insufficient. The capture owner must record at scenario creation:

- requested and observed exits;
- actor role as a bounded enum: host, participant, system, or none;
- authenticated event or injection boundary that caused the exit;
- ordering relative to Results creation and cleanup; and
- whether a replay file appeared, parsed, was rejected, or was deleted.

Rematch requires a human-authenticated rematch action or an authenticated internal event. Repeated Results sections alone do not prove rematch. Abort must be split into before-Results and after-Results cases.

### 5. No-file and negative cells

For a cell with no resulting replay, provide the same normalized execution input and authenticated evidence for:

- execution of the requested lifecycle event;
- writer setup and writer-slot state;
- executed cleanup site or authenticated no-attempt result;
- native file disposition;
- terminal lifecycle barrier; and
- scheduler quiescence covering runnable AVM2 frames, timers, callbacks, oracle tasks, and native or file callbacks.

Without that package, record `unknown`. Never infer no-attempt from a missing file.

## Privacy-safe public manifest contract

After HITL inputs and approval exist, a redistributable row may contain only:

- schema and privacy-policy versions;
- random, non-derived opaque scenario ID;
- target build and artifact hashes;
- canonical normalized-input SHA-256;
- privacy-reviewed family coordinate and lifecycle label;
- aggregate roster topology;
- source byte length and SHA-256 only when specifically approved;
- emitted, parse, and Results-count dispositions;
- capture, hook, trace, and terminal-completeness hashes; and
- bounded evidence-grade and limitation codes.

Free-text fields are forbidden unless each value receives explicit privacy review. The row must exclude replay bytes, action timelines, player or account values, credentials, host identifiers, source filenames, private paths, session-identifying timestamps, proprietary payloads, and bulk game data.

Canonical rows must be sorted by scenario ID and coverage coordinate. Canonical JSON must use stable key ordering, UTF-8, LF line endings, and a final newline before hashing. Duplicate IDs, duplicate coverage claims, missing hashes, unreviewed privacy status, unknown labels, incomplete applicable cells, and unsupported positive or negative claims must fail closed.

## Bounded availability audit

The 2026-08-05 pre-commit audit covered this worktree, 118 local and fetched refs, ten registered worktrees, issues 53, 59, and 72 through 74 with comments, issue 1 only as a low-resolution map, and repository conventions. It did not inspect private payload content, source filenames outside this worktree, player data, proprietary assets, credentials, or environment variables.

Observed results:

| Query | Result |
| --- | --- |
| Replay, ABC, SWF, SWZ, CBOR, or NDJSON payload files in this worktree, excluding dependencies and build output | 0 records; empty SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| JSON, JSONL, CBOR, YAML, or YML candidates under `artifacts/` | 0 records; empty SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Lifecycle scenario/input data-file paths across audited refs | 0 records; empty SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Pre-commit local/fetched ref snapshot | SHA-256 `95b7abbb4c60df7f9a29208b4866145571100608775c268ee4268c07e319a204` |
| Three-record artifact path inventory | SHA-256 `5ae357169340f37fb8e447cc2b1bc7994c309f6ebb3c3a5b128b9e23267acc35` |

Audit reproduction:

```bash
private_payload_results() {
  find . -type f \
    \( -name '*.replay' -o -name '*.abc' -o -name '*.swf' -o -name '*.swz' \
       -o -name '*.cbor' -o -name '*.ndjson' \) \
    -not -path './.git/*' -not -path './node_modules/*' -not -path '*/dist/*' \
    -print | LC_ALL=C sort
}

worktree_input_results() {
  find artifacts -type f \
    \( -name '*.json' -o -name '*.jsonl' -o -name '*.cbor' \
       -o -name '*.yaml' -o -name '*.yml' \) \
    -print | LC_ALL=C sort
}

ref_input_results() {
  git for-each-ref --format='%(refname)' refs/heads refs/remotes/origin \
    | LC_ALL=C sort \
    | while IFS= read -r ref; do
        git ls-tree -r --name-only "$ref" \
          | grep -Ei 'replay[-_].*(scenario|input).*[.](json|jsonl|cbor|ya?ml)$' \
          | while IFS= read -r path; do printf '%s:%s\n' "$ref" "$path"; done
      done \
    | LC_ALL=C sort -u
}

private_payload_results | shasum -a 256
worktree_input_results | shasum -a 256
ref_input_results | shasum -a 256
git for-each-ref --format='%(refname) %(objectname)' \
  refs/heads refs/remotes/origin | LC_ALL=C sort | shasum -a 256
find artifacts -type f -print | LC_ALL=C sort | shasum -a 256
```

This is a bounded file-availability audit, not proof that no private fixture exists outside the audited scope.

## Verification

```bash
bun install --frozen-lockfile
bun run --cwd tools/avm2-provenance build-dependency
bun run check
git diff --check
```

Privacy review must confirm that the committed diff contains no replay or binary payload, player or account value, credential, private path, source filename, proprietary payload, or unapproved private-corpus identifier.

## Sources

- [Issue 53: Trace replay-writer setup and cleanup across configurations and exits](https://github.com/NickTacke/brawlhalla-sim/issues/53)
- [Issue 59: Recover replay lifecycle state names and zero-origin reachability](https://github.com/NickTacke/brawlhalla-sim/issues/59)
- [Issue 72: Build and attest the complete-AIR reference oracle](https://github.com/NickTacke/brawlhalla-sim/issues/72)
- [Issue 73: Authenticate replay-writer lifecycle trace hooks](https://github.com/NickTacke/brawlhalla-sim/issues/73)
- [Replay setup/cleanup blocker at commit `effd0bd`](https://github.com/NickTacke/brawlhalla-sim/blob/effd0bd15b282d6fff6c740ccef8b4b3bcc52f66/artifacts/research/replay-setup-cleanup-traces/replay-setup-cleanup-traces.md)
- [Replay lifecycle zero-origin blocker at commit `b7ba0a2`](https://github.com/NickTacke/brawlhalla-sim/blob/b7ba0a2cd1e6ab0c2228b2f5ec198ddee87636c1/artifacts/research/replay-lifecycle-zero-origin/replay-lifecycle-zero-origin.md)
- [Replay-writer eligibility at commit `cb0040c`](https://github.com/NickTacke/brawlhalla-sim/blob/cb0040cc14e2e0e824966f559f53017cc05de9fd/artifacts/research/replay-writer-eligibility/replay-writer-eligibility.md)
- [Replay-producing taxonomy at commit `da6b4f0`](https://github.com/NickTacke/brawlhalla-sim/blob/da6b4f09260205d15b19cf3924777e0ed3a7ee03/research/wayfinder/replay-producing-match-universe.md)
- [`CONTEXT.md`](../../../CONTEXT.md)
- [`CONTRIBUTING.md`](../../../CONTRIBUTING.md)
