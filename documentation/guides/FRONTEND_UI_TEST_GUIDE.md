# Frontend UI Testing Guide

## Current System Status

### ✅ Services Running
- **Frontend**: http://localhost:3000 (React)
- **Backend API**: http://localhost:3001/api
- **MailHog**: http://localhost:8025
- **PostgreSQL**: localhost:5432

### Test Environment
- Database: 36 users, 24 visitors
- Rate limits active (guest invites limited)
- Email delivery working via MailHog

---

## Manual UI Testing Checklist

### 1. Login & Authentication Flow

#### Test Login Page (http://localhost:3000/login)
- [ ] Page loads correctly
- [ ] Email field accepts input
- [ ] Password field shows/hides toggle works
- [ ] "Remember Me" checkbox works
- [ ] Validation shows for empty fields
- [ ] Validation shows for invalid email
- [ ] Login works with valid credentials
- [ ] Error message shows for invalid credentials
- [ ] "Forgot Password" link works
- [ ] "Sign Up" link navigates to registration

**Test Credentials:**
```
Admin:
  Email: admin_test_2025_01_31@example.com
  Password: AdminPass123!

Guard:
  Email: guard_test_2025_01_31@example.com
  Password: GuardPass123!

Resident:
  Email: resident_test_2025_01_31@example.com
  Password: ResidentPass123!
```

#### Test Registration Page (http://localhost:3000/register)
- [ ] All form fields display correctly
- [ ] Role selection dropdown works (Admin, Guard, Resident)
- [ ] Email validation works
- [ ] Password strength indicator shows
- [ ] Password confirmation validation works
- [ ] Phone number validation works
- [ ] Residential area field shows for Resident role
- [ ] House number field shows for Resident role
- [ ] Submit creates account and shows success
- [ ] Verification email appears in MailHog

---

### 2. Resident Dashboard & Flows

#### Dashboard (http://localhost:3000/resident/dashboard)
- [ ] Dashboard loads after login
- [ ] Welcome message shows user name
- [ ] Quick action buttons visible
- [ ] Visitor statistics display
- [ ] Recent activity shows
- [ ] Navigation menu works

#### Create Guest Invite (http://localhost:3000/resident/add-visitor)
- [ ] Form loads correctly
- [ ] Guest name field works
- [ ] Guest email field validates
- [ ] Guest phone field validates
- [ ] Visit date picker works
- [ ] Visit time picker works
- [ ] Visit purpose field accepts text
- [ ] Submit button creates invite
- [ ] Success message shows
- [ ] QR code displays
- [ ] Invitation email sent to guest
- [ ] Email appears in MailHog

**Note:** Rate limiting may prevent multiple invites. Use existing visitors for check-in/out tests.

#### Bulk Invite Creation
- [ ] Bulk invite option available
- [ ] Event name field works
- [ ] Event date/time pickers work
- [ ] Guest count/limit setting works
- [ ] Shareable link generates
- [ ] QR code displays
- [ ] Email invitations sent

#### Visitor History (http://localhost:3000/resident/visitor-history)
- [ ] Page loads and shows visitor list
- [ ] Search/filter functionality works
- [ ] Date range filter works
- [ ] Status filter works (Pending, Checked In, Checked Out)
- [ ] Visitor details expand on click
- [ ] Check-in/out timestamps display
- [ ] Export functionality works (if available)

#### Settings (http://localhost:3000/resident/settings)
- [ ] Profile settings display
- [ ] Notification preferences work
- [ ] Email notifications toggle
- [ ] SMS notifications toggle
- [ ] Privacy settings accessible
- [ ] Data export option works
- [ ] Account deletion option works

---

### 3. Guard Dashboard & Flows

#### Dashboard (http://localhost:3000/guard/dashboard)
- [ ] Dashboard loads after login
- [ ] Today's statistics display
- [ ] On-premise visitor count shows
- [ ] Quick action buttons work
- [ ] Recent activity log displays
- [ ] Current shift info shows (if available)

#### QR Code Scanner (http://localhost:3000/guard/scan-qr)
- [ ] Scanner interface loads
- [ ] Manual code entry option available
- [ ] Camera permission prompt (if applicable)
- [ ] Manual entry validates codes
- [ ] Visitor details display after scan
- [ ] Check-in button works
- [ ] Success confirmation shows

