-- Migration: Phase 2 supporting tables (deliveries, directions, auto-approval)

-- Up migration

CREATE TABLE IF NOT EXISTS deliveries (
  id SERIAL PRIMARY KEY,
  tracking_number TEXT,
  carrier_name VARCHAR(255) NOT NULL,
  recipient_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  received_by_guard_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  package_description TEXT,
  package_size VARCHAR(20) NOT NULL DEFAULT 'medium',
  notes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'pending_collection',
  photo_reference TEXT,
  photo_uploaded_at TIMESTAMP,
  photo_expires_at TIMESTAMP,
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  notification_sent_at TIMESTAMP,
  collected_at TIMESTAMP,
  collected_by TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_recipient_id ON deliveries(recipient_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON deliveries(created_at);

DROP TRIGGER IF EXISTS update_deliveries_updated_at ON deliveries;
CREATE TRIGGER update_deliveries_updated_at BEFORE UPDATE ON deliveries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS delivery_photos (
  id SERIAL PRIMARY KEY,
  delivery_id INTEGER REFERENCES deliveries(id) ON DELETE CASCADE,
  photo_data BYTEA NOT NULL,
  mime_type VARCHAR(100) NOT NULL DEFAULT 'image/jpeg',
  expires_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_photos_delivery_id ON delivery_photos(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_photos_expires_at ON delivery_photos(expires_at);

CREATE OR REPLACE FUNCTION cleanup_expired_delivery_photos()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM delivery_photos
  WHERE expires_at IS NOT NULL AND expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_deliveries()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM deliveries
  WHERE created_at < NOW() - INTERVAL '365 days'
    AND status IN ('collected', 'returned');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS estate_locations (
  estate_id INTEGER PRIMARY KEY,
  gate_latitude NUMERIC(10, 7),
  gate_longitude NUMERIC(10, 7),
  gate_name VARCHAR(255) NOT NULL DEFAULT 'Main Gate',
  directions_from_highway TEXT,
  directions_from_city TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO estate_locations (estate_id)
VALUES (1)
ON CONFLICT (estate_id) DO NOTHING;

DROP TRIGGER IF EXISTS update_estate_locations_updated_at ON estate_locations;
CREATE TRIGGER update_estate_locations_updated_at BEFORE UPDATE ON estate_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS visitor_directions (
  visitor_id INTEGER PRIMARY KEY REFERENCES visitors(id) ON DELETE CASCADE,
  custom_instructions TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_visitor_directions_updated_at ON visitor_directions;
CREATE TRIGGER update_visitor_directions_updated_at BEFORE UPDATE ON visitor_directions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS auto_approval_rules (
  id SERIAL PRIMARY KEY,
  resident_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  rule_name VARCHAR(255) NOT NULL,
  match_criteria_encrypted TEXT NOT NULL,
  time_restrictions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  match_count INTEGER NOT NULL DEFAULT 0,
  last_matched_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_approval_rules_resident_id ON auto_approval_rules(resident_id);
CREATE INDEX IF NOT EXISTS idx_auto_approval_rules_is_active ON auto_approval_rules(is_active);

DROP TRIGGER IF EXISTS update_auto_approval_rules_updated_at ON auto_approval_rules;
CREATE TRIGGER update_auto_approval_rules_updated_at BEFORE UPDATE ON auto_approval_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS auto_approval_logs (
  id SERIAL PRIMARY KEY,
  rule_id INTEGER REFERENCES auto_approval_rules(id) ON DELETE SET NULL,
  resident_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  visitor_id INTEGER REFERENCES visitors(id) ON DELETE SET NULL,
  reason VARCHAR(50) NOT NULL,
  approved_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_approval_logs_resident_id ON auto_approval_logs(resident_id);
CREATE INDEX IF NOT EXISTS idx_auto_approval_logs_approved_at ON auto_approval_logs(approved_at);

CREATE TABLE IF NOT EXISTS favorite_visitors (
  id SERIAL PRIMARY KEY,
  resident_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_favorite_visitors_resident_id ON favorite_visitors(resident_id);

-- Down migration (rollback)
-- Intentionally omitted in this lightweight migration runner.
