# AIR numeric parse edge cases for patch data

Issue: [Prove AIR numeric parse edge cases for patch data](https://github.com/NickTacke/brawlhalla-sim/issues/58)

## Verdict

**Target behavior is not proved, and issue 58 acceptance remains unmet.** The issue 35 static report identifies a patch-loader path narrower than generic ActionScript numeric conversion:

- method 6079 bypasses parsing for empty Number text, returning binary64 `+0`; its reported nonempty route goes through global `parseFloat`;
- methods 6071, 6074, and 6075 reportedly send nonempty int and uint text through the Haxe `Std.parseInt` wrapper, where native `NaN` becomes `null` before a typed return boundary;
- `parseFloat` and `parseInt` accept numeric prefixes, so they are not equivalent to strict whole-string `Number(text)` conversion.

Only method 6079's empty default is enforced by the predecessor analyzer. Its report does not close every downstream int/uint coercion edge. ECMA-262 Edition 3, Adobe API documentation, and hash-pinned Adobe AVMPlus source therefore define a candidate matrix, not complete reached-path proof or target output for the selected AIR `33.1.1.633` macOS x86_64 runtime. No target execution record, compiled synthetic fixture, or result ledger was available in this checkout.

Confidence is **high** for method 6079's anchored empty default and for the normative and pinned-AVMPlus source reading, **medium** for unanchored common-route details inherited from the predecessor report, and **none** for AIR outputs that were not executed. No game binary, AIR binary, patch payload, replay, or proprietary data is committed.

## Map gist

Patch numeric fields use empty-only defaults followed by prefix parsers, not strict Number conversion; exact AIR `33.1.1.633` goldens are still required for target-variable whitespace, malformed-exponent, rounding, and underflow behavior.

## Evidence grades

- **P, proven static:** the predecessor analyzer enforces the exact claim against the hash-pinned build `10.09.96325` ABC.
- **S, reported static:** the predecessor report gives a bytecode reading, but its committed analyzer does not enforce the relevant method identity and dataflow.
- **N, normative:** ECMA-262 Edition 3 or Adobe's ActionScript API specifies the operation.
- **C, corroborating implementation:** Adobe AVMPlus source at a fixed commit implements the operation, but no source-to-AIR-binary equivalence is established.
- **K, target known answer required:** exact AIR output is required by `avm2-air-10.09-v1` and is not supplied by normative or corroborating evidence.
- **U, unresolved reachability:** no complete patch-loader callsite closure proves that the common helper island contains every category-specific numeric parse path.

## Hash-pinned evidence identity

All digests are SHA-256 unless identified as Git blob IDs.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Common loader helper routing inherited from issue 35 evidence |
| Reference game | `10.09.96325` | Patch behavior scope |
| Patch-loader evidence commit | [`bdc8b2c4caecc4b3ebae84ea845a6c0387a4500a`](https://github.com/NickTacke/brawlhalla-sim/commit/bdc8b2c4caecc4b3ebae84ea845a6c0387a4500a) | Reported methods 6071, 6074, 6075, 6079, 947, and 948; analyzer anchors only method 6079's empty default among these routes |
| [Patch-loader report](https://github.com/NickTacke/brawlhalla-sim/blob/bdc8b2c4caecc4b3ebae84ea845a6c0387a4500a/artifacts/research/patch-loader-defaults/patch-loader-defaults.md) | `c3995efed9f2927862bc8a675da0c72f1e53294a2ff3a39513b140ce4e0dee77` | Bounded common-helper claims |
| [Patch-loader analyzer](https://github.com/NickTacke/brawlhalla-sim/blob/bdc8b2c4caecc4b3ebae84ea845a6c0387a4500a/tools/avm2-provenance/patch_loader_defaults_provenance.ts) | `4b7a0c76a292bc046c255db5726b7c37c7160b23386f01b042d583bc559944bf` | Hash and method-anchor reproduction |
| Native-semantics profile commit | [`ca39e257846adb6a5081ca280c23b148feecee9a`](https://github.com/NickTacke/brawlhalla-sim/commit/ca39e257846adb6a5081ca280c23b148feecee9a) | Target-golden policy and typed-value encoding |
| [Native-semantics report](https://github.com/NickTacke/brawlhalla-sim/blob/ca39e257846adb6a5081ca280c23b148feecee9a/artifacts/research/avm2-air-native-semantics/avm2-air-native-semantics.md) | `e5f77528cae5f58d313189f61598417ffe03f28d4b9cdf6749d2710df3d0e979` | `avm2-air-10.09-v1` acceptance contract |
| Selected synthetic-golden runtime | AIR `33.1.1.633`, macOS x86_64 framework `171caec02b70544b14d6fd81185d14f97a389d4db13b1fe96ed9a18a74a85980` | Required authoritative target for tiny non-game fixtures |
| Adobe AVMPlus source | commit [`65a05927767f3735db37823eebf7d743531f5d37`](https://github.com/adobe-flash/avmplus/tree/65a05927767f3735db37823eebf7d743531f5d37) | Corroborating parser and coercion implementation |
| AVMPlus `MathUtils.cpp` | Git blob `14ca1ff49fccd4a780626f07611d2b40ba33aae2` | Whitespace, parseInt, decimal/Infinity parser, rounding |
| AVMPlus `Toplevel.cpp` | Git blob `a964f2210bb6499354f2d55854939bc1ba257244` | Global parseInt/parseFloat entry points |
| AVMPlus `NumberClass.cpp` | Git blob `9683a33513f245c1ee6b735b1508f0f0b6cb4868` | Platform-dependent minimum Number behavior |
| ECMA-262 | Edition 3, December 1999 | Normative parseFloat, parseInt, ToInt32, and ToUint32 rules |

The selected AIR identity comes from the already-adopted native-semantics profile. It is not present evidence that the runtime was available or executed in this investigation.

## Reported common patch-data routes

The [issue 35 report](https://github.com/NickTacke/brawlhalla-sim/blob/bdc8b2c4caecc4b3ebae84ea845a6c0387a4500a/artifacts/research/patch-loader-defaults/patch-loader-defaults.md#L155-L170) gives this bounded common-helper reading. Its analyzer enforces only the 6079 empty-default anchor among these numeric routes:

| Output domain | Build methods | Source state | Reported runtime route | Candidate final result | Grade |
| --- | --- | --- | --- | --- | --- |
| Number | 6079 | empty | explicit branch, no native parse | binary64 `+0` | P |
| Number | 6079, wrapper 948 | nonempty | global `parseFloat`, then `convert_d` | parsed binary64, including `-0`, infinity, or NaN | S |
| int | 6074, wrapper 947 | empty | explicit branch, no native parse | int `0` | S |
| int | 6074, wrapper 947 | nonempty | global `parseInt` with inferred radix; NaN becomes `null`; reported typed return coercion | ToInt32 candidate under N boundary rules, or `0` after failure | S |
| uint | 6071/6075, wrapper 947 | missing or empty | explicit branch, no native parse | uint `0` | S |
| uint | 6071/6075, wrapper 947 | nonempty | global `parseInt` with inferred radix; NaN becomes `null`; reported typed return coercion | ToUint32 candidate under N boundary rules, or `0` after failure | S |

These rows keep provenance states distinct even where candidate final values match. They do not independently prove the missing/empty distinction for every helper, the downstream int/uint coercion edges, or the absence of direct parse calls in category constructors and post-load passes. Until direct method signatures/opcodes/dataflow and a complete exact-callsite ledger are enforced, “every reached path” remains U rather than P.

## Parser behavior established without an AIR golden

### Global `parseFloat`

ECMA-262 Edition 3 section 15.1.2.3 specifies longest-prefix parsing after leading whitespace. A valid decimal prefix or exact signed `Infinity` is returned; failure to begin with a valid prefix yields NaN. Trailing junk after a valid numeric prefix is accepted. Hexadecimal syntax is not a floating-point prefix, so `parseFloat("0x10")` returns the value of prefix `"0"`.

Pinned AVMPlus routes the global through [`Toplevel::parseFloat`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/Toplevel.cpp#L926-L936) into [`convertStringToDouble(..., strict=false)`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/MathUtils.cpp#L1229-L1433). Its compatibility branch is target-variable:

- source lines 1294-1322 parse an exponent;
- only a terminal negative exponent sign takes the explicit early failure at lines 1298-1300;
- the AIR target must therefore decide the exact `"1e-"` result instead of inheriting AVMPlus or a host parser silently;
- source lines 1359-1397 say long-decimal conversion can be one adjacent binary64 value away from the best approximation.

### Global `parseInt`

ECMA-262 Edition 3 section 15.1.2.2 specifies leading whitespace, optional sign, inferred radix, hexadecimal `0x` recognition, and longest valid digit prefix. Adobe's current ActionScript reference confirms radix `0`, hexadecimal recognition, decimal leading zero behavior, and ignored trailing nonnumeric characters.

Pinned AVMPlus implements that path in [`MathUtils::parseInt`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/MathUtils.cpp#L293-L450). [`Toplevel::parseInt`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/Toplevel.cpp#L918-L924) calls it in non-strict mode, matching prefix behavior. Power-of-two radices receive explicit large-integer rounding logic; decimal accumulation still uses binary64.

### Typed int and uint boundaries

ECMA-262 Edition 3 sections 9.5 and 9.6 define the final typed boundaries:

1. NaN, either zero, and either infinity become `+0`.
2. A finite value truncates toward zero.
3. The integer is reduced modulo `2^32`.
4. uint keeps `0..4294967295`; int subtracts `2^32` for representatives at or above `2^31`.

The common Haxe wrapper's NaN-to-null step does not create a different failure value at these typed boundaries. Both `int(null)` and `uint(null)` become zero. It does remain a distinct provenance branch.

## Candidate vector matrix

This matrix is a test contract, **not an AIR result ledger**. Evidence grade and target-record status are separate: N rows have normative candidate values, C rows have corroborating AVMPlus behavior, and K marks the still-missing authoritative AIR record.

For every Number result, the oracle must record all 64 bits. `-0` must be distinguished from `+0`; NaN may use classification-only matching unless its payload is exposed through the required ByteArray observation.

| Input text | Number helper: empty bypass or parseFloat | int helper: parseInt then ToInt32 | uint helper: parseInt then ToUint32 | Grade and reason |
| --- | --- | ---: | ---: | --- |
| missing | `+0` candidate | `0` candidate | `0` candidate | U overall; predecessor S candidates are not fully anchored |
| `""` | `+0` | `0` candidate | `0` candidate | P for method 6079 Number only; S for int/uint routes |
| `" \t\r\n"` | NaN | `0` | `0` | N, nonempty whitespace reaches parsers |
| `" 12 "` | `12` | `12` | `12` | N, leading/trailing ASCII whitespace |
| `"\u00a012"` | target required | target required | target required | K, ES3 includes NBSP but pinned AVMPlus [`skipSpaces`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/MathUtils.cpp#L26-L39) omits it |
| `"-0"` | `-0` | `0` | `0` | N, typed boundaries erase the sign |
| `"1e3"` | `1000` | `1` | `1` | N, parseFloat consumes exponent while parseInt stops at `e` |
| `"1e"` | `1` | `1` | `1` | N, longest valid prefix is `1` |
| `"1e+"` | `1` | `1` | `1` | N, longest valid prefix is `1` |
| `"1e-"` | target required | `1` | `1` | K, pinned AVMPlus parseFloat has an explicit terminal-negative-exponent failure |
| `"12..34..56"` | target required | `12` | `12` | C candidate proves variability; K record pending for matched SWF version |
| `"0x10"` | `+0` | `16` | `16` | N, float prefix is `0`; integer parser infers radix 16 |
| `"-0x10"` | `-0` | `-16` | `4294967280` | N, optional sign precedes integer hex recognition |
| `"0x"` | `+0` | `0` after failure | `0` after failure | N, parseFloat keeps prefix `0`; parseInt has no digit after prefix |
| `"2147483648"` | `2147483648` | `-2147483648` | `2147483648` | N, signed boundary |
| `"4294967295"` | `4294967295` | `-1` | `4294967295` | N, unsigned maximum |
| `"4294967296"` | `4294967296` | `0` | `0` | N, modulo boundary |
| `"9007199254740993"` | exact AIR bits required | `0` | `0` | N candidate; K bits pending; typed result follows rounded binary64 modulo |
| `"1e309"` | `+Infinity` | `1` | `1` | N candidate; K record pending for exact target output |
| `1` followed by 309 zeroes | `+Infinity` | `0` | `0` | N candidate; K record pending for both overflowing native parses |
| `"1e-324"` | target required (`+0` on gradual-underflow binary64) | `1` | `1` | K, underflow and platform mode |
| `"-1e-324"` | target required (`-0` on gradual-underflow binary64) | `-1` | `4294967295` | K, signed underflow |
| `"5e-324"` | target required (usually minimum positive subnormal) | `5` | `5` | K, exact subnormal bits |
| `"2.2250738585072012e-308"` | exact AIR bits required | `2` | `2` | K, normal/subnormal and decimal-rounding boundary |
| `"Infinity"` | `+Infinity` | `0` after failure | `0` after failure | N |
| `"+Infinity"` | `+Infinity` | `0` after failure | `0` after failure | N |
| `"-Infinity"` | `-Infinity` | `0` after failure | `0` after failure | N |
| `"NaN"` | NaN | `0` after failure | `0` after failure | N |
| `"12junk"` | `12` | `12` | `12` | N, valid prefix means no failure |
| `"."` | NaN | `0` after failure | `0` after failure | N |
| `"--1"` | NaN | `0` after failure | `0` after failure | N |

The final target corpus must replace every “target required” cell with an observed typed value and must record target results even where the N/C candidate already appears unambiguous. Acceptance requires a target result, not agreement by inspection.

## Required target-oracle record

Use only a tiny synthetic application. It must not load, instrument, or trace Brawlhalla. For each vector and each route, emit the versioned `avm2-air-10.09-v1` typed value record adopted by issue 37, plus:

- source-state tag: `missing`, `empty`, or `present`;
- operation tag: `parseFloat`, `parseInt`, `nan-to-null`, `int-boundary`, or `uint-boundary`;
- input as UTF-16 code units, so whitespace and embedded NUL cannot be normalized by transport;
- Number classification and big-endian bytes from `ByteArray.writeDouble`;
- int and uint values as exact 32-bit patterns;
- exception class and stable ID if any;
- AIR version, framework SHA-256, OS, architecture, exact SWF compatibility version, compiler identity and flags, source hash, generated ABC/SWF hash, descriptor hash, and harness hash;
- canonical record SHA-256 and aggregate ledger SHA-256 under the domain separator defined by issue 37.

The harness must include the fixed rows above and generated neighbors around zero, `2^31`, `2^32`, `2^53`, the minimum subnormal, the minimum normal, maximum finite, decimal rounding ties, exponent-sign truncations, `"12..34..56"`, every AVMPlus `skipSpaces` code point, ES3 NBSP, embedded NUL, and valid-prefix plus malformed-suffix cases.

A host JavaScript, Bun, Node, Ruffle, Lightspark, AVMPlus shell, or modern HARMAN SDK run may be a differential, never the authoritative AIR record for this profile.

## Why acceptance remains unmet

1. **No selected AIR target output exists here.** The required AIR `33.1.1.633` framework identity is known from prior evidence, but no executable or captured synthetic result ledger was available in this checkout.
2. **No hash-pinned compiled fixture exists.** This report defines the vector and record contract, but there is no source/compiler/generated-ABC/runtime tuple whose target output can be verified.
3. **The game-equivalent SWF compatibility version is not bound.** Pinned AVMPlus tests prove malformed parse behavior can change with SWF version. AIR version and compiler identity alone do not select that compatibility mode.
4. **Exact binary64 cases remain K.** Long decimal conversion, underflow/subnormal handling, NaN payload exposure, malformed negative exponent, and the whitespace table cannot be promoted from AVMPlus source to AIR behavior.
5. **Complete patch numeric reachability remains U.** Issue 35 proved the common helper island, not every category constructor, nested helper, or post-load parse callsite. A complete exact-callsite ledger is still required before “every reached Number, int, and uint parse path” can pass.
6. **No result ledger hash exists.** Candidate expected values or a host-runtime run cannot substitute for target records under `avm2-air-10.09-v1`.

Issue 58 must remain open. No simulator or normalizer may claim exact patch numeric compatibility from this report.

## Reproduction and next proof step

The predecessor common-helper proof is reproduced, when the user supplies the ignored exact ABC and source cohort, with:

```bash
bun run provenance:patch-loader-defaults -- \
  --abc artifacts/main.abc \
  --source-dir artifacts/research/brawlhalla-physics/decrypted
```

Expected status is `partial-static-proof`, with 15,010 decoded method bodies, valid branch targets, exact source identities, and the common helper anchors. That command does not produce AIR numeric goldens.

To satisfy this ticket:

1. close the exact patch-loader numeric callsite inventory against the pinned ABC;
2. recover and pin the containing game SWF's compatibility version;
3. compile and hash the synthetic fixture and vector manifest for that exact SWF version;
4. execute it under the selected AIR `33.1.1.633` macOS x86_64 framework hash above;
5. capture binary64 bytes and typed int/uint results in canonical records;
6. rerun in fresh processes and compare the target ledger with patched-interpreter and host implementations;
7. update this evidence with the immutable ledger and only then close issue 58.

## Surfaced route and boundaries

No ticket was created or claimed. The surfaced route stays inside this open ticket: obtain authorized tiny synthetic AIR goldens, then bind them to a complete numeric callsite ledger. Existing [Build a privacy-safe patch-loader mutation oracle](https://github.com/NickTacke/brawlhalla-sim/issues/56) can consume the final ledger but does not own these numeric semantics. Existing [Close patch category constructors and post-load resolution](https://github.com/NickTacke/brawlhalla-sim/issues/57) supplies adjacent loader closure without replacing issue 58's target-golden requirement.

## Primary sources

- [ECMA-262 Edition 3](https://www.ecma-international.org/wp-content/uploads/ECMA-262_3rd_edition_december_1999.pdf), especially sections 7.2, 9.3.1, 9.5, 9.6, 15.1.2.2, and 15.1.2.3.
- [Adobe/HARMAN ActionScript top-level functions](https://airsdk.dev/reference/actionscript/3.0/package.html#parseFloat()), including Number, int, uint, parseFloat, and parseInt behavior.
- [Adobe/HARMAN Number reference](https://airsdk.dev/reference/actionscript/3.0/Number.html), including IEEE-754 and platform-dependent `MIN_VALUE` behavior.
- Adobe AVMPlus at [`65a05927767f3735db37823eebf7d743531f5d37`](https://github.com/adobe-flash/avmplus/tree/65a05927767f3735db37823eebf7d743531f5d37): [`MathUtils.cpp`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/MathUtils.cpp), [`Toplevel.cpp`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/Toplevel.cpp), and [`NumberClass.cpp`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/core/NumberClass.cpp).
- Pinned AVMPlus compatibility test [`parseFloat_513018.as`](https://github.com/adobe-flash/avmplus/blob/65a05927767f3735db37823eebf7d743531f5d37/test/acceptance/as3/GlobalObject/parseFloat_513018.as), Git blob `fa75e308eced41240cd7f8e46f0a3888681cf342`, which records SWF-version-dependent malformed-input behavior.