#### Manual Check-in (http://localhost:3000/guard/manual-check)
- [ ] Search field works
- [ ] Search by name works
- [ ] Search by phone works
- [ ] Expected visitors list shows
- [ ] Visitor selection works
- [ ] ID verification field available
- [ ] Check-in button works
- [ ] Success message shows

#### Visitor List & Check-out
- [ ] On-premise visitors list displays
- [ ] Visitor cards show details
- [ ] Check-out button available
- [ ] Check-out confirmation works
- [ ] Status updates immediately

**API Test for Visitor List:**
```bash
GUARD_TOKEN="<token from login>"
curl -H "Authorization: Bearer $GUARD_TOKEN" \
  http://localhost:3001/api/guards/visitors
```

#### Walk-in Registration
- [ ] Walk-in registration form loads
- [ ] Visitor details fields work
- [ ] Resident/host selection dropdown works
- [ ] Purpose field accepts input
- [ ] Vehicle plate field (optional) works
- [ ] ID type selection works
- [ ] ID number field works
- [ ] Submit creates visitor
- [ ] Temporary pass generates
- [ ] Notification sent to resident

#### Visitor History
- [ ] History page loads
- [ ] Entry/exit timestamps show
- [ ] Filter options work
- [ ] Search functionality works
- [ ] Export option available

---

### 4. Admin Dashboard & Flows

#### Dashboard (http://localhost:3000/admin/dashboard)
- [ ] Dashboard loads after login
- [ ] System statistics display
- [ ] Visitor trends chart shows
- [ ] Real-time visitor count updates
- [ ] Recent alerts display
- [ ] Guard status overview shows
- [ ] Quick navigation menu works

#### User Management (http://localhost:3000/admin/users)
- [ ] User list displays all users
- [ ] Search functionality works
- [ ] Filter by role works (Admin, Guard, Resident)
- [ ] User details expand on click
- [ ] Edit user button works
- [ ] Deactivate user works
- [ ] Delete user shows confirmation
- [ ] Create user button opens form
- [ ] User creation form validates
- [ ] Role assignment works

#### Audit Logs (http://localhost:3000/admin/audit-logs)
- [ ] Audit logs page loads
- [ ] Log entries display with details
- [ ] User filter works
- [ ] Action type filter works
- [ ] Date range filter works
- [ ] Search/keyword filter works
- [ ] Pagination works
- [ ] Export functionality available

#### Reports (http://localhost:3000/admin/reports)
- [ ] Reports page loads
- [ ] Report type selection works
- [ ] Date range picker works
- [ ] Generate report button works
- [ ] Report data displays
- [ ] Export to PDF option works
- [ ] Export to CSV option works
- [ ] Visitor traffic report available
- [ ] Security incident report available
- [ ] User activity report available

#### Guard Schedules (http://localhost:3000/admin/guard-schedules)
- [ ] Guard management page loads
- [ ] Guard list shows with status
- [ ] Shift assignment functionality works
- [ ] Schedule calendar view displays
- [ ] Gate/post assignment works
- [ ] Shift time setting works
- [ ] Shift swap handling works

#### System Settings (http://localhost:3000/admin/settings)
- [ ] Settings page loads
- [ ] Security policies configurable
- [ ] Notification settings work
- [ ] Gate/entry point management works
- [ ] Visitor pass expiry setting works
- [ ] Residential area management works
- [ ] Backup/restore option available

#### Access Control & Permissions
- [ ] Admin can access all routes
- [ ] Admin can view all data
- [ ] Admin can modify system settings
- [ ] Role-based permissions enforced

---

### 5. Guest/Visitor Flows

#### Guest Invite Page (http://localhost:3000/invite/:inviteCode)
- [ ] Page loads with valid invite code
- [ ] Event/visit details display
- [ ] Registration form shows
- [ ] Required fields validate
- [ ] Phone number validation works
- [ ] Email validation works
- [ ] Submit completes registration
- [ ] QR code displays after registration
- [ ] Add to calendar option works
- [ ] Google Calendar option works
- [ ] ICS download works
- [ ] Share button works
- [ ] Error shows for invalid code
- [ ] Error shows for expired invite
- [ ] Full message shows when slots exhausted

**Test with existing invite:**
```bash
# Get an invite code from visitor history or database
curl http://localhost:3000/invite/<code>
```

