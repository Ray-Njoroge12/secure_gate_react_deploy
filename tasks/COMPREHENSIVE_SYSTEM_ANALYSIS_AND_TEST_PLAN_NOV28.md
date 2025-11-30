# Comprehensive System Analysis & Test Plan
## SecureGate Access Control System - November 28, 2025

---

# PART 1: SYSTEM ANALYSIS & BUG IDENTIFICATION

## 1.1 System Architecture Overview

### Frontend (React)
| Category | Count | Location |
|----------|-------|----------|
| **Pages** | 39+ | `/client/src/pages/` |
| **Components** | 153+ | `/client/src/components/` |
| **Services** | 17 | `/client/src/services/` |
| **Contexts** | 12 | `/client/src/contexts/` |
| **Hooks** | 24 | `/client/src/hooks/` |

### Backend (Express.js)
| Category | Count | Location |
|----------|-------|----------|
| **Routes** | 62 | `/server/src/routes/` |
| **Services** | 88 | `/server/src/services/` |
| **Controllers** | 18 | `/server/src/controllers/` |
| **Middleware** | 28 | `/server/src/middleware/` |
| **Migrations** | 18 | `/server/src/migrations/` |

### Database & Cache
- **PostgreSQL**: Primary database
- **Redis**: Session cache, token blacklist

---

## 1.2 🔴 CRITICAL BUGS IDENTIFIED

### BUG-001: Rate Limiter Disabled on Auth Routes
**Severity**: 🔴 CRITICAL  
**File**: `server/src/routes/authRoutes.js`  
**Lines**: 112, 258  
**Issue**: Rate limiter and audit middleware are commented out
```javascript
// TEMPORARY FIX: Rate limiter and audit disabled for debugging
router.post('/register', /* authLimiter, attachRequestAudit(), */ asyncHandler(async (req, res) => {
```
**Risk**: Brute force attacks on login/registration endpoints  
**Fix**: Re-enable rate limiting before production

---

### BUG-002: localStorage Usage in App.js Keyboard Shortcuts
**Severity**: 🔴 CRITICAL  
**File**: `client/src/App.js`  
**Lines**: 114, 124-125  
**Issue**: Uses localStorage for role and clears localStorage on logout
```javascript
const role = localStorage.getItem('role'); // Line 114
localStorage.clear(); // Line 124-125
```
**Risk**: XSS vulnerability - tokens/role should not be in localStorage  
**Fix**: Use AuthContext for role access instead of localStorage

---

### BUG-003: httpInterceptor Still Imported
**Severity**: 🟡 HIGH  
**File**: `client/src/App.js`  
**Line**: 15  
**Issue**: httpInterceptor is imported despite security concerns
```javascript
import "./utils/httpInterceptor.js"; // HTTP interceptor for automatic auth headers
```
**Risk**: May conflict with httpOnly cookie authentication  
**Fix**: Remove import or verify it's not interfering with auth

---

### BUG-004: AuthContext Calls Non-Existent Endpoint
**Severity**: 🟡 HIGH  
**File**: `client/src/contexts/AuthContext.js`  
**Line**: 27  
**Issue**: initializeAuth calls `/api/auth/me` which doesn't exist in authRoutes.js
```javascript
const res = await fetch('/api/auth/me', {
```
**Risk**: Auth state initialization will always fail  
**Fix**: Either add `/me` endpoint to backend OR use `/api/auth/profile`

---

### BUG-005: Register Endpoint Mismatch
**Severity**: 🟡 HIGH  
**File**: `client/src/contexts/AuthContext.js`  
**Line**: 115  
**Issue**: Register calls `/api/register` but backend expects `/api/auth/register`
```javascript
const response = await fetch('/api/register', {
```
**Risk**: Registration will fail with 404  
**Fix**: Change to `/api/auth/register`

---

### BUG-006: Console.log Statements in Production Code
**Severity**: 🟢 MEDIUM  
**File**: `server/src/routes/authRoutes.js`  
**Lines**: 116-122, 126-131, 155, 163-168  
**Issue**: Debug console.log statements in auth routes
**Risk**: Information leakage in production logs  
**Fix**: Replace with proper logging service

---

