# nginx-конфиг aidacamp.ru — редиректы и применение

Живой конфиг на сервере: `/etc/nginx/sites-enabled/aidacamp.conf`.

В этой папке — снапшоты и предлагаемые патчи для ручной выкатки.
Worker-агент не правит сервер напрямую — только предлагает изменения
через PR. Владелец применяет вручную или через `apply-tilda-redirects.sh`.

## Файлы

| Файл | Зачем |
|---|---|
| `aidacamp.conf.current` | Снапшот живого конфига на момент PR (read-only) |
| `tilda-redirects-2026-04-20.patch` | Предлагаемые правки редиректов |
| `../apply-tilda-redirects.sh` | Скрипт применения патча на сервере |

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
