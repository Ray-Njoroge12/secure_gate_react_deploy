
import { db } from '../src/database/db.enhanced.js';
import argon2 from 'argon2';
import crypto from 'crypto';

function resolveSuperAdminPassword() {
    const cliPassword = process.argv[2]?.trim();
    const envPassword = process.env.SUPER_ADMIN_PASSWORD?.trim();

    if (cliPassword) return cliPassword;
    if (envPassword) return envPassword;

    // Generate a strong one-time password when no explicit password is provided.
    return `${crypto.randomBytes(18).toString('base64url')}A1!`;
}

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
            const password = resolveSuperAdminPassword();
            const hash = await argon2.hash(password);
            await db.query(
                "UPDATE users SET password_hash = $1, mfa_enabled = COALESCE(mfa_enabled, $2) WHERE id = $3", 
                [hash, false, admin.id]
            );
            console.log('   Password has been reset successfully.');
            console.log(`   Password: ${password}`);
            console.log('   Source: CLI arg, SUPER_ADMIN_PASSWORD env var, or generated secure fallback');
            if (!admin.mfa_enabled) {
                console.log('   ⚠️  MFA setup required on first login');
            }
        } else {
            console.log('⚠️ No Super Admin found. Creating secure super admin...');
            const password = resolveSuperAdminPassword();
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
            console.log('   Source: CLI arg, SUPER_ADMIN_PASSWORD env var, or generated secure fallback');
            console.log('\n⚠️  IMPORTANT: MFA must be set up on first login!');
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

setupSuperAdmin();
