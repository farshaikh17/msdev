-- A won site on the business's own web address. One address per site; the sites Worker serves it at the root.
CREATE TABLE domains (
  host        TEXT PRIMARY KEY,          -- lower case, e.g. www.oharaplumbing.com
  slug        TEXT NOT NULL UNIQUE,
  tenant_id   INTEGER NOT NULL,
  created_at  TEXT NOT NULL,
  dns_ok      INTEGER NOT NULL DEFAULT 0, -- the CNAME record points at us (last check)
  ssl         TEXT NOT NULL DEFAULT '',   -- Cloudflare's certificate status, when Forge registers the address itself
  cf_id       TEXT NOT NULL DEFAULT '',   -- Cloudflare's id for the custom hostname
  checked_at  TEXT
);
