import { dbManager } from './src/database/db.enhanced.js';
import { passwordService } from './src/services/tokenService.js';
import dotenv from 'dotenv';

dotenv.config();

async function resetAdmin() {
  const email = 'admin@securegate.com';
  const newPassword = 'SecureGateAdmin123!';

  try {
    await dbManager.initializeAsync();
    
    console.log(`Resetting password for ${email}...`);
    const hashedPassword = await passwordService.hashPassword(newPassword);
    
    let result;
    try {
      result = await dbManager.query(
        'UPDATE users SET password = $1, password_hash = $2, verified = true WHERE email = $3 RETURNING id, username, email',
        [hashedPassword, hashedPassword, email]
      );
    } catch (updateErr) {
      console.error('UPDATE Error:', updateErr.message);
      throw updateErr;
    }

    if (result && result.rows.length > 0) {
      console.log('Admin password reset successfully!');
      console.table(result.rows);
    } else {
      console.warn(`No user found with email ${email}. Attempting to insert...`);
      // ... rest of the logic
    }
  } catch (err) {
    console.error('Error resetting admin:', err);
  } finally {
    process.exit();
  }
}

resetAdmin();
