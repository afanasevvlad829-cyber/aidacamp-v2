# Stage A / Phase 8 — CR-01 Footer Tabs Migration

Date: 2026-04-08 (Europe/Moscow)

## Scope
- Migrate footer mobile tabs init from inline runtime script (`dist/index.html`) into source module layer.
- Keep behavior unchanged.

## Changes
1. Added source module:
   - `src/scripts/features/footer-tabs-compat.js`
2. Removed inline footer tabs script from:
   - `dist/index.html` (script block with `[data-footer-tab]` / `[data-footer-panel]` handling)
3. Added safe guard in events runtime to prevent hard crash:
   - `src/scripts/features/events.js`
   - guarded `CONTENT_MAP.ui` access via local `uiContent` fallback

## Rollback points
- `archive/non-runtime/quarantine/rollback/dist.index.cr01-footer-inline-before-20260408_073828.html`
- `archive/non-runtime/quarantine/rollback/stage-a-batch-cr01-footer-tabs-quarantine-20260408_074243.tgz`

## Validation
- Quick batch report:
  - `docs/reset-audit/batch-runs/stage-a-batch-cr01-footer-tabs-quarantine-20260408_074243.md`
- Result:
  - `build` PASS
  - `smoke` PASS
- Targeted local runtime check (Playwright, mobile viewport):
  - `FOOTER_TABS_PASS=true`
  - docs panel default visible, sections panel visible after tab click.

## Notes
- Legacy fallback markers for FAQ/Shifts remain removed (`0`).
- CR-01 moved to partial mitigation state: one inline domain (footer tabs) migrated to source module.
