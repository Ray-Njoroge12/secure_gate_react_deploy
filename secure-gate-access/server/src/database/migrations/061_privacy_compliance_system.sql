-- Privacy Compliance System Migration
-- Implements GDPR/KDPA compliance features including privacy settings,
-- data retention policies, consent management, and audit trails

-- Drop existing data_retention_policies table if it exists with old structure
DROP TABLE IF EXISTS data_retention_policies CASCADE;

-- User Privacy Settings Table
CREATE TABLE IF NOT EXISTS user_privacy_settings (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  estate_id INT REFERENCES estates(id) ON DELETE CASCADE,
  
  -- Consent settings
  data_sharing_consent BOOLEAN DEFAULT false,
  marketing_consent BOOLEAN DEFAULT false,
  analytics_consent BOOLEAN DEFAULT false,
  third_party_consent BOOLEAN DEFAULT false,
  location_tracking_consent BOOLEAN DEFAULT false,
  biometric_consent BOOLEAN DEFAULT false,
  automated_decisions_consent BOOLEAN DEFAULT false,
  
  -- Data retention preferences
  data_retention_period VARCHAR(50) DEFAULT '2_years' CHECK (
    data_retention_period IN ('1_year', '2_years', '3_years', '5_years', 'indefinite')
  ),
  
  -- Communication and visibility preferences
  communication_preferences JSONB DEFAULT '{}',
  visibility_settings JSONB DEFAULT '{}',
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(255),
  
  UNIQUE(user_id, estate_id)
);

-- Data Retention Policies Table
CREATE TABLE IF NOT EXISTS data_retention_policies (
  id SERIAL PRIMARY KEY,
  estate_id INT REFERENCES estates(id) ON DELETE CASCADE,
  
  -- Policy configuration
  data_category VARCHAR(100) NOT NULL CHECK (
    data_category IN (
      'personal_identifiers', 'contact_information', 'location_data',
      'behavioral_data', 'security_logs', 'communication_records',
      'biometric_data', 'device_information', 'visitor_records',
      'audit_logs', 'system_logs'
    )
  ),
  retention_period_days INT NOT NULL CHECK (retention_period_days > 0),
  
  -- Retention actions
  auto_delete_enabled BOOLEAN DEFAULT false,
  archive_enabled BOOLEAN DEFAULT true,
  archive_location VARCHAR(255),
  
  -- Policy metadata
  policy_name VARCHAR(255) NOT NULL,
  policy_description TEXT,
  legal_basis VARCHAR(100),
  
  -- Execution settings
  execution_schedule VARCHAR(50) DEFAULT 'monthly' CHECK (
    execution_schedule IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually')
  ),
  last_executed_at TIMESTAMP,
  next_execution_at TIMESTAMP,
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  
  UNIQUE(estate_id, data_category)
);

-- User Consent Records Table (Immutable audit trail)
CREATE TABLE IF NOT EXISTS user_consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  estate_id INT REFERENCES estates(id) ON DELETE CASCADE,
  
  -- Consent details
  consent_type VARCHAR(100) NOT NULL CHECK (
    consent_type IN (
      'data_processing', 'marketing_communications', 'analytics_tracking',
      'third_party_sharing', 'location_tracking', 'biometric_data',
      'automated_decision_making'
    )
  ),
  granted BOOLEAN NOT NULL,
  
  -- Consent context
  consent_method VARCHAR(50) DEFAULT 'web_interface' CHECK (
    consent_method IN ('web_interface', 'mobile_app', 'email_link', 'phone_call', 'in_person')
  ),
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Consent lifecycle
  granted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  withdrawn_at TIMESTAMP,
  
  -- Immutable record (no updates allowed)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Current User Consents Table (Current state view)
CREATE TABLE IF NOT EXISTS current_user_consents (
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  estate_id INT REFERENCES estates(id) ON DELETE CASCADE,
  consent_type VARCHAR(100) NOT NULL,
  granted BOOLEAN NOT NULL,
  last_updated_at TIMESTAMP DEFAULT NOW(),
  consent_record_id UUID REFERENCES user_consent_records(id),
  
  PRIMARY KEY (user_id, estate_id, consent_type)
);

