# Manual Testing Guide - Resident User
**Comprehensive User Acceptance Testing Script**

**Duration:** 30 minutes  
**Tester Role:** Resident User  
**Date:** November 25, 2025

---

## Setup (1 minute)

**Login Credentials:**
- URL: `http://localhost:3000/login`
- Email: `resident@test.com`
- Password: `TestPass123!`

**Required Materials:**
- Test CSV file (for bulk upload)
- Notepad for recording issues
- Smartphone (for mobile testing)

---

## Section 1: Authentication & Dashboard (5 minutes)

### Test 1.1: Login Process
```
□ Step 1: Navigate to login page
□ Step 2: Enter email: resident@test.com
□ Step 3: Enter password: TestPass123!
□ Step 4: Click "Sign In" button
□ Step 5: Observe page transition

VERIFY:
□ Redirected to /dashboard/resident
□ Welcome message displays with your name
□ Load time < 3 seconds
□ No error messages
□ No console errors (F12 → Console tab)
```

### Test 1.2: Dashboard Overview
```
□ VERIFY Summary Cards visible:
  □ Total Visitors
  □ Expected Visitors
  □ Active Visitors (if any)
  □ Historical count

□ VERIFY Primary CTA:
  □ "Invite a Visitor" button is prominent
  □ Button is clickable

□ VERIFY Navigation Menu:
  □ Dashboard (current/active)
  □ Add Visitor
  □ Bulk Invite
  □ Visitor History
  □ Privacy
  □ Settings
  □ Logout

□ Test navigation:
  □ Click each menu item
  □ Verify correct page loads
  □ Return to Dashboard
```

**Pass Criteria:** All items checked  
**Issues Found:** ____________________

---

## Section 2: Single Visitor Invite (8 minutes)

### Test 2.1: Complete Invite Flow
```
□ Step 1: Click "Invite a Visitor" CTA
□ Step 2: Verify redirect to /resident/add-visitor

SECTION 1 - Visitor Information:
□ Fill Name: [Choose a name, e.g., "John Doe"]
□ Fill Phone: 0712345678
□ Fill Email: john.doe@example.com
□ VERIFY: Fields accept input properly

SECTION 2 - Visit Details:
□ Select Date: [Tomorrow's date]
□ Select Time: 14:00
□ Fill Purpose: Social visit
□ VERIFY: Date picker works
□ VERIFY: Cannot select past dates

SECTION 3 - Options & Consent:
□ Check "Generate QR Pass Immediately"
□ Check "I consent to data processing"
□ VERIFY: Cannot submit without consent

□ Step 3: Click "Create & Generate Pass"
□ Step 4: Wait for response (should be < 3 seconds)
```

### Test 2.2: Success State Verification
```
□ VERIFY Success Card appears with:
  □ Visitor name: "John Doe"
  □ Visit date: [Tomorrow]
  □ Visit time: 14:00
  □ QR code (large and visible)
  □ Invite link (shareable URL)
  □ "Copy Link" button works

□ Action: Copy the invite link
□ Save it: __________________ (for later tests)

□ VERIFY Form behavior:
  □ Success message stays visible
  □ Form clears after 5 seconds (or manually)
  □ Can create another invite immediately
```

**Pass Criteria:** Invite created, QR visible, link copied  
**Issues Found:** ____________________

---

## Section 3: Form Validation Testing (5 minutes)

### Test 3.1: Required Field Validation
```
Test each validation rule:

□ Test 1: Empty Name
  - Leave name blank, fill others, submit
  - VERIFY: Error "Full name is required"
  - VERIFY: Red border on name field

□ Test 2: Empty Phone
  - Fill name, leave phone blank, submit
  - VERIFY: Error "Phone number is required"

□ Test 3: Invalid Phone Format
  - Enter phone: 123 (too short)
  - VERIFY: Error "Phone must be 10 digits starting with 0"

□ Test 4: Invalid Email
  - Enter email: invalid-email
  - VERIFY: Error "Please enter a valid email address"

□ Test 5: Past Date
  - Select yesterday's date
  - VERIFY: Error "Date cannot be in the past"

□ Test 6: Missing Purpose
  - Leave purpose blank
  - VERIFY: Error "Purpose of visit is required"

□ Test 7: No Consent
  - Uncheck consent checkbox
  - VERIFY: Cannot submit or error shown
```

**Pass Criteria:** All 7 validation rules work  
**Issues Found:** ____________________

---

## Section 4: Bulk CSV Upload (7 minutes)

### Test 4.1: Prepare Test CSV
```
Create file: test-visitors.csv

Content:
name,email,phone,date,time,purpose
Alice Smith,alice@example.com,0712345671,2025-11-27,09:00,Meeting
Bob Jones,bob@example.com,0712345672,2025-11-27,10:00,Delivery
Carol White,carol@example.com,0712345673,2025-11-27,11:00,Social

Save this file to Desktop
```

### Test 4.2: Upload and Process
```
□ Step 1: Navigate to "Bulk Invite"
□ Step 2: VERIFY 3-step wizard visible
  □ Step indicator shows: Step 1 of 3

STEP 1: Upload
□ Click "Upload CSV" or drag-and-drop
□ Select test-visitors.csv
□ VERIFY: "Found 3 visitors" message
□ VERIFY: Parse success icon
□ Click "Review Visitors"

STEP 2: Review
□ VERIFY: Table shows all 3 visitors
□ VERIFY: Each row has:
  - Name, Email, Phone
  - Date, Time, Purpose
  - Green checkmark (valid)
  - Checkbox (selected by default)
□ VERIFY: Step indicator: Step 2 of 3
□ Click "Send Invitations"

STEP 3: Progress
□ VERIFY: Progress bar appears
□ VERIFY: Progress updates (0% → 100%)
□ VERIFY: Step indicator: Step 3 of 3
□ Wait for completion
□ VERIFY: Success message "Successfully invited 3 visitors"
```

