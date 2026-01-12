import { dbManager } from './db.enhanced.js';

// Helper to safely get pool
const getPool = () => {
  if (!dbManager.pool) {
    throw new Error('Database pool not initialized - call dbManager.initializeAsync() first');
  }
  return dbManager.pool;
};

const run = async () => {
  const pool = getPool();
  const client = await pool.connect();
  try {
    console.log('Initializing database...');
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL,
        role TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        verified BOOLEAN DEFAULT false,
        phone TEXT,
        area TEXT,
        house TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS visitors (
        id SERIAL PRIMARY KEY,
        name TEXT,
        phone TEXT,
        email TEXT,
        purpose TEXT,
        date_of_visit DATE,
        time_of_visit TEXT,
        invite_code TEXT UNIQUE,
        status TEXT,
        check_in_time TIMESTAMP,
        check_out_time TIMESTAMP,
        created_by TEXT,
        id_number TEXT,
        vehicle_plate TEXT,
        expected_time TIMESTAMP,
        otp_hash TEXT,
        otp_expires_at TIMESTAMP,
        otp_attempts INT DEFAULT 0,
        qr_code TEXT
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS bulk_invites (
        id SERIAL PRIMARY KEY,
        event_name TEXT NOT NULL,
        date DATE NOT NULL,
        time TEXT NOT NULL,
        num_guests INT NOT NULL,
        invite_code TEXT UNIQUE NOT NULL,
        created_by INT,
        expires_at TIMESTAMP NOT NULL,
        remaining_slots INT NOT NULL
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS passes (
        id SERIAL PRIMARY KEY,
        pass_id TEXT UNIQUE NOT NULL,
        visitor_id INT REFERENCES visitors(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        status TEXT NOT NULL,
        qr_code TEXT
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS access_logs (
        id SERIAL PRIMARY KEY,
        user_id INT,
        action TEXT,
        log_time TIMESTAMP DEFAULT NOW(),
        request_id TEXT,
        entity_type TEXT,
        entity_id TEXT,
        outcome TEXT,
        message TEXT,
        metadata JSONB
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL,
        scope TEXT NOT NULL,
        request_hash TEXT,
        response_code INT,
        response_body JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE (key, scope)
      );
    `);
    await client.query('COMMIT');
    console.log('DB init complete');
    process.exit(0);
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('DB init failed:', e.message);
    process.exit(1);
  } finally {
    client.release();
  }
};

run();
