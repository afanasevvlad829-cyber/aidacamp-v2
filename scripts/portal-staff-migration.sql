CREATE TABLE IF NOT EXISTS portal_staff (
  id           BIGSERIAL PRIMARY KEY,
  telegram_id  BIGINT UNIQUE NOT NULL,
  full_name    TEXT,
  tg_username  TEXT,
  role         TEXT CHECK (role IN ('admin','teacher','vozhaty','rukovoditel')),
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by  BIGINT,
  approved_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_portal_staff_role_active ON portal_staff (role, active);
