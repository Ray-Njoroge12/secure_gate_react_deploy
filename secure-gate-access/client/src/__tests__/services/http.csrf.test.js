import { apiCall } from '../../services/_http';

function mockResponse({ status = 200, ok = true, body = {}, csrfHeader = null }) {
  return {
    status,
    ok,
    headers: {
      get: (name) => (name?.toLowerCase() === 'x-csrf-token' ? csrfHeader : null)
    },
    json: async () => body
  };
}

describe('_http CSRF handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.head.innerHTML = '';
    global.fetch = jest.fn();
  });

  test('adds CSRF header from meta tag on state-changing request', async () => {
    document.head.innerHTML = '<meta name="csrf-token" content="csrf-from-meta" />';

    global.fetch.mockResolvedValueOnce(
      mockResponse({
        status: 200,
        ok: true,
        body: { success: true, data: { created: true } }
      })
    );

    const result = await apiCall('/api/visitors', {
      method: 'POST',
      body: { name: 'Guest One' }
    });

    expect(result).toEqual({ created: true });
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers['X-CSRF-Token']).toBe('csrf-from-meta');
  });

  test('refreshes CSRF token and retries once after CSRF 403', async () => {
    global.fetch
      .mockResolvedValueOnce(
        mockResponse({
          status: 403,
          ok: false,
          body: {
            success: false,
            message: 'Invalid or missing CSRF token',
            error: { code: 'CSRF_VALIDATION_FAILED' }
          }
        })
      )
      .mockResolvedValueOnce(
        mockResponse({
          status: 200,
          ok: true,
          csrfHeader: 'csrf-refreshed',
          body: { success: true, data: { csrfToken: 'csrf-refreshed' } }
        })
      )
      .mockResolvedValueOnce(
        mockResponse({
          status: 201,
          ok: true,
          body: { success: true, data: { id: 77 } }
        })
      );

    const result = await apiCall('/api/visitors', {
      method: 'POST',
      body: { name: 'Guest Two' }
    });

    expect(result).toEqual({ id: 77 });
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/auth/csrf-token',
      expect.objectContaining({ method: 'GET', credentials: 'include' })
    );

    const [, retryOptions] = global.fetch.mock.calls[2];
    expect(retryOptions.headers['X-CSRF-Token']).toBe('csrf-refreshed');

    const meta = document.querySelector('meta[name="csrf-token"]');
    expect(meta?.content).toBe('csrf-refreshed');
  });
});
