# Manual Testing Checklist - Secure Gate Access Control System
**Version:** 1.0  
**Date:** November 26, 2025  
**Backend Status:** Diagnostic tests 15/17 passing (after kiosk fix + restart: 17/17 expected)  
**Purpose:** Comprehensive manual validation before production deployment

---

## Pre-Testing Setup

### ✅ Prerequisites
- [ ] Backend server running on `http://localhost:3001`
- [ ] Frontend running on `http://localhost:3000` (or deployed URL)
- [ ] Database migrated with latest schema (resident_id column added)
- [ ] Test users seeded:
  - Resident: `resident@test.com` / `TestPass123!`
  - Guard: `guard@test.com` / `TestPass123!`
  - Admin: `admin@test.com` / `TestPass123!`
- [ ] Browser dev tools open (check console for errors)
- [ ] Network tab recording (monitor API calls)

### 📋 Testing Environment
- **Browser:** Chrome/Firefox/Safari
- **Screen Sizes:** Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)
- **Network:** Normal, Slow 3G (for performance testing)

---

## Phase 1: Resident Manual Tests

### R-01: Resident Login ✅
**URL:** `http://localhost:3000/login` or `/resident/login`

**Steps:**
1. Navigate to login page
2. Enter email: `resident@test.com`
3. Enter password: `TestPass123!`
4. Click "Login" button

**Expected Results:**
- ✅ Successful login with no console errors
- ✅ Redirected to `/resident/dashboard`
- ✅ Dashboard displays resident's name in header
- ✅ httpOnly auth cookie set (`authToken` visible in Application > Cookies)
- ✅ No localStorage tokens (security check)

**Pass/Fail:** ⬜

---

### R-02: Create Single Visitor Invite ✅
**URL:** `/resident/add-visitor` or similar

**Steps:**
1. From resident dashboard, click "Invite Visitor" or "Add Visitor" button
2. Fill form:
   - Name: `John Doe`
   - Phone: `0712345678`
   - Email: `john@example.com`
   - Date of Visit: Tomorrow's date
   - Time: `14:00`
   - Purpose: `Business meeting`
3. Click "Create Invite" or "Submit"

**Expected Results:**
- ✅ Form validates all required fields before submission
- ✅ Success message appears (e.g., "Visitor invited successfully")
- ✅ New visitor appears in "My Visitors" list
- ✅ Visitor status is `PENDING` or `Expected`
- ✅ Unique invite code generated (format: `INVITE-{uuid}`)
- ✅ API call to `POST /api/visitors` returns 201
- ✅ No console errors

**Pass/Fail:** ⬜

---

### R-03: Form Validation (Negative Test) ✅
**URL:** `/resident/add-visitor`

**Steps:**
1. Try submitting form with:
   - **Test 1:** Empty name field
   - **Test 2:** Invalid date (past date)
   - **Test 3:** Invalid time format (e.g., `25:00`)
   - **Test 4:** Missing purpose

**Expected Results:**
- ✅ Clear error messages appear for each invalid field
- ✅ Form does NOT submit with validation errors
- ✅ Error messages styled clearly (red text, error icons, etc.)
- ✅ No API call made until form is valid
- ✅ User can correct errors and successfully submit

**Pass/Fail:** ⬜

---

### R-04: Bulk Invite (If UI Exposed) ✅
**URL:** `/resident/bulk-invite` or similar

**Steps:**
1. Navigate to bulk invite page
2. Either:
   - Upload CSV file with visitor data, OR
   - Use multi-step wizard to add multiple visitors
3. Review visitors in preview/summary
4. Submit bulk invite

**Expected Results:**
- ✅ CSV upload works (if supported)
- ✅ Wizard allows adding multiple visitors
- ✅ Preview shows all visitors before confirmation
- ✅ All visitors created with status `PENDING`
- ✅ API call to `POST /api/visitors/bulk-invite` returns success
- ✅ Bulk invite confirmation shown with count

**Pass/Fail:** ⬜  
**N/A if:** Bulk invite not yet implemented in UI

---

### R-05: Visitor History & Filters ✅
**URL:** `/resident/visitors` or `/resident/history`

