-- Портал Фаза 4: расширение модели смены под новую концепцию
-- (event_type enum, group_color, external_id, activity_slug, staff_keys, content_task_template)
-- Идемпотентно: безопасно запускать повторно.
-- Источник: docs/SHIFT_TEMPLATES.md (новая концепция от 2026-05-26)

-- 1) ENUM типа события
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='event_type_enum') THEN
    CREATE TYPE event_type_enum AS ENUM (
      'meal','lesson','pool','pool_or_alt','free_time','evening_event',
      'transit','housing','ceremony','departure','medical','report','routine','bedtime','admin'
    );
  END IF;
END $$;

-- 2) ENUM типа дня
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='day_type_enum') THEN
    CREATE TYPE day_type_enum AS ENUM (
      'preparation','arrival','regular','hackathon','ceremony','departure'
    );
  END IF;
END $$;

-- 3) Цветные группы детей (4 шт на смену)
CREATE TABLE IF NOT EXISTS group_color (
  id BIGSERIAL PRIMARY KEY,
  shift_id BIGINT NOT NULL REFERENCES shift(id) ON DELETE CASCADE,
  key TEXT NOT NULL,             -- 'red','blue','green','yellow'
  name TEXT NOT NULL,            -- 'Красная','Синяя','Зелёная','Жёлтая'
  hex TEXT,                      -- '#ef4444' и т.п. для UI
  teacher_staff_key TEXT,        -- 'teacher_1'/'teacher_2' (опц., можно не привязывать)
  sort INT NOT NULL DEFAULT 0,
  UNIQUE (shift_id, key)
);

-- 4) shift_event: новые колонки (additive)
ALTER TABLE shift_event ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE shift_event ADD COLUMN IF NOT EXISTS event_type event_type_enum;
ALTER TABLE shift_event ADD COLUMN IF NOT EXISTS activity_slug TEXT;
ALTER TABLE shift_event ADD COLUMN IF NOT EXISTS group_color_id BIGINT REFERENCES group_color(id) ON DELETE SET NULL;
ALTER TABLE shift_event ADD COLUMN IF NOT EXISTS staff_keys TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE shift_event ADD COLUMN IF NOT EXISTS content_task_template_id TEXT;
ALTER TABLE shift_event ADD COLUMN IF NOT EXISTS notes TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS shift_event_external_id_idx
  ON shift_event(external_id) WHERE external_id IS NOT NULL;

-- 5) shift_day: тип дня + флаг бассейна
ALTER TABLE shift_day ADD COLUMN IF NOT EXISTS type day_type_enum;
ALTER TABLE shift_day ADD COLUMN IF NOT EXISTS day_number INT;
ALTER TABLE shift_day ADD COLUMN IF NOT EXISTS pool_day BOOLEAN NOT NULL DEFAULT FALSE;

-- 6) portal_staff: семантический ключ (counselor_1, teacher_2, director ...)
ALTER TABLE portal_staff ADD COLUMN IF NOT EXISTS staff_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS portal_staff_staff_key_idx
  ON portal_staff(staff_key) WHERE staff_key IS NOT NULL;

-- 7) Канонический пул контент-заданий (76 шаблонов, библиотека)
CREATE TABLE IF NOT EXISTS content_task_template (
  id TEXT PRIMARY KEY,                       -- 'meal.menu_close'
  event_type event_type_enum NOT NULL,
  content_type TEXT NOT NULL,                -- 'photo'|'video'|'interview'|'group_photo'|'timelapse'
  title TEXT NOT NULL,
  brief TEXT NOT NULL
);

-- 8) Канонический пул чек-листов уже есть (checklist). Добавим applies_to для удобства фильтрации:
ALTER TABLE checklist ADD COLUMN IF NOT EXISTS applies_to event_type_enum[];

-- 9) GRANT для роли приложения
GRANT SELECT,INSERT,UPDATE,DELETE ON group_color, content_task_template TO aidacamp_app;
GRANT USAGE,SELECT ON SEQUENCE group_color_id_seq TO aidacamp_app;
