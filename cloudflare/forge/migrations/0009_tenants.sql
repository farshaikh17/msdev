-- Reseller layer: every demo belongs to a customer account (a "tenant"). Everything that exists
-- today moves under tenant 1, Mianro Systems, which builds without using credits.
CREATE TABLE tenants (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL DEFAULT 'active',      -- active | suspended (sites go dark, no sign-in)
  unlimited     INTEGER NOT NULL DEFAULT 0,          -- 1: builds don't use credits (Mianro itself)
  credits       INTEGER NOT NULL DEFAULT 0,          -- full-site builds this account can still start
  credit_mode   TEXT NOT NULL DEFAULT 'mianro',      -- footer credit on its sites: mianro | custom | none (set by Mianro only)
  credit_name   TEXT NOT NULL DEFAULT '',
  credit_url    TEXT NOT NULL DEFAULT '',
  ghl_page_url  TEXT NOT NULL DEFAULT '',
  chat_widget   TEXT NOT NULL DEFAULT '',            -- GoHighLevel widget ID for its sites; '' none (Mianro: the Mianro widget); 'off'
  webhook_url   TEXT NOT NULL DEFAULT '',
  webhook_secret TEXT NOT NULL DEFAULT '',
  webhook_status TEXT NOT NULL DEFAULT '',           -- result of the last delivery
  created_at    TEXT NOT NULL
);

CREATE TABLE users (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id   INTEGER NOT NULL,
  email       TEXT NOT NULL UNIQUE,                  -- lower case
  pw_hash     TEXT NOT NULL,
  pw_version  INTEGER NOT NULL DEFAULT 1,            -- bumped on password change: signs the user out everywhere
  role        TEXT NOT NULL,                         -- admin (Mianro staff) | owner | member
  status      TEXT NOT NULL DEFAULT 'active',        -- active | removed
  created_at  TEXT NOT NULL,
  last_login  TEXT
);
CREATE INDEX users_by_tenant ON users (tenant_id);

-- One-time links: inviting someone to a team, or resetting a password.
CREATE TABLE tokens (
  token_hash  TEXT PRIMARY KEY,                      -- SHA-256 of the link's secret
  kind        TEXT NOT NULL,                         -- invite | reset
  tenant_id   INTEGER NOT NULL,
  user_id     INTEGER,                               -- reset: whose password
  email       TEXT NOT NULL DEFAULT '',
  role        TEXT NOT NULL DEFAULT 'member',
  expires_at  INTEGER NOT NULL,
  used_at     INTEGER,
  created_by  INTEGER,
  created_at  TEXT NOT NULL
);

CREATE TABLE api_keys (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id    INTEGER NOT NULL,
  name         TEXT NOT NULL,
  prefix       TEXT NOT NULL,                        -- first characters, to recognise a key in the list
  key_hash     TEXT NOT NULL UNIQUE,                 -- SHA-256; the key itself is shown once
  created_by   INTEGER,
  created_at   TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at   TEXT
);
CREATE INDEX api_keys_by_tenant ON api_keys (tenant_id);

CREATE TABLE credit_ledger (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id  INTEGER NOT NULL,
  delta      INTEGER NOT NULL,
  reason     TEXT NOT NULL,
  demo_slug  TEXT,
  user_id    INTEGER,
  created_at TEXT NOT NULL
);
CREATE INDEX ledger_by_tenant ON credit_ledger (tenant_id, id);

-- What each build really cost Mianro (Claude), kept per tenant even after a redesign replaces the site.
CREATE TABLE build_costs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id  INTEGER NOT NULL,
  slug       TEXT NOT NULL,
  version    TEXT NOT NULL,
  usd        REAL NOT NULL,
  calls      INTEGER NOT NULL,
  outcome    TEXT NOT NULL,                          -- ready | failed
  created_at TEXT NOT NULL,
  UNIQUE (slug, version, outcome)
);
CREATE INDEX costs_by_tenant ON build_costs (tenant_id, created_at);

ALTER TABLE demos ADD COLUMN tenant_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE demos ADD COLUMN charged_version TEXT;     -- the build version a credit was taken for (for refunds)
CREATE INDEX demos_by_tenant ON demos (tenant_id, status, created_at);

ALTER TABLE video_library ADD COLUMN tenant_id INTEGER;  -- NULL: the shared library every account's demos can use

INSERT INTO tenants (id, name, slug, unlimited, ghl_page_url, chat_widget, created_at)
VALUES (1, 'Mianro Systems', 'mianro', 1,
        COALESCE((SELECT value FROM settings WHERE key = 'ghlPageUrl'), ''),
        COALESCE((SELECT value FROM settings WHERE key = 'chatWidget'), ''),
        strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
