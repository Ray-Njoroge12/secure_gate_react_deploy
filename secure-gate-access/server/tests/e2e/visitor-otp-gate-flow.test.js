/**
 * E2E Test: Visitor pre-registers → receives OTP → enters gate
 * 
 * This test covers the complete visitor journey from pre-registration
 * to receiving OTP and successfully entering the gate.
 */

const { test, expect } = require('@playwright/test');

test.describe('Visitor OTP Gate Entry Flow', () => {
  let visitorPage;
  let guardPage;
  let visitorEmail = 'visitor-gate@test.com';
  let visitorPhone = '+254712345300';
  let inviteCode;

  test.beforeEach(async ({ browser }) => {
    visitorPage = await browser.newPage();
    guardPage = await browser.newPage();
  });

  test.afterEach(async () => {
    if (visitorPage) await visitorPage.close();
    if (guardPage) await guardPage.close();
  });

  test('Complete visitor OTP gate entry workflow', async () => {
    // Step 1: Visitor pre-registers using invite code
    await test.step('Visitor pre-registers with invite code', async () => {
      await visitorPage.goto('/invite');
      
      // Enter invite code (this would be provided by resident)
      inviteCode = 'INVITE123456'; // Test invite code
      await visitorPage.fill('[data-testid="invite-code-input"]', inviteCode);
      await visitorPage.click('[data-testid="verify-invite-button"]');
      
      // Wait for visitor registration form
      await expect(visitorPage.locator('[data-testid="visitor-registration-form"]')).toBeVisible();
      
      // Fill visitor details
      await visitorPage.fill('[data-testid="visitor-name-input"]', 'Gate Test Visitor');
      await visitorPage.fill('[data-testid="visitor-email-input"]', visitorEmail);
      await visitorPage.fill('[data-testid="visitor-phone-input"]', visitorPhone);
      await visitorPage.fill('[data-testid="visitor-id-number-input"]', '12345678');
      await visitorPage.selectOption('[data-testid="visitor-id-type-select"]', 'national_id');
      
      // Upload ID document (simulate file upload)
      const fileInput = visitorPage.locator('[data-testid="id-document-input"]');
      await fileInput.setInputFiles({
        name: 'test-id.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('fake-image-data')
      });
      
      await visitorPage.click('[data-testid="submit-registration-button"]');
      
      // Verify registration success
      await expect(visitorPage.locator('[data-testid="registration-success"]')).toBeVisible();
      await expect(visitorPage.locator('[data-testid="otp-sent-message"]')).toContainText('OTP sent to');
    });

    // Step 2: Visitor receives and enters OTP
    await test.step('Visitor verifies OTP', async () => {
      // Wait for OTP input form
      await expect(visitorPage.locator('[data-testid="otp-verification-form"]')).toBeVisible();
      
      // Enter OTP (in real scenario, this would come via SMS/email)
      await visitorPage.fill('[data-testid="otp-input"]', '123456');
      await visitorPage.click('[data-testid="verify-otp-button"]');
      
      // Verify OTP verification success
      await expect(visitorPage.locator('[data-testid="otp-verification-success"]')).toBeVisible();
      await expect(visitorPage.locator('[data-testid="visitor-qr-code"]')).toBeVisible();
    });

    // Step 3: Visitor arrives at gate and scans QR code
    await test.step('Visitor scans QR code at gate', async () => {
      // Navigate to gate entry page
      await visitorPage.goto('/gate-entry');
      
      // Simulate QR code scan (in real scenario, this would be done by gate system)
      const qrCodeData = await visitorPage.locator('[data-testid="visitor-qr-code"]').getAttribute('data-qr-code');
      
      // Verify QR code contains visitor information
      expect(qrCodeData).toContain(visitorEmail);
      expect(qrCodeData).toContain('Gate Test Visitor');
    });

    // Step 4: Guard verifies visitor at gate
    await test.step('Guard verifies visitor at gate', async () => {
      await guardPage.goto('/login');
      
      // Login as guard
      await guardPage.fill('[data-testid="email-input"]', 'guard@test.com');
      await guardPage.fill('[data-testid="password-input"]', 'GuardPass123!');
      await guardPage.click('[data-testid="login-button"]');
      
      // Navigate to gate verification
      await guardPage.goto('/gate-verification');
      await expect(guardPage.locator('[data-testid="gate-verification-page"]')).toBeVisible();
      
      // Enter visitor details for verification
      await guardPage.fill('[data-testid="visitor-email-search"]', visitorEmail);
      await guardPage.click('[data-testid="search-visitor-button"]');
      
      // Verify visitor details
      await expect(guardPage.locator('[data-testid="visitor-details"]')).toBeVisible();
      await expect(guardPage.locator('[data-testid="visitor-name"]')).toContainText('Gate Test Visitor');
      await expect(guardPage.locator('[data-testid="visitor-email"]')).toContainText(visitorEmail);
      await expect(guardPage.locator('[data-testid="visitor-status"]')).toContainText('Verified');
      
      // Verify visitor ID document
      await expect(guardPage.locator('[data-testid="visitor-id-document"]')).toBeVisible();
      await expect(guardPage.locator('[data-testid="visitor-id-number"]')).toContainText('12345678');
    });

    // Step 5: Guard allows visitor entry
    await test.step('Guard allows visitor entry', async () => {
      // Click allow entry button
      await guardPage.click('[data-testid="allow-entry-button"]');
      await expect(guardPage.locator('[data-testid="entry-confirmation-modal"]')).toBeVisible();
      
      // Add entry notes
      await guardPage.fill('[data-testid="entry-notes-input"]', 'Visitor verified and allowed entry');
      await guardPage.click('[data-testid="confirm-entry-button"]');
      
      // Verify entry success
      await expect(guardPage.locator('[data-testid="entry-success-message"]')).toContainText('Visitor entry recorded');
      
      // Verify visitor status updated
      await expect(guardPage.locator('[data-testid="visitor-status"]')).toContainText('On Premise');
    });

    // Step 6: Visitor checks in successfully
    await test.step('Visitor checks in successfully', async () => {
      // Return to visitor page to see check-in status
      await visitorPage.goto('/visitor-status');
      
      // Verify check-in status
      await expect(visitorPage.locator('[data-testid="check-in-status"]')).toContainText('Checked In');
      await expect(visitorPage.locator('[data-testid="entry-time"]')).toBeVisible();
      await expect(visitorPage.locator('[data-testid="gate-location"]')).toContainText('Main Gate');
    });

    // Step 7: Verify audit trail
    await test.step('Verify audit trail', async () => {
      // Check that all events are logged
      const auditEvents = [
        'visitor.pre_registered',
        'visitor.otp_sent',
        'visitor.otp_verified',
        'visitor.qr_code_generated',
        'visitor.gate_verification',
        'visitor.entry_allowed',
        'visitor.checked_in'
      ];
      
      for (const event of auditEvents) {
        await expect(visitorPage.locator(`[data-testid="audit-event-${event}"]`)).toBeVisible();
      }
    });
  });

  test('Visitor OTP flow error handling', async () => {
    await test.step('Handle invalid invite code', async () => {
      await visitorPage.goto('/invite');
      
      // Enter invalid invite code
      await visitorPage.fill('[data-testid="invite-code-input"]', 'INVALID123');
      await visitorPage.click('[data-testid="verify-invite-button"]');
      
      // Verify error message
      await expect(visitorPage.locator('[data-testid="error-message"]')).toContainText('Invalid invite code');
    });

    await test.step('Handle invalid OTP', async () => {
      await visitorPage.goto('/invite');
      
      // Use valid invite code
      await visitorPage.fill('[data-testid="invite-code-input"]', 'INVITE123456');
      await visitorPage.click('[data-testid="verify-invite-button"]');
      
      // Fill visitor details
      await visitorPage.fill('[data-testid="visitor-name-input"]', 'Test Visitor');
      await visitorPage.fill('[data-testid="visitor-email-input"]', 'test@example.com');
      await visitorPage.fill('[data-testid="visitor-phone-input"]', '+254712345999');
      await visitorPage.click('[data-testid="submit-registration-button"]');
      
      // Enter invalid OTP
      await visitorPage.fill('[data-testid="otp-input"]', '000000');
      await visitorPage.click('[data-testid="verify-otp-button"]');
      
      // Verify error message
      await expect(visitorPage.locator('[data-testid="otp-error"]')).toContainText('Invalid OTP');
    });

    await test.step('Handle OTP expiration', async () => {
      // Simulate OTP expiration by waiting or using expired OTP
      await visitorPage.fill('[data-testid="otp-input"]', '123456');
      await visitorPage.click('[data-testid="verify-otp-button"]');
      
      // Verify expiration error
      await expect(visitorPage.locator('[data-testid="otp-error"]')).toContainText('OTP expired');
    });
  });

  test('Visitor gate entry security', async () => {
    await test.step('Test unauthorized gate access', async () => {
      // Try to access gate without proper verification
      await visitorPage.goto('/gate-entry');
      
      // Should be redirected to verification page
      await expect(visitorPage.locator('[data-testid="verification-required"]')).toBeVisible();
    });

    await test.step('Test QR code security', async () => {
      // Generate QR code and verify it contains encrypted data
      await visitorPage.goto('/visitor-qr');
      
      const qrCode = visitorPage.locator('[data-testid="visitor-qr-code"]');
      await expect(qrCode).toBeVisible();
      
      // Verify QR code is not easily readable (encrypted)
      const qrData = await qrCode.getAttribute('data-qr-code');
      expect(qrData).not.toContain(visitorEmail); // Should be encrypted
    });
  });

  test('Mobile responsiveness for visitor flow', async () => {
    await test.step('Test mobile visitor registration', async () => {
      // Set mobile viewport
      await visitorPage.setViewportSize({ width: 375, height: 667 });
      
      await visitorPage.goto('/invite');
      
      // Test mobile form layout
      await expect(visitorPage.locator('[data-testid="invite-code-input"]')).toBeVisible();
      await expect(visitorPage.locator('[data-testid="verify-invite-button"]')).toBeVisible();
      
      // Test mobile navigation
      await visitorPage.fill('[data-testid="invite-code-input"]', 'INVITE123456');
      await visitorPage.click('[data-testid="verify-invite-button"]');
      
      // Verify mobile form layout
      await expect(visitorPage.locator('[data-testid="visitor-registration-form"]')).toBeVisible();
      await expect(visitorPage.locator('[data-testid="visitor-name-input"]')).toBeVisible();
    });
  });
});
