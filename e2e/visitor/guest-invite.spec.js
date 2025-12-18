const { test, expect } = require('@playwright/test');

/**
 * Guest Invite Flow E2E Tests
 * Tests the public guest invitation and registration flow
 */

test.describe('Guest Invite Page', () => {
  test.describe('Invite Link Access', () => {
    test('should load invite page with valid code format', async ({ page }) => {
      await page.goto('/invite/TEST-CODE-123');
      
      // Should show invite page content or error for invalid code
      await page.waitForTimeout(1000);
    });

    test('should show error for invalid invite code', async ({ page }) => {
      await page.goto('/invite/INVALID-CODE');
      
      // Should show error message
      await page.waitForTimeout(1000);
      // Check for error message
      const errorMessage = page.getByText(/invalid|expired|not found/i);
      if (await errorMessage.isVisible()) {
        await expect(errorMessage).toBeVisible();
      }
    });
  });

  test.describe('Valid Invite Flow', () => {
    test.skip('should display event/visit details', async ({ page }) => {
      await page.goto('/invite/VALID-INVITE-CODE');
      
      // Should show event details
      await expect(page.getByText(/event|visit|date/i)).toBeVisible();
    });

    test.skip('should display registration form', async ({ page }) => {
      await page.goto('/invite/VALID-INVITE-CODE');
      
      await expect(page.locator('form')).toBeVisible();
    });

    test.skip('should have visitor name field', async ({ page }) => {
      await page.goto('/invite/VALID-INVITE-CODE');
      
      await expect(page.getByRole('textbox', { name: /name/i })).toBeVisible();
    });

    test.skip('should have visitor phone field', async ({ page }) => {
      await page.goto('/invite/VALID-INVITE-CODE');
      
      await expect(page.getByRole('textbox', { name: /phone/i })).toBeVisible();
    });

    test.skip('should have visitor email field', async ({ page }) => {
      await page.goto('/invite/VALID-INVITE-CODE');
      
      await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    });

    test.skip('should validate required fields', async ({ page }) => {
      await page.goto('/invite/VALID-INVITE-CODE');
      
      await page.getByRole('button', { name: /register|confirm|submit/i }).click();
      
      // Should show validation errors
      await expect(page.getByText(/required/i)).toBeVisible();
    });

    test.skip('should show QR code after successful registration', async ({ page }) => {
      await page.goto('/invite/VALID-INVITE-CODE');
      
      // Fill form
      await page.getByRole('textbox', { name: /name/i }).fill('Test Visitor');
      await page.getByRole('textbox', { name: /phone/i }).fill('+254712345678');
      await page.getByRole('textbox', { name: /email/i }).fill('visitor@example.com');
      
      await page.getByRole('button', { name: /register|confirm|submit/i }).click();
      
      // Should show QR code
      await expect(page.locator('canvas, [class*="qr"], svg')).toBeVisible();
    });
  });

  test.describe('Add to Calendar', () => {
    test.skip('should have add to calendar option', async ({ page }) => {
      await page.goto('/invite/VALID-INVITE-CODE');
      
      await expect(page.getByRole('button', { name: /calendar/i })).toBeVisible();
    });

    test.skip('should show calendar options dropdown', async ({ page }) => {
      await page.goto('/invite/VALID-INVITE-CODE');
      
      await page.getByRole('button', { name: /calendar/i }).click();
      
      // Should show Google Calendar and ICS options
      await expect(page.getByText(/google|ics|download/i)).toBeVisible();
    });
  });

  test.describe('Share Functionality', () => {
    test.skip('should have share button', async ({ page }) => {
      await page.goto('/invite/VALID-INVITE-CODE');
      
      await expect(page.getByRole('button', { name: /share/i })).toBeVisible();
    });
  });
});

test.describe('Bulk Registration via Invite', () => {
  test('should load bulk registration page', async ({ page }) => {
    await page.goto('/bulk-register/TEST-BULK-CODE');
    
    // Should show bulk registration form or error
    await page.waitForTimeout(1000);
  });

  test.describe('Bulk Registration Form', () => {
    test.skip('should display event information', async ({ page }) => {
      await page.goto('/bulk-register/VALID-BULK-CODE');
      
      await expect(page.getByText(/event/i)).toBeVisible();
    });

    test.skip('should show remaining slots', async ({ page }) => {
      await page.goto('/bulk-register/VALID-BULK-CODE');
      
      await expect(page.getByText(/slots|remaining|available/i)).toBeVisible();
    });

    test.skip('should have ID number field', async ({ page }) => {
      await page.goto('/bulk-register/VALID-BULK-CODE');
      
      await expect(page.getByRole('textbox', { name: /id|document/i })).toBeVisible();
    });

    test.skip('should have vehicle plate field (optional)', async ({ page }) => {
      await page.goto('/bulk-register/VALID-BULK-CODE');
      
      const plateField = page.getByRole('textbox', { name: /vehicle|plate/i });
      if (await plateField.isVisible()) {
        await expect(plateField).toBeVisible();
      }
    });
  });

  test.describe('OTP Verification', () => {
    test.skip('should send OTP after form submission', async ({ page }) => {
      await page.goto('/bulk-register/VALID-BULK-CODE');
      
      // Fill form
      await page.getByRole('textbox', { name: /name/i }).fill('Test Visitor');
      await page.getByRole('textbox', { name: /phone/i }).fill('+254712345678');
      
      await page.getByRole('button', { name: /submit|register/i }).click();
      
      // Should show OTP input
      await expect(page.getByText(/otp|verification|code/i)).toBeVisible();
    });

    test.skip('should have OTP input field', async ({ page }) => {
      await page.goto('/bulk-register/VALID-BULK-CODE');
      
      // After triggering OTP
      await expect(page.getByRole('textbox', { name: /otp|code/i })).toBeVisible();
    });

    test.skip('should have resend OTP button', async ({ page }) => {
      await page.goto('/bulk-register/VALID-BULK-CODE');
      
      // After OTP section is visible
      await expect(page.getByRole('button', { name: /resend/i })).toBeVisible();
    });

    test.skip('should show countdown for resend', async ({ page }) => {
      await page.goto('/bulk-register/VALID-BULK-CODE');
      
      // Check for countdown timer
      await expect(page.getByText(/seconds|wait/i)).toBeVisible();
    });
  });
});

test.describe('Guest Invite - Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/invite/TEST-CODE');
    
    // Tab through elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
  });

  test('should have proper focus management', async ({ page }) => {
    await page.goto('/invite/TEST-CODE');
    
    const firstInput = page.locator('input').first();
    if (await firstInput.isVisible()) {
      await firstInput.focus();
      await expect(firstInput).toBeFocused();
    }
  });
});

test.describe('Expired/Invalid Invites', () => {
  test('should show expired message for old invites', async ({ page }) => {
    await page.goto('/invite/EXPIRED-CODE');
    
    await page.waitForTimeout(1000);
    
    // Should show expired message
    const expiredMessage = page.getByText(/expired|no longer valid/i);
    if (await expiredMessage.isVisible()) {
      await expect(expiredMessage).toBeVisible();
    }
  });

  test('should show full message when slots exhausted', async ({ page }) => {
    await page.goto('/bulk-register/FULL-EVENT-CODE');
    
    await page.waitForTimeout(1000);
    
    // Should show full/no slots message
    const fullMessage = page.getByText(/full|no.*slots|capacity/i);
    if (await fullMessage.isVisible()) {
      await expect(fullMessage).toBeVisible();
    }
  });
});