### Test 4.3: Verify Results
```
□ Navigate to "Visitor History"
□ VERIFY: All 3 new visitors appear:
  □ Alice Smith - Expected status
  □ Bob Jones - Expected status
  □ Carol White - Expected status
□ VERIFY: Each has unique invite link
```

**Pass Criteria:** 3 visitors created successfully  
**Issues Found:** ____________________

---

## Section 5: Visitor History & Filters (5 minutes)

### Test 5.1: View History
```
□ Navigate to "Visitor History"
□ VERIFY: List/table shows all your visitors
□ VERIFY: Each entry shows:
  - Visitor name
  - Phone number
  - Email (if provided)
  - Visit date and time
  - Purpose
  - Status chip (color-coded)
  - Actions (if applicable)
```

### Test 5.2: Status Filter
```
□ Locate status filter dropdown
□ Click and select "Expected"
□ VERIFY: Only "Expected" visitors show
□ Count: _____ visitors

□ Select "Active" filter
□ VERIFY: Only "Active" visitors show
□ Count: _____ visitors

□ Click "Clear Filter" or "All"
□ VERIFY: Full list returns
```

### Test 5.3: Search Function
```
□ Locate search box
□ Enter: 071234
□ VERIFY: Results filter to matching phone numbers
□ VERIFY: Search works on partial matches

□ Clear search
□ Enter: Alice
□ VERIFY: Results filter to matching names
```

### Test 5.4: Mobile Responsive Testing
```
□ Resize browser to mobile width (<768px)
  OR open on actual mobile device

□ VERIFY: Layout changes to card view
□ VERIFY: Each card shows:
  - Visitor name (large)
  - Date, time, status
  - Action buttons
  - All information readable

□ VERIFY: Filters still work in mobile view
□ VERIFY: Touch targets are large enough (easy to tap)
```

**Pass Criteria:** All filters work, mobile layout correct  
**Issues Found:** ____________________

---

## Section 6: Privacy Dashboard (4 minutes)

### Test 6.1: Navigate to Privacy
```
□ Click "Privacy" in navigation menu
□ VERIFY: Redirected to /resident/privacy
□ VERIFY: 4 tabs visible:
  1. My Data
  2. Consents
  3. Data Export
  4. Account Deletion
```

### Test 6.2: My Data Tab
```
□ VERIFY Tab shows:
  □ Your personal information
  □ Account creation date
  □ Last login
  □ Summary of activity
```

### Test 6.3: Consents Tab
```
□ Click "Consents" tab
□ VERIFY: Shows consent history:
  □ Terms of Service - date accepted
  □ Privacy Policy - date accepted
  □ Data processing consent
□ VERIFY: Each has timestamp
```

### Test 6.4: Data Export (Kenya DPA Article 39)
```
□ Click "Data Export" tab
□ Click "Export My Data" button
□ VERIFY: Confirmation dialog appears
□ Confirm export request
□ Wait for processing
□ VERIFY: Download starts OR success message
□ If download: Open file, verify it contains your data
```

### Test 6.5: Account Deletion (Optional - DO NOT COMPLETE)
```
□ Click "Account Deletion" tab
□ Read warnings
□ VERIFY: Clear explanation of consequences
□ VERIFY: Requires confirmation
□ NOTE: Do not actually delete account (test only)
```

**Pass Criteria:** Privacy dashboard functional, export works  
**Issues Found:** ____________________

---

## Section 7: Logout & Re-login (1 minute)

### Test 7.1: Logout
```
□ Click "Logout" button
□ VERIFY: Redirect to login page
□ VERIFY: Cannot access dashboard directly
  - Try navigating to /dashboard/resident
  - Should redirect back to login
```

### Test 7.2: Re-login
```
□ Login again with same credentials
□ VERIFY: Dashboard loads normally
□ VERIFY: All previous visitors still visible
□ VERIFY: Session restored properly
```

**Pass Criteria:** Logout and re-login work correctly  
**Issues Found:** ____________________

---

## Final Checklist

### Overall System Assessment
```
□ No system crashes during testing
□ All features accessible and functional
□ Page load times acceptable (<3s)
□ No broken links or 404 errors
□ Forms submit correctly
□ Data persists correctly
□ Mobile experience is usable
□ No security warnings or errors
```

### Browser Compatibility (If Time Permits)
```
□ Chrome: PASS/FAIL
□ Firefox: PASS/FAIL
□ Safari: PASS/FAIL
□ Mobile Safari: PASS/FAIL
□ Mobile Chrome: PASS/FAIL
```

---

## Test Results Summary

**Date Tested:** ___________  
**Tester Name:** ___________  
**Browser Used:** ___________  
**Device:** ___________

**Overall Result:** PASS / FAIL (Circle one)

**Tests Passed:** ___ / 7 sections  
**Critical Issues:** ___ (Count)  
**Minor Issues:** ___ (Count)

### Critical Issues Found:
1. ____________________
2. ____________________
3. ____________________

### Minor Issues Found:
1. ____________________
2. ____________________
3. ____________________

### Recommendations:
____________________
____________________
____________________

**Ready for Production:** YES / NO

---

**Signature:** ___________  
**Date:** ___________