### BUG-007: localStorage Still Used in 67+ Files
**Severity**: 🟡 HIGH  
**Location**: Various frontend files  
**Count**: 282 occurrences across 67 files  
**Key Production Files**:
- `pages/resident/AddVisitorWizard.jsx` (6 occurrences)
- `pages/resident/BulkInviteWizard.jsx` (5 occurrences)
- `pages/guard/Settings.jsx` (5 occurrences)
- `contexts/SearchContext.jsx` (11 occurrences)
- `hooks/useLocalStorage.js` (16 occurrences)
- `App.js` (2 occurrences)

**Risk**: XSS vulnerability if tokens/sensitive data stored  
**Fix**: Audit each usage and migrate sensitive data to httpOnly cookies

---

### BUG-008: Login Response Returns Tokens in Body
**Severity**: 🟡 HIGH  
**File**: `server/src/routes/authRoutes.js`  
**Lines**: 292-301  
**Issue**: Login returns tokens in response body instead of setting httpOnly cookies
```javascript
successResponse(res, {
  user: {...},
  accessToken,  // Should be httpOnly cookie
  refreshToken  // Should be httpOnly cookie
}, 'Login successful');
```
**Risk**: Tokens exposed to JavaScript (XSS risk)  
**Fix**: Set tokens as httpOnly cookies instead of body

---

## 1.3 System Components Status

### Authentication System
| Feature | Status | Notes |
|---------|--------|-------|
| Login | ⚠️ Partial | Tokens in body, not cookies |
| Registration | ❌ Broken | Wrong endpoint called |
| Logout | ✅ Working | Clears cookies |
| Profile | ✅ Working | Protected route |
| MFA Setup | ✅ Working | TOTP implementation |
| MFA Verify | ✅ Working | Backup codes supported |

### Resident Features
| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard | ⚠️ Partial | Depends on auth fix |
| Add Visitor | ⚠️ Partial | localStorage drafts |
| Bulk Invite | ⚠️ Partial | localStorage drafts |
| Visitor History | ✅ Working | Uses credentials:include |
| Generate Pass | ✅ Working | QR generation |
| Settings | ⚠️ Partial | localStorage preferences |

### Guard Features
| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard | ⚠️ Partial | Depends on auth fix |
| QR Scan | ✅ Working | Camera access needed |
| Manual Check | ✅ Working | Form validation |
| Walk-In Registration | ✅ Working | Approval flow |
| Incident Reporting | ✅ Working | New feature |

### Admin Features
| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard | ⚠️ Partial | Depends on auth fix |
| User Management | ✅ Working | CRUD operations |
| Reports | ✅ Working | Export functionality |
| Analytics | ✅ Working | Chart visualization |

---

# PART 2: COMPREHENSIVE TEST PLAN

## 2.1 Test Categories Overview

| Category | Test Count | Priority |
|----------|-----------|----------|
| **Authentication Tests** | 15 | 🔴 Critical |
| **Security Tests** | 12 | 🔴 Critical |
| **Resident Functionality** | 18 | 🟡 High |
| **Guard Functionality** | 14 | 🟡 High |
| **Admin Functionality** | 12 | 🟡 High |
| **UI/UX Tests** | 20 | 🟢 Medium |
| **Integration Tests** | 10 | 🟡 High |
| **Performance Tests** | 8 | 🟢 Medium |
| **TOTAL** | **109** | - |

---

## 2.2 Authentication Tests (15 Tests)

### AUTH-001: Login with Valid Credentials
**Priority**: 🔴 Critical  
**Steps**:
1. Navigate to `/login`
2. Enter valid username and password
3. Click "Login" button
**Expected**: User redirected to role-specific dashboard  
**Validates**: Login API, token generation, redirect logic

### AUTH-002: Login with Invalid Credentials
**Priority**: 🔴 Critical  
**Steps**:
1. Navigate to `/login`
2. Enter invalid username/password
3. Click "Login" button
**Expected**: Error message displayed, no redirect  
**Validates**: Error handling, security response

### AUTH-003: Login with Empty Fields
**Priority**: 🟡 High  
**Steps**:
1. Navigate to `/login`
2. Leave fields empty
3. Click "Login" button
**Expected**: Validation error shown  
**Validates**: Client-side validation

