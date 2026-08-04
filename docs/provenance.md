# Movement provenance

## Verified target

- Patch: `10.09`
- Build: `10.09.96325`
- ABC SHA-256: `9fe9c83051343d5b0f667b44e87e6779854f7ee92b1014b279e033fc2bcfba2d`
- Decoded method bodies: `15,010`
- Branch-target validation: clean

The source ABC is not distributed. Supply your own copy at `artifacts/main.abc`.

## Proven replay-to-jump chain

| Stage | AVM2 evidence |
| --- | --- |
| Replay record | class 356 `_-E4h`, method 6509 |
| Replay timeline loader | class 164 `_-u16`, method 3507 |
| Input snapshot | class 251 `_-O3Y` |
| Snapshot insertion | class 330 `_-Tx`, method 6133 |
| Timestamp sampler | class 330 `_-Tx`, method 6135 |
| Input consumer | class 330 `_-Tx`, method 6125 |
| Fighter root | class 147 `_-V4R` |
| Jump application | method 2954 `_-61V` |
| Movement update | method 2887 `_-D38` |

Method 6125 computes a changed-and-held edge mask using `(current XOR next) AND current`. The gate linked to the fighter jump call uses replay input bit `16`.

## Proven values

| Value | Internal | Motion-delta equivalent per tick |
| --- | ---: | ---: |
| Grounded jump impulse | `-57` | `-21.888` |
| Dash jump impulse | `-170` | `-65.28` |
| Vertical velocity scale |  | `0.384` |
| Gravity field | `3.75` |  |
| Gravity velocity change per tick | `1.44` | `0.55296` |
| Vertical velocity thresholds | `70`, `85` |  |

The dash-jump predicate is structurally recovered as:

```text
_-ZQ + 160 > inputTime && (_-32b != null || _-U5H == 1)
```

The dash branch emits `dash.Jump` and jumps past the `jump.Ground` branch. The `_-E3p` branch near literal `170` gates only a telemetry increment; it does not gate the impulse assignment.

## Reproduction

```bash
bun install
bun run provenance:movement
```

Expected result:

```json
{
  "game": { "patch": "10.09", "build": "10.09.96325" },
  "status": "proven",
  "blockers": []
}
```

The command exits `0` only when all structural uniqueness checks succeed. Invalid branch targets exit `1`; unresolved provenance exits `2`.
