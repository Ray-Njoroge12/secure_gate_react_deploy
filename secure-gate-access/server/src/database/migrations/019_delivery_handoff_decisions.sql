-- Migration: Delivery handoff decision fields
-- Created: 2025-12-20
-- Description: Adds resident decision workflow fields to deliveries

-- Up migration
ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS handoff_preference VARCHAR(30);

ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS handoff_decided_at TIMESTAMP;

ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS handoff_decided_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deliveries_handoff_preference ON deliveries(handoff_preference);
CREATE INDEX IF NOT EXISTS idx_deliveries_handoff_decided_by ON deliveries(handoff_decided_by);

-- Down migration (rollback)
-- To rollback: DROP INDEX IF EXISTS idx_deliveries_handoff_decided_by; DROP INDEX IF EXISTS idx_deliveries_handoff_preference; ALTER TABLE deliveries DROP COLUMN IF EXISTS handoff_decided_by; ALTER TABLE deliveries DROP COLUMN IF EXISTS handoff_decided_at; ALTER TABLE deliveries DROP COLUMN IF EXISTS handoff_preference;
