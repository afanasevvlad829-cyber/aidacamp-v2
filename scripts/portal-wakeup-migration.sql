-- Ф8-2: Подъём — события на каждый день кроме первого + self-check каждого сотрудника.
-- Идемпотентна: повторный запуск ничего не дублирует.

-- 0) Расширяем event_type_enum значением 'wakeup' — должно идти ОТДЕЛЬНОЙ транзакцией
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid='event_type_enum'::regtype AND enumlabel='wakeup') THEN
    ALTER TYPE event_type_enum ADD VALUE 'wakeup';
  END IF;
END $$;

BEGIN;

-- 1) Таблица отметок «я встал» — по строке на (event_id, staff_id)
CREATE TABLE IF NOT EXISTS event_self_check (
  id            BIGSERIAL PRIMARY KEY,
  event_id      BIGINT NOT NULL REFERENCES shift_event(id) ON DELETE CASCADE,
  staff_id      BIGINT NOT NULL REFERENCES portal_staff(id) ON DELETE CASCADE,
  checked_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, staff_id)
);
CREATE INDEX IF NOT EXISTS event_self_check_event_idx ON event_self_check(event_id);
CREATE INDEX IF NOT EXISTS event_self_check_staff_idx ON event_self_check(staff_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON event_self_check     TO aidacamp_app;
GRANT USAGE,  SELECT                  ON event_self_check_id_seq TO aidacamp_app;

-- 2) Новая причина штрафа: «Не отметился на подъёме»
INSERT INTO portal_penalty_reason(code, title, default_rub, description) VALUES
  ('wakeup_missed', 'Не отметился на подъёме', 500, 'Срабатывает в 09:00 за каждый день, где сотрудник не отметил «я встал»')
ON CONFLICT (code) DO NOTHING;

-- 3) Засев событий «Подъём» для активной смены — на каждый день кроме первого.
-- external_id формата 'wakeup:<shift_id>:<date>' — уникальный, повторные прогоны не плодят дубли.
INSERT INTO shift_event (shift_id, date, start_time, end_time, title, event_type, activity_type, roles, sort, external_id)
SELECT
  d.shift_id,
  d.date,
  TIME '08:30',
  TIME '09:00',
  'Подъём',
  'wakeup'::event_type_enum,
  'wakeup',
  ARRAY['admin','rukovoditel','teacher','vozhaty']::TEXT[],
  -100,                                   -- большой минус → попадёт первым в ленте дня
  'wakeup:' || d.shift_id || ':' || to_char(d.date, 'YYYY-MM-DD')
FROM shift_day d
JOIN shift s ON s.id = d.shift_id
WHERE s.status = 'active'
  AND d.day_number > 1
ON CONFLICT (external_id) WHERE external_id IS NOT NULL DO NOTHING;

COMMIT;
