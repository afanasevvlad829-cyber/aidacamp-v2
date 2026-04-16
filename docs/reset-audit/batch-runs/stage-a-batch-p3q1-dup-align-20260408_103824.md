# Stage A Batch — P3-Q1 duplicate align-items cleanup

Date: 2026-04-08 10:38:24 +0300

## Change
- File: `src/styles/main.css`
- Selector: `#desktop-booking-card.booking-stage-two-legacy .shift-list`
- Removed overridden declaration:
  - `align-items:stretch;`
- Kept active declaration with fallback:
  - `align-items:var(--booking-stage2-x-flex, stretch);`

## Rollback
- `archive/non-runtime/quarantine/rollback/main.css.p3q1-dup-align-before-20260408_103824.bak`

## Validation
- `./tools/run-fast-check.sh` -> PASS
