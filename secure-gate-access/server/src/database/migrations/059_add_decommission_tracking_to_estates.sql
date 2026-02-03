-- Migration: Add decommission tracking columns to estates table
-- Purpose: Track when, who, and why an estate was decommissioned for audit trail

-- Add decommissioned_at timestamp
ALTER TABLE estates ADD COLUMN IF NOT EXISTS decommissioned_at TIMESTAMP;

-- Add decommissioned_by user reference
ALTER TABLE estates ADD COLUMN IF NOT EXISTS decommissioned_by INTEGER REFERENCES users(id);

-- Add decommission_reason for audit trail
ALTER TABLE estates ADD COLUMN IF NOT EXISTS decommission_reason TEXT;

-- Create index for finding decommissioned estates
CREATE INDEX IF NOT EXISTS idx_estates_decommissioned_at ON estates(decommissioned_at) WHERE decommissioned_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN estates.decommissioned_at IS 'Timestamp when the estate was decommissioned';
COMMENT ON COLUMN estates.decommissioned_by IS 'User ID of the super admin who decommissioned the estate';
COMMENT ON COLUMN estates.decommission_reason IS 'Reason provided for decommissioning the estate';
