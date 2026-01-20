-- Migration: Add estate_id to qr_codes for tenant scoping

ALTER TABLE IF EXISTS qr_codes
  ADD COLUMN IF NOT EXISTS estate_id INTEGER;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'qr_codes' AND column_name = 'estate_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'qr_codes'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'qr_codes_estate_id_fkey'
  ) THEN
    ALTER TABLE qr_codes
      ADD CONSTRAINT qr_codes_estate_id_fkey
      FOREIGN KEY (estate_id) REFERENCES estates(id) ON DELETE SET NULL;
  END IF;
END $$;

UPDATE qr_codes qc
SET estate_id = v.estate_id
FROM visitors v
WHERE qc.estate_id IS NULL
  AND qc.visitor_id = v.id;

CREATE INDEX IF NOT EXISTS idx_qr_codes_estate_id ON qr_codes(estate_id);
