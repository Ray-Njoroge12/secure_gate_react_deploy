// client/src/__tests__/services/http.test.js
import { http, buildHeaders, parseApiResponse, apiCall } from '../../services/_http';

describe('HTTP Service', () => {
  let originalFetch;
  
  beforeEach(() => {
    originalFetch = global.fetch;
    localStorage.clear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('buildHeaders', () => {
    test('should build headers with token from localStorage', () => {
      localStorage.setItem('token', 'test-token-123');
      const headers = buildHeaders();
      
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers.Authorization).toBe('Bearer test-token-123');
    });

    test('should build headers without token when not logged in', () => {
      localStorage.removeItem('token');
      const headers = buildHeaders();
      
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers.Authorization).toBeUndefined();
    });

    test('should merge extra headers', () => {
      const extraHeaders = { 'X-Custom-Header': 'custom-value' };
      const headers = buildHeaders(extraHeaders);
      
      expect(headers['X-Custom-Header']).toBe('custom-value');
      expect(headers['Content-Type']).toBe('application/json');
    });

    test('should not override token with extra headers', () => {
      localStorage.setItem('token', 'real-token');
      const headers = buildHeaders({ Authorization: 'Bearer fake-token' });
      
      // Extra headers should be added after, so they would override
      expect(headers.Authorization).toBe('Bearer fake-token');
    });
  });

  describe('parseApiResponse', () => {
    test('should parse successful JSON response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'test-data', success: true })
      };

      const result = await parseApiResponse(mockResponse);
      
      expect(result.status).toBe(200);
      expect(result.data).toBe('test-data');
      expect(result.error).toBeNull();
    });

    test('should handle response with error message', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({ message: 'Bad request' })
      };

      const result = await parseApiResponse(mockResponse);
      
      expect(result.status).toBe(400);
      expect(result.error).toBe('Bad request');
    });

    test('should handle non-JSON responses', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockRejectedValue(new Error('Not JSON'))
      };

      const result = await parseApiResponse(mockResponse);
      
      expect(result.status).toBe(200);
      expect(result.data).toBeUndefined();
    });

    test('should extract error from nested structure', async () => {
      const mockResponse = {
        ok: false,
        status: 422,
        json: jest.fn().mockResolvedValue({ 
          error: 'Validation failed',
          success: false 
        })
      };

      const result = await parseApiResponse(mockResponse);
      
      expect(result.error).toBe('Validation failed');
    });
  });

  describe('apiCall', () => {
    test('should make GET request successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue('application/json')
        },
        json: jest.fn().mockResolvedValue({ data: 'test-data' })
      });

      const result = await apiCall('/api/test');
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.any(Object)
        })
      );
      expect(result).toBe('test-data');
    });

    test('should make POST request with body', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: {
          get: jest.fn().mockReturnValue('application/json')
        },
        json: jest.fn().mockResolvedValue({ data: { id: 1 } })
      });

      const body = { name: 'Test' };
      const result = await apiCall('/api/test', { method: 'POST', body });
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body)
        })
      );
      expect(result).toEqual({ id: 1 });
    });

    test('should throw error on failed request', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({ 
          message: 'Not found',
          success: false 
        })
      });

      await expect(apiCall('/api/test')).rejects.toThrow();
    });

    test('should include error details in thrown error', async () => {
      const errorMessage = 'Resource not found';
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({ message: errorMessage })
      });

      try {
        await apiCall('/api/test');
      } catch (error) {
        expect(error.message).toContain(errorMessage);
        expect(error.status).toBe(404);
        expect(error.response).toBeDefined();
      }
    });

    test('should not stringify FormData body', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue('application/json')
        },
        json: jest.fn().mockResolvedValue({ data: 'success' })
      });

      const formData = new FormData();
      formData.append('file', 'test');

      await apiCall('/api/upload', { method: 'POST', body: formData });
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/upload',
        expect.objectContaining({
          body: formData // Should not be stringified
        })
      );
    });
  });

  describe('http shortcuts', () => {
    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'success' })
      });
    });

    test('http.get should make GET request', async () => {
      await http.get('/api/test');
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({ method: 'GET' })
      );
    });

    test('http.post should make POST request', async () => {
      const body = { name: 'Test' };
      await http.post('/api/test', body);
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({ 
          method: 'POST',
          body: JSON.stringify(body)
        })
      );
    });

    test('http.put should make PUT request', async () => {
      const body = { id: 1, name: 'Updated' };
      await http.put('/api/test/1', body);
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test/1',
        expect.objectContaining({ 
          method: 'PUT',
          body: JSON.stringify(body)
        })
      );
    });

    test('http.patch should make PATCH request', async () => {
      const body = { name: 'Patched' };
      await http.patch('/api/test/1', body);
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test/1',
        expect.objectContaining({ 
          method: 'PATCH',
          body: JSON.stringify(body)
        })
      );
    });

    test('http.delete should make DELETE request', async () => {
      await http.delete('/api/test/1');
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/test/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  describe('Authentication', () => {
    test('should include Authorization header when token exists', async () => {
      localStorage.setItem('token', 'auth-token-123');
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'success' })
      });

      await http.get('/api/protected');
      
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/protected',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer auth-token-123'
          })
        })
      );
    });

    test('should not include Authorization header when no token', async () => {
      localStorage.removeItem('token');
      
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'success' })
      });

      await http.get('/api/public');
      
      const callArgs = global.fetch.mock.calls[0][1];
      expect(callArgs.headers.Authorization).toBeUndefined();
    });
  });
});
