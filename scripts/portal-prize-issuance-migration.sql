-- Журнал выдач призов + кастомный каталог призов (добавляются админом помимо hardcoded из portalPrizes.ts).
BEGIN;

CREATE TABLE IF NOT EXISTS portal_prize_custom (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  ozon_price INT,
  qty INT NOT NULL DEFAULT 1,
  img_url TEXT,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_prize_custom_active ON portal_prize_custom(archived, created_at);

CREATE TABLE IF NOT EXISTS portal_prize_issuance (
  id BIGSERIAL PRIMARY KEY,
  prize_id TEXT NOT NULL,       -- slug из PRIZES или 'custom-<id>' из portal_prize_custom
  prize_name TEXT,              -- snapshot для аудита
  kid_id BIGINT REFERENCES portal_kid(id) ON DELETE SET NULL,
  kid_name TEXT,                -- snapshot
  issued_by TEXT,               -- sub из portal_session
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  photo_url TEXT,
  video_url TEXT,
  note TEXT,
  bongere_price INT             -- сколько ребёнок заплатил
);

CREATE INDEX IF NOT EXISTS idx_issuance_prize ON portal_prize_issuance(prize_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_issuance_kid ON portal_prize_issuance(kid_id, issued_at DESC);

-- GRANT-ы для SSR
GRANT SELECT, INSERT, UPDATE, DELETE ON portal_prize_custom TO aidacamp_app;
GRANT USAGE, SELECT ON SEQUENCE portal_prize_custom_id_seq TO aidacamp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON portal_prize_issuance TO aidacamp_app;
GRANT USAGE, SELECT ON SEQUENCE portal_prize_issuance_id_seq TO aidacamp_app;

COMMIT;
