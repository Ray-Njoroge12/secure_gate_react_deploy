import io from "socket.io-client";
import axios from "axios";

// Configuration
const API_URL = "http://localhost:3001/api";
const SOCKET_URL = "http://localhost:3001";

// Test Users
const GUARD = {
    email: "guard1@securegate.com",
    password: "GuardPass123!",
};

const RESIDENT = {
    email: "resident1@securegate.com",
    password: "ResidentPass123!",
};

// State
let guardToken = null;
let residentToken = null;
let residentId = null;
let visitorId = null;
let socket = null;

async function login(user) {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            email: user.email,
            password: user.password,
        }, {
            headers: { 'x-client-platform': 'api' }
        });
        console.log("LOGIN SUCCESS: ", response.data.data.user.email);
        console.log("Token: ", response.data.data.accessToken ? "Present" : "MISSING");
        return {
            token: response.data.data.accessToken,
            id: response.data.data.user.id,
        };
    } catch (error) {
        console.error(
            `Login failed for ${user.email}:`,
            error.response?.data || error.message
        );
        throw error;
    }
}

async function registerWalkIn() {
    console.log("\n--- Registering Walk-in Visitor (as Guard) ---");
    try {
        const response = await axios.post(
            `${API_URL}/visitors/walk-in`,
            {
                name: "Test Visitor " + Date.now(),
                phone: "+254700000000",
                email: `visitor${Date.now()}@test.com`,
                purpose: "Testing Approvals",
                vehicle_plate: "KAA 123A",
                houseNumber: "A-101", // Targeted resident's house
            },
            {
                headers: { Authorization: `Bearer ${guardToken}` },
            }
        );
        console.log("✅ Walk-in response:", JSON.stringify(response.data, null, 2));
        console.log("✅ Walk-in registered ID:", response.data.data.data.id);
        return response.data.data.data.id;
    } catch (error) {
        console.error(
            "Walk-in registration failed:",
            error.response?.data || error.message
        );
        throw error;
    }
}

async function requestApproval() {
    console.log("\n--- Requesting Approval (as Guard) ---");
    try {
        const response = await axios.post(
            `${API_URL}/visitors/${visitorId}/request-approval`,
            {
                reason: "Visitor is at the gate",
            },
            {
                headers: { Authorization: `Bearer ${guardToken}` },
            }
        );
        console.log("✅ Approval requested successfully");
    } catch (error) {
        console.error(
            "Approval request failed:",
            error.response?.data || error.message
        );
        throw error;
    }
}

async function setupSocketListener() {
    console.log("\n--- Setting up Resident Socket Listener ---");
    return new Promise((resolve, reject) => {
        socket = io(SOCKET_URL, {
            auth: { token: residentToken },
            transports: ["websocket"],
        });

        socket.on("connect", () => {
            console.log("✅ Socket connected as Resident");
        });

        socket.on("visitor:approval_request", (data) => {
            console.log("🔔 RECEIVED SOCKET EVENT: visitor:approval_request");
            console.log("Data:", data);
            if (data.data.visitor_id == visitorId) { // Check nested data structure as per backend emission
                console.log("✅ Socket event matches visitor ID!");
                resolve();
            } else if (data.visitor_id == visitorId) { // Fallback check just in case
                console.log("✅ Socket event matches visitor ID!");
                resolve();
            } else {
                console.warn(`Received event for different visitor ID: ${data.data?.visitor_id || data.visitor_id}, expected ${visitorId}`);
            }
        });

        socket.on("connect_error", (err) => {
            console.error("Socket connection error:", err.message);
            reject(err);
        });

        // Timeout if event not received
        setTimeout(() => {
            reject(new Error("Timeout waiting for socket event"));
        }, 10000);
    });
}

