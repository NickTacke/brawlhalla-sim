# Format-268 input bit 32 in Brawlhalla 10.09.96325

Issue: [Recover input bit 32 producer and meaning](https://github.com/NickTacke/brawlhalla-sim/issues/19)

## Corrected answer

Format-268 input-mask value `32` is named **Aim Up**. The pinned ABC directly proves ordinary upward input produces `1 | 32`, the replay timeline preserves those bits, and gameplay method 6146 tests bit 32 separately while selecting an attack route.

This investigation does **not** prove a reachable standalone-32 producer. Two previously claimed independent producers are only generic capabilities:

- Keyboard/hotkey method 4900 handles hotkey type 29 by setting hotkey type 4, whose command is bit 1, before explicitly OR-ing bit 32. Method 4899 clears both. No statically resolved call passes 29 as the command-setting first argument to generic mutator 4896.
- Controller method 1974 can syntactically poll command 32 and method 1964 can return its argument, but no configuration path that binds command 32 to a raw control was proven.

Method 4882 directly ORs 32 into the keyboard source mask, but it has no statically resolved call or closure reference. Runtime-name dispatch cannot be excluded, so it is classified as dormant/unresolved, not as a producer.

The prior exhaustive-consumer conclusion is also withdrawn. The complete literal-candidate ledger below is reproducible and corrects the cardinalities, but most numeric candidates have not been individually connected to or excluded from the timeline field, and computed/nonliteral masks remain outside that ledger.

**Ticket status: not verified.** Acceptance remains blocked on both of these items:

1. prove a reachable standalone-32 production path, or prove that none exists, including controller binding and runtime/dynamic reachability of method 4882; and
2. complete an auditable all-candidate use-def review for every independent timeline consumer, including nonliteral/computed masks.

Severity: informational research correction. No simulator defect was assessed.

## Evidence identity and notation

All static claims use this local primary artifact:

| Property | Value |
| --- | --- |
| Path | `artifacts/research/brawlhalla-physics/main.abc` |
| Build string | `10.09.96325` |
| Bytes | `3,934,088` |
| SHA-256 | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` |
| Decoded method bodies | `15,010` |
| Decoder | `abc-disassembler` revision `ad9714d`, pinned by `bun.lock` |
| Branch validation | every decoded branch target is an instruction boundary or permitted `code_length` target |

`i` is the zero-based decoded instruction ordinal. `pc` is the original method-local byte offset. Byte PCs are the authority. QName strings use the ABC string pool's `index - 1` correction.

Replay corroboration uses the ignored, hash-gated local manifest at `artifacts/replay-corpus/10.09.96325/manifest.json`. No replay bytes, manifest, or generated dump is committed.

## Proven identity: Aim Up

Method 14909 initializes the command domain:

- `i6882..6885`, `pc18921..18932`: initializes command value 32 between command 16 and command 64.
- `i7076..7080`, `pc19364..19372`: inserts `16, 32, 64` in that order into `Commands._-Ju`.
- `i8015..8021`: stores `Commands._-Q4s[4] = 1`.
- `i8092..8098`: stores `Commands._-Q4s[29] = 32`.
- `i24032..24084`, `pc63194..63294`: parallel vectors place hotkey ID 29 beside `Command_Name_AimUp`. ID 4 is beside `Command_Name_JumpAimUp`; ID 3 is beside `Command_Name_Jump`.

Method 3456 `_-u16._-o34`, `i1289..1294`, `pc3632..3648`, independently registers readable label `Aim Up` with hotkey ID 29.

These links prove the identity and table capability:

```text
hotkey type 29 -> Commands._-Q4s[29] -> command 32
hotkey type 29 -> Command_Name_AimUp / "Aim Up"
```

They do not prove that a reachable event handler invokes the generic mutator with first argument 29.

## Proven ordinary producer: upward input emits 1 and 32

Method 1960 `Controller._-X4U` converts upward stick/axis states to `1 | 32`:

| Direction decoder region | Byte PCs | Result |
| --- | ---: | --- |
| Enumerated axis positions | `227..247`, `263..287`, `307..331` | `1 | 32`, optionally with horizontal 4 or 8 |
| Digital up control | `721..738` | OR `1 | 32` |
| First analog-vector branch | `1159..1202` | OR `1 | 32` |
| Analog helper call | `1478..1583` | supplies `1 | 32` as the up mask |
| Second analog-vector branch | `1784..1845` | OR `1 | 32` |

No upward branch in method 1960 emits bit 1 without bit 32.

The alternate raw-keyboard source in method 6439 `_-45g._-x2X` also guarantees pairing. At `pc376..429`, an Up state can add bits 16 and 32. At `pc429..469`, any raw bit 32 adds bit 1. Its final `_‑T1X` mask cannot retain 32 without 1.

## Corrected keyboard/hotkey adjudication

### Generic mutator semantics

Method 4896 `_-E6o._-b2M` has two arguments:

1. argument 1 indexes `Commands._-Q4s`; the resulting command is OR-ed into `_‑U1F` at `i5..24`, `pc7..52`;
2. optional argument 2 indexes `Commands._-Hn`; that separate result is OR-ed into `_‑U1` at `i46..70`, `pc95..156`.

Method 4895 `_-E6o._-A3j` performs the matching clears. Argument 1 clears the `_Q4s` command from `_‑U1F` at `i5..25`, `pc7..53`; optional argument 2 clears the `_Hn` result from `_‑U1` at `i26..51`, `pc53..115`.

Therefore `_-b2M(29, ...)` would have the generic capability to set command 32. Capability alone is not reachable production.

### Complete statically resolved call review

The QName traits `_-b2M` and `_-A3j` are unique in this ABC and belong to class `_-E6o`. Cross-class call sites in methods 730-748 and 3317-3322 load field `_-854`, whose declared type is `_-E6o` in classes `_-d1H` and `_-u16`.

Every non-event call supplies a literal first argument in `{3, 4, 5, 6, 7, 8, 9, 13}`. None supplies 29. The per-caller counts make the call ledger complete:

| Mutator | Caller methods and call counts | First-argument values observed |
| --- | --- | --- |
| `_-b2M` | 730:3, 734:4, 735:1, 736:1, 737:1, 738:5, 739:5, 740:7, 741:1, 742:1, 743:1, 744:3, 745:2, 747:16, 748:1 | 3, 4, 5, 6, 7, 8, 9, 13 |
| `_-b2M` | 3318:1, 3320:1, 3322:2 | 6, 8, 9 |
| `_-b2M` wrappers | 4876:1, 4880:1, 4881:1, 4897:1, 4901:1, 4902:1, 4903:1, 4904:1 | 3, 4, 5, 6, 7, 8, 9, 13 |
| `_-A3j` | 738:1, 739:1, 746:1, 3317:1, 3319:1, 3321:2 | 3, 6, 8, 9 |
| `_-A3j` wrappers | 4883:1, 4884:1, 4885:1, 4888:1, 4890:1, 4891:1, 4892:1, 4893:1 | 3, 4, 5, 6, 7, 8, 9, 13 |

Methods 4900 and 4899 contain the remaining 7 setter and 6 clearer calls, respectively. Their switch handling resolves the disputed type 29 path:

- Key-down method 4900 obtains primary and secondary hotkey types from the two key maps. Its case 29 at `i325..336`, `pc851..881`, calls `_-b2M(4, secondaryType)` and then ORs literal 32 into `_‑U1F`. Since `_Q4s[4] == 1`, this event produces `1 | 32`, not standalone 32.
- Key-up method 4899 normalizes secondary type 29 or 3 to type 4 at `i174..190`, then its primary case 29 at `i255..267`, `pc645..675`, calls `_-A3j(4, secondaryType)` and explicitly clears literal 32. It clears the same pair.
- The generic/default switch arms pass the primary hotkey type, but case 29 does not reach those arms.

No `callstatic`, `newfunction`, or direct method-index reference targets methods 4895 or 4896. The complete QName call review above finds no standalone-32 event production.

## Controller poll: capability without a proven binding

Method 1974 `_-31f._-Bc` builds the controller command mask `_‑U1F`:

- `pc202..305` combines direct polling with direction result `Controller._-X4U(...)`.
- `pc305..380` loops through `Commands._-Ju`, calls `Controller._-Ly(mask)`, and ORs the return into `_‑U1F`. The loop syntactically reaches the entry containing command 32.

Method 1964 `Controller._-Ly`, `pc29..229`, requests the bound-control array for its supplied mask, tests raw values, and returns that same mask on success. Thus a real command-32 binding could return standalone 32, and method 6129 would record it without the raw-keyboard normalizer.

What is not proven is the antecedent: a configuration/parser/default path that supplies a nonempty binding for command 32. Method 1993 has explicit assignments for Dodge 256, Heavy 64, Jump 16, `JumpOnUp`, Light 128, Throw, and taunts, but no explicit command-32 assignment. Generic map cloning and the presence of an empty command entry do not prove a user-reachable binding. The prior conclusion inferred reachability from the poll's return behavior and is withdrawn.

## Method 4882 inventory

Method 4882 `_-E6o._-O53` is a parameterless 19-byte body:

```text
i2  pc2   findproperty _-U1F
i3  pc5   findproperty _-U1F
i4  pc8   getproperty  _-U1F
i5  pc11  pushbyte     32
i7  pc14  bitor
i8  pc15  initproperty _-U1F
```

If invoked while `_‑U1F == 0`, it could create standalone 32. Reachability findings:

- no instruction in any of the 15,010 bodies has a QName reference to `_-O53`;
- no `newfunction` or `callstatic` instruction references method index 4882;
- the ABC contains zero `callmethod` instructions;
- the `_-O53` trait is an ordinary instance method on reachable class `_-E6o`, with `disp_id == 0` and no interface declaration.

Runtime-name multinames can dispatch properties whose names are not statically present at the call site, so absence of static references is not proof of impossibility. Classification: **dormant/unresolved**. Method 4882 is not counted as a reachable producer.

## Proven recording and replay round-trip

Method 6129 `_-Tx._-91w` is the recorder used by the pre-tick controller pass in method 3217. It reads input-source `_‑U1F`, selects the active local controller mask, compares it with the prior mask, constructs `new _-O3Y(timestamp, mask)` at `i531..535`, `pc1150..1163`, and appends it to the timeline at `i576..587`, `pc1252..1278`.

Snapshot constructor method 4737 writes timestamp argument 1 and mask argument 2 unchanged. Replay writer 6521 iterates the timeline and writes timestamp plus the 14-bit mask unchanged at `i312..365`, `pc614..755`. Reader 6510 restores those 14-bit values, and loader 3507 reconstructs timeline snapshots.

The directly proven ordinary path is:

```text
Controller._-X4U upward direction -> 1 | 32
  -> source _-U1F -> recorder 6129 -> _-O3Y._-T4y
  -> writer 6521 -> reader 6510 / loader 3507
  -> sampler _-Tx._-72L -> gameplay method 6125
```

Network insertion similarly passes decoded `(timestamp, mask)` to timeline insertion without assigning semantics.

## Proven gameplay consumer

Method 6125 `_-Tx._-B1i` samples the timeline and computes rising edges:

- `i481..500`, `pc1001..1042`: `edge = (current XOR prior) & current`.
- Light edge 128 and heavy edge 64 retain the full current masks.
- Both attack paths call method 6146 at `pc2889..2924` and `pc3070..3106`.

Method 6146 `_-Tx._-l4J` consumes bit 32:

1. `pc92..100` derives ordinary direction as `mask & 15`.
2. `pc410..491` gives the down route priority.
3. `pc492..520` separately tests the original mask with `mask & 32`; when set, it calls `_-y42` and assigns selector 1.
4. `pc520..605` chooses horizontal/default handling only when bit 32 is absent.
5. `pc605..675` combines the selector with the light/heavy base, indexes `_‑Tx._-73T`, and invokes fighter power/action selection `_‑Y4C._-S45`.

Bit 1 is not part of the bit-32 test. This proves bit 32 has a distinct gameplay test and selects the Aim Up attack route. It does not prove that recorded input ever contains 32 without 1.

Replay HUD method 13649 separately tests `(mask & (1 | 32)) != 0` at `pc520..546` and intentionally displays the two commands in one Up channel.

## Literal-32 candidate audit ledger

### Query definition and corrected cardinality

The ledger covers every decoded body and every instruction whose resolved numeric operand equals 32:

- integer opcodes: `pushbyte`, `pushshort`, `pushint`, `pushuint`;
- all-numeric extension: `pushdouble`.

A ledger entry is `methodId:instructionCount`, in ABC method-body order. Integer and double lists are disjoint by body in this ABC.

| Cohort | Instructions | Method bodies |
| --- | ---: | ---: |
| Integer literal 32 | 511 | 267 |
| `pushdouble` 32 | 12 | 11 |
| All numeric literal 32 | 523 | 278 |

The prior note incorrectly called 511/267 the numeric total. It is only the integer cohort.

Known timeline-related dispositions are: 1960 ordinary paired producer; 4882 dormant/unresolved mutator; 4899 paired clear; 4900 paired producer; 6146 gameplay consumer; 6439 pairing normalizer; 13649 replay HUD union; and 14909 command/name initialization. Method 6283 uses a different `PowerType` descriptor domain and maps descriptor 32 to command bit 2. Every other numeric entry below remains an open numeric candidate rather than an exhaustively rejected one.

#### Integer literal 32, complete ledger

```text
8:1 22:1 46:2 579:2 580:2 589:4 594:2 600:2 726:2 733:1 754:7 771:1
862:2 882:2 1002:1 1052:4 1054:2 1107:1 1111:1 1167:1 1184:1 1188:1 1300:1 1436:2
1474:1 1475:2 1479:1 1484:2 1488:1 1496:2 1497:1 1498:1 1505:1 1509:1 1518:2 1551:2
1567:2 1576:2 1632:1 1855:1 1902:2 1903:2 1906:2 1960:7 1974:2 1981:1 1982:2 2038:1
2052:1 2053:1 2063:6 2239:1 2263:1 2305:1 2342:1 2469:1 2880:2 2882:1 2884:4 2887:2
2890:2 2892:2 2893:2 2894:3 2915:3 2916:2 2954:1 2988:2 3017:7 3027:1 3034:1 3040:3
3061:4 2790:9 3074:4 3191:4 3196:2 3216:9 3217:7 3218:1 3220:2 3236:1 3239:2 3242:2
3249:2 3295:1 3328:1 3334:1 3335:2 3336:1 3343:1 3351:1 3352:1 3353:1 3358:1 3359:1
3374:1 3378:2 3380:5 3415:2 3423:2 3424:4 3425:4 3430:1 3438:1 3484:2 3485:2 3486:2
3509:2 3662:1 3766:1 3982:1 4683:1 4752:2 4792:1 4877:3 4882:1 4886:1 4899:4 4900:4
4936:1 4983:1 4987:1 4989:1 5004:2 5007:1 5119:1 5442:1 5736:1 5769:1 5796:2 5797:1
5798:2 5800:1 5801:2 5802:1 5822:1 5876:1 5877:1 5882:1 5886:1 5887:1 5954:3 5967:3
6125:2 6129:3 6135:1 6138:2 6140:2 6146:1 6156:1 6167:1 6302:6 6303:1 6283:1 6270:1
6437:2 6439:2 6520:2 6521:2 6522:2 6523:2 6524:4 6590:1 6593:2 6716:2 7114:1 7129:1
8191:1 8202:1 8206:1 8207:1 8217:1 8254:1 8386:1 8530:1 8596:1 8597:3 8599:1 8602:2
8607:2 8617:1 8768:2 8991:1 9058:1 9076:1 9251:1 9440:1 9455:2 9458:1 9464:1 9863:5
9983:1 9989:1 9996:1 10248:2 10265:2 10426:2 10440:2 10441:2 10457:2 10697:1 10732:2 10740:1
10753:1 10756:1 10764:1 10779:1 11122:5 11200:2 11252:6 11236:2 11389:1 11725:1 11766:1 11769:1
11777:2 11781:1 11786:1 11787:1 11764:1 12629:1 12680:2 12714:1 12693:1 12706:1 12724:2 12807:2
12870:2 12875:2 12936:1 12940:1 13131:1 13147:1 13170:1 13217:1 13218:1 13243:1 13258:1 13260:1
13265:1 13272:3 13288:1 13308:1 13309:1 13432:1 13649:3 13864:2 14034:2 14429:1 14430:1 14431:1
14433:1 14522:2 14564:1 14566:1 14568:1 14569:1 14570:1 14571:1 14797:1 14799:1 14807:1 14909:45
14954:1 14945:1 14948:1
```

#### `pushdouble` 32, complete ledger

```text
9867:1 9920:1 12384:1 12544:1 13169:1 13277:1 13283:2 13287:1 13311:1 13563:1 13598:1
```

This ledger makes the cohort count auditable without committing proprietary data or generated dumps. It does not by itself prove consumer exhaustiveness. In particular, numeric coincidence is not field identity, and a consumer can receive 32 through a property or computed expression without embedding literal 32.

## Replay cohort corroboration

The hash-gated format-268 analyzer reports:

```json
{
  "replayCount": 12,
  "inputSnapshots": 49874,
  "inputBitCounts": {
    "1": 6724,
    "32": 6288
  },
  "bit32WithBit1": 6288,
  "bit32WithoutBit1": 0
}
```

All 12 individual files report zero `bit32WithoutBit1`. This corroborates ordinary paired production. It neither proves nor disproves a rare standalone path outside the cohort.

## Reproduction and validation

Pinned hash, size, and build:

```bash
shasum -a 256 artifacts/research/brawlhalla-physics/main.abc
wc -c artifacts/research/brawlhalla-physics/main.abc
strings artifacts/research/brawlhalla-physics/main.abc | grep -F '10.09.96325'
```

All-body decode and branch validation:

```bash
bun tools/avm2-provenance/movement_provenance.ts \
  --abc artifacts/research/brawlhalla-physics/main.abc \
  --target grounded-jump-y
```

Expected identity fields are SHA-256 `9fe9c830...bcfba2d`, build `10.09.96325`, `methodsDecoded: 15010`, `branchTargetsValid: true`, `status: proven`, and no decoder blockers.

Cohort validation:

```bash
cd tools/avm2-provenance
git show research/replay-format-268-semantics:tools/avm2-provenance/replay_format_268_analysis.ts | \
  bun run - -- \
    --abc ../../artifacts/research/brawlhalla-physics/main.abc \
    --manifest ../../artifacts/replay-corpus/10.09.96325/manifest.json
```

The analyzer hash-gates the ABC, manifest, and replay files and must reproduce the aggregate above.

## Conclusion and residual blockers

Directly proven answer:

- command value 32 is named **Aim Up**;
- ordinary Up production emits `1 | 32`;
- keyboard hotkey 29 also emits and clears 1 and 32 together on the reviewed reachable event path;
- replay serialization and restoration preserve the timeline mask;
- method 6146 tests bit 32 separately for attack selection;
- the reviewed cohort contains no standalone-32 snapshot.

Not proven:

- a reachable standalone-32 producer;
- reachability or impossibility of runtime-name invocation of method 4882;
- an actual command-32 controller binding reaching `Controller._-Ly(32)`;
- exhaustive classification of every possible independent timeline consumer.

**Confidence:** high for identity, paired production, replay round-trip, and method-6146 consumption. **Ticket acceptance is not honestly met.**
