-- Phase 1: Variables Vault
CREATE TABLE IF NOT EXISTS variables_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  value_type VARCHAR(50) DEFAULT 'string',
  visibility VARCHAR(20) DEFAULT 'secret',
  instrument VARCHAR(100),
  project_scope VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',
  last_tested TIMESTAMP,
  test_result TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX idx_var_key ON variables_vault(key);
CREATE INDEX idx_var_instrument ON variables_vault(instrument);
CREATE INDEX idx_var_project ON variables_vault(project_scope);
CREATE INDEX idx_var_status ON variables_vault(status);

-- Логирование изменений
CREATE TABLE IF NOT EXISTS variables_vault_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  var_id UUID REFERENCES variables_vault(id),
  action VARCHAR(50),
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP DEFAULT NOW(),
  changed_by VARCHAR(255)
);

CREATE INDEX idx_audit_var_id ON variables_vault_audit(var_id);
