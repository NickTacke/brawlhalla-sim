# Planning resolution: AVM2 gameplay-affecting numeric semantics

## Resolution

The simulator must model AVM2 as three numeric coercion domains: IEEE-754 binary64 `Number`, signed 32-bit `int`, and unsigned 32-bit `uint`. It must coerce at every recovered opcode, typed store, argument, and return boundary; wrap `_i` arithmetic modulo `2^32`; preserve bytecode operation order; and retain NaN, infinity, signed-zero, remainder, comparison, and rounding behavior. TypeScript annotations provide no runtime coercion.

The pinned Brawlhalla `10.09.96325` ABC proves the specifically anchored coercion, integer and binary64 arithmetic, comparison, bitwise, and `floor` constructs occur in authoritative tick, input, jump, and movement bodies. Other semantics retain the narrower confidence labels below. This is a planning contract only. It includes no simulator implementation or proprietary bytecode.

## Confidence labels

- **Proven**: normative VM behavior plus evidence sufficient for the specific reachability or typed-boundary claim. Mere membership in an authoritative gameplay-path body proves occurrence there, not execution or downstream effect.
- **Required-by-spec-but-reachability-open**: normative behavior for a construct present in the ABC or producible by proven constructs, without proven downstream transition/result impact.
- **Unknown**: target implementation, helper encoding, dispatch, runtime configuration, or dataflow remains unresolved.

## Evidence identity

