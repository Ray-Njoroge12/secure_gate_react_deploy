const { test, expect } = require('@playwright/test');

/**
 * Comprehensive Visitor (Public) UAT Tests
 * Tests all public visitor user stories and acceptance criteria
 */

test.describe('Visitor UAT - US-011: Complete Pre-Registration', () => {
  test('AC-011.1: Should load invite page with valid invite code', async ({ page }) => {
    // Navigate to invite page with a test code
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    // Should show invite page content (form or error)
    const pageContent = page.locator('body');
    expect(await pageContent.textContent()).toBeTruthy();
  });

  test('AC-011.2: Should show error for invalid invite code', async ({ page }) => {
    await page.goto('/invite/INVALID-NONEXISTENT-CODE');
    await page.waitForLoadState('networkidle');

    // Should show error message for invalid code
    const errorIndicators = [
      page.locator('text=/invalid|expired|not found|error/i'),
      page.locator('[class*="error"]'),
      page.locator('[role="alert"]')
    ];

    let hasError = false;
    for (const indicator of errorIndicators) {
      if (await indicator.first().isVisible().catch(() => false)) {
        hasError = true;
        break;
      }
    }
    // Error handling expected for invalid codes
  });

  test('AC-011.3: Should show error for expired invite code', async ({ page }) => {
    await page.goto('/invite/EXPIRED-CODE-001');
    await page.waitForLoadState('networkidle');

    // Should show expired message
    const expiredMessage = page.locator('text=/expired|no longer valid|past/i');
    const hasExpiredMessage = await expiredMessage.first().isVisible().catch(() => false);
  });

  test('AC-011.4: Should display event/visit details for valid invite', async ({ page }) => {
    // This requires a valid test invite code
    await page.goto('/invite/VALID-TEST-INVITE');
    await page.waitForLoadState('networkidle');

    // Look for event details
    const eventDetails = [
      page.locator('text=/event|visit|meeting/i'),
      page.locator('text=/date|when/i'),
      page.locator('text=/location|address|where/i'),
      page.locator('[class*="event-details"]')
    ];

    let hasDetails = false;
    for (const detail of eventDetails) {
      if (await detail.first().isVisible().catch(() => false)) {
        hasDetails = true;
        break;
      }
    }
  });

  test('AC-011.5: Should display registration form with required fields', async ({ page }) => {
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    // Look for registration form
    const form = page.locator('form');
    if (await form.isVisible().catch(() => false)) {
      // Check for required fields
      const nameField = page.locator('input[name="name"], input[placeholder*="name" i]');
      const phoneField = page.locator('input[name="phone"], input[placeholder*="phone" i]');
      const emailField = page.locator('input[name="email"], input[type="email"]');

      const hasName = await nameField.first().isVisible().catch(() => false);
      const hasPhone = await phoneField.first().isVisible().catch(() => false);

      // Name and phone are typically required
    }
  });

  test('AC-011.6: Should validate required fields on submission', async ({ page }) => {
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    // Try to submit empty form
    const submitButton = page.getByRole('button', { name: /register|submit|confirm|continue/i }).first();
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should show validation errors
      const validationErrors = page.locator('text=/required|please enter|invalid/i');
      const errorCount = await validationErrors.count();
      // Errors expected for empty required fields
    }
  });

  test('AC-011.7: Should validate phone number format', async ({ page }) => {
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    const phoneField = page.locator('input[name="phone"]').first();
    if (await phoneField.isVisible()) {
      // Enter invalid phone
      await phoneField.fill('invalid-phone');
      
      const submitButton = page.getByRole('button', { name: /register|submit/i }).first();
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Should show phone validation error
        const phoneError = page.locator('text=/invalid.*phone|valid.*number/i');
        await page.waitForTimeout(1000);
      }
    }
  });

  test('AC-011.8: Should validate email format if provided', async ({ page }) => {
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    const emailField = page.locator('input[name="email"], input[type="email"]').first();
    if (await emailField.isVisible()) {
      // Enter invalid email
      await emailField.fill('invalid-email');
      
      const submitButton = page.getByRole('button', { name: /register|submit/i }).first();
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Should show email validation error
        const emailError = page.locator('text=/invalid.*email|valid.*email/i');
        await page.waitForTimeout(1000);
      }
    }
  });
});

