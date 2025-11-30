# Manual Testing Guide - Visitor (Public User)
**Visitor Experience UAT Script**

**Duration:** 15 minutes  
**Tester Role:** External Visitor (No Login Required)  
**Date:** November 25, 2025

---

## Setup

**Required:**
- Valid invite link (from Resident test): _______________
- Mobile device (smartphone)
- No login credentials needed

---

## Section 1: Invite Page View (3 min)

### Test 1.1: Open Invite Link
```
□ Open invite link in browser (or click from email)
□ VERIFY: Page loads without login prompt
□ VERIFY: URL format: /invite/[token]

VERIFY PAGE CONTENT:
□ Hero header with gradient background
□ Estate/Community name
□ Visitor name: [Your name from Resident test]
□ Host name: Resident who invited you
□ Visit date and time
□ Visit purpose
□ Estate address/location
□ QR code (large, centered, scannable)

VERIFY ACTIONS:
□ "Download QR" or "Save QR" button
□ "Add to Calendar" option (optional)
□ Instructions for arrival
```

### Test 1.2: Mobile View
```
□ Open same link on mobile device
□ VERIFY: Responsive layout
□ VERIFY: QR code still large and scannable
□ VERIFY: All information readable
□ VERIFY: Buttons easy to tap

□ Test screenshot QR:
  - Take screenshot of QR code
  - Save to photos
  - VERIFY: QR code clear enough to scan later
```

### Test 1.3: Invalid Invite Link
```
□ Modify invite URL (change token)
□ Open modified URL
□ VERIFY: Error page or message:
  - "Invalid invitation" or
  - "Invitation not found"
□ VERIFY: Clear explanation
□ VERIFY: "Go to homepage" or contact option
```

---

## Section 2: Kiosk Walk-In Registration (8 min)

### Test 2.1: Access Kiosk
```
□ Navigate to: http://localhost:3000/kiosk
□ VERIFY: Welcome screen loads
□ VERIFY: No login required
□ VERIFY: Language selection visible:
  - English (EN)
  - Swahili (SW)

□ Select language: English
□ VERIFY: Welcome message in English
```

### Test 2.2: Walk-In Registration Flow
```
STEP 1: Visitor Type Selection
□ VERIFY: Options visible:
  - "Walk-in Visitor" (button)
  - "Pre-registered Visitor" (button)
□ Select "Walk-in Visitor"

STEP 2: Visitor Details Form
□ VERIFY: Form fields:
  - Full Name (required)
  - Phone Number (required)
  - Email Address (optional)
  - Company/Organization (optional)
  - Purpose of Visit (required)
  - Vehicle Plate Number (optional)

FILL FORM:
□ Name: Test Walker
□ Phone: 0744556677
□ Email: test.walker@example.com
□ Purpose: Business meeting
□ Click "Next"

STEP 3: Photo Capture
□ VERIFY: Camera interface OR skip option
IF TEST MODE:
  □ Click "Skip Photo" button
IF PRODUCTION:
  □ Allow camera access
  □ Take photo
  □ VERIFY: Photo preview shown
□ Click "Continue"

STEP 4: Search for Host
□ VERIFY: Host search interface
□ Search by: House number (e.g., A101)
  OR Resident name
□ VERIFY: Search results appear
□ Select a resident from list
□ VERIFY: Resident name confirmed

STEP 5: Review and Submit
□ VERIFY: Summary page shows:
  - Your name
  - Phone
  - Purpose
  - Host name
  - (Photo if taken)
□ Click "Submit Registration"

STEP 6: Success Screen
□ VERIFY: Success message
□ VERIFY: Visit Code displayed: ___________
□ VERIFY: Status: "Pending" or "Approved"
□ VERIFY: Instructions:
  - "Show this code to security"
  - "Wait for approval" (if pending)
□ VERIFY: QR code generated (if system generates)
```

### Test 2.3: Language Switching
```
□ Return to kiosk homepage
□ Switch language to: Swahili (SW)
□ VERIFY: UI text changes to Swahili
□ Start walk-in registration
□ VERIFY: All steps in Swahili
□ VERIFY: Form labels translated
□ Complete or cancel registration
```

### Test 2.4: Inactivity Timeout
```
□ Start walk-in registration
□ Fill first step
□ Stop interacting (do not touch)
□ Wait 60+ seconds
□ VERIFY: System auto-resets to welcome screen
□ VERIFY: No data retained from previous attempt
```

---

## Section 3: Pre-Registered Visitor (2 min)

```
IF THIS OPTION AVAILABLE ON KIOSK:

□ From kiosk welcome screen
□ Select "Pre-registered Visitor"

OPTION A: Enter Invite Code
□ VERIFY: Input field for code
□ Enter invite code: _____________
□ Submit
□ VERIFY: Your details appear
□ VERIFY: QR code shown

OPTION B: Phone Number Lookup
□ VERIFY: Input field for phone
□ Enter your phone: _____________
□ VERIFY: Your invites appear
□ Select correct invite
□ VERIFY: QR code and details shown
```

---

## Section 4: Arrival at Gate (2 min)

### Test 4.1: Present QR Code
```
(This requires Guard cooperation)

□ Approach guard with QR code
  (Physical device showing QR OR printed)
□ Guard scans QR code
□ OBSERVE from Guard's screen:
  - Your details appear
  - Guard checks you in

□ VERIFY: Confirmation shown to guard
□ VERIFY: You receive verbal confirmation
□ Enter premises
```

### Test 4.2: Manual Check (No QR)
```
(Alternative if QR doesn't work)

□ Provide phone number to guard: ___________
□ Guard searches manually
□ VERIFY: Guard finds your record
□ Guard checks you in
□ Receive confirmation
□ Enter premises
```

---

## Final Checklist

### Visitor Experience Assessment
```
Invite Page:              □ PASS □ FAIL
Kiosk Walk-In:            □ PASS □ FAIL
Language Support:         □ PASS □ FAIL
QR Code Quality:          □ PASS □ FAIL
Instructions Clarity:     □ PASS □ FAIL
```

### Usability Rating (1-5)
```
Ease of Use:              ___ / 5
Clear Instructions:       ___ / 5
Mobile Experience:        ___ / 5
QR Code Scannability:     ___ / 5
Overall Experience:       ___ / 5
```

### Visitor Feedback
```
Positive aspects:
____________________
____________________

Confusing aspects:
____________________
____________________

Suggestions:
____________________
____________________
```

**Overall:** PASS / FAIL  
**Would recommend to other visitors:** YES / NO

---

**Tester:** ___________  
**Date:** ___________  
**Device:** ___________
