-- 002 · Явная привязка контента смены к самой смене (20.08.2026)
--
-- Проблема: в shift_content/shift_feedback был только day — номер дня смены,
-- а номера переиспользуются каждым новым заездом. На /portal/content?day=4
-- смешались 86 кадров смены 3–15 августа и 46 кадров смены 17–26 августа.
-- Окно дат (PR #1801) проблему закрыло, но развалится на смежных заездах.
--
-- Ключ — shift_id (FK на shift), как у shift_day/shift_event/room_assignment.
-- Номер из .env бота (SHIFT_NO) ключом быть не может: он объявлен «для
-- патч-ноутов» и уже разошёлся с таблицей (SHIFT_NO=6 против «Смена 4»),
-- а в shift вообще нет колонки с номером — join не на что делать.
--
-- Скрипт идемпотентен: гоняется повторно, уже проставленные строки не трогает.

BEGIN;

ALTER TABLE shift_content  ADD COLUMN IF NOT EXISTS shift_id BIGINT REFERENCES shift(id);
ALTER TABLE shift_feedback ADD COLUMN IF NOT EXISTS shift_id BIGINT REFERENCES shift(id);

CREATE INDEX IF NOT EXISTS shift_content_shift_day_idx  ON shift_content  (shift_id, day);
CREATE INDEX IF NOT EXISTS shift_feedback_shift_day_idx ON shift_feedback (shift_id, day);

-- Точный бэкфилл. bot.shift_day() считает day = (сегодня_МСК - SHIFT_START) + 1,
-- значит функция обратима: SHIFT_START = дата_МСК - (day - 1). Совпадение со
-- start_date — не эвристика, а ровно тот день, от которого бот считал.
UPDATE shift_content c
   SET shift_id = s.id
  FROM shift s
 WHERE c.shift_id IS NULL
   AND c.day >= 1
   AND s.start_date = (c.created_at AT TIME ZONE 'Europe/Moscow')::date - (c.day - 1);

UPDATE shift_feedback f
   SET shift_id = s.id
  FROM shift s
 WHERE f.shift_id IS NULL
   AND f.day >= 1
   AND s.start_date = (f.created_at AT TIME ZONE 'Europe/Moscow')::date - (f.day - 1);

-- Остаток: day = 0 (снято до заезда) и редкие строки, у которых day посчитан
-- до полуночи, а вставка прошла после. Берём смену по дате: сначала ту, внутрь
-- которой дата попадает, иначе ближайший заезд, до старта которого меньше
-- месяца (день 0 — это фото «до смены»).
UPDATE shift_content c
   SET shift_id = (
         SELECT s.id FROM shift s
          WHERE (c.created_at AT TIME ZONE 'Europe/Moscow')::date
                BETWEEN s.start_date - 30 AND s.end_date + 1
          ORDER BY ((c.created_at AT TIME ZONE 'Europe/Moscow')::date
                    BETWEEN s.start_date AND s.end_date) DESC,
                   abs((c.created_at AT TIME ZONE 'Europe/Moscow')::date - s.start_date)
          LIMIT 1)
 WHERE c.shift_id IS NULL;

UPDATE shift_feedback f
   SET shift_id = (
         SELECT s.id FROM shift s
          WHERE (f.created_at AT TIME ZONE 'Europe/Moscow')::date
                BETWEEN s.start_date - 30 AND s.end_date + 1
          ORDER BY ((f.created_at AT TIME ZONE 'Europe/Moscow')::date
                    BETWEEN s.start_date AND s.end_date) DESC,
                   abs((f.created_at AT TIME ZONE 'Europe/Moscow')::date - s.start_date)
          LIMIT 1)
 WHERE f.shift_id IS NULL;

COMMIT;