**Steps:**
1. Navigate to visitor history page
2. Check visitor list displays correctly
3. Apply filters:
   - **Filter by status:** Select `PENDING` status
   - **Filter by date:** Select today's date
   - **Search:** Enter visitor name in search box
4. Clear filters and verify list resets

**Expected Results:**
- ✅ All created visitors appear in list
- ✅ Each visitor card/row shows: name, phone, date, time, status, actions
- ✅ Status colors correct (Blue=Expected, Green=Active, Amber=Pending, Red=Denied, Gray=Exited)
- ✅ Filters work correctly (list updates based on selection)
- ✅ Search works (partial name matching)
- ✅ Empty state shown if no visitors match filters
- ✅ Pagination works (if more than 10-20 visitors)

**Pass/Fail:** ⬜

---

### R-06: Mobile Responsiveness (Resident Flows) 📱
**Device:** Mobile (375x667) or use Chrome DevTools device mode

**Steps:**
1. Repeat tests R-01 through R-05 on mobile viewport
2. Check touch targets (buttons, links) are at least 44x44px
3. Verify forms are usable on small screens

**Expected Results:**
- ✅ Layout adapts to mobile (no horizontal scroll)
- ✅ Touch targets large enough for fingers
- ✅ Forms display vertically stacked fields
- ✅ Navigation accessible (hamburger menu or bottom nav)
- ✅ Status cards/lists display properly
- ✅ No UI elements cut off or overlapping

**Pass/Fail:** ⬜

---

## Phase 2: Guard Manual Tests

### G-01: Guard Login ✅
**URL:** `http://localhost:3000/login` or `/guard/login`

**Steps:**
1. Navigate to login page (or guard-specific login)
2. Enter email: `guard@test.com`
3. Enter password: `TestPass123!`
4. Click "Login"

**Expected Results:**
- ✅ Successful login
- ✅ Redirected to `/guard/dashboard`
- ✅ Dashboard shows guard role/name in header
- ✅ httpOnly auth cookie set
- ✅ No console errors

**Pass/Fail:** ⬜

---

### G-02: Guard Dashboard - Active Visitors ✅
**URL:** `/guard/dashboard`

**Steps:**
1. From guard dashboard, view active visitors section
2. Check list of pending/verified/on-premise visitors
3. Verify visitor details are visible (name, phone, expected time, status)

**Expected Results:**
- ✅ Dashboard loads successfully
- ✅ Active visitors section displays (backed by `/api/visitors/active`)
- ✅ Visitors created by residents in Phase 1 appear here
- ✅ Each visitor shows: name, phone, resident, time, status
- ✅ Status colors consistent
- ✅ "No active visitors" empty state if none

**Pass/Fail:** ⬜

---

### G-03: Manual Search by Phone ✅
**URL:** `/guard/manual-check` or `/guard/search`

**Steps:**
1. Navigate to manual check/search page
2. Enter phone number: `0712345678` (from visitor created in R-02)
3. Click "Search" or press Enter

**Expected Results:**
- ✅ Search input accepts phone number
- ✅ Results display matching visitor(s)
- ✅ Visitor details shown: name, phone, resident, time, status
- ✅ "Check In" button available for pending/verified visitors
- ✅ "No results" message if phone not found

**Pass/Fail:** ⬜

---

### G-04: Check-In Action ✅
**URL:** `/guard/manual-check` or from active visitors list

**Steps:**
1. Find a visitor in `PENDING` or `VERIFIED` status
2. Click "Check In" button
3. Confirm check-in action if prompted

**Expected Results:**
- ✅ API call to `POST /api/visitors/{id}/check-in` succeeds
- ✅ Visitor status updates to `CHECKED_IN` or `ON_PREMISE`
- ✅ Check-in timestamp recorded
- ✅ Success message displayed
- ✅ Visitor card/row reflects new status
- ✅ If already checked in, appropriate message shown

**Pass/Fail:** ⬜

---

### G-05: Check-Out Action ✅
**URL:** From active visitors list or check-out screen

