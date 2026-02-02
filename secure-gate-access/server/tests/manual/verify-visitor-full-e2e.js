import axios from 'axios';

// Configuration
const API_URL = 'http://localhost:3001/api';
const RESIDENT_EMAIL = 'resident1@securegate.com';
const RESIDENT_PASSWORD = 'ResidentPass123!';

// ANSI Colors for output
const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32m",
    red: "\x1b[31m",
    blue: "\x1b[34m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m"
};

const log = (msg, color = colors.reset) => console.log(`${color}${msg}${colors.reset}`);

// Main Verification Function
async function runVerification() {
    log('\n🚀 Starting Visitor Lifecycle Verification (Invite -> Public Confirm)...\n', colors.cyan);

    let residentToken;
    let visitorToken;
    let inviteCode;

    // 1. Resident Login
    try {
        log('--- Step 1: Resident Login ---', colors.blue);
        const loginResp = await axios.post(`${API_URL}/auth/login`, {
            email: RESIDENT_EMAIL,
            password: RESIDENT_PASSWORD
        }, {
            headers: { 'x-client-platform': 'api' }
        });

        console.log('DEBUG: Login Response:', JSON.stringify(loginResp.data, null, 2));

        residentToken = loginResp.data.data.accessToken;
        log(`✅ Resident logged in.`, colors.green);
    } catch (error) {
        log(`❌ Login failed: ${error.message}`, colors.red);
        process.exit(1);
    }

    // 2. Create Single Invite
    try {
        log('\n--- Step 2: Create Single Invite ---', colors.blue);
        const invitePayload = {
            name: `E2E Visitor ${Date.now()}`,
            phone: "+254712345678",
            dateOfVisit: new Date().toISOString().split('T')[0], // Today
            purpose: "E2E Validation",
            email: "visitor.test@example.com"
        };

        const createResp = await axios.post(`${API_URL}/visitors`, invitePayload, {
            headers: { Authorization: `Bearer ${residentToken}` }
        });

        visitorToken = createResp.data.data.visitorToken || createResp.data.visitorToken;
        inviteCode = createResp.data.data.inviteCode || createResp.data.inviteCode;

        if (!visitorToken) {
            throw new Error('Visitor Token not returned in creation response');
        }

        log(`✅ Invite Created. Token: ${visitorToken}, Code: ${inviteCode}`, colors.green);
    } catch (error) {
        log(`❌ Create Invite failed: ${JSON.stringify(error.response?.data || error.message, null, 2)}`, colors.red);
        process.exit(1);
    }

    // 3. Visitor Access (Public Endpoint)
    try {
        log('\n--- Step 3: Visitor Accesses Public Link ---', colors.blue);
        // No Auth Header - Public Access
        const accessResp = await axios.get(`${API_URL}/public/visitors/by-token/${visitorToken}`);

        if (accessResp.data.success) {
            log(`✅ Visitor details retrieved publically. Name: ${accessResp.data.data.name}`, colors.green);
        } else {
            throw new Error('Public access returned success: false');
        }

    } catch (error) {
        log(`❌ Public Access failed: ${error.response?.data?.error || error.message}`, colors.red);
        process.exit(1);
    }

    // 4. Visitor Confirmation (Public Endpoint)
    try {
        log('\n--- Step 4: Visitor Confirms Details ---', colors.blue);
        const confirmPayload = {
            consent: {
                dataProcessing: true,
                privacyPolicy: true
            },
            additionalInfo: {
                idNumber: "ID-999888",
                vehiclePlate: "KDA 001"
            }
        };

        const confirmResp = await axios.post(`${API_URL}/public/visitors/${visitorToken}/confirm`, confirmPayload);

        if (confirmResp.data.success && confirmResp.data.data.qrCode) {
            const { status } = confirmResp.data.data.visitor;
            log(`✅ Visit Confirmed. Status: ${status}`, colors.green);
            log(`✅ QR Code Data URL received (Length: ${confirmResp.data.data.qrCode.dataUrl.length})`, colors.green);
        } else {
            throw new Error('Confirmation response missing success or QR code');
        }

    } catch (error) {
        log(`❌ Confirmation failed: ${error.response?.data?.error || error.message}`, colors.red);
        process.exit(1);
    }

    log('\n🎉 ALL VISITOR MODULES VERIFIED SUCCESSFULLY! 🎉', colors.green);
}

runVerification();
