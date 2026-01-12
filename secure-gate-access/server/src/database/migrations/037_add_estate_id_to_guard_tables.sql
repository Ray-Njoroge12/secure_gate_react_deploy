-- Migration 037: Add estate_id to guard management tables
-- Align guard tables with tenant scoping and service queries

ALTER TABLE guard_shifts
  ADD COLUMN IF NOT EXISTS estate_id INTEGER;

ALTER TABLE guard_handover_notes
  ADD COLUMN IF NOT EXISTS estate_id INTEGER;

ALTER TABLE guard_performance_metrics
  ADD COLUMN IF NOT EXISTS estate_id INTEGER;

ALTER TABLE guard_equipment_checkout
  ADD COLUMN IF NOT EXISTS estate_id INTEGER;

ALTER TABLE guard_training
  ADD COLUMN IF NOT EXISTS estate_id INTEGER;

-- Backfill estate_id from estate_location_id where available
UPDATE guard_shifts
SET estate_id = estate_location_id
WHERE estate_id IS NULL AND estate_location_id IS NOT NULL;

UPDATE guard_handover_notes
SET estate_id = estate_location_id
WHERE estate_id IS NULL AND estate_location_id IS NOT NULL;

UPDATE guard_performance_metrics
SET estate_id = estate_location_id
WHERE estate_id IS NULL AND estate_location_id IS NOT NULL;

UPDATE guard_equipment_checkout
SET estate_id = estate_location_id
WHERE estate_id IS NULL AND estate_location_id IS NOT NULL;

UPDATE guard_training
SET estate_id = estate_location_id
WHERE estate_id IS NULL AND estate_location_id IS NOT NULL;

-- Add foreign keys to estates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guard_shifts_estate_id_fkey'
  ) THEN
    ALTER TABLE guard_shifts
      ADD CONSTRAINT guard_shifts_estate_id_fkey
      FOREIGN KEY (estate_id) REFERENCES estates(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guard_handover_notes_estate_id_fkey'
  ) THEN
    ALTER TABLE guard_handover_notes
      ADD CONSTRAINT guard_handover_notes_estate_id_fkey
      FOREIGN KEY (estate_id) REFERENCES estates(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guard_performance_metrics_estate_id_fkey'
  ) THEN
    ALTER TABLE guard_performance_metrics
      ADD CONSTRAINT guard_performance_metrics_estate_id_fkey
      FOREIGN KEY (estate_id) REFERENCES estates(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guard_equipment_checkout_estate_id_fkey'
  ) THEN
    ALTER TABLE guard_equipment_checkout
      ADD CONSTRAINT guard_equipment_checkout_estate_id_fkey
      FOREIGN KEY (estate_id) REFERENCES estates(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'guard_training_estate_id_fkey'
  ) THEN
    ALTER TABLE guard_training
      ADD CONSTRAINT guard_training_estate_id_fkey
      FOREIGN KEY (estate_id) REFERENCES estates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes for estate scoping
CREATE INDEX IF NOT EXISTS idx_guard_shifts_estate_id ON guard_shifts(estate_id);
CREATE INDEX IF NOT EXISTS idx_guard_handover_notes_estate_id ON guard_handover_notes(estate_id);
CREATE INDEX IF NOT EXISTS idx_guard_performance_metrics_estate_id ON guard_performance_metrics(estate_id);
CREATE INDEX IF NOT EXISTS idx_guard_equipment_checkout_estate_id ON guard_equipment_checkout(estate_id);
CREATE INDEX IF NOT EXISTS idx_guard_training_estate_id ON guard_training(estate_id);
