-- Миграция: добавление полей соцсетей и Метрики в article_views
-- Task 3: Social Publishing
-- Дата: 2026-06-29

ALTER TABLE article_views
  ADD COLUMN IF NOT EXISTS metrika_visits    INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metrika_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vk_post_id        TEXT,
  ADD COLUMN IF NOT EXISTS vk_owner_id       INTEGER,
  ADD COLUMN IF NOT EXISTS vk_posted_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vk_likes          INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vk_reposts        INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vk_views          INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vk_stats_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ok_post_id        TEXT,
  ADD COLUMN IF NOT EXISTS ok_posted_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ok_likes          INTEGER   DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ok_stats_at       TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_article_views_vk_posted ON article_views(vk_posted_at);
CREATE INDEX IF NOT EXISTS idx_article_views_metrika   ON article_views(metrika_visits DESC);
