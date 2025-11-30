# Comprehensive Manual UI/UX Testing Roadmap
**Secure Gate Access Control System**  
**Date:** November 26, 2025  
**Purpose:** Human-executed UI/UX verification before production launch  
**Estimated Time:** 6-8 hours total

---

## Executive Summary

This document provides a systematic approach to manually verify the user interface and experience for all user types in the Secure Gate system. While backend functionality has been validated via API testing (31/31 tests), this roadmap focuses on **what users see and how they interact with the system**.

### Why Manual Testing is Required

Our API testing confirmed all backend functionality works perfectly. However, **httpOnly cookies** (our security best practice) make automated browser testing challenging. Therefore, **human verification** is needed to ensure:

1. **Visual polish** - Does it look professional?
2. **User clarity** - Is it obvious what to do?
3. **Mobile experience** - Does it work on phones?
4. **Error handling** - Are error messages helpful?
5. **Flow completion** - Can users accomplish their goals?

---

## Testing Environment Setup

### Prerequisites

1. **Devices Needed:**
   - Desktop/Laptop (Chrome or Firefox)
   - iOS device (iPhone) with Safari
   - Android device with Chrome
   - Tablet (optional but recommended)

2. **Test Accounts:**
   - Resident: `resident@test.com` / `TestPass123!`
   - Guard: `guard@test.com` / `TestPass123!`
   - Admin: `admin@test.com` / `TestPass123!`

3. **Environment:**
   - Frontend: `http://localhost:3000` (or staging URL)
   - Backend: `http://localhost:3001` (or staging API)
   - Database: Staging database with test data

4. **Tools:**
   - Notepad for observations
   - Phone camera for screenshots (if issues found)
   - Timer (track time per task)

---

## Global UX Criteria (Apply to All Tests)

For every screen you test, evaluate these dimensions:

### 1. **Clarity** (Can users understand what to do?)
- [ ] Page purpose is obvious within 3 seconds
- [ ] Primary action stands out (biggest, brightest button)
- [ ] Labels and copy are in plain language (no jargon)
- [ ] User knows where they are (navigation, breadcrumbs, heading)

### 2. **Consistency** (Does it feel like one system?)
- [ ] Colors mean the same thing everywhere:
  - Blue = Expected/Pending
  - Green = Active/Success
  - Red = Denied/Error
  - Amber = Warning/Pending Approval
  - Gray = Completed/Exited
- [ ] Buttons follow hierarchy:
  - Primary = Green (main action)
  - Secondary = White/Gray (alternative)
  - Tertiary = Text link (low priority)
- [ ] Font sizes and spacing consistent
- [ ] Icons used consistently (same icon = same meaning)

### 3. **Responsiveness** (Does it work on all devices?)
- [ ] Layout works on desktop (>1280px)
- [ ] Layout works on tablet (768-1024px)
- [ ] Layout works on mobile (360-414px)
- [ ] No horizontal scrolling on mobile
- [ ] Touch targets ≥ 44x44px on mobile
- [ ] Text readable without zooming

### 4. **Error & Empty States** (What happens when things go wrong?)
- [ ] Error messages are human-readable
- [ ] Errors appear near the relevant field/action
- [ ] Empty states show helpful guidance ("Create your first...")
- [ ] Loading states show (spinners, skeletons)

### 5. **Performance Feel** (Does it feel fast?)
- [ ] Pages load in < 2 seconds
- [ ] Actions provide immediate feedback (button changes, spinners)
- [ ] No "frozen" feeling (cursor changes, something happens)

---

## PHASE 1: RESIDENT UI/UX TESTING

**Role:** Resident (community member who invites visitors)  
**Primary Goals:** Create invites, manage visitor history  
**Estimated Time:** 90 minutes

---

### Test 1.1: Login & First Impression (Desktop)

**Time:** 10 minutes  
**Device:** Desktop browser (Chrome/Firefox)

#### Steps

1. **Navigate to login page**
   - Open `http://localhost:3000` in browser
   - Clear cookies and cache first (fresh experience)

2. **Observe landing page** (before filling anything)
   - [ ] **VISUAL CHECK:**
     - Logo displays correctly (green lock icon)
     - "Welcome Back" heading visible and large
     - Form fields clearly labeled
     - "Sign In" button prominent (green)
     - "Forgot password?" and "Sign up" links visible
   - [ ] **CLARITY CHECK:**
     - Can you tell this is a security/access system?
     - Is it obvious this is a login page?
     - Any confusing elements?
   - [ ] **POLISH CHECK:**
     - Does it look professional?
     - Any visual bugs (alignment, spacing, colors)?
     - Any text cutoff or overlap?

3. **Fill in credentials**
   - Email: `resident@test.com`
   - Password: `TestPass123!`
   - [ ] **INTERACTION CHECK:**
     - Email field accepts input smoothly
     - Password field masks characters (shows dots)
     - Eye icon toggles password visibility
     - "Remember me" checkbox works
     - Focus states visible (fields highlight when active)

4. **Submit login**
   - Click "Sign In" button
   - [ ] **FEEDBACK CHECK:**
     - Button shows loading state (spinner or text change)?
     - User knows something is happening?
     - Redirect happens within 1-2 seconds?

5. **Observe dashboard landing**
   - Should redirect to `/dashboard/resident`
   - [ ] **FIRST IMPRESSION:**
     - Welcoming message? (e.g., "Welcome back, [name]!")
     - Dashboard purpose clear?
     - Main actions visible?
     - Navigation menu present?

#### Expected Outcome

- ✅ User lands on resident dashboard
- ✅ Clear greeting with user name/role
- ✅ Navigation shows: Dashboard, Create Invite, History, Settings
- ✅ Quick action cards/buttons visible
- ✅ No console errors (press F12 to check)

#### Observations to Record

| Criterion | Rating (1-5) | Notes |
|-----------|--------------|-------|
| Visual Polish | | |
| Clarity | | |
| Loading Feedback | | |
| First Impression | | |
| Mobile-Friendly (if tested on phone) | | |

---

### Test 1.2: Resident Dashboard Overview (Desktop)

**Time:** 10 minutes  
**Device:** Desktop browser

#### Steps

1. **Scan dashboard layout**
   - [ ] **LAYOUT CHECK:**
     - Clear heading: "Dashboard" or "Welcome"
     - Summary cards show key metrics (e.g., "Active Visitors", "Upcoming Visits")
     - Primary CTA: "Invite Visitor" or "Create Invite" button prominent
     - Secondary actions visible but not distracting

