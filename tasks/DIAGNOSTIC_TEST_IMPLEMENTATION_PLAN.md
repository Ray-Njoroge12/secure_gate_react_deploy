# Diagnostic API Test Implementation Plan
**Date:** November 25, 2025  
**Purpose:** Verify actual system functionality before launch via API-level testing

---

## Executive Summary

Created comprehensive diagnostic API test suite (`DIAGNOSTIC_API_TESTS.js`) to validate backend functionality independent of UI/automation layer. This allows us to distinguish **real functional issues** from **UI/selector drift** before making launch decisions.

---

## Test Coverage

### 1. Resident Flows (5 tests)
- ✅ **Login Authentication** - Validates resident can login with httpOnly cookies
- ✅ **Create Visitor (Valid)** - Tests single visitor invite creation with valid payload
- ✅ **Create Visitor (Invalid)** - Validates server-side validation (expects 400/422)
- ⚠️  **Bulk Invite** - Tests bulk visitor endpoint (may not be fully implemented)
- ✅ **Visitor History** - Tests basic history retrieval
- ✅ **Visitor History (Filtered)** - Tests query parameters (status, limit, etc.)

### 2. Guard Flows (4 tests)
- ✅ **Login Authentication** - Validates guard can login
- ✅ **Dashboard/Active Visitors** - Tests retrieving on-premise visitors
- ✅ **QR Scan Capability** - Tests visitor lookup (simulates QR scan)
- ✅ **Manual Search** - Tests search by phone number
- ⚠️  **Check-in Action** - Tests visitor check-in endpoint

### 3. Visitor Flows (3 tests)
- ✅ **Create Real Invite** - Sets up test data with actual invite token
- ⚠️  **Invite Page Token Lookup** - Tests public invite details endpoint
- ⚠️  **Kiosk Walk-in** - Tests kiosk registration endpoint

### 4. Cross-Role Flow (5 steps)
- ✅ **Resident Creates Invite** - Full API call to create visitor
- ✅ **Guard Checks In** - Uses created visitor ID for check-in
- ✅ **Verify in History** - Confirms visitor appears in resident's history with updated status

---

## Test Methodology

### Approach
- **API-first:** All tests call backend endpoints directly (no browser/UI)
- **Real authentication:** Uses actual login flow with httpOnly cookies
- **Real data:** Creates actual DB records (not mocks)
- **Status verification:** Checks HTTP status codes + response structure
- **Cross-role validation:** Verifies data flows between resident → guard → history

### Test Users
```javascript
resident@test.com / TestPass123!
guard@test.com    / TestPass123!
admin@test.com    / TestPass123!
```

### Endpoints Tested
```
POST   /api/auth/login
GET    /health

Resident:
POST   /api/visitors (create single)
POST   /api/visitors/bulk-invite
GET    /api/visitors (history + filters)

Guard:
GET    /api/visitors?status=on_premise
GET    /api/visitors?phone=...
POST   /api/visitors/:id/check-in

Visitor:
GET    /api/invite/:token
POST   /api/kiosk/walk-in
```

---

## Expected Outcomes

### Green (PASS) Indicates:
- Backend endpoint exists
- Returns 200/201 for valid requests
- Returns 400/422 for invalid requests
- Data structure is correct
- Cross-role data flows work

### Yellow (WARN) Indicates:
- Endpoint returns 404 (may not be implemented yet)
- Feature exists but uses different path/structure
- Minor issues that don't block core flows

### Red (FAIL) Indicates:
- Authentication broken
- Expected endpoint returns wrong status
- Data corruption or missing
- **Real functional issue requiring fix**

---

## How to Interpret Results for Launch

### Scenario 1: All PASS
- ✅ **Backend is functionally sound**
- ✅ **Launch-ready from API perspective**
- Remaining Puppeteer failures are **UI/selector drift only**
- Action: Can launch immediately OR optionally fix UI selectors for automation

### Scenario 2: Some WARN
- ✅ **Core flows work**
- ⚠️  **Some endpoints use different paths or aren't implemented**
- Action: Review each WARN individually:
  - If feature works via different path → Document and update tests
  - If feature truly missing → Assess if required for launch

### Scenario 3: Critical FAIL
- ❌ **Real functional issues found**
- ❌ **NOT launch-ready**
- Action: Fix each failing area before launch:
  - Auth failures → Block launch completely
  - Create/Read failures → Fix before launch
  - Check-in failures → Assess impact on guard workflow

