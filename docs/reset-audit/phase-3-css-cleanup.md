# Phase 3 — CSS Cleanup Plan (Dist-Centric, Safe Mode)

Date: 2026-04-08 (Europe/Moscow)

## Objective
Reduce CSS debt without breaking runtime behavior in booking/hero/footer/contact flows.

## Execution strategy
1. Run P3-Q1 quarantine batch on small CSS cluster sets (non-critical visuals first).
2. After each batch run:
   - `./tools/run-fast-check.sh`
3. At phase-close run:
   - `./tools/run-full-check.sh`
4. If regressions: rollback from phase backup branch/tag or rollback archive.

## Batch plan
- Batch 1: non-interactive duplicated visual selectors.
- Batch 2: duplicated stage cosmetic rules with proven no runtime effect.
- Batch 3: !important reduction in low-risk zones only.

## Current constraints
- `quality-check`/`quality-gate` known fails are threshold/baseline driven on dist metrics.
- Therefore pass/fail decision for CSS cleanup is runtime-first:
  - build PASS
  - smoke PASS
  - no visual regressions on key blocks

## Expected outputs after phase close
- reduced `!important` count (if safe)
- reduced legacy-active cluster complexity
- updated quarantine map for deferred deletes

## Executed P3-Q1 (micro-batch)
- Backup created:
  - `archive/non-runtime/quarantine/rollback/main.css.p3q1-before-20260408_100714.bak`
- Safe cleanup applied:
  - removed one duplicate property inside the same selector block:
    - selector: `#desktop-booking-card.booking-stage-two-legacy .shift-list`
    - removed duplicate `justify-content:var(--booking-stage2-y-flex, flex-start);`
- Validation:
  - `./tools/run-fast-check.sh` -> PASS
  - `./tools/run-full-check.sh` -> FAIL (known dist thresholds/baseline mismatch only)
