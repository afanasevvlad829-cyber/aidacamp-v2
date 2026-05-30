-- Ф6-1: главный ответственный за событие
-- Добавляет shift_event.responsible_staff_id (опционально, FK на portal_staff).
-- Бэкфилл: для каждого события — первый staff_key из массива, если есть совпадение в portal_staff.

BEGIN;

ALTER TABLE shift_event
  ADD COLUMN IF NOT EXISTS responsible_staff_id BIGINT REFERENCES portal_staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS shift_event_responsible_idx
  ON shift_event(responsible_staff_id)
  WHERE responsible_staff_id IS NOT NULL;

-- Бэкфилл: берём первый staff_key из массива и ищем совпадение
UPDATE shift_event se
SET responsible_staff_id = ps.id
FROM portal_staff ps
WHERE se.responsible_staff_id IS NULL
  AND COALESCE(array_length(se.staff_keys, 1), 0) >= 1
  AND ps.staff_key = se.staff_keys[1]
  AND ps.active = TRUE;

-- Триггер: если responsible_staff_id NULL, а staff_keys[1] резолвится в portal_staff —
-- подставляем автоматически. Чтобы сидер не перетирал явные назначения, триггер
-- срабатывает только когда responsible_staff_id IS NULL (BEFORE INSERT/UPDATE).
CREATE OR REPLACE FUNCTION shift_event_autoresolve_responsible() RETURNS TRIGGER AS $$
DECLARE
  resolved_id BIGINT;
BEGIN
  IF NEW.responsible_staff_id IS NULL
     AND COALESCE(array_length(NEW.staff_keys, 1), 0) >= 1 THEN
    SELECT id INTO resolved_id
      FROM portal_staff
     WHERE staff_key = NEW.staff_keys[1]
       AND active = TRUE
     LIMIT 1;
    IF resolved_id IS NOT NULL THEN
      NEW.responsible_staff_id := resolved_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shift_event_autoresolve_responsible_trg ON shift_event;
CREATE TRIGGER shift_event_autoresolve_responsible_trg
  BEFORE INSERT OR UPDATE OF staff_keys ON shift_event
  FOR EACH ROW EXECUTE FUNCTION shift_event_autoresolve_responsible();

GRANT SELECT, INSERT, UPDATE, DELETE ON shift_event TO aidacamp_app;

COMMIT;
