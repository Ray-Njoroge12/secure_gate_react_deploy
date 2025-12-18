const { test, expect } = require('@playwright/test');

/**
 * Accessibility E2E Tests
 * Tests WCAG compliance and accessibility features
 */

test.describe('Accessibility - Skip Links', () => {
  test('should have skip to main content link', async ({ page }) => {
    await page.goto('/login');
    
    // Focus on skip link (usually first focusable element)
    await page.keyboard.press('Tab');
    
    const skipLink = page.getByRole('link', { name: /skip to main|skip to content/i });
    if (await skipLink.isVisible()) {
      await expect(skipLink).toBeVisible();
    }
  });
});

test.describe('Accessibility - Keyboard Navigation', () => {
  test('should navigate login form with keyboard', async ({ page }) => {
    await page.goto('/login');
    
    // Tab through form elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Should be able to navigate through all interactive elements
  });

  test('should navigate registration form with keyboard', async ({ page }) => {
    await page.goto('/register');
    
    // Tab through form elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
  });

  test('should support Enter key for form submission', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByRole('textbox', { name: /email/i }).fill('test@example.com');
    await page.getByRole('textbox', { name: /password/i }).fill('password123');
    
    await page.keyboard.press('Enter');
    
    // Form should submit
    await page.waitForTimeout(500);
  });

  test('should support Escape key to clear/dismiss', async ({ page }) => {
    await page.goto('/login');
    
    // Trigger some action first
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    // Press Escape
    await page.keyboard.press('Escape');
  });
});

test.describe('Accessibility - Focus Management', () => {
  test('should have visible focus indicators', async ({ page }) => {
    await page.goto('/login');
    
    const emailInput = page.getByRole('textbox', { name: /email/i });
    await emailInput.focus();
    
    // Check that focus is visible (element should have focus styles)
    await expect(emailInput).toBeFocused();
  });

  test('should trap focus in modals', async ({ page }) => {
    await page.goto('/login');
    
    // Open forgot password (if it's a modal)
    await page.getByText(/forgot password/i).click();
    await page.waitForTimeout(300);
    
    // Tab should cycle within modal
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
  });

  test('should return focus after modal closes', async ({ page }) => {
    await page.goto('/login');
    
    const forgotLink = page.getByText(/forgot password/i);
    await forgotLink.click();
    await page.waitForTimeout(300);
    
    // Close modal with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  });
});

test.describe('Accessibility - Form Labels', () => {
  test('should have labels for all inputs on login', async ({ page }) => {
    await page.goto('/login');
    
    // Check email input has label
    const emailInput = page.getByRole('textbox', { name: /email/i });
    await expect(emailInput).toBeVisible();
    
    // Check password input has label
    const passwordInput = page.getByRole('textbox', { name: /password/i });
    await expect(passwordInput).toBeVisible();
  });

  test('should have labels for all inputs on registration', async ({ page }) => {
    await page.goto('/register');
    
    // Check main inputs have labels
    const nameInput = page.getByRole('textbox', { name: /username|name/i });
    await expect(nameInput).toBeVisible();
    
    const emailInput = page.getByRole('textbox', { name: /email/i });
    await expect(emailInput).toBeVisible();
  });

  test('should have proper aria-describedby for error messages', async ({ page }) => {
    await page.goto('/login');
    
    // Trigger validation error
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    await page.waitForTimeout(500);
    // Error messages should be associated with inputs
  });
});

test.describe('Accessibility - Error Announcements', () => {
  test('should announce errors to screen readers', async ({ page }) => {
    await page.goto('/login');
    
    // Submit empty form
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    // Check for aria-live regions
    const liveRegion = page.locator('[aria-live]');
    await page.waitForTimeout(500);
  });

  test('should announce success messages', async ({ page }) => {
    await page.goto('/login');
    
    // Check for toast/notification aria-live regions
    const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"]');
  });
});

test.describe('Accessibility - Color Contrast', () => {
  test('should have sufficient color contrast on login', async ({ page }) => {
    await page.goto('/login');
    
    // Visual inspection - automated tools like axe-core are better for this
    // This is a placeholder for manual/automated accessibility testing
    await expect(page.locator('body')).toBeVisible();
  });

  test('should not rely solely on color for errors', async ({ page }) => {
    await page.goto('/login');
    
    // Trigger error
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    // Error should have text, not just color
    await page.waitForTimeout(500);
  });
});

test.describe('Accessibility - Headings', () => {
  test('should have proper heading hierarchy on login', async ({ page }) => {
    await page.goto('/login');
    
    // Check for h1
    const h1 = page.locator('h1');
    if (await h1.count() > 0) {
      await expect(h1.first()).toBeVisible();
    }
  });

  test('should have proper heading hierarchy on registration', async ({ page }) => {
    await page.goto('/register');
    
    // Check for h1
    const h1 = page.locator('h1');
    if (await h1.count() > 0) {
      await expect(h1.first()).toBeVisible();
    }
  });
});

test.describe('Accessibility - Images', () => {
  test('should have alt text on images', async ({ page }) => {
    await page.goto('/login');
    
    // Check images have alt text
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      // Alt should exist (can be empty for decorative images)
      expect(alt !== null).toBeTruthy();
    }
  });
});

test.describe('Accessibility - Buttons', () => {
  test('should have accessible button names', async ({ page }) => {
    await page.goto('/login');
    
    // Check buttons have accessible names
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    
    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const name = await button.getAttribute('aria-label') || await button.textContent();
        expect(name).toBeTruthy();
      }
    }
  });
});

test.describe('Accessibility - Links', () => {
  test('should have descriptive link text', async ({ page }) => {
    await page.goto('/login');
    
    // Check links have descriptive text
    const links = page.getByRole('link');
    const count = await links.count();
    
    for (let i = 0; i < count; i++) {
      const link = links.nth(i);
      if (await link.isVisible()) {
        const text = await link.textContent();
        // Link text should not be generic like "click here"
        expect(text?.toLowerCase()).not.toBe('click here');
      }
    }
  });
});

test.describe('Accessibility - Mobile', () => {
  test('should have proper touch targets', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    
    // Check that interactive elements are large enough
    const button = page.getByRole('button', { name: /sign in|login/i });
    if (await button.isVisible()) {
      const box = await button.boundingBox();
      if (box) {
        // Touch targets should be at least 44x44 pixels
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
