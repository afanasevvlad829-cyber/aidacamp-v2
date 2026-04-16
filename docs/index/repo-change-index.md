# Repo Change / Move / Archive Index

Last update: 2026-03-25 (Europe/Moscow)
Branch: `dev`

## 1) Canon runtime map
- Runtime source: `index.html`, `src/**`, `assets/**`, `src/pages/legal.html`
- Build output: `dist/index.html`, `dist/legal.html`
- Published aliases: `legal.html`, `build/legal.html`

## 2) Change index (by commits)
Machine-readable timeline:
- `docs/index/change-log-2026-03-20_to_now.csv`

Quick critical commits:
- `87d7ef8` — moved root non-runtime packs into `archive/reference/`
- `c034b60` — moved missing external images to local `assets/images/cdn-cache/`
- `355ef94` — archived root non-runtime artifacts into `archive/non-runtime/root_cleanup_2026-03-25/`
- `ac2616c` — archived local WIP snapshots to `archive/local_wip/2026-03-25/`
- `fc5c0d7` — baseline snapshot point (`baseline/fc5-kinescope-legal`)

## 3) Move/archive index (by files)
Machine-readable file-level move/archive ledger:
- `docs/index/moves-archives-2026-03-20_to_now.csv`

Root-level relocation summary:
- `docs/index/root-relocations-2026-03-25.csv`

Additional external-workdirs index:
- `docs/index/external-workdirs-relocation-2026-03-25.csv`
- `docs/index/external-workdirs-relocation-2026-03-25.md`

## 4) Where archived content is now
- `archive/reference/accepted_ui_baseline_pack/`
- `archive/reference/ai/`
- `archive/reference/aidacamp_icon_pack/`
- `archive/non-runtime/root_cleanup_2026-03-25/`
- `archive/local_wip/2026-03-25/`
- `archive/local_wip/2026-03-25/external-workdirs/` (local external snapshots archive)

## 5) Fast lookup recipes
Find change history for a file:
```bash
git log --follow --name-status -- <path>
```

Find where a file was moved:
```bash
git log --follow --name-status --diff-filter=R -- <path>
```

Find commit by keyword (message):
```bash
git log --oneline --grep='<keyword>'
```

Open machine index quickly:
```bash
sed -n '1,80p' docs/index/change-log-2026-03-20_to_now.csv
sed -n '1,80p' docs/index/moves-archives-2026-03-20_to_now.csv
```

## 6) Notes
- Index files are append/refresh artifacts and can be regenerated from git history.
- For broad archive moves with thousands of files, use CSV + `git show <sha> --name-status` for full details.
