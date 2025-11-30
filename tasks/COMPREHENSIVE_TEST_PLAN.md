# Comprehensive Test Plan - Secure Gate Platform

**Date**: November 20, 2025  
**Scope**: Full platform testing across all user roles  
**Environment**: Local → Staging  

---

## 🎯 TESTING OBJECTIVES

1. Verify all user roles function correctly
2. Test complete workflows end-to-end
3. Validate security measures
4. Confirm database integrity
5. Test API endpoints
6. Verify UI/UX across all components

---

## 👥 USER ROLE TESTING

### 1. VISITOR TESTING

#### Public Digital Pass Page (`/v/:token`)
- [ ] Token validation works
- [ ] QR code displays correctly
- [ ] Visitor information shows accurately
- [ ] Status updates in real-time
- [ ] Check-in button enabled when approved
- [ ] Language toggle works (EN/SW)
- [ ] Mobile responsive design
- [ ] Expired tokens show error message

#### Self-Service Kiosk (`/kiosk`)
- [ ] Touch-friendly interface
- [ ] Webcam access for photo capture
- [ ] Photo preview and retake
- [ ] Resident search functionality
- [ ] ID number validation
- [ ] Walk-in registration submission
- [ ] QR code generation on approval
- [ ] Auto-reset after inactivity
- [ ] Language switching (EN/SW)
- [ ] Error handling for camera issues

#### Legal Consent Flow
- [ ] 4 consent types display
- [ ] Expandable sections work
- [ ] Accept all checkbox
- [ ] Individual consent toggles
- [ ] Submission requires all consents
- [ ] Audit trail created
- [ ] Right to withdraw shown
- [ ] Kenya DPA compliance verified

---

### 2. RESIDENT TESTING

#### Dashboard (`/resident/dashboard`)
- [ ] Login with resident credentials
- [ ] View pending visitor requests
- [ ] Approve visitor request
- [ ] Reject visitor request
- [ ] View visitor history
- [ ] Filter by date range
- [ ] Export visitor list (CSV)

#### Visitor Invitation (`/resident/visitors/invite`)
- [ ] Create new visitor invite
- [ ] Fill all required fields
- [ ] Set visit date/time
- [ ] Add purpose of visit
- [ ] Upload photo (optional)
- [ ] Submit and get confirmation
- [ ] Receive notification email/SMS
- [ ] View QR code generation
- [ ] Copy invite link

#### Notification Preferences
- [ ] View current preferences
- [ ] Toggle email notifications
- [ ] Toggle SMS notifications
- [ ] Save preferences
- [ ] Test notification delivery

---

### 3. GUARD TESTING

#### Guard Dashboard (`/guard/dashboard`)
- [ ] Login with guard credentials
- [ ] View pending approvals
- [ ] See today's expected visitors
- [ ] View checked-in visitors
- [ ] Search visitor by name/ID
- [ ] Quick stats display

#### Check-In Process
- [ ] Scan QR code (or manual entry)
- [ ] Verify visitor identity
- [ ] Photo comparison
- [ ] Check-in confirmation
- [ ] Watchlist alert (if match)
- [ ] Policy violation alert (if any)
- [ ] Notification sent to resident

#### Check-Out Process
- [ ] Find checked-in visitor
- [ ] Confirm check-out
- [ ] Calculate visit duration
- [ ] Update visitor status
- [ ] Notification sent

#### Incident Reporting
- [ ] Create new incident
- [ ] Select severity level
- [ ] Add description
- [ ] Upload evidence (optional)
- [ ] Submit incident
- [ ] View incident status

---

### 4. ADMIN TESTING

#### A1: Analytics Dashboard (`/admin/dashboard`)
- [ ] Login with admin credentials
- [ ] View 4 KPI cards (total visitors, pending, incidents, guards)
- [ ] Date range filter works
- [ ] Visitor trends chart displays
- [ ] Purpose breakdown pie chart
- [ ] Peak hours bar chart
- [ ] Incident trends line chart
- [ ] Guard performance table
- [ ] Resident activity table
- [ ] CSV export functionality
- [ ] Real-time data updates
- [ ] Responsive on mobile

#### A2: RBAC Management (`/admin/roles`)
- [ ] View all roles (6 levels)
- [ ] See role hierarchy visualization
- [ ] View permissions (30+)
- [ ] Permission groups display
- [ ] Assign role to user
- [ ] Remove role from user
- [ ] Search users
- [ ] Filter by role
- [ ] Create new role (if applicable)
- [ ] Edit role permissions

#### A3: Policy Management (`/admin/policies`)
- [ ] View all policies
- [ ] Filter by type (5 types)
- [ ] Create new policy
- [ ] JSON condition editor works
- [ ] JSON action editor works
- [ ] Select template
- [ ] Enable/disable policy
- [ ] Edit existing policy
- [ ] Delete policy
- [ ] Test policy evaluation
- [ ] View violation history

