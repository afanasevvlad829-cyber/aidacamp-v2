# Stage A / Phase 6 — QG-04 External Asset Localization

Date: 2026-04-08 (Europe/Moscow)

## Scope
- Remove external Figma-hosted runtime assets from active page entry (`dist/index.html`).

## Changes
- Replaced 2 external links:
  - `https://www.figma.com/api/mcp/asset/088eda68-d11e-4501-985f-7fbf70e9de72`
  - `https://www.figma.com/api/mcp/asset/4253872b-8ed2-4589-a61d-86042d8cfc43`
- New local path used for both:
  - `/assets/icons/robot-orange.svg`

## Rollback
- `archive/non-runtime/quarantine/rollback/dist.index.qg04-before-20260408_072950.html`
- `archive/non-runtime/quarantine/rollback/stage-a-batch-qg04-localize-figma-logo-20260408_072956.tgz`

## Validation
- Batch run (quick):
  - `docs/reset-audit/batch-runs/stage-a-batch-qg04-localize-figma-logo-20260408_072956.md`
- Result:
  - `build` PASS
  - `smoke` PASS

## Outcome
- External Figma asset dependency removed from active runtime markup.
- QG-04 moved from conflict candidate to localized/mitigated state.