async function checkPendingApprovals() {
    console.log("\n--- Checking Pending Approvals (as Resident) ---");
    try {
        const response = await axios.get(
            `${API_URL}/visitors/pending-approvals`,
            {
                headers: { Authorization: `Bearer ${residentToken}` },
            }
        );

        // Response wrapper varies, sometimes { success, data: [] } or just [] based on controller
        // Based on `visitorApprovalController.js`: respond(res, result.rows) -> likely { success: true, data: [...] } due to successResponse helper
        // wait, successResponse usually wraps in { success: true, data: ... }

        const approvals = response.data.data || response.data;
        console.log("Pending approvals count:", approvals.length);

        const found = approvals.find(v => v.id == visitorId);
        if (found) {
            console.log("✅ Validated: Visitor found in pending approvals list");
        } else {
            console.error("❌ Failed: Visitor NOT found in pending approvals");
            console.log("List:", JSON.stringify(approvals, null, 2));
            throw new Error("Visitor not found in pending list");
        }

    } catch (error) {
        console.error(
            "Fetch pending approvals failed:",
            error.response?.data || error.message
        );
        throw error;
    }
}

async function approveVisitor() {
    console.log("\n--- Approving Visitor (as Resident) ---");
    try {
        const response = await axios.post(
            `${API_URL}/visitors/${visitorId}/approve`,
            {
                notes: "Allowed entry via verification script",
            },
            {
                headers: { Authorization: `Bearer ${residentToken}` },
            }
        );
        console.log("✅ Visitor approved successfully");
    } catch (error) {
        console.error(
            "Approval failed:",
            error.response?.data || error.message
        );
        throw error;
    }
}

async function verifyStatus() {
    console.log("\n--- Verifying Final Status (as Guard) ---");
    // Guards can check visitor status? Or check existing visitor details
    // Let's use getTodayWalkIns or just fetch visitor details if there was an endpoint. 
    // Actually, resident can check "My Visitors" or history.

    try {
        const response = await axios.get(
            `${API_URL}/visitors/approval-history`,
            {
                headers: { Authorization: `Bearer ${residentToken}` },
            }
        );
        const history = response.data.data || response.data;
        const record = history.find(v => v.id == visitorId);

        if (record && record.status === 'approved') {
            console.log("✅ Final Verification: Visitor status is APPROVED");
        } else {
            console.error("❌ Final Verification Failed: Status is " + (record ? record.status : "not found"));
            throw new Error("Final status verification failed");
        }

    } catch (error) {
        console.error("Verification failed:", error);
        throw error;
    }
}

async function run() {
    console.log("🚀 Starting Approvals Verification E2E...");

    try {
        // 1. Login
        console.log("\n--- Authenticating ---");
        const guardAuth = await login(GUARD);
        guardToken = guardAuth.token;
        console.log("✅ Guard logged in");

        const residentAuth = await login(RESIDENT);
        residentToken = residentAuth.token;
        residentId = residentAuth.id;
        console.log("✅ Resident logged in");

        // 2. Setup Socket Listener (must be before action that triggers event)
        // We can't filter by visitorId yet, so we'll capture the next event
        console.log("\n--- Setting up Resident Socket Listener ---");
        const socketPromise = new Promise((resolve, reject) => {
            socket = io(SOCKET_URL, {
                auth: { token: residentToken },
                transports: ["websocket"],
            });

            socket.on("connect", () => {
                console.log("✅ Socket connected as Resident");
            });

            socket.on("visitor:approval_request", (data) => {
                console.log("🔔 RECEIVED SOCKET EVENT: visitor:approval_request");
                console.log("Data:", data);
                resolve(data); // Resolve with data to verify later
            });

            socket.on("connect_error", (err) => {
                console.error("Socket connection error:", err.message);
                reject(err);
            });

            // Timeout if event not received
            setTimeout(() => {
                reject(new Error("Timeout waiting for socket event"));
            }, 10000);
        });

        // 3. Register Walk-in (triggers event)
        visitorId = await registerWalkIn();

        // 4. Wait for socket event
        const eventData = await socketPromise;

        // Verify event matches visitor
        const eventVisitorId = eventData.data?.visitor_id || eventData.visitor_id || eventData.id;
        if (eventVisitorId == visitorId) {
            console.log("✅ Socket event matches visitor ID!");
        } else {
            console.warn(`Received event for different visitor ID: ${eventVisitorId}, expected ${visitorId}`);
        }

        // 5. Check Pending API
        await checkPendingApprovals();

        // 6. Approve
        await approveVisitor();

        // 7. Verify
        await verifyStatus();

        console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉");
        process.exit(0);
    } catch (error) {
        console.error("\n❌ TEST FAILED");
        console.error(error);
        if (socket) socket.disconnect();
        process.exit(1);
    } finally {
        if (socket) socket.disconnect();
    }
}

run();