#### A3: Watchlist Management (`/admin/watchlist`)
- [ ] View watchlist entries
- [ ] Filter by severity
- [ ] Add new entry
- [ ] Edit existing entry
- [ ] Delete entry
- [ ] View match history
- [ ] Search by identifier
- [ ] Auto-alert on match
- [ ] Export watchlist (CSV)

#### A4: Incident Workflow (`/admin/incidents`)
- [ ] View incident queue
- [ ] Filter tabs work (All, Critical, Assigned to Me, Unassigned, SLA Breached)
- [ ] Status display correct
- [ ] Severity badges color-coded
- [ ] SLA warnings visible
- [ ] Click to open detail modal
- [ ] Bulk status updates
- [ ] Search incidents

#### A4: Incident Detail Modal
- [ ] 4 tabs display (Details, Comments, History, SLA)
- [ ] Details tab shows all info
- [ ] Comments tab allows adding comments
- [ ] Comment submission works
- [ ] Internal/public toggle
- [ ] History tab shows timeline
- [ ] SLA tab shows progress bars
- [ ] Status change dropdown
- [ ] Assign to user dropdown
- [ ] Escalate functionality
- [ ] Close incident button
- [ ] Real-time updates

#### A5: Site Management (`/admin/sites`)
- [ ] View all sites
- [ ] Create new site
- [ ] Edit site details
- [ ] Color pickers work (primary/secondary)
- [ ] Upload logo
- [ ] Set timezone
- [ ] Configure features
- [ ] Set subscription tier
- [ ] Activate/deactivate site
- [ ] Switch to site (changes context)

#### A5: Integrations Hub (`/admin/integrations`)
**Webhooks Tab:**
- [ ] View all webhooks
- [ ] Create new webhook
- [ ] Edit webhook URL
- [ ] Set event type
- [ ] Add secret for signing
- [ ] Custom headers work
- [ ] Enable/disable webhook
- [ ] Test webhook (sends test payload)
- [ ] View delivery history
- [ ] Success/failure stats

**Automation Tab:**
- [ ] View all automation rules
- [ ] Create new rule
- [ ] Select trigger event
- [ ] JSON conditions editor
- [ ] JSON actions editor
- [ ] Set priority
- [ ] Enable/disable rule
- [ ] View execution log
- [ ] Test rule execution
- [ ] Edit existing rule
- [ ] Delete rule

**API Keys Tab:**
- [ ] View all API keys (masked)
- [ ] Generate new API key
- [ ] Set permissions/scopes
- [ ] Set rate limits
- [ ] Set expiration date
- [ ] Copy key (only shown once)
- [ ] Revoke API key
- [ ] View usage statistics
- [ ] Last used timestamp

---

## 🔐 SECURITY TESTING

### Authentication
- [ ] Login works with valid credentials
- [ ] Login fails with invalid credentials
- [ ] Session timeout works (30 min inactivity)
- [ ] Logout clears session
- [ ] httpOnly cookies set correctly
- [ ] CSRF token validation
- [ ] Rate limiting on login (5 attempts)

### Authorization
- [ ] Admin can access all routes
- [ ] Guard cannot access admin routes
- [ ] Resident cannot access guard routes
- [ ] Public routes accessible without auth
- [ ] Protected routes redirect to login
- [ ] Role-based permissions enforced

### Data Protection
- [ ] Passwords hashed (bcrypt)
- [ ] API keys hashed (SHA-256)
- [ ] Sensitive data encrypted
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CORS configured correctly
- [ ] No tokens in localStorage
- [ ] Secure headers present

---

## 🔌 API ENDPOINT TESTING

### Public APIs (3 endpoints)
```bash
# Test visitor token
curl http://localhost:5000/api/public/visitor/test_token

# Test check-in
curl -X POST http://localhost:5000/api/public/visitor/checkin \
  -H "Content-Type: application/json" \
  -d '{"token":"test_token","notes":"Test"}'

# Test check-out
curl -X POST http://localhost:5000/api/public/visitor/checkout \
  -H "Content-Type: application/json" \
  -d '{"token":"test_token"}'
```

### Admin Analytics APIs (5 endpoints)
- [ ] GET /api/admin/analytics/overview
- [ ] GET /api/admin/analytics/visitors
- [ ] GET /api/admin/analytics/incidents
- [ ] GET /api/admin/analytics/guards
- [ ] GET /api/admin/analytics/residents

### Incident APIs (9 endpoints)
- [ ] GET /api/admin/incidents/queue
- [ ] GET /api/admin/incidents/stats
- [ ] PUT /api/admin/incidents/:id/status
- [ ] POST /api/admin/incidents/:id/assign
- [ ] POST /api/admin/incidents/:id/escalate
- [ ] GET /api/admin/incidents/:id/comments
- [ ] POST /api/admin/incidents/:id/comments
- [ ] GET /api/admin/incidents/:id/history
- [ ] GET /api/admin/incidents/:id/sla

