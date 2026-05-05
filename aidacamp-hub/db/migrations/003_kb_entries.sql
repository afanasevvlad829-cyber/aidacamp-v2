-- Убедиться что pgvector установлен
CREATE EXTENSION IF NOT EXISTS vector;

-- Phase 2.2: Knowledge Base с векторными эмбеддингами
CREATE TABLE IF NOT EXISTS kb_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL REFERENCES projects(id),
  file_path TEXT,
  title VARCHAR(500) NOT NULL,
  kb_type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[],
  status VARCHAR(50) DEFAULT 'active',
  priority VARCHAR(20) DEFAULT 'medium',
  embedding vector(1536),
  created_date TIMESTAMP,
  updated_date TIMESTAMP,
  resolved_date TIMESTAMP,
  linked_entries UUID[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_kb_project ON kb_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_kb_type ON kb_entries(kb_type);
CREATE INDEX IF NOT EXISTS idx_kb_status ON kb_entries(status);
CREATE INDEX IF NOT EXISTS idx_kb_title ON kb_entries USING gin(to_tsvector('russian', title));

-- Векторный индекс для семантического поиска (IVFFlat индекс для быстроты)
CREATE INDEX IF NOT EXISTS idx_kb_embedding ON kb_entries 
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
