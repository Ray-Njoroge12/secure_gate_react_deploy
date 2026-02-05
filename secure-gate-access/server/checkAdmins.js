import { dbManager } from './src/database/db.enhanced.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

import fs from 'fs';

async function checkAdmins() {
  try {
    await dbManager.initializeAsync();
    
    // Check columns first
    const columns = await dbManager.query("SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'users'");
    let output = 'Users table structure:\n';
    columns.rows.forEach(r => {
      output += `- ${r.column_name} (nullable: ${r.is_nullable}, default: ${r.column_default})\n`;
    });
    
    const required = columns.rows.filter(r => r.is_nullable === 'NO' && r.column_default === null);
    output += `\nRequired columns (NOT NULL, no default): ${JSON.stringify(required.map(r => r.column_name))}\n`;

    const estates = await dbManager.query("SELECT id, name FROM estates LIMIT 5");
    console.log('Estates:');
    console.table(estates.rows);
    output += `\nEstates: ${JSON.stringify(estates.rows)}\n`;
    fs.writeFileSync('schema_info.txt', output);

    const result = await dbManager.query('SELECT id, username, email, role, verified FROM users');
    console.log('All Users:');
    console.table(result.rows);
    output += `\nAll Users: ${JSON.stringify(result.rows)}\n`;
    fs.writeFileSync('schema_info.txt', output);
    console.error('Error checking admins:', err);
  } finally {
    process.exit();
  }
}

checkAdmins();
