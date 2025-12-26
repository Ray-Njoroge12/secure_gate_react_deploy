import rideshareService from '../../services/rideshareService';
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

describe('rideshareService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('createEntry posts payload', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { id: 'r1' } });

    const payload = { provider: 'Uber' };
    const data = await rideshareService.createEntry(payload);

    expect(apiClient.post).toHaveBeenCalledWith('/api/rideshare', payload);
    expect(data).toEqual({ id: 'r1' });
  });

  test('getMyEntries includes includeExpired query when true', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { items: [] } });

    const data = await rideshareService.getMyEntries(true);

    expect(apiClient.get).toHaveBeenCalledWith('/api/rideshare?includeExpired=true');
    expect(data).toEqual({ items: [] });
  });

  test('getMyEntries omits query when false', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { items: [] } });

    const data = await rideshareService.getMyEntries(false);

    expect(apiClient.get).toHaveBeenCalledWith('/api/rideshare');
    expect(data).toEqual({ items: [] });
  });

  test('cancelEntry posts to cancel endpoint', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { ok: true } });

    const data = await rideshareService.cancelEntry('r1');

    expect(apiClient.post).toHaveBeenCalledWith('/api/rideshare/r1/cancel');
    expect(data).toEqual({ ok: true });
  });

  test('getPendingEntries calls pending endpoint', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { items: [] } });

    const data = await rideshareService.getPendingEntries();

    expect(apiClient.get).toHaveBeenCalledWith('/api/rideshare/pending');
    expect(data).toEqual({ items: [] });
  });

  test('validateEntry posts credential and method (default code)', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { ok: true } });

    const data = await rideshareService.validateEntry('abc');

    expect(apiClient.post).toHaveBeenCalledWith('/api/rideshare/validate', { credential: 'abc', method: 'code' });
    expect(data).toEqual({ ok: true });
  });

  test('completeEntry posts to complete endpoint', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { ok: true } });

    const data = await rideshareService.completeEntry('r1');

    expect(apiClient.post).toHaveBeenCalledWith('/api/rideshare/r1/complete');
    expect(data).toEqual({ ok: true });
  });
});
