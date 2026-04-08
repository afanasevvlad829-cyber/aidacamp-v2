CREATE TABLE IF NOT EXISTS ab_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_ts TEXT NOT NULL,
  event_name TEXT NOT NULL,
  test_id TEXT NOT NULL,
  variant TEXT NOT NULL,
  session_id TEXT,
  visitor_id TEXT,
  page_path TEXT,
  page_url TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  device_type TEXT,
  country TEXT,
  colo TEXT,
  user_agent TEXT,
  payload_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ab_events_ts ON ab_events(event_ts);
CREATE INDEX IF NOT EXISTS idx_ab_events_test_variant ON ab_events(test_id, variant);
CREATE INDEX IF NOT EXISTS idx_ab_events_event_name ON ab_events(event_name);
CREATE INDEX IF NOT EXISTS idx_ab_events_campaign ON ab_events(utm_campaign);
