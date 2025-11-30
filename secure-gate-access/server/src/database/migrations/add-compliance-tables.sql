-- Migration: Add Kenya DPA Compliance Tables
-- Description: Creates tables for consent management, data deletion requests, and compliance tracking
-- Date: November 5, 2025
-- Compliance: Kenya Data Protection Act 2019

-- ====================================================================================
-- CONSENT MANAGEMENT (Kenya DPA Article 31)
-- ====================================================================================

CREATE TABLE IF NOT EXISTS consent_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  consent_type VARCHAR(100) NOT NULL, -- data_processing, marketing, analytics, etc.
  action VARCHAR(50) NOT NULL, -- granted, withdrawn, updated
  consent_text TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_log_user ON consent_log(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_log_type ON consent_log(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_log_date ON consent_log(created_at);

COMMENT ON TABLE consent_log IS 'Audit trail of all consent actions (Kenya DPA Article 31)';
COMMENT ON COLUMN consent_log.consent_type IS 'Type of consent (data_processing, marketing, etc.)';
COMMENT ON COLUMN consent_log.action IS 'Action taken (granted, withdrawn, updated)';

-- ====================================================================================
-- DATA DELETION REQUESTS (Kenya DPA Article 33 - Right to Erasure)
-- ====================================================================================

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, rejected
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by INTEGER REFERENCES users(id),
  rejection_reason TEXT,
  notes TEXT,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_deletion_requests_user ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_date ON data_deletion_requests(requested_at);

COMMENT ON TABLE data_deletion_requests IS 'Tracks right to erasure requests (Kenya DPA Article 33)';
COMMENT ON COLUMN data_deletion_requests.status IS 'Current status of deletion request';

-- ====================================================================================
-- DATA ACCESS REQUESTS (Kenya DPA Article 39 - Right to Data Portability)
-- ====================================================================================

CREATE TABLE IF NOT EXISTS data_access_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL, -- export, portability, access
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  format VARCHAR(20) DEFAULT 'json', -- json, csv, pdf
  download_url TEXT,
  expires_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT valid_request_type CHECK (request_type IN ('export', 'portability', 'access'))
);

CREATE INDEX IF NOT EXISTS idx_access_requests_user ON data_access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON data_access_requests(status);

COMMENT ON TABLE data_access_requests IS 'Tracks data portability requests (Kenya DPA Article 39)';

-- ====================================================================================
-- PRIVACY POLICY ACCEPTANCE
-- ====================================================================================

CREATE TABLE IF NOT EXISTS privacy_policy_acceptance (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  policy_version VARCHAR(20) NOT NULL,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_policy_acceptance_user ON privacy_policy_acceptance(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_acceptance_version ON privacy_policy_acceptance(policy_version);

COMMENT ON TABLE privacy_policy_acceptance IS 'Records when users accept privacy policy versions';

-- ====================================================================================
-- DATA BREACH INCIDENTS (Kenya DPA Article 41)
-- ====================================================================================

CREATE TABLE IF NOT EXISTS data_breach_incidents (
  id SERIAL PRIMARY KEY,
  incident_ref VARCHAR(100) UNIQUE NOT NULL,
  severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
  description TEXT NOT NULL,
  affected_records INTEGER,
  affected_data_types TEXT[], -- Array of affected data types
  discovered_at TIMESTAMPTZ NOT NULL,
  reported_to_authority_at TIMESTAMPTZ,
  reported_to_users_at TIMESTAMPTZ,
  mitigation_steps TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'open', -- open, investigating, contained, resolved
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_severity CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  CONSTRAINT valid_breach_status CHECK (status IN ('open', 'investigating', 'contained', 'resolved'))
);

CREATE INDEX IF NOT EXISTS idx_breach_incidents_severity ON data_breach_incidents(severity);
CREATE INDEX IF NOT EXISTS idx_breach_incidents_status ON data_breach_incidents(status);

COMMENT ON TABLE data_breach_incidents IS 'Tracks data breach incidents for Kenya DPA Article 41 compliance';

-- ====================================================================================
-- COMPLIANCE AUDIT TRAIL
-- ====================================================================================

CREATE TABLE IF NOT EXISTS compliance_audit_trail (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL, -- data_access, data_export, consent_change, etc.
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  resource_type VARCHAR(100),
  resource_id INTEGER,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  legal_basis VARCHAR(200), -- Which article/law applies
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_audit_event ON compliance_audit_trail(event_type);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_user ON compliance_audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_date ON compliance_audit_trail(created_at);
CREATE INDEX IF NOT EXISTS idx_compliance_audit_details ON compliance_audit_trail USING GIN (details);

COMMENT ON TABLE compliance_audit_trail IS 'Comprehensive audit trail for all compliance-related activities';

-- ====================================================================================
-- ADD COMPLIANCE COLUMNS TO USERS TABLE
-- ====================================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='consent_withdrawn') THEN
    ALTER TABLE users ADD COLUMN consent_withdrawn BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='consent_withdrawn_at') THEN
    ALTER TABLE users ADD COLUMN consent_withdrawn_at TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='data_deletion_requested') THEN
    ALTER TABLE users ADD COLUMN data_deletion_requested BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='privacy_policy_accepted_version') THEN
    ALTER TABLE users ADD COLUMN privacy_policy_accepted_version VARCHAR(20);
  END IF;
