import pool from "./db.js";
import fs from "fs";
import path from "path";

const initializeDatabase = async () => {
  try {
    console.log("Initializing database...");

    // Read and execute schema.sql
    const schemaPath = path.join(process.cwd(), "schema.sql");
    const schemaSQL = fs.readFileSync(schemaPath, "utf8");

    // Split SQL commands and execute them
    const commands = schemaSQL.split(";").filter(cmd => cmd.trim().length > 0);

    for (const command of commands) {
      if (command.trim()) {
        await pool.query(command);
      }
    }

    console.log("Schema created successfully");

    // Read and execute seed.sql if it exists
    const seedPath = path.join(process.cwd(), "seed.sql");
    if (fs.existsSync(seedPath)) {
      const seedSQL = fs.readFileSync(seedPath, "utf8");
      const seedCommands = seedSQL.split(";").filter(cmd => cmd.trim().length > 0);

      for (const command of seedCommands) {
        if (command.trim()) {
          await pool.query(command);
        }
      }

      console.log("Seed data inserted successfully");
    }

    console.log("Database initialization completed");
  } catch (error) {
    console.error("Database initialization failed:", error);
  } finally {
    await pool.end();
  }
};

initializeDatabase();
