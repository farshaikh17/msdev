-- Where each demo stands as a sales lead (new, sent, replied, won, lost), and every change to it.
ALTER TABLE demos ADD COLUMN lead_status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE demos ADD COLUMN lead_at TEXT;
CREATE TABLE lead_log (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  slug       TEXT NOT NULL,
  tenant_id  INTEGER NOT NULL,
  status     TEXT NOT NULL,
  reason     TEXT NOT NULL DEFAULT '',  -- why it was lost (one of the listed reasons)
  note       TEXT NOT NULL DEFAULT '',  -- anything they said, in their words
  user_id    INTEGER,                   -- who changed it (null: through the API)
  created_at TEXT NOT NULL
);
CREATE INDEX lead_log_slug ON lead_log (slug, created_at);
CREATE INDEX lead_log_tenant ON lead_log (tenant_id, created_at);
