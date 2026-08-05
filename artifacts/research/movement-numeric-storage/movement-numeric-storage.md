# Movement numeric storage in Brawlhalla 10.09.96325

Issue: [Recover encoded movement numeric storage](https://github.com/NickTacke/brawlhalla-sim/issues/41)

## Verdict

**The movement values are not encoded in the fighter's `uint` slots.** Fighter slots such as pending impulse `_-l16` and vertical velocity `_-30` are unsigned handles into a typed numeric store held in `_-V1I`. Store helper `_-k17` reads `(uint handle) -> Number`; `_-G1Q` writes `(uint handle, Number) -> Number`. The stored gameplay quantities are ordinary AVM2 `Number` values: IEEE-754 binary64 with scale 1, no quantization, no integer rounding, and no value wraparound.

The reference runtime has direct, mapped, and rotating-mapped store implementations. Mapping and rotation change only the physical storage index. They do not transform the Number payload. The rotating implementation applies 32-bit integer wrap and modulo 128 to its physical index, not to movement values.

The canonical simulator state should therefore expose named binary64 values such as `pendingVerticalImpulse` and `verticalVelocity`. It should not expose or reproduce the reference runtime's `uint` handles as the semantic values. A reference-runtime adapter that needs rollback/history may preserve handle mapping separately, but it is storage infrastructure rather than gameplay quantity encoding.

Confidence is **high** for the pinned build. The analyzer closes all same-local-name definitions and QName-qualified callsites, verifies all three fighter-selected implementations, and anchors the jump-to-movement dataflow.

## Evidence grades

- **Proven:** exact typed trait, method signature, instruction-level dataflow, constructor, or complete QName reference closure in the hash-pinned ABC.
- **Derived vector:** a known-answer result calculated directly from the proven opcode sequence and AVM2 coercion boundary.
- **Bounded closure:** every matching definition and exact-QName reference in this ABC was enumerated and hashed; no claim is made for another build.
- **Unknown:** evidence does not settle payload-level NaN bit identity or invalid-handle failure behavior.

Repository names and prior reports were locators. The verdict derives from the pinned executable. No live-client capture, heap snapshot, replay payload, decrypted asset, or bulk bytecode output was used.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Typed slots, helper implementations, fighter construction, movement dataflow |
| Sole semantic build string | `10.09.96325` | Build identity |
| ABC size and decode | 3,934,088 bytes; 15,010 method bodies; all branch targets valid | Complete static-analysis boundary |
| Decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |
| Interface `_-k17` callsite ledger | `7bc3bd3790e02a3adeb2d377511f12d60a2e8c89f6e82a78e3edd50344c6721e` | 1,450 calls in 259 methods |
| Interface `_-G1Q` callsite ledger | `6f173dbe8100620c16872c55399562d7d5b406ab2cc49b796cd4e6e4e5024d18` | 323 calls in 70 methods |
| All `_-k17` QName groups | `a83a7863438d5ab704a3d732da411fbe0490b9c3e307e57fc8951ee57a4fea77` | Same-name collision closure |
| All `_-G1Q` QName groups | `ea48ad97c9db04ba386affba2903306d50553382cb415278048f085f3cbace98` | Same-name collision closure |
| All named `_-k17` instruction references | `c33a63e7ed82dac39ef56f89a7bd065a9fc97e658e3ed263571e74e33c61ce1f` | Proves QName grouping omits no named reference |
| All named `_-G1Q` instruction references | `c5fde840096ffe0e1d9a190349ba01cbf09d79288706f581736c4c84fc77f416` | Proves QName grouping omits no named reference |
| All `_-k17` definitions | `4abf394f33f073f2b85a866ab40968076f65b12048f4105624bb040a2df2da24` | Eight definition identities and signatures |
| All `_-G1Q` definitions | `b34fe14bfbc50cf682e4bf649cf811befe8fb3da0e6fb5302e13521b01409ca3` | Interface plus three implementation identities and signatures |

The analyzer rejects any different ABC, build string, branch target, anchor, helper definition, signature, QName group, callsite PC, opcode, owner, argument count, or ordering.

## Typed fighter state

Class 147 `_-V4R` declares:

| Trait | Declared type | Proven role |
| --- | --- | --- |
| `_-V1I` | interface `_-z5S` | Numeric store |
| `_-l16` | `uint` | Handle for pending vertical impulse |
| `_-30` | `uint` | Handle for vertical velocity |

The type relationship is decisive. If `_-l16` and `_-30` held encoded scalars, their consumers would numerically coerce those slot values. Instead, consumers load `_-V1I`, pass the `uint` slot as the first argument to `_-k17`, and use the returned `Number`. Writes pass the same handle plus a `Number` to `_-G1Q`.

Store interface class 150 `_-z5S` declares bodyless methods:

```text
_-k17(uint handle) -> Number
_-G1Q(uint handle, Number value) -> Number
```

The value crosses a declared `Number` parameter, `Vector.<Number>` storage, explicit `convert_d` read, and declared `Number` return. No multiply, divide, floor, ceil, round, integer conversion, bit operation, mask, or sentinel test touches the value in any implementation.

## Exact read and write equations

Let `U(x) = ToUint32(x)` and `I(x) = ToInt32(x)` at the recovered AVM2 boundaries. Let `N(x)` be AVM2 conversion to binary64 Number. Let `h` be the fighter's logical handle, `M` the mapped-index vector, `V` the `Vector.<Number>` payload storage, and `o` the rotating offset.

### Direct store: class 151 `_-N3P`

Constructor 3103 allocates `Vector.<Number>(logicalCapacity)`. Methods 3105 and 3106 implement:

```text
readDirect(h) = N(V[U(h)])

writeDirect(h, x):
  V[U(h)] = N(x)
  return N(V[U(h)])
```

### Mapped store: class 152 `_-X3G`

Constructor 3108 allocates `Vector.<uint>(logicalCapacity)` and `Vector.<Number>(128)`, then establishes a logical-to-physical permutation. Methods 3110 and 3111 implement:

```text
physicalMapped(h) = U(M[U(h)])
readMapped(h) = N(V[physicalMapped(h)])

writeMapped(h, x):
  V[physicalMapped(h)] = N(x)
  return N(V[physicalMapped(h)])
```

### Rotating mapped store: class 153 `_-b27`

This class inherits the mapped store and changes only physical-index calculation. Methods 3115 and 3116 perform `add_i`, `convert_u`, and remainder by 128 before touching the same `Vector.<Number>`:

```text
physicalRotating(h, o) = U(I(M[U(h)]) + I(o)) % 128
readRotating(h, o) = N(V[physicalRotating(h, o)])

writeRotating(h, o, x):
  V[physicalRotating(h, o)] = N(x)
  return N(V[physicalRotating(h, o)])
```

The `add_i` result wraps to 32 bits. `convert_u` selects its unsigned representative, and `% 128` bounds the physical index. This wrap is storage-history addressing only. Payload `x` bypasses that arithmetic.

## Signedness, scale, rounding, wraparound, and special values

| Property | Proven behavior |
| --- | --- |
| Semantic signedness | Not integer signedness. Values are binary64 Numbers and can be negative, positive, or either zero. |
| Scale | Exactly 1. There is no fixed-point multiplier or divisor in the helpers. |
| Rounding | None in the helpers. The Number parameter is stored directly in `Vector.<Number>`. |
| Value wraparound | None. Integer wrap applies only to handles and the rotating physical index. |
| Handle coercion | Interface parameter is `uint`; AVM2 `ToUint32` applies at the call boundary. Fighter slots already satisfy that boundary. |
| NaN | Remains semantically NaN through a write/read. Payload-bit preservation is not claimed. |
| Infinities | Remain `-Infinity` or `+Infinity`. |
| Signed zero | `-0` remains distinguishable from `+0` as a Number. |
| Out-of-range handles | Not needed on the proven fighter path: constructors allocate 32 logical handles and mapped stores bind them to 128 physical cells. Exact invalid-access failure behavior is not claimed. |

Arithmetic that produces these values still follows the separate AVM2 numeric contract. This finding removes a presumed codec; it does not relax coercion or operation-order requirements in [the numeric-semantics resolution](https://github.com/NickTacke/brawlhalla-sim/blob/f6a92e516053245727711936b187438212244795/artifacts/research/numeric-semantics/avm2-numeric-semantics.md).

## Known-answer vectors

The analyzer executes small direct-store, coercion, and rotating-index models from the proven equations, compares each actual result against a separately hardcoded expected value, and fails on any mismatch.

### Number payload roundtrips

| Written Number | Read Number |
| ---: | ---: |
| `-Infinity` | `-Infinity` |
| `-170` | `-170` |
| `-57` | `-57` |
| `-0` | `-0` |
| `+0` | `+0` |
| `1.5` | `1.5` |
| `70` | `70` |
| `85` | `85` |
| `+Infinity` | `+Infinity` |
| `NaN` | `NaN` |

The signed-zero check is semantic (`Object.is(result, -0)` in a simulator test), not string equality. The NaN check is semantic (`Number.isNaN`), not payload-bit equality.

### Unsigned handle boundaries

| Input to a `uint` handle boundary | `ToUint32` result |
| ---: | ---: |
| `-1` | `4294967295` |
| `0` | `0` |
| `4294967295` | `4294967295` |
| `4294967296` | `0` |
| `NaN` | `0` |
| `+Infinity` | `0` |

These are handle vectors, not movement-value vectors.

### Rotating physical-index boundaries

| Mapped index | Offset | Physical index |
| ---: | ---: | ---: |
| `127` | `1` | `0` |
| `0` | `4294967295` (`int -1`) | `127` |
| `4294967295` (`int -1`) | `1` | `0` |

## Methods 2954 and 2887

### Jump application: method 2954 `_-61V`

PCs 1021-1052 load the numeric store and pending-impulse handle, call `_-k17`, convert the result to Number, subtract the selected jump impulse, convert the result to Number, and pass that Number with the same handle to `_-G1Q`:

```text
pendingVerticalImpulse' = N(read(_-l16) - selectedJumpImpulse)
write(_-l16, pendingVerticalImpulse')
```

The already-proven ordinary grounded path selects `57`; its semantic result from zero is `-57`. The dash path selects `170`; its semantic result from zero is `-170`. Those negative values do not pass through `uint`; only `_-l16`, the lookup handle, does.

### Movement update: method 2887 `_-D38`

PCs 4295-4328 independently read pending impulse and vertical velocity through their handles, convert both returned values to Number, and add them in bytecode order:

```text
candidateVerticalVelocity = N(read(_-l16) + read(_-30))
```

The following control flow applies movement clamps before writing the selected Number to the `_-30` handle. The exact store write at PC 4419 is one proven result path; other branches write clamp values through the same helper. The helper itself does not encode or rescale any branch's Number.

The pre-existing movement proof separately establishes later gravity and motion-delta calculations. Internal velocity units are therefore the Number values returned here; multiplication by time scale `0.384` occurs in movement arithmetic, not storage conversion.

## Fighter store selection

Fighter constructor method 2790 and reset/reinitialization method 3017 each select one of the three concrete stores and assign it to `_-V1I`. Every branch constructs its store with 32 logical handles:

- `_-N3P`: direct Number vector.
- `_-X3G`: mapped 32-handle view over 128 Number cells.
- `_-b27`: rotating mapped view over the same 128-cell design.

Because all branches satisfy the same typed interface and payload equations, runtime store selection does not change gameplay-value signedness, scale, rounding, or special values.

## Complete definition and callsite closure

The local name `_-k17` is not globally unique. The ABC contains eight definitions across three exact QName groups. Only interface method 3101 has signature `(uint) -> Number`; methods 3106, 3111, and 3116 are its three relevant concrete implementations. Other same-name definitions have different owners or signatures and are not movement-store codecs.

The local name `_-G1Q` has four definitions: interface method 3100 and concrete methods 3105, 3110, and 3115. All have signature `(uint, Number) -> Number`.

The analyzer scans instance traits, static class traits, and script traits for definitions, and rejects any same-name trait that is not a method rather than silently omitting it. It separately scans every decoded instruction whose first multiname has either helper's local name. The pinned ABC has zero non-QName helper references, and the analyzer asserts that the total named-reference count equals the sum of every exact-QName group before accepting the closure:

| Local name and QName group | Calls | Methods | Disposition |
| --- | ---: | ---: | --- |
| `_-k17`, interface QName `8:24347` | 1,450 | 259 | Numeric-store reads, including methods 2954 and 2887 |
| `_-k17`, public QName `36:24347` | 96 | 19 | Same-name public calls; complete ledger retained to prevent accidental conflation |
| `_-k17`, other interface QName `9:24347` | 87 | 10 | Unrelated zero-argument interface family |
| `_-G1Q`, interface QName `8:6639` | 323 | 70 | Numeric-store writes, including methods 2954 and 2887 |
| `_-G1Q`, public QName `36:6639` | 0 | 0 | Concrete definitions exist; calls dispatch through the interface QName |

Run with `--explore` to emit every method ID, owner, byte PC, opcode, and argument count plus all definitions. The default report emits counts and fixed ledger hashes to avoid a bulk disassembly artifact.

## Canonical simulator representation

For forward replay-driven simulation, use named Number state:

```ts
type FighterMovementState = {
  pendingVerticalImpulse: number
  verticalVelocity: number
}
```

Each `number` is an AVM2 Number value. Preserve binary64 operation order, NaN, infinities, and signed zero. Apply explicit AVM2 integer or unsigned coercion only where the recovered bytecode requires it. Do not cast these movement values through `uint`, invent a fixed-point scale, or carry the reference store handles into the public simulation model.

If an interpreted-reference adapter or rollback subsystem reproduces the reference storage infrastructure, model `{ logicalHandle, mapping, rotatingOffset, numberCells }` behind that adapter. Its current-value projection must still yield the named Number state above.

## Reproducible validation

Keep the proprietary ABC outside version control. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:movement-numeric-storage \
  --abc /path/to/hash-pinned/main.abc
```

Useful bounded view:

```bash
bun run provenance:movement-numeric-storage \
  --abc /path/to/hash-pinned/main.abc \
  | jq '.status, .identity, .verdict, .equations, .referenceClosure, .knownAnswerVectors'
```

Successful output reports `proven-for-pinned-abc`, build `10.09.96325`, the expected ABC digest, 15,010 decoded method bodies, valid branch targets, eight read-helper definitions, four write-helper definitions, zero non-QName helper references, 1,450 interface reads, 323 interface writes, the fixed ledgers above, and actual-equals-expected known-answer vectors.

For a complete privacy-safe reference listing:

```bash
bun tools/avm2-provenance/movement_numeric_storage_provenance.ts \
  --abc /path/to/hash-pinned/main.abc \
  --explore \
  | jq '.referenceClosure | {allReadDefinitions, allWriteDefinitions, interfaceReadReferences, interfaceWriteReferences}'
```

The analyzer emits no ABC bytes, source payload, replay bytes, fixture names, player data, account data, or local input path. Operating-system errors can still reveal a caller-supplied path.

## Confidence and residual gaps

### High-confidence conclusions

- `_-l16` and `_-30` are `uint` handles, not encoded signed or fixed-point quantities.
- `_-k17` returns Number and `_-G1Q` accepts/stores Number.
- Direct, mapped, and rotating implementations preserve the Number payload.
- Value scale is 1; helper rounding and value wraparound are absent.
- Negative values, fractions, infinities, NaN, and signed zero remain valid Number-domain values.
- Only logical/physical indexing uses unsigned coercion and, in the rotating implementation, 32-bit wrap plus modulo 128.
- Canonical simulator gameplay state is named binary64 values, not handles or encoded integers.

### Residual uncertainty

1. **NaN payload bits:** semantic NaN preservation is proven; payload-bit preservation across Player/runtime storage is not required or claimed. Target native details remain owned by [Specify AVM2 and AIR deterministic native semantics](https://github.com/NickTacke/brawlhalla-sim/issues/37).
2. **Invalid handles:** exact out-of-range exception behavior is not proved. The fighter path constructs 32 valid logical handles, so malformed internal handles are outside this chain.
3. **Store-selection policy:** methods 2790 and 3017 can choose all three implementations; the higher-level reason for each mode is not needed to establish payload semantics.
4. **Other same-name helpers:** unrelated `_-k17` definitions are closed by signature and QName ledger but are not semantically named here.
5. **Other builds:** out of scope. Closure applies only to ABC `9fe9...ba2d`.

## Ticket and fog impact

This resolves the movement-storage representation gap isolated by [Inventory gameplay-affecting numeric semantics](https://github.com/NickTacke/brawlhalla-sim/issues/8). The simulator state inventory can classify pending impulse and vertical velocity as binary64 Number values and treat their reference `uint` slots as storage handles.

No new ticket is required. Native Number edge fidelity remains with the existing native-semantics ticket. Movement-state transitions, collision, action-state behavior, and full executable reachability remain in the map's existing fog and are not changed by this storage result.
