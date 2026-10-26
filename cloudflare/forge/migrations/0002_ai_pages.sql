-- AI-designed pages: Claude writes the whole page in the background (Cloudflare Queue).
ALTER TABLE demos ADD COLUMN html TEXT;                                   -- the finished page; NULL = use the built-in template
ALTER TABLE demos ADD COLUMN build_status TEXT NOT NULL DEFAULT 'ready';  -- 'building', 'ready' or 'failed'
ALTER TABLE demos ADD COLUMN build_error TEXT;
ALTER TABLE demos ADD COLUMN build_usage TEXT;                            -- JSON: tokens used, for cost tracking
