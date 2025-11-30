# Secure Gate – E2E Automation Specification

*Goal: Provide a framework‑agnostic blueprint for automating the core functional tests defined in `FUNCTIONAL_TEST_PLAN.md`, with examples for Playwright, Cypress, Selenium/WebdriverIO.*

---

## 1. Guiding Principles

- **Source of truth**: All scenarios map directly to IDs in `FUNCTIONAL_TEST_PLAN.md` (R‑xx, G‑xx, V‑xx, A‑xx, X‑xx).
- **Stable selectors**: Prefer `data-test-id` attributes over brittle CSS/XPath.
- **Role helpers**: Implement reusable login and navigation helpers per role.
- **Deterministic data**: Use seed data via API/fixtures instead of relying on ad‑hoc manual state.
- **Fast core suite**: Start with a small, reliable “smoke + core flows” suite that runs on every commit.

---

## 2. Test Coverage Matrix

| ID    | Description                                         | Priority | Automate in First Wave? |
|-------|-----------------------------------------------------|----------|--------------------------|
| R-01  | Resident Login with MFA                            | High     | Yes                      |
| R-02  | AddVisitor Single Invite (Happy Path)              | High     | Yes                      |
| R-04  | BulkInvite Wizard – Valid CSV                      | Medium   | Yes                      |
| R-06  | VisitorHistory Filters & Mobile Cards              | Medium   | Later                    |
| G-01  | Guard Login & Dashboard                            | High     | Yes                      |
| G-02  | ScanQR – Valid Code                                | High     | Yes                      |
| G-03  | ScanQR – Expired / Invalid Code                    | Medium   | Later                    |
| G-04  | ManualCheck – Search & Actions                     | High     | Yes                      |
| V-01  | VisitorInvitePage – Valid Invite                   | High     | Yes                      |
| V-03  | SelfCheckInKiosk – Walk‑In Flow (EN)               | Medium   | Later                    |
| A-01  | Admin Login + MFA                                  | Medium   | Later                    |
| A-02  | User & Role Management                             | Medium   | Later                    |
| X-01  | Resident Invite → Guard Scan → Visitor History     | High     | Yes                      |
| X-02  | Kiosk Walk‑In → Guard Approval → Resident History  | Medium   | Later                    |

---

## 3. Common Test Utilities (All Frameworks)

Regardless of framework, implement the following helpers:

- `loginResident(page, { email, password, mfaSecret })`
- `loginGuard(page, { email, password, mfaSecret })`
- `loginAdmin(page, { email, password, mfaSecret })`
- `createInviteViaUI(page, inviteData) // wraps R‑02`
- `createInviteViaAPI(inviteData) // optional for seeding`
- `getLatestInviteTokenForResident(residentId)`
- `scanQrViaAPI(token)` (if there is a direct HTTP endpoint used by ScanQR)

**TOTP/MFA**: For tests, use a known TOTP secret or a stubbed MFA path in staging. Many TOTP libs exist (`otplib`, `speakeasy` etc.) to compute codes in tests.

---

## 4. Playwright Structure

**Recommended layout** (TypeScript or JavaScript):

```text
/playwright
  /tests
    resident.spec.ts
    guard.spec.ts
    visitor.spec.ts
    admin.spec.ts
    cross-role.spec.ts
  /fixtures
    test-users.json
    invites.csv
  /utils
    auth.ts
    api.ts
    selectors.ts
  playwright.config.ts
```

### 4.1 Example: Resident Login + AddVisitor (R-01, R-02)

**auth.ts** (helper sketch):

```ts
import { Page } from '@playwright/test';
import * as otplib from 'otplib';

export async function loginResident(page: Page, {
  email,
  password,
  mfaSecret,
}: { email: string; password: string; mfaSecret?: string }) {
  await page.goto(process.env.BASE_URL!);
  await page.click('[data-test-id="login-button"]');
  await page.fill('[data-test-id="login-email"]', email);
  await page.fill('[data-test-id="login-password"]', password);
  await page.click('[data-test-id="login-submit"]');

  if (mfaSecret) {
    const token = otplib.authenticator.generate(mfaSecret);
    await page.fill('[data-test-id="mfa-code"]', token);
    await page.click('[data-test-id="mfa-submit"]');
  }

  await page.waitForURL('**/resident/dashboard');
}
```

**resident.spec.ts** (sketch):

```ts
import { test, expect } from '@playwright/test';
import { loginResident } from '../utils/auth';

const residentCreds = {
  email: 'resident@test.local',
  password: 'Password123!',
  mfaSecret: process.env.RESIDENT_MFA_SECRET,
};

test('R-02 AddVisitor single invite (happy path)', async ({ page }) => {
  await loginResident(page, residentCreds);

  await page.click('[data-test-id="cta-invite-visitor"]');

  // Section 1
  await page.fill('[data-test-id="visitor-name"]', 'Playwright Guest');
  await page.fill('[data-test-id="visitor-phone"]', '0712345678');
  await page.fill('[data-test-id="visitor-email"]', 'guest@example.com');

  // Section 2
  await page.fill('[data-test-id="visit-date"]', '2025-12-01');
  await page.fill('[data-test-id="visit-time"]', '10:00');
  await page.fill('[data-test-id="visit-purpose"]', 'Meeting');

  // Section 3
  // (Use defaults or toggle options as required)

  await page.click('[data-test-id="submit-invite"]');

  await expect(page.locator('[data-test-id="invite-success-card"]')).toBeVisible();
  const link = await page.locator('[data-test-id="invite-link"]').textContent();

  // store link for cross-role tests via test.info().attachments or a helper
});
```

