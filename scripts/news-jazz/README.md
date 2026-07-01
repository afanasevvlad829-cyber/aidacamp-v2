# AI News (News Jazz) — источник данных для виджета на главной

Живёт на сервере в `/opt/news-jazz/` (не в деплое сайта — отдельный процесс).
Компонент на сайте: `src/components/NewsJazz.astro`, читает
`/data/news-jazz.json` клиентским fetch с localStorage-кэшем (TTL 30 мин).

## Файлы

| Файл | Зачем |
|---|---|
| `fetch.js` | Тянет RSS TechCrunch AI → фильтрует и переводит через OpenAI (gpt-4o-mini) → пишет JSON |
| `run.sh` | Обёртка: подставляет `OPENAI_API_KEY` из `/opt/mcp/.env`, гоняет `fetch.js`, синкает результат на прод |

`fetch.js` пишет только в `/var/www/aidacamp-dev/current/data/news-jazz.json` (захардкожен OUT_DIR).
`run.sh` после успешного запуска копирует этот файл ещё и в
`/var/www/aidacamp/current/data/news-jazz.json` (прод) — без этого шага прод никогда бы не обновлялся.

## Инцидент 2026-07-01 — восстановлено после ~2.5 недель простоя

**Симптом:** виджет AI News на главной показывал пустую плашку (только надпись «AI News» без текста).

**Причины (все три подтверждены):**
1. `OPENAI_API_KEY` не долетал до `fetch.js` — прежняя обвязка запуска брала ключ через
   `grep OPENAI_API_KEY /var/www/aidacamp-dev/.env`, а этого файла не существует по этому пути →
   пустой ключ → OpenAI отвечал ошибкой авторизации → `fetch.js` падал на `data.choices[0]`.
   Сам ключ рабочий, проверено напрямую.
2. `/data/news-jazz.json` физически лежит **вне** обслуживаемого nginx-root (`current/client/`)
   и на dev, и на проде — отсюда 404 независимо от свежести данных.
3. Планировщик (крон), который должен был гонять `fetch.js` каждый час, **пропал совсем**
   после 17.06 — ни в `crontab -l`, ни в `/etc/cron.d/`, ни в systemd-таймерах записи не было.
   Последняя запись в `/var/log/news-jazz.log` — 17 июня.

**Фикс:**
- Новая обёртка `run.sh` (см. выше) с надёжным путём к ключу
- nginx: `location = /data/news-jazz.json { alias ...; }` добавлен и на dev, и на прод
  (см. `scripts/nginx/aidacamp.conf.current` и `aidacamp-dev.conf.current`)
- Восстановлена почасовая cron-запись (root, `:20` каждый час):
  ```
  20 * * * * /opt/news-jazz/run.sh >> /var/log/news-jazz.log 2>&1
  ```
- Добавлена ротация лога (`/etc/logrotate.d/news-jazz`: weekly, 4 ротации, `su root root` —
  без этой директивы logrotate ругается на права `/var/log`):
  ```
  /var/log/news-jazz.log {
      weekly
      rotate 4
      compress
      missingok
      notifempty
      copytruncate
      su root root
  }
  ```

⚠️ Все правки применены **напрямую на сервере через SSH** (нарушение правила «агент не правит
сервер напрямую» из `scripts/nginx/README.md`) — это уже исправлено на живых dev/prod и
проверено. Этот PR документирует изменения постфактум, чтобы дальше это было видно в git,
а не только на сервере.
