# Format-268 roster connection timestamp in Brawlhalla 10.09.96325

Issue: [Recover format-268 roster word `_-o1O`](https://github.com/NickTacke/brawlhalla-sim/issues/23)

## Verdict

**Proven structural name: `connectionTimestampSeconds`.** The final 32-bit roster word before loadouts, exact field `_-o1O`, is an unsigned timestamp in whole seconds since the Unix epoch. It records when the roster entry connected or joined. Zero is the initialized and cleared sentinel for a slot that is not joined.

The value is not passive metadata. The client uses it as a primary ordering key for roster entities, with entity ID as a tie-breaker. Local and synthetic entry producers preserve that ordering by assigning `max(existing connection timestamp) + 1`.

The parser name `connectionTime` is directionally related but underspecified. It does not state the epoch, unit, timestamp role, or unsigned representation. The parser also currently reads the word with `i32`, which would expose valid post-2038 unsigned timestamps as negative JavaScript numbers.

`connectionTimestampSeconds` is an evidence-derived structural name, not a recovered unobfuscated declaration name. Confidence is **high** for the meaning, epoch, unit, unsigned wire representation, zero sentinel, replay roundtrip, restored copy, and ordering consumer in the pinned build.

## Evidence grades

- **Proven:** exact typed-trait or instruction-level control/dataflow in the hash-pinned ABC, exact authenticated replay observation, or both.
- **Structural name:** the narrowest public name supported by the proven representation, producers, values, and consumers when no readable declaration names the field.
- **Bounded closure:** every exact QName reference in the pinned ABC is enumerated and its ledger digest is fixed. This is not a claim about another build.
- **Unknown:** inspected primary evidence does not settle the claim.

Repository parser names and prior reports were locators only. The verdict derives from the pinned executable and authentic local replay corpus.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Typed field, join and clear updates, synthetic producers, replay writer-reader, restored fighter copy, ordering consumers |
| Sole semantic build string in that ABC | `10.09.96325` | Build identity |
| Authentic format-268 manifest | `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac` | Exact 12-replay cohort, source modification times, and per-file hashes |
| Exact `_-o1O` reference ledger | `9425becc435d382a3ad58d4a8bb31636e5f6c4492ef7cde26c142158e32035fa` | 80 exact-QName instructions in 42 methods |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |
| Repository source base | commit [`61e27e5be5df6e3de7f08398253019d075d41539`](https://github.com/NickTacke/brawlhalla-sim/tree/61e27e5be5df6e3de7f08398253019d075d41539) | Parser hypothesis and committed evidence baseline |

The analyzer decodes all 15,010 ABC method bodies, rejects invalid branch targets, requires the exact ABC and manifest identities, validates all 12 replay hashes, and fails if the typed definitions, exact reference ledger, producer-consumer anchors, reader-to-fighter bridge, corpus shape, or privacy-safe corpus observations change.

## Typed field and initialized value

Exact QName `36:26556` names `_-o1O`. The same exact QName defines an instance slot on four related classes:

| Class | Role established by surrounding dataflow | Trait type | Constant initializer |
| --- | --- | --- | --- |
| 123 `_-ao` | Lobby or roster entry | `uint` | none |
| 125 `_-Y10` | Related roster transfer object | `uint` | none |
| 147 `_-V4R` | Match fighter or entity | `uint` | none |
| 329 `_-kv` | Replay roster record | `uint` | none |

AVM2 initializes an uninitialized `uint` slot to zero. Class-123 constructor method 2366 also explicitly writes zero at PCs 140-145. Setter method 2381 copies its unsigned argument into the field at PCs 2-6.

The field's storage domain is every unsigned 32-bit pattern, `0` through `0xffffffff`. The normal online observations are nonzero epoch-second timestamps. Zero is reserved by the inspected client paths as the initialized or cleared value rather than an epoch instant used for a joined roster entry.

## Why the value is a connection timestamp

### Join and clear dataflow

Link update method 5386 handles the connection edge:

1. PCs 69-77 read the third consecutive unsigned packet word through method `_-A17` and retain it in local 5.
2. PCs 150-154 pass that exact local to field setter method 2381 on the roster entry.
3. The same method contains readable localization key `UI_CharacterSlot_Notification_HasJoined` at PC 459.

Link update method 5388 supplies the complementary clear edge. PCs 196-200 call the same exact setter method with zero on the selected roster entry.

Together these paths establish connection or join state rather than match elapsed time, score, team, loadout, or combat state.

### Monotonic synthetic production

Method 2289 computes the next local value. For each existing roster entry, PCs 115-135 compare its `_-o1O` against the current maximum and retain `field + 1` when needed. It returns that next unsigned value at PCs 143-144.

Match setup method 3205 independently scans roster records for the maximum at PCs 513-529, then assigns `maximum + 1` to a generated entry at PCs 1103-1112. Other local setup paths call method 2289 before setter 2381.

This behavior preserves a strict connection order when the client creates a local, bot, practice, or otherwise synthetic entry without receiving a server timestamp. It would be nonsensical for elapsed match time, and it matches the ordering consumers below.

## Units and epoch from authentic values

The reviewed corpus contains 12 hash-pinned online format-268 replays with four human roster entries each and 186.016-second reported match duration. The analyzer asserts those qualifiers through the repository parser, but reads the target values with a narrow independent state-4 decoder. It validates every replay hash before decoding. It does not emit raw timestamps, fixture names, player names, player IDs, or replay bytes.

All 48 target values have these privacy-safe properties:

| Observation | Result |
| --- | --- |
| UTC date after interpreting `value * 1000` as Unix time | `2026-08-04` for all 48 values |
| Manifest source replay modification date | `2026-08-04` |
| Within-replay timestamp span | 8 to 787 seconds |
| Latest timestamp to source replay modification | 205 to 212 seconds |
| Timestamp later than source modification | none |

The exact calendar-date agreement establishes the Unix epoch. The whole-number spacing and 205-212 second relation to replay file modification establish seconds rather than milliseconds. The replays report a 186.016-second match duration, so the remaining roughly 19-26 seconds are consistent with connection-to-match and finalization overhead without using that timing as a semantic premise.

The 8-787 second spread among players also matches independently joined roster entries. It rules out one shared match timestamp and replay-relative elapsed time.

## State-4 writer-reader roundtrip

Replay writer method 6519 first constructs its replay roster record from the live fighter or entity:

```text
fighter._-o1O
  -> method 6519 PC 655 getproperty
  -> method 6519 PC 658 initproperty on replay roster
```

Later in the same method, the target word follows avatar ID and team, immediately before the loadout loop:

```text
replayRoster._-o1O
  -> method 6519 PC 1118 getproperty
  -> method 6519 PC 1121 call _-S2c
  -> one unsigned 32-bit word
```

Reader method 6510 restores the paired field:

```text
method 6510 PC 1068 call _-8v
  -> PC 1072 convert_u
  -> PC 1073 initproperty replayRoster._-o1O
```

`_-S2c` writes the 32-bit AIR integer bit pattern. Reader method 6510 converts the `_-8v` result to `uint` before assignment. Therefore the field is not a signed `i32`, even though AIR's byte primitive and the current repository parser can present the raw bits through signed APIs.

The exact state-4 order is:

```text
u16 avatar ID
32-bit team number
u32 connectionTimestampSeconds
loadouts...
```

## Reader-to-runtime restoration

The analyzer closes the restored-object identity rather than treating the reader assignment as sufficient:

1. Reader method 6510 constructs class-329 replay roster `_-kv` in local 23 at PCs 883-896.
2. It assigns the unsigned target word to that local at PCs 1065-1073.
3. It publishes the same local to parsed replay roster list `_-I1a` at PCs 1358-1365.
4. Replay-start method 3507 reads the exact same list at PC 304, retains the typed roster in local 7, and passes it as factory argument 5 at PCs 313-376.
5. Exact factory method 3071 forwards parameter 5 to fighter class 147 `_-V4R`.
6. Fighter constructor method 2790 reads that exact roster parameter's `_-o1O` and initializes fighter `_-o1O` at PCs 2224-2232.

This proves that the replay-restored value reaches the runtime entity field consumed below.

## Consuming ordering behavior

Two independent comparators consume the field.

Method 6879 uses `_-o1O` as its primary comparison key:

1. PCs 70-77 compare the two timestamps for equality.
2. If they differ, PCs 84-92 return the timestamp `lessthan` result.
3. If they are equal, PCs 93-104 compare entity field `_-35a`, the proven entity ID, as the tie-breaker.

Method 8781 supplies a second timestamp-first comparator. PCs 136-159 return the difference between two `_-o1O` values when unequal; PCs 160-172 return the entity-ID difference on equality.

Method 8759 passes exact method 8781 as a `Function` to `Array.sort` at PCs 1383-1399. Thus connection timestamp changes roster display or processing order. The value is gameplay-adjacent roster state that can affect stable participant ordering, not a discarded diagnostic timestamp.

No stronger claim is made about every screen or mode's ascending versus descending presentation. Method 6879 proves unsigned less-than ordering across the field domain. Method 8781 proves timestamp difference as the primary `Array.sort` key and entity-ID difference on equality, but `subtract_i` can wrap for differences outside the signed 32-bit range. The reviewed epoch-second values differ by at most 787 and do not reach that boundary.

## Complete exact-reference closure

The analyzer keys references by exact QName namespace and name, not string coincidence. It finds exactly 80 QName-bearing instructions across these 42 methods:

```text
2192, 2194, 2213, 2270, 2271, 2289, 2313, 2340,
2366, 2381, 2393, 2400, 2405, 2431, 2790, 3205,
3282, 3514, 3529, 5257, 6510, 6519, 6879, 8781,
10704, 10717, 10738, 10746, 10760, 10765, 10766, 10788,
12774, 12812, 13109, 13142, 13143, 13144, 13145, 13146,
13158, 13258
```

The output includes each method, owner, byte PC, and opcode. The ordered ledger digest fails closed if any member, owner, PC, opcode, or ordering changes. Key dispositions are:

- constructors, transfer, and replay restoration: 2366, 2400, 2431, 2790, 3282, 5257, 6510, 6519, 12774, 12812;
- connection setter and local/synthetic ordering: 2289, 2381, 3205;
- timestamp-first comparators: 6879, 8781;
- lobby, character-select, crew-battle, and roster UI zero checks or ordering: the remaining methods.

The readable `Ready`, `LockIn`, `UI_CharacterSlot_Notification_HasJoined`, controller-disconnect, and character-slot strings support the roster-state interpretation. They are confirming context, not the sole naming proof.

## Reproducible validation

Keep proprietary inputs under ignored paths or outside the repository. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:roster-connection-timestamp -- \
  --abc /path/to/hash-pinned/main.abc \
  --manifest /path/to/hash-pinned/manifest.json
```

Useful bounded view:

```bash
bun run provenance:roster-connection-timestamp -- ... \
  | jq '{status, identity, field, anchors, referenceClosure: (.referenceClosure | del(.exactFieldReferences)), reviewedCorpus}'
```

Successful output reports:

- status `proven-for-reviewed-inputs`;
- build `10.09.96325` and ABC digest `9fe9...ba2d`;
- 15,010 decoded method bodies and valid branch targets;
- exact QName `36:26556` with 42 methods, 80 instructions, and ledger digest `9425...5fa`;
- 12 fixtures and 48 target values;
- timestamp spread 8-787 seconds;
- latest-timestamp-to-file-modification range 205-212 seconds;
- UTC date `2026-08-04` for all reviewed values.

The analyzer emits no ABC bytes, replay bytes, fixture filenames, raw timestamp values, player names, player IDs, account data, or local input paths. Operating-system errors can still reveal a caller-supplied path.

## Parser and specification impact

The evidence makes these implementation changes specifiable without another semantic decision:

1. Rename the format-268 roster field from `connectionTime` to `connectionTimestampSeconds` or an equivalently precise name.
2. Read and expose it as unsigned 32-bit data, not signed `i32`.
3. Preserve zero as the initialized or cleared unjoined sentinel.
4. Preserve exact values because runtime participant ordering consumes them.

This research ticket does not implement those parser changes. Evidence discovery remains separate from runtime implementation, following repository convention.

## Confidence and residual gaps

### High-confidence conclusions

- Semantic structural name: `connectionTimestampSeconds`.
- Unit and epoch: whole seconds since the Unix epoch.
- Type: AVM2 `uint`, serialized as one unsigned 32-bit word.
- Default and cleared value: zero for an unjoined or cleared roster slot in the inspected paths.
- Production: server or link join update, plus monotonic local and synthetic assignment.
- Replay effect: exact writer-reader roundtrip and restored copy to the fighter field.
- Consumer: timestamp-first roster ordering with entity ID tie-break for the reviewed values and inspected comparator paths.
- Completeness: all exact QName references in the pinned ABC are enumerated and pinned.

### Residual uncertainty

1. **Original unobfuscated declaration name:** unknown. `connectionTimestampSeconds` is structural.
2. **Authoritative clock owner:** the packet supplies the normal online value, but inspected ABC evidence does not prove which server or host clock creates it.
3. **Overflow policy:** storage and wire behavior through `0xffffffff` are proven. Policy after the unsigned 32-bit Unix-second range is not.
4. **Comparator overflow:** method 8781 uses `subtract_i`, so differences outside the signed 32-bit range can wrap. Reviewed values are far inside that range.
5. **Every UI direction:** timestamp-first sorting is proven. Ascending versus descending presentation is not claimed for every mode and screen.
6. **Other builds and server policy:** out of scope. Closure applies only to the pinned 10.09.96325 ABC and reviewed format-268 corpus.

## Ticket and fog impact

This resolves the roster-word unknown for the reference build. Map gist: **the final state-4 roster word is an unsigned Unix connection timestamp in seconds, restored into the fighter and used as a stable roster-order key; zero means unjoined or cleared.**

No new Wayfinder research ticket is required. The parser's signed `connectionTime` representation is an implementation-ready correction, not remaining semantic fog. The authoritative online clock owner and post-`0xffffffff` policy are low-priority residual gaps unless the simulator's supported lifetime or input validation contract requires them.

## Related reviewed evidence

- [Format-268 replay semantics and original bounded unknown](https://github.com/NickTacke/brawlhalla-sim/blob/327166d3f9a09f0d9a5c519b58039e36ea4f835f/artifacts/research/replay-format-268/format-268-semantics.md)
- [Generic roster bitset semantics](../generic-roster-bitset/generic-roster-bitset.md)
- [State-4 game-settings word 14](../game-settings-word-14/game-settings-word-14.md)
