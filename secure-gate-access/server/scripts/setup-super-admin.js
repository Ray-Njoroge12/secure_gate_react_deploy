
import { db } from '../src/database/db.enhanced.js';
import argon2 from 'argon2';

async function setupSuperAdmin() {
    try {
        console.log('🔄 Connecting to database...');
        // Ensure DB connection is initialized
        if (db.initializeAsync) {
            await db.initializeAsync();
        }

        // Check for existing super admin by specific email for testing consistency
        const res = await db.query("SELECT *, mfa_enabled FROM users WHERE email = 'super.admin@securegate.com'");

        if (res.rows.length > 0) {
            const admin = res.rows[0];
            console.log('✅ Test Super Admin account already exists:');
            console.log(`   Email: ${admin.email}`);
            console.log(`   MFA Enabled: ${admin.mfa_enabled || false}`);
            // Force reset password for E2E consistency
            const password = 'SuperAdmin123!';
            const hash = await argon2.hash(password);
            await db.query(
                "UPDATE users SET password_hash = $1, mfa_enabled = COALESCE(mfa_enabled, $2) WHERE id = $3", 
                [hash, false, admin.id]
            );
            console.log('   Password has been reset to ensure E2E test access: SuperAdmin123!');
            if (!admin.mfa_enabled) {
                console.log('   ⚠️  MFA setup required on first login');
            }
        } else {
            console.log('⚠️ No Super Admin found. Creating default super admin...');
            const password = 'SuperAdmin123!';
            const hash = await argon2.hash(password);

            const newAdmin = await db.query(`
        INSERT INTO users (username, email, password_hash, role, account_status, mfa_enabled, mfa_secret, backup_codes)
        VALUES ($1, $2, $3, 'super_admin', 'active', $4, $5, $6)
        RETURNING id, username, email, mfa_enabled
      `, ['super_admin', 'super.admin@securegate.com', hash, false, null, null]);

            console.log('✅ Super Admin account created:');
            console.log(`   Email: ${newAdmin.rows[0].email}`);
            console.log(`   Password: ${password}`);
            console.log(`   MFA Enabled: ${newAdmin.rows[0].mfa_enabled}`);
            console.log('\n⚠️  IMPORTANT: MFA must be set up on first login!');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

setupSuperAdmin();
