-- Персональные ученические аккаунты. Каждому ребёнку — короткий 6-значный код.
-- При логине код проверяется в этой таблице → role=student, sub=kid_id.
-- Имя и связь с расселением сохраняются.

BEGIN;

CREATE TABLE IF NOT EXISTS portal_kid (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,         -- 6-значный код (например '482591')
  name TEXT NOT NULL,
  gender TEXT,                       -- 'M' | 'F' | NULL
  age INT,
  alfa_id BIGINT,                    -- AlfaCRM external ID (если есть)
  room_number INT,                   -- последняя комната расселения
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_portal_kid_active ON portal_kid(active, name);

-- Гранты для SSR (aidacamp_app) — без этого SSR падает 500.
GRANT SELECT, INSERT, UPDATE, DELETE ON portal_kid TO aidacamp_app;
GRANT USAGE, SELECT ON SEQUENCE portal_kid_id_seq TO aidacamp_app;

COMMIT;
