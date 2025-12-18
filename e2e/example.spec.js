const { test, expect } = require('@playwright/test');

/**
 * SecureGate Access Control System - Basic E2E Tests
 * These are smoke tests to verify the application is running correctly
 */

test.describe('SecureGate Access Control System - Smoke Tests', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    
    // Should redirect to login or show main page
    await expect(page).toHaveURL(/login|\/$/);
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    
    // Login page should have a form
    await expect(page.locator('form')).toBeVisible();
  });

  test('should display registration page', async ({ page }) => {
    await page.goto('/register');
    
    // Registration page should have a form
    await expect(page.locator('form')).toBeVisible();
  });

  test('should have working navigation between login and register', async ({ page }) => {
    await page.goto('/login');
    
    // Click register link
    const registerLink = page.getByRole('link', { name: /register|sign up|create/i });
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/register/);
    }
  });

  test('should protect dashboard routes', async ({ page }) => {
    await page.goto('/dashboard/resident');
    
    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('should load privacy policy page', async ({ page }) => {
    await page.goto('/privacy-policy');
    
    // Should load without errors
    await expect(page.locator('body')).toBeVisible();
  });

  test('should load terms of service page', async ({ page }) => {
    await page.goto('/terms-of-service');
    
    // Should load without errors
    await expect(page.locator('body')).toBeVisible();
  });
});