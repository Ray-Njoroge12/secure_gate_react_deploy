const { test, expect } = require('@playwright/test');

function jsonResponse(body, status = 200) {
  return {
    status,
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': 'http://127.0.0.1:3000',
      'access-control-allow-credentials': 'true'
    },
    body: JSON.stringify(body)
  };
}

async function suppressGlobalOverlays(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('pwa-install-dismissed', 'true');
      localStorage.setItem('notification-prompt-dismissed', 'true');
      localStorage.setItem('cookieConsent', JSON.stringify({
        necessary: true,
        analytics: false,
        marketing: false,
        preferences: false
      }));
      localStorage.setItem('cookieConsentDate', new Date().toISOString());
    } catch (e) {
      // Ignore storage write failures in constrained browser contexts.
    }
  });
}

async function mockApi(page, role) {
  await page.route('**/api/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/api/auth/me')) {
      return route.fulfill(jsonResponse({
        success: true,
        data: {
          user: {
            id: role === 'admin' ? 2 : 1,
            email: `${role}@securegate.com`,
            role,
            estate_id: 1,
            mfa_enabled: role !== 'guard'
          }
        }
      }));
    }

    if (url.includes('/api/sse/')) {
      return route.fulfill({
        status: 200,
        headers: {
          'content-type': 'text/event-stream',
          'access-control-allow-origin': 'http://127.0.0.1:3000',
          'access-control-allow-credentials': 'true'
        },
        body: ''
      });
    }

    if (url.includes('/api/visitors/active')) {
      return route.fulfill(jsonResponse({ success: true, data: [] }));
    }

    if (url.includes('/api/visitors')) {
      return route.fulfill(jsonResponse({ success: true, data: [] }));
    }

    if (url.includes('/api/announcements')) {
      return route.fulfill(jsonResponse({ success: true, data: [] }));
    }

    if (url.includes('/api/emergency')) {
      return route.fulfill(jsonResponse({ success: true, data: [] }));
    }

    if (url.includes('/api/deliveries')) {
      return route.fulfill(jsonResponse({ data: [] }));
    }

    if (url.includes('/api/guards') || url.includes('/api/residents') || url.includes('/api/approvals')) {
      return route.fulfill(jsonResponse({ success: true, data: [] }));
    }

    return route.fulfill(jsonResponse({ success: true, data: {} }));
  });
}

test.describe('Guard/Admin navigation smoke', () => {
  test('guard flow reaches scan/manual and MFA help route', async ({ page }) => {
    await suppressGlobalOverlays(page);
    await mockApi(page, 'guard');

    await page.goto('/dashboard/guard');
    await expect(page).toHaveURL(/\/dashboard\/guard(?:\?.*)?$/);

    const learnMore = page.getByRole('button', { name: /Learn More/i }).first();
    await expect(learnMore).toBeVisible();
    await learnMore.click({ force: true });

    await expect(page).toHaveURL(/\/dashboard\/guard\/help\/mfa-setup/);
    await expect(page.getByRole('heading', { name: /MFA Setup Guide/i }).first()).toBeVisible();

    await page.goto('/dashboard/guard/scan-qr');
    await expect(page.getByRole('heading', { name: /Scan QR Code/i }).first()).toBeVisible();

    await page.goto('/dashboard/guard/manual-check');
    await expect(page.getByRole('heading', { name: /Manual Check/i }).first()).toBeVisible();
  });

  test('admin users route redirects to approvals and key admin routes load', async ({ page }) => {
    await suppressGlobalOverlays(page);
    await mockApi(page, 'admin');

    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/dashboard\/admin/);

    await page.goto('/dashboard/admin/users');
    await expect(page).toHaveURL(/\/dashboard\/admin\/approvals/);

    await page.goto('/dashboard/admin/activity');
    await expect(page).toHaveURL(/\/dashboard\/admin\/activity/);

    await expect(page.locator('text=Access Restricted')).toHaveCount(0);
    await expect(page.locator('text=Application Error')).toHaveCount(0);
  });
});
