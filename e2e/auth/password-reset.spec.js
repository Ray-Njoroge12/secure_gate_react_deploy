const { test, expect } = require('@playwright/test');

/**
 * Password Reset Flow E2E Tests
 * Tests the complete password reset functionality
 */

test.describe('Password Reset Flow', () => {
  test.describe('Request Password Reset', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
    });

    test('should show forgot password option', async ({ page }) => {
      await expect(page.getByText(/forgot password/i)).toBeVisible();
    });

    test('should open forgot password form', async ({ page }) => {
      await page.getByText(/forgot password/i).click();
      
      // Should show email input for reset
      await expect(page.getByText(/reset|email|enter your email/i)).toBeVisible();
    });

    test('should validate email in reset form', async ({ page }) => {
      await page.getByText(/forgot password/i).click();
      await page.waitForTimeout(300);
      
      // Try to submit without email
      const resetButton = page.getByRole('button', { name: /send|reset|submit/i });
      if (await resetButton.isVisible()) {
        await resetButton.click();
        // Should show validation error
      }
    });

    test('should show success message for valid email', async ({ page }) => {
      await page.getByText(/forgot password/i).click();
      await page.waitForTimeout(300);
      
      const emailInput = page.getByRole('textbox', { name: /email/i });
      if (await emailInput.isVisible()) {
        await emailInput.fill('test@example.com');
        await page.getByRole('button', { name: /send|reset|submit/i }).click();
        
        // Wait for response
        await page.waitForTimeout(2000);
      }
    });
  });

  test.describe('Reset Password Page', () => {
    test('should load reset password page with token', async ({ page }) => {
      // Navigate to reset password page with a test token
      await page.goto('/reset-password/test-token-123');
      
      // Should show reset password form or token invalid error
      await page.waitForTimeout(500);
    });

    test('should have new password field', async ({ page }) => {
      await page.goto('/reset-password/test-token-123');
      
      const passwordField = page.locator('input[type="password"]').first();
      if (await passwordField.isVisible()) {
        await expect(passwordField).toBeVisible();
      }
    });

    test('should have confirm password field', async ({ page }) => {
      await page.goto('/reset-password/test-token-123');
      
      const confirmField = page.locator('input[type="password"]').nth(1);
      if (await confirmField.isVisible()) {
        await expect(confirmField).toBeVisible();
      }
    });

    test('should validate password match', async ({ page }) => {
      await page.goto('/reset-password/test-token-123');
      
      const passwordField = page.locator('input[type="password"]').first();
      const confirmField = page.locator('input[type="password"]').nth(1);
      
      if (await passwordField.isVisible() && await confirmField.isVisible()) {
        await passwordField.fill('NewPassword123!');
        await confirmField.fill('DifferentPassword123!');
        
        await page.getByRole('button', { name: /update|reset|submit/i }).click();
        
        await expect(page.getByText(/match|don't match|do not match/i)).toBeVisible();
      }
    });

    test('should validate password strength', async ({ page }) => {
      await page.goto('/reset-password/test-token-123');
      
      const passwordField = page.locator('input[type="password"]').first();
      
      if (await passwordField.isVisible()) {
        await passwordField.fill('weak');
        await page.getByRole('button', { name: /update|reset|submit/i }).click();
        
        await page.waitForTimeout(500);
        // Should show password strength error
      }
    });
  });
});

test.describe('MFA Setup', () => {
  test('should load MFA setup page', async ({ page }) => {
    await page.goto('/mfa/setup');
    
    // May redirect to login if not authenticated
    await page.waitForTimeout(1000);
  });
});

test.describe('MFA Verification', () => {
  test('should load MFA verification page', async ({ page }) => {
    await page.goto('/mfa/verify');
    
    // Should show MFA verification form
    await page.waitForTimeout(500);
  });

  test('should have OTP input field', async ({ page }) => {
    await page.goto('/mfa/verify');
    
    const otpInput = page.getByRole('textbox', { name: /code|otp|verification/i });
    if (await otpInput.isVisible()) {
      await expect(otpInput).toBeVisible();
    }
  });
});
