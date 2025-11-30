# Manual Testing Guide - Guard User
**Comprehensive Security Guard UAT Script**

**Duration:** 25 minutes  
**Tester Role:** Security Guard at Gate  
**Date:** November 25, 2025

---

## Setup (1 minute)

**Login Credentials:**
- URL: `http://localhost:3000/login`
- Email: `guard@test.com`
- Password: `TestPass123!`

**Required Materials:**
- Valid visitor QR code (from Resident test)
- Smartphone with camera (for QR scanning)
- Test visitor phone number: 0712345678

---

## Section 1: Guard Dashboard (3 minutes)

### Test 1.1: Login & Dashboard Access
```
□ Navigate to login page
□ Enter: guard@test.com / TestPass123!
□ Click "Sign In"

VERIFY:
□ Redirected to /dashboard/guard
□ Dashboard title: "Guard Dashboard" or "Security Dashboard"
□ Load time < 3 seconds
□ No errors displayed
```

### Test 1.2: Dashboard Components
```
□ VERIFY Active Visitors Section:
  □ Shows currently checked-in visitors
  □ OR "No active visitors" empty state
  □ Each visitor card/row shows:
    - Visitor name
    - Host (resident) name
    - Check-in time
    - Status: "Active" (green)

□ VERIFY Quick Action Buttons:
  □ "Scan QR Code" button (primary/prominent)
  □ "Manual Check" button
  □ "Walk-In Registration" button
  □ All buttons clickable

□ VERIFY Statistics (if visible):
  □ Today's check-ins count
  □ Active visitors count
  □ Pending approvals (if any)

□ Test Navigation Menu:
  □ Dashboard (active)
  □ Scan QR
  □ Manual Check
  □ Walk-In
  □ Visitor History
  □ Incidents
  □ Settings
```

**Pass Criteria:** Dashboard loads correctly, all sections visible  
**Issues Found:** ____________________

---

## Section 2: QR Code Scanning (8 minutes)

### Test 2.1: Valid QR Code Scan
```
PREREQUISITE: Get valid QR code from Resident test
(Invite link → Open in browser → QR code displayed)

□ Click "Scan QR Code" button
□ VERIFY: Redirected to /guard/scan-qr
□ VERIFY: Scanner interface loads

IF TEST MODE AVAILABLE:
  □ Look for manual input field
  □ Enter QR code value: ________________
  □ Press Enter or click "Scan"

IF USING REAL SCANNER:
  □ Allow camera access (if prompted)
  □ Point camera at QR code
  □ Wait for scan to complete

□ VERIFY Result Card appears:
  □ GREEN background color
  □ Success icon (checkmark)
  □ Visitor name displayed
  □ Host name displayed
  □ Visit date and time
  □ Purpose of visit
  □ Status: "Expected" or "Verified"

□ VERIFY "Check In" button visible
□ Click "Check In" button
□ VERIFY: Success confirmation
□ VERIFY: Status changes to "Active"

□ Return to Dashboard
□ VERIFY: Visitor now appears in "Active Visitors" list
```

### Test 2.2: Invalid QR Code
```
□ Navigate back to "Scan QR"
□ Enter/scan invalid code: "INVALID123"

VERIFY:
□ Result card appears
□ RED background color
□ Error icon (X or warning)
□ Message: "Invalid code" or "QR code not found"
□ No "Check In" button available
□ "Try Again" or "Scan Another" button visible
```

### Test 2.3: Expired Invite
```
IF EXPIRED INVITE AVAILABLE:
□ Scan expired QR code

VERIFY:
□ RED/AMBER error card
□ Message: "Invite expired" or "Visit date has passed"
□ Clear explanation shown
□ No check-in option available
```

### Test 2.4: Already Checked-In Visitor
```
□ Scan same QR code from Test 2.1 again

VERIFY:
□ Warning message: "Visitor already checked in"
□ Shows current status
□ Shows check-in time
□ Option to view details
□ No duplicate check-in allowed
```

**Pass Criteria:** Valid scan works, invalid/expired rejected  
**Issues Found:** ____________________

---

## Section 3: Manual Check-In/Out (7 minutes)

