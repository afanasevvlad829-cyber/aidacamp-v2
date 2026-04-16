# Stage A Batch Run

- Date: 2026-04-08 07:42:49 MSK
- Label: cr01-footer-tabs-quarantine
- Mode: quick
- Rollback: archive/non-runtime/quarantine/rollback/stage-a-batch-cr01-footer-tabs-quarantine-20260408_074243.tgz

## Status

| Step | Exit code |
|---|---:|
| build | 0 |
| smoke | 0 |

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
CDN asset sync: refs=32 copied=0 missing=0
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

### smoke
```text
[booking-ui-smoke] target=https://dev.aidacamp.ru/?FF_MODULAR_RUNTIME=1&FF_BLOCK_BOOKING_MODULAR=1&FF_BLOCK_HERO_MODULAR=1&FF_BLOCK_CALENDAR_MODULAR=1&hero_v3_simple=1
[booking-ui-smoke] desktop ok (stage=1, lead=503)
[booking-ui-smoke] mobile ok (stage=1, lead=503)
[booking-ui-smoke] DONE
```
