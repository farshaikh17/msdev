-- A demo's link stops working after this (30 days from when it was built). A won site never expires.
ALTER TABLE demos ADD COLUMN expires_at TEXT;
-- Demos that exist today get a full 30 days from now, so none stops working the day this ships.
UPDATE demos SET expires_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+30 days');
