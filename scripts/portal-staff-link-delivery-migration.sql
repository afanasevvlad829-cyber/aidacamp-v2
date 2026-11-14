-- Доставка ссылки входа сотруднику (Green API → Telegram) + телефон сотрудника.
-- Идемпотентно. Применять на проде вручную после мержа (без CI-миграций).

BEGIN;

-- Телефон для Telegram-доставки (цифры, 7XXXXXXXXXX). tg_username уже есть.
ALTER TABLE portal_staff ADD COLUMN IF NOT EXISTS phone TEXT;

-- Постоянный токен ссылки входа /s/<link_token> (не одноразовый). NULL — ссылка не выдавалась.
ALTER TABLE portal_staff ADD COLUMN IF NOT EXISTS link_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_staff_link_token ON portal_staff(link_token) WHERE link_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS portal_link_delivery (
  id          BIGSERIAL PRIMARY KEY,
  staff_id    BIGINT NOT NULL REFERENCES portal_staff(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL DEFAULT 'telegram',
  target      TEXT NOT NULL,                  -- chatId, как ушло в Green API (или введённое значение при failed)
  status      TEXT NOT NULL CHECK (status IN ('queued','sent','failed')),
  error       TEXT,
  message_id  TEXT,                           -- idMessage от Green API: по нему приёмник вебхуков отсекает служебные исходящие
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_portal_link_delivery_staff ON portal_link_delivery(staff_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_link_delivery_msg ON portal_link_delivery(message_id) WHERE message_id IS NOT NULL;

COMMIT;
