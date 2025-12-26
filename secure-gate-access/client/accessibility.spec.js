const { test, expect } = require('@playwright/test');

test.describe('Accessibility Smoke (Playwright)', () => {
  test('login page accessibility snapshot is available', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    const snapshot = await page.accessibility.snapshot();
    expect(snapshot).toBeTruthy();

    // Basic sanity: avoid shipping hard console errors.
    expect(consoleErrors).toEqual([]);
  });
});
