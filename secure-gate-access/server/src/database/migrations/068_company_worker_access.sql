-- Migration: Company & Worker Access Management
-- Created: 2026-03-28
-- Description: Adds companies, company locations, workers, and worker passes
--              for industrial/commercial estate access control

-- ============================================================
-- 1. Companies table
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(100),
    estate_id INTEGER NOT NULL REFERENCES estates(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
        -- pending | approved | suspended | rejected
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(30),
    address TEXT,
    description TEXT,
    admin_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejected_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_company_name_estate UNIQUE (name, estate_id),
    CONSTRAINT uq_company_reg_estate UNIQUE (registration_number, estate_id)
);

CREATE INDEX IF NOT EXISTS idx_companies_estate_id ON companies(estate_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_admin_user ON companies(admin_user_id);

-- ============================================================
-- 2. Company locations table
-- ============================================================
CREATE TABLE IF NOT EXISTS company_locations (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_locations_company ON company_locations(company_id);

-- ============================================================
-- 3. Workers table
-- ============================================================
CREATE TABLE IF NOT EXISTS workers (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    estate_id INTEGER NOT NULL REFERENCES estates(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(30),
    email VARCHAR(255),
    id_number VARCHAR(100),
    worker_type VARCHAR(30) NOT NULL DEFAULT 'employee',
        -- employee | subcontractor
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
        -- pending | active | suspended | revoked
    vehicle_plate VARCHAR(30),
    pre_approved BOOLEAN DEFAULT false,
    pre_approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    pre_approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT uq_worker_id_number_estate UNIQUE (id_number, estate_id)
);

CREATE INDEX IF NOT EXISTS idx_workers_company_id ON workers(company_id);
CREATE INDEX IF NOT EXISTS idx_workers_estate_id ON workers(estate_id);
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
CREATE INDEX IF NOT EXISTS idx_workers_worker_type ON workers(worker_type);
CREATE INDEX IF NOT EXISTS idx_workers_vehicle_plate ON workers(vehicle_plate);

-- ============================================================
-- 4. Worker passes table
-- ============================================================
CREATE TABLE IF NOT EXISTS worker_passes (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    pass_type VARCHAR(30) NOT NULL DEFAULT 'worker',
        -- worker | vehicle
    pass_code VARCHAR(100) NOT NULL UNIQUE,
    qr_token VARCHAR(255) UNIQUE,
    qr_data_url TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
        -- active | expired | revoked
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    issued_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    revoked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_passes_worker_id ON worker_passes(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_passes_status ON worker_passes(status);
CREATE INDEX IF NOT EXISTS idx_worker_passes_pass_code ON worker_passes(pass_code);
CREATE INDEX IF NOT EXISTS idx_worker_passes_qr_token ON worker_passes(qr_token);

-- ============================================================
-- 5. Worker check-in/check-out log
-- ============================================================
CREATE TABLE IF NOT EXISTS worker_check_ins (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    estate_id INTEGER NOT NULL REFERENCES estates(id) ON DELETE CASCADE,
    worker_pass_id INTEGER REFERENCES worker_passes(id) ON DELETE SET NULL,
    check_in_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    check_out_time TIMESTAMP WITH TIME ZONE,
    check_in_guard_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    check_out_guard_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    check_in_notes TEXT,
    check_out_notes TEXT,
    vehicle_plate VARCHAR(30),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_worker_check_ins_worker ON worker_check_ins(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_check_ins_estate ON worker_check_ins(estate_id);
CREATE INDEX IF NOT EXISTS idx_worker_check_ins_time ON worker_check_ins(check_in_time);
CREATE INDEX IF NOT EXISTS idx_worker_check_ins_active
    ON worker_check_ins(estate_id, check_out_time)
    WHERE check_out_time IS NULL;

-- ============================================================
-- 6. Add company_admin role support
-- ============================================================
-- The users.role column is VARCHAR so it already supports new values.
-- Add company_id to users for company admin association.
ALTER TABLE users ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
