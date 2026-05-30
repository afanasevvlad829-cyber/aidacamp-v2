-- Ф7-5: portal_lesson — уроки как самостоятельная сущность.
-- Урок ≠ событие сетки. Урок имеет: преподаватель, группа (цвет),
-- активность (методичка), тема, ожидаемый результат, прогресс по детям.
-- Опционально связан с shift_event (если этот урок ещё и в сетке смены).

BEGIN;

-- ENUM статусов урока
DO $$ BEGIN
  CREATE TYPE lesson_status_enum AS ENUM ('planned','in_progress','done','skipped','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ENUM статуса прогресса ребёнка
DO $$ BEGIN
  CREATE TYPE lesson_progress_enum AS ENUM ('not_started','attended','completed','absent','excused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Основная таблица урока
CREATE TABLE IF NOT EXISTS portal_lesson (
  id                  BIGSERIAL PRIMARY KEY,
  shift_id            BIGINT NOT NULL REFERENCES shift(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  start_time          TIME,
  end_time            TIME,
  teacher_staff_id    BIGINT NOT NULL REFERENCES portal_staff(id) ON DELETE RESTRICT,
  group_color_id      BIGINT REFERENCES group_color(id) ON DELETE SET NULL,
  activity_slug       TEXT,                      -- ссылка на методичку (portalActivities)
  topic               TEXT NOT NULL,              -- что преподаётся
  expected_outcome    TEXT,                       -- что ребёнок унесёт по итогу
  materials_needed    TEXT,                       -- что нужно из реквизита/AI-моделей
  status              lesson_status_enum NOT NULL DEFAULT 'planned',
  shift_event_id      BIGINT REFERENCES shift_event(id) ON DELETE SET NULL,
  notes               TEXT,                       -- свободные пометки преподавателя
  created_by          BIGINT REFERENCES portal_staff(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS portal_lesson_shift_idx     ON portal_lesson(shift_id, date);
CREATE INDEX IF NOT EXISTS portal_lesson_teacher_idx   ON portal_lesson(teacher_staff_id);
CREATE INDEX IF NOT EXISTS portal_lesson_status_idx    ON portal_lesson(status);
CREATE INDEX IF NOT EXISTS portal_lesson_event_idx     ON portal_lesson(shift_event_id) WHERE shift_event_id IS NOT NULL;

-- Прогресс ребёнка по уроку (трекинг «путь ученика»)
CREATE TABLE IF NOT EXISTS portal_lesson_progress (
  id             BIGSERIAL PRIMARY KEY,
  lesson_id      BIGINT NOT NULL REFERENCES portal_lesson(id) ON DELETE CASCADE,
  kid_id         BIGINT NOT NULL REFERENCES portal_kid(id) ON DELETE CASCADE,
  status         lesson_progress_enum NOT NULL DEFAULT 'not_started',
  outcome_note   TEXT,                            -- что ребёнок реально унёс
  difficulty_note TEXT,                           -- где забуксовал
  artifact_url   TEXT,                            -- ссылка на работу/проект
  recorded_by    BIGINT REFERENCES portal_staff(id) ON DELETE SET NULL,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, kid_id)
);
CREATE INDEX IF NOT EXISTS portal_lesson_progress_lesson_idx ON portal_lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS portal_lesson_progress_kid_idx    ON portal_lesson_progress(kid_id, recorded_at DESC);

-- Триггер: обновлять updated_at на portal_lesson при правках
CREATE OR REPLACE FUNCTION portal_lesson_touch() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS portal_lesson_touch_trg ON portal_lesson;
CREATE TRIGGER portal_lesson_touch_trg
  BEFORE UPDATE ON portal_lesson
  FOR EACH ROW EXECUTE FUNCTION portal_lesson_touch();

-- GRANT
GRANT SELECT, INSERT, UPDATE, DELETE ON portal_lesson, portal_lesson_progress TO aidacamp_app;
GRANT USAGE,  SELECT ON portal_lesson_id_seq, portal_lesson_progress_id_seq TO aidacamp_app;

COMMIT;
