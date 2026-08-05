# Bot recording and replay regeneration in Brawlhalla 10.09.96325

Issue: [Prove bot recording and replay regeneration behavior](https://github.com/NickTacke/brawlhalla-sim/issues/28)

## Verdict

**Build `10.09.96325` records bot commands into the ordinary per-fighter state-1 input timeline and consumes those serialized commands during replay. Replay-internal control flow does not run live bot AI to regenerate commands during playback.**

The two phases are distinct:

```text
recording:
  bot controller Think
    -> bot input adapter mask
    -> fighter input timeline snapshot
    -> state-1 writer

playback:
  state-1 reader
    -> replay loader
    -> fighter input timeline snapshot
    -> timestamp sampler
    -> gameplay input consumer
```

In that limited sense the complete lifecycle uses both AI and serialization: live AI produces commands in the original match, then the replay serializes and reuses those commands. Playback itself is not a hybrid. Replay startup creates every restored fighter with flags `1 | 8 = 9`; bot flag `32` is absent, so startup cannot create a bot controller. The only later bot-conversion path is reachable exclusively through `LinkUpdater` ingress, not replay-loader or match-tick control flow.

Confidence is **high** for the pinned build. The verdict comes from a complete static bot-decision-to-timeline and replay-reader-to-gameplay closure. No authentic bot replay or live-client instrumentation was required.

## Evidence grades

- **Proven:** exact typed instruction-level control/dataflow in the hash-pinned ABC, with branch targets validated and complete exact-QName ledgers pinned.
- **Bounded closure:** every fighter construction, bot-controller construction, exact method callsite, or exact field reference requested by the analyzer was enumerated for the pinned ABC.
- **Observation:** a direct value in the reviewed hash-attested replay manifest.
- **Unknown:** the inspected primary evidence does not settle the claim.

Repository parser names and earlier reports were locators only. The behavioral verdict derives from the pinned executable.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Bot flags, controller, input adapter, timeline capture, state-1 writer-reader, replay loader, gameplay sampler |
| Sole semantic build string in that ABC | `10.09.96325` | Build identity |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |
| Reviewed replay manifest | `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac` | Confirms the current 12-fixture cohort has no bot replay |
| Exact method-reference ledger | `d53bbd66cfba5147655047a845a94127b2d66dca7b86aadb60946f387eabb861` | Fighter factory, bot decision, capture, writer, reader, loader, sampler, and conversion callsites |
| Bot decision call graph | `0a6adb1332bfc438f1f08263ad56e1b85352e27322644b447e1fb0a08746d5f4` | `Think` reachability into input-adapter mask writers |
| Bot-conversion handler class ledger | `be986776ca726b35415d22579ffdaf4797839dd80fbb2fe6759da714806bf946` | Exhaustive construction and ownership of the conversion handler |
| Relevant method ledger | `935ee18ff885266018a4b1fed539a2fca9a5d987a70a5d2256517f213392f2aa` | Full ordered PC/opcode/operand closure for the proof methods |

The analyzer decodes all 15,010 method bodies, rejects invalid branch targets, requires the exact ABC and build identities, validates the anchors below, and fails if any pinned reference or relevant-method ledger changes.

## Runtime identities

| Role | Identifier |
| --- | --- |
| Match runtime | class 164 `_-u16` |
| Fighter | class 147 `_-V4R` |
| Fighter flags | `_-V4R._-56G` |
| Bot flag | `_-V4R._-F43 = 32` |
| Fighter timeline | `_-V4R._-xZ`, class 330 `_-Tx` |
| Timeline snapshot vector | `_-Tx._-W5y` |
| Snapshot | class 251 `_-O3Y` |
| Snapshot timestamp | `_-O3Y._-D6c` |
| Snapshot command mask | `_-O3Y._-T4y` |
| Bot controller | class 42 `_-d1H` |
| Bot decision entry | method 730 `Think` |
| Bot input adapter | class 260 `_-E6o` |
| Per-tick bot capture | method 6129 `_-Tx._-91w` |
| Ordered insertion | method 6133 `_-Tx._-PB` |
| Timestamp sampler | method 6135 `_-Tx._-72L` |
| Gameplay input consumer | method 6125 `_-Tx._-B1i` |
| Parsed replay | class 356 `_-E4h`, reader 6510 `_-N4v` |
| Replay startup/loader | method 3507 `_-u16._-H4o` |
| State-1 writer | class 357 `_-16`, method 6521 `_-i3b` |

## Every bot construction and state-1 presence

### Exact flags

Script initializer method 3074 defines the relevant one-bit fighter flags:

| Trait | Value | Role in this proof |
| --- | ---: | --- |
| `_-6c` | 1 | Replay-base fighter flag |
| `_-t1T` | 4 | Timeline-producing flag |
| `_-76C` | 8 | Timeline-producing flag used by normal and replay fighters |
| `_-F43` | 32 | Bot-controller flag |
| `_-N3K` | 256 | Timeline-producing flag |
| `_-64t` | 2,097,152 | Timeline-disable/takeover-related flag inspected by capture method 6129 |

Fighter constructor method 2790 creates `this._-xZ = new _-Tx(match, this)` at PCs 4480-4498 when constructor flags intersect `4 | 8 | 256`. It separately creates `this._-13k = new _-d1H(match, this, this._-xZ, ...)` at PCs 4521-4569 when flags contain bot bit 32. The controller receives the exact same timeline field later read by the state-1 writer.

### Complete fighter-factory coverage

Every exact construction of fighter class `_-V4R` closes through factory method 3071 PC 16. The factory has 13 caller methods. Exactly eight callers reference bot flag 32; every bot-producing flag expression also contains timeline flag 4 or 8:

| Factory caller | Bot-producing flag closure |
| --- | --- |
| 3205 `_-u16._-g1k` | Starts with `_-76C = 8`; bot branch adds `_-6c | _-F43`; alternate call explicitly uses `_-6c | _-F43 | _-76C` |
| 3228 `_-u16._-m3M` | Starts with `_-6c | _-76C`; bot branch adds `_-F43` |
| 3282 `_-u16._-6e` | Bot branch uses `_-6c | _-F43 | _-t1T` |
| 3514 `_-u16._-E4G` | Bot branch includes `_-F43 | _-76C` |
| 3529 `_-u16._-i1A` | Starts with `_-6c | _-76C`; bot branch adds `_-F43` |
| 3565 `_-M3b._-J4a` | Uses `_-F43 | _-76C` plus mode-specific flags |
| 3623 `_-L4p._-v2G` | Initializes flags with `_-76C | _-F43` plus a mode-specific flag |
| 12800 `_-n5Z._-95v` | Bot branch uses `_-F43 | _-6c | _-76C` |

Therefore every fighter created as a bot by the factory receives a non-null `_-Tx` timeline before its bot controller is created.

There is one additional bot-controller construction in method 11421 `_-l7._-66y`. It converts an already-existing typed fighter: it adds `_-76C | _-F43` to that fighter's flags and constructs the controller with the fighter's existing exact `_-xZ` timeline at PCs 114-142. It neither creates a second timeline nor deletes the existing one. This accounts for bot takeover/conversion separately from initial bot creation. Exact callsite closure proves the only route is `LinkUpdater` method 5427 -> `LinkUpdater` handler 5408 -> wrapper 11416 -> conversion 11421; no replay loader or match-tick method calls it. If an arbitrary non-playable `_-V4R` with a null timeline were passed to this external handler, the state-1 writer rule below would omit it; method 11421 assumes and reuses an existing player timeline rather than repairing a null one.

### State-1 presence rule

Method 6521 iterates the match's complete fighter vector `_-u16._-Y1k`. For each fighter it reads exact timeline field `_-xZ` at PC 510. The sole per-fighter state-1 eligibility branch is the null comparison ending at PC 525:

```text
if (fighter._-xZ == null) skip this fighter
else emit one state-1 presence record
```

The method has no exact reference to bot flag `_-F43` and no bot-classification branch. Initial bots therefore receive ordinary state-1 presence because every bot-producing factory path also creates their timeline. Converted bots preserve the preexisting timeline and therefore preserve its presence status.

For each present timeline, method 6521 reads the entire `_-W5y` vector and emits:

```text
presence = 1
entityId: 5 bits
snapshotCount: uint32
repeat snapshotCount:
  timestamp: uint32
  commandMaskPresent: 1 bit
  if present: commandMask: 14 bits
presence = 0  // terminates all entity records
```

A zero command mask uses `commandMaskPresent = 0`; a nonzero mask uses presence 1 plus the 14-bit value. The writer does not elide repeated nonzero masks. Timestamp values are written relative to method 6521's match baseline where applicable.

## Bot decision to serialized timeline

### Controller and adapter wiring

Fighter constructor method 2790 passes the fighter's exact timeline into bot-controller constructor 718. Constructor 718 creates input adapter `_-E6o` and stores that adapter on the timeline through exact field `_-Tx._-aE` at PC 607.

Method 3217 is the authoritative match tick. For each eligible fighter, PCs 663-699 execute in this order:

1. Test fighter flag `_-F43`.
2. Call fighter method 2898 `_-D2l`.
3. Method 2898 requires non-null controller field `_-13k` and calls exact method 730 `Think`.
4. Return to method 3217 and call exact timeline capture method 6129 `_-91w` with the current tick.

Thus bot decisions happen before the same-tick timeline capture.

The complete exact private-method call graph reachable from `Think` reaches controller methods 730, 740, 760, 761, 762, 766, 768, 774, 781, 790, and 791. Those paths reach adapter methods 4894 `Right`, 4896 `_-b2M`, 4898 `Left`, and 4906 `_-Vq`. These methods write adapter held-mask field `_-U1F` and pulse-mask field `_-c5l`.

### Snapshot capture

Timeline method 6129 reads `timeline._-aE._-U1F` and `timeline._-aE._-c5l` at PCs 775-794, ORs them into the current command mask, and clears the pulse mask. It performs bot-specific command adjustments, compares the result with prior mask `_-j3W`, and, when changed, constructs exact snapshot `new _-O3Y(tick, mask)` at PCs 1153-1159.

The method then takes one of the reference runtime's synchronization paths:

- Direct path: push the snapshot to committed timeline `_-W5y` at PCs 1235-1245.
- Synchronized path: push it to pending vector `_-P4G` at PCs 1254-1262 and forward its timestamp/mask through method 6124 `_-R4p`. Class-88 methods 1566 and 1584 are two of the complete exact callsites that construct received snapshots and invoke ordered insertion method 6133 on `_-W5y`.

State-1 writer 6521 serializes committed vector `_-W5y`, not the bot adapter and not the `Think` output directly. This is recording of commands, not recording of AI state.

## State-1 reader and replay loader

Reader method 6510 initializes exact integer maps `_-V5z` and `_-X1d` at PCs 244-267. State switch value 1 enters the input branch at PC 374. For each entity it reads:

1. Entity ID through a five-bit read at PCs 375-386.
2. Snapshot count through a 32-bit read at PCs 388-395.
3. Each timestamp through a 32-bit read at PC 541.
4. One-bit command-mask presence at PC 552.
5. A 14-bit command mask at PC 570 when present, otherwise zero.

It stores parallel timestamp and command vectors under the entity ID in the two exact maps. Those are the same exact fields consumed by replay loader method 3507.

Method 3507 receives parsed replay class `_-E4h`. It creates each restored fighter, resolves the state-1 arrays for the corresponding entity, constructs `_-O3Y(timestamp, mask)` snapshots at PCs 624-645, and calls exact ordered insertion method 6133 `_-PB` at PC 649.

Method 6133 inserts each snapshot into exact vector `_-W5y` in timestamp order. Method 6135 samples that vector using exact snapshot timestamp and mask fields with exact/hold-last behavior. Gameplay input method 6125 calls method 6135 at PCs 352, 1619, and 1659 and derives gameplay input state and edges from the sampled values.

The consuming playback chain is therefore:

```text
state-1 bytes
  -> reader 6510 maps
  -> loader 3507
  -> new _-O3Y(timestamp, mask)
  -> insertion 6133
  -> timeline _-W5y
  -> sampler 6135
  -> gameplay input method 6125
```

## Why playback cannot regenerate bot commands

Replay loader method 3507 calls fighter factory 3071 with constructor flags:

```text
_-V4R._-6c | _-V4R._-76C
1 | 8 = 9
```

Bot flag `_-V4R._-F43` is 32, and `(9 & 32) == 0`.

Fighter constructor method 2790 creates bot controller `_-d1H` only behind `(flags & 32) != 0`. Fighter method 2898 calls `Think` only when that controller is non-null, and authoritative tick method 3217 additionally gates the call on flag 32. Restored fighters therefore have a timeline but no bot controller and no replay-internal `Think` call.

The exhaustive post-construction route does not weaken that conclusion. Method 11421 is referenced only by wrapper 11416, wrapper 11416 is called only by `LinkUpdater` method 5408, and method 5408 is exposed only through `LinkUpdater` method 5427. It is external link ingress, not replay reconstruction or regeneration. A host that injects such an out-of-band conversion during playback has changed match state outside the replay-driven input contract.

Playback consumes the reconstructed timeline for former human and bot entities alike. It does not know or need the original command producer once state 1 has been restored.

## Complete reference closure

The analyzer pins these independent closures:

- Every exact fighter construction and all 13 factory callers.
- Every exact bot-controller construction (initial constructor 2790 and conversion method 11421), plus the conversion-only `LinkUpdater` ingress chain.
- The eight factory callers that can add bot flag 32, with local/stack dataflow from each paired timeline flag expression into the same factory call.
- Exact `Think` call graph into adapter mask writers.
- Exact timeline adapter, timestamp, command-mask, parsed-map, and fighter-flag reference ledgers.
- Exact callsites of bot capture 6129, insertion 6133, sampler 6135, state-1 writer 6521, and conversion method 11421.
- The full ordered instruction ledger for all methods that carry the proof.

This closure is bounded to the pinned ABC. It is not a claim about another build.

## Reproducible validation

Keep the proprietary ABC outside version control. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:bot-replay-regeneration -- \
  --abc /path/to/hash-pinned/main.abc
```

Useful bounded output:

```bash
bun run provenance:bot-replay-regeneration -- \
  --abc /path/to/hash-pinned/main.abc \
  | jq '.status, .identity, .verdict, .botEntityCoverage, .referenceClosure.exactLedgers'
```

Successful output reports `proven-static`, build `10.09.96325`, ABC digest `9fe9...ba2d`, 15,010 decoded method bodies, valid branch targets, eight bot-producing factory callers, two exhaustive bot-controller construction sites, restored playback flags 9, and the pinned ledgers above.

The analyzer emits no ABC bytes, replay bytes, player names, player IDs, fixture names, account data, or local input path. Operating-system errors can still reveal a caller-supplied path.

## Corpus observation

The reviewed 12-fixture format-268 manifest is hash-attested but has `botCounts: { "0": 12 }`. It cannot dynamically corroborate this verdict. The issue's accepted alternative was a complete static bot-decision-to-timeline dataflow, which the analyzer supplies.

No private replay was added or redistributed.

## Confidence and residual gaps

### High-confidence conclusions

- Initial bot fighters have ordinary non-null timelines before their controllers are created.
- Bot takeover/conversion reuses the existing fighter timeline rather than creating a bot-only command channel.
- Bot `Think` output reaches timeline snapshots during recording.
- State-1 writer 6521 serializes every non-null fighter timeline without excluding bots.
- State-1 reader 6510 and loader 3507 restore those snapshots.
- Gameplay method 6125 consumes the restored masks through sampler 6135.
- Replay startup excludes bot flag 32, so restored fighters cannot run bot `Think`.
- Playback uses serialized commands only; live AI regeneration is not combined with replay input.

### Residual uncertainty

1. **Dynamic bot fixture:** absent. The current corpus contains no bot. A hash-attested bot replay would provide runtime corroboration but is not needed for the static verdict.
2. **Takeover target invariant:** method 11421 retrieves an existing typed fighter and reuses its timeline without a null check. The playable-fighter caller invariant is strongly implied by the map lookup and subsequent controller use, but this report does not claim behavior for an arbitrary synthetic `_-V4R` injected into that map with a null timeline. Its only invocation route is external `LinkUpdater` ingress.
3. **Synchronized transport policy:** the direct committed-timeline path and receiving append methods are exact. Host/network delivery policy and native transport are outside this ABC-only closure.
4. **Other builds:** out of scope.

## Ticket and fog suggestions

No additional ticket is required to answer issue 28. Two follow-ups are now precise enough to consider if runtime corroboration or takeover scope becomes important:

- **Suggested research ticket:** Attest an authentic build-10.09 bot replay and compare each bot's decoded state-1 masks with instrumented sampler 6135 output while bot `Think` remains absent.
- **Suggested fog refinement:** Bot takeover, disconnect replacement, and synchronized input-echo ordering may need their own lifecycle decision when disconnect and replay-producing match behavior is specified.

Neither suggestion changes the verdict or blocks the replay-driven simulator specification.

## Map gist

Bot AI is a recording-time command producer: state 1 serializes every bot timeline, replay startup restores and consumes those commands with bot AI disabled.
