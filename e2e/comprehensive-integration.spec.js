/**
 * Comprehensive End-to-End Integration Testing Suite
 * Tests all user workflows across different roles and devices
 * Validates cross-role collaboration and system performance
 */

import { test, expect } from '@playwright/test';
import { 
  setupTestEnvironment, 
  cleanupTestEnvironment,
  createTestUsers,
  getAuthToken,
  simulateNetworkConditions,
  measurePerformance,
  validateAccessibility
} from './utils/test-helpers';

// Test configuration
const TEST_CONFIG = {
  baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
  apiURL: process.env.TEST_API_URL || 'http://localhost:3001',
  timeout: 60000,
  retries: 2
};

// Test users for different roles
const TEST_USERS = {
  superAdmin: {
    email: 'superadmin@test.com',
    password: 'TestSuperAdmin123!',
    role: 'super_admin'
  },
  estateAdmin: {
    email: 'admin@test.com',
    password: 'TestAdmin123!',
    role: 'admin',
    estate_id: 1
  },
  guard: {
    email: 'guard@test.com',
    password: 'TestGuard123!',
    role: 'guard',
    estate_id: 1
  },
  resident: {
    email: 'resident@test.com',
    password: 'TestResident123!',
    role: 'resident',
    estate_id: 1
  }
};

