-- Studio builds cost more than one credit: remember how many were taken, so a refund gives back the same.
ALTER TABLE demos ADD COLUMN charged_credits INTEGER NOT NULL DEFAULT 1;