-- Data Subject Requests Table (GDPR Articles 15-22)
CREATE TABLE IF NOT EXISTS data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  estate_id INT REFERENCES estates(id) ON DELETE CASCADE,
  
  -- Request details
  request_type VARCHAR(50) NOT NULL CHECK (
    request_type IN (
      'data_access', 'data_rectification', 'data_erasure',
      'data_portability', 'processing_restriction', 'object_processing'
    )
  ),
  request_details JSONB DEFAULT '{}',
  
  -- Request lifecycle
  status VARCHAR(50) DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled')
  ),
  requested_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  due_date TIMESTAMP NOT NULL,
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  
  -- Processing results
  processing_result JSONB DEFAULT '{}',
  rejection_reason TEXT,
  
  -- Compliance tracking
  legal_basis VARCHAR(100),
  processing_notes TEXT
);

-- Compliance Audit Logs Table
CREATE TABLE IF NOT EXISTS compliance_audit_logs (
  id SERIAL PRIMARY KEY,
  estate_id INT REFERENCES estates(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  
  -- Action details
  action_type VARCHAR(100) NOT NULL CHECK (
    action_type IN (
      'privacy_settings_updated', 'consent_granted', 'consent_withdrawn',
      'data_retention_execution', 'data_subject_request', 'data_access',
      'data_deletion', 'data_export', 'compliance_report_generated'
    )
  ),
  action_details JSONB DEFAULT '{}',
  
  -- Legal and compliance context
  legal_basis VARCHAR(100),
  data_categories TEXT[],
  affected_records INT DEFAULT 0,
  
  -- Execution context
  execution_id UUID,
  request_id UUID,
  execution_status VARCHAR(50) DEFAULT 'success',
  
  -- Audit trail (immutable)
  created_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Privacy Setting Changes Table (Detailed change tracking)
CREATE TABLE IF NOT EXISTS privacy_setting_changes (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  estate_id INT REFERENCES estates(id) ON DELETE CASCADE,
  
  -- Change details
  setting_name VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  
  -- Change context
  changed_by VARCHAR(255) NOT NULL,
  changed_at TIMESTAMP DEFAULT NOW(),
  change_reason TEXT,
  
  -- Audit trail
  ip_address INET,
  user_agent TEXT
);

-- Privacy Access Logs Table (Track privacy-related access)
CREATE TABLE IF NOT EXISTS privacy_access_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  estate_id INT REFERENCES estates(id) ON DELETE CASCADE,
  
  -- Access details
  action VARCHAR(100) NOT NULL,
  resource_accessed VARCHAR(255),
  access_granted BOOLEAN DEFAULT true,
  
  -- Access context
  accessed_at TIMESTAMP DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255)
);

-- Compliance Reports Table
CREATE TABLE IF NOT EXISTS compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id INT REFERENCES estates(id) ON DELETE CASCADE,
  
  -- Report details
  report_type VARCHAR(50) NOT NULL CHECK (
    report_type IN ('gdpr_compliance', 'kdpa_compliance', 'data_processing', 'consent_audit')
  ),
  report_period_start DATE NOT NULL,
  report_period_end DATE NOT NULL,
  
  -- Report content
  report_data JSONB NOT NULL,
  executive_summary TEXT,
  recommendations TEXT[],
  
  -- Report metadata
  generated_at TIMESTAMP DEFAULT NOW(),
  generated_by VARCHAR(255) NOT NULL,
  report_status VARCHAR(50) DEFAULT 'draft' CHECK (
    report_status IN ('draft', 'final', 'archived')
  ),
  
  -- Storage and access
  file_path VARCHAR(500),
  access_level VARCHAR(50) DEFAULT 'restricted' CHECK (
    access_level IN ('public', 'internal', 'restricted', 'confidential')
  )
);

-- Indexes for Performance

-- User Privacy Settings
CREATE INDEX idx_user_privacy_settings_user_estate ON user_privacy_settings(user_id, estate_id);
CREATE INDEX idx_user_privacy_settings_updated ON user_privacy_settings(updated_at);

-- Data Retention Policies
CREATE INDEX idx_data_retention_policies_estate ON data_retention_policies(estate_id);
CREATE INDEX idx_data_retention_policies_category ON data_retention_policies(data_category);
CREATE INDEX idx_data_retention_policies_execution ON data_retention_policies(next_execution_at) WHERE is_active = true;

-- User Consent Records
CREATE INDEX idx_user_consent_records_user_estate ON user_consent_records(user_id, estate_id);
CREATE INDEX idx_user_consent_records_type ON user_consent_records(consent_type);
CREATE INDEX idx_user_consent_records_granted_at ON user_consent_records(granted_at);

-- Current User Consents
CREATE INDEX idx_current_user_consents_user ON current_user_consents(user_id, estate_id);
CREATE INDEX idx_current_user_consents_type ON current_user_consents(consent_type);