2. **Navigation inspection**
   - [ ] **NAVIGATION CHECK:**
     - Sidebar or top nav bar present?
     - Active page highlighted (Dashboard should be active)?
     - All menu items labeled clearly:
       - Dashboard
       - Invite Visitor / Create Invite
       - Visitor History / My Invites
       - Settings / Profile
       - Logout
     - Icons + text (not just icons)?

3. **Information Architecture**
   - [ ] **CONTENT CHECK:**
     - Most important info above fold (no scrolling needed)?
     - Data presented in scannable format (cards, not paragraphs)?
     - Empty states handled (if no visitors, shows friendly message)?

4. **Quick actions test**
   - [ ] **INTERACTION CHECK:**
     - Can you quickly see how to:
       - Create a new invite?
       - View past visitors?
       - Edit profile?
     - Actions grouped logically?

#### Expected Outcome

- ✅ Dashboard shows resident-specific info
- ✅ Clear path to main tasks (invite visitor)
- ✅ Navigation is intuitive
- ✅ No overwhelming information

#### Observations to Record

| Element | Clear? | Notes |
|---------|--------|-------|
| Primary purpose | | |
| Key metrics | | |
| Main CTA | | |
| Navigation | | |

---

### Test 1.3: Create Single Visitor Invite (Desktop & Mobile)

**Time:** 20 minutes (10 min desktop, 10 min mobile)  
**Device:** Desktop, then repeat on mobile

#### Steps (Desktop)

1. **Navigate to invite creation**
   - Click "Invite Visitor" or "Create Invite" button
   - [ ] **NAVIGATION CHECK:**
     - URL changes to `/invite/create` or similar?
     - Page title updates?
     - Breadcrumb shows path?

2. **Observe form layout**
   - [ ] **FORM STRUCTURE:**
     - Fields grouped logically:
       - **Visitor Info** (name, phone, email)
       - **Visit Details** (date, time)
       - **Purpose** (reason for visit)
     - Clear visual separation between groups?
     - Form not overwhelming (one column, good spacing)?

3. **Fill out form** (positive test)
   - **Visitor Info:**
     - Name: "John Doe"
     - Phone: "0712345678"
     - Email: "john@example.com"
   - **Visit Details:**
     - Date: Tomorrow's date
     - Time: "14:00"
   - **Purpose:** "Business meeting"

   - [ ] **INTERACTION CHECK:**
     - All fields easy to click/tap?
     - Date picker appears (calendar widget)?
     - Time picker or dropdown works?
     - Labels stay visible when typing (not disappearing placeholders)?
     - Input types correct (email keyboard, number keyboard for phone)?

4. **Test validation** (negative test)
   - Clear form and try submitting empty
   - [ ] **VALIDATION CHECK:**
     - Errors appear immediately or on submit?
     - Error messages inline (next to field) or at top?
     - Messages specific ("Email is required" not "Error")?
     - Required fields marked with asterisk or label?

   - Try invalid data:
     - Past date
     - Invalid email format
     - Invalid phone format
   - [ ] **ERROR HANDLING:**
     - Clear messages for each error?
     - User knows how to fix?

5. **Submit valid form**
   - Re-fill with valid data and submit
   - [ ] **SUCCESS CHECK:**
     - Loading indicator while saving?
     - Success message appears?
     - Invite code shown?
     - Invite link provided?
     - Options to:
       - Create another invite?
       - View invitation?
       - Share via email/SMS?

#### Steps (Mobile)

6. **Repeat on mobile device** (375-414px screen)
   - [ ] **MOBILE CHECK:**
     - Form fills entire width (no wasted space)?
     - Date/time pickers work with native mobile widgets?
     - Keyboard types match field (email keyboard, number pad)?
     - Submit button always visible (not hidden by keyboard)?
     - Touch targets large enough (buttons ≥ 44px)?
     - No horizontal scroll?

#### Expected Outcome

- ✅ Form is clear and logical
- ✅ Validation prevents bad data
- ✅ Success state shows invite details
- ✅ Mobile experience smooth and native-feeling

#### Observations to Record

| Aspect | Desktop Rating | Mobile Rating | Issues Found |
|--------|----------------|---------------|--------------|
| Form layout | | | |
| Field grouping | | | |
| Date/time pickers | | | |
| Validation clarity | | | |
| Success feedback | | | |
| Overall ease | | | |

---

### Test 1.4: Bulk Invite Creation (Desktop)

**Time:** 15 minutes  
**Device:** Desktop browser

#### Steps

1. **Navigate to bulk invite**
   - From dashboard or invite page, find "Bulk Invite" option
   - [ ] **DISCOVERABILITY:**
     - Easy to find?
     - Labeled clearly ("Bulk Invite", "Import Multiple", etc.)?

2. **Observe wizard/form**
   - [ ] **STRUCTURE CHECK:**
     - Multi-step wizard indicated (Step 1/3, 2/3)?
     - Or single page with clear sections?
     - Instructions provided?
     - Sample data or template shown?

3. **Input method**
   - [ ] **INPUT CHECK:**
     - Can add rows manually (one at a time)?
     - Can upload CSV/Excel?
     - Can paste from spreadsheet?
     - Add/remove row buttons clear?

4. **Fill bulk data**
   - Add 2-3 visitors:
     - Visitor 1: "Alice Smith", "0711111111", "alice@test.com", tomorrow, "10:00", "Meeting"
     - Visitor 2: "Bob Jones", "0722222222", "bob@test.com", tomorrow, "11:00", "Delivery"
     - Visitor 3: "Carol White", "0733333333", "carol@test.com", tomorrow, "14:00", "Interview"

   - [ ] **INTERACTION CHECK:**
     - Easy to add multiple rows?
     - Can edit in-line?
     - Can delete rows easily?
     - Validation per row or at end?

5. **Review and submit**
   - [ ] **REVIEW CHECK:**
     - Summary screen before submit?
     - Shows all visitors in table?
     - Can go back and edit?
     - Clear submit button?

6. **Success handling**
   - [ ] **BULK SUCCESS:**
     - Shows how many succeeded?
     - Shows any failures with reasons?
     - Option to download invite codes?
     - Option to send all emails/SMS?

#### Expected Outcome

- ✅ Bulk invite is efficient (faster than single invites)
- ✅ Clear wizard or form structure
- ✅ Validation per row or batch
- ✅ Success summary with all codes

#### Observations to Record

| Element | Clear? | Efficient? | Notes |
|---------|--------|------------|-------|
| Wizard flow | | | |
| Input methods | | | |
| Validation | | | |
| Success summary | | | |

