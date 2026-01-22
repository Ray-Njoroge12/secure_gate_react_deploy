
import { dbManager } from '../src/database/db.enhanced.js';

async function checkVerificationStatus() {
  try {
    await dbManager.initializeAsync();
    
    const res = await dbManager.query(
      "SELECT id, username, email, verified FROM users WHERE email = 'admin@securegate.com'"
    );
    
    if (res.rows.length > 0) {
      console.log('User Status:', res.rows[0]);
    } else {
      console.log('❌ User not found');
    }

  } catch (error) {
    console.error('Error checking user:', error);
  } finally {
    await dbManager.disconnect();
  }
}

checkVerificationStatus();