### AUTH-004: Registration Flow
**Priority**: 🔴 Critical  
**Steps**:
1. Navigate to `/register`
2. Fill in all required fields
3. Submit registration
**Expected**: User created, success message shown  
**Validates**: Registration API, validation, database insert

### AUTH-005: Registration Duplicate Email
**Priority**: 🟡 High  
**Steps**:
1. Register with existing email
**Expected**: Error message about duplicate email  
**Validates**: Unique constraint handling

### AUTH-006: Logout Functionality
**Priority**: 🔴 Critical  
**Steps**:
1. Login as any user
2. Click logout
**Expected**: Redirected to login, session cleared  
**Validates**: Cookie clearing, state reset

### AUTH-007: Session Persistence
**Priority**: 🟡 High  
**Steps**:
1. Login successfully
2. Refresh the page
**Expected**: User remains logged in  
**Validates**: httpOnly cookie persistence

### AUTH-008: Protected Route Access (Unauthorized)
**Priority**: 🔴 Critical  
**Steps**:
1. Without logging in, visit `/dashboard/resident`
**Expected**: Redirected to login  
**Validates**: ProtectedRoute component

### AUTH-009: Role-Based Access (Resident to Admin)
**Priority**: 🔴 Critical  
**Steps**:
1. Login as resident
2. Try to access `/dashboard/admin`
**Expected**: Access denied or redirect  
**Validates**: RBAC implementation

### AUTH-010: MFA Setup Flow
**Priority**: 🟡 High  
**Steps**:
1. Login without MFA
2. Navigate to MFA setup
3. Scan QR code and verify
**Expected**: MFA enabled for account  
**Validates**: TOTP generation, backup codes

### AUTH-011: MFA Login Flow
**Priority**: 🟡 High  
**Steps**:
1. Enable MFA on account
2. Login with credentials
3. Enter MFA code
**Expected**: Successfully logged in  
**Validates**: Two-step authentication

### AUTH-012: MFA Backup Code Usage
**Priority**: 🟡 High  
**Steps**:
1. Enable MFA
2. Login and use backup code instead of TOTP
**Expected**: Login succeeds, backup code invalidated  
**Validates**: Backup code single-use

### AUTH-013: Password Reset Request
**Priority**: 🟡 High  
**Steps**:
1. Click "Forgot Password"
2. Enter email
3. Submit
**Expected**: Reset email sent (or notification)  
**Validates**: Password reset flow

### AUTH-014: Session Timeout Warning
**Priority**: 🟢 Medium  
**Steps**:
1. Login and wait for timeout warning
**Expected**: Warning modal appears before expiry  
**Validates**: SessionTimeoutWarning component

### AUTH-015: Concurrent Session Handling
**Priority**: 🟢 Medium  
**Steps**:
1. Login from two browsers
2. Logout from one
**Expected**: Other session behavior defined  
**Validates**: Session management

---

## 2.3 Security Tests (12 Tests)

### SEC-001: XSS Prevention - Input Fields
**Priority**: 🔴 Critical  
**Steps**:
1. Enter `<script>alert('XSS')</script>` in visitor name
2. Submit form
3. View the stored data
**Expected**: Script not executed, sanitized display  
**Validates**: Input sanitization

### SEC-002: SQL Injection Prevention
**Priority**: 🔴 Critical  
**Steps**:
1. Enter `'; DROP TABLE users; --` in login field
2. Submit
**Expected**: No SQL injection, proper error handling  
**Validates**: Parameterized queries

### SEC-003: CSRF Protection
**Priority**: 🔴 Critical  
**Steps**:
1. Attempt state-changing request without CSRF token
**Expected**: Request rejected  
**Validates**: CSRF middleware

### SEC-004: Rate Limiting - Login
**Priority**: 🔴 Critical  
**Steps**:
1. Attempt 10 rapid login attempts
**Expected**: Rate limit message after threshold  
**Validates**: Rate limiter (currently disabled!)

### SEC-005: Secure Headers Present
**Priority**: 🟡 High  
**Steps**:
1. Inspect response headers
**Expected**: X-Content-Type-Options, X-Frame-Options, etc.  
**Validates**: Security headers middleware

