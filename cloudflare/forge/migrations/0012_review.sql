-- The automatic review of a built site (screenshots, checks, Claude's critique, the fix), outreach
-- copy, change requests, and who looked at each demo.
ALTER TABLE site_versions ADD COLUMN review TEXT;     -- JSON: see src/review.ts (Review)
ALTER TABLE demos ADD COLUMN outreach TEXT;           -- JSON: { subject, email, sms, call, at }
ALTER TABLE demos ADD COLUMN change_note TEXT;        -- JSON: { path, instruction, status, error, at }

-- Views per demo per day (UTC), and the distinct visitors behind them (kept 60 days).
CREATE TABLE demo_views (
  slug    TEXT NOT NULL,
  day     TEXT NOT NULL,                -- YYYY-MM-DD
  views   INTEGER NOT NULL DEFAULT 0,
  last_at TEXT NOT NULL,
  PRIMARY KEY (slug, day)
);
CREATE TABLE demo_visitors (
  slug    TEXT NOT NULL,
  day     TEXT NOT NULL,
  visitor TEXT NOT NULL,                -- hash of address + browser + day; never the address itself
  PRIMARY KEY (slug, day, visitor)
);
