# Master Testing Roadmap - Secure Gate System
**Complete Pre-Launch Testing Framework**

**Date:** November 25, 2025  
**Version:** 1.0  
**Status:** Ready for Execution

---

## Document Index

This master roadmap references the following comprehensive documents:

1. **SYSTEM_ARCHITECTURE_ANALYSIS.md** - Complete system inventory (39 pages, 40+ APIs)
2. **AUTOMATED_TEST_SPECIFICATIONS.md** - Detailed automated test specs (partial - to be completed)
3. **MANUAL_TEST_GUIDE_RESIDENT.md** - 30-minute resident UAT script
4. **MANUAL_TEST_GUIDE_GUARD.md** - 25-minute guard UAT script
5. **MANUAL_TEST_GUIDE_ADMIN.md** - 20-minute admin UAT script
6. **MANUAL_TEST_GUIDE_VISITOR.md** - 15-minute visitor UAT script
7. **TEST_EXECUTION_RUNNER.js** - Existing Puppeteer automated runner
8. **FUNCTIONAL_TEST_PLAN.md** - Existing 22-scenario test plan

---

## Executive Summary

### Testing Scope
```
Frontend Pages:      39 pages (100% coverage required)
Backend APIs:        150+ endpoints (100% critical path)
User Roles:          4 types (Resident, Guard, Admin, Visitor)
Test Duration:       ~6 hours (Phase 1-5) + ongoing regression
Test Team:           Minimum 3 testers (can be same person in sequence)
```

### Success Criteria
```
Automated Tests:     90%+ pass rate (11 tests in runner)
Manual Tests:        100% pass (all 4 user types)
Security Tests:      0 critical vulnerabilities
Performance:         <3s page load, <500ms API response
Mobile:              100% feature parity, usable on 375px width
Cross-browser:       Chrome, Firefox, Safari (latest versions)
```

---

## Phase 1: Environment Setup & Backend Start (30 min)

### 1.1 Prerequisites Checklist
```
□ PostgreSQL 15 installed and running
□ Redis installed and running (optional for session management)
□ Node.js 18+ installed
□ npm packages installed (frontend and backend)
□ .env.local configured with valid database credentials
```

### 1.2 Database Setup
```
□ Database exists: secure_gate
□ User exists: secure_gate_user (with correct password)
□ All migrations run successfully
□ Test users seeded:
  □ resident@test.com / TestPass123!
  □ guard@test.com / TestPass123!
  □ admin@test.com / TestPass123!

COMMAND:
cd secure-gate-access/server
npm run db:migrate (if migrations exist)
npm run db:seed:test (if seed script exists)
```

### 1.3 Start Backend
```
COMMAND:
cd secure-gate-access/server
npm start

VERIFY:
□ Server starts on port 3001
□ Console shows: "Server running on port 3001"
□ Console shows: "Database connected"
□ No error messages

TEST:
curl http://localhost:3001/api/health
Expected: {"status":"ok","database":"connected"}
```

### 1.4 Start Frontend
```
COMMAND:
cd secure-gate-access/client
npm start

VERIFY:
□ Dev server starts on port 3000
□ Browser auto-opens to http://localhost:3000
□ Login page loads
□ No compilation errors
```

### 1.5 Update Test Runner Config
```
FILE: tasks/TEST_EXECUTION_RUNNER.js

CHANGE:
apiUrl: 'http://localhost:5000'  →  'http://localhost:3001'

VERIFY CONFIG:
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  apiUrl: 'http://localhost:3001',  ← UPDATED
  headless: true
};
```

**Phase 1 Complete:** Backend and frontend running, test users seeded

---

## Phase 2: Automated Test Execution (15 min)

### 2.1 Run Automated Test Suite
```
COMMAND:
REACT_APP_TEST_MODE=true HEADLESS=true node tasks/TEST_EXECUTION_RUNNER.js

EXPECTED OUTPUT:
✅ R-01: Resident Login with MFA
✅ R-02: AddVisitor Single Invite
✅ R-03: AddVisitor Validation
✅ R-04: BulkInvite Wizard
✅ R-06: VisitorHistory Filters
✅ G-01: Guard Login & Dashboard
✅ G-02: ScanQR - Valid Code
✅ G-04: ManualCheck - Search & Actions
✅ V-01: VisitorInvitePage - Valid Invite
✅ V-03: SelfCheckInKiosk - Walk-In Flow
✅ X-01: Cross-Role Flow

Target: 9/11 tests passing (80%)
```

