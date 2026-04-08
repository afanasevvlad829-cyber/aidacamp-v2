# Stage A Batch Run

- Date: 2026-04-08 07:28:13 MSK
- Label: phase5-delete-inline-full
- Mode: full
- Rollback: archive/non-runtime/quarantine/rollback/stage-a-batch-phase5-delete-inline-full-20260408_072805.tgz

## Status

| Step | Exit code |
|---|---:|
| build | 0 |
| quality-check | 1 |
| smoke | 0 |
| quality-gate | 1 |

## Logs (tail)

### build
```text
Built: dist/index.html
Built: dist/cdn/app.bundle.js
Built: cdn/app.bundle.js
Built: dist/cdn/app.css
Built: cdn/app.css
Built: dist/cdn/app.tilda.js
Built: cdn/app.tilda.js
CDN asset base: disabled (set AC_CDN_REF to enable '/assets' rewriting)
CDN asset sync: refs=31 copied=0 missing=0
Canonical runtime source: dist/index.html (not rewritten unless AC_ALLOW_DIST_REWRITE=1)
CDN artifact: dist/cdn/app.bundle.js
CDN artifact for GitHub/jsDelivr: cdn/app.bundle.js
CDN css artifact: dist/cdn/app.css
CDN css artifact for GitHub/jsDelivr: cdn/app.css
Tilda single-script artifact: dist/cdn/app.tilda.js
Tilda single-script artifact for GitHub/jsDelivr: cdn/app.tilda.js
Artifacts updated: legal.html, build/legal.html
Artifact sync check: OK
```

### quality-check
```text
[quality-check] build
[quality-check] metrics
[quality-check] function-index
[quality-check] gate
OK:   css_duplicate_selectors=0 <= 3
OK:   js_if_count=74 <= 95
OK:   js_ternary_count=8 <= 10
OK:   js_max_line_length=169 <= 380
OK:   js_state_mutations=0 <= 0
OK:   dist_bytes=178845 <= 560000
FAIL: dist_max_line_length=117808 > 1100
OK:   replacement_char_lines=0 <= 0
quality-gate: baseline loaded from /Users/vladimirafanasev/aidaplus-dev/docs/quality/baseline.env
OK:   css_duplicate_selectors=0 <= baseline+0 (3)
OK:   js_if_count=74 <= baseline+0 (79)
OK:   js_ternary_count=8 <= baseline+0 (8)
OK:   js_max_line_length=169 <= baseline+0 (169)
OK:   js_state_mutations=0 <= baseline+0 (0)
FAIL: dist_bytes=178845 > baseline+0 (56263)
FAIL: dist_max_line_length=117808 > baseline+0 (437)
OK:   replacement_char_lines=0 <= baseline+0 (0)
quality-gate: FAILED
```

### smoke
```text
[booking-ui-smoke] target=https://dev.aidacamp.ru/?FF_MODULAR_RUNTIME=1&FF_BLOCK_BOOKING_MODULAR=1&FF_BLOCK_HERO_MODULAR=1&FF_BLOCK_CALENDAR_MODULAR=1&hero_v3_simple=1
[booking-ui-smoke] desktop ok (stage=1, lead=503)
[booking-ui-smoke] mobile ok (stage=1, lead=503)
[booking-ui-smoke] DONE
```

### quality-gate
```text
OK:   css_duplicate_selectors=0 <= 3
OK:   js_if_count=74 <= 95
OK:   js_ternary_count=8 <= 10
OK:   js_max_line_length=169 <= 380
OK:   js_state_mutations=0 <= 0
OK:   dist_bytes=178845 <= 560000
FAIL: dist_max_line_length=117808 > 1100
OK:   replacement_char_lines=0 <= 0
quality-gate: baseline loaded from /Users/vladimirafanasev/aidaplus-dev/docs/quality/baseline.env
OK:   css_duplicate_selectors=0 <= baseline+0 (3)
OK:   js_if_count=74 <= baseline+0 (79)
OK:   js_ternary_count=8 <= baseline+0 (8)
OK:   js_max_line_length=169 <= baseline+0 (169)
OK:   js_state_mutations=0 <= baseline+0 (0)
FAIL: dist_bytes=178845 > baseline+0 (56263)
FAIL: dist_max_line_length=117808 > baseline+0 (437)
OK:   replacement_char_lines=0 <= baseline+0 (0)
quality-gate: FAILED
```
