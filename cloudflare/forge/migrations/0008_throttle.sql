-- Attempt counters for rate limiting (wrong passwords per address, form posts per address).
CREATE TABLE throttle (
  key      TEXT PRIMARY KEY,   -- "login:<ip>", "lead:<ip>"
  count    INTEGER NOT NULL,
  reset_at INTEGER NOT NULL    -- ms since the epoch: the count starts over after this
);
