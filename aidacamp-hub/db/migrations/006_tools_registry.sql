-- Реестр инструментов
CREATE TABLE IF NOT EXISTS tools_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) REFERENCES projects(id),
  tool_name VARCHAR(100) NOT NULL,
  tool_type VARCHAR(50),
  api_endpoint VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  last_used TIMESTAMP,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, tool_name)
);

CREATE TABLE IF NOT EXISTS tool_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_id UUID REFERENCES tools_registry(id),
  counter_key VARCHAR(255),
  counter_value VARCHAR(255),
  counter_count INT DEFAULT 1,
  last_sync TIMESTAMP DEFAULT NOW(),
  UNIQUE(tool_id, counter_key, counter_value)
);

CREATE INDEX idx_tool_project ON tools_registry(project_id);
CREATE INDEX idx_tool_active ON tools_registry(is_active);
CREATE INDEX idx_counter_tool ON tool_counters(tool_id);