---

## Running the Tests

### Prerequisites
```bash
# Ensure backend is running
cd secure-gate-access/server
npm start  # Should be on port 3001

# Ensure test users are seeded
node seed-test-users.js
```

### Execute
```bash
cd /Users/raynj/Desktop/secure-gate-react-express
node tasks/DIAGNOSTIC_API_TESTS.js
```

### Output
- **Console:** Real-time pass/fail with details
- **File:** `DIAGNOSTIC_TEST_REPORT.json` with full results

---

## Comparison to Puppeteer Tests

### Puppeteer Tests (TEST_EXECUTION_RUNNER.js)
- **What they test:** Full UI flows (login → click → fill → submit)
- **Failure modes:** Missing selectors, changed labels, timing issues, UI structure
- **Launch blocker?** Only if underlying function is broken

### Diagnostic API Tests (DIAGNOSTIC_API_TESTS.js)
- **What they test:** Backend endpoints, data integrity, auth, cross-role flows
- **Failure modes:** Missing endpoints, wrong status codes, broken logic
- **Launch blocker?** YES - indicates real functional gaps

### Strategy
1. **Run diagnostic tests first** → Get ground truth on backend
2. **If diagnostics pass** → Puppeteer failures are just automation drift
3. **If diagnostics fail** → Fix backend issues before touching UI
4. **Then decide** → Launch now or fix UI selectors for automation

---

## Technical Implementation

### Key Features
- **Dynamic ES module loading** for node-fetch v3 in CommonJS context
- **Cookie management** for httpOnly authentication
- **Sequential test execution** to avoid race conditions
- **Clear pass/fail reporting** with descriptive error messages
- **JSON output** for programmatic analysis

### Code Structure
```javascript
DiagnosticResults      // Tracks and reports all test results
loginUser()           // Authenticates and returns cookies
authRequest()         // Makes authenticated API calls
testResidentFlows()   // Resident test suite
testGuardFlows()      // Guard test suite
testVisitorFlows()    // Visitor test suite
testCrossRoleFlow()   // End-to-end cross-role test
runDiagnostics()      // Main orchestrator
```

---

## Next Steps

### Immediate (After Running Tests)
1. ✅ Execute `node tasks/DIAGNOSTIC_API_TESTS.js`
2. 📊 Review `DIAGNOSTIC_TEST_REPORT.json`
3. 📝 Create launch readiness report based on results

### If All Pass
4. ✅ System is functionally ready
5. 📋 Document that Puppeteer failures are UI drift
6. 🚀 **LAUNCH DECISION:** Can proceed or optionally fix selectors

### If Any Fail
4. ❌ Identify failing flows
5. 🔧 Fix backend issues
6. 🔄 Re-run diagnostics until green
7. 🚀 Then make launch decision

---

## Success Criteria for Launch

### Must Have (PASS required)
- ✅ Backend health check
- ✅ Resident login
- ✅ Guard login
- ✅ Create visitor (valid payload)
- ✅ Visitor history retrieval
- ✅ Basic cross-role flow (create → check-in → history)

### Nice to Have (WARN acceptable)
- ⚠️  Bulk invite (if not critical for day-1)
- ⚠️  Kiosk walk-in (if kiosk not deployed yet)
- ⚠️  Public invite page (if email flow works)

### Blockers (FAIL unacceptable)
- ❌ Any authentication failure
- ❌ Cannot create visitors
- ❌ Cannot retrieve history
- ❌ Guard check-in broken

---

## Documentation Generated

1. **DIAGNOSTIC_API_TESTS.js** - The test suite itself
2. **DIAGNOSTIC_TEST_IMPLEMENTATION_PLAN.md** - This document
3. **DIAGNOSTIC_TEST_REPORT.json** - Test results (generated on run)
4. **LAUNCH_READINESS_REPORT.md** - Final recommendation (to be created)

---

## Conclusion

This diagnostic approach gives us **objective, API-level proof** of what works and what doesn't, independent of UI automation challenges. It's the most reliable way to answer:

> "Is the system functionally ready to launch?"

Once we have the diagnostic results, we can make an informed, evidence-based launch decision.

---

**Status:** Implementation complete, ready for execution  
**Next:** Run tests and analyze results for launch readiness assessment
