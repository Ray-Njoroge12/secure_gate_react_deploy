import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import argon2 from 'argon2';
import { dbManager } from '../src/database/db.enhanced.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env files
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

async function upsertUser(user) {
    const passwordHash = await argon2.hash(user.password);

    // Simple check if columns exist (simplified for this specific script)
    // We assume standard checks pass or we just try insert

    // Check if user exists first
    const checkRes = await dbManager.query('SELECT id FROM users WHERE email = $1', [user.email]);

    if (checkRes.rows.length > 0) {
        // Update existing
        console.log('Updating existing Super Admin...');
        const updateRes = await dbManager.query(
            `UPDATE users SET
       password_hash = $2, role = $3, verified = $4, username = $5
       WHERE email = $1
       RETURNING id, username, email, role`,
            [user.email, passwordHash, user.role, user.verified ?? true, user.username]
        );
        return updateRes.rows[0];
    } else {
        // Insert new
        console.log('Inserting new Super Admin...');
        const insertRes = await dbManager.query(
            `INSERT INTO users (username, email, password_hash, role, verified, phone, area, house, notify_email, notify_sms)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, username, email, role`,
            [
                user.username,
                user.email,
                passwordHash,
                user.role,
                user.verified ?? true,
                user.phone,
                user.area,
                user.house,
                user.notifyEmail ?? true,
                user.notifySms ?? false
            ]
        );
        return insertRes.rows[0];
    }
}

async function run() {
    await dbManager.initializeAsync();

    console.log('Creating Super Admin...');

    const superAdmin = await upsertUser({
        username: 'superadmin',
        email: 'superadmin@securegate.com',
        password: 'SuperPass123!',
        role: 'super_admin',
        verified: true,
        phone: '+254799999999',
        area: 'HQ',
        house: 'ADMIN',
        notifyEmail: true,
        notifySms: true
    });

    console.log('Super Admin created:', superAdmin);
    await dbManager.disconnect();
}

run().catch(async (error) => {
    console.error('Failed to create super admin:', error);
    try {
        await dbManager.disconnect();
    } catch { }
    process.exit(1);
});
