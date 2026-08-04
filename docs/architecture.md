# Architecture

The repository is a Bun workspace with two publishable runtime modules and one private research tool.

## Module graph

```text
@brawlhalla-sim/replay-format -> @brawlhalla-sim/core

@brawlhalla-sim/avm2-provenance -> user-supplied main.abc
```

## Core seam

`@brawlhalla-sim/core` owns deterministic state transitions. Its interface accepts simulation configuration, normalized input timelines, roster and spawn data, and caller-supplied patch physics. It returns deterministic events and final state summaries.

The core does not perform filesystem access, network access, rendering, persistence, game-data extraction, or patch selection. Callers provide all external data and are responsible for resolving stance and patch-specific values before simulation.

## Deterministic clock

Serialized replay timestamps advance in 16 ms quanta. Rendering cadence is outside the simulation contract. The current runtime processes one input frame and one state transition per replay tick.

## Data ownership

- `replay-format` owns decoding and replay-format compatibility.
- `core` owns normalized simulation state and behavior.
- Callers own game-data extraction, patch selection, and physics resolution.
- `avm2-provenance` owns reproducible evidence extraction, not runtime behavior.

## Current limitation

The core preserves a provisional simulation scaffold while evidence-backed replacements are developed. Provisional behavior is identified in source and must not be presented as replay accurate. The public interface will remain pre-1.0 until level collision, movement-state sequencing, combat, and respawn are validated end to end.
