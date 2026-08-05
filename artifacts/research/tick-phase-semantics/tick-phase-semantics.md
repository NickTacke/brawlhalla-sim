# Authoritative tick phases and timestamp semantics for Brawlhalla 10.09.96325

Issue: [Recover authoritative tick phases and timestamp semantics](https://github.com/NickTacke/brawlhalla-sim/issues/7)

## Resolution

The authoritative simulation step is one iteration of the fixed 16 ms loop in `_-u16._-z3z`, method 3217. Method 3273 `_-u16._-A4X` is not a tick. It runs after lifecycle processing in the AIR frame callback and performs a gated coordinate roundtrip. One AIR frame may therefore contain zero, one, or multiple authoritative ticks.

Within a tick, the game pre-increments its processed clock by 16, publishes the new value to `_-X6r._-L67`, and then runs tick systems. The published value is the timestamp of that tick. It is both the current processing boundary and the timestamp supplied to same-tick event, KO, terminal, and result paths. It is not either `getTimer` value in the frame callback.

The exact global ordering is a partial order, not a single list of independently named phases. Input, action, timer, movement, and collision work is interleaved inside per-fighter methods. Items have pre-fighter, post-fighter, and later mode-specific work. Scoring has KO, hit, and mode-specific producers. The simulator must preserve the phase DAG below rather than invent global timer, collision, item, or scoring phases.

This resolves issue 7 as a planning decision. Remaining semantic gaps are owned by linked domain tickets or are precise follow-up questions. They do not prevent implementation of the scheduler, phase seams, timestamp normalization, or trace hooks specified here.

## Evidence identity and notation

All static claims in this artifact refer to this primary source:

| Property | Value |
| --- | --- |
| Artifact | user-supplied `artifacts/main.abc` |
| Build string | `10.09.96325` |
| Bytes | `3,934,088` |
| SHA-256 | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` |
| Decoded bodies | `15,010` |
| Branch validation | every `s24` and lookup-switch target is an instruction boundary or permitted `code_length` target |

`pc` means original method-local byte offset. `i` means regenerated zero-based instruction ordinal. Byte PCs are authoritative for instrumentation. Some ignored legacy `disasm_*.txt` files label constant-pool names incorrectly because they omit the required `strings[index - 1]`; their opcode structure remains useful but their rendered identifiers are not authority.

Reproduce the central scheduler, phase, timestamp-source, and hook claims without emitting bytecode or local paths:

```bash
shasum -a 256 artifacts/main.abc
wc -c artifacts/main.abc
bun run provenance:tick-phases
bun run provenance:movement
```

`provenance:tick-phases` hash-gates the ABC and sole build string, decodes all bodies, checks raw opcodes and byte-PC branch targets, resolves names with `strings[index - 1]`, asserts the narrow sites cited below, and emits privacy-safe JSON. `provenance:movement` independently resolves input insertion/sampling, jump edge, pending impulse, movement, gravity, and motion-delta dataflow.

## Corrected scheduler and hook decision

### Call path

```text
Main.Init, method 5533
  registers Main._-52Z, method 5527, for ENTER_FRAME

Main._-52Z, method 5527
  pc228..233: call _-u16._-U3n, method 3215
    method 3215 pc14..18: call _-u16._-A3f, method 3218
      state branches call _-u16._-t20, method 3216
        method 3216 pc1812..1816: call _-u16._-z3z, method 3217
  pc248..257: second getTimer, profiling only
  pc302..306: call _-u16._-A4X, method 3273, after lifecycle work
```

Method 3218 reaches method 3216 at pc1679..1683, 1769..1773, 1876..1880, or 1922..1926 depending on lifecycle state. The loading-frame alternative is method 5527 pc212..216 through methods 5528 and 3191. It is not the match-update path.

Method 3273 has no call to `_-z3z` or `_-t20`. It runs after method 3215 returns and may run when method 3217 executes no iteration. Random draws plus `writeDouble`/`readDouble` coordinate writes further identify it as post-frame serialization/interpolation work, not an authoritative fixed step.

### Catch-up arithmetic and exact hooks

Method 3217 caches `_-Y1k.length` before the loop and computes at pc1828..1886:

```text
available = max(currentBoundary - processedBoundary, 0)
tickCount = floor(available / 16)
tickTimestamp = processedBoundary
```

For each iteration:

1. pc1891..1898 post-increments the loop counter;
2. pc1898..1907 adds 16 to the processed timestamp;
3. pc1907..1916 publishes it to `_-X6r._-L67`;
4. pc1916..4047 executes tick systems;
5. pc4051..4055 branches back to pc1890 when another step remains.

The unique trace anchors within the tick-loop region are:

| Hook | Original byte PC | Meaning | Placement rule |
| --- | ---: | --- | --- |
| tick begin | `1916` | new 16 ms boundary is already published; no tick subsystem has executed | insert after the `initproperty _-L67` ending at pc1916 |
| tick completion | `4051` | all ordinary tick systems completed; next instruction is the unique outer backedge | insert before the `iflt` starting at pc4051 |

The provenance command finds one `_-L67` publication in the pc1890..4055 loop region and one `iflt` targeting pc1890. It deliberately does not claim `_-L67` has only one writer in the whole method: method 3217 has an earlier lifecycle write at pc502. Instrumentations must authenticate the method, original PC, and loop context, not a field name alone.

Post-catch-up work continues at pc4063..5115. Method 3217 returns its lifecycle/grace result at pc5115..5154. This return is not tick completion. Once `_‑z1s` is set, shell processing may continue until the selected clock reaches `_‑z1s + 450` (pc5119..5154).

## Proven phase DAG

Solid arrows below are static call/control order in method 3217 and its named callees. Parenthetical labels are semantic interpretations supported by types, strings, and callees but remain candidates where noted.

```text
publish tick T = prior processed boundary + 16
  method 3217 pc1898..1916
  |
  +-> first-step initialization if _-q3e == 0
  |     3217 pc1916..1940 -> method 3428
  |     method 3428 pc152..159 writes _-q3e = T
  |     mode and fighters initialize afterward, once
  |
  v
conditional pre-tick/controller work, pc1916..2582
  |
  v
mode/world pre-phases
  6933 _-a1B._-j2F at pc2612
  7240 _-04B._-W1I at pc2642 (moving entity/platform geometry candidate)
  11414 _-l7._-W5N at pc2654
  4753 _-61q._-wY at pc2683 (item/important-item manager candidate)
  6583 _-v1J._-25J at pc2696 (respawn/scoring manager candidate)
  |
  v
for fighters[0..cachedLength), ascending array index
  2894 _-V4R._-84O at pc2738
    bot action producer
      -> 2889 input/action transition
        -> 6125 _-Tx._-B1i input sampling and edges
          -> attack/action starts and 2954 jump application
      -> 2887 _-V4R._-D38 movement/collision monolith
          impulse and velocity consumption
          gravity write
          environmental/collision OnHit appends
          motion-delta construction and stage/entity collision work
      -> state-specific direct Respawn branch where reached
  |
  v
for fighters[0..cachedLength), ascending array index
  2893 _-V4R._-LV at pc2788
    post-movement power/final-position/bounds work
      -> ordinary death/KO handler 3040 _-F60 when eligible
         attribution -> stats -> KO event -> scoring callback -> lives -> cleanup
  |
  v
4755 _-61q._-A3a at pc2810 (item/projectile post-phase candidate)
  |
  v
1474 _-Wv._-Z29 at pc2822
  ordered hit arbitration
    -> accepted records apply through 1484 _-S6I
       -> force/stun commit through 1486 _-24S
    -> clear hit queue
    -> drain and clear second deferred-removal queue
  |
  v
for fighters ascending: 2891 _-V4R._-U6U at pc2865
  post-hit fighter/stat follow-up
  |
  v
mode, item, trigger, hazard, network, and audio work, pc2877..3283
  |
  +-> special-mode fork: _-V6g._-p1g at pc2977
  |
  +-> standard mode: _-a1B._-g2p at pc2994
        hazards/sounds -> score rebuild -> placement -> terminal/sudden death
        tie can enter sudden death and return false
  |
  +-> if standard terminal predicate true
        pc3003..3013: _-z1s = T (first true result)
        fighters finalize forward at pc3030..3067
        fanfare snapshot/update at pc3135..3187
        result writer at pc3187..3219
        network notification at pc3247..3283
  |
  v
remaining mode/network/audio/deferred cleanup, pc3283..4047
  |
  v
outer tick backedge at pc4051
```

All three top-level fighter loops use the same cached collection length and ascending array index. Each counter begins at zero, captures the old value through `inclocal_i`, executes the body, and tests the incremented counter afterward. This proves array order, not the semantic population order of `_-Y1k`.

## Ticket subsystem answers

| Ticket subsystem | Exact phase answer | Evidence and qualification |
| --- | --- | --- |
| Input sampling | Inside each fighter's forward 2894 pass, before movement | 2894 calls 2889 near pc71; 2889 calls 6125 pc25..38. Method 6125 samples `inputTime - i*16` at pc319..370. |
| Timers | No globally separated timer phase | Timer reads and mutations are interleaved in 6125, 2887, 2893, 1474, and mode managers. Preserve their local order. |
| Action transitions | After per-fighter bot production and input sampling, before that fighter's movement; additional transitions exist in movement and power code | 6125 contains attack-start gates and jump calls; 2954 writes pending jump impulse before 2887 consumes it. Do not collapse action state to one global pass. |
| Movement | Per fighter in the forward 2894 pass | 2894 calls 2887 at method pc574..582. 2887 consumes impulse/velocity, writes gravity at pc5380..5391, then constructs motion delta at pc6680..6733 while collision work continues. |
| Collision | Split, not one global phase | Stage/entity collision is interleaved in 2887; 2893 performs later post-movement bounds/death checks. Exact movement-integration versus stage-collision seam inside 2887 is not statically separated. |
| Attacks | Starts are selected in the input/action path before movement; active collision may append deferred hit records during movement/power work | 6125 calls power-manager entries at pc2613..2617 and pc3369..3373. Offensive shape/window provenance remains outside this ticket. |
| Hits | Detection appends; arbitration and damage/force/stun application occur after all fighters finish ordinary death checks | `OnHit` method 2944 pc0..190 builds `_-m2j` and pushes to `_-Wv._-g5u`; it applies no damage or KO inline. Method 1474 arbitrates, applies via 1484, clears `_‑g5u` at pc2365..2377, then drains its second queue. |
| Items/projectiles | At least three regions, not one phase | Pre-fighter manager calls at 3217 pc2632..2700, item post-call 4755 at pc2810, and later mode/item/trigger work. Exact obfuscated subcollection names remain candidates. |
| KO/death | Ordinary bounds/death detection is the second forward fighter pass, before current-tick hit application | 2893 calls 3040 after final position/bounds. Thus ordinary force committed by a hit on T feeds movement/bounds on T+1, then ordinary KO handling on T+1. An exceptional immediate-KO path in 1484 is not ruled out. |
| Scoring/placement | Distributed | Ordinary KO attribution/stats/event/scoring occur in 3040/2949 before lives decrement; accepted-hit and special-mode paths can also be scoring-aware. Standard placement and terminal decision occur later in 6935. No global scoring phase exists. |
| Respawn | Scheduler runs before fighter input/movement; some state-specific direct paths also exist | 6583 at 3217 pc2691..2700 selects eligible entities and calls 6590 forward. Direct `Respawn` branches also occur from 2894 and 3040. Eligibility and invulnerability fields remain unresolved. |
| Termination | Mode decision occurs after hit and post-hit passes; result detection is at the inclusive terminal tick; caller termination is later | Standard 6935 returns terminal true at 3217 pc2994..3003, then `_‑z1s = T`. Special modes fork through 6935-independent logic. Method return waits through the `_‑z1s + 450` grace condition. |

## Input timeline semantics

### Insertion and loading

Replay loader method 3507 constructs `_-O3Y(timestamp, mask)` at pc627..649 and calls method 6133 `_-Tx._-PB` at pc649..654. Replay loading is lifecycle/pre-match work, not a per-tick phase. Other insertion callers exist in methods 1566, 1584, and 6128.

Method 6133 keeps `_-Tx._-W5y` ascending by `_-O3Y._-D6c`:

- if `new.timestamp > last.timestamp`, append at pc51..65;
- otherwise scan backward from the penultimate element;
- insert after the first strictly smaller timestamp at pc108..125;
- a value not greater than the first entry is dropped;
- equal timestamps are not replacements and a new equal entry is inserted before the existing equal run when the backward scan finds a prior strictly smaller value.

The last two rules make duplicate behavior observable and nonstandard. Zero-clamped duplicate behavior in authentic replays remains unattested.

### Sampling, inclusivity, and edges

Method 6135 `_-Tx._-72L` implements a right-continuous step function:

```text
sample(t) = mask of newest eligible snapshot whose timestamp <= t
```

Exact equality returns immediately at pc248..265. The forward cursor returns the previous mask when the next timestamp is greater than the query at pc334..351. The backward cursor accepts `snapshot.timestamp <= query` at pc435..462. A query before the first record resets the cursor and returns baseline `_-g4v._-T4y` at pc472..492. For dual timelines, the later eligible timestamp wins at pc674..700; the primary timeline wins an equal-timestamp tie through `primary.timestamp >= alternate.timestamp`.

Method 6125 samples the 16 ms slots `inputTime - i*16` at pc319..370 and computes:

```text
edge = (current XOR prior) AND current
```

at pc1001..1042. Only changed bits that are held in the newer sample survive. Edge windows execute from older sampled intervals toward the current interval. Jump bit 16 reaches method 2954 at method 6125 pc2564..2568 and pc3440..3444, both before fighter movement.

Input recording and replay playback are distinct. Method 3217 polls entities and invokes timeline method 6129 before entering the catch-up loop. Method 6129 only constructs `_-O3Y(T, mask)` when the mask changes, then appends to recorded or pending arrays. The serializer dumps stored timeline snapshots later. An input snapshot timestamp therefore denotes its effective input sample slot, not serializer invocation, frame profiling time, or END. Tail snapshots may be recorded after result time and never consumed by gameplay.

## Deferred hit, death, score, and event order

### Hit queue

`_-V4R.OnHit`, method 2944:

1. normalizes its `Point` at pc17..25;
2. constructs and fills one `_-m2j` record through pc170;
3. appends it to `_-Z2h._-b2J._-g5u` at pc170..189;
4. returns without inline damage, score, force, stun, or KO application.

`_-Wv._-Z29`, method 1474, snapshots queue length and performs forward nested arbitration before application. Surviving records apply forward through method 1484 at pc2236..2240. Method 1484 calls method 1486 for force/stun commit; method 1486 writes hit state, velocity components, force magnitude, attacker attribution with `T + 500` expiry, and successful stun state in that local order. Method 1474 clears the hit queue only after the application pass, then reverse-scans target collections for deferred ID removals and clears the second list.

No direct static call from methods 1474 or 1484 returns to `OnHit`. Native, runtime-multiname, or callback reentrancy is not proven absent. Implement the queue as ordered and deferred; do not assume iteration over a queue that can never grow during application until dynamic closure is available.

### Ordinary death and current-tick hits

The complete ordinary top-level order is:

```text
all fighters movement/collision/OnHit append at T
  -> all fighters post-movement bounds and ordinary death checks at T
  -> item post-phase
  -> hit arbitration and accepted-hit force/damage/stun commit at T
  -> movement and bounds consume committed force on T+1
  -> ordinary KO handling on T+1
```

This proves that a hit first committed by the global hit pass cannot be the same tick's earlier ordinary `_‑F60` death input. It does not prove that every lethal effect in every mode waits until T+1. An immediate or special-mode path in method 1484 remains unresolved.

### KO score and state-5 event

In ordinary death method 3040, attacker attribution precedes fighter method 2949. Inside 2949, the order is:

1. victim/GameStats update;
2. timestamped event factory call using the same tick;
3. killer stats update;
4. mode scoring callback.

After 2949 returns, method 3040 decrements lives. Standard placement is rebuilt later in method 6953, before terminal result serialization.

Event constructor 5751 stores its third argument directly in `mTimeStamp`. Factory 5763 creates the event with the KO-resolution tick and immediately queues it through method 5768. Method 5768 inserts before the first existing event whose timestamp is less than or equal to the new timestamp, otherwise appending, so storage and serialization are newest-first. Writer 6522 filters state-5 types 2, 3, and 9. The authentic timed-FFA cohort contains 161 aligned records and no duplicate event timestamps; type 3's producer/name remains unknown.

## Timestamp contract

### Shared clock and ordinary origin

Let `T` be the newly published tick boundary. On the first processed simulation step, method 3217 calls method 3428 and method 3428 writes `_-u16._-q3e = T` at i62..64 / pc152..159.

For ordinary modes:

```text
origin = _-q3e - 16
serializedTimestamp = max(0, sourceTimestamp - origin)
```

Consequences:

- `_q3e` serializes to 16;
- serialized zero denotes the simulation slot immediately before first-step initialization;
- because writers clamp, zero is a bucket for every source value `<= origin`, not a uniquely invertible source timestamp;
- serialized zero is not proven to mean GO, control enablement, countdown completion, or match-visible start.

All four timestamp writers share one compiled special-mode guard. When all guard clauses select the special branch, `origin = 0`; otherwise `origin = _q3e - 16`. The readable mode names for the bit masks remain unresolved and the 12-replay cohort does not exercise origin zero.

### Field-to-phase table

| Serialized/report value | Source and exact instruction | Boundary denoted | Origin/read/write and inclusivity | Unknowns |
| --- | --- | --- | --- | --- |
| Authoritative tick trace time | local 17 incremented at method 3217 i854..859 / pc1898..1907; published to `_-X6r._-L67` at i860..862 / pc1907..1916 | tick entry boundary after pre-increment, before any tick subsystem | no replay-origin subtraction at the internal hook; systems on this iteration run at inclusive T | earlier lifecycle write to `_‑L67` is not a tick hook |
| State-1 input timestamp | `_-O3Y._-D6c`; writer 6521 reads at i324..338 / pc642..673 and writes through `_‑S2c` at pc673..687 | intended effective input sample slot recorded before catch-up | origin selected at i227..239 / pc405..433; applies inclusively at T and holds on `[T,nextT)`; before first uses baseline; clamp to zero for source `<= origin` | authentic zero-clamped duplicates and which duplicate loader playback effectively retains |
| State-6 lifecycle result | `_‑u16._‑z1s`; method 3217 evaluates `_‑d3F._‑g2p(T)` at i1305..1310 / pc2986..3003 and writes at i1311..1313 / pc3003..3013; calls writer at i1391..1400 / pc3187..3219 | first standard-mode tick whose terminal predicate is true; inclusive last processed and detection tick | writer 6520 selects origin at i214..225 / pc393..420, computes source minus origin at i226..231 / pc420..428, and writes state 6 at pc428..460 | special-mode terminal contract and all dynamic predicate targets |
| State-6 finalizer occurrence | finalizer 6524 selects regenerated fields `_-v5m` or `_-X6A` at i260..270 / pc485..517, then calls writer at i271..273 / pc517..526 | finalizer clock snapshot, not finalizer invocation time | same writer and origin/clamp semantics as lifecycle result | authentic repeated values are equal; static equality to `_‑z1s` for every mode is unproven. Older dumps naming these fields differently are not authority. |
| State-5 face/event timestamp | `_-L5l.mTimeStamp`, assigned by constructor 5751 from factory tick; writer 6522 reads at i278..291 / pc577..615 | KO/event resolution tick; stats and score-aware work occur in the same invocation before/around queue insertion as described above | origin at i209..221 / pc371..399; inclusive event occurrence; writer serializes newest-first and only types 2, 3, 9 | type-3 meaning; duplicate-timestamp authentic ordering unattested |
| State-7 timestamp | key of `_-669._-E4t` `IntMap`; source reached by writer 6523 i23..39 / pc44..94; normalized at i277..288 / pc556..590 | special-mode score/KO application tick; producers write the key after relevant application work | origin at i226..238 / pc434..462; same-tick writes overwrite because tick is map key | no authentic state-7 fixture; public label, raw iteration order, repetition behavior, and reachable modes unknown |
| Replay origin marker | `_‑u16._‑q3e`, method 3428 i62..64 / pc152..159 | first processed tick entering activation initialization | ordinary replay origin is one tick earlier | visible gameplay name of the marker unknown |
| `GameDuration` | `_‑z1s - _‑q3e - 6000`; methods 3805 i204..220 and 3833 i58..72 | reporting arithmetic, not a serialized event timestamp | relative to ordinary replay origin, `resultTime - GameDuration = 6016` | no gameplay transition at 6016 is proven |
| Playback cutoff | reader result `_-X2J + 2500` in method 10459 i2..8; clamp in method 3191 i665..695 | UI playback endpoint | proposed advancement is clamped only when `> cutoff`; equality is allowed | not END and not stored-input-tail boundary |
| END | state 2 write in finalizer 6524 i280..286 / pc551..569 | serialization boundary only | carries no timestamp or payload | no semantic END time can be inferred from last input/result/event |
| AIR callback `getTimer` | method 5527, including second read pc248..257 | frame profiling | neither simulation tick time nor replay timestamp | host-time determinism belongs to oracle/runtime work, not this field |

### State-7 producer boundary

Methods 6796, 7002, and 7076 write `map[tick] = entityId` after their relevant score, respawn, or event application work. This proves a timestamp-keyed application map rather than an append-only global event queue. It does not establish one stable gameplay name spanning all producers. No state-7 section appears in the 12 authentic format-268 fixtures.

### Result, duration, tail, cutoff, and END are distinct

A terminal tick may contain a KO timestamp equal to result time because ordinary KO processing precedes standard terminal detection. One corpus KO is exactly `186016`, the cohort result value.

`GameDuration` is not result time. The ordinary formula differs from replay-relative result time by exactly `6000 + 16 = 6016` ms. Treating raw result time as duration introduces a fixed 6016 ms semantic error.

Input timelines are dumped after fresh finalizer result serialization. Authentic input tails extend 592 to 3,168 ms beyond result time. The ordinary UI cutoff is result plus 2,500 ms and can exclude stored tail records. END follows result, inputs, state 5, and optional state 7, but contains no clock. These four boundaries must remain separate in the public model.

## Lifecycle and mode forks

First-step initialization is conditional on `_‑q3e == 0` and occurs once. It is not a recurring pre-tick phase.

Method 6583 performs pre-fighter respawn selection. One eligible fighter uses a direct path. Multiple fighters are comparator-sorted when the scoring rule requests it and otherwise deterministically PRNG-shuffled, then spawned forward through method 6590. Random ordering belongs to [Recover deterministic randomness and draw ordering](https://github.com/NickTacke/brawlhalla-sim/issues/6).

Standard termination in method 6955 rebuilds placement, tests sudden-death eligibility, compares opposing scores, and can call `_‑v4e(T)` to enter sudden death and change the terminal result to false. `STREET_BRAWL` and `VOLLEY_BATTLE` have an additional equality condition; `BUDDY` has another callback. Special mode bypasses this standard path through `_‑V6g._‑p1g`. Round transitions live behind scoring-specific implementations and are not closed by the timed-FFA corpus.

The available authentic cohort is 12 online four-human timed-FFA replays only. It does not attest stock, teams, bots, ties, sudden death, rounds, special origins, state 7, disconnects, or forfeits. Branch existence is static evidence; corpus absence is never evidence that a branch is unreachable.

## Corrections to current assumptions

1. Replace method 3273 as the authoritative tick coordinator. It is a post-frame coordinate roundtrip.
2. Count frames and fixed steps separately. A frame-to-tick 1:1 invariant is false.
3. Use method 3217 pc1916 and pc4051 for tick begin/completion. Do not hook callback entry/exit or post-catch-up method return as tick boundaries.
4. Record the pre-incremented-and-published simulation boundary T. Do not use callback `getTimer`.
5. Preserve sorted timeline insertion, duplicate ordering, baseline-before-first, inclusive `<=` sampling, hold-last behavior, and primary-timeline equality precedence.
6. Do not describe sparse snapshots as serializer-time input-change events. Their timestamps are effective sample slots.
7. Model `OnHit` as deferred append and method 1474 as ordered arbitration/application. Do not apply damage inline in `OnHit`.
8. Keep post-movement ordinary KO checks before later combat-hit application. Do not universalize T+1 KO latency to unresolved exceptional or special paths.
9. Do not create global timer, collision, item, or scoring phases where static bytecode interleaves them.
10. Use unsigned replay timestamp/count bit patterns. Keep result time, `GameDuration`, playback cutoff, input tail, finalizer invocation, and END distinct.
11. Treat serialized zero as a clamp bucket, not one uniquely invertible tick.
12. Treat regenerated `strings[index - 1]` identifiers and original byte PCs as authority over stale ignored disassembly labels.

## Proven, inferred, and unknown

### Proven decisions

- method 3217 is the fixed-step loop reached through frame lifecycle; method 3273 follows it;
- elapsed whole 16 ms steps allow zero, one, or multiple ticks per frame;
- the tick clock increments and publishes before tick systems;
- the two authenticated hook PCs and their loop-context uniqueness;
- top-level phase edges and ascending per-fighter array loops;
- inclusive hold-last input sampling and rising-edge computation;
- jump/action before movement and ordinary post-movement death before global hit application;
- deferred hit arbitration, application, queue clear, and second deferred cleanup order;
- ordinary result detection, fighter finalization, result write, grace-return order;
- all timestamp source fields, ordinary origin subtraction, zero clamp, writer sites, finalizer section order, GameDuration arithmetic, cutoff comparison, and END's lack of time.

### Inferred labels

- `_-61q` is an item/important-item manager because the class exposes `SpawnImportantItem2`;
- `_-Wv` is the power/hit manager from `PowerType`, `OnHit`, queue shape, and `power.hit` strings;
- method 2893 contains the ordinary bounds/KO path;
- method 6583 is a respawn/scoring manager;
- method 6935 is the standard mode hazard/placement/terminal coordinator.

These labels are useful seams, not permission to rename every obfuscated subcollection or dynamic target without further evidence.

### Explicit unknowns

- exact named gameplay transition at serialized 6016 ms;
- human-readable mode constants for the origin-zero guard;
- state-7 public meaning, authentic order, and reachable fixtures;
- whether every finalizer-selected clock equals `_‑z1s` outside the cohort;
- exact semantic population order of `_-Y1k` beyond ascending array traversal;
- exact attack-selection priority for simultaneous heavy/light/pickup/throw edges;
- exact movement-integration versus stage-collision boundary inside 2887;
- offensive hitbox shapes, transforms, active windows, and filters;
- precise item/projectile/pickup subcollection names and terminal teardown order;
- accumulated-damage field naming separately from force and stun commits;
- exceptional immediate-KO behavior in 1484;
- runtime/native/dynamic reentrancy into hit append;
- respawn eligibility, invulnerability onset, and expiry;
- round counter/reset/cross-round retention contracts;
- authentic behavior of zero-clamped duplicate timeline entries;
- full mode, team, stock, bot, tie, sudden-death, round, disconnect, and forfeit coverage.

## Existing Wayfinder ownership

Do not duplicate these unresolved domain decisions:

- special origins: [Recover special-mode replay timestamp origins](https://github.com/NickTacke/brawlhalla-sim/issues/29);
- 6016 ms naming: [Determine the 6,016 ms gameplay transition](https://github.com/NickTacke/brawlhalla-sim/issues/30);
- state 7: [Recover state-7 production semantics](https://github.com/NickTacke/brawlhalla-sim/issues/31);
- dynamic initialization/tick targets, reflection, native calls, and mode closure: [Prove match initialization and tick executable closure](https://github.com/NickTacke/brawlhalla-sim/issues/32);
- movement/stage collision geometry: [Close level resolution and collision geometry](https://github.com/NickTacke/brawlhalla-sim/issues/33);
- offensive hitbox windows/transforms: [Locate offensive hitbox placement and timing](https://github.com/NickTacke/brawlhalla-sim/issues/34);
- field identity, respawn state, stable entity identity, and exceptional state paths: [Derive the complete gameplay-relevant state inventory](https://github.com/NickTacke/brawlhalla-sim/issues/9);
- numeric damage/force/stun semantics: [Inventory gameplay-affecting numeric semantics](https://github.com/NickTacke/brawlhalla-sim/issues/8);
- mode dependencies and round-specific implementations: [Map replay-producing modes to patch closure dependencies](https://github.com/NickTacke/brawlhalla-sim/issues/36);
- broader authentic coverage: [Decide the conformance corpus coverage model](https://github.com/NickTacke/brawlhalla-sim/issues/16).

### New ticket-ready residual decision

Only one newly isolated decision lacks a clear existing owner:

**Recover simultaneous command-selection priority in method 6125.** When multiple rising edges for heavy, light/quick-pickup, throw, dodge, and context-sensitive pickup occur in one sampled interval, which gates win, which actions suppress later candidates, and which state writes remain? Start at method 6125 edge construction pc1001..1042 and the attack/action calls at pc2613..2617 and pc3369..3373. Acceptance: a branch-complete precedence table with exact command masks, eligibility predicates, side effects, and chosen action for every simultaneous pair and reachable multi-bit combination. This refines action semantics but does not reopen the scheduler/phase resolution.

## Implementation handoff

These are execution tasks, not unresolved planning blockers:

1. Implement a fixed-step scheduler that consumes whole 16 ms boundaries and can run zero, one, or multiple steps per frame request.
2. Expose separate frame/lifecycle and authoritative-tick counters.
3. Publish T before tick systems and emit canonical tick-begin/tick-complete observations at method-3217-equivalent seams.
4. Preserve top-level manager and three fighter-pass ordering, with all loops using one cached collection length and ascending stored order.
5. Keep input insertion/sampling as its own timeline module with exact duplicate, baseline, `<=`, hold-last, dual-timeline, and rising-edge rules.
6. Keep hit append, arbitration/application, and deferred cleanup as distinct ordered queues.
7. Keep ordinary post-movement KO handling distinct from later current-tick combat application.
8. Represent timestamps with explicit source, origin policy, clamp status, and boundary kind. Never derive END time or equate raw result with GameDuration.
9. Instrument only a verified copy of the application. Authenticate method 3217 original pc1916 and pc4051 with transformed-PC manifests and fail closed on unexpected cardinality, exception, or reentrancy.
10. Add targeted interpreted-oracle traces for zero-step, one-step, multi-step, terminal-tick, same-tick KO/result, duplicate input, sudden-death, special-origin, and state-7 cases as those fixtures become available.

The simulator should initially retain inferred subsystem labels internally and expose stable neutral phase names. Runtime traces may refine labels and dynamic edges, but must not reorder the proven DAG.
