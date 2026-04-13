# CODE_READY Pre-Report (No Rollout)

Generated: 2026-04-05 09:46 MSK

## Status

- `CODE_READY=YES` for architecture/quality phase (without production rollout).
- Rollout remains explicitly out of scope for this phase.
- Runtime/content contracts are frozen as `v2-final-draft` for Zero Legacy cycle.
- Gate policy lock: any regression in quality/architecture/smoke blocks movement to next batch.

## KPI Snapshot

- `css_duplicate_selectors = 0`
- `js_if_count = 67`
- `js_ternary_count = 7`
- `js_state_mutations = 0`
- `dist_bytes = 56263`
- `main_js_lines = 2443`
- `safeinvoke_only_wrappers_in_main = 0`

## Ideal Targets (Zero Legacy cycle)

- `main.js` remains orchestration-only (no business/config blobs).
- `legacy_paths = 0` for active runtime path.
- `js_state_mutations = 0` (strict lock).
- `css_duplicate_selectors <= 3` (absolute-tier lock).
- `js_if_count <= 95`.
- `js_ternary_count <= 10`.
- `quality-check` + `architecture-check` + smoke pack stable on repeated runs.

## Gate Results

- `./tools/quality-check.sh` — PASS (threshold + baseline gates)
- `./tools/smoke-runtime-api.sh https://dev.aidacamp.ru` — PASS
- `bash ./tools/smoke-booking-flow.sh https://aidacamp.ru` — PASS (`lead 503` known infra constraint)
- `node ./tools/smoke-booking-ui-playwright.mjs https://dev.aidacamp.ru` — PASS (desktop/mobile)
- `bash ./tools/build-astro-preview.sh` — PASS
- Final acceptance loop (x3 consecutive runs, 2026-04-05 05:52–05:57 MSK) — PASS/PASS/PASS
- Checkpoint after Batch 48/49 (2026-04-05 07:33–07:35 MSK) — PASS (`quality-check`, `architecture-check`, `runtime-api`, `booking-flow`, `booking-ui`, `astro-build`)
- Final acceptance loop (x3 consecutive runs, 2026-04-05 07:42–07:44 MSK) — PASS/PASS/PASS (no code changes between runs)
- Absolute-tier checkpoint (2026-04-05 08:09 MSK): `css=3`, `if=79`, `ternary=8`, `state_mutations=0`
- Absolute-tier acceptance loop (x3 consecutive runs, 2026-04-05 08:10–08:12 MSK) — PASS/PASS/PASS (no code changes between runs)
- Zero Legacy monolithness wave acceptance loop (x3 consecutive runs, 2026-04-05 08:55–08:56 MSK) — PASS/PASS/PASS (no code changes between runs)
- Wrapper burn-down acceptance loop (x3 consecutive runs, 2026-04-05 09:07–09:08 MSK) — PASS/PASS/PASS (no code changes between runs)
- Wrapper burn-down checkpoint A (2026-04-05 09:17–09:18 MSK) — PASS (`quality-check`, `architecture-check`, `runtime-api`, `booking-flow`, `booking-ui`, `astro-build`)
- Wrapper burn-down checkpoint B (2026-04-05 09:27–09:28 MSK) — PASS (`quality-check`, `architecture-check`, `runtime-api`, `booking-flow`, `booking-ui`, `astro-build`)
- Wrapper burn-down checkpoint C (2026-04-05 09:31–09:32 MSK) — PASS (`quality-check`, `architecture-check`, `runtime-api`, `booking-flow`, `booking-ui`, `astro-build`), wrapper cap reached (`<=10`)
- Zero Monolith acceptance loop (x3 consecutive runs, 2026-04-05 09:32–09:33 MSK) — PASS/PASS/PASS (no code changes between runs)
- Zero Monolith checkpoint D (2026-04-05 09:45–09:46 MSK) — PASS (`quality-check`, `architecture-check`, `runtime-api`, `booking-flow`, `booking-ui`, `astro-build`), wrappers reduced to `0`

## Contract Lock (current)

- Orchestration uses `safeInvoke(...)` as primary feature invoke path.
- Runtime events contract is stable:
  - `state:sync`
  - `hero:*`
  - `booking:*`
  - `calendar:*`
  - `content:*`
  - `tracking:*`
- Content adapter API is stable:
  - `loadBlock(blockId, locale)`
  - `loadBlocks(blockIds, locale)`

## Main Refactor Outcomes

- `main.js` reduced to orchestration-first role with extracted feature flows:
  - `summary-flow`
  - `navigation-flow`
  - `docs-flow`
  - `ui-init-flow`
  - `booking-inline-runtime-flow`
  - `runtime-action-flow`
  - `runtime-init-flow`
  - and previously extracted booking/calendar/hero/media/telemetry flows
- Desktop-first architecture preserved; mobile remains presentation layer on shared state/actions.
- `hero_v3_simple` runtime canonicalized to single-step stage path (`stage=1`) for dev simple flow.
- Legacy booking stage CSS refs (`stage2/3/4`) reduced to zero in active `main.css` checks.
- Embedded `shifts/mediaContent` payloads removed from `main.js`; data now resolved from `AIDACAMP_CONTENT` via build-loaded config content scripts.
- Anti-regression gate now blocks any return of inline `const shifts=[...]` / `const mediaContent={...}` blobs in `main.js`.

## Known Non-Blocking Constraint

- Lead transport sometimes returns `503` due to Telegram transport/config availability.
- This is infra/runtime delivery constraint, not a code regression in UI/runtime architecture.

## Final Technical Status (No Rollout)

- `CODE_READY=YES` (architecture/quality phase complete).
- Rollout remains explicitly out of scope for this phase.
- Zero-legacy guardrails are active (`no-business-in-main` counters locked to factual zero for active legacy refs).
- Absolute-tier guardrails are active in `tools/quality-gate.sh` and `docs/quality/baseline.env`.
- Evidence: `docs/quality/acceptance-evidence-absolute-tier-2026-04-05.md`
