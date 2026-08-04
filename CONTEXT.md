# Brawlhalla Simulation

This context defines the observable match behavior a deterministic Brawlhalla simulator reproduces.

## Language

**Tick-level state equivalence**:
Exact agreement with the reference game for every gameplay-relevant state and event at each simulation tick, including reference-compatible continuous values and the final result.
_Avoid_: Replay accuracy, outcome matching, epsilon-close simulation, bit-for-bit runtime equivalence

**Gameplay-relevant state**:
Match state that can affect a later gameplay transition or the final result.
_Avoid_: Complete runtime state, visual state

**Reference game**:
Official Brawlhalla build `10.09.96325`, whose match behavior defines correctness.
_Avoid_: Original engine, upstream simulator, patch family

**Patch snapshot**:
A separately installed, hash-verified set of immutable rules and gameplay data for the reference game.
_Avoid_: Game-data package, bundled assets

**Replay-driven simulation**:
A simulation requested with replay bytes as its only per-match input and resolved against the installed patch snapshot.
_Avoid_: Self-contained replay, replay-only engine

**Replay-producing match**:
Any match configuration for which the reference game emits a structurally valid replay.
_Avoid_: Standard match, supported fixture

**Supported replay**:
An authentic, structurally valid format-268 replay emitted by the reference game and consistent with the installed patch snapshot.
_Avoid_: Replay fixture, parseable replay

**Match simulator**:
The complete deterministic gameplay model, including physics, combat, items, mode rules, scoring, respawn, and match termination.
_Avoid_: Physics engine, replay player

**Physics engine**:
The match-simulator subsystem that governs movement, forces, geometry, and collision.
_Avoid_: Match simulator
