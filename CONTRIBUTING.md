# Contributing

Contributions are welcome, especially evidence-backed behavior traces, deterministic tests, and interface improvements.

## Development

```bash
bun install
bun run check
```

Keep changes focused. A physics change should include a test and identify its evidence source.

## Evidence requirements

Do not tune constants until output resembles a replay. Instead, record one of these provenance levels:

1. **Proven:** unique control/dataflow from replay or input state to the resulting runtime write.
2. **Source-derived:** exact value parsed from shipped XML or another declarative game-data source.
3. **Provisional:** temporary scaffolding isolated behind a clear name and limitation.
4. **Unknown:** no implementation yet.

A proven claim should include:

- Game patch and build.
- Source artifact hash when applicable.
- Method, class, field, or configuration identifiers.
- Control-flow and dataflow checks.
- Unit conversion and tick ordering.
- A regression test or reproducible analysis command.

## Repository hygiene

Never commit:

- Brawlhalla executables or game archives.
- Extracted ABC, SWF, or SWZ files.
- Decrypted game assets.
- Personal replay files.
- Credentials, access tokens, or local paths.

Analysis code and small derived evidence records are acceptable when their source and limitations are documented. Do not contribute bulk extracted game-data tables.

## Pull requests

Explain what changed, why it is needed, and how it was verified. Separate evidence discovery from runtime implementation when practical so each review has one clear claim to evaluate.
