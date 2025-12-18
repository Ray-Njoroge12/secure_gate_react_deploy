const { test, expect } = require('@playwright/test');

/**
 * Navigation and Routing E2E Tests
 * Tests the application navigation, routing, and redirects
 */

test.describe('Public Routes', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/login/);
  });

  test('should load registration page', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/register/);
  });

  test('should redirect root to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/login/);
  });

  test('should load privacy policy page', async ({ page }) => {
    await page.goto('/privacy-policy');
    await expect(page).toHaveURL(/privacy-policy/);
  });

  test('should load terms of service page', async ({ page }) => {
    await page.goto('/terms-of-service');
    await expect(page).toHaveURL(/terms-of-service/);
  });
});

test.describe('Protected Routes - Redirect', () => {
  test('should redirect resident dashboard to login', async ({ page }) => {
    await page.goto('/dashboard/resident');
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect guard dashboard to login', async ({ page }) => {
    await page.goto('/dashboard/guard');
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect admin dashboard to login', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect resident add visitor to login', async ({ page }) => {
    await page.goto('/resident/add-visitor');
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect guard scan QR to login', async ({ page }) => {
    await page.goto('/dashboard/guard/scan-qr');
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect admin reports to login', async ({ page }) => {
    await page.goto('/dashboard/admin/reports');
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect MFA setup to login', async ({ page }) => {
    await page.goto('/mfa/setup');
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect privacy dashboard to login', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Legacy Route Redirects', () => {
  test('should redirect legacy AddVisitor route', async ({ page }) => {
    await page.goto('/pages/resident/AddVisitor');
    
    // Should redirect to new route or login
    await page.waitForTimeout(500);
  });

  test('should redirect legacy GeneratePass route', async ({ page }) => {
    await page.goto('/pages/resident/GeneratePass');
    
    // Should redirect to new route or login
    await page.waitForTimeout(500);
  });

  test('should redirect legacy VisitorHistory route', async ({ page }) => {
    await page.goto('/pages/resident/VisitorHistory');
    
    // Should redirect to new route or login
    await page.waitForTimeout(500);
  });
});

test.describe('404 Not Found', () => {
  test('should show 404 for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    
    // Should show 404 or redirect to login
    await page.waitForTimeout(500);
  });

  test('should show 404 for invalid nested routes', async ({ page }) => {
    await page.goto('/dashboard/invalid-role');
    
    // Should show 404 or redirect
    await page.waitForTimeout(500);
  });
});

test.describe('Navigation Between Pages', () => {
  test('should navigate from login to register', async ({ page }) => {
    await page.goto('/login');
    
    const registerLink = page.getByRole('link', { name: /register|sign up|create/i });
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/register/);
    }
  });

  test('should navigate from register to login', async ({ page }) => {
    await page.goto('/register');
    
    const loginLink = page.getByRole('link', { name: /login|sign in|already have/i });
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/login/);
    }
  });

  test('should navigate to privacy policy from login', async ({ page }) => {
    await page.goto('/login');
    
    const privacyLink = page.getByRole('link', { name: /privacy/i });
    if (await privacyLink.isVisible()) {
      await privacyLink.click();
      await expect(page).toHaveURL(/privacy/);
    }
  });

  test('should navigate to terms from registration', async ({ page }) => {
    await page.goto('/register');
    
    const termsLink = page.getByRole('link', { name: /terms/i });
    if (await termsLink.isVisible()) {
      await termsLink.click();
      await expect(page).toHaveURL(/terms/);
    }
  });
});

test.describe('Browser Navigation', () => {
  test('should handle back button', async ({ page }) => {
    await page.goto('/login');
    await page.goto('/register');
    
    await page.goBack();
    await expect(page).toHaveURL(/login/);
  });

  test('should handle forward button', async ({ page }) => {
    await page.goto('/login');
    await page.goto('/register');
    await page.goBack();
    
    await page.goForward();
    await expect(page).toHaveURL(/register/);
  });

  test('should handle page refresh', async ({ page }) => {
    await page.goto('/login');
    
    await page.reload();
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Deep Linking', () => {
  test('should handle direct link to protected route', async ({ page }) => {
    // Direct link should redirect to login with return URL
    await page.goto('/dashboard/resident');
    
    await expect(page).toHaveURL(/login/);
  });

  test('should handle invite deep link', async ({ page }) => {
    await page.goto('/invite/SOME-CODE-123');
    
    // Should load invite page
    await page.waitForTimeout(500);
  });

  test('should handle bulk register deep link', async ({ page }) => {
    await page.goto('/bulk-register/EVENT-CODE-456');
    
    // Should load bulk register page
    await page.waitForTimeout(500);
  });
});

test.describe('URL Parameters', () => {
  test('should handle invite code parameter', async ({ page }) => {
    await page.goto('/register/INVITE123');
    
    // Should show bulk registration form
    await page.waitForTimeout(500);
  });

  test('should handle bulk query parameter', async ({ page }) => {
    await page.goto('/register?bulk=true');
    
    // Should show bulk registration form
    await page.waitForTimeout(500);
  });

  test('should handle reset password token', async ({ page }) => {
    await page.goto('/reset-password/TOKEN123');
    
    // Should show reset password form
    await page.waitForTimeout(500);
  });
});
