# Manual Testing Guide - Admin User
**System Administrator UAT Script**

**Duration:** 20 minutes  
**Tester Role:** System Administrator  
**Date:** November 25, 2025

---

## Setup

**Login:** `admin@test.com` / `TestPass123!`  
**URL:** `http://localhost:3000/login`

---

## Section 1: Admin Dashboard (3 min)

```
□ Login as admin
□ VERIFY: Redirected to /dashboard/admin
□ VERIFY: Admin-only sections visible:
  - System statistics
  - User management shortcut
  - Recent activity
  - System health indicators
□ VERIFY: Full navigation menu (all roles)
```

---

## Section 2: User Management (7 min)

### Test 2.1: View Users
```
□ Navigate to "Manage Residents"
□ VERIFY: List of all residents
□ Each row shows: Name, Email, House, Status, Actions

□ Navigate to "Manage Guards"
□ VERIFY: List of all guards
□ Each row shows: Name, Email, Shift, Status, Actions
```

### Test 2.2: Create New User
```
□ Click "Add New Resident"
FILL FORM:
□ Name: Test Resident 2
□ Email: test.resident2@example.com
□ Phone: 0733445566
□ House: B202
□ Password: TempPass123!
□ Submit

VERIFY:
□ Success message
□ New user in list
□ Status: Active

TEST NEW USER:
□ Logout
□ Login as: test.resident2@example.com / TempPass123!
□ VERIFY: Access works
□ Logout, login back as admin
```

### Test 2.3: Disable User
```
□ Find test.resident2@example.com
□ Click "Disable" or toggle status
□ Confirm action
□ VERIFY: Status → "Disabled"

TEST ACCESS:
□ Logout
□ Attempt login as disabled user
□ VERIFY: "Account disabled" error
□ Cannot access system
□ Login back as admin
```

### Test 2.4: Delete User
```
□ Find test.resident2@example.com
□ Click "Delete"
□ VERIFY: Warning dialog
□ Confirm deletion
□ VERIFY: User removed from list
□ VERIFY: Cannot login anymore
```

---

## Section 3: System Reports (4 min)

```
□ Navigate to "Reports"
□ VERIFY: Report types available:
  - Visitor Activity Report
  - User Activity Report
  - Security Incidents Report
  - System Usage Report

TEST VISITOR REPORT:
□ Select date range: Last 7 days
□ Click "Generate Report"
□ VERIFY: Report shows:
  - Total visitors
  - Check-ins/check-outs
  - Active visitors
  - Status breakdown

□ Test "Export" button
□ VERIFY: CSV or PDF downloads
□ Open file, verify data is correct
```

---

## Section 4: System Settings (3 min)

```
□ Navigate to "Settings" or "Site Management"
□ VERIFY: Settings categories:
  - General
  - Security
  - Notifications
  - Integrations

TEST GENERAL SETTINGS:
□ View site name, timezone, language
□ (Do not modify in production)

TEST SECURITY SETTINGS:
□ View password requirements
□ View session timeout
□ View MFA enforcement policy

TEST NOTIFICATION SETTINGS:
□ View email templates
□ View SMS configuration
□ View notification triggers
```

---

## Section 5: Access Control (2 min)

```
□ Navigate to "Access Control" or "Role Management"
□ VERIFY: Role list:
  - Admin
  - Guard
  - Resident

□ Click on "Guard" role
□ VERIFY: Permissions shown:
  - Can check in/out visitors
  - Can scan QR codes
  - Can view visitor history
  - Cannot manage users
  - Cannot access admin functions

□ VERIFY: Cannot modify core permissions (read-only)
```

---

## Section 6: Visitor Log (Admin View) (2 min)

```
□ Navigate to "Visitor Log"
□ VERIFY: Complete visitor log (all residents)
□ VERIFY: Columns:
  - Visitor name
  - Host (resident)
  - Guard (who checked in)
  - Check-in time
  - Check-out time
  - Status
  - Actions

□ Test filters:
  - Filter by date
  - Filter by status
  - Filter by resident
  - Search by visitor name

□ VERIFY: Export option available
```

---

## Section 7: Security Test (1 min)

```
□ VERIFY admin can access all pages:
  □ /dashboard/admin ✓
  □ /dashboard/resident ✓
  □ /dashboard/guard ✓
  □ /admin/* ✓
  □ /resident/* ✓
  □ /guard/* ✓

□ VERIFY: All navigation items visible
□ VERIFY: No "Access Denied" errors for admin
```

---

## Final Checklist

```
User Management:     □ PASS □ FAIL
Reports:             □ PASS □ FAIL
Settings:            □ PASS □ FAIL
Access Control:      □ PASS □ FAIL
Visitor Log:         □ PASS □ FAIL
Security:            □ PASS □ FAIL
```

**Overall:** PASS / FAIL  
**Critical Issues:** ___ (Count)

**Ready for Production:** YES / NO

**Signature:** ___________
