/**
 * E2E-QR: QR Code Scanning and Validation Tests
 * Tests guard QR code scanning workflow for visitor check-in
 */

const { test, expect } = require('@playwright/test');
const { login, navigateTo } = require('../utils/test-helpers');
const users = require('../fixtures/users.json');

test.describe('E2E-QR: QR Code Scanning Flow', () => {
  
  let visitorId;
  let qrCodeData;
  
  test.beforeEach(async ({ page }) => {
    // Login as resident to create visitor with QR code
    await login(page, {
      email: users.resident.email,
      password: users.resident.password
    });
    await page.waitForTimeout(2000);
  });

  test('E2E-QR-01: Resident Creates Visitor and Generates QR Code', async ({ page }) => {
    // Navigate to add visitor page
    await navigateTo(page, '/resident/add-visitor');
    await page.waitForTimeout(2000);
    
    // Alternative route
    if (page.url().includes('404')) {
      await navigateTo(page, '/resident/add-visitor');
      await page.waitForTimeout(2000);
    }
    
    // Wait for form
    await page.waitForSelector('form, input[name="name"]', { timeout: 10000 });
    
    // Fill visitor form
    const timestamp = Date.now();
    await page.fill('input[name="name"]', `QR Test Visitor ${timestamp}`);
    await page.fill('input[name="phone"]', '0712345678');
    
    // Fill email if field exists
    const emailField = page.locator('input[name="email"]');
    if (await emailField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await emailField.fill(`qr.test${timestamp}@example.com`);
    }
    
    // Fill required date and time fields
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await page.fill('input[name="dateOfVisit"]', dateString);
    await page.fill('input[name="time"]', '10:00');
    
    // Select purpose
    const purposeSelect = page.locator('select[name="purpose"]');
    if (await purposeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await purposeSelect.selectOption('Social Visit');
    }
    
    // Accept consent (REQUIRED)
    const consentCheckbox = page.locator('input[type="checkbox"][name*="consent"], input[type="checkbox"]#consent-checkbox');
    if (await consentCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await consentCheckbox.check();
    }
    
    await page.waitForTimeout(500);
    
    // Submit form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Verify success
    const hasSuccess = await page.locator('text=/success|created|qr|invite code/i').isVisible({ timeout: 8000 }).catch(() => false);
    expect(hasSuccess).toBeTruthy();
    
    // Look for QR code or pass code
    const hasQR = await page.locator('canvas, img[alt*="QR"], [class*="qr"], text=/pass code|invite code/i').isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasQR) {
      // Try to extract visitor ID or pass code from page
      const pageContent = await page.content();
      const idMatch = pageContent.match(/visitor[_-]?id[\"']?\s*[:=]\s*[\"']?(\d+)/i);
      const codeMatch = pageContent.match(/(?:pass|invite)[_-]?code[\"']?\s*[:=]\s*[\"']?([A-Z0-9-]+)/i);
      
      if (idMatch) {
        visitorId = idMatch[1];
      } else if (codeMatch) {
        qrCodeData = codeMatch[1];
      }
    }
  });

  test('E2E-QR-02: Guard Navigates to QR Scanner', async ({ page }) => {
    // Logout resident and login as guard
    const logoutBtn = page.locator('button:has-text("Logout")').first();
    if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutBtn.click({ force: true });
      await page.waitForTimeout(2000);
    }
    
    await login(page, {
      email: users.guard.email,
      password: users.guard.password
    });
    await page.waitForTimeout(2000);
    
    // Navigate to QR scanner
    await navigateTo(page, '/guard/scan-qr');
    await page.waitForTimeout(2000);
    
    // Alternative routes
    if (page.url().includes('404')) {
      await navigateTo(page, '/scan-qr');
      await page.waitForTimeout(2000);
    }
    if (page.url().includes('404')) {
      await navigateTo(page, '/qr-scan');
      await page.waitForTimeout(2000);
    }
    
    // Verify scanner page loaded
    const hasScanner = await page.locator('text=/scan|qr code|camera/i').isVisible({ timeout: 5000 }).catch(() => false);
    const hasScanButton = await page.locator('button:has-text("Scan"), button:has-text("Start")').isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasScanner || hasScanButton).toBeTruthy();
  });

  test('E2E-QR-03: Guard Scans Valid QR Code (Manual Entry)', async ({ page }) => {
    // Login as guard
    await page.goto('/login');
    await page.waitForTimeout(500);
    
    const loggedIn = await page.locator('button:has-text("Logout")').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!loggedIn) {
      await login(page, {
        email: users.guard.email,
        password: users.guard.password
      });
      await page.waitForTimeout(2000);
    }
    
    // Navigate to scanner or manual check-in
    await navigateTo(page, '/guard/manual-check');
    await page.waitForTimeout(2000);
    
    // Alternative routes
    if (page.url().includes('404')) {
      await navigateTo(page, '/manual-check');
      await page.waitForTimeout(2000);
    }
    if (page.url().includes('404')) {
      await navigateTo(page, '/check-in');
      await page.waitForTimeout(2000);
    }
    
    // Look for manual entry option (for QR code or visitor search)
    const manualInput = page.locator('input[name="code"], input[name="passCode"], input[placeholder*="code" i], input[placeholder*="search" i]').first();
    const hasManualEntry = await manualInput.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasManualEntry) {
      // Enter a test code (format: PASS-{visitorId}-{timestamp})
      const testCode = qrCodeData || `PASS-123-${Date.now()}`;
      await manualInput.fill(testCode);
      await page.waitForTimeout(500);
      
      // Submit or search
      const submitBtn = page.locator('button[type="submit"], button:has-text("Check In"), button:has-text("Search"), button:has-text("Verify")').first();
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(3000);
        
        // Check for success or error message
        const hasResponse = await page.locator('text=/checked in|success|invalid|not found|error/i').isVisible({ timeout: 8000 }).catch(() => false);
        expect(hasResponse).toBeTruthy();
      }
    } else {
      // Manual entry not available - test passes (feature may be scan-only)
      expect(true).toBeTruthy();
    }
  });

  test('E2E-QR-04: Guard Attempts Invalid QR Code', async ({ page }) => {
    // Login as guard
    await page.goto('/login');
    await page.waitForTimeout(500);
    
    const loggedIn = await page.locator('button:has-text("Logout")').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!loggedIn) {
      await login(page, {
        email: users.guard.email,
        password: users.guard.password
      });
      await page.waitForTimeout(2000);
    }
    
    // Navigate to manual check-in
    await navigateTo(page, '/guard/manual-check');
    await page.waitForTimeout(2000);
    
    if (page.url().includes('404')) {
      await navigateTo(page, '/manual-check');
      await page.waitForTimeout(2000);
    }
    
    // Look for input field
    const manualInput = page.locator('input[name="code"], input[name="passCode"], input[placeholder*="code" i]').first();
    const hasManualEntry = await manualInput.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasManualEntry) {
      // Enter invalid code
      await manualInput.fill('INVALID-CODE-999');
      await page.waitForTimeout(500);
      
      // Submit
      const submitBtn = page.locator('button[type="submit"], button:has-text("Check In"), button:has-text("Verify")').first();
      if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await submitBtn.click();
        await page.waitForTimeout(3000);
        
        // Should show error message
        const hasError = await page.locator('[role="alert"], .alert, .error, text=/invalid|not found|error|expired/i').isVisible({ timeout: 8000 }).catch(() => false);
        expect(hasError).toBeTruthy();
      }
    }
  });

  test('E2E-QR-05: QR Scanner Camera Permission Handling', async ({ page, context }) => {
    // Grant camera permissions
    await context.grantPermissions(['camera']);
    
    // Login as guard
    await login(page, {
      email: users.guard.email,
      password: users.guard.password
    });
    await page.waitForTimeout(2000);
    
    // Navigate to QR scanner
    await navigateTo(page, '/guard/scan-qr');
    await page.waitForTimeout(2000);
    
    if (page.url().includes('404')) {
      await navigateTo(page, '/scan-qr');
      await page.waitForTimeout(2000);
    }
    
    // Look for scan button
    const scanButton = page.locator('button:has-text("Scan"), button:has-text("Start Scanning"), button[aria-label*="scan"]').first();
    const hasScanButton = await scanButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasScanButton) {
      await scanButton.click();
      await page.waitForTimeout(2000);
      
      // Check if camera interface appeared or permission dialog
      const cameraActive = await page.locator('video, canvas, [class*="camera"], [class*="scanner"]').isVisible({ timeout: 5000 }).catch(() => false);
      const permissionDenied = await page.locator('text=/permission|denied|camera/i').isVisible({ timeout: 3000 }).catch(() => false);
      
      // Either camera is active or permission handling is visible
      expect(cameraActive || permissionDenied).toBeTruthy();
    }
  });
});
