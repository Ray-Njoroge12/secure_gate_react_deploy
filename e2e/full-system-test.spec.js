/**
 * Full System End-to-End Test
 * Tests complete user journeys for Admin, Guard, and Resident
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://127.0.0.1:3001/api';
const MAILHOG_URL = 'http://localhost:8025';

// Test data
const testUsers = {
  admin: {
    email: 'e2e-admin@example.com',
    password: 'Admin@123',
    name: 'E2E Admin User',
    role: 'admin'
  },
  guard: {
    email: 'e2e-guard@example.com',
    password: 'Guard@123',
    name: 'E2E Guard User',
    role: 'guard'
  },
  resident: {
    email: 'e2e-resident@example.com',
    password: 'Resident@123',
    name: 'E2E Resident User',
    role: 'resident'
  }
};

const testGuests = [
  {
    name: 'Guest One',
    email: 'guest1@example.com',
    phone: '123-456-7890',
    purpose: 'Family Visit'
  },
  {
    name: 'Guest Two',
    email: 'guest2@example.com',
    phone: '123-456-7891',
    purpose: 'Business Meeting'
  },
  {
    name: 'Guest Three',
    email: 'guest3@example.com',
    phone: '123-456-7892',
    purpose: 'Delivery'
  }
];

// Helper function to get verification link from MailHog
async function getVerificationLink(email, page) {
  const response = await page.request.get(`${MAILHOG_URL}/api/v2/search?kind=to&query=${email}`);
  const data = await response.json();

  if (data.items && data.items.length > 0) {
    const latestEmail = data.items[0];
    const emailBody = latestEmail.Content.Body;
    const linkMatch = emailBody.match(/http:\/\/[^\s]+\/verify\/[^\s<]+/);
    return linkMatch ? linkMatch[0] : null;
  }
  return null;
}

// Helper function to verify user via API (bypass email for faster testing)
async function verifyUserDirectly(email, page) {
  // Direct database update would be faster, but using API for cleaner test
  const link = await getVerificationLink(email, page);
  if (link) {
    await page.goto(link);
  }
}

test.describe('Full System E2E Test Suite', () => {

  test.describe.configure({ mode: 'serial' });

  let adminToken, guardToken, residentToken;
  let guestInviteIds = [];

  test.beforeAll(async ({ browser }) => {
    console.log('Setting up test environment...');
  });

  test('1. System Health Check', async ({ page }) => {
    // Check backend
    const healthResponse = await page.request.get(`${API_URL.replace('/api', '')}/health`);
    expect(healthResponse.ok()).toBeTruthy();

    // Check frontend
    await page.goto(BASE_URL);
    await expect(page).toHaveTitle(/Secure Gate|Access Control/i);
  });

  test('2. User Registration - Admin', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    await page.fill('input[name="email"], input[type="email"]', testUsers.admin.email);
    await page.fill('input[name="password"], input[type="password"]', testUsers.admin.password);
    await page.fill('input[name="name"]', testUsers.admin.name);

    // Select role if dropdown exists
    const roleSelector = page.locator('select[name="role"], select#role');
    if (await roleSelector.count() > 0) {
      await roleSelector.selectOption(testUsers.admin.role);
    }

    await page.click('button[type="submit"]');

    // Wait for success message
    await expect(page.locator('text=/registered|success/i')).toBeVisible({ timeout: 10000 });
  });

  test('3. User Registration - Guard', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    await page.fill('input[name="email"], input[type="email"]', testUsers.guard.email);
    await page.fill('input[name="password"], input[type="password"]', testUsers.guard.password);
    await page.fill('input[name="name"]', testUsers.guard.name);

    const roleSelector = page.locator('select[name="role"], select#role');
    if (await roleSelector.count() > 0) {
      await roleSelector.selectOption(testUsers.guard.role);
    }

    await page.click('button[type="submit"]');
    await expect(page.locator('text=/registered|success/i')).toBeVisible({ timeout: 10000 });
  });

  test('4. User Registration - Resident', async ({ page }) => {
    await page.goto(`${BASE_URL}/register`);

    await page.fill('input[name="email"], input[type="email"]', testUsers.resident.email);
    await page.fill('input[name="password"], input[type="password"]', testUsers.resident.password);
    await page.fill('input[name="name"]', testUsers.resident.name);

    const roleSelector = page.locator('select[name="role"], select#role');
    if (await roleSelector.count() > 0) {
      await roleSelector.selectOption(testUsers.resident.role);
    }

    await page.click('button[type="submit"]');
    await expect(page.locator('text=/registered|success/i')).toBeVisible({ timeout: 10000 });
  });

  test('5. Verify Email Links in MailHog', async ({ page }) => {
    // Check MailHog for verification emails
    await page.goto(MAILHOG_URL);

    // Verify emails were sent
    const emailCount = await page.locator('.msglist-message').count();
    expect(emailCount).toBeGreaterThanOrEqual(3);
  });

  test('6. Verify All User Accounts', async ({ page }) => {
    // Verify each user account
    for (const userType of Object.keys(testUsers)) {
      const link = await getVerificationLink(testUsers[userType].email, page);
      if (link) {
        await page.goto(link);
        await expect(page.locator('text=/verified|success/i')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('7. Login - Resident', async ({ page, context }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.fill('input[name="email"], input[type="email"]', testUsers.resident.email);
    await page.fill('input[name="password"], input[type="password"]', testUsers.resident.password);
    await page.click('button[type="submit"]');

    // Wait for dashboard or home page
    await page.waitForURL(/dashboard|home/i, { timeout: 10000 });

    // Store token from localStorage
    residentToken = await page.evaluate(() => localStorage.getItem('token'));
    expect(residentToken).toBeTruthy();
  });

  test('8. Resident - Create Single Guest Invite', async ({ page }) => {
    // Navigate to guest invite page
    await page.goto(`${BASE_URL}/dashboard`);
    await page.click('text=/invite|guest/i');

    // Fill guest form
    await page.fill('input[name="name"]', testGuests[0].name);
    await page.fill('input[name="email"]', testGuests[0].email);
    await page.fill('input[name="phone"]', testGuests[0].phone);
    await page.fill('input[name="purpose"], textarea[name="purpose"]', testGuests[0].purpose);

    // Set visit date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await page.fill('input[type="date"]', dateString);

    await page.click('button[type="submit"]');

    // Verify success
    await expect(page.locator('text=/invitation sent|success/i')).toBeVisible({ timeout: 10000 });
  });

  test('9. Resident - Create Bulk Guest Invites', async ({ page }) => {
    // Navigate to bulk invite
    await page.click('text=/bulk|multiple/i');

    // Add multiple guests
    for (let i = 1; i < testGuests.length; i++) {
      await page.click('text=/add guest|add another/i');

      await page.fill(`input[name="guests[${i}].name"]`, testGuests[i].name);
      await page.fill(`input[name="guests[${i}].email"]`, testGuests[i].email);
      await page.fill(`input[name="guests[${i}].phone"]`, testGuests[i].phone);
    }

    await page.click('button[type="submit"]');
    await expect(page.locator('text=/invitations sent|success/i')).toBeVisible({ timeout: 10000 });
  });

  test('10. Logout Resident', async ({ page }) => {
    await page.click('text=/logout|sign out/i');
    await expect(page).toHaveURL(/login|home/i);
  });

  test('11. Login - Guard', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.fill('input[name="email"], input[type="email"]', testUsers.guard.email);
    await page.fill('input[name="password"], input[type="password"]', testUsers.guard.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/dashboard|home/i, { timeout: 10000 });

    guardToken = await page.evaluate(() => localStorage.getItem('token'));
    expect(guardToken).toBeTruthy();
  });

  test('12. Guard - View Visitor List', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);
    await page.click('text=/visitor|check-in/i');

    // Verify guests are visible
    await expect(page.locator('text=' + testGuests[0].name)).toBeVisible({ timeout: 10000 });
  });

  test('13. Guard - Check-in Visitor', async ({ page }) => {
    // Find first guest and check in
    const guestRow = page.locator('text=' + testGuests[0].name).locator('..');
    await guestRow.locator('button:has-text("Check In")').click();

    // Confirm check-in
    await expect(page.locator('text=/checked in|success/i')).toBeVisible({ timeout: 10000 });
  });

  test('14. Guard - Check-out Visitor', async ({ page }) => {
    // Find checked-in guest
    const guestRow = page.locator('text=' + testGuests[0].name).locator('..');
    await guestRow.locator('button:has-text("Check Out")').click();

    // Confirm check-out
    await expect(page.locator('text=/checked out|success/i')).toBeVisible({ timeout: 10000 });
  });

  test('15. Guard - View Access Logs', async ({ page }) => {
    await page.click('text=/logs|history/i');

    // Verify log entries
    await expect(page.locator('text=' + testGuests[0].name)).toBeVisible();
    await expect(page.locator('text=/check-in/i')).toBeVisible();
    await expect(page.locator('text=/check-out/i')).toBeVisible();
  });

  test('16. Logout Guard', async ({ page }) => {
    await page.click('text=/logout|sign out/i');
    await expect(page).toHaveURL(/login|home/i);
  });

  test('17. Login - Admin', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.fill('input[name="email"], input[type="email"]', testUsers.admin.email);
    await page.fill('input[name="password"], input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');

    await page.waitForURL(/dashboard|admin/i, { timeout: 10000 });

    adminToken = await page.evaluate(() => localStorage.getItem('token'));
    expect(adminToken).toBeTruthy();
  });

  test('18. Admin - View All Visitors', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/visitors`);

    // Verify admin can see all visitors
    for (const guest of testGuests) {
      await expect(page.locator('text=' + guest.name)).toBeVisible();
    }
  });

  test('19. Admin - View Audit Logs', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/audit-logs`);

    // Verify audit trail
    await expect(page.locator('text=/user.*registered/i')).toBeVisible();
    await expect(page.locator('text=/guest.*invited/i')).toBeVisible();
    await expect(page.locator('text=/check-in/i')).toBeVisible();
  });

  test('20. Password Reset Flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.click('text=/forgot password/i');

    await page.fill('input[name="email"], input[type="email"]', testUsers.resident.email);
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/reset link sent/i')).toBeVisible({ timeout: 10000 });

    // Verify email in MailHog
    await page.goto(MAILHOG_URL);
    await expect(page.locator('text=/password reset/i')).toBeVisible();
  });

  test.afterAll(async () => {
    console.log('Test suite completed!');
    console.log('Tokens captured:', {
      admin: !!adminToken,
      guard: !!guardToken,
      resident: !!residentToken
    });
  });
});
