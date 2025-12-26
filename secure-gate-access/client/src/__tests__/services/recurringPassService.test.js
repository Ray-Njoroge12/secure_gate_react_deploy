import recurringPassService from '../../services/recurringPassService';
import apiClient from '../../utils/apiClient';

jest.mock('../../utils/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn()
  }
}));

describe('recurringPassService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getMyPasses builds query params and returns response.data', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { items: [1] } });

    const data = await recurringPassService.getMyPasses({ status: 'active', includeExpired: true });

    expect(apiClient.get).toHaveBeenCalledWith('/api/recurring-passes?status=active&includeExpired=true');
    expect(data).toEqual({ items: [1] });
  });

  test('getPass calls correct endpoint', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { id: 'p1' } });

    const data = await recurringPassService.getPass('p1');

    expect(apiClient.get).toHaveBeenCalledWith('/api/recurring-passes/p1');
    expect(data).toEqual({ id: 'p1' });
  });

  test('createPass posts payload', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { id: 'p1' } });

    const payload = { name: 'Worker' };
    const data = await recurringPassService.createPass(payload);

    expect(apiClient.post).toHaveBeenCalledWith('/api/recurring-passes', payload);
    expect(data).toEqual({ id: 'p1' });
  });

  test('updatePass puts updates', async () => {
    apiClient.put.mockResolvedValueOnce({ data: { ok: true } });

    const updates = { status: 'inactive' };
    const data = await recurringPassService.updatePass('p1', updates);

    expect(apiClient.put).toHaveBeenCalledWith('/api/recurring-passes/p1', updates);
    expect(data).toEqual({ ok: true });
  });

  test('revokePass posts reason (default null)', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { ok: true } });

    const data = await recurringPassService.revokePass('p1');

    expect(apiClient.post).toHaveBeenCalledWith('/api/recurring-passes/p1/revoke', { reason: null });
    expect(data).toEqual({ ok: true });
  });

  test('suspendPass posts to suspend endpoint', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { ok: true } });

    const data = await recurringPassService.suspendPass('p1');

    expect(apiClient.post).toHaveBeenCalledWith('/api/recurring-passes/p1/suspend');
    expect(data).toEqual({ ok: true });
  });

  test('reactivatePass posts to reactivate endpoint', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { ok: true } });

    const data = await recurringPassService.reactivatePass('p1');

    expect(apiClient.post).toHaveBeenCalledWith('/api/recurring-passes/p1/reactivate');
    expect(data).toEqual({ ok: true });
  });

  test('getPassHistory gets history endpoint', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { items: [] } });

    const data = await recurringPassService.getPassHistory('p1');

    expect(apiClient.get).toHaveBeenCalledWith('/api/recurring-passes/p1/history');
    expect(data).toEqual({ items: [] });
  });

  test('validatePass posts credential and method (default pin)', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { ok: true } });

    const data = await recurringPassService.validatePass('1234');

    expect(apiClient.post).toHaveBeenCalledWith('/api/recurring-passes/validate', { credential: '1234', method: 'pin' });
    expect(data).toEqual({ ok: true });
  });
});
