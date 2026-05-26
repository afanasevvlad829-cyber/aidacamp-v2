-- Портал Ф5-5: множественные роли у сотрудника.
-- Один человек может быть, например, Руководителем + Вожатым.
-- Идемпотентно.

ALTER TABLE portal_staff ADD COLUMN IF NOT EXISTS roles TEXT[] NOT NULL DEFAULT '{}';

-- Backfill: если roles пустой и есть role — кладём в массив.
UPDATE portal_staff
   SET roles = ARRAY[role]
 WHERE role IS NOT NULL AND (roles IS NULL OR cardinality(roles) = 0);

-- Поле role остаётся как «текущая активная роль» (для совместимости с сессией).
