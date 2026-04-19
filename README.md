# tooling branch

Отдельная orphan-ветка для инструментов разработки и CI (quality-gate, guards, smoke-тесты).
**Сюда НЕ попадает код сайта.** Сайт живёт в `dev` → `main`.

## Что здесь

```
tools/
├── quality-metrics.sh       # метрики: размер бандла, дубли, неиспользуемые файлы
├── quality-baseline.sh      # создаёт/обновляет docs/quality/baseline.env
├── quality-gate.sh          # проверка отклонения метрик от baseline
├── quality-check.sh         # объединённый прогон для CI
├── architecture-check.sh    # проверка архитектурных правил
├── check-no-business-in-main.js
├── check-no-legacy-path-usage.js
├── precommit-guard.sh
├── install-git-hooks.sh
├── smoke-booking-ui-playwright.mjs
├── debt-register-add.sh
├── function-index.sh
├── export-content-table.js
├── build-content-patch.js
├── fasttrack-server.sh / fasttrack_server.py
└── git-garbage-clean.sh
```

## Как использует CI

Workflow `.github/workflows/quality-gate.yml` в ветках `main`/`dev`/`agent/*` должен
делать sparse-checkout этой ветки и запускать нужные скрипты из `tools/`.

Пример шага:
```yaml
- name: Fetch tooling
  run: |
    git fetch origin tooling --depth=1
    git worktree add /tmp/tooling origin/tooling
    cp -r /tmp/tooling/tools ./tools
```

## Правила

- Правки в `tooling` идут через PR в эту же ветку (base: `tooling`)
- НЕ мёрджить `tooling` в `dev` или `main` — это параллельная ветка, истории не пересекаются
- Скрипты проверяй локально перед пушем
