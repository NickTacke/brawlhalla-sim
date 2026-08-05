# Format-268 input bit 32 in Brawlhalla 10.09.96325

<!-- markdownlint-disable MD013 -->

Issue: [Recover input bit 32 producer and meaning](https://github.com/NickTacke/brawlhalla-sim/issues/19)

## Verdict

**Accepted.** Format-268 input bit `32` is **Aim Up**. Reachable standalone-32 production is not required to prove independent meaning. Method 6146 proves independence: changing only bit 32 changes the selected attack route, and its bit-32 branch never tests bit 1.

The bounded static ledgers below identify every exact recorder source writer and every consumer reachable from the exact timeline-mask trait. No finite generic-call or timeline-taint site remains unresolved. The 12-replay cohort still contains no standalone-32 snapshot; that observation limits production evidence, not the meaning conclusion.

## Evidence identity and query rules

| Property | Value |
| --- | --- |
| ABC | `artifacts/research/brawlhalla-physics/main.abc` |
| Build | `10.09.96325` |
| Bytes | `3,934,088` |
| SHA-256 | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` |
| Decoded bodies | `15,010` |
| Branch validation | all targets are instruction boundaries or the permitted `code_length` target |
| Decoder | `abc-disassembler` revision `ad9714d`, pinned by `bun.lock` |

`pc` is the original method-local byte offset and is authoritative. `i` is the zero-based decoded instruction ordinal. QName strings use the ABC string-pool `index - 1` correction.

The bounded queries were:

1. decode every body and validate each branch and `lookupswitch` target;
2. index instance/static traits by `(class index, QName multiname index, kind)`, then type-propagate receivers through declared fields, method parameters, `coerce`/`astype`, locals, array element coercions, and calls;
3. root recorder method 6129's typed reads, enumerate every `setproperty`/`initproperty` to those exact owner traits, and separately trace returned masks from methods 1960 and 1964;
4. root exact `_‑O3Y._‑T4y`, follow constructor/load/insertion, its direct reads, all six calls to sampler 6135, returned locals/parameters, and exact `_‑Tx._‑th` writes and reads;
5. treat literal scanning only as a cross-check. Propagate whole values and resolve computed masks and method arguments before disposition;
6. for method 4882, enumerate runtime multiname constants and invocation opcodes, then reverse-slice the callable operand at every generic `call` using opcode stack effects. A slice ends only at an `applytype` class, `getlex` callable, typed/local callback source, or runtime `getproperty`; runtime-property receivers and names are then resolved.

Rendered text alone was never used to equate `_‑T4y`, `_‑th`, `_‑U1F`, or `_‑c5l` traits. This matters because `_‑T4y` is declared by both `_‑O3Y` and `_‑c4d`, `_‑th` by `_‑Tx` and `_‑d1H`, `_‑U1F` by `_‑E6o` and `_‑31f`, and `_‑c5l` by `_‑E6o` and `_‑45g`.

## Identity

Method 14909 initializes the command domain:

- `pc18921..18932`: command value 32 is initialized between 16 and 64.
- `pc19364..19372`: `16, 32, 64` are inserted in that order into `Commands._-Ju`.
- `Commands._-Q4s[4] = 1`; `Commands._-Q4s[29] = 32`.
- `pc63194..63294`: hotkey ID 29 is paired with `Command_Name_AimUp`; IDs 4 and 3 are paired with `JumpAimUp` and `Jump`.

Method 3456 `_-u16._-o34`, `pc3632..3648`, independently registers readable label `Aim Up` for hotkey ID 29. Therefore:

```text
hotkey 29 -> Commands._-Q4s[29] -> command 32 -> "Aim Up"
```

## Producer ledger

### Exact recorder inputs

Method 6129 `_-Tx._-91w` reads only these typed command-mask sources before constructing the snapshot:

| Recorder PCs | Exact source trait | Use |
| --- | --- | --- |
| `225,236` | `_‑Tx._‑854 : _‑E6o` -> `_‑E6o._‑U1F`, `_‑E6o._‑c5l` | OR, then mask with `~Commands._-736` |
| `354,364` | `_‑Tx._‑03Z : _‑45g` -> `_‑45g._‑T1X`, `_‑45g._‑c5l` | OR, then mask with `~Commands._-736` |
| `467,485` | `_‑Tx._‑K1I : _‑31f` -> `_‑31f._‑U1F` | replace active local mask |
| `783,794` | `_‑Tx._‑aE : _‑E6o` -> `_‑E6o._‑U1F`, `_‑E6o._‑c5l` | OR into active mask |

The selected value is local 7. Method 6129 compares it with `_‑Tx._‑j3W` at `pc1137..1149`, constructs `new _‑O3Y(timestamp, local7)` at `pc1153..1163`, and appends it at `pc1235..1272`.

### Complete exact-trait writer disposition

| Exact field | Writer methods and write PCs | Classification for bit 32 |
| --- | --- | --- |
| `_‑31f._‑U1F` | 1973:`754`; 1974:`64,129,230,303,370,435,492,815`; 3379:`62` | 1973/3379 clear. 1974 is reachable conditional binding plus paired direction production. |
| `_‑E6o._‑U1F` | 4882:`15`; 4886:`16`; 4887:`23,49`; 4889:`23,49`; 4894:`34,50`; 4895:`50`; 4896:`49`; 4898:`34,50`; 4899:`597,672`; 4900:`688,878`; 4906:`13`; 6129:`575`; 6138:`391` | 4900 is reachable paired. 4882 is dormant/unreachable. 4896 is conditional table capability but has no reachable 29 call. Others set/clear other directions, clear, or pass through/AND. |
| `_‑E6o._‑c5l` | 4879:`20`; 4896:`92`; 4906:`21`; 6129:`262,812`; 6138:`404` | Secondary/transient pass-through or clear; no bit-32 command binding. |
| `_‑45g._‑T1X` | 6438:`344,582`; 6439:`75,125,327,352,392,425,465,523` | 6438 passes through raw `GetDownState`; 6439 is reachable and normalizes bit 32 to paired bit 1. |
| `_‑45g._‑c5l` | 6129:`388`; 6439:`170` | transient pass-through or clear; no independent bit-32 assignment. |

No other typed write reaches a recorder input trait.

### Producer paths and reachability

1. **Reachable paired, Controller method 1960 `Controller._-X4U`.** Upward axis/digital branches at `pc227..247`, `263..287`, `307..331`, `721..738`, `1159..1202`, `1478..1583`, and `1784..1845` return/OR `1 | 32`, optionally with horizontal bits. No upward branch emits bit 1 without 32.
2. **Reachable paired, keyboard method 4900 `_‑E6o._‑C2S`.** Hotkey case 29 at `pc851..881` calls `_‑b2M(4, secondaryType)` and then ORs 32. `_Q4s[4] == 1`, so it emits `1 | 32`. Method 4899 clears both at `pc645..675`.
3. **Reachable paired, raw-keyboard normalizer 6439 `_‑45g._‑x2X`.** Up at `pc376..429` can add 16 and 32; `pc429..469` adds bit 1 whenever raw bit 32 is present. Final `_‑T1X` cannot retain 32 without 1.
4. **Conditional binding, controller methods 1974/1964.** Method 1974 `_‑31f._‑Bc`, `pc305..380`, iterates `Commands._-Ju`, including 32, and calls `Controller._-Ly(mask)`. Method 1964, `pc29..229`, returns that same mask when a bound raw control is active. A command-32 binding could therefore produce standalone 32. The reviewed defaults do not establish such a binding. This conditional standalone possibility is not an acceptance blocker.
5. **Pass-through, method 6438 `_‑45g._‑h2t`.** `pc566..582` writes raw `GetDownState(false)` to `_‑T1X`; its bit-level provenance is the native API. The alternate normalized path above is independently bounded.
6. **Dormant/unreachable, method 4882 `_‑E6o._‑O53`.** If called, `pc2..15` ORs 32 into `_‑U1F`. The finite dispatch review below finds no invocation.
7. **Conditional table capability, method 4896 `_‑E6o._‑b2M`.** `pc7..49` ORs `_Q4s[arg1]` into `_‑U1F`; `pc81..92` updates `_‑c5l`. Complete QName calls use first arguments `{3,4,5,6,7,8,9,13}`, except method 4900's special case which deliberately uses 4 then ORs 32. No call supplies 29.

### Method 4882 runtime-dispatch closure

`_-E6o` has instance flags `1` (sealed), superclass `Object`, and no interfaces. `_‑O53` is its ordinary instance method 4882 with `disp_id == 0`. Across all 15,010 bodies:

- zero QName references to `_‑O53`;
- zero `newfunction` or `callstatic` references to method 4882;
- zero `callmethod` instructions;
- exactly one `MultinameL` constant (kind 27); no `MultinameLA` constant;
- zero runtime-name `callproperty`, `callpropvoid`, `constructprop`, `callsuper`, or `callsupervoid` instructions;
- 9,605 runtime-name `getproperty` instructions, used for array/map/index access;
- exactly 189 generic `call` instructions.

The 189 callable-operand slices close as follows:

| Slice terminus | Count | Disposition |
| --- | ---: | --- |
| `applytype` class value | 148 | parameterized Vector/collection construction, not an instance method value |
| `getlex` callable | 10 | named callbacks `onContinue`, `onLeft`, `onRight`, `f`, `f1`..`f5`; none `_‑O53` |
| local/callback | 17 | declared Function/Object callbacks or closed callback registries; no local assignment comes from `_‑E6o` runtime lookup |
| runtime `getproperty MultinameL` | 14 | exact receiver/name dispositions below; none can be `_‑E6o` plus `_‑O53` |
| **Total** | **189** | **no unresolved site** |

The 14 runtime-property callable sites are complete:

| Sites | Receiver/name source | Disposition |
| --- | --- | --- |
| 963:`25,48` | untyped input with literal names `mapHX`, `map` | names exclude `_‑O53` |
| 964:`24,47` | untyped input with literal names `filterHX`, `filter` | names exclude `_‑O53` |
| 6559:`405` | static `_‑41A._‑W4n[index]` registry | receiver is a registry, not `_‑E6o` |
| 13390:`104,138`; 13395:`274`; 13404:`29` | `_‑J1y._‑S3I[_‑F5t]` callback array | receiver is Array |
| 13981:`128`; 13982:`129`; 13983:`196`; 13985:`137`; 13996:`130` | `_‑t3Q` callback arrays `_‑p3w`/`_‑D1E` indexed by `_‑F5t` | receiver is Array |

The 17 local/callback sites are: `223:99,178`; `972:35`; `973:36`; `3143:48`; `5330:65`; `6555:168,296`; `6556:163`; `8369:17,44`; `13322:364`; `13441:162,175`; `14028:44`; `14919:26,38`. They resolve respectively to declared callback parameters, `funcs[]`, `LinkUpdater._-Ub[type]`, `_‑41A` StringMap callbacks, or fixed library callbacks. None is assigned from a runtime property read on `_‑E6o`.

For audit completeness, the 148 `applytype` sites are:

```text
979:287 984:332 3852:562 3852:627 6493:97 8893:239 9199:557 9199:657
9509:1109 10195:3079 10527:36 10527:74 11625:216 11625:275 12625:300
12625:365 12774:135 12774:248 12800:1428 13095:1213 13095:1236 13228:1816
13228:1839 14332:53 14909:223 14909:2498 14909:2531 14909:2559 14909:2588
14909:2688 14909:2760 14909:3549 14909:10063 14909:12106 14909:12517
14909:12544 14909:12575 14909:12600 14909:12708 14909:12732 14909:12756
14909:12780 14909:13291 14909:13327 14909:13371 14909:13405 14909:13470
14909:24781 14909:26821 14909:31712 14909:31781 14909:39615 14909:39638
14909:39661 14909:39684 14909:39707 14909:39734 14909:39760 14909:39786
14909:39809 14909:39835 14909:39862 14909:39888 14909:39911 14909:39934
14909:39961 14909:39988 14909:40014 14909:40041 14909:40068 14909:40095
14909:40118 14909:40147 14909:40176 14909:40209 14909:40241 14909:40274
14909:40307 14909:40340 14909:40373 14909:40406 14909:40439 14909:40471
14909:40501 14909:40533 14909:40565 14909:40597 14909:40626 14909:40659
14909:40692 14909:40724 14909:53516 14909:53627 14909:53674 14909:53700
14909:53733 14909:54350 14909:55993 14909:56027 14909:56060 14909:56117
14909:56149 14909:56180 14909:56397 14909:62021 14909:62089 14909:63174
14909:63256 14909:63345 14909:63413 14909:63463 14909:63518 14909:63890
14909:64376 14909:64867 14909:65624 14909:65852 14909:67608 14909:67645
14909:67703 14909:67764 14909:67837 14909:67895 14909:67935 14909:68059
14909:68157 14909:68315 14909:69205 14909:69238 14909:69276 14909:69860
14909:69992 14909:71581 14909:73360 14909:73389 14909:73440 14909:73503
14909:73554 14909:73635 14909:73722 14909:73758 14909:73795 14909:74428
14909:75508 14909:76532 14909:76800 14909:77639 14909:78107
```

The 10 `getlex` sites are `8635:4`, `8637:4`, `8638:4`, `8917:7`, `8919:7`, `8920:6`, `8922:7`, `8923:6`, `8925:5`, and `14940:14`.

**Unresolved finite call site: none.**

## Timeline root, load, and round-trip

The exact mask trait is instance slot `_‑O3Y._‑T4y : uint`. Constructor 4737 writes argument 2 unchanged at `pc9..13`. Recorder 6129 supplies its local 7 at `pc1157..1159`.

Replay writer 6521 iterates typed `_‑O3Y` entries. At `pc689..715` it emits the zero/nonzero marker; at `pc719..751` it writes the exact 14-bit mask. Reader 6510 restores those values. Loader 3507 reads the timestamp/mask arrays and constructs `_‑O3Y` at `pc624..645`, then inserts it through `_‑Tx._‑PB` at `pc649`. Method 6128 handles network/update insertion, comparing and replacing `_‑T4y` at `pc246..258`.

## Consumer candidate cardinalities

### Exact `_‑O3Y._‑T4y` name cohort

There are exactly **37 property-name instructions in 12 bodies**. Receiver typing gives:

- **16 exact `_‑O3Y._‑T4y` instructions in 6 bodies:** 4737 (2), 6124 (1), 6128 (2), 6135 (8), 6521 (2), 13649 (1).
- **21 `_‑c4d._‑T4y` collision instructions in 6 bodies:** 1566 (2), 1569 (2), 4936 (2), 4941 (2), 4946 (8), 4955 (5). These operate `_‑c4d` vector/array state and are not timeline-mask candidates.

Exact instructions by body and byte PC:

```text
4737: 9 findproperty, 13 initproperty
6124: 56 getproperty
6128: 246 getproperty, 258 initproperty
6135: 261,347,389,458,488,670,691,697 getproperty
6521: 689,748 getproperty
13649: 522 getproperty
```

Sampler 6135 has exactly **6 call sites in 4 bodies**: 1568:`176`; 1569:`147`; 6125:`352,1619,1659`; 6126:`11`. All eight return sites in 6135 return an exact typed `_‑O3Y._‑T4y` value.

### Exact `_‑Tx._‑th` cohort

The shared QName `_‑th` occurs in **158 property instructions in 31 bodies**:

- **100 exact `_‑Tx._‑th` instructions in 23 bodies** listed below;
- **58 `_‑d1H._‑th : _‑Pe` collision instructions in 8 bodies**: 718 (2), 730 (12), 732 (6), 755 (18), 765 (2), 766 (10), 779 (6), 792 (2).

Method 6125 writes a sampled mask to exact `_‑Tx._‑th` at `pc387`, and clears it at `pc1477`. Method 6126 writes sampler 6135's result at `pc17`. All other exact sites are reads.

## Complete timeline consumer/sink ledger

### Whole-mask, copy, serialization, compression, diagnostic, and UI sinks

| Owner / method | Byte PC(s) | Source-to-sink chain | Can bit 32 alone affect it? |
| --- | --- | --- | --- |
| `_‑Tx._‑R4p` 6124 | `56 -> 59` | `_‑O3Y._‑T4y` -> diagnostic/link `_‑24s._‑l3h(field 14, mask)` | Yes, whole mask is emitted. |
| `_‑Tx._‑Q5z` 6128 | `246..258` | exact timeline entry -> full equality -> replacement state write | Yes, equality/result and stored value change. |
| `_‑Tx._‑72L` 6135 | `261,347,389,458,488,670,691,697` | timeline arrays/current snapshot -> returned uint | Yes, return changes. |
| `_‑16._‑i3b` 6521 | `689..751` | exact timeline entry -> zero marker + 14-bit replay write | Yes, zero/nonzero marker can change and serialized mask changes. |
| `_‑J2H._‑Q4x` 1568 | `176..246` | sampler -> local 6 -> nonzero/change comparison -> compressed mask array | Yes. |
| `_‑J2H._‑M6I` 1569 | `147..244` | sampler -> local 6 -> nonzero/change comparison -> compressed mask/time arrays | Yes. |
| `_‑Tx._‑B1i` 6125 | `352,370..387,1001..1040` | sampler -> `_‑e3Z[]` -> `_‑th`/prior local -> rising-edge calculation | Yes, state and `(current XOR prior) AND current` change. |
| `_‑Tx._‑H1` 6126 | `11..17` | sampler -> exact `_‑Tx._‑th` cache write | Yes. |
| `_‑11Q.Tick` 13649 | `520..553` | timeline entry -> `_‑T4y` -> test against mask 33 -> `_‑qI(0)`/`_‑12F(0)` HUD state | Yes. The test is `(mask AND (1 OR 32)) != 0`; both bits share the Up icon. |

### Independent gameplay sink

Method 6125 keeps the full current masks when light edge 128 or heavy edge 64 rises: local 19 is the light current mask (`pc1074..1097`), and local 21 is the heavy current mask (`pc1110..1133`). It passes those full masks as argument 2 to method 6146 at `pc2889..2918` and `pc3070..3100`.

Method 6146 `_‑Tx._‑l4J` then:

1. derives ordinary direction from `arg2 & 15` at `pc92..98`;
2. gives the down route priority at `pc410..488`;
3. separately tests the **original arg2** with `arg2 & 32` at `pc492..501`;
4. on true, calls `_‑Tx._‑y42` at `pc505..509` and sets selector 1 at `pc514..518`;
5. only if false, evaluates horizontal/default selection at `pc524..603`;
6. combines selector plus light/heavy base, indexes `_‑Tx._‑73T`, and calls `_‑Y4C._‑S45` at `pc605..675`.

Bit 1 is absent from the bit-32 predicate. Toggling only bit 32 can change selector 1 versus horizontal/default and therefore the `_‑S45` action/power argument. This is the independent gameplay meaning proof.

### Remaining exact `_‑Tx._‑th` dispositions

These are every exact `_‑Tx._‑th` reader outside the whole-mask table. The PC lists name `getproperty` byte PCs. “No” means the complete downstream slice removes or ignores bit 32 before its branch/action/state sink.

| Owner / method | Read PC(s) | Downstream operation | Bit 32 alone? |
| --- | --- | --- | --- |
| `_‑M5v._‑81I` 46 | `4170` | `&2` branch | No |
| `_‑M5v._‑p4S` 56 | `184` | `&2` branch | No |
| `_‑M5v._‑T6F` 80 | `197` | `PowerType._‑J4z` 6278 | No: `_‑34U` 6284 draws only `_‑V0` bits 1/2/4/8 and also uses `&15`. |
| `_‑Wv._‑S6I` 1484 | `1422,1462` | `&15`; pass to `_‑Wv._‑S4i` 1473 | No: 1473 tests only 1/2/4/8. |
| `_‑Y4C._‑CS` 1538 | `389` | `PowerType._‑J4z` 6278 | No, same finite `_‑V0` disposition. |
| `_‑Y4C._‑71` 1542 | `243,364` | `&15`, `&2` | No |
| `_‑Y4C._‑kn` 1551 | `1378` | `&15` passed to `_‑26Y` | No |
| `_‑Y4C._‑E6M` 1555 | `66` | `&2` | No |
| `_‑V4R._‑D38` 2887 | `1112,1138,1199,1225,1726,4593,5124` | masks 4,8,8,4,2,2,2 | No |
| `_‑V4R._‑S3y` 2889 | `279,317,363,401,525,554,691,753,805` | masks 4,8,4,8,12,2,2,2,`Commands._‑16s` | No: `_‑16s` is 64 OR 128. |
| `_‑V4R._‑U4h` 2895 | `719,790,822,976,1008,1131,1156,1195,1220,1557,1581,1712,1736,2176,2201,2279,2304` | only masks 1,2,4,8 and 12 | No |
| `_‑V4R._‑t35` 2897 | `947` | local 7, then masks 1/2/4/8 to movement vector writes | No |
| `_‑V4R._‑61V` 2954 | `146,188,357` | `&4`, `&8`, full pass as arg4 to `_‑V4R._‑323` 2907 | No: 2907 tests arg4 only with 2. |
| `_‑V4R._‑a3w` 3034 | `261,294` | `&4`, `&8` | No |
| `_‑V4R._‑C4I` 3059 | `99` | `&15` state write `_‑O4b` | No |
| `_‑W1n._‑m2U` 3579 | `72` | `&2` | No |
| `_‑I13._‑C2j` 3605 | `666,736` | `&1`, `&2` | No |
| `_‑Tx._‑B1i` 6125 | `504,844,884,1294,1363,1439,1818,3165,3481,3522,3565,3725,3848,3886,3926,3965` | direction masks; `_‑b0`; action gates; computed command masks | Only the full-mask edge path into 6146 is Yes. `_‑b0` 3575 tests the forwarded mask only with 256. Other masks are 1/2/4/8/15/64/128/256/512. `_‑T5j` is 4 OR 8, `_‑15K` is 1024 OR 2048 OR 4096 OR 8192, and `_‑o3n` uses only those four high bits. |
| `_‑Tx._‑V1f` 6142 | `36` | `Commands._‑T5j`; forwards masks to `_‑M5v._‑2v` 86 -> `_‑Ws` 84 | No: `_‑Ws` tests current only with 4/8 and prior with 15. |
| `_‑Tx._‑y42` 6143 | `21,68` | `&4`, `&8` direction-facing calls | No |
| `_‑Tx._‑K1A` 6145 | `112` | loop over `Commands._‑o3n`, full-mask equality, `_‑S45` | No: `_‑o3n` has exactly eight masks made only from 1024/2048/4096/8192. |
| `_‑t3B._‑R31` 12711 | `122` | `Commands._‑T5j`, which is 4 OR 8 | No |

Computed-mask closure is therefore explicit: the only computed collections receiving the timeline mask are `_‑V0`, `_‑o3n`, `_‑T5j`, `_‑15K`, and `_‑16s`; their initializers/parsers contain no bit 32. Whole-mask operations have been separately listed above. No additional independent gameplay consumer exists in the bounded ABC.

## Replay cohort

The hash-gated format-268 analyzer reproduced:

```json
{
  "replayCount": 12,
  "inputSnapshots": 49874,
  "inputBitCounts": { "1": 6724, "32": 6288 },
  "bit32WithBit1": 6288,
  "bit32WithoutBit1": 0
}
```

All 12 files individually report zero standalone-32 snapshots. This corroborates ordinary paired production but is not required for the independent gameplay-meaning proof.

## Reproduction and validation

```bash
shasum -a 256 artifacts/research/brawlhalla-physics/main.abc
wc -c artifacts/research/brawlhalla-physics/main.abc
strings artifacts/research/brawlhalla-physics/main.abc | grep -F '10.09.96325'

bun tools/avm2-provenance/movement_provenance.ts \
  --abc artifacts/research/brawlhalla-physics/main.abc \
  --target grounded-jump-y

cd tools/avm2-provenance
git show research/replay-format-268-semantics:tools/avm2-provenance/replay_format_268_analysis.ts | \
  bun run - -- \
    --abc ../../artifacts/research/brawlhalla-physics/main.abc \
    --manifest ../../artifacts/replay-corpus/10.09.96325/manifest.json
```

Observed results: exact SHA/size/build above; `methodsDecoded: 15010`; `branchTargetsValid: true`; provenance `status: proven`, `blockers: []`; replay count 12, 49,874 snapshots, 6,288 bit-32 snapshots, all 6,288 paired with bit 1.

## Conclusion

- **Meaning:** bit 32 is Aim Up.
- **Producers:** reachable ordinary Up in 1960, keyboard hotkey 29 in 4900, and normalized raw keyboard in 6439 are paired; controller polling 1974/1964 is conditional on a command-32 binding; 6438 is native pass-through; 4882 is dormant/unreachable; 4896 has no reachable hotkey-29 call.
- **Independent consumers:** method 6146 independently tests bit 32 for gameplay action selection; method 13649 combines 1 and 32 for the Up HUD icon. Whole-mask diagnostic, copy, compression, cache, and serialization sinks are also fully enumerated.
- **Acceptance:** met. Standalone-32 production is not a closure requirement because method 6146 establishes independent gameplay meaning without testing bit 1.
- **Residual blocker:** none in the bounded static evidence. The only observational limitation is that the reviewed 12 replays do not exercise standalone 32.
