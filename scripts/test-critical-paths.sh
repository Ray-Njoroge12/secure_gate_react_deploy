#!/bin/bash
# scripts/test-critical-paths.sh
# Manual testing checklist for critical user paths

cat << 'EOF'
🧪 CRITICAL PATH TESTING CHECKLIST
=====================================

This script provides a comprehensive checklist for manual testing of all critical
user paths in the Secure Gate Access Control System frontend.

📋 PRE-REQUISITES:
- Backend server running on localhost:5000
- Frontend dev server running on localhost:3000
- Test database with sample data
- Test users for each role (resident, guard, admin)

=====================================
## 🔐 AUTHENTICATION PATHS
=====================================

### Path 1: User Login
[ ] 1. Open http://localhost:3000/login
[ ] 2. Verify login form displays correctly
[ ] 3. Enter valid credentials (test@example.com / password123)
[ ] 4. Click "Login" button
[ ] 5. Verify redirect to appropriate dashboard
[ ] 6. Check localStorage for 'token'
[ ] 7. Verify no errors in console
[ ] 8. Check Network tab: POST /api/auth/login (200)

### Path 2: Invalid Login
[ ] 1. Open http://localhost:3000/login
[ ] 2. Enter invalid credentials
[ ] 3. Click "Login"
[ ] 4. Verify error message displays
[ ] 5. Verify no redirect occurs
[ ] 6. Check Network tab: POST /api/auth/login (401)

### Path 3: Forgot Password (CRITICAL - Recently Fixed)
[ ] 1. Open http://localhost:3000/login
[ ] 2. Click "Forgot Password" link
[ ] 3. Enter valid email
[ ] 4. Click "Submit"
[ ] 5. VERIFY: Network tab shows POST to /api/auth/forgot-password (NOT localhost:5000)
[ ] 6. VERIFY: No CORS errors in console
[ ] 7. Check for success message
[ ] 8. Verify backend received request

### Path 4: Reset Password (CRITICAL - Recently Fixed)
[ ] 1. Get reset token from backend logs or email
[ ] 2. Open http://localhost:3000/reset-password/[TOKEN]
[ ] 3. Enter new password
[ ] 4. Confirm new password
[ ] 5. Click "Reset Password"
[ ] 6. VERIFY: Network tab shows POST to /api/auth/reset-password (NOT localhost:5000)
[ ] 7. VERIFY: No CORS errors
[ ] 8. Verify redirect to login
[ ] 9. Login with new password

### Path 5: Registration
[ ] 1. Open http://localhost:3000/register
[ ] 2. Fill in all required fields
[ ] 3. Submit form
[ ] 4. VERIFY: debug_otp NOT visible in production build
[ ] 5. Enter OTP (if in development, check for debug display)
[ ] 6. Verify account creation
[ ] 7. Check auto-login or redirect

### Path 6: Protected Route Access
[ ] 1. Clear localStorage
[ ] 2. Try to access http://localhost:3000/dashboard/resident
[ ] 3. Verify redirect to /login
[ ] 4. Login as resident
[ ] 5. Verify redirect back to dashboard
[ ] 6. Try to access /dashboard/admin (as resident)
[ ] 7. Verify permission denied or redirect

=====================================
## 👤 RESIDENT PATHS
=====================================

### Path 7: View Dashboard
[ ] 1. Login as resident
[ ] 2. Verify dashboard loads
[ ] 3. Check metrics display correctly
[ ] 4. Verify visitor list loads
[ ] 5. VERIFY: No console errors
[ ] 6. VERIFY: No console.log with sensitive data
[ ] 7. Check Network tab for API calls

### Path 8: Add Visitor (CRITICAL - Recently Modified)
[ ] 1. Navigate to /resident/add-visitor
[ ] 2. Fill in visitor details:
   - Name: John Doe
   - Phone: 0712345678
   - Purpose: Business meeting
   - Date: Tomorrow
[ ] 3. Click "Add Visitor"
[ ] 4. VERIFY: Uses logger instead of console.log
[ ] 5. VERIFY: No visitor data in console (production)
[ ] 6. Check success message
[ ] 7. Verify redirect or confirmation

### Path 9: Generate Pass
[ ] 1. Navigate to /resident/generate-pass
[ ] 2. Select visitor from list
[ ] 3. Generate pass
[ ] 4. Verify QR code displays
[ ] 5. Check pass details are correct
[ ] 6. VERIFY: No console.log statements fire
[ ] 7. Download/print pass (if applicable)

