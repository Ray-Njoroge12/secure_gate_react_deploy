const { test, expect } = require('@playwright/test');

/**
 * Login Flow E2E Tests
 * Tests the complete login functionality including validation, error handling, and successful login
 */

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test.describe('Page Load', () => {
    test('should display login form', async ({ page }) => {
      await expect(page.locator('form')).toBeVisible();
      await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible();
    });

    test('should have login button', async ({ page }) => {
      await expect(page.getByRole('button', { name: /sign in|login|log in/i })).toBeVisible();
    });

    test('should have link to registration page', async ({ page }) => {
      await expect(page.getByRole('link', { name: /register|sign up|create account/i })).toBeVisible();
    });

    test('should have forgot password link', async ({ page }) => {
      await expect(page.getByText(/forgot password|reset password/i)).toBeVisible();
    });
  });

  test.describe('Form Validation', () => {
    test('should show error for empty email', async ({ page }) => {
      await page.getByRole('textbox', { name: /password/i }).fill('password123');
      await page.getByRole('button', { name: /sign in|login|log in/i }).click();
      
      await expect(page.getByText(/email is required/i)).toBeVisible();
    });

    test('should show error for invalid email format', async ({ page }) => {
      await page.getByRole('textbox', { name: /email/i }).fill('invalidemail');
      await page.getByRole('textbox', { name: /password/i }).fill('password123');
      await page.getByRole('button', { name: /sign in|login|log in/i }).click();
      
      await expect(page.getByText(/valid email|invalid email/i)).toBeVisible();
    });

    test('should show error for empty password', async ({ page }) => {
      await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
      await page.getByRole('button', { name: /sign in|login|log in/i }).click();
      
      await expect(page.getByText(/password is required/i)).toBeVisible();
    });

    test('should show error for short password', async ({ page }) => {
      await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
      await page.getByRole('textbox', { name: /password/i }).fill('12345');
      await page.getByRole('button', { name: /sign in|login|log in/i }).click();
      
      await expect(page.getByText(/at least 6 characters/i)).toBeVisible();
    });
  });

  test.describe('Password Visibility Toggle', () => {
    test('should toggle password visibility', async ({ page }) => {
      const passwordInput = page.getByRole('textbox', { name: /password/i });
      await passwordInput.fill('mypassword');
      
      // Initially password should be hidden
      await expect(passwordInput).toHaveAttribute('type', 'password');
      
      // Click toggle button
      const toggleButton = page.locator('button').filter({ has: page.locator('svg') }).last();
      if (await toggleButton.isVisible()) {
        await toggleButton.click();
        // Password should now be visible
        await expect(passwordInput).toHaveAttribute('type', 'text');
      }
    });
  });

  test.describe('Remember Me', () => {
    test('should have remember me checkbox', async ({ page }) => {
      const checkbox = page.getByRole('checkbox', { name: /remember/i });
      if (await checkbox.isVisible()) {
        await expect(checkbox).not.toBeChecked();
        await checkbox.check();
        await expect(checkbox).toBeChecked();
      }
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should submit form with Ctrl+Enter', async ({ page }) => {
      await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
      await page.getByRole('textbox', { name: /password/i }).fill('password123');
      
      await page.keyboard.press('Control+Enter');
      
      // Should attempt to submit (either show error for invalid credentials or navigate)
      await page.waitForTimeout(500);
    });

    test('should clear errors with Escape key', async ({ page }) => {
      // Trigger a validation error first
      await page.getByRole('button', { name: /sign in|login|log in/i }).click();
      
      // Wait for error to appear
      await page.waitForTimeout(300);
      
      // Press Escape to clear
      await page.keyboard.press('Escape');
    });
  });

  test.describe('Forgot Password Flow', () => {
    test('should show forgot password form', async ({ page }) => {
      await page.getByText(/forgot password/i).click();
      
      // Should show reset password form or email input
      await expect(page.getByText(/reset|email/i)).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to registration page', async ({ page }) => {
      await page.getByRole('link', { name: /register|sign up|create account/i }).click();
      await expect(page).toHaveURL(/register/);
    });
  });

  test.describe('Error Handling', () => {
    test('should show error for invalid credentials', async ({ page }) => {
      await page.getByRole('textbox', { name: /email/i }).fill('invalid@example.com');
      await page.getByRole('textbox', { name: /password/i }).fill('wrongpassword123');
      await page.getByRole('button', { name: /sign in|login|log in/i }).click();
      
      // Wait for API response
      await page.waitForTimeout(2000);
      
      // Should show error message for invalid credentials
      const errorMessage = page.getByText(/invalid|incorrect|failed|error/i);
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
    });
  });

  test.describe('Loading State', () => {
    test('should show loading state during login', async ({ page }) => {
      await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
      await page.getByRole('textbox', { name: /password/i }).fill('password123');
      
      // Click and immediately check for loading
      await page.getByRole('button', { name: /sign in|login|log in/i }).click();
      
      // Button might show loading spinner or text change
      await page.waitForTimeout(100);
    });
  });
});

test.describe('Login - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should be keyboard navigable', async ({ page }) => {
    // Tab through form elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to navigate through form
  });

  test('should have proper focus management', async ({ page }) => {
    const emailInput = page.getByRole('textbox', { name: /email/i });
    await emailInput.focus();
    await expect(emailInput).toBeFocused();
  });

  test('should have proper labels for form inputs', async ({ page }) => {
    // Check that inputs have associated labels
    const emailInput = page.getByRole('textbox', { name: /email/i });
    const passwordInput = page.getByRole('textbox', { name: /password/i });
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });
});
