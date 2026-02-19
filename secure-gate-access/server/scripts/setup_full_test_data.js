import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env files
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

import { dbManager } from '../src/database/db.enhanced.js';
import argon2 from 'argon2';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3001;

const USERS = {
    superAdmin: { email: 'superadmin@securegate.com', password: 'SuperAdmin123!', role: 'super_admin' },
    admin: { email: 'admin@securegate.com', password: 'AdminPass123!', role: 'admin' },
    guard: { email: 'guard1@securegate.com', password: 'GuardPass123!', role: 'guard' },
    resident: { email: 'resident1@securegate.com', password: 'ResidentPass123!', role: 'resident' }
};

async function run() {
    await dbManager.initializeAsync();
    console.log("🚀 Starting Full Test Data Setup...");

    try {
        // 1. Verify/Create Users
        for (const [key, user] of Object.entries(USERS)) {
            const res = await dbManager.query("SELECT id FROM users WHERE email = $1", [user.email]);
            if (res.rows.length === 0) {
                console.log(`⚠️ User ${key} (${user.email}) not found. Please run 'npm run seed' first.`);
            } else {
                console.log(`✅ User ${key} exists (ID: ${res.rows[0].id})`);
            }
        }

        // Get IDs
        const resident = (await dbManager.query("SELECT id, estate_id FROM users WHERE email = $1", [USERS.resident.email])).rows[0];
        const guard = (await dbManager.query("SELECT id, email, role, estate_id FROM users WHERE email = $1", [USERS.guard.email])).rows[0];

        if (!resident || !guard) {
            console.error("❌ Critical: Resident or Guard not found. Aborting.");
            return;
        }

        const estateId = resident.estate_id;

        // 3. Create Visitors for Manual Check Testing
        // Visitor 1: Active (Checked In)
        await createVisitor({
            name: "Manual Check Active",
            phone: "+254711000001",
            status: "CHECKED_IN",
            host_id: resident.id,
            estate_id: estateId,
            check_in: new Date()
        });

        // Visitor 2: Pending (For Check In)
        await createVisitor({
            name: "Manual Check Pending",
            phone: "+254711000002",
            status: "PENDING",
            host_id: resident.id,
            estate_id: estateId,
            date_of_visit: new Date()
        });

        // Visitor 3: OTP Sent (For OTP Verification)
        const otp = "123456";
        const otpHash = await argon2.hash(otp);
        await createVisitor({
            name: "Manual Check OTP",
            phone: "+254711000003",
            status: "OTP_SENT",
            host_id: resident.id,
            estate_id: estateId,
            otp_hash: otpHash,
            otp_expires_at: new Date(Date.now() + 3600000), // 1 hour
            otp_attempts: 0
        });
        console.log(`🔑 OTP Created for 'Manual Check OTP': ${otp}`);

        console.log("✅ Test Data Generation Complete.");

        // 5. Output Credentials
        console.log("\n============================================");
        console.log("🔐 USER CREDENTIALS FOR TESTING");
        console.log("============================================");
        Object.values(USERS).forEach(u => {
            console.log(`Role: ${u.role.padEnd(12)} | Email: ${u.email.padEnd(30)} | Pass: ${u.password}`);
        });

        // 6. Generate Verification Curl
        const token = jwt.sign(
            { id: guard.id, email: guard.email, role: guard.role, estate_id: guard.estate_id },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        console.log("\n============================================");
        console.log("🛠  DEBUG VERIFICATION COMMAND");
        console.log("============================================");
        console.log("Run this command in your terminal to verify the API directly:");
        console.log(`\ncurl -v "http://localhost:${PORT}/api/visitors?search=Manual" \\
  -H "Authorization: Bearer ${token}"\n`);
        console.log("If this returns data, the issue is in the Frontend (ManualCheck.jsx).");
        console.log("If this returns empty data, the issue is in the Backend (visitorInviteController.js).");
        console.log("Note: Port is detected as", PORT);
        console.log("============================================\n");


    } catch (e) {
        console.error("❌ Error:", e);
    } finally {
        await dbManager.disconnect();
    }
}

async function createVisitor(data) {
    const inviteCode = `inv_${crypto.randomBytes(8).toString('hex')}`;
    const visitorToken = `vst_${crypto.randomBytes(8).toString('hex')}`;

    // Check if exists to avoid duplicates
    const check = await dbManager.query("SELECT id FROM visitors WHERE phone = $1 AND status = $2", [data.phone, data.status]);
    if (check.rows.length > 0) return;

    await dbManager.query(`
        INSERT INTO visitors (
            name, phone, email, status, host_id, estate_id, 
            date_of_visit, check_in_time, otp_hash, otp_expires_at, otp_attempts,
            invite_code, visitor_token, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
    `, [
        data.name,
        data.phone,
        `test_${Date.now()}@example.com`,
        data.status,
        data.host_id,
        data.estate_id,
        data.date_of_visit || new Date(),
        data.check_in || null,
        data.otp_hash || null,
        data.otp_expires_at || null,
        data.otp_attempts || 0,
        inviteCode,
        visitorToken
    ]);
    console.log(`✅ Created Visitor: ${data.name} (${data.status})`);
}

run();
