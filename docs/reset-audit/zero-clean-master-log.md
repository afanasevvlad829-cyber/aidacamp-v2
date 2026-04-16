# Zero-Clean Master Log (Dist-Centric Reset Program)

Date: 2026-04-08 (Europe/Moscow)
Mode: local runtime verification
Program model: dist-centric runtime with source-fed artifacts

## Program Scope
- Runtime shell: `dist/index.html`
- Runtime artifacts: `dist/cdn/app.css`, `dist/cdn/app.bundle.js`
- Active source inputs: `src/styles/main.css`, `src/scripts/main.js`, `src/scripts/features/**`, `src/scripts/config/**`, `src/pages/legal.html`

## Validation Execution Policy (Speed Mode)
- In-phase checks (fast): `./tools/run-fast-check.sh`
- Phase-close checks (full): `./tools/run-full-check.sh`
- Docs-only updates: no pipeline run unless runtime/source files changed

## Phase Log

| Phase | Name | Status | Key Output | Validation |
|---|---|---|---|---|
| 0 | Re-baseline on real architecture | COMPLETE | `docs/reset-audit/re-baseline.md` | build PASS, smoke PASS, quality-check FAIL(known dist line), quality-gate FAIL(known dist baseline mismatch) |
| 1 | Active path consolidation | COMPLETE | `docs/reset-audit/active-path-map.md`, `docs/reset-audit/source-of-truth.md` | build PASS, smoke PASS, quality-check FAIL(known), quality-gate FAIL(known) |
| 2 | Quarantine verification + residual legacy map | COMPLETE | `docs/reset-audit/residual-legacy-map.md` | build PASS, smoke PASS, quality-check FAIL(known), quality-gate FAIL(known) |
| 3 | Dist-centric CSS cleanup (safe micro-batches) | IN PROGRESS | `docs/reset-audit/phase-3-css-cluster-audit.md`, `docs/reset-audit/phase-3-css-cleanup.md` | fast-check PASS; full gate known dist FAIL |
| 4 | Dist-centric JS cleanup (inline -> source migration) | IN PROGRESS | `docs/reset-audit/phase-4-js-domain-audit.md`, `docs/reset-audit/phase-4-js-cleanup.md` | build PASS, smoke PASS, quality-check/gate known dist FAIL |
| 5 | Asset root normalization | IN PROGRESS | `docs/reset-audit/phase-5-asset-root-map.md`, `docs/reset-audit/phase-5-asset-normalization.md` | build PASS, smoke PASS, quality-check/gate known dist FAIL |
| 6 | Quality gate realignment | IN PROGRESS | `docs/reset-audit/phase-6-quality-gate-realignment.md` | rerun proof: `docs/reset-audit/phase-checks/phase-6-rerun-20260408_102755.md` |
| 7 | Source vs output discipline audit | IN PROGRESS | `docs/reset-audit/phase-7-source-output-discipline.md` | rerun proof: `docs/reset-audit/phase-checks/phase-7-rerun-20260408_102946.md` |
| 8 | Final cleanup pass (current wave) | COMPLETE | `docs/reset-audit/phase-8-final-cleanup.md`, `docs/reset-audit/delete-manifest.md` | rerun proof: `docs/reset-audit/phase-checks/phase-8-rerun-20260408_103346.md` |
| 9 | Final comparative audit (current wave) | COMPLETE | `docs/reset-audit/post-zero-clean-audit.md`, `docs/reset-audit/zero-clean-final-report.md` | rerun proof: `docs/reset-audit/phase-checks/phase-9-rerun-20260408_103605.md` |

## Known Gates (not introduced by phases 0-2)
- `dist_max_line_length` above strict threshold.
- `dist_bytes` and `dist_max_line_length` above historical baseline in `docs/quality/baseline.env`.

## Next Workline
- Phase 3: dist-centric CSS cluster cleanup (`main.css` -> `dist/cdn/app.css`), quarantine-first.
- Phase 4: dist-centric JS domain cleanup (`main.js` + features/config), duplicate-init reduction with runtime proof.

## Current check snapshot (2026-04-08 10:27 MSK)
- build: PASS
- smoke: PASS
- quality-check: FAIL (`dist_max_line_length`, baseline delta `dist_bytes` and `dist_max_line_length`)
- quality-gate: FAIL (same known reasons)
- latest measured: `dist_bytes=163523`, `dist_max_line_length=136289`

## Source/output discipline snapshot (2026-04-08 10:29 MSK)
- build pipeline proof confirms:
  - source-fed bundles from `src/styles/main.css` and `src/scripts/**`
  - generated artifacts in `dist/cdn/*` and `cdn/*`
  - `dist/index.html` canonical shell is not rewritten by default (`AC_ALLOW_DIST_REWRITE=1` required)
- rerun file: `docs/reset-audit/phase-checks/phase-7-rerun-20260408_102946.md`

## Phase 8 snapshot (2026-04-08 10:33 MSK)
- build: PASS
- smoke: PASS
- quality-check: FAIL (known dist-threshold class)
- quality-gate: FAIL (known dist-threshold class)
- no new destructive deletion in this wave; delete scope unchanged from already-proven Phase 5 set
- rerun file: `docs/reset-audit/phase-checks/phase-8-rerun-20260408_103346.md`

## Phase 9 snapshot (2026-04-08 10:36 MSK)
- build: PASS
- smoke: PASS
- quality-check: FAIL (known dist-threshold class)
- quality-gate: FAIL (known dist-threshold class)
- comparative audit docs updated with current-wave closure status
- rerun file: `docs/reset-audit/phase-checks/phase-9-rerun-20260408_103605.md`
