# Phase 2 — Residual Legacy Map

Date: 2026-04-08 (Europe/Moscow)
Policy: quarantine-first, delete-second

## Classification

### LEGACY-ACTIVE
- Legacy token clusters still present in active runtime CSS artifact (`dist/cdn/app.css`):
  - `booking-stage-two-legacy`
  - `booking-stage-three-legacy`
  - `booking-stage-four-legacy`
  - multiple `offer-legacy-*`
- Measured legacy token matches in current artifact: `430`
- Status: active compat styling surface; not safe for blind delete.

### LEGACY-COMPAT
- `src/scripts/features/footer-tabs-compat.js`
- `src/scripts/features/floating-contacts-compat.js`
- Status: required compatibility modules after inline migration.

### LEGACY-QUARANTINED
- Backup/legacy files in runtime tree moved out in prior quarantine batches (QG-01/QG-02 history).
- Inline fallback blocks for FAQ/Shifts (`__faqFallbackBound`, `__shiftUxBound`) removed after quarantine + runtime verification.
- Rollback preserved in `archive/non-runtime/quarantine/rollback/**`.

### SAFE-TO-DELETE-LATER
- Remaining duplicate inline blocks in `dist/index.html` only after explicit migration to source modules and smoke proof.
- Any stale backup files recreated in runtime folders after future passes.

### UNKNOWN
- Count: `0`
- Rule applied: uncertain items were not deleted and were mapped to compat/legacy-active buckets.

## Verification notes
- `bash ./build.sh` -> PASS
- `node ./tools/smoke-booking-ui-playwright.mjs` -> PASS
- No orphan assets currently detected in `dist/images` + `dist/icons` vs active shell refs.

## Phase result
- Residual legacy is mapped and separated by behavior class.
- Unknown bucket is reduced to zero for current active-surface scope.
