# Special-mode replay timestamp origins in Brawlhalla 10.09.96325

Issue: [Recover special-mode replay timestamp origins](https://github.com/NickTacke/brawlhalla-sim/issues/29)

## Verdict

The four replay section writers use the same runtime-state predicate to select timestamp origin `O`, but they do **not** select it from `GameModeType` or scoring mode. The selector is the match runtime lifecycle mask `_-u17._-b4a`, its transition-history mask `_-u17._-HS`, and one `_-u17._-p5G` subtype check.

The exact pinned-build predicate is:

```text
active(F) = (b4a & F) != 0 || ((b4a & 32) != 0 && (HS & F) != 0)

zeroOrigin =
  (b4a & (2 | 4 | 1024 | 2048 | 8192 | 262144 | 524288 | 4194304)) != 0
  || active(32768)
  || (p5G == 2 && active(16))

O = zeroOrigin ? 0 : q4F - 16
```

The issue's `_-q3e - 16` locator does not match the hash-pinned ABC. All four exact writer instructions read `_-u17._-q4F`; class `_-u17` has no `_-q3e` slot. `_-q4F` is initialized once from the first quantized tick.

The result, input, KO-face, and victory-face writers then apply:

```text
result     = uint32(sourceTimestamp - O)
input      = uint32(max(0, sourceTimestamp - O))
KO face    = uint32(max(0, sourceTimestamp - O))
victory    = uint32(max(0, sourceTimestamp - O))
```

Telemetry and `GameStats` independently define:

```text
GameDuration = uint32(z35 - q4F - 6000)
```

For the direct terminal result write, `sourceTimestamp = z35`. Therefore:

```text
ordinary origin: result = GameDuration + 6016
zero origin:     result = GameDuration + q4F + 6000
```

For any source timestamp `t`, let `delta = t - z35`. Before the input/event zero clamp:

```text
ordinary origin: serialized(t) = GameDuration + 6016 + delta
zero origin:     serialized(t) = GameDuration + q4F + 6000 + delta
```

Confidence is **high** for the predicate, formulas, section-specific reachability, exact writer callsite closure, and ordinary-mode corpus relation in the pinned build. Authentic zero-origin replay production remains unobserved.

## Evidence grades

- **Proven:** exact instruction, branch-target, control-flow, or dataflow closure in the hash-pinned ABC.
- **Observation:** a direct value in the hash-pinned ordinary replay corpus.
- **Structural name:** the narrowest name supported by a readable startup literal and exact state assignment.
- **Unknown:** the inspected primary evidence does not recover an unobfuscated semantic name or authentic production frequency.

Repository constants and parser types were locators only. The verdict derives from ignored user-owned primary inputs and the committed fail-closed analyzer.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Writer predicates, timestamp arithmetic, callsites, tick origin, cleanup reachability, telemetry |
| Sole semantic build string | `10.09.96325` | Build identity |
| Authentic format-268 manifest | `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac` | Exact 12-replay ordinary timed cohort and fixture hashes |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |
| Exact instruction ledger | `9fd365b71f669004df1c5015de84e1be0f26cb12667af7f5a907d953ae2da4e4` | 17 complete method bodies containing every asserted control/dataflow anchor |
| Repository source base | commit `61e27e5be5df6e3de7f08398253019d075d41539` | Analyzer and parser baseline |

The analyzer decodes all 15,010 ABC method bodies, validates every branch target, pins the complete instruction ledger, asserts the exact-QName reference and callsite set for methods 6520-6524, verifies every corpus fixture hash, and emits only aggregate replay observations.

## Runtime mode-to-origin table

These are runtime lifecycle modes, not `GameModeType` records.

| Runtime condition at section write | Narrow evidence-backed meaning | Origin | Reachability note |
| --- | --- | --- | --- |
| No zero-origin condition | Ordinary lifecycle | `q4F - 16` | Reachable for all four section families; observed in all 12 reviewed online timed fixtures |
| `b4a & 1024` | Replay playback startup | `0` | Method 3507 assigns 1024 beside literal `replay` |
| `b4a & 2048` | Replay-family end state | `0` | Method 3217 assigns 2048 after the replay-family terminal delay; method 3509 also selects it when transitioning from the replay-family mask |
| `b4a & 8192` | Unnamed replay-family state | `0` | Grouped everywhere with 1024/2048 in the writer predicate; no readable declaration or authentic fixture names it |
| `b4a & 524288` | Spectate startup | `0` | Method 3505 assigns 524288 beside literal `spectate` |
| `active(32768)` | Training startup, including transition state 32 whose `HS` was 32768 | `0` | Method 3501 assigns 32768 beside literal `training` |
| `p5G == 2 && active(16)` | Subtype-2 practice lifecycle, including transition history | `0` for an early state-6 result | Method 3205 assigns state 16; cleanup resets `p5G` to zero before states 1/5/7, so this branch cannot select their origin |
| `b4a & (2 | 4 | 262144 | 4194304)` | Unnamed lifecycle states | `0` | Exact static branches are proven; unobfuscated state names and authentic save production are unknown |
| `b4a == 32`, with no qualifying bit in `HS` | Ordinary transition | `q4F - 16` | Transition bit 32 alone does not select zero |

The duplicate lower test for `1024 | 2048 | 8192` in the compiler-expanded predicate is unreachable after the earlier test catches the same mask. It does not add another mode.

## Section formulas and reachability

| Replay section | Writer | Origin selection | Source arithmetic |
| --- | --- | --- | --- |
| State 6 result | 6520 `_-i3B` | Full predicate, including live `p5G == 2` | Unsigned subtraction with 32-bit wrap; no clamp |
| State 1 inputs | 6521 `_-i4C` | Full predicate, but finalizer has already reset `p5G = 0` | If `O >= input._-D6d`, write 0; otherwise write `input._-D6d - O` |
| State 5 KO faces | 6522 `_-O15` | Full predicate, but finalizer has already reset `p5G = 0` | If `O >= event._-y3l`, write 0; otherwise write `event._-y3l - O` |
| State 7 victory faces | 6523 `_-R4D` | Full predicate, but finalizer has already reset `p5G = 0` | If `O >= eventTime`, write 0; otherwise write `eventTime - O` |

The complete exact-QName reference and callsite closure is:

```text
method 3217 PC 3215: z35 -> method 6520 state-6 writer
method 6524: optional fallback result -> 6520
method 6524: inputs -> 6521
method 6524: KO faces -> 6522
method 6524: victory faces -> 6523
method 3442: reset p5G to 0 -> sole call to finalizer 6524
```

Method 6524 tests whether a state-6 result was already written. If so, it skips only the fallback result call and continues to states 1/5/7. If not, indices 260-270 select exact source `_-21L` when local predicate 2 is true or `_-X6B` when it is false, then pass that source to method 6520. The general `t` equations above therefore cover both fallback branches exactly.

The subtype-2 path is statically reachable: method 3508 assigns `p5G = 2` and state 8388608; dispatcher method 3218 sends state 8388608 to method 3205; method 3205 changes the lifecycle to state 16 without resetting `p5G`; and method 3217 has the sole direct `z35 -> 6520` result call. Conversely, method 3442's `p5G = 0` write dominates its sole finalizer-6524 call in the validated control-flow graph. This proves why subtype-2 state 16 can select zero for a direct result but cannot select zero for later input/event sections in the same cleanup.

## Exact writer anchors

The issue's instruction-index ranges correspond to these byte-PC anchors:

| Writer | Origin branch | Zero branch | Ordinary branch | Stored origin |
| --- | --- | --- | --- | --- |
| 6520, state 6 | index 214, PC 393 | index 215, PC 397 | `q4F` PC 410; `16` PC 413; `subtract_i` PC 415 | index 225, PC 418 |
| 6521, state 1 | index 228, PC 406 | index 229, PC 410 | `q4F` PC 423; `16` PC 426; `subtract_i` PC 428 | index 239, PC 431 |
| 6522, state 5 | index 210, PC 372 | index 211, PC 376 | `q4F` PC 389; `16` PC 392; `subtract_i` PC 394 | index 221, PC 397 |
| 6523, state 7 | index 227, PC 435 | index 228, PC 439 | `q4F` PC 452; `16` PC 455; `subtract_i` PC 457 | index 238, PC 460 |

Result method 6520 PCs 421-425 subtract the selected origin from its source parameter and PC 456 writes it. Input method 6521 PCs 642-683 clamp and write each source timestamp. KO method 6522 PCs 581-611 does the same. Victory method 6523 PCs 564-586 does the same.

## `GameDuration` closure

Telemetry method 3833 sets readable property `GameDuration` from this exact stack sequence:

```text
index 62  getproperty z35
index 65  getproperty q4F
index 66  subtract_i
index 68  pushuint 6000
index 69  subtract_i
index 72  setproperty GameDuration
```

`GameStats` method 3805 independently computes `argument - q4F - 6000` at indices 204-214, divides the result by 16 at indices 215-220, and uses the tick bucket for its statistics maps. This independently fixes the 6000 ms exclusion and 16 ms unit.

Method 3217 indices 863-870 initializes `q4F` only when it is zero, passing the first quantized tick to method 3428. Method 3428 indices 62-64 stores that value. The ordinary replay origin therefore subtracts the pre-first-tick boundary `q4F - 16`, not the first published tick itself.

The direct state-6 call at method 3217 indices 1396-1400 passes `z35` to method 6520. Combining that edge with telemetry gives the exact terminal equations above without assuming a configured match duration.

## Ordinary corpus observation

The reviewed corpus contains 12 hash-verified online timed four-player free-for-all format-268 replays. It does not contain a zero-origin special mode.

For every fixture:

- configured duration is 180,000 ms;
- every result record is 186,016 ms, exactly `GameDuration + 6016`;
- the input timeline begins at 0;
- result-record count ranges from one through three;
- maximum input timestamp ranges from 186,608 through 189,184 ms because input capture can continue after the terminal result.

This is consistent with the independently proven ordinary formula and proves that result length is not a playback cutoff or input-tail boundary. The corpus does not expose runtime `z35` or `q4F`, so it does not independently measure telemetry `GameDuration` or establish authentic special-mode production frequency.

## Reproducible validation

Keep proprietary ABC and replay inputs under ignored paths or outside the repository. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:special-mode-timestamps -- \
  --abc /path/to/hash-pinned/main.abc \
  --manifest /path/to/hash-pinned/manifest.json
```

Successful output reports `proven-for-pinned-abc-and-reviewed-ordinary-corpus`, build `10.09.96325`, 15,010 decoded method bodies, valid branch targets, ledger `9fd365...da4e4`, 12 verified fixtures, ordinary configured duration 180,000 ms, result length 186,016 ms, and input minimum 0.

The command fails closed on a changed ABC, manifest, fixture hash, build string, branch target, writer instruction, exact-QName reference and callsite set, tick-origin edge, cleanup order, telemetry equation, startup-state anchor, ordinary formula, or corpus count. Successful output includes no replay bytes, fixture names, player names, player IDs, source XML, ABC bytes, or local paths. Operating-system errors can still reveal a caller-supplied path.

## Confidence and residual gaps

### High-confidence conclusions

- All four writers share the exact zero-origin predicate above.
- The ordinary origin is exact field `q4F - 16`; the issue's `q3e` spelling is not the pinned field.
- Result subtraction wraps as `uint`; input and face-event timestamps clamp at zero before subtraction.
- `GameDuration = z35 - q4F - 6000` in both telemetry and `GameStats`.
- Direct ordinary terminal results equal `GameDuration + 6016`.
- State 6 can observe live `p5G == 2`; states 1/5/7 cannot because cleanup resets `p5G` first.
- Training, replay playback, replay-family end, and spectate have readable literal-to-state anchors selecting zero.
- Every exact-QName reference and callsite for methods 6520-6524 is disposed.

### Residual uncertainty

1. **Unnamed lifecycle states:** original names for bits 2, 4, 8192, 262144, and 4194304 are not recovered. Their zero-origin behavior is exact.
2. **Authentic special-mode fixtures:** absent. Static arithmetic is proven, but no reviewed replay observes zero-origin production.
3. **Replay production reachability:** the writer branch exists for every listed state, but this evidence does not prove the reference game emits a replay from every lifecycle state. Save-attempt reachability and native file disposition remain separate concerns.
4. **Other builds:** out of scope. The predicates and field identities apply only to ABC `9fe9...ba2d`.
5. **Fallback clock semantic names:** method 6524's exact `_21L`/`_X6B` source selection and both formulas are proven. Their original unobfuscated semantic names are not recovered.

## Ticket and fog impact

This resolves the timestamp-origin decision for implementation: preserve the raw section timestamps produced by the table and do not normalize every replay to `GameDuration`, result length, or a universal 6016 ms offset.

Suggested follow-up ticket if the simulator needs human-readable diagnostics: **Recover replay lifecycle state names and production reachability** for bits 2, 4, 8192, 262144, and 4194304. That work is not required to implement the exact selector because the serialized replay exposes the already-transformed timestamps, but it would replace numeric structural names and test whether authentic zero-origin files exist.

Suggested fog note: special-mode lifecycle and termination still needs a broader contract connecting mode-specific clock initialization, replay production eligibility, native file disposition, and final result selection. This finding supplies the timestamp seam but does not settle those surrounding policies.
