
import argon2 from 'argon2';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function resetAdminPassword() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL
    });

    try {
        console.log('🔒 Generating password hash...');
        const hash = await argon2.hash('AdminPass123!', {
            type: argon2.argon2id,
            memoryCost: 2 ** 16,
            timeCost: 3,
            parallelism: 1,
            hashLength: 32
        });

        console.log('🔑 Updating admin password...');
        const result = await pool.query(
            `UPDATE users 
       SET password_hash = $1, updated_at = NOW() 
       WHERE email = 'admin@securegate.com' 
       RETURNING id, email`,
            [hash]
        );

        if (result.rows.length === 0) {
            console.error('❌ Admin user not found!');
        } else {
            console.log(`✅ Password reset successfully for user: ${result.rows[0].email} (ID: ${result.rows[0].id})`);
        }
    } catch (err) {
        console.error('❌ Error resetting password:', err);
    } finally {
        await pool.end();
    }
}

resetAdminPassword();