-- Data Subject Requests
CREATE INDEX idx_data_subject_requests_user ON data_subject_requests(user_id, estate_id);
CREATE INDEX idx_data_subject_requests_status ON data_subject_requests(status);
CREATE INDEX idx_data_subject_requests_due_date ON data_subject_requests(due_date) WHERE status IN ('pending', 'processing');

-- Compliance Audit Logs
CREATE INDEX idx_compliance_audit_logs_estate ON compliance_audit_logs(estate_id);
CREATE INDEX idx_compliance_audit_logs_action ON compliance_audit_logs(action_type);
CREATE INDEX idx_compliance_audit_logs_created ON compliance_audit_logs(created_at);
CREATE INDEX idx_compliance_audit_logs_user ON compliance_audit_logs(user_id) WHERE user_id IS NOT NULL;

-- Privacy Setting Changes
CREATE INDEX idx_privacy_setting_changes_user ON privacy_setting_changes(user_id, estate_id);
CREATE INDEX idx_privacy_setting_changes_setting ON privacy_setting_changes(setting_name);
CREATE INDEX idx_privacy_setting_changes_changed_at ON privacy_setting_changes(changed_at);

-- Privacy Access Logs
CREATE INDEX idx_privacy_access_logs_user ON privacy_access_logs(user_id, estate_id);
CREATE INDEX idx_privacy_access_logs_action ON privacy_access_logs(action);
CREATE INDEX idx_privacy_access_logs_accessed_at ON privacy_access_logs(accessed_at);

-- Compliance Reports
CREATE INDEX idx_compliance_reports_estate ON compliance_reports(estate_id);
CREATE INDEX idx_compliance_reports_type ON compliance_reports(report_type);
CREATE INDEX idx_compliance_reports_period ON compliance_reports(report_period_start, report_period_end);

-- Functions and Triggers

-- Function to update user_privacy_settings.updated_at
CREATE OR REPLACE FUNCTION update_privacy_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_privacy_settings
DROP TRIGGER IF EXISTS trigger_update_privacy_settings_timestamp ON user_privacy_settings;
CREATE TRIGGER trigger_update_privacy_settings_timestamp
  BEFORE UPDATE ON user_privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_privacy_settings_timestamp();

-- Function to automatically update next_execution_at for retention policies
CREATE OR REPLACE FUNCTION update_retention_policy_next_execution()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_executed_at IS NOT NULL AND NEW.last_executed_at != OLD.last_executed_at THEN
    CASE NEW.execution_schedule
      WHEN 'daily' THEN
        NEW.next_execution_at = NEW.last_executed_at + INTERVAL '1 day';
      WHEN 'weekly' THEN
        NEW.next_execution_at = NEW.last_executed_at + INTERVAL '1 week';
      WHEN 'monthly' THEN
        NEW.next_execution_at = NEW.last_executed_at + INTERVAL '1 month';
      WHEN 'quarterly' THEN
        NEW.next_execution_at = NEW.last_executed_at + INTERVAL '3 months';
      WHEN 'annually' THEN
        NEW.next_execution_at = NEW.last_executed_at + INTERVAL '1 year';
    END CASE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for data_retention_policies
DROP TRIGGER IF EXISTS trigger_update_retention_policy_next_execution ON data_retention_policies;
CREATE TRIGGER trigger_update_retention_policy_next_execution
  BEFORE UPDATE ON data_retention_policies
  FOR EACH ROW
  EXECUTE FUNCTION update_retention_policy_next_execution();

-- Insert default data retention policies for new estates
CREATE OR REPLACE FUNCTION create_default_retention_policies()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default retention policies for the new estate
  INSERT INTO data_retention_policies (
    estate_id, data_category, retention_period_days, policy_name, 
    policy_description, legal_basis, auto_delete_enabled, archive_enabled
  ) VALUES
  (NEW.id, 'visitor_records', 730, 'Visitor Records Retention', 'Retain visitor records for 2 years for security purposes', 'legitimate_interest', false, true),
  (NEW.id, 'audit_logs', 2555, 'Audit Logs Retention', 'Retain audit logs for 7 years for compliance', 'legal_obligation', false, true),
  (NEW.id, 'security_logs', 1095, 'Security Logs Retention', 'Retain security logs for 3 years', 'legitimate_interest', false, true),
  (NEW.id, 'communication_records', 365, 'Communication Records Retention', 'Retain communication records for 1 year', 'legitimate_interest', true, true),
  (NEW.id, 'behavioral_data', 180, 'Behavioral Data Retention', 'Retain behavioral analytics for 6 months', 'consent', true, false),
  (NEW.id, 'device_information', 90, 'Device Information Retention', 'Retain device information for 3 months', 'legitimate_interest', true, false);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default retention policies for new estates