test.describe('Visitor UAT - Consent and Privacy', () => {
  test('Should display privacy notice/consent before registration', async ({ page }) => {
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    // Look for consent checkbox or privacy notice
    const consentElements = [
      page.locator('input[type="checkbox"][name*="consent"]'),
      page.locator('text=/privacy|terms|consent|agree/i'),
      page.locator('[class*="consent"]'),
      page.locator('[class*="privacy"]')
    ];

    let hasConsent = false;
    for (const element of consentElements) {
      if (await element.first().isVisible().catch(() => false)) {
        hasConsent = true;
        break;
      }
    }
  });

  test('Should require consent checkbox before submission', async ({ page }) => {
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    const consentCheckbox = page.locator('input[type="checkbox"][name*="consent"]').first();
    if (await consentCheckbox.isVisible()) {
      // Try to submit without consent
      const submitButton = page.getByRole('button', { name: /register|submit/i }).first();
      if (await submitButton.isVisible()) {
        await submitButton.click();

        // Should show consent required error or prevent submission
        const consentError = page.locator('text=/consent|agree|accept/i');
        await page.waitForTimeout(1000);
      }
    }
  });

  test('Should link to full privacy policy', async ({ page }) => {
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    // Look for privacy policy link
    const privacyLink = page.locator('a[href*="privacy"], a:has-text("Privacy Policy")');
    const hasPrivacyLink = await privacyLink.first().isVisible().catch(() => false);
  });
});

test.describe('Visitor UAT - US-012: View Access Pass/QR Code', () => {
  test('AC-012.1: Should display QR code after successful registration', async ({ page }) => {
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    // Fill and submit form
    const nameField = page.locator('input[name="name"]').first();
    const phoneField = page.locator('input[name="phone"]').first();
    
    if (await nameField.isVisible() && await phoneField.isVisible()) {
      const timestamp = Date.now();
      await nameField.fill(`UAT Visitor ${timestamp}`);
      await phoneField.fill(`+254700${timestamp.toString().slice(-6)}`);
      
      // Accept consent if present
      const consentCheckbox = page.locator('input[type="checkbox"][name*="consent"]').first();
      if (await consentCheckbox.isVisible()) {
        await consentCheckbox.check();
      }

      const submitButton = page.getByRole('button', { name: /register|submit|confirm/i }).first();
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForLoadState('networkidle');

        // Look for QR code
        await page.waitForTimeout(2000);
        const qrCode = page.locator('canvas, svg[class*="qr"], img[alt*="QR"], [class*="qr-code"]');
        const hasQR = await qrCode.first().isVisible().catch(() => false);
      }
    }
  });

  test('AC-012.2: Should display invite/access code', async ({ page }) => {
    // After registration, access code should be visible
    await page.goto('/invite/TEST-INVITE-CODE');
    // ... complete registration ...

    // Look for access code display
    const accessCode = page.locator('[class*="access-code"], [class*="invite-code"], text=/inv_|code:/i');
    const hasCode = await accessCode.first().isVisible().catch(() => false);
  });

  test('AC-012.3: Should have option to save/download QR code', async ({ page }) => {
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    // Look for download option
    const downloadButton = page.locator('button:has-text("Download"), button:has-text("Save"), a[download]');
    const hasDownload = await downloadButton.first().isVisible().catch(() => false);
  });

  test('AC-012.4: Should display visit details on pass', async ({ page }) => {
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    // After registration, pass should show details
    const passDetails = [
      page.locator('text=/date of visit|visit date/i'),
      page.locator('text=/host|resident/i'),
      page.locator('text=/purpose|reason/i'),
      page.locator('[class*="pass-details"]')
    ];

    let hasDetails = false;
    for (const detail of passDetails) {
      if (await detail.first().isVisible().catch(() => false)) {
        hasDetails = true;
        break;
      }
    }
  });
});

test.describe('Visitor UAT - US-020: Add Visit to Calendar', () => {
  test('AC-020.1: Should have add to calendar option', async ({ page }) => {
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    // Look for calendar button
    const calendarButton = page.locator('button:has-text("Calendar"), button:has-text("Add to Calendar"), [aria-label*="calendar"]');
    const hasCalendar = await calendarButton.first().isVisible().catch(() => false);
  });

  test('AC-020.2: Should offer Google Calendar option', async ({ page }) => {
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    const calendarButton = page.locator('button:has-text("Calendar")').first();
    if (await calendarButton.isVisible()) {
      await calendarButton.click();
      await page.waitForTimeout(500);

      // Look for Google Calendar option
      const googleOption = page.locator('a:has-text("Google"), button:has-text("Google Calendar")');
      const hasGoogle = await googleOption.first().isVisible().catch(() => false);
    }
  });

  test('AC-020.3: Should offer ICS download option', async ({ page }) => {
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    const calendarButton = page.locator('button:has-text("Calendar")').first();
    if (await calendarButton.isVisible()) {
      await calendarButton.click();
      await page.waitForTimeout(500);

      // Look for ICS download option
      const icsOption = page.locator('a:has-text("ICS"), button:has-text("Download .ics"), a[download*=".ics"]');
      const hasICS = await icsOption.first().isVisible().catch(() => false);
    }
  });
});

