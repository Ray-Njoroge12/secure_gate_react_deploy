-- Migration: Add Incident Statuses
-- Created: 2026-02-12
-- Description: Adds 'escalated' and 'cancelled' to the incident status check constraint
-- Note: In PostgreSQL, we can't easily modify a CHECK constraint without dropping it
-- or adding a new one. Here we drop the old one and add the new one.
DO $$ BEGIN -- Drop the existing constraint if it exists (064 migration name pattern)
-- If it doesn't have a name, we'd need to find it by type, but usually it's incidents_status_check
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_status_check;
-- Add the updated constraint
ALTER TABLE incidents
ADD CONSTRAINT incidents_status_check CHECK (
        status IN (
            'open',
            'under_review',
            'investigating',
            'in_progress',
            'resolved',
            'closed',
            'escalated',
            'cancelled'
        )
    );
END $$;