### SEC-006: HTTPS Enforcement
**Priority**: 🔴 Critical  
**Steps**:
1. Access site via HTTP
**Expected**: Redirected to HTTPS  
**Validates**: HSTS, redirect middleware

### SEC-007: Cookie Security Attributes
**Priority**: 🟡 High  
**Steps**:
1. Inspect auth cookies
**Expected**: httpOnly, Secure, SameSite=Strict  
**Validates**: Cookie configuration

### SEC-008: Password Hashing
**Priority**: 🔴 Critical  
**Steps**:
1. Create user
2. Check database for password storage
**Expected**: Password hashed with Argon2/bcrypt  
**Validates**: Password service

### SEC-009: Token Expiration
**Priority**: 🟡 High  
**Steps**:
1. Login and get token
2. Wait for expiry time
3. Attempt protected request
**Expected**: Token rejected, refresh required  
**Validates**: JWT expiration

### SEC-010: Sensitive Data Exposure
**Priority**: 🔴 Critical  
**Steps**:
1. Check API responses for passwords/tokens
2. Check browser console for PII
**Expected**: No sensitive data exposed  
**Validates**: Data masking

### SEC-011: File Upload Security
**Priority**: 🟡 High  
**Steps**:
1. Attempt to upload malicious file
**Expected**: Rejected or sanitized  
**Validates**: File upload validation

### SEC-012: Error Message Information Leakage
**Priority**: 🟢 Medium  
**Steps**:
1. Trigger various errors
2. Check error messages
**Expected**: Generic errors, no stack traces in production  
**Validates**: Error handler

---

## 2.4 Resident Functionality Tests (18 Tests)

### RES-001: Dashboard Load
**Priority**: 🟡 High  
**Steps**:
1. Login as resident
2. Verify dashboard displays
**Expected**: Stats, recent visitors, upcoming invites shown  
**Validates**: Dashboard API, component rendering

### RES-002: Add Visitor - Single
**Priority**: 🔴 Critical  
**Steps**:
1. Navigate to Add Visitor
2. Fill in visitor details
3. Submit
**Expected**: Visitor created, success notification  
**Validates**: Visitor creation API

### RES-003: Add Visitor - Validation
**Priority**: 🟡 High  
**Steps**:
1. Submit form with invalid phone
2. Submit with past date
**Expected**: Validation errors shown  
**Validates**: Form validation

### RES-004: Add Visitor - Draft Save
**Priority**: 🟢 Medium  
**Steps**:
1. Fill partial form
2. Navigate away
3. Return to form
**Expected**: Draft restored  
**Validates**: localStorage draft (needs review)

### RES-005: Bulk Invite - CSV Upload
**Priority**: 🟡 High  
**Steps**:
1. Navigate to Bulk Invite
2. Upload CSV file
3. Verify preview
4. Submit
**Expected**: Multiple visitors created  
**Validates**: CSV parsing, batch creation

### RES-006: Bulk Invite - Wizard Flow
**Priority**: 🟡 High  
**Steps**:
1. Complete Step 1 (Event details)
2. Complete Step 2 (Guest list)
3. Complete Step 3 (Review)
**Expected**: Event created with all guests  
**Validates**: Multi-step wizard

### RES-007: Generate Pass - QR Code
**Priority**: 🔴 Critical  
**Steps**:
1. Navigate to Generate Pass
2. Select visitor
3. Generate QR code
**Expected**: QR code displayed, downloadable  
**Validates**: QR generation service

### RES-008: Visitor History - List
**Priority**: 🟡 High  
**Steps**:
1. Navigate to Visitor History
**Expected**: List of all visitors shown  
**Validates**: Visitor list API

### RES-009: Visitor History - Filter
**Priority**: 🟢 Medium  
**Steps**:
1. Apply date filter
2. Apply status filter
3. Search by name
**Expected**: Filtered results shown  
**Validates**: Filter functionality

### RES-010: Visitor History - Pagination
**Priority**: 🟢 Medium  
**Steps**:
1. Navigate to second page
**Expected**: Different visitors shown  
**Validates**: Pagination API

