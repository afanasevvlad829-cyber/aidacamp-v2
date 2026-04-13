# Phase 4 — JS Domain Audit (Dist-Centric)

Date: 2026-04-08 (Europe/Moscow)
Scope: `src/scripts/main.js` + feature/config runtime modules
Policy: classify first, quarantine-first, no blind delete

## Baseline
- `src/scripts/main.js` lines: `2,662`
- Function declarations: `168`
- Const function expressions: `76`
- Arrow function bindings: `52`
- `addEventListener(...)` in `main.js`: `5`
- Legacy/compat/fallback token hits in `main.js`: `38`

## Runtime domain map
- Booking runtime + stage flow: ACTIVE REQUIRED
- Hero variant/background/nav flows: ACTIVE REQUIRED
- Overlay/media modal flows: ACTIVE REQUIRED
- Footer/floating contacts: LEGACY-COMPAT (migrated from inline)
- Analytics/telemetry wrappers: ACTIVE REQUIRED
- Dispatcher/action flow: ACTIVE REQUIRED
- Runtime init flow and deferred tasks: ACTIVE REQUIRED

## Duplicate-init status
- FAQ/Shifts inline fallback markers (`__faqFallbackBound`, `__shiftUxBound`) removed from runtime shell.
- Remaining duplicate-init risk zone: inline scripts still present in `dist/index.html` vs bundled init path.
- Current status: partial mitigation complete; full elimination requires controlled migration of remaining inline executable fragments.

## Dead logic status
- No proven dead function zones in `main.js` selected for delete in this pass.
- Fallback paths present are treated as compatibility/robustness guards.

## Classification for this pass
- ACTIVE: runtime init, booking, hero, overlays, dispatcher, analytics.
- LEGACY-ACTIVE: stage/offer compatibility behavior still coupled with current runtime shell/classes.
- DUPLICATE-INIT: remaining shell inline blocks not yet migrated.
- UNKNOWN: 0 (for audited active domains).
