-- Repair missing columns required by mounted resident/public visitor lifecycle routes.

ALTER TABLE bulk_invites
ADD COLUMN IF NOT EXISTS estate_id INTEGER;

UPDATE bulk_invites bi
SET estate_id = u.estate_id
FROM users u
WHERE bi.estate_id IS NULL
  AND bi.created_by IS NOT NULL
  AND u.email = bi.created_by
  AND u.estate_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bulk_invites_estate_id
ON bulk_invites(estate_id);

ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS otp_resend_count INT DEFAULT 0;

ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS otp_last_resend TIMESTAMP;