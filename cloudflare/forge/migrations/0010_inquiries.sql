-- Messages from the public website: contact, "show me a sample", and reseller applications.
CREATE TABLE inquiries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  kind       TEXT NOT NULL,                 -- contact | sample | reseller
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT NOT NULL DEFAULT '',
  company    TEXT NOT NULL DEFAULT '',
  website    TEXT NOT NULL DEFAULT '',
  message    TEXT NOT NULL DEFAULT '',
  extra      TEXT NOT NULL DEFAULT '{}',    -- JSON: expected volume, how they will use it
  status     TEXT NOT NULL DEFAULT 'new',   -- new | talking | won | closed
  created_at TEXT NOT NULL
);
CREATE INDEX inquiries_status ON inquiries (status, id DESC);