DROP TRIGGER IF EXISTS trigger_create_default_retention_policies ON estates;
CREATE TRIGGER trigger_create_default_retention_policies
  AFTER INSERT ON estates
  FOR EACH ROW
  EXECUTE FUNCTION create_default_retention_policies();

-- Views for easier querying

-- View for active user consents with descriptions
CREATE OR REPLACE VIEW user_consent_summary AS
SELECT 
  cuc.user_id,
  cuc.estate_id,
  u.email,
  u.username,
  e.name as estate_name,
  cuc.consent_type,
  cuc.granted,
  cuc.last_updated_at,
  ucr.granted_at,
  ucr.consent_method,
  ucr.expires_at,
  CASE 
    WHEN ucr.expires_at IS NOT NULL AND ucr.expires_at < NOW() THEN true
    ELSE false
  END as is_expired
FROM current_user_consents cuc
JOIN users u ON cuc.user_id = u.id
JOIN estates e ON cuc.estate_id = e.id
LEFT JOIN user_consent_records ucr ON cuc.consent_record_id = ucr.id;

-- View for data retention policy status
CREATE OR REPLACE VIEW retention_policy_status AS
SELECT 
  drp.*,
  e.name as estate_name,
  CASE 
    WHEN drp.next_execution_at < NOW() THEN 'overdue'
    WHEN drp.next_execution_at < NOW() + INTERVAL '7 days' THEN 'due_soon'
    ELSE 'scheduled'
  END as execution_status,
  EXTRACT(DAYS FROM (drp.next_execution_at - NOW())) as days_until_execution
FROM data_retention_policies drp
JOIN estates e ON drp.estate_id = e.id
WHERE drp.is_active = true;

-- View for compliance audit summary
CREATE OR REPLACE VIEW compliance_audit_summary AS
SELECT 
  cal.estate_id,
  e.name as estate_name,
  cal.action_type,
  COUNT(*) as action_count,
  COUNT(CASE WHEN cal.execution_status = 'success' THEN 1 END) as successful_actions,
  COUNT(CASE WHEN cal.execution_status != 'success' THEN 1 END) as failed_actions,
  MAX(cal.created_at) as last_action_at,
  SUM(cal.affected_records) as total_affected_records
FROM compliance_audit_logs cal
JOIN estates e ON cal.estate_id = e.id
WHERE cal.created_at >= NOW() - INTERVAL '30 days'
GROUP BY cal.estate_id, e.name, cal.action_type
ORDER BY cal.estate_id, cal.action_type;

-- Comments for documentation
COMMENT ON TABLE user_privacy_settings IS 'Stores user privacy preferences and consent settings with granular controls';
COMMENT ON TABLE data_retention_policies IS 'Defines automated data retention and deletion policies per estate and data category';
COMMENT ON TABLE user_consent_records IS 'Immutable audit trail of all user consent decisions with full context';
COMMENT ON TABLE current_user_consents IS 'Current state view of user consent status for efficient querying';
COMMENT ON TABLE data_subject_requests IS 'Tracks GDPR/KDPA data subject rights requests and their processing status';
COMMENT ON TABLE compliance_audit_logs IS 'Comprehensive audit trail for all privacy and compliance-related actions';
COMMENT ON TABLE privacy_setting_changes IS 'Detailed change tracking for privacy setting modifications';
COMMENT ON TABLE privacy_access_logs IS 'Logs all access to privacy-related data and settings';
COMMENT ON TABLE compliance_reports IS 'Stores generated compliance reports with metadata and access controls';

-- Grant appropriate permissions (commented out for development)
-- GRANT SELECT, INSERT, UPDATE ON user_privacy_settings TO secure_gate_app;
-- GRANT SELECT, INSERT, UPDATE ON data_retention_policies TO secure_gate_app;
-- GRANT SELECT, INSERT ON user_consent_records TO secure_gate_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON current_user_consents TO secure_gate_app;
-- GRANT SELECT, INSERT, UPDATE ON data_subject_requests TO secure_gate_app;
-- GRANT SELECT, INSERT ON compliance_audit_logs TO secure_gate_app;
-- GRANT SELECT, INSERT ON privacy_setting_changes TO secure_gate_app;
-- GRANT SELECT, INSERT ON privacy_access_logs TO secure_gate_app;
-- GRANT SELECT, INSERT, UPDATE ON compliance_reports TO secure_gate_app;

-- Grant sequence permissions (commented out for development)
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO secure_gate_app;