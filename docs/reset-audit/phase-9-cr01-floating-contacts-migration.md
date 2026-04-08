# Stage A / Phase 9 — CR-01 Floating Contacts Migration

Date: 2026-04-08 (Europe/Moscow)

## Scope
- Move floating contacts init from inline runtime script (`dist/index.html`) into source module layer.
- Preserve current behavior and telemetry call (`floating_contacts_toggle`).

## Changes
1. Added source module:
   - `src/scripts/features/floating-contacts-compat.js`
2. Removed inline floating contacts script from:
   - `dist/index.html` (script block containing `data-floating-contacts` and `floating_contacts_toggle`)

## Rollback points
- `archive/non-runtime/quarantine/rollback/dist.index.cr01-floating-inline-before-20260408_074414.html`
- `archive/non-runtime/quarantine/rollback/stage-a-batch-cr01-floating-contacts-migrate-20260408_074641.tgz`

## Validation
- Quick batch report:
  - `docs/reset-audit/batch-runs/stage-a-batch-cr01-floating-contacts-migrate-20260408_074641.md`
- Result:
  - `build` PASS
  - `smoke` PASS
- Targeted runtime check:
  - `FLOAT_INIT_PASS=true` (`__acFloatingContactsInit` set; root/panel/fab present)

## Notes
- Baseline pageerror persists in runtime (`bookingRuntimeBridgeApi before initialization`) and is tracked separately.
- This phase does not attempt to fix booking runtime ordering.
