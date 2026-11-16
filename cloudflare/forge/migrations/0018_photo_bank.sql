-- Photos made ahead of time for each trade, from the day's free picture allowance that would otherwise go
-- unused. A build takes from here when that day's pictures run out, so a site never ships without photos.
CREATE TABLE photo_bank (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  trade       TEXT NOT NULL,         -- the trade, lower case ("plumbing", "frozen yogurt")
  description TEXT NOT NULL,         -- what it shows (its alt text); never names a town
  data        BLOB NOT NULL,         -- JPEG bytes
  used        INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);
CREATE INDEX photo_bank_by_trade ON photo_bank (trade, used);
