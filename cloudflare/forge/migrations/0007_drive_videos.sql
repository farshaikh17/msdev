-- Hero videos synced from the team's Google Drive folder: one library entry per clip, with the
-- trade and keywords worked out from the file name (the team can correct them in Settings).
ALTER TABLE video_library ADD COLUMN drive_id TEXT;     -- NULL for entries added by hand
ALTER TABLE video_library ADD COLUMN file_name TEXT;
CREATE UNIQUE INDEX video_library_drive ON video_library (drive_id) WHERE drive_id IS NOT NULL;
