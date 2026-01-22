
import { dbManager } from './src/database/db.enhanced.js';

async function checkColumns() {
  try {
    const res = await dbManager.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users'");
    console.log('Columns in users table:');
    res.rows.forEach(col => console.log(`- ${col.column_name} (${col.data_type})`));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkColumns();
