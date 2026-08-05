# Dynamic `LevelDesc` loader in Brawlhalla 10.09.96325

Issue: [Locate and prove the Dynamic LevelDesc loader](https://github.com/NickTacke/brawlhalla-sim/issues/55)

## Verdict

**Negative for the ticket's exhaustive acceptance, but the loader itself is located and proven.**

The exact build-10.09 path is:

```text
completed resource whose declared type is SWZ
  -> ResourceManager._-X41, method 6561
  -> SWZ/native extraction ResourceManager._-W2H, method 6554
  -> custom XML parser _-G3D.parse
  -> exact root-tag callback dispatcher ResourceManager._-71V, method 6555
  -> callback registered as "LevelDesc" by _-n2S._-Hc, method 849
  -> _-h5c._-06T, method 5153
  -> StringMap _-h5c._-XY[LevelName] = root
  -> selected LevelType._-554 exact-name lookup
  -> _-h5c._-34c, method 5143
  -> recursive root walker _-h5c._-UQ, method 5135
  -> nested geometry/spawn/animation/asset helpers
  -> _-82U._-f47 -> _-h5c._-I5S, method 5144, post-load binding
```

This closes the predecessor's core locator gap. It does **not** honestly close the stronger request for an exhaustive XML grammar and semantically named, field-for-field normalized `LevelDesc` object. The pinned code proves selected grammar branches and all 29 declared `_-h5c` instance-slot dispositions, but several obfuscated collections cannot be given a more specific public semantic name without an execution trace or complete typed consumer closure. No trustworthy complete loader-object oracle was available. The acceptance verdict therefore remains negative rather than overstating proof.

No proprietary XML, level names, extracted payload, or bulk table is included.

## Evidence identity

All digests are SHA-256.

| Evidence | Identity | Disposition |
| --- | --- | --- |
| `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Recomputed locally; sole semantic build string is `10.09.96325` |
| `Dynamic.swz` | `cd54de039bc4e3441a7ae5811ef8748a719f49e0d4917016407d83b201ddf9c4` | Parent archive identity inherited from the hash-pinned reviewed extraction |
| Dynamic extraction | 186 sections, ordinals 0-185 | Recounted from the ignored local extraction |
| Dynamic section ledger | `263810dd34872df587c8139ac5a3f83faaff429fee18f072e142a7051efa1e24` | Recomputed as `ordinal NUL byteLength NUL leafSha256 LF` in ordinal order |
| Root classes | 120 `LevelDesc`, 66 `CutsceneType` | Recounted without emitting names or payload |
| Ordered `LevelDesc` ledger | `60630e3860e64d2d04deda1075d6cdb0f89e37cfaffd2ed8134f3dde95bbad99` | Recomputed and matched reviewed level-collision and level-instance evidence |
| ABC decoder | `abc-disassembler` commit `ad9714d` | Dependency pinned by `bun.lock` |

The section-ledger recomputation exactly matches the earlier reviewed ledger. The local extraction contains no third root class.

## Exact callback and extraction proof

### Registration

Static method 849, owner class 44 `_-n2S`, trait `_-Hc`, registers the callback:

| Ordinal | PC | Instruction | Meaning |
| ---: | ---: | --- | --- |
| 91 | 347 | `pushstring "LevelDesc"` | Exact root tag key |
| 93 | 355 | `getproperty _-h5c._-06T` | Exact callback, method 5153 |
| 95 | 363 | `callpropvoid _-41A._-m1u, 2` | Register key/function pair |

Method 849 identity: 2,055 code bytes, 547 instructions, code hash `87f93bc5b0fcbd782427302b96c4d28a846faf1fd641ed8778d35ef013a2f1ef`, semantic hash `77849cf8dc21c4f1d143763d459daab787d3cf15495525d35b158ac96c72213c`.

Registration method 6543 `_-41A._-m1u` writes the function into exact-case `StringMap _-M2L`; it does not uppercase the key. Its code hash is `f328fff365bacedf862b88212405d5c732afc8081505f864d05bd9314deb065f`.

### SWZ completion and extraction

Method 6561 `_-41A._-X41` dispatches a completed resource by its declared type:

| Ordinal | PC | Instruction | Meaning |
| ---: | ---: | --- | --- |
| 19 | 52 | `getproperty _-L5H` | Read resource type |
| 20 | 55 | `pushstring "SWZ"` | Exact type token |
| 24 | 66 | `callpropvoid _-W2H, 1` | Enter method 6554 extraction |

Method 6554 sends archive bytes to `ANE_RawData.SetData`, repeatedly receives extracted text with `GetData`, parses XML through `_‑G3D.parse`, obtains the root element name, then calls method 6555. The sequence-entry/call PCs are 41/45 (`SetData`), 171/174 (`GetData`), 339/343 (`_-G3D.parse`), and 443/450 (`_-41A._-71V`). Method 6554 has code hash `316c5601dc1f4d85863152b752a55367eeeb8f270fa6b9866d4d1eff7dda479f` and semantic hash `6ba30a2a8ee8d1d95fb35b1f97faff193cf02340b9ee2b119cb5870a1aa913a8`.

Method 6555 first checks a separate uppercase callback map, then the exact-case `_‑M2L` map. The exact-case path starts at ordinal/PC 75/184, retrieves the function at 95/235, loads it at 117/292, and calls it with the parsed root at 120/296. Method identity: code hash `18ddfffde127219b3da28f9d5218bfda57aff9c97b809762c21f373115127e8a`, semantic hash `9aecd3c5f1e3b33c06d447814e06a9c805ec6f5f93a7903fddd55217822965e9`.

This proves extraction-to-callback dataflow. It does not independently reverse or certify the proprietary native SWZ algorithm; archive ancestry is pinned by the parent and ordered leaf ledgers.

## Root registry and duplicate policy

Method 5153 `_-h5c._-06T` is the `LevelDesc` root callback. It:

1. returns for null roots or roots without `LevelName` (ordinals 6-13, PCs 11-26);
2. reads the exact `LevelName` string (ordinal 14 onward, PC 27);
3. writes the root into static `StringMap _-XY`;
4. uses `setReserved` for reserved keys (ordinal/PC 33/74), otherwise dynamic property assignment (39/89).

There is no duplicate test, diagnostic, vector append, or rejection. Duplicate `LevelName` roots are **last-write-wins in extraction callback order**. The shipped 120-root ledger has unique names, so this mutation policy is static behavior, not an observed shipped collision.

Method 5153 identity: 94 code bytes, 41 instructions, code hash `a4572e4b815f046761538d5fe90f04a5b1cd7aad11669cc181220a15695cf8e1`, semantic hash `9ef6579248454d91b873b93d8ad341c981b47805f45267c7e882d8839da786f5`.

Methods 5152 `_-z2u` and 5154 `_-F1C` use `LevelType._-554` as the sole key. No file name, asset name, numeric ID, alias, or case normalization participates.

## Selected-root load and recursive walker

Instance constructor method 5123 stores the owning game `_-u16` in field `_-Z2h`, initializes `_-G16=false`, and calls reset method 5149.

Method 5143 `_-34c`:

1. obtains the selected `LevelType` from the game;
2. rejects null/missing exact-name roots through method 5152;
3. retrieves the root from `_‑XY` by exact `LevelType._-554`;
4. computes `AssetDir + "/"` or `""` into field `_-O2r`;
5. calls recursive walker 5135 on the root;
6. starts background/raster loads through methods 5142 and 5139 and retains failed nodes for exact retry.

Method 5143 identity: code hash `d8a545e588557d2d6e5a70a3a4cbc4d91c74cfc020bb5eaddf562f2975042b9a`, semantic hash `fd0c14958e694a3199c79defb54b8354d6f09bf34db3761e8b5dd7303641cdb2`.

Method 5135 `_-UQ` is the actual 1,726-instruction root walker, not method 5156. It initializes root collections and recursively dispatches children in source order. Recognized branches include backgrounds, bounds, dynamic containers, raster assets, goals/volumes, all item-spawn forms, level animations/sounds, navigation nodes, platforms/moving platforms, respawns, scoreboard data, wave data, and collision forms. Unknown fall-through children enter collision parser 5137 rather than a generic ignore branch. The final post-walk sequence enters method 5126 at PC 4728 and calls it at PC 4732.

Method 5135 identity: 4,738 code bytes, code hash `48584a6933873185dd9990dec875b559343755281066972285580c205186e593`, semantic hash `201a286271bef1f8f4adc8f448e28feb2ac3269c4e51177d1fc0c3ce4e587822`.

## XML and scalar grammar boundary

The same custom `_‑G3D` parser used by other patch XML is reached directly at method 6554 PC 339. Prior hash-pinned inspection of parser method 15059 proves these relevant rules:

- names accept ASCII letters, digits, colon, dot, underscore, and hyphen;
- attributes require `=` and ASCII double quotes;
- duplicate attributes throw before insertion;
- child order is preserved;
- closing names must match;
- self-closing tags, comments, CDATA, processing instructions, and DOCTYPE have dedicated branches;
- decimal/hex numeric character entities and named entities have dedicated branches;
- unexpected end throws.

It does **not** prove every malformed-input or entity edge. One shipped `LevelDesc` section is known to lack a separator between adjacent attributes and requires the previously declared game-compatible extraction normalization; one separate `CutsceneType` section has an unescaped ampersand. Those facts are reported without reproducing source text.

Level helpers use exact attribute strings, no trim:

- absent optional numbers normally retain caller defaults or take explicit `0`; present values use AVM2 `parseFloat`/`parseInt` then typed coercion;
- booleans uppercase and compare exactly to `TRUE`; absent means false unless the caller supplies another default;
- comma-valued fields use raw `split(",")`;
- source child order controls append and overwrite order.

An exhaustive malformed-number and complete XML grammar claim remains blocked.

## Defaults, transforms, and nested helpers

| Method | Role | Proven normalization |
| ---: | --- | --- |
| 5125 `_-12m` | Platform suppressor/variant selector | Handles special instance names, exact `ScoringType`/`Theme`, and comma-split `PlatformAssetSwap` modes |
| 5126 `_-l3m` | Final animated-asset sizing pass | Resolves `AnimatedAssetName`/`AssetName`; parses `W`/`H` with `parseFloat` |
| 5128 `_-H8` | `WaveData`/group/path parser | Explicit zero defaults for count/delay/stagger families, false for `Shared`, raw path strings, recursive groups/points |
| 5129 `_-Rd` | Goal/no-dodge/volume parser | Parses `X`,`Y`,`W`,`H`,`Team`,`ID`; missing numeric fields coerce to zero |
| 5130 `_-c2v` | Point/spawn parser | `X`,`Y` parse as Number plus caller offsets; `Initial` and `ExpandedInit` are uppercase-`TRUE` booleans |
| 5131 `_-SK` | Rectangle parser | Overrides only present `X`,`Y`,`W`,`H`; otherwise preserves supplied rectangle components or zero defaults |
| 5132 `_-92M` | Display transform | `X/Y=0`; `Scale` sets both axes, else `ScaleX/ScaleY=1`; degrees to radians; `W/H` divide by nonzero intrinsic dimensions |
| 5133 `_-72e` | Platform tree | Creates Sprite3D groups, applies 5132, invokes scoring hook, recurses `Asset`/`Platform`, constructs moving state from `Animation` + `PlatID` |
| 5134 `_-e40` | Navigation node | Parses `X/Y`, derives name/path tokens, preserves parent transform |
| 5136 `_-XS` | Item-spawn dispatcher | Separates `ItemSet`, ordinary init spawn, and team init spawn constructors |
| 5137 `_-T1L` | Collision/hazard parser | Tag-to-bitset, point/endpoints, offsets, left-to-right swap, optional team/flag/anchor/normal, hazard-specific power and animation fields |
| 5138/5145/5147 | Background selection | Chooses one background XML node by `HasSkulls`, match/theme specificity, with later eligible candidates replacing earlier ones |
| 5139 `_-P1G` | Raster loader | Exact `mapArt` path, no substitution, queued retry, transform after non-null bitmap |
| 5140/5141/5146 | Animation/keyframes | Frame/default parsing, easing, center/arc interpolation, two-decimal generated positions, `SlowMult`, `StartFrame` |
| 5151 `_-26R` | Collision insertion/bounds | Inserts static/dynamic segment and updates min/max X/Y from both endpoints |

Core helper code hashes include 5130 `e545a240...`, 5131 `2c91fd89...`, 5132 `7d574aa2...`, 5133 `598f8855...`, 5137 `0e868a87...`, and 5141 `adb1a5d7...`. Full hashes are reproducible from the pinned ABC; shortened hashes here are locators, while the load-chain hashes above are complete acceptance anchors.

## Every declared `LevelDesc` instance field

Class 279 `_-h5c` declares exactly 29 instance slots. This table disposes all of them. “Opaque” means the type, initialization, writer, and consumers are exact, but a stronger readable gameplay name is not justified.

| QName | AVM2 type | Reset/load disposition |
| --- | --- | --- |
| `_-p4X` | Boolean | Reset false; loader-state flag, no source scalar assignment proven |
| `_-E31` | Boolean | Reset false; background-load state, mutated by method 5142 |
| `_-CF` | Boolean | Reset false; set true during root initialization |
| `_-G16` | Boolean | Constructor/reset false; opaque loader-state flag |
| `_-83s` | `Vector.<WaveData>` | New vector per root; method 5128 appends parsed wave records |
| `_-Q4o` | `_‑G3D` | Null, then selected `Background` XML node; later eligible candidates may replace it |
| `_-v1D` | `Vector.<_-Z5m>` | Texture-resource vector; reset destroys members, load creates empty vector |
| `_-IC` | `Vector.<_-V3v>` | Display-node vector; reset detaches members, load creates empty vector |
| `_-a` | `Sprite` | Null on reset, new root Sprite during load; parent for nav/platform display nodes |
| `_-nx` | `Vector.<String>` | Pending exact asset names; reset reports/releases then nulls, load creates empty vector |
| `_-v2T` | `Vector.<_-ut>` | New vector; populated by `LevelAnim` construction |
| `_-P69` | Number | Root `SlowMult` parsed with zero/default branch; consumed by animation construction |
| `_-82g` | int | Root `NumFrames`, explicit zero when absent |
| `_-y5a` | IMap | New map; helper-owned dynamic point collection, attached in post-load 5144 |
| `_-95L` | IMap | New map; second helper-owned dynamic point collection, attached in 5144 |
| `_-3V` | IMap | New map; helper-owned dynamic association collection, paired in 5144 |
| `_-x1X` | IMap | New map; helper-owned dynamic association collection, paired in 5144 |
| `_-T2Q` | IMap | New map; `PlatID -> Vector.<_-L3i>` for `DynamicCollision` |
| `_-22i` | Number | Minimum collision Y; reset to `Number.MAX_VALUE`, updated from inserted endpoints |
| `_-g5A` | Number | Maximum collision X; reset to `-Number.MAX_VALUE`, updated from endpoints |
| `_-B6q` | Number | Minimum collision X; reset to `Number.MAX_VALUE` |
| `_-u5C` | Number | Maximum collision Y; reset to `-Number.MAX_VALUE` |
| `_-O4X` | IMap | Object map from pending display nodes to exact asset references |
| `_-b1I` | `Vector.<_-V3v>` | New vector of display nodes; post-load method 5144 attaches them |
| `_-T4W` | `Vector.<_-G3D>` | New vector of deferred XML asset descriptors; processed by final pass 5126 |
| `_-za` | IMap | New navigation/display association map; exact type fixed, public semantic opaque |
| `_-O2r` | String | `AssetDir + "/"`, or empty string, set by method 5143 before root walk |
| `_-22x` | `Vector.<_-A6g>` | New vector of moving/animated level objects; bound in method 5144 |
| `_-Z2h` | `_‑u16` | Immutable owning game reference supplied to constructor, not XML-derived |

These are the complete 29 unique instance slots. No undeclared dynamic property is counted as a `LevelDesc` field. Nested objects have additional fields, but those belong to their own classes and are constructed by the helpers listed above.

## Post-load passes

1. Method 5135 creates collections, walks source order, and ends with method 5126.
2. Method 5143 performs exact asset prefixing and queued raster/background retries.
3. Manager method 5070 calls method 5144 `_-I5S` at PC 178 after load readiness.
4. Method 5144 attaches deferred display/moving objects, computes collision extents, binds collision and point maps to moving platforms, derives a rectangle from min/max extents, and copies the wave vector into the game level manager.
5. The manager then sorts three gameplay arrays, removes its temporary stage object, and marks initialization complete.
6. Render-ready method 3388 calls method 5127, which finalizes pending textures and then releases its temporary vector through method 5148.
7. Teardown/reset paths in methods 5067 and 5077 call method 5149; method 5149 clears collections, detaches nodes, resets bounds/flags, and releases textures.

Method 5144 identity: code hash `743d49997ce3d81e7d9a949413320bb9563b0b62ab50d157ad4af5f85c98e910`, semantic hash `f5d3f812ed8e2fc4e2478f68d30b65cbac6e56c95c3dbe280a5346bee284736b`. Method 5149 identity: code hash `e52007a83fe9dfb20ba08aa13f5ab2b3ff2cc4c2b080b76da61afcf98f5e0cea`, semantic hash `c1d0ab3654ea6e029ac07e3229d280ab807cd2ee9bf395f3d537e445de458e5c`.

## Why method 5156 is a false lead

Method 5156 has no class-method owner. It is script 279's initializer. Its first instructions create class 279, after which all 548 instructions assign static readable constants and numeric constants.

The predecessor anchor ordinal/PC 19/53 is only:

```text
getlex _-h5c
pushstring "LevelDesc"
initproperty _-P2Z
```

The rest similarly assigns vocabulary such as collision, bounds, spawn, platform, and transform attribute tokens. Method 5156:

- accepts no archive bytes or XML root argument;
- calls neither `_‑G3D.parse` nor the resource manager;
- never reads `LevelName` from an element;
- never writes registry `_‑XY`;
- never calls root walker 5135;
- never constructs a runtime `_-h5c` instance.

Its identity remains 1,959 code bytes, 548 instructions, code hash `802d859e55945a5ac6c34f83ab998020139a5370ee50cfdee340c52879e0b65b`, semantic hash `9c7d0ac1afbd23acfb7e024364c0226f8b31b027f66b91e5046e1d3b95ef10a4`. It is useful vocabulary provenance, not a loader.

## Acceptance blockers and residual risk

The issue's loader-location claim is closed, but exhaustive acceptance is not:

1. Parser method 15059's complete malformed-input/entity grammar was not exhaustively proved.
2. No trusted execution produced complete typed `LevelDesc` objects for differential comparison.
3. Four helper-owned obfuscated IMaps and two loader-state booleans have exact types/writers/consumers but not defensible finer public semantic names.
4. Native SWZ extraction ancestry is ledger-pinned but the native algorithm is not independently reversed here.
5. The shipped malformed `LevelDesc` attribute-separator case prevents claiming ordinary strict-XML equivalence.
6. No mutation oracle tested duplicate roots, reordered roots/children, missing/malformed scalars, or every nested constructor branch.

A future acceptance harness should execute methods 6554, 6555, 5153, 5143, 5135, nested constructors, 5144, and 5127 against synthetic privacy-safe mutations, then emit only QName/type/value-bit/provenance descriptors. It must compare all 29 slots, nested object fields, vector order, maps, last-write-wins duplicate behavior, exact Number bits, and post-load results.

## Reproduction and verification

Keep all proprietary inputs ignored and pass paths explicitly. Do not use environment variables.

```bash
shasum -a 256 /path/to/main.abc /path/to/Dynamic.swz
bun run provenance:dynamic-leveldesc-loader -- \
  --abc /path/to/main.abc \
  --dynamic /path/to/Dynamic.swz \
  --source-dir /path/to/decrypted
bun run check
git diff --check
git status --short
```

The committed analyzer fails closed on the exact ABC/build, all decoded branch targets, load-chain code and semantic hashes, claim-level PCs, the complete ordered 29-field declaration, the complete exact-QName field-reference ledger, 186 contiguous source leaves, both source ledgers, unique shipped `LevelName` values, root-attribute counts, and both non-strict source syntax markers. It emits only hashes, counts, method metadata, and field type names.

Successful output reports:

```text
status:                         partial-static-proof
ABC SHA-256:                   9fe9c830...bcfba2d
Dynamic sections:             186, ordinals 0-185
Dynamic section ledger:       263810dd...fa1e24
LevelDesc roots:              120
CutsceneType roots:            66
other roots:                    0
LevelDesc root ledger:        60630e38...bbad99
LevelDesc declared fields:     29
field-reference ledger:       8ebfd747...71fd85
method 5156 calls/constructs:   0 / 0
```
