ALTER TABLE article_views
  ADD COLUMN IF NOT EXISTS rss_published_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_article_views_rss ON article_views(rss_published_at DESC NULLS LAST);
