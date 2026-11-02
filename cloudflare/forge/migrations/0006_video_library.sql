-- Hero videos the design team made (e.g. in Google Flow), one entry per trade. The clips stay
-- where the team uploaded them (e.g. the GoHighLevel media library); only their links are kept.
CREATE TABLE video_library (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,     -- "HVAC"
  keywords   TEXT NOT NULL,     -- "hvac, air conditioning, heating" (matched against the business's trade, name and services)
  urls       TEXT NOT NULL,     -- one video link per line
  created_at TEXT NOT NULL
);
