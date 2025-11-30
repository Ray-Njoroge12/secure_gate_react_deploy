# Secure Gate – Functional Test Plan (Pre‑Deployment)

*Scope: End‑to‑end functional validation from the perspective of Residents, Guards, Visitors, and Admins. Manual first, with guidance for E2E automation (Playwright/Cypress/Selenium‐style tools).* 

---

## 1. Test Execution Notes

- Target: **Staging environment** (identical to production config where possible).
- Roles covered: **Resident, Guard, Visitor (public), Admin**.
- Each test case uses this structure:
  - **ID** – unique test identifier.
  - **Goal** – what we’re verifying.
  - **Preconditions** – data/accounts required.
  - **Steps** – step‑by‑step actions in the browser.
  - **Expected Result** – what must be true at the end.
  - **Automation Hint** – how it would map to E2E tooling.

Mark each test as:
- ✅ Pass
- ❌ Fail (with notes)
- ⚠️ Blocked (and why)

---

## 2. Resident Test Suite (R)

### R-01 – Resident Login with MFA (Happy Path)

- **Goal**: Verify resident can log in using username/password + MFA and reach dashboard.
- **Preconditions**:
  - Resident account exists with MFA enabled.
  - You know the MFA TOTP secret or have a valid OTP generator.
- **Steps**:
  1. Open the frontend URL in a browser.
  2. Click `Login` and enter resident email/phone + password.
  3. Submit and wait for MFA prompt.
  4. Enter valid MFA code and submit.
- **Expected Result**:
  - User is redirected to **ResidentDashboard**.
  - Resident’s name and role are shown correctly.
  - No console errors in developer tools.
- **Automation Hint**:
  - Use Playwright/Cypress to fill login fields, then programmatically compute TOTP (if test secret is known) or stub MFA in test environment.

### R-02 – AddVisitor Single Invite (Happy Path)

- **Goal**: Ensure the new sectioned AddVisitor form still creates a valid invite end‑to‑end.
- **Preconditions**:
  - Logged in as resident (R-01 may be reused as setup).
- **Steps**:
  1. From ResidentDashboard, click `Invite Visitor` primary CTA.
  2. In **Section 1 – Visitor Details**, fill: name, phone, email.
  3. In **Section 2 – Visit Details**, choose date/time and purpose.
  4. In **Section 3 – Options & Consent**, keep defaults or enable QR/link options.
  5. Submit the form.
  6. Observe success card: note invite link and/or QR code.
  7. Copy the invite link to use later in Visitor tests.
- **Expected Result**:
  - No validation errors for valid data.
  - Success card shows visitor name and visit date/time.
  - Invite appears in Resident VisitorHistory with correct status (e.g. PENDING/CONFIRMED).
- **Automation Hint**:
  - In Playwright/Cypress, fill each section, assert presence of success card, and store invite URL/ID in test context for subsequent tests.

### R-03 – AddVisitor Validation (Missing Required Fields)

- **Goal**: Check client/server validation for missing mandatory fields.
- **Preconditions**: Logged in as resident.
- **Steps**:
  1. Open AddVisitor form.
  2. Leave `name` empty, fill others, and submit.
  3. Repeat with `phone` empty.
  4. Try setting visit date in the past.
- **Expected Result**:
  - Inline errors appear near invalid fields.
  - Form does **not** submit; no invite is created.
  - Errors are clear and task‑oriented (e.g., “Enter visitor name”).
- **Automation Hint**:
  - E2E: trigger submit, assert error message elements exist and that no new row appears in history table.

### R-04 – BulkInvite Wizard – Valid CSV

- **Goal**: Validate 3‑step BulkInvite flow with a correct CSV.
- **Preconditions**:
  - Logged in as resident.
  - Test CSV file with 5–10 valid rows (name,email,phone,date,...).
- **Steps**:
  1. Navigate to `Bulk Invite`.
  2. Step 1: Upload CSV file.
  3. Verify system parses file and shows “Found N visitors”.
  4. Click `Review Visitors` to go to Step 2.
  5. Confirm all rows are selected by default.
  6. Click `Send Invitations`.
  7. Observe Step 3 progress bar and final success state.
  8. Check Resident VisitorHistory for the new visitors.
- **Expected Result**:
  - All valid rows result in invitations.
  - Progress bar reaches 100% and success message appears.
  - All created visitors are visible in history with correct dates.
- **Automation Hint**:
  - E2E: upload fixture CSV, assert step indicator changes, assert number of visitors in history matches CSV rows.

### R-05 – BulkInvite Wizard – Mixed Valid/Invalid Rows

