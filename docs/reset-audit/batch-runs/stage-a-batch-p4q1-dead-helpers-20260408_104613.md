# Stage A Batch — P4-Q1 dead helper removal (aggressive-safe)

Date: 2026-04-08 10:46:13 +0300
Mode: aggressive (proof + rollback)

## Change
- File: `src/scripts/main.js`
- Removed proven-unused helpers:
  - `getShiftContextLine` (definition-only, no runtime references)
  - `formatOfferDeadline` (definition-only, no runtime references)
- Removed no-op compatibility branch:
  - `applyMobileSectionAccordion` (empty function)
  - its only call site in `renderAll`

## Rollback
- `archive/non-runtime/quarantine/rollback/main.js.p4q1-dead-helpers-before-20260408_104613.bak`

## Validation
- `./tools/run-fast-check.sh` -> PASS
