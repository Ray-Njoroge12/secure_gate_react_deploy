-- Migration 065: Add estates decommission columns
-- Adds columns used by superAdminController.deleteEstate
-- Created: 2026-02-10

ALTER TABLE estates ADD COLUMN IF NOT EXISTS decommissioned_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE estates ADD COLUMN IF NOT EXISTS decommissioned_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE estates ADD COLUMN IF NOT EXISTS decommission_reason TEXT;
