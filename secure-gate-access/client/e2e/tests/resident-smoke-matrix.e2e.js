const { test, expect } = require('@playwright/test');

const TEST_ORIGIN = 'http://127.0.0.1:3000';

function jsonResponse(body, status = 200) {
  return {
    status,
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': TEST_ORIGIN,
      'access-control-allow-credentials': 'true'
    },
    body: JSON.stringify(body)
  };
}

function buildMockVisitors() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return [
    {
      id: 1,
      name: 'Alice Resident Guest',
      phone: '0712345678',
      status: 'pending',
      date_of_visit: tomorrow.toISOString(),
      time_of_visit: '10:00'
    },
    {
      id: 2,
      name: 'Bob Checked In',
      phone: '0700111222',
      status: 'checked_in',
      date_of_visit: now.toISOString(),
      check_in: now.toISOString()
    }
  ];
}

async function mockResidentApi(page) {
  const visitors = buildMockVisitors();
  let favoriteVisitors = [
    {
      id: 10,
      name: 'Trusted Driver',
      phone: '0711111111',
      relation: 'Driver',
      notes: 'Regular pickup',
      visit_count: 6
    }
  ];

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = request.url();

    if (request.method() === 'OPTIONS') {
      return route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': TEST_ORIGIN,
          'access-control-allow-credentials': 'true',
          'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
          'access-control-allow-headers': 'Content-Type,Authorization'
        }
      });
    }

    if (url.includes('/api/auth/me')) {
      return route.fulfill(
        jsonResponse({
          success: true,
          data: {
            user: {
              id: 101,
              email: 'resident@securegate.test',
              role: 'resident',
              estate_id: 1,
              mfa_enabled: false
            }
          }
        })
      );
    }

    if (url.includes('/api/sse/')) {
      return route.fulfill({
        status: 200,
        headers: {
          'content-type': 'text/event-stream',
          'access-control-allow-origin': TEST_ORIGIN,
          'access-control-allow-credentials': 'true'
        },
        body: ''
      });
    }

    if (url.includes('/api/visitors') && request.method() === 'GET') {
      return route.fulfill(
        jsonResponse({
          success: true,
          data: visitors
        })
      );
    }

    if (url.includes('/api/visitors') && request.method() === 'POST') {
      return route.fulfill(
        jsonResponse({
          success: true,
          data: {
            id: 9001,
            inviteCode: 'SMOKE-INVITE-001',
            inviteLink: `${TEST_ORIGIN}/invite/SMOKE-INVITE-001`
          }
        })
      );
    }

    if (url.includes('/api/resident/favorites') && request.method() === 'GET') {
      return route.fulfill(
        jsonResponse({
          success: true,
          data: {
            favorites: favoriteVisitors
          }
        })
      );
    }

    if (url.includes('/api/resident/favorites') && request.method() === 'POST') {
      const body = request.postDataJSON();
      favoriteVisitors = [
        ...favoriteVisitors,
        {
          id: Date.now(),
          name: body.name,
          phone: body.phone,
          relation: body.relation || '',
          notes: body.notes || '',
          visit_count: 0
        }
      ];

      return route.fulfill(
        jsonResponse({
          success: true,
          data: { favorite: favoriteVisitors[favoriteVisitors.length - 1] }
        })
      );
    }

    if (url.includes('/api/announcements')) {
      return route.fulfill(jsonResponse({ success: true, data: [] }));
    }

    if (url.includes('/api/dashboard/stats')) {
      return route.fulfill(
        jsonResponse({
          success: true,
          data: {
            todayCheckIns: 1,
            currentlyOnPremises: 1,
            pendingApprovals: 1,
            recentArrivals: 1
          }
        })
      );
    }

    return route.fulfill(jsonResponse({ success: true, data: [] }));
  });
}

async function expectNoGlobalErrorShell(page) {
  await expect(page.locator('text=Access Restricted')).toHaveCount(0);
  await expect(page.locator('text=Application Error')).toHaveCount(0);
}

async function dismissBlockingPrompts(page) {
  const rejectCookies = page.getByRole('button', { name: /Reject All/i });
  if (await rejectCookies.isVisible({ timeout: 1200 }).catch(() => false)) {
    await rejectCookies.click({ force: true });
  }

  const pwaNotNow = page.getByRole('button', { name: /Not now/i });
  if (await pwaNotNow.isVisible({ timeout: 1200 }).catch(() => false)) {
    await pwaNotNow.click({ force: true });
  }

  // Fallback in case other transient overlays remain focused.
  await page.keyboard.press('Escape').catch(() => {});
}

test.beforeEach(async ({ page }, testInfo) => {
  const isDarkMode = testInfo.project.name.includes('dark');

  await page.addInitScript(({ isDarkMode }) => {
    localStorage.setItem('securegate-theme', isDarkMode ? 'dark' : 'light');
  }, { isDarkMode });

  await mockResidentApi(page);
});

test('resident dashboard/pages smoke matrix (theme + responsive)', async ({ page }, testInfo) => {
  const isDarkMode = testInfo.project.name.includes('dark');

  await page.goto('/dashboard/resident');
  await expect(page).toHaveURL(/\/dashboard\/resident(?:\?.*)?$/);
  await dismissBlockingPrompts(page);
  await expect(page.locator('[data-test-id="cta-quick-invite"]')).toBeVisible();
  await expect(page.getByText(/Upcoming Invites/i).first()).toBeVisible();
  await expectNoGlobalErrorShell(page);

  await expect.poll(async () => {
    return page.evaluate(() => document.documentElement.classList.contains('dark'));
  }).toBe(isDarkMode);

  await page.goto('/resident/quick-invite');
  await dismissBlockingPrompts(page);
  await expect(
    page.getByLabel('Page header').getByRole('heading', { name: /Quick Invite/i })
  ).toBeVisible();
  await expectNoGlobalErrorShell(page);

  await page.fill('#guest-name', 'Smoke Visitor');
  await page.fill('#guest-phone', '0712345678');
  await page.getByRole('radio', { name: /Select date: Today/i }).click();
  await page.getByRole('button', { name: /Send Invite/i }).click();
  await expect(page.getByText('Invite sent! 🎉')).toBeVisible();
  await expect(page.getByText('Next Steps:')).toBeVisible();

  await page.goto('/resident/visitor-history');
  await dismissBlockingPrompts(page);
  await expect(
    page.getByLabel('Page header').getByRole('heading', { name: /Visitor History/i })
  ).toBeVisible();
  await expectNoGlobalErrorShell(page);

  await page.goto('/resident/favorite-visitors');
  await dismissBlockingPrompts(page);
  await expect(
    page.getByLabel('Page header').getByRole('heading', { name: /Favorite Visitors/i })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /Add Favorite/i })).toBeVisible();
  await expectNoGlobalErrorShell(page);

  await page.goto('/resident/settings');
  await dismissBlockingPrompts(page);
  await expect(
    page.getByLabel('Page header').getByRole('heading', { name: /Settings/i })
  ).toBeVisible();
  await expectNoGlobalErrorShell(page);
});
