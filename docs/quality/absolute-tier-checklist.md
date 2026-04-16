# Absolute-Tier Checklist

## KPI Locks
- `css_duplicate_selectors <= 3`
- `js_if_count <= 95`
- `js_ternary_count <= 10`
- `js_state_mutations = 0`
- `main.js` orchestration-only (`no-business-in-main`)

## Mandatory Gates
1. `./tools/quality-metrics.sh`
2. `./tools/quality-check.sh`
3. `./tools/architecture-check.sh`
4. `./tools/smoke-runtime-api.sh https://dev.aidacamp.ru`
5. `bash ./tools/smoke-booking-flow.sh https://aidacamp.ru`
6. `node ./tools/smoke-booking-ui-playwright.mjs https://dev.aidacamp.ru`
7. `bash ./tools/build-astro-preview.sh`

## Acceptance Rule
- Run full gate pack 3 times in a row.
- No code changes between runs.
- Any failed smoke/gate resets acceptance cycle.

## Notes
- Rollout is out of scope in this phase.
- Known infra-only `lead 503` is not a UI/runtime architecture regression.
