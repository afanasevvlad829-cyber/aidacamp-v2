# AGENTS.md

Только то, что нельзя откатить и чего не ловит ни хук, ни `permissions.deny`, ни CI.
Остальное — `CLAUDE.md`, `DEV_PROTOCOL.md`, [`CODING_STANDARDS.md`](CODING_STANDARDS.md).

## Не делай без явного «да» владельца в чате

«Задача, похоже, требует» — не «да». Сомневаешься — считай деструктивным и спроси.

1. **Прод-файлы и данные.** Ручной `rsync`/`rm -rf` по живому веб-руту, `.env`, `images/gallery`, БД — нельзя. Деплой — только `./scripts/release.sh`/CI; откат — `./scripts/rollback.sh prod`. `rm -rf` — только внутри явно ограниченного build/temp-каталога.
2. **Обход защит.** Не снимай и не правь `scripts/git-hooks/**`, защиту веток, `.github/workflows/guard-*.yml`; не ставь `PIPELINE_BYPASS=1` / `MASTER_AGENT=1` от имени владельца.
3. **Перепись общей истории.** `git rebase` на `dev`/`main`, `git commit --amend` уже запушенного.
4. **Потеря незакоммиченного.** Жёсткий reset, `git clean -f*`, `git restore .`, `git stash drop|clear`, `git branch -D`, force-push. Глобальный хук ловит это только на Mac владельца, на VPS и в CI — нет.

## Перед рискованной правкой прод-данных

Миграция, массовое удаление/перезапись, правка `images/gallery`, `.env`, БД — сначала restic-снапшот: `ssh aidacamp '/opt/restic-snapshot.sh'`. Деплой его сам **не** делает. Подробности, откат, ротация — [`docs/agent/prod-snapshot.md`](docs/agent/prod-snapshot.md), читай при такой правке.
