-- Migration: Initial Database Schema
-- Created: 2025-10-06
-- Description: Creates the initial database schema for Secure Gate Access Control System

-- Up migration
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255), -- legacy column, nullable
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- admin, guard, visitor, resident
    phone VARCHAR(20),
    area VARCHAR(100),
    house VARCHAR(100),
    notify_email BOOLEAN DEFAULT true,
    notify_sms BOOLEAN DEFAULT false,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create visitors table
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
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create passes table
CREATE TABLE IF NOT EXISTS passes (
    id SERIAL PRIMARY KEY,
    pass_id VARCHAR(100) UNIQUE NOT NULL,
    visitor_id INT REFERENCES visitors(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    qr_code TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create bulk_invites table
CREATE TABLE IF NOT EXISTS bulk_invites (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    num_guests INT NOT NULL,
    invite_code VARCHAR(100) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_by VARCHAR(100), -- resident email
    remaining_slots INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create access_logs table
CREATE TABLE IF NOT EXISTS access_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100), -- e.g. "login", "logout", "door_open"
    log_time TIMESTAMP DEFAULT NOW(),
    request_id VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    outcome VARCHAR(20),
    message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create otp_resend_log table
CREATE TABLE IF NOT EXISTS otp_resend_log (
    id SERIAL PRIMARY KEY,
    visitor_id INT REFERENCES visitors(id) ON DELETE CASCADE,
    channel VARCHAR(20),
    success BOOLEAN,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    details TEXT,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create or alter security_events table
CREATE TABLE IF NOT EXISTS security_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'medium',
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    risk_score INT DEFAULT 0,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    resolved_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Add missing columns to existing security_events table
DO $$ 
BEGIN
    -- Add severity column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_events' AND column_name = 'severity') THEN
        ALTER TABLE security_events ADD COLUMN severity VARCHAR(20) NOT NULL DEFAULT 'medium';
    END IF;
    
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_events' AND column_name = 'user_id') THEN
        ALTER TABLE security_events ADD COLUMN user_id INT REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    -- Add details column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_events' AND column_name = 'details') THEN
        ALTER TABLE security_events ADD COLUMN details JSONB;
    END IF;
    
    -- Add risk_score column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_events' AND column_name = 'risk_score') THEN
        ALTER TABLE security_events ADD COLUMN risk_score INT DEFAULT 0;
    END IF;
    
    -- Add resolved column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_events' AND column_name = 'resolved') THEN
        ALTER TABLE security_events ADD COLUMN resolved BOOLEAN DEFAULT false;
    END IF;
    
    -- Add resolved_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_events' AND column_name = 'resolved_at') THEN
        ALTER TABLE security_events ADD COLUMN resolved_at TIMESTAMP;
    END IF;
    
    -- Add resolved_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_events' AND column_name = 'resolved_by') THEN
        ALTER TABLE security_events ADD COLUMN resolved_by INT REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE INDEX IF NOT EXISTS idx_visitors_invite_code ON visitors(invite_code);
CREATE INDEX IF NOT EXISTS idx_visitors_status ON visitors(status);
CREATE INDEX IF NOT EXISTS idx_visitors_date_of_visit ON visitors(date_of_visit);
CREATE INDEX IF NOT EXISTS idx_visitors_created_by ON visitors(created_by);

CREATE INDEX IF NOT EXISTS idx_passes_visitor_id ON passes(visitor_id);
CREATE INDEX IF NOT EXISTS idx_passes_status ON passes(status);
CREATE INDEX IF NOT EXISTS idx_passes_expires_at ON passes(expires_at);

CREATE INDEX IF NOT EXISTS idx_bulk_invites_invite_code ON bulk_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_bulk_invites_date ON bulk_invites(date);
CREATE INDEX IF NOT EXISTS idx_bulk_invites_created_by ON bulk_invites(created_by);

CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_action ON access_logs(action);
CREATE INDEX IF NOT EXISTS idx_access_logs_log_time ON access_logs(log_time);

CREATE INDEX IF NOT EXISTS idx_otp_resend_log_visitor_id ON otp_resend_log(visitor_id);
CREATE INDEX IF NOT EXISTS idx_otp_resend_log_created_at ON otp_resend_log(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_security_events_event_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON security_events(created_at);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(resolved);

-- Create function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visitors_updated_at BEFORE UPDATE ON visitors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_passes_updated_at BEFORE UPDATE ON passes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bulk_invites_updated_at BEFORE UPDATE ON bulk_invites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Down migration (rollback)
-- Drop tables in reverse order (respecting foreign key constraints)
DROP TRIGGER IF EXISTS update_bulk_invites_updated_at ON bulk_invites;
DROP TRIGGER IF EXISTS update_passes_updated_at ON passes;
DROP TRIGGER IF EXISTS update_visitors_updated_at ON visitors;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

DROP FUNCTION IF EXISTS update_updated_at_column();

DROP TABLE IF EXISTS security_events;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS otp_resend_log;
DROP TABLE IF EXISTS access_logs;
DROP TABLE IF EXISTS bulk_invites;
DROP TABLE IF EXISTS passes;
DROP TABLE IF EXISTS visitors;
DROP TABLE IF EXISTS users;
