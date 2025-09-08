-- Insert an admin user (you can later change password handling to bcrypt in backend)
INSERT INTO users (username, password, role) 
VALUES ('admin', 'admin123', 'admin');

-- Insert a test visitor
INSERT INTO visitors (name, phone, purpose) 
VALUES ('John Doe', '0712345678', 'Meeting');

-- Insert a log
INSERT INTO access_logs (user_id, action) 
VALUES (1, 'login');