END $$;

-- ====================================================================================
-- CREATE COMPLIANCE FUNCTIONS
-- ====================================================================================

-- Function to log compliance events
CREATE OR REPLACE FUNCTION log_compliance_event(
  p_event_type VARCHAR,
  p_user_id INTEGER,
  p_action VARCHAR,
  p_details JSONB DEFAULT NULL,
  p_legal_basis VARCHAR DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_audit_id INTEGER;
BEGIN
  INSERT INTO compliance_audit_trail (
    event_type,
    user_id,
    action,
    details,
    legal_basis,
    created_at
  ) VALUES (
    p_event_type,
    p_user_id,
    p_action,
    p_details,
    p_legal_basis,
    NOW()
  ) RETURNING id INTO v_audit_id;
  
  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has active consent
CREATE OR REPLACE FUNCTION has_active_consent(p_user_id INTEGER, p_consent_type VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_last_action VARCHAR;
BEGIN
  SELECT action INTO v_last_action
  FROM consent_log
  WHERE user_id = p_user_id AND consent_type = p_consent_type
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN v_last_action = 'granted';
END;
$$ LANGUAGE plpgsql;

-- ====================================================================================
-- POPULATE DEFAULT DATA
-- ====================================================================================

-- Insert initial consent for existing users (migration - they registered with consent)
INSERT INTO consent_log (user_id, consent_type, action, consent_text, created_at)
SELECT 
  id,
  'data_processing',
  'granted',
  'Initial consent granted during registration',
  created_at
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM consent_log WHERE consent_log.user_id = users.id
);

-- ====================================================================================
-- GRANTS AND PERMISSIONS
-- ====================================================================================

GRANT SELECT, INSERT, UPDATE ON consent_log TO secure_gate_app;
GRANT SELECT, INSERT, UPDATE ON data_deletion_requests TO secure_gate_app;
GRANT SELECT, INSERT, UPDATE ON data_access_requests TO secure_gate_app;
GRANT SELECT, INSERT, UPDATE ON privacy_policy_acceptance TO secure_gate_app;
GRANT SELECT, INSERT, UPDATE ON data_breach_incidents TO secure_gate_app;
GRANT SELECT, INSERT, UPDATE ON compliance_audit_trail TO secure_gate_app;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO secure_gate_app;
GRANT EXECUTE ON FUNCTION log_compliance_event TO secure_gate_app;
GRANT EXECUTE ON FUNCTION has_active_consent TO secure_gate_app;

-- ====================================================================================
-- SUMMARY
-- ====================================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Kenya DPA Compliance Tables Created Successfully';
  RAISE NOTICE '============================================================';
  RAISE NOTICE 'Created tables for:';
  RAISE NOTICE '- Consent management (Article 31)';
  RAISE NOTICE '- Data deletion requests (Article 33)';
  RAISE NOTICE '- Data access requests (Article 39)';
  RAISE NOTICE '- Privacy policy acceptance';
  RAISE NOTICE '- Data breach tracking (Article 41)';
  RAISE NOTICE '- Comprehensive compliance audit trail';
  RAISE NOTICE '';
  RAISE NOTICE 'API Endpoints:';
  RAISE NOTICE '- GET /api/privacy/my-data';
  RAISE NOTICE '- GET /api/privacy/export';
  RAISE NOTICE '- POST /api/privacy/request-deletion';
  RAISE NOTICE '- POST /api/privacy/withdraw-consent';
  RAISE NOTICE '- GET /api/privacy/consent-status';
  RAISE NOTICE '============================================================';
END $$;