### Test 3.1: Search for Visitor
```
□ Navigate to "Manual Check"
□ VERIFY: Search interface loads
□ VERIFY: Search box visible

□ Search by Phone: 0712345678
□ Press Enter or click "Search"
□ Wait for results

VERIFY Result Card:
□ Visitor name displayed
□ Phone number matches
□ Email shown (if provided)
□ Host (resident) name
□ Visit purpose
□ Current status (Expected/Active/etc.)
□ Invite code visible
```

### Test 3.2: Check In Visitor (Manual)
```
IF VISITOR STATUS = "Expected":
□ VERIFY "Check In" button visible
□ Click "Check In"
□ VERIFY: Confirmation dialog (optional)
□ Confirm action
□ VERIFY: Success message
□ VERIFY: Status updates to "Active"
□ VERIFY: Check-in timestamp shown

□ Return to Dashboard
□ VERIFY: Visitor in "Active Visitors" list
```

### Test 3.3: Check Out Visitor
```
□ Return to "Manual Check"
□ Search for same visitor (now Active)

VERIFY:
□ Status shows "Active"
□ Check-in time displayed
□ "Check Out" button visible

□ Click "Check Out"
□ VERIFY: Confirmation (if any)
□ Confirm check-out
□ VERIFY: Success message
□ VERIFY: Status updates to "Exited"
□ VERIFY: Check-out timestamp shown

□ Return to Dashboard
□ VERIFY: Visitor removed from "Active Visitors"
```

### Test 3.4: Search Variations
```
□ Test search by name:
  - Enter visitor's first name
  - VERIFY: Results show matching visitors

□ Test search by invite code:
  - Enter invite code (if known)
  - VERIFY: Specific visitor returned

□ Test partial match:
  - Enter: 0712 (partial phone)
  - VERIFY: All matching visitors shown
```

**Pass Criteria:** Search works, check-in/out successful  
**Issues Found:** ____________________

---

## Section 4: Walk-In Registration (5 minutes)

### Test 4.1: Register Walk-In Visitor
```
□ Navigate to "Walk-In Registration"
□ VERIFY: Registration form loads

FILL VISITOR DETAILS:
□ Name: [Choose name, e.g., "Jane Walk-In"]
□ Phone: 0722334455
□ Email: jane.walkin@example.com (optional)
□ Company: ABC Corp (optional)
□ Purpose: Unscheduled business visit
□ Vehicle Plate: KAA 123A (optional)

□ Click "Next" or "Continue"

SEARCH FOR HOST:
□ VERIFY: Host search interface appears
□ Search by: House number or Resident name
□ Select a resident from results

□ Click "Submit" or "Register"

VERIFY RESULT:
□ Success message shown
□ Visit code generated: ____________
□ Status: "Pending" or "Approved" (depends on settings)
□ Clear instructions for visitor
```

### Test 4.2: Approve Walk-In (If Pending)
```
IF WALK-IN STATUS = "Pending":
□ Navigate to Dashboard or Manual Check
□ Look for "Pending Walk-Ins" section
□ VERIFY: New walk-in appears

□ Click on walk-in entry
□ VERIFY: Details shown
□ VERIFY: "Approve" and "Deny" buttons

□ Click "Approve"
□ VERIFY: Status → "Approved"
□ Now can check in like normal visitor
```

**Pass Criteria:** Walk-in registered, approval works  
**Issues Found:** ____________________

---

## Section 5: Incident Reporting (3 minutes)

### Test 5.1: Report Incident
```
□ From Dashboard or Manual Check
□ Locate "Report Incident" option
  (may be near a visitor entry or separate button)

□ Click "Report Incident"

VERIFY FORM:
□ Visitor selection (if incident involves visitor)
□ Incident type dropdown:
  - Security concern
  - Property damage
  - Policy violation
  - Other
□ Description text area
□ Severity level (optional)
□ Photo upload (optional)

FILL FORM:
□ Select incident type: Security concern
□ Description: "Test incident for system validation"
□ Severity: Medium
□ Click "Submit"

VERIFY:
□ Success message
□ Incident logged
□ Incident ID/reference number shown
```

