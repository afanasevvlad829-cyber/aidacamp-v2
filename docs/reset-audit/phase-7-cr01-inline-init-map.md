# Stage A / Phase 7 — CR-01 Inline Init Map (Inventory Only)

Date: 2026-04-08 (Europe/Moscow)
Policy: no deletion in this phase.

## Scope
- `dist/index.html` inline scripts vs bundled runtime `/cdn/app.bundle.js`.
- Goal: classify what remains after removing FAQ/Shifts inline fallback.

## Snapshot
- Total `<script>` blocks in `dist/index.html`: 15
- Inline executable scripts (without `src`): 11
- JSON manifests: 3 (`ac-build-components`, `ac-build-media-manifest`, `ac-build-team-manifest`)
- External bundle loader: 1 (`ac-build-main-js`)
- Inline fallback markers (`__faqFallbackBound`, `__shiftUxBound`): 0

## Inline executable blocks (current)
1. Analytics bootstrap (GA/YM/Mail)
2. Booking module inline init
3. Gallery module inline init
4. Videos module inline init
5. Reviews module inline init
6. FAQ tabs/accordion inline init
7. Stay carousel inline init
8. Team data manifest (JSON script)
9. Team module inline init
10. Footer tabs inline init
11. Floating contacts inline init

## Classification
- ACTIVE (must keep now):
  - Analytics bootstrap
  - Booking init
  - Gallery init
  - Videos init
  - Reviews init
  - FAQ init
  - Stay init
  - Team init
  - Footer tabs init
  - Floating contacts init
- GENERATED-DATA:
  - JSON manifests (`ac-build-*`)
- LEGACY duplicate removed earlier:
  - FAQ/Shifts fallback markers (already deleted)

## CR-01 status
- Duplicate-risk zone narrowed.
- Legacy fallback duplicate path for FAQ/Shifts removed.
- Remaining inline executable blocks are still active compatibility layer and not yet safe to delete.

## Next quarantine candidates (Pass 2)
- Migrate inline executable blocks into source modules that are included in `/cdn/app.bundle.js`.
- Keep one owner per domain (bundle winner, inline loser).
- After migration per domain: quarantine inline fragment -> quick validate -> delete.

## Validation for this inventory batch
- To be validated via batch runner (`quick`).
