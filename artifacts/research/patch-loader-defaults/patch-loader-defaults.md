# Patch-data loader normalization and defaults in Brawlhalla 10.09.96325

Issue: [Prove patch-data loader normalization and defaults](https://github.com/NickTacke/brawlhalla-sim/issues/35)

## Verdict

**The requested canonical-normalizer equivalence is not proven.** The pinned executable and shipped entries prove selected rules of both source grammars, common scalar coercions, sentinel-row handling, source-ordered insertion, duplicate overwrite behavior in representative registries, and the complete `ItemSpawnRateType` inheritance copy. They do not yet prove either grammar exhaustively, field-for-field normalized objects for every relevant entry, mutation coverage for every category-specific default branch, or normalized provenance leaves.

This is a resolution of the research question, not permission to implement a guessed normalizer. The exact blocker is now bounded: execute the pinned loader closure against synthetic mutations and compare complete typed objects. A generic XML/CSV parser plus source hashes is insufficient.

Confidence is **high** for the anchored helper/inheritance/parser branches below and **high** that issue 35's acceptance remains unmet. No proprietary source, bulk normalized table, replay, or executable is committed.

## Map gist

Build 10.09 statically fixes selected source-parser rules, scalar defaults, source-ordered registries, and spawn-rate inheritance, but canonical loader equivalence still needs a trustworthy executable mutation oracle and the actual level-data loader.

## Evidence grades

- **Proven static:** an exact instruction/control-flow anchor in the hash-pinned ABC, exact source bytes, or direct source inventory reproduced by the committed analyzer.
- **Observed source:** a property of the pinned source entry, without claiming loader output.
- **Locator only:** a unique string-conjunction method or source pairing that does not establish parser dataflow.
- **Unknown:** the inspected primary evidence cannot satisfy the claim.

The committed analyzer records both decoder instruction ordinals and byte PCs for claim-level anchors. Whole-method code and semantic hashes make the larger method identities drift-detecting. A complete byte-PC mutation ledger remains part of the missing acceptance proof.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | SHA-256 | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Loader candidates, source parsers, coercion helpers, constructors, registries |
| Sole semantic build string | `10.09.96325` | Build identity |
| `Game.swz` | `4fc9d70c1c3642b7d3e61c8bb0062bb57c46ea2169276ca1d33616a5843d4aff` | Parent archive identity |
| `Dynamic.swz` | `cd54de039bc4e3441a7ae5811ef8748a719f49e0d4917016407d83b201ddf9c4` | Parent level-data archive identity |
| 261-entry extraction aggregate | `4bcd0666a713d81266bd76885ed21740c4e8c4c01def2ebcd02202983a6a8d8f` | Exact reviewed extracted inventory |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction decoding |

The source-entry identities inherited from the patch-closure evidence were recomputed locally:

| Category | Entry | SHA-256 | Candidate class/method | Status here |
| --- | --- | --- | --- | --- |
| Dodge | `Game.swz.11.xml` | `a0c99d2052bee75b755bb2e8b16dd2e6e8b167d154cd20a2baf6c02a93fa63e4` | class 138, method 2672 | XML row loader proven; complete defaults not normalized |
| Game mode | `Game.swz.17.xml` | `cdc1409bfcb84e30d76419087656c7dfe38c549e9528198adf6ba9be5f80741e` | class 184, method 3732 | XML row loader proven; complete defaults not normalized |
| Hero | `Game.swz.23.xml` | `1a9c27d1e21178870dafe5746c00efb7ec154d14290af4c628eb878c054eb920` | class 217, method 4123 | XML row loader proven; post-load derivations remain broad |
| Hurtbox | `Game.swz.24.dat` | `358aac8501dbf9051c22c7f14c8eef72a16cd0a071ad2ef398ab6695286e3333` | class 237, method 4655 | Delimited row loader and registry tail proven |
| Item spawn rate | `Game.swz.25.xml` | `e9d054eacf39030ea242d713bb0808b66567363f0877f150724f2a4ce7b12aa4` | class 255, method 4809 | Loader and constructor inheritance proven |
| Item spawn rules | `Game.swz.26.xml` | `f1ee7530c4e0693232c8a4fdc93163f676691259dc2da9e83bc332cf21b3391c` | class 256, method 4818 | Loader and registry tail proven |
| Item | `Game.swz.27.dat` | `d68102cbafaef4f6f9eae817f1f7c5830be4464e8cea89fbd0ee36bc28e95f3e` | class 257, method 4834 | Delimited row loader; 1,745-instruction field/default closure incomplete |
| Level set | `Game.swz.30.xml` | `e6870349d9104bc91fddcfa329f2cf4b5a4b96e466cfed47cb92834316b54dff` | class 275, method 5098 | XML loader and registry tail proven |
| Level geometry | 120 `Dynamic.swz` `LevelDesc` leaves | archive above | script 279 initializer, method 5156 | **Locator only:** this method initializes readable constants; it is not the level-data parser |
| Power swap | `Game.swz.39.xml` | `a6eb10c26320ba18da8a1067cae09258a28c6f6c0a1a27b1adf27c46a2946b6f` | class 341, method 6264 | XML row loader proven; vector insertion observed |
| Power | `Game.swz.38.dat` | `715468d8eda8fa2ec3d88a8b5395c076bec937640927909add4745eda2883f27` | class 342, method 6294 | Delimited row loader; 6,928-instruction field/default closure incomplete |
| Rune | `Game.swz.42.xml` | `13c32dfdc7ba3b5296c562bf69996b93b68f6b48dcdd226e15a0899f24d3e910` | class 393, method 7108 | Attribute helper use and indexed insertion proven |
| Scoring | `Game.swz.43.xml` | `fd9efadd2f3c6f7e844ec9c52b1f685fb15d32e936934450e36e441f3e182f7d` | class 406, method 7279 | XML row loader; post-load defaults/validation remain broad |
| Stat ladder | `Game.swz.52.xml` | `0744728b58c6134f5d205236ae6a34c1f05d55c9f6b80f074f0f6cf1cb694692` | class 629, method 11659 | XML row loader and name registry proven |

## Loader-method identity ledger

`code SHA-256` hashes exact method bytecode. `semantic SHA-256` hashes `JSON.stringify` of the pinned decoder's instruction objects. The latter is tool-representation-specific, as in the predecessor evidence.

| Method | Code bytes | Instructions | Code SHA-256 | Semantic SHA-256 |
| ---: | ---: | ---: | --- | --- |
| 2672 | 1,613 | 558 | `b8902acf95632a6fdb14d579ed78d7447350e36af921b5e0afb552334e9b4193` | `c375ad98590ca7e6e8c4335a83bb053dc24119cc91ffe170c8bcdc06ee75e01d` |
| 3732 | 1,729 | 576 | `45b4353a8495f6459875f69ce0e4702acb1496ed6bffe58e51797fc86b680988` | `7a65fd8724867b91dedea1d334bc67ab62bb0ae844cfed088ddf9f97769e3aa6` |
| 4123 | 3,697 | 1,281 | `f428bfce4f909fd682c07d6112e8f7523f4b68d3c1ad05816b5b4f7d76625f73` | `7e97cddec709b1ceb12f19292cfaf071ddc545e125dd856f3c3376961a7726d2` |
| 4655 | 1,793 | 729 | `f8e0ff5e9e9ff3e1beb079cf40437ef5c74f4e2984ba732cbf67735eec539246` | `1c99f20bb791cf9b70c3a61c1c3cc272b59bcd383fcb375579561c06efc8d66d` |
| 4809 | 789 | 274 | `92ce6302d59db8e66373c0435a4f8f466174c1d44bcd8a115133558a91dfc3f7` | `d6e5646fc58e12eac7c8bed31fa77a265a5bf03b2189a199a8a726aef7c89165` |
| 4818 | 637 | 222 | `22e7ca461af9bcdc48b89fb9082b1da9f5aa9b7d5456d67708d7397c13eecb35` | `fbe530aaa39372d6152143a44d8ebbe7884738e1b8e372ddde84b0493d0d4f1d` |
| 4834 | 5,014 | 1,745 | `b038cafaefacaa9c6638cc176206a5a7cc64d943016f92c9e18ff970ef9a1b69` | `d76bbbce3448a9235cf88082facea66663db0bcf45e680761e406c8d81930a25` |
| 5098 | 797 | 282 | `21536ef14f297a5ce035b786fcacd16ab942d7e346b0660bd787fb1ef189e3a1` | `8ed6bfdac77d98fc36fc13bb9449240ecce46906a6f9d08ee40110e2d4025e84` |
| 5156 | 1,959 | 548 | `802d859e55945a5ac6c34f83ab998020139a5370ee50cfdee340c52879e0b65b` | `9c7d0ac1afbd23acfb7e024364c0226f8b31b027f66b91e5046e1d3b95ef10a4` |
| 6264 | 933 | 321 | `72b6d046e0770cb01c643464a657c91361475c6991a799b26a025515cfa42379` | `111fe59caaba7d585a91a36b96124eb685c33a0e2f25283c50896aaac05a2302` |
| 6294 | 17,824 | 6,928 | `c2ef2e714f35c02f98a72e5457d0b6036d54c2dca70bdba30181a7ee40781547` | `dd6c858a6bdb6ce0ff0972f2f5a0380103887ac7d2354c9e4240a6931eba2a17` |
| 7108 | 804 | 303 | `6fe40272669d622217211c3c52dae2a0f918c8da107b824d5690b58c44988ad6` | `5c69c967a79430c875c6deb27363ba4462851f114a96c2fe56d3bf5bd9492739` |
| 7279 | 4,552 | 1,559 | `e37fae93b876ddc061cfa6c705f7715497295507ae467c04c4da0f305002609c` | `4b5c048ca1789855712cce431fb5ec0e41d84a912b67e293e178be13722d3d02` |
| 11659 | 928 | 334 | `228edcc0e70cda1a7da0d7e1b5e04937848b5a3941f0b95adaad729570b4edbe` | `ec4c8a8a1817bdf78c3b1f301af31d2a2074c43f716a5d0a1d5a0fda9d56e7c4` |

## Claim-level anchor ledger

The committed analyzer verifies these representative anchors after decoding all 15,010 method bodies and validating every branch target:

| Claim | Method | Ordinal | Byte PC |
| --- | ---: | ---: | ---: |
| XML duplicate-attribute error | 15059 | 470 | 1502 |
| XML requires `=` | 15059 | 500 | 1569 |
| XML requires ASCII double quote (`34`) | 15059 | 509 | 1712 |
| XML closing-name validation | 15059 | 808 | 2582 |
| XML close delimiter | 15059 | 836 | 2648 |
| XML unexpected-end error | 15059 | 1537 | 4264 |
| CSV LF / CR tokens | 2146 | 49 / 52 | 91 / 99 |
| CSV opening / escaped quote tokens | 2146 | 76 / 86 | 150 / 179 |
| CSV comma token | 2146 | 103 | 218 |
| Direct-string empty default | 6076 | 6 | 15 |
| Comma-list delimiter | 6077 | 4 | 14 |
| Number empty default | 6079 | 6 | 15 |
| Boolean empty / true token | 6082 | 6 / 63 | 15 / 153 |
| Spawn parent empty-name test | 4804 | 18 | 38 |
| Spawn duplicate ID / name diagnostics | 4809 | 196 / 230 | 570 / 663 |
| Spawn vector append, then ID/name map writes | 4809 | 240 / 248 / 272 | 692 / 717 / 784 |
| `LevelDesc` locator constant | 5156 | 19 | 53 |

The analyzer emits the complete anchor ledger and exact method/source identities. These anchors prove only the bounded claims attached to them.

## AIR XML grammar evidence

**Selected branches proven static; full grammar not closed.** Source method 14856 delegates to recursive parser method 15059 and returns the custom XML tree type `_-G2c`. Method 15059 has 1,543 instructions, 4,275 bytecode bytes, code SHA-256 `4d98213d6beae5615ef33912698447ea3785dd3fe55f5dd6c74db25e3a9f53f7`, and semantic SHA-256 `9b2321afb5ddaef20abeb8d0291fc156130e4ef537302afc92dbc5c7a99dffe8`.

The inspected branches establish these relevant rules:

1. Element and attribute names accept ASCII letters, digits, colon, dot, underscore, and hyphen. An empty name reaches an error branch.
2. Attribute assignment requires `=` and ASCII double quote (`34`). This report does not claim another accepted quote delimiter.
3. A duplicate attribute is detected before insertion and throws `Duplicate attribute [...]`.
4. Elements preserve child order through append calls. Text is retained as text children; no trim appears in the common value accessors.
5. Closing names must equal the current element name. A mismatch reaches the `Expected </name>` error path.
6. Separate branches recognize self-closing tags, comments, CDATA, processing instructions, and DOCTYPE.
7. Decimal and hexadecimal numeric character entity branches and a named-entity lookup are present. Full entity and invalid-character policy is not claimed here.
8. Unexpected end of input throws.

All ten relevant `Game.swz.*.xml` entries inspected here also parse as strict XML with Python's standard library. That observation is a source-shape cross-check, not proof that Python reproduces AVM2 object semantics.

### XML traversal used by row loaders

The row methods iterate child nodes in source order and require each visited row child to be an element. Unknown property elements normally emit a category-specific diagnostic and continue. Common methods 6070/6071 read named child elements; methods 6074-6079 and 6082 read the first child value of a property element.

Template marker records are not inherited by these row methods. They are excluded:

- methods 2672, 3732, 4123, 4655, 4818, 6264, 6294, and 11659 return when the identifying name is `Template`;
- methods 4834 and 7279 return when it is `XLTemplate`.

These source records are schema/examples and do not enter registries. The name does not establish a general template-copy mechanism.

## Game-delimited grammar evidence

**Selected branches proven static; full malformed-input grammar not closed.** The `.dat` entries use parser class 115 and row/index class 114 before row loaders 4655, 4834, and 6294 execute.

- Constructor method 2141 records source length and initializes row storage. Methods 2143/2145 advance over the exact leading code-point set `0`, `187`, `191`, `239`, `254`, `255`, `65279`, `65534`, and `15711167`; this report assigns no broader encoding meaning to that set.
- Method 2146 uses ASCII double quote (`34`) as its quote token. Comma (`44`) ends a cell only outside quotes. CR (`13`) or LF (`10`) ends a row only outside quotes. A doubled ASCII quote while quoted advances over the escaped quote.
- Method 2139 assigns the first parsed row as the column-name map and maps subsequent cells by column index. Dot-containing column names take the explicit nested-field path.
- Method 2152 returns the exact source substring for a valid cell and `""` for a missing/invalid cell. No whitespace trim appears in that accessor.
- Row order and column order are retained. Empty cells are distinct source positions, but common scalar helpers can later coerce them to typed defaults.

Unmatched-quote completion, every malformed row shape, and every source character remain outside the bounded static claim.

Pinned source observations:

| Entry | Table name | Columns | Data rows | Marker rows skipped | Row-width mismatches | Duplicate primary names/IDs |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| `Game.swz.24.dat` | `hurtboxTypes` | 10 | 906 | 1 `Template` | 0 | 0 / 0 |
| `Game.swz.27.dat` | `itemTypes` | 117 | 75 | 1 `XLTemplate` | 0 | 0 / 0 |
| `Game.swz.38.dat` | `powerTypes` | 182 | 3,671 | 1 `Template` | 0 | 0 / 0 |

The first physical line is the table name; the second is the header. Counts above exclude those two lines and include the one marker row before the loader skips it.

## Common scalar normalization

**Proven static for the common helpers.** Class 323 `_-619` owns the loader helpers. All helpers first examine the property's first child. Missing or empty content takes an explicit default branch.

| Helper | Method | Missing/empty result | Present-value behavior |
| --- | ---: | --- | --- |
| Named child string | 6070 | `null` if child absent; `""` if child element is empty | Exact first child text |
| Named child unsigned | 6071 | `0` | `Std.parseInt`; `NaN` becomes `null`, then AVM2 return coercion determines the typed result |
| Direct signed/unsigned parse | 6074/6075 | `0` | Shared `Std.parseInt` wrapper, method 947 |
| Direct string | 6076 | `""` | Exact first child text |
| Comma list | 6077 | `[""]` when direct-string input is empty | Method 6077 does not handle missing input itself; it splits its string argument exactly on comma |
| Localized/direct string | 6078 | `""` | Exact first child text |
| Number | 6079 | `0` | `Std.parseFloat` wrapper, method 948, then `convert_d` |
| Boolean | 6082 | `false` | Uppercase source text and compare exactly to `TRUE` |

Method 947 is the Haxe `Std.parseInt` wrapper: it calls the native/global parse, tests `Math.isNaN`, returns `null` on NaN, otherwise returns the parsed value. Method 948 forwards to native/global `parseFloat`. The inspected static code does not close AIR's full accepted numeric-string grammar or every downstream `int`/`uint` coercion edge; that belongs to the numeric-semantics contract.

Important consequences:

- absent, empty, explicit zero/false, malformed numeric, and inherited values cannot be collapsed in provenance even where the final typed value is equal;
- boolean truth is case-insensitive only because method 6082 uppercases first; values other than `TRUE` normalize false;
- lists are raw comma splits. The common helper does not trim entries or interpret `--` as null. Category code must prove any later sentinel handling.

## Spawn-rate inheritance

**Proven static for the complete `ItemSpawnRateType` field set.** Method 4809 reads attributes `SpawnRateName` and `InheritSpawnRate`, then calls constructor method 4804 with `(name, parentName, context)` before applying child elements.

Constructor 4804:

1. writes the child name;
2. initializes `MaxItemCountMultiplier` to binary64 zero;
3. if the parent name is non-null and non-empty, looks it up immediately in the name registry;
4. if found, copies all eleven normalized fields from the parent: display name, initial/fixed/variable/random timing, extra-before-max, multiplier, fixed count, round-up flag, simultaneous-zones flag, and first-drop flag;
5. if missing, performs no copy and does not throw in this method;
6. returns, after which method 4809 applies present child elements in source child order.

This is shallow copy-then-override inheritance. It becomes transitive only because an earlier parent object is already normalized. It is source-order-sensitive: a forward parent reference resolves to null in this constructor.

The pinned source has 22 records and ten inherited records. Every parent appears earlier than its child:

```text
SoccerWeaponsLow       <- StandardWeaponsLow
SoccerWeaponsMedium    <- StandardWeaponsMedium
SoccerWeaponsHigh      <- StandardWeaponsHigh
HordeWeapons           <- StandardWeaponsMedium
HordeGadgets           <- StandardGadgetsLow
CTFWeaponsLow          <- StandardWeaponsLow
CTFWeaponsMedium       <- StandardWeaponsMedium
CTFWeaponsHigh         <- StandardWeaponsHigh
Tutorial1Weapons       <- StandardWeaponsMedium
Tutorial2Weapons       <- StandardWeaponsMedium
```

No inheritance cycle exists in this entry. The static constructor does not provide cycle detection; source order makes a cycle unable to resolve as a complete parent chain.

`ParentItem` and `OriginPower` in `PowerTypes` are ordinary normalized reference fields in method 6294, not a generic whole-object inheritance mechanism. The `Template`/`XLTemplate` rows are skipped rather than copied.

## Duplicate and insertion policy

**Proven static for the inspected registry tails.** There is no single reject-on-duplicate policy.

Representative loaders perform this sequence:

1. construct and normalize one record;
2. detect existing ID/name entries and emit a diagnostic;
3. append the object to the category vector in source order;
4. assign ID/name map entries after the diagnostic.

The assignments overwrite an existing key, so keyed lookup is last-write-wins while the ordered vector retains every appended non-marker record. This exact shape appears in hurtbox method 4655, spawn-rate method 4809, item-rule method 4818, item method 4834, level-set method 5098, and stat method 11659. Rune method 7108 diagnoses an occupied hero-local rune index and then overwrites that index. Power-swap method 6264 appends to its vector without an equivalent unique ID/name pair.

This is why a canonicalizer must preserve both registry maps and source-ordered vectors. Rejecting duplicate logical IDs, as suggested by the predecessor manifest candidate, would not reproduce the reference loader on mutated duplicate input.

The shipped entries have no duplicate primary IDs/names in the three delimited tables and the straightforward global XML registries. Repeated dodge display/name fields, repeated power-swap owners, and rune indices reused across heroes are domain grouping, not global duplicate-key evidence.

## Why canonical equivalence remains unproved

The acceptance bar requires more than the static facts above:

1. **No trustworthy complete loader oracle output exists.** The map's interpreted-reference decision explicitly says no trustworthy trace exists yet. Static instruction interpretation cannot establish that a separately written normalizer reproduces every typed object field-for-field.
2. **The level candidate is not a loader.** Script initializer 5156 creates readable name constants such as `LevelDesc`, `HardCollision`, `SoftCollision`, and `Respawn`. It does not parse any of the 120 `Dynamic.swz` leaves. The actual source-to-level-object path remains unlocated here.
3. **Candidate row methods are not the complete closure.** Constructors, nested graphics/helper objects, post-load passes, cross-reference resolution, validation, and derived vectors contribute output. Power row method 6294 alone has 6,928 instructions, and post-load method 6293 has 1,875 more.
4. **Every default branch is not enumerated.** Common scalar defaults and complete spawn-rate inheritance are closed, but category constructors and post-load branches are not represented as a field/default matrix.
5. **No mutation execution exists.** Missing/empty/malformed/duplicate/forward-parent/cycle/reorder mutations have not been run through the pinned reference loader and compared to canonical output.
6. **No normalized leaf exists.** Source-entry and loader semantic hashes are stable inputs, but `normalizedSha256` cannot be computed honestly without a canonical complete object encoding. Hashing source text or generic-parser output would falsely imply loader equivalence.

Accordingly, no implementation should claim `proven`, `source-equivalent`, or `normalized` status for all patch data from this evidence.

## Required acceptance harness

A future proof can close the bounded gap without committing proprietary tables:

1. Run the exact source parser, row loader, constructors, and post-load passes in the hash-pinned interpreted runtime or an independently differential-validated AVM2 interpreter.
2. Emit privacy-safe field descriptors: exact QName, AVM2 type, canonical value bits/order, source record ordinal, source field, contributing parent, loader method/byte PC, and branch outcome. Do not emit bulk names or values in the repository.
3. Compare every relevant source entry field-for-field against a canonical normalizer.
4. Mutation-test each field class with absent, empty, explicit default, malformed numeric, negative/fractional/overflow numeric, `--`, duplicate ID, duplicate name, missing parent, forward parent, multi-level parent, cycle, reordered records, reordered children/columns, empty quoted field, embedded comma, escaped quote, CRLF, and LF.
5. Assert both ordered vectors and keyed registries, including last-write-wins duplicate lookup and retained vector entries.
6. Canonicalize binary64 as exact bits and `int`/`uint` as 32-bit patterns. Preserve absent/inherited/explicit-default distinctions in provenance.
7. Compute a normalized leaf only after equivalence passes, binding source entry hash, loader semantic hash, canonical object bytes, and ordered provenance branches.
8. Fail closed on any source hash, method/byte-PC ledger, mutation outcome, field set/type, vector order, map key, or leaf change.

## Reproduction

Keep proprietary inputs under ignored paths. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:patch-loader-defaults -- \
  --abc artifacts/main.abc \
  --source-dir artifacts/research/brawlhalla-physics/decrypted
```

Successful output reports:

```json
{
  "decodedMethodBodies": 15010,
  "branchTargetsValid": true,
  "status": "partial-static-proof"
}
```

The command requires the exact ABC/build and all thirteen source-entry hashes, checks exact code and semantic hashes for the loader/support methods, validates every branch target, and asserts the claim-level instruction-ordinal/byte-PC ledger. It emits source names, hashes, and byte counts but no source payload or normalized table. Operating-system errors can still reveal a caller-supplied path.

`partial-static-proof` is intentional. A successful command is not the missing loader-equivalence or mutation test.

## Surfaced tickets and fog

No ticket was created or claimed. These are ticket-ready follow-ups surfaced by this resolution:

1. **Locate and prove the Dynamic `LevelDesc` loader.** Start from script initializer 5156's constants, then trace archive entry to normalized geometry objects and registries.
2. **Build a privacy-safe patch-loader mutation oracle.** Execute the pinned source parsers/loaders and emit complete typed field/branch descriptors without bulk proprietary data.
3. **Close category constructors and post-load resolution.** Begin with `PowerType`, `ItemType`, `ScoringType`, and `HeroType`, whose row methods are not their complete normalized-object closure.
4. **Prove AIR numeric parse edge cases.** Bind `Std.parseInt`/`parseFloat`, AVM2 `int`/`uint`/`Number` coercions, non-finite values, and exact binary64 output to the numeric-semantics profile.

These remain within the map's patch-snapshot and gameplay-data fog. They do not modify or restate the canonical map.

## Blockers

- No trustworthy loader execution trace or complete interpreted-runtime result is available.
- The actual `Dynamic.swz` level-data parser is not identified by the predecessor candidate.
- No mutation harness compares complete typed loader objects.
- Therefore stable normalized provenance leaves cannot yet be produced.

## Related reviewed evidence

- [Patch-snapshot closure at commit `629a95c`](https://github.com/NickTacke/brawlhalla-sim/blob/629a95c26a3d2a7b1fd51d43a16d0f7cbe02e996/artifacts/research/patch-snapshot-closure/patch-snapshot-closure.md)
- [AVM2 numeric semantics at commit `f6a92e5`](https://github.com/NickTacke/brawlhalla-sim/commit/f6a92e5)
- [Interpreted reference oracle at commit `2977064`](https://github.com/NickTacke/brawlhalla-sim/commit/2977064)
