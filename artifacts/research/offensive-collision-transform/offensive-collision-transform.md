# Offensive collision region and world transform in Brawlhalla 10.09.96325

Issue: [Recover the offensive collision primitive and complete world transform](https://github.com/NickTacke/brawlhalla-sim/issues/51)

## Verdict

**The `_‑b20` premise is corrected and its static behavior is closed.** `_‑b20` is an axis-aligned screen/tooling rectangle, not the gameplay hitbox-hurtbox intersection routine. It receives the same selected PowerType center and radius values as the combat path, projects them through display-container scale and owner-anchor transforms, and exposes a point-containment predicate for tooling.

The active-power tick calls gameplay hit testing first through method 1540 `_‑Y4C._‑06D`, which reaches geometry method 1537 `_‑Y4C._‑vk`. Later, method 46 sends the selected geometry to `_‑Cn._‑ix`. That static field has declared type `_‑y4v`. In the pinned ABC, its known exact-QName writes construct exactly `_‑y4v` and later clear the slot to null, and `_‑y4v` has no subclasses. The reached initialized receiver's `_‑j5S` call therefore dispatches to method 10280, not method 10239. Method 10280 calls factory 13561 and queues `_‑b20` for screen/tooling consumption.

This corrects the issue 34 QName-only conclusion. Methods 10239 and 10280 share the public `_‑j5S` QName, but the reached exact construction and absent subclasses select method 10280 within the pinned ABC. The ledger does not claim to exclude computed runtime-multiname writes.

For every `_‑b20` offensive region reached from method 46:

- the shape is an axis-aligned rectangle stored as left, top, width, and height;
- selected center and radius table values cross `convert_i` and are finite AVM2 int32 values before the factory;
- transformed values use AVM2 Number arithmetic in bytecode order;
- the X/Y radius pair becomes full width/height by multiplying each transformed radius by 2;
- horizontal facing mirrors center X, not width;
- scale is the product/quotient of three reached display-container scales;
- owner placement uses `globalToLocal(root.localToGlobal(sourcePoint))`;
- queued regions refresh the owner anchor later without recomputing size;
- no SWF symbol, timeline, animation-bone, or skeletal transform is reached in the factory, setters, anchor, predicate, or refresh traces; and
- the sole `_‑b20` geometric predicate is fully inclusive point containment.

Confidence is **high** for the reached static traces. The analyzer pins the ABC, validates every branch target, asserts the receiver's reached exact construction and pinned-ABC subclass set, checks the complete `_‑b20` trait inventory, and hashes every direct exact class-QName reference. Computed runtime-multiname accesses are outside the ledger's scope.

## Evidence grades

- **Proven:** exact hash-pinned AVM2 control/dataflow with fixed method owners, signatures, instruction indexes, byte PCs, and branch targets.
- **Closed direct-reference ledger:** every exact reference to the `_‑b20` class QName in all 15,010 decoded method bodies is recorded and hashed. This does not claim closure over untyped or dynamic references.
- **Not reached as the gameplay primitive:** the statically closed active gameplay hit-test path precedes the separate screen projection, and all direct exact `_‑b20` class-QName references belong to screen/tooling classes, `_‑b20` itself, or its script initializer.
- **Unknown outside this ticket:** the exact gameplay hitbox-hurtbox primitive behind methods 1540 and 1537.

## Hash-pinned evidence identity

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Dispatch, factory, transform, predicate, and consumer closure |
| Sole semantic build string | `10.09.96325` | Build identity |
| Parent `BrawlhallaAir.swf` | `40df9af5308b9a17bf015feb38edec6d9bea57d1cd53078d298aa725acceb8b2` | Same installed build containing the pinned ABC |
| Parent `Game.swz` | `4fc9d70c1c3642b7d3e61c8bb0062bb57c46ea2169276ca1d33616a5843d4aff` | Parent source archive identity |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |

No ABC, SWF, SWZ, decrypted table, replay, or bulk game data is committed.

## Corrected active-power dispatch

### Gameplay collision happens before `_‑b20`

Active-power tick method 46 `_‑M5v._‑81I` calls method 1540 `_‑Y4C._‑06D` at instruction 973. Method 1540 obtains a defensive rectangle, applies target and repeat-hit policy, and calls geometry method 1537 `_‑Y4C._‑vk` at instruction 410. The gameplay `OnHit` call follows in method 1540.

This path does not construct or consume `_‑b20`.

### The later `_‑j5S` receiver is statically `_‑y4v`

At instructions 1295 through 1334, method 46 performs this separate flow:

```text
getlex _-Cn
getproperty _-ix
...
callpropvoid _-j5S
```

Static slot `_‑Cn._‑ix` is declared as `_‑y4v`. Its exact slot-QName ledger shows two direct writes in the pinned ABC: method 9235 instruction 1621 initializes it with an exactly constructed `_‑y4v`, and method 9236 instruction 427 initializes it to null during teardown. No class in the pinned ABC extends `_‑y4v`. This is exact-QName evidence, not proof that a computed runtime multiname could never name the slot. Two classes expose the public `_‑j5S` QName:

| Class | Method | Signature | Disposition |
| --- | ---: | --- | --- |
| 553 `_‑z1K` | 10239 | `(_‑M5v, PowerType, uint, int, int, int, int, Boolean, Boolean, uint, Point, Boolean) -> _‑b20` | Editor path, not selected by method 46 |
| 554 `_‑y4v` | 10280 | `(PowerType, uint, int, int, int, int, Boolean, Boolean, uint, Point, Boolean) -> void` | Selected screen/view path |

Method 10280 calls static `_‑b20._‑S4l` factory 13561 at instruction 38 and pushes the result into its `_‑O3w` vector at instruction 45. The declared slot type alone would not close virtual dispatch because `_‑y4v` is sealed but not final. The reached construction and zero-subclass result close the selected initialized receiver within the pinned ABC. The exact-QName write ledger supports, but does not universally close, receiver mutation. The previous issue 34 analyzer equated QNames but did not inspect the receiver instance, so it selected method 10239 incorrectly.

## `_‑b20` representation and primitive

Class 729 `_‑b20` is sealed, extends `Object`, and has no interfaces. Its relevant fields are:

| Field | Type | Proven role |
| --- | --- | --- |
| `_‑N4g` | Number | left |
| `_‑S18` | Number | top |
| `_‑K4u` | Number | width |
| `_‑wW` | Number | height |
| `_‑96N` | Number | transformed owner-anchor X |
| `_‑r19` | Number | transformed owner-anchor Y |
| `_‑24p` | Number | transformed local center X |
| `_‑q4L` | Number | transformed local center Y |
| `_‑n1k`, `_‑q2U` | int | original X/Y radius inputs |
| `_‑11T`, `_‑bW` | int | original X/Y center inputs |
| `mType` | uint | region type: active path passes 0 |
| `_‑Z2h` | `_‑u16` | transform owner |
| `_‑P4v` | Point | optional source point retained for anchor refresh |

Method 13538 `_‑W5j` stores width and height. Method 13539 `_‑q43` stores left and top. There is no rotation, path, vertex list, ellipse coefficient, capsule axis, or polygon edge in the closed class inventory.

### Exact point-containment boundary

Method 13557 `_‑lT(Number x, Number y) -> Boolean` evaluates:

```text
left <= x
&& x <= left + width
&& top <= y
&& y <= top + height
```

The exact bytecode polarity is:

- instruction 6 `ifnle` branches when `left <= x` is false, including unordered NaN comparisons, while `x == left` passes;
- instruction 15 `lessequals` admits `x == left + width`;
- instruction 21 `ifnle` branches when `top <= y` is false, including unordered NaN comparisons, while `y == top` passes; and
- instruction 29 `lessequals` admits `y == top + height`.

Therefore all four boundaries are included:

| Boundary | Included? |
| --- | --- |
| Left | Yes |
| Top | Yes |
| Right | Yes |
| Bottom | Yes |

`_‑b20` has no rectangle-rectangle or hitbox-hurtbox intersection method. Its exact geometric predicate is this point-containment test, used by screen/tooling consumers.

## Factory branch closure

Factory 13561 `_‑b20._‑S4l` has this signature:

```text
(_-u16 owner,
 PowerType power,
 uint type,
 Number centerX,
 Number centerY,
 Number radiusX,
 Number radiusY,
 uint phaseKey,
 Boolean mirrorX,
 Boolean styleFlag,
 Point sourcePoint,
 Boolean selected = false) -> _-b20
```

Method 46 reaches it through method 10280 with `type = 0`. The omitted twelfth factory argument uses `false`.

The factory copies `sourcePoint`, constructs `_‑b20`, and covers three placement branches.

### Target enum 13 offensive branch

When all are true:

- `power != null`;
- `power._‑84Z == 13`; and
- `type` is 0 or 2;

factory 13561 computes `phase = power._‑03K(phaseKey)`, then:

```text
centerX = centerX - power._-K5E[phase]
centerY = centerY - power._-Ie[phase]
```

The branch calls `_‑J4i(centerX, centerY)`, `_‑j4Z(radiusX, radiusY)`, and `_‑w2C(owner._‑W3r, copiedSourcePoint)`.

### Supplied-point branch

Otherwise, when `sourcePoint != null`, the copied point changes before owner-anchor conversion:

```text
point.x = mirrorX
  ? point.x + power._-K5E[power._-03K(phaseKey)]
  : point.x - power._-K5E[power._-03K(phaseKey)]
point.y = point.y - power._-Ie[power._-03K(phaseKey)]
```

The center and radius arguments still pass separately through `_‑J4i` and `_‑j4Z`.

### No-point branch

With no supplied point, center and radius use the same setters and `_‑w2C` derives the anchor from the source actor's numeric position.

These branches are exhaustive. Factory branch targets are validated against exact byte-PC boundaries.

## Exact scale and facing composition

Define the reached scale terms:

```text
scaleX = owner._-55C.scaleX
       * owner.levelLayer3D.scaleX
       / owner._-n32.scaleX

scaleY = owner._-55C.scaleY
       * owner.levelLayer3D.scaleY
       / owner._-n32.scaleY
```

The operation order is multiply by `_‑55C`, multiply by `levelLayer3D`, then divide by `_‑n32`. X and Y are evaluated independently.

### Center

Method 13540 `_‑J4i` first stores the incoming center arguments through `convert_i`. It then applies horizontal mirroring and scale:

```text
facingSign = mirrorX ? -1 : 1
transformedCenterX = centerX * facingSign * scaleX
transformedCenterY = centerY * scaleY
```

The `-1` is bytecode `pushbyte 255`, which AVM2 sign-extends as the signed byte value `-1`. Facing does not modify Y, radius, width, or height.

### Size

Method 13537 `_‑j4Z` first stores the incoming radius arguments through `convert_i`. It then computes:

```text
transformedRadiusX = radiusX * scaleX
transformedRadiusY = radiusY * scaleY
```

The constructor sets `_‑g2x = true` for region type 0 or 2. Therefore every active-power type-0 region uses:

```text
width  = 2 * transformedRadiusX
height = 2 * transformedRadiusY
```

There is no absolute value, clamp, minimum, maximum, or sign normalization.

## Owner anchor and complete bounds

Method 13535 `_‑w2C` selects a source point, applies full display-container coordinate conversion, and writes the final bounds.

For offensive type 0 or 2:

- PowerType `_‑84Z` values 3, 5, and 13 use the retained supplied point.
- Other values use the source actor position:

```text
actorX = actor._-V1I._-k17(actor._-oo)
actorY = actor._-V1I._-k17(actor._-bz)
```

The selected point then becomes:

```text
anchor = owner._-n32.globalToLocal(
  owner._-55C.localToGlobal(sourcePoint)
)
```

`localToGlobal` and `globalToLocal` include their full reached display matrices, including translations. `_‑b20` separately reads only the three X/Y scale pairs described above. No rotation value is applied directly to rectangle center or extents.

For ordinary PowerType `_‑84Z` values:

```text
left = anchor.x + transformedCenterX - width / 2
top  = anchor.y + transformedCenterY - height / 2
```

For `_‑84Z == 3`, `_‑w2C` intentionally omits the transformed center:

```text
left = anchor.x - width / 2
top  = anchor.y - height / 2
```

This is the complete reached local-center, facing, scale, owner-anchor, and final-corner composition for every type-0 `_‑b20` region emitted by method 46.

## Later transforms and mutation

Queued `_‑b20` regions retain the owner and optional source point. Methods 10144 `_‑z1K._‑x3i` and 10247 `_‑y4v._‑x3i` call `_‑w2C` again, recomputing anchor, left, and top from current owner/source state.

That refresh does **not** call `_‑J4i` or `_‑j4Z`, so it does not recompute transformed center or size after a later scale change. Separate tooling setters can mutate center and size explicitly.

The complete direct exact class-QName ledger contains 29 method bodies. Every such `_‑b20` reference belongs to:

- class 553 `_‑z1K`, methods 10140 through 10239;
- class 554 `_‑y4v`, methods 10247 through 10280;
- class 729 `_‑b20`, methods 13553 and 13561; or
- script initializer 729, method 13562.

No direct exact class-QName reference occurs in gameplay collision classes `_‑Wv`, `_‑Y4C`, `_‑M5v`, fighter `_‑V4R`, PowerType, HurtboxType, or the level-collision engine. This ledger does not rule out untyped or dynamic references.

No reached `_‑b20` factory, setter, anchor refresh, or predicate trace reads a SWF symbol name, timeline frame, animation class, bone, joint, socket, or skeletal matrix. The reached projection transforms are display-container scale plus `localToGlobal`/`globalToLocal`, and actor numeric position or a supplied Point. This is a claim about the reached transform traces, not every possible dynamic consumer.

## Exact numeric behavior

The active selected `CenterOffsetX`, `CenterOffsetY`, `AoERadiusX`, and `AoERadiusY` entries cross `convert_i` in method 46 before method 10280. They enter the factory as exact int32 values.

After that coercion:

1. factory additions and subtractions produce AVM2 Number values;
2. `_‑J4i` and `_‑j4Z` retain int32 copies for tooling labels;
3. transform multiplication/division uses AVM2 Number in bytecode order;
4. full extents multiply by 2 after the scale product/quotient;
5. final left/top subtract `width / 2` and `height / 2`; and
6. containment compares Number values without another integer coercion.

Consequences follow directly from the bytecode:

- fractional scale is preserved;
- negative scale can produce negative width or height;
- a zero width or height collapses that axis to one included boundary coordinate;
- a negative width or height admits no finite point under the exact predicate;
- division by zero and non-finite scale are not guarded or normalized; and
- a NaN bound or extent makes the ordered containment comparisons false.

No JavaScript host fallback is used by the evidence. These statements apply AVM2 numeric semantics to the exact instruction order.

## Closure ledgers

| Ledger | SHA-256 |
| --- | --- |
| Every exact `_‑Cn._‑ix` slot-QName reference (runtime multinames excluded) | `69523d61578fd029e45c93c895c694c5f8d784f8aabed3e8b1f9b24232d62208` |
| Every exact `_‑b20` class-QName reference | `80d17126f143e2fac52aa074c29d1d6a5479180fb3e4bdd24d9e74eb17beb735` |
| Every exact `_‑b20` method-trait QName reference | `b86745a942021601b1111b17892a74102a3fefaffea95e6e82e0182cbdd28dce` |
| Complete 84-trait `_‑b20` inventory | `9a821870d66ca7b19036ddfaa97fec72118af1c628cec9449a38c5d834a28f6a` |

The analyzer rejects changed class identities, method owners, receiver field type, direct exact-QName receiver writes, pinned-ABC receiver subclasses, signatures, instruction anchors, branch targets, direct class-QName consumers, method inventory, or ledger hashes.

## Reproduction

Keep the proprietary ABC under an ignored path or outside the repository. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:offensive-collision-transform -- \
  --abc /path/to/hash-pinned/main.abc
```

Useful bounded view:

```bash
bun run provenance:offensive-collision-transform -- \
  --abc /path/to/hash-pinned/main.abc \
  | jq '{status, identity, correctedDispatch, primitive, worldTransform, numericBehavior, closure: (.closure | del(.regionClassReferences, .regionMethodInventory)), blockers, surfacedRoutes}'
```

Expected status:

```text
proven-b20-axis-aligned-screen-region
```

The command exits nonzero on any identity or structural mismatch. It emits no ABC bytes, local path, source row, replay, player data, or proprietary payload.

## Acceptance and residual route

The ticket's `_‑b20` acceptance is met:

- **shape:** axis-aligned rectangle, with radius-to-full-extent conversion proved;
- **boundary inclusion:** all four boundaries included;
- **offset:** all factory branches and target enum 3/5/13 exceptions proved;
- **facing:** center X sign only, before scale;
- **scale:** exact three-container X/Y product/quotient in bytecode order;
- **later owner transform:** exact anchor refresh through `localToGlobal`/`globalToLocal`;
- **bone transform:** none in the reached projection factory, setter, anchor, predicate, or refresh traces; and
- **numeric behavior:** int32 input coercion plus exact Number operation order, with no normalization.

The correction exposes one new destination-relevant route:

- **[#77 Recover the gameplay offensive hitbox-hurtbox intersection primitive](https://github.com/NickTacke/brawlhalla-sim/issues/77).** Start from active-power method 46 instruction 973, method 1540 `_‑Y4C._‑06D`, target defensive rectangle population, and method 1537 `_‑Y4C._‑vk`. `_‑b20` cannot supply the simulator's combat primitive because it is a later screen/tooling projection.

Issue 34 should consume this correction when its broader acceptance is revisited: the reached method-46 `_‑j5S` implementation is method 10280, not method 10239.

## One-line map gist

`_‑b20` is a fully inclusive axis-aligned screen rectangle with exact facing, scale, point-anchor, and refresh transforms, while gameplay hit testing already ran through methods 1540 and 1537 and now requires a separate primitive-recovery ticket.
