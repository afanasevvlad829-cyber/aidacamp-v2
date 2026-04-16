# Runtime Release Checklist (main/prod)

Цель: в `main` и на prod/dev сервере держать только runtime/release слой.

## 1) Разрешённый состав (канон)

В `main` и web-root сервера допускается только:
- `.gitignore`
- `index.html`
- `legal.html`
- `assets/`
- `src/`

Запрещено выкатывать в `main/prod`:
- `archive/`, `reports/`, `artifacts/`, `build/`, `dist/`, `tests/`, `tools/`
- `*.zip`, `*.bak`, временные скрипты, отладочные дампы
- любые временные/исторические артефакты разработки

## 2) Preflight перед merge/release

1. Ветка чистая:
```bash
git status --short
```

2. Проверка состава `main`:
```bash
git fetch origin --prune
git ls-tree --name-only origin/main
```
Ожидаемо: только `.gitignore`, `index.html`, `legal.html`, `assets`, `src`.

3. Проверка diff перед merge:
```bash
git diff --name-status origin/main...HEAD
```
Если в diff есть non-runtime пути — переносим в `archive/` (в `dev`) и не пускаем в `main`.

## 3) Release порядок

1. Работы и архивы — только в `dev`.
2. В `main` попадает только runtime-срез.
3. На сервер выкатываются только:
- `index.html`
- `legal.html`
- `assets/`
- `src/`

## 4) Post-deploy проверки

1. HTTP доступность:
```bash
curl -I https://dev.aidaplus.ru
```
Ожидаемо: `200 OK`.

2. Контроль состава web-root:
```bash
ssh aidaplus-dev 'ls -la /var/www/aidaplus-dev'
```

3. При необходимости checksum-контроль:
```bash
sha256sum index.html legal.html
ssh aidaplus-dev 'sha256sum /var/www/aidaplus-dev/index.html /var/www/aidaplus-dev/legal.html'
```

## 5) Правило эскалации

Если обнаружены non-runtime файлы в `main/prod`:
1. Остановить релиз.
2. Перенести non-runtime в архив (не удалять молча).
3. Обновить индекс перемещений в `dev`.
4. Повторить preflight.