### 2.2 Analyze Test Results
```
□ Review TEST_EXECUTION_REPORT.json
□ Categorize failures:
  - Authentication issues
  - Element selector issues
  - API communication issues
  - Timing issues
  - Data issues

□ Document failures for fixing
□ Proceed with manual tests even if some automated tests fail
  (Manual tests validate system beyond automation)
```

**Phase 2 Complete:** Automated baseline established

---

## Phase 3: Manual Testing - All User Types (90 min)

### 3.1 Resident Testing (30 min)
```
DOCUMENT: MANUAL_TEST_GUIDE_RESIDENT.md
TESTER: Assign tester as "Resident User"
LOGIN: resident@test.com / TestPass123!

SECTIONS TO COMPLETE:
□ 1. Authentication & Dashboard (5 min)
□ 2. Single Visitor Invite (8 min)
□ 3. Form Validation (5 min)
□ 4. Bulk CSV Upload (7 min)
□ 5. Visitor History & Filters (5 min)
□ 6. Privacy Dashboard (4 min)
□ 7. Logout & Re-login (1 min)

DELIVERABLE:
□ Completed test script with PASS/FAIL marks
□ List of issues found
□ Screenshots of critical bugs (if any)

CRITICAL PATH VERIFICATION:
□ Can create single visitor invite successfully
□ QR code generates correctly
□ Visitor appears in history
```

### 3.2 Guard Testing (25 min)
```
DOCUMENT: MANUAL_TEST_GUIDE_GUARD.md
TESTER: Assign tester as "Security Guard"
LOGIN: guard@test.com / TestPass123!

SECTIONS TO COMPLETE:
□ 1. Guard Dashboard (3 min)
□ 2. QR Code Scanning (8 min)
□ 3. Manual Check-In/Out (7 min)
□ 4. Walk-In Registration (5 min)
□ 5. Incident Reporting (3 min)
□ 6. Visitor History (3 min)
□ 7. Mobile/Tablet Testing (2 min)
□ 8. Logout & Security (1 min)

DELIVERABLE:
□ Completed test script
□ QR scanning validated (valid and invalid codes)
□ Check-in/out flow verified

CRITICAL PATH VERIFICATION:
□ Can scan valid QR code
□ Can check in visitor manually
□ Can check out visitor
□ Invalid QR codes rejected properly
```

### 3.3 Admin Testing (20 min)
```
DOCUMENT: MANUAL_TEST_GUIDE_ADMIN.md
TESTER: Assign tester as "System Administrator"
LOGIN: admin@test.com / TestPass123!

SECTIONS TO COMPLETE:
□ 1. Admin Dashboard (3 min)
□ 2. User Management (7 min)
□ 3. System Reports (4 min)
□ 4. System Settings (3 min)
□ 5. Access Control (2 min)
□ 6. Visitor Log (2 min)
□ 7. Security Test (1 min)

DELIVERABLE:
□ Completed test script
□ User CRUD operations verified
□ Role-based access confirmed

CRITICAL PATH VERIFICATION:
□ Can create new users (resident/guard)
□ Can disable/enable users
□ Can access all system areas
□ Reports generate correctly
```

### 3.4 Visitor Testing (15 min)
```
DOCUMENT: MANUAL_TEST_GUIDE_VISITOR.md
TESTER: External person (no system access)
NO LOGIN REQUIRED

SECTIONS TO COMPLETE:
□ 1. Invite Page View (3 min)
□ 2. Kiosk Walk-In Registration (8 min)
□ 3. Pre-Registered Visitor (2 min)
□ 4. Arrival at Gate (2 min)

DELIVERABLE:
□ Completed test script
□ Visitor experience feedback
□ Mobile usability assessment

CRITICAL PATH VERIFICATION:
□ Invite page loads without login
□ QR code is scannable
□ Kiosk walk-in completes successfully
□ Instructions are clear
```

**Phase 3 Complete:** All 4 user types tested manually

---

## Phase 4: Cross-Role Integration Testing (30 min)

### 4.1 Complete Visitor Lifecycle Test
```
ACTORS: Resident, Visitor, Guard

SCENARIO:
1. RESIDENT creates invite
   □ Login as resident
   □ Create visitor invite for "Integration Test"
   □ Copy invite link
   □ Note QR code value

2. VISITOR receives invite
   □ Open invite link (no login)
   □ Verify details displayed
   □ Screenshot QR code

3. VISITOR arrives at gate
   □ Show QR code

4. GUARD processes visitor
   □ Login as guard
   □ Scan QR code
   □ Check in visitor
   □ Verify status: Active

5. RESIDENT verifies
   □ Login as resident
   □ Check visitor history
   □ Verify visitor shows as "Active"

6. VISITOR exits
   □ GUARD checks out visitor
   □ Verify status: Exited

7. RESIDENT confirms
   □ Refresh history
   □ Verify visitor shows as "Exited"
   □ Verify timestamps correct

PASS CRITERIA:
□ Data consistent across all roles
□ Status updates in real-time (or acceptable delay)
□ Complete audit trail exists
```

