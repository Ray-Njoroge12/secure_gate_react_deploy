-- Insert an admin user with hashed password
INSERT INTO users (username, email, password, password_hash, role, verified) 
VALUES ('admin', 'admin@securegate.com', 'admin123', '$2b$10$rQZ8K9L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6A7B8C9D0E1F2G3H4I5J6K', 'admin', true);

-- Insert a test visitor
INSERT INTO visitors (name, phone, purpose, date_of_visit, time_of_visit, invite_code, status, created_by, created_at) 
VALUES ('John Doe', '0712345678', 'Meeting', '2025-09-23', '14:00', 'INVITE-TEST-001', 'PENDING', 'admin@securegate.com', NOW());

-- Insert a log
INSERT INTO access_logs (user_id, action) 
VALUES (1, 'login');
