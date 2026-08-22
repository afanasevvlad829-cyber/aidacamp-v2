-- portal-draft-post-migration.sql
-- Черновики постов для родительского канала (Фаза 1 tg-draft-collector).
BEGIN;

CREATE TABLE IF NOT EXISTS draft_post (
  id                  BIGSERIAL PRIMARY KEY,
  shift_id            BIGINT REFERENCES shift(id),
  author_telegram_id  BIGINT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'collecting'
                         CHECK (status IN ('collecting','pending_review','approved','rejected')),
  text                TEXT,
  reviewer_chat_id    BIGINT,
  reviewer_message_id BIGINT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  decided_at          TIMESTAMPTZ,
  decided_by          BIGINT
);

CREATE INDEX IF NOT EXISTS idx_draft_post_author_status
  ON draft_post(author_telegram_id, status);

ALTER TABLE shift ADD COLUMN IF NOT EXISTS tg_parent_channel_id BIGINT;

GRANT SELECT, INSERT, UPDATE, DELETE ON draft_post TO aidacamp_app;
GRANT USAGE, SELECT ON SEQUENCE draft_post_id_seq TO aidacamp_app;

COMMIT;