### RES-011: Edit Visitor
**Priority**: 🟡 High  
**Steps**:
1. Click edit on existing visitor
2. Modify details
3. Save
**Expected**: Visitor updated  
**Validates**: Update API

### RES-012: Cancel Visitor
**Priority**: 🟡 High  
**Steps**:
1. Cancel an upcoming visitor
**Expected**: Status changed to cancelled  
**Validates**: Status update API

### RES-013: Favorite Visitors
**Priority**: 🟢 Medium  
**Steps**:
1. Add visitor to favorites
2. View favorites list
3. Quick-invite from favorites
**Expected**: Favorites stored and accessible  
**Validates**: Favorites feature

### RES-014: Auto-Approval Rules
**Priority**: 🟢 Medium  
**Steps**:
1. Create auto-approval rule
2. Test with matching visitor
**Expected**: Visitor auto-approved  
**Validates**: Auto-approval service

### RES-015: Notification Preferences
**Priority**: 🟢 Medium  
**Steps**:
1. Update notification settings
2. Trigger notification event
**Expected**: Notification received per settings  
**Validates**: Notification preferences

### RES-016: Privacy Settings
**Priority**: 🟡 High  
**Steps**:
1. Navigate to Privacy Dashboard
2. Request data export
**Expected**: Export initiated  
**Validates**: GDPR/DPA compliance

### RES-017: Walk-In Approval
**Priority**: 🟡 High  
**Steps**:
1. Guard registers walk-in for resident
2. Resident receives approval request
3. Resident approves
**Expected**: Visitor status updated  
**Validates**: Real-time approval flow

### RES-018: Mobile Responsiveness
**Priority**: 🟢 Medium  
**Steps**:
1. Access dashboard on mobile viewport
**Expected**: Mobile-optimized layout  
**Validates**: Responsive design

---

## 2.5 Guard Functionality Tests (14 Tests)

### GRD-001: Dashboard Load
**Priority**: 🟡 High  
**Expected**: Dashboard with action cards displayed

### GRD-002: QR Scan - Valid Code
**Priority**: 🔴 Critical  
**Steps**:
1. Navigate to Scan QR
2. Scan valid visitor QR
**Expected**: Visitor details shown, check-in option  
**Validates**: QR scanning, verification

### GRD-003: QR Scan - Expired Code
**Priority**: 🟡 High  
**Expected**: Error message about expired pass

### GRD-004: QR Scan - Invalid Code
**Priority**: 🟡 High  
**Expected**: Error message about invalid code

### GRD-005: Manual Check-In
**Priority**: 🔴 Critical  
**Steps**:
1. Navigate to Manual Check
2. Search visitor by name
3. Check-in visitor
**Expected**: Visitor checked in, timestamp recorded  
**Validates**: Manual check-in API

### GRD-006: Manual Check-Out
**Priority**: 🟡 High  
**Expected**: Visitor checked out, duration recorded

### GRD-007: Walk-In Registration
**Priority**: 🟡 High  
**Steps**:
1. Navigate to Walk-In Registration
2. Enter visitor details
3. Select resident for approval
4. Submit
**Expected**: Pending approval created  
**Validates**: Walk-in flow

### GRD-008: Incident Reporting
**Priority**: 🟡 High  
**Steps**:
1. Create new incident
2. Add details and photos
3. Submit
**Expected**: Incident created with timestamp  
**Validates**: Incident API

### GRD-009: Visitor History (Guard View)
**Priority**: 🟢 Medium  
**Expected**: All visitors from today shown

### GRD-010: Search Visitor
**Priority**: 🟢 Medium  
**Expected**: Search results displayed

### GRD-011: Visitor Details View
**Priority**: 🟢 Medium  
**Expected**: Full visitor details with history

### GRD-012: Guard Analytics
**Priority**: 🟢 Medium  
**Expected**: Shift statistics displayed

### GRD-013: Emergency Alert
**Priority**: 🟡 High  
**Expected**: Alert sent to administrators

### GRD-014: Offline Mode
**Priority**: 🟢 Medium  
**Expected**: Basic functionality when offline

---

## 2.6 Admin Functionality Tests (12 Tests)

