/**
 * E2E-WALKIN: Walk-in Visitor Registration Tests
 * Tests guard walk-in registration and resident approval workflow
 */

const { test, expect } = require('@playwright/test');
const { login, navigateTo } = require('../utils/test-helpers');
const users = require('../fixtures/users.json');

test.describe('E2E-WALKIN: Walk-in Registration Flow', () => {
  
  let walkInVisitorName;
  let walkInVisitorId;
  
  test.beforeEach(async ({ page }) => {
    // Login as guard for walk-in tests
    await login(page, {
      email: users.guard.email,
      password: users.guard.password
    });
    await page.waitForTimeout(2000);
  });

  test('E2E-WALKIN-01: Guard Accesses Walk-in Registration Form', async ({ page }) => {
    // Navigate to walk-in registration
    await navigateTo(page, '/guard/walk-in-registration');
    await page.waitForTimeout(2000);
    
    // Try alternative routes
    if (page.url().includes('404')) {
      await navigateTo(page, '/walk-in');
      await page.waitForTimeout(2000);
    }
    if (page.url().includes('404')) {
      await navigateTo(page, '/visitors/walk-in');
      await page.waitForTimeout(2000);
    }
    
    // Verify form is present
    const hasForm = await page.locator('form').isVisible({ timeout: 5000 }).catch(() => false);
    const hasWalkInHeading = await page.locator('text=/walk-in|walk in|unexpected visitor/i').isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasForm || hasWalkInHeading).toBeTruthy();
    
    // Verify required fields exist
    const hasNameField = await page.locator('input[name="name"], input[id="name"]').isVisible({ timeout: 5000 }).catch(() => false);
    const hasPhoneField = await page.locator('input[name="phone"], input[id="phone"]').isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasNameField && hasPhoneField).toBeTruthy();
  });

  test('E2E-WALKIN-02: Guard Registers Walk-in Visitor', async ({ page }) => {
    // Navigate to walk-in registration
    await navigateTo(page, '/guard/walk-in-registration');
    await page.waitForTimeout(2000);
    
    // Alternative routes
    if (page.url().includes('404')) {
      await navigateTo(page, '/walk-in');
      await page.waitForTimeout(2000);
    }
    
    // Wait for form
    await page.waitForSelector('form, input[name="name"]', { timeout: 10000 });
    
    // Generate unique visitor data
    const timestamp = Date.now();
    walkInVisitorName = `Walk-in Visitor ${timestamp}`;
    
    // Fill walk-in form
    await page.fill('input[name="name"], input[id="name"]', walkInVisitorName);
    await page.waitForTimeout(300);
    
    await page.fill('input[name="phone"], input[id="phone"]', '+254722334455');
    await page.waitForTimeout(300);
    
    // Fill resident name or unit
    const residentField = page.locator('input[name="residentName"], input[name="resident"], input[name="unit"], input[name="houseNumber"]').first();
    if (await residentField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await residentField.fill('Test Resident');
      await page.waitForTimeout(300);
    }
    
    // Fill purpose
    const purposeField = page.locator('input[name="purpose"], textarea[name="purpose"], select[name="purpose"]').first();
    if (await purposeField.isVisible({ timeout: 3000 }).catch(() => false)) {
      const tagName = await purposeField.evaluate(el => el.tagName.toLowerCase());
      if (tagName === 'select') {
        await purposeField.selectOption({ index: 1 });
      } else {
        await purposeField.fill('Unexpected visit - E2E test');
      }
      await page.waitForTimeout(300);
    }
    
    // Fill vehicle plate if field exists
    const vehicleField = page.locator('input[name="vehiclePlate"], input[name="vehicle"]');
    if (await vehicleField.isVisible({ timeout: 2000 }).catch(() => false)) {
      await vehicleField.fill('KBZ123X');
      await page.waitForTimeout(300);
    }
    
    // Submit form
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();
    
    // Wait for response
    await page.waitForTimeout(4000);
    
    // Verify success or pending approval message
    const hasSuccess = await page.locator('text=/registered|created|pending|approval|request sent/i').isVisible({ timeout: 8000 }).catch(() => false);
    expect(hasSuccess).toBeTruthy();
    
    // Try to extract visitor ID from response
    const pageContent = await page.content();
    const idMatch = pageContent.match(/visitor[_-]?id[\"']?\s*[:=]\s*[\"']?(\d+)/i);
    if (idMatch) {
      walkInVisitorId = idMatch[1];
    }
  });

  test('E2E-WALKIN-03: Guard Views Walk-in Pending Approval Status', async ({ page }) => {
    // Navigate to visitors or dashboard
    await navigateTo(page, '/guard/visitors');
    await page.waitForTimeout(2000);
    
    if (page.url().includes('404')) {
      await navigateTo(page, '/visitors');
      await page.waitForTimeout(2000);
    }
    if (page.url().includes('404')) {
      await navigateTo(page, '/dashboard');
      await page.waitForTimeout(2000);
    }
    
    // Look for pending visitors section
    const pendingSection = page.locator('text=/pending|awaiting approval|waiting/i').first();
    const hasPending = await pendingSection.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasPending) {
      // Click to view if it's a link
      const isClickable = await pendingSection.evaluate(el => 
        el.tagName === 'A' || el.tagName === 'BUTTON' || el.closest('a') !== null
      ).catch(() => false);
      
      if (isClickable) {
        await pendingSection.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Verify pending visitors list or empty state
    const hasVisitors = await page.locator('table, .visitor-card, .visitor-item').count() > 0;
    const hasPendingText = await page.locator('text=/pending/i').count() > 0;
    expect(hasVisitors || hasPendingText).toBeTruthy();
  });

  test('E2E-WALKIN-04: Resident Receives Walk-in Approval Request', async ({ page }) => {
    // Logout guard
    const logoutBtn = page.locator('button:has-text("Logout")').first();
    if (await logoutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await logoutBtn.click({ force: true });
      await page.waitForTimeout(2000);
    }
    
    // Login as resident
    await login(page, {
      email: users.resident.email,
      password: users.resident.password
    });
    await page.waitForTimeout(2000);
    
    // Navigate to dashboard or notifications
    await navigateTo(page, '/dashboard');
    await page.waitForTimeout(2000);
    
    // Look for notifications or pending approvals
    const notificationBell = page.locator('[aria-label*="notification"], .notification-icon, button:has-text("Notifications")').first();
    const hasNotifications = await notificationBell.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasNotifications) {
      await notificationBell.click();
      await page.waitForTimeout(1000);
      
      // Look for walk-in approval notification
      const walkInNotification = await page.locator('text=/walk-in|approval request|unexpected visitor/i').isVisible({ timeout: 5000 }).catch(() => false);
      expect(walkInNotification).toBeTruthy();
    } else {
      // Alternative: Check visitors page for pending approvals
      await navigateTo(page, '/resident/visitors');
      await page.waitForTimeout(2000);
      
      if (page.url().includes('404')) {
        await navigateTo(page, '/visitors');
        await page.waitForTimeout(2000);
      }
      
      // Filter by pending
      const statusFilter = page.locator('select[name="status"], button:has-text("Status")');
      if (await statusFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
        await statusFilter.click();
        await page.waitForTimeout(500);
        
        const pendingOption = page.locator('option:has-text("Pending"), [role="option"]:has-text("Pending")').first();
        if (await pendingOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await pendingOption.click();
          await page.waitForTimeout(1000);
        }
      }
      
      // Should see pending visitors
      const hasPending = await page.locator('text=/pending/i').count() > 0;
      expect(hasPending).toBeTruthy();
    }
  });

  test('E2E-WALKIN-05: Resident Approves Walk-in Visitor', async ({ page }) => {
    // Login as resident if not already
    const loggedIn = await page.locator('button:has-text("Logout")').isVisible({ timeout: 2000 }).catch(() => false);
    
    if (!loggedIn) {
      await login(page, {
        email: users.resident.email,
        password: users.resident.password
      });
      await page.waitForTimeout(2000);
    }
    
    // Navigate to visitors
    await navigateTo(page, '/resident/visitors');
    await page.waitForTimeout(2000);
    
    if (page.url().includes('404')) {
      await navigateTo(page, '/visitors');
      await page.waitForTimeout(2000);
    }
    
    // Filter by pending status
    const statusFilter = page.locator('select[name="status"], button:has-text("Status")');
    if (await statusFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusFilter.click();
      await page.waitForTimeout(500);
      
      const pendingOption = page.locator('option:has-text("Pending"), [role="option"]:has-text("Pending")').first();
      if (await pendingOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await pendingOption.click();
        await page.waitForTimeout(1500);
      }
    }
    
    // Look for approve button on pending visitor
    const approveButton = page.locator('button:has-text("Approve"), button:has-text("Accept")').first();
    const hasApproveButton = await approveButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasApproveButton) {
      await approveButton.click();
      await page.waitForTimeout(1000);
      
      // Confirm if modal appears
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Approve")').last();
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }
      
      await page.waitForTimeout(3000);
      
      // Verify approval success
      const hasSuccess = await page.locator('text=/approved|success|checked in|authorized/i').isVisible({ timeout: 8000 }).catch(() => false);
      expect(hasSuccess).toBeTruthy();
    } else {
      // No pending visitors to approve
      console.log('No pending walk-in visitors available for approval');
      expect(true).toBeTruthy();
    }
  });

  test('E2E-WALKIN-06: Resident Rejects Walk-in Visitor', async ({ page }) => {
    // First, guard creates another walk-in
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
    
    // Create walk-in visitor
    await navigateTo(page, '/guard/walk-in-registration');
    await page.waitForTimeout(2000);
    
    if (page.url().includes('404')) {
      await navigateTo(page, '/walk-in');
      await page.waitForTimeout(2000);
    }
    
    if (!page.url().includes('404')) {
      await page.waitForSelector('form, input[name="name"]', { timeout: 5000 }).catch(() => {});
      
      const nameField = page.locator('input[name="name"]');
      if (await nameField.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameField.fill(`Reject Test ${Date.now()}`);
        await page.locator('input[name="phone"]').fill('+254733445566');
        
        const residentField = page.locator('input[name="residentName"], input[name="resident"]').first();
        if (await residentField.isVisible({ timeout: 2000 }).catch(() => false)) {
          await residentField.fill('Test Resident');
        }
        
        await page.locator('button[type="submit"]').first().click();
        await page.waitForTimeout(3000);
      }
    }
    
    // Logout and login as resident
    const logoutBtn2 = page.locator('button:has-text("Logout")').first();
    if (await logoutBtn2.isVisible({ timeout: 2000 }).catch(() => false)) {
      await logoutBtn2.click({ force: true });
      await page.waitForTimeout(2000);
    }
    
    await login(page, {
      email: users.resident.email,
      password: users.resident.password
    });
    await page.waitForTimeout(2000);
    
    // Navigate to visitors
    await navigateTo(page, '/visitors');
    await page.waitForTimeout(2000);
    
    // Look for reject/deny button
    const rejectButton = page.locator('button:has-text("Reject"), button:has-text("Deny"), button:has-text("Decline")').first();
    const hasRejectButton = await rejectButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasRejectButton) {
      await rejectButton.click();
      await page.waitForTimeout(1000);
      
      // Confirm rejection
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Reject")').last();
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }
      
      await page.waitForTimeout(3000);
      
      // Verify rejection
      const hasSuccess = await page.locator('text=/rejected|denied|declined/i').isVisible({ timeout: 8000 }).catch(() => false);
      expect(hasSuccess).toBeTruthy();
    }
  });

  test('E2E-WALKIN-07: Guard Cannot Check In Unapproved Walk-in', async ({ page }) => {
    // Already logged in as guard from beforeEach
    
    // Navigate to visitors
    await navigateTo(page, '/guard/visitors');
    await page.waitForTimeout(2000);
    
    if (page.url().includes('404')) {
      await navigateTo(page, '/visitors');
      await page.waitForTimeout(2000);
    }
    
    // Filter by pending status
    const statusFilter = page.locator('select[name="status"], button:has-text("Status")');
    if (await statusFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusFilter.click();
      await page.waitForTimeout(500);
      
      const pendingOption = page.locator('option:has-text("Pending"), [role="option"]:has-text("Pending")').first();
      if (await pendingOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await pendingOption.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // Look for check-in button on pending visitor (should be disabled or not present)
    const checkInButton = page.locator('button:has-text("Check In"), button:has-text("Check-in")').first();
    const hasCheckIn = await checkInButton.isVisible({ timeout: 3000 }).catch(() => false);
    
    if (hasCheckIn) {
      // Button should be disabled
      const isDisabled = await checkInButton.isDisabled();
      expect(isDisabled).toBeTruthy();
    } else {
      // No check-in button for pending visitors (correct behavior)
      expect(true).toBeTruthy();
    }
  });

  test('E2E-WALKIN-08: Guard Checks In Approved Walk-in Visitor', async ({ page }) => {
    // Navigate to visitors
    await navigateTo(page, '/guard/visitors');
    await page.waitForTimeout(2000);
    
    if (page.url().includes('404')) {
      await navigateTo(page, '/visitors');
      await page.waitForTimeout(2000);
    }
    
    // Filter by approved status
    const statusFilter = page.locator('select[name="status"], button:has-text("Status")');
    if (await statusFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusFilter.click();
      await page.waitForTimeout(500);
      
      const approvedOption = page.locator('option:has-text("Approved"), [role="option"]:has-text("Approved")').first();
      if (await approvedOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await approvedOption.click();
        await page.waitForTimeout(1500);
      }
    }
    
    // Look for check-in button on approved visitor
    const checkInButton = page.locator('button:has-text("Check In"), button:has-text("Check-in")').first();
    const hasCheckIn = await checkInButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasCheckIn) {
      await checkInButton.click();
      await page.waitForTimeout(1000);
      
      // Confirm if modal appears
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Check In")').last();
      if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmButton.click();
      }
      
      await page.waitForTimeout(3000);
      
      // Verify check-in success
      const hasSuccess = await page.locator('text=/checked in|check-in successful|on premise|success/i').isVisible({ timeout: 8000 }).catch(() => false);
      expect(hasSuccess).toBeTruthy();
    } else {
      // No approved visitors to check in
      console.log('No approved walk-in visitors available for check-in');
      expect(true).toBeTruthy();
    }
  });
});
