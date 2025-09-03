// PostgreSQL pool replacement for previous in-memory SQLite implementation
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: process.env.PGDATABASE || 'secure_gate'
});

// Initialize database schema (idempotent) – keeps function name for server.js compatibility
const initializeDatabase = async () => {
  console.log('[DB] Initializing PostgreSQL schema...');
  try {
    console.time('[DB] visitors table');
    await pool.query(`CREATE TABLE IF NOT EXISTS visitors (
      id SERIAL PRIMARY KEY,
      name TEXT,
      phone TEXT,
      email TEXT,
      purpose TEXT,
      date_of_visit DATE,
      time_of_visit TEXT,
      id_number TEXT,
      vehicle_plate TEXT,
      invite_code TEXT UNIQUE,
      status TEXT DEFAULT 'PENDING',
      expected_time TEXT,
      otp TEXT,
      qr_code TEXT,
      bulk_invite_id INTEGER,
      check_in TIMESTAMPTZ DEFAULT NOW(),
      check_out TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`);
    console.timeEnd('[DB] visitors table');

    console.time('[DB] passes table');
    await pool.query(`CREATE TABLE IF NOT EXISTS passes (
      id SERIAL PRIMARY KEY,
      pass_id TEXT UNIQUE NOT NULL,
      visitor_id INTEGER REFERENCES visitors(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      status TEXT DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`);
    console.timeEnd('[DB] passes table');

    console.time('[DB] users table');
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT,
      email TEXT UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      phone TEXT,
      area TEXT,
      house TEXT,
      verified BOOLEAN DEFAULT FALSE,
      name TEXT,
      profile_pic TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`);
    console.timeEnd('[DB] users table');

    console.time('[DB] bulk_invites table');
    await pool.query(`CREATE TABLE IF NOT EXISTS bulk_invites (
      id SERIAL PRIMARY KEY,
      event_name TEXT NOT NULL,
      date DATE NOT NULL,
      time TEXT NOT NULL,
      num_guests INTEGER NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_by TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`);
    console.timeEnd('[DB] bulk_invites table');

    console.time('[DB] indexes');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_visitors_invite_code ON visitors(invite_code);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bulk_invites_invite_code ON bulk_invites(invite_code);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
    console.timeEnd('[DB] indexes');
    console.log('[DB] Schema ensured');
    return true;
  } catch (err) {
    console.error('[DB] Initialization error:', err);
    throw err;
  }
};

export default pool;
export { initializeDatabase, pool };