### ADM-001: Dashboard Load
**Priority**: 🟡 High  
**Expected**: System-wide stats displayed

### ADM-002: User Management - List
**Priority**: 🔴 Critical  
**Expected**: All users listed with roles

### ADM-003: User Management - Create
**Priority**: 🔴 Critical  
**Expected**: New user created

### ADM-004: User Management - Edit
**Priority**: 🟡 High  
**Expected**: User details updated

### ADM-005: User Management - Deactivate
**Priority**: 🟡 High  
**Expected**: User deactivated, cannot login

### ADM-006: Reports - Generate
**Priority**: 🟡 High  
**Expected**: Report generated with data

### ADM-007: Reports - Export
**Priority**: 🟢 Medium  
**Expected**: CSV/PDF downloaded

### ADM-008: Analytics View
**Priority**: 🟢 Medium  
**Expected**: Charts and metrics displayed

### ADM-009: System Settings
**Priority**: 🟡 High  
**Expected**: Settings saved and applied

### ADM-010: Audit Log View
**Priority**: 🟡 High  
**Expected**: Audit entries displayed

### ADM-011: Watchlist Management
**Priority**: 🟢 Medium  
**Expected**: Watchlist CRUD operations

### ADM-012: Policy Management
**Priority**: 🟢 Medium  
**Expected**: Access policies configurable

---

## 2.7 UI/UX Tests (20 Tests)

### UI-001: Navigation - Sidebar
**Expected**: All menu items accessible

### UI-002: Navigation - Bottom Nav (Mobile)
**Expected**: Mobile navigation works

### UI-003: Page Header - Back Navigation
**Expected**: Back buttons work correctly

### UI-004: Empty States
**Expected**: Helpful empty states with CTAs

### UI-005: Loading States
**Expected**: Skeleton loaders shown during fetch

### UI-006: Error States
**Expected**: User-friendly error messages

### UI-007: Form Validation Messages
**Expected**: Clear validation feedback

### UI-008: Toast Notifications
**Expected**: Success/error toasts appear

### UI-009: Modal Dialogs
**Expected**: Modals open/close correctly

### UI-010: Responsive - Desktop (1920px)
**Expected**: Full layout displayed

### UI-011: Responsive - Tablet (768px)
**Expected**: Adapted layout

### UI-012: Responsive - Mobile (375px)
**Expected**: Mobile-optimized layout

### UI-013: Dark Mode Toggle
**Expected**: Theme switches correctly

### UI-014: Language Selection
**Expected**: Translations applied

### UI-015: Accessibility - Keyboard Navigation
**Expected**: Tab navigation works

### UI-016: Accessibility - Screen Reader
**Expected**: ARIA labels present

### UI-017: Touch Targets (44px minimum)
**Expected**: All buttons meet minimum size

### UI-018: Color Contrast
**Expected**: WCAG AA compliance

### UI-019: Focus Indicators
**Expected**: Visible focus states

### UI-020: Browser Compatibility
**Expected**: Works on Chrome, Firefox, Safari

---

## 2.8 Integration Tests (10 Tests)

### INT-001: End-to-End Visitor Flow
**Steps**:
1. Resident creates visitor
2. Visitor receives invite
3. Guard scans QR
4. Visitor checked in
5. Visitor checked out
**Expected**: Complete flow works

### INT-002: End-to-End Bulk Invite
**Steps**:
1. Resident creates bulk event
2. Guests self-register
3. All guests checked in
**Expected**: Multi-guest flow works

### INT-003: Walk-In to Approval
**Expected**: Real-time approval flow

### INT-004: MFA Enable to Login
**Expected**: MFA setup then protected login

### INT-005: Privacy Data Export
**Expected**: All user data exported

### INT-006: Incident to Resolution
**Expected**: Incident workflow complete

### INT-007: Auto-Approval Rule Execution
**Expected**: Matching visitors auto-approved

### INT-008: Notification Delivery
**Expected**: Notifications sent correctly

### INT-009: Search Across Entities
**Expected**: Global search works

### INT-010: Real-Time Updates
**Expected**: Live updates across sessions

---

## 2.9 Performance Tests (8 Tests)

