import pkg from 'pg';
const { Client } = pkg;

const config = {
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE || 'postgres', // Connect to default DB first
};

if (!config.password) {
  console.error('Missing PGPASSWORD. Export PGUSER/PGPASSWORD (and optional PGHOST/PGPORT/PGDATABASE) before running this script.');
  process.exit(1);
}

async function createDb() {
  const client = new Client(config);
  try {
    await client.connect();
    // Check if DB exists
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'secure_gate'");
    if (res.rows.length > 0) {
      console.log("Database 'secure_gate' exists. Dropping it...");
      // Terminate other connections to allow DROP
      await client.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = 'secure_gate'
        AND pid <> pg_backend_pid();
      `);
      await client.query('DROP DATABASE secure_gate');
      console.log("Database dropped.");
    }
    
    console.log("Creating database 'secure_gate'...");
    await client.query('CREATE DATABASE secure_gate');
    console.log("Database created!");
  } catch (err) {
    console.error("Error creating database:", err);
  } finally {
    await client.end();
  }
}

createDb();