| Item | Evidence |
|---|---|
| Build | `10.09.96325` |
| ABC | Local, user-supplied `main.abc`; never committed |
| SHA-256 | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` |
| Size/decode | 3,934,088 bytes; ABC 46.16; 15,010 bodies; 1,116,372 instructions; every body consumed and branch target validated |
| Verifiers | [`movement_provenance.ts`](../../../tools/avm2-provenance/movement_provenance.ts) (`proven`); [`tick_phase_provenance.ts`](https://github.com/NickTacke/brawlhalla-sim/blob/54a0d78b8ec651ac7611a7a399317f595ad7583d/tools/avm2-provenance/tick_phase_provenance.ts) (`structural-anchors-verified`) |

## 1. Normative AVM2 semantics

### Types and coercion

- `Number` is binary64, including NaN, infinities, `+0`, and `-0`.
- `ToInt32` truncates a finite value toward zero, reduces modulo `2^32`, and selects the signed representative. NaN, either zero, and either infinity become `+0`.
- `ToUint32` applies the same truncation/modulo rule and returns `0..2^32-1`.
- Explicit conversion opcodes and typed parameters, returns, properties/slots, and collection elements are repeated runtime boundaries. AVM2 locals have no inherent local type table.

Sources: [ECMA-262 Edition 3 §§8.5, 9.5, 9.6](https://www.ecma-international.org/wp-content/uploads/ECMA-262_3rd_edition_december_1999.pdf), [Adobe AVM2 Overview](https://jmendeth.com/snapshot/aa45ee3f904d62505f09ef2969d1885e8844859f/media/2014-05-17-reverse-engineering-flash/avm2overview.pdf), and [AVM2 Overview errata](https://wiki.mozilla.org/Tamarin::AVM2_Overview_Errata).

### Arithmetic and order

- `_i` operands are converted to signed 32-bit and results retain the low 32 bits. Overflow wraps. `multiply_i` requires integer low-bit multiplication; binary64 multiplication followed by delayed coercion can lose low bits.
- Generic numeric arithmetic uses binary64 after ES3 conversion. Generic `add` first converts to primitives and concatenates when either primitive is a string.
- `%` is truncating remainder, not mathematical modulo. Its sign follows the dividend, including `-0`; zero divisor, NaN, or infinite dividend yields NaN, while a finite dividend with an infinite divisor is returned unchanged.
- Operation order is semantic. Do not reassociate, fuse multiply-add, batch intermediates, defer coercions, or normalize remainder. [Adobe Tamarin interpreter](https://github.com/adobe/avmplus/blob/c414dd9af4a352d522fff200ee6601d713bc17c7/core/Interpreter.cpp)

### NaN, signed zero, comparisons, and rounding

- Numeric equality makes NaN unequal to everything and treats both zeros as equal. Ordered comparison with NaN is unordered.
- Negated relational branches include unordered: `ifnlt` is not host `>=`. Mixed/object equality and relational operations require ES3 algorithms, not modern host `==`.
- Signed zero remains observable through division/reciprocal, remainder, rounding, `Math.min`, and `Math.max`. `Object.is(x, -0)` is diagnostic only.
- `floor` rounds toward negative infinity; `ceil` toward positive infinity. `round` chooses nearest and breaks ties toward positive infinity, so `round(-1.5) = -1` and `-0.5` yields `-0`. `floor(x + 0.5)` is not equivalent.
- Host `abs`, `floor`, `ceil`, `round`, `min`, and `max` have compatible Number special cases. Native `sqrt`, `pow`, transcendental functions, numeric text conversion, and RNG cannot be declared target-player bit-identical without oracle evidence. [ECMA-262 Edition 3 §§11.5, 11.8, 11.9, 15.8.2](https://www.ecma-international.org/wp-content/uploads/ECMA-262_3rd_edition_december_1999.pdf) [Tamarin Math](https://github.com/adobe/avmplus/blob/c414dd9af4a352d522fff200ee6601d713bc17c7/core/MathClass.cpp)

## 2. Pinned-build reachability, kept separate from VM rules

### Proven

1. Six authoritative path bodies (`3217, 2894, 2887, 2954, 6125, 6135`) contain `convert_i/u/d`, `_i` arithmetic, ordinary arithmetic, bitwise operations, equality, and positive/negated relational forms. Counts are body inventories, not execution proof for every instruction.
2. Jump method 2954 PCs 83/85/86/88 performs add `160`, `add_i`, `convert_u`, then `greaterthan`. Tick method 3217 PCs 1902/1903 similarly performs `add_i`, then `convert_u`. Timestamp rollover can change the jump-window decision.
3. Movement method 2887 applies pending impulse with converted double operands and `add` at PC 4328. Gravity executes `multiply`, `add`, `convert_d` at PCs 5384/5385/5386. Motion delta multiplies velocity by time scale at PC 6728. These sequences forbid algebraic reordering.
4. Fighter slots `_‑l16` (pending impulse), `_‑30` (vertical velocity), `_‑ZQ` (timestamp), and `_‑U5H` (grounded state) are `uint`. Input timestamp/mask are `uint`; gravity/time scale are `Number`. Relevant methods also have `uint` parameters/returns.
5. Method 6125 has verified `bitxor`/`bitand` rising-edge construction and a nonzero gate at PCs 3422..3429 before the jump call at PC 3440.
6. Negated relation forms occur in authoritative path bodies, so unordered branch polarity must be preserved even though an actual NaN input is not proven.
7. Tick method 3217 divides at PC 1861 and calls `Math.floor` at PC 1862; it calls `Math.sqrt` at PC 3556 after ordered vector arithmetic. Movement calls `abs`, `min`, and `max`; fighter update calls `floor`.

### Required-by-spec-but-reachability-open

- Actual NaN and `-0` values are not proven, but proven arithmetic/branches require correct handling if produced.
- Three `modulo` instructions occur in tick body 3217, but no result-to-transition dataflow was proved.
- Generic `add` and equality occur in path bodies; operand types are not resolved at every candidate.
- `increment_i`, `decrement_i`, `negate_i`, generic `decrement`, and shifts occur globally but not in the six selected bodies.
- Global calls include `ceil` (105), `round` (141), `pow` (28), trigonometric/logarithmic functions, and `random` (7), without authoritative path proof.
- Numeric parsing/test property candidates exist globally, but receiver identity and gameplay dataflow are open.
- Strict-equality opcodes and float/float4 are absent from all decoded pinned bodies. No pinned implementation site is needed unless another input generates one.

### Unknown

- `_‑k17`/`_‑G1Q` helper encoding for conceptual signed/fixed-point values stored in `uint` movement fields.
- Flash Player version, CPU, interpreter/JIT mode, extended temporary precision, and last-bit native Math behavior.
- RNG algorithm, seed, and state transitions.
- Broader `_‑D38` dispatch, `OnHit`, timestamp/result dataflow, and downstream effects of tick modulo/vector magnitude.

## 3. TypeScript implementation contract

For arbitrary AVM2 values, `avm2ToPrimitive`/`avm2ToNumber` must implement ES3 conversion. Native `Number(object)` and host `==` are not general substitutes.

| AVM2 operation/boundary | Confidence | Exact TypeScript primitive or adapter |
|---|---|---|
| `Number`, `convert_d` | **Proven** | `avm2ToNumber(x): number`; preserve NaN, infinity, signed zero |
| `int`, `convert_i`, typed int boundary | **Proven** | `avm2ToNumber(x) \| 0`, at every store/arg/return boundary |
| `uint`, `convert_u`, typed uint boundary | **Proven** | `avm2ToNumber(x) >>> 0`, at every store/arg/return boundary |
| `add_i`, `subtract_i` | **Proven** | `(toInt32(a) + toInt32(b)) \| 0`; `(toInt32(a) - toInt32(b)) \| 0` |
| `multiply_i` | **Proven** | `Math.imul(toInt32(a), toInt32(b))`; never delayed `a*b` coercion |
| `negate_i`, integer increment/decrement | **Required-by-spec-but-reachability-open** | `(-toInt32(a)) \| 0`; `(toInt32(a) ± 1) \| 0` |
| Generic subtract/multiply/divide | **Proven** | Respectively `toNumber(a)-toNumber(b)`, `toNumber(a)*toNumber(b)`, `toNumber(a)/toNumber(b)`, in bytecode order |
| Generic increment/negate | **Proven** | `toNumber(a) + 1`; `-toNumber(a)` |
| Generic decrement | **Required-by-spec-but-reachability-open** | `toNumber(a) - 1` |
| Generic `add` | **Required-by-spec-but-reachability-open** | `avm2Add` implementing ES3 primitive conversion, string branch, then concatenate or numeric `+` |
| `modulo` | **Required-by-spec-but-reachability-open** | `toNumber(a) % toNumber(b)`; never `((a%b)+b)%b` |
| `bitand/bitor/bitxor/bitnot` | **Proven** | JS `&`, `\|`, `^`, `~` after AVM2 int conversion; apply subsequent uint boundary separately |
| `lshift/rshift/urshift` | **Required-by-spec-but-reachability-open** | `toInt32(a) << (toUint32(n)&31)`, `>>`, or `>>>` respectively |
| Abstract equality | **Required-by-spec-but-reachability-open** | `avm2AbstractEquals`; JS `===` only when both operands are proven numeric |
| Abstract relational comparison | **Proven** | Adapter returning `true | false | undefined`; `undefined` is unordered |
| `ifnlt/ifnle/ifngt/ifnge` | **Proven** | Branch unless the underlying relation is exactly `true`; never lower to the opposite host operator |
| NaN / negative-zero diagnostics | **Required-by-spec-but-reachability-open** | `Number.isNaN(x)`; `Object.is(x,-0)` or `1/x===-Infinity` only for tests/diagnostics |
| `floor`, `ceil`, `round` | floor **Proven**; others **Required-by-spec-but-reachability-open** | Converted arguments to native `Math.floor/ceil/round`; no truncation or bit cast |
| `abs`, `min`, `max` | **Proven** | AVM2-convert arguments in order, then native `Math.abs/min/max` |
| `sqrt` | **Unknown** for low-bit parity | Isolated `avm2Math.sqrt`; host `Math.sqrt` only under documented compatibility policy |
| `pow`, trig, log, exp, tan | **Unknown** | Isolated adapter backed by approved target oracle/port if reachable |
| `random` | **Unknown** | Explicit recovered deterministic RNG; never host `Math.random` |
| Numeric text parsing | **Unknown** | ES3/target-qualified parser, not assumed modern `Number/parseInt/parseFloat` |

## 4. Implementation validation plan

No tests are added by this planning artifact. Later implementation must test:

- coercions around `2^31`, `2^32`, fractions, NaN, infinities, and both zeros;
- integer overflow, `Math.imul` low bits, and method 2954 timestamp rollover;
- repeated typed stores, arguments, and returns;
- ordered gravity/impulse calculations that fail after reassociation;
- remainder sign, divide-by-zero, NaN comparison, and every negated branch polarity;
- rounding half-ties and signed zero using `Object.is`;
- target-player oracle vectors before approving native Math, RNG, or numeric-text parity.

## 5. Open planning gaps and owners

This inventory does not claim closure over the following gaps:

1. [Recover encoded movement numeric storage](https://github.com/NickTacke/brawlhalla-sim/issues/41) owns the `_‑k17`/`_‑G1Q` representation, including signedness, scale, rounding, wraparound, and special-value behavior.
2. [Specify AVM2 and AIR deterministic native semantics](https://github.com/NickTacke/brawlhalla-sim/issues/37) owns the target runtime profile, native Math and numeric-text parity, and exhaustive reachable typed-boundary contract.
3. [Recover deterministic randomness and draw ordering](https://github.com/NickTacke/brawlhalla-sim/issues/6) owns the gameplay RNG algorithm, state, streams, and draw order.
4. [Prove match initialization and tick executable closure](https://github.com/NickTacke/brawlhalla-sim/issues/32) owns unresolved dispatch and complete gameplay reachability. Its closure determines which present-but-unproven numeric operations graduate into the native-semantics profile.

## 6. Reproducible commands and anchors

```sh
ABC=/absolute/path/to/user-supplied/main.abc
shasum -a 256 "$ABC"
wc -c "$ABC"
bun tools/avm2-provenance/movement_provenance.ts \
  --abc "$ABC" \
  --target grounded-jump-y
