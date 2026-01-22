
import { dbManager } from './src/database/db.enhanced.js';

async function fixSchema() {
  try {
    console.log('🔄 Initializing database connection...');
    await dbManager.initializeAsync();
    
    // Check if column exists
    const checkRes = await dbManager.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'account_status'"
    );
    
    if (checkRes.rows.length === 0) {
      console.log('⚠️ account_status column missing. Adding it now...');
      await dbManager.query("ALTER TABLE users ADD COLUMN account_status VARCHAR(20) DEFAULT 'pending'");
      await dbManager.query("CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status)");
      console.log('✅ account_status column added successfully.');
    } else {
      console.log('✓ account_status column already exists.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Error fixing schema:', err);
    process.exit(1);
  }
}

fixSchema();