---

### Test 1.5: Visitor History & Filters (Desktop & Mobile)

**Time:** 15 minutes (10 min desktop, 5 min mobile)  
**Device:** Desktop, then mobile

#### Steps (Desktop)

1. **Navigate to history**
   - Click "Visitor History", "My Invites", or similar
   - [ ] **PAGE LOAD:**
     - Table or list loads quickly?
     - Pagination visible if many visitors?
     - Clear columns/fields:
       - Visitor Name
       - Date/Time
       - Status (color-coded?)
       - Actions (View, Edit, Cancel)

2. **Scan list view**
   - [ ] **VISUAL HIERARCHY:**
     - Most recent visitors at top?
     - Status colors consistent:
       - Blue = Expected
       - Green = Active/On Premise
       - Red = Denied
       - Gray = Completed/Exited
     - Row hover states (helps with scanning)?

3. **Test filters**
   - [ ] **FILTER CHECK:**
     - Filter by status (Pending, Active, Completed)?
     - Filter by date range?
     - Search by name or phone?
     - Filters at top and easy to find?
     - Clear/reset filters option?

   - Apply filter: Status = "PENDING"
   - [ ] **FILTER RESULTS:**
     - List updates immediately?
     - Shows count of results?
     - Can combine multiple filters?

4. **Test search**
   - Search for "John" or phone "071"
   - [ ] **SEARCH CHECK:**
     - Instant search or submit button?
     - Highlights matches?
     - Shows "No results" if nothing found?
     - Can clear search easily?

5. **View details**
   - Click on a visitor row
   - [ ] **DETAIL VIEW:**
     - Modal or new page?
     - Shows all visitor info?
     - Shows invite code and link?
     - Shows timestamps (created, check-in, check-out)?
     - Actions available (Edit, Cancel, Resend)?

#### Steps (Mobile)

6. **Repeat on mobile**
   - [ ] **MOBILE HISTORY:**
     - Table becomes cards (not squeezed table)?
     - Each card shows key info:
       - Name (large)
       - Date/time
       - Status badge
     - Filters accessible (not hidden)?
     - Search bar at top?
     - Pagination works on touch?

#### Expected Outcome

- ✅ History is scannable and clear
- ✅ Filters work correctly
- ✅ Search is instant and helpful
- ✅ Mobile view uses cards not tables

#### Observations to Record

| Feature | Desktop | Mobile | Issues |
|---------|---------|--------|--------|
| List clarity | | | |
| Status colors | | | |
| Filters | | | |
| Search | | | |
| Detail view | | | |

---

### Test 1.6: Mobile Responsiveness Deep Dive (Mobile)

**Time:** 15 minutes  
**Device:** Mobile phone (iOS/Android)

#### Steps

1. **Test all key screens on mobile:**
   - [ ] Login page
   - [ ] Dashboard
   - [ ] Create invite form
   - [ ] Visitor history

2. **Interaction tests:**
   - [ ] **TOUCH CHECK:**
     - All buttons easy to tap (no mis-taps)?
     - Forms scroll smoothly (no janky animations)?
     - Dropdowns/pickers use native widgets?
     - No text too small to read?
     - No horizontal scroll anywhere?

3. **Orientation test:**
   - [ ] **ROTATION CHECK:**
     - Rotate phone to landscape
     - Layout adapts or at least doesn't break?
     - Forms still usable?

4. **Network test** (optional but valuable)
   - [ ] **SLOW NETWORK:**
     - Enable "Slow 3G" in browser dev tools
     - Or test on poor WiFi/cellular
     - Pages still load?
     - Loading indicators show?
     - No white screen of death?

#### Expected Outcome

- ✅ All screens work well on mobile
- ✅ Touch interactions smooth
- ✅ Native mobile patterns used
- ✅ Graceful handling of slow networks

---

## PHASE 2: GUARD UI/UX TESTING

**Role:** Security guard (gate personnel who verify and check in visitors)  
**Primary Goals:** View active visitors, check in/out, register walk-ins  
**Estimated Time:** 90 minutes

---

### Test 2.1: Guard Login & Dashboard (Mobile-First)

**Time:** 10 minutes  
**Device:** Mobile phone (guards typically use phones/tablets)

#### Steps

1. **Login as guard**
   - Logout if logged in as resident
   - Login: `guard@test.com` / `TestPass123!`

   - [ ] **LOGIN CHECK:**
     - Same login page as resident?
     - System detects role after login?
     - Redirects to guard dashboard?

2. **Observe guard dashboard**
   - [ ] **DASHBOARD CHECK:**
     - Clear role indicator ("Guard Dashboard" or "Security")?
     - Different from resident dashboard (not confusing)?
     - Two primary actions prominent:
       - **Scan QR Code**
       - **Manual Check / Search**
     - Active visitors list visible?

3. **Scan layout**
   - [ ] **MOBILE LAYOUT:**
     - CTA buttons large and finger-friendly?
     - Active visitors shown as cards?
     - Each card shows:
       - Visitor name
       - Expected time
       - Status badge
       - Quick actions (Check In button)?

4. **Navigation check**
   - [ ] **GUARD NAV:**
     - Menu items relevant to guards:
       - Dashboard
       - Active Visitors
       - Walk-In Registration
       - Search
       - Logout
     - No resident-specific options (Create Invite)?

#### Expected Outcome

- ✅ Guard dashboard clearly different from resident
- ✅ Mobile-optimized (guards are on the go)
- ✅ Primary actions obvious (Scan, Search)
- ✅ Active visitors easily accessible

#### Observations to Record

| Element | Mobile Friendly? | Clear Purpose? | Notes |
|---------|------------------|----------------|-------|
| Dashboard layout | | | |
| Scan QR button | | | |
| Manual search button | | | |
| Active visitors list | | | |

---

### Test 2.2: Active Visitors List (Mobile)

**Time:** 10 minutes  
**Device:** Mobile phone

#### Steps

1. **Navigate to active visitors**
   - Click "Active Visitors" or similar
   - [ ] **LIST VIEW:**
     - Shows all expected, verified, on-premise visitors?
     - Grouped by status or time?
     - Each card/row shows:
       - Visitor name (large)
       - Host/Resident name
       - Expected time
       - Status badge (color-coded)
       - Quick action (Check In/Check Out)

2. **Status colors check**
   - [ ] **COLOR CODING:**
     - Pending = Blue
     - Verified = Green
     - On Premise = Green/Teal
     - Different shades distinguish states?

