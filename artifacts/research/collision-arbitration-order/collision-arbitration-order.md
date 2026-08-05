# Collision phase, candidate, and dynamic arbitration order in Brawlhalla 10.09.96325

Issue: [Prove collision phase, candidate, and dynamic arbitration order](https://github.com/NickTacke/brawlhalla-sim/issues/66)

## Verdict

The pinned executable proves the ordinary collision phase seams, complete static candidate construction order, inclusive intersection boundaries, equal-distance overwrite behavior, static-versus-dynamic precedence, immutable dynamic-container ownership, in-place moving-line refresh, and teardown order.

The proof is **bounded static evidence, not full ticket acceptance**. Moving-platform methods 5842 and 5843 are the only writers of the query-visible disabled field, but neither method has an exact QName callsite in the pinned ABC. Dynamic dispatch, reflection, or host-driven reachability and the authoritative timing of any enable/disable transition remain unavailable. No trusted interpreted-reference trace covers ties, toggles, refresh, or teardown. Issue 66 must remain open.

One-line map gist:

> Build 10.09 evaluates canonical raster buckets in stored order, then dynamic lines in stored order; inclusive equal-distance hits normally let the later candidate overwrite, moving lines refresh in place before carry and fighter collision, but runtime toggle reachability and authenticated dynamic transition order remain unknown.

## Evidence grades

- **Proven:** exact instruction, branch, field-reference, method-body, callsite, or phase order in the hash-pinned ABC.
- **Bounded static order:** total order for the pinned methods and their exact QName callsites without claiming dynamic/reflection/host reachability.
- **Unknown:** the inspected primary evidence cannot establish the transition or runtime agreement.

Earlier issue notes and decompilation were locators only. Every new ordering and mutation claim below was rechecked against the pinned ABC with the committed analyzer.

## Hash-pinned primary evidence

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | 3,934,088 bytes; `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Candidate index, query, intersection, ownership, moving refresh, phase, and cleanup |
| Sole semantic build string | `10.09.96325` | Reference-build identity |
| Installed `Dynamic.swz` | `cd54de039bc4e3441a7ae5811ef8748a719f49e0d4917016407d83b201ddf9c4` | Contextual identity recheck of the related shipped collision-source parent; no new claim below depends on archive contents |
| ABC decoder | `abc-disassembler` commit pinned by `bun.lock` | Instruction decoding and byte-PC recovery |

The analyzer decodes all 15,010 method bodies and validates every branch target before checking method identity, body hashes, callsite ledgers, mutation ledgers, and phase anchors.

## Authoritative phase order

Method 3217 `_-u16._-z3z` is the 16 ms authoritative loop established by [Recover authoritative tick phases and timestamp semantics](https://github.com/NickTacke/brawlhalla-sim/issues/7). The collision-relevant ordinary order is:

```text
publish tick T
  -> moving-world method 7240 at tick-root PC 2642
       -> refresh moving platform geometry through method 5836
       -> moving carry queries through method 1390
  -> fighter method 2894 at tick-root PC 2738
       -> fighter movement and stage collision inside method 2887
  -> later post-movement, item, hit, and terminal phases
```

There is no independent global collision phase. Moving geometry and carry execute before each fighter's interleaved movement/collision work. Method 7240 calls refresh method 5836 at PC 252 before its collision-query sites at PCs 823, 1574, and 4634. Method 5836 writes associated endpoint coordinates before its `0.1` changed test, so even sub-threshold endpoint mutations precede those queries.

The ordinary phase is proven. Other direct method-1390 callers retain their owner-local placement; this ticket does not reclassify all 93 direct sites from [Close collision query options and composite flag consumers](https://github.com/NickTacke/brawlhalla-sim/issues/48).

## Candidate construction is ordered concatenation, not distance sorting

Method 1390 `_-91W._-K2O` calls method 1391 `_-91W._-K4Z` at PCs 93-114. Method 1391 builds one candidate vector in this exact order:

1. Call raster traversal method 1814 `_-f0._-t5I` with query start, query end, two scratch coordinate vectors, and cell size `100`.
2. Visit returned cell coordinates in method-1814 output order.
3. For each cell, derive its key through method 1396 `_-91W._-w5r` and fetch the cell vector from `_-D3I`.
4. Append every member of that cell vector in its current stored order.
5. After every raster cell, append every member of the dedicated dynamic vector `_-A2S` in its current stored order.
6. Return the resulting candidate count. Method 1390 scans indices `0..<count` forward.

No distance, type, normal, container ID, or insertion timestamp sort occurs in method 1391.

### Raster-cell order

Method 1814 computes absolute axis deltas, swaps axes when required to traverse on the dominant axis, swaps endpoints so the normalized dominant coordinate advances in one canonical direction, snaps against the supplied cell size, and emits crossed cells forward. At a secondary-boundary crossing it emits the adjacent crossed cell at that point before continuing the next dominant-axis step. Strict branch polarity and the whole instruction body are hash-pinned by the analyzer.

This canonicalization means bucket order comes from method 1814, not necessarily the caller's original ray direction. The exact cell sequence is followed without a later reversal or distance sort.

### Static registration and duplicates

Method 1394 `_-91W._-51g` indexes a static segment with the same method-1814 traversal and cell size `100`. For every crossed cell it creates or fetches a vector and pushes the segment at the tail. It then pushes the segment into the static all-segments vector `_-91r`.

A static segment crossing multiple visited cells can therefore appear multiple times in one candidate vector. Method 1391 does not deduplicate it. Within each bucket, registration order is evaluation order.

### Dynamic registration and precedence

Method 1393 `_-91W._-pg` pushes a segment only into `_-A2S` and marks the vector-backed state. Method 5151 `_-h5c._-26R` chooses this dynamic registration when its association-vector parameter is non-null; otherwise it uses static registration. The exact registration ledgers are two references to method 1393 and four references to method 1394.

Consequences for every method-1390 call:

- all static bucket appearances are evaluated before all dynamic candidates;
- dynamic candidates are evaluated in `_-A2S` insertion order;
- equal static/dynamic contacts normally give the later dynamic candidate overwrite opportunity;
- equal dynamic/dynamic contacts normally give the later inserted dynamic candidate overwrite opportunity;
- static duplicates retain their repeated positions and can be tested repeatedly.

## Intersection and tie rules

### Inclusive finite-segment intersection

Method 6109 `_-o2Z._-B14` computes two finite-segment parameters. It returns false when the denominator is exactly zero, so parallel and collinear overlaps do not enter the accepted-hit path through this helper. Otherwise it accepts only when both parameters are inclusively within `[0, 1]`. Shared endpoints are therefore accepted.

On success it writes the query intersection point and returns true.

### Ordinary nearest and equal-distance behavior

Method 1390 evaluates candidates sequentially. After a successful candidate, when no collection argument is supplied, PCs 1049-1091 replace the query endpoint with the accepted intersection and replace remaining movement with `intersection - start`. A later farther intersection fails against this shortened segment. A later equal-distance candidate still intersects at the inclusive shortened endpoint, becomes the current accepted segment, rewrites outputs, and replaces the return value.

The exact ordinary rule is therefore:

- nearer accepted candidates displace farther candidates by shortening the remaining query;
- at exactly equal distance or a shared endpoint, the **later eligible candidate normally wins**;
- “first wins,” “static always wins,” and “hard always wins” are not general rules.

Because candidate order is raster buckets then dynamic tail, the overwrite rule composes directly with the construction order above.

### Narrow hard-before-soft coincidence exception

PCs 296-480 skip one later candidate rather than allowing the ordinary overwrite. The branch requires all of these conditions:

- a prior accepted segment exists;
- the prior segment has a non-null normal with the raw `pushbyte 255` Y sentinel;
- the prior segment has hard bit `1`;
- the current segment has soft bit `2`;
- the current segment has a non-null normal with the same raw Y sentinel;
- prior and current `startY` are equal;
- no collection argument was supplied;
- the current segment's `_-A27` field equals its `startX`.

Only this exact branch proves an earlier-hard/later-soft retention rule. It must not be generalized to other hard/soft, endpoint, slope, or container ties.

### Collection mode

When the optional collection is present, method 1390 does not shorten the query. Each intersecting candidate is processed in candidate order, but it is pushed only when `indexOf(segment) == -1`. The collection therefore preserves first accepted occurrence order while suppressing duplicate segment entries. The current hit and point outputs still advance to later accepted candidates. The narrow hard-before-soft exception above explicitly requires the collection to be null and does not apply.

## Dynamic ownership, disable state, and refresh

### Container ownership is immutable after construction

Segment constructor method 1372 writes its fifth `uint` argument to field `_-i1K`. Exact-field reference closure finds six references total:

- one constructor `findproperty` and one constructor `initproperty`;
- one read in method 53;
- three reads in method 1390.

There is no later writer in the pinned ABC. Dynamic-container ownership is immutable for a segment's lifetime.

Method 1390 then applies ownership filters in candidate order:

1. PCs 184-193 skip a segment when disabled field `_-62S` is true.
2. PCs 197-224 skip a nonzero container ID equal to query parameter 1.
3. PCs 249-280, when option bit `2` is set, skip every nonzero container ID.

These filters remove candidates; they do not reorder survivors.

### Disable methods are exact but runtime transition order is unavailable

The disabled field has exactly three instruction references:

- method 1390 reads it once;
- method 5842 `MovingPlatform._-Q1q` writes false to every associated segment and the platform-wide Boolean;
- method 5843 `MovingPlatform._-x2n` writes true to every associated segment and the platform-wide Boolean.

Since method 1390 skips true, method 5842 enables associated collision lines and method 5843 disables them. Both loops mutate associated segments forward in stored order, then mutate the platform-wide field.

However, exact QName reference closure finds **zero callers for method 5842 and zero callers for method 5843**. Static evidence cannot decide whether dynamic dispatch, reflection, or a host path invokes either method, nor where such a transition lands relative to refresh, carry, fighter queries, or cleanup. This is the decisive acceptance blocker.

### Moving refresh does not reindex candidates

Dynamic lines live in `_-A2S`, outside static spatial buckets. Method 5836 rewrites their endpoint fields in place. Method 1391 appends the current `_-A2S` members on every query after constructing the static bucket prefix.

Therefore moving-line refresh requires no spatial reindex and cannot change dynamic candidate position by itself. It changes intersection geometry while preserving `_-A2S` insertion order. Method 7240 performs platform refreshes in stored platform order before its carry-query work and before fighter collision.

This closes the “candidate-list refresh” ambiguity from [Prove moving-platform runtime collision semantics](https://github.com/NickTacke/brawlhalla-sim/issues/47) for this bounded path. It does not supply the missing runtime enable/disable transition.

## Cleanup order

Global cleanup method 3442 `_-u16._-22K` calls moving-manager cleanup method 7242 at PC 786, then collision-manager cleanup method 1392 at PC 798.

Method 7242 performs these relevant steps:

1. clean its entity/controller vector forward in stored order;
2. replace that vector with a new empty vector;
3. iterate moving platforms forward in stored order and call method 5844 `MovingPlatform._-m3H` at manager PC 167;
4. replace the platform vector with a new empty vector;
5. clean additional manager collections.

Method 5844 releases its optional display/controller reference first, then nulls associated collision, navigation, world-position, local-position, rotation, and Boolean-phase vectors.

Only after every moving platform is released does method 1392 clean the collision manager:

1. unlock and empty every static bucket, remove bucket-map entries, then null the static map/key vector;
2. walk dynamic vector `_-A2S` forward, clear each segment normal through method 1380 `_-L3i._-o4z`, then null the vector;
3. walk static all-segments vector `_-91r` forward, clear each segment normal, then null the vector;
4. null all 1,024 candidate scratch slots in `_-A1t`;
5. clear the owning match-context reference.

This is lifecycle teardown, not an authoritative-tick collision phase. No trusted runtime trace proves callback or native reentrancy during teardown.

## Acceptance matrix

| Requested proof | Status | Evidence-backed disposition |
| --- | --- | --- |
| Ordinary authoritative collision phase | **Met, bounded** | Moving refresh/carry precedes fighter movement/collision; collision remains owner-local and interleaved |
| Static candidate order | **Met** | Canonical raster cell order, bucket stored order, duplicates preserved |
| Static-versus-dynamic order | **Met** | Dynamic vector is appended after every static bucket candidate |
| Equal-distance and shared-endpoint ties | **Met statically** | Inclusive endpoints; later eligible candidate normally overwrites; one exact hard-before-soft exception |
| Collection ordering | **Met statically** | Candidate order preserved, first accepted segment occurrence retained in collection |
| Dynamic-container ownership | **Met statically** | Constructor-only field write; same/all-container filters are exact |
| Dynamic enable/disable behavior | **Partial** | False enables and true disables in stored order; no exact caller or phase exists |
| Moving refresh order | **Met, bounded** | In-place endpoint mutation before carry and fighter collision; dynamic order unchanged |
| Cleanup order | **Met statically** | Moving manager/platform release precedes collision index/vector cleanup |
| Runtime agreement | **Not met** | No authenticated interpreted-reference tie, toggle, refresh, or teardown trace |

**Overall issue-66 acceptance is unmet.** Runtime tie traces and dynamic toggle/transition ordering remain unavailable, so the issue must stay open and the session claim must be released.

## Reproducible validation

Keep proprietary inputs outside Git and pass an explicit path:

```bash
shasum -a 256 \
  /path/to/hash-pinned/main.abc \
  /path/to/installed/Dynamic.swz
bun install --frozen-lockfile
bun run provenance:collision-arbitration-order --abc /path/to/hash-pinned/main.abc
bun run check
```

The issue-specific command fails closed on ABC/build drift, body-count drift, invalid branch targets, owner/signature/body drift, candidate/registration/toggle/cleanup callsite drift, field mutation drift, tie/intersection anchor drift, phase drift, or cleanup-order drift. Successful output reports `bounded-static-order-with-runtime-blockers` and names the runtime blockers rather than presenting static agreement as a differential trace.

## Exact blockers and required runtime evidence

1. No exact static caller reaches method 5842 or 5843. Dynamic dispatch, reflection, and host reachability remain unclosed.
2. Consequently, enable/disable transition timing relative to method-5836 endpoint refresh, method-7240 carry, fighter collision, and teardown is unknown.
3. No trusted interpreted-reference trace authenticates candidate ordinal, segment identity, container ID, disabled state, type, intersection, prior hit, shortened movement, and selected result.
4. Required controlled cases remain: equal-distance reversal, shared endpoint, static/dynamic equality, dynamic insertion reversal, same/different container, toggle immediately before query, sub-`0.1` endpoint refresh, and teardown.
5. Complete replay-producing reachability for every direct collision-query owner remains with the related query-reachability work and is not duplicated here.

## Privacy and licensing

This note contains hashes, method and field identifiers, counts, branch-derived rules, and byte-PC anchors only. It contains no executable/archive bytes, decrypted assets, replay bytes, player data, or local filesystem paths.

## Related evidence

- [Recover authoritative tick phases and timestamp semantics](https://github.com/NickTacke/brawlhalla-sim/issues/7)
- [Prove moving-platform runtime collision semantics](https://github.com/NickTacke/brawlhalla-sim/issues/47)
- [Close collision query options and composite flag consumers](https://github.com/NickTacke/brawlhalla-sim/issues/48)
