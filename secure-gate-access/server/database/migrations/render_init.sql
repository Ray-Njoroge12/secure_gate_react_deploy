-- Render PostgreSQL Initialization Script
-- Run this script on your Render PostgreSQL database to create all required tables
-- Date: 2025-12-01

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_encrypted TEXT,
    password VARCHAR(255),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    phone_encrypted TEXT,
    area VARCHAR(100),
    house VARCHAR(100),
    notify_email BOOLEAN DEFAULT true,
    notify_sms BOOLEAN DEFAULT false,
    verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255),
    verification_expires TIMESTAMP,
    reset_token VARCHAR(255),
    reset_expires TIMESTAMP,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Visitors table
CREATE TABLE IF NOT EXISTS visitors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    id_number VARCHAR(50),
    vehicle_plate VARCHAR(20),
    purpose TEXT,
    estimated_time TIMESTAMP,
    date_of_visit DATE,
    time_of_visit TIME,
    invite_code VARCHAR(100) UNIQUE,
    status VARCHAR(20) DEFAULT 'PENDING',
    expected_time TIMESTAMP,
    otp VARCHAR(10),
    otp_hash TEXT,
    otp_expires_at TIMESTAMP,
    otp_attempts INT DEFAULT 0,
    otp_resend_count INT DEFAULT 0,
    otp_last_resend TIMESTAMP,
    qr_code TEXT,
    check_in TIMESTAMP,
    check_out TIMESTAMP,
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    created_by VARCHAR(255),
    resident_id INTEGER REFERENCES users(id),
    consent_given BOOLEAN DEFAULT false,
    consent_timestamp TIMESTAMP,
    data_processing_consent BOOLEAN DEFAULT false,
    marketing_consent BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Passes table
CREATE TABLE IF NOT EXISTS passes (
    id SERIAL PRIMARY KEY,
    pass_id VARCHAR(100) UNIQUE NOT NULL,
    visitor_id INT REFERENCES visitors(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    qr_code TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bulk invites table
CREATE TABLE IF NOT EXISTS bulk_invites (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    num_guests INT NOT NULL,
    invite_code VARCHAR(100) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_by VARCHAR(100),
    remaining_slots INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Access logs table
CREATE TABLE IF NOT EXISTS access_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100),
    log_time TIMESTAMP DEFAULT NOW(),
    request_id VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    outcome VARCHAR(20),
    message TEXT,
    metadata JSONB
);

-- ============================================
-- MONITORING TABLES (required for health checks)
-- ============================================

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System health table
CREATE TABLE IF NOT EXISTS system_health (
    id SERIAL PRIMARY KEY,
    component VARCHAR(50) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'unknown',
    message TEXT,
    response_time_ms INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    last_check TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    user_id INTEGER,
    user_role VARCHAR(50),
    request_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security events table
CREATE TABLE IF NOT EXISTS security_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    user_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Application logs table
CREATE TABLE IF NOT EXISTS application_logs (
    id SERIAL PRIMARY KEY,
    level VARCHAR(20) NOT NULL,
    service VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    request_id VARCHAR(100),
    user_id INTEGER,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error logs table
CREATE TABLE IF NOT EXISTS error_logs (
    id SERIAL PRIMARY KEY,
    error_name VARCHAR(100) NOT NULL,
    error_message TEXT NOT NULL,
    error_stack TEXT,
    request_id VARCHAR(100),
    user_id INTEGER,
    url TEXT,
    method VARCHAR(10),
    status_code INTEGER,
    metadata JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OTP resend log
CREATE TABLE IF NOT EXISTS otp_resend_log (
    id SERIAL PRIMARY KEY,
    visitor_id INT REFERENCES visitors(id) ON DELETE CASCADE,
    channel VARCHAR(20),
    success BOOLEAN,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_verified ON users(verified);

-- Visitors indexes
CREATE INDEX IF NOT EXISTS idx_visitors_invite_code ON visitors(invite_code);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors(status);
CREATE INDEX IF NOT EXISTS idx_visitors_date_of_visit ON visitors(date_of_visit);
CREATE INDEX IF NOT EXISTS idx_visitors_created_by ON visitors(created_by);
CREATE INDEX IF NOT EXISTS idx_visitors_resident_id ON visitors(resident_id);

-- Passes indexes
CREATE INDEX IF NOT EXISTS idx_passes_visitor_id ON passes(visitor_id);
CREATE INDEX IF NOT EXISTS idx_passes_status ON passes(status);
CREATE INDEX IF NOT EXISTS idx_passes_expires_at ON passes(expires_at);

-- Access logs indexes
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created_at ON access_logs(log_time);
CREATE INDEX IF NOT EXISTS idx_access_logs_request_id ON access_logs(request_id);

-- Performance metrics indexes
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_time ON performance_metrics(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);

-- System health indexes
CREATE INDEX IF NOT EXISTS idx_system_health_component ON system_health(component);
CREATE INDEX IF NOT EXISTS idx_system_health_status ON system_health(status);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- Security events indexes
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp DESC);

-- ============================================
-- SEED TEST USERS (optional - uncomment to use)
-- ============================================

-- INSERT INTO users (username, email, password_hash, role, verified) VALUES
-- ('admin', 'admin@test.com', '$argon2id$v=19$m=65536,t=3,p=4$...', 'admin', true),
-- ('guard', 'guard@test.com', '$argon2id$v=19$m=65536,t=3,p=4$...', 'guard', true),
-- ('resident', 'resident@test.com', '$argon2id$v=19$m=65536,t=3,p=4$...', 'resident', true)
-- ON CONFLICT (email) DO NOTHING;

-- Done!
SELECT 'Migration complete! All tables created.' AS status;