3. **Interaction test**
   - [ ] **TOUCH CHECK:**
     - Tap on visitor card opens details?
     - Check In button accessible?
     - No accidental taps (buttons spaced)?

4. **Empty state**
   - If no active visitors (test with filters or time of day):
   - [ ] **EMPTY STATE:**
     - Shows friendly message ("No active visitors")?
     - Suggests action ("Use QR scan when visitors arrive")?
     - Not just blank screen?

#### Expected Outcome

- ✅ Active visitors easy to scan
- ✅ Status colors clear and consistent
- ✅ Touch-friendly on mobile
- ✅ Empty states handled

---

### Test 2.3: Manual Search by Phone/Name (Mobile)

**Time:** 10 minutes  
**Device:** Mobile phone

#### Steps

1. **Open manual search**
   - From dashboard or menu, find "Search" or "Manual Check"
   - [ ] **SEARCH PAGE:**
     - Single prominent search bar at top?
     - Placeholder text helpful ("Enter phone or name")?
     - Search icon or button clear?

2. **Search by phone**
   - Type phone number: "0712345678"
   - [ ] **PHONE SEARCH:**
     - Number keyboard appears on mobile?
     - Auto-formats phone number (e.g., adds spaces)?
     - Search triggers on type or submit button?
     - Results appear quickly?

3. **Search by name**
   - Clear search and type: "John"
   - [ ] **NAME SEARCH:**
     - Shows all matching visitors?
     - Partial matches work (fuzzy search)?
     - Highlights matched text?

4. **Search results**
   - [ ] **RESULTS DISPLAY:**
     - Shows visitor cards/rows with:
       - Name
       - Phone
       - Expected time
       - Status
       - Host name
     - Action button: "Check In" or "View Details"?
     - Multiple results handled well (scrollable list)?

5. **No results handling**
   - Search for nonsense: "zzzzzzz"
   - [ ] **NO RESULTS:**
     - Clear message ("No visitors found")?
     - Suggests using walk-in if visitor not registered?
     - Not just empty list?

#### Expected Outcome

- ✅ Search is fast and intuitive
- ✅ Keyboard types match input (number for phone)
- ✅ Results are clear and actionable
- ✅ No results state is helpful

---

### Test 2.4: Check-In Flow (Mobile)

**Time:** 15 minutes  
**Device:** Mobile phone

#### Steps

1. **Find a pending visitor**
   - Use search or active visitors list
   - Select a visitor with status "Pending" or "Expected"

2. **View visitor details**
   - Tap on visitor card/row
   - [ ] **DETAIL VIEW:**
     - Modal or full page?
     - Shows all info:
       - Full name
       - Phone
       - Host/Resident
       - Expected date/time
       - Purpose
       - Vehicle plate (if provided)
     - Current status clear?
     - Check In button prominent (green)?

3. **Perform check-in**
   - Tap "Check In" button
   - [ ] **CHECK-IN FLOW:**
     - Confirmation dialog? ("Check in [name]?")
     - Or instant check-in with success message?
     - Loading indicator while processing?
     - Success feedback:
       - Visual change (status updates to "On Premise")?
       - Success message ("John Doe checked in")?
       - Timestamp shown?

4. **Verify status update**
   - Navigate back to active visitors list
   - [ ] **STATUS VERIFICATION:**
     - Visitor's status updated to "On Premise" (green)?
     - Timestamp shows check-in time?
     - Color changed from blue to green?

#### Expected Outcome

- ✅ Check-in is quick (1-2 taps)
- ✅ Confirmation prevents mistakes (if appropriate)
- ✅ Success feedback is clear
- ✅ Status updates immediately in UI

---

### Test 2.5: Check-Out Flow (Mobile)

**Time:** 10 minutes  
**Device:** Mobile phone

#### Steps

1. **Find checked-in visitor**
   - Use active visitors list
   - Find visitor with status "On Premise"

2. **Perform check-out**
   - Tap on visitor
   - [ ] **CHECK-OUT:**
     - Check Out button visible and clear?
     - Different color from Check In (e.g., amber or gray)?
     - Confirmation or instant?
     - Success message?
     - Status updates to "Completed" or "Exited"?

3. **Verify list update**
   - [ ] **UI UPDATE:**
     - Visitor removed from active list?
     - Or moves to "Completed" section?
     - Color changes to gray?

#### Expected Outcome

- ✅ Check-out as easy as check-in
- ✅ Visual differentiation from check-in
- ✅ Visitor removed from active list

---

### Test 2.6: QR Code Scan (Mobile with Camera)

**Time:** 10 minutes  
**Device:** Mobile phone with camera

#### Steps

1. **Open QR scanner**
   - From dashboard, tap "Scan QR" button
   - [ ] **SCANNER CHECK:**
     - Camera permission requested?
     - Camera view opens full-screen?
     - Clear instructions ("Point camera at QR code")?
     - Scanner frame/guideline visible?

2. **Test with invite code** (if you have one)
   - Generate a visitor invite (as resident)
   - Display QR code on another screen
   - Scan with guard's device
   - [ ] **SCAN SUCCESS:**
     - Beep or vibration feedback?
     - Immediate result (visitor details)?
     - Shows visitor info:
       - Name
       - Host
       - Expected time
       - Status
     - Action buttons: Check In, Deny, Cancel?

3. **Invalid QR code test**
   - Scan a random QR code (not an invite)
   - [ ] **ERROR HANDLING:**
     - Clear error message ("Invalid invite code")?
     - Option to try again?
     - Doesn't crash?

4. **Expired invite test** (if possible)
   - Scan an old/expired invite
   - [ ] **EXPIRY CHECK:**
     - Shows expiry error?
     - Suggests contacting host?

#### Expected Outcome

- ✅ QR scanning is intuitive
- ✅ Success feedback immediate
- ✅ Invalid codes handled gracefully
- ✅ Camera experience smooth

#### Note
If QR scanning isn't implemented yet, document as:
- ⚠️ **FEATURE NOT READY** - Needs implementation before launch

---

### Test 2.7: Walk-In Registration (Mobile)

**Time:** 15 minutes  
**Device:** Mobile phone

**This is the CRITICAL feature we fixed! Pay close attention.**

#### Steps

1. **Navigate to walk-in**
   - From guard dashboard or menu, find "Walk-In" or "Register Visitor"
   - [ ] **FORM ACCESS:**
     - Easy to find?
     - Labeled clearly ("Walk-In Registration", "Unexpected Visitor")?