### Path 10: View Visitor History
[ ] 1. Navigate to /resident/visitor-history
[ ] 2. Verify table loads with data
[ ] 3. Test filtering by date
[ ] 4. Test search functionality
[ ] 5. Check pagination works
[ ] 6. Verify status badges display correctly

### Path 11: Bulk Invite Creation
[ ] 1. Navigate to /resident/bulk-invite
[ ] 2. Fill in event details
[ ] 3. Set number of invites
[ ] 4. Generate bulk invite
[ ] 5. Verify invite code generated
[ ] 6. Copy invite link
[ ] 7. Verify link format correct

### Path 12: Guest Invite Completion
[ ] 1. Open guest invite link (as non-logged-in user)
[ ] 2. Fill in guest details
[ ] 3. Submit form
[ ] 4. VERIFY: debug_otp guarded with NODE_ENV
[ ] 5. Enter OTP
[ ] 6. Verify registration complete
[ ] 7. Check QR code/pass generated

=====================================
## 👮 GUARD PATHS
=====================================

### Path 13: Guard Dashboard
[ ] 1. Login as guard
[ ] 2. Verify dashboard loads
[ ] 3. Check pending check-ins display
[ ] 4. Verify recent activity shows
[ ] 5. Check statistics are accurate

### Path 14: Manual Check-in
[ ] 1. Navigate to manual check-in
[ ] 2. Search for visitor
[ ] 3. Select visitor
[ ] 4. Perform check-in
[ ] 5. Verify status updates
[ ] 6. Check timestamp recorded

### Path 15: QR Code Scanning
[ ] 1. Navigate to scan QR
[ ] 2. Allow camera access
[ ] 3. Scan valid QR code
[ ] 4. Verify visitor details display
[ ] 5. Confirm check-in
[ ] 6. Check success message

### Path 16: Check-out Process
[ ] 1. Find checked-in visitor
[ ] 2. Initiate check-out
[ ] 3. Verify confirmation dialog
[ ] 4. Complete check-out
[ ] 5. Verify status update
[ ] 6. Check time recorded

=====================================
## 👔 ADMIN PATHS (CRITICAL - Recently Standardized)
=====================================

### Path 17: Admin Dashboard (CRITICAL - Uses adminService)
[ ] 1. Login as admin
[ ] 2. Verify metrics load correctly
[ ] 3. VERIFY: Uses adminService (check Network tab)
[ ] 4. VERIFY: No direct axios calls
[ ] 5. Check audit logs display
[ ] 6. Test filtering audit logs
[ ] 7. Check pagination works
[ ] 8. VERIFY: Error handling uses logger

### Path 18: Manage Residents (CRITICAL - Uses adminService)
[ ] 1. Navigate to manage residents
[ ] 2. Verify resident list loads
[ ] 3. VERIFY: API call to /api/admin/residents
[ ] 4. Edit a resident
[ ] 5. Verify update succeeds
[ ] 6. Delete a resident (if permitted)
[ ] 7. Check error states

### Path 19: Manage Guards (CRITICAL - Uses adminService)
[ ] 1. Navigate to manage guards
[ ] 2. Verify guard list loads
[ ] 3. Add new guard
[ ] 4. VERIFY: POST to /api/admin/guards
[ ] 5. Edit guard details
[ ] 6. Delete guard
[ ] 7. Verify all CRUD operations

### Path 20: Visitor Logs (CRITICAL - Uses adminService)
[ ] 1. Navigate to visitor logs
[ ] 2. Verify logs load
[ ] 3. Test date filtering
[ ] 4. Test status filtering
[ ] 5. Export logs (if available)
[ ] 6. VERIFY: Uses adminService

### Path 21: Access Control (CRITICAL - Uses adminService)
[ ] 1. Navigate to access control
[ ] 2. Verify access logs load
[ ] 3. VERIFY: API call to /api/admin/access-logs
[ ] 4. Filter by zone/time
[ ] 5. Check detail views

### Path 22: Incident Management (CRITICAL - Uses adminService)
[ ] 1. Navigate to incident management
[ ] 2. View incident list
[ ] 3. Create new incident
[ ] 4. VERIFY: POST to /api/admin/incidents
[ ] 5. Update incident status
[ ] 6. Add incident notes
[ ] 7. Close incident

=====================================
## 🔧 ERROR SCENARIOS
=====================================