### 4.2 Walk-In Approval Flow
```
ACTORS: Visitor (kiosk), Guard, Resident

SCENARIO:
1. VISITOR uses kiosk (no pre-invite)
   □ Navigate to kiosk
   □ Register as walk-in
   □ Select a resident as host
   □ Complete registration

2. GUARD sees pending walk-in
   □ Check dashboard or manual check
   □ Verify walk-in appears in pending
   □ Review details
   □ Approve walk-in

3. GUARD checks in walk-in
   □ Search for approved walk-in
   □ Check in visitor

4. RESIDENT receives notification (if configured)
   □ Login as resident
   □ Check visitor history
   □ Verify walk-in visitor appears

5. VISITOR completes visit
   □ GUARD checks out visitor

PASS CRITERIA:
□ Walk-in flow completes end-to-end
□ All role perspectives show correct data
□ Approval process works
```

**Phase 4 Complete:** Cross-role workflows validated

---

## Phase 5: Security & Performance Testing (60 min)

### 5.1 Security Tests (30 min)

#### SQL Injection Test
```
ATTACK VECTORS:
□ Login form: username: admin'--
□ Visitor search: ' OR '1'='1
□ Any text input: '; DROP TABLE users; --

EXPECTED:
□ All inputs sanitized
□ No SQL errors exposed to frontend
□ Invalid characters rejected or escaped
```

#### XSS Prevention Test
```
ATTACK VECTORS:
□ Visitor name: <script>alert('XSS')</script>
□ Purpose: <img src=x onerror=alert('XSS')>

EXPECTED:
□ Scripts do not execute
□ HTML escaped in display
□ CSP blocks inline scripts
```

#### Authentication Security
```
TESTS:
□ Login with wrong password → 401, no hints
□ Access /dashboard/admin without login → Redirect to login
□ Access /dashboard/admin as resident → 403 Forbidden
□ Logout → Session invalidated
□ Try reusing old token after logout → 401 Unauthorized
□ Check httpOnly cookie:
  - Open DevTools → Application → Cookies
  - Verify accessToken has httpOnly=true
  - Verify cannot access via document.cookie
```

#### Session Security
```
TESTS:
□ Login on Device A
□ Login on Device B (same user)
□ Logout on Device A
□ Try using Device A again → Session expired
□ Device B still works (or both invalidate - depends on design)
```

### 5.2 Performance Tests (20 min)

#### Page Load Performance
```
TOOL: Chrome DevTools Lighthouse

PAGES TO TEST:
□ Login page
□ Resident Dashboard
□ Guard Dashboard
□ Visitor Invite Page

METRICS:
□ First Contentful Paint < 1.8s
□ Largest Contentful Paint < 2.5s
□ Time to Interactive < 3.8s
□ Cumulative Layout Shift < 0.1

TARGET: 90+ Performance score
```

#### API Response Time
```
TOOL: Chrome DevTools Network tab

ENDPOINTS TO TEST:
□ POST /api/auth/login → Target <200ms
□ GET /api/residents/dashboard → Target <300ms
□ POST /api/residents/visitors → Target <400ms
□ GET /api/guards/search → Target <500ms
□ POST /api/guards/check-in → Target <300ms

MEASUREMENT:
□ Open Network tab
□ Perform action
□ Check "Time" column for API call
□ Record slowest endpoint
```

#### Database Query Performance
```
IF DATABASE ACCESS AVAILABLE:

CHECK SLOW QUERIES:
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

VERIFY:
□ All queries < 100ms average
□ No full table scans (EXPLAIN shows index usage)
□ Indexes exist on foreign keys
□ Indexes exist on frequently queried columns
```

### 5.3 Mobile Performance (10 min)
```
DEVICE SIMULATION:
□ Chrome DevTools → Toggle device toolbar
□ Select: iPhone 12 Pro (or similar)
□ Test all critical paths:
  - Login
  - Create visitor invite
  - Scan QR (guard)
  - View invite (visitor)

METRICS:
□ Touch targets ≥ 44x44px
□ Text readable (font-size ≥ 14px)
□ No horizontal scroll
□ Forms usable on mobile
□ Buttons not cut off
□ Navigation accessible
```

