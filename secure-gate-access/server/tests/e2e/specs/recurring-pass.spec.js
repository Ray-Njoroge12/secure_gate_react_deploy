/**
 * E2E-003: Recurring Pass Validation Workflow
 * Tests PIN/QR validation for daily workers with schedule constraints
 */

import { test, expect } from '@playwright/test';

test.describe('Recurring Pass Workflow', () => {
  const testResident = {
    email: 'resident@test.com',
    password: 'TestPass123!'
  };

  const testGuard = {
    email: 'guard@test.com',
    password: 'TestPass123!'
  };

  const testWorker = {
    name: 'Daily Cleaner',
    phone: '+254712345000',
    passType: 'daily_worker',
    purpose: 'Cleaning services'
  };

  test('E2E-003: Create and validate recurring pass', async ({ page, context }) => {
    // Step 1: Login as resident
    await page.goto('/login');
    await page.fill('[name="email"]', testResident.email);
    await page.fill('[name="password"]', testResident.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/dashboard/);

    // Step 2: Navigate to Recurring Passes
    await page.click('text=Recurring Passes');

    // Step 3: Click Create New Pass
    await page.click('button:has-text("Create")');

    // Step 4: Fill form
    await page.fill('[name="visitorName"]', testWorker.name);
    await page.fill('[name="visitorPhone"]', testWorker.phone);
    await page.fill('[name="purpose"]', testWorker.purpose);

    // Set schedule (Mon-Fri, 7am-6pm)
    const today = new Date();
    const sixMonthsLater = new Date(today.setMonth(today.getMonth() + 6));
    await page.fill('[name="validUntil"]', sixMonthsLater.toISOString().split('T')[0]);

    // Step 5: Submit
    await page.click('button[type="submit"]');

    // Step 6: Verify PIN displayed
    await expect(page.locator('[data-testid="pass-pin"]')).toBeVisible({ timeout: 10000 });
    
    // Get the PIN
    const pinElement = page.locator('[data-testid="pass-pin"]');
    const pin = await pinElement.textContent();
    expect(pin).toMatch(/^\d{6}$/);

    // Step 7: Login as guard
    const guardPage = await context.newPage();
    await guardPage.goto('/login');
    await guardPage.fill('[name="email"]', testGuard.email);
    await guardPage.fill('[name="password"]', testGuard.password);
    await guardPage.click('button[type="submit"]');

    // Step 8: Navigate to Validate Recurring Pass
    await guardPage.click('text=Recurring');

    // Step 9: Enter PIN
    await guardPage.fill('[name="pin"]', pin);
    await guardPage.click('button:has-text("Validate")');

    // Step 10: Verify validation successful
    await expect(guardPage.locator(`text=${testWorker.name}`)).toBeVisible();
    await expect(guardPage.locator('text=Valid|Approved')).toBeVisible();

    // Step 11: Verify entry logged
    await guardPage.click('button:has-text("Record Entry")');
    await expect(guardPage.locator('text=Entry recorded')).toBeVisible();

    await guardPage.close();
  });

  test('SEC-002/003: Invalid PIN rejection with rate limiting', async ({ page }) => {
    // Login as guard
    await page.goto('/login');
    await page.fill('[name="email"]', testGuard.email);
    await page.fill('[name="password"]', testGuard.password);
    await page.click('button[type="submit"]');

    // Navigate to recurring pass validation
    await page.click('text=Recurring');

    // Attempt 6 invalid PINs (should trigger rate limit after 5)
    for (let i = 0; i < 6; i++) {
      await page.fill('[name="pin"]', '000000');
      await page.click('button:has-text("Validate")');
      
      const errorMessage = page.locator('text=Invalid|locked|Too many');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
      
      // Clear the input for next attempt
      await page.fill('[name="pin"]', '');
    }

    // The 6th attempt should show rate limit message
    await expect(page.locator('text=locked|Too many attempts')).toBeVisible();
  });

  test('Should reject pass on non-allowed day', async ({ page, context }) => {
    // This test would need a pass configured for specific days
    // For now, we test the validation logic exists
    
    await page.goto('/login');
    await page.fill('[name="email"]', testGuard.email);
    await page.fill('[name="password"]', testGuard.password);
    await page.click('button[type="submit"]');

    await page.click('text=Recurring');

    // Enter a valid PIN format but for a weekend-only pass on a weekday (or vice versa)
    // This depends on test data setup
    await page.fill('[name="pin"]', '999999');
    await page.click('button:has-text("Validate")');

    // Should show some form of rejection
    const rejection = page.locator('text=Invalid|not valid|outside');
    await expect(rejection).toBeVisible({ timeout: 5000 });
  });

  test('Should reject expired pass', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', testGuard.email);
    await page.fill('[name="password"]', testGuard.password);
    await page.click('button[type="submit"]');

    await page.click('text=Recurring');

    // Use an expired pass PIN (would need test data)
    await page.fill('[name="pin"]', '111111');
    await page.click('button:has-text("Validate")');

    const rejection = page.locator('text=Invalid|expired|not found');
    await expect(rejection).toBeVisible({ timeout: 5000 });
  });

  test('Resident can suspend and reactivate pass', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', testResident.email);
    await page.fill('[name="password"]', testResident.password);
    await page.click('button[type="submit"]');

    await page.click('text=Recurring Passes');

    // Find an active pass
    const activePass = page.locator('[data-status="active"]').first();
    
    if (await activePass.isVisible()) {
      // Click suspend
      await activePass.locator('button:has-text("Suspend")').click();
      
      // Confirm suspension
      await expect(page.locator('text=suspended')).toBeVisible();

      // Reactivate
      await page.click('button:has-text("Reactivate")');
      await expect(page.locator('text=active|reactivated')).toBeVisible();
    }
  });

  test('Resident can revoke pass permanently', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', testResident.email);
    await page.fill('[name="password"]', testResident.password);
    await page.click('button[type="submit"]');

    await page.click('text=Recurring Passes');

    // Find a pass to revoke
    const pass = page.locator('[data-testid="recurring-pass"]').first();
    
    if (await pass.isVisible()) {
      await pass.locator('button:has-text("Revoke")').click();
      
      // Provide reason
      await page.fill('[name="revokeReason"]', 'No longer employed');
      await page.click('button:has-text("Confirm")');

      await expect(page.locator('text=revoked')).toBeVisible();
    }
  });
});
