# Phase 4 — JS Cleanup Plan (Dist-Centric)

Date: 2026-04-08 (Europe/Moscow)

## Objective
Reduce JS concentration and duplicate-init risk without breaking active runtime.

## Cleanup strategy
1. Migrate one inline executable fragment at a time from `dist/index.html` into source module layer.
2. After each migration:
   - `./tools/run-fast-check.sh`
3. At phase close:
   - `./tools/run-full-check.sh`
4. Keep rollback snapshot before each fragment migration.

## Safe first-wave targets
- Remaining inline UI helper blocks that do not own booking state transitions.
- Non-critical view glue that already has corresponding source feature APIs.

## Must-not-touch in wave 1
- Booking stage orchestration core
- Hero variant runtime decisions
- Runtime action dispatcher contracts
- Lead submission and overlay confirm paths

## Expected phase result
- Fewer duplicate-init surfaces.
- No active logic removal without proof.
- Runtime remains green under fast checks.

## Inline migration queue snapshot (from `dist/index.html`)
- Inline no-src script blocks detected: `12`
- High-priority migration candidates (large + event-driven):
  - `#1` size `8435` (booking/hero/faq/shift/analytics/events)
  - `#2` size `1951` (booking/events)
  - `#3` size `3809` (gallery/events)
  - `#4` size `2006` (video/events)
  - `#7` size `1903` (stay/events)
  - `#9` size `2399` (team/events)
- Low-risk/non-executable payload blocks:
  - `#8` JSON-like content blob
  - `#10` small manifest-like blob
  - `#11`, `#12` empty arrays

Next action:
- Migrate one executable block at a time to source modules, then run `./tools/run-fast-check.sh`.

## Executed P4-Q1 (inline block #2)
- Backup created:
  - `archive/non-runtime/quarantine/rollback/dist.index.p4-inline2-before-20260408_101055.html`
- Source migration:
  - added `src/scripts/features/booking-reminder-compat.js`
  - module is bundled into `dist/cdn/app.bundle.js`
- Runtime shell cleanup:
  - removed inline executable block #2 (booking reminder helper) from `dist/index.html`
  - inline no-src script count: `12 -> 11`
- Validation:
  - `./tools/run-fast-check.sh` -> PASS

## Executed P4-Q2 (inline FAQ filter helper)
- Backup created:
  - `archive/non-runtime/quarantine/rollback/dist.index.p4-inline-faq-before-20260408_101228.html`
- Source migration:
  - added `src/scripts/features/faq-filter-compat.js`
  - module is bundled into `dist/cdn/app.bundle.js`
- Runtime shell cleanup:
  - removed inline FAQ filter executable block from `dist/index.html`
  - inline no-src script count: `11 -> 10`
- Validation:
  - `./tools/run-fast-check.sh` -> PASS

## Executed P4-Q3 (inline reviews slider helper)
- Backup created:
  - `archive/non-runtime/quarantine/rollback/dist.index.p4-inline-reviews-before-20260408_101350.html`
- Source migration:
  - added `src/scripts/features/reviews-slider-compat.js`
- Runtime shell cleanup:
  - removed inline reviews slider executable block from `dist/index.html`
  - inline no-src script count: `10 -> 9`
- Validation:
  - `./tools/run-fast-check.sh` -> PASS

## Executed P4-Q4 (inline gallery helper)
- Backup created:
  - `archive/non-runtime/quarantine/rollback/dist.index.p4-inline-gallery-before-20260408_101530.html`
- Source migration:
  - added `src/scripts/features/gallery-compat.js`
- Runtime shell cleanup:
  - removed inline gallery executable block from `dist/index.html`
  - inline no-src script count: `9 -> 8`
- Validation:
  - `./tools/run-fast-check.sh` -> PASS

## Executed P4-Q5 (inline videos helper)
- Backup created:
  - `archive/non-runtime/quarantine/rollback/dist.index.p4-inline-videos-before-20260408_101725.html`
- Source migration:
  - added `src/scripts/features/videos-compat.js`
- Runtime shell cleanup:
  - removed inline videos executable block from `dist/index.html`
  - inline no-src script count: `8 -> 7`
- Validation:
  - `./tools/run-fast-check.sh` -> PASS

## Executed P4-Q6 (inline stay gallery helper)
- Backup created:
  - `archive/non-runtime/quarantine/rollback/dist.index.p4-inline-stay-before-20260408_101919.html`
- Source migration:
  - added `src/scripts/features/stay-gallery-compat.js`
- Runtime shell cleanup:
  - removed inline stay executable block from `dist/index.html`
  - inline no-src script count: `7 -> 6`
- Validation:
  - `./tools/run-fast-check.sh` -> PASS

## Executed P4-Q7 (inline team helper)
- Backup created:
  - `archive/non-runtime/quarantine/rollback/dist.index.p4-inline-team-before-20260408_102033.html`
- Source migration:
  - added `src/scripts/features/team-compat.js`
- Runtime shell cleanup:
  - removed inline team executable block from `dist/index.html`
  - inline no-src script count: `6 -> 5`
- Validation:
  - `./tools/run-fast-check.sh` -> PASS

## Phase boundary validation snapshot
- `./tools/run-full-check.sh`:
  - build: PASS
  - smoke: PASS
  - quality-check/gate: FAIL on known dist thresholds
    - `dist_bytes=163523` (improved vs earlier 177440)
    - `dist_max_line_length=136289` (still fail)
