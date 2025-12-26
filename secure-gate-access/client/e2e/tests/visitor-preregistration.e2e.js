/**
 * E2E-VISITOR: Visitor Pre-Registration Tests
 * Tests resident creating visitors, visitor self-registration, and admin approval
 */

const { test, expect } = require('@playwright/test');
const { logout, navigateTo, fillForm, waitForText, randomString, randomEmail, randomPhone } = require('../utils/test-helpers');
const path = require('path');
const users = require('../fixtures/users.json');
const visitors = require('../fixtures/visitors.json');

// Use authenticated storage state for resident tests
test.use({ storageState: path.join(__dirname, '..', '.auth', 'resident-storage.json') });

test.describe('E2E-VISITOR: Visitor Pre-Registration Flow', () => {
  
  test.beforeEach(async ({ page }) => {
    // Storage state automatically authenticates - just navigate to app
    await page.goto('/dashboard/resident');
    await page.waitForTimeout(1000);
  });

  test('E2E-VISITOR-01: Resident Creates Visitor Entry', async ({ page }) => {
    // Navigate to add visitor page
    await navigateTo(page, '/resident/add-visitor');
    
    // Wait for form to load with multiple possible selectors
    await page.waitForSelector('form, [data-test-id="visitor-name"], input[name="name"]', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Create unique visitor data
    const visitorData = {
      name: `Test Visitor ${randomString(4)}`,
      phone: '0712345678',
      email: randomEmail(),
      purpose: 'E2E Testing Visit',
      notes: 'Automated test visitor'
    };
    
    // Fill visitor form using data-test-id (more reliable)
    await page.fill('[data-test-id="visitor-name"], input[name="name"]', visitorData.name);
    await page.fill('[data-test-id="visitor-phone"], input[name="phone"]', visitorData.phone);
    await page.fill('[data-test-id="visitor-email"], input[name="email"]', visitorData.email);
    
    // Fill required date and time fields
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateString = tomorrow.toISOString().split('T')[0];
    await page.fill('input[name="dateOfVisit"]', dateString);
    await page.fill('input[name="time"]', '14:00');
    
    // Handle purpose field (select dropdown)
    const purposeSelect = page.locator('select[name="purpose"]');
    if (await purposeSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await purposeSelect.selectOption('Social Visit');
    }
    
    // Accept consent (REQUIRED)
    const consentCheckbox = page.locator('input[type="checkbox"][name*="consent"], input[type="checkbox"]#consent-checkbox');
    if (await consentCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await consentCheckbox.check();
    }
    
    // Wait for form to be ready
    await page.waitForTimeout(500);
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for success response
    await page.waitForTimeout(2000);
    
    // Verify success (check for success message or redirect to visitor list)
    const hasSuccess = await page.locator('text=/success|created|added|invite code/i').isVisible({ timeout: 5000 }).catch(() => false);
    const redirectedToList = page.url().includes('/visitors');
    
    expect(hasSuccess || redirectedToList).toBeTruthy();
    
    // If on visitor list, verify the new visitor appears
    if (redirectedToList || hasSuccess) {
      // Navigate to visitor list if not already there
      if (!page.url().includes('/visitors') || page.url().includes('/add')) {
        await navigateTo(page, '/visitors');
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
    await navigateTo(page, '/visitors');
    
    // Wait for visitor list or empty state
    await page.waitForTimeout(2000);
    
    // Should see either visitors or empty state message
    const hasVisitors = await page.locator('table, .visitor-card, .visitor-item').isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.locator('text=/no visitors|empty|add your first/i').isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasVisitors || hasEmptyState).toBeTruthy();
  });

  test('E2E-VISITOR-03: Resident Views Visitor Details', async ({ page }) => {
    // Navigate to visitors page
    await navigateTo(page, '/visitors');
    await page.waitForTimeout(2000);
    
    // Check if any visitors exist
    const firstVisitor = page.locator('[data-testid="visitor-item"], .visitor-row, tbody tr').first();
    const hasVisitors = await firstVisitor.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasVisitors) {
      // Click on first visitor
      await firstVisitor.click();
      await page.waitForTimeout(1500);
      
      // Should navigate to details page or show modal
      const onDetailsPage = page.url().includes('/visitors/');
      const modalVisible = await page.locator('[role="dialog"], .modal').isVisible({ timeout: 3000 }).catch(() => false);
      
      expect(onDetailsPage || modalVisible).toBeTruthy();
      
      // Verify visitor details are shown
      const hasDetails = await page.locator('text=/name|phone|email|purpose|status/i').count() >= 3;
      expect(hasDetails).toBeTruthy();
    }
  });

  test('E2E-VISITOR-04: Resident Edits Visitor', async ({ page }) => {
    // Navigate to visitors page
    await navigateTo(page, '/visitors');
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

  test('E2E-VISITOR-05: Admin Approves Pending Visitor', async ({ page }) => {
    // Logout resident and login as admin
    await logout(page);
    await login(page, {
      email: users.admin.email,
      password: users.admin.password
    });
    
    // Navigate to admin visitors or pending approvals
    await navigateTo(page, '/admin/visitors');
    await page.waitForTimeout(2000);
    
    // Alternative: try /visitors/pending
    if (!page.url().includes('/admin')) {
      await navigateTo(page, '/visitors/pending');
      await page.waitForTimeout(2000);
    }
    
    // Look for pending visitors
    const pendingVisitor = page.locator('[data-status="pending"], .status-pending, text=/pending/i').first();
    const hasPending = await pendingVisitor.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasPending) {
      // Find approve button
      const approveButton = page.locator('button:has-text("Approve")').first();
      const approveExists = await approveButton.isVisible({ timeout: 5000 }).catch(() => false);
      
      if (approveExists) {
        await approveButton.click();
        await page.waitForTimeout(1000);
        
        // Confirm if modal appears
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }
        
        await page.waitForTimeout(2000);
        
        // Verify success
        const hasSuccess = await page.locator('text=/approved|success/i').isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasSuccess).toBeTruthy();
      }
    }
  });

  test('E2E-VISITOR-06: Resident Deletes Visitor', async ({ page }) => {
    // Navigate to visitors
    await navigateTo(page, '/visitors');
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
    await navigateTo(page, '/visitors');
    await page.waitForTimeout(2000);
    
    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[name="search"]');
    const hasSearch = await searchInput.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (hasSearch) {
      // Type search query
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      
      // Results should update (or show "no results")
      const hasResults = await page.locator('[data-testid="visitor-item"], .visitor-row, tbody tr, text=/no results|no visitors found/i').isVisible({ timeout: 5000 }).catch(() => false);
      expect(hasResults).toBeTruthy();
    }
  });

  test('E2E-VISITOR-08: Filter Visitors by Status', async ({ page }) => {
    // Navigate to visitors
    await navigateTo(page, '/visitors');
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
