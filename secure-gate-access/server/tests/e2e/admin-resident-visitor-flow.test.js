/**
 * E2E Test: Admin creates resident → resident invites visitor → guard approves
 * 
 * This test covers the complete workflow from admin creating a resident
 * to the resident inviting a visitor and the guard approving the visit.
 */

const { test, expect } = require('@playwright/test');

test.describe('Admin → Resident → Visitor → Guard Flow', () => {
  let adminPage;
  let residentPage;
  let guardPage;
  let visitorEmail = 'visitor@test.com';
  let residentEmail = 'newresident@test.com';

  test.beforeEach(async ({ browser }) => {
    // Create separate browser contexts for different user roles
    adminPage = await browser.newPage();
    residentPage = await browser.newPage();
    guardPage = await browser.newPage();
  });

  test.afterEach(async () => {
    // Clean up pages
    if (adminPage) await adminPage.close();
    if (residentPage) await residentPage.close();
    if (guardPage) await guardPage.close();
  });

  test('Complete admin-resident-visitor-guard workflow', async () => {
    // Step 1: Admin logs in and creates a resident
    await test.step('Admin creates resident', async () => {
      await adminPage.goto('/login');
      
      // Login as admin
      await adminPage.fill('[data-testid="email-input"]', 'admin@test.com');
      await adminPage.fill('[data-testid="password-input"]', 'AdminPass123!');
      await adminPage.click('[data-testid="login-button"]');
      
      // Wait for admin dashboard
      await expect(adminPage.locator('[data-testid="admin-dashboard"]')).toBeVisible();
      
      // Navigate to residents management
      await adminPage.click('[data-testid="residents-menu"]');
      await expect(adminPage.locator('[data-testid="residents-page"]')).toBeVisible();
      
      // Create new resident
      await adminPage.click('[data-testid="add-resident-button"]');
      await expect(adminPage.locator('[data-testid="add-resident-modal"]')).toBeVisible();
      
      await adminPage.fill('[data-testid="resident-name-input"]', 'New Resident');
      await adminPage.fill('[data-testid="resident-email-input"]', residentEmail);
      await adminPage.fill('[data-testid="resident-phone-input"]', '+254712345100');
      await adminPage.fill('[data-testid="resident-unit-input"]', 'A101');
      
      await adminPage.click('[data-testid="save-resident-button"]');
      
      // Verify resident was created
      await expect(adminPage.locator(`[data-testid="resident-${residentEmail}"]`)).toBeVisible();
      await expect(adminPage.locator('[data-testid="success-message"]')).toContainText('Resident created successfully');
    });

    // Step 2: Resident logs in and invites a visitor
    await test.step('Resident invites visitor', async () => {
      await residentPage.goto('/login');
      
      // Login as the new resident
      await residentPage.fill('[data-testid="email-input"]', residentEmail);
      await residentPage.fill('[data-testid="password-input"]', 'ResidentPass123!');
      await residentPage.click('[data-testid="login-button"]');
      
      // Wait for resident dashboard
      await expect(residentPage.locator('[data-testid="resident-dashboard"]')).toBeVisible();
      
      // Navigate to visitor management
      await residentPage.click('[data-testid="visitors-menu"]');
      await expect(residentPage.locator('[data-testid="visitors-page"]')).toBeVisible();
      
      // Invite new visitor
      await residentPage.click('[data-testid="invite-visitor-button"]');
      await expect(residentPage.locator('[data-testid="invite-visitor-modal"]')).toBeVisible();
      
      await residentPage.fill('[data-testid="visitor-name-input"]', 'Test Visitor');
      await residentPage.fill('[data-testid="visitor-email-input"]', visitorEmail);
      await residentPage.fill('[data-testid="visitor-phone-input"]', '+254712345200');
      await residentPage.fill('[data-testid="visitor-purpose-input"]', 'Family visit');
      await residentPage.fill('[data-testid="visitor-notes-input"]', 'Bringing gifts');
      
      // Set expected arrival time (tomorrow at 2 PM)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);
      const arrivalTime = tomorrow.toISOString().slice(0, 16);
      
      await residentPage.fill('[data-testid="visitor-arrival-input"]', arrivalTime);
      
      await residentPage.click('[data-testid="send-invite-button"]');
      
      // Verify visitor was invited
      await expect(residentPage.locator('[data-testid="success-message"]')).toContainText('Visitor invited successfully');
      await expect(residentPage.locator(`[data-testid="visitor-${visitorEmail}"]`)).toBeVisible();
    });

    // Step 3: Visitor receives OTP and verifies
    await test.step('Visitor verifies OTP', async () => {
      // This would typically involve checking email or SMS
      // For testing, we'll simulate the OTP verification process
      
      // Get the visitor ID from the resident's view
      const visitorElement = residentPage.locator(`[data-testid="visitor-${visitorEmail}"]`);
      const visitorId = await visitorElement.getAttribute('data-visitor-id');
      
      // Simulate OTP verification via API
      const otpResponse = await residentPage.request.post('http://localhost:3001/api/visitors/verify-otp', {
        data: {
          visitorId: visitorId,
          otp: '123456' // Test OTP
        }
      });
      
      // Note: In a real scenario, this would be done by the visitor
      // through a public link or mobile app
    });

    // Step 4: Guard logs in and approves the visitor
    await test.step('Guard approves visitor', async () => {
      await guardPage.goto('/login');
      
      // Login as guard
      await guardPage.fill('[data-testid="email-input"]', 'guard@test.com');
      await guardPage.fill('[data-testid="password-input"]', 'GuardPass123!');
      await guardPage.click('[data-testid="login-button"]');
      
      // Wait for guard dashboard
      await expect(guardPage.locator('[data-testid="guard-dashboard"]')).toBeVisible();
      
      // Navigate to pending visitors
      await guardPage.click('[data-testid="pending-visitors-menu"]');
      await expect(guardPage.locator('[data-testid="pending-visitors-page"]')).toBeVisible();
      
      // Find and approve the visitor
      const visitorRow = guardPage.locator(`[data-testid="visitor-${visitorEmail}"]`);
      await expect(visitorRow).toBeVisible();
      
      // Verify visitor details
      await expect(visitorRow.locator('[data-testid="visitor-name"]')).toContainText('Test Visitor');
      await expect(visitorRow.locator('[data-testid="visitor-email"]')).toContainText(visitorEmail);
      await expect(visitorRow.locator('[data-testid="visitor-purpose"]')).toContainText('Family visit');
      
      // Approve the visitor
      await visitorRow.locator('[data-testid="approve-button"]').click();
      await expect(guardPage.locator('[data-testid="approval-modal"]')).toBeVisible();
      
      await guardPage.fill('[data-testid="approval-notes-input"]', 'Approved for family visit');
      await guardPage.click('[data-testid="confirm-approval-button"]');
      
      // Verify approval
      await expect(guardPage.locator('[data-testid="success-message"]')).toContainText('Visitor approved successfully');
      
      // Verify visitor status changed
      await expect(visitorRow.locator('[data-testid="visitor-status"]')).toContainText('Approved');
    });

    // Step 5: Verify the complete workflow
    await test.step('Verify complete workflow', async () => {
      // Check that resident can see approved visitor
      await residentPage.goto('/visitors');
      const approvedVisitor = residentPage.locator(`[data-testid="visitor-${visitorEmail}"]`);
      await expect(approvedVisitor).toBeVisible();
      await expect(approvedVisitor.locator('[data-testid="visitor-status"]')).toContainText('Approved');
      
      // Check that guard can see approved visitor in approved list
      await guardPage.goto('/approved-visitors');
      const approvedVisitorInGuardView = guardPage.locator(`[data-testid="visitor-${visitorEmail}"]`);
      await expect(approvedVisitorInGuardView).toBeVisible();
      await expect(approvedVisitorInGuardView.locator('[data-testid="visitor-status"]')).toContainText('Approved');
      
      // Check that admin can see the complete audit trail
      await adminPage.goto('/audit-logs');
      await expect(adminPage.locator('[data-testid="audit-logs-page"]')).toBeVisible();
      
      // Verify audit entries for the workflow
      await expect(adminPage.locator('[data-testid="audit-entry-resident-created"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="audit-entry-visitor-invited"]')).toBeVisible();
      await expect(adminPage.locator('[data-testid="audit-entry-visitor-approved"]')).toBeVisible();
    });
  });

  test('Error handling in admin-resident-visitor flow', async () => {
    // Test error scenarios
    await test.step('Handle invalid resident creation', async () => {
      await adminPage.goto('/login');
      await adminPage.fill('[data-testid="email-input"]', 'admin@test.com');
      await adminPage.fill('[data-testid="password-input"]', 'AdminPass123!');
      await adminPage.click('[data-testid="login-button"]');
      
      await adminPage.goto('/residents');
      await adminPage.click('[data-testid="add-resident-button"]');
      
      // Try to create resident with invalid data
      await adminPage.fill('[data-testid="resident-name-input"]', '');
      await adminPage.fill('[data-testid="resident-email-input"]', 'invalid-email');
      await adminPage.click('[data-testid="save-resident-button"]');
      
      // Verify validation errors
      await expect(adminPage.locator('[data-testid="name-error"]')).toContainText('Name is required');
      await expect(adminPage.locator('[data-testid="email-error"]')).toContainText('Invalid email format');
    });

    await test.step('Handle visitor invitation errors', async () => {
      await residentPage.goto('/login');
      await residentPage.fill('[data-testid="email-input"]', 'resident@test.com');
      await residentPage.fill('[data-testid="password-input"]', 'ResidentPass123!');
      await residentPage.click('[data-testid="login-button"]');
      
      await residentPage.goto('/visitors');
      await residentPage.click('[data-testid="invite-visitor-button"]');
      
      // Try to invite visitor with invalid data
      await residentPage.fill('[data-testid="visitor-name-input"]', '');
      await residentPage.fill('[data-testid="visitor-email-input"]', 'invalid-email');
      await residentPage.click('[data-testid="send-invite-button"]');
      
      // Verify validation errors
      await expect(residentPage.locator('[data-testid="visitor-name-error"]')).toContainText('Name is required');
      await expect(residentPage.locator('[data-testid="visitor-email-error"]')).toContainText('Invalid email format');
    });
  });

  test('Performance and load testing', async () => {
    await test.step('Test multiple concurrent visitors', async () => {
      // Test creating multiple visitors simultaneously
      const visitorPromises = [];
      
      for (let i = 0; i < 5; i++) {
        const promise = residentPage.request.post('http://localhost:3001/api/visitors', {
          data: {
            name: `Visitor ${i}`,
            email: `visitor${i}@test.com`,
            phone: `+254712345${i.toString().padStart(3, '0')}`,
            purpose: 'Test visit',
            residentId: 1 // Assuming resident ID 1 exists
          }
        });
        visitorPromises.push(promise);
      }
      
      const responses = await Promise.all(visitorPromises);
      
      // Verify all visitors were created successfully
      for (const response of responses) {
        expect(response.status()).toBe(201);
      }
    });
  });
});
