# Stage A — Delete Manifest

Date: 2026-04-08 (Europe/Moscow)
Policy: prove -> quarantine -> delete

## Confirmed delete batch (Phase 5)

Target file:
- `dist/index.html`

Removed fragments:
- FAQ inline fallback block (`__faqFallbackBound`)
- Shifts inline fallback/UX block (`__shiftUxBound`)
- Inline quarantine toggles (`window.__AC_INLINE_RUNTIME_QUARANTINE_FAQ/SHIFTS=true`)

Reason:
- Runtime checks showed no duplicate-event regression after quarantine.
- Behavior for FAQ and Shifts remained stable on active runtime path.

Validation after delete:
- `bash ./build.sh` -> PASS
- `node ./tools/smoke-booking-ui-playwright.mjs` -> PASS
- `./tools/quality-check.sh` -> FAIL (known baseline dist thresholds; not introduced by this delete)

Rollback points:
- `archive/non-runtime/quarantine/rollback/dist.index.phase5.delete-inline-before-20260408_072302.html`
- `archive/non-runtime/quarantine/rollback/dist.index.phase4.inline-before-20260408_071525.html`
- `archive/non-runtime/quarantine/rollback/stage-a-qg01-qg02-20260408_071346.tar.gz`

## Next delete candidates
- Dist fragment-level duplicate handlers that remain classified LEGACY/ORPHAN after Phase 6 validation.
- Any candidate marked UNKNOWN stays preserved.