2. **Observe form layout**
   - [ ] **FORM STRUCTURE:**
     - Fields grouped:
       - **Visitor Info** (name, phone, vehicle)
       - **Host Info** (resident name/search)
       - **Purpose** (reason for visit)
     - Minimal fields (not overwhelming)?
     - Clear labels?

3. **Fill walk-in form**
   - **Visitor Info:**
     - Name: "Walk-In Test"
     - Phone: "0733333333"
     - Vehicle Plate: "KAB 123X"
   - **Host/Resident:**
     - Start typing "Test Resident"
     - [ ] **RESIDENT LOOKUP:**
       - Autocomplete/dropdown appears?
       - Fuzzy search works (finds partial matches)?
       - Shows resident name clearly?
       - Can select from list?
   - **Purpose:** "Unexpected delivery"

4. **Submit walk-in**
   - Tap submit/save button
   - [ ] **SUCCESS CHECK:**
     - Loading indicator?
     - Success message ("Walk-in registered")?
     - Shows visitor details with:
       - Visitor name
       - Host name (from lookup)
       - Status (Pending Approval or similar)
       - Option to immediately check in?

5. **Verify in active visitors**
   - Navigate to active visitors list
   - [ ] **VERIFICATION:**
     - Walk-in visitor appears in list?
     - Shows as "Pending" or "Walk-In" status?
     - Can check in immediately or awaits approval?

#### Expected Outcome

- ✅ Walk-in form is quick and focused
- ✅ Resident lookup works (fuzzy search)
- ✅ Success creates visitor record
- ✅ Visitor appears in active list
- ✅ **CRITICAL:** No 500 error (this was the bug we fixed!)

#### Observations to Record

| Element | Works? | User-Friendly? | Notes |
|---------|--------|----------------|-------|
| Form layout | | | |
| Resident lookup | | | |
| Fuzzy search | | | |
| Success feedback | | | |
| **Error handling** | | | |

**If you see a 500 error or "full_name" error, STOP and report immediately!**

---

### Test 2.8: Guard Mobile Experience Summary

**Time:** 10 minutes  
**Device:** Mobile phone

#### Holistic Check

- [ ] **OVERALL GUARD UX:**
  - Can guard complete all tasks one-handed?
  - Touch targets large enough (≥ 44px)?
  - Minimal scrolling required?
  - Works in bright sunlight (high contrast)?
  - Works with gloves (large buttons)?
  - Fast enough for gate line (no delays)?

- [ ] **COMMON FLOWS:**
  - Search visitor → Check in: < 10 seconds?
  - Scan QR → Check in: < 5 seconds?
  - Register walk-in: < 30 seconds?

---

## PHASE 3: ADMIN UI/UX TESTING

**Role:** System administrator  
**Primary Goals:** View reports, manage users, system oversight  
**Estimated Time:** 60 minutes

---

### Test 3.1: Admin Login & Dashboard (Desktop)

**Time:** 10 minutes  
**Device:** Desktop browser

#### Steps

1. **Login as admin**
   - Logout and login: `admin@test.com` / `TestPass123!`
   - [ ] **ADMIN ACCESS:**
     - Redirects to admin dashboard?
     - Clear role indicator ("Admin Dashboard")?
     - Different layout from resident/guard?

2. **Dashboard overview**
   - [ ] **ADMIN DASHBOARD:**
     - High-level metrics:
       - Today's visitors
       - Active visitors
       - Total users
       - System health indicators
     - Quick links to:
       - Reports
       - User management
       - System settings
       - Audit logs
     - Charts or graphs (optional)?

3. **Navigation check**
   - [ ] **ADMIN NAV:**
     - Menu items:
       - Dashboard
       - Reports / Analytics
       - User Management
       - System Settings
       - Audit Logs
       - Logout
     - All admin-specific?
     - No resident/guard options?

#### Expected Outcome

- ✅ Admin dashboard shows system-wide view
- ✅ Clear distinction from other roles
- ✅ Navigation focused on admin tasks

---

### Test 3.2: Reports & Analytics (Desktop)

**Time:** 20 minutes  
**Device:** Desktop browser

#### Steps

1. **Navigate to reports**
   - Click "Reports" or "Analytics"
   - [ ] **REPORTS PAGE:**
     - Clear page heading?
     - Filter options at top:
       - Date range picker?
       - Status filter?
       - User/role filter?
     - Report types available:
       - Visitor report
       - User activity report
       - Security incidents
       - Usage statistics

2. **Generate visitor report**
   - Select date range: Last 7 days
   - Click "Generate" or "View Report"
   - [ ] **REPORT DISPLAY:**
     - Loads quickly (< 3 seconds)?
     - Shows data in table or list?
     - Columns:
       - Visitor name
       - Host
       - Date/time
       - Status
       - Check-in/out times
     - Sortable columns?
     - Pagination if many results?

3. **Export functionality**
   - [ ] **EXPORT CHECK:**
     - Export button visible (CSV, PDF, Excel)?
     - Export works (file downloads)?
     - Export contains all data (not truncated)?
     - Filename makes sense ("visitors_report_2025-11-26.csv")?

4. **Filter reports**
   - Try different filters:
     - Status: Only "Denied"
     - Date range: Today
   - [ ] **FILTER CHECK:**
     - Report updates immediately?
     - Shows count of results?
     - Can clear filters?
     - URL updates (can bookmark)?

#### Expected Outcome

- ✅ Reports are comprehensive
- ✅ Filters are easy to use
- ✅ Export functionality works
- ✅ Data is accurate and complete

---

### Test 3.3: User & Role Management (Desktop)

**Time:** 20 minutes  
**Device:** Desktop browser

#### Steps

1. **Navigate to user management**
   - Click "Users" or "User Management"
   - [ ] **USER LIST:**
     - Shows all users in table?
     - Columns:
       - Username/Name
       - Email
       - Role (Resident, Guard, Admin)
       - Status (Active, Inactive)
       - Actions (Edit, Deactivate, Delete)
     - Search bar for users?
     - Filter by role?

2. **View user details**
   - Click on a user row
   - [ ] **USER DETAILS:**
     - Shows full profile?
     - Displays:
       - Personal info (name, email, phone)
       - Role and permissions
       - Registration date
       - Last login
       - Activity summary
     - Edit button visible?

3. **Edit user role** (careful!)
   - Find a test user (not yourself!)
   - Click "Edit" or role dropdown
   - [ ] **ROLE CHANGE:**
     - Can change role (Resident ↔ Guard)?
     - Confirmation dialog before save?
     - Warning if elevating to admin?
     - Save successful?
     - UI updates immediately?

