-- Миграция: пометка дублей заявок в leads_log.
-- Инцидент 03.07.2026: клиент отправил форму бронирования дважды за 15 секунд →
-- два лида в AlfaCRM (5235, 5236). /api/lead теперь дедуплицирует заявки
-- (тот же телефон + смена за 5 минут) и помечает повтор в duplicate_of.
--
-- Применить на проде (желательно ДО деплоя кода, но код умеет работать и без колонки):
--   sudo -u postgres psql -d aidacamp -f leads-log-duplicate-of-migration.sql

ALTER TABLE leads_log ADD COLUMN IF NOT EXISTS duplicate_of BIGINT;
COMMENT ON COLUMN leads_log.duplicate_of IS
  'id исходной заявки, если эта — дубль (тот же телефон и смена за 5 минут); CRM-лид для дубля не создаётся';

-- Ретро-пометка дубля из инцидента 03.07.2026 (id 41 — повтор id 40):
-- UPDATE leads_log SET duplicate_of = 40 WHERE id = 41;
