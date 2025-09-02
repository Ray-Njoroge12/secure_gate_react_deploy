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
    email VARCHAR(100),
    id_number VARCHAR(50),
    vehicle_plate VARCHAR(20),
    purpose TEXT,
    estimated_time TIMESTAMP,
    check_in TIMESTAMP DEFAULT NOW(),
    check_out TIMESTAMP
);

CREATE TABLE passes (
    id SERIAL PRIMARY KEY,
    pass_id VARCHAR(100) UNIQUE NOT NULL,
    visitor_id INT REFERENCES visitors(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
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
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE access_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100), -- e.g. "login", "logout", "door_open"
    log_time TIMESTAMP DEFAULT NOW()
);