### Integrations APIs (20 endpoints)
- [ ] Webhooks CRUD (5 endpoints)
- [ ] Automation CRUD (4 endpoints)
- [ ] API Keys management (3 endpoints)
- [ ] Sites management (4 endpoints)

---

## 🗄️ DATABASE TESTING

### Data Integrity
- [ ] All 8 migrations executed successfully
- [ ] 30 tables created
- [ ] Foreign keys enforced
- [ ] Indexes present (70+)
- [ ] Triggers functional (3)
- [ ] Functions working (15+)

### Query Performance
- [ ] Analytics queries < 500ms
- [ ] Visitor search < 100ms
- [ ] Incident queue < 200ms
- [ ] Dashboard load < 1s
- [ ] No N+1 query issues

### Test Data
- [ ] Create test users (5 per role)
- [ ] Create test visitors (50+)
- [ ] Create test incidents (20+)
- [ ] Create test policies (5)
- [ ] Create watchlist entries (10)

---

## 🎨 UI/UX TESTING

### Responsive Design
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)
- [ ] Touch interactions work

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader friendly
- [ ] Color contrast (WCAG AA)
- [ ] Focus indicators visible
- [ ] Alt text on images

### Performance
- [ ] Page load < 3s
- [ ] Time to interactive < 5s
- [ ] No console errors
- [ ] No 404 errors
- [ ] Smooth animations

---

## 🚨 ERROR HANDLING

### User Errors
- [ ] Invalid form submission shows errors
- [ ] Network timeout handled gracefully
- [ ] 404 page displays
- [ ] 500 error page displays
- [ ] Validation messages clear

### System Errors
- [ ] Database connection failure handled
- [ ] API timeout handled
- [ ] File upload errors shown
- [ ] Email delivery failure logged
- [ ] SMS delivery failure logged

---

## 📊 INTEGRATION TESTING

### Webhook Delivery
- [ ] Create webhook
- [ ] Trigger event
- [ ] Webhook fires
- [ ] Signature correct
- [ ] Retry on failure
- [ ] Delivery logged

### Automation Execution
- [ ] Create rule
- [ ] Trigger event
- [ ] Conditions evaluated
- [ ] Actions executed
- [ ] Execution logged
- [ ] Error handling works

### Report Generation
- [ ] Generate visitor report (PDF)
- [ ] Generate incident report (CSV)
- [ ] Generate guard performance (PDF)
- [ ] Schedule report
- [ ] Email report sent

### Notifications
- [ ] Email notification sent
- [ ] SMS notification sent (if configured)
- [ ] Multi-language templates work
- [ ] Unsubscribe link works
- [ ] Notification logged

---

## ✅ TEST EXECUTION CHECKLIST

### Pre-Testing Setup
- [ ] Fix npm permissions
- [ ] Install dependencies
- [ ] Run all migrations
- [ ] Register all routes
- [ ] Create test data
- [ ] Configure .env

### Testing Phases
1. **Phase 1**: Database & API (30 min)
2. **Phase 2**: Authentication & Authorization (30 min)
3. **Phase 3**: Visitor flows (45 min)
4. **Phase 4**: Guard operations (30 min)
5. **Phase 5**: Admin dashboards (60 min)
6. **Phase 6**: Integrations (45 min)
7. **Phase 7**: Edge cases & errors (30 min)

**Total Estimated Time**: 4-5 hours

---

## 📝 TEST RESULTS TEMPLATE

```
# Test Results - [Date]

## Summary
- Tests Run: X
- Passed: Y
- Failed: Z
- Skipped: N

## Critical Issues
1. [Issue description]
   - Severity: High/Medium/Low
   - Steps to reproduce
   - Expected vs Actual
   - Fix required

## Pass/Fail by Category
- Visitor Testing: X/Y
- Resident Testing: X/Y
- Guard Testing: X/Y
- Admin Testing: X/Y
- Security Testing: X/Y
- API Testing: X/Y
- Database Testing: X/Y
- UI/UX Testing: X/Y

## Recommendations
1. [Recommendation]
2. [Recommendation]

## Sign-off
- Tester: [Name]
- Date: [Date]
- Status: Ready/Not Ready for Staging
```

---

## 🚀 STAGING DEPLOYMENT CHECKLIST

Only proceed if local testing shows >90% pass rate:

- [ ] All critical tests passed
- [ ] Security validated
- [ ] Performance acceptable
- [ ] Documentation updated
- [ ] Backup database
- [ ] Deploy to staging
- [ ] Smoke test on staging
- [ ] Monitor for 24 hours

---

## ⏸️ PRODUCTION HOLD

**DO NOT deploy to production until**:
1. Staging tests complete (48 hours)
2. User acceptance testing done
3. Performance benchmarks met
4. Security audit passed
5. Final approval obtained

---

**Status**: Ready for execution ✅
