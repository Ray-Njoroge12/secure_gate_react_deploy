CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255), -- legacy column, nullable
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- admin, guard, visitor
    phone VARCHAR(20),
    area VARCHAR(100),
    house VARCHAR(100),
    notify_email BOOLEAN DEFAULT true,
    notify_sms BOOLEAN DEFAULT false,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE visitors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(100),
    id_number VARCHAR(50),
    vehicle_plate VARCHAR(20),
    purpose TEXT,
    date_of_visit DATE,
    time_of_visit TIME,
    invite_code VARCHAR(100) UNIQUE,
    status VARCHAR(20) DEFAULT 'PENDING',
    otp VARCHAR(10),
    otp_hash TEXT,
    otp_expires_at TIMESTAMP,
    otp_attempts INT DEFAULT 0,
    otp_resend_count INT DEFAULT 0,
    otp_last_resend TIMESTAMP,
    qr_code TEXT,
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    check_in_guard_id INT REFERENCES users(id),
    check_out_guard_id INT REFERENCES users(id),
    check_in_notes TEXT,
    check_out_notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE bulk_invites (
    id SERIAL PRIMARY KEY,
    event_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    time TIME NOT NULL,
    num_guests INT NOT NULL,
    invite_code VARCHAR(100) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_by VARCHAR(100), -- resident email
    remaining_slots INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE access_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100), -- e.g. "login", "logout", "door_open"
    log_time TIMESTAMP DEFAULT NOW(),
    request_id VARCHAR(100),
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    outcome VARCHAR(20),
    message TEXT,
    metadata JSONB
);

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    details TEXT,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Security events table for monitoring and threat detection
CREATE TABLE security_events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_visitors_invite_code ON visitors(invite_code);
CREATE INDEX idx_visitors_status ON visitors(status);
CREATE INDEX idx_visitors_date_of_visit ON visitors(date_of_visit);
CREATE INDEX idx_visitors_otp_expires_at ON visitors(otp_expires_at);
CREATE INDEX idx_visitors_created_by ON visitors(created_by);
CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);
CREATE INDEX idx_access_logs_request_id ON access_logs(request_id);
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_ip ON security_events(ip_address);
CREATE INDEX idx_security_events_created_at ON security_events(created_at);
