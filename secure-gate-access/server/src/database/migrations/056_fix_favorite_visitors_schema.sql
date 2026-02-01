-- Migration: Fix Favorite Visitors Schema
-- Created: 2026-01-27
-- Description: Adds missing columns visitor_id and nickname to favorite_visitors table to align with backend code

-- Up migration
DO $$ 
BEGIN
    -- Add visitor_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'favorite_visitors' AND column_name = 'visitor_id') THEN
        ALTER TABLE favorite_visitors ADD COLUMN visitor_id INT REFERENCES visitors(id) ON DELETE CASCADE;
    END IF;

    -- Add nickname column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'favorite_visitors' AND column_name = 'nickname') THEN
        ALTER TABLE favorite_visitors ADD COLUMN nickname VARCHAR(100);
    END IF;

    -- Make name, phone, email nullable as they are now redundant/fallback
    ALTER TABLE favorite_visitors ALTER COLUMN name DROP NOT NULL;
    
    -- Create unique constraint for resident_id + visitor_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'favorite_visitors_resident_id_visitor_id_key' 
        AND conrelid = 'favorite_visitors'::regclass
    ) THEN
        ALTER TABLE favorite_visitors ADD CONSTRAINT favorite_visitors_resident_id_visitor_id_key UNIQUE (resident_id, visitor_id);
    END IF;

END $$;

-- Down migration (rollback)
-- Note: We don't drop columns in rollback usually to prevent data loss, 
-- but strictly speaking a down migration would revert these changes.
-- For safety in this context, we will leave the columns but drop the constraint.

-- ALTER TABLE favorite_visitors DROP CONSTRAINT IF EXISTS favorite_visitors_resident_id_visitor_id_key;
