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

async function upsertGuard(guard) {
    const passwordHash = await argon2.hash(guard.password);

    // Check if guard exists first
    const checkRes = await dbManager.query(
        'SELECT id, mfa_enabled FROM users WHERE email = $1', 
        [guard.email]
    );

    if (checkRes.rows.length > 0) {
        // Update existing
        console.log('Updating existing Guard...');
        const updateRes = await dbManager.query(
            `UPDATE users SET
             password_hash = $2, 
             role = $3, 
             verified = $4, 
             username = $5,
             phone = $6,
             area = $7,
             house = $8,
             estate_id = $9,
             mfa_enabled = COALESCE(mfa_enabled, $10),
             mfa_secret = COALESCE(mfa_secret, $11),
             backup_codes = COALESCE(backup_codes, $12)
             WHERE email = $1
             RETURNING id, username, email, role, mfa_enabled, estate_id`,
            [
                guard.email, 
                passwordHash, 
                guard.role, 
                guard.verified ?? true, 
                guard.username,
                guard.phone,
                guard.area,
                guard.house,
                guard.estate_id,
                false, // mfa_enabled - must be set up on first login
                null,  // mfa_secret
                null   // backup_codes
            ]
        );
        return updateRes.rows[0];
    } else {
        // Insert new guard
        console.log('Inserting new Guard...');
        const insertRes = await dbManager.query(
            `INSERT INTO users (
                username, email, password_hash, role, verified, 
                phone, area, house, estate_id,
                notify_email, notify_sms, 
                mfa_enabled, mfa_secret, backup_codes
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id, username, email, role, mfa_enabled, estate_id`,
            [
                guard.username,
                guard.email,
                passwordHash,
                guard.role,
                guard.verified ?? true,
                guard.phone,
                guard.area,
                guard.house,
                guard.estate_id,
                guard.notifyEmail ?? true,
                guard.notifySms ?? false,
                false, // mfa_enabled - must be set up on first login
                null,  // mfa_secret - will be generated during setup
                null   // backup_codes - will be generated during setup
            ]
        );
        return insertRes.rows[0];
    }
}

async function run() {
    await dbManager.initializeAsync();

    // Get guard details from environment or use defaults
    const username = process.env.GUARD_USERNAME || 'guard1';
    const email = process.env.GUARD_EMAIL || 'guard1@securegate.com';
    const password = process.env.GUARD_PASSWORD || 'GuardPass123!';
    const phone = process.env.GUARD_PHONE || '+254700000001';
    const area = process.env.GUARD_AREA || 'Main Gate';
    const estateId = process.env.GUARD_ESTATE_ID ? parseInt(process.env.GUARD_ESTATE_ID, 10) : null;

    console.log('Creating Guard Account...');
    console.log('========================================');

    // Validate estate_id if provided
    if (estateId) {
        const estateCheck = await dbManager.query(
            'SELECT id, name FROM estates WHERE id = $1',
            [estateId]
        );
        
        if (estateCheck.rows.length === 0) {
            console.error(`❌ Error: Estate with ID ${estateId} not found`);
            console.log('Available estates:');
            const estates = await dbManager.query('SELECT id, name FROM estates ORDER BY id');
            estates.rows.forEach(e => console.log(`  - ID ${e.id}: ${e.name}`));
            await dbManager.disconnect();
            process.exit(1);
        }
        
        console.log(`✓ Estate: ${estateCheck.rows[0].name} (ID: ${estateId})`);
    }

    const guard = await upsertGuard({
        username,
        email,
        password,
        role: 'guard',
        verified: true,
        phone,
        area,
        house: 'SECURITY',
        estate_id: estateId,
        notifyEmail: true,
        notifySms: true
    });

    console.log('========================================');
    console.log('✅ Guard Account Created/Updated:');
    console.log(`   ID: ${guard.id}`);
    console.log(`   Username: ${guard.username}`);
    console.log(`   Email: ${guard.email}`);
    console.log(`   Role: ${guard.role}`);
    console.log(`   Estate ID: ${guard.estate_id || 'Not assigned'}`);
    console.log(`   MFA Enabled: ${guard.mfa_enabled}`);
    console.log('========================================');
    
    if (!guard.mfa_enabled) {
        console.log('\n⚠️  SECURITY NOTICE: MFA Setup Required');
        console.log('───────────────────────────────────────');
        console.log('Multi-Factor Authentication (MFA) is REQUIRED for guard accounts.');
        console.log('');
        console.log('Setup Instructions:');
        console.log('1. Login with the credentials above');
        console.log('2. You will be prompted to setup MFA');
        console.log('3. Use Google Authenticator, Authy, or similar app');
        console.log('4. Scan the QR code displayed');
        console.log('5. Enter the 6-digit verification code');
        console.log('6. Save your backup codes securely');
        console.log('');
        console.log('⚠️  Without MFA setup:');
        console.log('   - Login will succeed');
        console.log('   - Access to guard features will be BLOCKED');
        console.log('   - Sensitive operations cannot be performed');
        console.log('───────────────────────────────────────\n');
    }
    
    await dbManager.disconnect();
}

run().catch(async (error) => {
    console.error('❌ Failed to create guard account:', error);
    try {
        await dbManager.disconnect();
    } catch { }
    process.exit(1);
});