- **Goal**: Ensure invalid rows are flagged and don’t break the wizard.
- **Preconditions**:
  - CSV with some rows missing name/phone.
- **Steps**:
  1. Upload mixed CSV.
  2. Inspect Step 2 list: invalid rows should be highlighted with warning.
  3. Ensure those invalid rows are not selectable or are auto‑deselected.
  4. Send invitations for valid rows only.
- **Expected Result**:
  - Errors are clearly shown for invalid rows.
  - Valid rows still produce invites.
- **Automation Hint**:
  - E2E: assert presence of “Missing required information” markers and count of selected rows.

### R-06 – VisitorHistory Filters & Mobile Cards

- **Goal**: Verify history listing, filtering, and new card view on mobile.
- **Preconditions**:
  - Resident with multiple invites in various statuses.
- **Steps**:
  1. Open VisitorHistory on desktop width.
  2. Verify table shows columns: Name, Phone, Date, Time, Purpose, Status.
  3. Use status filter (e.g. `Pending`); ensure only pending rows remain.
  4. Use search for a known phone; ensure correct subset is shown.
  5. Switch to mobile width (or device mode in DevTools) and refresh.
  6. Confirm list switches to card layout with status chip, date, actions.
- **Expected Result**:
  - Filters and search work consistently across layouts.
  - Card view shows same data as table for each visitor.
- **Automation Hint**:
  - Use viewport changes in E2E framework to assert different layouts are rendered.


---

## 3. Guard Test Suite (G)

### G-01 – Guard Login & Dashboard

- **Goal**: Confirm guard can log in and see GuardDashboard with correct role.
- **Preconditions**:
  - Guard user exists with correct role.
- **Steps**:
  1. Login as guard.
  2. Verify you land on GuardDashboard.
  3. Confirm active visitors list (or empty state) is shown.
- **Expected Result**:
  - Role-specific UI (no resident/admin menus).
  - Active visitors section or standardized “No active visitors” empty state.
- **Automation Hint**:
  - E2E: login with guard creds, assert presence of GuardDashboard heading and absence of resident‑only elements.

### G-02 – ScanQR – Valid Code

- **Goal**: Validate QR scan path for a valid, unused invite.
- **Preconditions**:
  - Invite created (R-02 / R-04).
  - QR code accessible (from Resident or Visitor view).
- **Steps**:
  1. On GuardDashboard, open `Scan QR`.
  2. Simulate QR scan by:
     - Either using a device camera on real QR, or
     - Using testing hook/mock if available.
  3. Observe result card: visitor name, status, guidance.
  4. If there’s a `Check In` or similar action, complete it.
  5. Go back to GuardDashboard; confirm visitor appears in active list.
- **Expected Result**:
  - Result card clearly indicates success (green state, icon).
  - Visitor moves to an “on premise / checked in” state.
- **Automation Hint**:
  - E2E: if API endpoint exists, bypass camera by directly calling scan endpoint or feeding QR value into hidden input used in dev mode.

### G-03 – ScanQR – Expired / Invalid Code

- **Goal**: Ensure robust handling of bad QR codes.
- **Preconditions**:
  - One expired invite; one random/invalid code.
- **Steps**:
  1. Scan expired invite QR.
  2. Scan a random/nonexistent QR value.
- **Expected Result**:
  - UI shows red error card states with clear messages (“Invite expired”, “Not found”).
  - No state change in GuardDashboard or history.
- **Automation Hint**:
  - E2E: call scan endpoint with expired token; assert error card appears.

### G-04 – ManualCheck – Search & Actions

- **Goal**: Verify optimized card layout and check‑in/out behavior.
- **Preconditions**:
  - At least one visitor with status VERIFIED and one with CHECKED_IN.
- **Steps**:
  1. Navigate to `Manual Check`.
  2. Search by invite code or phone.
  3. For VERIFIED visitor, click `Check In`; confirm success and new status.
  4. For CHECKED_IN visitor, click `Check Out`; confirm status update.
  5. Open incident reporting for a visitor and submit a basic incident.
- **Expected Result**:
  - Card shows name, phone, host, purpose, invite code.
  - Status chip uses standardized colors.
  - Actions update status and reflect in active visitors and resident history.
- **Automation Hint**:
  - E2E: after actions, navigate to Resident history and assert status change.


---

## 4. Visitor / Public Test Suite (V)

### V-01 – VisitorInvitePage – Valid Invite

- **Goal**: Confirm visitors can view invite details and QR from shared link.
- **Preconditions**:
  - Valid invite link from R-02 or R-04.
- **Steps**:
  1. Open invite URL in a fresh browser session/incognito.
  2. Verify hero header, visitor name, date/time, QR, estate details.
  3. Resize to mobile to ensure layout is still usable.
