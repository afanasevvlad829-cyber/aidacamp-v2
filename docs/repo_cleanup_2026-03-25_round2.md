# Repo Cleanup Round 2 (2026-03-25)

## Scope
Moved non-runtime tracked artifact folders/files from repository root into:

- `archive/non-runtime/root_cleanup_2026-03-25/`

Goal: clean project root while preserving all historical artifacts.

## What was moved (top-level groups)
- `audit/*` (1656 files)
- `release/*` (171 files)
- `ui-sandbox/*` (78 files)
- `screens/*` (74 files)
- `snippets/*` (14 files)
- `patch_*` report bundles/folders
- `audit_*` report bundles/folders
- root one-off files: `report.md`, `python-terminal-demo.html`, `*.zip.bak`

Total moved tracked paths: **2137**.

## Runtime/source left in root
- `index.html`, `legal.html`
- `src/`, `assets/`, `dist/`
- `build.sh`, `deploy.sh`
- `docs/`, `reports/`, `tests/`, `tools/`
- baseline pack: `accepted_ui_baseline_pack/`

## Local untracked cleanup (outside git)
Moved local untracked clutter to OS backup folder:

- `/Users/vladimirafanasev/Backups/aidaplus-dev/local-untracked-2026-03-25`

Included there:
- `_phase3_*` local logs
- untracked zip bundles
- `prototype-export/`
- untracked `build/`
- local `.DS_Store`
