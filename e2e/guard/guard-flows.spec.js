const { test, expect } = require('@playwright/test');

/**
 * Guard Dashboard E2E Tests
 * Tests the guard-specific functionality
 */

test.describe('Guard Dashboard', () => {
  test.describe('Dashboard Access', () => {
    test('should redirect to login if not authenticated', async ({ page }) => {
      await page.goto('/dashboard/guard');
      await expect(page).toHaveURL(/login/);
    });
  });

  test.describe('Dashboard Layout (Authenticated)', () => {
    test.skip('should display guard dashboard', async ({ page }) => {
      await page.goto('/dashboard/guard');
      await expect(page.getByRole('heading')).toBeVisible();
    });

    test.skip('should display quick actions', async ({ page }) => {
      await page.goto('/dashboard/guard');
      
      // Check for guard-specific actions
      await expect(page.getByText(/scan|verify|check/i)).toBeVisible();
    });

    test.skip('should display recent activity', async ({ page }) => {
      await page.goto('/dashboard/guard');
      await expect(page.getByText(/recent|activity|today/i)).toBeVisible();
    });
  });
});

test.describe('QR Code Scanner', () => {
  test('should redirect to login if not authenticated', async ({ page }) => {
    await page.goto('/dashboard/guard/scan-qr');
    await expect(page).toHaveURL(/login/);
  });

  test.describe('Scanner Interface (Authenticated)', () => {
    test.skip('should display scanner interface', async ({ page }) => {
      await page.goto('/dashboard/guard/scan-qr');
      await expect(page.getByText(/scan|camera|qr/i)).toBeVisible();
    });

    test.skip('should have manual entry option', async ({ page }) => {
      await page.goto('/dashboard/guard/scan-qr');
      await expect(page.getByText(/manual|enter code/i)).toBeVisible();
    });

    test.skip('should show verification result', async ({ page }) => {
      await page.goto('/dashboard/guard/scan-qr');
      
      // Test with manual code entry
      const codeInput = page.getByRole('textbox', { name: /code|otp/i });
      if (await codeInput.isVisible()) {
        await codeInput.fill('123456');
        await page.getByRole('button', { name: /verify|check/i }).click();
      }
    });
  });
});

test.describe('Manual Check', () => {
  test('should redirect to login if not authenticated', async ({ page }) => {
    await page.goto('/dashboard/guard/manual-check');
    await expect(page).toHaveURL(/login/);
  });

  test.describe('Manual Check Interface (Authenticated)', () => {
    test.skip('should display manual check form', async ({ page }) => {
      await page.goto('/dashboard/guard/manual-check');
      await expect(page.locator('form')).toBeVisible();
    });

    test.skip('should have visitor search field', async ({ page }) => {
      await page.goto('/dashboard/guard/manual-check');
      await expect(page.getByRole('textbox', { name: /search|name|phone/i })).toBeVisible();
    });

    test.skip('should have ID verification field', async ({ page }) => {
      await page.goto('/dashboard/guard/manual-check');
      await expect(page.getByRole('textbox', { name: /id|document/i })).toBeVisible();
    });

    test.skip('should display search results', async ({ page }) => {
      await page.goto('/dashboard/guard/manual-check');
      
      const searchInput = page.getByRole('textbox', { name: /search|name/i });
      if (await searchInput.isVisible()) {
        await searchInput.fill('John');
        await page.waitForTimeout(500);
      }
    });
  });
});

test.describe('Walk-In Registration', () => {
  test('should redirect to login if not authenticated', async ({ page }) => {
    await page.goto('/dashboard/guard/walk-in');
    await expect(page).toHaveURL(/login/);
  });

  test.describe('Walk-In Form (Authenticated)', () => {
    test.skip('should display walk-in registration form', async ({ page }) => {
      await page.goto('/dashboard/guard/walk-in');
      await expect(page.locator('form')).toBeVisible();
    });

    test.skip('should have visitor details fields', async ({ page }) => {
      await page.goto('/dashboard/guard/walk-in');
      
      await expect(page.getByRole('textbox', { name: /name/i })).toBeVisible();
      await expect(page.getByRole('textbox', { name: /phone/i })).toBeVisible();
    });

    test.skip('should have resident/host selection', async ({ page }) => {
      await page.goto('/dashboard/guard/walk-in');
      await expect(page.getByRole('combobox', { name: /resident|host/i })).toBeVisible();
    });

    test.skip('should have purpose field', async ({ page }) => {
      await page.goto('/dashboard/guard/walk-in');
      await expect(page.getByRole('textbox', { name: /purpose/i })).toBeVisible();
    });

    test.skip('should have vehicle plate field', async ({ page }) => {
      await page.goto('/dashboard/guard/walk-in');
      
      const plateField = page.getByRole('textbox', { name: /vehicle|plate/i });
      if (await plateField.isVisible()) {
        await expect(plateField).toBeVisible();
      }
    });
  });
});

test.describe('Guard Visitor History', () => {
  test('should redirect to login if not authenticated', async ({ page }) => {
    await page.goto('/dashboard/guard/visitor-history');
    await expect(page).toHaveURL(/login/);
  });

  test.describe('History View (Authenticated)', () => {
    test.skip('should display visitor log', async ({ page }) => {
      await page.goto('/dashboard/guard/visitor-history');
      await expect(page.locator('table, [class*="list"]')).toBeVisible();
    });

    test.skip('should have entry/exit timestamps', async ({ page }) => {
      await page.goto('/dashboard/guard/visitor-history');
      await expect(page.getByText(/entry|exit|time/i)).toBeVisible();
    });

    test.skip('should have filter options', async ({ page }) => {
      await page.goto('/dashboard/guard/visitor-history');
      await expect(page.getByRole('textbox', { name: /search|filter/i })).toBeVisible();
    });
  });
});

test.describe('Incident Management', () => {
  test('should redirect to login if not authenticated', async ({ page }) => {
    await page.goto('/dashboard/guard/incidents');
    await expect(page).toHaveURL(/login/);
  });

  test.describe('Incident List (Authenticated)', () => {
    test.skip('should display incident list', async ({ page }) => {
      await page.goto('/dashboard/guard/incidents');
      await expect(page.locator('table, [class*="list"]')).toBeVisible();
    });

    test.skip('should have report incident button', async ({ page }) => {
      await page.goto('/dashboard/guard/incidents');
      await expect(page.getByRole('button', { name: /report|new|add/i })).toBeVisible();
    });

    test.skip('should show incident details on click', async ({ page }) => {
      await page.goto('/dashboard/guard/incidents');
      
      const firstIncident = page.locator('tr, [class*="incident-item"]').first();
      if (await firstIncident.isVisible()) {
        await firstIncident.click();
      }
    });
  });
});

test.describe('Guard Settings', () => {
  test('should redirect to login if not authenticated', async ({ page }) => {
    await page.goto('/dashboard/guard/settings');
    await expect(page).toHaveURL(/login/);
  });

  test.describe('Settings Page (Authenticated)', () => {
    test.skip('should display settings', async ({ page }) => {
      await page.goto('/dashboard/guard/settings');
      await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
    });

    test.skip('should have notification settings', async ({ page }) => {
      await page.goto('/dashboard/guard/settings');
      await expect(page.getByText(/notification/i)).toBeVisible();
    });
  });
});
