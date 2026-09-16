# shift-content-bot — приём контента смены

Бот `@Aidacamp2026bot`, в который вожатые/преподаватели/оператор сдают фото,
видео, голосовые и текстовые отчёты. Пишет в `shift_content` / `shift_feedback`
(БД `aidacamp` на проде), портал `/portal/content` эти таблицы только читает
(`src/lib/portalShiftContent.ts`).

## Где живёт

Прод: `/opt/shift-content-bot/` (юнит `shift-content-bot.service`), рядом —
`.env`, `bot.session`, бэкапы `bot.py.bak-<дата>`. До 20.08.2026 кода не было
ни в одном репозитории — правки делались прямо на сервере, единственной
историей были эти `.bak`-файлы. Здесь лежит копия под версионным контролем.

**Автодеплоя нет.** Репо — источник правды, прод обновляется руками:

```bash
scp -i ~/.ssh/aidacamp_prod shift-content-bot/bot.py root@159.194.223.55:/opt/shift-content-bot/bot.py
ssh -i ~/.ssh/aidacamp_prod root@159.194.223.55 "systemctl restart shift-content-bot && systemctl is-active shift-content-bot"
```

Перед правкой сверь копии (`md5sum`): если прод ушёл вперёд — сначала забери
его сюда, иначе `scp` затрёт чужую правку.

Секреты (`.env`: `BOT_TOKEN`, `TG_API_HASH`, DSN) остаются только на сервере
и в репозиторий не попадают.

## Привязка к смене

`shift_content.shift_id` / `shift_feedback.shift_id` — FK на `shift(id)`.
Бот резолвит его сам по своему `SHIFT_START` из `.env` (`shift_id()`),
руками номер нигде не проставляется. `SHIFT_NO` из `.env` — только подпись для
патч-ноутов, ключом не является: он уже расходился с таблицей (`SHIFT_NO=6`
против «Смена 4»). Миграция и бэкфилл — `scripts/migrations/002-shift-content-shift-id.sql`.

## Что ещё лежит на проде вне git

`immich_sync.py` (cron, заливка в Immich), `backfill_*.py`, `repair_desc.py`,
`clean_junk_transcripts.py`, `smoke_bot.py`, `schema.sql`. Их долг не закрыт —
переносить тем же путём, по мере того как они понадобятся.
