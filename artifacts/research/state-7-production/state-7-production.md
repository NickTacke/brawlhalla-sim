# Format-268 state 7 production semantics

Issue: [Recover state-7 production semantics](https://github.com/NickTacke/brawlhalla-sim/issues/31)

## Verdict

For build `10.09.96325`, format-268 state 7 serializes **FaceVictory events**. The inspected Brawlball, Soccer, and Volleyball scoring implementations can produce it. Each entry is `(entity ID, match-relative event time)`: a five-bit producer-selected entity and `max(0, eventClock - replayOrigin)` as a 32-bit value.

Writer method 6523 emits state 7 whenever its output stream, current rules object, and FaceVictory `IntMap` are non-null. It emits even an empty map. Its sole call is in finalizer 6524, after states 6, 1, and 5 and before state 2 END.

No authentic state-7 section exists in the hash-pinned corpus or any other locally scanned replay. Static evidence proves reachable production, so production impossibility would be false. The requested authentic state-7 span remains an explicit evidence gap.

## Evidence grades

- **Proven:** exact instruction-level control/dataflow in the hash-pinned ABC, a complete exact-QName or callsite ledger, or an authentic hash-pinned replay observation.
- **Bounded observation:** a result from the identified local corpus or broader local scan that does not establish behavior outside those inputs.
- **Unknown:** the inspected primary evidence does not settle the claim.

Repository parser names and prior reports were locators only. The semantic verdict comes from the pinned executable's writer, producers, reader, and readable consumer literal.

## Evidence identity and scope

All digests are SHA-256.

| Evidence | Identity | Role |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d`; 3,934,088 bytes | Writer, finalizer, reader, producers, consumer |
| Sole semantic build string | `10.09.96325` | Build provenance |
| Decoded ABC | 15,010 method bodies | Complete reference and callsite probes |
| Format-268 manifest | `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac` | 12 hash-pinned authentic fixtures |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction decoding and byte-PC location |
| Fail-closed analyzer | `tools/avm2-provenance/state_7_production_provenance.ts` | Static anchors, complete ledgers, producer closure, and corpus absence |

The primary inputs were an ignored user-owned ABC, the ignored replay manifest and fixtures, and the repository replay-format reader. No proprietary binary, replay file, player data, or full replay payload is committed here.

The pinned corpus covers only online playlist 108, four-human timed free-for-all, scoring type 1. It does not cover a state-7-producing mode.

## Exact writer and timestamp dataflow

### Method 6523

Instructions 17-44 return without output unless all three values exist:

1. output stream;
2. `_-x1V._-ta`, coerced to `_-669`;
3. `_-ta._-E4t`, the FaceVictory `IntMap`.

Instructions 226-238 calculate replay origin as either `0` or `_-q3e - 16`, selected by the shared special-mode guard. This evidence establishes the expression but not readable semantic names for every guard bit.

Instructions 239-245 write four-bit discriminator `7`. Instructions 246-253 iterate integer map keys. For every key `T`, instructions 255-288 write:

```text
presence = 1
entityId = _-E4t.h[T] as 5 bits
timestamp = max(0, T - origin) as u32
```

Instructions 293-297 write the zero presence terminator. A non-null empty map therefore emits a five-bit state-7 section: the state nibble followed by the terminator.

### Timestamp origin

The map key `T` comes from the shared authoritative game clock:

```text
method 3217 local 17, tick T
  -> method 6935(uint)
  -> mode-specific dynamic _-35B
  -> FaceVictory map key
```

Brawlball and Volleyball use this route. Soccer method 7001 receives the same unsigned tick and passes it unchanged to producer 7002. Writer subtraction converts the internal tick to replay-relative time and clamps values at or before the origin to zero. The ordinary `-16` branch places replay origin one 16 ms quantum before `_-q3e`.

The stored value is not a score, duration, ordinal, or face asset ID. It is the FaceVictory event timecode relative to replay origin.

## Production condition and entry meaning

The complete exact-QName `_-E4t` ledger contains only:

- 3551: default null;
- 6523: serialization read;
- 6796/6797: producer write and `IntMap` initialization;
- 7002/7004: producer write and initialization;
- 7076/7077: two producer writes and initialization.

Ledger digest: `75524eb7df8ceeb839cfb27032c4a2393145669f3bd2803a564b49fda2a6cb1a`.

Factory method 6937 maps those owners exclusively to `ScoringType.BRAWLBALL`, `ScoringType.SOCCER`, and `ScoringType.VOLLEYBALL`. Their setup methods initialize the map. Writes occur after mode score or goal application:

- **Brawlball:** the scoring entity's ID;
- **Soccer:** the supplied entity's ID, or `0` when absent;
- **Volleyball:** the selected or last-hitter entity's ID, or `0` when absent.

Consumer method 10464 instructions 68-95 passes the decoded state-7 vectors to `_-9B` with literal `FaceVictory`. An entry therefore means: **at this replay-relative time, invoke FaceVictory presentation for this entity ID**. Static evidence does not resolve how downstream presentation interprets fallback entity ID `0`.

## Finalizer ordering and frequency

Method 6524 instructions 271-286 write, in order:

1. state 6 results;
2. state 1 inputs;
3. state 5 FaceKO events;
4. state 7 FaceVictory events through 6523;
5. state 2 END.

The exact method-6523 callsite scan found only method 6524 instructions 278-279. Callsite-ledger digest: `08965bc05f8a1a920744805b1f49e54c3b52469a44f8967971188c27690e196f`.

One normal finalization can therefore emit state 7 at most once. State 7 is absent when a writer prerequisite is null and present, with zero or more entries, whenever the FaceVictory map exists.

## Reader and repetition behavior

Method 6510 instructions 647-670 select state-5 vectors `_-v1W`/`_-F2G` or state-7 vectors `_-m29`/`_-B4I`. Instructions 672-742 repeatedly read `(presence, five-bit ID, u32 time)` through the terminator. Each pair is inserted before the first existing entry with a greater timestamp, or appended otherwise.

Consequences:

- repeated state-7 sections merge;
- merged entries sort ascending by timestamp;
- equal timestamps preserve encounter order;
- reader duplicates are preserved.

The writer source is an `IntMap` keyed by internal tick. A later producer write at the same key replaces the earlier value before serialization. One ordinary writer section cannot contain two events at the same internal tick, although repeated or externally constructed sections can decode to duplicates.

## Authentic corpus and raw-span status

The exact hash-gated scan found `state7Count = 0` across all 12 fixtures. Every sequence was:

```text
3, 4, state 6 repeated 1-3 times, 1, 5, 2
```

A broader bounded scan checked 48 local replay files and found no non-null state-7 vector. Only the 12 manifest fixtures have target-build attestation, so the broader absence is not evidence about build `10.09.96325` beyond that corpus.

Fixture SHA-256 `31457427af337318846d2cc3890449160b10a9bf74cac8d512c626364f69dd0e` has an authentic **state-5 homolog**, not state 7:

- decoded-body bit span: `[186315, 187156)`, 841 bits;
- containing decoded bytes: `[23289, 23395)`, starting at bit 3 and ending at bit 4;
- canonical repack: 106 bytes plus 7 zero-padding bits;
- repacked digest: `1a2a42db7c0b3dfefcca2b2da8ca09a7c31e56b237ce5f8d63eaad3e6208f9f5`;
- bitstring digest: `04dd966fcd119aa8784eb322e7eb065dd9c7eebd03bf95f9225290aa05747e71`;
- repack prefix: `584000b5a8230002`;
- repack suffix: `1dd02400005f1000`.

This authentic homolog confirms the shared list shape without exposing private bulk payload. It is not state 7 and does not satisfy state-7 raw attestation. No authentic state-7 bytes are reproduced because none exist locally. Because the static producers are reachable, this build cannot honestly be classified as unable to produce state 7.

## Reproducible validation

Keep proprietary inputs under the ignored paths shown below or substitute equivalent user-owned paths.

```bash
shasum -a 256 \
  artifacts/research/brawlhalla-physics/main.abc \
  artifacts/replay-corpus/10.09.96325/manifest.json
wc -c artifacts/research/brawlhalla-physics/main.abc
```

Expected identities are the ABC and manifest digests above and an ABC size of 3,934,088 bytes.

The committed historical format-268 analyzer reproduces the pinned corpus section scan:

```bash
git show 327166d:tools/avm2-provenance/replay_format_268_analysis.ts \
  | sed "s#'../../packages/replay-format/src/envelope.js'#'$(pwd)/packages/replay-format/src/envelope.ts'#" \
  | bun run - -- \
      --abc artifacts/research/brawlhalla-physics/main.abc \
      --manifest artifacts/replay-corpus/10.09.96325/manifest.json
```

Expected result: 12 hash-checked format-268 fixtures and no state-7 section.

The fail-closed state-7 analyzer reproduces the static closure and corpus absence:

```bash
bun run provenance:state-7-production -- \
  --abc artifacts/research/brawlhalla-physics/main.abc \
  --manifest artifacts/replay-corpus/10.09.96325/manifest.json
```

It rejects changed ABC or manifest identities, changed semantic build string, changed method-body count, either changed complete ledger, missing writer/reader/finalizer/producer/consumer anchors, fixture hash drift, unexpected replay format, or a changed corpus state-7 count. Successful output reports `proven-static-with-authentic-span-gap`, the three producing scoring types, exact wire shape, finalizer order, duplicate policies, both ledger digests, and zero authentic state-7 sections.

## Confidence and residual gaps

### Proven for the pinned build

- State 7 is a FaceVictory event timeline.
- Its writer gate, empty-map behavior, field widths, timestamp arithmetic, and finalizer order.
- Brawlball, Soccer, and Volleyball are the only exact-map producers in the pinned ABC.
- Normal finalization emits at most one section.
- The reader's merge, timestamp ordering, equal-time ordering, and duplicate behavior.
- The writer map's same-tick replacement behavior.

### Residual uncertainty

1. **Authentic state-7 bytes:** unavailable locally. A consented, hash-attested build-`10.09.96325` Brawlball, Soccer, or Volleyball replay is still required for raw attestation.
2. **Fallback entity `0`:** producer behavior is proven, but its downstream presentation is unknown.
3. **Origin guard:** the arithmetic is proven; the full readable mode-to-origin table remains owned by [Recover special-mode replay timestamp origins](https://github.com/NickTacke/brawlhalla-sim/issues/29).
4. **Replay-producing mode coverage:** static writer reachability does not prove final file disposition for each mode. That coverage remains part of [Decide the conformance corpus coverage model](https://github.com/NickTacke/brawlhalla-sim/issues/16) and [Map replay-producing modes to patch closure dependencies](https://github.com/NickTacke/brawlhalla-sim/issues/36).

## Ticket and fog impact

This resolves the semantic portion of issue 31: state 7 may be modeled as a `FaceVictory` timeline with the exact production, timestamp, and repetition rules above. It does not justify treating state 7 as impossible or limiting replay-driven simulation to the current timed-FFA corpus.

No new semantic ticket is required for producer identity or section behavior. Existing corpus and mode-closure work should acquire a hash-attested special-mode fixture. The remaining entity-0 presentation behavior is low-priority fog unless it affects gameplay-relevant state rather than presentation only.
