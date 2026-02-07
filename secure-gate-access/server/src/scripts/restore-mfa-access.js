/**
 * Emergency MFA Access Restoration Script
 * Disables MFA for locked-out admin/guard users
 * 
 * USAGE:
 * ======
 * npm run mfa:restore
 * 
 * OR directly:
 * node src/scripts/restore-mfa-access.js
 * 
 * WHEN TO USE:
 * ============
 * - Admin/guard users cannot log in due to MFA issues
 * - MFA was enabled but secrets were not properly stored
 * - Users lost access to their authenticator app
 * - Testing MFA implementation after fixes
 * 
 * WHAT IT DOES:
 * =============
 * 1. Disables MFA for all admin/guard/super_admin users in users table
 * 2. Disables MFA in user_security_settings table (if exists)
 * 3. Clears all pending MFA login sessions
 * 4. Resets MFA secrets and backup codes
 * 
 * IMPORTANT:
 * ==========
 * - Users will need to re-enable MFA after logging in
 * - This is a recovery tool, not for regular use
 * - All MFA secrets and backup codes are deleted
 * 
 * SECURITY NOTE:
 * ==============
 * Only affects admin/guard/super_admin roles for safety.
 * Resident MFA settings are preserved.
 */

import { Client } from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('Please set DATABASE_URL in your .env file');
  process.exit(1);
}

async function restoreAccess() {
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Check if mfa_enabled column exists in users table
    const columnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'mfa_enabled'
      ) as exists
    `);
    
    if (columnCheck.rows[0].exists) {
      console.log('🔍 Found mfa_enabled column in users table');
      
      // Get list of users with MFA enabled
      const mfaUsers = await client.query(`
        SELECT id, username, email, role, mfa_enabled
        FROM users
        WHERE mfa_enabled = true AND role IN ('admin', 'guard', 'super_admin')
      `);
      
      console.log(`📊 Found ${mfaUsers.rows.length} admin/guard users with MFA enabled\n`);
      
      if (mfaUsers.rows.length > 0) {
        console.log('Users to be updated:');
        mfaUsers.rows.forEach(user => {
          console.log(`   - ${user.username} (${user.email}) - ${user.role}`);
        });
        
        // Disable MFA for these users
        const result = await client.query(`
          UPDATE users 
          SET mfa_enabled = false,
              mfa_secret = NULL,
              backup_codes = '[]'::jsonb,
              mfa_methods = '[]'::jsonb
          WHERE mfa_enabled = true 
            AND role IN ('admin', 'guard', 'super_admin')
        `);
        
        console.log(`\n✅ Disabled MFA for ${result.rowCount} user(s) in users table`);
      } else {
        console.log('ℹ️  No admin/guard users with MFA enabled in users table');
      }
    } else {
      console.log('ℹ️  mfa_enabled column does not exist in users table yet');
      console.log('   Run the migration first: npm run migrate:mfa\n');
    }
    
    // Also check user_security_settings table
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_security_settings'
      ) as exists
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('\n🔍 Found user_security_settings table');
      
      const settingsUsers = await client.query(`
        SELECT uss.user_id, u.username, u.email, u.role, uss.mfa_enabled
        FROM user_security_settings uss
        JOIN users u ON u.id = uss.user_id
        WHERE uss.mfa_enabled = true AND u.role IN ('admin', 'guard', 'super_admin')
      `);
      
      console.log(`📊 Found ${settingsUsers.rows.length} admin/guard users with MFA in user_security_settings\n`);
      
      if (settingsUsers.rows.length > 0) {
        console.log('Users in security settings:');
        settingsUsers.rows.forEach(user => {
          console.log(`   - ${user.username} (${user.email}) - ${user.role}`);
        });
        
        const result = await client.query(`
          UPDATE user_security_settings uss
          SET mfa_enabled = false,
              totp_secret = NULL,
              backup_codes = '[]'::jsonb,
              mfa_methods = '[]'::jsonb
          FROM users u
          WHERE uss.user_id = u.id 
            AND uss.mfa_enabled = true
            AND u.role IN ('admin', 'guard', 'super_admin')
        `);
        
        console.log(`\n✅ Disabled MFA for ${result.rowCount} user(s) in user_security_settings`);
      }
    }
    
    // Clear pending MFA sessions
    const sessionCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'additional_auth_sessions'
      ) as exists
    `);
    
    if (sessionCheck.rows[0].exists) {
      const sessionResult = await client.query(`
        DELETE FROM additional_auth_sessions 
        WHERE operation = 'login_mfa' 
        AND status = 'pending'
      `);
      
      if (sessionResult.rowCount > 0) {
        console.log(`\n✅ Cleared ${sessionResult.rowCount} pending MFA session(s)`);
      }
    }
    
    console.log('\n🎉 Emergency access restoration complete!');
    console.log('\n📝 Summary:');
    console.log('   - MFA has been disabled for all admin/guard users');
    console.log('   - Pending MFA sessions have been cleared');
    console.log('   - Users can now log in without MFA');
    console.log('\n⚠️  Important: Users should re-enable MFA after logging in');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nError details:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run restoration
restoreAccess().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
