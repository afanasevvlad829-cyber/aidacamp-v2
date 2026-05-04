-- Логирование синхронизации
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) REFERENCES projects(id),
  tool_name VARCHAR(100) NOT NULL,
  sync_type VARCHAR(50),
  status VARCHAR(50) NOT NULL,
  records_processed INT DEFAULT 0,
  records_inserted INT DEFAULT 0,
  records_updated INT DEFAULT 0,
  error_message TEXT,
  duration_ms INT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX idx_sync_tool ON sync_log(tool_name);
CREATE INDEX idx_sync_project ON sync_log(project_id);
CREATE INDEX idx_sync_started ON sync_log(started_at DESC);
CREATE INDEX idx_sync_status ON sync_log(status);
