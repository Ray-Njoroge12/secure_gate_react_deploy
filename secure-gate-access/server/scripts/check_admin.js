
import { dbManager } from '../src/database/db.enhanced.js';

async function checkAdmin() {
  try {
    await dbManager.initializeAsync();
    
    // Check if admin user exists
    const res = await dbManager.query(
      "SELECT id, username, email, role FROM users WHERE email = 'admin@securegate.com'"
    );
    
    if (res.rows.length > 0) {
      console.log('✅ Admin user found:', res.rows[0]);
    } else {
      console.log('❌ Admin user NOT found. Database needs seeding.');
    }

  } catch (error) {
    console.error('Error checking admin user:', error);
  } finally {
    await dbManager.disconnect();
  }
}

checkAdmin();