**Steps:**
1. Find a visitor with status `CHECKED_IN` or `ON_PREMISE`
2. Click "Check Out" button
3. Confirm check-out action

**Expected Results:**
- ✅ API call to `POST /api/visitors/{id}/check-out` succeeds
- ✅ Visitor status updates to `CHECKED_OUT` or `EXITED`
- ✅ Check-out timestamp recorded
- ✅ Success message displayed
- ✅ Visitor removed from active list (or moved to "completed")

**Pass/Fail:** ⬜

---

### G-06: QR Code Scan (If Implemented) ✅
**URL:** `/guard/scan-qr` or similar

**Steps:**
1. Navigate to QR scan page
2. Either:
   - Use camera to scan visitor's QR code, OR
   - Manually enter invite code from R-02
3. Verify visitor details load

**Expected Results:**
- ✅ QR scanner opens (camera permission requested)
- ✅ Manual code entry option available
- ✅ Valid code loads visitor details
- ✅ Invalid code shows error message
- ✅ Check-in action available after verification

**Pass/Fail:** ⬜  
**N/A if:** QR scan not yet implemented

---

### G-07: Walk-In Registration (Kiosk Feature) ✅
**URL:** `/guard/walk-in` or similar

**Steps:**
1. Navigate to walk-in registration page
2. Fill form:
   - Visitor Name: `Walk-In Test`
   - Phone: `0733333333`
   - Purpose: `Unexpected visit`
   - Resident Name: `Test Resident` (fuzzy match)
3. Click "Register Walk-In"

**Expected Results:**
- ✅ Form validates required fields
- ✅ API call to `POST /api/visitors/walk-in` succeeds
- ✅ Visitor created with status `pending` or `pending_approval`
- ✅ Resident lookup by name/email works (fuzzy match)
- ✅ If resident not found, walk-in still created (with NULL resident_id)
- ✅ Success message with visitor details
- ✅ Walk-in appears in guard's active visitors list

**Pass/Fail:** ⬜

---

### G-08: Mobile Responsiveness (Guard Flows) 📱
**Device:** Mobile (375x667)

**Steps:**
1. Repeat tests G-01 through G-07 on mobile viewport
2. Check dashboard layout on small screens
3. Verify search and check-in buttons are usable

**Expected Results:**
- ✅ Guard dashboard adapts to mobile
- ✅ Active visitors display as cards (not cramped table)
- ✅ Search input and buttons properly sized
- ✅ Check-in/check-out actions accessible
- ✅ QR scanner works on mobile device

**Pass/Fail:** ⬜

---

## Phase 3: Admin Manual Tests

### A-01: Admin Login ✅
**URL:** `/login` or `/admin/login`

**Steps:**
1. Navigate to login page
2. Enter email: `admin@test.com`
3. Enter password: `TestPass123!`
4. Click "Login"

**Expected Results:**
- ✅ Successful login
- ✅ Redirected to `/admin/dashboard`
- ✅ Admin dashboard loads with admin-specific navigation
- ✅ httpOnly auth cookie set

**Pass/Fail:** ⬜

---

### A-02: Admin Dashboard & Reports ✅
**URL:** `/admin/dashboard` or `/admin/reports`

**Steps:**
1. View admin dashboard
2. Check for:
   - Total visitors count
   - Pending/approved/checked-in/checked-out stats
   - Recent activity log
3. Navigate to reports page (if separate)
4. Generate visitor report

**Expected Results:**
- ✅ Dashboard displays system-wide statistics
- ✅ Stats accurate (matches visitors created in tests)
- ✅ API call to `GET /api/visitors/report` succeeds (admin-only)
- ✅ Report shows totals by status
- ✅ Recent visitors list displayed
- ✅ No access for non-admin roles (403 if guard/resident tries)

**Pass/Fail:** ⬜

---

### A-03: User/Role Management (If Exposed) ✅
**URL:** `/admin/users` or similar

**Steps:**
1. Navigate to user management page
2. View list of users (residents, guards, admins)
3. Click on a user to view details
4. Verify role badges/labels are correct

