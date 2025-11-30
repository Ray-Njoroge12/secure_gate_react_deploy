-- Migration: Policy Engine & Watchlist System
-- Phase A3: Policy Engine & Watchlists
-- Date: November 20, 2025

-- =============================================
-- Table: policies
-- Business rules engine for system behavior
-- =============================================
CREATE TABLE IF NOT EXISTS policies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'visitor_limit', 'time_restriction', 'approval_requirement', 'data_retention', 'vehicle_rule'
  
  -- Policy conditions (JSON rules)
  conditions JSONB NOT NULL, -- e.g., {"maxVisitorsPerDay": 10, "unitType": "apartment"}
  
  -- Actions to take when policy matches
  actions JSONB NOT NULL, -- e.g., {"action": "block", "notifyAdmin": true}
  
  -- Priority and status
  enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0, -- Higher number = higher priority
  
  -- Metadata
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table: policy_violations
-- Log of policy violations
-- =============================================
CREATE TABLE IF NOT EXISTS policy_violations (
  id SERIAL PRIMARY KEY,
  policy_id INTEGER REFERENCES policies(id) ON DELETE SET NULL,
  visitor_id INTEGER REFERENCES visitors(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  
  violation_type VARCHAR(50),
  violation_details JSONB,
  action_taken VARCHAR(50), -- 'blocked', 'warned', 'escalated', 'overridden'
  override_by INTEGER REFERENCES users(id),
  override_reason TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table: watchlist_entries
-- Security watchlist for flagged individuals/vehicles
-- =============================================
CREATE TABLE IF NOT EXISTS watchlist_entries (
  id SERIAL PRIMARY KEY,
  entry_type VARCHAR(50) NOT NULL, -- 'person', 'vehicle', 'company'
  
  -- Identity information
  name VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  id_number VARCHAR(50),
  vehicle_plate VARCHAR(20),
  company_name VARCHAR(255),
  
  -- Watchlist details
  reason TEXT NOT NULL,
  severity VARCHAR(20) NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  category VARCHAR(50), -- 'security_threat', 'banned', 'suspicious', 'vip', 'contractor'
  
  -- Supporting evidence
  supporting_docs TEXT[], -- Array of document URLs
  notes TEXT,
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  expires_at TIMESTAMP, -- Optional expiration
  
  -- Metadata
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TIMESTAMP,
  reviewed_by INTEGER REFERENCES users(id)
);

-- =============================================
-- Table: watchlist_matches
-- Records when visitors match watchlist entries
-- =============================================
CREATE TABLE IF NOT EXISTS watchlist_matches (
  id SERIAL PRIMARY KEY,
  watchlist_entry_id INTEGER REFERENCES watchlist_entries(id) ON DELETE CASCADE,
  visitor_id INTEGER REFERENCES visitors(id) ON DELETE CASCADE,
  
  -- Match details
  match_score DECIMAL(5,2) NOT NULL, -- 0.00 to 100.00
  matched_fields TEXT[] NOT NULL, -- ['name', 'phone', 'vehicle_plate']
  match_type VARCHAR(20) DEFAULT 'exact', -- 'exact', 'fuzzy', 'partial'
  
  -- Response tracking
  guard_notified BOOLEAN DEFAULT FALSE,
  guard_notified_at TIMESTAMP,
  admin_notified BOOLEAN DEFAULT FALSE,
  admin_notified_at TIMESTAMP,
  
  -- Resolution
  action_taken VARCHAR(50), -- 'allowed', 'denied', 'escalated', 'verified_safe'
  action_notes TEXT,
  resolved_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP,
  
  matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_policies_enabled ON policies(enabled) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_policies_type ON policies(type);
CREATE INDEX IF NOT EXISTS idx_policies_priority ON policies(priority DESC);

CREATE INDEX IF NOT EXISTS idx_policy_violations_policy ON policy_violations(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_violations_visitor ON policy_violations(visitor_id);
CREATE INDEX IF NOT EXISTS idx_policy_violations_created_at ON policy_violations(created_at);

CREATE INDEX IF NOT EXISTS idx_watchlist_active ON watchlist_entries(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_watchlist_severity ON watchlist_entries(severity);
CREATE INDEX IF NOT EXISTS idx_watchlist_name ON watchlist_entries(name);
CREATE INDEX IF NOT EXISTS idx_watchlist_phone ON watchlist_entries(phone);
CREATE INDEX IF NOT EXISTS idx_watchlist_vehicle ON watchlist_entries(vehicle_plate);

CREATE INDEX IF NOT EXISTS idx_watchlist_matches_entry ON watchlist_matches(watchlist_entry_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_matches_visitor ON watchlist_matches(visitor_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_matches_unresolved ON watchlist_matches(matched_at) 
  WHERE resolved_at IS NULL;

-- =============================================
-- Functions
-- =============================================

-- Fuzzy name matching function
CREATE OR REPLACE FUNCTION calculate_name_similarity(name1 TEXT, name2 TEXT)
RETURNS DECIMAL AS $$
BEGIN
  -- Simple similarity using Levenshtein distance
  -- In production, use pg_trgm extension for better performance
  RETURN SIMILARITY(LOWER(TRIM(name1)), LOWER(TRIM(name2))) * 100;
END;
$$ LANGUAGE plpgsql;

-- Check visitor against watchlist
CREATE OR REPLACE FUNCTION check_watchlist(
  p_visitor_name VARCHAR,
  p_visitor_phone VARCHAR,
  p_visitor_vehicle VARCHAR,
  p_threshold DECIMAL DEFAULT 80.00
) RETURNS TABLE (
  watchlist_id INTEGER,
  match_score DECIMAL,
  matched_fields TEXT[],
  severity VARCHAR,
  reason TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    we.id,
    GREATEST(
      CASE WHEN p_visitor_name IS NOT NULL AND we.name IS NOT NULL 
        THEN calculate_name_similarity(p_visitor_name, we.name)
        ELSE 0
      END,
      CASE WHEN p_visitor_phone IS NOT NULL AND we.phone = p_visitor_phone 
        THEN 100.00
        ELSE 0
      END,
      CASE WHEN p_visitor_vehicle IS NOT NULL AND we.vehicle_plate = p_visitor_vehicle 
        THEN 100.00
        ELSE 0
      END
    ) as score,
    ARRAY(
      SELECT field FROM (
        SELECT 'name' as field WHERE we.name IS NOT NULL AND calculate_name_similarity(p_visitor_name, we.name) >= p_threshold
        UNION
        SELECT 'phone' WHERE we.phone = p_visitor_phone
        UNION
        SELECT 'vehicle' WHERE we.vehicle_plate = p_visitor_vehicle
      ) fields
    ) as fields,
    we.severity,
    we.reason
  FROM watchlist_entries we
  WHERE we.active = TRUE
    AND (we.expires_at IS NULL OR we.expires_at > CURRENT_TIMESTAMP)
    AND (
      (we.name IS NOT NULL AND calculate_name_similarity(p_visitor_name, we.name) >= p_threshold) OR
      (we.phone IS NOT NULL AND we.phone = p_visitor_phone) OR
      (we.vehicle_plate IS NOT NULL AND we.vehicle_plate = p_visitor_vehicle)
    )
  ORDER BY score DESC;
END;
$$ LANGUAGE plpgsql;

-- Evaluate policies for visitor
CREATE OR REPLACE FUNCTION evaluate_policies(
  p_visitor_data JSONB
) RETURNS TABLE (
  policy_id INTEGER,
  policy_name VARCHAR,
  violation_type VARCHAR,
  action VARCHAR
) AS $$
BEGIN
  -- This is a simplified implementation
  -- In production, implement full JSON-based policy evaluation
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.type,
    p.actions->>'action'
  FROM policies p
  WHERE p.enabled = TRUE
  ORDER BY p.priority DESC;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Sample Policies
-- =============================================

-- Policy: Max 5 visitors per unit per day
INSERT INTO policies (name, description, type, conditions, actions, enabled, priority)
VALUES (
  'Daily Visitor Limit',
  'Limit of 5 visitors per unit per day',
  'visitor_limit',
  '{"maxVisitorsPerDay": 5, "scope": "per_unit"}'::JSONB,
  '{"action": "block", "message": "Daily visitor limit reached", "notifyResident": true}'::JSONB,
  FALSE, -- Disabled by default
  10
) ON CONFLICT DO NOTHING;

-- Policy: No visitors after 10 PM
INSERT INTO policies (name, description, type, conditions, actions, enabled, priority)
VALUES (
  'Night Time Restriction',
  'No new visitors after 10 PM',
  'time_restriction',
  '{"restrictAfter": "22:00", "restrictBefore": "06:00"}'::JSONB,
  '{"action": "require_admin_approval", "message": "Late night visitors require admin approval"}'::JSONB,
  FALSE,
  20
) ON CONFLICT DO NOTHING;

-- Policy: Contractor approval required
INSERT INTO policies (name, description, type, conditions, actions, enabled, priority)
VALUES (
  'Contractor Approval',
  'All contractors require admin approval',
  'approval_requirement',
  '{"visitorType": "contractor", "requireApprovalFrom": "admin"}'::JSONB,
  '{"action": "require_admin_approval", "notifyAdmin": true}'::JSONB,
  FALSE,
  15
) ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE policies IS 'Business rules that govern system behavior';
COMMENT ON TABLE policy_violations IS 'Log of all policy violations';
COMMENT ON TABLE watchlist_entries IS 'Security watchlist for flagged individuals';
COMMENT ON TABLE watchlist_matches IS 'Records of visitors matching watchlist entries';
COMMENT ON FUNCTION check_watchlist IS 'Checks visitor details against active watchlist entries';
COMMENT ON FUNCTION evaluate_policies IS 'Evaluates active policies against visitor data';

-- Verification
-- SELECT * FROM policies WHERE enabled = TRUE;
-- SELECT * FROM watchlist_entries WHERE active = TRUE;
