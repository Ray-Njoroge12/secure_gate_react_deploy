
import { dbManager } from './src/database/db.enhanced.js';

async function checkAuthStatus() {
    try {
        await dbManager.initializeAsync();

        const users = ['superadmin@securegate.com', 'admin@securegate.com', 'guard1@securegate.com'];

        // Check user columns first to ensure we request valid columns
        const columnsRes = await dbManager.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
    `);
        const columns = columnsRes.rows.map(r => r.column_name);
        console.log('Available columns:', columns.filter(c => ['mfa_enabled', 'mfa_secret', 'failed_login_attempts', 'account_locked_until'].includes(c)));

        for (const email of users) {
            console.log(`\nChecking user: ${email}`);
            const res = await dbManager.query(`
        SELECT id, username, email, role, 
               ${columns.includes('failed_login_attempts') ? 'failed_login_attempts,' : ''}
               ${columns.includes('account_locked_until') ? 'account_locked_until,' : ''}
               ${columns.includes('mfa_enabled') ? 'mfa_enabled,' : ''}
               ${columns.includes('mfa_secret') ? 'mfa_secret IS NOT NULL as has_mfa_secret' : ''}
        FROM users 
        WHERE email = $1
      `, [email]);

            if (res.rows.length === 0) {
                console.log('User not found!');
            } else {
                console.log('User Data:', res.rows[0]);
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await dbManager.disconnect();
    }
}

checkAuthStatus();