### PERF-001: Page Load Time < 3s
### PERF-002: API Response Time < 500ms
### PERF-003: Large List Rendering (1000+ items)
### PERF-004: Image/Asset Loading
### PERF-005: Bundle Size < 500KB gzipped
### PERF-006: Memory Usage Stable
### PERF-007: Lighthouse Score > 80
### PERF-008: Concurrent Users (50+)

---

# PART 3: TEST IMPLEMENTATION ROADMAP

## 3.1 Phased Approach

### Phase 1: Critical Bug Fixes (Before Testing)
**Duration**: 2-4 hours  
**Tasks**:
1. Fix BUG-004: Add `/api/auth/me` endpoint OR change to `/api/auth/profile`
2. Fix BUG-005: Change register endpoint to `/api/auth/register`
3. Fix BUG-001: Re-enable rate limiting (after testing complete)
4. Fix BUG-002: Remove localStorage role usage from App.js
5. Fix BUG-008: Set tokens as httpOnly cookies in login response

### Phase 2: Authentication Testing
**Duration**: 1-2 hours  
**Tests**: AUTH-001 through AUTH-015  
**Method**: Manual + Puppeteer automation

### Phase 3: Security Testing
**Duration**: 1-2 hours  
**Tests**: SEC-001 through SEC-012  
**Method**: Manual + OWASP ZAP scan

### Phase 4: Functionality Testing
**Duration**: 3-4 hours  
**Tests**: RES-001 to RES-018, GRD-001 to GRD-014, ADM-001 to ADM-012  
**Method**: Manual UAT with checklist

### Phase 5: UI/UX Testing
**Duration**: 2-3 hours  
**Tests**: UI-001 through UI-020  
**Method**: Manual + Lighthouse + axe DevTools

### Phase 6: Integration Testing
**Duration**: 1-2 hours  
**Tests**: INT-001 through INT-010  
**Method**: End-to-end Puppeteer scripts

### Phase 7: Performance Testing
**Duration**: 1 hour  
**Tests**: PERF-001 through PERF-008  
**Method**: Lighthouse + Network throttling

---

## 3.2 Timeline Summary

| Phase | Duration | Tests | Priority |
|-------|----------|-------|----------|
| Phase 1: Bug Fixes | 2-4 hrs | N/A | 🔴 Critical |
| Phase 2: Auth Tests | 1-2 hrs | 15 | 🔴 Critical |
| Phase 3: Security Tests | 1-2 hrs | 12 | 🔴 Critical |
| Phase 4: Functionality | 3-4 hrs | 44 | 🟡 High |
| Phase 5: UI/UX | 2-3 hrs | 20 | 🟢 Medium |
| Phase 6: Integration | 1-2 hrs | 10 | 🟡 High |
| Phase 7: Performance | 1 hr | 8 | 🟢 Medium |
| **TOTAL** | **~12-18 hrs** | **109** | - |

---

## 3.3 Test Environment Requirements

### Prerequisites
1. **Backend running**: `npm run dev` in `/server`
2. **Frontend running**: `npm start` in `/client`
3. **Database**: PostgreSQL with test data
4. **Redis**: Running for session management
5. **Test accounts**: Resident, Guard, Admin users

### Test Accounts Needed
| Role | Username | Password |
|------|----------|----------|
| Admin | admin@test.com | Test123! |
| Resident | resident@test.com | Test123! |
| Guard | guard@test.com | Test123! |

---

# PART 4: QUESTIONS FOR CLARIFICATION

Before proceeding with test implementation:

1. **Should I fix the critical bugs first** (BUG-001 to BUG-008) before testing?
2. **Do you have existing test accounts** or should I create them?
3. **Which tests are highest priority** - should we focus on auth/security first?
4. **Is there a staging environment** or should I test locally?
5. **Do you want automated test scripts** or manual test documentation?

---

**Document Version**: 1.0  
**Created**: November 28, 2025  
**Status**: ⏳ Awaiting Approval

---

## Approval Checklist

- [ ] Bug list reviewed and prioritized
- [ ] Test plan scope approved
- [ ] Timeline acceptable
- [ ] Test environment ready
- [ ] Proceed with Phase 1 (Bug Fixes)
