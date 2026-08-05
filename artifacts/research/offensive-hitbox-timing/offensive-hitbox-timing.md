# Offensive hitbox placement and timing in Brawlhalla 10.09.96325

Issue: [Locate offensive hitbox placement and timing](https://github.com/NickTacke/brawlhalla-sim/issues/34)

## Verdict

**Bounded static closure, but the ticket's universal acceptance condition is not proved.** The pinned `powerTypes` table is the authoritative declarative source for offensive phase timing and local geometry. Its `CastTime`, `AoERadiusX`, `AoERadiusY`, `CenterOffsetX`, and `CenterOffsetY` columns are parsed by `PowerType` method 6294 `_-L4o`, normalized into per-phase vectors, selected by active-power tick method 46 `_-M5v._-81I`, and forwarded to collision-region creation through method 10239 `_-z1K._-j5S` and static method 13561 `_-b20._-S4l`.

`hurtboxTypes` does not supply offensive hitboxes. It supplies frame-ranged defensive hurtbox rectangles keyed by `HurtboxName`, `AnimClass`, `AnimName`, and `Frames`. A power's `Hurtbox` column selects one of those defensive records while that power runs. The inspected `SFX_*.swf` and `Gfx_*.swf` references are presentation inputs reached through `CastGfx`, `FireGfx`, and `HitGfx`; their display-object `scaleX` writes are not in the offensive collision geometry path.

The static chain proves where serialized phase timing and local placement come from, the four geometry values passed for each selected phase, the branch shape of the horizontal facing transform, several target filters, and pairwise priority arbitration. It does **not** prove:

1. which of all 3,671 power records and combo/background phases are reachable from every replay-producing configuration;
2. the collision primitive implemented behind `_b20` strongly enough to name every shape as rectangle, ellipse, capsule, or another primitive;
3. exact activation observations and arbitration outcomes for every reachable phase without an authenticated interpreted-runtime trace;
4. complete target-policy semantics for all 44 `TargetMethod` names; or
5. whether any uninspected owner/bone transform enters later collision code outside the closed four-field creation call.

Those are acceptance blockers, not inferred defaults. Confidence is **high** for source ownership, parser identity, normalized field identity, creation-call ordering, table counts, and the listed control-flow anchors. Confidence is **insufficient** for the universal “every reachable phase” contract.

## Evidence grades

- **Proven:** exact hash-pinned source value or exact typed-QName AVM2 control/dataflow, with valid branch targets.
- **Bounded closure:** every row of a pinned source and every exact QName reference to the named normalized fields is included in a fixed ledger.
- **Presentation-only on the reached path:** a SWF reference is consumed through GFX fields and display-object writes, while the offensive collision call independently consumes table-derived numeric vectors.
- **Unknown:** the inspected static evidence does not settle the claim.

Prior notes and repository code were locators only. Claims below derive from user-owned primary inputs and the committed fail-closed analyzer.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Parser, active-power tick, collision creation, filters, arbitration |
| Sole semantic build string | `10.09.96325` | Build identity |
| Parent `BrawlhallaAir.swf` | `40df9af5308b9a17bf015feb38edec6d9bea57d1cd53078d298aa725acceb8b2` | Same installed build containing the pinned ABC |
| Parent `Game.swz` | `4fc9d70c1c3642b7d3e61c8bb0062bb57c46ea2169276ca1d33616a5843d4aff` | Parent source archive identity |
| Extracted `powerTypes` | `715468d8eda8fa2ec3d88a8b5395c076bec937640927909add4745eda2883f27` | 182-column, 3,671-record power source |
| Extracted `hurtboxTypes` | `358aac8501dbf9051c22c7f14c8eef72a16cd0a071ad2ef398ab6695286e3333` | 10-column, 906-record defensive hurtbox source |
| `Dynamic.swz` | `cd54de039bc4e3441a7ae5811ef8748a719f49e0d4917016407d83b201ddf9c4` | Installed-build archive identity; no offensive geometry edge reached |
| `Engine.swz` | `aa5b25d0351b7c2c41ccfc588f9bd7ece0c21adb4d4034aa2416d5101684f8dc` | Installed-build archive identity; no offensive geometry edge reached |
| `Init.swz` | `bfb56c12517b7a95927feaca7180d5a85b6952d4d53e76e614ffc06bf4fe067b` | Installed-build archive identity; no offensive geometry edge reached |
| `SFX_HitReacts.swf` | `861255f3cc7e5daf6016ce3c9ec881ae462685adb8c3053df94d59fd88b4ff2d` | Focused `HitGfx` presentation reference |
| `SFX_Sword.swf` | `7d12010365504b761271ccfac9beb4b94ee87a09c1fa42ac6dfb551418a889cb` | Focused weapon GFX presentation reference |
| `Gfx_Barbarian.swf` | `97b0a0cf93ef234b134ab0ad5e97676481223b8da1917bb8334fabb78e135176` | Focused character presentation reference |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |

The installed archive identities match the build cohort used by the existing 10.09 evidence. No asset from an unverified install was mixed into the result.

## Source ownership

### PowerTypes owns offensive phase geometry

The exact source header has 182 columns. The five columns that form the serialized offensive phase description are:

| Column | Normalized `PowerType` field | Meaning proved here |
| --- | --- | --- |
| `CastTime` | `_-i57` plus associated phase-index vectors | Phase duration and optional scheduled/ranged expansion syntax |
| `AoERadiusX` | `_-i45` | X radius value forwarded for selected phase |
| `AoERadiusY` | `_-h2W` | Y radius value forwarded for selected phase |
| `CenterOffsetX` | `_-K5E` | Local X offset forwarded for selected phase |
| `CenterOffsetY` | `_-Ie` | Local Y offset forwarded for selected phase |

Method 6294 reads the five names at byte PCs 2348, 1152, 1219, 2389, and 2456. It splits every column first on commas. Geometry strings containing `&` set the simultaneous-hit flag; method 6294 rejects a simultaneous-hit declaration unless the related shape fields agree. It then applies the same static helper `PowerType._-i4n` to each serialized field and the selected cast phase:

```text
CastTime comma entry
  -> parsed duration/range vectors
  -> PowerType._-i4n(raw field, normalized vector, phase index, phase extent)
  -> _-i45 / _-h2W / _-K5E / _-Ie
```

The source contains 1,845 records with at least one nonempty geometry expression other than the scalar literal `0`, and 6,329 serialized top-level geometry slots when offset-only slots are included. Three of those records use composite expressions whose numeric terms are all zero, so 1,845 is a syntax-bearing inventory, not a claim that every record creates a nonzero collision region. It is also not a reachability count.

The full source phase ledger is `fcaee09b3adb51a9e133d1aa0d963ad15481aeba361eee3145d4891e62295e92`. It covers `PowerName`, `TargetMethod`, and all five phase columns for all 3,671 records.

### CastTime grammar proved by the parser

For each comma-delimited `CastTime` entry, method 6294:

1. rejects `t` and `|`; it rejects `~` except in the specifically diagnosed NewTiming keyframe-range form;
2. accepts a leading integer duration;
3. when `:` is present, parses the suffix as a count/extent component;
4. when `@` is present, parses a scheduled keyframe component;
5. when the `@` suffix contains `-`, inserts both range endpoints through `_-p3o` (byte PCs 11489 and 11545);
6. expands the normalized `_-i57` duration vector and parallel phase-index vectors for the resulting phase extent.

The exact delimiters observed in the pinned table are scalar, comma, colon, at-sign, and hyphen combinations. One template row contains `t`; method 6294 returns before processing the `Template` record, so it is not a runtime phase.

The evidence proves parser operations and resulting vectors. Human-readable names such as “startup”, “active”, and “recovery” are not present in this path, so this report calls the nonzero selected entries **active phase durations** only where method 46 uses them to admit collision creation.

### HurtboxTypes owns defensive frame rectangles

The exact 10-column header is:

```text
HurtboxName,HurtboxID,AnimClass,AnimName,Width,Height,OffsetX,OffsetY,Frames,IgnoreHeightValidation
```

Static method 4655 `_-o1U._-E2Z` reads `HurtboxName`, `Frames`, `OffsetX`, `OffsetY`, `Width`, and `Height` at byte PCs 88, 340, 379, 420, 461, and 501. Each field is comma-delimited; `Frames` uses scalar frames and inclusive-looking textual ranges such as `1-5`. The parser validates synchronized list lengths and builds the `HurtboxType` registry.

Of 906 records, 886 have an explicit `Frames` value and 901 have a non-placeholder `AnimClass` reference. The complete defensive ledger, which also includes `AnimName`, is `a3d7d50dd9791c7e0cb8a2741fbefb9abac075966c31ffe4b3890076164187d0`.

Power initialization method 59 reads `PowerType._-114`, the parsed `Hurtbox` column, and resolves it through `_-o1U._-g5S` at byte PC 148. This changes the actor's defensive hurtbox while the power runs. None of `Width`, `Height`, `OffsetX`, or `OffsetY` from HurtboxTypes feeds the four offensive geometry arguments in method 46.

## Static execution into collision-region creation

### Phase selection and active window

Method 46 `_-M5v._-81I` is the active-power tick. It uses `PowerType._-i57` twice:

- it bounds the current phase index against vector length;
- it increments the phase cursor and reads the selected duration before advancing the active-power state.

At byte PCs 3141, 3159, 3177, and 3195, the same selected phase index reads `_-K5E`, `_-Ie`, `_-i45`, and `_-h2W`. At byte PC 3236, the method calls `_-z1K._-j5S` with those four values in the exact order:

```text
local center offset X
local center offset Y
X radius
Y radius
```

Method 10239 passes them to static `_b20._-S4l`, constructs one `_b20` collision region, and queues it. Simultaneous `&` entries are expanded by the parser into parallel normalized phase entries before this call.

This establishes static per-tick sourcing. It does not provide an authenticated runtime observation for every reachable phase.

### Facing and local-to-world placement

Static method 13561 constructs `_b20` and applies the selected PowerType offset at an index returned by `PowerType._-03K`.

- In its direct-source branch, it subtracts selected X and Y offsets at byte PCs 173 and 190.
- In its explicit-point branch, the horizontal flag chooses subtraction or addition of selected X at byte PC 311; Y is subtracted.
- It writes the resulting center through `_b20._-J4i` at byte PC 353.
- It writes X/Y radii through `_b20._-j4Z` at byte PC 364.
- It associates the source entity and optional target point through `_b20._-w2C`.

This proves the sign-changing horizontal placement branch and the absence of a SWF display scale read in this creation path. The boolean's unobfuscated semantic name and any later owner/bone transform remain unknown. `ForcePowerFacing` (`_-h2Q`) is separately consumed by GFX method 1558 as a display-object `scaleX` write; that is not evidence that SWF scale changes collision geometry.

### Shape

The source calls its numeric fields `AoERadiusX` and `AoERadiusY`, and `_b20._-j4Z` stores the selected pair. This proves an axis-aligned center-plus-two-radii representation at creation. It does **not** prove the intersection primitive behind `_b20` from the focused trace. Calling every region an ellipse, rectangle, or capsule would exceed the evidence.

## Target filters and arbitration

The target-filter ledger is `5e40d8e2e8d010e5427dd0437462404c7a771919a9056608e4df3d03c14416ed`. It covers `Priority`, `CanDamageEveryone`, `MinTimeBetweenHits`, and `InheritAlreadyHit` for every power.

### TargetMethod

Method 6294 parses `TargetMethod` at byte PC 8694 into flags and a target-mode enum. The pinned source has 44 nonempty names. Prefixes such as `SmashRelease` are decomposed before the remaining exact target name is dispatched. The names include actor-centered, ranged, path, collider, grab, ground-check, taunt, and combination forms.

The analyzer pins the complete 44-name source set as SHA-256 `3975339aa087d48d9490a5a4bc83df5cd78c4eabcf4a9d528bad73e5532e0223` while omitting the raw names from output, and it pins the parser entry. Static name-to-flag parsing is proved by the focused parser trace; complete gameplay semantics for all 44 names is not.

### Team and everyone filters

Method 1484 `_-Wv._-S6I` reads `CanDamageEveryone` (`_-n59`) at byte PC 701. When false, it compares source and target team/owner fields and applies mode masks before admitting the hit. When true, that same-team exclusion path is bypassed. This is the exact static basis for the broad-target override.

`CanAssist`, throw/grab state, mode masks, dead/invulnerable actor state, and owner identity appear in the surrounding filter. Their complete policy matrix is not named here because the inspected identifiers are obfuscated and no universal runtime trace closes their combinations.

### Repeated and inherited hits

- `MinTimeBetweenHits` becomes `_-s2L`. Method 1540 reads it at byte PC 399 and adds it to prior per-target hit time before comparing with the current tick.
- `InheritAlreadyHit` becomes `_-46W`. Method 1538 reads it at byte PC 462 to choose whether the combo phase uses the existing source power's already-hit set.
- The parser's `&` simultaneous form initializes `_-q5u`; methods 6274, 6288, 6289, and 6291 consume that encoding to map parallel shape entries and inherited phase state.

These prove the named gates, not every cross-field outcome.

### Pairwise arbitration order

Method 1474 `_-Wv._-Z29` performs pairwise arbitration over queued candidates:

1. compare `PowerType._-JB` priority (byte PCs 1765 and 1773);
2. if unequal, reject the lower-priority candidate;
3. if equal, compare exact candidate field `_-F5f`;
4. if still tied, compare exact candidate field `_-V6R`;
5. mark the losing candidate `_-J2T` before accepted candidates continue to `_-S6I` filtering.

`Priority` defaults to 50 in the PowerType constructor. Method 6294 clamps an explicit source value to 0 through 100 before storing `_-JB`.

The tie-break field order is proven. Their unobfuscated semantic names and a runtime trace proving stable outcomes for every same-tick candidate set are unknown.

## SWF timeline, symbol, and bone disposition

The table contains explicit `CastGfx.*`, `FireGfx.*`, and `HitGfx.*` columns. In the pinned source:

- `SFX_HitReacts.swf` is the dominant `HitGfx.AnimFile`, paired with source-declared symbols such as `a_HitReact01`;
- weapon SFX files such as `SFX_Sword.swf` are referenced with attack and hit presentation symbols;
- HurtboxTypes pairs character animation classes/names with defensive rectangle records.

Focused same-build files were identity-checked above, but their timelines were not exhaustively decoded. The reached AVM2 GFX path, including method 1558, loads animation class/name/scale and mutates display-object `scaleX`. The offensive creation path instead reads only the normalized PowerType numeric vectors and source/target state. No exact edge from a SWF PlaceObject matrix, symbol timeline, or bone transform is reached before `_b20._-J4i` or `_b20._-j4Z` in this trace.

Therefore:

- SWF cast/fire/hit timelines are **presentation-only on the reached offensive path**;
- HurtboxTypes uses animation class/name/frame keys to choose defensive table rectangles;
- no SWF timeline is proved as the source of offensive phase radius or center offset;
- a global claim that no later collision code ever reads any owner/bone transform remains unproved.

No SWF, SWZ, ABC, extracted table, symbol dump, or bulk asset data is committed.

## Exact-QName reference closure

The analyzer enumerates every exact-QName reference in all 15,010 decoded method bodies. Ledger hashes are:

| Field | Reference-ledger SHA-256 |
| --- | --- |
| `CastTime -> _-i57` | `8fc50302d9593aa0bd6bb0e4d2adfdf5d27197a6a182adbc6d16745a65f4c1eb` |
| `AoERadiusX -> _-i45` | `365cac1b86a76c7fa62887ce252e5af01ffe40995f698209396de4b235ab3888` |
| `AoERadiusY -> _-h2W` | `38cd6bb3f6f60a2ae627e2f1b5dd79a88e987ce2a9d029b3cc023b5b27cdbf8a` |
| `CenterOffsetX -> _-K5E` | `80b2435cca81c0d4ca9d0d6a177faebafc781d9fe357fd47b3803c234dcbf638` |
| `CenterOffsetY -> _-Ie` | `1084a4bdeaf7a2741fd9647b5ee535fefe5d4269cac972d2192c5a8610b4afdb` |
| `Priority -> _-JB` | `3dbd3b517ebf4f5a452bd50f2942f4b5ca4c00f6d89ae122108fe658ecfed5fb` |
| `CanDamageEveryone -> _-n59` | `3074e01ec29bd8658b491ef87ff7dd3d977f4d495371c5ea5687169529ce9a8e` |
| `MinTimeBetweenHits -> _-s2L` | `17257565ce788c9f77089ccf9b57f7630769f81f2e16344254572e614cdade0a` |
| `InheritAlreadyHit -> _-46W` | `f935d99d67af9f74d03dd4cd79040ce7a0691fa816105550aa1a68291a21a6b2` |

The analyzer rejects any source identity change, malformed CSV width, changed record count, invalid ABC branch target, moved anchor instruction, changed owner, changed table ledger, or changed exact-QName reference ledger.

## Reproduction

Keep proprietary inputs under ignored paths or outside the repository. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:offensive-hitbox-timing -- \
  --abc /path/to/hash-pinned/main.abc \
  --power-types /path/to/hash-pinned/Game.swz.38.dat \
  --hurtbox-types /path/to/hash-pinned/Game.swz.24.dat
```

Reproduce the manually recorded parent-archive and focused-SWF identities from the same installed snapshot:

```bash
shasum -a 256 \
  /path/to/Resources/BrawlhallaAir.swf \
  /path/to/Resources/Game.swz \
  /path/to/Resources/Dynamic.swz \
  /path/to/Resources/Engine.swz \
  /path/to/Resources/Init.swz \
  /path/to/Resources/SFX_HitReacts.swf \
  /path/to/Resources/SFX_Sword.swf \
  /path/to/Resources/Gfx_Barbarian.swf
```

Useful bounded view:

```bash
bun run provenance:offensive-hitbox-timing -- ... \
  | jq '{status, identity, powerTypes, hurtboxTypes, parserAnchors, runtimeAnchors, blockers}'
```

The unfiltered analyzer output also includes focused instruction windows for parser grammar, phase selection, collision forwarding, facing/placement, target gates, arbitration, hurtbox lookup, and presentation facing. Successful output reports `bounded-static-closure-with-reachability-blocker`, build `10.09.96325`, all three exact input hashes, 15,010 decoded methods, valid branch targets, 3,671 power records, 6,329 serialized geometry phase slots, and 906 hurtbox records.

The command emits no ABC bytes, source rows, power names, local input paths, SWF payload, replay bytes, player data, or private corpus content. Operating-system errors can still reveal a caller-supplied path.

## Acceptance blockers and residual gaps

1. **Reachable power-phase universe:** no static root currently proves which origin, combo, background, exhausted, gravity-cancel, momentum, mode-override, item, hazard, taunt, and throw phases are reachable from every replay-producing configuration.
2. **Exact collision primitive:** `_b20` receives center and X/Y radii, but the focused trace does not close its intersection implementation.
3. **Universal active ticks:** parser-derived durations are exact, but no authenticated interpreted trace observes entry/exit ticks for every reachable phase.
4. **Complete target policy:** exact named gates and pairwise ordering are proved, but the full semantics of all 44 target modes and every team/mode/invulnerability combination are not.
5. **Universal transform closure:** the creation path has an exact facing-sign branch and no SWF scale read; later source-owner or bone-transform use has not been exhaustively excluded.
6. **Exact tie-break semantics:** ordering by `_-JB`, `_-F5f`, then `_-V6R` is exact; readable meanings of the last two fields remain unknown.

## Ticket and fog suggestions

### Surface as tickets now

- **Prove the reachable PowerType phase universe:** start from all replay-producing configuration roots, enumerate origin/combo/background/version edges, and produce a closed reachable phase ledger against `7154...f27`.
- **Recover the `_b20` collision primitive and world transform:** trace `_b20._-J4i`, `_-j4Z`, and every intersection caller through owner/source transforms, including any bone or point source.
- **Specify all offensive target modes and pairwise hit policy:** map the 44 parser names and all surrounding team, assist, invulnerability, grab, corner, and platform gates into a testable decision table.
- **Capture authenticated offensive active-window and arbitration traces:** after the interpreted oracle trust gates exist, trace representative entries from every reachable encoding class and every arbitration branch.

### Keep as fog until reachability is known

- A minimal conformance corpus spanning every reachable delimiter/target/transform combination.
- Whether animation-bone transforms matter to special owner-relative powers. This cannot be scoped precisely until the `_b20` world-transform trace identifies any bone-reading callsites.

## One-line map gist

PowerTypes, not SWF timelines or HurtboxTypes, statically supplies offensive phase durations and local center/radius vectors through collision creation; universal reachable-phase, primitive, target-policy, and runtime arbitration closure still require four focused follow-ups.