- **Expected Result**:
  - Page loads without login.
  - Details match resident’s data; QR visible.
- **Automation Hint**:
  - E2E: open stored invite URL, assert correct data fields and hero are present.

### V-02 – VisitorInvitePage – Invalid/Expired Invite

- **Goal**: Validate error/expired states.
- **Preconditions**:
  - Invalid URL token and an expired invite token.
- **Steps**:
  1. Open invalid invite URL.
  2. Open expired invite URL.
- **Expected Result**:
  - Error card shows “Invalid/Expired invitation” with contextual guidance.
  - “Go to homepage” or similar CTA works.
- **Automation Hint**:
  - E2E: expect specific error messages and absence of QR.

### V-03 – SelfCheckInKiosk – Walk‑In Flow (EN)

- **Goal**: Check full EN language walk‑in path.
- **Preconditions**:
  - Kiosk route accessible in staging.
- **Steps**:
  1. Load kiosk page; ensure language is EN.
  2. Select `Walk-in visitor`.
  3. Fill details form (name, phone, purpose, etc.).
  4. Proceed to photo step; take photo (or use fallback/mock if on desktop).
  5. Search for resident and select host.
  6. Submit; observe success screen with QR and code.
- **Expected Result**:
  - Step indicator shows correct step; completed steps marked.
  - Success state shows `Visit Code` and, if pending approval, status badge.
- **Automation Hint**:
  - E2E: may mock camera API in headless; focus on step transitions and final API call.

### V-04 – SelfCheckInKiosk – Language & Inactivity

- **Goal**: Validate SW language and inactivity reset.
- **Preconditions**: Kiosk reachable.
- **Steps**:
  1. Switch language to SW.
  2. Confirm labels change (welcome, buttons).
  3. Start walk‑in flow but stop interacting.
  4. Wait >60 seconds.
- **Expected Result**:
  - UI returns to welcome screen automatically.
  - Language remains SW or resets according to spec.
- **Automation Hint**:
  - E2E: timeouts may be shortened in test env; use `waitForTimeout` and assert step === welcome.


---

## 5. Admin Test Suite (A)

### A-01 – Admin Login + MFA

- **Goal**: Validate admin authentication flows.
- **Preconditions**: Admin user with MFA enabled.
- **Steps**:
  1. Open login page.
  2. Enter admin credentials.
  3. Enter correct MFA.
- **Expected Result**:
  - Admin dashboard appears with correct role indicators.
- **Automation Hint**:
  - Same TOTP pattern as resident MFA; stub or use test secret.

### A-02 – User & Role Management

- **Goal**: Ensure admins can manage residents and guards.
- **Preconditions**: Admin logged in.
- **Steps**:
  1. Navigate to User Management.
  2. Create a new resident user and a guard user.
  3. Log out; attempt login with these new accounts.
  4. Disable one user; confirm login is blocked.
- **Expected Result**:
  - Newly created users work; disabled users cannot log in.
- **Automation Hint**:
  - Use API seeding in automation where possible, then UI to confirm behaviors.


---

## 6. Cross‑Role End‑to‑End Scenarios

### X-01 – Resident Invite → Guard Scan → Visitor History

- **Goal**: Validate the full chain between roles.
- **Preconditions**:
  - Resident, Guard, and public access working.
- **Steps**:
  1. Resident creates single invite (R-02).
  2. Visitor opens invite page, presents QR at gate.
  3. Guard scans QR (G-02) and checks visitor in.
  4. Resident opens VisitorHistory and confirms status is CHECKED_IN.
- **Expected Result**:
  - Data consistent across all roles and views.
- **Automation Hint**:
  - E2E scenario chaining: share data between resident, visitor, and guard test contexts.

### X-02 – Kiosk Walk‑In → Guard Approval → Resident History

- **Goal**: Confirm walk‑in registration flows across all roles.
- **Steps**:
  1. Visitor uses kiosk (V-03) to register.
  2. Guard views pending walk‑ins; approves/checks in visitor.
  3. Resident checks VisitorHistory to verify record.
- **Expected Result**:
  - Walk‑in appears as pending, then active, then historical entry.

---

## 7. Notes for Automation Frameworks

For **Playwright/Cypress/Selenium/WebdriverIO**:
- Use **data-test-id** attributes where possible to make selectors robust.
- Centralize login flows in helper functions (residentLogin, guardLogin, adminLogin).
- Seed data via backend API or SQL fixtures for stable tests.
- Split tests by role and by cross-role scenarios.

This plan can now be executed manually and later translated into automated E2E scripts.
