CREATE TABLE IF NOT EXISTS card_clicks (
  site_id TEXT PRIMARY KEY,
  clicks INTEGER NOT NULL DEFAULT 0 CHECK (clicks >= 0),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS click_rate_limits (
  rate_key TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1 CHECK (attempts >= 1),
  PRIMARY KEY (rate_key, window_start)
);

CREATE INDEX IF NOT EXISTS click_rate_limits_window_idx
  ON click_rate_limits (window_start);