### 4.2 Example: Cross-Role Scenario (X-01)

In `cross-role.spec.ts`:

```ts
test('X-01 Resident invite → Guard scan → Resident history', async ({ page, context }) => {
  // 1) Resident creates invite
  await loginResident(page, residentCreds);
  // ...use helper to create invite, capture token/link
  const inviteUrl = await createInviteViaUI(page, {/* data */});

  // 2) Visitor opens invite (new browser context)
  const visitorContext = await context.browser().newContext();
  const visitorPage = await visitorContext.newPage();
  await visitorPage.goto(inviteUrl);
  await expect(visitorPage.locator('[data-test-id="invite-qr"]')).toBeVisible();

  // 3) Guard scans QR (use API or emulate UI)
  await loginGuard(page, guardCreds);
  await scanQrViaAPI(/* token from inviteUrl */);

  // 4) Resident sees CHECKED_IN in history
  await loginResident(page, residentCreds);
  await page.goto('.../resident/visitor-history');
  await expect(page.locator('[data-test-id="status-chip-CHECKED_IN"]')).toContainText('CHECKED_IN');
});
```

---

## 5. Cypress Structure

**Recommended layout:**

```text
/cypress
  /e2e
    resident.cy.ts
    guard.cy.ts
    visitor.cy.ts
    admin.cy.ts
    cross-role.cy.ts
  /fixtures
    invites.csv
    users.json
  /support
    commands.ts
    auth.ts
  cypress.config.ts
```

### 5.1 Custom Commands

In `support/commands.ts`:

```ts
Cypress.Commands.add('loginResident', (email, password) => {
  cy.visit('/');
  cy.get('[data-test-id="login-button"]').click();
  cy.get('[data-test-id="login-email"]').type(email);
  cy.get('[data-test-id="login-password"]').type(password);
  cy.get('[data-test-id="login-submit"]').click();
  // For MFA, either stub API or inject code if using a test secret
});
```

### 5.2 Example: G-02 ScanQR – Valid Code (UI path)

```ts
// guard.cy.ts

it('G-02 ScanQR – valid code', () => {
  cy.loginGuard('guard@test.local', 'Password123!');

  cy.get('[data-test-id="quick-action-scan-qr"]').click();

  // For Cypress, you might expose a hidden input in test mode to feed QR token
  cy.get('[data-test-id="qr-input-test-only"]').type('INVITE_TOKEN_123{enter}');

  cy.get('[data-test-id="scan-result-card"]').should('be.visible');
  cy.get('[data-test-id="scan-result-status"]').should('contain.text', 'APPROVED');
});
```

---

## 6. Selenium / WebdriverIO Structure (High Level)

For teams using Selenium/WebdriverIO:

- Follow the same logical grouping as Playwright/Cypress.
- Implement Page Object Model (POM):
  - `LoginPage`, `ResidentDashboardPage`, `GuardDashboardPage`, `VisitorInvitePage`, `KioskPage`.
- Use POM methods that mirror the steps in `FUNCTIONAL_TEST_PLAN`.

Example (WebdriverIO + TypeScript):

```ts
class LoginPage {
  get emailInput() { return $('[data-test-id="login-email"]'); }
  get passwordInput() { return $('[data-test-id="login-password"]'); }
  get submitButton() { return $('[data-test-id="login-submit"]'); }

  async loginResident(email: string, password: string) {
    await browser.url('/');
    await this.emailInput.setValue(email);
    await this.passwordInput.setValue(password);
    await this.submitButton.click();
  }
}
```

---

## 7. API-Level Tests (Complementary)

Even though focus is E2E, add fast API tests for:

- `/auth/login`, `/auth/mfa/verify`
- `/visitors/add`, `/visitors/bulk-invite`, `/visitors/history`
- `/guards/scan-qr`, `/visitors/walk-in`

Using Jest + Supertest or Postman/Newman, mirror the same scenario IDs:

- `API-R-AddVisitor-01` – POST `/visitors/add` with valid payload.
- `API-G-ScanQR-01` – POST `/guards/scan-qr` with valid token.

---

## 8. CI Integration

- Run **smoke E2E suite** (R‑01, R‑02, G‑01, G‑02, V‑01, X‑01) on every PR.
- Run **full E2E + API suite** nightly or before release.
- Fail builds on flaky selectors; tighten tests rather than ignoring flake.

---

## 9. Mapping Back to Functional Plan

For every automated test file, add comments referencing the corresponding IDs:

```ts
// Covers: R-01, R-02, X-01
```

This keeps docs and automation aligned and makes it easy to review coverage before deployment.
