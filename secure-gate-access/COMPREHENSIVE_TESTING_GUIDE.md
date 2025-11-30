# Secure Gate Access - Comprehensive Testing Guide

**Version:** 1.0  
**Date:** November 27, 2025  
**Status:** Ready for Testing  

---

## Table of Contents

1. [Pre-Testing Setup](#pre-testing-setup)
2. [Backend API Tests](#backend-api-tests)
3. [Frontend Component Tests](#frontend-component-tests)
4. [Integration Tests](#integration-tests)
5. [Accessibility Tests](#accessibility-tests)
6. [Performance Tests](#performance-tests)
7. [Security Tests](#security-tests)
8. [i18n Tests](#i18n-tests)
9. [Mobile/Responsive Tests](#mobileresponsive-tests)
10. [End-to-End User Flows](#end-to-end-user-flows)

---

## Pre-Testing Setup

### Environment Requirements

```bash
# Node.js version
node -v  # Should be 18.x or higher

# Install dependencies
cd secure-gate-access
npm install

# Backend dependencies
cd server
npm install

# Start backend server
npm run dev

# In a new terminal, start frontend
cd client
npm start
```

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@securegate.local | Test@123 |
| Guard | guard@securegate.local | Test@123 |
| Resident | resident@securegate.local | Test@123 |

---

## Backend API Tests

### Authentication Endpoints

```bash
# 1. Health Check
curl http://localhost:5000/api/health

# 2. Register User
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","password":"Test@123","role":"resident"}'

# 3. Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@123"}'

# 4. Get Profile (with token)
curl http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 5. Logout
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Visitor Management Endpoints

```bash
# 1. Create Visitor (Resident)
curl -X POST http://localhost:5000/api/visitors \
  -H "Authorization: Bearer RESIDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"John Visitor","phone":"+254712345678","purpose":"Meeting","dateOfVisit":"2025-11-28"}'

# 2. Get All Visitors
curl http://localhost:5000/api/visitors \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Get Visitor by ID
curl http://localhost:5000/api/visitors/VISITOR_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# 4. Check-in Visitor (Guard)
curl -X POST http://localhost:5000/api/visitors/VISITOR_ID/check-in \
  -H "Authorization: Bearer GUARD_TOKEN"

# 5. Check-out Visitor (Guard)
curl -X POST http://localhost:5000/api/visitors/VISITOR_ID/check-out \
  -H "Authorization: Bearer GUARD_TOKEN"

# 6. Revoke Access (Resident)
curl -X PUT http://localhost:5000/api/visitors/VISITOR_ID/revoke \
  -H "Authorization: Bearer RESIDENT_TOKEN"
```

### QR Code Endpoints

```bash
# 1. Generate QR Code
curl http://localhost:5000/api/visitors/VISITOR_ID/qr \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Verify QR Code
curl -X POST http://localhost:5000/api/visitors/verify-qr \
  -H "Authorization: Bearer GUARD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"qrData":"QR_CODE_DATA_HERE"}'
```

### Expected Status Codes

| Endpoint | Success | Auth Error | Not Found |
|----------|---------|------------|-----------|
| POST /auth/login | 200 | 401 | 404 |
| GET /visitors | 200 | 401 | - |
| POST /visitors | 201 | 401 | - |
| GET /visitors/:id | 200 | 401 | 404 |
| PUT /visitors/:id | 200 | 401 | 404 |
| DELETE /visitors/:id | 204 | 401 | 404 |

---

## Frontend Component Tests

### Manual Component Testing Checklist

#### Toast Notifications
- [ ] Success toast displays correctly
- [ ] Error toast displays correctly
- [ ] Warning toast displays correctly
- [ ] Info toast displays correctly
- [ ] Toast stacks properly (max 4)
- [ ] Swipe to dismiss works on mobile
- [ ] Pause on hover works
- [ ] Action button triggers callback
- [ ] Undo button triggers callback
- [ ] Progress bar animates correctly

#### Bottom Sheet
- [ ] Opens on trigger
- [ ] Drag handle works
- [ ] Snap to 25%, 50%, 75%, 90%
- [ ] Backdrop closes sheet
- [ ] Escape key closes sheet
- [ ] Content is scrollable
- [ ] Focus trap works

#### Command Palette
- [ ] Opens with Cmd+K
- [ ] Search filters commands
- [ ] Arrow keys navigate
- [ ] Enter selects command
- [ ] Escape closes palette
- [ ] Role-specific commands appear

#### Onboarding Tour
- [ ] Starts on first login
- [ ] Steps highlight correct elements
- [ ] Next/Previous buttons work
- [ ] Skip button works
- [ ] Finish button works
- [ ] Progress dots show correctly
- [ ] Doesn't show on repeat visits

#### Language Selector
- [ ] Shows all 4 languages
- [ ] English works correctly
- [ ] Swahili works correctly
- [ ] French works correctly
- [ ] Arabic activates RTL mode
- [ ] Persists on page reload

---

## Integration Tests

### Visitor Invite Flow

```
1. Resident logs in
2. Navigate to Add Visitor
3. Fill visitor details
4. Submit form
5. Verify visitor appears in list
6. Verify QR code is generated
7. Copy invite link
8. Logout

Expected: Visitor created, QR visible, shareable link works
```

### Check-In Flow

```
1. Guard logs in
2. Navigate to Scan QR
3. Scan visitor QR code (or enter manually)
4. Verify visitor details displayed
5. Click Check In
6. Verify status changes to "Checked In"
7. Verify timestamp recorded

Expected: Visitor status updated, notification sent to resident
```

### Check-Out Flow

```
1. Guard logs in
2. Navigate to Active Visitors
3. Find checked-in visitor
4. Click Check Out
5. Verify status changes to "Checked Out"
6. Verify exit timestamp recorded

Expected: Visit completed, available in history
```

### Panic Button Flow

```
1. Guard logs in
2. Click Panic Button (or press Cmd+Shift+P)
3. Confirm emergency action
4. Verify alert sent to admins
5. Verify emergency mode activated
6. Admin receives notification

Expected: All admins notified immediately
```

---

## Accessibility Tests

### Automated Testing

```bash
# Run Lighthouse accessibility audit
npx lighthouse http://localhost:3000 --only-categories=accessibility --output=html --output-path=./accessibility-report.html

# Target score: 90+
```

### Manual Keyboard Navigation

| Area | Tab Order | Shortcuts |
|------|-----------|-----------|
| Login | Email → Password → Submit | Enter to submit |
| Dashboard | Stats → Actions → Lists | Cmd+K command palette |
| Visitor Form | Name → Phone → Purpose → Date → Submit | Tab through all fields |
| Modal | Content → Actions → Close | Escape to close |

### Screen Reader Testing

Using VoiceOver (Mac) or NVDA (Windows):

1. **Login Page**
   - [ ] Form labels announced
   - [ ] Error messages announced
   - [ ] Submit button is labeled

2. **Dashboard**
   - [ ] Stats cards have readable labels
   - [ ] Navigation landmarks present
   - [ ] Live regions announce changes

3. **Modals**
   - [ ] Focus moves to modal on open
   - [ ] Modal content is readable
   - [ ] Close action is accessible

4. **Toasts**
   - [ ] Toast content is announced
   - [ ] Action buttons are labeled
   - [ ] Dismiss is accessible

### WCAG 2.1 AA Checklist

- [ ] 1.4.3: Color contrast ratio ≥ 4.5:1 for text
- [ ] 1.4.11: Non-text contrast ratio ≥ 3:1
- [ ] 2.1.1: All functions keyboard accessible
- [ ] 2.4.3: Logical focus order
- [ ] 2.4.4: Link purpose clear from text
- [ ] 2.4.7: Focus indicator visible
- [ ] 2.5.3: Label in name (buttons/links)
- [ ] 4.1.2: ARIA attributes valid

---

## Performance Tests

### Lighthouse Performance Audit

```bash
npx lighthouse http://localhost:3000 --only-categories=performance --output=html --output-path=./performance-report.html
```

### Key Metrics Targets

| Metric | Target | Critical |
|--------|--------|----------|
| First Contentful Paint | < 1.8s | < 3.0s |
| Largest Contentful Paint | < 2.5s | < 4.0s |
| Time to Interactive | < 3.9s | < 7.3s |
| Cumulative Layout Shift | < 0.1 | < 0.25 |
| Total Blocking Time | < 300ms | < 600ms |

### Bundle Size Analysis

```bash
cd client
npm run build
npx source-map-explorer build/static/js/*.js
```

Target: Main bundle < 250KB gzipped

### API Response Time Targets

| Endpoint | Target | Max |
|----------|--------|-----|
| GET /visitors | < 100ms | < 500ms |
| POST /visitors | < 200ms | < 1s |
| POST /auth/login | < 300ms | < 1s |
| GET /qr-code | < 150ms | < 500ms |

---

## Security Tests

### Authentication

- [ ] Passwords hashed with bcrypt
- [ ] JWT tokens expire correctly
- [ ] Refresh tokens work
- [ ] Logout invalidates tokens
- [ ] Rate limiting on login (5/min)

### Authorization

- [ ] Residents can't access guard routes
- [ ] Guards can't access admin routes
- [ ] Visitors are scoped to their resident
- [ ] API routes require valid token

### Input Validation

- [ ] XSS prevention on all inputs
- [ ] SQL injection prevention
- [ ] File upload validation
- [ ] Email format validation
- [ ] Phone number format validation

### HTTPS & Headers

```bash
# Check security headers
curl -I https://your-domain.com

# Expected headers:
# Strict-Transport-Security
# X-Content-Type-Options: nosniff
# X-Frame-Options: DENY
# Content-Security-Policy
```

---

## i18n Tests

### Language Switching

1. Open app in English (default)
2. Open Language Selector
3. Switch to Swahili
   - [ ] All UI text changes to Swahili
   - [ ] Direction remains LTR
   - [ ] Selection persists on refresh
4. Switch to French
   - [ ] All UI text changes to French
   - [ ] Direction remains LTR
5. Switch to Arabic
   - [ ] All UI text changes to Arabic
   - [ ] Direction changes to RTL
   - [ ] Layout flips correctly
   - [ ] Icons that should flip do flip
   - [ ] Numbers/emails remain LTR

### RTL Verification

For Arabic language:

- [ ] Sidebar on right side
- [ ] Text right-aligned
- [ ] Icons flipped (arrows, chevrons)
- [ ] Forms align correctly
- [ ] Modals position correctly
- [ ] Dropdowns open correctly
- [ ] Tables align correctly

### Translation Coverage

Check that all strings are translated:

```javascript
// In browser console, when using Arabic:
const missingKeys = Object.keys(window.__i18n_missing || {});
console.log('Missing translations:', missingKeys);
```

---

## Mobile/Responsive Tests

### Breakpoints to Test

| Device | Width | Test Area |
|--------|-------|-----------|
| iPhone SE | 375px | Small mobile |
| iPhone 12 | 390px | Standard mobile |
| iPad | 768px | Tablet portrait |
| iPad Landscape | 1024px | Tablet landscape |
| Laptop | 1440px | Desktop |
| Large Desktop | 1920px | Wide screen |

### Mobile-Specific Features

- [ ] Bottom Sheet works with touch
- [ ] Swipe gestures work
- [ ] Quick Action FAB is visible
- [ ] Touch targets ≥ 44px
- [ ] No horizontal scroll
- [ ] Forms are usable
- [ ] Modals are full-screen on mobile
- [ ] Safe area insets respected

### Touch Gesture Tests

- [ ] Swipe left to dismiss toast
- [ ] Swipe right to dismiss toast
- [ ] Drag bottom sheet handle
- [ ] Pull to refresh (if implemented)
- [ ] Pinch to zoom disabled on inputs

---

## End-to-End User Flows

### Flow 1: New Resident Onboards

```
1. Open app → Redirected to login
2. Click "Register" → Registration form
3. Fill details, select "Resident" role
4. Submit → Account created
5. Auto-login → Dashboard with onboarding tour
6. Complete tour → Dashboard ready
7. Add first visitor → Success toast
8. View QR code → Share with visitor
```

### Flow 2: Visitor Arrives

```
1. Visitor receives QR/link from resident
2. Guard scans QR at gate
3. Visitor details displayed
4. Guard clicks "Check In"
5. Resident receives notification
6. Visitor appears in "Active" list
```

### Flow 3: Admin Reviews Analytics

```
1. Admin logs in
2. Navigate to Analytics Dashboard
3. View visitor trends chart
4. Filter by date range
5. Check hourly traffic pattern
6. Export report (if available)
```

### Flow 4: Guard Handles Emergency

```
1. Guard activates Panic Button
2. Confirm emergency action
3. All admins receive alert
4. Gate locks (simulated)
5. Emergency mode active
6. Admin can review and clear
```

---

## Test Automation (Optional)

### Jest Unit Tests

```bash
cd client
npm test
```

### Cypress E2E Tests

```bash
cd client
npx cypress open
```

Sample Cypress test:

```javascript
describe('Login Flow', () => {
  it('should login as resident', () => {
    cy.visit('/login');
    cy.get('input[name="email"]').type('resident@securegate.local');
    cy.get('input[name="password"]').type('Test@123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
    cy.contains('Welcome').should('be.visible');
  });
});
```

---

## Bug Report Template

When issues are found, use this template:

```markdown
## Bug Report

**Title:** [Brief description]

**Severity:** Critical / High / Medium / Low

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**


**Actual Behavior:**


**Environment:**
- Browser: 
- OS: 
- Screen Size: 
- Language: 

**Screenshots/Videos:**
[Attach if applicable]

**Console Errors:**
```
[Paste any console errors]
```
```

---

## Sign-Off Checklist

Before launch, all checkboxes must be checked:

### Critical
- [ ] All API endpoints functional
- [ ] Authentication works correctly
- [ ] Visitor flow works end-to-end
- [ ] No console errors
- [ ] No broken images/links

### Important
- [ ] Accessibility score ≥ 90
- [ ] Performance score ≥ 80
- [ ] All 4 languages work
- [ ] RTL mode works
- [ ] Mobile layout correct

### Nice to Have
- [ ] All animations smooth
- [ ] Keyboard shortcuts work
- [ ] Empty states look good
- [ ] Error messages helpful

---

## Contact

For testing questions or bug reports:
- **Dev Team:** dev@securegate.example.com
- **QA Lead:** qa@securegate.example.com

---

*Document Version: 1.0*  
*Last Updated: November 27, 2025*
