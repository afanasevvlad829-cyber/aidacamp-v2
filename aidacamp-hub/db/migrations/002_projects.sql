-- Phase 2.1: Projects
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(50) PRIMARY KEY,
  slug VARCHAR(100) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS project_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL REFERENCES projects(id),
  config_key VARCHAR(255) NOT NULL,
  config_value TEXT,
  is_secret BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, config_key)
);

CREATE INDEX IF NOT EXISTS idx_project_slug ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_config_project ON project_config(project_id);
