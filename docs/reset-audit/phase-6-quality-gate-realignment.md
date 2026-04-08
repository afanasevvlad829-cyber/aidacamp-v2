# Phase 6 — Quality Gate Realignment (Dist-Centric)

Date: 2026-04-08 (Europe/Moscow)

## Current gate behavior
- `quality-check`: fails on `dist_max_line_length`.
- `quality-gate`: fails on baseline deltas for `dist_bytes` and `dist_max_line_length`.

## Baseline evidence
- `dist/index.html` bytes: `177440`
- `dist/index.html` max line length: `117808`
- Runtime smoke remains PASS under current values.

## Latest execution evidence (2026-04-08)
- Evidence file: `docs/reset-audit/phase-checks/phase-6-rerun-20260408_102755.md`
- `build.sh`: PASS
- `smoke-booking-ui-playwright`: PASS
- `quality-check`: FAIL (known dist thresholds only)
  - `dist_bytes=163523` (hard limit PASS, baseline delta FAIL)
  - `dist_max_line_length=136289` (hard limit FAIL, baseline delta FAIL)
- `quality-gate`: FAIL (same known dist threshold reasons)

## Known-fail status
- This remains a `KNOWN_FAIL` class for the current dist-centric shell until either:
1. dist shell formatting/size is reduced structurally, or
2. phase-6 baseline policy is explicitly realigned with approved rationale.

## Interpretation
- Failures are currently mostly structural/baseline-mismatch for dist-centric shell format.
- They are useful as debt signal, but not always direct runtime-break indicators.

## Realignment approach
1. Keep strict source checks unchanged.
2. Split dist checks into:
   - hard fail (corruption/sync/runtime-risk)
   - debt fail (oversize/format debt)
3. Maintain full visibility in reports while avoiding false stop on known dist-shell structure.
4. Record baseline distribution updates only with explicit decision and audit note.

## Fast/full execution policy
- In-phase: `./tools/run-fast-check.sh`
- Phase-close: `./tools/run-full-check.sh`
- Full gate remains mandatory at phase boundary.
