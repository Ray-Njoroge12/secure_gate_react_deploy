# Secure Gate Access Control - Complete Testing Checklist

## 🎯 Testing Overview

This document provides a comprehensive checklist for testing all features of the Secure Gate Access Control System, both manually via UI and automated via E2E tests.

---

## 🚀 Quick Start

### Start All Services
```bash
./quick-start-testing.sh
```

This will start:
- ✅ PostgreSQL (verify it's running)
- ✅ MailHog (email testing server)
- ✅ Backend API Server (port 5001)
- ✅ Frontend React App (port 3000)

### Access Points
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **MailHog**: http://localhost:8025
- **API Docs**: http://localhost:5001/api-docs

---

## 📋 Manual Testing Checklist

### Phase 1: User Registration & Verification

#### Test 1.1: Admin Registration ✅
- [ ] Navigate to registration page
- [ ] Enter email: `admin-manual@example.com`
- [ ] Enter password: `Admin@123` (strong password)
- [ ] Enter name: `Manual Test Admin`
- [ ] Select role: `Admin`
- [ ] Submit form
- [ ] Verify success message appears
- [ ] Check MailHog - verification email received
- [ ] Copy verification link from email
- [ ] Click verification link
- [ ] Verify "Account verified successfully" message

#### Test 1.2: Guard Registration ✅
- [ ] Repeat registration flow for Guard
- [ ] Email: `guard-manual@example.com`
- [ ] Password: `Guard@123`
- [ ] Name: `Manual Test Guard`
- [ ] Role: `Guard`
- [ ] Verify email and activate account

#### Test 1.3: Resident Registration ✅
- [ ] Repeat registration flow for Resident
- [ ] Email: `resident-manual@example.com`
- [ ] Password: `Resident@123`
- [ ] Name: `Manual Test Resident`
- [ ] Role: `Resident`
- [ ] Verify email and activate account

#### Test 1.4: Registration Validation ⚠️
- [ ] Try weak password: `123` (should fail)
- [ ] Try duplicate email (should fail with clear error)
- [ ] Try invalid email format (should fail)
- [ ] Try empty required fields (should show validation errors)

---

### Phase 2: Authentication

#### Test 2.1: Login - Unverified User ❌
- [ ] Try logging in with unverified account
- [ ] Should see error: "Please verify your email first"

#### Test 2.2: Login - Verified Resident ✅
- [ ] Log in with verified resident credentials
- [ ] Verify redirect to resident dashboard
- [ ] Verify user name/email displayed
- [ ] Verify correct menu items visible (no admin/guard features)

#### Test 2.3: Login - Verified Guard ✅
- [ ] Log out
- [ ] Log in with guard credentials
- [ ] Verify redirect to guard dashboard
- [ ] Verify guard-specific features visible

#### Test 2.4: Login - Verified Admin ✅
- [ ] Log out
- [ ] Log in with admin credentials
- [ ] Verify redirect to admin dashboard
- [ ] Verify all system features accessible

#### Test 2.5: Invalid Login Attempts ❌
- [ ] Try wrong password (should fail)
- [ ] Try non-existent email (should fail)
- [ ] Verify clear error messages

---

### Phase 3: Resident - Guest Management

#### Test 3.1: Single Guest Invite ✅
- [ ] Log in as Resident
- [ ] Navigate to "Create Guest Invite"
- [ ] Fill form:
  - Name: `John Doe`
  - Email: `john.doe@example.com`
  - Phone: `555-123-4567`
  - Visit Date: Tomorrow
  - Purpose: `Family Visit`
- [ ] Submit invite
- [ ] Verify success message
- [ ] Check MailHog - invitation email sent to guest
- [ ] Verify email contains:
  - Guest name
  - Visit date
  - QR code or access link
  - Resident contact info

#### Test 3.2: Bulk Guest Invites ✅
- [ ] Navigate to "Bulk Invite" section
- [ ] Add multiple guests:
  1. `Jane Smith, jane@example.com, 555-123-4568`
  2. `Bob Wilson, bob@example.com, 555-123-4569`
  3. `Alice Brown, alice@example.com, 555-123-4570`
- [ ] Submit bulk invite
- [ ] Verify success message with count
- [ ] Check MailHog - 3 invitation emails sent
- [ ] Verify each email is personalized

#### Test 3.3: View Guest History ✅
- [ ] Navigate to "My Guests" or "Guest History"
- [ ] Verify all 4 invited guests visible
- [ ] Check guest details:
  - [ ] Names correct
  - [ ] Visit dates shown
  - [ ] Status displayed (Pending/Invited)
- [ ] Filter by date range
- [ ] Search for specific guest

#### Test 3.4: Edit/Cancel Guest Invite ⚙️
- [ ] Select a pending guest
- [ ] Edit visit date
- [ ] Update purpose
- [ ] Save changes
- [ ] Verify updates reflected
- [ ] Try canceling an invite
- [ ] Verify guest status changes to "Cancelled"

---

### Phase 4: Guard - Visitor Management

#### Test 4.1: View Visitor List ✅
- [ ] Log in as Guard
- [ ] Navigate to "Visitor Management" or "Check-in"
- [ ] Verify list shows all pending visitors
- [ ] Check visible information:
  - [ ] Guest name
  - [ ] Resident name
  - [ ] Visit date/time
  - [ ] Purpose
  - [ ] Status
- [ ] Filter by:
  - [ ] Today's visitors
  - [ ] Specific resident
  - [ ] Status (Pending/Checked In)

#### Test 4.2: Check-in Visitor ✅
- [ ] Select first guest (John Doe)
- [ ] Click "Check In" button
- [ ] Verify confirmation dialog
- [ ] Confirm check-in
- [ ] Verify:
  - [ ] Success message appears
  - [ ] Status changes to "Checked In"
  - [ ] Check-in timestamp recorded
  - [ ] Guard name logged

#### Test 4.3: Check-out Visitor ✅
- [ ] Locate checked-in guest
- [ ] Click "Check Out" button
- [ ] Confirm check-out
- [ ] Verify:
  - [ ] Success message
  - [ ] Status changes to "Checked Out"
  - [ ] Check-out timestamp recorded
  - [ ] Duration calculated

#### Test 4.4: View Access Logs ✅
- [ ] Navigate to "Access Logs" or "History"
- [ ] Verify log entries show:
  - [ ] Check-in event for John Doe
  - [ ] Check-out event for John Doe
  - [ ] Correct timestamps
  - [ ] Guard name
  - [ ] Resident name
- [ ] Filter logs:
  - [ ] By date range
  - [ ] By visitor name
  - [ ] By event type (check-in/out)
- [ ] Export logs (if available)

#### Test 4.5: Search Visitors ⚙️
- [ ] Use search to find guest by name
- [ ] Search by resident name
- [ ] Search by phone number
- [ ] Verify search results accurate

---

### Phase 5: Admin - System Management

#### Test 5.1: View All Visitors ✅
- [ ] Log in as Admin
- [ ] Navigate to "All Visitors" or "System Overview"
- [ ] Verify can see visitors from ALL residents
- [ ] Check filtering options:
  - [ ] By status
  - [ ] By resident
  - [ ] By date range
  - [ ] By guard
- [ ] Verify statistics displayed:
  - [ ] Total visitors today
  - [ ] Checked in count
  - [ ] Checked out count
  - [ ] Pending count

#### Test 5.2: Bulk Event Invites ✅
- [ ] Navigate to "Bulk Operations" or "Events"
- [ ] Create community event:
  - Event: `Community BBQ`
  - Date: Next Saturday
  - Add 5+ guests with emails
- [ ] Submit bulk invite
- [ ] Verify all invitation emails sent
- [ ] Check event appears in system

#### Test 5.3: User Management ⚙️
- [ ] Navigate to "User Management"
- [ ] View all registered users
- [ ] Check user details:
  - [ ] Email
  - [ ] Role
  - [ ] Verified status
  - [ ] Registration date
- [ ] Edit user (change role, if allowed)
- [ ] Disable/Enable user account
- [ ] Reset user password

#### Test 5.4: Audit Logs ✅
- [ ] Navigate to "Audit Logs" or "System Logs"
- [ ] Verify logs show ALL system events:
  - [ ] User registrations
  - [ ] Login attempts (success/fail)
  - [ ] Guest invitations
  - [ ] Check-in/check-out events
  - [ ] Configuration changes
- [ ] Filter by:
  - [ ] Event type
  - [ ] User
  - [ ] Date range
- [ ] Search logs
- [ ] Export audit trail

#### Test 5.5: System Settings ⚙️
- [ ] Navigate to "Settings"
- [ ] Review configuration options
- [ ] Update system settings (if applicable)
- [ ] Verify changes saved
- [ ] Test rollback if needed

---

### Phase 6: Security & Permissions

#### Test 6.1: Role-Based Access Control ✅
- [ ] Log in as Resident
- [ ] Try accessing admin panel URL (should fail/redirect)
- [ ] Try accessing guard features (should fail)
- [ ] Log in as Guard
- [ ] Try accessing admin panel (should fail)
- [ ] Try creating guest invites (should fail - resident feature)
- [ ] Log in as Admin
- [ ] Verify access to all features

#### Test 6.2: Session Management ⚠️
- [ ] Log in to system
- [ ] Note session token in browser storage
- [ ] Wait for session timeout (or clear storage)
- [ ] Try accessing protected page
- [ ] Should redirect to login

#### Test 6.3: Password Reset Flow ✅
- [ ] Log out
- [ ] Click "Forgot Password"
- [ ] Enter email: `resident-manual@example.com`
- [ ] Submit request
- [ ] Check MailHog - reset email received
- [ ] Click reset link from email
- [ ] Enter new password: `NewResident@456`
- [ ] Confirm password
- [ ] Submit
- [ ] Verify success message
- [ ] Log in with new password
- [ ] Verify successful login

#### Test 6.4: Input Validation & XSS Protection ⚠️
- [ ] Try entering script tags in name field: `<script>alert('xss')</script>`
- [ ] Verify input is sanitized/escaped
- [ ] Try SQL injection in search: `'; DROP TABLE users; --`
- [ ] Verify query is parameterized (no error)
- [ ] Test file upload (if applicable) with malicious files

---

### Phase 7: User Experience & UI

#### Test 7.1: Navigation ✅
- [ ] Test all menu items
- [ ] Verify breadcrumbs work
- [ ] Test back button functionality
- [ ] Verify deep linking (bookmark specific page)
- [ ] Test logout from any page

#### Test 7.2: Forms & Validation ✅
- [ ] Test all form validations
- [ ] Verify error messages are clear
- [ ] Test form submission on Enter key
- [ ] Test form reset
- [ ] Verify required fields marked with *

#### Test 7.3: Responsive Design 📱
- [ ] Open browser DevTools (F12)
- [ ] Enable device toolbar (Ctrl+Shift+M)
- [ ] Test on:
  - [ ] iPhone SE (375px)
  - [ ] iPhone 12 Pro (390px)
  - [ ] iPad (768px)
  - [ ] Desktop (1920px)
- [ ] Verify:
  - [ ] All content visible
  - [ ] Navigation works
  - [ ] Forms usable
  - [ ] No horizontal scroll

#### Test 7.4: Accessibility ♿
- [ ] Navigate entire app using keyboard only
  - [ ] Tab through all interactive elements
  - [ ] Press Enter to submit forms
  - [ ] Press Esc to close modals
- [ ] Run Lighthouse accessibility audit
- [ ] Check color contrast (WCAG AA)
- [ ] Verify all images have alt text
- [ ] Test with screen reader (if available)

#### Test 7.5: Performance ⚡
- [ ] Run Lighthouse performance audit
- [ ] Check page load times
- [ ] Test with network throttling (Slow 3G)
- [ ] Verify lazy loading for images
- [ ] Check bundle size

---

### Phase 8: Email Templates

#### Test 8.1: Verification Email ✅
- [ ] Register new user
- [ ] Check MailHog
- [ ] Verify email contains:
  - [ ] Clear subject line
  - [ ] Professional formatting
  - [ ] Verification link
  - [ ] Expiration notice
  - [ ] Company branding (if applicable)

#### Test 8.2: Guest Invitation Email ✅
- [ ] Create guest invite
- [ ] Check email in MailHog
- [ ] Verify contains:
  - [ ] Guest name
  - [ ] Resident name/contact
  - [ ] Visit date and purpose
  - [ ] Access instructions
  - [ ] QR code or link
  - [ ] Map/directions (if applicable)

#### Test 8.3: Password Reset Email ✅
- [ ] Request password reset
- [ ] Verify email contains:
  - [ ] Clear subject
  - [ ] Reset link
  - [ ] Expiration time
  - [ ] Security notice

---

## 🤖 Automated E2E Testing

### Run Full Test Suite
```bash
cd /Users/raynj/Desktop/secure-gate-react-express
npx playwright test e2e/full-system-test.spec.js --headed
```

### Run Specific Test Categories
```bash
# Authentication tests
npx playwright test e2e/auth/ --headed

# Admin flows
npx playwright test e2e/admin/ --headed

# Guard flows
npx playwright test e2e/guard/ --headed

# Resident flows
npx playwright test e2e/resident/ --headed

# Guest invite tests
npx playwright test e2e/visitor/ --headed

# Accessibility tests
npx playwright test e2e/accessibility/ --headed
```

### View Test Reports
```bash
npx playwright show-report
```

---

## 🧪 API Testing

### Using curl (command line)
```bash
# Health check
curl http://localhost:5001/health

# Register user
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api-test@example.com",
    "password": "Test@123",
    "role": "resident",
    "name": "API Test User"
  }'

# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "api-test@example.com",
    "password": "Test@123"
  }'
```

### Using Postman
1. Import API collection (if available)
2. Set environment variables
3. Run collection tests

---

## 📊 Testing Reports

### Generate Coverage Report
```bash
cd secure-gate-access/client
npm test -- --coverage

cd ../server
npm test -- --coverage
```

### Performance Benchmarks
```bash
cd secure-gate-access/server
npm run test:performance
```

### Mutation Testing
```bash
cd secure-gate-access/server
npm run test:mutation
```

---

## ✅ Sign-Off Checklist

### Before Deployment
- [ ] All manual tests pass
- [ ] All automated tests pass
- [ ] Test coverage > 80%
- [ ] No critical bugs
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] Security scan completed
- [ ] Database migrations tested
- [ ] Email delivery verified (production)
- [ ] Error logging configured
- [ ] Monitoring set up

