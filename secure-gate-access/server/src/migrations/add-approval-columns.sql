-- Phase 3: Add visitor approval columns
-- Migration: add-approval-columns.sql
-- Created: Nov 20, 2025
-- Purpose: Support walk-in visitor approval flow (replace phone calls with digital approvals)

-- Add approval tracking columns to visitors table
ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejected_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS approval_requested_by INTEGER REFERENCES users(id), -- Guard who requested
  ADD COLUMN IF NOT EXISTS approval_requested_at TIMESTAMP;

-- Create index for pending approvals query (resident-specific)
CREATE INDEX IF NOT EXISTS idx_visitors_pending_approval 
  ON visitors(resident_id, status) 
  WHERE status = 'pending_approval';

-- Create index for approval history queries
CREATE INDEX IF NOT EXISTS idx_visitors_approved_by 
  ON visitors(approved_by) 
  WHERE approved_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_visitors_rejected_by 
  ON visitors(rejected_by) 
  WHERE rejected_by IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN visitors.approved_by IS 'Resident who approved the visitor (walk-in approval flow)';
COMMENT ON COLUMN visitors.approved_at IS 'Timestamp when visitor was approved';
COMMENT ON COLUMN visitors.rejected_by IS 'Resident who rejected the visitor';
COMMENT ON COLUMN visitors.rejected_at IS 'Timestamp when visitor was rejected';
COMMENT ON COLUMN visitors.rejection_reason IS 'Optional reason for rejection';
COMMENT ON COLUMN visitors.approval_requested_by IS 'Guard who requested approval';
COMMENT ON COLUMN visitors.approval_requested_at IS 'Timestamp when approval was requested';
