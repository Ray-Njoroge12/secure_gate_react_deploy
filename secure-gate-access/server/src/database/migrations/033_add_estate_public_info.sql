-- Migration: Add estate public info table
-- Description: Stores public-facing estate details for visitor landing pages

CREATE TABLE IF NOT EXISTS estate_public_info (
  estate_id INTEGER PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  timezone VARCHAR(100),
  contact VARCHAR(100),
  parking_instructions TEXT,
  check_in_instructions JSONB DEFAULT '[]'::jsonb,
  emergency_contact VARCHAR(100),
  languages JSONB DEFAULT '[]'::jsonb,
  gate_location VARCHAR(255),
  gate_hours VARCHAR(100),
  gate_contact VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO estate_public_info (
  estate_id,
  name,
  address,
  timezone,
  contact,
  parking_instructions,
  check_in_instructions,
  emergency_contact,
  languages,
  gate_location,
  gate_hours,
  gate_contact
)
VALUES (
  1,
  'Secure Gate Estate',
  'Nairobi, Kenya',
  'Africa/Nairobi',
  '+254 700 000 000',
  'Visitor parking available at designated areas near the main gate.',
  '["Present your QR code or visit code to the guard", "Valid ID required for entry", "Wait for resident approval if status is pending"]'::jsonb,
  '+254 700 000 000',
  '["en", "sw"]'::jsonb,
  'North Entrance',
  '24/7',
  '+254 700 000 000'
)
ON CONFLICT (estate_id) DO NOTHING;

DROP TRIGGER IF EXISTS update_estate_public_info_updated_at ON estate_public_info;
CREATE TRIGGER update_estate_public_info_updated_at BEFORE UPDATE ON estate_public_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
