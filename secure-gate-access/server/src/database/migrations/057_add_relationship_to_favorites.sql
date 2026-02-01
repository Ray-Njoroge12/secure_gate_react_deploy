-- Migration: Add Relationship to Favorite Visitors
-- Created: 2026-01-27
-- Description: Adds relationship column to favorite_visitors table

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'favorite_visitors' AND column_name = 'relationship') THEN
        ALTER TABLE favorite_visitors ADD COLUMN relationship VARCHAR(50) DEFAULT 'Guest';
    END IF;
END $$;
