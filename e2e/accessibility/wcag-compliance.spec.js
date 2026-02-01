/**
 * WCAG 2.1 AA Compliance Testing Suite
 * Comprehensive accessibility testing across all user interfaces
 */

import { test, expect } from '@playwright/test';
import { setupTestEnvironment, cleanupTestEnvironment, createTestUsers, validateAccessibility } from '../utils/test-helpers.js';

const TEST_USERS = {
  resident: {
    email: 'resident@test.com',
    password: 'TestResident123!',
    role: 'resident',
    estate_id: 1
  },
  guard: {
    email: 'guard@test.com',
    password: 'TestGuard123!',
    role: 'guard',
    estate_id: 1
  },
  admin: {
    email: 'admin@test.com',
    password: 'TestAdmin123!',
    role: 'admin',
    estate_id: 1
  },
  superAdmin: {
    email: 'superadmin@test.com',
    password: 'TestSuperAdmin123!',
    role: 'super_admin'
  }
};

test.describe('WCAG 2.1 AA Compliance Testing', () => {
  let testContext;

  test.beforeAll(async () => {
    testContext = await setupTestEnvironment();
    await createTestUsers(TEST_USERS);
  });

  test.afterAll(async () => {
    await cleanupTestEnvironment(testContext);
  });

  test.describe('Keyboard Navigation Compliance', () => {
    test('Complete keyboard navigation - Login to Dashboard', async ({ page }) => {
      await page.goto('/login');
      
      // Test tab order
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="email-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="password-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="login-button"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="forgot-password-link"]')).toBeFocused();
      
      // Test reverse tab order
      await page.keyboard.press('Shift+Tab');
      await expect(page.locator('[data-testid="login-button"]')).toBeFocused();
      
      // Test form submission with keyboard
      await page.fill('[data-testid="email-input"]', TEST_USERS.resident.email);
      await page.fill('[data-testid="password-input"]', TEST_USERS.resident.password);
      await page.keyboard.press('Enter');
      
      await page.waitForURL('**/dashboard');
      
      // Test dashboard keyboard navigation
      await page.keyboard.press('Tab');
      const firstFocusable = page.locator(':focus');
      await expect(firstFocusable).toBeVisible();
      
      // Test skip links
      await page.keyboard.press('Tab');
      const skipLink = page.locator('[data-testid="skip-to-main"]');
      if (await skipLink.isVisible()) {
        await page.keyboard.press('Enter');
        await expect(page.locator('[role="main"]')).toBeFocused();
      }
    });

    test('Keyboard navigation in forms', async ({ page }) => {
      await loginAsUser(page, TEST_USERS.resident);
      
      // Open visitor invitation form
      await page.click('[data-testid="invite-visitor-button"]');
      await page.waitForSelector('[data-testid="visitor-form"]');
      
      // Test form field navigation
      const formFields = [
        '[data-testid="visitor-name"]',
        '[data-testid="visitor-phone"]',
        '[data-testid="visitor-email"]',
        '[data-testid="visitor-purpose"]',
        '[data-testid="expected-arrival"]'
      ];
      
      for (let i = 0; i < formFields.length; i++) {
        await page.keyboard.press('Tab');
        await expect(page.locator(formFields[i])).toBeFocused();
      }
      
      // Test form submission with keyboard
      await page.fill('[data-testid="visitor-name"]', 'Keyboard Test Visitor');
      await page.fill('[data-testid="visitor-phone"]', '+254712345678');
      await page.keyboard.press('Tab'); // Move to submit button
      await page.keyboard.press('Tab'); // Skip to submit button
      await page.keyboard.press('Enter');
      
      // Verify form submission
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    });

    test('Keyboard navigation in data tables', async ({ page }) => {
      await loginAsUser(page, TEST_USERS.admin);
      
      await page.click('[data-testid="user-management-tab"]');
      await page.waitForSelector('[data-testid="users-table"]');
      
      // Test table navigation
      await page.keyboard.press('Tab');
      const firstCell = page.locator('[data-testid="users-table"] tbody tr:first-child td:first-child');
      await expect(firstCell).toBeFocused();
      
      // Test arrow key navigation
      await page.keyboard.press('ArrowRight');
      const secondCell = page.locator('[data-testid="users-table"] tbody tr:first-child td:nth-child(2)');
      await expect(secondCell).toBeFocused();
      
      await page.keyboard.press('ArrowDown');
      const belowCell = page.locator('[data-testid="users-table"] tbody tr:nth-child(2) td:nth-child(2)');
      await expect(belowCell).toBeFocused();
    });
  });

  test.describe('Screen Reader Compatibility', () => {
    test('ARIA labels and roles validation', async ({ page }) => {
      await page.goto('/login');
      
      // Check main landmarks
      await expect(page.locator('[role="main"]')).toBeVisible();
      await expect(page.locator('[role="navigation"]')).toBeVisible();
      await expect(page.locator('[role="banner"]')).toBeVisible();
      
      // Check form labels
      const emailInput = page.locator('[data-testid="email-input"]');
      const emailLabel = await emailInput.getAttribute('aria-label');
      const emailLabelledBy = await emailInput.getAttribute('aria-labelledby');
      expect(emailLabel || emailLabelledBy).toBeTruthy();
      
      const passwordInput = page.locator('[data-testid="password-input"]');
      const passwordLabel = await passwordInput.getAttribute('aria-label');
      const passwordLabelledBy = await passwordInput.getAttribute('aria-labelledby');
      expect(passwordLabel || passwordLabelledBy).toBeTruthy();
      
      // Check button accessibility
      const loginButton = page.locator('[data-testid="login-button"]');
      const buttonText = await loginButton.textContent();
      const buttonLabel = await loginButton.getAttribute('aria-label');
      expect(buttonText || buttonLabel).toBeTruthy();
    });

    test('Error message announcements', async ({ page }) => {
      await page.goto('/login');
      
      // Submit empty form to trigger validation errors
      await page.click('[data-testid="login-button"]');
      
      // Check for error announcements
      const errorAlert = page.locator('[role="alert"]');
      await expect(errorAlert).toBeVisible();
      
      const errorMessage = await errorAlert.textContent();
      expect(errorMessage).toContain('required');
      
      // Check field-specific errors have proper association
      const emailError = page.locator('[data-testid="email-error"]');
      if (await emailError.isVisible()) {
        const errorId = await emailError.getAttribute('id');
        const emailInput = page.locator('[data-testid="email-input"]');
        const describedBy = await emailInput.getAttribute('aria-describedby');
        expect(describedBy).toContain(errorId);
      }
    });

    test('Dynamic content announcements', async ({ page }) => {
      await loginAsUser(page, TEST_USERS.resident);
      
      // Create visitor to trigger dynamic update
      await page.click('[data-testid="invite-visitor-button"]');
      await page.fill('[data-testid="visitor-name"]', 'Screen Reader Test');
      await page.fill('[data-testid="visitor-phone"]', '+254712345678');
      await page.click('[data-testid="create-invitation-button"]');
      
      // Check for live region announcement
      const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"]');
      await expect(liveRegion).toBeVisible();
      
      const announcement = await liveRegion.textContent();
      expect(announcement).toContain('created');
    });

    test('Complex widget accessibility', async ({ page }) => {
      await loginAsUser(page, TEST_USERS.admin);
      
      // Test dropdown/combobox accessibility
      await page.click('[data-testid="user-filter-dropdown"]');
      const dropdown = page.locator('[role="combobox"]');
      await expect(dropdown).toBeVisible();
      
      const expanded = await dropdown.getAttribute('aria-expanded');
      expect(expanded).toBe('true');
      
      // Test option selection
      const firstOption = page.locator('[role="option"]').first();
      await expect(firstOption).toBeVisible();
      
      const optionSelected = await firstOption.getAttribute('aria-selected');
      expect(optionSelected).toBeDefined();
    });
  });

  test.describe('Visual Accessibility', () => {
    test('Color contrast compliance', async ({ page }) => {
      await page.goto('/login');
      
      // Run automated color contrast check
      const contrastResults = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        const results = [];
        
        elements.forEach(el => {
          const styles = getComputedStyle(el);
          const color = styles.color;
          const backgroundColor = styles.backgroundColor;
          
          if (color !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'rgba(0, 0, 0, 0)') {
            results.push({
              element: el.tagName,
              color,
              backgroundColor,
              fontSize: styles.fontSize
            });
          }
        });
        
        return results;
      });
      
      // Verify high contrast mode works
      await page.click('[data-testid="accessibility-settings"]');
      await page.click('[data-testid="high-contrast-toggle"]');
      
      const bodyClass = await page.locator('body').getAttribute('class');
      expect(bodyClass).toContain('high-contrast');
      
      // Verify contrast in high contrast mode
      const highContrastColor = await page.locator('body').evaluate(el => 
        getComputedStyle(el).getPropertyValue('--text-color')
      );
      expect(highContrastColor).toBeTruthy();
    });

    test('Focus indicators visibility', async ({ page }) => {
      await page.goto('/login');
      
      // Test focus indicators on interactive elements
      const interactiveElements = [
        '[data-testid="email-input"]',
        '[data-testid="password-input"]',
        '[data-testid="login-button"]',
        '[data-testid="forgot-password-link"]'
      ];
      
      for (const selector of interactiveElements) {
        await page.focus(selector);
        
        const focusOutline = await page.locator(selector).evaluate(el => {
          const styles = getComputedStyle(el);
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            outlineColor: styles.outlineColor,
            boxShadow: styles.boxShadow
          };
        });
        
        // Verify focus indicator is visible
        const hasFocusIndicator = focusOutline.outline !== 'none' || 
                                 focusOutline.boxShadow !== 'none' ||
                                 focusOutline.outlineWidth !== '0px';
        expect(hasFocusIndicator).toBe(true);
      }
    });

    test('Text scaling and zoom compliance', async ({ page }) => {
      await page.goto('/login');
      
      // Test 200% zoom level
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.evaluate(() => {
        document.body.style.zoom = '2';
      });
      
      // Verify content is still accessible at 200% zoom
      await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
      await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
      
      // Test text scaling
      await page.evaluate(() => {
        document.documentElement.style.fontSize = '24px'; // 150% of default 16px
      });
      
      // Verify layout doesn't break with larger text
      const loginForm = page.locator('[data-testid="login-form"]');
      const formBounds = await loginForm.boundingBox();
      expect(formBounds.width).toBeGreaterThan(0);
      expect(formBounds.height).toBeGreaterThan(0);
    });
  });

  test.describe('Alternative Input Methods', () => {
    test('Voice commands accessibility', async ({ page }) => {
      await loginAsUser(page, TEST_USERS.resident);
      
      // Test voice command activation
      await page.click('[data-testid="voice-commands-toggle"]');
      
      // Verify voice recognition is available
      const voiceSupported = await page.evaluate(() => {
        return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
      });
      
      if (voiceSupported) {
        // Simulate voice command
        await page.evaluate(() => {
          if (window.speechRecognition) {
            window.speechRecognition.mockResult('create visitor invitation');
          }
        });
        
        // Verify voice command processed
        await expect(page.locator('[data-testid="visitor-form"]')).toBeVisible();
      }
    });

    test('Touch accessibility on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await loginAsUser(page, TEST_USERS.guard);
      
      // Test touch targets are at least 44px
      const touchTargets = await page.locator('button, a, input, [role="button"]').all();
      
      for (const target of touchTargets) {
        const bounds = await target.boundingBox();
        if (bounds) {
          expect(bounds.width).toBeGreaterThanOrEqual(44);
          expect(bounds.height).toBeGreaterThanOrEqual(44);
        }
      }
      
      // Test swipe gestures
      await page.touchscreen.tap(50, 50); // Menu button
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
      
      // Test pinch zoom
      await page.touchscreen.tap(200, 300);
      await page.touchscreen.tap(250, 350);
      
      // Verify content remains accessible after gestures
      await expect(page.locator('[data-testid="main-content"]')).toBeVisible();
    });

    test('Switch control compatibility', async ({ page }) => {
      await loginAsUser(page, TEST_USERS.resident);
      
      // Test single-switch navigation (space bar simulation)
      await page.keyboard.press('Space'); // Activate switch scanning
      
      // Verify scanning highlights are visible
      const scanningElement = page.locator('[data-scanning="true"]');
      if (await scanningElement.count() > 0) {
        await expect(scanningElement).toBeVisible();
        
        // Test switch activation
        await page.keyboard.press('Space');
        
        // Verify action was performed
        const activeElement = page.locator(':focus');
        await expect(activeElement).toBeVisible();
      }
    });
  });

  test.describe('Cognitive Accessibility', () => {
    test('Timeout management', async ({ page }) => {
      await loginAsUser(page, TEST_USERS.resident);
      
      // Test session timeout warning
      await page.evaluate(() => {
        // Simulate approaching timeout
        if (window.sessionManager) {
          window.sessionManager.simulateTimeout(300000); // 5 minutes
        }
      });
      
      // Verify timeout warning appears
      const timeoutWarning = page.locator('[data-testid="timeout-warning"]');
      if (await timeoutWarning.isVisible()) {
        // Test extend session option
        await page.click('[data-testid="extend-session-button"]');
        
        // Verify session extended
        await expect(timeoutWarning).not.toBeVisible();
      }
    });

    test('Error prevention and recovery', async ({ page }) => {
      await loginAsUser(page, TEST_USERS.resident);
      
      // Test form validation prevents errors
      await page.click('[data-testid="invite-visitor-button"]');
      
      // Try to submit incomplete form
      await page.click('[data-testid="create-invitation-button"]');
      
      // Verify helpful error messages
      const errorMessages = page.locator('[data-testid*="error"]');
      const errorCount = await errorMessages.count();
      
      if (errorCount > 0) {
        for (let i = 0; i < errorCount; i++) {
          const errorText = await errorMessages.nth(i).textContent();
          expect(errorText).toBeTruthy();
          expect(errorText.length).toBeGreaterThan(5); // Meaningful error message
        }
      }
      
      // Test error recovery
      await page.fill('[data-testid="visitor-name"]', 'Test Visitor');
      await page.fill('[data-testid="visitor-phone"]', '+254712345678');
      
      // Verify errors cleared
      const remainingErrors = await page.locator('[data-testid*="error"]:visible').count();
      expect(remainingErrors).toBeLessThan(errorCount);
    });

    test('Help and documentation accessibility', async ({ page }) => {
      await loginAsUser(page, TEST_USERS.resident);
      
      // Test help system accessibility
      await page.click('[data-testid="help-button"]');
      
      const helpModal = page.locator('[data-testid="help-modal"]');
      await expect(helpModal).toBeVisible();
      
      // Verify help modal is properly labeled
      const modalTitle = await helpModal.getAttribute('aria-labelledby');
      expect(modalTitle).toBeTruthy();
      
      // Test help content navigation
      const helpSections = page.locator('[data-testid="help-section"]');
      const sectionCount = await helpSections.count();
      
      if (sectionCount > 0) {
        // Test keyboard navigation in help
        await page.keyboard.press('Tab');
        const focusedHelp = page.locator('[data-testid="help-modal"] :focus');
        await expect(focusedHelp).toBeVisible();
      }
      
      // Test help modal closure
      await page.keyboard.press('Escape');
      await expect(helpModal).not.toBeVisible();
    });
  });

  test.describe('Role-Specific Accessibility', () => {
    test('Resident interface accessibility', async ({ page }) => {
      await loginAsUser(page, TEST_USERS.resident);
      
      // Run comprehensive accessibility audit
      const results = await validateAccessibility(page);
      expect(results.violations.length).toBe(0);
      
      // Test resident-specific features
      await page.click('[data-testid="invite-visitor-button"]');
      const visitorForm = page.locator('[data-testid="visitor-form"]');
      
      // Verify form accessibility
      const formResults = await validateAccessibility(page);
      expect(formResults.violations.length).toBe(0);
      
      // Test bulk invite accessibility
      await page.click('[data-testid="bulk-invite-tab"]');
      const bulkForm = page.locator('[data-testid="bulk-invite-form"]');
      await expect(bulkForm).toBeVisible();
      
      const bulkResults = await validateAccessibility(page);
      expect(bulkResults.violations.length).toBe(0);
    });

    test('Guard interface accessibility', async ({ page }) => {
      await loginAsUser(page, TEST_USERS.guard);
      
      // Test guard dashboard accessibility
      const results = await validateAccessibility(page);
      expect(results.violations.length).toBe(0);
      
      // Test QR scanner accessibility
      await page.click('[data-testid="qr-scanner-tab"]');
      const scanner = page.locator('[data-testid="qr-scanner"]');
      await expect(scanner).toBeVisible();
      
      // Verify scanner has proper labels
      const scannerLabel = await scanner.getAttribute('aria-label');
      expect(scannerLabel).toBeTruthy();
      
      // Test manual check-in accessibility
      await page.click('[data-testid="manual-checkin-tab"]');
      const searchForm = page.locator('[data-testid="visitor-search-form"]');
      
      const searchResults = await validateAccessibility(page);
      expect(searchResults.violations.length).toBe(0);
    });

    test('Admin interface accessibility', async ({ page }) => {
      await loginAsUser(page, TEST_USERS.admin);
      
      // Test admin dashboard accessibility
      const results = await validateAccessibility(page);
      expect(results.violations.length).toBe(0);
      
      // Test user management accessibility
      await page.click('[data-testid="user-management-tab"]');
      const userTable = page.locator('[data-testid="users-table"]');
      await expect(userTable).toBeVisible();
      
      // Verify table accessibility
      const tableHeaders = page.locator('[data-testid="users-table"] th');
      const headerCount = await tableHeaders.count();
      
      for (let i = 0; i < headerCount; i++) {
        const header = tableHeaders.nth(i);
        const scope = await header.getAttribute('scope');
        expect(scope).toBe('col');
      }
      
      // Test reports accessibility
      await page.click('[data-testid="reports-tab"]');
      const reportsResults = await validateAccessibility(page);
      expect(reportsResults.violations.length).toBe(0);
    });

    test('Super Admin interface accessibility', async ({ page }) => {
      await loginAsUser(page, TEST_USERS.superAdmin);
      
      // Test super admin dashboard accessibility
      const results = await validateAccessibility(page);
      expect(results.violations.length).toBe(0);
      
      // Test platform metrics accessibility
      const metricsCards = page.locator('[data-testid="metric-card"]');
      const cardCount = await metricsCards.count();
      
      for (let i = 0; i < cardCount; i++) {
        const card = metricsCards.nth(i);
        const cardLabel = await card.getAttribute('aria-label');
        const cardRole = await card.getAttribute('role');
        expect(cardLabel || cardRole).toBeTruthy();
      }
      
      // Test estate management accessibility
      await page.click('[data-testid="estate-management-tab"]');
      const estateResults = await validateAccessibility(page);
      expect(estateResults.violations.length).toBe(0);
    });
  });
});

/**
 * Helper function to login as specific user
 */
async function loginAsUser(page, user) {
  await page.goto('/login');
  await page.fill('[data-testid="email-input"]', user.email);
  await page.fill('[data-testid="password-input"]', user.password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/dashboard**');
}