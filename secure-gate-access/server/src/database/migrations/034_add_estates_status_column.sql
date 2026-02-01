-- Migration: Add status column to estates table for suspend/activate functionality

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'estates' AND column_name = 'status'
  ) THEN
    ALTER TABLE estates ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';
  END IF;
END $$;

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_estates_status ON estates(status);

-- Comment for documentation
COMMENT ON COLUMN estates.status IS 'Estate lifecycle status: active, suspended, decommissioned';
