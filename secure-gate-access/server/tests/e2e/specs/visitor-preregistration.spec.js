/**
 * E2E-001: Complete Visitor Pre-Registration Workflow
 * Tests the full journey from resident invitation to visitor check-in
 */

import { test, expect } from '@playwright/test';

test.describe('Visitor Pre-Registration Workflow', () => {
  const testResident = {
    email: 'resident@test.com',
    password: 'TestPass123!'
  };

  const testGuard = {
    email: 'guard@test.com',
    password: 'TestPass123!'
  };

  const testVisitor = {
    name: 'John Test Visitor',
    phone: '+254712345678',
    purpose: 'Business Meeting',
    dateOfVisit: new Date().toISOString().split('T')[0]
  };

  test.beforeEach(async ({ page }) => {
    // Clear any existing sessions
    await page.context().clearCookies();
  });

  test('E2E-001: Complete pre-registration happy path', async ({ page, context }) => {
    // Step 1: Login as resident
    await page.goto('/login');
    await page.fill('[name="email"]', testResident.email);
    await page.fill('[name="password"]', testResident.password);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await expect(page).toHaveURL(/dashboard/);

    // Step 2: Navigate to Register Visitor page
    await page.click('text=Register Visitor');
    await expect(page).toHaveURL(/visitor/);

    // Step 3: Fill visitor registration form
    await page.fill('[name="name"]', testVisitor.name);
    await page.fill('[name="phone"]', testVisitor.phone);
    await page.fill('[name="purpose"]', testVisitor.purpose);
    await page.fill('[name="dateOfVisit"]', testVisitor.dateOfVisit);

    // Step 4: Submit registration
    await page.click('button[type="submit"]');

    // Step 5: Verify QR code displayed
    await expect(page.locator('[data-testid="qr-code"]')).toBeVisible({ timeout: 10000 });
    
    // Get the invite code for guard check-in
    const inviteCode = await page.locator('[data-testid="invite-code"]').textContent();
    expect(inviteCode).toBeTruthy();

    // Step 6: Open new context as guard
    const guardPage = await context.newPage();
    await guardPage.goto('/login');
    await guardPage.fill('[name="email"]', testGuard.email);
    await guardPage.fill('[name="password"]', testGuard.password);
    await guardPage.click('button[type="submit"]');

    // Wait for guard dashboard
    await expect(guardPage).toHaveURL(/guard|dashboard/);

    // Step 7: Navigate to QR scan page
    await guardPage.click('text=Scan QR');

    // Step 8: Simulate QR scan (enter invite code manually)
    await guardPage.fill('[name="qrCode"]', inviteCode);
    await guardPage.click('button:has-text("Verify")');

    // Step 9: Verify visitor details displayed
    await expect(guardPage.locator(`text=${testVisitor.name}`)).toBeVisible();

    // Step 10: Click Check In
    await guardPage.click('button:has-text("Check In")');

    // Step 11: Verify check-in success
    await expect(guardPage.locator('text=checked in successfully')).toBeVisible();

    // Step 12: Switch back to resident and verify notification
    await page.reload();
    
    // Check for notification or updated status
    await expect(page.locator(`text=${testVisitor.name}`)).toBeVisible();
    
    // Cleanup
    await guardPage.close();
  });

  test('Should reject expired QR code', async ({ page }) => {
    // Login as guard
    await page.goto('/login');
    await page.fill('[name="email"]', testGuard.email);
    await page.fill('[name="password"]', testGuard.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/guard|dashboard/);

    // Navigate to QR scan
    await page.click('text=Scan QR');

    // Try to use an expired/invalid QR code
    await page.fill('[name="qrCode"]', 'EXPIRED_QR_CODE_123');
    await page.click('button:has-text("Verify")');

    // Should show error message
    await expect(page.locator('text=Invalid|expired|not found')).toBeVisible();
  });

  test('Should prevent duplicate check-in', async ({ page, context }) => {
    // This test requires a visitor that's already checked in
    // Login as guard
    await page.goto('/login');
    await page.fill('[name="email"]', testGuard.email);
    await page.fill('[name="password"]', testGuard.password);
    await page.click('button[type="submit"]');

    // Navigate to today's check-ins
    await page.click('text=Today');

    // Get a checked-in visitor's QR if available
    const checkedInVisitor = page.locator('[data-status="checked_in"]').first();
    
    if (await checkedInVisitor.isVisible()) {
      const qrCode = await checkedInVisitor.getAttribute('data-qr-code');
      
      if (qrCode) {
        // Try to check in again
        await page.click('text=Scan QR');
        await page.fill('[name="qrCode"]', qrCode);
        await page.click('button:has-text("Verify")');

        // Should show already checked in error
        await expect(page.locator('text=already checked in|already used')).toBeVisible();
      }
    }
  });
});

