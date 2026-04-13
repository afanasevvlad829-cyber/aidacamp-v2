# Runtime-only cleanup index (main + server)

- Generated: 2026-03-25T12:50:01
- Main cleanup commit: `3ff6501`
- Base main commit before cleanup: `532623604309d17f7833dd26baed5a7d84acc2ef`
- Dev reference branch: `dev` (artifacts and development materials preserved)

## Runtime whitelist (kept in main and on server)
- `index.html`
- `legal.html`
- `assets/`
- `src/`
- `.gitignore`

## Removed from main (preserved in dev)
- Total removed paths: **2457**

Top-level removed groups:
- `archive`: 2231
- `reports`: 138
- `artifacts`: 45
- `docs`: 23
- `tools`: 3
- `.cursor`: 2
- `tests`: 2
- `.github`: 1
- `AGENTS.md`: 1
- `AGENT_RULES.md`: 1
- `AI_CONTEXT.md`: 1
- `DEV_MECHANISMS.md`: 1
- `ICON_AUDIT.md`: 1
- `OPENROUTER_SETUP.md`: 1
- `TASKS.md`: 1
- `baseline-policy.md`: 1
- `build.sh`: 1
- `deploy.sh`: 1
- `dist`: 1
- `gpt.html`: 0 (deprecated and removed)

Detailed mapping:
- `archive/reference/runtime-main-server-cleanup-2026-03-25/moved-from-main.csv`

## Server cleanup (dev.aidaplus.ru)
- Server web root cleaned to runtime-only: `/var/www/aidaplus-dev`
- Non-runtime files moved (not deleted) to: `/var/www/aidaplus-dev-archive/20260325_runtime_cleanup`

## Validation
- Runtime checksums matched local vs server for `index.html` and `legal.html`.
- `dev.aidaplus.ru` responds with HTTP 200.