### Post-Deployment
- [ ] Smoke tests on production
- [ ] Monitor error rates
- [ ] Check email delivery
- [ ] Verify database connections
- [ ] Test with real users
- [ ] Monitor performance metrics

---

## 🐛 Bug Reporting Template

When you find a bug, document it:

```markdown
**Bug Title**: Clear, descriptive title

**Severity**: Critical / High / Medium / Low

**Steps to Reproduce**:
1. 
2. 
3. 

**Expected Behavior**:

**Actual Behavior**:

**Screenshots/Videos**:

**Environment**:
- Browser: 
- OS: 
- User Role: 

**Console Errors**:
```

---

## 📝 Notes

- Keep MailHog running during all tests to capture emails
- Clear browser cache between test runs if needed
- Use incognito mode for fresh sessions
- Document any deviations from expected behavior
- Take screenshots of successful flows for documentation

---

## 🔗 Quick Links

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5001
- **MailHog**: http://localhost:8025
- **Playwright Report**: `npx playwright show-report`
- **Coverage Reports**: 
  - Client: `secure-gate-access/client/coverage/lcov-report/index.html`
  - Server: `secure-gate-access/server/coverage/lcov-report/index.html`

---

**Last Updated**: [Current Date]
**Tested By**: [Your Name]
**Test Environment**: Local Development