**Phase 5 Complete:** Security and performance validated

---

## Phase 6: Regression & Edge Cases (45 min)

### 6.1 Error Handling Tests
```
NETWORK FAILURE:
□ Start creating visitor invite
□ Disconnect network
□ Observe error message
□ Reconnect network
□ Retry action
□ VERIFY: Success after retry

BACKEND DOWN:
□ Stop backend server
□ Try accessing dashboard
□ VERIFY: "Service unavailable" message
□ VERIFY: No stack traces shown
□ Restart backend
□ Refresh page
□ VERIFY: System recovers

INVALID DATA:
□ Submit form with very long text (>1000 chars)
□ Submit form with special characters: ' " < > & ;
□ VERIFY: Validation catches issues
□ VERIFY: No system crash
```

### 6.2 Concurrent User Test
```
IF MULTIPLE TESTERS AVAILABLE:

SCENARIO:
□ User A: Create visitor invite (Resident)
□ User B: Scan QR and check in (Guard)
□ User C: View invite page (Visitor)
- All simultaneously

VERIFY:
□ No race conditions
□ No data corruption
□ All users see consistent data
□ No 500 errors
□ No deadlocks
```

### 6.3 Data Consistency Tests
```
CREATE → UPDATE → DELETE CYCLE:

□ Resident creates visitor
□ Guard checks in visitor
□ Resident views history (verify Active status)
□ Guard checks out visitor
□ Resident refreshes (verify Exited status)
□ Admin views system log (verify all events recorded)
□ Admin generates report (verify visitor in report)

VERIFY:
□ Data consistent across all views
□ Timestamps correct
□ Status transitions logged
□ No orphaned records
```

**Phase 6 Complete:** Edge cases and regression validated

---

## Phase 7: Launch Readiness Assessment (30 min)

### 7.1 Compile Test Results
```
AUTOMATED TESTS:
□ Tests run: ___/11
□ Tests passed: ___
□ Pass rate: ___%
□ Critical failures: ___

MANUAL TESTS:
□ Resident tests: PASS / FAIL
□ Guard tests: PASS / FAIL
□ Admin tests: PASS / FAIL
□ Visitor tests: PASS / FAIL
□ Overall: PASS / FAIL

SECURITY TESTS:
□ SQL Injection: PASS / FAIL
□ XSS: PASS / FAIL
□ Authentication: PASS / FAIL
□ Session Security: PASS / FAIL

PERFORMANCE TESTS:
□ Page load < 3s: PASS / FAIL
□ API < 500ms: PASS / FAIL
□ Mobile usable: PASS / FAIL
□ Lighthouse score > 90: PASS / FAIL
```

### 7.2 Issue Triage
```
CRITICAL ISSUES (Blockers):
1. ___________________
2. ___________________
3. ___________________

HIGH PRIORITY (Must fix before launch):
1. ___________________
2. ___________________
3. ___________________

MEDIUM PRIORITY (Fix in v1.1):
1. ___________________
2. ___________________

LOW PRIORITY (Future enhancement):
1. ___________________
2. ___________________
```

### 7.3 Launch Decision Matrix
```
CHECKLIST FOR GO/NO-GO:

MUST HAVE (All must be YES):
□ Authentication works for all user types
□ Core workflows complete end-to-end:
  - Resident can create invite
  - Guard can scan QR and check in
  - Visitor can view invite
  - Admin can manage users
□ No critical security vulnerabilities
□ No data loss or corruption observed
□ System stable (no crashes during testing)
□ Backend and frontend operational
□ Database migrations successful

NICE TO HAVE (70%+ should be YES):
□ All automated tests passing (90%+)
□ Mobile experience excellent
□ Performance metrics hit targets
□ Error messages user-friendly
□ All edge cases handled gracefully
□ Complete documentation exists
□ Training materials ready

LAUNCH DECISION:
□ GO - System ready for production
□ NO-GO - Critical issues remain
□ CONDITIONAL GO - Launch with known issues (documented)
```

### 7.4 Final Documentation
```
DELIVERABLES:
□ TEST_EXECUTION_REPORT.json (automated)
□ Manual test scripts (all 4 completed and signed)
□ Issue log with severity ratings
□ Known issues document
□ Launch readiness report
□ User training guide (if required)
□ Post-launch monitoring plan
```

**Phase 7 Complete:** Launch decision made

