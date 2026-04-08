-- Конверсия по варианту (form_submit / page_view)
SELECT
  test_id,
  variant,
  SUM(CASE WHEN event_name = 'page_view' THEN 1 ELSE 0 END) AS page_views,
  SUM(CASE WHEN event_name = 'form_submit' THEN 1 ELSE 0 END) AS leads,
  ROUND(
    100.0 * SUM(CASE WHEN event_name = 'form_submit' THEN 1 ELSE 0 END)
    / NULLIF(SUM(CASE WHEN event_name = 'page_view' THEN 1 ELSE 0 END), 0),
    2
  ) AS cr_percent
FROM ab_events
WHERE test_id = 'hero_primary_block_v1'
GROUP BY test_id, variant
ORDER BY variant;

-- Детализация по устройствам
SELECT
  variant,
  device_type,
  SUM(CASE WHEN event_name = 'page_view' THEN 1 ELSE 0 END) AS page_views,
  SUM(CASE WHEN event_name = 'form_submit' THEN 1 ELSE 0 END) AS leads,
  ROUND(
    100.0 * SUM(CASE WHEN event_name = 'form_submit' THEN 1 ELSE 0 END)
    / NULLIF(SUM(CASE WHEN event_name = 'page_view' THEN 1 ELSE 0 END), 0),
    2
  ) AS cr_percent
FROM ab_events
WHERE test_id = 'hero_primary_block_v1'
GROUP BY variant, device_type
ORDER BY variant, device_type;

-- Суточная динамика
SELECT
  substr(event_ts, 1, 10) AS day,
  variant,
  SUM(CASE WHEN event_name = 'page_view' THEN 1 ELSE 0 END) AS page_views,
  SUM(CASE WHEN event_name = 'form_submit' THEN 1 ELSE 0 END) AS leads
FROM ab_events
WHERE test_id = 'hero_primary_block_v1'
GROUP BY day, variant
ORDER BY day DESC, variant;
