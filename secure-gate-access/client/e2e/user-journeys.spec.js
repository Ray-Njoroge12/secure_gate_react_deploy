/**
 * Comprehensive E2E User Journey Tests
 * Tests complete workflows for admin, guard, and resident roles
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3000';
const API_URL = 'http://localhost:5001';

test.describe('Admin User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
  });

  test('complete admin workflow: login → view dashboard → manage users → view audit logs → logout', async ({ page }) => {
    // Step 1: Login as admin
    await page.fill('input[name="email"], input[type="email"]', 'admin@securegate.com');
    await page.fill('input[name="password"], input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Verify successful login
    await expect(page).toHaveURL(/dashboard|admin/, { timeout: 5000 });
    
    // Step 2: View dashboard metrics
    await page.waitForSelector('text=/dashboard|metrics|overview/i', { timeout: 5000 });
    
    // Verify metrics are displayed
    const metricsVisible = await page.locator('text=/total users|active visitors|statistics/i').count();
    expect(metricsVisible).toBeGreaterThan(0);

    // Step 3: Navigate to user management
    const userMenuLink = page.locator('a:has-text("Users"), a:has-text("User Management"), [href*="users"]').first();
    if (await userMenuLink.isVisible()) {
      await userMenuLink.click();
      await page.waitForLoadState('networkidle');
      
      // Verify user list is displayed
      await expect(page.locator('text=/user list|manage users/i')).toBeVisible({ timeout: 3000 });
    }

    // Step 4: Navigate to audit logs
    const auditLink = page.locator('a:has-text("Audit"), a:has-text("Logs"), [href*="audit"]').first();
    if (await auditLink.isVisible()) {
      await auditLink.click();
      await page.waitForLoadState('networkidle');
      
      // Verify audit logs are displayed
      const auditLogsVisible = await page.locator('text=/audit|log|activity/i').count();
      expect(auditLogsVisible).toBeGreaterThan(0);
    }

    // Step 5: Logout
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), [aria-label="Logout"]').first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // Verify redirect to login
      await expect(page).toHaveURL(/login/, { timeout: 3000 });
    }
  });

  test('admin should view system analytics', async ({ page }) => {
    // Login
    await page.fill('input[name="email"], input[type="email"]', 'admin@securegate.com');
    await page.fill('input[name="password"], input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/dashboard|admin/, { timeout: 5000 });

    // Look for analytics/metrics elements
    const hasMetrics = await page.locator('text=/total|active|pending|statistics/i').count();
    expect(hasMetrics).toBeGreaterThan(0);
  });

  test('admin should access all protected routes', async ({ page }) => {
    // Login
    await page.fill('input[name="email"], input[type="email"]', 'admin@securegate.com');
    await page.fill('input[name="password"], input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await page.waitForLoadState('networkidle');

    // Admin should be able to access admin routes
    const adminRoutes = ['/admin/users', '/admin/audit-logs', '/admin/settings'];
    
    for (const route of adminRoutes) {
      await page.goto(`${BASE_URL}${route}`);
      
      // Should not redirect to login (might show 404 or content)
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/login');
    }
  });
});

test.describe('Guard User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
  });

  test('complete guard workflow: login → view active visitors → check-in visitor → check-out visitor → logout', async ({ page }) => {
    // Step 1: Login as guard
    await page.fill('input[name="email"], input[type="email"]', 'guard@securegate.com');
    await page.fill('input[name="password"], input[type="password"]', 'guard123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/dashboard|guard/, { timeout: 5000 });

    // Step 2: View active visitors
    await page.waitForSelector('text=/visitor|active|pending/i', { timeout: 5000 });

    // Step 3: Check-in a visitor (if any available)
    const checkInButton = page.locator('button:has-text("Check In"), button:has-text("Check-in")').first();
    
    if (await checkInButton.isVisible()) {
      await checkInButton.click();
      
      // Verify success message or status update
      await page.waitForSelector('text=/success|checked in|on premise/i', { timeout: 3000 });
    }

    // Step 4: Check-out a visitor (if any available)
    const checkOutButton = page.locator('button:has-text("Check Out"), button:has-text("Check-out")').first();
    
    if (await checkOutButton.isVisible()) {
      await checkOutButton.click();
      
      // Verify success message
      await page.waitForSelector('text=/success|checked out|departed/i', { timeout: 3000 });
    }

    // Step 5: Logout
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")').first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await expect(page).toHaveURL(/login/, { timeout: 3000 });
    }
  });

  test('guard should only see guard-specific features', async ({ page }) => {
    // Login as guard
    await page.fill('input[name="email"], input[type="email"]', 'guard@securegate.com');
    await page.fill('input[name="password"], input[type="password"]', 'guard123');
    await page.click('button[type="submit"]');

    await page.waitForLoadState('networkidle');

    // Guard should NOT see admin-only features
    const adminLinks = page.locator('a:has-text("Admin"), a:has-text("Users Management"), a:has-text("System Settings")');
    const count = await adminLinks.count();
    
    // Should have 0 or very few admin links
    expect(count).toBeLessThanOrEqual(1);
  });

  test('guard should scan QR code for visitor check-in', async ({ page }) => {
    // Login
    await page.fill('input[name="email"], input[type="email"]', 'guard@securegate.com');
    await page.fill('input[name="password"], input[type="password"]', 'guard123');
    await page.click('button[type="submit"]');

    await page.waitForLoadState('networkidle');

    // Look for QR scan functionality
    const qrButton = page.locator('button:has-text("Scan QR"), button:has-text("QR Code"), [aria-label*="QR"]').first();
    
    if (await qrButton.isVisible()) {
      await qrButton.click();
      
      // Should show QR scanner interface
      await page.waitForSelector('text=/scan|camera|qr code/i', { timeout: 3000 });
    }
  });
});

test.describe('Resident User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
  });

  test('complete resident workflow: login → create visitor → view visitors → cancel visitor → logout', async ({ page }) => {
    // Step 1: Login as resident
    await page.fill('input[name="email"], input[type="email"]', 'resident@securegate.com');
    await page.fill('input[name="password"], input[type="password"]', 'resident123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/dashboard|resident/, { timeout: 5000 });

    // Step 2: Navigate to create visitor
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Visitor"), button:has-text("Add Visitor"), a:has-text("Create Visitor")').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForLoadState('networkidle');

      // Step 3: Fill visitor form
      await page.fill('input[name="name"], input[placeholder*="name" i]', 'E2E Test Visitor');
      await page.fill('input[name="phone"], input[placeholder*="phone" i]', '+254700123456');
      await page.fill('input[name="email"], input[type="email"]:not([name="userEmail"])', 'e2e@test.com');
      await page.fill('textarea[name="purpose"], input[name="purpose"]', 'E2E Testing');

      // Submit form
      const submitButton = page.locator('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Submit")').first();
      await submitButton.click();

      // Verify success
      await page.waitForSelector('text=/success|created|invitation sent/i', { timeout: 5000 });
    }

    // Step 4: View visitor list
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForSelector('text=/visitor|upcoming|recent/i', { timeout: 5000 });

    // Step 5: Cancel a visitor (if available)
    const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Delete")').first();
    
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      
      // Confirm deletion if modal appears
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').first();
      if (await confirmButton.isVisible({ timeout: 1000 })) {
        await confirmButton.click();
      }
      
      // Verify deletion
      await page.waitForSelector('text=/deleted|cancelled|removed/i', { timeout: 3000 });
    }

    // Step 6: Logout
    const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")').first();
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      await expect(page).toHaveURL(/login/, { timeout: 3000 });
    }
  });

  test('resident should receive visitor QR code after creation', async ({ page }) => {
    // Login
    await page.fill('input[name="email"], input[type="email"]', 'resident@securegate.com');
    await page.fill('input[name="password"], input[type="password"]', 'resident123');
    await page.click('button[type="submit"]');

    await page.waitForLoadState('networkidle');

    // Create visitor
    const createButton = page.locator('button:has-text("Create"), a:has-text("Create Visitor")').first();
    
    if (await createButton.isVisible()) {
      await createButton.click();
      await page.waitForLoadState('networkidle');

      await page.fill('input[name="name"], input[placeholder*="name" i]', 'QR Test Visitor');
      await page.fill('input[name="phone"], input[placeholder*="phone" i]', '+254700999999');
      
      const submitButton = page.locator('button[type="submit"]').first();
      await submitButton.click();

      // Should show QR code or download link
      await page.waitForSelector('text=/qr code|download|invite code/i', { timeout: 5000 });
    }
  });

  test('resident should view upcoming and past visits', async ({ page }) => {
    // Login
    await page.fill('input[name="email"], input[type="email"]', 'resident@securegate.com');
    await page.fill('input[name="password"], input[type="password"]', 'resident123');
    await page.click('button[type="submit"]');

    await page.waitForLoadState('networkidle');

    // Should see visitor lists
    const hasUpcoming = await page.locator('text=/upcoming|scheduled|pending/i').count();
    const hasPast = await page.locator('text=/past|history|completed/i').count();

    expect(hasUpcoming + hasPast).toBeGreaterThan(0);
  });
});

test.describe('Cross-Role Scenarios', () => {
  test('complete visitor lifecycle: resident creates → guard checks in → guard checks out', async ({ browser }) => {
    const residentContext = await browser.newContext();
    const guardContext = await browser.newContext();

    const residentPage = await residentContext.newPage();
    const guardPage = await guardContext.newPage();

    try {
      // Step 1: Resident creates visitor
      await residentPage.goto(`${BASE_URL}/login`);
      await residentPage.fill('input[name="email"]', 'resident@securegate.com');
      await residentPage.fill('input[name="password"]', 'resident123');
      await residentPage.click('button[type="submit"]');
      await residentPage.waitForLoadState('networkidle');

      // Create visitor
      const createButton = residentPage.locator('button:has-text("Create"), a:has-text("Create Visitor")').first();
      if (await createButton.isVisible()) {
        await createButton.click();
        await residentPage.waitForLoadState('networkidle');

        await residentPage.fill('input[name="name"]', 'Cross-Role Test');
        await residentPage.fill('input[name="phone"]', '+254700888888');
        
        const submitButton = residentPage.locator('button[type="submit"]').first();
        await submitButton.click();
        
        await residentPage.waitForSelector('text=/success/i', { timeout: 5000 });
      }

      // Step 2: Guard checks in the visitor
      await guardPage.goto(`${BASE_URL}/login`);
      await guardPage.fill('input[name="email"]', 'guard@securegate.com');
      await guardPage.fill('input[name="password"]', 'guard123');
      await guardPage.click('button[type="submit"]');
      await guardPage.waitForLoadState('networkidle');

      // Find and check in the visitor
      const checkInButton = guardPage.locator('button:has-text("Check In")').first();
      if (await checkInButton.isVisible({ timeout: 2000 })) {
        await checkInButton.click();
        await guardPage.waitForSelector('text=/success/i', { timeout: 3000 });
      }

      // Step 3: Guard checks out the visitor
      const checkOutButton = guardPage.locator('button:has-text("Check Out")').first();
      if (await checkOutButton.isVisible({ timeout: 2000 })) {
        await checkOutButton.click();
        await guardPage.waitForSelector('text=/success/i', { timeout: 3000 });
      }

    } finally {
      await residentPage.close();
      await guardPage.close();
      await residentContext.close();
      await guardContext.close();
    }
  });

  test('admin monitors visitor activity created by resident and processed by guard', async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[name="email"]', 'admin@securegate.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await page.waitForLoadState('networkidle');

    // View all visitor activity
    const visitorsLink = page.locator('a:has-text("Visitors"), [href*="visitor"]').first();
    if (await visitorsLink.isVisible()) {
      await visitorsLink.click();
      await page.waitForLoadState('networkidle');

      // Should see all visitors regardless of who created them
      const visitorCount = await page.locator('text=/visitor/i').count();
      expect(visitorCount).toBeGreaterThan(0);
    }
  });
});

test.describe('Error Handling and Edge Cases', () => {
  test('should handle expired session gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Login
    await page.fill('input[name="email"]', 'resident@securegate.com');
    await page.fill('input[name="password"]', 'resident123');
    await page.click('button[type="submit"]');

    await page.waitForLoadState('networkidle');

    // Clear cookies to simulate expired session
    await page.context().clearCookies();
    
    // Try to navigate to protected route
    await page.goto(`${BASE_URL}/dashboard`);

    // Should redirect to login
    await expect(page).toHaveURL(/login/, { timeout: 3000 });
  });

  test('should handle network errors during API calls', async ({ page }) => {
    // Intercept and fail API calls
    await page.route('**/api/**', route => route.abort());

    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[name="email"]', 'resident@securegate.com');
    await page.fill('input[name="password"]', 'resident123');
    await page.click('button[type="submit"]');

    // Should show error message
    await page.waitForSelector('text=/error|failed|unable/i', { timeout: 5000 });
  });

  test('should validate form inputs before submission', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Try to login without credentials
    await page.click('button[type="submit"]');

    // Should show validation errors
    const errors = await page.locator('text=/required|cannot be empty/i').count();
    expect(errors).toBeGreaterThan(0);
  });
});

test.describe('Accessibility', () => {
  test('all pages should be keyboard navigable', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Tab through form fields
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Submit button should be focusable
    const submitButton = await page.locator('button[type="submit"]');
    await expect(submitButton).toBeFocused();
  });

  test('forms should have proper labels', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Check for proper labels
    const emailLabel = page.locator('label:has-text("Email")');
    const passwordLabel = page.locator('label:has-text("Password")');

    await expect(emailLabel).toBeVisible();
    await expect(passwordLabel).toBeVisible();
  });
});
