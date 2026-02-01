jest.mock('../../services/_http.js', () => ({
  http: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn()
  }
}));

import * as adminService from '../../services/adminService';
import { http } from '../../services/_http';

describe('adminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getMetrics calls metrics endpoint', async () => {
    http.get.mockResolvedValueOnce({ ok: true });

    const res = await adminService.getMetrics();

    expect(http.get).toHaveBeenCalledWith('/api/admin/metrics');
    expect(res).toEqual({ ok: true });
  });

  test('getAuditLogs appends query string when params provided', async () => {
    http.get.mockResolvedValueOnce({ ok: true });

    const params = { page: '1', limit: '20' };
    const qs = new URLSearchParams(params).toString();

    const res = await adminService.getAuditLogs(params);

    expect(http.get).toHaveBeenCalledWith(`/api/admin/audit-logs?${qs}`);
    expect(res).toEqual({ ok: true });
  });

  test('getAuditLogs omits query string when params empty', async () => {
    http.get.mockResolvedValueOnce({ ok: true });

    const res = await adminService.getAuditLogs({});

    expect(http.get).toHaveBeenCalledWith('/api/admin/audit-logs');
    expect(res).toEqual({ ok: true });
  });

  test('resident management endpoints', async () => {
    http.get.mockResolvedValueOnce({ ok: true });
    http.put.mockResolvedValueOnce({ ok: true });
    http.delete.mockResolvedValueOnce({ ok: true });

    await adminService.getAllResidents();
    await adminService.updateResident('r1', { name: 'X' });
    await adminService.deleteResident('r1');

    expect(http.get).toHaveBeenCalledWith('/api/admin/residents');
    expect(http.put).toHaveBeenCalledWith('/api/admin/residents/r1', { name: 'X' });
    expect(http.delete).toHaveBeenCalledWith('/api/admin/residents/r1');
  });

  test('guard management endpoints', async () => {
    http.get.mockResolvedValueOnce({ ok: true });
    http.post.mockResolvedValueOnce({ ok: true });
    http.put.mockResolvedValueOnce({ ok: true });
    http.delete.mockResolvedValueOnce({ ok: true });

    await adminService.getAllGuards();
    await adminService.addGuard({ name: 'G' });
    await adminService.updateGuard('g1', { name: 'G2' });
    await adminService.deleteGuard('g1');

    expect(http.get).toHaveBeenCalledWith('/api/guards');
    expect(http.post).toHaveBeenCalledWith('/api/guards', { name: 'G' });
    expect(http.put).toHaveBeenCalledWith('/api/guards/g1', { name: 'G2' });
    expect(http.delete).toHaveBeenCalledWith('/api/guards/g1');
  });

  test('visitor logs endpoints (with and without params)', async () => {
    http.get.mockResolvedValueOnce({ ok: true });
    http.get.mockResolvedValueOnce({ ok: true });
    http.post.mockResolvedValueOnce({ ok: true });
    http.post.mockResolvedValueOnce({ ok: true });

    const params = { status: 'pending' };
    const qs = new URLSearchParams(params).toString();

    await adminService.getVisitorLogs(params);
    await adminService.getVisitorLogs({});
    await adminService.checkInVisitor('v1');
    await adminService.checkOutVisitor('v1');

    expect(http.get).toHaveBeenNthCalledWith(1, `/api/admin/visitors?${qs}`);
    expect(http.get).toHaveBeenNthCalledWith(2, '/api/admin/visitors');
    expect(http.post).toHaveBeenNthCalledWith(1, '/api/admin/visitors/v1/check-in');
    expect(http.post).toHaveBeenNthCalledWith(2, '/api/admin/visitors/v1/check-out');
  });

  test('access logs endpoint', async () => {
    http.get.mockResolvedValueOnce({ ok: true });

    const params = { limit: '10' };
    const qs = new URLSearchParams(params).toString();

    const res = await adminService.getAccessLogs(params);

    expect(http.get).toHaveBeenCalledWith(`/api/admin/access-logs?${qs}`);
    expect(res).toEqual({ ok: true });
  });

  test('incident endpoints', async () => {
    http.get.mockResolvedValueOnce({ ok: true });
    http.post.mockResolvedValueOnce({ ok: true });
    http.put.mockResolvedValueOnce({ ok: true });
    http.delete.mockResolvedValueOnce({ ok: true });

    const params = { page: '1' };
    const qs = new URLSearchParams(params).toString();

    await adminService.getIncidents(params);
    await adminService.createIncident({ title: 'I' });
    await adminService.updateIncident('i1', { title: 'I2' });
    await adminService.deleteIncident('i1');

    expect(http.get).toHaveBeenCalledWith(`/api/admin/incidents?${qs}`);
    expect(http.post).toHaveBeenCalledWith('/api/admin/incidents', { title: 'I' });
    expect(http.put).toHaveBeenCalledWith('/api/admin/incidents/i1', { title: 'I2' });
    expect(http.delete).toHaveBeenCalledWith('/api/admin/incidents/i1');
  });

  test('user endpoints', async () => {
    http.get.mockResolvedValueOnce({ ok: true });
    http.put.mockResolvedValueOnce({ ok: true });
    http.delete.mockResolvedValueOnce({ ok: true });

    const params = { role: 'admin' };
    const qs = new URLSearchParams(params).toString();

    await adminService.getUsers(params);
    await adminService.updateUser('u1', { role: 'guard' });
    await adminService.deleteUser('u1');

    expect(http.get).toHaveBeenCalledWith(`/api/admin/users?${qs}`);
    expect(http.put).toHaveBeenCalledWith('/api/admin/users/u1', { role: 'guard' });
    expect(http.delete).toHaveBeenCalledWith('/api/admin/users/u1');
  });
});
