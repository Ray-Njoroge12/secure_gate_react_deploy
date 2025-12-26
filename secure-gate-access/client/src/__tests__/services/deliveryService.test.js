import deliveryService from '../../services/deliveryService';
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

describe('deliveryService', () => {
  beforeAll(() => {
    if (typeof FormData === 'undefined') {
      global.FormData = class FormData {
        constructor() {
          this._entries = [];
        }
        append(key, value) {
          this._entries.push([key, value]);
        }
      };
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getMyDeliveries builds query params and returns response.data', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { items: [1] } });

    const data = await deliveryService.getMyDeliveries({ status: 'pending', limit: 10, offset: 20 });

    expect(apiClient.get).toHaveBeenCalledWith('/api/deliveries?status=pending&limit=10&offset=20');
    expect(data).toEqual({ items: [1] });
  });

  test('getPendingDeliveries calls correct endpoint', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { items: [] } });

    const data = await deliveryService.getPendingDeliveries();

    expect(apiClient.get).toHaveBeenCalledWith('/api/deliveries/pending');
    expect(data).toEqual({ items: [] });
  });

  test('getDeliveryDetail calls correct endpoint', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { id: 'd1' } });

    const data = await deliveryService.getDeliveryDetail('d1');

    expect(apiClient.get).toHaveBeenCalledWith('/api/deliveries/d1');
    expect(data).toEqual({ id: 'd1' });
  });

  test('getDeliveryPhoto requests blob responseType', async () => {
    apiClient.get.mockResolvedValueOnce({ data: new Blob(['x']) });

    const blob = await deliveryService.getDeliveryPhoto('d1');

    expect(apiClient.get).toHaveBeenCalledWith('/api/deliveries/d1/photo', { responseType: 'blob' });
    expect(blob).toBeInstanceOf(Blob);
  });

  test('registerDelivery posts payload', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { ok: true } });

    const payload = { packageName: 'Box' };
    const data = await deliveryService.registerDelivery(payload);

    expect(apiClient.post).toHaveBeenCalledWith('/api/deliveries', payload);
    expect(data).toEqual({ ok: true });
  });

  test('addPhoto posts FormData with multipart header', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { ok: true } });

    const photo = new Blob(['x']);
    const data = await deliveryService.addPhoto('d1', photo);

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/deliveries/d1/photo',
      expect.any(FormData),
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'multipart/form-data' })
      })
    );
    expect(data).toEqual({ ok: true });
  });

  test('collectDelivery posts collectedBy', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { ok: true } });

    const data = await deliveryService.collectDelivery('d1', 'John');

    expect(apiClient.post).toHaveBeenCalledWith('/api/deliveries/d1/collect', { collectedBy: 'John' });
    expect(data).toEqual({ ok: true });
  });

  test('notifyResident posts to notify endpoint', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { ok: true } });

    const data = await deliveryService.notifyResident('d1');

    expect(apiClient.post).toHaveBeenCalledWith('/api/deliveries/d1/notify');
    expect(data).toEqual({ ok: true });
  });

  test('setHandoffPreference posts preference', async () => {
    apiClient.post.mockResolvedValueOnce({ data: { ok: true } });

    const data = await deliveryService.setHandoffPreference('d1', 'leave_at_gate');

    expect(apiClient.post).toHaveBeenCalledWith('/api/deliveries/d1/handoff', { preference: 'leave_at_gate' });
    expect(data).toEqual({ ok: true });
  });

  test('getStats calls stats overview', async () => {
    apiClient.get.mockResolvedValueOnce({ data: { total: 1 } });

    const data = await deliveryService.getStats();

    expect(apiClient.get).toHaveBeenCalledWith('/api/deliveries/stats/overview');
    expect(data).toEqual({ total: 1 });
  });

  test('deleteHistory calls history delete endpoint', async () => {
    apiClient.delete.mockResolvedValueOnce({ data: { ok: true } });

    const data = await deliveryService.deleteHistory();

    expect(apiClient.delete).toHaveBeenCalledWith('/api/deliveries/history');
    expect(data).toEqual({ ok: true });
  });
});
