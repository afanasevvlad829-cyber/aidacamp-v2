-- Ежедневное обогащение атрибуции. ИДЕМПОТЕНТНО и НЕДЕСТРУКТИВНО:
-- только заполняет пустое/unknown и добавляет метки, никогда не затирает
-- живые значения популятора / ручной разбор. Запуск: sudo -u postgres psql -f этот_файл
--
-- Развёрнут на проде: /opt/etl/enrich_attribution.sql
-- Вызывается из: /opt/reports-hub/run_attribution_dashboard.sh (шаг 0, ежедневный цикл)
\set ON_ERROR_STOP on
BEGIN;

-- 0. колонка is_test (на случай свежей БД)
ALTER TABLE leads_log ADD COLUMN IF NOT EXISTS is_test boolean DEFAULT false;

-- 1. Пометить тестовые номера (идемпотентно)
UPDATE leads_log SET is_test = true
WHERE NOT coalesce(is_test,false)
  AND ( regexp_replace(phone,'\D','','g') LIKE '7999000%'
     OR regexp_replace(phone,'\D','','g') LIKE '%1234567'
     OR regexp_replace(phone,'\D','','g') = '79161234567' );

-- 2. Атрибуция лидов: заполнить/улучшить source.
--    Приоритет: тест → visits-first-touch (по visitor_id) → зашитые метки в referrer/landing.
--    Пишем ТОЛЬКО поверх пустого/'unknown' (или ставим 'test'); 'unknown' поверх чего-либо НЕ пишем.
WITH resolved AS (
  SELECT l.id,
    regexp_replace(l.phone,'\D','','g') AS digits,
    (coalesce(l.referrer,'')||' '||coalesce(l.landing_url,'')) AS blob,
    fv.source AS first_touch_source
  FROM leads_log l
  LEFT JOIN LATERAL (
    SELECT v.source FROM visits v
    WHERE v.visitor_id = l.visitor_id AND v.is_first
    ORDER BY v.ts LIMIT 1
  ) fv ON true
),
calc AS (
  SELECT id,
    CASE
      WHEN digits LIKE '7999000%' OR digits LIKE '%1234567' OR digits='79161234567' THEN 'test'
      WHEN first_touch_source IS NOT NULL AND first_touch_source <> 'other' THEN first_touch_source
      WHEN blob ~* 'yclid=' AND blob !~* 'ysclid=' THEN 'yandex_direct'
      WHEN blob ~* 'gclid=' THEN 'google_ads'
      WHEN blob ~* 'utm_source=codims' THEN 'codims'
      WHEN blob ~* 'ysclid=' OR blob ~* 'yandex\.' THEN 'yandex_organic'
      WHEN blob ~* 'google\.' THEN 'google_organic'
      WHEN blob ~* 'vk\.com' THEN 'vk'
      ELSE 'unknown'
    END AS cand
  FROM resolved
)
UPDATE leads_log l SET source = c.cand
FROM calc c
WHERE c.id = l.id
  AND c.cand NOT IN ('unknown')                     -- никогда не пишем unknown поверх
  AND coalesce(l.source,'') IN ('','unknown')        -- только пустое/unknown
  AND coalesce(l.source,'') IS DISTINCT FROM c.cand; -- пропустить no-op

-- 3. Стык visits <- leads по visitor_id: проставить phone+crm_id где ещё NULL
WITH lk AS (
  SELECT DISTINCT ON (l.visitor_id) l.visitor_id, l.phone, l.crm_id
  FROM leads_log l
  WHERE l.visitor_id IS NOT NULL AND NOT coalesce(l.is_test,false)
  ORDER BY l.visitor_id, l.id DESC
)
UPDATE visits v SET phone = lk.phone, crm_id = lk.crm_id
FROM lk
WHERE v.visitor_id = lk.visitor_id
  AND (v.phone IS NULL OR v.crm_id IS NULL);