**Expected Results:**
- ✅ User list displays all system users
- ✅ Each user shows: name, email, role, status (active/inactive)
- ✅ Admin can view user details
- ✅ (Optional) Admin can edit user roles or deactivate users
- ✅ Proper RBAC: only admins can access this page

**Pass/Fail:** ⬜  
**N/A if:** User management not yet implemented in UI

---

## Phase 4: Visitor / Public Flows

### V-01: Visitor Invite Link ✅
**URL:** `/invite/{inviteCode}` (use code from R-02)

**Steps:**
1. Copy invite code from visitor created in R-02
2. In a new browser window (or incognito), navigate to:
   `http://localhost:3000/invite/{inviteCode}`
3. View invite details

**Expected Results:**
- ✅ Invite page loads successfully
- ✅ Visitor details displayed: name, date, time, resident name, purpose
- ✅ Invite code shown
- ✅ "Confirm Visit" or similar CTA button visible
- ✅ Mobile-friendly layout (gradient header, large text)
- ✅ If invalid code, appropriate error message shown

**Pass/Fail:** ⬜

---

### V-02: Visitor Self Check-In (If Implemented) ✅
**URL:** `/invite/{inviteCode}` or `/self-checkin`

**Steps:**
1. From invite page (V-01), click "Check In" or "Confirm Arrival"
2. Complete any verification steps (OTP, consent form, etc.)
3. Submit self check-in

**Expected Results:**
- ✅ Self check-in flow accessible from invite link
- ✅ OTP verification works (if enabled)
- ✅ Consent form displayed and must be accepted
- ✅ API call to `POST /api/visitors/self-checkin/{inviteCode}` succeeds
- ✅ Visitor status updates to `CHECKED_IN`
- ✅ Confirmation message shown to visitor
- ✅ Guard and resident can see updated status

**Pass/Fail:** ⬜  
**N/A if:** Self check-in not yet implemented

---

### V-03: Kiosk Self-Service (If Implemented) ✅
**URL:** `/kiosk` or public kiosk screen

**Steps:**
1. Navigate to kiosk URL
2. Select "I have an invite" or "Walk-in"
3. Enter invite code or personal details
4. Complete check-in

**Expected Results:**
- ✅ Kiosk interface displays in fullscreen/kiosk mode
- ✅ Large buttons and text for touch interaction
- ✅ Invite code lookup works
- ✅ Walk-in registration accessible (if public kiosk allows)
- ✅ Progress indicators shown
- ✅ Success screen with clear next steps

**Pass/Fail:** ⬜  
**N/A if:** Kiosk UI not yet deployed

---

## Phase 5: Security & Negative Scenarios

### S-01: Unauthorized Access - Resident Accessing Guard Pages ❌
**Steps:**
1. Login as resident (`resident@test.com`)
2. Try to navigate to:
   - `/guard/dashboard`
   - `/admin/dashboard`
   - Or manually call `GET /api/visitors/active` via browser DevTools

**Expected Results:**
- ✅ UI prevents navigation to unauthorized pages (redirect or 404)
- ✅ API returns `403 Forbidden` for guard/admin endpoints
- ✅ No sensitive data leaked in error messages
- ✅ User redirected to appropriate dashboard or login

**Pass/Fail:** ⬜

---

### S-02: Unauthorized Access - Guard Accessing Resident Endpoints ❌
**Steps:**
1. Login as guard (`guard@test.com`)
2. Try to access:
   - `/resident/add-visitor`
   - Or manually call `POST /api/visitors` via DevTools

**Expected Results:**
- ✅ UI prevents navigation to resident-only pages
- ✅ API returns `403 Forbidden` for resident-only endpoints
- ✅ Guard cannot create visitors on behalf of residents

**Pass/Fail:** ⬜

---

### S-03: Unauthenticated Access ❌
**Steps:**
1. Open browser in incognito mode (no auth cookies)
2. Try to navigate to:
   - `/resident/dashboard`
   - `/guard/dashboard`
   - `/admin/dashboard`
3. Try to call API endpoints without auth:
   - `GET /api/visitors` (no cookies)

