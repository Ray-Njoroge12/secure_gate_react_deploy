-- Migration 066: Add missing visitor columns
-- Adds columns used by visitorInviteController.createVisitor
-- Created: 2026-02-10

-- Encryption timestamp for ID number
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS id_number_encrypted_at TIMESTAMP WITHOUT TIME ZONE;

-- Residence location sharing feature
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS allow_residence_location BOOLEAN DEFAULT FALSE;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS unit_pin_encrypted TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS unit_pin_encrypted_at TIMESTAMP WITHOUT TIME ZONE;
