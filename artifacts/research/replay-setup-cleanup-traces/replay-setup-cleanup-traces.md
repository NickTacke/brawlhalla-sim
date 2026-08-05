# Replay-writer setup and cleanup trace blocker in Brawlhalla 10.09.96325

Issue: [Trace replay-writer setup and cleanup across configurations and exits](https://github.com/NickTacke/brawlhalla-sim/issues/53)

## Verdict

**Issue acceptance is not met because no authenticated T3 target trace exists.** The local evidence includes the hash-pinned `main.abc` and the 12-file reviewed replay corpus, but it does not include an executable interpreted-reference oracle, authenticated instrumentation, a trace verifier, or lifecycle/configuration inputs beyond the narrow completed online playlist-108 cohort.

The static boundary is already closed by [Resolve upstream replay-save reachability and lifecycle semantics](https://github.com/NickTacke/brawlhalla-sim/issues/42): three exact method-3368 setup calls, two statically addressable writer-slot transitions, 27 exact cleanup calls, the method-3442 writer-null check, and its sole method-6524 finalizer call. Static evidence cannot establish which path executes for any configuration or lifecycle exit.

Every requested runtime cell therefore remains **unknown**, not negative. Issue 53 must remain open. Producing a plausible matrix from the static call graph or from emitted replay files would fabricate the required execution evidence.

## Evidence grades

- **Proven static:** exact control/dataflow and complete ledgers reproduced against the hash-pinned ABC by the fail-closed issue-42 analyzer.
- **Attested input:** private local input whose hash or privacy-safe manifest is reviewed, without an authenticated interpreted execution trace.
- **Unavailable:** no executable capability, authenticated input, or trace satisfying the selected oracle trust contract was found.
- **Unknown:** the available evidence cannot justify a positive or negative runtime claim.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Present use |
| --- | --- | --- |
| Reference build | `10.09.96325` | Required executable cohort |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Present locally; static analysis only |
| Decoded method bodies | `15,010` | Static search domain |
| Cleanup call-site ledger | `28ce2c68e3444dc6bb328bedf78484a3df7a484ad782702920b82db75cb36340` | 27 exact calls across 24 methods |
| Reviewed corpus manifest | `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac` | 12 attested format-268 files in one completed online family |
| Selected Ruffle source | `6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943` | Planned oracle base; no local oracle implementation |
| Oracle specification | repository commit `29770640d30558a6bb6a25229253f2bc46d9ac92` | Mandatory T3 trust contract |
| Static replay-save proof | repository commit `6bf17bf057a1b2dabe8b82e652e85a1a319d9254` | Exact setup, slot, cleanup, and finalizer boundary |

## Availability audit

On 2026-08-05, the audit snapshot covered 11 registered worktrees, 40 local branch refs, and 33 fetched `origin` refs. The canonical sorted `(refname, objectname)` ledgers embedded below hash to `0872a70d49642c45abb90e90ccaaf707424ada62bf78b7f02c95ce37027ed45a` for local branches and `e08000dc416fe7d39e77c3349cdd03fad953eaa33c524b5b120986b8f71d2862` for fetched refs.

The sanitized worktree search covered source and trace-like extensions for `oracleArtifactSetId`, original method/byte-PC fields, and hook-manifest markers. It excluded `.git`, `node_modules`, and `.pi-subagents`. It found no candidate file. The same search across Git refs found one unique static tick-provenance source, duplicated by its local and fetched refs; inspection confirmed that it records candidate PCs and is not an oracle harness or trace. The audit did not inspect environment variables, replay bytes, player data, or source replay filenames.

| Capability or input | Result |
| --- | --- |
| Official ABC input | **Available** in the registered primary checkout with the expected digest |
| Reviewed build-10.09 replay corpus | **Available** in the registered primary checkout; 12 replay files |
| Authenticated T3 target traces | **Unavailable** in the audited scope; no authenticated trace marker or manifest was found |
| Executable patched-Ruffle oracle or harness source | **Unavailable** in the audited scope; the only source match was static provenance |
| Issue-53 trace runner or verifier command | **Unavailable**; no configured script exists |
| Signed transformation/instrumentation manifest | **Unavailable** |
| Lifecycle/configuration scenario manifest beyond the reviewed corpus | **Unavailable** |
| Normal completion input | **Narrowly attested** only by the completed playlist-108 corpus; no executed-site trace |
| Disconnect, forfeit, host quit, rematch, or abort inputs | **Unavailable** as authenticated labeled scenarios |

An additional exploratory static probe reads an ABC through `abc-disassembler`. It is not an interpreted runtime, authenticated instrumentation channel, scenario driver, or T3 artifact.

### Audit reproduction and snapshot

The audit used the exact commands below. `rg -a` and `git grep -a` force binary-as-text scanning for the allowed `*.cbor` and `*.bin` inputs. Search results are UTF-8, `LC_ALL=C` sorted, unique, LF-terminated records. Empty output is zero bytes.

```bash
pattern='oracleArtifactSetId|originalMethodId|originalBytePc|hookManifest'

worktree_results() {
  git worktree list --porcelain | awk '
    /^worktree / { root=substr($0, 10) }
    /^branch / {
      branch=$2
      sub(/^refs\/heads\//, "", branch)
      print root "\t" branch
    }
  ' | while IFS=$'\t' read -r root branch; do
    rg -a -l --hidden -i --no-messages \
      -g '*.ts' -g '*.js' -g '*.rs' -g '*.json' \
      -g '*.jsonl' -g '*.ndjson' -g '*.cbor' -g '*.bin' \
      -g '!**/.git/**' -g '!**/node_modules/**' \
      -g '!**/.pi-subagents/**' \
      "$pattern" "$root" | while IFS= read -r path; do
        printf '%s %s\n' "$branch" "${path#"$root"/}"
      done
  done | LC_ALL=C sort -u
}

ref_results() {
  git for-each-ref --format='%(refname)' \
    refs/heads refs/remotes/origin | LC_ALL=C sort \
  | while IFS= read -r ref; do
      git grep -l -a -i -E "$pattern" "$ref" -- \
        '*.ts' '*.js' '*.rs' '*.json' '*.jsonl' '*.ndjson' \
        '*.cbor' '*.bin' 2>/dev/null || true
    done | LC_ALL=C sort -u
}

worktree_results | shasum -a 256
ref_results | shasum -a 256
git for-each-ref --format='%(refname) %(objectname)' refs/heads \
  | LC_ALL=C sort | shasum -a 256
git for-each-ref --format='%(refname) %(objectname)' refs/remotes/origin \
  | LC_ALL=C sort | shasum -a 256
```

Observed canonical results:

- Worktree search: 0 records; SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
- Ref search: 2 records; SHA-256 `6ead7f5b3d553f7cf2f1bb3b492bacb8d93d2411b5b9aa135c31956468a35904`.
- Worktree snapshot: 11 LF-terminated records; SHA-256 `e8829c43da8ef258a519ff0f0517d860253f48110624be78797e80b5d374eb12`.

```text
refs/heads/research/tick-phase-semantics:tools/avm2-provenance/tick_phase_provenance.ts
refs/remotes/origin/research/tick-phase-semantics:tools/avm2-provenance/tick_phase_provenance.ts
```

Both ref matches are the same static tick-provenance source, not an executable oracle harness or trace.

<details>
<summary>Sanitized worktree and ref snapshot</summary>

```text
worktrees (branch commit; local paths omitted)
research/generic-roster-bitset 61e27e5be5df6e3de7f08398253019d075d41539
research/collision-query-flags 61e27e5be5df6e3de7f08398253019d075d41539
research/handicap-mutation-policy 0d06c99f6b35fdeb0364c2545e8eb6cd47ea86b2
research/legacy-level-selection 25e6d08f0018e26f8e41613dd994c99889c67d9b
research/level-instance-geometry 89dd2e64f10698e24e1078625e5f8c74a5ac1fae
research/moving-platform-semantics ca2ce4ebc58d3a3ea20889a351cc65a8d354644d
research/offensive-collision-transform 61e27e5be5df6e3de7f08398253019d075d41539
research/offensive-target-policy 5a7f0df8d4def3768d4c8d0ee1b8872d47b486e9
research/reachable-power-phases 61e27e5be5df6e3de7f08398253019d075d41539
research/replay-setup-cleanup-traces 61e27e5be5df6e3de7f08398253019d075d41539
research/startup-visual-assets 61e27e5be5df6e3de7f08398253019d075d41539

local branches
refs/heads/main 14928327bbe24e3b3ae202cd25be1c97fa5d5ff0
refs/heads/research/avm2-air-native-semantics ca39e257846adb6a5081ca280c23b148feecee9a
refs/heads/research/bot-replay-regeneration d70f21bd7f857b7983d884e58d7363955f46bfe9
refs/heads/research/collision-query-flags 61e27e5be5df6e3de7f08398253019d075d41539
refs/heads/research/command-selection-priority cfecdd20046bdf4f8a15f729ec2e08664010db2d
refs/heads/research/composite-entity-classification 396b0a3328b912dd5b0cb9864c5f47b0325cd2f1
refs/heads/research/format-268-header-seed e773abd342b57f494fa4bec4050a4b39def1d056
refs/heads/research/format-roster-word 116a100c617f97f6c34734a13048a366b1614379
refs/heads/research/game-settings-word-14 8e72ef4d752d9ceaf2584b41c0e7986740f1cb33
refs/heads/research/gameplay-transition-6016 3e03f16b59967e6ff5a02568826bd3e58c261093
refs/heads/research/generic-roster-bitset 61e27e5be5df6e3de7f08398253019d075d41539
refs/heads/research/handicap-modifier-order 0d06c99f6b35fdeb0364c2545e8eb6cd47ea86b2
refs/heads/research/handicap-mutation-policy 0d06c99f6b35fdeb0364c2545e8eb6cd47ea86b2
refs/heads/research/input-bit-32 60b32d61e67108df7c8ddbec978089339e321edc
refs/heads/research/interpreted-reference-oracle 29770640d30558a6bb6a25229253f2bc46d9ac92
refs/heads/research/legacy-level-selection 25e6d08f0018e26f8e41613dd994c99889c67d9b
refs/heads/research/level-collision-geometry e308fc680be98bf55d28ab3ce3f34750c41e5b28
refs/heads/research/level-instance-geometry 89dd2e64f10698e24e1078625e5f8c74a5ac1fae
refs/heads/research/match-tick-closure af8b75dc3f423f95ef2fdf01b48be5f4b5b26c79
refs/heads/research/movement-numeric-storage 9487cc800a81a1d0c2484c2f567b34fb53aba9dc
refs/heads/research/moving-platform-semantics ca2ce4ebc58d3a3ea20889a351cc65a8d354644d
refs/heads/research/native-replay-writer 94a936c68895661f2277441282787e4ba38f6266
refs/heads/research/numeric-semantics f6a92e516053245727711936b187438212244795
refs/heads/research/offensive-collision-transform 61e27e5be5df6e3de7f08398253019d075d41539
refs/heads/research/offensive-hitbox-timing 9d3ebc873d373c8d72856cef2ed63db8471bf33d
refs/heads/research/offensive-target-policy 5a7f0df8d4def3768d4c8d0ee1b8872d47b486e9
refs/heads/research/packed-weapon-flags 1f4e859b0e1bc3e10cd8766a54986e709233e130
refs/heads/research/patch-loader-defaults bdc8b2c4caecc4b3ebae84ea845a6c0387a4500a
refs/heads/research/patch-snapshot-closure 629a95c26a3d2a7b1fd51d43a16d0f7cbe02e996
refs/heads/research/reachable-power-phases 61e27e5be5df6e3de7f08398253019d075d41539
refs/heads/research/replay-format-268-semantics 327166d3f9a09f0d9a5c519b58039e36ea4f835f
refs/heads/research/replay-producing-match-universe da6b4f09260205d15b19cf3924777e0ed3a7ee03
refs/heads/research/replay-save-reachability 6bf17bf057a1b2dabe8b82e652e85a1a319d9254
refs/heads/research/replay-setup-cleanup-traces 61e27e5be5df6e3de7f08398253019d075d41539
refs/heads/research/replay-writer-eligibility cb0040cc14e2e0e824966f559f53017cc05de9fd
refs/heads/research/selected-taunt-order 87eab430df9d999a46201336b5c1b62b62521250
refs/heads/research/special-mode-timestamps b159ff24d6a3b8970c4a90ca87338ce633bf460b
refs/heads/research/startup-visual-assets 61e27e5be5df6e3de7f08398253019d075d41539
refs/heads/research/state-7-production 247800ec5122539043147d029953d16b9a4f2bca
refs/heads/research/tick-phase-semantics 54a0d78b8ec651ac7611a7a399317f595ad7583d

fetched origin refs
refs/remotes/origin/main 14928327bbe24e3b3ae202cd25be1c97fa5d5ff0
refs/remotes/origin/research/avm2-air-native-semantics ca39e257846adb6a5081ca280c23b148feecee9a
refs/remotes/origin/research/bot-replay-regeneration d70f21bd7f857b7983d884e58d7363955f46bfe9
refs/remotes/origin/research/command-selection-priority cfecdd20046bdf4f8a15f729ec2e08664010db2d
refs/remotes/origin/research/composite-entity-classification 396b0a3328b912dd5b0cb9864c5f47b0325cd2f1
refs/remotes/origin/research/format-268-header-seed e773abd342b57f494fa4bec4050a4b39def1d056
refs/remotes/origin/research/format-roster-word 116a100c617f97f6c34734a13048a366b1614379
refs/remotes/origin/research/game-settings-word-14 8e72ef4d752d9ceaf2584b41c0e7986740f1cb33
refs/remotes/origin/research/gameplay-transition-6016 3e03f16b59967e6ff5a02568826bd3e58c261093
refs/remotes/origin/research/generic-roster-bitset 61e27e5be5df6e3de7f08398253019d075d41539
refs/remotes/origin/research/handicap-modifier-order 0d06c99f6b35fdeb0364c2545e8eb6cd47ea86b2
refs/remotes/origin/research/input-bit-32 60b32d61e67108df7c8ddbec978089339e321edc
refs/remotes/origin/research/interpreted-reference-oracle 29770640d30558a6bb6a25229253f2bc46d9ac92
refs/remotes/origin/research/legacy-level-selection 25e6d08f0018e26f8e41613dd994c99889c67d9b
refs/remotes/origin/research/level-collision-geometry e308fc680be98bf55d28ab3ce3f34750c41e5b28
refs/remotes/origin/research/level-instance-geometry 89dd2e64f10698e24e1078625e5f8c74a5ac1fae
refs/remotes/origin/research/match-tick-closure af8b75dc3f423f95ef2fdf01b48be5f4b5b26c79
refs/remotes/origin/research/movement-numeric-storage 9487cc800a81a1d0c2484c2f567b34fb53aba9dc
refs/remotes/origin/research/moving-platform-semantics ca2ce4ebc58d3a3ea20889a351cc65a8d354644d
refs/remotes/origin/research/native-replay-writer 94a936c68895661f2277441282787e4ba38f6266
refs/remotes/origin/research/numeric-semantics f6a92e516053245727711936b187438212244795
refs/remotes/origin/research/offensive-hitbox-timing 9d3ebc873d373c8d72856cef2ed63db8471bf33d
refs/remotes/origin/research/packed-weapon-flags 1f4e859b0e1bc3e10cd8766a54986e709233e130
refs/remotes/origin/research/patch-loader-defaults bdc8b2c4caecc4b3ebae84ea845a6c0387a4500a
refs/remotes/origin/research/patch-snapshot-closure 629a95c26a3d2a7b1fd51d43a16d0f7cbe02e996
refs/remotes/origin/research/replay-format-268-semantics 327166d3f9a09f0d9a5c519b58039e36ea4f835f
refs/remotes/origin/research/replay-producing-match-universe da6b4f09260205d15b19cf3924777e0ed3a7ee03
refs/remotes/origin/research/replay-save-reachability 6bf17bf057a1b2dabe8b82e652e85a1a319d9254
refs/remotes/origin/research/replay-writer-eligibility cb0040cc14e2e0e824966f559f53017cc05de9fd
refs/remotes/origin/research/selected-taunt-order 87eab430df9d999a46201336b5c1b62b62521250
refs/remotes/origin/research/special-mode-timestamps b159ff24d6a3b8970c4a90ca87338ce633bf460b
refs/remotes/origin/research/state-7-production 247800ec5122539043147d029953d16b9a4f2bca
refs/remotes/origin/research/tick-phase-semantics 54a0d78b8ec651ac7611a7a399317f595ad7583d
```

</details>

## Static boundary inherited from issue 42

The static proof at commit `6bf17bf` establishes these instrumentation anchors without claiming runtime execution:

### Writer setup and slot state

- Method 3368 constructs the exact writer class and writes the typed writer slot at PC 37.
- Method 3368 forwards `(uint seed, uint playlistId, Boolean online)` to header method 6518 at PC 49.
- The complete exact method-3368 call ledger is method 3282 PC 361, method 3514 PC 179, and method 5257 PC 229.
- Method 3329 closes a non-null writer and writes null at PC 33.
- No exact-QName or effective-slot write exists beyond methods 3329 and 3368. Computed-name mutation remains a static limitation.

### Cleanup and finalizer

The call-site ledger digest above binds all 27 exact calls across 24 methods; the pinned static source lists every caller and PC. All resolve to class 164 method 3442 in the pinned ABC receiver universe. Method 3442 checks the typed writer slot at PC 194. Null branches past the sole exact finalizer call. Non-null reaches class 357 method 6524 at PC 204. Method 3442 has no configuration-specific suppression before that call.

These anchors define where an authenticated tracer must observe. They do not prove that any callsite executes for any exit.

## Requested trace matrix and present disposition

### Normalized configuration families

The configuration boundary is the replay's serialized tuple, not a preset allowlist. The rows below are coverage groupings inherited from the reviewed universe and static replay-save proof.

| Configuration family | Available input/evidence | T3 disposition |
| --- | --- | --- |
| Online playlist 108, timed, four-human FFA | 12 completed authentic replays; online setup route exists statically | **Unknown:** no authenticated setup or cleanup trace |
| Other online playlists | Static online setup routes only | **Unknown:** no authenticated family input or trace |
| Custom online | Static online setup route and readable custom locator only | **Unknown:** no authenticated family input or trace |
| Local/couch | Static offline setup route only | **Unknown:** no authenticated family input or trace |
| Training/practice | No unique setup discriminator or authenticated input | **Unknown** |
| Human with bots or bot-only | No method-3442 roster guard; no authenticated input | **Unknown** |
| Team modes | No method-3442 team guard; no authenticated input | **Unknown** |
| Relay, Scramble, or Shift | No method-3442 variation guard; no authenticated input | **Unknown** |
| Other scoring families or off-preset tuples | No method-3442 settings guard; no authenticated input | **Unknown** |

Table presence and static route existence prove vocabulary and possible control flow, not replay emission or path execution.

### Lifecycle exits

| Exit | Available evidence | T3 disposition |
| --- | --- | --- |
| Normal completion | Completed files exist for one configuration family | **Unknown:** setup route, cleanup caller/PC, slot state, and finalizer dispatch are untraced |
| Disconnect | No labeled authenticated scenario or trace | **Unknown** |
| Forfeit | No labeled authenticated scenario or trace | **Unknown** |
| Host quit | No labeled authenticated scenario or trace | **Unknown** |
| Rematch | Repeated Results sections do not identify rematch | **Unknown** |
| Abort before Results | Zero-Results files are structurally unsupported; save attempt and file disposition are unobserved | **Unknown** |
| Abort after Results | No labeled authenticated scenario or trace | **Unknown** |
| Any additional replay-producing exit | No complete executed exit inventory | **Unknown** |

A missing replay file cannot prove no attempt. A produced replay cannot identify the executed cleanup site. Both negative and positive cells require authenticated method/byte-PC observations.

## Exact blocker

The selected oracle specification states that no target AIR boot, match initialization, or interpreted target trace has run. Its mandatory T3 trust level requires a hash-pinned complete-AIR Ruffle embedder, deterministic deny-by-default `OracleHostServices`, independently verified transformed ABCs, authenticated method/byte-PC instrumentation, optimizer equality, 100 fresh-process repeats, x64/arm64 equality, layered conformance, corpus consistency, privacy checks, and independent review.

None of the executable oracle, transformed application, signed hook manifest, capability-authenticated trace channel, trace verifier, or T3 output exists in the repository or registered worktrees. Stock Ruffle, direct ABC evaluation, emitted replay bytes, and static provenance are explicitly insufficient substitutes.

Even after the oracle exists, the current 12-file corpus supplies only one completed online family. Issue 53 also needs authenticated, privacy-safe scenario inputs that label each normalized configuration family and lifecycle exit. Those inputs must establish whether a replay is produced and drive the exact exit without using prohibited live-client capture.

## Surfaced route

This ticket becomes answerable only after the already-selected interpreted-reference implementation handoff supplies:

1. **Executable oracle:** build the pinned patched-Ruffle complete-AIR embedder and deterministic host-services boundary, then reach the offline match-ready T1 gate with no unresolved reached capability.
2. **Authenticated hooks and payloads:** independently verify original and transformed ABCs and authenticate hooks for all three method-3368 callsites, writer-slot writes/reads, all 27 cleanup caller PCs, method 3442 PCs 194 and 204, method 6524 entry/outcome, and method 3329 reset. Every trace must record setup arguments, slot state before and after setup and cleanup, executed caller/PC, and finalizer outcome. The no-attempt window starts when the authenticated lifecycle driver is accepted before its first target instruction. It ends only after an authenticated, statically proven terminal lifecycle barrier and deterministic scheduler quiescence: no runnable AVM2 frame, due timer, queued callback or oracle task, or in-flight native/file callback remains. Future scheduled work must be cancelled with proof or shown unreachable from replay cleanup. An arbitrary virtual-time cutoff is invalid; if quiescence cannot be proven, the cell stays unknown.
3. **Pinned matrix inventory:** define the normalized replay-producing family inventory, applicable lifecycle exits for each family, and any newly discovered exit. Hash and privacy-review a legitimate input for every applicable family x lifecycle cell. The existing 12-file corpus can cover only its proven completed playlist-108 cell.
4. **Deterministic lifecycle-event driver:** drive disconnect, forfeit, host quit, rematch, abort, and additional exits through authenticated internal boundaries under the non-live oracle. Each injection point and event ordering needs target-reachability proof and synthetic lifecycle conformance. Host UI, network access, or live-client capture cannot substitute.
5. **Fail-closed runner:** bind build, original/transformed application hashes, `oracleArtifactSetId`, scenario hash, normalized tuple, lifecycle label, hook manifest, ordered events, terminal-window completeness, trace hash, and verifier result. Reject missing cells, dropped events, wrong call stacks, wrong PCs, hash mismatches, and unauthenticated no-attempt claims.
6. **T3 execution and review:** run optimizer-on/off, repeatability, architecture, conformance, privacy, and independent-review gates before promoting any matrix cell from unknown.

This route is surfaced here rather than as a new Wayfinder ticket because [Establish a non-live interpreted reference oracle](https://github.com/NickTacke/brawlhalla-sim/issues/5) already defines these as implementation handoff items. [Resolve upstream replay-save reachability and lifecycle semantics](https://github.com/NickTacke/brawlhalla-sim/issues/42) remains blocked on this runtime attribution. The map issue was not edited.

## Reproducible verification

The static proof remains reproducible when the user-owned pinned ABC is supplied:

```bash
bun run provenance:replay-save-reachability -- \
  --abc /path/to/hash-pinned/main.abc
```

That command and analyzer live at commit `6bf17bf`, not on this branch. It verifies the static ledger only. There is intentionally no command claiming issue-53 runtime acceptance because the required oracle, scenario manifest, and authenticated traces do not exist.

Repository verification for this blocker record:

```bash
bun run check
```

## Confidence and residual gaps

Confidence is high for the pinned static boundary and for the dated, bounded availability audit. It is not a runtime confidence claim. Every issue-53 runtime answer remains unknown until authenticated evidence covers every applicable normalized-family x lifecycle cell.

## Sources

- **[Static reachability]** [Upstream replay-save reachability in Brawlhalla 10.09.96325](https://github.com/NickTacke/brawlhalla-sim/blob/6bf17bf057a1b2dabe8b82e652e85a1a319d9254/artifacts/research/replay-save-reachability/replay-save-reachability.md).
- **[Oracle]** [Interpreted reference oracle for Brawlhalla 10.09.96325](https://github.com/NickTacke/brawlhalla-sim/blob/29770640d30558a6bb6a25229253f2bc46d9ac92/artifacts/research/interpreted-reference-oracle/interpreted-reference-oracle.md).
- **[Universe]** [Enumerate every replay-producing 10.09 match](https://github.com/NickTacke/brawlhalla-sim/issues/2#issuecomment-5184515260).
- **[Corpus]** [Restore and attest the 10.09 replay corpus](https://github.com/NickTacke/brawlhalla-sim/issues/10#issuecomment-5184206096).
- **[Conventions]** [`CONTEXT.md`](../../../CONTEXT.md), [`CONTRIBUTING.md`](../../../CONTRIBUTING.md), and [`docs/provenance.md`](../../../docs/provenance.md).