#### Bulk Event Registration
- [ ] Bulk registration page loads with code
- [ ] Event information displays
- [ ] Remaining slots counter shows
- [ ] ID number field works
- [ ] Vehicle plate field works (optional)
- [ ] OTP verification triggers after submit
- [ ] OTP input field appears
- [ ] OTP format validates (6 digits)
- [ ] Resend OTP button works
- [ ] Countdown timer for resend works
- [ ] Success after OTP verification

---

### 6. Password Reset Flow

#### Forgot Password (http://localhost:3000/forgot-password)
- [ ] Page loads correctly
- [ ] Email field validates
- [ ] Submit button works
- [ ] Success message shows
- [ ] Reset email sent to MailHog
- [ ] Email contains reset link

#### Reset Password Page (http://localhost:3000/reset-password?token=...)
- [ ] Page loads with valid token
- [ ] New password field shows
- [ ] Confirm password field shows
- [ ] Password strength validator works
- [ ] Password match validation works
- [ ] Submit updates password
- [ ] Success message shows
- [ ] Redirect to login works
- [ ] Can login with new password

**Test Flow:**
1. Open http://localhost:3000/forgot-password
2. Enter test email
3. Check MailHog (http://localhost:8025) for reset email
4. Click reset link in email
5. Set new password
6. Login with new password

---

### 7. Navigation & Routing

#### Public Routes (No Authentication Required)
- [ ] /login - Login page accessible
- [ ] /register - Registration page accessible
- [ ] /privacy - Privacy policy page loads
- [ ] /terms - Terms of service page loads
- [ ] /invite/:code - Guest invite page accessible
- [ ] /forgot-password - Password reset accessible

#### Protected Routes (Authentication Required)
- [ ] /resident/dashboard - Redirects to login when not authenticated
- [ ] /guard/dashboard - Redirects to login when not authenticated
- [ ] /admin/dashboard - Redirects to login when not authenticated
- [ ] After login, redirects to correct dashboard based on role

#### Navigation Between Pages
- [ ] Login → Register link works
- [ ] Register → Login link works
- [ ] Dashboard → Settings works
- [ ] Dashboard → Add Visitor works
- [ ] Dashboard → History works
- [ ] Browser back button works
- [ ] Browser forward button works
- [ ] Page refresh maintains auth state

#### Deep Linking
- [ ] Direct link to protected route redirects to login
- [ ] After login, redirects to originally requested page
- [ ] Invite deep link works
- [ ] Bulk register deep link works

---

### 8. Accessibility Testing

#### Keyboard Navigation
- [ ] Tab key moves through form fields
- [ ] Enter key submits forms
- [ ] Escape key closes modals
- [ ] Arrow keys work in dropdowns
- [ ] Space bar toggles checkboxes

#### Screen Reader Support
- [ ] Form labels properly associated
- [ ] Error messages announced
- [ ] Success messages announced
- [ ] aria-describedby used for errors
- [ ] aria-live regions for dynamic content

#### Focus Management
- [ ] Visible focus indicators on all interactive elements
- [ ] Focus trap in modals
- [ ] Focus returns after modal closes
- [ ] Logical tab order

#### Visual Accessibility
- [ ] Sufficient color contrast (4.5:1 minimum)
- [ ] Error states not solely color-based (include icons/text)
- [ ] Text readable at 200% zoom
- [ ] Proper heading hierarchy (h1 → h2 → h3)
- [ ] Alt text on all images
- [ ] Descriptive link text

---

### 9. Mobile Responsiveness

#### Test at Different Viewports
- [ ] 320px (Mobile S)
- [ ] 375px (Mobile M)
- [ ] 425px (Mobile L)
- [ ] 768px (Tablet)
- [ ] 1024px (Laptop)
- [ ] 1440px (Desktop)

#### Mobile Features
- [ ] Touch-friendly buttons (min 44x44px)
- [ ] Readable text without zoom
- [ ] Forms usable on mobile
- [ ] Navigation menu adapts
- [ ] Tables scroll or stack
- [ ] QR codes display properly

---

### 10. Performance & Error Handling

#### Loading States
- [ ] Loading spinner shows during API calls
- [ ] Disabled state on submit buttons during processing
- [ ] Skeleton loaders for content (if applicable)

#### Error Handling
- [ ] Network errors show user-friendly messages
- [ ] Form validation errors clear
- [ ] API errors displayed properly
- [ ] 404 page for unknown routes
- [ ] Invalid invite codes handled gracefully

#### Data Validation
- [ ] Email format validation
- [ ] Phone number format validation
- [ ] Password strength validation
- [ ] Required field validation
- [ ] Date/time validation
- [ ] File upload validation (if applicable)

---

## Quick Testing Commands

### Open All Testing Tools
```bash
# Open frontend
open http://localhost:3000

# Open MailHog
open http://localhost:8025

# Check backend health
curl http://localhost:3001/health
```

### Check Database State
```bash
cd /Users/raynj/Desktop/secure-gate-react-express/secure-gate-access/server
psql -U secure_gate_user -d secure_gate_db -c "SELECT COUNT(*) FROM users;"
psql -U secure_gate_user -d secure_gate_db -c "SELECT COUNT(*) FROM visitors;"
```

### Login and Get Token (for API testing)
```bash
# Login as Resident
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"resident_test_2025_01_31@example.com","password":"ResidentPass123!"}'

# Save token and use for authenticated requests
TOKEN="<token from response>"
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/residents/visitors
```

---

## Known Issues from Automated Tests

### Accessibility Issues
1. **Login button disabled state** - Some tests timeout waiting for button to enable
   - Manual test: Fill form and verify button enables
   
2. **aria-describedby for errors** - Error messages may not have proper ARIA association
   - Manual test: Submit empty form and check error announcements

3. **Terms/Privacy navigation** - Link may not navigate correctly from registration
   - Manual test: Click "Terms of Service" link on register page

### Full System E2E Test
- Backend port mismatch (test expects 5001, actual is 3001)
- Test uses environment variable `API_URL` - needs update

### Guest Invite
- Multiple expired messages found (duplicate content)
- Minor UI cleanup needed

---

## Test Execution Order

### Recommended Manual Testing Sequence:

1. **Start with Public Pages** (No login required)
   - Login page
   - Registration page
   - Privacy policy
   - Terms of service

2. **Test Registration & Email Flow**
   - Register new user
   - Check MailHog for verification email
   - Click verification link

3. **Test Login & Authentication**
   - Login with each role
   - Test "Remember Me"
   - Test password visibility toggle

4. **Role-Specific Flows** (Do in any order)
   - **Resident**: Dashboard → Add Visitor → View History → Settings
   - **Guard**: Dashboard → Scan QR → Manual Check-in → Check-out → History
   - **Admin**: Dashboard → User Management → Audit Logs → Reports → Settings

5. **Guest/Visitor Flow**
   - Use invite link from Resident invite
   - Complete registration
   - Download QR code
   - Add to calendar

6. **Password Reset Flow**
   - Request password reset
   - Check MailHog
   - Reset password
   - Login with new password

7. **Edge Cases & Error Handling**
   - Invalid credentials
   - Expired invites
   - Network errors (disable network in DevTools)
   - 404 pages

8. **Accessibility & Responsive**
   - Keyboard navigation
   - Mobile viewports
   - Screen reader testing (if available)

---

## Reporting Issues

When you find issues during testing, document:

1. **URL** where issue occurred
2. **User role** (if logged in)
3. **Steps to reproduce**
4. **Expected behavior**
5. **Actual behavior**
6. **Screenshots** (if visual issue)
7. **Browser console errors** (F12 → Console tab)
8. **Network errors** (F12 → Network tab)

### Example Issue Report:
```
Issue: Login button remains disabled after filling form

URL: http://localhost:3000/login
Role: N/A (public page)
Steps:
1. Navigate to /login
2. Enter email: test@example.com
3. Enter password: Test123!
4. Click login button

Expected: Button should enable and allow submission
Actual: Button remains disabled, click does nothing
Console Error: [None visible]
Screenshot: [Attached]
```

---

## Success Criteria

All user journeys should complete successfully:
- ✅ Users can register and receive verification emails
- ✅ Users can login with correct credentials
- ✅ Residents can create and manage guest invites
- ✅ Guards can check in/out visitors
- ✅ Admins can manage users and view reports
- ✅ Guests can complete registration via invite
- ✅ Password reset flow works end-to-end
- ✅ All pages are accessible and responsive
- ✅ Errors are handled gracefully
- ✅ Navigation works correctly throughout the app

---

## Next Steps After UI Testing

1. Document all issues found
2. Fix critical bugs
3. Re-test fixed issues
4. Update automated Playwright tests to match UI
5. Run full test suite again
6. Deploy to staging/production

---

**Happy Testing! 🧪**
