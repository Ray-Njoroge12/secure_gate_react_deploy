import { dbManager } from './db.enhanced.js';

// Helper to safely get pool
const getPool = () => {
  if (!dbManager.pool) {
    throw new Error('Database pool not initialized - call dbManager.initializeAsync() first');
  }
  return dbManager.pool;
};

const run = async () => {
  await dbManager.initializeAsync();
  const pool = getPool();
  const client = await pool.connect();
  try {
    console.log('Initializing database...');
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS estates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        plan_id TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed default estate
    await client.query(`
      INSERT INTO estates (name, plan_id) 
      VALUES ('Default Estate', 'enterprise') 
      ON CONFLICT DO NOTHING;
    `);

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
        estate_id INT REFERENCES estates(id),
        verification_token TEXT,
        verification_expires TIMESTAMP,
        updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS visitors (
        id SERIAL PRIMARY KEY,
        name TEXT,
        estate_id INT REFERENCES estates(id),
        resident_id INT,
        host_id INT,
        phone TEXT,
        email TEXT,
        purpose TEXT,
        date_of_visit DATE,
        time_of_visit TEXT,
        invite_code TEXT UNIQUE,
        status TEXT,
        check_in_time TIMESTAMP,
        check_out_time TIMESTAMP,
        check_in_guard_id INT REFERENCES users(id),
        check_out_guard_id INT REFERENCES users(id),
        check_in_notes TEXT,
        check_out_notes TEXT,
        created_by TEXT,
        id_number TEXT,
        vehicle_plate TEXT,
        otp_hash TEXT,
        otp_expires_at TIMESTAMP,
        otp_attempts INT DEFAULT 0,
        qr_code TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
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
      CREATE TABLE IF NOT EXISTS incidents (
        id SERIAL PRIMARY KEY,
        guard_id INT REFERENCES users(id),
        reported_by INT REFERENCES users(id),
        visitor_id INT REFERENCES visitors(id),
        category TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'medium',
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        priority INT DEFAULT 3,
        resolution TEXT,
        resolved_at TIMESTAMP,
        resolved_by INT REFERENCES users(id),
        closed_at TIMESTAMP,
        closed_by INT REFERENCES users(id),
        assigned_to INT REFERENCES users(id),
        assigned_by INT REFERENCES users(id),
        assigned_at TIMESTAMP,
        escalated_to INT REFERENCES users(id),
        escalated_by INT REFERENCES users(id),
        escalated_at TIMESTAMP,
        site_id INT REFERENCES estates(id),
        estate_id INT REFERENCES estates(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
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
      CREATE TABLE IF NOT EXISTS revoked_tokens (
        jti TEXT PRIMARY KEY,
        revoked_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        user_agent TEXT,
        ip_address INET,
        is_revoked BOOLEAN DEFAULT false,
        revoked_at TIMESTAMP,
        last_used_at TIMESTAMP,
        jti TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS delivery_logs (
        id SERIAL PRIMARY KEY,
        recipient_id INT REFERENCES users(id),
        resident_id INT REFERENCES users(id),
        carrier TEXT,
        tracking_number TEXT,
        recipient_name TEXT,
        status TEXT,
        received_at TIMESTAMP,
        picked_up_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
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
