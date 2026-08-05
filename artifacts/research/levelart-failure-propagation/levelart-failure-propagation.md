# Terminal `LevelArt` failure propagation in Brawlhalla 10.09.96325

Issue: [Prove terminal LevelArt failure propagation](https://github.com/NickTacke/brawlhalla-sim/issues/64)

## Verdict

**Ticket acceptance is not fully satisfied.** The pinned local code closes the `LevelArt` resource state machine, retry timing, pending placeholder, per-attempt cleanup, and the primary method-3216 match-initialization gate. It proves that ResourceManager has no retry-exhaustion transition.

It does not close one application-wide question: six exact callsites invoke level-manager readiness method 5070, and three have bypass behavior that is not yet proven unreachable for every replay-producing match. Method 3205 can continue after 3,000 ms, method 3209 can continue after its separate deadline, and method 3508 discards the readiness result. Until those callers are classified and their later convergence on method 3216 is proved, the universal match-abort, continuation, or stall contract remains open.

Within the primary method-3216 path, a required PNG that never becomes usable keeps pre-match initialization pending. There is no LevelArt-specific abort, fail-closed error, or fallback edge on that path.

## Bounded answer

The exact ResourceManager outcomes are:

1. `Loader.loadBytes` parse failure dispatches `IOErrorEvent` under the official AIR API. Method 5471 sets resource state `6`, optionally logs `Failure loading resource <relative filename>`, and method 6559 waits 5,000 ms before cleaning up and starting another attempt.
2. A load that remains in state `2` restarts after `10,000 + 5,000 * priorRestarts` ms when the resource has never reported progress, or `30,000 + 5,000 * priorRestarts` ms after its sticky loaded-byte field becomes nonzero.
3. A Loader completion becomes resource state `5`. Method 5139 separately requires non-null `BitmapData`; unusable state-5 content leaves the XML node pending but is no longer retried.
4. No retry count is compared with a limit. The per-resource restart counter only lengthens state-2 timeouts. The global retry statistic is only initialized and incremented.
5. Method 5143 retains the XML node until method 5139 returns true. In method 3216, method 5070 returns false before post-load publication and the initialization-complete write.

## Evidence grades

- **Proven static:** exact typed control/dataflow, branch target, method body, or complete exact-QName reference ledger in the hash-pinned ABC.
- **Official runtime contract:** behavior stated by the ActionScript 3.0 AIR Loader API reference.
- **Bounded closure:** every member of a declared local set was enumerated without claiming unresolved callsites are unreachable.
- **Unknown:** inspected evidence does not settle the claim.

Issue wording and prior reports were locators only. The local primary ABC supplies the application evidence. No missing proprietary asset was fabricated or committed.

## Evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Asset record, ResourceManager state machine, LevelArt reader, match initialization |
| Sole semantic build string | `10.09.96325` | Build identity |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |
| Decoded method bodies | 15,010 | Complete pinned-ABC search boundary |
| Resource-state exact-QName ledger | `b101a18ad0ecc6f13342f3e460128f505c2b7646fb82ea15b55c5c63290946b6` | 29 instructions in 14 methods |
| Per-resource restart-counter ledger | `2966e44f79078e39748670b9adb46134d9b701b9577556a24c22223f4ffe944f` | Five instructions in two methods |
| Global retry-statistic ledger | `0b69cd34d382e56626d148402eb883d520da3765d92e7d5067f6298b06b9750f` | Five storage instructions in two methods |
| Level-manager initialization-call ledger | `cf5c74533e56ebad2553ee4a136316f8551d0af4a8b05eb8f82b3b103eb91f12` | Six exact calls in six methods |
| Level reset-call ledger | `1e296ebb2f3bccbc47c936bdad8ffe9f87db1bfeaa1adf6d5454c4a9b7d2c360` | Eight exact references in five methods |
| Resource-request-call ledger | `752b4d15c122b7226e53ff56ef06e7e8d476ee177d1526464153e3d396949479` | 19 exact references in 16 methods |
| Loader-failure-handler ledger | `2beb04d908f81cce6decdbee89a3631ec14a9c12b36c1f603c079f28eb3f083c` | Listener registration and removal: 12 references in two methods |

Every decoded branch target was validated. Exact QNames, not displayed-name coincidence, produced the reference ledgers.

## Method identity ledger

| Method | Role | Code SHA-256 |
| ---: | --- | --- |
| 3216 | Primary game-state initialization gate | `69b7b539e9b731074c7f80e1949a48f039fbbe3db7b4b80fad3396fef736f0ed` |
| 5070 | Level-manager readiness and post-load publication | `8a3c6a6f41ca56c1c784e9493bb73110d9b6065bab49a62ef481a204ac1761d6` |
| 5139 | Exact LevelArt raster resolver | `3d098bd7d369cc102abf7c5a5677fd11a1750797aeeb4a33067fa6a3feffdc28` |
| 5143 | Selected-root load and pending-node retry | `d8a545e588557d2d6e5a70a3a4cbc4d91c74cfc020bb5eaddf562f2975042b9a` |
| 5149 | Level reader reset | `e52007a83fe9dfb20ba08aa13f5ab2b3ff2cc4c2b080b76da61afcf98f5e0cea` |
| 5456 | Resource-record constructor | `c121470c2d7a789306197eb96ef53e018744a915f914b92b7525e7dab0239d8e` |
| 5462 | Synchronous installed-file reader | `b1f60957a0af4ad429f6d173349528be17768e7764bea25b4c68505ed4746b92` |
| 5471 | Loader error event handler | `c1f07e06bdcd958a5d18d72f79338a6e8866bd9a9e91300075d3430c54dd3427` |
| 5473 | Loader completion handler | `2d8eb1069d375061aed0ef489bbd4ee6239f1307100e41c66f0f9e1e6f2c03e7` |
| 5474 | Attempt cleanup | `923b4a34fd9d6b62bddc4ba6f93985416b61e9fd9ba0e1533dd1172eb5941cea` |
| 5475 | Attempt start and Loader listener registration | `098c52f2228a25fed4fce18340760cd4f7144901c85c7e8a3ab5bebf05f5f29f` |
| 6546 | Resource-group cursor selection | `a454f13165fd3dcab7c8d4b5353334a6a24769818df302833cb12cf65eb7acdb` |
| 6559 | ResourceManager tick and retry state machine | `54a2681a566bd42d0eb1b8228a527a4ec7f9f320fae1f6b4c1e8da6da8981b27` |
| 6560 | Completed-resource processing wrapper | `06d60b6112a0f9bbc357582ef46a32c02eb9e76bec68bbfb79db2bc38cc7cee2` |
| 6561 | Completed-resource type dispatcher | `0e9225a04f78e8b88370ac38142eaad98b89d29f0819b63b8b09159bfd14763e` |
| 6563 | Exact resource lookup | `200e33b2f81f983977fd6f4d00c4822cea4fde0d3b3e3f74f8ba9fe731e7ed5c` |
| 6565 | Exact resource request and registration | `51ba260ffb7025a746144bb979b14a9b6b4571ff3da189bb8fe66dbe62d6ae5f` |

The committed analyzer also emits code-byte and instruction counts.

## Exact request predicate and placeholder

Method 5139 reads `AssetName` and computes `indexOf(".png")` at PCs 28-38. If that result is nonzero, PC 41 branches into the raster path at PC 47. Therefore ordinary names with `.png` later in the string and names without `.png` enter the path. Only a name beginning exactly with `.png` returns true immediately at PCs 45-46.

The active raster path constructs the exact `mapArt` path at PCs 47-137 and performs exact resource lookup through method 6563 at PCs 139-157. There is no similar-name or alternate-file branch.

When the resource record or its Loader is absent and loading is allowed, PCs 187-265:

1. select load group `LevelArt` through method 6546;
2. request the exact path through method 6565;
3. append the XML node to pending vector `_-T4W`;
4. construct and attach an empty `Sprite3D`;
5. map the XML node to that placeholder in `_-za`; and
6. return false.

Method 6565 returns immediately when the exact path already has a resource record. Otherwise it constructs one with default byte size 4,096, appends it to the ResourceManager vector, and inserts it into the exact-path map.

Method 5143 retries pending nodes in reverse order at PCs 303-402. It splices a node only when method 5139 returns true at PCs 373-392. On success, method 5139 inserts the real display object at the placeholder's child index and removes the placeholder at PCs 437-481.

The empty node is a pending display-list placeholder. No branch promotes it to a terminal substitute.

## Resource state machine

The resource record starts in state `1` at method 5456 PCs 2-8. Method 6559 switches on that exact field at PC 634.

| State | Meaning on the PNG path | Exact behavior |
| ---: | --- | --- |
| 1 | Queued | Starts when current weighted load plus this record's weight is at most six. |
| 2 | Loading | Waits for completion/error and uses the progress-sensitive timeout below. |
| 3 | No active action in this switch | Leaves the current resource group incomplete. No LevelArt producer was found. |
| 4 | Loader completed | PNG/JPG receives no additional parser; method 6559 writes state 5. |
| 5 | Resource processed | Counts as complete for group advancement. Method 5139 still requires non-null `BitmapData`. |
| 6 | Loader error | After 5,000 ms from the handler timestamp, cleanup and restart occur. |
| 7 | SWZ-specific reset value | Method 6554 passes 7 to cleanup for an outdated downloaded SWZ. It is not a LevelArt PNG producer. |

Method 5475 writes state `2`, creates a Loader for PNG/JPG, registers HTTP status, I/O error, progress, security error, and complete listeners, reads installed bytes, and calls `Loader.loadBytes` at PC 451.

Method 5462 catches a local file-open failure at PCs 85-147. It constructs `File: <filename> missing.` but does not send it to a logger or caller. It returns a ByteArray containing one zero `int`, so its length is four.

The official AIR Loader API defines `loadBytes` as asynchronous, requires only nonzero ByteArray length for this argument shape, and dispatches `ioError` when the runtime cannot parse the byte array. The code supplies a four-byte or nonempty installed-file ByteArray and a LoaderContext with the applicable application domain. This closes the predecessor's malformed-image event question without inferring from the ABC alone.

Method 5473 handles completion by writing state `4`. Method 6561 performs no additional PNG/JPG parsing, so method 6559 advances that record to state `5`.

Method 5139 accepts only state `5`, then calls method 5470 for bitmap data. Method 5470 returns null unless Loader content is a `Bitmap`. A null result keeps method 5139 false. Resource state `5` has no retry branch.

## Error and timeout retry

### Parse or Loader error

Method 5471 is registered for `IOErrorEvent.IO_ERROR` and `SecurityErrorEvent.SECURITY_ERROR`. It ignores the event argument and payload. It:

- records the current timer;
- writes state `6`; and
- if `Main._-g1Y` exists, calls its string sink with `Failure loading resource <relative filename>`.

Method 6559's state-6 branch waits 5,000 ms, increments the global retry statistic, calls cleanup method 5474, and immediately starts method 5475 again.

### Loading timeout

Method 6559 computes:

```text
base = resource.bytesLoaded != 0 ? 30_000 : 10_000
timeout = base + 5_000 * resource.priorRestarts
```

The loaded-byte field is sticky across attempts: method 5463 writes it, while methods 5474 and 5475 do not reset it. Once any attempt reports nonzero progress, later attempts use the 30,000 ms base. The restart counter includes both timeout-triggered and error-triggered cleanups.

At the threshold, method 6559 increments the global retry statistic, cleans up, and starts another attempt.

### Attempt cleanup

Method 5474's omitted argument defaults to state `1`. It closes an active Loader inside a guarded region, removes all registered listeners, nulls the Loader, increments the restart counter, writes state `1`, and clears temporary bytes. Method 6559 immediately starts method 5475 after cleanup on both retry branches.

## No ResourceManager exhaustion

The complete restart-counter ledger has five instructions in two methods:

- method 5474 increments it during cleanup;
- method 6559 reads it only to add `5,000 * priorRestarts` to the state-2 timeout.

There is no limit comparison, removal, error transition, or abort use.

The global retry statistic is initialized once and incremented at method 6559 PCs 778-787 and 900-909. Its complete ledger has no consumer.

State `6` is not terminal because method 6559 restarts it. State `5` is ResourceManager success even if method 5139 cannot retrieve bitmap data. No LevelArt terminal-failure state exists in the closed resource-state machine.

A pending current-group resource also prevents ResourceManager group advancement. Method 6546 selects `LevelArt`; method 6559 advances the group cursor only when every current-group resource is processed.

## Initialization propagation

### Primary method-3216 path

Manager method 5070:

1. calls method 5143 at PC 51;
2. returns false at PCs 56-62 when method 5143 is false;
3. invokes post-load method 5144 only after readiness succeeds; and
4. sets its completion flag only at PCs 335-345.

Method 3216 calls method 5070 at PC 2117. A false result takes the PC-2124 branch past `_-s4q = true` at PCs 2128-2133. The outer update continues and can call the gate again later.

ResourceManager method 6559 is called from Main method 5527 at PC 50, so retries continue while this initialization gate remains pending.

This bounded phase is:

```text
pre-match game-state setup
  -> level-manager readiness 5070
  -> selected-root readiness 5143
  -> pending LevelArt 5139 false
  -> 5070 false
  -> method-3216 initialization-complete write skipped
```

No LevelArt-specific abort or error UI is reached on this path.

### Alternate callsites block universal closure

The complete method-5070 call ledger contains six exact callsites in methods 3205, 3209, 3210, 3212, 3216, and 3508.

- Method 3210 returns without its success work when readiness is false.
- Method 3212 leaves its readiness flag false when readiness is false.
- Method 3216 has the bounded pending path above.
- Method 3205 combines readiness with a 3,000 ms deadline and continues after the deadline. Its later readable strings include `practiceTraining` and `practice`, but those strings alone do not prove the entire caller is outside every replay-producing route.
- Method 3209 combines readiness with a separate deadline and can continue after that deadline.
- Method 3508 invokes method 5070 as `callpropvoid`, discarding the Boolean result.

The exact state dispatcher reaches all of these methods. This report does not yet prove that methods 3205, 3209, or 3508 converge on method 3216 before gameplay, cannot occur for replay-producing matches, or safely continue with pending placeholders. That missing semantic callsite disposition is the acceptance blocker.

## Cleanup disposition

Method 5474 performs exact per-attempt Loader cleanup before retry. There is no terminal retry cleanup because no exhaustion exists.

Method 5149 is the ordinary LevelDesc reset. It clears pending vector `_-T4W`, placeholder map `_-za`, display collections, bounds, and flags. Its ResourceManager releases iterate `_-nx`.

Method 5139 appends a path to `_-nx` only after state `5` and non-null bitmap data. A missing, erroring, timed-out, or null-bitmap path does not enter that release ledger. An ordinary level reset can clear local pending references but cannot release that failed ResourceManager entry through this LevelDesc path.

The complete reset-call ledger has eight references in five methods. Neither Loader failure method 5471 nor ResourceManager retry method 6559 references method 5149. No failure-triggered level reset is proven.

Application-wide shutdown is outside this bounded claim.

## Observable surfaces

| Scenario | Resource behavior | Proven surface |
| --- | --- | --- |
| Installed file absent | Four-byte zero sentinel reaches asynchronous Loader parse and `ioError` | Generic failure string if logger exists; local `File: ... missing.` string is discarded |
| Loader I/O or security error | State 6, 5-second cleanup/restart | Optional `Failure loading resource <relative filename>` string |
| No completion/error and no prior progress | State-2 retries after 10s, 15s, 20s, and so on | No timeout log or UI edge |
| No completion/error after any prior progress | State-2 retries after 30s plus 5s per cleanup | No timeout log or UI edge |
| Loader completes without usable BitmapData | State 5, no resource retry, method 5139 remains false | No failure log or UI edge |
| Usable BitmapData appears | Pending node removed and placeholder replaced | Normal success path |
| Retries exhaust | No such ResourceManager transition | No terminal ResourceManager contract |

The physical destination of the optional logger is not named here. The ABC proves the string call, not whether a player sees it.

## Acceptance matrix

| Issue 64 requirement | Result | Disposition |
| --- | --- | --- |
| Exact retry | **Passed for ResourceManager** | State-6 fixed 5s; state-2 sticky 10s/30s base plus 5s per cleanup; no maximum |
| Placeholder | **Passed** | Empty pending Sprite3D, replaced only on usable bitmap, never promoted as fallback |
| Terminal error | **Passed for ResourceManager, negative** | No terminal failure state or retry exhaustion; optional generic error string only |
| Cleanup | **Partial** | Per-attempt cleanup exact; no failure-triggered level cleanup; application shutdown not traced |
| Match abort or fail-closed behavior | **Partial** | Primary method-3216 path waits; alternate readiness-bypass callsites remain unclassified |
| Phase | **Partial** | Primary pre-match readiness phase exact; universal replay-producing callsite closure missing |
| Observable failure contract | **Partial** | Internal string call exact; physical sink and bypass-route presentation unresolved |

Issue 64 must remain open.

## Surfaced route

No new issue was claimed or created.

The next proof should start from state dispatcher method 3218 and disposition methods 3205, 3209, and 3508 for replay-producing reachability. For each route, prove whether gameplay can begin before method 5070 returns true, whether method 3216 later gates it, and what screen or teardown state is observable after the deadline or discarded result.

The separate dormant graphics/collision obligation from issue 45 still decides whether any LevelArt pixel or dimension is gameplay-relevant to the simulator.

**Map gist:** Build 10.09 ResourceManager retries LevelArt parse errors and timeouts without exhaustion, while the primary method-3216 match path remains before post-load publication. Universal match behavior is still blocked by three readiness-bypass callsites.

## Reproduction and verification

Keep the proprietary ABC outside version control and pass its path explicitly. Do not use environment variables.

```bash
bun install --frozen-lockfile
bun run provenance:levelart-failure-propagation -- \
  --abc /path/to/hash-pinned/main.abc
```

Successful output reports `partial-static-proof`, build `10.09.96325`, ABC digest `9fe9...ba2d`, 15,010 decoded method bodies, valid branch targets, method identities, exact reference ledgers, retry formulas, no ResourceManager retry limit, and the bounded primary method-3216 path.

Repository checks:

```bash
bun run check
git diff --check
git status --short
```

The analyzer emits method metadata, hashes, and obfuscated identifiers only. It emits no ABC bytes, asset bytes, local paths, level names, replay data, or player data.

## Confidence and blockers

### High confidence

- Exact LevelArt request and pending placeholder behavior.
- Resource states, event handlers, retry formulas, and per-attempt cleanup.
- Absence of ResourceManager retry exhaustion.
- Sticky progress and restart-counter effects.
- Method 5143 pending-node retention.
- Primary method-3216 readiness stall.

### Exact blockers

1. Replay-producing reachability and later convergence for method-5070 callsites 3205, 3209, and 3508.
2. Whether those bypass routes can begin gameplay with pending LevelArt placeholders.
3. Physical visibility of `Main._-g1Y._-C1F("Failure loading resource ...")`.
4. Application-wide cleanup after an alternate route or process shutdown.

## Primary sources

- [AIR `flash.display.Loader` API](https://airsdk.dev/reference/actionscript/3.0/flash/display/Loader.html): `loadBytes` is asynchronous; unparsable nonempty bytes dispatch `ioError`; documented synchronous argument errors.
- [Level asset and Platform InstanceName geometry](https://github.com/NickTacke/brawlhalla-sim/blob/89dd2e64f10698e24e1078625e5f8c74a5ac1fae/artifacts/research/level-instance-geometry/level-instance-geometry.md)
- [Dynamic LevelDesc loader](https://github.com/NickTacke/brawlhalla-sim/blob/1cb9847a112a165b63634e607f3fb61d997c1404/artifacts/research/dynamic-leveldesc-loader/dynamic-leveldesc-loader.md)
