-- Migration: Missing Core Tables
-- Created: 2025-10-11
-- Description: Creates missing gates and sessions tables for core functionality

-- Up migration
-- Create gates table for gate management
CREATE TABLE IF NOT EXISTS gates (
    id SERIAL PRIMARY KEY,
    gate_id VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'entrance', -- entrance, exit, emergency
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, inactive, maintenance
    access_type VARCHAR(50) NOT NULL DEFAULT 'controlled', -- controlled, public, restricted
    description TEXT,
    hardware_info JSONB,
    configuration JSONB,
    last_maintenance TIMESTAMP,
    next_maintenance TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table for session management
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    device_info JSONB,
    location_info JSONB,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    logout_time TIMESTAMP WITH TIME ZONE,
    logout_reason VARCHAR(100), -- manual, timeout, forced, expired
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gate_access_logs table for gate-specific access tracking
CREATE TABLE IF NOT EXISTS gate_access_logs (
    id SERIAL PRIMARY KEY,
    gate_id INTEGER REFERENCES gates(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    visitor_id INTEGER REFERENCES visitors(id) ON DELETE SET NULL,
    session_id VARCHAR(255) REFERENCES sessions(session_id) ON DELETE SET NULL,
    access_type VARCHAR(50) NOT NULL, -- entry, exit, denied, emergency
    access_method VARCHAR(50) NOT NULL, -- card, biometric, mobile, manual, emergency
    access_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    success BOOLEAN NOT NULL DEFAULT true,
    failure_reason TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gate_permissions table for gate access control
CREATE TABLE IF NOT EXISTS gate_permissions (
    id SERIAL PRIMARY KEY,
    gate_id INTEGER REFERENCES gates(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    permission_type VARCHAR(50) NOT NULL, -- read, write, admin, emergency
    granted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(gate_id, user_id, permission_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_gates_gate_id ON gates(gate_id);
CREATE INDEX IF NOT EXISTS idx_gates_status ON gates(status);
CREATE INDEX IF NOT EXISTS idx_gates_type ON gates(type);
CREATE INDEX IF NOT EXISTS idx_gates_location ON gates(location);
CREATE INDEX IF NOT EXISTS idx_gates_created_by ON gates(created_by);

CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_ip_address ON sessions(ip_address);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity);

CREATE INDEX IF NOT EXISTS idx_gate_access_logs_gate_id ON gate_access_logs(gate_id);
CREATE INDEX IF NOT EXISTS idx_gate_access_logs_user_id ON gate_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_gate_access_logs_visitor_id ON gate_access_logs(visitor_id);
CREATE INDEX IF NOT EXISTS idx_gate_access_logs_access_time ON gate_access_logs(access_time);
CREATE INDEX IF NOT EXISTS idx_gate_access_logs_success ON gate_access_logs(success);
CREATE INDEX IF NOT EXISTS idx_gate_access_logs_access_type ON gate_access_logs(access_type);

CREATE INDEX IF NOT EXISTS idx_gate_permissions_gate_id ON gate_permissions(gate_id);
CREATE INDEX IF NOT EXISTS idx_gate_permissions_user_id ON gate_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_gate_permissions_type ON gate_permissions(permission_type);
CREATE INDEX IF NOT EXISTS idx_gate_permissions_is_active ON gate_permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_gate_permissions_expires_at ON gate_permissions(expires_at);

-- Create partial indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sessions_active ON sessions(session_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_gates_active ON gates(id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_gate_permissions_active ON gate_permissions(id) WHERE is_active = true;

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_gates_updated_at BEFORE UPDATE ON gates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gate_permissions_updated_at BEFORE UPDATE ON gate_permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    UPDATE sessions 
    SET is_active = false, 
        logout_time = NOW(), 
        logout_reason = 'expired'
    WHERE expires_at < NOW() AND is_active = true;
    
    DELETE FROM sessions 
    WHERE expires_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get gate access statistics
CREATE OR REPLACE FUNCTION get_gate_access_stats(
    p_gate_id INTEGER,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
    total_access BIGINT,
    successful_access BIGINT,
    failed_access BIGINT,
    access_by_type JSONB,
    access_by_method JSONB,
    unique_users BIGINT,
    unique_visitors BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_access,
        COUNT(CASE WHEN success = true THEN 1 END) as successful_access,
        COUNT(CASE WHEN success = false THEN 1 END) as failed_access,
        jsonb_object_agg(access_type, type_count) as access_by_type,
        jsonb_object_agg(access_method, method_count) as access_by_method,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT visitor_id) as unique_visitors
    FROM (
        SELECT 
            access_type,
            access_method,
            COUNT(*) as type_count,
            COUNT(*) as method_count
        FROM gate_access_logs
        WHERE gate_id = p_gate_id 
        AND access_time >= p_start_date 
        AND access_time <= p_end_date
        GROUP BY access_type, access_method
    ) stats;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate gate access
CREATE OR REPLACE FUNCTION validate_gate_access(
    p_gate_id INTEGER,
    p_user_id INTEGER,
    p_access_type VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := false;
    gate_status VARCHAR(20);
    user_role VARCHAR(50);
BEGIN
    -- Check if gate exists and is active
    SELECT status INTO gate_status FROM gates WHERE id = p_gate_id;
    IF gate_status IS NULL OR gate_status != 'active' THEN
        RETURN false;
    END IF;
    
    -- Get user role
    SELECT role INTO user_role FROM users WHERE id = p_user_id;
    
    -- Check if user has emergency access (admin role)
    IF user_role = 'admin' THEN
        RETURN true;
    END IF;
    
    -- Check specific gate permissions
    SELECT EXISTS(
        SELECT 1 FROM gate_permissions 
        WHERE gate_id = p_gate_id 
        AND user_id = p_user_id 
        AND permission_type IN (p_access_type, 'admin')
        AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
    ) INTO has_permission;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- Insert default gates
INSERT INTO gates (gate_id, name, location, type, status, access_type, description) VALUES
('MAIN_ENTRANCE', 'Main Entrance', 'Building A - Front', 'entrance', 'active', 'controlled', 'Primary entrance gate for visitors and residents'),
('MAIN_EXIT', 'Main Exit', 'Building A - Front', 'exit', 'active', 'controlled', 'Primary exit gate'),
('EMERGENCY_EXIT', 'Emergency Exit', 'Building A - Side', 'emergency', 'active', 'public', 'Emergency exit for evacuation'),
('PARKING_GATE', 'Parking Gate', 'Parking Area', 'entrance', 'active', 'controlled', 'Vehicle access gate'),
('SERVICE_ENTRANCE', 'Service Entrance', 'Building A - Rear', 'entrance', 'active', 'restricted', 'Service and delivery entrance')
ON CONFLICT (gate_id) DO NOTHING;

-- Grant permissions to admin users for all gates
INSERT INTO gate_permissions (gate_id, user_id, permission_type, granted_by)
SELECT 
    g.id,
    u.id,
    'admin',
    u.id
FROM gates g, users u
WHERE u.role = 'admin'
ON CONFLICT (gate_id, user_id, permission_type) DO NOTHING;

-- Create views for easier querying
CREATE OR REPLACE VIEW gate_summary AS
SELECT 
    g.id,
    g.gate_id,
    g.name,
    g.location,
    g.type,
    g.status,
    g.access_type,
    COUNT(DISTINCT gp.user_id) as authorized_users,
    COUNT(DISTINCT gal.user_id) as total_accesses_today,
    g.last_maintenance,
    g.next_maintenance
FROM gates g
LEFT JOIN gate_permissions gp ON g.id = gp.gate_id AND gp.is_active = true
LEFT JOIN gate_access_logs gal ON g.id = gal.gate_id AND DATE(gal.access_time) = CURRENT_DATE
GROUP BY g.id, g.gate_id, g.name, g.location, g.type, g.status, g.access_type, g.last_maintenance, g.next_maintenance;

CREATE OR REPLACE VIEW active_sessions AS
SELECT 
    s.session_id,
    s.user_id,
    u.email,
    u.role,
    s.ip_address,
    s.user_agent,
    s.login_time,
    s.last_activity,
    s.expires_at,
    EXTRACT(EPOCH FROM (NOW() - s.last_activity))/60 as minutes_inactive
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.is_active = true
ORDER BY s.last_activity DESC;

-- Comments for documentation
COMMENT ON TABLE gates IS 'Physical gates and access points in the system';
COMMENT ON TABLE sessions IS 'User session management and tracking';
COMMENT ON TABLE gate_access_logs IS 'Detailed logs of all gate access attempts';
COMMENT ON TABLE gate_permissions IS 'Access control permissions for gates';

COMMENT ON COLUMN gates.type IS 'Gate type: entrance, exit, emergency';
COMMENT ON COLUMN gates.status IS 'Gate status: active, inactive, maintenance';
COMMENT ON COLUMN gates.access_type IS 'Access control level: controlled, public, restricted';

COMMENT ON COLUMN sessions.logout_reason IS 'Reason for logout: manual, timeout, forced, expired';
COMMENT ON COLUMN gate_access_logs.access_type IS 'Type of access: entry, exit, denied, emergency';
COMMENT ON COLUMN gate_access_logs.access_method IS 'Method used: card, biometric, mobile, manual, emergency';

-- Down migration (rollback)
-- Drop views
DROP VIEW IF EXISTS active_sessions;
DROP VIEW IF EXISTS gate_summary;

-- Drop functions
DROP FUNCTION IF EXISTS validate_gate_access(INTEGER, INTEGER, VARCHAR(50));
DROP FUNCTION IF EXISTS get_gate_access_stats(INTEGER, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE);
DROP FUNCTION IF EXISTS cleanup_expired_sessions();

-- Drop triggers
DROP TRIGGER IF EXISTS update_gate_permissions_updated_at ON gate_permissions;
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
DROP TRIGGER IF EXISTS update_gates_updated_at ON gates;

-- Drop tables in reverse order (respecting foreign key constraints)
DROP TABLE IF EXISTS gate_access_logs;
DROP TABLE IF EXISTS gate_permissions;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS gates;