test.describe('Walk-In Visitor Approval', () => {
  const testResident = {
    email: 'resident@test.com',
    password: 'TestPass123!'
  };

  const testGuard = {
    email: 'guard@test.com',
    password: 'TestPass123!'
  };

  test('E2E-002: Walk-in approval workflow', async ({ page, context }) => {
    // Step 1: Login as guard
    await page.goto('/login');
    await page.fill('[name="email"]', testGuard.email);
    await page.fill('[name="password"]', testGuard.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/guard|dashboard/);

    // Step 2: Click Walk-In Visitor
    await page.click('text=Walk-In');

    // Step 3: Fill walk-in form
    await page.fill('[name="name"]', 'Walk-In Test Visitor');
    await page.fill('[name="phone"]', '+254700123456');
    await page.fill('[name="purpose"]', 'Unexpected visit');

    // Step 4: Search for resident
    await page.fill('[name="residentSearch"]', 'resident');
    await page.click('[data-testid="resident-option"]');

    // Step 5: Request approval
    await page.click('button:has-text("Request Approval")');

    // Step 6: Verify waiting message
    await expect(page.locator('text=Waiting for approval')).toBeVisible();

    // Step 7: Open resident context
    const residentPage = await context.newPage();
    await residentPage.goto('/login');
    await residentPage.fill('[name="email"]', testResident.email);
    await residentPage.fill('[name="password"]', testResident.password);
    await residentPage.click('button[type="submit"]');

    // Step 8: Check notifications
    await residentPage.click('[data-testid="notifications-icon"]');

    // Step 9: Find and approve the walk-in
    await expect(residentPage.locator('text=Walk-In Test Visitor')).toBeVisible({ timeout: 30000 });
    await residentPage.click('button:has-text("Approve")');

    // Step 10: Verify approval confirmation
    await expect(residentPage.locator('text=approved')).toBeVisible();

    // Step 11: Switch back to guard page
    // Wait for WebSocket notification
    await expect(page.locator('text=Approved|approved')).toBeVisible({ timeout: 30000 });

    // Step 12: Complete check-in
    await page.click('button:has-text("Check In")');
    await expect(page.locator('text=checked in successfully')).toBeVisible();

    await residentPage.close();
  });

  test('Should handle resident rejection', async ({ page, context }) => {
    // Login as guard and create walk-in
    await page.goto('/login');
    await page.fill('[name="email"]', testGuard.email);
    await page.fill('[name="password"]', testGuard.password);
    await page.click('button[type="submit"]');

    await page.click('text=Walk-In');
    await page.fill('[name="name"]', 'Rejected Visitor');
    await page.fill('[name="phone"]', '+254700999999');
    await page.fill('[name="purpose"]', 'Test rejection');
    await page.fill('[name="residentSearch"]', 'resident');
    await page.click('[data-testid="resident-option"]');
    await page.click('button:has-text("Request Approval")');

    // Login as resident and reject
    const residentPage = await context.newPage();
    await residentPage.goto('/login');
    await residentPage.fill('[name="email"]', testResident.email);
    await residentPage.fill('[name="password"]', testResident.password);
    await residentPage.click('button[type="submit"]');

    await residentPage.click('[data-testid="notifications-icon"]');
    await residentPage.click('button:has-text("Reject")');

    // Verify guard receives rejection
    await expect(page.locator('text=Rejected|rejected|denied')).toBeVisible({ timeout: 30000 });

    await residentPage.close();
  });
});

test.describe('Security Tests', () => {
  test('E2E-004: Horizontal privilege escalation prevention', async ({ page, context }) => {
    // Login as Resident A
    await page.goto('/login');
    await page.fill('[name="email"]', 'resident@test.com');
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');

    // Create a visitor
    await page.click('text=Register Visitor');
    await page.fill('[name="name"]', 'Private Visitor');
    await page.fill('[name="phone"]', '+254712000001');
    await page.click('button[type="submit"]');

    // Get visitor ID from URL
    const url = page.url();
    const visitorId = url.match(/visitors?\/(\d+)/)?.[1];

    // Logout
    await page.click('[data-testid="logout"]');

    // Login as Resident B
    const residentBPage = await context.newPage();
    await residentBPage.goto('/login');
    await residentBPage.fill('[name="email"]', 'resident2@test.com');
    await residentBPage.fill('[name="password"]', 'TestPass123!');
    await residentBPage.click('button[type="submit"]');

    // Try to access Resident A's visitor
    if (visitorId) {
      await residentBPage.goto(`/visitors/${visitorId}`);

      // Should be denied access or redirected
      await expect(residentBPage).not.toHaveURL(`/visitors/${visitorId}`);
      
      // Or should show access denied
      const accessDenied = await residentBPage.locator('text=Access denied|Forbidden|not found').isVisible();
      const redirected = !residentBPage.url().includes(visitorId);
      
      expect(accessDenied || redirected).toBe(true);
    }

    await residentBPage.close();
  });
});
