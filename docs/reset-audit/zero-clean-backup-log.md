# Zero-Clean Backup Log

Date: 2026-04-08 (Europe/Moscow)

## Baseline rollback points
- Branch: `backup/zero-clean-phase-0-2026-04-08`
- Tag: `pre-zero-clean-phase-0-2026-04-08`
- Archive: `archive/non-runtime/quarantine/rollback/aidaplus-zero-clean-baseline-20260408_094303.tar.gz`

## Phase rollback points (created)

| Phase | Backup branch | Tag |
|---|---|---|
| 0 | `backup/zero-clean-phase-0-2026-04-08` | `pre-zero-clean-phase-0-2026-04-08` |
| 1 | `backup/zero-clean-phase-1-2026-04-08` | `pre-zero-clean-phase-1-2026-04-08` |
| 2 | `backup/zero-clean-phase-2-2026-04-08` | `pre-zero-clean-phase-2-2026-04-08` |
| 3 | `backup/zero-clean-phase-3-2026-04-08` | `pre-zero-clean-phase-3-2026-04-08` |
| 4 | `backup/zero-clean-phase-4-2026-04-08` | `pre-zero-clean-phase-4-2026-04-08` |
| 5 | `backup/zero-clean-phase-5-2026-04-08` | `pre-zero-clean-phase-5-2026-04-08` |
| 6 | `backup/zero-clean-phase-6-2026-04-08` | `pre-zero-clean-phase-6-2026-04-08` |
| 7 | `backup/zero-clean-phase-7-2026-04-08` | `pre-zero-clean-phase-7-2026-04-08` |
| 8 | `backup/zero-clean-phase-8-2026-04-08` | `pre-zero-clean-phase-8-2026-04-08` |
| 9 | `backup/zero-clean-phase-9-2026-04-08` | `pre-zero-clean-phase-9-2026-04-08` |

## Additional rollback artifacts
- `archive/non-runtime/quarantine/rollback/stage-a-qg01-qg02-20260408_071346.tar.gz`
- `archive/non-runtime/quarantine/rollback/dist.index.phase4.inline-before-20260408_071525.html`
- `archive/non-runtime/quarantine/rollback/dist.index.phase5.delete-inline-before-20260408_072302.html`
- `archive/non-runtime/quarantine/rollback/dist.index.cr01-footer-inline-before-20260408_073828.html`
- `archive/non-runtime/quarantine/rollback/dist.index.cr01-floating-inline-before-20260408_074414.html`
- `archive/non-runtime/quarantine/rollback/main.js.bak.1775624272`

## Restore commands
```bash
git switch backup/zero-clean-phase-0-2026-04-08
# or
git checkout pre-zero-clean-phase-0-2026-04-08
# baseline archive restore
mkdir -p /tmp/aidaplus-restore && tar -xzf archive/non-runtime/quarantine/rollback/aidaplus-zero-clean-baseline-20260408_094303.tar.gz -C /tmp/aidaplus-restore
```
