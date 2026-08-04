# brawlhalla-sim

[![CI](https://github.com/NickTacke/brawlhalla-sim/actions/workflows/ci.yml/badge.svg)](https://github.com/NickTacke/brawlhalla-sim/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Status: pre-alpha](https://img.shields.io/badge/status-pre--alpha-orange)

An unofficial deterministic Brawlhalla simulation engine built from replay data, shipped game data, and structurally verified AVM2 bytecode evidence.

The project is designed around one rule: **unknown behavior stays unknown**. Runtime constants and state transitions must have traceable provenance before they replace provisional behavior.

> [!IMPORTANT]
> This is a pre-alpha research implementation, not a replay-accurate engine yet. The current runtime has deterministic scaffolding, replay parsing, caller-supplied physics inputs, and early movement/KO modules. Level collision, complete movement states, combat, respawn, and strict replay verification remain unfinished.

## Repository layout

| Module | Purpose |
| --- | --- |
| [`@brawlhalla-sim/core`](packages/core) | Deterministic simulation loop and physics state |
| [`@brawlhalla-sim/replay-format`](packages/replay-format) | Replay envelope and format 264/268 parser |
| [`@brawlhalla-sim/avm2-provenance`](tools/avm2-provenance) | Structural AVM2 control/dataflow verification |

## Current capabilities

- Parses replay formats 264 and 268.
- Reconstructs timestamped per-entity input snapshots and press/release edges.
- Accepts patch-resolved fighter physics through the core interface.
- Runs a deterministic 16 ms simulation loop.
- Models provisional movement, dodge, knockback, KO, and scoring behavior.
- Verifies the patch 10.09 grounded-jump path across 15,010 decoded AVM2 methods.

## Verified patch 10.09 movement evidence

The provenance tool currently proves this chain:

```text
replay snapshots
  -> timestamp sampler
  -> rising-edge input mask
  -> jump bit 16
  -> fighter jump method
  -> grounded pending impulse -57
  -> vertical velocity
  -> per-tick motion delta scale 0.384
```

It also distinguishes the separate `dash.Jump` path (`-170`) and proves that path exits before `jump.Ground`.

See [docs/provenance.md](docs/provenance.md) for exact method IDs, values, assumptions, and reproduction instructions.

## Getting started

Requires [Bun](https://bun.sh/) 1.3.14 or newer.

```bash
bun install
bun run check
```

To run AVM2 movement provenance, provide your own legally obtained `main.abc`:

```bash
mkdir -p artifacts
cp /path/to/main.abc artifacts/main.abc
bun run provenance:movement
```

Game binaries, decrypted assets, generated game-data tables, and replay files are intentionally excluded from this repository. The workspace packages are configured for public npm publication but have not been released yet.

Optional local replay diagnostics require an explicit corpus path:

```bash
BRAWLHALLA_REPLAY_DIR=/path/to/replays bun test packages/core/tests/replay-verify.test.ts
```

## Roadmap

1. Replace provisional vertical movement with the verified 10.09 unit model.
2. Port level, platform, and wall collision.
3. Resolve horizontal acceleration, friction, dash, dodge, aerial jump, and wall jump behavior.
4. Replace provisional hit, damage, and knockback behavior.
5. Implement KO, respawn, invulnerability, and state-reset transitions.
6. Gate releases against ordered replay outcomes across a 10.09 corpus.

## Evidence policy

Every behavior should be classified as one of:

- **Proven:** unique static or runtime provenance with validated control/dataflow.
- **Source-derived:** directly parsed from shipped game configuration.
- **Provisional:** isolated scaffolding that must not be tuned or presented as accurate.
- **Unknown:** deliberately unimplemented.

See [CONTRIBUTING.md](CONTRIBUTING.md) before changing physics behavior.

## Legal

This project is unofficial and is not affiliated with or endorsed by Ubisoft or Blue Mammoth Games. Brawlhalla and related names are trademarks of their respective owners. No game binaries or decrypted game assets are distributed here.

Licensed under the [MIT License](LICENSE).
