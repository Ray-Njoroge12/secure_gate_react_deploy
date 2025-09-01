import sqlite3 from "sqlite3";
import { open } from "sqlite";

console.log("Testing SQLite connection...");

try {
  const db = await open({
    filename: "./test.db",
    driver: sqlite3.Database,
  });

  console.log("SQLite connection successful");

  await db.exec("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)");
  console.log("Table created");

  await db.close();
  console.log("Test completed successfully");
} catch (error) {
  console.error("SQLite test failed:", error);
}
