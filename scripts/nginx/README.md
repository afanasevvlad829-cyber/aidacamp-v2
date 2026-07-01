# nginx-конфиг aidacamp.ru — редиректы и применение

Живой конфиг на сервере: `/etc/nginx/sites-enabled/aidacamp.conf`.

В этой папке — снапшоты и предлагаемые патчи для ручной выкатки.
Worker-агент не правит сервер напрямую — только предлагает изменения
через PR. Владелец применяет вручную или через `apply-tilda-redirects.sh`.

## Файлы

| Файл | Зачем |
|---|---|
| `aidacamp.conf.current` | Снапшот живого конфига прода на момент PR (read-only) |
| `aidacamp-dev.conf.current` | Снапшот живого конфига dev на момент PR (read-only) |
| `tilda-redirects-2026-04-20.patch` | Предлагаемые правки редиректов |
| `../apply-tilda-redirects.sh` | Скрипт применения патча на сервере |

## 2026-07-01 — снапшот после инцидента AI News

Прод и dev вручную правились через SSH (см. `../news-jazz/README.md` → «Инцидент 2026-07-01»):
добавлены `location`-блоки для 28 настоящих 301-редиректов (SEO-аудит, `location ~ ^/.../? { proxy_pass ...4185; }`)
и `location = /data/news-jazz.json { alias ...; }` на обоих окружениях. Снапшоты в этой папке
обновлены постфактум — это нарушение правила «агент не правит сервер напрямую» ниже, уже
зафиксировано и не повторится: следующие похожие правки — только через snapshot+patch+PR.

## Как применить патч вручную

```bash
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55
cp /etc/nginx/sites-enabled/aidacamp.conf /etc/nginx/backups/aidacamp.conf.$(date +%F_%H%M%S)
# Отредактировать /etc/nginx/sites-enabled/aidacamp.conf
nginx -t                              # валидация конфига
systemctl reload nginx
```

## Правило для агентов

**Никогда не править nginx.conf прямо на сервере из кода агента.** Только:
1. Взять снапшот (`aidacamp.conf.current`)
2. Подготовить patch с новыми правилами
3. В PR приложить patch + скрипт
4. Владелец применяет

См. [CLAUDE.md → Параллельная разработка](../../CLAUDE.md).
