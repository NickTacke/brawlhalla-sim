# Packed weapon flags in Brawlhalla 10.09.96325

Issue: [Recover packed weapon flag semantics](https://github.com/NickTacke/brawlhalla-sim/issues/25)

## Verdict

The state-4 loadout field `_-o2f._-b1T` is a packed unsigned 32-bit weapon-skin value:

| Bits | Structural name | Meaning |
| ---: | --- | --- |
| 0-14 | `weaponSkin1Id` | Low 15-bit `WeaponSkinID` |
| 15 | `reservedWeaponSkinBit15` | Preserved and checksum-significant, with no direct weapon/costume producer or consumer identified in the pinned ABC |
| 16-30 | `weaponSkin2Id` | High 15-bit `WeaponSkinID` |
| 31 | `weapon2First` | Set selects weapon skin 2 as the first/primary weapon; clear selects weapon skin 1 |

Bit 15 must not be exposed as `morphWeapon2`. That parser name is an unsupported hypothesis. Reviewed semantic packers never set the bit, no exact packed-field reference directly tests it, and all direct literal `0x8000` tests in the ABC belong to unrelated values. The replay roundtrip and game-data checksum still preserve it, so a simulator must retain it as reserved input rather than discard it.

Bit 31 is best named `weapon2First`. The readable setting `ForcePrimaryWeaponFirst` supplies inverse product-language context: forcing the primary weapon first is compatible with leaving `weapon2First` clear. The readable field is not a direct producer of the packed bit, so `forcePrimaryWeaponFirst` would also have the wrong polarity as a bit name.

Confidence is **high** for the bit layout, bit-15 non-semantics within the pinned client, checksum effect, bit-31 polarity, replay roundtrip, and observed corpus counts.

## Evidence grades

- **Proven:** exact typed-trait or instruction-level control/dataflow in the hash-pinned ABC, including complete exact-QName ledgers and an exact direct literal-test ledger.
- **Observation:** a direct value from the hash-attested local replay corpus.
- **Structural name:** the narrowest behavior name supported by proven polarity and consumers when no unobfuscated declaration name exists.
- **Unknown:** the inspected primary evidence does not settle the claim.

Repository parser names and earlier reports were locators only. The verdict derives from the pinned executable and hash-attested replay bytes.

## Hash-pinned evidence identity

All digests are SHA-256.

| Evidence | Identity | Use |
| --- | --- | --- |
| Official-build `main.abc` | `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` | Packed field, packers, masks, consumers, readable setting, checksum |
| Sole semantic build string | `10.09.96325` | Build identity |
| Authentic format-268 manifest | `b044f9d1d76d51c61e0b21dae3074e02ac4248594ed84e79b65a59326db7d1ac` | Exact 12-replay cohort and fixture hashes |
| ABC decoder | `abc-disassembler` commit `ad9714d`, pinned by `bun.lock` | Instruction and byte-PC decoding |
| Packed-field exact-reference ledger | `c54f7502e4040b3dc3b9c4c9a05805555b6b30e9b3a3d9ceab587d226df494d8` | Every exact `_-o2f._-b1T` reference |
| Direct literal bit-15 test ledger | `3a6b7ccde2ed04af3f0d2d2f7b0184648c942147f810f9549d4da8508511c06f` | Every exact immediate `(value & 0x8000) == 0` bytecode pattern |
| Bit-31 exact-reference ledger | `040b33b3f8b6bc6b9b8e87c822bcb478c0eb45cbdaf65aad32210c9a5e747f2e` | Every exact reference to `_t4x._-Gz` |
| Pack/select helper-reference ledger | `1de92407fca33d10c963495c07e09e7819c0a9949eced3a47764938840bdbb76` | Exact packer and selector callsites |

The analyzer decodes all 15,010 method bodies, rejects invalid branch targets, verifies every replay hash, and fails if these identities or ledgers change.

## Packed field and replay roundtrip

Class 213 `_-o2f` has exact field `_-b1T` QName `36:21060`, typed as AVM2 `uint`. It has no explicit constant initializer.

Writer method 6519 belongs to class 357 `_-16`, trait `_-L2J` QName `36:10726`. It loops over loadout vector `_-fy` QName `36:32062`, coerces each entry to `_-o2f`, and emits four words:

| Value | Read PC | Exact QName | Write PC |
| --- | ---: | --- | ---: |
| Encoded hero, low 16 bits | `1179`, mask at `1183-1186` | `_-xn`, `36:33517` | `1187` |
| Costume ID | `1201` | `_-66d`, `36:37948` | `1205` |
| Rune/stance index | `1219` | `_-m3K`, `36:25607` | `1222` |
| Packed weapon skins | `1236` | `_-b1T`, `36:21060` | `1240` |

All four writes call the exact uint writer `_-S2c` QName `36:14851`. The loop closes at PC 1248.

Reader method 6510 calls uint reader `_-8v` at PC 1171 and assigns the result to the same exact `_-b1T` field at PC 1176. It does not mask, normalize, or validate any packed bit. Every unsigned 32-bit pattern survives the replay reader.

## Semantic packers establish the occupied bits

Default costume builder method 2037 reads readable `mWeaponSkin1` at PC 190 and `mWeaponSkin2` at PC 194, pushes `false` at PC 197, and calls exact helper `_-t4x._-v5x` at PC 198.

Helper method 14711 reads each typed weapon skin's `WeaponSkinID` field `_-M6S`, shifts the second ID left 16, ORs the IDs, and conditionally ORs `_t4x._-Gz`. It contains no `0x8000` literal or bit-15 operation. Its complete exact caller set is methods 2037, 3688, and 6363. All semantic packers use this helper.

The masks themselves are exact:

- Script initializer method 14722 sets `_t4x._-Gz` QName `36:29928` from signed `-2147483648` at PCs 39-41. As `uint`, this is `0x80000000`.
- Initializer method 14909 sets `_t4x._-Q5g` QName `36:12427` to `2147418112`, or `0x7fff0000`, at PCs 78427-78430.
- Low-ID consumers use literal `32767`, or `0x7fff`.

Thus bits 0-14 and 16-30 are IDs, bit 31 is the packer's explicit boolean, and bit 15 is outside every reviewed semantic packer input.

## Bit 15: reserved, not morph

### No packed-field test or producer

The analyzer enumerates every exact immediate `push 0x8000`, optional `convert_u`, `bitand`, `push 0`, `equals` bytecode pattern in the ABC. None of those direct-test methods, or their direct callsites, references exact packed field QName `36:21060`.

| Owner and trait | Literal / `bitand` PCs | Disposition |
| --- | --- | --- |
| class 88 `_-J2H._-5X` | `357/359`, `510/512` | Unrelated uint protocol state |
| class 95 `_-R41._-13s` | `104/106` | Flag in a separate unsigned-short ByteArray record |
| class 147 `_-V4R._-L3X` | `2417/2420`, `2490/2493` | Fighter input/control field `_-p2p`, not loadout data |
| class 260 `_-E6o._-y4Y` | `118/121` | Unrelated field `_-U1F` |
| class 342 `PowerType._-j3w` | `3/5` | PowerType uint helper |
| class 350 `_-45g._-k3h` | `108/111` | Unrelated field `_-T1X` |
| class 601 `_-y12._-460` | `1074/1077`, `1980/1983`, `3113/3116` | UI/control field `_-p2p` |

Method 4899 separately clears `0x8000` from unrelated `_-E6o._-U1` at PCs 534-539. It is a mutation, not a test, and has no packed-field edge.

No exact packed-field reference directly applies `0x8000`, and none of the reviewed semantic packers introduces it. This is a bounded static closure, not a proof against arbitrary transitive behavior through dynamically dispatched code. Raw replay/network/setter paths can preserve caller-supplied uint values, but they do not name a semantic flag.

### Proven effects that remain

Bit 15 is not inert at the format level:

1. Writer 6519 and reader 6510 preserve the full uint.
2. Game-data checksum method 6527 reads the full packed field at PC 391 and multiplies it by `2 + loadoutIndex` at PCs 395-400 before uint accumulation.
3. Whole-word copy, equality, and diagnostic paths retain the value as part of the packed uint.

A simulator must therefore preserve bit 15 for replay fidelity and checksum validation while attaching no morph, weapon, or costume behavior to it.

### Corpus observation

The reviewed cohort has 12 authentic format-268 replays and 48 loadouts. Bit 15 is clear in all 48. This confirms the default cell only. It does not prove that another valid configuration cannot carry the reserved bit.

## Bit 31: `weapon2First`

### Direct selection in method 3845

Method 3845 belongs to class 189 `_-O2T`, static trait `_-M4T` QName `36:10193`. In its bit-controlled branch:

1. PCs 564-574 read packed field `_-b1T`, mask `_t4x._-Gz`, and apply `bitand`.
2. PCs 575-579 compare with zero and apply two `not` operations. The result is true when bit 31 is clear.
3. A true selector resolves `packed & 0x7fff` through the typed weapon-skin registry at PCs 598-621.
4. A false selector resolves `(packed & 0x7fff0000) >>> 16` at PCs 625-656.
5. If lookup fails, the same selector chooses readable `mWeaponSkin1` at PCs 671-685 or `mWeaponSkin2` at PCs 691-699.
6. PCs 701 onward publish the selected readable `WeaponSkin`/`WeaponSkinID` output.

Therefore bit 31 clear selects weapon skin 1. Bit 31 set selects weapon skin 2.

### Independent pickup/display branch in method 5578

Method 5578 belongs to class 296 `_-x4w`, static trait `_-e4x` QName `36:21321`. It independently tests exact bit-31 mask QName `36:29928` at PCs 926-940.

- Bit 31 set clears local branch 22 at PC 947, disabling the weapon-1 branch while leaving weapon 2 enabled.
- Bit 31 clear clears local branch 23 at PC 955, disabling the weapon-2 branch while leaving weapon 1 enabled.
- The branches consume readable `mBaseWeapon1`/`mWeaponSkin1` at PCs 969/1056 and `mBaseWeapon2`/`mWeaponSkin2` at PCs 1240/1327 while constructing first-pickup/display data.

This second consumer proves the product effect independently of method 3845's output shape.

### Fighter availability is separate from first ordering

Fighter constructor method 2790 belongs to class 147 `_-V4R` QName `36:15246`. It reads the packed word at PC 5765, sends `packed & 0x7fff` to exact method `_-f0._-QR` QName `36:30597` at PC 5788, and sends `(packed & 0x7fff0000) >>> 16` to the same method at PC 5817.

Both weapon skin IDs are registered regardless of bit 31. The flag chooses which weapon is first; it does not remove the other skin.

Method 6363 similarly extracts bit 31 into a boolean at PCs 366-380 and passes it unchanged to the pack helper while replacing or falling back weapon skins. Method 3703 can explicitly set or clear the bit. Method 3696 records a set bit in internal bookkeeping `_-V2r`; it does not supply the readable product meaning.

### Readable product-language evidence

The sole exact string `ForcePrimaryWeaponFirst` appears in parser method 12936 at PC 896. The method parses a boolean and stores field `_-R16._-X5Q` QName `36:16784` at PC 912. That exact field has only one consumer, method 12918 PC 311, where it gates a zero write to nested state.

This is useful inverse context: the product distinguishes forcing weapon 1 first from allowing another first weapon. It is not a source-to-packed-bit edge. Since set bit 31 selects weapon 2, naming the bit `forcePrimaryWeaponFirst` would reverse its proven polarity. `weapon2First` is the narrower correct name.

### Every direct bit-31 test

| Owner and trait | Mask/test PCs | Effect |
| --- | --- | --- |
| class 180 `_-P2C._-M3o` | `368-375` | Set-bit bookkeeping in `_-V2r` |
| class 189 `_-O2T._-M4T` | `571-579` | Selects weapon skin 2 when set, weapon skin 1 when clear |
| class 296 `_-x4w._-e4x` | `933-940` | Chooses weapon-2 versus weapon-1 pickup/display branch |
| class 346 `_-v41._-55I` | `371-378` | Preserves the choice through repacking/fallback |
| class 781 `_-t4x._-9R` | `4-11` | Returns whether bit 31 is set |

The complete exact-mask ledger also covers the initializer, packers, mutators, preserve helpers, and secondary UI/copy references across 18 methods. The analyzer emits every entry and pins their ordered digest.

### Corpus observation

Among the 48 reviewed loadouts, bit 31 is set in 2 and clear in 46. The cohort therefore exercises both values in authentic replay bytes. Static consumers prove polarity; corpus values establish production, not the semantic inference.

## Reproducible validation

Keep proprietary inputs under ignored paths or outside the repository. From the checkout root:

```bash
bun install --frozen-lockfile
bun run provenance:packed-weapon-flags -- \
  --abc /path/to/hash-pinned/main.abc \
  --manifest /path/to/hash-pinned/manifest.json
```

Useful bounded output:

```bash
bun run provenance:packed-weapon-flags -- ... \
  | jq '.status, .identity, .packedField, .bit15, .bit31, .reviewedCorpus'
```

Successful output reports `proven-for-reviewed-inputs`, 15,010 decoded bodies, valid branch targets, 12 fixtures, 48 loadouts, bit-15 counts `0/48`, and bit-31 counts `2/46` for set/clear.

The analyzer emits no replay bytes, fixture names, player names, player IDs, account data, or local input paths. Operating-system errors can still reveal a caller-supplied path.

## Confidence and residual gaps

### High-confidence conclusions

- Storage: unsigned 32-bit replay loadout word.
- IDs: low 15 bits are weapon skin 1; bits 16-30 are weapon skin 2.
- Bit 15: `reservedWeaponSkinBit15`, preserved and checksum-significant, with no direct semantic producer or consumer identified in the pinned ABC.
- Bit 31: `weapon2First`; set selects weapon 2 first, clear selects weapon 1 first.
- Default packers: bit 15 clear; bit 31 supplied independently as a boolean.
- Replay roundtrip: exact uint preservation.
- Corpus: bit 15 only clear; bit 31 observed both set and clear.
- Bounded closure: exact packed-field, direct bit-15 test, bit-31 mask, and helper ledgers are pinned.

### Residual uncertainty

1. **Original unobfuscated field names:** unknown. Both names are evidence-derived structural names.
2. **Reserved bit-15 origin outside the pinned client:** unknown. No reviewed fixture sets it, and no client semantic producer was found.
3. **`ForcePrimaryWeaponFirst` production policy:** the readable field is inverse contextual evidence, not a direct packed-bit producer. The complete conditions that suppress or permit `weapon2First` remain outside this ticket.
4. **Other builds and server behavior:** out of scope. Closure applies only to build `10.09.96325` and the pinned ABC.

## Ticket and fog impact

This resolves the packed weapon flag question without borrowing parser hypotheses. An implementation may expose the packed word as two 15-bit IDs, `reservedWeaponSkinBit15`, and `weapon2First`. It must preserve the reserved bit in raw state and checksum calculations.

No additional decision ticket is required to use these semantics. A future weapon-ordering investigation may separately prove the complete producer policy connecting game-mode `ForcePrimaryWeaponFirst`, randomization, and `weapon2First`. That belongs with the broader weapon spawn/pickup lifecycle fog, not this flag-identity resolution.
