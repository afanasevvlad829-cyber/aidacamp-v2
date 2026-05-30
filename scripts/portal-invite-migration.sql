-- Приглашения сотрудников. Админ создаёт инвайт → получает короткую ссылку aidacamp.ru/i/<token>.
-- Когда сотрудник кликает и логинится через Telegram, его аккаунт автоматически
-- активируется с предзаданными ролями (без ручного approve в staff-admin).
BEGIN;

CREATE TABLE IF NOT EXISTS portal_invite (
  id BIGSERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  name TEXT,                            -- предполагаемое имя приглашаемого
  comment TEXT,                         -- заметка админа
  roles TEXT[] NOT NULL DEFAULT '{}',   -- предзаданные роли (admin/teacher/vozhaty/rukovoditel)
  created_by TEXT,                      -- sub админа, выписавшего инвайт
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '14 days',
  used_at TIMESTAMPTZ,
  used_by_tg BIGINT,                    -- telegram_id того, кто использовал
  revoked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_portal_invite_token ON portal_invite(token);
CREATE INDEX IF NOT EXISTS idx_portal_invite_active ON portal_invite(revoked, used_at, expires_at);

GRANT SELECT, INSERT, UPDATE ON portal_invite TO aidacamp_app;
GRANT USAGE, SELECT ON SEQUENCE portal_invite_id_seq TO aidacamp_app;

COMMIT;
