-- Seed projects
INSERT INTO projects (id, slug, name, description, status)
VALUES
  ('aidacamp', 'aidacamp', 'AidaCamp', 'Летний IT лагерь для детей', 'active'),
  ('codims', 'codims', 'CoDims', 'Платформа онлайн образования', 'active')
ON CONFLICT (id) DO NOTHING;

-- Добавить project_config для aidacamp
INSERT INTO project_config (project_id, config_key, config_value, is_secret)
VALUES
  ('aidacamp', 'metrica_id', 'METRICA_AIDACAMP_ID', FALSE),
  ('aidacamp', 'direct_client_login', 'DIRECT_LOGIN', TRUE),
  ('aidacamp', 'vk_account_id', 'VK_ACCOUNT_ID', FALSE),
  ('aidacamp', 'crm_branch_id', 'CRM_BRANCH_ID', FALSE),
  ('codims', 'metrica_id', 'METRICA_CODIMS_ID', FALSE),
  ('codims', 'direct_client_login', 'DIRECT_LOGIN_CODIMS', TRUE),
  ('codims', 'vk_account_id', 'VK_ACCOUNT_ID_CODIMS', FALSE)
ON CONFLICT DO NOTHING;