4. **Create new user** (if feature exists)
   - Click "Add User" or "Create User"
   - [ ] **USER CREATION:**
     - Form appears (modal or page)?
     - Required fields:
       - Name, email, password, role
     - Validation works?
     - Success creates user?
     - New user appears in list?

5. **Deactivate user** (if feature exists)
   - Find test user
   - Click "Deactivate" or toggle status
   - [ ] **DEACTIVATION:**
     - Confirmation dialog?
     - Warning about consequences?
     - User marked as inactive?
     - User can't login after?

#### Expected Outcome

- ✅ User list is clear and searchable
- ✅ Role changes are protected (confirmations)
- ✅ Create/edit/delete flows are intuitive
- ✅ Admin can't lock themselves out

#### Observations to Record

| Feature | Accessible? | Safe? | Notes |
|---------|-------------|-------|-------|
| User list | | | |
| User details | | | |
| Role changes | | | |
| User creation | | | |
| Deactivation | | | |

---

### Test 3.4: Admin Mobile Responsiveness (Mobile - Optional)

**Time:** 10 minutes  
**Device:** Mobile phone

#### Quick Check

Most admin tasks are done on desktop, but verify:

- [ ] **MOBILE ADMIN:**
  - Can admin login on mobile?
  - Dashboard readable (not broken)?
  - Reports accessible (even if not ideal)?
  - Critical actions available (deactivate user in emergency)?
  - Layout doesn't break (no horizontal scroll)?

**Note:** It's okay if admin UI is desktop-optimized, but shouldn't break on mobile.

---

## PHASE 4: VISITOR/PUBLIC UI/UX TESTING

**Role:** Visitor (person invited to the property)  
**Primary Goals:** View invite, self-check-in (if enabled)  
**Estimated Time:** 45 minutes

---

### Test 4.1: Invite Email Experience

**Time:** 10 minutes  
**Device:** Desktop and mobile (test email on both)

#### Steps

**Note:** You'll need to create a visitor invite as a resident first, and use a real email address you can check.

1. **Receive invite email**
   - As resident, create invite with your personal email
   - Check email inbox
   - [ ] **EMAIL DELIVERY:**
     - Email arrives quickly (< 2 minutes)?
     - Not in spam folder?
     - Sender name clear ("SecureGate" or similar)?
     - Subject line clear ("You're invited to visit..." or similar)?

2. **Email content (desktop)**
   - [ ] **EMAIL LAYOUT:**
     - Professional and branded?
     - Clear greeting ("Hi [Name]")?
     - Key info above fold:
       - Host name ("John Doe invited you")
       - Visit date and time
       - Property/location
     - Primary CTA button:
       - "View Invitation" or "Accept Invite"
       - Large and prominent
       - Brand color (green)?
     - Invite code visible (as backup)?
     - Contact info or help link?

3. **Email content (mobile)**
   - Open same email on mobile device
   - [ ] **MOBILE EMAIL:**
     - Responsive layout?
     - Text readable without zooming?
     - Button large enough to tap?
     - Images load (if any)?

4. **Click invite link**
   - Click "View Invitation" button in email
   - [ ] **LINK CHECK:**
     - Opens in browser?
     - Loads quickly?
     - Lands on invite page (not error)?
     - Invite code in URL?

#### Expected Outcome

- ✅ Email is professional and clear
- ✅ Key info is immediately visible
- ✅ CTA button is prominent and works
- ✅ Mobile email is readable and functional

---

### Test 4.2: Invite Page / Visitor Portal (Mobile & Desktop)

**Time:** 20 minutes  
**Device:** Mobile, then desktop

#### Steps (Mobile)

1. **Open invite link** (from email or direct)
   - URL format: `http://localhost:3000/invite/[INVITE-CODE]`
   - [ ] **PAGE LOAD:**
     - Loads within 2 seconds?
     - Shows loading state while fetching?
     - No 404 error?

2. **Observe invite page layout**
   - [ ] **HERO SECTION:**
     - Clear heading: "You're Invited!" or "Your Visit Details"
     - Friendly and welcoming tone?
     - Visual identity (logo, colors)?

3. **Invite details display**
   - [ ] **INFORMATION DISPLAY:**
     - Shows all key info:
       - **Host:** Who invited you (name)
       - **Date:** Visit date (formatted nicely)
       - **Time:** Visit time (e.g., "2:00 PM")
       - **Location:** Property address or gate name
       - **Purpose:** Reason for visit
       - **Instructions:** How to find the gate, what to bring, etc.
     - Info presented in cards or sections (not paragraph)?
     - Icons used for clarity (calendar, clock, location)?

4. **Status indication**
   - [ ] **INVITE STATUS:**
     - Shows current status:
       - "Pending" → "Please arrive at scheduled time"
       - "Verified" → "You're confirmed!"
       - "Expired" → Clear expiry message
       - "Used" → "Check-in complete"
     - Status badge color-coded?
     - Appropriate message for each status?

5. **Actions available**
   - [ ] **VISITOR ACTIONS:**
     - **Add to Calendar** button/link?
     - **Get Directions** link (opens maps)?
     - **Contact Host** option (call or message)?
     - **Self Check-In** button (if feature enabled)?
     - **Share Invite** (if allowed)?

6. **Self Check-In flow** (if enabled)
   - Click "Check In" button
   - [ ] **SELF CHECK-IN:**
     - Form appears (modal or page)?
     - Asks for confirmation: "Are you at the gate?"
     - Optional fields:
       - Vehicle plate number
       - Number of guests
       - Consent checkbox (data privacy)
     - Submit button clear?
     - Success message after submit?
     - Status updates to "Checked In"?

7. **Error states**
   - Test invalid invite code (modify URL)
   - [ ] **ERROR HANDLING:**
     - Clear error message ("Invite not found")?
     - Suggests contact host or admin?
     - Doesn't expose technical errors?

8. **Expired invite handling**
   - If you can test with old invite:
   - [ ] **EXPIRY:**
     - Shows "Invite Expired" message?
     - Explains what to do (contact host)?
     - Doesn't allow check-in?

#### Steps (Desktop)

9. **Repeat on desktop**
   - [ ] **DESKTOP LAYOUT:**
     - Layout adapts to larger screen (centered, not stretched)?
     - All info visible without scrolling (above fold)?
     - Buttons appropriately sized (not too small)?
     - Professional appearance?

#### Expected Outcome

- ✅ Invite page is visitor-friendly and clear
- ✅ All necessary info is displayed
- ✅ Actions are helpful (calendar, directions)
- ✅ Mobile-first design works perfectly
- ✅ Error and expiry states handled gracefully

