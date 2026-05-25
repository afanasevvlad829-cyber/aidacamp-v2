-- Портал Фаза 3: Сетка смены — модель данных (Postgres, рядом с portal_staff)
-- Идемпотентно: безопасно запускать повторно.
-- Источник: docs/superpowers/specs/2026-05-25-portal-smena-design.md §2

CREATE TABLE IF NOT EXISTS shift (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived'))
);
CREATE TABLE IF NOT EXISTS shift_day (
  id BIGSERIAL PRIMARY KEY,
  shift_id BIGINT NOT NULL REFERENCES shift(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  title TEXT,
  UNIQUE (shift_id, date)
);
CREATE TABLE IF NOT EXISTS shift_event (
  id BIGSERIAL PRIMARY KEY,
  shift_id BIGINT NOT NULL REFERENCES shift(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  title TEXT NOT NULL,
  activity_type TEXT,
  roles TEXT[] NOT NULL DEFAULT '{}',   -- роли-ответственные/участники
  sort INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS checklist (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE,                       -- 'zaezd','rasselenie','priyomka',...
  title TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'      -- [{ "id": "i1", "text": "..." }]
);
CREATE TABLE IF NOT EXISTS event_checklist (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES shift_event(id) ON DELETE CASCADE,
  checklist_id BIGINT NOT NULL REFERENCES checklist(id) ON DELETE CASCADE,
  roles TEXT[] NOT NULL DEFAULT '{}'     -- каким ролям этот чек-лист на этом событии
);
CREATE TABLE IF NOT EXISTS checklist_done (
  id BIGSERIAL PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES shift_event(id) ON DELETE CASCADE,
  checklist_id BIGINT NOT NULL REFERENCES checklist(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  telegram_id BIGINT NOT NULL,
  done_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, checklist_id, item_id, telegram_id)
);

-- Права для роли приложения (node-сервис ходит под ней). Идемпотентно.
GRANT SELECT,INSERT,UPDATE,DELETE ON shift,shift_day,shift_event,checklist,event_checklist,checklist_done TO aidacamp_app;
GRANT USAGE,SELECT ON SEQUENCE shift_id_seq,shift_day_id_seq,shift_event_id_seq,checklist_id_seq,event_checklist_id_seq,checklist_done_id_seq TO aidacamp_app;
