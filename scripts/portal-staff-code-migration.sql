-- Персональный код-вход для сотрудников — альтернатива Telegram (TG не всегда доступен).
-- Сотрудник вводит свой код на /portal/login → role = высшая роль сотрудника,
-- sid = portal_staff.id (в отличие от ученика, где sub = portal_kid.id).
-- Работает и для placeholder-ов (без telegram_id) — то есть для тех, кто вообще не заходил через TG.

BEGIN;

-- Короткий код (6 цифр, как у учеников). NULL — у сотрудника кода нет (вход только через TG).
ALTER TABLE portal_staff ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE portal_staff ADD COLUMN IF NOT EXISTS code_login_at TIMESTAMPTZ;

-- Уникальность кода среди сотрудников (частичный индекс — NULL не конфликтуют).
CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_staff_code ON portal_staff(code) WHERE code IS NOT NULL;

COMMIT;