-- 3b. СТЫК ym_uid: visits <-> client_enrichment (AlfaCRM custom_custom_ym_uid).
--     Идемпотентно и недеструктивно. Механизм для будущих купивших (Смены 3-4):
--     первое касание в visits привязывается к crm_id/phone из CRM по общему ym_uid.
--     Смена 1 продавалась до старта захвата visits (22.06) — совпадений мало, это ОК.
-- 3b.1 Проставить visits.crm_id и visits.phone из client_enrichment по ym_uid, где ещё NULL.
WITH ce AS (
  SELECT DISTINCT ON (ym_uid) ym_uid, crm_id, phone
  FROM client_enrichment
  WHERE coalesce(ym_uid,'') <> '' AND crm_id IS NOT NULL
  ORDER BY ym_uid, crm_id
)
UPDATE visits v
SET crm_id = COALESCE(v.crm_id, ce.crm_id),
    phone  = COALESCE(v.phone,  ce.phone)
FROM ce
WHERE v.ym_uid = ce.ym_uid
  AND (v.crm_id IS NULL OR v.phone IS NULL);

-- 3b.2 Пометить в client_attribution связанных через ym_uid (аудит-след).
--     Только где method пуст — не затираем ручной разбор / auto-leads-log.
WITH stitched AS (
  SELECT DISTINCT ce.crm_id, ce.ym_uid
  FROM client_enrichment ce
  JOIN visits v ON v.ym_uid = ce.ym_uid
  WHERE coalesce(ce.ym_uid,'') <> '' AND ce.crm_id IS NOT NULL
)
UPDATE client_attribution ca
SET method='auto-ym-uid-stitch',
    confidence=COALESCE(NULLIF(ca.confidence,''),'high'),
    proof=COALESCE(NULLIF(ca.proof,''),'visits.ym_uid='||s.ym_uid)
FROM stitched s
WHERE s.crm_id = ca.crm_id
  AND coalesce(ca.method,'') = '';

-- 4. Обогащение client_attribution.method где пусто и источник лида конкретный
--    (source популятора НЕ трогаем — только method/confidence/proof, аудит-след)
WITH src AS (
  SELECT ca.crm_id, min(l.id) AS lead_id, min(l.source) AS lead_source
  FROM client_attribution ca
  JOIN leads_log l ON l.crm_id = ca.crm_id
  WHERE coalesce(ca.method,'') = ''
    AND NOT coalesce(l.is_test,false)
    AND l.source IN ('google_organic','yandex_organic','codims','yandex_direct','google_ads','vk','direct')
  GROUP BY ca.crm_id
)
UPDATE client_attribution ca
SET method='auto-leads-log',
    confidence=COALESCE(NULLIF(ca.confidence,''),'high'),
    proof=COALESCE(NULLIF(ca.proof,''),'leads_log#'||src.lead_id||' source='||src.lead_source)
FROM src WHERE src.crm_id = ca.crm_id;

COMMIT;

-- Сводка после прогона
\echo '--- enrichment summary ---'
SELECT 'leads total' AS m, count(*)::text v FROM leads_log
UNION ALL SELECT 'leads tests', count(*)::text FROM leads_log WHERE is_test
UNION ALL SELECT 'leads unknown', count(*)::text FROM leads_log WHERE NOT coalesce(is_test,false) AND source='unknown'
UNION ALL SELECT 'leads attributed', count(*)::text FROM leads_log WHERE NOT coalesce(is_test,false) AND source NOT IN ('unknown','') AND source IS NOT NULL
UNION ALL SELECT 'visits linked (phone)', count(*)::text FROM visits WHERE phone IS NOT NULL
UNION ALL SELECT 'client_attr auto-method', count(*)::text FROM client_attribution WHERE method='auto-leads-log'
UNION ALL SELECT 'client_attr ym-uid-stitch', count(*)::text FROM client_attribution WHERE method='auto-ym-uid-stitch'
UNION ALL SELECT 'visits linked via ym_uid', count(DISTINCT ce.crm_id)::text FROM client_enrichment ce JOIN visits v ON v.ym_uid=ce.ym_uid WHERE coalesce(ce.ym_uid,'')<>'';