### Test 5.2: View Incidents
```
□ Navigate to "Incidents" (if available in menu)
□ VERIFY: List of incidents
□ VERIFY: Test incident appears
□ VERIFY: Each incident shows:
  - Incident ID
  - Date/time
  - Type
  - Status
  - Reported by (your guard account)
```

**Pass Criteria:** Incident reported and visible  
**Issues Found:** ____________________

---

## Section 6: Visitor History (3 minutes)

### Test 6.1: View History
```
□ Navigate to "Visitor History"
□ VERIFY: List/table of visitors

VERIFY DATA SHOWN:
□ All visitors (not just yours)
□ Visitor names
□ Check-in/check-out times
□ Status history
□ Host names
```

### Test 6.2: Filter by Date
```
□ Locate date filter
□ Select "Today" option
□ VERIFY: Only today's visitors shown

□ Select custom date range
□ Choose: Yesterday to Today
□ VERIFY: Results filtered correctly
```

### Test 6.3: Filter by Status
```
□ Apply status filter: "Active"
□ VERIFY: Only currently active visitors

□ Apply status filter: "Exited"
□ VERIFY: Only checked-out visitors
```

**Pass Criteria:** History visible, filters work  
**Issues Found:** ____________________

---

## Section 7: Mobile/Tablet Testing (2 minutes)

### Test 7.1: Mobile Responsiveness
```
□ Resize browser to mobile width (<768px)
  OR test on actual mobile device

VERIFY MOBILE LAYOUT:
□ Navigation collapses to hamburger menu
□ Dashboard cards stack vertically
□ Scan QR button remains prominent
□ All features accessible
□ Touch targets large enough
□ Text readable (not too small)

TEST CRITICAL FUNCTIONS:
□ Login works
□ Scan QR accessible and usable
□ Manual check search works
□ Check-in button easy to tap
□ Navigation smooth
```

**Pass Criteria:** Mobile experience usable  
**Issues Found:** ____________________

---

## Section 8: Logout & Security (1 minute)

### Test 8.1: Logout
```
□ Click "Logout"
□ VERIFY: Redirect to login page
□ Try accessing /dashboard/guard directly
□ VERIFY: Redirect back to login (not accessible)
```

### Test 8.2: Unauthorized Access Attempt
```
□ Login as guard@test.com
□ Manually navigate to: /dashboard/admin
□ VERIFY: Access denied
□ VERIFY: Redirect to /dashboard/guard
□ VERIFY: Error message shown
```

**Pass Criteria:** Logout works, unauthorized access blocked  
**Issues Found:** ____________________

---

## Final Checklist

### Core Functions Test Summary
```
Section 1: Dashboard           □ PASS □ FAIL
Section 2: QR Scanning         □ PASS □ FAIL
Section 3: Manual Check        □ PASS □ FAIL
Section 4: Walk-In             □ PASS □ FAIL
Section 5: Incidents           □ PASS □ FAIL
Section 6: History             □ PASS □ FAIL
Section 7: Mobile              □ PASS □ FAIL
Section 8: Security            □ PASS □ FAIL
```

### Performance Assessment
```
□ Dashboard loads in < 3 seconds
□ QR scan result in < 2 seconds
□ Search results in < 2 seconds
□ Check-in/out response < 1 second
□ No crashes or freezes
□ No data loss
```

### Usability Assessment
```
□ Interface intuitive for guard use
□ Primary actions prominent
□ Error messages clear
□ Success feedback visible
□ Mobile experience acceptable
□ Can operate under time pressure
```

---

## Test Results Summary

**Date Tested:** ___________  
**Tester Name:** ___________  
**Device:** Desktop / Mobile / Tablet  
**Browser:** ___________

**Overall Result:** PASS / FAIL

**Tests Passed:** ___ / 8 sections  
**Critical Issues:** ___ (Count)  
**Minor Issues:** ___ (Count)

### Critical Issues:
1. ____________________
2. ____________________
3. ____________________

### Minor Issues:
1. ____________________
2. ____________________

### Guard User Experience Rating (1-5):
- Ease of Use: ___ / 5
- Speed: ___ / 5
- Reliability: ___ / 5
- Mobile Experience: ___ / 5

### Recommendations:
____________________
____________________

**Ready for Production:** YES / NO

---

**Signature:** ___________  
**Date:** ___________