### Path 23: Network Failure
[ ] 1. Open DevTools > Network
[ ] 2. Set to "Offline"
[ ] 3. Try to load dashboard
[ ] 4. VERIFY: Error boundary catches it
[ ] 5. VERIFY: User-friendly error message
[ ] 6. Check "Retry" button works

### Path 24: Token Expiry
[ ] 1. Login normally
[ ] 2. Manually expire token in localStorage
[ ] 3. Make an API call
[ ] 4. VERIFY: Auto-redirect to login
[ ] 5. VERIFY: Error message shown
[ ] 6. Login again

### Path 25: Permission Denied
[ ] 1. Login as resident
[ ] 2. Try to access admin endpoint directly
[ ] 3. VERIFY: 403 error handled
[ ] 4. VERIFY: Redirect or error message
[ ] 5. No console errors

### Path 26: Form Validation
[ ] 1. Try to submit form with missing fields
[ ] 2. Verify validation messages
[ ] 3. Try invalid email format
[ ] 4. Try invalid phone format
[ ] 5. Verify all validation rules

### Path 27: Component Error
[ ] 1. (Manually trigger error in dev)
[ ] 2. VERIFY: ErrorBoundary catches it
[ ] 3. VERIFY: Error ID displayed
[ ] 4. VERIFY: Logger recorded error
[ ] 5. Check "Try Again" button

=====================================
## ⚡ PERFORMANCE CHECKS
=====================================

### Check 28: Initial Load
[ ] 1. Clear cache and hard reload
[ ] 2. Measure time to interactive
[ ] 3. Check Network tab waterfall
[ ] 4. VERIFY: Main bundle < 70KB gzipped
[ ] 5. VERIFY: Lazy loading works
[ ] 6. Check Performance tab

### Check 29: Route Transitions
[ ] 1. Navigate between routes
[ ] 2. Measure transition time
[ ] 3. VERIFY: < 500ms for route change
[ ] 4. Check for layout shifts
[ ] 5. Verify smooth animations

### Check 30: Large Data Sets
[ ] 1. Load page with 100+ items
[ ] 2. Check render performance
[ ] 3. Test scrolling smoothness
[ ] 4. Verify pagination helps
[ ] 5. Check memory usage

=====================================
## 🔒 SECURITY CHECKS
=====================================

### Check 31: No Hardcoded URLs
[ ] 1. Build production: npm run build:production
[ ] 2. Search build files for "localhost:5000"
[ ] 3. VERIFY: None found
[ ] 4. Check Network tab uses relative URLs

### Check 32: Debug Code Guarded
[ ] 1. Check production build
[ ] 2. VERIFY: debug_otp not visible
[ ] 3. Open page source
[ ] 4. Search for "debug"
[ ] 5. Verify all guarded with NODE_ENV

### Check 33: No Sensitive Console Output
[ ] 1. Open console in production build
[ ] 2. Navigate through all pages
[ ] 3. VERIFY: No tokens logged
[ ] 4. VERIFY: No passwords logged
[ ] 5. VERIFY: Minimal console output

### Check 34: XSS Protection
[ ] 1. Try to input <script>alert('xss')</script>
[ ] 2. Verify sanitization works
[ ] 3. Check no execution
[ ] 4. Test in all input fields

=====================================
## 📱 MOBILE/RESPONSIVE CHECKS
=====================================

### Check 35: Mobile View
[ ] 1. Open DevTools > Toggle device toolbar
[ ] 2. Test iPhone SE (375px)
[ ] 3. Test iPad (768px)
[ ] 4. Verify all pages responsive
[ ] 5. Check touch targets (44x44px)
[ ] 6. Test landscape mode

### Check 36: Cross-Browser
[ ] 1. Test in Chrome
[ ] 2. Test in Firefox
[ ] 3. Test in Safari
[ ] 4. Test in Edge
[ ] 5. Verify consistent behavior

=====================================
## 📊 RESULTS TRACKING
=====================================

Total Tests: 36 paths
Passed: ___
Failed: ___
Blocked: ___

Critical Issues Found:
1. _______________________________
2. _______________________________
3. _______________________________

Pass Rate: ____%

=====================================

✅ SIGN-OFF

Tester: _________________________
Date: ___________________________
Environment: _____________________
Build Version: ___________________

Approved for Production: YES / NO

Notes:
_____________________________________
_____________________________________
_____________________________________

EOF
