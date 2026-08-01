-- Личный счёт ребёнка: начисления игровых рублей (заработал).
-- Расход уже есть отдельно — portal_prize_issuance.bongere_price (потратил).
-- Баланс ребёнка = SUM(portal_kid_ledger.amount) - SUM(portal_prize_issuance.bongere_price).
--
-- Канон экономики: `_notes/АйДаКемп/Экономика смены — канон.md`.
-- Базовая выдача — 600 ₽/день фиксированно всем (source='daily_allowance', без начисления
-- вручную), плюс ручные корректировки вожатых/штаба (source='manual', причина обязательна).
-- Кто и что вписал — идентично issued_by в portal_prize_issuance (sub из portal_session).

BEGIN;

CREATE TABLE IF NOT EXISTS portal_kid_ledger (
  id BIGSERIAL PRIMARY KEY,
  kid_id BIGINT REFERENCES portal_kid(id) ON DELETE SET NULL,
  kid_name TEXT,                       -- snapshot на случай удаления ребёнка
  amount INT NOT NULL,                 -- + начисление, - списание/штраф
  reason TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',   -- 'manual' | 'daily_allowance'
  shift_day_number INT,                -- день смены (для идемпотентности daily_allowance)
  issued_by TEXT,                      -- sub из portal_session, кто зафиксировал
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portal_kid_ledger_kid ON portal_kid_ledger(kid_id, created_at DESC);

-- Не даём начислить дневную выдачу дважды за один день смены одному ребёнку.
CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_kid_ledger_daily_once
  ON portal_kid_ledger(kid_id, shift_day_number)
  WHERE source = 'daily_allowance';

-- Гранты для SSR (aidacamp_app) — без этого SSR падает 500.
GRANT SELECT, INSERT, UPDATE, DELETE ON portal_kid_ledger TO aidacamp_app;
GRANT USAGE, SELECT ON SEQUENCE portal_kid_ledger_id_seq TO aidacamp_app;

COMMIT;
