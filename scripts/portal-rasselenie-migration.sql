-- Портал: модуль расселения (rasselenie).
-- Идемпотентно.

CREATE TABLE IF NOT EXISTS room_assignment (
  id BIGSERIAL PRIMARY KEY,
  shift_id BIGINT NOT NULL REFERENCES shift(id) ON DELETE CASCADE,
  kid_id TEXT NOT NULL,         -- semantic id (uuid или crm id)
  kid_name TEXT NOT NULL,
  kid_gender TEXT,              -- 'M'|'F'|NULL
  kid_age INT,
  notes TEXT,
  room_number INT,              -- NULL = не расселён; иначе сопоставляется с portalRooms.ts
  bed_index INT,                -- 0-based внутри capacity (NULL если не расселён)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shift_id, kid_id)
);

-- Один ребёнок на одну койку
CREATE UNIQUE INDEX IF NOT EXISTS room_assignment_bed_idx
  ON room_assignment(shift_id, room_number, bed_index)
  WHERE room_number IS NOT NULL AND bed_index IS NOT NULL;

GRANT SELECT,INSERT,UPDATE,DELETE ON room_assignment TO aidacamp_app;
GRANT USAGE,SELECT ON SEQUENCE room_assignment_id_seq TO aidacamp_app;
