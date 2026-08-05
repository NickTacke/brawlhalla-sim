# Format-268 input bit 32 in Brawlhalla 10.09.96325

Issue: [Recover input bit 32 producer and meaning](https://github.com/NickTacke/brawlhalla-sim/issues/19)

## Resolution

**Verified.** Format-268 input-mask value `32` is **Aim Up**. It is not a duplicate name for value `1` (`UP`), although ordinary upward directional input deliberately produces both bits.

The pinned ABC contains two semantic production forms:

1. `Controller._-X4U`, method 1960, converts every upward stick/axis direction to `1 | 32`. This is the production form corroborated by the cohort.
2. The keyboard/hotkey path in class `_-E6o` maps hotkey type 29 to command `32` and can set or clear it through the generic command mutators in methods 4896/4895. This is an independent production path. The raw-keyboard path `_-45g._-x2X`, method 6439, instead normalizes `1` and `32` into a pair.

Bit 32 has gameplay meaning independent of bit 1. The fighter input helper `_-Tx._-l4J`, method 6146, tests the held attack snapshot with `mask & 32` without testing bit 1, selects its Aim Up/neutral-attack direction route, resolves an action through `_-Tx._-73T`, and calls the fighter power manager. This helper is reached for both light and heavy attack edges from method 6125. The only other bit-32 interpretation of a replay timeline is the replay HUD's intentional `(1 | 32)` display union in method 13649.

The 12-replay cohort does not exercise the independent form: all 6,288 bit-32 snapshots also have bit 1. That observation is consistent with the ordinary directional producer, but it is not evidence that the bits are semantically identical.

Severity: informational research resolution. No simulator defect was assessed in this ticket.

## Evidence identity and notation

All static claims below come from this local primary artifact:

| Property | Value |
| --- | --- |
| Path | `artifacts/research/brawlhalla-physics/main.abc` |
| Build string | `10.09.96325` |
| Bytes | `3,934,088` |
| SHA-256 | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` |
| Decoded method bodies | `15,010` |
| Decoder dependency | `abc-disassembler` revision `ad9714d`, pinned by `bun.lock` |
| Decode validation | every decoded `s24` and lookup-switch target reached an instruction boundary or permitted `code_length` target |

`i` is the zero-based decoded instruction ordinal. `pc` is the original method-local byte offset. Byte PCs are the instrumentation authority. Names were resolved with the ABC string pool's required `index - 1` correction. The older `disasm_*.txt` files were used only as search hints, not as naming authority.

The replay corroboration used the ignored local manifest `artifacts/replay-corpus/10.09.96325/manifest.json` and these 12 user-owned format-268 files, identified only by SHA-256:

```text
010f78c85af90f1fbfef00e9b09583c3f5a04d63526f4e368f9de6e1e50f74ba
31457427af337318846d2cc3890449160b10a9bf74cac8d512c626364f69dd0e
3bb52453a44d4ce3bc9789f3aa98ed9dd153b5036874a100f2567d999fa9557f
48734a529b3999851c43c983370fef25c12a75fcb455667b33b24a483d791284
5f5bb9aefd4c8edf85dc3593e913cb7977276e1d40a570645a17f7718f91dd7e
66da11ce37ccf07a660034d012c54353fe0d33953be96c3d826f22fb71b56b0f
84ecfe20a8c9c08f1a58a6068f003b910205cde966ef235d208cd314de9f3770
89e92cec682b879e9e577b5ab763cf4811197d9bdcc6580e7e2b3d2d4361efca
bcc173cb790fbd28adef778901994d27d0d7a366ac92d8bdfe76d8122498b165
bf0ac1ed57afdc529ab218bb1861d79baf53b12a6809d6e9cbaa0bf02e23b955
ea7ae8c364a3d02062f0803ac716146c2527b30e92cfaa90522fccfb0a499c26
fdd31d19d49ca2857fe294ff187e2a1eb1eda6fdcf0986018eee478501693a1c
```

No replay bytes or manifest are committed by this branch.

## Command identity

### Constant and command-order initialization

Method 14909 establishes the input-command domain:

- `i6882..6885`, `pc18921..18932`: initializes `Commands._-a4v = 32` between command 16 and command 64.
- `i7076..7080`, `pc19364..19372`: inserts `16, 32, 64` in order into `Commands._-Ju`. Method 1974 iterates this array when polling non-direction commands.
- `i8092..8098`, `pc21982..21997`: stores `Commands._-Q4s[29] = 32`. `_-Q4s` maps hotkey-type IDs to command masks.
- `i24032..24084`, `pc63194..63294`: parallel vectors place hotkey ID `29` beside localization key `Command_Name_AimUp`. The preceding entry is hotkey ID `4` beside `Command_Name_JumpAimUp`; the following entry is ID `3` beside `Command_Name_Jump`.

The readable nonlocalized setup independently agrees: method 3456 `_-u16._-o34`, `i1289..1294`, `pc3632..3648`, registers the label `Aim Up` with hotkey ID 29.

Together these direct ABC links prove:

```text
hotkey type 29 -> Commands._-Q4s[29] -> mask 32 -> Command_Name_AimUp / "Aim Up"
```

This conclusion does not depend on an inferred control name or a secondary source.

### What controller parser 1993 does and does not do

Method 1993 `_-J6k._-H2x` parses controller-mapping records:

- Dodge `256`: `i145..165`, `pc387..449`.
- Heavy `64`: `i167..187`, `pc453..514`.
- Jump `16`: `i189..209`, `pc518..579`.
- `JumpOnUp`: `i211..219`, `pc583..610`, stored in `_-k31`.
- Light `128`: `i221..241`, `pc614..675`.
- Taunts and Throw continue through `i461`, `pc1311`.
- Its generic branches `i463..522`, `pc1315..1479`, accept only keys found in preinitialized command-name maps.

There is no parser branch assigning 32. This is meaningful negative evidence, not a missing label. Aim Up is supplied by direction decoding and the hotkey-type mapping, while `JumpOnUp` is separate: method 1974 `i187..210`, `pc438..495`, sees command bit 1 plus parsed `_-k31` and adds jump bit 16. It does not create Aim Up bit 32.

Mapping clones still contain every command key. Methods 1994/1995 clone over `Commands._-65b`; method 1628 builds `_-65b` from every `Commands._-Ju` entry. An unbound Aim Up entry is therefore empty rather than structurally absent.

## Complete producer-to-timeline dataflow

### GameInput/controller producer

Method 1974 `_-31f._-Bc` builds `_-31f._-U1F`, the local controller's command mask:

1. `i88..130`, `pc202..305`: combines a directly polled command with `Controller._-X4U(...)`.
2. `i131..161`, `pc305..380`: loops command indices 4 through `Commands._-k5O - 1`, loads `Commands._-Ju[index]`, calls `Controller._-Ly(mask)`, and ORs the returned command into `_-U1F`.
3. Because `_Ju[5] == 32`, this loop contains an independent `Controller._-Ly(32)` poll.

Method 1964 `Controller._-Ly`, `i15..100`, `pc29..229`, obtains the bound-control array from `_-J6k._-83l(false, mask)`, tests each raw value against its threshold, and returns the supplied mask on success. Thus a bound Aim Up control returns 32, not `1 | 32`.

Method 1960 `Controller._-X4U` is the ordinary direction producer. Every branch that classifies a direction as upward emits `1 | 32`:

| Direction decoder region | Original byte PCs | Result form |
| --- | ---: | --- |
| enumerated axis positions | `227..247`, `263..287`, `307..331` | `1 | 32`, optionally with horizontal bit 4 or 8 |
| digital up control | `721..738` | OR `1 | 32` |
| first analog-vector branch | `1159..1202` | OR `1 | 32` |
| analog helper call | `1478..1583` | supplies `1 | 32` as the up mask |
| second analog-vector branch | `1784..1845` | OR `1 | 32` |

There is no upward branch in method 1960 that emits 1 without 32. This is why normal upward direction naturally creates the cohort's pairing.

### Keyboard/hotkey producer

Class `_-E6o` handles the keyboard/hotkey form:

- Method 4896 `_-b2M`, `i5..24`, `pc7..52`, reads `Commands._-Q4s[hotkeyType]` and ORs that command into `_-U1F`.
- Method 4895 `_-A3j`, `i5..25`, `pc7..53`, reads the same mapping and clears that command from `_-U1F`.
- Therefore key-down/key-up for hotkey type 29 independently set/clear bit 32.
- Event handlers 4900 `_-C2S`, `i227..272` and `i325..336`, `pc460..691` and `pc851..881`, call the generic setter and also contain the special Up/Jump co-production branch. Method 4899 `_-WS`, `pc570..600` and `pc658..675`, performs the matching clear.

The alternate raw-keyboard source `_-45g._-x2X`, method 6439, is deliberately paired instead of independent. At `i170..187`, `pc376..430`, UP plus its control setting adds 32; at `i188..203`, `pc430..469`, any raw bit 32 adds bit 1. Its final timeline mask therefore cannot retain bit 32 without bit 1.

### Recording into `_-O3Y` snapshots

The authoritative recorder is `_-Tx._-91w`, method 6129, called from the pre-tick controller pass in method 3217.

For the local sources, method 6129:

1. reads the `_-U1F` command field from input-source objects and merges any pending command field at `i108..139`, `pc200..283`;
2. selects the local `_-31f._-U1F` at `i214..250`, `pc444..526` when that controller is active;
3. compares the completed mask with the prior mask;
4. constructs `new _-O3Y(timestamp, mask)` at `i531..535`, `pc1150..1163`;
5. appends it to recorded `_-W5y` or pending `_-P4G` at `i576..587`, `pc1252..1278`; and
6. stores the timestamp and last mask at `i588..594`, `pc1278..1294`.

The snapshot constructor, method 4737, writes argument 1 to timestamp `_-D6c` and argument 2 unchanged to mask `_-T4y` at `i2..7`, `pc2..16`.

Network insertion is a pass-through, not a semantic producer: LinkUpdater methods 5351, 5354, and 5426 pass decoded `(timestamp, mask)` to `_-Tx._-Q5z` method 6128. Replay loading is also a pass-through: method 3507 constructs `_‑O3Y(timestamp, mask)` and inserts it through `_-PB` at `i247..259`, `pc618..654`.

### Format-268 serialization and restoration

Writer method 6521 `_-16._-i3b` iterates `_-Tx._-W5y` and writes each snapshot's timestamp and 14-bit `_-T4y` unchanged at `i312..365`, `pc614..755`. Reader method 6510's state-1 branch restores the 14-bit values at `i147..267`, `pc374..652`; method 3507 then reconstructs the same timeline as described above.

The complete ordinary local path is therefore:

```text
Controller._-X4U upward direction -> 1 | 32
or Controller._-Ly(32) / _-E6o hotkey 29 -> 32
  -> input-source _-U1F
  -> _-Tx._-91w (6129)
  -> _-O3Y._-T4y
  -> _-Tx._-W5y
  -> replay writer 6521, 14-bit mask
  -> replay reader 6510 / loader 3507
  -> _-Tx._-72L sampler
  -> fighter consumer 6125
```

## Independent gameplay consumer

Method 6125 `_-Tx._-B1i` samples the timeline and computes rising edges:

- `i481..500`, `pc1001..1042`: `edge = (current XOR prior) & current`.
- A light edge (128) saves the full current snapshot into local 19 at `i520..534`, `pc1074..1099`.
- A heavy edge (64) saves the full current snapshot into local 21 at `i541..555`, `pc1110..1135`.
- The light and heavy paths pass those full masks to `_-l4J` at `i1453..1470`, `pc2889..2924`, and `i1547..1565`, `pc3070..3106`.

Method 6146 `_-Tx._-l4J` is the independent gameplay consumer:

1. `i40..45`, `pc88..100`: derives ordinary direction bits as `mask & 15`.
2. The down route has priority at `i194..235`, `pc410..491`.
3. `i236..249`, `pc491..520`: separately tests the unstripped held mask with `mask & 32`; if set, it calls `_-y42` and sets direction selector 1.
4. `i251..289`, `pc520..605`: only when bit 32 is absent does it choose the horizontal/default route.
5. `i290..322`, `pc605..676`: combines the selector with the light/heavy action base, indexes `_-Tx._-73T`, and calls `_-Y4C._-S45`, the fighter power/action selection entry.

Bit 1 is not part of the bit-32 test. A dedicated Aim Up input can therefore modify attack selection while bit 1 is absent. In product terms, Aim Up selects the neutral/up-aim attack route while allowing directional/facing handling without requiring the Up/Jump command. This is a simulation consumer, not merely a display alias.

Method 6125 has no direct literal-32 test because the test is delegated to method 6146. Looking only at method 6125 was the source of the earlier gap.

## Other consumers and non-consumers

### Replay HUD

Method 13649 `_-11Q.Tick` locates the applicable replay snapshot, reads `_‑O3Y._-T4y`, and tests `(mask & (1 | 32)) != 0` at `i267..281`, `pc520..546`. It then calls one of two HUD update routines. This deliberately displays ordinary Up and dedicated Aim Up in one visual channel. It is a UI consumer, not evidence that the gameplay bits are aliases.

### Input normalization

Method 6439 `_-45g._-x2X` is also a bit-32 consumer inside production: `pc430..469` tests raw bit 32 and adds bit 1. It normalizes a raw-keyboard source before recording and has no independent fighter effect beyond the resulting timeline mask.

### Exhaustively rejected alternatives

A full QName/use-def search found no second bit-32-specific consumer reachable from `_‑O3Y._-T4y`:

- `_‑T4y` has 37 opcode references in 12 method bodies. Apart from construction, copying, diagnostics, serialization, and sampling, the only direct bit-32 interpretation is HUD method 13649.
- Sampler `_‑Tx._-72L` has 10 opcode references. Its callers are methods 1568, 1569, 6125, and 6126. Methods 1568/1569 compress timeline changes without interpreting bit 32. Method 6126 copies a sampled mask into current-mask field `_‑th`. The gameplay taint continues through method 6125 to method 6146 as proven above.
- `Commands._-a4v` has one direct property reference, its initialization in method 14909. Generated code uses the literal, `_Ju`, or `_Q4s` rather than reading that field.
- The two calls to `_‑Tx._-l4J` in the ABC are both the light/heavy sites in method 6125.
- Fighter movement and jump tests use bits 1, 2, 4, 8, 15, 16, 64, 128, 256, 512, and taunt chords as appropriate. No movement or jump path tests command bit 32.

The whole-ABC literal scan decoded all 15,010 bodies and found 511 numeric-literal-32 instructions in 267 methods, with 315 near a bit operation. Candidates were classified by field identity and use-def, not by numeric coincidence. Important rejected numeric domains include global UI/lifecycle flags, cryptographic 32-bit rotations, bot-planner flags, and `PowerType._-422`. In the last domain, method 6283 maps descriptor bit 32 to command bit 2 (DOWN), proving it is not a consumer of timeline command 32.

No additional independent production or consumption path from the format-268 timeline mask was found in the pinned ABC.

## Cohort corroboration

The hash-gated format-268 analysis produced:

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

All 12 individual files also report zero `bit32WithoutBit1`. This strongly corroborates the ordinary `Controller._-X4U` and raw-keyboard paired producers. It does not exercise or disprove the independent hotkey-29 producer and method-6146 consumer. The ABC itself supplies the acceptance-level evidence for those paths.

## Reproduction and validation

Hash, size, and build:

```bash
shasum -a 256 artifacts/research/brawlhalla-physics/main.abc
wc -c artifacts/research/brawlhalla-physics/main.abc
strings artifacts/research/brawlhalla-physics/main.abc | grep -F '10.09.96325'
```

Full decode and branch validation:

```bash
bun tools/avm2-provenance/movement_provenance.ts \
  --abc artifacts/research/brawlhalla-physics/main.abc \
  --target grounded-jump-y
```

The output must identify SHA-256 `9fe9c830...bcfba2d`, build `10.09.96325`, `methodsDecoded: 15010`, `branchTargetsValid: true`, and no errors.

Cohort analysis, using the hash-gated analyzer from the prior research branch without writing a helper file:

```bash
cd tools/avm2-provenance
git show research/replay-format-268-semantics:tools/avm2-provenance/replay_format_268_analysis.ts | \
  bun run - -- \
    --abc ../../artifacts/research/brawlhalla-physics/main.abc \
    --manifest ../../artifacts/replay-corpus/10.09.96325/manifest.json
```

For exhaustive command-bit review, decode every body with the same `abc-disassembler` dependency, attach original byte PCs by decoding each opcode's operand widths, then perform these queries:

```text
numeric literal 32 across all bodies
QName references: Commands._-a4v, _-O3Y._-T4y, _-Tx._-72L, _-Tx._-th
call references: _-Tx._-l4J
use-def from _-U1F/T1X -> method 6129 -> _-T4y -> method 6125 locals -> method 6146
```

The reviewed cardinalities are 511 literal-32 instructions in 267 methods, 37 `_‑T4y` references in 12 bodies, 10 `_‑72L` opcode references, one `Commands._-a4v` property reference, and two `_‑l4J` calls.

## Conclusion, confidence, and residual gaps

**Conclusion:** value 32 is the separately named **Aim Up** command. Ordinary directional Up co-produces `1 | 32`; a dedicated hotkey type 29 can produce 32 independently. The independent gameplay consumer is attack selection in method 6146. The replay HUD separately unions bits 1 and 32 for display. Bit 32 is not consumed by movement or jump logic.

**Confidence: high / verified.** The name, independent producer, timeline storage, serializer width, replay restoration, fighter call path, and gameplay consumer all have direct instruction-level evidence in the hash-pinned ABC. The exhaustive whole-body scan found no other timeline consumer.

Residual gaps do not block acceptance:

- The cohort has no `32`-without-`1` snapshot, so it cannot show which user/device configuration exercises dedicated Aim Up in practice.
- Without an instrumented capture, the 6,288 paired observations cannot be attributed per entity to `Controller._-X4U`, `_-45g`, or a co-producing keyboard configuration.
- Obfuscated action-selector names prevent a readable internal name for `_‑Tx._-73T` selector 1. Its control-flow role as the Aim Up/neutral-attack route is proven by the readable hotkey identity and power-manager call, but a localized move-category label is not stored at that site.
