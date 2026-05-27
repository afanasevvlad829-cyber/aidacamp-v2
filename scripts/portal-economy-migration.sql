-- Экономика смены — призы и активности АйДаКемп
-- Параметры смены (N детей, ₽/день, дней) хранятся в localStorage у админа.
-- Состояние призов и каталог активностей — на сервере (общие для всех).

BEGIN;

-- Серверный override состояния по конкретному призу из portalPrizes.ts.
-- Если строки нет — значит дефолт (видимый, цена не задана).
CREATE TABLE IF NOT EXISTS portal_prize_state (
  prize_id TEXT PRIMARY KEY,
  hidden BOOLEAN NOT NULL DEFAULT FALSE,
  bongere_price INT,
  custom_photo TEXT,            -- URL загруженного фото (если admin заменил)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by TEXT
);

-- Серверный каталог активностей: «телефон на ночь», «отменить зарядку» и т.д.
-- per_person_price — на сколько человек обычно скидываются.
CREATE TABLE IF NOT EXISTS portal_activity_offer (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,                -- 'food' | 'comfort' | 'fun' | 'privilege' | 'service' | 'other'
  base_price INT,               -- себестоимость / факт. трата лагеря, ₽
  participants_hint INT,        -- сколько человек обычно скидываются (NULL = индивидуально)
  sort INT NOT NULL DEFAULT 0,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_activity_offer_sort ON portal_activity_offer(archived, sort);

COMMIT;
