# Stage A / Phase 2 — Quarantine Candidates (No Deletions)

Date: 2026-04-08 (Europe/Moscow)
Policy: quarantine-first, delete-second.

## Candidate Groups

## QG-01 — Legacy backups in runtime folder (ready for quarantine)
Status: `LEGACY`
Count: 10 files

Files:
- `dist/index.html.bak.docs-object-1775594180`
- `dist/index.html.bak.faq-click-20260407_2320`
- `dist/index.html.bak.faq-fallback-20260407_2328`
- `dist/index.html.bak.faq-fallback-20260407_2332`
- `dist/index.html.bak.footer-ref-1775594374`
- `dist/index.html.bak.footer-width-1775594278`
- `dist/index.html.bak.shift-actions-lock-1775594700`
- `dist/index.html.bak.shift-booking-modal-1775594421`
- `dist/index.html.bak.shift-modal-clean-1775594474`
- `dist/index.html.bak.shifts-icons-booking-popup-1775594594`

Quarantine action (planned):
- Move to `archive/non-runtime/quarantine/stage-a-dist-bak/`
- Rebuild + smoke + quality-check/gate

## QG-02 — Runtime-adjacent orphan assets (quarantine candidates)
Status: `ORPHAN`
Count: 18 files

List:
- `dist/images/contacts/contacts-map-01.webp`
- `dist/images/gallery/gallery-02.jpg`
- `dist/images/gallery/gallery-07.jpg`
- `dist/images/gallery/gallery-09.jpg`
- `dist/images/shifts/shift-1-modal.avif`
- `dist/images/stay/stay-bathroom-01.webp`
- `dist/images/stay/stay-lounge-01.webp`
- `dist/images/stay/stay-room-01.webp`
- `dist/images/team/team-book-01.webp`
- `dist/images/team/team-daria-01.webp`
- `dist/images/team/team-ivan-01.webp`
- `dist/images/team/team-olesya-01.webp`
- `dist/images/videos/video-01.jpg`
- `dist/images/videos/video-02.jpg`
- `dist/images/videos/video-03.jpg`
- `dist/images/videos/video-04.jpg`
- `dist/images/videos/video-05.jpg`
- `dist/icons/faq/check.svg`

Quarantine action (planned):
- Move to `archive/non-runtime/quarantine/stage-a-orphan-assets/`
- Run full page scan for 404s + smoke + visual sanity

## QG-03 — Inline scripts inside `dist/index.html` (fragment-level quarantine candidates)
Status: `DELETE-CANDIDATE` (validated in Phase 5)

Candidates:
- FAQ inline fallback block (`__faqFallbackBound`)
- Shift UX inline block (`__shiftUxBound`)
- Other inline script blocks duplicating bundle behavior

Quarantine action (planned):
1. Introduce feature-flag guard for each inline block (off by default in cleanup branch).
2. Validate no runtime regression with bundled modules only.
3. Keep reversible toggles until Phase 3 validation closes.

Validation status:
- Runtime double-event check completed (Phase 5).
- FAQ/Shifts flows remain stable with inline fallback toggled off.
- Pre-existing pageerror (`brandSub`) confirmed as baseline (present before quarantine too).
- Candidate is approved for delete phase with rollback retained.
- Additional progress:
  - Footer mobile tabs inline script migrated to source module and removed in Phase 8.

## QG-04 — External Figma-hosted assets in runtime markup
Status: `MIGRATED TO LOCAL` (quick-validated)
Count: 2 references detected

Action executed:
- Replaced both runtime Figma URLs in `dist/index.html` with local asset:
  - `/assets/icons/robot-orange.svg`
- Rollback:
  - `archive/non-runtime/quarantine/rollback/dist.index.qg04-before-20260408_072950.html`
  - `archive/non-runtime/quarantine/rollback/stage-a-batch-qg04-localize-figma-logo-20260408_072956.tgz`

Validation status:
- `build` PASS
- `smoke` PASS
- Quick batch report:
  - `docs/reset-audit/batch-runs/stage-a-batch-qg04-localize-figma-logo-20260408_072956.md`

## Guardrails before any delete
- Must pass: `bash ./build.sh`
- Must pass: `node ./tools/smoke-booking-ui-playwright.mjs`
- Must keep baseline behavior for hero, booking, menu, faq, shifts, contacts.
- Any uncertain element stays `UNKNOWN` / `CONDITIONAL`, no delete.