test.describe('Comprehensive Integration Testing Suite', () => {
  let testContext;

  test.beforeAll(async () => {
    testContext = await setupTestEnvironment();
    await createTestUsers(TEST_USERS);
  });

  test.afterAll(async () => {
    await cleanupTestEnvironment(testContext);
  });

  test.describe('Multi-Role Workflow Testing', () => {
    test('Complete visitor invitation and check-in workflow', async ({ page, context }) => {
      const performanceMetrics = [];
      
      // Step 1: Resident creates visitor invitation
      await test.step('Resident creates visitor invitation', async () => {
        const startTime = Date.now();
        
        await page.goto(`${TEST_CONFIG.baseURL}/login`);
        await page.fill('[data-testid="email-input"]', TEST_USERS.resident.email);
        await page.fill('[data-testid="password-input"]', TEST_USERS.resident.password);
        await page.click('[data-testid="login-button"]');
        
        await page.waitForURL('**/dashboard');
        await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
        
        // Navigate to visitor invitation
        await page.click('[data-testid="invite-visitor-button"]');
        await page.waitForSelector('[data-testid="visitor-form"]');
        
        // Fill visitor details
        await page.fill('[data-testid="visitor-name"]', 'John Doe');
        await page.fill('[data-testid="visitor-phone"]', '+254712345678');
        await page.fill('[data-testid="visitor-email"]', 'john.doe@example.com');
        await page.fill('[data-testid="visitor-purpose"]', 'Business meeting');
        
        // Set expected arrival time
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await page.fill('[data-testid="expected-arrival"]', tomorrow.toISOString().slice(0, 16));
        
        // Submit invitation
        await page.click('[data-testid="create-invitation-button"]');
        
        // Verify invitation created
        await expect(page.locator('[data-testid="success-message"]')).toContainText('Visitor invitation created');
        
        // Capture QR code for later use
        const qrCode = await page.locator('[data-testid="visitor-qr-code"]').getAttribute('src');
        testContext.visitorQRCode = qrCode;
        
        performanceMetrics.push({
          step: 'visitor_invitation_creation',
          duration: Date.now() - startTime,
          threshold: 3000
        });
      });

      // Step 2: Estate Admin approves visitor
      await test.step('Estate Admin approves visitor', async () => {
        const startTime = Date.now();
        
        // Open new page for admin
        const adminPage = await context.newPage();
        await adminPage.goto(`${TEST_CONFIG.baseURL}/login`);
        
        await adminPage.fill('[data-testid="email-input"]', TEST_USERS.estateAdmin.email);
        await adminPage.fill('[data-testid="password-input"]', TEST_USERS.estateAdmin.password);
        await adminPage.click('[data-testid="login-button"]');
        
        await adminPage.waitForURL('**/dashboard');
        
        // Navigate to pending approvals
        await adminPage.click('[data-testid="pending-approvals-tab"]');
        await adminPage.waitForSelector('[data-testid="pending-visitors-list"]');
        
        // Find and approve the visitor
        const visitorRow = adminPage.locator('[data-testid="visitor-row"]').filter({ hasText: 'John Doe' });
        await expect(visitorRow).toBeVisible();
        
        await visitorRow.locator('[data-testid="approve-button"]').click();
        await adminPage.fill('[data-testid="approval-notes"]', 'Approved for business meeting');
        await adminPage.click('[data-testid="confirm-approval-button"]');
        
        // Verify approval
        await expect(adminPage.locator('[data-testid="success-message"]')).toContainText('Visitor approved');
        
        performanceMetrics.push({
          step: 'visitor_approval',
          duration: Date.now() - startTime,
          threshold: 2000
        });
        
        await adminPage.close();
      });

      // Step 3: Guard processes visitor check-in
      await test.step('Guard processes visitor check-in', async () => {
        const startTime = Date.now();
        
        // Open new page for guard
        const guardPage = await context.newPage();
        await guardPage.goto(`${TEST_CONFIG.baseURL}/login`);
        
        await guardPage.fill('[data-testid="email-input"]', TEST_USERS.guard.email);
        await guardPage.fill('[data-testid="password-input"]', TEST_USERS.guard.password);
        await guardPage.click('[data-testid="login-button"]');
        
        await guardPage.waitForURL('**/dashboard');
        
        // Navigate to QR scanner
        await guardPage.click('[data-testid="qr-scanner-tab"]');
        await guardPage.waitForSelector('[data-testid="qr-scanner"]');
        
        // Simulate QR code scan (mock the camera input)
        await guardPage.evaluate((qrCode) => {
          window.mockQRScan(qrCode);
        }, testContext.visitorQRCode);
        
        // Verify visitor details displayed
        await expect(guardPage.locator('[data-testid="visitor-details"]')).toContainText('John Doe');
        await expect(guardPage.locator('[data-testid="visitor-status"]')).toContainText('APPROVED');
        
        // Process check-in
        await guardPage.fill('[data-testid="checkin-notes"]', 'Visitor checked in at main gate');
        await guardPage.click('[data-testid="checkin-button"]');
        
        // Verify check-in success
        await expect(guardPage.locator('[data-testid="success-message"]')).toContainText('Visitor checked in successfully');
        
        performanceMetrics.push({
          step: 'visitor_checkin',
          duration: Date.now() - startTime,
          threshold: 2000
        });
        
        await guardPage.close();
      });

      // Step 4: Verify real-time updates for resident
      await test.step('Verify real-time updates for resident', async () => {
        // Return to resident page
        await page.reload();
        await page.waitForSelector('[data-testid="visitor-status-list"]');
        
        // Verify visitor status updated to checked in
        const visitorStatus = page.locator('[data-testid="visitor-status"]').filter({ hasText: 'John Doe' });
        await expect(visitorStatus).toContainText('ON_PREMISE');
        
        // Verify real-time notification received
        await expect(page.locator('[data-testid="notification-toast"]')).toContainText('John Doe has checked in');
      });

      // Validate performance metrics
      performanceMetrics.forEach(metric => {
        expect(metric.duration).toBeLessThan(metric.threshold);
      });
    });

    test('Super Admin cross-estate management workflow', async ({ page }) => {
      await test.step('Super Admin manages multiple estates', async () => {
        await page.goto(`${TEST_CONFIG.baseURL}/login`);
        await page.fill('[data-testid="email-input"]', TEST_USERS.superAdmin.email);
        await page.fill('[data-testid="password-input"]', TEST_USERS.superAdmin.password);
        await page.click('[data-testid="login-button"]');
        
        await page.waitForURL('**/dashboard/super-admin');
        
        // Verify platform overview
        await expect(page.locator('[data-testid="platform-metrics"]')).toBeVisible();
        await expect(page.locator('[data-testid="estate-list"]')).toBeVisible();
        
        // Test estate impersonation
        await page.click('[data-testid="estate-row"]:first-child [data-testid="impersonate-button"]');
        await page.waitForURL('**/dashboard/admin');
        
        // Verify impersonation banner
        await expect(page.locator('[data-testid="impersonation-banner"]')).toBeVisible();
        await expect(page.locator('[data-testid="impersonation-banner"]')).toContainText('Viewing as Estate Admin');
        
        // Test estate management functions
        await page.click('[data-testid="user-management-tab"]');
        await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
        
        // Return to super admin view
        await page.click('[data-testid="exit-impersonation-button"]');
        await page.waitForURL('**/dashboard/super-admin');
      });
    });
  });

  test.describe('Cross-Role Collaboration Testing', () => {
    test('Workflow handoff with context preservation', async ({ page, context }) => {
      await test.step('Test approval workflow with messaging', async () => {
        // Resident initiates bulk invite requiring admin approval
        await page.goto(`${TEST_CONFIG.baseURL}/login`);
        await page.fill('[data-testid="email-input"]', TEST_USERS.resident.email);
        await page.fill('[data-testid="password-input"]', TEST_USERS.resident.password);
        await page.click('[data-testid="login-button"]');
        
        await page.waitForURL('**/dashboard');
        
        // Create bulk invite
        await page.click('[data-testid="bulk-invite-button"]');
        await page.fill('[data-testid="event-name"]', 'Community Meeting');
        await page.fill('[data-testid="guest-count"]', '50');
        await page.fill('[data-testid="event-date"]', '2025-02-15');
        await page.fill('[data-testid="event-time"]', '18:00');
        await page.fill('[data-testid="event-description"]', 'Monthly community meeting with guest speakers');
        
        await page.click('[data-testid="create-bulk-invite-button"]');
        
        // Verify approval required message
        await expect(page.locator('[data-testid="approval-required-message"]')).toBeVisible();
        
        // Add message to admin
        await page.fill('[data-testid="admin-message"]', 'Please approve this bulk invite for our monthly meeting');
        await page.click('[data-testid="send-message-button"]');
        
        // Admin receives and processes request
        const adminPage = await context.newPage();
        await adminPage.goto(`${TEST_CONFIG.baseURL}/login`);
        await adminPage.fill('[data-testid="email-input"]', TEST_USERS.estateAdmin.email);
        await adminPage.fill('[data-testid="password-input"]', TEST_USERS.estateAdmin.password);
        await adminPage.click('[data-testid="login-button"]');
        
        await adminPage.waitForURL('**/dashboard');
        
        // Check notifications
        await adminPage.click('[data-testid="notifications-button"]');
        await expect(adminPage.locator('[data-testid="notification-item"]').filter({ hasText: 'Bulk invite approval' })).toBeVisible();
        
        // Navigate to approval workflow
        await adminPage.click('[data-testid="workflow-handoffs-tab"]');
        await expect(adminPage.locator('[data-testid="pending-workflows"]')).toBeVisible();
        
        // Verify context preservation
        const workflowItem = adminPage.locator('[data-testid="workflow-item"]').filter({ hasText: 'Community Meeting' });
        await expect(workflowItem).toBeVisible();
        await expect(workflowItem.locator('[data-testid="context-details"]')).toContainText('Monthly community meeting');
        await expect(workflowItem.locator('[data-testid="requester-message"]')).toContainText('Please approve this bulk invite');
        
        // Approve with response
        await workflowItem.locator('[data-testid="approve-button"]').click();
        await adminPage.fill('[data-testid="approval-response"]', 'Approved. Please coordinate with security for guest management.');
        await adminPage.click('[data-testid="confirm-approval-button"]');
        
        // Verify resident receives approval notification
        await page.reload();
        await expect(page.locator('[data-testid="notification-toast"]')).toContainText('Bulk invite approved');
        
        await adminPage.close();
      });
    });

    test('Conflict resolution workflow', async ({ page, context }) => {
      await test.step('Test visitor conflict resolution', async () => {
        // Create conflicting visitor invitations
        await page.goto(`${TEST_CONFIG.baseURL}/login`);
        await page.fill('[data-testid="email-input"]', TEST_USERS.resident.email);
        await page.fill('[data-testid="password-input"]', TEST_USERS.resident.password);
        await page.click('[data-testid="login-button"]');
        
        // Create first invitation
        await page.click('[data-testid="invite-visitor-button"]');
        await page.fill('[data-testid="visitor-name"]', 'Jane Smith');
        await page.fill('[data-testid="visitor-phone"]', '+254712345679');
        await page.fill('[data-testid="expected-arrival"]', '2025-02-01T10:00');
        await page.click('[data-testid="create-invitation-button"]');
        
        // Create second resident session with conflicting invitation
        const resident2Page = await context.newPage();
        await resident2Page.goto(`${TEST_CONFIG.baseURL}/login`);
        await resident2Page.fill('[data-testid="email-input"]', 'resident2@test.com');
        await resident2Page.fill('[data-testid="password-input"]', 'TestResident2123!');
        await resident2Page.click('[data-testid="login-button"]');
        
        // Create conflicting invitation (same phone, same time)
        await resident2Page.click('[data-testid="invite-visitor-button"]');
        await resident2Page.fill('[data-testid="visitor-name"]', 'Jane Smith');
        await resident2Page.fill('[data-testid="visitor-phone"]', '+254712345679');
        await resident2Page.fill('[data-testid="expected-arrival"]', '2025-02-01T10:00');
        await resident2Page.click('[data-testid="create-invitation-button"]');
        
        // Verify conflict detection
        await expect(resident2Page.locator('[data-testid="conflict-warning"]')).toBeVisible();
        await expect(resident2Page.locator('[data-testid="conflict-details"]')).toContainText('Similar visitor invitation exists');
        
        // Admin resolves conflict
        const adminPage = await context.newPage();
        await adminPage.goto(`${TEST_CONFIG.baseURL}/login`);
        await adminPage.fill('[data-testid="email-input"]', TEST_USERS.estateAdmin.email);
        await adminPage.fill('[data-testid="password-input"]', TEST_USERS.estateAdmin.password);
        await adminPage.click('[data-testid="login-button"]');
        
        await adminPage.click('[data-testid="conflict-resolution-tab"]');
        await expect(adminPage.locator('[data-testid="conflicts-list"]')).toBeVisible();
        
        // Resolve conflict by merging invitations
        const conflictItem = adminPage.locator('[data-testid="conflict-item"]').filter({ hasText: 'Jane Smith' });
        await conflictItem.locator('[data-testid="resolve-button"]').click();
        await adminPage.click('[data-testid="merge-invitations-option"]');
        await adminPage.fill('[data-testid="resolution-notes"]', 'Merged duplicate invitations for same visitor');
        await adminPage.click('[data-testid="confirm-resolution-button"]');
        
        // Verify resolution notifications sent to both residents
        await expect(page.locator('[data-testid="notification-toast"]')).toContainText('Visitor invitation conflict resolved');
        await expect(resident2Page.locator('[data-testid="notification-toast"]')).toContainText('Visitor invitation conflict resolved');
        
        await resident2Page.close();
        await adminPage.close();
      });
    });
  });

  test.describe('Performance Testing Under Load', () => {
    test('Concurrent user load testing', async ({ browser }) => {
      const concurrentUsers = 10;
      const pages = [];
      const performanceResults = [];

      await test.step('Create concurrent user sessions', async () => {
        for (let i = 0; i < concurrentUsers; i++) {
          const context = await browser.newContext();
          const page = await context.newPage();
          pages.push({ page, context, userId: i });
        }
      });

      await test.step('Simulate concurrent visitor creation', async () => {
        const promises = pages.map(async ({ page, userId }) => {
          const startTime = Date.now();
          
          try {
            await page.goto(`${TEST_CONFIG.baseURL}/login`);
            await page.fill('[data-testid="email-input"]', TEST_USERS.resident.email);
            await page.fill('[data-testid="password-input"]', TEST_USERS.resident.password);
            await page.click('[data-testid="login-button"]');
            
            await page.waitForURL('**/dashboard');
            
            // Create visitor invitation
            await page.click('[data-testid="invite-visitor-button"]');
            await page.fill('[data-testid="visitor-name"]', `Test Visitor ${userId}`);
            await page.fill('[data-testid="visitor-phone"]', `+25471234567${userId}`);
            await page.fill('[data-testid="visitor-email"]', `visitor${userId}@test.com`);
            await page.click('[data-testid="create-invitation-button"]');
            
            await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
            
            const duration = Date.now() - startTime;
            performanceResults.push({
              userId,
              operation: 'visitor_creation',
              duration,
              success: true
            });
          } catch (error) {
            performanceResults.push({
              userId,
              operation: 'visitor_creation',
              duration: Date.now() - startTime,
              success: false,
              error: error.message
            });
          }
        });

        await Promise.all(promises);
      });

      await test.step('Validate performance results', async () => {
        const successfulOperations = performanceResults.filter(r => r.success);
        const failedOperations = performanceResults.filter(r => !r.success);
        
        // Validate success rate (should be > 95%)
        const successRate = (successfulOperations.length / performanceResults.length) * 100;
        expect(successRate).toBeGreaterThan(95);
        
        // Validate average response time (should be < 3 seconds)
        const avgResponseTime = successfulOperations.reduce((sum, r) => sum + r.duration, 0) / successfulOperations.length;
        expect(avgResponseTime).toBeLessThan(3000);
        
        // Validate P95 response time (should be < 5 seconds)
        const sortedTimes = successfulOperations.map(r => r.duration).sort((a, b) => a - b);
        const p95Index = Math.floor(sortedTimes.length * 0.95);
        const p95ResponseTime = sortedTimes[p95Index];
        expect(p95ResponseTime).toBeLessThan(5000);
        
        console.log(`Performance Results:
          Success Rate: ${successRate.toFixed(2)}%
          Average Response Time: ${avgResponseTime.toFixed(0)}ms
          P95 Response Time: ${p95ResponseTime}ms
          Failed Operations: ${failedOperations.length}`);
      });

      // Cleanup
      for (const { context } of pages) {
        await context.close();
      }
    });

    test('Real-time feature performance', async ({ page, context }) => {
      await test.step('Test WebSocket performance under load', async () => {
        // Create multiple connected clients
        const clients = [];
        for (let i = 0; i < 5; i++) {
          const clientPage = await context.newPage();
          await clientPage.goto(`${TEST_CONFIG.baseURL}/login`);
          await clientPage.fill('[data-testid="email-input"]', TEST_USERS.guard.email);
          await clientPage.fill('[data-testid="password-input"]', TEST_USERS.guard.password);
          await clientPage.click('[data-testid="login-button"]');
          await clientPage.waitForURL('**/dashboard');
          clients.push(clientPage);
        }

        // Generate real-time events
        await page.goto(`${TEST_CONFIG.baseURL}/login`);
        await page.fill('[data-testid="email-input"]', TEST_USERS.resident.email);
        await page.fill('[data-testid="password-input"]', TEST_USERS.resident.password);
        await page.click('[data-testid="login-button"]');

        const startTime = Date.now();
        
        // Create multiple visitor invitations rapidly
        for (let i = 0; i < 10; i++) {
          await page.click('[data-testid="invite-visitor-button"]');
          await page.fill('[data-testid="visitor-name"]', `Rapid Visitor ${i}`);
          await page.fill('[data-testid="visitor-phone"]', `+25471234560${i}`);
          await page.click('[data-testid="create-invitation-button"]');
          await page.waitForSelector('[data-testid="success-message"]');
          await page.click('[data-testid="close-modal-button"]');
        }

        // Verify all clients received real-time updates
        for (const client of clients) {
          await expect(client.locator('[data-testid="live-visitor-count"]')).toContainText('10');
        }

        const totalTime = Date.now() - startTime;
        expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds

        // Cleanup
        for (const client of clients) {
          await client.close();
        }
      });
    });
  });

  test.describe('Accessibility Compliance Testing', () => {
    test('WCAG 2.1 AA compliance validation', async ({ page }) => {
      await test.step('Test keyboard navigation', async () => {
        await page.goto(`${TEST_CONFIG.baseURL}/login`);
        
        // Test tab navigation
        await page.keyboard.press('Tab');
        await expect(page.locator('[data-testid="email-input"]')).toBeFocused();
        
        await page.keyboard.press('Tab');
        await expect(page.locator('[data-testid="password-input"]')).toBeFocused();
        
        await page.keyboard.press('Tab');
        await expect(page.locator('[data-testid="login-button"]')).toBeFocused();
        
        // Test Enter key activation
        await page.fill('[data-testid="email-input"]', TEST_USERS.resident.email);
        await page.fill('[data-testid="password-input"]', TEST_USERS.resident.password);
        await page.keyboard.press('Enter');
        
        await page.waitForURL('**/dashboard');
      });

      await test.step('Test screen reader compatibility', async () => {
        await page.goto(`${TEST_CONFIG.baseURL}/dashboard`);
        
        // Verify ARIA labels and roles
        const mainContent = page.locator('[role="main"]');
        await expect(mainContent).toBeVisible();
        
        const navigation = page.locator('[role="navigation"]');
        await expect(navigation).toBeVisible();
        
        // Test form labels
        await page.click('[data-testid="invite-visitor-button"]');
        const nameInput = page.locator('[data-testid="visitor-name"]');
        const nameLabel = await nameInput.getAttribute('aria-label');
        expect(nameLabel).toBeTruthy();
        
        // Test error announcements
        await page.click('[data-testid="create-invitation-button"]');
        const errorMessage = page.locator('[role="alert"]');
        await expect(errorMessage).toBeVisible();
      });

      await test.step('Test color contrast and visual accessibility', async () => {
        // Enable high contrast mode
        await page.click('[data-testid="accessibility-settings-button"]');
        await page.click('[data-testid="high-contrast-toggle"]');
        
        // Verify high contrast styles applied
        const body = page.locator('body');
        const hasHighContrast = await body.evaluate(el => 
          getComputedStyle(el).getPropertyValue('--high-contrast-mode') === 'true'
        );
        expect(hasHighContrast).toBe(true);
        
        // Test focus indicators
        await page.keyboard.press('Tab');
        const focusedElement = page.locator(':focus');
        const focusOutline = await focusedElement.evaluate(el => 
          getComputedStyle(el).outline
        );
        expect(focusOutline).not.toBe('none');
      });

      await test.step('Test alternative input methods', async () => {
        // Test voice commands (if supported)
        await page.click('[data-testid="voice-commands-button"]');
        
        // Simulate voice command
        await page.evaluate(() => {
          if (window.speechRecognition) {
            window.speechRecognition.mockResult('create visitor invitation');
          }
        });
        
        // Verify voice command processed
        await expect(page.locator('[data-testid="visitor-form"]')).toBeVisible();
        
        // Test gesture navigation on mobile
        await page.setViewportSize({ width: 375, height: 667 });
        
        // Test swipe gestures
        await page.touchscreen.tap(100, 300);
        await page.touchscreen.tap(300, 300);
        
        // Verify mobile navigation works
        await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
      });
    });

    test('Accessibility across all user roles', async ({ page }) => {
      const roles = [
        { user: TEST_USERS.resident, expectedElements: ['invite-visitor-button', 'visitor-list'] },
        { user: TEST_USERS.guard, expectedElements: ['qr-scanner-tab', 'visitor-checkin-list'] },
        { user: TEST_USERS.estateAdmin, expectedElements: ['user-management-tab', 'pending-approvals-tab'] },
        { user: TEST_USERS.superAdmin, expectedElements: ['platform-metrics', 'estate-list'] }
      ];

      for (const { user, expectedElements } of roles) {
        await test.step(`Test accessibility for ${user.role}`, async () => {
          await page.goto(`${TEST_CONFIG.baseURL}/login`);
          await page.fill('[data-testid="email-input"]', user.email);
          await page.fill('[data-testid="password-input"]', user.password);
          await page.click('[data-testid="login-button"]');
          
          await page.waitForURL('**/dashboard**');
          
          // Run accessibility audit
          const accessibilityResults = await validateAccessibility(page);
          expect(accessibilityResults.violations.length).toBe(0);
          
          // Verify role-specific elements are accessible
          for (const elementId of expectedElements) {
            const element = page.locator(`[data-testid="${elementId}"]`);
            await expect(element).toBeVisible();
            
            // Check if element has proper ARIA attributes
            const ariaLabel = await element.getAttribute('aria-label');
            const role = await element.getAttribute('role');
            expect(ariaLabel || role).toBeTruthy();
          }
          
          await page.click('[data-testid="logout-button"]');
        });
      }
    });
  });

  test.describe('Device and Browser Compatibility', () => {
    test('Responsive design across devices', async ({ page }) => {
      const devices = [
        { name: 'Mobile', width: 375, height: 667 },
        { name: 'Tablet', width: 768, height: 1024 },
        { name: 'Desktop', width: 1920, height: 1080 }
      ];

      for (const device of devices) {
        await test.step(`Test ${device.name} layout`, async () => {
          await page.setViewportSize({ width: device.width, height: device.height });
          await page.goto(`${TEST_CONFIG.baseURL}/login`);
          
          await page.fill('[data-testid="email-input"]', TEST_USERS.resident.email);
          await page.fill('[data-testid="password-input"]', TEST_USERS.resident.password);
          await page.click('[data-testid="login-button"]');
          
          await page.waitForURL('**/dashboard');
          
          // Verify responsive layout
          if (device.width < 768) {
            // Mobile layout
            await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
            await expect(page.locator('[data-testid="desktop-sidebar"]')).not.toBeVisible();
          } else {
            // Desktop/Tablet layout
            await expect(page.locator('[data-testid="desktop-sidebar"]')).toBeVisible();
          }
          
          // Test touch interactions on mobile
          if (device.width < 768) {
            await page.touchscreen.tap(50, 50); // Hamburger menu
            await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
          }
          
          // Verify all critical elements are accessible
          await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
          await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
        });
      }
    });

    test('PWA functionality', async ({ page }) => {
      await test.step('Test offline functionality', async () => {
        await page.goto(`${TEST_CONFIG.baseURL}/login`);
        await page.fill('[data-testid="email-input"]', TEST_USERS.guard.email);
        await page.fill('[data-testid="password-input"]', TEST_USERS.guard.password);
        await page.click('[data-testid="login-button"]');
        
        await page.waitForURL('**/dashboard');
        
        // Simulate offline condition
        await page.context().setOffline(true);
        
        // Verify offline indicator
        await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
        
        // Test offline visitor list access
        await page.click('[data-testid="visitor-list-tab"]');
        await expect(page.locator('[data-testid="cached-visitors-list"]')).toBeVisible();
        
        // Test offline visitor check-in queuing
        await page.click('[data-testid="visitor-row"]:first-child [data-testid="checkin-button"]');
        await page.fill('[data-testid="checkin-notes"]', 'Offline check-in');
        await page.click('[data-testid="confirm-checkin-button"]');
        
        // Verify action queued for sync
        await expect(page.locator('[data-testid="sync-queue-indicator"]')).toContainText('1 pending');
        
        // Restore online and verify sync
        await page.context().setOffline(false);
        await page.waitForSelector('[data-testid="online-indicator"]');
        
        // Verify sync completed
        await expect(page.locator('[data-testid="sync-queue-indicator"]')).toContainText('0 pending');
      });

      await test.step('Test push notifications', async () => {
        // Grant notification permission
        await page.context().grantPermissions(['notifications']);
        
        // Enable push notifications
        await page.click('[data-testid="notification-settings-button"]');
        await page.click('[data-testid="enable-push-notifications"]');
        
        // Verify service worker registration
        const serviceWorkerRegistered = await page.evaluate(() => {
          return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
        });
        expect(serviceWorkerRegistered).toBe(true);
        
        // Test notification display
        await page.evaluate(() => {
          if ('Notification' in window) {
            new Notification('Test Notification', {
              body: 'Testing push notification functionality',
              icon: '/icon-192x192.png'
            });
          }
        });
      });
    });
  });

  test.describe('Integration Testing', () => {
    test('API endpoint integration', async ({ request }) => {
      await test.step('Test all critical API endpoints', async () => {
        // Get authentication token
        const authResponse = await request.post(`${TEST_CONFIG.apiURL}/api/auth/login`, {
          data: {
            email: TEST_USERS.resident.email,
            password: TEST_USERS.resident.password
          }
        });
        expect(authResponse.ok()).toBeTruthy();
        
        const authData = await authResponse.json();
        const token = authData.data.accessToken;
        
        // Test visitor creation endpoint
        const visitorResponse = await request.post(`${TEST_CONFIG.apiURL}/api/visitors`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: {
            name: 'API Test Visitor',
            phone: '+254712345999',
            email: 'apitest@example.com',
            purpose: 'API Integration Test'
          }
        });
        expect(visitorResponse.ok()).toBeTruthy();
        
        const visitorData = await visitorResponse.json();
        expect(visitorData.success).toBe(true);
        expect(visitorData.data.visitor.name).toBe('API Test Visitor');
        
        // Test visitor list endpoint
        const listResponse = await request.get(`${TEST_CONFIG.apiURL}/api/visitors`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        expect(listResponse.ok()).toBeTruthy();
        
        const listData = await listResponse.json();
        expect(listData.success).toBe(true);
        expect(Array.isArray(listData.data.visitors)).toBe(true);
        
        // Test health endpoint
        const healthResponse = await request.get(`${TEST_CONFIG.apiURL}/health`);
        expect(healthResponse.ok()).toBeTruthy();
        
        const healthData = await healthResponse.json();
        expect(healthData.status).toBe('healthy');
      });
    });

    test('External service integration', async ({ page }) => {
      await test.step('Test SMS notification integration', async () => {
        await page.goto(`${TEST_CONFIG.baseURL}/login`);
        await page.fill('[data-testid="email-input"]', TEST_USERS.resident.email);
        await page.fill('[data-testid="password-input"]', TEST_USERS.resident.password);
        await page.click('[data-testid="login-button"]');
        
        // Create visitor with SMS notification
        await page.click('[data-testid="invite-visitor-button"]');
        await page.fill('[data-testid="visitor-name"]', 'SMS Test Visitor');
        await page.fill('[data-testid="visitor-phone"]', '+254712345888');
        await page.check('[data-testid="send-sms-notification"]');
        await page.click('[data-testid="create-invitation-button"]');
        
        // Verify SMS notification queued
        await expect(page.locator('[data-testid="sms-notification-status"]')).toContainText('SMS sent');
      });

      await test.step('Test email notification integration', async () => {
        // Create visitor with email notification
        await page.click('[data-testid="invite-visitor-button"]');
        await page.fill('[data-testid="visitor-name"]', 'Email Test Visitor');
        await page.fill('[data-testid="visitor-email"]', 'emailtest@example.com');
        await page.check('[data-testid="send-email-notification"]');
        await page.click('[data-testid="create-invitation-button"]');
        
        // Verify email notification queued
        await expect(page.locator('[data-testid="email-notification-status"]')).toContainText('Email sent');
      });
    });

    test('Database integration and data consistency', async ({ page, request }) => {
      await test.step('Test data consistency across operations', async () => {
        // Create visitor via API
        const authResponse = await request.post(`${TEST_CONFIG.apiURL}/api/auth/login`, {
          data: {
            email: TEST_USERS.resident.email,
            password: TEST_USERS.resident.password
          }
        });
        const authData = await authResponse.json();
        const token = authData.data.accessToken;
        
        const visitorResponse = await request.post(`${TEST_CONFIG.apiURL}/api/visitors`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: {
            name: 'Consistency Test Visitor',
            phone: '+254712345777',
            email: 'consistency@example.com',
            purpose: 'Data Consistency Test'
          }
        });
        
        const visitorData = await visitorResponse.json();
        const visitorId = visitorData.data.visitor.id;
        
        // Verify visitor appears in UI
        await page.goto(`${TEST_CONFIG.baseURL}/login`);
        await page.fill('[data-testid="email-input"]', TEST_USERS.resident.email);
        await page.fill('[data-testid="password-input"]', TEST_USERS.resident.password);
        await page.click('[data-testid="login-button"]');
        
        await page.waitForURL('**/dashboard');
        await page.click('[data-testid="visitor-list-tab"]');
        
        // Verify visitor in list
        await expect(page.locator('[data-testid="visitor-row"]').filter({ hasText: 'Consistency Test Visitor' })).toBeVisible();
        
        // Update visitor status via API
        await request.patch(`${TEST_CONFIG.apiURL}/api/visitors/${visitorId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: {
            status: 'APPROVED'
          }
        });
        
        // Verify status update reflected in UI
        await page.reload();
        const visitorRow = page.locator('[data-testid="visitor-row"]').filter({ hasText: 'Consistency Test Visitor' });
        await expect(visitorRow.locator('[data-testid="visitor-status"]')).toContainText('APPROVED');
      });
    });
  });
});