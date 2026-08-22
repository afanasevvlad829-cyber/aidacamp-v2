# Медиа и файлы — единое хранилище (правило с 2026-07-02) — детально

> Вынесено из корневого `CLAUDE.md` (чистка). Инвариант продублирован строкой в корне.

**Все фото, видео и документы живут в ОДНОМ месте на сервере: `/var/www/aidacamp-media/`.**
nginx на prod И dev отдаёт `/images/` и `/videos/` напрямую оттуда (alias) — залил один раз → видно на обоих окружениях сразу. Никакой синхронизации.

| Что | Куда класть | URL |
|---|---|---|
| Картинки сайта | `/var/www/aidacamp-media/images/<подпапка>/` | `https://aidacamp.ru/images/...` (и dev) |
| Видео | `/var/www/aidacamp-media/videos/<подпапка>/` | `https://aidacamp.ru/videos/...` (и dev) |
| Документы (PDF, памятки) | `/var/www/aidacamp-media/docs/` | `https://dev.aidacamp.ru/media/docs/...` |
| Превью/дебаг-файлы | `/var/www/aidacamp-media/` | `https://dev.aidacamp.ru/media/<файл>` |
| Фото галереи смен | `/var/www/aidacamp-gallery/` (отдельно) | `/images/gallery/...` |

**Агентам — жёстко:**
- ❌ НЕ копировать медиа в `/var/www/aidacamp/current/client/` или `/var/www/aidacamp-dev/` — эти копии nginx больше НЕ читает (мёртвый груз).
- ❌ НЕ синкать медиа между dev и prod — хранилище одно.
- ❌ Бэкапы nginx-конфигов НИКОГДА не класть в `sites-enabled/` (include подключает `*.bak` → ломает nginx). Только `/etc/nginx/backups/`.
- ✅ Искать существующие фото/видео — СНАЧАЛА в `/var/www/aidacamp-media/` (и `aidacamp-gallery/` для галереи), а не в client-каталогах.
- ✅ Новые картинки в репо (`public/images/`) доезжают до хранилища сами: `deploy.sh` шаг 2c (`--ignore-existing`, серверная копия авторитетна).
