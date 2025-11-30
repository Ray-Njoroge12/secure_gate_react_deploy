-- Migration: Add Favorite Visitors Table
-- Description: Allows residents to save frequently visiting guests for quick invites
-- Version: 1.0.0
-- Date: 2025-11-26

-- Create favorite_visitors table
CREATE TABLE IF NOT EXISTS favorite_visitors (
    id SERIAL PRIMARY KEY,
    resident_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    visitor_name VARCHAR(255) NOT NULL,
    visitor_phone VARCHAR(20),
    visitor_email VARCHAR(255),
    relationship VARCHAR(100) DEFAULT 'Guest',
    notes TEXT,
    visit_count INTEGER DEFAULT 0,
    last_visit TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique visitor per resident (by phone or email)
    CONSTRAINT unique_favorite_phone UNIQUE (resident_id, visitor_phone),
    CONSTRAINT unique_favorite_email UNIQUE (resident_id, visitor_email)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_favorite_visitors_resident_id ON favorite_visitors(resident_id);
CREATE INDEX IF NOT EXISTS idx_favorite_visitors_phone ON favorite_visitors(visitor_phone);
CREATE INDEX IF NOT EXISTS idx_favorite_visitors_email ON favorite_visitors(visitor_email);
CREATE INDEX IF NOT EXISTS idx_favorite_visitors_visit_count ON favorite_visitors(visit_count DESC);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_favorite_visitors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_favorite_visitors_updated_at ON favorite_visitors;
CREATE TRIGGER trigger_favorite_visitors_updated_at
    BEFORE UPDATE ON favorite_visitors
    FOR EACH ROW
    EXECUTE FUNCTION update_favorite_visitors_updated_at();

-- Add comments for documentation
COMMENT ON TABLE favorite_visitors IS 'Stores residents'' frequently visiting guests for quick invite access';
COMMENT ON COLUMN favorite_visitors.relationship IS 'Relationship type: Family, Friend, Colleague, Service Provider, Guest, etc.';
COMMENT ON COLUMN favorite_visitors.visit_count IS 'Number of times this visitor has been invited/visited';
COMMENT ON COLUMN favorite_visitors.last_visit IS 'Timestamp of the last visit by this visitor';

-- Grant necessary permissions
-- GRANT SELECT, INSERT, UPDATE, DELETE ON favorite_visitors TO app_user;
-- GRANT USAGE, SELECT ON SEQUENCE favorite_visitors_id_seq TO app_user;

COMMIT;