---

## Post-Launch Testing Plan (Ongoing)

### Week 1: Intensive Monitoring
```
DAILY CHECKS:
□ Review error logs
□ Monitor API response times
□ Check user feedback/complaints
□ Verify data integrity
□ Test critical paths manually

AUTOMATED MONITORING:
□ Health check endpoint every 5 min
□ Alert on 5xx errors
□ Alert on slow queries (>1s)
□ Alert on failed logins spike
```

### Week 2-4: Stabilization
```
WEEKLY:
□ Run full automated test suite
□ Review analytics (usage patterns)
□ Identify performance bottlenecks
□ Plan v1.1 features based on feedback
□ Update documentation with learnings
```

### Monthly: Regression Testing
```
□ Run complete manual test suite
□ Test new features thoroughly
□ Update test scripts with new scenarios
□ Security audit (quarterly minimum)
```

---

## Test Team Roles & Responsibilities

### Primary Tester (You)
```
RESPONSIBILITIES:
□ Execute all manual tests
□ Run automated test suite
□ Document all issues
□ Triage bugs by severity
□ Make launch decision

TIME COMMITMENT:
□ Phase 1-7: 6 hours (one session)
□ Post-launch: 2 hours/week (first month)
```

### Optional: Additional Testers
```
TESTER 2 (If available):
□ Execute Guard manual tests
□ Perform concurrent user testing
□ Mobile device testing

TESTER 3 (If available):
□ Execute Visitor manual tests
□ Real-world scenario testing
□ Accessibility testing
```

---

## Tools & Resources Summary

### Required Tools
```
□ Chrome Browser (latest)
□ Chrome DevTools
□ Firefox Browser (for cross-browser)
□ Safari (for cross-browser)
□ Mobile device (iOS or Android)
□ Spreadsheet for issue tracking
□ Screenshot tool
```

### Testing Files
```
□ tasks/TEST_EXECUTION_RUNNER.js
□ tasks/MANUAL_TEST_GUIDE_RESIDENT.md
□ tasks/MANUAL_TEST_GUIDE_GUARD.md
□ tasks/MANUAL_TEST_GUIDE_ADMIN.md
□ tasks/MANUAL_TEST_GUIDE_VISITOR.md
□ test-fixtures/valid-visitors.csv (create)
```

### Test Data
```
□ Test user credentials (3 users)
□ Sample CSV file (bulk upload)
□ Invalid test vectors (SQL injection, XSS)
□ Test QR codes (valid/invalid/expired)
```

---

## Timeline Summary

```
Phase 1: Setup               30 min
Phase 2: Automated Tests     15 min
Phase 3: Manual Tests        90 min (30+25+20+15)
Phase 4: Cross-Role          30 min
Phase 5: Security/Perf       60 min
Phase 6: Regression          45 min
Phase 7: Assessment          30 min
────────────────────────────────────
TOTAL:                       ~5 hours

Add buffer:                  +1 hour (for issues)
REALISTIC TOTAL:             6 hours
```

---

## Success Metrics

### Quantitative
```
Automated Pass Rate:         ≥ 90% (10/11 tests)
Manual Test Pass Rate:       100% (all 4 user types)
Critical Bugs Found:         0
High Priority Bugs:          < 3
Page Load Time:              < 3 seconds
API Response Time:           < 500ms
Mobile Usability Score:      ≥ 4/5
Security Scan:               0 critical vulnerabilities
```

### Qualitative
```
□ System feels stable
□ User experience is smooth
□ Error messages are clear
□ Mobile experience is acceptable
□ All critical paths work end-to-end
□ Team confident in launch
```

---

## Final Approval

**Testing Completed By:** ___________  
**Date:** ___________

**Launch Decision:** GO / NO-GO / CONDITIONAL

**Approver Signature:** ___________  
**Date:** ___________

---

## Appendix: Quick Reference Commands

```bash
# Start Backend
cd secure-gate-access/server && npm start

# Start Frontend
cd secure-gate-access/client && npm start

# Run Automated Tests
REACT_APP_TEST_MODE=true HEADLESS=true node tasks/TEST_EXECUTION_RUNNER.js

# Check Backend Health
curl http://localhost:3001/api/health

# Test Login API
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"resident@test.com","password":"TestPass123!"}'

# View Database Users (if psql available)
psql -U secure_gate_user -d secure_gate -c "SELECT email, role FROM users;"
```

---

**Document Status:** Complete and Ready for Execution  
**Last Updated:** November 25, 2025  
**Version:** 1.0
