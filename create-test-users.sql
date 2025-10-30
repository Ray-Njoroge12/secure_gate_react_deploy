-- Create Test Users for Automated Testing
-- Passwords are bcrypt hashed:
-- Admin@123, Guard@123, Resident@123

-- Check and delete existing test users if they exist
DELETE FROM users WHERE email IN ('admin@securegate.com', 'guard@securegate.com', 'resident@securegate.com');

-- Insert test users with pre-hashed passwords
-- Password: Admin@123
INSERT INTO users (username, email, password_hash, role, phone, area, house, verified, notify_email, notify_sms)
VALUES (
    'admin',
    'admin@securegate.com',
    '$2a$10$YourHashHere.ReplaceWithActualBcryptHash',
    'admin',
    '+254700000001',
    'Admin Area',
    'Admin House',
    true,
    true,
    false
) ON CONFLICT (email) DO UPDATE SET
    username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role;

-- Password: Guard@123
INSERT INTO users (username, email, password_hash, role, phone, area, house, verified, notify_email, notify_sms)
VALUES (
    'guard',
    'guard@securegate.com',
    '$2a$10$YourHashHere.ReplaceWithActualBcryptHash',
    'guard',
    '+254700000002',
    'Security Gate',
    'Guard Post',
    true,
    true,
    false
) ON CONFLICT (email) DO UPDATE SET
    username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role;

-- Password: Resident@123
INSERT INTO users (username, email, password_hash, role, phone, area, house, verified, notify_email, notify_sms)
VALUES (
    'resident',
    'resident@securegate.com',
    '$2a$10$YourHashHere.ReplaceWithActualBcryptHash',
    'resident',
    '+254700000003',
    'Residential Area',
    'House 123',
    true,
    true,
    false
) ON CONFLICT (email) DO UPDATE SET
    username = EXCLUDED.username,
    password_hash = EXCLUDED.password_hash,
    role = EXCLUDED.role;

-- Verify users were created
SELECT id, username, email, role, verified FROM users 
WHERE email IN ('admin@securegate.com', 'guard@securegate.com', 'resident@securegate.com')
ORDER BY role;
