-- Migration: Add first_name and last_name to users table
-- Description: Enhances user model for better personalization

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100), 
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Backfill logic for EXISTING users
-- Splits username by the first space. 
-- If no space, first_name = username, last_name = 'Unknown'
UPDATE users 
SET 
  first_name = COALESCE(NULLIF(split_part(username, ' ', 1), ''), username),
  last_name = COALESCE(NULLIF(substring(username from length(split_part(username, ' ', 1)) + 2), ''), 'Unknown')
WHERE first_name IS NULL;
