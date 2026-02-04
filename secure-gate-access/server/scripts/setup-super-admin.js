
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
        const res = await db.query("SELECT * FROM users WHERE email = 'super.admin@securegate.com'");

        if (res.rows.length > 0) {
            const admin = res.rows[0];
            console.log('✅ Test Super Admin account already exists:');
            console.log(`   Email: ${admin.email}`);
            // Force reset password for E2E consistency
            const password = 'SuperAdmin123!';
            const hash = await argon2.hash(password);
            await db.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, admin.id]);
            console.log('   Password has been reset to ensure E2E test access: SuperAdmin123!');
        } else {
            console.log('⚠️ No Super Admin found. Creating default super admin...');
            const password = 'SuperAdmin123!';
            const hash = await argon2.hash(password);

            const newAdmin = await db.query(`
        INSERT INTO users (username, email, password_hash, role, account_status)
        VALUES ($1, $2, $3, 'super_admin', 'active')
        RETURNING id, username, email
      `, ['super_admin', 'super.admin@securegate.com', hash]);

            console.log('✅ Super Admin account created:');
            console.log(`   Email: ${newAdmin.rows[0].email}`);
            console.log(`   Password: ${password}`);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

setupSuperAdmin();
