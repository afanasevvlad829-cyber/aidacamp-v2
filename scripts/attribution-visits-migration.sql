-- scripts/attribution-visits-migration.sql
-- Сквозная атрибуция, этап 1-2. Применять: psql -d aidacamp -f этот_файл
-- Идемпотентно (IF NOT EXISTS / OR REPLACE) — безопасно прогонять повторно.
BEGIN;

-- 1. Таблица visits (партиционирование по месяцам)
CREATE TABLE IF NOT EXISTS visits (
  id           bigint GENERATED ALWAYS AS IDENTITY,
  visitor_id   text        NOT NULL,
  ts           timestamptz NOT NULL DEFAULT now(),
  is_first     boolean     NOT NULL,
  landing_url  text, referer text,
  utm_source text, utm_medium text, utm_campaign text, utm_content text, utm_term text,
  yclid text, gclid text, ysclid text,
  ip inet, geo_city text, user_agent text, accept_lang text,
  ym_uid text, ym_blocked boolean,
  phone text, crm_id integer,
  source text,
  PRIMARY KEY (id, ts)
) PARTITION BY RANGE (ts);

-- 2. Классификатор источника — единый источник правил (SQL §2.4/§5 спеки)
CREATE OR REPLACE FUNCTION fn_classify_source(
  p_yclid text, p_gclid text, p_ysclid text,
  p_utm_source text, p_referer text, p_landing text
) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_yclid  IS NOT NULL AND p_yclid  <> '' THEN 'yandex_direct'
    WHEN p_gclid  IS NOT NULL AND p_gclid  <> '' THEN 'google_ads'
    WHEN lower(coalesce(p_utm_source,'')) = 'codims' THEN 'codims'
    WHEN (p_ysclid IS NOT NULL AND p_ysclid <> '') OR p_referer ~* 'yandex\.' THEN 'yandex_organic'
    WHEN p_referer ~* 'google\.'  THEN 'google_organic'
    WHEN p_referer ~* 'vk\.com'   THEN 'vk'
    WHEN coalesce(p_referer,'') = '' AND p_landing ~* '/shifts/' THEN 'referral_link'
    WHEN coalesce(p_referer,'') = '' AND coalesce(p_landing,'/') = '/' THEN 'direct'
    ELSE 'other'
  END;
$$;

-- 3. Хелпер: создать партицию на месяц (идемпотентно)
CREATE OR REPLACE FUNCTION fn_visits_ensure_partition(p_month date)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  m date := date_trunc('month', p_month);
  pname text := 'visits_' || to_char(m, 'YYYY_MM');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = pname) THEN
    EXECUTE format(
      'CREATE TABLE %I PARTITION OF visits FOR VALUES FROM (%L) TO (%L)',
      pname, m, (m + interval '1 month'));
    EXECUTE format('CREATE INDEX ON %I (visitor_id)', pname);
    EXECUTE format('CREATE INDEX ON %I (phone)', pname);
    EXECUTE format('CREATE INDEX ON %I (ym_uid)', pname);
    EXECUTE format('CREATE INDEX ON %I (ts)', pname);
  END IF;
END $$;

-- Текущий + следующий месяц
SELECT fn_visits_ensure_partition(now()::date);
SELECT fn_visits_ensure_partition((now() + interval '1 month')::date);

-- 4. Линковка существующих таблиц (без переписывания логики)
ALTER TABLE leads_log         ADD COLUMN IF NOT EXISTS visitor_id text;
ALTER TABLE pamyatka_bindings ADD COLUMN IF NOT EXISTS visitor_id text;
CREATE INDEX IF NOT EXISTS leads_log_visitor_id_idx ON leads_log (visitor_id);

COMMIT;
