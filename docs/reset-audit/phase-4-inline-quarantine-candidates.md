# Phase 4 — Inline JS Quarantine Candidates

Date: 2026-04-08 (Europe/Moscow)
Policy: migrate one block -> fast check -> keep rollback -> then delete loser

## Candidate queue (priority)
1. Block #2 (`size=1951`)
- Scope: booking reminder modal helper
- Risk: low-medium
- Plan: move to `src/scripts/features/booking-reminder-compat.js` with guarded init
- Status: DONE (migrated and inline removed)

2. Block #6 (`size=687`)
- Scope: faq filter helper
- Risk: low
- Plan: migrate into existing FAQ/global-ui binding layer
- Status: DONE (migrated to `faq-filter-compat.js` and inline removed)

3. Block #5 (`size=945`)
- Scope: reviews slider helper
- Risk: low
- Plan: move into media/ui feature module
- Status: DONE (migrated to `reviews-slider-compat.js` and inline removed)

4. Block #3 (`size=3809`)
- Scope: gallery root interactions
- Risk: medium
- Plan: migrate after #2/#6/#5 proof chain
- Status: DONE (migrated to `gallery-compat.js` and inline removed)

5. Block #4 (`size=2006`)
- Scope: videos modal interactions
- Risk: medium
- Plan: migrate with modal flow ownership check
- Status: DONE (migrated to `videos-compat.js` and inline removed)

6. Block #7 (`size=1903`)
- Scope: stay section interactions
- Risk: medium
- Plan: migrate after gallery/videos
- Status: DONE (migrated to `stay-gallery-compat.js` and inline removed)

7. Block #9 (`size=2399`)
- Scope: team section interactions
- Risk: medium
- Plan: migrate last in this queue
- Status: DONE (migrated to `team-compat.js` and inline removed)

## Non-executable payload blocks (keep as data)
- Block #8 (JSON-like payload)
- Block #10 (manifest-like payload)
- Blocks #11/#12 (empty arrays)

Current inline no-src remainder after migration wave:
- analytics inline bootstrap block
- payload script blocks (JSON/manifests/empty arrays)

Notes:
- `ac-build-components`, `ac-build-media-manifest`, `ac-build-team-manifest` are injected by `build.sh`.
- `ac-build-media-manifest` and `ac-build-team-manifest` currently contain empty arrays (`[]`) and are treated as generated data-layer markers, not executable runtime logic.

## Rollback procedure per block
1. Copy pre-change `dist/index.html` to rollback archive.
2. Add source module and hook through active runtime init path.
3. Remove inline block candidate.
4. Run `./tools/run-fast-check.sh`.
5. If fail -> immediate rollback from archive.
