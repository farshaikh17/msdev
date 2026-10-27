-- Form submissions from demo websites, shown on the demo's page in the team app.
CREATE TABLE leads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL,
  page       TEXT NOT NULL,
  fields     TEXT NOT NULL,   -- JSON: { field name: value }
  created_at TEXT NOT NULL
);
CREATE INDEX leads_by_demo ON leads (slug, created_at);
