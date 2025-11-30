-- Migration: Role-Based Access Control (RBAC) System
-- Phase A2: RBAC & Admin Role Refinement
-- Date: November 20, 2025

-- =============================================
-- Table: roles
-- Defines system roles with hierarchy
-- =============================================
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  level INTEGER NOT NULL, -- Hierarchy: 1=highest (super_admin), 6=lowest (resident)
  is_system_role BOOLEAN DEFAULT TRUE, -- Cannot be deleted
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table: permissions
-- Defines granular system permissions
-- =============================================
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  resource VARCHAR(50) NOT NULL, -- 'system', 'estate', 'visitors', 'incidents', 'analytics', etc.
  action VARCHAR(50) NOT NULL, -- 'view', 'create', 'update', 'delete', 'manage'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- Table: role_permissions
-- Maps roles to permissions
-- =============================================
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id)
);

-- =============================================
-- Table: user_roles
-- Assigns roles to users with audit trail
-- =============================================
CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES users(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- Optional role expiration
  PRIMARY KEY (user_id, role_id)
);

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_roles_level ON roles(level);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);

-- =============================================
-- Seed Roles
-- =============================================
INSERT INTO roles (name, description, level, is_system_role) VALUES
  ('super_admin', 'Full system control across all estates', 1, TRUE),
  ('estate_admin', 'Single estate management with full permissions', 2, TRUE),
  ('security_lead', 'Manages incidents, guard analytics, and approvals', 3, TRUE),
  ('auditor', 'Read-only access to logs and analytics', 4, TRUE),
  ('guard', 'Check-in, check-out, and incident reporting', 5, TRUE),
  ('resident', 'Invite visitors and manage approvals', 6, TRUE)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- Seed Permissions
-- =============================================
INSERT INTO permissions (name, description, resource, action) VALUES
  -- System permissions
  ('system.manage', 'Full system management', 'system', 'manage'),
  ('system.configure', 'Configure system settings', 'system', 'update'),
  ('system.view', 'View system information', 'system', 'view'),
  
  -- Estate permissions
  ('estate.manage', 'Manage estate settings and users', 'estate', 'manage'),
  ('estate.view', 'View estate information', 'estate', 'view'),
  
  -- User permissions
  ('users.manage', 'Create, update, delete users', 'users', 'manage'),
  ('users.view', 'View user information', 'users', 'view'),
  ('users.assign_roles', 'Assign roles to users', 'users', 'update'),
  
  -- Visitor permissions
  ('visitors.manage', 'Full visitor management', 'visitors', 'manage'),
  ('visitors.create', 'Create visitor invites', 'visitors', 'create'),
  ('visitors.view', 'View visitor information', 'visitors', 'view'),
  ('visitors.approve', 'Approve or reject visitors', 'visitors', 'update'),
  ('visitors.checkin', 'Check in/out visitors', 'visitors', 'update'),
  
  -- Incident permissions
  ('incidents.manage', 'Full incident management', 'incidents', 'manage'),
  ('incidents.create', 'Report new incidents', 'incidents', 'create'),
  ('incidents.view', 'View incidents', 'incidents', 'view'),
  ('incidents.assign', 'Assign incidents to users', 'incidents', 'update'),
  ('incidents.close', 'Close resolved incidents', 'incidents', 'update'),
  
  -- Analytics permissions
  ('analytics.view', 'View analytics and reports', 'analytics', 'view'),
  ('analytics.export', 'Export analytics data', 'analytics', 'view'),
  
  -- Report permissions
  ('reports.generate', 'Generate reports', 'reports', 'create'),
  ('reports.schedule', 'Schedule automated reports', 'reports', 'create'),
  ('reports.view', 'View generated reports', 'reports', 'view'),
  
  -- Audit log permissions
  ('audit_logs.view', 'View audit logs', 'audit', 'view'),
  ('audit_logs.export', 'Export audit logs', 'audit', 'view'),
  
  -- Policy permissions
  ('policies.manage', 'Manage system policies', 'policies', 'manage'),
  ('policies.view', 'View system policies', 'policies', 'view'),
  
  -- Watchlist permissions
  ('watchlist.manage', 'Manage watchlist entries', 'watchlist', 'manage'),
  ('watchlist.view', 'View watchlist entries', 'watchlist', 'view')
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- Assign Permissions to Roles
-- =============================================

-- Super Admin: All permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- Estate Admin: Most permissions except system-level
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'estate_admin'
  AND p.name NOT IN ('system.manage', 'system.configure')
ON CONFLICT DO NOTHING;

-- Security Lead: Incidents, analytics, visitors
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'security_lead'
  AND p.resource IN ('incidents', 'analytics', 'visitors', 'watchlist', 'audit')
ON CONFLICT DO NOTHING;

-- Auditor: Read-only access to analytics, reports, audit logs
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'auditor'
  AND p.action = 'view'
  AND p.resource IN ('analytics', 'reports', 'audit', 'visitors', 'incidents')
ON CONFLICT DO NOTHING;

-- Guard: Check-in, incidents, basic visitor view
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'guard'
  AND p.name IN (
    'visitors.view', 'visitors.checkin',
    'incidents.create', 'incidents.view',
    'watchlist.view'
  )
ON CONFLICT DO NOTHING;

-- Resident: Create invites, approve visitors
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'resident'
  AND p.name IN ('visitors.create', 'visitors.view', 'visitors.approve')
ON CONFLICT DO NOTHING;

-- =============================================
-- Migrate existing users to new RBAC system
-- =============================================

-- Add role_id column to users (nullable for backward compatibility)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER REFERENCES roles(id);

-- Migrate existing role strings to role_ids
UPDATE users SET role_id = (SELECT id FROM roles WHERE name = users.role)
WHERE role IS NOT NULL AND role_id IS NULL;

-- Create user_roles entries from existing role column
INSERT INTO user_roles (user_id, role_id, assigned_at)
SELECT u.id, r.id, u.created_at
FROM users u
JOIN roles r ON u.role = r.name
WHERE NOT EXISTS (
  SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id AND ur.role_id = r.id
);

-- =============================================
-- Functions
-- =============================================

-- Check if user has permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id INTEGER,
  p_permission_name VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN role_permissions rp ON ur.role_id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
      AND p.name = p_permission_name
      AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
  );
END;
$$ LANGUAGE plpgsql;

-- Get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id INTEGER)
RETURNS TABLE (
  permission_name VARCHAR,
  resource VARCHAR,
  action VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.name, p.resource, p.action
  FROM user_roles ur
  JOIN role_permissions rp ON ur.role_id = rp.role_id
  JOIN permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = p_user_id
    AND (ur.expires_at IS NULL OR ur.expires_at > CURRENT_TIMESTAMP)
  ORDER BY p.name;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE roles IS 'System roles with hierarchy levels';
COMMENT ON TABLE permissions IS 'Granular permissions for resource actions';
COMMENT ON TABLE role_permissions IS 'Maps roles to their granted permissions';
COMMENT ON TABLE user_roles IS 'Assigns roles to users with audit trail';
COMMENT ON FUNCTION user_has_permission IS 'Checks if user has specific permission';
COMMENT ON FUNCTION get_user_permissions IS 'Returns all permissions for a user';

-- Verification
-- SELECT * FROM roles ORDER BY level;
-- SELECT COUNT(*) FROM permissions;
-- SELECT r.name, COUNT(p.id) as permission_count
-- FROM roles r
-- LEFT JOIN role_permissions rp ON r.id = rp.role_id
-- LEFT JOIN permissions p ON rp.permission_id = p.id
-- GROUP BY r.name;
