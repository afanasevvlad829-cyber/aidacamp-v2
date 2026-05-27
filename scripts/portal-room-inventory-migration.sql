-- Портал Ф5-2: инвентаризация комнат 3-го корпуса.
-- Идемпотентно.

-- Статус инвентаризации по комнате
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='room_inventory_status_enum') THEN
    CREATE TYPE room_inventory_status_enum AS ENUM ('pending','ok','defects');
  END IF;
END $$;

-- Одна запись на (shift_id, room_number) — состояние и привязки.
CREATE TABLE IF NOT EXISTS room_inventory (
  id BIGSERIAL PRIMARY KEY,
  shift_id BIGINT NOT NULL REFERENCES shift(id) ON DELETE CASCADE,
  room_number INT NOT NULL,
  status room_inventory_status_enum NOT NULL DEFAULT 'pending',
  inspected_by BIGINT,                              -- telegram_id вожатого/админа
  inspected_at TIMESTAMPTZ,
  walkthrough_photo_id BIGINT REFERENCES archive_photo(id) ON DELETE SET NULL,
  notes TEXT,
  UNIQUE (shift_id, room_number)
);

-- Отметки 6 пунктов чек-листа (по комнате).
CREATE TABLE IF NOT EXISTS room_inventory_check (
  id BIGSERIAL PRIMARY KEY,
  room_inventory_id BIGINT NOT NULL REFERENCES room_inventory(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,         -- 'overview' | 'plumbing' | 'electric' | 'beds' | 'walls' | 'video'
  done BOOLEAN NOT NULL DEFAULT FALSE,
  comment TEXT,
  done_at TIMESTAMPTZ,
  UNIQUE (room_inventory_id, item_id)
);

CREATE INDEX IF NOT EXISTS room_inventory_shift_idx ON room_inventory(shift_id);

GRANT SELECT,INSERT,UPDATE,DELETE ON room_inventory, room_inventory_check TO aidacamp_app;
GRANT USAGE,SELECT ON SEQUENCE room_inventory_id_seq, room_inventory_check_id_seq TO aidacamp_app;
