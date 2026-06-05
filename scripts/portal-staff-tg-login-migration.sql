-- Фиксация входа персонала через Telegram (отдельно от code_login_at).
-- code_login_at = вход по коду, tg_login_at = вход через Telegram.
ALTER TABLE portal_staff ADD COLUMN IF NOT EXISTS tg_login_at TIMESTAMPTZ;
