-- Multi-page sites. Each design build is a version: a shared kit (fonts, CSS,
-- header, footer, script) plus one row per page. A version goes live only when
-- every page is written, so visitors never see a half-built site.
CREATE TABLE site_versions (
  slug       TEXT NOT NULL,
  version    TEXT NOT NULL,
  kit        TEXT NOT NULL,          -- JSON: { theme, accent, fonts, css, header, footer, script, brief }
  usage      TEXT,                   -- Claude's token usage for the kit + home page
  created_at TEXT NOT NULL,
  PRIMARY KEY (slug, version)
);
CREATE TABLE site_pages (
  slug        TEXT NOT NULL,
  version     TEXT NOT NULL,
  path        TEXT NOT NULL,         -- "/", "/services", …
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  css         TEXT NOT NULL,         -- extra CSS for this page only (often empty)
  body        TEXT NOT NULL,         -- the page's <main> element
  usage       TEXT,                  -- Claude's token usage (NULL for the home page: counted with the kit)
  PRIMARY KEY (slug, version, path)
);
ALTER TABLE demos ADD COLUMN live_version TEXT;     -- the version visitors see (NULL: single page in html, or the template)
ALTER TABLE demos ADD COLUMN build_version TEXT;    -- the version being built
ALTER TABLE demos ADD COLUMN build_stage TEXT;      -- 'kit' (design + home page) or 'pages' (the rest)
