-- Migration 091: Add site management columns to estates table
-- Required by SiteManagement frontend component for multi-site/branding support

ALTER TABLE estates ADD COLUMN IF NOT EXISTS code VARCHAR(50);
ALTER TABLE estates ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE estates ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE estates ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#667eea';
ALTER TABLE estates ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(20) DEFAULT '#764ba2';
ALTER TABLE estates ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'basic';

-- Backfill code from slug or id for existing estates
UPDATE estates
SET code = COALESCE(slug, 'ESTATE-' || id)
WHERE code IS NULL;

-- Add unique constraint on code
CREATE UNIQUE INDEX IF NOT EXISTS idx_estates_code ON estates(code);
