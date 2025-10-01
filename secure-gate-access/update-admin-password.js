import { dbManager } from './server/src/database/db.enhanced.js';
import { passwordService } from './server/src/services/tokenService.js';

async function updateAdminPassword() {
  try {
    console.log('Updating admin password...');
    
    // Hash the new password
    const newPassword = 'AdminPass123!';
    const hashedPassword = await passwordService.hashPassword(newPassword);
    
    // Update the admin user's password
    const result = await dbManager.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hashedPassword, 'admin@securegate.com']
    );
    
    if (result.rowCount > 0) {
      console.log('✅ Admin password updated successfully');
    } else {
      console.log('❌ Admin user not found');
    }
    
    // Close the database connection
    await dbManager.close();
  } catch (error) {
    console.error('❌ Error updating admin password:', error);
  }
}

updateAdminPassword();