#### Observations to Record

| Element | Mobile | Desktop | Notes |
|---------|--------|---------|-------|
| Page load speed | | | |
| Information clarity | | | |
| Visual design | | | |
| Action buttons | | | |
| Self check-in | | | |
| Error handling | | | |

---

### Test 4.3: Kiosk Self-Service (Tablet)

**Time:** 15 minutes  
**Device:** Tablet or large phone (simulates kiosk screen)

**Note:** Kiosk mode is typically a separate interface for walk-up visitors at the gate.

#### Steps

1. **Access kiosk mode**
   - Navigate to kiosk URL: `http://localhost:3000/kiosk`
   - Or find "Kiosk Mode" option in menu
   - [ ] **KIOSK START:**
     - Full-screen interface?
     - Large, high-contrast elements?
     - Clear instruction: "Welcome! Please tap to begin"

2. **Kiosk flow**
   - [ ] **STEP 1: Identify**
     - Asks "Are you expected or walk-in?"
     - Two large buttons/options?
     - Icons support text?

   - If "Expected":
     - [ ] **EXPECTED FLOW:**
       - Enter phone or invite code
       - Large number pad?
       - Submit button prominent?
       - Shows visitor details if found
       - Check-in button?

   - If "Walk-In":
     - [ ] **WALK-IN FLOW:**
       - Form to enter:
         - Your name
         - Your phone
         - Who you're visiting
         - Purpose
       - On-screen keyboard?
       - Fields large and touch-friendly?
       - Submit creates visitor record?
       - Success message: "Please wait, guard will assist"

3. **Kiosk design check**
   - [ ] **KIOSK UX:**
     - Very large fonts (≥ 24px for body, ≥ 48px for headings)?
     - High contrast colors (black on white, or green on dark)?
     - No small text or tiny buttons?
     - Minimal choices per screen (not overwhelming)?
     - Clear "Start Over" or "Cancel" always visible?
     - Timeout: Returns to start after inactivity (e.g., 30 seconds)?

4. **Accessibility**
   - [ ] **INCLUSIVE DESIGN:**
     - Works without color (icons + text)?
     - Touch targets ≥ 60px (larger than mobile)?
     - Simple language (no jargon)?
     - Works in bright sunlight (high contrast)?

#### Expected Outcome

- ✅ Kiosk mode is distinct from regular UI
- ✅ Very large, touch-friendly interface
- ✅ Simple step-by-step flow
- ✅ Timeout returns to start (security)
- ✅ Works in outdoor gate environment

---

## PHASE 5: CROSS-CUTTING CONCERNS

**Time:** 60 minutes  
**Purpose:** Test aspects that apply to all roles

---

### Test 5.1: Global Navigation & Consistency

**Time:** 15 minutes  
**Device:** Desktop

#### Steps

1. **Test navigation across roles**
   - Login as each role (Resident, Guard, Admin)
   - [ ] **CONSISTENCY CHECK:**
     - Logo always in same place (top left)?
     - User menu always in same place (top right)?
     - Active page always highlighted in nav?
     - Logout always accessible?

2. **Breadcrumbs** (if implemented)
   - Navigate deep: Dashboard → History → Visitor Details
   - [ ] **BREADCRUMB CHECK:**
     - Breadcrumb shows path?
     - Each level clickable (can go back)?
     - Doesn't break on mobile (maybe hidden on small screens)?

3. **URL structure**
   - [ ] **URLS:**
     - Readable URLs (/dashboard/resident, not /d?r=1)?
     - Bookmarkable (direct links work)?
     - No broken routes?

#### Expected Outcome

- ✅ Navigation is consistent across roles
- ✅ Users never get lost
- ✅ Back/forward browser buttons work

---

### Test 5.2: Error Handling Across System

**Time:** 15 minutes  
**Device:** Desktop

#### Steps

1. **Network error simulation**
   - Open dev tools (F12)
   - Go to Network tab
   - Enable "Offline" mode
   - Try to submit a form or load data
   - [ ] **OFFLINE CHECK:**
     - Error message appears?
     - Message is user-friendly ("Connection lost, please try again")?
     - Not technical jargon ("ERR_NETWORK_FAILED")?
     - Retry button or automatic retry?

2. **Server error simulation**
   - Can't easily simulate, but note past errors:
   - [ ] **500 ERROR HANDLING:**
     - When 500 occurs, is there a friendly message?
     - Or does user see raw error?
     - Error logged for debugging?

3. **Validation errors**
   - Try various form submissions with errors across system
   - [ ] **VALIDATION CONSISTENCY:**
     - All forms show errors in same style?
     - Errors always inline (near field) or always at top?
     - Error colors consistent (red)?
     - Error messages follow same tone (helpful, not scary)?

#### Expected Outcome

- ✅ Error messages are user-friendly everywhere
- ✅ Network issues handled gracefully
- ✅ Consistent error styling across system

---

### Test 5.3: Performance Perception

**Time:** 15 minutes  
**Device:** Desktop and mobile

#### Steps

1. **Page load times**
   - Use stopwatch or dev tools Network tab
   - Measure time from click to visible content:
     - [ ] Login → Dashboard: ≤ 2 seconds?
     - [ ] Dashboard → History: ≤ 1 second?
     - [ ] Create invite form: ≤ 1 second?
     - [ ] Search results: ≤ 1 second?

2. **Loading indicators**
   - [ ] **FEEDBACK CHECK:**
     - Every action shows feedback (spinner, skeleton, progress)?
     - Buttons show loading state (spinner on button)?
     - Long operations show progress ("Loading visitors 2/10")?
     - Skeleton screens used (not blank white)?

3. **Perceived performance**
   - [ ] **FEEL:**
     - Does system feel fast even if slightly slow?
     - Optimistic UI updates (change UI before server confirms)?
     - Minimal "frozen" moments?

#### Expected Outcome

- ✅ Most actions complete in ≤ 2 seconds
- ✅ Loading states always show
- ✅ System feels responsive

---

### Test 5.4: Security & Privacy Indicators

**Time:** 15 minutes  
**Device:** Desktop

#### Steps

1. **HTTPS check**
   - [ ] **SSL:**
     - Padlock icon in browser address bar?
     - URL starts with `https://` (in production)?
     - No mixed content warnings?

