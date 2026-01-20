-- Add missing columns to delivery_logs table
ALTER TABLE delivery_logs ADD COLUMN IF NOT EXISTS delivery_id INTEGER;
ALTER TABLE delivery_logs ADD COLUMN IF NOT EXISTS action VARCHAR(50);
ALTER TABLE delivery_logs ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE delivery_logs ADD COLUMN IF NOT EXISTS photo_url VARCHAR(255);
ALTER TABLE delivery_logs ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE delivery_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_logs_delivery_id ON delivery_logs(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_logs_created_at ON delivery_logs(created_at);
