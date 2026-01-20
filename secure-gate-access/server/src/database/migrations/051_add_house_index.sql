-- Migration: Add house number index for efficient walk-in lookups
-- File: 051_add_house_index.sql
-- Description: Improves walk-in registration by enabling fast exact-match lookup by house number

-- Create index for house number lookups within an estate
-- This is used by the walk-in registration feature when guards look up residents by house number
CREATE INDEX IF NOT EXISTS idx_users_house_estate 
ON users(house, estate_id) 
WHERE role = 'resident';

-- Add a comment to document the index purpose
COMMENT ON INDEX idx_users_house_estate IS 'Supports fast house number lookups for walk-in visitor registration';
