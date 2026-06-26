-- article_views — живой счётчик просмотров статей /stati/*.
-- Сид первичных значений — из Яндекс.Метрики (scripts/seed-article-views.mjs ← src/data/articleViews.ts).
-- Применение на проде: psql "$DATABASE_URL" -f scripts/article-views-migration.sql
CREATE TABLE IF NOT EXISTS article_views (
  slug       TEXT PRIMARY KEY,
  views      BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
