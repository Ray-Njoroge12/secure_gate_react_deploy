# 📋 DAY 6: IMPLEMENTATION + MANUAL E2E TESTING PLAN

**Date**: November 14, 2025 11:40 AM  
**Strategy**: Test FIRST → Identify Real Issues → Implement Fixes

---

## 🎯 EXECUTION STRATEGY

### Phase A: Manual E2E Testing (4 hours)
**Goal**: Discover real-world functionality issues by using the system

1. **Setup & Start Servers** (30 min)
   - Start backend server (local)
   - Start frontend dev server
   - Verify database connectivity
   - Check Redis connection

2. **User Registration & Login Flow** (45 min)
   - Test resident registration
   - Test guard registration  
   - Test admin login
   - Test MFA setup (if enabled)
   - Test password reset
   - Test session persistence
   - **Document all issues**

3. **Resident User Flow** (60 min)
   - Complete resident dashboard tour
   - Create single visitor invitation
   - Create bulk visitor invitations
   - Generate QR pass for visitor
   - View visitor history
   - Manage pending invitations
   - Update profile settings
   - Test privacy controls
   - **Document all issues**

4. **Guard User Flow** (45 min)
   - Access guard dashboard
   - Scan QR code (or simulate)
   - Manual visitor check-in
   - Manual visitor check-out
   - Search visitor records
   - View today's visitor log
   - **Document all issues**

5. **Admin User Flow** (45 min)
   - Access admin dashboard
   - Manage residents (CRUD)
   - Manage guards (CRUD)
   - View all visitor logs
   - Access control configuration
   - View system reports
   - Incident management
   - **Document all issues**

6. **Cross-Role Testing** (30 min)
   - Test role-based access restrictions
   - Attempt unauthorized access
   - Test data isolation
   - **Document security issues**

---

### Phase B: Critical Security Fixes (6 hours)
**Based on audit findings + manual testing discoveries**

1. **localStorage Token Cleanup** (4-5 hours)
   - Fix remaining 54 files
   - Test each user flow after fixes
   - Verify authentication works
   - Verify no token leakage

2. **HTTPS Configuration** (1 hour)
   - AWS Certificate Manager setup
   - ALB HTTPS listener
   - Test certificate

3. **AWS Secrets Manager** (Will do in separate session)
   - Requires production credentials
   - Can be done after testing

---

### Phase C: Bug Fixes from Testing (2 hours)
**Fix issues discovered during manual testing**

---

## 🧪 DETAILED TEST SCENARIOS

### 1. Registration & Authentication Tests

#### Resident Registration
- [ ] Navigate to /register
- [ ] Fill registration form (name, email, phone, unit, password)
- [ ] Submit form
- [ ] Verify email validation
- [ ] Verify password requirements
- [ ] Check for success message
- [ ] Verify redirect to login
- [ ] **Note**: Any errors, UI issues, validation problems

#### Login Flow
- [ ] Navigate to /login
- [ ] Enter valid credentials
- [ ] Submit login
- [ ] Check for MFA prompt (if enabled)
- [ ] Verify redirect to correct dashboard
- [ ] Check user profile display
- [ ] Verify session persistence (refresh page)
- [ ] **Note**: Authentication issues, token storage method

#### Password Reset
- [ ] Click "Forgot Password"
- [ ] Enter email
- [ ] Check for reset instructions
- [ ] **Note**: Email service working?

---

### 2. Resident Dashboard Tests

#### Dashboard Overview
- [ ] View dashboard statistics
- [ ] Check active visitors count
- [ ] Check pending invitations
- [ ] Check recent activity
- [ ] **Note**: Data accuracy, loading states

#### Add Single Visitor
- [ ] Click "Add Visitor" or "Invite Visitor"
- [ ] Fill visitor details (name, phone, email, visit date, purpose)
- [ ] Select visit type (one-time, recurring, etc.)
- [ ] Submit invitation
- [ ] Verify success message
- [ ] Check visitor in pending list
- [ ] **Note**: Form validation, API errors, UI responsiveness

#### Generate QR Pass
- [ ] Navigate to visitor list
- [ ] Select a visitor
- [ ] Click "Generate Pass" or "QR Code"
- [ ] Verify QR code displays
- [ ] Check QR code contains correct data
- [ ] Test download/print functionality
- [ ] **Note**: QR generation issues

#### Bulk Invite
- [ ] Navigate to bulk invite
- [ ] Upload CSV or enter multiple visitors
- [ ] Submit bulk invitation
- [ ] Verify all visitors created
- [ ] Check for error handling (duplicate emails, etc.)
- [ ] **Note**: Bulk processing issues

#### Visitor History
- [ ] View visitor history
- [ ] Filter by date range
- [ ] Search for specific visitor
- [ ] Check pagination
- [ ] View visitor details
- [ ] **Note**: Search functionality, data display

#### Profile Settings
- [ ] Update profile picture
- [ ] Update personal information
- [ ] Change password
- [ ] Update notification preferences
- [ ] **Note**: Settings persistence

---

### 3. Guard Dashboard Tests

#### Guard Dashboard Overview
- [ ] View today's expected visitors
- [ ] Check pending check-ins
- [ ] View real-time updates
- [ ] **Note**: Data refresh, WebSocket working?

