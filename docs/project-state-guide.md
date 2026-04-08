# Project State Guide (2026-04-07)

## 1) Snapshot
- Project root: `/Users/vladimirafanasev/aidaplus-dev`
- Runtime context: Astro/source-first workflow
- Current priority: stabilize Hero/FAQ behavior and keep one active architecture path
- Primary risk: accidental edits in legacy artifacts (`dist/**`, `cdn/**`) causing regressions

## 2) Source of Truth
- Active code path: `src/**`
- Allowed for production fixes: `src/scripts/**`, `src/styles/**`, `src/partials/**`, `src/components/**`, `docs/**`
- Legacy/cold artifacts (read-only for diagnosis):
  - `dist/**`
  - `cdn/**`
  - `archive/**`
  - generated reports/snapshots

## 3) Hard Rules (Operational)
- Do not implement fixes in `dist/index.html`.
- Do not patch `cdn/app.bundle.js` or `cdn/app.css` manually.
- Any UI/logic fix must be applied in `src/**` only.
- Keep desktop/mobile on one shared logic path (no duplicate business branches).

## 4) Current Functional Status
- Shifts cards: behavior restoration work started (info/calendar/select flow).
- Hero contacts dropdown: cleanup work started for visual/text normalization.
- FAQ: currently reported as broken by user and marked as active blocker.

## 5) Known Regressions / Risks
- Legacy bleed-through in UI can reappear when changes are applied to generated layers instead of source.
- Mixed runtime strata (`main.js` orchestration + large legacy-like feature bundles) increase regression probability.
- CSS specificity/monolith pressure remains high in `src/styles/main.css`.

## 6) Code Health (0-10)
- Legacy cleanliness: 3.5/10
- Layer isolation (active vs legacy): 3/10
- Old links/content tails: 4/10
- CSS cleanliness: 4.5/10
- JS cleanliness: 4/10
- Overall architecture cleanliness: 4/10

## 7) What Was Decided
- Enforce source-only fix path (`src/**`) as mandatory.
- Treat `dist/cdn` edits as prohibited for functional fixes.
- Continue cleanup with minimal, isolated, reversible changes.

## 8) Immediate Next Steps
1. Fix FAQ interaction in source runtime (`src/scripts/**`) and verify tab/filter/toggle behavior.
2. Finalize Hero phone dropdown cleanup in source (`src/styles/main.css` + runtime bindings in `src/scripts/**`).
3. Run smoke checks on source build path only.
4. Re-check critical sections: Hero, Shifts, FAQ, Stay, Footer.

## 9) Verification Checklist
- FAQ tabs switch correctly.
- FAQ accordion opens/closes correctly.
- Hero phone dropdown has no legacy text artifacts.
- No functional fix was introduced in `dist/**` or `cdn/**`.
- User-visible sections are consistent on desktop/mobile.

## 10) Context for Next Session
- If behavior differs from expected UI, validate source markup + source runtime handlers first.
- If issue appears only in generated files, do not patch generated files; find source generator path.
- Preserve a single architecture path and keep rollback points for risky edits.
