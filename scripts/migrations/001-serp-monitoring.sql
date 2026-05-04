-- SERP CTR Monitoring System
-- Migration: Create tables for monitoring, A/B tests, and alerts
-- Date: 2026-05-04

-- 1. monitoring_snapshots — daily metrics snapshots
CREATE TABLE IF NOT EXISTS monitoring_snapshots (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  metric_type VARCHAR(50) NOT NULL,  -- 'ctr', 'conversions', 'bounce_rate', 'position', 'organic_traffic'
  metric_value FLOAT,
  keyword VARCHAR(255),              -- for position metric
  source VARCHAR(100),               -- 'yandex_webmaster', 'metrika', 'clarity'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_date ON monitoring_snapshots(date);
CREATE INDEX IF NOT EXISTS idx_monitoring_metric ON monitoring_snapshots(metric_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_keyword ON monitoring_snapshots(keyword);

-- 2. ab_test_results — statistical analysis results
CREATE TABLE IF NOT EXISTS ab_test_results (
  id SERIAL PRIMARY KEY,
  test_date DATE NOT NULL,

  -- Baseline period (7 days before optimization)
  baseline_start DATE,
  baseline_end DATE,
  baseline_ctr FLOAT,
  baseline_conversions INT,
  baseline_bounce_rate FLOAT,
  baseline_avg_position FLOAT,
  baseline_organic_traffic INT,

  -- Test period (1 day after optimization)
  test_start DATE,
  test_end DATE,
  test_value_ctr FLOAT,
  test_value_conversions INT,
  test_value_bounce_rate FLOAT,
  test_value_avg_position FLOAT,
  test_value_organic_traffic INT,

  -- Statistical metrics
  ctr_change_pct FLOAT,              -- % change
  ctr_p_value FLOAT,                 -- p-value from t-test
  conversions_p_value FLOAT,
  bounce_p_value FLOAT,

  -- Conclusions
  is_significant BOOLEAN,            -- at least one p < 0.05?
  alert_level VARCHAR(20),           -- 'ok', 'warning', 'critical'
  summary_message TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_test_date ON ab_test_results(test_date);
CREATE INDEX IF NOT EXISTS idx_ab_test_level ON ab_test_results(alert_level);

-- 3. alerts — all alerts with notification status
CREATE TABLE IF NOT EXISTS alerts (
  id SERIAL PRIMARY KEY,
  alert_date TIMESTAMP DEFAULT NOW(),

  -- What changed
  metric VARCHAR(50) NOT NULL,       -- 'ctr', 'conversions', 'bounce_rate', 'position'
  old_value FLOAT,
  new_value FLOAT,
  change_pct FLOAT,
  p_value FLOAT,                     -- from statistical test

  -- Alert severity
  alert_level VARCHAR(20) NOT NULL,  -- 'warning' or 'critical'
  message TEXT NOT NULL,

  -- Action taken
  action_taken VARCHAR(100),         -- null / 'auto_revert_triggered' / 'auto_revert_executed'
  action_timestamp TIMESTAMP,
  action_log TEXT,

  -- Telegram notification
  telegram_sent BOOLEAN DEFAULT FALSE,
  telegram_message_id INT,
  telegram_sent_at TIMESTAMP,
  telegram_error TEXT,

  -- Metadata
  commit_hash VARCHAR(40),           -- git commit that triggered this alert
  pr_number INT,                     -- PR #209 for SERP optimization

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_level ON alerts(alert_level);
CREATE INDEX IF NOT EXISTS idx_alerts_sent ON alerts(telegram_sent);
CREATE INDEX IF NOT EXISTS idx_alerts_action ON alerts(action_taken);
CREATE INDEX IF NOT EXISTS idx_alerts_date ON alerts(alert_date);

-- 4. revert_history — log of auto-reverts
CREATE TABLE IF NOT EXISTS revert_history (
  id SERIAL PRIMARY KEY,
  revert_timestamp TIMESTAMP DEFAULT NOW(),

  trigger_alert_id INT REFERENCES alerts(id),
  commit_hash VARCHAR(40) NOT NULL,
  pr_number INT,

  revert_command TEXT,
  git_output TEXT,
  deploy_status VARCHAR(20),         -- 'pending', 'success', 'failed'

  metrics_before_revert TEXT,        -- JSON with metrics at time of alert
  metrics_after_revert TEXT,         -- JSON with metrics after revert deployed
  recovery_time_minutes INT,         -- how long until metrics recovered

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revert_timestamp ON revert_history(revert_timestamp);
CREATE INDEX IF NOT EXISTS idx_revert_commit ON revert_history(commit_hash);

-- Grant permissions (if needed)
-- GRANT SELECT, INSERT ON monitoring_snapshots TO aidacamp_app;
-- GRANT SELECT, INSERT ON ab_test_results TO aidacamp_app;
-- GRANT SELECT, INSERT, UPDATE ON alerts TO aidacamp_app;
-- GRANT SELECT, INSERT ON revert_history TO aidacamp_app;

-- Test data (optional — for development)
-- INSERT INTO monitoring_snapshots (date, metric_type, metric_value, source)
-- VALUES (NOW()::date, 'ctr', 4.8, 'yandex_webmaster');

-- Verify tables created
SELECT 'monitoring_snapshots' as table_name, COUNT(*) as rows FROM monitoring_snapshots
UNION ALL
SELECT 'ab_test_results', COUNT(*) FROM ab_test_results
UNION ALL
SELECT 'alerts', COUNT(*) FROM alerts
UNION ALL
SELECT 'revert_history', COUNT(*) FROM revert_history;
