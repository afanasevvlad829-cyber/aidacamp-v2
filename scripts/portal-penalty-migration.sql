-- Ф6-3: дисциплина сотрудников (штрафы/предложения)
-- Изолирован от детской игровой экономики (/portal/prizes).
-- Суммы — в реальных рублях. Никаких связей с portal_prize_*.

BEGIN;

-- ── ENUMs ───────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE penalty_status_enum AS ENUM ('proposed','confirmed','contested','cancelled','paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE penalty_source_enum AS ENUM ('auto','manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Словарь причин ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_penalty_reason (
  code         TEXT PRIMARY KEY,                      -- 'checklist_overdue', 'missing_photo', ...
  title        TEXT NOT NULL,
  default_rub  INT  NOT NULL,
  description  TEXT,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Сидим стартовые причины (idempotent).
INSERT INTO portal_penalty_reason(code, title, default_rub, description) VALUES
  ('checklist_overdue',     'Чек-лист не закрыт до конца дня события',          500,  'Срабатывает после 23:59 дня события, если есть pending content_task'),
  ('missing_photo',         'Не загружены обязательные фото',                   1000, 'Срабатывает после 23:59 дня события, если фото-задание pending'),
  ('event_unassigned',      'Событие без ответственного к началу дня',          500,  'Срабатывает в 08:00 дня события — наказывается руководитель смены'),
  ('lesson_no_schedule',    'Урок без расписания за сутки до старта смены',     1000, 'Срабатывает в 08:00 за день до start_date — преподавателю'),
  ('final_report_overdue',  'Финальный отчёт смены просрочен',                  5000, 'Срабатывает через 48 ч после end_date — руководителю'),
  ('manual',                'Ручной штраф (укажите причину в reason_text)',     1000, 'Выставляет руководитель/админ вручную'),
  ('sabotage',              'Систематическое игнорирование портала (саботаж)',  2000, 'Двойная стоимость + разбор с руководителем')
ON CONFLICT (code) DO NOTHING;

-- ── Основная таблица штрафов ────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_penalty (
  id              BIGSERIAL PRIMARY KEY,
  staff_id        BIGINT NOT NULL REFERENCES portal_staff(id) ON DELETE RESTRICT,
  shift_id        BIGINT REFERENCES shift(id) ON DELETE SET NULL,
  event_id        BIGINT REFERENCES shift_event(id) ON DELETE SET NULL,
  reason_code     TEXT   NOT NULL REFERENCES portal_penalty_reason(code) ON DELETE RESTRICT,
  reason_text     TEXT,
  amount_rub      INT    NOT NULL CHECK (amount_rub >= 0),
  source          penalty_source_enum NOT NULL DEFAULT 'manual',
  status          penalty_status_enum NOT NULL DEFAULT 'proposed',
  -- Дедупликация автоштрафов: один и тот же триггер по одному и тому же событию
  -- не должен плодить дубли. Например, dedup_key='checklist_overdue:event=42:date=2026-05-30'.
  dedup_key       TEXT UNIQUE,
  created_by      BIGINT REFERENCES portal_staff(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_by    BIGINT REFERENCES portal_staff(id) ON DELETE SET NULL,
  confirmed_at    TIMESTAMPTZ,
  cancelled_by    BIGINT REFERENCES portal_staff(id) ON DELETE SET NULL,
  cancelled_at    TIMESTAMPTZ,
  cancelled_note  TEXT,
  contested_at    TIMESTAMPTZ,
  contested_note  TEXT,
  paid_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS portal_penalty_staff_idx     ON portal_penalty(staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS portal_penalty_shift_idx     ON portal_penalty(shift_id);
CREATE INDEX IF NOT EXISTS portal_penalty_event_idx     ON portal_penalty(event_id);
CREATE INDEX IF NOT EXISTS portal_penalty_status_idx    ON portal_penalty(status);
CREATE INDEX IF NOT EXISTS portal_penalty_created_idx   ON portal_penalty(created_at DESC);

-- ── Аудит изменений ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portal_penalty_log (
  id            BIGSERIAL PRIMARY KEY,
  penalty_id    BIGINT NOT NULL REFERENCES portal_penalty(id) ON DELETE CASCADE,
  actor_id      BIGINT REFERENCES portal_staff(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,                         -- 'created','confirmed','cancelled','contested','paid','edited'
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_penalty_log_penalty_idx ON portal_penalty_log(penalty_id, created_at DESC);

-- ── GRANT ──────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON portal_penalty,          portal_penalty_log,          portal_penalty_reason TO aidacamp_app;
GRANT USAGE,  SELECT                  ON portal_penalty_id_seq,  portal_penalty_log_id_seq                            TO aidacamp_app;

COMMIT;
