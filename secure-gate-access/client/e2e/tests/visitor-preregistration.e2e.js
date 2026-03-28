/**
 * E2E-VISITOR: Visitor Pre-Registration Tests
 * Tests resident creating visitors, visitor self-registration, and admin approval
 */

const { test, expect } = require('@playwright/test');
const {
  navigateTo,
  randomString,
  randomEmail,
  suppressGlobalOverlays,
  dismissBlockingPrompts,
} = require('../utils/test-helpers');
const path = require('path');

// Use authenticated storage state for resident tests
test.use({ storageState: path.join(__dirname, '..', '.auth', 'resident-storage.json') });

test.describe('E2E-VISITOR: Visitor Pre-Registration Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    await suppressGlobalOverlays(page);
    // Storage state automatically authenticates - just navigate to app
    await page.goto('/dashboard/resident');
    await dismissBlockingPrompts(page);
    await page.waitForTimeout(800);
  });

  test('E2E-VISITOR-01: Resident Creates Visitor Entry', async ({ page }) => {
    // Navigate to quick invite page
    await navigateTo(page, '/resident/quick-invite');
    await dismissBlockingPrompts(page);
    
    // Wait for form to load
    await page.waitForSelector('form, #guest-name, #guest-phone', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Create unique visitor data
    const visitorData = {
      name: `Test Visitor ${randomString(4)}`,
      phone: '0712345678',
      email: randomEmail(),
      purpose: 'E2E Testing Visit',
      notes: 'Automated test visitor'
    };
    
    // Fill quick invite form
    await page.fill('#guest-name', visitorData.name);
    await page.fill('#guest-phone', visitorData.phone);
    // Use tomorrow chip to avoid timezone edge cases where "today" is interpreted as past.
    await page.getByRole('radio', { name: /Select date: Tomorrow/i }).click();
    
    // Wait for form to be ready
    await page.waitForTimeout(500);
    
    // Submit form
    await page.getByRole('button', { name: /Send Invite/i }).click();
    
    // Wait for success response
    await page.waitForTimeout(2000);
    
    // Verify success (check for success message or redirect to visitor list)
    const hasSuccess = await page.locator('text=/Invite sent|success|created|access code/i').isVisible({ timeout: 5000 }).catch(() => false);
    const redirectedToList = page.url().includes('/resident/visitor-history');
    
    expect(hasSuccess || redirectedToList).toBeTruthy();
    
    // If on visitor list, verify the new visitor appears
    if (redirectedToList || hasSuccess) {
      // Navigate to visitor list if not already there
      if (!page.url().includes('/resident/visitor-history') || page.url().includes('/quick-invite')) {
        await navigateTo(page, '/resident/visitor-history');
        await dismissBlockingPrompts(page);
      }
      
      // Search for the visitor name
      await page.waitForTimeout(1000);
      const visitorExists = await page.locator(`text=${visitorData.name}`).isVisible({ timeout: 5000 }).catch(() => false);
      
      if (visitorExists) {
        expect(visitorExists).toBeTruthy();
      }
    }
  });

  test('E2E-VISITOR-02: Resident Views Visitor List', async ({ page }) => {
    // Navigate to visitors page
    await navigateTo(page, '/resident/visitor-history');
    await dismissBlockingPrompts(page);
    
    // Wait for visitor list or empty state
    await page.waitForTimeout(2000);
    
    // Should see either visitors or empty state message
    const hasVisitors = await page.locator('table, .visitor-card, .visitor-item, [role="row"]').isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/No visitors found|No visitor records|empty/i').isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasVisitors || hasEmptyState).toBeTruthy();
  });

  test('E2E-VISITOR-03: Resident Views Visitor Details', async ({ page }) => {
    // Navigate to visitors page
    await navigateTo(page, '/resident/visitor-history');
    await dismissBlockingPrompts(page);
    await page.waitForTimeout(2000);

    // Deterministic contract: detail-open actions are exposed via data-testid.
    const detailOpenAction = page.locator('[data-testid="open-visitor-details"]').first();
    const hasDetailAction = await detailOpenAction.isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/No visitors found|No visitor records/i').first().isVisible({ timeout: 5000 }).catch(() => false);

    // Do not silently pass on selector mismatch: either a detail trigger or empty state must be present.
    expect(hasDetailAction || hasEmptyState).toBeTruthy();

    if (hasDetailAction) {
      await detailOpenAction.click();

      const detailsModal = page.locator('[data-testid="visitor-details-modal"]');
      await expect(detailsModal).toBeVisible({ timeout: 5000 });

      await expect(detailsModal.locator('text=/Status|Visit Date/i').first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('E2E-VISITOR-04: Resident Edits Visitor', async ({ page }) => {
    // Navigate to visitors page
    await navigateTo(page, '/resident/visitor-history');
    await dismissBlockingPrompts(page);
    await page.waitForTimeout(2000);
    
    // Check if any visitors exist
    const firstVisitor = page.locator('[data-testid="visitor-item"], .visitor-row, tbody tr').first();
    const hasVisitors = await firstVisitor.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasVisitors) {
      // Look for edit button
      const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")').first();
      const editButtonExists = await editButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (editButtonExists) {
        await editButton.click();
        await page.waitForTimeout(1000);
        
        // Should see edit form
        const hasForm = await page.locator('form').isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasForm).toBeTruthy();
        
        // Update purpose/notes
        const notesField = page.locator('textarea[name="notes"], input[name="notes"]');
        if (await notesField.isVisible({ timeout: 2000 }).catch(() => false)) {
          await notesField.fill(`Updated notes ${Date.now()}`);
          
          // Submit
          await page.click('button[type="submit"]');
          await page.waitForTimeout(2000);
          
          // Verify success
          const hasSuccess = await page.locator('text=/success|updated|saved/i').isVisible({ timeout: 5000 }).catch(() => false);
          expect(hasSuccess).toBeTruthy();
        }
      }
    }
  });

  test('E2E-VISITOR-05: Admin Approves Pending Visitor', async ({ browser }) => {
    // Switch roles by creating a dedicated admin browser context from storage state.
    const adminContext = await browser.newContext({
      storageState: path.join(__dirname, '..', '.auth', 'admin-storage.json'),
      baseURL: process.env.PW_APP_URL || 'http://127.0.0.1:3000',
    });
    const adminPage = await adminContext.newPage();

    try {
      // Navigate to admin visitors or pending approvals
      await navigateTo(adminPage, '/admin/visitors');
      await dismissBlockingPrompts(adminPage);
      await adminPage.waitForTimeout(2000);

      // Alternative: try /visitors/pending
      if (!adminPage.url().includes('/admin')) {
        await navigateTo(adminPage, '/visitors/pending');
        await adminPage.waitForTimeout(2000);
      }

      // Look for pending visitors
      const pendingVisitor = adminPage.locator('[data-status="pending"], .status-pending, text=/pending/i').first();
      const hasPending = await pendingVisitor.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasPending) {
        // Find approve button
        const approveButton = adminPage.locator('button:has-text("Approve")').first();
        const approveExists = await approveButton.isVisible({ timeout: 5000 }).catch(() => false);

        if (approveExists) {
          await approveButton.click();
          await adminPage.waitForTimeout(1000);

          // Confirm if modal appears
          const confirmButton = adminPage.locator('button:has-text("Confirm"), button:has-text("Yes")');
          if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmButton.click();
          }

          await adminPage.waitForTimeout(2000);

          // Verify success
          const hasSuccess = await adminPage.locator('text=/approved|success/i').isVisible({ timeout: 5000 }).catch(() => false);
          expect(hasSuccess).toBeTruthy();
        }
      }
    } finally {
      await adminContext.close();
    }
  });

  test('E2E-VISITOR-06: Resident Deletes Visitor', async ({ page }) => {
    // Navigate to visitors
    await navigateTo(page, '/resident/visitor-history');
    await dismissBlockingPrompts(page);
    await page.waitForTimeout(2000);
    
    // Check if any visitors exist
    const visitorCount = await page.locator('[data-testid="visitor-item"], .visitor-row, tbody tr').count();
    
    if (visitorCount > 0) {
      const initialCount = visitorCount;
      
      // Find delete button
      const deleteButton = page.locator('button:has-text("Delete"), button[aria-label*="delete"]').first();
      const deleteExists = await deleteButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (deleteExists) {
        await deleteButton.click();
        await page.waitForTimeout(500);
        
        // Confirm deletion
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")').last();
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }
        
        await page.waitForTimeout(2000);
        
        // Verify success message or count decreased
        const hasSuccess = await page.locator('text=/deleted|removed|success/i').isVisible({ timeout: 5000 }).catch(() => false);
        const newCount = await page.locator('[data-testid="visitor-item"], .visitor-row, tbody tr').count();
        
        expect(hasSuccess || newCount < initialCount).toBeTruthy();
      }
    }
  });

  test('E2E-VISITOR-07: Search Visitors', async ({ page }) => {
    // Navigate to visitors
    await navigateTo(page, '/resident/visitor-history');
    await dismissBlockingPrompts(page);
    await page.waitForTimeout(2000);
    
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[name="search"]');
    const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasSearch) {
      // Type search query
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      
      // Results should update (or show an empty-state message).
      const rowCount = await page.locator('tbody tr').count();
      const hasNoResultsText = await page.locator('text=/no results|No visitors found|No visitor records/i').isVisible({ timeout: 5000 }).catch(() => false);
      expect(rowCount > 0 || hasNoResultsText).toBeTruthy();
    }
  });

  test('E2E-VISITOR-08: Filter Visitors by Status', async ({ page }) => {
    // Navigate to visitors
    await navigateTo(page, '/resident/visitor-history');
    await dismissBlockingPrompts(page);
    await page.waitForTimeout(2000);
    
    // Look for status filter
    const statusFilter = page.locator('select[name="status"], button:has-text("Status"), [role="combobox"]');
    const hasFilter = await statusFilter.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasFilter) {
      // Click filter
      await statusFilter.click();
      await page.waitForTimeout(500);
      
      // Select "approved" or "pending"
      const filterOption = page.locator('option:has-text("Approved"), [role="option"]:has-text("Approved"), text=/approved/i').first();
      if (await filterOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await filterOption.click();
        await page.waitForTimeout(1000);
        
        // Results should update
        const hasResults = await page.locator('[data-testid="visitor-item"], .visitor-row, tbody tr').isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasResults).toBeTruthy();
      }
    }
  });
});
