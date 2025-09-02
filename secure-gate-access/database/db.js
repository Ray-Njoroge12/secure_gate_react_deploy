import sqlite3 from "sqlite3";
import { open } from "sqlite";

// Create SQLite database connection
const dbPromise = open({
  filename: "../secure_gate.db",
  driver: sqlite3.Database,
});

// Initialize database with tables
const initializeDatabase = async () => {
  try {
    console.log("Initializing database...");
    const db = await dbPromise;
    console.log("Database connection established");

    // Create visitors table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS visitors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        purpose TEXT,
        date_of_visit TEXT,
        time_of_visit TEXT,
        check_in DATETIME DEFAULT CURRENT_TIMESTAMP,
        check_out DATETIME
      )
    `);
    console.log("Visitors table created");

    // Create passes table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS passes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pass_id TEXT UNIQUE NOT NULL,
        visitor_id INTEGER,
        expires_at DATETIME NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (visitor_id) REFERENCES visitors (id)
      )
    `);
    console.log("Passes table created");

    // Create users table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Users table created");

    // Create bulk_invites table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS bulk_invites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_name TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        num_guests INTEGER NOT NULL,
        invite_code TEXT UNIQUE NOT NULL,
        expires_at DATETIME NOT NULL,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Bulk invites table created");

    console.log("Database initialization completed");
    return db;
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
};

// Export the database promise
export default dbPromise;
export { initializeDatabase };
