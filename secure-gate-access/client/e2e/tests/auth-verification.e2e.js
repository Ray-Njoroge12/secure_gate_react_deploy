/**
 * Authentication Verification Test
 * Verifies that storage state authentication is working correctly
 */

const { test, expect } = require('@playwright/test');
const path = require('path');

// Test with resident storage state
test.use({ storageState: path.join(__dirname, '..', '.auth', 'resident-storage.json') });

test.describe('Authentication Verification', () => {
  
  test('Verify storage state cookies are loaded', async ({ page, context }) => {
    // Check cookies are loaded
    const cookies = await context.cookies();
    console.log('Loaded cookies:', cookies.length);
    
    const authCookies = cookies.filter(c => c.name.includes('Token'));
    console.log('Auth cookies:', authCookies.map(c => c.name));
    
    expect(authCookies.length).toBeGreaterThan(0);
  });
  
  test('Verify can access protected page', async ({ page }) => {
    // Navigate to resident dashboard
    await page.goto('/dashboard/resident');
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Check current URL
    const url = page.url();
    console.log('Current URL:', url);
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'test-results/auth-verification.png', fullPage: true });
    
    // Should NOT be redirected to login
    expect(url).not.toContain('/login');
    
    // Should be on dashboard
    expect(url).toContain('/dashboard');
  });
  
  test('Verify AuthContext recognizes user', async ({ page }) => {
    await page.goto('/dashboard/resident');
    await page.waitForTimeout(2000);
    
    // Check if user menu or user indicator is visible
    const userIndicators = await page.locator('[data-testid="user-menu"], .user-profile, text=/resident/i').count();
    console.log('User indicators found:', userIndicators);
    
    // Get page content for debugging
    const content = await page.content();
    const hasLoginForm = content.includes('Sign in to your SecureGate account');
    console.log('Has login form:', hasLoginForm);
    
    expect(hasLoginForm).toBe(false);
  });
});
