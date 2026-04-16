# Acceptance Evidence — 2026-04-05 (No Rollout)

## Scope

- Architecture/quality readiness only.
- No production rollout in this checkpoint.
- Active runtime path: simple booking flow (`hero_v3_simple`, stage=1).

## Evidence Window

- Final x3 acceptance loop: `2026-04-05 07:42–07:44 MSK` (no code changes between runs).
- Verification refresh: `2026-04-05 07:47 MSK`.

## Gate Results

1. `./tools/quality-check.sh` — PASS
2. `./tools/architecture-check.sh` — PASS
3. `./tools/smoke-runtime-api.sh https://dev.aidacamp.ru` — PASS
4. `bash ./tools/smoke-booking-flow.sh https://aidacamp.ru` — PASS (known infra note: lead transport `503`)
5. `node ./tools/smoke-booking-ui-playwright.mjs https://dev.aidacamp.ru` — PASS (desktop/mobile, stage=1)
6. `bash ./tools/build-astro-preview.sh` — PASS

## KPI Snapshot

- `css_duplicate_selectors = 8`
- `js_if_count = 154`
- `js_ternary_count = 13`
- `js_state_mutations = 0`
- `dist_bytes = 56263`
- `main_js_lines = 2863`

## Zero Legacy Assertions (no-business-in-main)

- `LEGACY_MAIN_OFFER_STAGE_REFS = 0`
- `LEGACY_MAIN_OFFER_LAYOUT_REFS = 0`
- `LEGACY_MAIN_LEGACY_WORD_REFS = 0`
- `LEGACY_MAIN_DEBUG_ACTION_REFS = 0`
- `LEGACY_MAIN_INNERHTML_ASSIGNMENTS = 0`
- `LEGACY_MAIN_MOBILE_DOCS_COPY_REFS = 0`
- `LEGACY_MAIN_DESKTOP_MOBILE_TEMPLATES_REFS = 0`
- `LEGACY_MAIN_BOOKING_VIEWS_CONFIG_REFS = 0`
- `LEGACY_MAIN_BOOKING_ALIGN_CONFIG_REFS = 0`
- `LEGACY_MAIN_HERO_AB_ASSETS_CONFIG_REFS = 0`
- `LEGACY_MAIN_HERO_AB_LABELS_CONFIG_REFS = 0`
- `LEGACY_MAIN_AB_ALLOWLIST_REFS = 0`
- `LEGACY_MAIN_UI_MODES_CONFIG_REFS = 0`
- `LEGACY_MAIN_STORAGE_CONFIG_REFS = 0`
- `LEGACY_MAIN_OBSERVABILITY_CONFIG_REFS = 0`
- `LEGACY_MAIN_TELEMETRY_CONFIG_REFS = 0`
- `LEGACY_MAIN_INLINE_SHIFTS_BLOB_REFS = 0`
- `LEGACY_MAIN_INLINE_MEDIA_BLOB_REFS = 0`
- `LEGACY_MAIN_INLINE_CALENDAR_LOCALE_ARRAYS_REFS = 0`

## Conclusion

- `CODE_READY=YES` for architecture/quality phase.
- Rollout remains intentionally out of scope for this evidence pack.
