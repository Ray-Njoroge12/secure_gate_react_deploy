-- Data Migration: Encrypt existing ID numbers
-- This is a simple check to see if there are any ID numbers to encrypt

DO $$
DECLARE
    visitor_record RECORD;
    total_count INTEGER;
    processed_count INTEGER := 0;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visitors' AND column_name = 'id_number') THEN
        RAISE NOTICE 'No id_number column found; skipping encryption status check.';
        RETURN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'visitors' AND column_name = 'id_number_encrypted') THEN
        RAISE NOTICE 'No id_number_encrypted column found; skipping encryption status check.';
        RETURN;
    END IF;

    -- Count records to migrate
    SELECT COUNT(*) INTO total_count
    FROM visitors
    WHERE id_number IS NOT NULL 
    AND id_number != '' 
    AND id_number_encrypted IS NULL;
    
    RAISE NOTICE 'Found % ID numbers to encrypt', total_count;
    
    IF total_count = 0 THEN
        RAISE NOTICE 'No ID numbers need encryption. Migration complete!';
        RETURN;
    END IF;
    
    RAISE NOTICE '⚠️  Manual encryption required:';
    RAISE NOTICE 'Run: node scripts/migrate-id-numbers.js';
    RAISE NOTICE 'This will encrypt % ID numbers using the encryption service', total_count;
    
END $$;