2. **Session management**
   - Login, then close browser tab (don't logout)
   - Reopen and navigate to dashboard URL
   - [ ] **SESSION CHECK:**
     - Still logged in (session persists)?
     - Or redirected to login (session timeout)?
     - Timeout reasonable (15-30 minutes)?

3. **Logout behavior**
   - Login, then logout
   - Use browser back button
   - [ ] **LOGOUT SECURITY:**
     - Can't access logged-in pages after logout?
     - Redirected to login if trying?
     - No cached sensitive data visible?

4. **Data privacy indicators**
   - [ ] **PRIVACY:**
     - Privacy policy link visible (footer)?
     - Terms of service link?
     - Data usage explained (consent forms)?
     - User can see their data (profile page)?
     - User can delete data (if Kenya DPA requires)?

#### Expected Outcome

- ✅ HTTPS enforced in production
- ✅ Sessions secure and properly managed
- ✅ Logout fully clears session
- ✅ Privacy and terms links accessible

---

## FINDINGS & REPORTING

### How to Document Issues

For every issue you find, record:

1. **Severity**
   - **Critical:** Blocker, system unusable (e.g., can't login)
   - **High:** Major feature broken (e.g., can't create invite)
   - **Medium:** Feature works but poorly (e.g., confusing UI)
   - **Low:** Minor polish issue (e.g., typo, slight misalignment)

2. **Details**
   - **Page/Screen:** Where did it happen?
   - **User Role:** Resident, Guard, Admin, Visitor?
   - **Device:** Desktop, mobile, tablet? Browser?
   - **Steps to Reproduce:** How to see the issue?
   - **Expected:** What should happen?
   - **Actual:** What actually happened?
   - **Screenshot:** If visual issue

3. **Suggested Fix** (optional)
   - How you think it should be fixed

---

### Issue Tracking Template

Use this table format:

| ID | Severity | Page | Role | Issue | Expected | Actual | Device |
|----|----------|------|------|-------|----------|--------|--------|
| 1 | High | Create Invite | Resident | Date picker doesn't open | Calendar widget | Nothing happens | Mobile |
| 2 | Low | Dashboard | Guard | Typo "Scann QR" | "Scan QR" | "Scann QR" | All |
| 3 | Medium | History | Resident | Status colors inconsistent | Blue=Pending | Some blue, some gray | Desktop |

---

## POST-TESTING ACTIONS

### After Completing All Tests

1. **Compile findings**
   - Create summary document with all issues
   - Group by severity and area
   - Estimate fix time for each

2. **Prioritize fixes**
   - **Must fix before launch:**
     - All Critical and High severity
     - Medium severity if affects core flows
   - **Can fix after launch:**
     - Low severity (polish issues)
     - Nice-to-have improvements

3. **Re-test after fixes**
   - For each fixed issue:
     - Re-test the specific flow
     - Verify fix works on all devices
     - Ensure no new issues introduced

4. **Sign-off**
   - When satisfied, document:
     - "UI/UX testing complete on [date]"
     - "X critical issues fixed"
     - "System ready for production deployment"
     - Sign-off by tester name

---

## PRODUCTION READINESS CHECKLIST

After all manual testing complete, verify:

### Technical
- [ ] All critical and high issues fixed
- [ ] Re-tested after fixes
- [ ] Works on all target devices (desktop, mobile, tablet)
- [ ] Works on all browsers (Chrome, Firefox, Safari, Edge)
- [ ] Performance acceptable (pages load < 2s)
- [ ] No console errors on any page

### Content & Copy
- [ ] No typos or grammar errors
- [ ] All copy is clear and friendly
- [ ] No placeholder text ("Lorem ipsum", "TODO")
- [ ] Error messages are helpful
- [ ] Success messages are celebratory

### Design & Polish
- [ ] Consistent colors and fonts
- [ ] Consistent button styles
- [ ] Proper spacing and alignment
- [ ] High-quality images (if any)
- [ ] Brand identity clear

### Functionality
- [ ] All user stories work end-to-end:
  - Resident can create invites ✓
  - Guard can check in visitors ✓
  - Admin can view reports ✓
  - Visitors can view invites ✓
  - Kiosk works for walk-ins ✓

### Security & Privacy
- [ ] HTTPS enforced (production)
- [ ] Sessions secure
- [ ] Logout works
- [ ] Privacy policy accessible
- [ ] No sensitive data exposed

---

## ESTIMATED TIME BREAKDOWN

| Phase | Time | Tester Profile |
|-------|------|----------------|
| **Phase 1: Resident** | 90 min | Any team member |
| **Phase 2: Guard** | 90 min | Ideally actual guard or field ops |
| **Phase 3: Admin** | 60 min | Admin or tech lead |
| **Phase 4: Visitor** | 45 min | Any team member |
| **Phase 5: Cross-Cutting** | 60 min | QA or tech lead |
| **Reporting & Sign-off** | 30 min | QA or project manager |
| **TOTAL** | **6-7 hours** | Can be split across days |

---

## TIPS FOR SUCCESSFUL TESTING

1. **Test like a first-time user**
   - Pretend you've never seen the system
   - Don't rely on your knowledge of how it's "supposed" to work

2. **Test in realistic conditions**
   - Guards: Test in bright sunlight if possible
   - Residents: Test on your actual phone/laptop
   - Visitors: Test on various devices

3. **Document as you go**
   - Don't wait until end to write up issues
   - Screenshot immediately when you see a problem

4. **Be thorough but efficient**
   - Follow the test cases
   - But don't get stuck on minor issues
   - Move on and come back later

5. **Get fresh eyes**
   - Ideally, someone not on the dev team
   - Real users are best (beta testers)

6. **Test collaboratively**
   - Two people can pair: one navigates, one records
   - Faster and catches more issues

---

## CONCLUSION

This roadmap provides a systematic approach to verify the Secure Gate system is ready for production launch. The focus is on **user experience** - ensuring every user type can accomplish their goals easily, efficiently, and without frustration.

**Remember:** Backend functionality has been validated via API testing. This manual testing is about **polish, clarity, and user satisfaction.**

**Success Criteria:**
- ✅ All users can complete their primary tasks
- ✅ UI is professional and trustworthy
- ✅ Mobile experience is smooth and fast
- ✅ Errors are handled gracefully
- ✅ System feels polished and production-ready

**Next Steps:**
1. Schedule testing sessions (6-8 hours total)
2. Execute tests systematically
3. Document all findings
4. Fix critical and high issues
5. Re-test
6. Sign off for production

---

**Document Version:** 1.0  
**Last Updated:** November 26, 2025  
**Prepared By:** Cascade AI  
**For:** Secure Gate Access Control System Production Launch

---

**End of Manual UI/UX Testing Roadmap**
