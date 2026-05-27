-- Портал Фаза 5a: разрешить заранее заводить сотрудников без telegram_id
-- (placeholder-записи: имя+роль+staff_key; telegram_id подвяжется при первом входе через TG).
-- Идемпотентно.

ALTER TABLE portal_staff ALTER COLUMN telegram_id DROP NOT NULL;

-- Существующая команда смены 30 мая - 8 июня 2026.
-- Идемпотентно: если staff_key уже есть — обновляем имя/роль/active, telegram_id не трогаем.
-- (partial unique index portal_staff_staff_key_idx даёт нам уникальность по staff_key.)
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('Варвара',          'rukovoditel', 'director'),
      ('Александр Ташкин', 'teacher',     'teacher_1'),
      ('Омар',             'teacher',     'teacher_2'),
      ('Вожатый 1',        'vozhaty',     'counselor_1'),
      ('Вожатый 2',        'vozhaty',     'counselor_2')
    ) AS t(full_name, role, staff_key)
  LOOP
    IF EXISTS (SELECT 1 FROM portal_staff WHERE staff_key = rec.staff_key) THEN
      UPDATE portal_staff
         SET full_name = COALESCE(NULLIF(rec.full_name,''), full_name),
             role      = rec.role,
             active    = TRUE
       WHERE staff_key = rec.staff_key;
    ELSE
      INSERT INTO portal_staff(full_name, role, active, staff_key)
      VALUES (rec.full_name, rec.role, TRUE, rec.staff_key);
    END IF;
  END LOOP;
END $$;
