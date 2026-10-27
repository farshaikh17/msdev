-- AI-generated preview photos, kept with the site version they were made for.
CREATE TABLE site_images (
  slug        TEXT NOT NULL,
  version     TEXT NOT NULL,
  name        TEXT NOT NULL,         -- "photo-1.jpg"
  description TEXT NOT NULL,
  data        BLOB NOT NULL,         -- JPEG bytes
  PRIMARY KEY (slug, version, name)
);
