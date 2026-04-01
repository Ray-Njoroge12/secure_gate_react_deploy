
import { dbManager } from '../src/database/db.enhanced.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
    try {
        await dbManager.initializeAsync();

        console.log('Reverting MFA Changes...');

        // 1. Disable MFA for users
        // We explicitly set mfa_enabled to false for the users we likely touched, or all of them to be safe if we want to reset.
        // The previous script targeted admin, guard1, resident1.
        await dbManager.query(
            "UPDATE users SET mfa_enabled = false, mfa_methods = NULL WHERE username IN ('admin', 'guard1', 'resident1')"
        );
        console.log('MFA disabled for admin, guard1, resident1.');

        // 2. Drop the tables we created
        // The script fix_mfa_schema_and_enable.js created: user_mfa_secrets, user_otp_codes, user_backup_codes
        // IF EXISTS to be safe.

        await dbManager.query('DROP TABLE IF EXISTS user_mfa_secrets CASCADE');
        console.log('Dropped user_mfa_secrets.');

        await dbManager.query('DROP TABLE IF EXISTS user_otp_codes CASCADE');
        console.log('Dropped user_otp_codes.');

        await dbManager.query('DROP TABLE IF EXISTS user_backup_codes CASCADE');
        console.log('Dropped user_backup_codes.');

        // We also added columns to users: mfa_enabled, mfa_methods. 
        // Ideally we should leave these if they were there before, or drop them if they were part of the "changes".
        // My previous analysis (Step 202-204) showed these columns might have been missing or I couldn't find them in the logs.
        // But check_mfa_status.js (Step 248) showed mfa_enabled was NOT in the users table result originally? 
        // Wait, Step 248 result showed: 
        // [ { role: 'admin', ..., mfa_enabled: false }, ... ]
        // The query in check_mfa_status.js was:
        // SELECT u.role, ..., s.mfa_enabled FROM users u LEFT JOIN user_security_settings s ...
        // So mfa_enabled was in user_security_settings, NOT users.

        // The script fix_mfa_schema_and_enable.js did:
        // ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT false;
        // ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_methods JSONB DEFAULT NULL;

        // So I effectively migrated MFA from user_security_settings (or wherever it was supposed to be) to users table.
        // If I want to "undo all changes", I should drop these columns too?
        // User said "go back to the point where you gae me the credentials".
        // At that point (Step 254), I had NOT created these columns.
        // However, if the app expects them (because of valid code), dropping them might break things if I don't revert the code.
        // But the user reverted the controller code. Did they revert other code?
        // The user requests "undo all changes".
        // I will drop the columns from the users table to be thorough, returning schema to prior state.

        await dbManager.query('ALTER TABLE users DROP COLUMN IF EXISTS mfa_enabled');
        console.log('Dropped column mfa_enabled from users.');

        await dbManager.query('ALTER TABLE users DROP COLUMN IF EXISTS mfa_methods');
        console.log('Dropped column mfa_methods from users.');

        console.log('Revert Complete.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await dbManager.disconnect();
    }
}

run();
