-- Комментарии преподавателей к методичкам (по slug активности).
-- Каждый новый текст — новая версия (история не теряется).
BEGIN;

CREATE TABLE IF NOT EXISTS portal_methodichka_comment (
  id BIGSERIAL PRIMARY KEY,
  activity_slug TEXT NOT NULL,
  author TEXT,                   -- sub из portal_session (telegram id или 'admin')
  author_name TEXT,              -- читаемое имя
  body TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'text',  -- 'text' | 'voice'
  version INT NOT NULL DEFAULT 1,
  parent_id BIGINT REFERENCES portal_methodichka_comment(id) ON DELETE SET NULL,
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_methodichka_comment_slug ON portal_methodichka_comment(activity_slug, archived, created_at);

COMMIT;
