-- Ф10-1: Единая система медиа.
-- archive_photo расширяется entity_type/entity_id/sort_order чтобы крепиться
-- к любой сущности (event/student/prize/lesson/room/profile/...).

BEGIN;

ALTER TABLE archive_photo
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id   BIGINT,
  ADD COLUMN IF NOT EXISTS sort_order  INT NOT NULL DEFAULT 0;

-- Бэкфилл: старые записи с event_id → entity_type='event'
UPDATE archive_photo
   SET entity_type = 'event', entity_id = event_id
 WHERE entity_type IS NULL AND event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS archive_photo_entity_idx
  ON archive_photo(entity_type, entity_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON archive_photo TO aidacamp_app;

COMMIT;
