import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { dbManager } from '../src/database/db.enhanced.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

/**
 * Disable MFA for Development Testing
 * 
 * This script disables MFA for admin and guard users to facilitate
 * development testing without requiring QR code rescanning on every
 * server restart.
 * 
 * IMPORTANT: This is for DEVELOPMENT ONLY. Re-enable MFA before production deployment.
 */

async function disableMFA() {
    console.log('\n🔧 Disabling MFA for Development Testing...\n');

    try {
        await dbManager.initializeAsync();

        // Users to disable MFA for
        const targetUsers = [
            'admin@securegate.com',
            'guard1@securegate.com'
        ];

        console.log('Target users:', targetUsers.join(', '));

        // Update users to disable MFA
        const result = await dbManager.query(
            `UPDATE users 
       SET 
         mfa_enabled = $1,
         mfa_secret = NULL,
         backup_codes = NULL,
         updated_at = NOW()
       WHERE email = ANY($2::text[])
       RETURNING id, email, role, mfa_enabled`,
            [false, targetUsers]
        );

        if (result.rows.length === 0) {
            console.log('⚠️  No users were updated. Please check if the users exist.');
            console.log('   Expected users:', targetUsers);

            // Check what users actually exist
            const existingUsers = await dbManager.query(
                `SELECT email, role, mfa_enabled FROM users WHERE email = ANY($1::text[])`,
                [targetUsers]
            );

            if (existingUsers.rows.length > 0) {
                console.log('\n📋 Found users:');
                existingUsers.rows.forEach(user => {
                    console.log(`   - ${user.email} (${user.role}) - MFA: ${user.mfa_enabled}`);
                });
            } else {
                console.log('\n❌ No matching users found in database.');
                console.log('   Run seed script first: npm run db:seed');
            }
        } else {
            console.log('\n✅ Successfully disabled MFA for the following users:\n');
            result.rows.forEach(user => {
                console.log(`   ✓ ${user.email} (${user.role})`);
                console.log(`     - MFA Enabled: ${user.mfa_enabled}`);
                console.log(`     - User ID: ${user.id}\n`);
            });

            console.log('📝 Summary:');
            console.log(`   - Users updated: ${result.rows.length}/${targetUsers.length}`);
            console.log('   - MFA secrets cleared: Yes');
            console.log('   - Backup codes cleared: Yes\n');

            console.log('🎯 Next Steps:');
            console.log('   1. Restart the backend server (if running)');
            console.log('   2. Login as admin or guard without MFA prompt');
            console.log('   3. Test all features seamlessly\n');

            console.log('⚠️  IMPORTANT: Re-enable MFA before production deployment!');
            console.log('   See implementation_plan.md for re-enablement process.\n');
        }

    } catch (error) {
        console.error('\n❌ Error disabling MFA:', error.message);
        console.error('\nStack trace:', error.stack);
        process.exit(1);
    } finally {
        await dbManager.disconnect();
    }
}

// Execute the script
disableMFA().catch(async (error) => {
    console.error('\n❌ Script failed:', error.message);
    try {
        await dbManager.disconnect();
    } catch {
        // Ignore disconnect errors
    }
    process.exit(1);
});
