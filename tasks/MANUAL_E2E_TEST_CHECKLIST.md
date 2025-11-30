# 📋 SecureGate Manual E2E Test Checklist

**Created:** November 28, 2025  
**Purpose:** Comprehensive manual testing checklist for all user functionalities  
**Testing Approach:** Puppeteer automation + Manual verification

---

## 🔐 AUTHENTICATION & GLOBAL FLOWS

### AUTH-001: Login Flow
- [ ] Navigate to `/login`
- [ ] Verify form fields (email/username, password)
- [ ] Test empty submission validation
- [ ] Test invalid credentials rejection
- [ ] Test valid credentials login
- [ ] Verify redirect to correct dashboard based on role
- [ ] Verify httpOnly cookie is set (not localStorage)

### AUTH-002: Registration Flow
- [ ] Navigate to `/register`
- [ ] Verify form fields (name, email, password, role, phone, residence)
- [ ] Test form validation (empty fields, invalid email, weak password)
- [ ] Test successful registration
- [ ] Verify redirect to login or dashboard

### AUTH-003: Logout Flow
- [ ] Login as any user
- [ ] Click logout button
- [ ] Verify cookies cleared
- [ ] Verify redirect to login
- [ ] Verify protected routes are inaccessible

### AUTH-004: Session Persistence
- [ ] Login successfully
- [ ] Refresh page
- [ ] Verify still authenticated
- [ ] Close browser, reopen
- [ ] Verify session behavior (should persist or require re-login based on config)

### AUTH-005: Protected Route Access
- [ ] Without login, try accessing `/dashboard/resident`
- [ ] Verify redirect to login
- [ ] Without login, try accessing `/dashboard/guard`
- [ ] Verify redirect to login
- [ ] Without login, try accessing `/dashboard/admin`
- [ ] Verify redirect to login

### AUTH-006: Role-Based Access Control
- [ ] Login as resident, try accessing `/dashboard/guard`
- [ ] Verify access denied or redirect
- [ ] Login as guard, try accessing `/dashboard/admin`
- [ ] Verify access denied or redirect
- [ ] Login as admin, verify can access admin routes

---

## 👤 RESIDENT FUNCTIONALITIES

### RES-001: Resident Dashboard
- [ ] Login as resident
- [ ] Navigate to `/dashboard/resident`
- [ ] Verify dashboard loads
- [ ] Verify stats cards display (visitors today, pending, etc.)
- [ ] Verify quick action buttons visible
- [ ] Verify recent visitors section
- [ ] Verify mobile responsiveness

### RES-002: Add Single Visitor
- [ ] Navigate to `/resident/add-visitor`
- [ ] Verify form loads with all fields
- [ ] Fill visitor name
- [ ] Fill phone number
- [ ] Select visit date/time
- [ ] Select purpose
- [ ] Submit form
- [ ] Verify success message
- [ ] Verify visitor appears in history

### RES-003: Add Visitor Wizard
- [ ] Navigate to `/resident/add-visitor-wizard`
- [ ] Verify step 1: Visitor details
- [ ] Fill and proceed to step 2
- [ ] Verify step 2: Schedule
- [ ] Fill and proceed to step 3
- [ ] Verify step 3: Review
- [ ] Confirm and submit
- [ ] Verify success state

### RES-004: Visitor History
- [ ] Navigate to `/resident/visitor-history`
- [ ] Verify list/table displays
- [ ] Verify visitor details visible (name, date, status)
- [ ] Test search functionality
- [ ] Test filter by status
- [ ] Test filter by date range
- [ ] Verify pagination if many visitors

### RES-005: Bulk Invite
- [ ] Navigate to `/resident/bulk-invite`
- [ ] Verify form/wizard loads
- [ ] Add multiple visitors (manual entry)
- [ ] Add event details
- [ ] Submit bulk invite
- [ ] Verify all visitors created

### RES-006: Bulk Invite Wizard
- [ ] Navigate to `/resident/bulk-invite-wizard`
- [ ] Verify step 1: Event details
- [ ] Fill event name, date, description
- [ ] Proceed to step 2: Guest list
- [ ] Add guests manually or via CSV
- [ ] Proceed to step 3: Review
- [ ] Confirm and submit
- [ ] Verify success with guest count

### RES-007: Generate Pass
- [ ] Navigate to `/resident/generate-pass`
- [ ] Select a visitor or create new
- [ ] Generate QR code/pass
- [ ] Verify QR code displays
- [ ] Test download/share options

### RES-008: Favorite Visitors
- [ ] Navigate to `/resident/favorite-visitors`
- [ ] Verify favorites list loads
- [ ] Add new favorite
- [ ] Quick invite from favorite
- [ ] Remove from favorites

### RES-009: Resident Settings
- [ ] Navigate to `/resident/settings`
- [ ] Verify settings page loads
- [ ] Update notification preferences
- [ ] Update profile info (if available)
- [ ] Save changes
- [ ] Verify changes persist

