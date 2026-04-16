# Stage A / Phase 5 — Runtime Double-Event Validation

Date: 2026-04-08 (Europe/Moscow)

## Scope
- Validate FAQ/Shifts behavior after inline fallback quarantine toggles:
  - `window.__AC_INLINE_RUNTIME_QUARANTINE_FAQ=true`
  - `window.__AC_INLINE_RUNTIME_QUARANTINE_SHIFTS=true`
- Then execute delete-batch for proven-unused inline fallback scripts.

## Checks executed
- Runtime interaction check on `dist/index.html` (Playwright, local static server).
- Control compare against pre-inline rollback snapshot:
  - `archive/non-runtime/quarantine/rollback/dist.index.phase4.inline-before-20260408_071525.html`

## Observed results
- `faq_btn_exists=1`
- `faq_active_buttons=1` after click
- `faq_visible_panels=1` after click
- `shift_choose_exists=1`
- `shift_open_dialogs=1` after click
- `shift_actions_before=6`
- `shift_actions_after=6` after repeated open/close cycles

Interpretation:
- FAQ filter behavior is stable (single active tab + single visible panel).
- Shift booking modal open path is stable (single dialog open, no action-node growth, no duplicate UI scaffolding).

## Page error note
- Runtime check recorded page error:
  - `Cannot read properties of undefined (reading 'brandSub')`
- Control snapshot check (pre-inline) recorded the same page error.

Conclusion:
- This error is pre-existing and not introduced by inline fallback quarantine/delete.
- No duplicate-event regression detected for FAQ/Shifts.

## Delete batch executed
Removed from `dist/index.html`:
- FAQ inline fallback block (`__faqFallbackBound`)
- Shifts inline UX fallback block (`__shiftUxBound`)
- Inline quarantine toggle script (`window.__AC_INLINE_RUNTIME_QUARANTINE_*`)

## Post-delete validation
- `bash ./build.sh` → PASS
- `./tools/quality-check.sh` → FAIL (baseline dist thresholds, unchanged class of failure)
- `node ./tools/smoke-booking-ui-playwright.mjs` → PASS

## Rollback anchors
- Pre-delete file snapshot:
  - `archive/non-runtime/quarantine/rollback/dist.index.phase5.delete-inline-before-20260408_072302.html`
- Pre-inline file snapshot:
  - `archive/non-runtime/quarantine/rollback/dist.index.phase4.inline-before-20260408_071525.html`
- Quarantine archive (QG-01/QG-02):
  - `archive/non-runtime/quarantine/rollback/stage-a-qg01-qg02-20260408_071346.tar.gz`
