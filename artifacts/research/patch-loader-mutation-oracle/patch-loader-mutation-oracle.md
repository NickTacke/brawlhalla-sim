# Research: Privacy-safe patch-loader mutation oracle

Issue: [Build a privacy-safe patch-loader mutation oracle](https://github.com/NickTacke/brawlhalla-sim/issues/56)

## Summary

The strongest feasible contract is a hash-pinned, headless, patched-Ruffle complete-application runner that mutates only tiny synthetic patch fixtures, authenticates instrumentation at original method and byte-PC boundaries, and emits a canonical typed object graph or a stable explicit failure for every registered loader family and mutation. This is a contract design only. No loader mutation was executed, no canonical object output or failure corpus was produced, and no normalized provenance leaf exists, so issue 56's positive acceptance is **not satisfied**.

The design inherits the interpreted-reference oracle's complete-application, deterministic-host, independent-verifier, and authenticated-channel requirements. It narrows observation to loader completion boundaries and forbids proprietary payloads, raw runtime dumps, paths, arbitrary exception text, and private replay content.

## Verdict and evidence boundary

Issue 56 asks for controlled missing, empty, malformed, duplicate, parent, and source-order mutations and accepts only deterministic authenticated outputs or explicit failures for every relevant loader family, plus privacy-safe derived fixtures and provenance leaves. [Issue 56](https://api.github.com/repos/NickTacke/brawlhalla-sim/issues/56)

The predecessor investigation reached a negative result: selected parser, coercion, inheritance, duplicate, and insertion behavior is statically anchored, but complete loader objects, the `Dynamic.swz` level loader, category constructors, post-load passes, mutation executions, and normalized leaves remain unresolved. It explicitly says not to label a normalizer canonical or source-equivalent. [Issue 35 resolution](https://github.com/NickTacke/brawlhalla-sim/issues/35#issuecomment-5196333659) [Pinned loader evidence](https://github.com/NickTacke/brawlhalla-sim/blob/bdc8b2c4caecc4b3ebae84ea845a6c0387a4500a/artifacts/research/patch-loader-defaults/patch-loader-defaults.md)

The interpreted-reference planning decision selects patched Ruffle commit `6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943`, but records that no trustworthy target trace exists and runtime feasibility remains unproven. [Issue 5 resolution](https://github.com/NickTacke/brawlhalla-sim/issues/5#issuecomment-5186339961) [Pinned oracle specification](https://github.com/NickTacke/brawlhalla-sim/blob/29770640d30558a6bb6a25229253f2bc46d9ac92/artifacts/research/interpreted-reference-oracle/interpreted-reference-oracle.md)

### Contract design versus executed evidence

| Item | Designed here | Executed or produced |
| --- | --- | --- |
| Scope, threat model, request/response, canonical encoding, failure taxonomy | Yes | No |
| Authentication envelope and provenance-leaf construction | Yes | No keys, signatures, or leaves produced |
| Loader-family completeness registry | Schema and initial family inventory | No complete registry attested |
| Synthetic fixture derivation and privacy gates | Recipe | No fixture produced or reviewed |
| Six required mutation classes | Matrix | No mutation executed |
| Canonical object graph or explicit failure per case | Required format | None |
| Repeatability, optimizer, architecture, and capability gates | Protocol | Not run |
| Canonical normalizer comparison | Future consumer contract | Not run; no source equivalence claimed |

## Scope

### In scope

- Build `10.09.96325` only.
- The exact `main.abc` SHA-256 `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d` and the source-entry identities recorded by the pinned issue 35 artifact.
- The complete user-owned AIR application identity needed to reach its actual source parser, row loader, constructor, registry insertion, post-load, and cross-reference behavior.
- Tiny synthetic XML, game-delimited, and level-data fixtures derived by a deterministic privacy-reviewed recipe.
- Complete typed object graphs at declared loader-family completion boundaries, including ordered vectors, keyed registries, object identity/aliasing, references, and stable failures.
- Mutations for missing, empty, malformed, duplicate, parent, and source order.

### Out of scope

- Live-client capture, official-runtime game tracing, or instrumentation of an installed original application.
- Redistribution of executables, archives, extracted source entries, bulk normalized tables, decrypted assets, personal replays, credentials, paths, or arbitrary runtime strings.
- Gameplay traces or claims of tick-level state equivalence.
- A generic XML/CSV parser as a substitute for execution of the pinned loader closure.
- Official Adobe/HARMAN execution of Brawlhalla. An authorized runtime may be used only for tiny non-game VM/AIR synthetic tests under the issue 5 boundary.
- Any claim that Ruffle output is official behavior or source-equivalent without the trust gates below.

These exclusions follow the repository rule that executables, archives, extracted bytecode/assets, personal replays, credentials, and paths must not be committed, while small derived evidence records are allowed when their limitations are documented. [Contributing evidence policy](https://github.com/NickTacke/brawlhalla-sim/blob/bdc8b2c4caecc4b3ebae84ea845a6c0387a4500a/CONTRIBUTING.md)

## Threat and privacy model

### Protected material

- Original application and patch bytes.
- Extracted XML, delimited, and level-data payloads.
- Product-specific names and values not already necessary as reviewed schema identifiers.
- Filesystem layout, account data, machine metadata, credentials, memory addresses, private replay content, and signing secrets.

### Adversaries and failure modes

1. **Input substitution:** a different build, source entry, runtime patch, fixture recipe, schema, or instrumentation transform is presented as the pinned cohort.
2. **Forged observation:** original target code or an undeclared hook emits an oracle-looking record.
3. **Host influence:** wall clock, entropy, locale, filesystem order, asynchronous scheduling, audio pacing, UI, storage, or network changes loader results.
4. **Partial observation:** only row methods are serialized while constructors, post-load passes, references, registries, or derived fields are omitted.
5. **Privacy exfiltration:** raw input, exception messages, paths, arbitrary strings, or bulk objects escape through success, failure, logging, crash, or timing channels.
6. **False equivalence:** deterministic Ruffle behavior is mislabeled official loader behavior or canonical source equivalence.
7. **Replay or mix-and-match:** a valid signed response for one request, runtime, family, or fixture is attached to another.

### Security properties

- Fail closed before execution on any identity mismatch or incomplete family record.
- Original bytes remain immutable. Only an independently verified transformed copy runs.
- Every observation is authorized by a run-local capability unavailable to original ActionScript and attested by an external signing key.
- The semantic payload is deterministic. Authentication binds the exact request and payload without weakening reproducibility.
- Success output contains only synthetic values. Failure output contains stable codes and anchors, never raw exception text.
- Authentication proves which pinned harness emitted bytes. It does **not** prove official-runtime equivalence.

## Oracle architecture

Use a headless `core` embedder at Ruffle commit `6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943`, with the deterministic patches and complete AIR boundary required by the issue 5 specification. Ruffle's pinned AVM2 loader parses each ABC, loads classes/scripts, and respects lazy initialization, so a raw method evaluator would omit observable application-domain and initialization behavior. [Ruffle `do_abc`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2.rs#L503-L547)

Stock Ruffle is not an oracle:

- frame execution uses measured host time, catch-up, audio skew, timers, sockets, and connections; [Ruffle player scheduling](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/player.rs#L475-L588)
- `getTimer` reads `Instant::now()`; [Ruffle `getTimer`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/globals/flash/utils.rs#L17-L27)
- AVM RNG seeds from current date/time; [Ruffle RNG seed](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm_rng.rs#L48-L66)
- timeout behavior depends on host elapsed time; [Ruffle timeout check](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/activation.rs#L945-L956)
- AIR filesystem APIs are compatibility stubs, including empty directory listings; [Ruffle `File`](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/globals/flash/filesystem/File.as#L71-L102)
- the pinned API table reaches AIR 29 while the target descriptor is AIR 32. [Ruffle API versions](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/api_version.rs#L87-L101)

The runner must route every state-influencing host operation through one deny-by-default deterministic service boundary, disable network/native payload execution, expose only hash-pinned read-only synthetic fixtures, sort any approved enumeration by canonical byte name, and use deterministic operation budgets rather than semantic host-time timeouts.

## Authentication envelope

Authentication has two layers.

### 1. In-runtime emission authorization

A transformation manifest declares each hook as:

```text
{hookId, familyId, phase, originalAbcSha256, originalMethodId,
 originalBytePc, originalBodySha256, transformedBodySha256,
 expectedCallStack, maxEmissions, schemaSha256}
```

For each fresh process, the harness injects a 256-bit capability into verified instrumentation only. The target never receives, returns, logs, or serializes it. An emission is accepted only when the provider verifies:

- capability MAC over `requestSha256 || hookId || sequence || payloadSha256`;
- exact active original method, byte PC, call stack, phase, and sequence;
- hook and family membership in the signed transformation manifest;
- no reserved callback or token material in any original ABC;
- exactly one terminal emission for the requested family, unless the declared result is an earlier stable failure.

Any original `ExternalInterface` call, wrong token, duplicate or skipped sequence, wrong stack/PC, undeclared hook, or post-terminal emission invalidates the run.

### 2. External result attestation

The isolated harness signs this canonical envelope with deterministic Ed25519. The public key ID and public key are pinned in `oracleArtifactSetId`; the private key is never placed in the application, request, response payload, logs, or repository.

```json
{
  "protocol": "patch-loader-oracle/v1",
  "oracleArtifactSetId": "sha256:<hex>",
  "requestSha256": "sha256:<hex>",
  "resultSha256": "sha256:<hex>",
  "transcriptRootSha256": "sha256:<hex>",
  "signingKeyId": "sha256:<hex>",
  "signatureEd25519": "base64:<bytes>"
}
```

The signature input is the ASCII domain `brawlhalla-sim/patch-loader-oracle-envelope/v1\0` followed by fixed-order, unsigned 32-bit big-endian length-prefixed UTF-8 values for the six fields before `signatureEd25519`. Mixing a response across requests, artifacts, or transcripts therefore fails verification. Signing authenticates origin only.

## Request schema

The request itself uses canonical JSON as specified below:

```json
{
  "protocol": "patch-loader-oracle/v1",
  "oracleArtifactSetId": "sha256:<hex>",
  "build": "10.09.96325",
  "familyId": "item-spawn-rate",
  "familyRegistrySha256": "sha256:<hex>",
  "fixtureId": "fx:<recipe-version>:<hex>",
  "fixtureSha256": "sha256:<hex>",
  "mutation": {
    "class": "parent",
    "mutationId": "parent/forward-reference/v1",
    "parameters": []
  },
  "expectedSchemaSha256": "sha256:<hex>",
  "privacyProfile": "synthetic-derived/v1",
  "optimizerMode": "on",
  "targetTriple": "<pinned triple>"
}
```

Rules:

- `mutation.parameters` is an ordered array of schema-defined tagged scalars, never an unordered object.
- No caller path, original payload, arbitrary filename, user string, timestamp, environment value, or secret is accepted.
- `requestSha256` is SHA-256 over the exact canonical request bytes.
- A request is rejected before target execution if any digest, family status, fixture privacy approval, mode, or target triple is undeclared.

## Response schema

Exactly one of `success` or `failure` is present.

```json
{
  "protocol": "patch-loader-oracle/v1",
  "requestSha256": "sha256:<hex>",
  "status": "success",
  "familyId": "item-spawn-rate",
  "mutationId": "parent/forward-reference/v1",
  "canonicalObjectEncoding": "plob/v1",
  "canonicalObjectSha256": "sha256:<hex>",
  "canonicalObjectBase64": "base64:<privacy-safe synthetic bytes>",
  "fieldCount": "<u64 decimal>",
  "objectCount": "<u64 decimal>",
  "branchTranscriptSha256": "sha256:<hex>",
  "capabilityTranscriptSha256": "sha256:<hex>"
}
```

```json
{
  "protocol": "patch-loader-oracle/v1",
  "requestSha256": "sha256:<hex>",
  "status": "failure",
  "familyId": "item-spawn-rate",
  "mutationId": "parent/cycle/v1",
  "failure": {
    "code": "LOADER_EXCEPTION",
    "phase": "ROW_NORMALIZE",
    "exceptionClassQName": "<reviewed QName or empty>",
    "originalMethodId": "<u32 decimal or empty>",
    "originalBytePc": "<u32 decimal or empty>",
    "branchId": "<registered stable ID or empty>"
  },
  "failureSha256": "sha256:<hex>",
  "branchTranscriptSha256": "sha256:<hex>",
  "capabilityTranscriptSha256": "sha256:<hex>"
}
```

Allowed top-level failure codes are `IDENTITY_MISMATCH`, `REGISTRY_INCOMPLETE`, `FIXTURE_REJECTED`, `PARSER_REJECTED`, `LOADER_EXCEPTION`, `POST_LOAD_EXCEPTION`, `UNRESOLVED_REFERENCE`, `INSTRUMENTATION_FAULT`, `CAPABILITY_FAULT`, `NONDETERMINISTIC_RESULT`, `PRIVACY_REJECTION`, and `ORACLE_INTERNAL_FAULT`. The phase enum is fixed by the family registry. Raw error messages, stack strings, paths, source excerpts, partial objects, and logs never enter a valid response. Unknown exceptions become `ORACLE_INTERNAL_FAULT` and block acceptance rather than being guessed into a semantic category.

## Deterministic serialization

### Canonical JSON

Envelope, request, and response metadata are UTF-8 JSON with:

- no byte-order mark and one terminal LF;
- object keys sorted by unsigned UTF-8 byte order;
- no insignificant whitespace;
- strings escaped only for JSON-required characters, using lowercase `\u` hex for control escapes not represented by `\b`, `\t`, `\n`, `\f`, or `\r`;
- no JSON numeric tokens. All integers, bit patterns, and counts are decimal or fixed-width lowercase hexadecimal strings;
- arrays retained in semantic order.

### Canonical object bytes: `plob/v1`

`plob/v1` is a length-delimited binary typed graph, not a runtime heap dump.

1. Header: ASCII `PLOB`, version byte `1`, family-registry digest, schema digest.
2. All lengths and counts: unsigned LEB128 with shortest encoding.
3. Strings: UTF-8 byte length plus exact bytes. Only strings admitted by the synthetic privacy allowlist may serialize.
4. Values use one-byte tags: `undefined`, `null`, `false`, `true`, `int32`, `uint32`, `number64`, `string`, `object-ref`, `vector`, `map`, `byte-sequence`.
5. `int32` and `uint32`: exact 4-byte big-endian patterns. `number64`: exact 8-byte IEEE-754 binary64 pattern, preserving negative zero and observed NaN bits.
6. Objects receive IDs by deterministic breadth-first traversal from declared family roots. Roots follow registry order; fields follow the complete schema ledger; vectors follow runtime order; maps serialize as an ordered entry sequence and preserve the registry's declared lookup-key encoding.
7. Each object records exact class QName, all declared slots, all approved dynamic properties, and references. Aliasing and cycles use object references.
8. Ordered vectors and keyed maps are both emitted. One is never reconstructed from the other.
9. Undeclared class, field, dynamic property, collection, value kind, inaccessible slot, or privacy-disallowed string is a blocking failure, not omission.

This representation can satisfy field-for-field review only after the family schema ledger proves that every loader-produced and post-load field is represented. A digest alone is insufficient; acceptance requires the privacy-safe canonical bytes for every synthetic case.

## Fixture derivation

A fixture recipe runs locally against user-owned, hash-verified inputs. It never emits the original entry.

1. Verify build, archive, entry, ABC, loader method, and schema digests before reading payloads.
2. Select the smallest dependency-closed set that reaches one valid record and the requested branch. Record selection by structural ordinal and schema role, never by publishing an original value.
3. Replace every non-control identifier consistently with `SYN_<role>_<ordinal>`. Remap numeric IDs to small fixed values. Replace scalar values with public boundary constants selected by type. Preserve only grammar tokens, reviewed schema field names, required table/root names, and structural relationships.
4. Rebuild every required reference consistently. Do not copy free text, localized strings, filenames, URLs, opaque blobs, geometry arrays, or unused rows.
5. Apply exactly one declared mutation to the synthetic baseline. A compound case must have its own explicit mutation ID.
6. Serialize source bytes canonically per grammar, then compute `fixtureSha256` and a recipe transcript containing only recipe version, source identity hashes, structural ordinals, replacement roles, counts, and digests.
7. Run automated rejection for original byte substrings above a small reviewed threshold, source names/values outside allowlists, path patterns, URLs, account-like identifiers, high-entropy tokens, and size/count ceilings.
8. Require human privacy review before a fixture or its output becomes committable. Keep the original-to-synthetic mapping private and ephemeral.
9. Independently regenerate the fixture twice from the same pinned inputs. Byte inequality blocks it.

A synthetic fixture is derived test evidence, not a substitute patch snapshot and not proof that shipped source entries normalize identically.

## Mutation matrix

Every applicable cell is mandatory for every family. `N/A` requires a reviewed registry justification. Each case runs from a fresh process against an unmutated baseline fixture plus one declared mutation.

| Class | XML fixture cases | Game-delimited fixture cases | Registry/object assertions |
| --- | --- | --- | --- |
| Missing | absent optional child; absent required child; absent identifying attribute; absent row | absent cell via short row; absent required header; absent record | explicit default, null, skip, or stable failure; provenance distinguishes absent from empty |
| Empty | `<Field/>`; `<Field></Field>`; empty attribute `""`; empty row container | empty unquoted cell; `""`; empty final cell; blank physical row | exact string/list/numeric/bool result; empty list helper may be `[""]`; no collapsing with missing |
| Malformed | duplicate attribute; missing `=`; non-double quote; mismatched close; unexpected EOF; unknown child; malformed numeric/bool | unmatched quote; escaped quote; embedded comma; CRLF/LF; extra/short row; duplicate header; malformed numeric/bool | canonical typed result or registered failure at exact phase/anchor; no raw diagnostic |
| Duplicate | duplicate ID; duplicate name; duplicate logical index; adjacent and separated duplicates | same, plus duplicate primary key under both row orders | ordered vector retention, diagnostic branch, and keyed lookup winner are serialized separately |
| Parent | missing parent; backward parent; forward parent; multilevel chain; self-parent; two-node cycle; parent after reorder | same where family schema declares inheritance/reference-parent semantics | inherited versus explicit values remain distinguishable in branch transcript; no generic inheritance inference |
| Source order | swap adjacent records; reverse minimal cohort; swap parent/child; reorder child elements; move duplicate winner | swap rows; reorder columns with header; reorder header only; CRLF/LF variant | vector order, map winner, immediate lookup, post-load order, and deterministic failure point are explicit |

Required scalar subcases under missing/empty/malformed are: string, comma-list, signed int, unsigned int, binary64, boolean, enum/reference token, explicit zero/false, negative, fractional, overflow, non-finite spelling where accepted by grammar, whitespace variants, and `--` only where a category-specific path proves it meaningful. The issue 35 artifact statically proves selected common defaults, raw comma splitting, spawn-rate copy-before-override, and representative last-write-wins maps with source-ordered vectors, but those are expectations to test, not executed oracle outputs. [Pinned defaults and mutation requirements](https://github.com/NickTacke/brawlhalla-sim/blob/bdc8b2c4caecc4b3ebae84ea845a6c0387a4500a/artifacts/research/patch-loader-defaults/patch-loader-defaults.md#required-acceptance-harness)

## Loader-family completeness registry

The initial relevant-family inventory comes from the pinned issue 35 evidence. It is provisional until static reachability and actual loader closure prove completeness.

| Family ID | Source form | Known entry / candidate | Current closure status | Required mutation groups |
| --- | --- | --- | --- | --- |
| `dodge` | XML | `Game.swz.11.xml`, method 2672 | row loader bounded; complete defaults/post-load unknown | missing, empty, malformed, duplicate, order |
| `game-mode` | XML | `Game.swz.17.xml`, method 3732 | complete object closure unknown | all applicable, including references/order |
| `hero` | XML | `Game.swz.23.xml`, method 4123 | broad post-load derivations unresolved | all applicable |
| `hurtbox` | delimited | `Game.swz.24.dat`, method 4655 | row and registry tail bounded; complete object unknown | missing, empty, malformed, duplicate, order |
| `item-spawn-rate` | XML | `Game.swz.25.xml`, method 4809; constructor 4804 | inheritance field set statically bounded; execution absent | all six groups |
| `item-spawn-rules` | XML | `Game.swz.26.xml`, method 4818 | registry tail bounded; closure unknown | all applicable |
| `item` | delimited | `Game.swz.27.dat`, method 4834 | 1,745-instruction field/default closure incomplete | all applicable |
| `level-set` | XML | `Game.swz.30.xml`, method 5098 | registry tail bounded; closure unknown | all applicable |
| `level-geometry` | unresolved level data | 120 `Dynamic.swz` leaves; method 5156 is locator only | actual loader unidentified | registry blocked; no `N/A` assumptions allowed |
| `power-swap` | XML | `Game.swz.39.xml`, method 6264 | vector insertion observed; closure unknown | missing, empty, malformed, duplicate/grouping, order |
| `power` | delimited | `Game.swz.38.dat`, method 6294 | 6,928-instruction row and post-load closure incomplete | all applicable |
| `rune` | XML | `Game.swz.42.xml`, method 7108 | indexed overwrite bounded; closure unknown | missing, empty, malformed, duplicate index, order |
| `scoring` | XML | `Game.swz.43.xml`, method 7279 | post-load defaults/validation broad | all applicable |
| `stat-ladder` | XML | `Game.swz.52.xml`, method 11659 | row and name registry bounded; closure unknown | missing, empty, malformed, duplicate, order |

Each registry record must eventually include:

```text
{familyId, sourceIdentitySet, parserEntry, rowLoaders, constructors,
 nestedHelpers, postLoadPasses, crossReferencePasses, registryRoots,
 completionHook, failureHooks, fieldSchema, dynamicPropertyPolicy,
 collectionOrderPolicy, applicableMutationIds, fixtureIds,
 privacyApproval, staticReachabilityResult, reviewerApproval}
```

A family is `complete` only when the source-to-completion control/dataflow closure is reviewed, every output root and field is in the schema, every required mutation has a success or explicit failure result, and repeatability gates pass. The oracle rejects the entire acceptance run if any relevant family is absent, `unresolved`, `partial`, or unjustifiably `N/A`. Discovery of another gameplay-relevant loader changes the registry digest and invalidates the old completeness claim.

## Provenance leaf

For each `(familyId, fixtureId, mutationId)` case, create exactly one leaf after all trust gates pass:

```text
leaf = SHA256(
  "brawlhalla-sim/patch-loader-leaf/v1\0" ||
  LP(oracleArtifactSetId) ||
  LP(build) ||
  LP(familyRegistrySha256) ||
  LP(familyId) ||
  LP(sourceIdentitySetSha256) ||
  LP(loaderClosureSha256) ||
  LP(schemaSha256) ||
  LP(fixtureRecipeSha256) ||
  LP(fixtureSha256) ||
  LP(mutationId) ||
  LP(requestSha256) ||
  LP(status) ||
  LP(canonicalObjectSha256-or-failureSha256) ||
  LP(branchTranscriptSha256) ||
  LP(capabilityTranscriptSha256) ||
  LP(responseSha256)
)
```

`LP(x)` is unsigned 32-bit big-endian byte length followed by the exact UTF-8 field bytes. Leaves are sorted by UTF-8 `(familyId, fixtureId, mutationId)` and combined with domain-separated binary Merkle nodes. The suite root also binds the ordered leaf count and signing envelope digest.

A branch transcript contains only registered branch IDs, original method/byte-PC anchors, field-schema IDs, outcome tags (`absent`, `empty`, `explicit`, `inherited`, `defaulted`, `rejected`), and sequence numbers. It contains no source values. A provenance leaf is invalid if derived from source text, a generic parser, a partial object, or an unreviewed failure. **No leaf was produced in this investigation.**

## Trust gates

All gates are conjunctive.

1. **Identity:** exact build, application, archives, source entries, original ABC, Ruffle commit/dependency lock, deterministic patch, compiler/toolchain, target triple, transformer, independent verifier, schema, fixture recipe, family registry, host-services profile, and signing public key are bound in `oracleArtifactSetId`.
2. **Complete application:** descriptor, SWF/ABC initialization order, resources, extension metadata, loader startup, and every reached native/resource disposition are closed. A raw ABC evaluator is rejected.
3. **Independent verification:** every original and transformed ABC, body, branch, exception range, stack/scope bound, and hook rewrite passes an independent verifier before Ruffle verification.
4. **Authenticated hooks:** reserved-call absence, capability secrecy, method/PC/call-stack checks, exact emission counts, negative forgery tests, and external signatures pass.
5. **Deterministic host closure:** all reached clock, RNG, locale, filesystem, async, audio, UI, storage, network, and native operations are deterministic or rejected; no compatibility-stub default is accepted as fidelity evidence.
6. **Family/schema completeness:** every relevant family is complete; constructor, helper, post-load, reference, vector, map, and dynamic-field coverage is 100 percent against the reviewed ledger.
7. **Fixture privacy:** deterministic regeneration, allowlist, substring/path/secret/size scans, and independent human review pass.
8. **Mutation completeness:** every applicable matrix case emits canonical bytes or an explicit stable failure. No skipped, crashed, hung, or unclassified case passes.
9. **Repeatability:** byte-identical unsigned semantic responses across 100 fresh processes, optimizer-on/off, x64/arm64, and perturbed wall clock, locale, timezone, CPU load, scheduler, and filesystem creation order. Signatures are verified separately.
10. **Semantic conformance:** reached AVM2 behavior passes pinned synthetic VM tests; reached AIR members pass authorized non-game synthetic goldens and independent differentials where available. Agreement is corroboration, not official-game proof.
11. **Privacy and review:** valid-output logs are empty or schema-limited, failure paths leak no protected data, and an independent reviewer approves identities, registry completeness, fixtures, outputs, leaves, and unexplained-difference ledger.

Ruffle verification invokes the optimizer pipeline even when the disable option is involved, so optimizer-off is not an independent bytecode verifier. The separate verifier remains mandatory. [Ruffle verifier](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/verify.rs#L500-L524) [Ruffle optimizer](https://github.com/ruffle-rs/ruffle/blob/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src/avm2/optimizer.rs#L16-L27)

## Verification protocol

1. Freeze and review the complete family registry. Reject unresolved `level-geometry` and any incomplete category rather than reducing scope silently.
2. Build the deterministic Ruffle runner and complete-application manifest. Prove zero unresolved reached capability at the loader-ready boundary.
3. Independently verify original/transformed ABCs and all completion/failure hooks. Run negative tests for original callback attempts, bad tokens, wrong PCs/stacks, duplicate sequence, payload substitution, and signature substitution.
4. Generate each synthetic baseline twice from pinned private inputs and compare bytes. Apply privacy scanners and reviewer approval before execution.
5. For each family and mutation ID, run one fresh process per repetition, mode, and architecture. Capture only authenticated terminal emissions.
6. Re-encode the typed graph independently from the authenticated scalar stream. Require byte equality between two independently implemented `plob/v1` encoders.
7. Assert schema field count, object count, object aliases, exact scalar bits, vector order, map entries/winner, completion phase, branch order, capability ledger, and no undeclared dynamic properties.
8. For failures, require identical code, phase, exception QName, method/PC, branch ID, and failure digest across all runs. Crashes, hangs, sandbox kills, raw errors, and unknowns fail.
9. Run metamorphic checks: only the targeted branch/field/order may differ from baseline unless the registry declares and explains downstream effects. Duplicate cases must check both retained vector entries and keyed winner. Parent cases must check immediate lookup and copy-before-override behavior. Order cases must not sort away runtime order.
10. Compare a proposed canonical normalizer against every accepted oracle result field-for-field. Normalizer success against this suite supports only the declared synthetic mutation scope, not every shipped entry or official source equivalence.
11. Construct leaves and suite root only after all gates pass. Recompute hashes and verify signatures in an independent review environment.

## Executable contract guard

[`patch_loader_oracle_contract.ts`](../../../tools/avm2-provenance/patch_loader_oracle_contract.ts) validates only metadata-safe `contract-only` loader-failure bundles. It checks the fixed fourteen-family inventory, pinned v1 XML/delimited/unresolved-level mutation-ID ledgers, UTF-8 ordering, canonical JSON hashes, loader-semantic failure codes, case leaves, suite roots, and privacy-denied metadata fields and strings. Infrastructure failures never satisfy a mutation case.

The guard rejects success payloads until an external `plob/v1` schema and decoded-byte privacy verifier exists. It also rejects `N/A` until externally authenticated reviewer evidence can be verified. It deliberately rejects any evidence status other than `contract-only` and always reports `acceptanceSatisfied: false`. Passing it proves internal failure-bundle conformance, not target execution, authenticated origin, family completeness, reference correctness, or issue acceptance. Those claims remain owned by the runtime and review gates above.

Run its synthetic tests with:

```bash
bun test tools/avm2-provenance/tests/patch_loader_oracle_contract.test.ts
```

Validate a future contract-only bundle with:

```bash
bun run validate:patch-loader-oracle-contract -- path/to/contract-bundle.json
```

## Feasibility and exact blockers

### Feasible in principle

- Ruffle exposes a headless core, AIR mode, SWF/ABC loading, call-stack state, an external-interface provider, and configurable backends suitable for the selected architecture.
- Static issue 35 evidence supplies exact build/source/method hashes and representative parser/default/inheritance/registry anchors from which to begin hook discovery.
- Tiny dependency-closed synthetic fixtures can, in principle, avoid redistribution while preserving branch structure.
- A typed graph encoder can preserve exact AVM2 scalar bits, ordered vectors, keyed maps, references, and explicit failures without publishing bulk shipped data.

These are architectural observations, not proof that the target boots or any loader can be isolated safely.

### Blocking today

1. No deterministic patched-Ruffle harness or complete AIR boot for this target is evidenced.
2. No trustworthy target loader execution or authenticated mutation output exists.
3. The actual `Dynamic.swz` `LevelDesc` loader remains unidentified.
4. Category constructors, nested helpers, post-load passes, and cross-reference closure remain incomplete, especially hero, item, power, and scoring.
5. AIR numeric parse/coercion edge cases remain insufficiently closed for exact malformed and boundary outputs.
6. No completion/failure hook ledger, independent transformation verifier, reserved-channel proof, capability implementation, or signing identity exists.
7. No complete field schema or dynamic-property policy exists for every family.
8. No privacy-reviewed derived fixture, mutation corpus, canonical object bytes, explicit failure corpus, branch transcript, or provenance leaf exists.
9. Stock Ruffle has host-time/RNG influences, AIR stubs, AIR 32 mismatch, and optimizer-verification limitations that block authority.
10. No 100-run, optimizer, architecture, host-perturbation, conformance, privacy, or independent-review gate has run.

Therefore the ticket's exact acceptance is unmet. Producing this specification does not satisfy the requirement for field-for-field outputs or failures for every family.

## Findings

1. **The acceptance target is executable evidence, not a paper interface.** Issue 56 requires actual deterministic authenticated outcomes and leaves. This artifact supplies the strongest bounded contract but none of those outcomes. [Issue 56](https://api.github.com/repos/NickTacke/brawlhalla-sim/issues/56)
2. **The family and object closure cannot be inferred from candidate row methods.** The predecessor proves selected branches but records missing constructors, post-load work, level loader, mutation execution, and complete object bytes. [Pinned issue 35 artifact](https://github.com/NickTacke/brawlhalla-sim/blob/bdc8b2c4caecc4b3ebae84ea845a6c0387a4500a/artifacts/research/patch-loader-defaults/patch-loader-defaults.md#why-canonical-equivalence-remains-unproved)
3. **Complete-application patched Ruffle is the strongest feasible execution base, but remains gated.** The reviewed architecture rejects raw-ABC and stock-Ruffle authority and requires deterministic host services, independent verification, and authenticated instrumentation. [Pinned issue 5 artifact](https://github.com/NickTacke/brawlhalla-sim/blob/29770640d30558a6bb6a25229253f2bc46d9ac92/artifacts/research/interpreted-reference-oracle/interpreted-reference-oracle.md#minimal-architecture-and-hash-gates)
4. **Privacy safety and field completeness can coexist only with synthetic fixtures.** Complete objects may be emitted for tiny synthetic inputs after strict derivation and review; original-entry normalized tables must remain private. Hashes alone do not satisfy field-for-field acceptance.
5. **Authentication does not create semantic authority.** Capability checks and signatures prevent forged/mixed outputs, while conformance, completeness, and review gates determine the limited authority of those outputs.

## Sources

### Kept

- [Issue 56 and its acceptance question](https://api.github.com/repos/NickTacke/brawlhalla-sim/issues/56) - direct ticket contract.
- [Issue 56 comment](https://api.github.com/repos/NickTacke/brawlhalla-sim/issues/56/comments) - confirms ownership only; it supplies no execution evidence.
- [Issue 35 and resolution](https://github.com/NickTacke/brawlhalla-sim/issues/35#issuecomment-5196333659) - authoritative negative status and exact blockers.
- [Pinned patch-loader defaults artifact](https://github.com/NickTacke/brawlhalla-sim/blob/bdc8b2c4caecc4b3ebae84ea845a6c0387a4500a/artifacts/research/patch-loader-defaults/patch-loader-defaults.md) - source identities, family inventory, static anchors, and required harness.
- [Issue 5 resolution](https://github.com/NickTacke/brawlhalla-sim/issues/5#issuecomment-5186339961) - selected architecture and explicit non-execution status.
- [Pinned interpreted-reference artifact](https://github.com/NickTacke/brawlhalla-sim/blob/29770640d30558a6bb6a25229253f2bc46d9ac92/artifacts/research/interpreted-reference-oracle/interpreted-reference-oracle.md) - trust levels, host boundary, authenticated instrumentation, privacy, and validation ladder.
- [Pinned Ruffle AVM2, verifier, optimizer, player, RNG, timer, API-version, and filesystem sources](https://github.com/ruffle-rs/ruffle/tree/6e69eaf89a5b0258920f4f1f0e4b7ce25acd0943/core/src) - direct implementation evidence for feasibility and blockers.
- [Pinned contribution policy](https://github.com/NickTacke/brawlhalla-sim/blob/bdc8b2c4caecc4b3ebae84ea845a6c0387a4500a/CONTRIBUTING.md) - privacy and provenance constraints.

### Dropped as authority

- Stock Ruffle runtime output - no output was obtained, and stock behavior violates required determinism/AIR gates.
- Generic XML/CSV parser behavior - useful only as source-shape checks, not loader-object evidence.
- Issue claim comments - workflow state is not technical acceptance evidence.
- Unpinned branch or `HEAD` content - mutable and unsuitable for semantic claims.
- Search-engine or third-party summaries - not used.

## Gaps and next actions

The first implementation milestone is not a mutation corpus. It is a fail-closed spike proving the complete application can reach exactly one known family completion under deterministic host services with authenticated instrumentation and no privacy leakage. That spike must still be labeled prototype-only. Next, close the family registry, especially `level-geometry`, category post-load passes, and numeric semantics; then derive and review one tiny fixture per grammar before expanding the matrix. No leaf or canonical-normalizer claim should appear until the full matrix and trust gates pass.
