-- 003 · Чек-лист задач — свой у каждой смены (21.08.2026)
--
-- Проблема: shift_tasks был одним общим списком на все заезды. Флаг `done`
-- поэтому глобальный: галочка, поставленная в одной смене, переезжала в
-- следующую, и «сдано 2 из 6» в аудите нельзя было отнести ни к какой смене.
-- Номера дней те же, что у shift_content, — та же болезнь, что закрыла 002.
--
-- Раскладка (выведена из данных, не угадана):
--   * id 1-67 — план 13-дневной смены 3-15 августа (shift.id=4), дни 1-13
--     совпадают с её длиной. Отдаём ей.
--   * id 68-69 — задачи дня 1 с самыми большими номерами, заведённые ПОСЛЕ
--     задач дней 9-12, то есть добавленные уже в текущую смену. Отдаём
--     смене 17-26 августа (shift.id=5) напрямую, без копии.
--   * копия плана для смены 5: дни 1-9 как есть, дни 10-13 сведены на день 10
--     (смена короче на три дня, финал не должен потеряться).
--   * done: у копий сброшен. Две галочки (id 2 и 69) заработаны контентом
--     смены 5 — у id 69 остаётся как есть, у id 2 переезжает на копию,
--     а сама id 2 возвращается смене 4 неотмеченной.
--   * shift_content.task_id смены 5 переклеивается на копии. Пересечений нет:
--     ни одна задача не привязана к контенту двух смен сразу (проверено).
--
-- Идемпотентность: повторный прогон не создаст вторых копий (NOT EXISTS).

BEGIN;

ALTER TABLE shift_tasks ADD COLUMN IF NOT EXISTS shift_id BIGINT REFERENCES shift(id);
CREATE INDEX IF NOT EXISTS shift_tasks_shift_day_idx ON shift_tasks (shift_id, day);

-- 1. Исходный план — смене 3-15 августа, поздние добавления — текущей.
UPDATE shift_tasks SET shift_id = 4 WHERE shift_id IS NULL AND id <= 67;
UPDATE shift_tasks SET shift_id = 5 WHERE shift_id IS NULL AND id BETWEEN 68 AND 69;

-- 2. Копия плана для смены 5 с маппингом дня: всё, что было после дня 9,
--    садится на день 10 — последний день короткой смены.
INSERT INTO shift_tasks (day, title, resp_role, deadline, done, shift_id)
SELECT LEAST(t.day, 10), t.title, t.resp_role, t.deadline, false, 5
  FROM shift_tasks t
 WHERE t.shift_id = 4
   AND NOT EXISTS (SELECT 1 FROM shift_tasks x
                    WHERE x.shift_id = 5 AND x.title = t.title
                      AND x.day = LEAST(t.day, 10));

-- 3. Контент смены 5 переклеиваем на её собственные задачи.
UPDATE shift_content c
   SET task_id = n.id
  FROM shift_tasks o
  JOIN shift_tasks n ON n.shift_id = 5 AND n.title = o.title
                    AND n.day = LEAST(o.day, 10)
 WHERE c.shift_id = 5 AND c.task_id = o.id AND o.shift_id = 4;

-- 4. Галочка, заработанная сменой 5, переезжает на её копию.
UPDATE shift_tasks n SET done = true
  FROM shift_content c
 WHERE c.task_id = n.id AND c.shift_id = 5 AND n.shift_id = 5 AND NOT n.done;
UPDATE shift_tasks o SET done = false
 WHERE o.shift_id = 4 AND o.done
   AND NOT EXISTS (SELECT 1 FROM shift_content c WHERE c.task_id = o.id AND c.shift_id = 4);

COMMIT;
