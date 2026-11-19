-- The client portal: a private link (and optional PIN) the business owner uses to update their own site.
-- Changes go into a draft copy of the live version; Publish makes it live and keeps the one before for Undo.
CREATE TABLE portal (
  slug       TEXT PRIMARY KEY,
  token      TEXT NOT NULL UNIQUE,     -- the private link: /p/<token>
  pin_hash   TEXT,                     -- PBKDF2 of the 6-digit PIN (NULL: link only)
  draft      TEXT,                     -- the version being edited (a copy of the live one), if any
  prev       TEXT,                     -- the version that was live before the last Publish (for Undo)
  created_at TEXT NOT NULL,
  revoked    INTEGER NOT NULL DEFAULT 0
);
-- What the owner did and asked for, for them and for the rep.
CREATE TABLE portal_log (
  id     INTEGER PRIMARY KEY AUTOINCREMENT,
  slug   TEXT NOT NULL,
  at     TEXT NOT NULL,
  what   TEXT NOT NULL,                -- "details", "photos", "logo", "reviews", "edit", "publish", "undo", "discard"
  detail TEXT NOT NULL DEFAULT ''
);
CREATE INDEX portal_log_slug ON portal_log (slug, at);
