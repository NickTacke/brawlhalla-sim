# Native replay writer and file disposition in Brawlhalla 10.09.96325

Issue: [Close the native replay writer and file-disposition sequence](https://github.com/NickTacke/brawlhalla-sim/issues/43)

## Verdict

**The native boundary is the synchronous AIR filesystem sequence `FileStream.open(finalFile, FileMode.WRITE)`, `writeBytes(fullReplayByteArray)`, then `close()`.** Method 6524 writes directly to its final `.replay` name under `File.userDirectory/BrawlhallaReplays`. It does not write a temporary file, rename or move a file, or delete a failed output.

Before that sequence, application-owned code has already emitted the replay bitstream, applied the build's repeating XOR transform, and called `ByteArray.compress()`. The native calls do not serialize the replay structure. They publish the already serialized and compressed `ByteArray`.

The ordinary all-three-return path produces a completed file at the AIR API boundary. It is structurally valid format 268 when the writer has received its normal Header and GameData initialization before finalization. The 12-file authentic corpus proves that this completed production outcome occurs. It does not independently label the runtime call stack for each file.

A single `catch (Error)` covers directory lookup through `close()`. The handler neither closes nor deletes the file. It records the caught value, then joins the same field assignment and return as success. An error after `open()` can therefore strand an empty, partial, or even parser-valid final-name file. The method does not expose a success result and does not distinguish those outcomes.

The previously reported delete candidates 2559, 2602, and 2603 are false positives caused by an off-by-one constant-pool display bug in ignored lexical scanners. Their real callee is obfuscated telemetry helper `_-K2d`, method 2607, not AIR `File.deleteFile()`. A separate replay-loading path, method 12473, can later delete a replay that throws during read/parse or fails restored validity checks. That is load-time rejection, not writer failure cleanup.

Confidence is **high** for the serializer boundary, path construction, open mode, whole-buffer write, close, exception range, absence of rename and writer cleanup, scanner correction, and later replay-loader deletion. OS-level durability after synchronous `close()` returns is outside the inspected evidence.

## Evidence grades

- **Proven:** exact typed trait, QName, byte-PC control flow, or complete call ledger in the hash-pinned ABC; exact structural parser behavior; or authentic corpus observation.
- **AIR contract:** behavior stated by the AIR SDK reference for an exactly resolved AIR QName.
- **Conditional outcome:** filesystem residue permitted by the proven call and exception order but not observed in a controlled failure trace.
- **Unknown:** the inspected evidence does not distinguish the outcome.

Repository reports and the ignored scanners were locators only. Every executable claim below was re-decoded with correct one-based constant-pool indexing and checked by the committed fail-closed analyzer.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Replay writer, AIR QNames, exception table, path construction, receiver-classified move/delete candidates, replay-loader deletion |
| Sole semantic build string in that ABC | `10.09.96325` | Build identity |
| Authentic format-268 manifest | `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac` | Twelve completed production files and structural cohort identity |
| Prior replay lexical scanner | `8f8ce520c14f9ebc3badb03db6aed3becdb39cb624e4968f17f354282bffa949` | Documents the stale path and off-by-one candidate discovery |
| Prior writer lexical scanner | `317e23156888b2123d87bdd703106b81ba45f1bcdf092692c314a7f43cfc1e7b` | Documents the false delete candidates and replay literal locator |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction decoding |

The analyzer decodes all 15,010 method bodies, rejects invalid branch targets, requires every hash-pinned local input above, checks the decoder commit in `bun.lock`, and fixes ordered ledgers for the writer suffix, every public `moveTo`/`deleteFile` candidate, and the receiver-proven `File.deleteFile()` subset.

## Serialization ends before filesystem I/O

Class 357 `_-16` owns method 6524 and a slot `_-m5V` typed exactly `flash.filesystem::FileStream`. Constructor method 6516 constructs that `FileStream` at PCs 40-47. Its other relevant field `_-12p` is the application bitstream wrapper `_-Wr`; `_-12p._-om` is the backing `ByteArray` passed to AIR.

The normal writer lifecycle is already established by the paired format evidence:

1. Constructor 6516 writes the format word into `_-Wr`.
2. Methods 6518 and 6519 write Header and GameData.
3. Finalizer 6524 writes the final Results section, Inputs, KO faces, optional final faces, and End.
4. Method 6524 PC 897 invokes application static transform method 6526 on the backing `ByteArray`.
5. PC 931 calls `ByteArray.compress()`.
6. Only then does PC 943 enter path and filesystem work.

The repository envelope parser performs the inverse zlib inflate and XOR transform. The authentic cohort parses as format 268. Thus `FileStream.writeBytes()` receives the finished on-disk envelope, not an object to serialize.

## Output directory and final-name selection

Static method 997 `_-X2i._-ag():File` is exact and small:

```text
PC 0   getlex flash.filesystem::File
PC 4   getproperty userDirectory
PC 13  pushstring "BrawlhallaReplays"
PC 17  callproperty resolvePath, 1 argument
PC 26  returnvalue
```

Method 6524 then:

1. Calls method 997 and coerces the result to `flash.filesystem::File` at PCs 943-958.
2. Calls `File.createDirectory()` at PC 962. AIR creates necessary parents and does nothing when the directory already exists.
3. Builds a base label from the patch prefix `[10.09] ` and the available match label, or `Unknown`; its normalization removes spaces from the label.
4. Sets `File.nativePath` directly to `<directory>/<label>.replay` at PC 1022.
5. Tests `File.exists` at PC 1081. If occupied, it sets `<directory>/<label> (n).replay` at PC 1076 and increments `n` until `exists` is false.

This is a best-effort collision loop, not an atomic reservation. Another process could create the selected path between the final `exists` read and `open()`. In that race, `FileMode.WRITE` permits truncation of the newly occupied path.

## Exact native filesystem sequence

The three formerly unresolved calls are exact AIR QNames:

| PC | Receiver and call | Proven input | AIR contract |
| ---: | --- | --- | --- |
| 1103 | `FileStream.open(file, FileMode.WRITE)` | The final `.replay` `File` and exact `WRITE` constant from PCs 1094-1103 | Synchronous; creates a missing file and truncates an existing file on open |
| 1125 | `FileStream.writeBytes(byteArray)` | `_-12p._-om`, the finalized compressed replay buffer | With omitted offset and length, writes the entire buffer |
| 1136 | `FileStream.close()` | The same `FileStream` field | Closes the stream; no later read or write is permitted |

AIR documents synchronous `open()` as pausing the caller while underlying file I/O runs. Its synchronous write example uses the same `open`, write, `close` order. No asynchronous open, output-progress listener, temporary file, `moveTo`, or rename appears in method 6524.

At the runtime API boundary, the all-three-return path is the completed write path. OS cache flush, power-loss atomicity, and storage-device durability are not promised by this static evidence or the cited AIR contract.

## Error handling and file residue

Method 6524 has one exception entry:

```text
protected: [PC 943, PC 1141)
type:      Error
target:    PC 1145
handler:   coerce Error, store local, no close, no delete, no rethrow
join:      set _-w1J = true at PC 1158, return at PC 1161
```

The protected range starts before the replay-directory method call and ends immediately after `close()`. Therefore every AIR filesystem operation above can transfer to the same handler. The `_-w1J` assignment is not proof of success because both successful and handled-error paths reach it.

| Path | Exact completed operations | File outcome |
| --- | --- | --- |
| Null candidate at PC 79 | None of the finalization or filesystem sequence | This invocation produces no new file |
| Existing writer-state guard at PC 90 | None of the finalization or filesystem sequence | This invocation produces no new file |
| Error before `open()` returns | Directory/path work may have occurred | Normally no new replay file; an `open()` failure can still have implementation-specific side effects |
| `open()` returns, `writeBytes()` throws | Final path was opened in `WRITE`; `close()` is skipped | Empty or partial final-name file is permitted; no cleanup is attempted |
| `writeBytes()` returns, `close()` throws | Entire buffer was submitted; close did not return | File may already be parser-valid, partial, or not durably complete; method cannot distinguish |
| All three calls return | Final path was opened, whole buffer written, stream closed | Completed file at AIR API boundary; structurally valid when normal Header/GameData initialization preceded finalization |

An Error after all envelope bytes have reached the file could leave a structurally valid file despite taking the handler. That is a possible residue, not a reliable completed path. Only the nonexceptional all-three-return path gives the application-level completion sequence.

AIR also documents that application shutdown automatically closes associated `FileStream` objects. That does not supply immediate writer cleanup, delete a partial path, or turn the caught Error into a success signal.

## Delete and rename disposition

### Correction to the prior delete candidates

The ignored scanners decode a multiname's `data.name` as `strings[name]`. ABC indexes are one-based, so the correct display is `strings[name - 1]`. The bad display shifted each candidate to the following unrelated string.

Methods 2559, 2602, and 2603 actually call the same global helper `_-K2d` with one object argument. Method 2607 defines `_-K2d`; it updates telemetry-shaped object fields and contains no `File`, `FileStream`, `deleteFile`, or move operation. These methods are not weak deletion evidence. They are false positives.

### Complete receiver-classified disposition ledger

`moveTo` and `deleteFile` use public QNames, so names alone do not identify receiver classes. Across all 15,010 bodies, the complete public-name candidate ledger classifies as follows:

| Receiver and operation | Method and PC |
| --- | --- |
| `flash.display.Graphics.moveTo(x, y)` | 1812:104, 1813:136, 5758:514, 10216:28, 11317:222, 13553:567 |
| `flash.filesystem.File.deleteFile()` | 3286:143, 5941:153, 12434:12 |
| `flash.filesystem.File.moveTo(...)` | None |

The six `moveTo` candidates are graphics drawing calls. Methods 1812, 1813, and 10216 receive a typed `Graphics` parameter; methods 5758, 11317, and 13553 read a display object's typed `graphics` property as the receiver. They are not filesystem operations.

Method 6524 is absent from both groups. It opens the final path directly, and the complete receiver classification finds no `File.moveTo` or rename call anywhere in the ABC.

Method 3286 reads and removes `applicationStorageDirectory/cdsnt.dat`, unrelated to replay output. Method 5941 reads a separate compressed input file, closes it, deletes it, then uncompresses and consumes its bytes. Neither method has a writer-sequence edge.

### Later replay-loader deletion

Method 12473 is a replay-list loader. It opens a source replay at PC 98, reads all bytes at PC 105, and invokes replay reader method 6510 at PC 171. Its `Error` handler closes the read stream at PC 189 and calls helper 12434 at PC 201. On normal return it closes at PC 215, then also invokes helper 12434 at PCs 238 or 293 for a null reader or the exact restored invalidity predicate `_-T1c || !_-M2I || _-fq == null`.

Helper method 12434 calls `File.deleteFile()` at PC 12 inside its own `catch (Error)` and suppresses deletion failures. This path can remove an unreadable, incompatible, or invalid replay when the replay browser processes it. It does not run from method 6524's catch and does not guarantee cleanup of a failed save before that later load attempt.

## Structurally valid format-268 outcomes

The repository parser's structural acceptance boundary is exact:

- zlib inflate and XOR decode must succeed;
- format must dispatch to supported 264/268 structure;
- a reachable End state must occur;
- Header and GameData must have been seen;
- at least one Results section must have been seen;
- state 8, unknown states, invalid bounds, and invalid input ordering are rejected.

Method 6524 itself supplies final Results, input/event sections, and End. Header and GameData are earlier writer-lifecycle obligations. Consequently:

1. **Normal initialized writer plus all three filesystem calls returning:** completed, structurally valid format-268 file.
2. **Normal initialized writer plus handled failure:** no reliable completed outcome; absent, empty, partial, or parser-valid final-name residue can result depending on the throwable operation and host state.
3. **Writer lacking required earlier sections:** even a successful open/write/close can create a completed but structurally invalid file, which the later loader may delete.
4. **Lexical candidates 2559/2602/2603:** no file outcome because they are unrelated telemetry calls.
5. **Loader method 12473:** consumes an existing file and may delete rejected input; it does not produce a replay.

The 12 authentic files in manifest `b044...d1ac` all prove the first outcome exists in production for the reviewed completed playlist-108 cohort. They do not establish failure frequencies or filesystem residue.

## Reproducible validation

Keep proprietary inputs under ignored paths or outside the checkout. From the repository root:

```bash
bun install --frozen-lockfile
bun run provenance:native-replay-writer -- \
  --abc artifacts/research/brawlhalla-physics/main.abc \
  --manifest artifacts/replay-corpus/10.09.96325/manifest.json \
  --replay-scanner artifacts/research/brawlhalla-physics/brawlhalla-swz/find_replay.ts \
  --writer-scanner artifacts/research/brawlhalla-physics/brawlhalla-swz/find_replay_write.ts
```

The ABC path is illustrative. Successful output reports:

- `proven-for-pinned-abc`;
- build `10.09.96325`, ABC digest `9fe9...ba2d`, manifest digest `b044...d1ac`, both scanner digests, and decoder commit `ad9714d`;
- 15,010 decoded bodies and valid branch targets;
- writer method 6524 with 1,162 bytes and 524 instructions;
- directory `File.userDirectory/BrawlhallaReplays`;
- exact PCs for XOR, compression, final path, `open`, `writeBytes`, and `close`;
- Error range `[943,1141)` with no cleanup;
- corrected methods 2559/2602/2603 as `_-K2d` calls;
- all nine public-name candidates, classified as six `Graphics.moveTo` calls and three `File.deleteFile` calls;
- loader-to-delete-helper relation for methods 12473 and 12434;
- writer-sequence ledger `5840c978905599ba3e311a5cd99b57ad43b37e0e571955ca0fcab7b600da871e`;
- public move/delete candidate ledger `f813915cedf3d5a0728580641a34ce7b1b80eb2e6640dbb6b88c3f958cf6373b`;
- receiver-proven file-delete ledger `cb597048c27d1a4c33d84c82e8a1d0d65132a9dd850db6e1e6fcda2532ba0757`.

The command emits no ABC bytes, replay bytes, replay filenames, player names, player IDs, local input path, or source payload. Operating-system errors can still include a caller-supplied path.

Repository verification:

```bash
bun test packages/replay-format/tests/parser268.test.ts
bun run check
```

## Confidence and residual gaps

### High-confidence conclusions

- Serializer boundary: application bitstream, XOR, and compression finish before filesystem I/O.
- Output location: `File.userDirectory/BrawlhallaReplays`.
- Naming: direct final `.replay` path with a non-atomic `exists` suffix loop.
- Filesystem sequence: synchronous `open(WRITE)`, whole-buffer `writeBytes`, `close`.
- No writer-side temporary file, rename, move, delete, retry, or cleanup.
- Exception behavior: `Error` is swallowed after any filesystem-prefix failure; success and failure share the PC-1158 assignment.
- Prior delete candidates: false positives from one-based constant-pool misindexing.
- Later replay deletion: method 12473 rejects through catch-protected helper 12434, not through the writer.
- Completed valid path: normal initialized buffer plus all three synchronous filesystem calls returning.

### Residual uncertainty

1. **Failure residue:** no controlled host-failure trace proves exact byte count or file visibility after each throwable operation. The static sequence deliberately permits several outcomes.
2. **OS durability:** successful AIR API return does not prove power-loss-safe persistence or atomicity.
3. **Collision race:** no atomic creation flag protects the `exists` check from another writer.
4. **Production frequency:** the authentic corpus proves successful files, not which failure branches occur or how often later loader deletion runs.
5. **Other builds:** out of scope. Every executable claim is pinned to ABC `9fe9...ba2d`.

These gaps do not block the map destination. Supported simulator input is already restricted to authentic, structurally valid format-268 files; reproducing malformed-file and host-I/O failure behavior is explicitly outside that contract.

## Ticket and fog impact

This resolves the native boundary left by [Prove replay-writer eligibility across match configurations and lifecycle exits](https://github.com/NickTacke/brawlhalla-sim/issues/18): completed saves write the finalized envelope directly to a final replay path, while handled failures have no cleanup guarantee and do not prove successful emission.

No new Wayfinder ticket is required. Failure-residue fidelity belongs outside the map's supported-input contract. This result does not promote any unobserved match configuration or lifecycle exit to replay-producing; upstream reachability remains the separate scope of [Resolve upstream replay-save reachability and lifecycle semantics](https://github.com/NickTacke/brawlhalla-sim/issues/42).

## Primary sources

- Ignored official-build `main.abc`, SHA-256 `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d`.
- Ignored authentic-corpus manifest, SHA-256 `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac`.
- [AIR SDK `FileStream` reference](https://airsdk.dev/reference/actionscript/3.0/flash/filesystem/FileStream.html).
- [AIR SDK `File` reference](https://airsdk.dev/reference/actionscript/3.0/flash/filesystem/File.html).
- [AIR SDK `FileMode` reference](https://airsdk.dev/reference/actionscript/3.0/flash/filesystem/FileMode.html).
- [Repository format parser](../../../packages/replay-format/src/parser264.ts).
- [Prior replay-writer eligibility report](https://github.com/NickTacke/brawlhalla-sim/blob/cb0040cc14e2e0e824966f559f53017cc05de9fd/artifacts/research/replay-writer-eligibility/replay-writer-eligibility.md).
