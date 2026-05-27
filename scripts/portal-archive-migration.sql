-- Идемпотентная миграция: таблицы для фото-архива портала
-- Накат: sudo -u postgres psql -d aidacamp -v ON_ERROR_STOP=1 -f portal-archive-migration.sql

-- ---- ENUM types (идемпотентно) ----
DO $$ BEGIN
  CREATE TYPE photo_content_type_enum AS ENUM ('photo','video','interview','group_photo','timelapse');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE content_task_status_enum AS ENUM ('pending','completed','skipped');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---- event_content_task ----
CREATE TABLE IF NOT EXISTS event_content_task (
  id              BIGSERIAL PRIMARY KEY,
  event_id        BIGINT NOT NULL REFERENCES shift_event(id) ON DELETE CASCADE,
  template_id     TEXT NOT NULL REFERENCES content_task_template(id),
  assigned_role   TEXT,
  status          content_task_status_enum NOT NULL DEFAULT 'pending',
  completed_at    TIMESTAMPTZ,
  completed_by    BIGINT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, template_id)
);

-- ---- archive_photo ----
CREATE TABLE IF NOT EXISTS archive_photo (
  id                  BIGSERIAL PRIMARY KEY,
  event_id            BIGINT NOT NULL REFERENCES shift_event(id) ON DELETE CASCADE,
  content_task_id     BIGINT REFERENCES event_content_task(id) ON DELETE SET NULL,
  author_telegram_id  BIGINT NOT NULL,
  storage_kind        TEXT NOT NULL DEFAULT 'local',   -- 'local' | 'yadisk'
  file_path           TEXT NOT NULL,                   -- относительный путь в хранилище
  file_url            TEXT,                            -- публичный URL
  file_type           TEXT NOT NULL,                   -- 'photo' | 'video'
  mime                TEXT,
  width               INT,
  height              INT,
  duration_ms         INT,
  size_bytes          BIGINT,
  caption             TEXT,
  uploaded_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS archive_photo_event_id_idx       ON archive_photo(event_id);
CREATE INDEX IF NOT EXISTS archive_photo_author_tg_id_idx   ON archive_photo(author_telegram_id);
CREATE INDEX IF NOT EXISTS archive_photo_uploaded_at_idx    ON archive_photo(uploaded_at);

-- ---- Права роли приложения ----
GRANT SELECT, INSERT, UPDATE, DELETE ON event_content_task TO aidacamp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON archive_photo      TO aidacamp_app;
GRANT USAGE, SELECT ON SEQUENCE event_content_task_id_seq  TO aidacamp_app;
GRANT USAGE, SELECT ON SEQUENCE archive_photo_id_seq       TO aidacamp_app;
