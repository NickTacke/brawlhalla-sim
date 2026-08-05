# Special-mode classification writer reachability in Brawlhalla 10.09.96325

Issue: [Prove special-mode classification writer reachability](https://github.com/NickTacke/brawlhalla-sim/issues/61)

## Verdict

**Acceptance is not met.** Current evidence neither attests a true format-268 classification bit nor proves the bit unreachable in every replay-producing match.

The pinned ABC contains three static ways for a live fighter type word to satisfy writer 6519 after its prefilter:

1. The Horde scoring handler uses mode mask `_-S3K._-V18 = 0x00026022`.
2. The Zombie scoring handler uses mode mask `_-n4L._-K4c = 0x20026022`.
3. Method 7190 reads an unrestricted unsigned word and writes it to live fighter field `_-V4R._-56G`.

Both named mode masks contain `_-V4R._-a50 = 0x00000002`, so they satisfy the later classification predicate. Neither contains prefilter flags `_-b3N = 0x04000000` or `_-2O = 0x08000000`. Method 7190 can numerically restore any equivalent combination even without an exact target-flag QName reference.

Static structure alone does not prove that one of these producers executes, that the resulting entity remains live through an executed state-4 write, or that native serialization completes a replay file. The reviewed 12-fixture format-268 corpus has 48 roster records and zero true values.

Confidence is **high** for the mask values, named producer instructions, unrestricted restoration instruction, live-vector insertion, complete writer-call ledger, prefilter, predicate, and zero-valued corpus observation. Actual positive production is **unknown** without an authentic positive replay or authenticated interpreted-reference ordering trace.

## Evidence grades

- **Proven static structure:** exact typed trait, instruction, branch, or complete exact-QName reference ledger in the hash-pinned ABC.
- **Observation:** aggregate facts from hash-verified authentic replay files.
- **Static candidate route:** in-ABC control/dataflow that can carry a satisfying type word toward the writer, without claiming executed runtime ordering or completed file production.
- **Unknown:** current primary evidence does not establish the runtime claim.

Repository parser names and prior reports were locators. The verifier derives its static result from the pinned executable and checks the reviewed replay files in place. Successful output emits no ABC bytes, replay bytes, player names, player IDs, fixture names, or local input paths. Operating-system errors can expose a caller-supplied path.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Flags, mode masks, producers, restoration, vector insertion, writer calls, prefilter, predicate |
| Sole semantic build string | `10.09.96325` | Build identity |
| Reviewed format-268 manifest | `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac` | Fixture identity, aggregate configuration and roster observation |
| Target-flag reference ledger | `b59997e12cca0cf9acc404aa36fa7db9257e0a637188a097718674e61d7db4df` | Every exact reference to the five classification flags |
| Mode-mask reference ledger | `7bf5b5bc4e23c6492dadbf8944ab3a2b630b31fd4fec7425d43aa0da5a3cbd86` | Every exact reference to Horde `_V18` and Zombie `_K4c` |
| Producer reference ledger | `63e5da8f86d74c04073dcc004149f457bd7080e8fa65affac1cfb38f017ebaf7` | Exact references to named producer and restoration methods |
| Writer call ledger | `ab76ff66a2dfbb2dd2649a110199eb30e8e3a364a0c2134aece1d3e6c00673bf` | All three exact calls to writer 6519 |
| Live-vector bridge ledger | `5d9c839966a84821fb11b3ae06f784c57d137d69cb5b5a8391b0dd2be2c9bcd7` | Exact method-3528 and `_-u16._-Y1k` references |
| Relevant-method ledger | `d2e35ecca74db214cf734c7bca61109546134c8006b5dcb15bb8c58ac98d07ce` | Complete ordered instructions with exact QName keys for the proof methods |

The analyzer decodes all 15,010 method bodies, validates every branch target, pins every ledger above, verifies all 12 fixture hashes, and fails if any asserted owner, method, PC, opcode, QName, value, callsite, or aggregate observation changes.

## Writer boundary inherited from issue 27

Writer method 6519 first filters each input fighter at PCs 257-283:

```text
if ((fighter._-56G & (_-V4R._-b3N | _-V4R._-2O)) != 0) {
  skip the whole roster record
}
```

For each surviving fighter, PCs 1264-1321 write:

```text
(fighter._-56G &
  (_-a50 | _-b3N | _-2O | _-P1j | _-sE)) != 0
```

The exact classification mask is `0x0c808002`. The prefilter mask is `0x0c000000`.

This preserves the prior negative results:

- Soccer and volley balls carry `_-b3N` and are skipped.
- The separate method-3623 Horde `PartyBot` aggregate carries `_-2O` and is skipped.
- `_-sE` has no exact named factory or aggregate producer.

## Horde static candidate

Method 6937 selects class `_-S3K` when the exact match scoring type equals readable `ScoringType.HORDE` at PCs 346-374.

Initializer method 14909 builds `_-S3K._-V18` at PCs 61815-61854 from these exact fighter flags:

| Component | Value |
| --- | ---: |
| `_-F43` | `0x00000020` |
| `_-a50` | `0x00000002` |
| `_-K2` | `0x00002000` |
| `_-X5N` | `0x00004000` |
| `_-J4K` | `0x00020000` |
| Combined `_-V18` | `0x00026022` |

Method 6926 reads `_-V18` at PC 329, passes it into fighter factory 3071 at PC 358, inserts the resulting fighter into the match through method 3528 at PC 383, and invokes helper 6927 at PC 397. Method 6927 independently ORs `_-V18` into the fighter type word at PCs 39-50.

The mask satisfies the writer predicate through `_-a50` and survives the prefilter:

```text
0x00026022 & 0x0c808002 != 0
0x00026022 & 0x0c000000 == 0
```

This corrects the narrower issue-27 picture. The literal method-3623 Horde `PartyBot` path is prefiltered through `_-2O`, but the scoring handler also has this distinct non-prefiltered Horde aggregate.

## Zombie static candidate

Method 6937 selects class `_-n4L` when the scoring type equals readable `ScoringType.ZOMBIE` at PCs 735-765.

Initializer method 14909 builds `_-n4L._-K4c` at PCs 62115-62163 from the Horde aggregate components plus `_-R5d = 0x20000000`:

```text
_-K4c = 0x20026022
```

The exact named writes are:

- Method 7100 reads `_-K4c`, passes it into fighter factory 3071 at PC 252, inserts the fighter through method 3528 at PC 302, and ORs `_-K4c` into the result at PCs 342-353.
- Methods 7095 and 7101 independently OR `_-K4c` into a supplied fighter at PCs 2-13.

The mask also satisfies the classification and survives the prefilter:

```text
0x20026022 & 0x0c808002 != 0
0x20026022 & 0x0c000000 == 0
```

Prior Zombie research already proves that the same online setup method selects the scoring handler, constructs the recorder, and later reaches writer 6519 without a scoring-type or variation exclusion. That is a static route, not a positive replay attestation.

## Unrestricted restored type-word ingress

Method 7190 receives a typed fighter. At PCs 934-947 it reads `readUnsignedInt`, converts it to `uint`, and writes the full result to exact field `_-V4R._-56G`. There is no mask at this write.

Main tick method 3217 obtains an `_-M5S` state object and invokes method 7190 with that state and a live fighter at PC 1613. The exact method QName has four in-ABC callsites, including two in method 3217.

A restored word containing `_-a50`, `_-P1j`, or `_-sE` without `_-b3N` or `_-2O` would therefore satisfy writer 6519. Current static evidence does not prove the runtime source domain of that word or its ordering relative to state-4 writing. This blocks an exhaustive negative proof even if the named Horde and Zombie paths never complete a replay.

LinkUpdater method 5257 is not this unrestricted ingress. Its direct fighter-factory path fixes local type flags to `_-6c | _-76C` at PCs 376-392 before the factory call at PC 867.

## Live-vector and writer closure

Method 3528 adds a fighter to exact match vector `_-u16._-Y1k` when it is not already present, using `push` at PC 336. Both named mode constructors call method 3528 immediately after fighter creation.

Writer 6519 has exactly three direct in-ABC callsites, and each receives `_-Y1k`:

| Caller | Writer PC | Vector read |
| --- | ---: | ---: |
| Online setup/completion method 3282 | 1808 | 1799 |
| Local setup/completion method 3514 | 2000 | 1992 |
| LinkUpdater method 5257 | 1215 | 1210 |

This closes the static vector-to-writer bridge. It does not establish that a Horde or Zombie entity survives in the vector at the executed call, which call executes for a particular normalized configuration, or whether native output completes.

## Normalized configuration disposition

The shipped configuration universe includes HORDE and ZOMBIE scoring families, but table membership does not prove completed replay production.

| Configuration or source | Static satisfying source | Completed positive replay |
| --- | --- | --- |
| HORDE scoring | `_-S3K._-V18 = 0x00026022` | Unknown |
| ZOMBIE scoring | `_-n4L._-K4c = 0x20026022` | Unknown |
| Restored full type word | Method 7190 unrestricted `uint` write | Unknown |
| Soccer or Volley ball | `_-b3N` | No roster record after prefilter |
| Method-3623 Horde `PartyBot` | Includes `_-2O` | No roster record after prefilter |
| Standalone named animation target | No exact `_-sE` producer | Unknown through unrestricted restore only |
| Reviewed playlist 108 timed FFA | Ordinary fighter flags | 12 files, all false |

The normalized 15-word settings tuple remains the simulator boundary. This evidence does not justify a preset allowlist, denylist, or claim that every shipped HORDE or ZOMBIE preset emits a replay.

## Corpus observation

The hash-verified format-268 corpus contains:

- 12 fixtures and one normalized configuration;
- 48 roster records;
- online playlist 108, timed four-human free-for-all only;
- zero true classification values.

Absence from this narrow corpus does not prove suppression.

## Exact blockers

1. **Positive replay absent:** no privacy-safe authentic format-268 replay in the reviewed corpus sets the bit.
2. **Authenticated producer-to-writer trace absent:** no interpreted-reference trace executes Horde methods 6926/6927 or Zombie methods 7095/7100/7101, preserves the entity in `_-Y1k`, enters writer 6519, and observes the emitted bit.
3. **Restoration ordering absent:** no authenticated trace establishes whether method 7190 can precede or re-enter state-4 writing with a satisfying word.
4. **Configuration production coverage absent:** shipped HORDE and ZOMBIE records prove vocabulary, not completed replay emission for their normalized tuples.
5. **Native completion absent for this route:** static writer entry does not by itself attest completed file output for a positive entity.

Because a positive attestation and an exhaustive unreachability proof are both unavailable, issue 61 must remain open and the claim must be released.

## Reproduction

Keep the proprietary ABC, manifest, and replay files under ignored paths or outside version control.

```bash
bun install --frozen-lockfile
bun run provenance:special-mode-writer-reachability -- \
  --abc /path/to/hash-pinned/main.abc \
  --manifest /path/to/hash-pinned/manifest.json
```

Successful analysis reports status `bounded-static-positive-route-without-attestation`, `acceptanceMet: false`, the two named masks, method-7190 restoration, all six ledger hashes, 15,010 decoded bodies, valid branch targets, 12 fixtures, 48 roster records, and zero positive values.

The command exits nonzero if the ABC, manifest, fixture hashes, branch targets, anchors, callsites, ledgers, or aggregate observations change. If a reviewed fixture becomes positive, the analyzer fails deliberately so the case must be authenticated and documented rather than silently folded into a zero-only report.

## Map gist and surfaced route

Map gist:

> Horde and Zombie code contain non-prefiltered `_-a50` mode masks, and method 7190 can restore an unrestricted type word, but no authentic replay or authenticated reference trace attests a true state-4 classification bit.

Surfaced route:

> Run a privacy-safe interpreted-reference HORDE or ZOMBIE scenario that records mode-entity creation, `_-Y1k` membership, writer-6519 entry, the classification bit, native completion, and the resulting hash-attested format-268 file. Include method-7190 ordering in the same trace or prove it cannot affect state-4 writing.

No other Wayfinder ticket was claimed, edited, or resolved by this investigation. The canonical map was not edited.

## Related evidence

- [Composite entity classification at commit `396b0a3`](https://github.com/NickTacke/brawlhalla-sim/blob/396b0a3328b912dd5b0cb9864c5f47b0325cd2f1/artifacts/research/composite-entity-classification/composite-entity-classification.md)
- [Replay-producing match universe at commit `da6b4f0`](https://github.com/NickTacke/brawlhalla-sim/blob/da6b4f09260205d15b19cf3924777e0ed3a7ee03/research/wayfinder/replay-producing-match-universe.md)
- [Replay-writer eligibility at commit `cb0040c`](https://github.com/NickTacke/brawlhalla-sim/blob/cb0040cc14e2e0e824966f559f53017cc05de9fd/artifacts/research/replay-writer-eligibility/replay-writer-eligibility.md)
- [Zombie handicap mutation at commit `f939159`](https://github.com/NickTacke/brawlhalla-sim/blob/f939159f54bebe2a8404865d155f2fff9c1d9ebd/artifacts/research/handicap-mutation-policy/handicap-mutation-policy.md)