#### QR Code Scanning
- [ ] Navigate to scan QR
- [ ] Use camera (if available) or manual entry
- [ ] Scan valid QR code
- [ ] Verify visitor details display
- [ ] Approve/deny entry
- [ ] Check visitor status updates
- [ ] **Note**: QR scanning issues, camera permissions

#### Manual Check-In
- [ ] Navigate to manual check-in
- [ ] Search for visitor by name/phone
- [ ] Select visitor from results
- [ ] Enter check-in details
- [ ] Confirm check-in
- [ ] Verify status update
- [ ] **Note**: Search accuracy, form issues

#### Manual Check-Out
- [ ] Navigate to check-out
- [ ] Find checked-in visitor
- [ ] Process check-out
- [ ] Verify status update
- [ ] **Note**: Checkout flow issues

#### Visitor Search
- [ ] Use search functionality
- [ ] Search by name
- [ ] Search by phone
- [ ] Search by date
- [ ] Filter by status
- [ ] **Note**: Search performance, accuracy

---

### 4. Admin Dashboard Tests

#### Admin Overview
- [ ] View system statistics
- [ ] Check user counts (residents, guards, visitors)
- [ ] View system health metrics
- [ ] **Note**: Data accuracy

#### Manage Residents
- [ ] View resident list
- [ ] Add new resident
- [ ] Edit resident details
- [ ] Deactivate resident
- [ ] Search residents
- [ ] **Note**: CRUD operations, permissions

#### Manage Guards
- [ ] View guard list
- [ ] Add new guard
- [ ] Edit guard details
- [ ] Assign guard shifts (if applicable)
- [ ] Deactivate guard
- [ ] **Note**: CRUD operations, shift management

#### Visitor Logs
- [ ] View all visitor logs
- [ ] Filter by date range
- [ ] Filter by status
- [ ] Export logs (if available)
- [ ] **Note**: Performance with large datasets

#### Access Control
- [ ] View access rules
- [ ] Configure permissions
- [ ] Test role assignments
- [ ] **Note**: Permission changes apply immediately?

#### System Reports
- [ ] Generate visitor report
- [ ] Generate user activity report
- [ ] Check report accuracy
- [ ] Export reports
- [ ] **Note**: Report generation time, data accuracy

#### Incident Management
- [ ] Create incident report
- [ ] View incident history
- [ ] Update incident status
- [ ] **Note**: Incident tracking functionality

---

### 5. Cross-Cutting Tests

#### Role-Based Access Control
- [ ] As resident, try to access guard dashboard → Should fail
- [ ] As resident, try to access admin dashboard → Should fail
- [ ] As guard, try to access admin dashboard → Should fail
- [ ] As guard, try to access resident functions → Should fail
- [ ] **Note**: RBAC enforcement, error messages

#### Data Isolation
- [ ] As resident A, try to view resident B's visitors → Should fail
- [ ] As guard, try to modify visitor invitations → Should fail
- [ ] **Note**: Data privacy enforcement

#### Session Management
- [ ] Login from multiple tabs
- [ ] Logout from one tab, check other tabs
- [ ] Test session timeout
- [ ] Test "remember me" functionality
- [ ] **Note**: Session handling issues

#### Error Handling
- [ ] Submit forms with invalid data
- [ ] Test network errors (disconnect WiFi briefly)
- [ ] Test server errors (if possible)
- [ ] **Note**: Error messages clarity, recovery

#### Performance
- [ ] Measure page load times
- [ ] Test with slow network (throttle in DevTools)
- [ ] Check for loading indicators
- [ ] **Note**: Performance issues

---

## 📊 TEST TRACKING TEMPLATE

For each test, document:

```markdown
### Test: [Test Name]
- **Status**: ✅ PASS / ❌ FAIL / ⚠️ PARTIAL
- **Issue**: [Description if failed]
- **Severity**: CRITICAL / HIGH / MEDIUM / LOW
- **Screenshots**: [If applicable]
- **Console Errors**: [If any]
- **Network Errors**: [If any]
- **Steps to Reproduce**: [If failed]
- **Expected**: [What should happen]
- **Actual**: [What actually happened]
```

---

## 🎯 SUCCESS CRITERIA

### Testing Phase Success
- [ ] All user flows tested manually
- [ ] All issues documented with severity
- [ ] Screenshots/evidence collected
- [ ] Console errors logged
- [ ] Network errors logged

### Implementation Phase Success
- [ ] localStorage cleanup complete (54 files)
- [ ] All user flows still work after fixes
- [ ] No authentication breaks
- [ ] No console errors related to auth
- [ ] Tests pass after fixes

---

## ⏱️ TIME ESTIMATE

- **Setup**: 30 minutes
- **Registration/Login Tests**: 45 minutes
- **Resident Flow Tests**: 60 minutes
- **Guard Flow Tests**: 45 minutes
- **Admin Flow Tests**: 45 minutes
- **Cross-Cutting Tests**: 30 minutes
- **Documentation**: 30 minutes
- **localStorage Fixes**: 4-5 hours
- **Retest After Fixes**: 1 hour

**Total**: ~9 hours (full day)

---

## 📝 DELIVERABLE

**DAY6_MANUAL_TESTING_RESULTS_NOV14.md**
- All test results
- Issue log with severity
- Screenshots
- Recommendations
- Prioritized fix list
