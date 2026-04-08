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

## Known Gates (not introduced by phases 0-2)
- `dist_max_line_length` above strict threshold.
- `dist_bytes` and `dist_max_line_length` above historical baseline in `docs/quality/baseline.env`.

## Next Workline
- Phase 3: dist-centric CSS cluster cleanup (`main.css` -> `dist/cdn/app.css`), quarantine-first.
- Phase 4: dist-centric JS domain cleanup (`main.js` + features/config), duplicate-init reduction with runtime proof.
