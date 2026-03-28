const { test, expect } = require('@playwright/test');
const { expectNoGlobalErrorShell } = require('../utils/test-helpers');

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

function createMockUser(role) {
  const roleById = {
    resident: 101,
    guard: 201,
    admin: 301,
    super_admin: 401
  };

  return {
    id: roleById[role] || 999,
    email: `${role}@securegate.test`,
    role,
    estate_id: 1,
    mfa_enabled: role !== 'guard'
  };
}

async function mockDashboardApi(page, role) {
  const user = createMockUser(role);

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
          data: { user }
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

    if (url.includes('/api/dashboard/stats')) {
      return route.fulfill(
        jsonResponse({
          success: true,
          data: {
            todayCheckIns: 2,
            currentlyOnPremises: 1,
            pendingApprovals: 0,
            recentArrivals: 1
          }
        })
      );
    }

    if (url.includes('/api/admin/super-admin/overview')) {
      return route.fulfill(
        jsonResponse({
          success: true,
          data: {
            stats: {
              totalEstates: 2,
              totalUsers: 54,
              totalVisitors: 18,
              totalIncidents: 1
            },
            systemHealth: {
              status: 'healthy'
            }
          }
        })
      );
    }

    if (url.includes('/api/admin/super-admin/system/metrics')) {
      return route.fulfill(
        jsonResponse({
          success: true,
          data: {
            latency: { p95: 120, p99: 240 },
            errorRate: 0.002,
            requestCount: 3400,
            dbPool: { utilization: 0.42, totalCount: 8, maxConnections: 20 },
            queueDepth: {
              totalBacklog: 3,
              notification: { backlog: 2 },
              export: { queued: 1 }
            },
            authAnomalies: 0,
            timestamp: new Date().toISOString()
          }
        })
      );
    }

    if (url.includes('/api/admin/super-admin/estates')) {
      return route.fulfill(
        jsonResponse({
          success: true,
          data: [
            {
              id: 1,
              name: 'Green Meadows',
              status: 'active',
              created_at: new Date('2025-01-01T08:00:00.000Z').toISOString(),
              userCount: 24,
              visitorCount: 8
            }
          ]
        })
      );
    }

    if (url.includes('/api/admin/super-admin/audit-logs')) {
      return route.fulfill(
        jsonResponse({
          success: true,
          data: [
            {
              id: 1,
              action: 'update_settings',
              user_id: 401,
              user_role: 'super_admin',
              resource: 'platform.security',
              created_at: new Date().toISOString()
            }
          ]
        })
      );
    }

    if (url.includes('/api/admin/metrics')) {
      return route.fulfill(
        jsonResponse({
          success: true,
          data: {
            invitesActive: 4,
            invitesExpired: 1,
            checkinsToday: 9,
            failedOtps: 0,
            invitesByStatus: []
          }
        })
      );
    }

    if (url.includes('/api/admin/notification-queue/stats')) {
      return route.fulfill(
        jsonResponse({
          success: true,
          data: {
            active: 1,
            completed: 12,
            failed: 0
          }
        })
      );
    }

    if (url.includes('/api/admin/notification-queue/failed')) {
      return route.fulfill(jsonResponse({ success: true, data: [] }));
    }

    if (url.includes('/api/health/detailed')) {
      return route.fulfill(
        jsonResponse({
          success: true,
          data: {
            status: 'healthy',
            components: {
              database: 'healthy',
              cache: 'healthy'
            }
          }
        })
      );
    }

    if (url.includes('/api/announcements')) {
      return route.fulfill(jsonResponse({ success: true, data: [] }));
    }

    if (url.includes('/api/visitors/active')) {
      return route.fulfill(jsonResponse({ success: true, data: [] }));
    }

    if (url.includes('/api/visitors')) {
      return route.fulfill(jsonResponse({ success: true, data: [] }));
    }

    if (url.includes('/api/approvals') || url.includes('/api/guards') || url.includes('/api/residents')) {
      return route.fulfill(jsonResponse({ success: true, data: [] }));
    }

    if (url.includes('/api/deliveries') || url.includes('/api/emergency')) {
      return route.fulfill(jsonResponse({ success: true, data: [] }));
    }

    return route.fulfill(jsonResponse({ success: true, data: {} }));
  });
}

test.describe('Dashboard role verification smoke', () => {
  test('resident dashboard renders and blocks admin dashboard access', async ({ page }) => {
    await mockDashboardApi(page, 'resident');

    await page.goto('/dashboard/resident');
    await expect(page).toHaveURL(/\/dashboard\/resident(?:\?.*)?$/);
    await expect(page.locator('[data-test-id="cta-quick-invite"]')).toBeVisible();
    await expect(page.getByText(/Upcoming Invites/i).first()).toBeVisible();

    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/dashboard\/resident(?:\?.*)?$/);
    await expectNoGlobalErrorShell(page);
  });

  test('guard dashboard supports scan, manual check, and MFA help navigation', async ({ page }) => {
    await mockDashboardApi(page, 'guard');

    await page.goto('/dashboard/guard');
    await expect(page).toHaveURL(/\/dashboard\/guard(?:\?.*)?$/);
    await expect(page.getByRole('heading', { name: /Guard Station/i }).first()).toBeVisible();

    const mfaAlert = page.getByRole('alert').filter({ hasText: /Multi-Factor Authentication|MFA/i }).first();
    const learnMore = mfaAlert.getByRole('button', { name: /Learn More/i });
    await expect(learnMore).toBeVisible();
    await learnMore.dispatchEvent('click');

    await expect(page).toHaveURL(/\/dashboard\/guard\/settings\?tab=security/);
    await expect(page.getByRole('heading', { name: /Security Settings/i }).first()).toBeVisible();

    await page.goto('/dashboard/guard/scan-qr');
    await expect(page.getByRole('heading', { name: /Scan QR Code/i }).first()).toBeVisible();

    await page.goto('/dashboard/guard/manual-check');
    await expect(page.getByRole('heading', { name: /Manual Check/i }).first()).toBeVisible();
    await expectNoGlobalErrorShell(page);
  });

  test('admin dashboard renders, users route redirects, and super-admin route is blocked', async ({ page }) => {
    await mockDashboardApi(page, 'admin');

    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/dashboard\/admin(?:\?.*)?$/);
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i }).first()).toBeVisible();

    await page.goto('/dashboard/admin/users');
    await expect(page).toHaveURL(/\/dashboard\/admin\/approvals/);
    await expect(page.getByText(/User Account Approvals/i)).toBeVisible();

    await page.goto('/dashboard/super-admin');
    await expect(page).toHaveURL(/\/dashboard\/admin(?:\?.*)?$/);
    await expectNoGlobalErrorShell(page);
  });

  test('super-admin dashboard renders overview, health tab, and can open admin dashboard', async ({ page }) => {
    await mockDashboardApi(page, 'super_admin');

    await page.goto('/dashboard/super-admin');
    await expect(page).toHaveURL(/\/dashboard\/super-admin(?:\?.*)?$/);
    await expect(page.getByRole('heading', { name: /Platform Overview/i })).toBeVisible();
    await expect(page.getByText(/Active Estates/i)).toBeVisible();

    await page.getByRole('tab', { name: /System Health Monitor/i }).dispatchEvent('click');
    await expect(page.getByText(/Latency \(P95\)/i)).toBeVisible();

    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/dashboard\/admin(?:\?.*)?$/);
    await expect(page.getByRole('heading', { name: /Admin Dashboard/i }).first()).toBeVisible();
    await expectNoGlobalErrorShell(page);
  });
});
