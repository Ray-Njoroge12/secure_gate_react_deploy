import pkg from 'pg';
const { Pool } = pkg;
import argon2 from 'argon2';

const pool = new Pool({
    connectionString: 'postgresql://raynj@localhost:5432/secure_gate?sslmode=disable'
});

async function createGuardAccount() {
    const email = 'guard.test@securegate.com';
    const password = 'GuardPass123!';
    const hashedPassword = await argon2.hash(password);

    try {
        // Check if user exists
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

        if (existing.rows.length > 0) {
            console.log(`✅ User ${email} already exists`);
            // Update password
            await pool.query('UPDATE users SET password_hash = $1, account_status = $2 WHERE email = $3',
                [hashedPassword, 'active', email]);
            console.log(`✅ Password updated for ${email}`);
        } else {
            // Create new guard
            await pool.query(
                `INSERT INTO users (email, username, password_hash, role, account_status, estate_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 1, NOW(), NOW())`,
                [email, 'guard.test', hashedPassword, 'guard', 'active']
            );
            console.log(`✅ Created guard account: ${email}`);
        }

        console.log(`\n📋 Guard Credentials:`);
        console.log(`   Email: ${email}`);
        console.log(`   Password: ${password}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

createGuardAccount();