### RES-010: Resident Approvals Panel
- [ ] Verify approvals panel visible (on dashboard or separate)
- [ ] View pending walk-in requests
- [ ] Approve a walk-in
- [ ] Deny a walk-in
- [ ] Verify status updates

---

## 👁️ VISITOR FUNCTIONALITIES (Public)

### VIS-001: Visitor Invite Page
- [ ] Navigate to `/invite/:inviteCode` (with valid code)
- [ ] Verify invite details display
- [ ] Verify visit date/time shown
- [ ] Verify estate/location info
- [ ] Verify status (expected, checked-in, etc.)

### VIS-002: Get Directions
- [ ] From invite page, click "Get Directions"
- [ ] Verify directions/map displayed
- [ ] Verify estate gate location shown
- [ ] Verify no sensitive unit info exposed
- [ ] Test on mobile viewport

### VIS-003: Self Check-In Kiosk
- [ ] Navigate to `/kiosk` or kiosk route
- [ ] Verify kiosk UI loads
- [ ] Enter invite code
- [ ] Verify visitor details shown
- [ ] Complete self check-in
- [ ] Verify confirmation displayed

### VIS-004: Visitor Status Polling
- [ ] Open invite page
- [ ] Verify status updates in real-time
- [ ] When guard checks in, verify page updates

### VIS-005: Estate Info (Public)
- [ ] Navigate to estate info endpoint
- [ ] Verify public estate details available
- [ ] Verify no private info exposed

---

## 🛡️ GUARD FUNCTIONALITIES

### GRD-001: Guard Dashboard
- [ ] Login as guard
- [ ] Navigate to `/dashboard/guard`
- [ ] Verify dashboard loads
- [ ] Verify action cards (Scan QR, Manual Check)
- [ ] Verify active visitors section
- [ ] Verify shift info (if applicable)
- [ ] Verify mobile responsiveness

### GRD-002: Scan QR - Valid Code
- [ ] Navigate to `/dashboard/guard/scan-qr`
- [ ] Verify camera/scanner interface loads
- [ ] Scan valid QR code (or simulate)
- [ ] Verify visitor details displayed
- [ ] Click "Check In"
- [ ] Verify success message
- [ ] Verify visitor status changed to active

### GRD-003: Scan QR - Invalid Code
- [ ] Navigate to `/dashboard/guard/scan-qr`
- [ ] Scan invalid/expired QR
- [ ] Verify error message displayed
- [ ] Verify no check-in occurred

### GRD-004: Manual Check Search
- [ ] Navigate to `/dashboard/guard/manual-check`
- [ ] Search by visitor name
- [ ] Verify matching visitors displayed
- [ ] Search by phone number
- [ ] Verify matching visitors displayed
- [ ] Search by invite code
- [ ] Verify visitor found

### GRD-005: Manual Check-In
- [ ] From manual check page
- [ ] Find visitor in list
- [ ] Click "Check In"
- [ ] Verify confirmation
- [ ] Verify visitor becomes active

### GRD-006: Manual Check-Out
- [ ] From active visitors or manual check
- [ ] Find checked-in visitor
- [ ] Click "Check Out"
- [ ] Verify confirmation
- [ ] Verify visitor status changed to exited

### GRD-007: Walk-In Registration
- [ ] Navigate to walk-in registration (if separate route)
- [ ] Fill visitor details (name, phone, purpose)
- [ ] Select target resident
- [ ] Submit walk-in request
- [ ] Verify pending approval status

### GRD-008: Walk-In Approval Flow (Cross-Role)
- [ ] Guard creates walk-in
- [ ] Switch to resident account
- [ ] Verify approval request visible
- [ ] Approve the walk-in
- [ ] Switch back to guard
- [ ] Verify approval status updated
- [ ] Check in the approved visitor

### GRD-009: Guard Visitor History
- [ ] Navigate to `/dashboard/guard/visitor-history`
- [ ] Verify history displays
- [ ] Verify can see all visitor activity
- [ ] Test filters and search

### GRD-010: Incident Reporting
- [ ] Navigate to incidents section
- [ ] Create new incident
- [ ] Fill incident details (type, description)
- [ ] Submit incident
- [ ] Verify incident created
- [ ] Update incident status
- [ ] Resolve incident

### GRD-011: Guard Settings
- [ ] Navigate to guard settings
- [ ] Verify settings load
- [ ] Update preferences
- [ ] Save and verify persistence

---

## ⚙️ ADMIN FUNCTIONALITIES

### ADM-001: Admin Dashboard
- [ ] Login as admin
- [ ] Navigate to `/dashboard/admin`
- [ ] Verify dashboard loads
- [ ] Verify system stats display
- [ ] Verify user counts
- [ ] Verify visitor statistics
- [ ] Verify mobile responsiveness

### ADM-002: User Management - View Users
- [ ] Navigate to `/dashboard/admin/users`
- [ ] Verify user list displays
- [ ] Verify can filter by role
- [ ] Verify search functionality
- [ ] Verify user details visible

