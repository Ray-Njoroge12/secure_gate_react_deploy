CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- admin, guard, visitor
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE visitors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    purpose TEXT,
    check_in TIMESTAMP DEFAULT NOW(),
    check_out TIMESTAMP
);

CREATE TABLE access_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100), -- e.g. "login", "logout", "door_open"
    log_time TIMESTAMP DEFAULT NOW()
);