```

Expected: pinned hash above, 3,934,088 bytes, and movement status `proven`. The linked tick-phase verifier at commit `54a0d78b8ec651ac7611a7a399317f595ad7583d` separately produced status `structural-anchors-verified`. Load-bearing anchors: method 3217 PCs 1861/1862 and 1902/1903; method 2954 PCs 83/85/86/88; method 2887 PCs 5384/5385/5386; method 6125 PCs 3422..3440. No bytecode or bulk extraction is reproduced here.

## Primary sources

- [Adobe AVM2 Overview](https://jmendeth.com/snapshot/aa45ee3f904d62505f09ef2969d1885e8844859f/media/2014-05-17-reverse-engineering-flash/avm2overview.pdf): Adobe-authored VM semantics.
- [ECMA-262 Edition 3](https://www.ecma-international.org/wp-content/uploads/ECMA-262_3rd_edition_december_1999.pdf): normative Number, conversion, operator, comparison, and Math rules.
- [Adobe Tamarin/avmplus archival source](https://github.com/adobe/avmplus/tree/c414dd9af4a352d522fff200ee6601d713bc17c7): primary VM implementation evidence.
- [ECMAScript 2025 Number semantics](https://tc39.es/ecma262/2025/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-number-type) and [Math semantics](https://tc39.es/ecma262/2025/multipage/numbers-and-dates.html#sec-math-object): exact host primitive contracts and implementation-approximated classifications.