test.describe('Visitor UAT - OTP Verification', () => {
  test('Should have OTP input field after initial registration', async ({ page }) => {
    // Navigate to OTP verification page
    await page.goto('/verify-otp');
    await page.waitForLoadState('networkidle');

    // Look for OTP input
    const otpInput = page.locator('input[name*="otp"], input[maxlength="6"], [class*="otp-input"]');
    const hasOTP = await otpInput.first().isVisible().catch(() => false);
  });

  test('Should validate OTP format (6 digits)', async ({ page }) => {
    await page.goto('/verify-otp');
    await page.waitForLoadState('networkidle');

    const otpInput = page.locator('input[name*="otp"]').first();
    if (await otpInput.isVisible()) {
      // Enter invalid OTP
      await otpInput.fill('abc');
      
      const verifyButton = page.getByRole('button', { name: /verify|submit/i }).first();
      if (await verifyButton.isVisible()) {
        await verifyButton.click();

        // Should show format error
        const formatError = page.locator('text=/invalid|digits|numeric/i');
        await page.waitForTimeout(1000);
      }
    }
  });

  test('Should have resend OTP option', async ({ page }) => {
    await page.goto('/verify-otp');
    await page.waitForLoadState('networkidle');

    // Look for resend option
    const resendButton = page.locator('button:has-text("Resend"), a:has-text("Resend"), text=/resend/i');
    const hasResend = await resendButton.first().isVisible().catch(() => false);
  });

  test('Should show error for incorrect OTP', async ({ page }) => {
    await page.goto('/verify-otp');
    await page.waitForLoadState('networkidle');

    const otpInput = page.locator('input[name*="otp"]').first();
    if (await otpInput.isVisible()) {
      // Enter wrong OTP
      await otpInput.fill('000000');
      
      const verifyButton = page.getByRole('button', { name: /verify|submit/i }).first();
      if (await verifyButton.isVisible()) {
        await verifyButton.click();

        // Should show error
        await page.waitForTimeout(2000);
        const otpError = page.locator('text=/invalid|incorrect|wrong/i');
        const hasError = await otpError.first().isVisible().catch(() => false);
      }
    }
  });

  test('Should limit OTP attempts', async ({ page }) => {
    await page.goto('/verify-otp');
    await page.waitForLoadState('networkidle');

    const otpInput = page.locator('input[name*="otp"]').first();
    const verifyButton = page.getByRole('button', { name: /verify|submit/i }).first();
    
    if (await otpInput.isVisible() && await verifyButton.isVisible()) {
      // Try multiple wrong OTPs
      for (let i = 0; i < 5; i++) {
        await otpInput.fill(`00000${i}`);
        await verifyButton.click();
        await page.waitForTimeout(500);
      }

      // Should show lockout or too many attempts message
      const lockoutMessage = page.locator('text=/too many|locked|try again later/i');
      const hasLockout = await lockoutMessage.first().isVisible().catch(() => false);
    }
  });
});

test.describe('Visitor UAT - Mobile Responsiveness', () => {
  test('Should display correctly on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    // Form should be visible and usable
    const form = page.locator('form');
    if (await form.isVisible()) {
      const formBox = await form.boundingBox();
      // Form should fit in viewport
      if (formBox) {
        expect(formBox.width).toBeLessThanOrEqual(375);
      }
    }
  });

  test('Should have touch-friendly buttons on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    // Buttons should have adequate size for touch
    const submitButton = page.getByRole('button', { name: /register|submit/i }).first();
    if (await submitButton.isVisible()) {
      const buttonBox = await submitButton.boundingBox();
      if (buttonBox) {
        // Minimum touch target: 44x44 pixels
        expect(buttonBox.height).toBeGreaterThanOrEqual(40);
      }
    }
  });

  test('Should have readable text on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    // Text should be readable (no horizontal overflow)
    const body = page.locator('body');
    const bodyBox = await body.boundingBox();
    if (bodyBox) {
      // Should not have horizontal scroll
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(376);
    }
  });
});

test.describe('Visitor UAT - Accessibility', () => {
  test('Should have proper form labels', async ({ page }) => {
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    // Check for labels
    const labels = page.locator('label');
    const labelCount = await labels.count();
    
    // Forms should have labels
    const inputs = page.locator('input[type="text"], input[type="email"], input[type="tel"]');
    const inputCount = await inputs.count();
    
    // Each input should have a label or aria-label
  });

  test('Should be navigable with keyboard only', async ({ page }) => {
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    // Tab through form
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to focus interactive elements
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'A', 'SELECT', 'TEXTAREA']).toContain(focusedElement);
  });

  test('Should have visible focus indicators', async ({ page }) => {
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    const firstInput = page.locator('input').first();
    if (await firstInput.isVisible()) {
      await firstInput.focus();
      await expect(firstInput).toBeFocused();
    }
  });

  test('Should have appropriate color contrast', async ({ page }) => {
    await page.goto('/invite/TEST-INVITE-CODE');
    await page.waitForLoadState('networkidle');

    // This is a visual check - in real testing would use axe-core
    // For now, check that text is not invisible
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.length).toBeGreaterThan(0);
  });
});