**Expected Results:**
- ✅ Redirected to login page
- ✅ API returns `401 Unauthorized`
- ✅ No data accessible without authentication
- ✅ Public pages accessible: `/`, `/login`, `/invite/{code}`

**Pass/Fail:** ⬜

---

### S-04: Session & Logout Behavior ✅
**Steps:**
1. Login as any role
2. Click "Logout" button
3. Try to navigate back to protected pages
4. Verify auth cookie is cleared

**Expected Results:**
- ✅ Logout button accessible from all dashboards
- ✅ httpOnly auth cookie is cleared on logout
- ✅ User redirected to login page
- ✅ Cannot access protected pages after logout (must re-login)
- ✅ API calls without cookie return 401

**Pass/Fail:** ⬜

---

### S-05: Password Security ✅
**Steps:**
1. On login page, inspect password field
2. Check DevTools > Network tab during login
3. Verify password transmission

**Expected Results:**
- ✅ Password field has `type="password"` (obscured input)
- ✅ Login request uses HTTPS in production (or HTTP in dev is noted as insecure)
- ✅ Password is NOT visible in URL or query params
- ✅ Password is sent in request body (POST, not GET)
- ✅ No password stored in localStorage or sessionStorage

**Pass/Fail:** ⬜

---

### S-06: SQL Injection & XSS Attempts ❌
**Steps:**
1. In various input fields, try:
   - SQL injection: `' OR '1'='1`
   - XSS: `<script>alert('XSS')</script>`
   - Special chars: `'; DROP TABLE visitors;--`
2. Submit forms with malicious input
3. Check if input is sanitized

**Expected Results:**
- ✅ SQL injection attempts do NOT succeed (parameterized queries)
- ✅ XSS payloads are escaped/sanitized in output
- ✅ No JavaScript execution from user input
- ✅ No database errors exposed to user
- ✅ Input validation rejects obviously malicious patterns

**Pass/Fail:** ⬜

---

## Phase 6: Cross-Role & End-to-End Flows

### E2E-01: Resident Invites → Guard Checks In → Resident Views History ✅
**Full Flow:**
1. **Resident:** Login → Create visitor invite → Note invite code
2. **Guard:** Login → Search by phone → Check in visitor
3. **Resident:** Refresh history → Verify visitor status is `CHECKED_IN`
4. **Guard:** Check out visitor
5. **Resident:** Verify visitor status is `CHECKED_OUT`

**Expected Results:**
- ✅ Each role sees appropriate views
- ✅ Status updates propagate across roles
- ✅ Visitor appears in guard's active list after creation
- ✅ Check-in action updates status immediately (or within a few seconds)
- ✅ Resident can see check-in/check-out timestamps
- ✅ No data inconsistencies between roles

**Pass/Fail:** ⬜

---

### E2E-02: Guard Walk-In → Resident Approval (If Implemented) ✅
**Full Flow:**
1. **Guard:** Login → Register walk-in visitor → Request approval
2. **Resident:** Login → View pending approvals → Approve walk-in
3. **Guard:** Verify walk-in status updated to `APPROVED`
4. **Guard:** Check in approved walk-in

**Expected Results:**
- ✅ Guard can register walk-in without resident action
- ✅ Approval request sent to resident (notification or list)
- ✅ Resident can approve or reject walk-in
- ✅ Status updates reflect approval decision
- ✅ Guard can proceed with check-in only after approval

**Pass/Fail:** ⬜  
**N/A if:** Walk-in approval flow not yet implemented

---

### E2E-03: Visitor Uses Invite Link → Self Check-In → Guard Verifies ✅
**Full Flow:**
1. **Resident:** Create visitor invite
2. **Visitor:** Access invite link → Self check-in
3. **Guard:** View active visitors → See self-checked-in visitor
4. **Guard:** Check out visitor

**Expected Results:**
- ✅ Visitor can complete self check-in via link
- ✅ Guard sees visitor in active list with `CHECKED_IN` status
- ✅ No guard action needed for check-in (self-service works)
- ✅ Guard can still perform check-out

**Pass/Fail:** ⬜  
**N/A if:** Self check-in not implemented

---

## Phase 7: Performance & UX

