# Stage A / Phase 2 — Conflict Registry

Date: 2026-04-08 (Europe/Moscow)
Scope: active runtime surface only, no deletions.

## Summary

| Conflict ID | Type | Severity | Status |
|---|---|---|---|
| CR-01 | Duplicate JS init layers (`dist/index` inline scripts + bundled runtime) | High | Partial mitigation (footer + floating migrated) |
| CR-02 | FAQ interaction duplicate path (fallback inline + module bindings) | High | Quarantined / Delete-Candidate |
| CR-03 | Shifts UX duplicate path (inline `__shiftUxBound` + feature modules) | High | Quarantined / Delete-Candidate |
| CR-04 | Parallel asset flow (`/images` runtime + `/assets -> /cdn/assets` sync) | Medium | Open |
| CR-05 | Desktop/mobile duplicated markup branches in same page | Medium | Open |
| CR-06 | External asset leak (Figma asset URLs in runtime markup) | Medium | Mitigated (QG-04) |
| CR-07 | Generated artifact triplication (`dist/cdn/*` + `cdn/*` mirrors) | Low | Open |

## Evidence Metrics

- `inline_module_scripts`: 9
- `inline_plain_scripts`: 16
- `bundle_tag_count` (`ac-build-main-js`): 1
- `faq_fallback_scripts` marker occurrences: 0
- `shift_ux_scripts` marker occurrences: 0
- `mobile_desktop_split_tokens` (`md:hidden|hidden md:block`): 19
- `external_asset_links`: 49
- `figma_asset_links`: 0 (after QG-04 localization)

## Detailed Conflicts

### CR-01 — Duplicate JS init layers
- Evidence:
  - Runtime bundle injected: `dist/index.html` contains `<script id="ac-build-main-js" src="/cdn/app.bundle.js" defer></script>`.
  - Multiple inline scripts remain in `dist/index.html` (module + plain inline).
- Risk:
  - Double event binding, conflicting state updates, non-deterministic behavior.
- Winner candidate:
  - Bundled runtime from `/cdn/app.bundle.js`.
- Loser candidate:
  - Inline runtime scripts embedded in `dist/index.html` (after explicit migration to source modules).
- Current status:
  - FAQ/Shifts legacy fallback inline scripts removed.
  - Footer mobile tabs inline script migrated to source module (`footer-tabs-compat.js`) and removed from `dist/index.html`.
  - Floating contacts inline script migrated to source module (`floating-contacts-compat.js`) and removed from `dist/index.html`.
  - Remaining inline executable scripts classified as active compatibility layer pending modular migration.

### CR-02 — FAQ duplicate interaction path
- Evidence:
  - Inline fallback logic with `window.__faqFallbackBound` exists in `dist/index.html`.
  - Active JS modules also contain FAQ handlers (`src/scripts/features/global-ui-bindings.js`, action dispatcher path).
- Risk:
  - Duplicate click handling and analytics fire duplication.

### CR-03 — Shifts UX duplicate interaction path
- Evidence:
  - Inline shifts script guarded by `window.__shiftUxBound` exists in `dist/index.html`.
  - Shift actions and booking interactions also exist in bundled feature modules.
- Risk:
  - Re-init of controls, duplicated modal orchestration, hard-to-debug regressions.

### CR-04 — Parallel asset flow
- Evidence:
  - Runtime markup references `/images/*` and `/icons/*` directly.
  - Build pipeline also syncs `/assets/**` into `dist/cdn/assets` and `cdn/assets`.
- Risk:
  - Two competing asset roots and drift in updates.

### CR-05 — Desktop/mobile duplicated markup branches
- Evidence:
  - 19 responsive split markers (`md:hidden`, `hidden md:block`) in runtime markup.
- Risk:
  - Structural duplication increases maintenance surface and regression probability.

### CR-06 — External asset leak
- Evidence:
  - Runtime page previously contained 2 Figma-hosted asset URL references.
  - Updated to local path `/assets/icons/robot-orange.svg`.
- Risk:
  - Third-party dependency instability and non-local deterministic rendering.

### CR-07 — Generated artifact triplication
- Evidence:
  - Same runtime outputs exist in both `dist/cdn/*` and `cdn/*`.
- Risk:
  - Sync drift between mirrors if pipeline is bypassed.

## Notes for Phase 3 (quarantine-first)
- No destructive action taken in this phase.
- All loser candidates must go through quarantine validation before any delete decision.