### ADM-003: User Management - Create User
- [ ] Click "Add User" or equivalent
- [ ] Fill user details
- [ ] Select role
- [ ] Submit
- [ ] Verify user created
- [ ] Verify new user can login

### ADM-004: User Management - Edit User
- [ ] Select existing user
- [ ] Edit details
- [ ] Save changes
- [ ] Verify changes persist

### ADM-005: User Management - Deactivate User
- [ ] Select user to deactivate
- [ ] Deactivate user
- [ ] Verify user cannot login
- [ ] Reactivate user
- [ ] Verify user can login again

### ADM-006: Reports Generation
- [ ] Navigate to `/dashboard/admin/reports`
- [ ] Select report type (visitor, incident, access)
- [ ] Select date range
- [ ] Generate report
- [ ] Verify data displays correctly
- [ ] Test export (CSV/PDF if available)

### ADM-007: Analytics Dashboard
- [ ] Navigate to analytics section
- [ ] Verify charts load
- [ ] Verify visitor traffic data
- [ ] Verify peak hours analysis
- [ ] Test date range filters

### ADM-008: Audit Logs
- [ ] Navigate to audit logs
- [ ] Verify log entries display
- [ ] Verify login events logged
- [ ] Verify visitor events logged
- [ ] Test search/filter functionality

### ADM-009: Security Settings
- [ ] Navigate to security settings
- [ ] Verify MFA settings visible
- [ ] Verify password policy settings
- [ ] Update settings
- [ ] Verify changes apply

### ADM-010: Watchlist Management
- [ ] Navigate to watchlist section
- [ ] Add visitor to watchlist
- [ ] Verify watchlist entry
- [ ] Test guard check-in with watchlisted visitor
- [ ] Remove from watchlist

---

## 🔁 CROSS-ROLE END-TO-END FLOWS

### FLOW-001: Complete Scheduled Visit
1. [ ] Resident creates invite
2. [ ] Visitor receives invite (open invite page)
3. [ ] Visitor views directions
4. [ ] Guard scans QR and checks in
5. [ ] Resident sees notification
6. [ ] Guard checks out visitor
7. [ ] History updated for all roles

### FLOW-002: Walk-In Approval Flow
1. [ ] Guard registers walk-in visitor
2. [ ] Resident receives approval request
3. [ ] Resident approves/denies
4. [ ] Guard sees approval status
5. [ ] If approved, guard checks in
6. [ ] Flow completes with check-out

### FLOW-003: Bulk Event Flow
1. [ ] Resident creates bulk event
2. [ ] Multiple guests receive invites
3. [ ] Guests arrive, guard processes each
4. [ ] Admin views event analytics

### FLOW-004: Incident Flow
1. [ ] Guard logs incident
2. [ ] Admin notified
3. [ ] Admin reviews and updates
4. [ ] Incident resolved
5. [ ] Audit trail verified

### FLOW-005: Privacy/Data Request Flow
1. [ ] User requests data export
2. [ ] Admin processes request
3. [ ] User receives data
4. [ ] User requests deletion
5. [ ] Admin processes deletion
6. [ ] User data removed

---

## 🔒 SECURITY TESTS

### SEC-001: XSS Prevention
- [ ] Test script injection in login
- [ ] Test script injection in visitor name
- [ ] Test script injection in search
- [ ] Verify all inputs sanitized

### SEC-002: SQL Injection Prevention
- [ ] Test SQL injection in login
- [ ] Test SQL injection in search
- [ ] Verify queries parameterized

### SEC-003: CSRF Protection
- [ ] Verify CSRF tokens in forms
- [ ] Test cross-origin request rejection

### SEC-004: Rate Limiting
- [ ] Test rapid login attempts
- [ ] Verify rate limiting triggers
- [ ] Test API rate limiting

### SEC-005: Authentication Security
- [ ] Verify password not logged
- [ ] Verify tokens not in localStorage
- [ ] Verify httpOnly cookies used

---

## 🎨 UI/UX TESTS

### UI-001: Responsive Design
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x812)

### UI-002: Accessibility
- [ ] Keyboard navigation works
- [ ] Tab order correct
- [ ] Form labels present
- [ ] ARIA attributes correct

### UI-003: Error States
- [ ] Network error handling
- [ ] Form validation errors
- [ ] Empty state displays

---

## 📊 TEST EXECUTION TRACKING

| Category | Total | Passed | Failed | Blocked |
|----------|-------|--------|--------|---------|
| Auth | 6 | | | |
| Resident | 10 | | | |
| Visitor | 5 | | | |
| Guard | 11 | | | |
| Admin | 10 | | | |
| Cross-Role | 5 | | | |
| Security | 5 | | | |
| UI/UX | 3 | | | |
| **TOTAL** | **55** | | | |

---

## 🐛 BUGS FOUND

| ID | Category | Description | Severity | Status |
|----|----------|-------------|----------|--------|
| | | | | |

---

*Last Updated: November 28, 2025*
