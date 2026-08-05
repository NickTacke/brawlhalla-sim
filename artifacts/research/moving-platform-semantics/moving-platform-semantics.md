# Moving-platform runtime collision semantics in Brawlhalla 10.09.96325

Issue: [Prove moving-platform runtime collision semantics](https://github.com/NickTacke/brawlhalla-sim/issues/47)

## Verdict

The pinned executable proves a substantial, implementation-relevant moving-platform contract, but the ticket's universal runtime-collision acceptance is **not fully satisfied**.

For the ordinary authoritative tick, method 3217 calls moving-world method 7240 before fighter method 2894. Method 7240 advances every registered `MovingPlatform` through method 5836, refreshes associated collision-line and navigation coordinates, and then performs entity/platform collision and carry work. Collision lines are translated by the interpolated platform displacement. Display rotation is updated separately; associated collision endpoints are not rotated by this path.

The exact clock-to-frame formula, wrap, interpolation, epsilon-floor rule, `SlowMult`, `StartFrame`, endpoint refresh, dynamic point refresh, and pre-fighter phase are proven below. The complete branch meaning for every entity state and composite collision bit is not. No trusted reference trace is available, and platform-instance asset closure remains absent. The safe result is a bounded static contract, not a claim that all moving-platform collisions are behaviorally closed.

One-line map gist:

> Build 10.09 statically closes moving-platform time, interpolation, translation, association, and pre-fighter update seams, but composite-bit labels, every carry branch, missing platform assets, and differential traces remain open.

## Evidence grades

- **Proven:** exact control/dataflow, instruction, trait, callsite, or arithmetic in the hash-pinned ABC.
- **Source-derived:** exact inventory from hash-pinned shipped Dynamic source sections.
- **Bounded:** every member of a named exact-QName or reviewed-source set was enumerated, without claiming external asset or dynamic-oracle closure.
- **Unknown:** the inspected primary evidence does not settle the behavior.

Prior reports and older decompilation were locators only. Claims here were checked against the pinned 10.09 ABC and local shipped Dynamic source.

## Hash-pinned primary evidence

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | 3,934,088 bytes; `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Parser, moving-platform class, binders, dynamic-point consumers, tick manager, phase callsite |
| Sole semantic build string | `10.09.96325` | Build identity |
| Installed `Dynamic.swz` | `cd54de039bc4e3441a7ae5811ef8748a719f49e0d4917016407d83b201ddf9c4` | Parent shipped archive |
| Reviewed Dynamic source | 120 `LevelDesc` roots; root ledger `60630e3860e64d2d04deda1075d6cdb0f89e37cfaffd2ed8134f3dde95bbad99` | Reachable source-form inventory |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction decoding |

After comments are removed, an independent standards XML parse succeeds for 119 `LevelDesc` and 65 `CutsceneType` roots. The committed analyzer's bounded structural validation reports the same two source defects: `Dynamic.swz.103.xml` lacks one whitespace separator between adjacent attributes, and cutscene section `.122.xml` contains one unescaped ampersand. Applying only the game-compatible missing-separator normalization to section 103 recovers its `ThreeShips` `LevelDesc` and three moving forms. The complete 120-root active inventory is therefore 167 `MovingPlatform`, 167 child `Animation`, 167 `DynamicCollision`, 28 `DynamicRespawn`, and 28 `DynamicItemSpawn` elements. The cutscene defect remains reported and does not affect a `LevelDesc` count. Earlier issue-33 raw tag counts of 175 moving forms included commented-out examples and are not an active-element count.

Every active moving platform is identified by `PlatID`; related dynamic forms join through that ID. Platform display children and dynamic navigation nodes are additional associated forms. This inventory covers all 120 reviewed `LevelDesc` roots, but it does not restore the missing display-list platform assets identified by issue 33.

The committed analyzer proves that a supplied extraction matches issue 33's exact `60630e...ad99` LevelDesc ledger. It does not itself decrypt `Dynamic.swz` or prove extraction ancestry. That ancestry remains inherited from issue 33's hash-pinned read-only extraction procedure and must be reproduced with the same reviewed reader or an equivalent independently verified reader.

## Parser: method 5141 `_-h5c._-p3s`

Constructor method 5834 invokes method 5141 exactly once, passing the match context, animation XML, and platform base X/Y. The parser fills four synchronized vectors:

- `_-T33`: interpolated world-position keyframe points;
- `_-W5T`: corresponding local/origin points;
- `_-N2w`: rotation values;
- `_-44H`: per-frame Boolean phase/easing values used by method 5845.

The exact parser behavior is:

1. `Animation.NumFrames` overrides the caller-supplied frame count; otherwise the supplied count remains.
2. Keyframes parse `FrameNum`, optional X/Y, optional rotation, optional center coordinates, `EaseIn`, `EaseOut`, and `EasePower`.
3. Missing position components carry the parser's current/default component. Generated intermediate positions include the straight interpolation and center/arc branch described at issue-33 method PCs 640-1498.
4. Generated X and Y values are rounded to two decimal places at method PCs 1263-1405. This rounding occurs during vector generation, before runtime interpolation.
5. Optional `SlowMult` is parsed with `parseFloat` and stored in `_-s4u`. If absent, the caller-supplied fallback is retained.
6. Optional `StartFrame` is parsed with `parseInt`, defaults to zero, is added with integer arithmetic to the platform's existing `_-E2P`, and is stored as `uint`.
7. Constructor method 5834 calls method 5846 after parsing. Method 5846 scans the rotation vector and replaces the entire vector with null if every value equals zero. This is an optimization boundary, not evidence that nonzero rotation affects collision endpoints.

Parser acceptance is **met for the pinned method**. Source-value range validation, malformed XML behavior beyond AVM2 coercions, and other builds are outside this result.

## Time advancement, `SlowMult`, and `StartFrame`

Method 5838 `_-C3c(tick, frameCount)` computes a continuous frame coordinate. Let:

- `T` be the supplied authoritative tick;
- `Q` be match first-step timestamp `_-Z2h._-q3e`;
- `N` be the requested vector length;
- `S` be `SlowMult` field `_-s4u`;
- `F0` be `StartFrame` field `_-E2P`.

The exact arithmetic is:

```text
elapsed = T >= Q ? uint(T - Q) : T
duration = 1000 * (N / 60) * S
phase = (elapsed * 0.05) % duration
frame = F0 + (phase / duration) * N
```

Consequences:

- the first-step timestamp is subtracted only once `T >= Q`;
- the motion loops through modulo `duration`;
- `StartFrame` shifts the continuous frame coordinate before vector indexing;
- `SlowMult` scales duration multiplicatively, so a larger value slows advancement;
- the ABC does not guard zero, negative, NaN, or infinite `S` in this method. Shipped-source admissibility for those values is not claimed here.

Method 5839 `_-M3H(value)` returns `uint(Math.floor(value + 1e-7))`. No exact QName callsite reaches it in the pinned ABC. The live methods inline the same `+ 1e-7` and `Math.floor` sequence instead. Method 5839 is therefore dead or externally/reflection-reachable from the inspected static call graph; it is not the live floor call.

## Keyframe interpolation, wrap, and rounding

Method 5840 `_-5i(tick, worldOut, localOut)` is the live interpolation consumer.

1. It calls method 5838 with `_-T33.length`.
2. It computes `base = uint(floor(frame + 1e-7))`.
3. Current index is `base % vector.length`; next index is `(base + 1) % vector.length`. The final keyframe therefore wraps to index zero.
4. Fraction is `frame - base`.
5. Both output points are written as `current * (1 - fraction) + next * fraction` for X and Y.
6. Rotation uses the same fraction. When adjacent values differ by at least 180 degrees, exact `180` or `-180` endpoints are sign-normalized before interpolation.
7. Runtime X/Y interpolation is not rounded again. The only proven coordinate rounding is the parser's two-decimal generated-vector rounding. AVM2 `Number` arithmetic is retained afterward.

This corrects two tempting overclaims: method 5839 is not the invoked floor helper, and the runtime does not perform another two-decimal snap on each tick.

## Live platform update and collision refresh

Method 5836 `_-A4y(tick)` is the ordinary live update.

- It returns false and clears active/change field `_-j5Q` when the platform is disabled or has no position vector.
- It calls method 5840 to obtain interpolated world position `MovingPlatform._-V6d`, local/origin position `_-R4x`, and rotation.
- For every associated collision segment in `_-A2L`, it first restores cached relative endpoint components and then writes both endpoints as relative component plus `_-V6d.x/y`.
- For every associated navigation node in `_-94a`, it writes the node and its optional linked-line coordinates as cached relative coordinates plus `_-V6d.x/y`.
- It publishes current platform X/Y to both platform fields and scratch point `_-Z30`.
- If a display object is present, it applies interpolated rotation after multiplying by the existing radians conversion constant. This display rotation write is separate from the collision and navigation translations above.
- If a secondary controller is present, it receives the tick.
- The method reports changed when either absolute X delta or absolute Y delta exceeds `0.1`. It propagates that Boolean to each associated collision segment's `_-j5Q`.

The geometry writes precede the `0.1` change test. A sub-threshold new coordinate is therefore written to endpoints and nodes even when the return value is false. The return value controls later manager work and must not be treated as “geometry was not refreshed.”

Method 5837 `_-x2m(tick)` is the cached point-only update. It returns immediately when `tick == _-234`; otherwise it calls method 5840, caches the tick, and copies interpolated world X/Y to `_-330`/`_-u1t`. Exact callsites occur in methods 229, 5064, 5068, and 5069. These are the lazy dynamic-point consumers used by associated level objects.

## Association forms and dynamic offsets

The pinned class has one static binder callsite for each associated moving-geometry form:

| Method | Exact caller | Proven work |
| --- | --- | --- |
| 5847 `_-K5p(Vector.<NavNode>)` | method 5080 `_-82U._-D3n` | Attaches navigation nodes; subtracts first keyframe point from node and optional linked-line coordinates to cache platform-relative offsets |
| 5848 `_-a1v(Vector.<_-Y44>)` | method 5079 `_-82U._-K6u` | Attaches dynamic point-like objects; stores platform back-reference, subtracts first keyframe point, and invokes method 5841 for segment-relative vertical adjustment |
| 5849 `_-L2c(Vector.<_-L3i>)` | method 5081 `_-82U._-g3H` | Attaches collision segments and caches both endpoints relative to the first keyframe point |

Method 5841 searches associated collision segments whose horizontal span contains the dynamic point and whose vertical span straddles it. It derives a segment-relative Y value, selects the closest eligible segment, and calls the dynamic object's `_-Y2a` adjustment. The static type and dataflow are exact. A public label more specific than “dynamic point-like object” is not justified for every member because `DynamicRespawn`, `DynamicItemSpawn`, and related point forms share the binder/consumer family.

Methods 5842 and 5843 toggle a Boolean on every associated collision segment and the platform-wide toggle. No exact QName callsite exists in the pinned ABC. Their ordinary runtime reachability is unproven. Method 5844 cleanup has one caller, manager cleanup method 7242. Method 5845 samples the Boolean phase vector and has one caller in method 5068.

## Exact method and runtime-callsite closure

The analyzer hashes `JSON.stringify` of the pinned decoder's instruction objects for every asserted method. These are tool-representation hashes, not a cross-tool canonical bytecode format.

| Method | Role | Instruction-object SHA-256 |
| ---: | --- | --- |
| 5141 | Animation parser | `b6cbec79b91e8d6899b5bf0e036beb619b24dec5c6135b17a0143da937041879` |
| 5836 | Live platform refresh | `23936b119932825526e37f80452e71e5a57eba3dc9ee162f34382436eb867711` |
| 5838 | Tick-to-frame arithmetic | `a14212521841c292140eec328495deb18ba8af3b9d681848a8876ca57b6f2383` |
| 5840 | Runtime interpolation | `2b5a70134a262743a3c504e64ad08e3d3ad116d551f90c7d1e2846cc1b40e22c` |
| 7240 | Moving-world carry manager | `6888afe68cda0912df6d12cc235ff15bfad87358950446a75160841d4048212b` |
| 1390 | Collision query | `5c53868fc7375d4f7881d55491ab1cae00b2c6a46375731a9ba9275f161189d0` |
| 3217 | Authoritative tick root | `fa38584982aecca898b7dd153da870c49e039b4d4ab952510f97c3720df19308` |

Methods 5834 and 5836-5849 are all asserted by owner, trait, signature, and instruction-object hash. The exact-name sweep decoded all 15,010 bodies. Ordered callsite ledgers use `methodId NUL instructionOrdinal NUL opcode NUL argumentCount newline`.

These fail-closed hashes prove that the reviewed methods and callsites did not drift. They do not independently derive the semantic formulas from bytecode. The arithmetic, interpolation, endpoint-refresh, and carry conclusions above remain an instruction-level control/dataflow review of those pinned bodies.

| QName | References | Disposition | Ledger SHA-256 |
| --- | ---: | --- | --- |
| `_-p3s` | 1 | constructor parser call | `22055aab7df312718bd73f1cc97052c9b676f08408214bc248b3ce6e16a68dfe` |
| `_-A4y` | 3 | method 7240 ordinary update; two method-7241 forced/reset calls | `cc1fb506360446503e086c7ffc54eea7bc1d44f448af40541f0706947ff78154` |
| `_-x2m` | 4 | methods 229, 5064, 5068, 5069 dynamic-point refresh | `5f3d62d072e0c3f2cebbcbbed21a046ddd365564771590a816d95afadf3dcef5` |
| `_-C3c` | 4 | find/call pairs inside methods 5840 and 5845 | `3e837e6792a530bb4320285eebe8a946a09b2c496aeeaccfbbdbf9cc74ab7516` |
| `_-M3H` | 0 | no static consumer | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `_-5i` | 4 | find/call pairs in methods 5836 and 5837 | `0cac263173da06ed50e16a3e996a78508b6fbe9833ba20f76b59d91764959a26` |
| `_-X6J` | 2 | find/call pair in method 5848 | `0cea97ed56e99d24030b6f6c0e071a4185a5da1e52f811f8bcdac64da5f733c1` |
| `_-m3H` | 1 | manager cleanup method 7242 | `73ab748091620f091175369d32d651c2dcba1fc49d599a6bd278a3eab5862bdf` |
| `_-A1q` | 1 | dynamic consumer method 5068 | `bca149519dab1421f61cf7e3e67bae8f0587fea4b3bbde33e55510b0a61e9cff` |
| `_-u3M` | 2 | constructor find/call pair | `299b4a92e5a0aed2da38c00d8cba95b2bcd6db0f7c2a3ed93ffe0412c858ed97` |
| `_-K5p` | 1 | nav binder | `4e74b1a4409b1961474f60df016091eff73b29cc97fe1ba1b7d31735dbe3cc43` |
| `_-a1v` | 1 | point/spawn binder | `5f69a367edd300b6b88f8d05429515d287597af64a0e9460e7c1b071a2fdde3e` |
| `_-L2c` | 1 | collision binder | `91032af1d9ee5f206df08dd8e3a2117ce831a59fb2090599639bfe801f87a7bf` |

The zero-callsite toggle methods are explicitly excluded from ordinary reachable semantics. The sweep compares obfuscated names across the pinned ABC; receiver identity is independently pinned for the class-local and typed binder sites above. It is not a cross-build claim.

## Tick phase, entity carry, and collision queries

Method 3217 is the 16 ms authoritative loop. Its proven relevant order is:

```text
publish tick T
  -> method 6933 mode pre-phase
  -> method 7240 moving-world update/carry (tick-root PC 2642)
  -> method 4753 item pre-phase
  -> method 6583 respawn/scoring pre-phase
  -> fighter method 2894 movement/collision
  -> fighter method 2893 post-movement/death
  -> method 4755 item post-phase
  -> method 1474 deferred hit application
  -> method 6935 standard terminal phase
```

Method 7240 iterates the registered moving-platform vector in stored order and invokes method 5836. It then performs collision/carry work before fighter input and ordinary movement. Proven structural effects include:

- platform endpoints are already refreshed when entity carry queries run;
- associated platform segments participate through the same collision query method 1390 `_-K2O` used by stage/entity movement;
- the manager queries masks containing hard `1`, soft `2`, and trigger `4` combinations in distinct branches;
- it distinguishes soft segments through `type & 2` and preserves their one-sided/query-option behavior rather than converting them to hard lines;
- entities and companions are processed in their stored arrays after platform advancement;
- accepted carry paths add the platform displacement to entity coordinates through the entity coordinate setters;
- vertical probes include the exact `120` offset and `1.01` normal/edge nudge constants visible in method 7240;
- segment-relative collision references are written back to entities on accepted branches, including a separate branch for one composite collision flag.

This proves that carry is collision-mediated, not unconditional “standing entity += delta.” It also proves that collision refresh precedes carry and fighter movement.

It does **not** safely prove readable meanings for every obfuscated entity state, the complete set of companion states, or the composite bit `_-X2i._-J5i`. That bit is checked in moving-segment and entity branches and can alter retained collision references, but naming it as lava, pressure plate, bounce, no-slide, or another composite would exceed the evidence. The static method is large and contains mode/entity-state forks that have no controlled trace.

## One-way and composite interactions

Soft collision remains base bit `2`. Method 7240 explicitly tests that bit in moving-platform probes. Method 1390's already proven side gate still admits a soft candidate only when the signed side, query mask, segment type, or override option permits it. Translation does not reverse endpoints, normals, or type bits, so a translated soft segment retains its one-way orientation.

Associated endpoints are translated only. Although visual rotation is interpolated and applied to the display object, method 5836 does not rotate collision endpoints, explicit normals, or navigation coordinates. A simulator must not rotate moving collision solely because the platform sprite rotates unless another separately proven geometry path supplies rotated lines.

Composite type bits survive association and translation unchanged. Their parser composition is known from issue 33, but their complete moving-manager effects are not. In particular:

- one composite bit is explicitly consumed by method 7240;
- the readable identity of that bit is not closed here;
- bounce, no-slide, pressure-plate, game-mode, lava, mud, sticky, and item-ignore behavior cannot be inferred from tag names or from the base hard/soft tests;
- no controlled moving composite trace exists.

## Acceptance disposition

| Requested proof | Status | Evidence-backed reason |
| --- | --- | --- |
| Method 5141 parser | **Met** | Vectors, generated rounding, `SlowMult`, and `StartFrame` are exact |
| Frame advancement and wrap | **Met** | Method 5838 arithmetic and method 5840 modulo indexing are exact |
| Runtime interpolation/rounding | **Met** | Linear current/next interpolation, epsilon floor, rotation seam, and absence of runtime coordinate rounding are exact |
| Dynamic offsets and collision refresh | **Met** | Binders cache first-frame-relative values; method 5836 rewrites endpoints before carry |
| Tick phase order | **Met for ordinary authoritative path** | Method 7240 runs before fighter and item/respawn phases at tick-root PC 2642 |
| Entity carry | **Partial** | Collision-mediated displacement and ordering are proven; every entity/state branch is not semantically named or trace-tested |
| One-way interactions | **Partial** | Soft bit and side-gate preservation are proven; all gameplay query-option states are not |
| Composite interactions | **Not met** | One consumed composite bit remains unreadably identified; other composite consumer behavior is not closed |
| Every reachable moving form | **Partial** | Collision, nav, display, dynamic point/spawn binders and consumers are statically enumerated; missing platform assets and dynamic traces remain |
| Controlled reference agreement | **Not met** | No trusted reference collision/carry trace exists |

Overall issue-47 acceptance is **partial / not fully met**. The note is suitable as a reviewed static implementation contract and blocker ledger, not as closure of moving-platform conformance.

## Implementation-safe contract

A simulator may implement this bounded behavior from current evidence:

1. Parse method-5141 vectors with AVM2 `Number`, parser-time two-decimal generated-coordinate rounding, exact `SlowMult`, and uint `StartFrame` addition.
2. Compute continuous frame using method 5838 exactly, including first-step subtraction, `0.05`, modulo, and no invented guard for malformed multipliers.
3. Use `floor(frame + 1e-7)`, modulo current/next indices, linear interpolation, and the proven 180-degree rotation seam.
4. Cache associated collision, nav, and point offsets relative to keyframe zero.
5. On each ordinary tick, refresh translated endpoints/nodes before entity carry and before fighter movement.
6. Keep sprite rotation separate from collision translation. Do not rotate collision lines from this path.
7. Preserve segment type, flag, team, normal, and endpoint orientation during translation.
8. Preserve collision-mediated carry and fail closed when an unresolved entity state or composite flag branch is reachable.
9. Treat source-backed dynamic collision, nav, respawn/item point, and display forms separately. Do not assume one generic display transform closes all of them.
10. Reject conformance claims until missing platform assets and controlled reference traces are available.

## Reproducible validation

Keep proprietary inputs outside git and pass explicit paths:

```bash
shasum -a 256 \
  /path/to/hash-pinned/main.abc \
  /path/to/installed/Brawlhalla.app/Contents/Resources/Dynamic.swz

bun install --frozen-lockfile
bun run --cwd tools/avm2-provenance build-dependency
bun tools/avm2-provenance/moving_platform_semantics_provenance.ts \
  --abc /path/to/hash-pinned/main.abc \
  --dynamic-dir /path/to/ignored/decrypted-sections
```

The analyzer decodes all 15,010 bodies, validates every branch target, asserts methods 1390, 5141, 5834, 5836-5849, 7240, and tick root 3217 by signature and instruction-object hash, checks the exact callsite ledgers above, verifies the `60630e...ad99` LevelDesc ledger, and requires the authoritative phase order. It fails on ABC/build drift, invalid branch targets, owner/signature/body drift, changed callsite cardinality, ledger drift, tick-order drift, unexpected structural XML failures, or source inventory drift.

For source-form inventory, the analyzer strips XML comments before counting and reports rather than silently skips strict-validation failures. It applies one declared game-compatible repair only to the missing attribute separator in section 103. Successful output reports:

```text
120 LevelDesc roots; 66 CutsceneType roots
167 active MovingPlatform with 167 child Animation
167 active DynamicCollision
28 active DynamicRespawn
28 active DynamicItemSpawn
structural failures: Dynamic.swz.103.xml and Dynamic.swz.122.xml
compatibility normalization: one missing section-103 attribute separator
```

The analyzer does not substitute raw tag counts, because comments contain disabled moving examples. It proves that the supplied extraction matches the prior root ledger, not that the extraction came from the separately hashed archive. Reproduce that archive-to-section edge with issue 33's reviewed read-only extraction procedure. Do not commit the ABC, Dynamic archive, extracted XML, emitted disassembly, or filesystem paths.

## Blocking unknowns and residual risks

1. Exact readable identity and full behavior of composite bit `_-X2i._-J5i` in method 7240.
2. Branch-complete entity and companion carry semantics for every state selected by method 7240's switches.
3. Every gameplay caller's collision query mask/options during later fighter, item, and projectile phases.
4. Platform-instance asset closure and any graphics-derived collision not present in explicit Dynamic XML.
5. Controlled reference traces at wrap, epsilon-floor boundaries, sub-0.1 displacement, soft pass-through, drop-through, crush/side contact, rotation, and composite collisions.
6. Malformed or adversarial `SlowMult`, `StartFrame`, empty-vector, and mismatched-vector behavior in shipped loader reachability.
7. Reflection or host-driven reachability of methods with no exact QName callsite.
8. Independent archive-to-extracted-section ancestry beyond issue 33's reviewed extraction procedure.
9. Other builds.

## Surfaced ticket and fog suggestions

Suggestions only. No ticket was created or claimed.

1. **Classify method-7240 composite bits and every carry state:** resolve receiver/field identities and produce a branch-complete table for fighters, companions, and collision references.
2. **Capture moving-platform oracle traces:** record exact tick-ordered platform frame, endpoints, entity coordinates, retained ground segment, and query result at straight, wrap, one-way, side-contact, sub-threshold, and composite cases.
3. **Close platform asset binding:** install and hash every display-list asset, then prove whether any graphics-generated dynamic line supplements or replaces explicit Dynamic collision.
4. Keep general collision-query option semantics in the existing collision-query fog rather than duplicating it here.
5. Keep AVM2 `Number`, modulo, floor, and XML coercion edge behavior in the native/numeric semantics work.

## Privacy and licensing

This note contains hashes, counts, method/field identifiers, instruction-derived formulas, and callsite-ledger hashes only. It contains no executable/archive bytes, decrypted XML payload, replay bytes, player/account data, or local filesystem paths.

## Related reviewed evidence

- [Level resolution and collision geometry at commit `e308fc6`](https://github.com/NickTacke/brawlhalla-sim/blob/e308fc680be98bf55d28ab3ce3f34750c41e5b28/artifacts/research/level-collision-geometry/level-collision-geometry.md)
- [Authoritative tick phases](https://github.com/NickTacke/brawlhalla-sim/blob/54a0d782/artifacts/research/tick-phase-semantics/tick-phase-semantics.md)