### P-01: Page Load Times ⚡
**Steps:**
1. Open DevTools > Network tab
2. Hard refresh (Ctrl+Shift+R) each major page:
   - Login page
   - Resident dashboard
   - Guard dashboard
   - Visitor history
3. Note "DOMContentLoaded" and "Load" times

**Expected Results:**
- ✅ Pages load in <3 seconds on normal connection
- ✅ No 500 errors in Network tab
- ✅ API responses <1 second
- ✅ Images/assets load progressively

**Pass/Fail:** ⬜

---

### P-02: Console Errors & Warnings ⚠️
**Steps:**
1. Open DevTools > Console
2. Navigate through all pages and actions
3. Note any errors or warnings

**Expected Results:**
- ✅ No unhandled errors in console
- ✅ No failed API calls (except intentional 401/403 for security tests)
- ✅ No CORS errors
- ✅ Warnings acceptable (e.g., React dev warnings) but no critical issues

**Pass/Fail:** ⬜

---

### P-03: Empty States & Edge Cases 🎨
**Steps:**
1. **Empty visitor list:** Login as new resident with no visitors → Check empty state
2. **No active visitors:** Login as guard when no visitors checked in → Check empty state
3. **Invalid invite code:** Visit `/invite/INVALID_CODE` → Check error message
4. **Expired invite:** (If applicable) Use expired invite code

**Expected Results:**
- ✅ Empty states are clear and helpful (not just blank pages)
- ✅ CTAs guide user on what to do next ("Create your first visitor")
- ✅ Error messages are user-friendly (not technical stack traces)
- ✅ Expired invites show appropriate message

**Pass/Fail:** ⬜

---

## Test Summary & Sign-Off

### Overall Results

| Phase | Tests | Passed | Failed | N/A | Pass Rate |
|-------|-------|--------|--------|-----|-----------|
| Resident | 6 | __ | __ | __ | __% |
| Guard | 8 | __ | __ | __ | __% |
| Admin | 3 | __ | __ | __ | __% |
| Visitor | 3 | __ | __ | __ | __% |
| Security | 6 | __ | __ | __ | __% |
| E2E | 3 | __ | __ | __ | __% |
| Performance | 3 | __ | __ | __ | __% |
| **TOTAL** | **32** | **__** | **__** | **__** | **__%** |

### Critical Issues Found
1. 
2. 
3. 

### Blockers (Must Fix Before Production)
- [ ] Issue 1
- [ ] Issue 2

### Nice-to-Have (Can Defer)
- [ ] Issue 1
- [ ] Issue 2

### Sign-Off

**Tested By:** ______________________  
**Date:** ______________________  
**Backend Status:** Diagnostic API Tests __/17 passing  
**Recommendation:** ☐ Ready for Production  ☐ Needs Fixes  ☐ Major Rework Required

**Notes:**

---

## Appendix: Quick Test Data Reference

### Test Users
- **Resident:** `resident@test.com` / `TestPass123!`
- **Guard:** `guard@test.com` / `TestPass123!`
- **Admin:** `admin@test.com` / `TestPass123!`

### Sample Visitor Data
```json
{
  "name": "John Doe",
  "phone": "0712345678",
  "email": "john@example.com",
  "dateOfVisit": "2025-11-27",
  "time": "14:00",
  "purpose": "Business meeting"
}
```

### API Endpoints (for manual curl testing)
```bash
# Health check
GET http://localhost:3001/health

# Login
POST http://localhost:3001/api/auth/login
Body: {"username":"resident@test.com","password":"TestPass123!"}

# Create visitor (resident)
POST http://localhost:3001/api/visitors
Headers: Cookie: authToken=...
Body: {visitor data}

# Active visitors (guard)
GET http://localhost:3001/api/visitors/active
Headers: Cookie: authToken=...

# Walk-in registration (guard)
POST http://localhost:3001/api/visitors/walk-in
Headers: Cookie: authToken=...
Body: {"name":"Walker","phone":"0733333333","purpose":"Visit","residentName":"Test Resident"}
```

---

**End of Manual Testing Checklist**
