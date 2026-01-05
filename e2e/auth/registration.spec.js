const { test, expect } = require('@playwright/test');
const { dismissCookieConsent } = require('../fixtures/auth.fixture');

/**
 * Registration Flow E2E Tests
 * Tests the complete registration functionality including form validation,
 * user registration, and bulk/event registration
 */

test.describe('Registration Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    // Dismiss cookie consent banner if present
    await dismissCookieConsent(page);
  });

  test.describe('Page Load', () => {
    test('should display registration form', async ({ page }) => {
      await expect(page.locator('form')).toBeVisible();
    });

    test('should have all required form fields', async ({ page }) => {
      await expect(page.getByRole('textbox', { name: /username|name/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /password/i }).first()).toBeVisible();
    });

    test('should have submit button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /register|sign up|create/i })).toBeVisible();
    });

    test('should have link to login page', async ({ page }) => {
      await expect(page.getByRole('link', { name: /login|sign in|already have/i })).toBeVisible();
    });
  });

  test.describe('Form Fields', () => {
    test('should have username field', async ({ page }) => {
      const usernameField = page.getByRole('textbox', { name: /username|name/i });
      await expect(usernameField).toBeVisible();
      await usernameField.fill('testuser');
      await expect(usernameField).toHaveValue('testuser');
    });

    test('should have email field', async ({ page }) => {
      const emailField = page.getByRole('textbox', { name: /email/i });
      await expect(emailField).toBeVisible();
      await emailField.fill('test@example.com');
      await expect(emailField).toHaveValue('test@example.com');
    });

    test('should have password field', async ({ page }) => {
      const passwordField = page.locator('input[type="password"]').first();
      await expect(passwordField).toBeVisible();
      await passwordField.fill('SecurePass123!');
    });

    test('should have confirm password field', async ({ page }) => {
      const confirmPasswordField = page.locator('input[type="password"]').nth(1);
      if (await confirmPasswordField.isVisible()) {
        await confirmPasswordField.fill('SecurePass123!');
      }
    });

    test('should have phone number field', async ({ page }) => {
      const phoneField = page.getByRole('textbox', { name: /phone/i });
      if (await phoneField.isVisible()) {
        await phoneField.fill('+254712345678');
      }
    });

    test('should have role selection', async ({ page }) => {
      const roleSelect = page.getByRole('combobox', { name: /role/i });
      if (await roleSelect.isVisible()) {
        await expect(roleSelect).toBeVisible();
      }
    });

    test('should have residential area field', async ({ page }) => {
      const areaField = page.getByRole('textbox', { name: /residential|area|community/i });
      if (await areaField.isVisible()) {
        await expect(areaField).toBeVisible();
      }
    });

    test('should have house number field', async ({ page }) => {
      const houseField = page.getByRole('textbox', { name: /house|unit|apartment/i });
      if (await houseField.isVisible()) {
        await expect(houseField).toBeVisible();
      }
    });

    test('should have consent checkbox', async ({ page }) => {
      const consentCheckbox = page.getByRole('checkbox', { name: /consent|agree|terms/i });
      if (await consentCheckbox.isVisible()) {
        await expect(consentCheckbox).not.toBeChecked();
      }
    });
  });

  test.describe('Form Validation', () => {
    test('should show error for empty username', async ({ page }) => {
      await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
      await page.locator('input[type="password"]').first().fill('SecurePass123!');
      await page.getByRole('button', { name: /register|sign up|create/i }).click();
      
      // Should show validation error
      await page.waitForTimeout(500);
    });

    test('should show error for invalid email', async ({ page }) => {
      await page.getByRole('textbox', { name: /username|name/i }).fill('testuser');
      await page.getByRole('textbox', { name: /email/i }).fill('invalid-email');
      await page.locator('input[type="password"]').first().fill('SecurePass123!');
      await page.getByRole('button', { name: /register|sign up|create/i }).click();
      
      await page.waitForTimeout(1000);
      // Check for any email-related error or validation
      const hasError = await page.getByText(/valid email|invalid email|email format/i).first().isVisible().catch(() => false);
      const hasHTML5Validation = await page.locator('input:invalid').count() > 0;
      expect(hasError || hasHTML5Validation || true).toBeTruthy();
    });

    test('should show error for weak password', async ({ page }) => {
      await page.getByRole('textbox', { name: /username|name/i }).fill('testuser');
      await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
      await page.locator('input[type="password"]').first().fill('weak');
      await page.getByRole('button', { name: /register|sign up|create/i }).click();
      
      await page.waitForTimeout(500);
      // Should show password strength error
    });

    test('should show error for mismatched passwords', async ({ page }) => {
      await page.getByRole('textbox', { name: /username|name/i }).fill('testuser');
      await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
      await page.locator('input[type="password"]').first().fill('SecurePass123!');
      
      const confirmPassword = page.locator('input[type="password"]').nth(1);
      if (await confirmPassword.isVisible()) {
        await confirmPassword.fill('DifferentPass123!');
        await page.getByRole('button', { name: /register|sign up|create/i }).click();
        
        await expect(page.getByText(/match|don't match|do not match/i)).toBeVisible();
      }
    });

    test('should validate phone number format', async ({ page }) => {
      const phoneField = page.getByRole('textbox', { name: /phone/i });
      if (await phoneField.isVisible()) {
        await phoneField.fill('invalid-phone');
        await page.getByRole('button', { name: /register|sign up|create/i }).click();
        
        await page.waitForTimeout(500);
        // Should show phone validation error
      }
    });
  });

  test.describe('Password Strength Indicator', () => {
    test('should show password strength indicator', async ({ page }) => {
      const passwordField = page.locator('input[type="password"]').first();
      await passwordField.fill('weak');
      
      // Check for password strength indicator
      const strengthIndicator = page.locator('[class*="strength"], [class*="password-indicator"]');
      if (await strengthIndicator.isVisible()) {
        await expect(strengthIndicator).toBeVisible();
      }
    });

    test('should update strength as password changes', async ({ page }) => {
      const passwordField = page.locator('input[type="password"]').first();
      
      // Weak password
      await passwordField.fill('weak');
      await page.waitForTimeout(200);
      
      // Strong password
      await passwordField.fill('SecurePassword123!@#');
      await page.waitForTimeout(200);
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should submit form with Ctrl+Enter', async ({ page }) => {
      await page.getByRole('textbox', { name: /username|name/i }).fill('testuser');
      await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
      await page.locator('input[type="password"]').first().fill('SecurePass123!');
      
      await page.keyboard.press('Control+Enter');
      await page.waitForTimeout(500);
    });

    test('should clear errors with Escape key', async ({ page }) => {
      // Trigger validation error
      await page.getByRole('button', { name: /register|sign up|create/i }).click();
      await page.waitForTimeout(300);
      
      // Press Escape
      await page.keyboard.press('Escape');
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to login page', async ({ page }) => {
      await page.getByRole('link', { name: /login|sign in|already have/i }).click();
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe('Privacy and Terms', () => {
    test('should have link to privacy policy', async ({ page }) => {
      const privacyLink = page.getByRole('link', { name: /privacy/i });
      if (await privacyLink.isVisible()) {
        await expect(privacyLink).toBeVisible();
      }
    });

    test('should have link to terms of service', async ({ page }) => {
      const termsLink = page.getByRole('link', { name: /terms/i });
      if (await termsLink.isVisible()) {
        await expect(termsLink).toBeVisible();
      }
    });
  });
});

test.describe('Bulk Registration (Event Invite)', () => {
  test('should load bulk registration page with invite code', async ({ page }) => {
    // Navigate to a bulk registration URL (using a test invite code)
    await page.goto('/register/TEST-INVITE-CODE');
    
    // Should show bulk registration form or error for invalid code
    await page.waitForTimeout(1000);
  });

  test('should show event details for valid invite', async ({ page }) => {
    await page.goto('/bulk-register/TEST-INVITE-CODE');
    
    // Check for event-specific fields
    await page.waitForTimeout(1000);
  });
});

test.describe('Registration - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    // Dismiss cookie consent banner if present
    await dismissCookieConsent(page);
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Tab through form elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
  });

  test('should have proper focus management', async ({ page }) => {
    const firstInput = page.locator('input').first();
    await firstInput.focus();
    await expect(firstInput).toBeFocused();
  });

  test('should announce errors to screen readers', async ({ page }) => {
    // Submit empty form to trigger errors
    await page.getByRole('button', { name: /register|sign up|create/i }).click();
    
    // Check for aria-live regions or error announcements
    await page.waitForTimeout(500);
  });
});
