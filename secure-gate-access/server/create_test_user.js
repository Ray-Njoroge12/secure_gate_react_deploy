
import { dbManager } from './src/database/db.enhanced.js';
import bcrypt from 'bcryptjs';

async function createTestUser() {
    try {
        await dbManager.initializeAsync();
        const hashedPassword = await bcrypt.hash('Password123!', 12);

        // Delete if exists
        await dbManager.query("DELETE FROM users WHERE username = 'testresident'");

        await dbManager.query(
            `INSERT INTO users (
                username, email, password_hash, first_name, last_name, phone, house,
                role, estate_id, verified, area,
                notify_email, notify_sms,
                created_at, updated_at
            ) VALUES (
                'testresident', 'testresident@example.com', $1, 'Test', 'Resident', '+254700000002', 'T1',
                'resident', 1, true, 'Residential',
                true, true,
                NOW(), NOW()
            )`,
            [hashedPassword]
        );
        console.log('Test resident created: testresident / Password123!');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await dbManager.disconnect();
        process.exit();
    }
}
createTestUser();
