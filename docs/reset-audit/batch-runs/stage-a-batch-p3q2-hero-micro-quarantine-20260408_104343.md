# Stage A Batch — P3-Q2 hero micro/demo quarantine

Date: 2026-04-08 10:43:43 +0300
Mode: balanced (quarantine-first)

## Proof before change
- No runtime refs found in active JS/HTML for:
  - `hero-micro-on`
  - `hero-micro-off`
  - `hero-micro-demo`

## Change scope
- File: `src/styles/main.css`
- Quarantined from active path by removal (with rollback retained):
  - debug microanimation toggle selectors (`hero-micro-on/off/demo`)
  - demo-only keyframes:
    - `@keyframes heroBgMicroDriftDemo`
    - `@keyframes heroLightBreathDemo`
    - `@keyframes heroLeavesDriftDemo`

## Rollback
- `archive/non-runtime/quarantine/rollback/main.css.p3q2-hero-micro-before-20260408_104343.bak`

## Validation
- `./tools/run-fast-check.sh` -> PASS
