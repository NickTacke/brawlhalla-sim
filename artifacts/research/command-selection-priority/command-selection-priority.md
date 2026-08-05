# Simultaneous command-selection priority in Brawlhalla 10.09.96325

Issue: [Recover simultaneous command-selection priority](https://github.com/NickTacke/brawlhalla-sim/issues/40)

## Verdict

Method 6125 `_-Tx._-B1i` does not choose an action from a simple command-bit priority list. It captures each rising command independently, then runs an ordered, stateful sequence of eligibility gates. A candidate that is admitted can reject and allow a later candidate. Some admitted candidates write timestamps even when they reject. Runtime context flag `local32` can reopen later action paths after an earlier candidate consumed the interval.

For rising edges in one sampled 16 ms interval, the ordinary order is:

```text
dodge
  -> first eligible jump attempt
  -> throw-button pickup attempt
  -> light / quick-pickup action
  -> heavy action
  -> mode-specific throw context
  -> ordinary throw power
  -> fallback jump and held-state actions
  -> taunt-group context action
```

The load-bearing tie rule is exact: **a simultaneous light/quick-pickup edge suppresses both later throw paths even when the light helper rejects.** The mode-specific throw path requires `lightTime == 0`; the ordinary throw path requires `throwTime > lightTime`. Equal timestamps fail both predicates. Heavy has no equivalent timestamp suppression, so a failed heavy attempt can fall through to throw.

The mode-specific throw context also admits a throw bit held from a prior interval without a new throw edge. A branch-complete table must therefore distinguish rising command combinations from prior-held throw state. Ordinary throw still requires a new throw edge.

A throw edge gets an earlier pickup attempt before light. Therefore simultaneous throw plus light means: try throw-button pickup first; if it rejects, try light; never reach either later throw path. This is not “light always wins” and not “throw always wins.” It is a stateful eligibility machine with equal-time light suppression and a separate held-throw mode branch.

## Evidence grades

- **Proven:** exact command constants, edge construction, branch order, predicates, direct writes, helper calls, and helper-local commits in the hash-pinned ABC.
- **High-confidence semantic label:** a readable command table and independent typed behavior identify light/quick-pickup, heavy, dodge, throw/pickup, jump, and taunt-group paths.
- **Dynamically resolved:** item availability, current-power state, mode state, action-table lookup, and helper Boolean results.
- **Unresolved:** behavior not fixed by the inspected static state or requiring runtime game data. No unresolved virtual target remains for the named helpers.

Repository code and prior research were locators only. The verdict derives from the user-owned primary ABC and the committed fail-closed analyzer.

## Hash-pinned evidence identity

All digests are SHA-256.

| Property | Value |
| --- | --- |
| Reference patch | `10.09` |
| Reference build | `10.09.96325` |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` |
| ABC bytes | `3,934,088` |
| Decoded method bodies | `15,010` |
| Branch validation | Every `s24` and lookup-switch target is an instruction boundary or permitted `code_length` target |
| Decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` |
| Primary selector | class 330 `_-Tx`, method 6125 `_-B1i(uint):void`, code length `4,006` |

`pc` below means original method-local byte offset. The analyzer resolves constant-pool strings with `strings[index - 1]`, verifies method owners, and emits no ABC bytes, input path, replay data, user identifiers, or local filenames.

## Exact masks and edge construction

Method 14909 initializes the command constants. Method 6125 samples the inclusive hold-last input timeline established by [Recover authoritative tick phases and timestamp semantics](https://github.com/NickTacke/brawlhalla-sim/issues/7). PCs 1001..1042 compute:

```text
current = sampledMask[i]
prior = sampledMask[i + 1]
edge = (current XOR prior) AND current
edgeTime = inputTime - i * 16
```

The backward sample index is processed so that each command local retains the first discovered rising timestamp in the bounded catch-up window.

| Command | Mask | Timestamp local | Held-mask local | Collector PCs |
| --- | ---: | ---: | ---: | --- |
| Heavy | `0x0040` | `20` | `21` | 1099..1135 |
| Light / quick-pickup | `0x0080` | `18` | `19` | 1063..1099 |
| Dodge / dash | `0x0100` | `23` | `24` | 1170..1207 |
| Throw / pickup | `0x0200` | `26` | none | 1238..1270 |
| Jump | `0x0010` | `25` | none | 1207..1238 |
| Taunt group | `0x3c00` | `22` | current held mask passed later | 1135..1170 |

Every bit is independently representable in the replay input mask. All pair and multi-bit combinations of the four scoped action commands are structurally reachable. Static inspection does not claim that every official controller producer emits every taunt-group submask.

## Evaluation state

The predicates below use these exact method-6125 locals:

| Symbol | Local | Meaning |
| --- | ---: | --- |
| `A` | `15` | interval action/suppression state |
| `G` | `17` | Boolean returned by `fighter._-BP(time, local16)` at PCs 901..916 |
| `C` | `32` | runtime action-context flag computed in PCs 1922..2340 |
| `Q` | `33` | companion runtime action-context flag |
| `D`, `L`, `H`, `T`, `J`, `P` | `23`, `18`, `20`, `26`, `25`, `22` | nonzero captured edge timestamps |

`A` is not an absolute method-wide short circuit. Several later predicates admit `C` as an override. Consequently one interval can preserve later callbacks or attempts after an earlier action changed `A`.

## Eligibility and suppression in bytecode order

### 1. Dodge

PCs 2342..2505 evaluate:

```text
(!A || local34)
&& D != 0
&& (fighter._-u44 == 0 || D > fighter._-u44)
```

The admitted path calls `fighter._-d3a(time, dodgeHeldMask & 15, local31)` at PCs 2416..2435.

- A `true` return sets `A = true`, `local14 = true`, and clears `_-x11`.
- A `false` return normally falls through.
- If `fighter._-p4Y` is true, the fallback still writes `_-b5Y = time`, `_-u44 = time`, sets `A = true`, sets `local14 = true`, and clears `_-x11`.

Thus helper rejection does not always mean “dodge had no suppressing effect.”

### 2. First jump opportunity

PCs 2505..2576 require `!local14`, `J != 0`, and a time-window predicate before calling fighter method 2954 `_-61V(time)`. When called, method 6125 sets `A = true` and `local14 = true`. This suppresses the ordinary throw/light/heavy chain unless a later context override explicitly admits a path.

A second jump call exists at PCs 3413..3448 after throw processing. It catches the same edge when the earlier time-window route did not call the helper. Jump therefore must remain in the action state machine even though issue 40 focuses on command selection rather than jump semantics.

### 3. Throw-button pickup

Two routes call `_Y4C._-T1O(time, L == 0)`:

1. PCs 2576..2639: `!A && T != 0 && !local8`.
2. PCs 2639..2716: `mode._-O15() && !A && T != 0`.

Method 1510 proves this is an item-pickup attempt: it rejects null fighter, active-power, timing, mode, and item predicates; resolves an item candidate through `_-71`; commits through `_-G5l(time,item)` at PCs 281..291; clears `_-w5P`; and returns `true` only on commit.

A true return sets `A = true`. **Both admitted routes write `_-b5Y = time` even when `_-T1O` returns false.** When light is simultaneous, argument 2 is false because `L != 0`.

### 4. Light / quick-pickup

PCs 2759..2964 require:

```text
((!A && !G) || C) && L != 0
```

Dispatch then depends on runtime state:

- `local10 && !local36`: call `_-S5o(time, lightHeld & 15, C, Q, 2)` at PCs 2814..2837.
- Otherwise, when `!local37 && (!local8 || input._-T3d < L)`: call `_-l4J(time, lightHeld, J != 0 && !local14, 0, Q, C)` at PCs 2889..2923.

A successful helper sets `A = true`, clears `C`, and conditionally sets `local14`. The outer admitted light path writes `_-b5Y = time` at PCs 2955..2964 even when no helper accepts.

### 5. Heavy

PCs 2964..3146 require:

```text
((!A && !G) || C) && H != 0
```

Dispatch is:

- `local10 && !local36`: call `_-S5o(time, heavyHeld & 15, C, Q, 3)` at PCs 3019..3042.
- Otherwise, when `!local37`: call `_-l4J(time, heavyHeld, J != 0 && !local14, 6, Q, C)` at PCs 3070..3105.

Success and timestamp writes mirror light. Light is evaluated first, but a rejected light helper normally leaves `A` false and allows heavy. `C` may admit heavy even after an earlier action consumed the ordinary path.

### 6. Mode-specific throw context

PCs 3146..3271 require:

```text
(T != 0 || (heldMask & 0x0200) != 0)
&& L == 0
&& modeState == 3
```

The call is dynamically dispatched to `_‑021(time, fighter, T, A)`. The pinned implementation is mode-specific, so this branch is not generalized into the ordinary pickup or throw contract. A true return writes `_-b5Y = time`, sets `A = true`, and sets `local14 = true`.

The `L == 0` predicate statically suppresses this branch for a simultaneous light edge, independently of whether light accepted.

### 7. Ordinary throw power

PCs 3271..3413 require:

```text
((!A && !G) || (C && !Q))
&& !local36
&& T != 0
&& T > L
&& _-74Z(time, local8, local9)
```

Helper 6144 `_-74Z` checks `CannotThrow`, fighter flags, current-power state, and a 300 ms timing window. If it returns true, method 6125 invokes `_Y4C._-E6M(time, 1)` at PCs 3364..3373.

The Boolean return from method 1555 `_‑E6M` is discarded by `callpropvoid`. Method 6125 then unconditionally writes `_-b5Y = time`, sets `A = true`, sets `local14 = true`, and clears `C` with `fighter._-S36(time,Q)` when required. Method 1555 itself may reject before writing power state; when it accepts, it writes start time `_-n3E`, argument state `_-p5S = 1`, selected power identity `_-nq`, and `_-262 = time`.

For simultaneous light plus throw, `T == L`, so `T > L` is false. Heavy does not participate in this comparison.

### 8. Taunt-group context action

After fallback jump and other held-state actions, PCs 3592..3658 admit taunt-group processing through the same `A/G/C` state shape and call method 6145 `_-K1A(time, priorMask, Q, C)`.

Method 6145 tests an ordered vector of command patterns against current and prior held masks, maps the first newly completed pattern through `ItemType._-e4U`, and calls `_‑S45`. Its result can set `A`; success with `C` also calls `fighter._-S36(time,Q)`. This is a later context action, not part of the four-button D/L/H/T precedence, but it is included for branch closure because its edge is collected in the same candidate set.

## Every simultaneous D/L/H/T combination

Rows list candidates in actual evaluation order when throw was **not already held before the interval**. “Candidate” means its outer edge is present; each still has the eligibility and return behavior above. The selected result is the first admitted success under ordinary `C = false` flow, except that dodge fallback and ordinary throw can consume unconditionally as described. If every listed helper rejects or is gated out, the result is **no action**. When `C = true`, the exact predicates above can admit later light, heavy, or throw-context work after prior consumption.

| D | L | H | T | Ordered candidate sequence for one equal-time interval |
| :-: | :-: | :-: | :-: | --- |
| 0 | 0 | 0 | 0 | no action |
| 0 | 0 | 1 | 0 | heavy |
| 0 | 1 | 0 | 0 | light |
| 0 | 1 | 1 | 0 | light, then heavy if admitted after light |
| 0 | 0 | 0 | 1 | throw-button pickup, mode-specific throw context, ordinary throw |
| 0 | 0 | 1 | 1 | throw-button pickup, heavy, mode-specific throw context, ordinary throw |
| 0 | 1 | 0 | 1 | throw-button pickup with `L == 0` argument false, light; both later throw paths statically suppressed |
| 0 | 1 | 1 | 1 | throw-button pickup with `L == 0` argument false, light, heavy; both later throw paths statically suppressed |
| 1 | 0 | 0 | 0 | dodge |
| 1 | 0 | 1 | 0 | dodge, heavy if dodge does not consume or context reopens it |
| 1 | 1 | 0 | 0 | dodge, light if dodge does not consume or context reopens it |
| 1 | 1 | 1 | 0 | dodge, light, heavy under their exact gates |
| 1 | 0 | 0 | 1 | dodge, throw-button pickup, mode-specific throw context, ordinary throw under their exact gates |
| 1 | 0 | 1 | 1 | dodge, throw-button pickup, heavy, mode-specific throw context, ordinary throw under their exact gates |
| 1 | 1 | 0 | 1 | dodge, throw-button pickup with false second argument, light; both later throw paths statically suppressed |
| 1 | 1 | 1 | 1 | dodge, throw-button pickup with false second argument, light, heavy; both later throw paths statically suppressed |

### Prior-held throw without a new throw edge

A rising throw edge requires the prior throw bit to be clear. The additional reachable state is therefore `T = 0` with `(heldMask & 0x0200) != 0`. Under that state, mode-specific throw context is reachable whenever `L == 0`; light suppresses it even if light rejects. `P`, when present, appends the taunt-group context action after the rows below.

| D | L | H | Prior throw held | Ordered candidate sequence |
| :-: | :-: | :-: | :-: | --- |
| 0 | 0 | 0 | 1 | mode-specific throw context; no action if its mode/helper gates reject |
| 0 | 0 | 1 | 1 | heavy, mode-specific throw context under their exact gates |
| 0 | 1 | 0 | 1 | light; mode-specific throw context statically suppressed |
| 0 | 1 | 1 | 1 | light, heavy; mode-specific throw context statically suppressed |
| 1 | 0 | 0 | 1 | dodge, mode-specific throw context under their exact gates |
| 1 | 0 | 1 | 1 | dodge, heavy, mode-specific throw context under their exact gates |
| 1 | 1 | 0 | 1 | dodge, light; mode-specific throw context statically suppressed |
| 1 | 1 | 1 | 1 | dodge, light, heavy; mode-specific throw context statically suppressed |

A simultaneous jump edge inserts the first jump opportunity after dodge and before throw-button pickup. If that call occurs, it marks the interval consumed. If its time-window gate fails, the fallback jump remains after ordinary throw. This rule applies to every row rather than multiplying the table by a redundant jump dimension.

A taunt-group edge appends the context action after the command sequence shown. The analyzer emits 48 reachable rows: all 32 `D/T/L/H/P` rising-edge subsets with prior throw clear, plus the 16 subsets without rising `T` repeated with prior throw held. `P` denotes any taunt-group edge.

## Every simultaneous taunt-group submask

Method 14909 initializes `Commands._-15K = 0x3c00` and this exact evaluation order:

```text
0x0c00, 0x1800, 0x3000, 0x2400, 0x0400, 0x0800, 0x1000, 0x2000
```

Method 6145 chooses the first pattern fully present in the current mask that was not fully present in the prior mask. With a zero prior mask, all 15 nonempty subsets resolve as follows:

| Rising submask | First selected pattern | Rising submask | First selected pattern |
| ---: | ---: | ---: | ---: |
| `0x0400` | `0x0400` | `0x0800` | `0x0800` |
| `0x0c00` | `0x0c00` | `0x1000` | `0x1000` |
| `0x1400` | `0x0400` | `0x1800` | `0x1800` |
| `0x1c00` | `0x0c00` | `0x2000` | `0x2000` |
| `0x2400` | `0x2400` | `0x2800` | `0x0800` |
| `0x2c00` | `0x0c00` | `0x3000` | `0x3000` |
| `0x3400` | `0x3000` | `0x3800` | `0x1800` |
| `0x3c00` | `0x0c00` |  |  |

A nonzero prior mask can skip a pair that was already complete and select the next newly completed pair or individual bit. The analyzer verifies the source vector and computes this table from the same predicate.

## Side effects that survive the winning decision

### Before candidate selection

Method 6125 performs observable writes and calls before the first dodge attempt:

- writes current held mask `_-th` at PCs 370..391;
- updates direction timing `_-c5o` and `_-R2V` at PCs 629..822;
- maintains dodge-held fields `_-V4H` and `_-x11` at PCs 1280..1384;
- a mode callback can set suppression locals and clear `_-th` and `_-x11` at PCs 1455..1489;
- calls `fighter._-C4I(time)` at PCs 1523..1534 when the tracked command aggregate is nonzero;
- calls the mode/controller observation `_‑V1f` with command-presence booleans at PCs 1876..1918.

These effects occur before the winning action and are not rolled back.

### During admitted attempts

- Dodge fallback can commit timestamps after a false dodge-helper result.
- Both throw-button pickup routes write `_-b5Y = time` after admission, regardless of pickup success.
- Both light and heavy outer paths write `_-b5Y = time` after admission, regardless of helper success.
- Accepted helper paths set `A`, may set `local14`, and may clear `C`.
- Ordinary throw commits method-6125 selection state after `_‑74Z` succeeds even if `_‑E6M` returns false internally.

### After selection

Method 6125 does not return after selecting an action. It still performs:

- active-power `HandleInput(time, direction, lightEdge, heavyEdge)` at PCs 3658..3721, preserving both simultaneous edge booleans even when one candidate won;
- held heavy/light/throw continuation callbacks at PCs 3721..3780;
- active-power release/cleanup callbacks at PCs 3815..3951;
- `input._-y3Q(~directionMask)` at PCs 3951..3960;
- final directional timestamp maintenance through `_-C3M` at PCs 3960..4005.

A simulator must preserve these post-decision calls. Short-circuiting the whole method after the winner loses gameplay-relevant state.

## Proven, inferred, dynamically resolved, and unresolved

### Proven

- Exact masks and all edge-local assignments.
- Inclusive rising-edge formula and 16 ms edge timestamps.
- Dodge, jump, throw-pickup, light, heavy, mode-throw, ordinary-throw, and taunt-context order.
- Every predicate and direct method-6125 write described above.
- Equal-time light suppresses both late throw paths, independently of light success.
- Heavy does not timestamp-suppress throw.
- The throw-power helper return is discarded before unconditional selection-state writes.
- Post-decision `HandleInput` receives both simultaneous light and heavy booleans.
- Context-pattern order and all 15 zero-prior simultaneous submask selections.

### High-confidence semantic labels

- `0x0040` is heavy and `0x0080` is light/quick-pickup, supported by readable command tables and independent attack/challenge labels.
- `_‑T1O` is the throw-button pickup attempt, supported by typed item candidate lookup and `_‑G5l(time,item)` commit.
- `_‑74Z` is ordinary throw eligibility, supported by the exact `CannotThrow` call and current-power/timing predicates.

These are semantic labels for the pinned build, not recovered unobfuscated declaration names.

### Dynamically resolved

- Whether `_‑T1O` finds an eligible item depends on runtime geometry, item state, mode state, and timing.
- Light and heavy helpers resolve current action tables and fighter state before returning.
- `A`, `G`, `C`, `Q`, `local8`, `local10`, `local34`, `local36`, and `local37` are runtime state, so input bits alone cannot name one unconditional winner.
- The mode-specific `_‑021` branch is dispatched through the active mode object.

The pinned ABC has no subclass of `_Y4C`, `_V4R`, `_P2C`, or `_-Tx`. The named helper targets are closed; their data-dependent results are not converted into constants.

### Residual uncertainty

1. Runtime item/action-table values are not part of this ticket. They determine helper acceptance, not candidate order.
2. Official producer reachability for every taunt-group submask is unobserved. Replay storage can represent them, and static selection behavior is exact.
3. The mode-specific `_‑021` result is intentionally not generalized beyond its proven branch contract.
4. Native or host callbacks invoked by downstream helpers are outside this static proof. No such callback changes the proven method-6125 branch order.
5. Other builds are out of scope.

These gaps do not block implementation of the command-selection state machine. No new Wayfinder ticket is required solely to restate runtime state and patch-data dependencies already owned by the state inventory, item, attack, and mode work.

## Reproducible validation

Keep the proprietary ABC under an ignored path or outside the repository. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:command-selection-priority -- \
  --abc /path/to/hash-pinned/main.abc
```

Useful bounded output:

```bash
bun run provenance:command-selection-priority -- \
  --abc /path/to/hash-pinned/main.abc \
  | jq '{status, game, decoder, commandMasks, contextPatterns, simultaneousSameInterval, sideEffects}'
```

Success reports `proven-for-pinned-abc`, build `10.09.96325`, the expected ABC digest, 15,010 decoded bodies, valid branch targets, five command masks, all 15 taunt-group submasks, 48 reachable rising/prior-held rows, and 36 structural anchors.

The command fails closed on a changed ABC, build string, body count, branch target, method owner, command initializer, context-pattern vector, selected opcode/property anchor, or explicit mask/local dataflow sequence. It checks the load-bearing light-suppression locals and `HandleInput` argument order directly. It does not claim a general symbolic proof of every prose predicate; those predicates come from the cited, independently reviewed static analysis of the hash-gated method. Success and expected verification failures contain no local input path, ABC bytes, replay bytes, player data, or private identifiers. Operating-system process diagnostics outside the analyzer can still display a caller-supplied command line.

## Ticket and fog impact

This closes the simultaneous command-selection gap isolated by [Recover authoritative tick phases and timestamp semantics](https://github.com/NickTacke/brawlhalla-sim/issues/7). The implementation map can now model action selection as ordered eligibility plus persistent pre/post side effects rather than a bit-priority switch.

One-line map gist: **Within one input interval, try dodge, jump, throw-button pickup, light, heavy, and late throw in bytecode order; equal-time light suppresses late throw even on rejection, while admitted attempts and post-decision power input preserve side effects.**

No new ticket or newly sharp fog was surfaced. Item geometry, complete attack behavior, mode-specific action data, and state-field naming remain within existing map fog or existing ticket ownership. The fixed-step scheduler, inclusive sampling, rising-edge rule, phase DAG, timestamp contract, and trace-hook decision remain unchanged.
