-- Метрики Яндекс.Метрика
CREATE TABLE IF NOT EXISTS metrics_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL REFERENCES projects(id),
  metric_date DATE NOT NULL,
  goal_id VARCHAR(50),
  goal_name VARCHAR(255),
  goal_type VARCHAR(50),
  visits INT DEFAULT 0,
  conversions INT DEFAULT 0,
  conversion_rate DECIMAL(10, 2) DEFAULT 0,
  revenue DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, metric_date, goal_id)
);

CREATE INDEX idx_metrics_project_date ON metrics_stats(project_id, metric_date);
CREATE INDEX idx_metrics_goal ON metrics_stats(goal_id);

-- Метрики Яндекс.Директ
CREATE TABLE IF NOT EXISTS direct_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL REFERENCES projects(id),
  campaign_id VARCHAR(50),
  campaign_name VARCHAR(255),
  stat_date DATE NOT NULL,
  clicks INT DEFAULT 0,
  impressions INT DEFAULT 0,
  spent DECIMAL(15, 2) DEFAULT 0,
  conversions INT DEFAULT 0,
  conversion_value DECIMAL(15, 2) DEFAULT 0,
  ctr DECIMAL(10, 2) DEFAULT 0,
  cpc DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, campaign_id, stat_date)
);

CREATE INDEX idx_direct_project_date ON direct_stats(project_id, stat_date);
CREATE INDEX idx_direct_campaign ON direct_stats(campaign_id);

-- Метрики VK Ads
CREATE TABLE IF NOT EXISTS vk_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL REFERENCES projects(id),
  campaign_id VARCHAR(50),
  campaign_name VARCHAR(255),
  stat_date DATE NOT NULL,
  shows INT DEFAULT 0,
  clicks INT DEFAULT 0,
  spent DECIMAL(15, 2) DEFAULT 0,
  cpm DECIMAL(10, 2) DEFAULT 0,
  goals INT DEFAULT 0,
  cr DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, campaign_id, stat_date)
);

CREATE INDEX idx_vk_project_date ON vk_stats(project_id, stat_date);
CREATE INDEX idx_vk_campaign ON vk_stats(campaign_id);

-- Метрики AlfaCRM
CREATE TABLE IF NOT EXISTS crm_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL REFERENCES projects(id),
  client_id VARCHAR(50),
  client_name VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  status VARCHAR(50),
  created_date DATE,
  last_contact DATE,
  deal_count INT DEFAULT 0,
  total_revenue DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, client_id)
);

CREATE INDEX idx_crm_project ON crm_clients(project_id);
CREATE INDEX idx_crm_client_id ON crm_clients(client_id);
