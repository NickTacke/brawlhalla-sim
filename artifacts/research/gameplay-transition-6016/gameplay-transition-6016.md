# The 6,016 ms reporting epoch in Brawlhalla 10.09.96325

Issue: [Determine the 6,016 ms gameplay transition](https://github.com/NickTacke/brawlhalla-sim/issues/30)

## Verdict

**Serialized time 6,016 ms is not a proven gameplay-state transition on the ordinary timed path.** It is the fixed difference between two reports that use different epochs:

```text
ordinary serialized result = resultTick - (activationMarker - 16)
GameDuration              = resultTick - activationMarker - 6000

ordinary serialized result - GameDuration = 16 + 6000 = 6016 ms
```

The result tick cancels. The 6,016 ms difference therefore exists for every ordinary result regardless of match length or the gameplay event that ends the match.

The exact proven startup offsets are:

- **16 ms, replay tick 1:** method 3428 writes the first processed activation-initialization tick to `_-u16._-q3e`.
- **6,016 ms, replay tick 376:** the implied `GameDuration` epoch `q3e + 6000`. At this exact tick, ordinary timed calculations still produce the full configured duration, and inclusive startup accounting gates still return. No distinct gameplay-state write was found.
- **6,032 ms, replay tick 377:** the next authoritative tick. This is the first tick after the implied duration epoch, the first tick for which the inclusive `q3e + 6000` accounting gates no longer return, and the first tick whose exact timed remainder is 16 ms below the configured duration.

The evidence does not identify 6,016 ms as GO, countdown completion, control enablement, fighter activation, or any other named gameplay transition. The first activation-initialization transition is at 16 ms. The ordinary timed clock first progresses beyond its startup boundary at 6,032 ms. A human-readable GO or control-enablement boundary remains unknown.

## Evidence grades

- **Proven:** exact typed-trait or instruction-level control/dataflow in the hash-pinned ABC, including validated branch targets and a hash-fixed ledger of every reviewed instruction range.
- **Reporting epoch:** an algebraic boundary implied by two proven report expressions but not materialized as a gameplay-state field or event.
- **Unknown:** the inspected primary evidence does not support a gameplay name or control transition.

Prior reports and repository parser names were locators only. The verdict derives from the pinned executable and the committed fail-closed analyzer.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Tick publication, marker write, timestamp writers, duration reports, ordinary timed path, marker-plus-6,000 review |
| Sole semantic build string in that ABC | `10.09.96325` | Build identity |
| Decoded method bodies | `15,010` | Complete method decode and branch validation |
| Reviewed instruction-range ledger | `9bac554cf9373754da3504ff26277ffd0a308b3e50fe8818b7a569b608083abe` | Every opcode, operand, original byte PC, and branch offset in the control/dataflow ranges used by this verdict |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |
| Repository source base | commit `61e27e5` | Existing evidence conventions and source baseline |

The analyzer consumes every method body completely, validates every branch target, resolves multiname strings with `strings[index - 1]`, and hash-fixes every opcode, operand, byte PC, and branch offset in the reviewed control/dataflow ranges. A separate bounded structural search records sites where an exact `q3e` reference appears within eight instructions before literal 6,000 and the literal is adjacent to integer addition. That search is a review aid, not a general stack/dataflow completeness claim.

## Authoritative clock and activation marker

Method 3217 `_-u16._-z3z` is the fixed 16 ms authoritative loop. Instructions 854 through 862, byte PCs 1898 through 1916, perform:

```text
T = priorProcessedTick + 16
_-X6r._-L67 = T
```

The publication occurs before tick systems. On the first processed tick, method 3217 tests `_-q3e == 0` and calls method 3428 `_-u16._-q5Q(T)`. Method 3428 instructions 62 through 64, byte PCs 152 through 159, write:

```text
_-u16._-q3e = T
```

Let `M = q3e`. The ordinary timestamp writers use origin `O = M - 16`. The marker therefore serializes as:

```text
M - O = M - (M - 16) = 16 ms
```

This is replay tick `16 / 16 = 1`. Serialized zero is the preceding normalization slot and clamp bucket, not the marker transition.

## Ordinary timestamp origin

Methods 6520 through 6523 share the same compiled origin selection. A special-mode guard can select zero, but its ordinary branch computes `q3e - 16`:

| Writer | Purpose | Instruction range | Byte-PC range | Ordinary origin |
| --- | --- | ---: | ---: | --- |
| 6520 `_-16._-i3A` | State-6 result | 213-225 | 392-420 | `q3e - 16` |
| 6521 `_-16._-i3b` | State-1 input | 227-239 | 405-433 | `q3e - 16` |
| 6522 `_-16._-O14` | State-5 event | 209-221 | 371-399 | `q3e - 16` |
| 6523 `_-16._-R4C` | State-7 entry | 226-238 | 434-462 | `q3e - 16` |

For the standard terminal path, method 3217 instructions 1305 through 1313 call the ordinary terminal predicate with current tick `T`, then write `z1s = T` on its first true result. Instructions 1398 through 1400 pass that `z1s` to writer 6520. Writer 6520 instructions 226 through 242 subtract the selected ordinary origin and emit the result word:

```text
R = z1s - (q3e - 16)
```

The ordinary result is the inclusive terminal tick expressed from the replay origin.

## GameDuration arithmetic

Two independent sites preserve the same left-associative integer expression.

### Per-result statistics path

Method 3805 `GameStats._-12K(timestamp)`, instructions 204 through 214 and byte PCs 496 through 516, computes:

```text
timestamp - q3e - 6000
```

It divides that value by 16 for a duration-domain tick index. Before a result exists, instructions 29 through 39 and byte PCs 53 through 75 return when:

```text
timestamp <= q3e + 6000
```

Equality remains excluded. The first authoritative tick admitted after that boundary is `q3e + 6016`.

### GameDuration report

Method 3833 `_-O2T._-a1X`, instructions 59 through 72 and byte PCs 124 through 159, stores readable key `GameDuration` with value:

```text
D = z1s - q3e - 6000
```

No replay-origin subtraction occurs in this expression. It measures from an implied epoch 6,000 ms after the marker.

### Fixed identity

For the ordinary result:

```text
R - D
= [z1s - (q3e - 16)] - [z1s - q3e - 6000]
= z1s - q3e + 16 - z1s + q3e + 6000
= 6016 ms
```

This is an epoch conversion. It does not depend on a transition at `R = 6016`.

## Ordinary timed boundary

Method 6937 `_-a1B._-Ga` selects scoring-rule implementations. It has no `ScoringType.TIMED` branch. Its default instructions 240 through 245 construct base rules class `_-N2y`, which is the ordinary timed path. Base initialization method 6733 `_-N2y._-m3h` is a single `returnvoid`; it does not create a round-timer object or write a 6,000 ms transition field.

Each standard tick, method 6935 `_-a1B._-g2p` calls the selected rules method and then method 6955 `_-a1B._-X2n(T)`. Method 6955 instructions 89 through 123, byte PCs 199 through 260, compute the ordinary timed remainder:

```text
configured = settings.mDuration * 1000
end = configured + q3e + 6000
remaining = max(0, min(configured, end - T))
terminal = remaining <= 0
```

The relevant ticks are:

| Source tick | Serialized offset | Replay tick | `end - T` | Timed remainder |
| --- | ---: | ---: | ---: | ---: |
| `q3e + 5984` | 6,000 ms | 375 | `configured + 16` | capped to `configured` |
| `q3e + 6000` | 6,016 ms | 376 | `configured` | `configured` |
| `q3e + 6016` | 6,032 ms | 377 | `configured - 16` | `configured - 16` |

At 6,016 ms the cap branch boundary changes, but its output remains exactly the configured duration. It does not set terminal state and does not produce a distinct gameplay-state value. The first changed exact remainder is one tick later at 6,032 ms. Method 3836 independently returns for `T <= q3e + 6000`, confirming that its downstream accounting starts on that same next tick.

Method 6955 stores a ceiling-rounded whole-second field after computing the exact remainder. That presentation field can remain numerically unchanged across several 16 ms ticks. The 6,032 ms conclusion concerns the exact timed remainder and inclusive gates, not the first visible whole-second decrement.

## Bounded exact marker-plus-6,000 review

The analyzer keys `q3e` by its exact QName, not its obfuscated text alone. Its bounded adjacency search finds 12 sites where an exact marker reference is near literal 6,000 and the literal is adjacent to integer addition. Every site found by that bounded search is disposed below. The ordinary-path verdict itself rests on the hash-fixed factory, base-rule, timer, writer, duration, and branch ranges, not on treating this heuristic search as exhaustive dataflow analysis.

| Method | Literal instruction / byte PC | Disposition |
| --- | ---: | --- |
| 1052 `_-C1o._-q3r` | 3563 / 8506 | Presentation-only camera method, identified by its readable `[Camera.hx]` diagnostic; strict `T > q3e + 6000` gate first becomes true at serialized 6,032 ms |
| 3673 `_-R1f._-33Q` | 74 / 159 | Timer/report arithmetic with configured-duration clamp |
| 3805 `GameStats._-12K` | 33 / 63 | Inclusive startup accounting gate and duration-domain tick arithmetic |
| 3836 `_-O2T.Tick` | 11 / 25 | Inclusive startup accounting gate |
| 6595 `_-v1J._-T4T` | 28 / 61 | Optional round-timer equality check; base timed rules leave the timer slot null, so the method returns before this comparison |
| 6598 `_-v1J._-T1t` | 45 / 108 | Optional round-timer respawn-delay selection; not reached through base timed initialization |
| 6599 `_-v1J._-c17` | 46 / 111 | Optional round-timer respawn-delay selection; not reached through base timed initialization |
| 6955 `_-a1B._-X2n` | 95 / 211 | Ordinary timed end/remainder arithmetic |
| 6955 `_-a1B._-X2n` | 169 / 347 | Alternate capped duration arithmetic behind a mode/configuration branch |
| 7034 `_-81Z._-35B` | 198 / 470 | Conditional non-default scoring subtype selected by the `_‑Q5v` factory branch |
| 7053 `_-54f._-35B` | 40 / 96 | `VOLLEY_BATTLE` scoring subtype |
| 7089 `_-n4L._-35B` | 9 / 16 | `ZOMBIE` scoring subtype |

This bounded review matters because a search restricted to the two `GameDuration` snippets would miss nearby timer, round-timer, subtype, and camera uses. Within the reviewed sites, the one strict post-boundary site outside the reporting classes is camera presentation, not gameplay-relevant state.

Mode-specific initialization methods also form timestamps from their method argument plus 6,000. Those paths own round or special-mode timers and are outside the ordinary timed default selected above. They do not justify naming the ordinary 6,016 ms reporting epoch.

## Reproducible validation

Keep the proprietary ABC under an ignored path or outside the repository. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:gameplay-transition-6016 -- --abc artifacts/main.abc
```

A successful report states:

- status `proven-for-pinned-abc`;
- build `10.09.96325` and ABC SHA-256 `9fe9...ba2d`;
- 15,010 decoded method bodies, valid branch targets, and reviewed-range ledger `9bac...3abe`;
- activation marker offset 16 ms, tick 1;
- implied duration epoch 6,016 ms, tick 376;
- first post-boundary tick 6,032 ms, tick 377;
- 12 bounded marker-plus-6,000 adjacency sites with the dispositions above.

The command emits no ABC bytes, decompiled instructions, local input path, replay bytes, player data, or proprietary source payload. Verification failures report a bounded reason. The operating system can still include a caller-supplied path in failures that occur before the analyzer handles input.

## Confidence and residual gaps

### High-confidence conclusions

- The ordinary replay origin is `q3e - 16`.
- The activation marker itself serializes at 16 ms, replay tick 1.
- `GameDuration` is `z1s - q3e - 6000`.
- Ordinary serialized result time exceeds `GameDuration` by exactly 6,016 ms.
- The implied 6,016 ms epoch is not a proven gameplay-state transition.
- At 6,016 ms, the ordinary exact timed remainder still equals the configured duration.
- The first post-boundary authoritative tick is 6,032 ms, replay tick 377.
- Every exact `q3e + 6000` site in the pinned ABC is disposed.

### Residual uncertainty

1. **Human-readable startup transition:** unknown. Static arithmetic does not establish GO, countdown completion, or control enablement.
2. **Fighter input eligibility:** not closed here. This analysis does not claim controls become active at 6,032 ms.
3. **Visible timer decrement:** distinct from the exact remainder. Ceiling-rounded whole seconds can remain unchanged after the first post-boundary tick.
4. **Special-mode origins and timers:** out of this ordinary-path result. Their origin-zero and round-specific semantics remain separate.
5. **Other builds:** out of scope. The result applies only to ABC `9fe9...ba2d`.

## Ticket and fog impact

This resolves the question without assigning a gameplay name to 6,016 ms. Planning and implementation should model these separately:

- ordinary replay origin;
- activation marker;
- implied `GameDuration` epoch;
- exact timed remainder;
- terminal/result tick;
- any future proven GO or control-enablement transition.

A precise follow-up research question is now visible: **Which exact ordinary-path writes gate fighter input and action eligibility during startup, and on which authoritative tick do they change?** That question should remain in lifecycle/countdown fog or become a separately owned research ticket if the map needs the named control boundary. This session does not create or claim that ticket.

No change to the canonical map is required to record this evidence. The issue resolution should supply the one-line map gist without editing the map in this session.

## Related reviewed evidence

- [Authoritative tick phases and timestamp semantics](https://github.com/NickTacke/brawlhalla-sim/blob/54a0d782/artifacts/research/tick-phase-semantics/tick-phase-semantics.md)
