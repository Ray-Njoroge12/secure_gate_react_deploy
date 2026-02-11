import { renderHook, act, waitFor } from '@testing-library/react';
import { useVisitorInvite } from '../../hooks/useVisitorInvite';

describe('useVisitorInvite', () => {
    let mockFetch;

    beforeEach(() => {
        mockFetch = jest.fn();
        global.fetch = mockFetch;
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should fetch visitor details on mount', async () => {
        const mockVisitor = {
            id: 1,
            name: 'Test Visitor',
            estateId: 123,
            status: 'pending_approval'
        };

        mockFetch.mockImplementation((url) => {
            if (url.includes('/api/public/visitors/by-token/')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true, data: mockVisitor })
                });
            }
            if (url.includes('/api/public/visitors/valid-token/status')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true, data: { status: 'pending_approval' } })
                });
            }
            if (url.includes('/api/public/estate-info')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true, data: { name: 'Test Estate' } })
                });
            }
            return Promise.reject(new Error('Unknown URL'));
        });

        const { result } = renderHook(() => useVisitorInvite('valid-token'));

        expect(result.current.loading).toBe(true);
        expect(result.current.error).toBe(null);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.visitor).toEqual(mockVisitor);
        expect(result.current.estateInfo).toEqual({ name: 'Test Estate' });
        expect(result.current.error).toBe(null);
    });

    it('should handle invalid token error', async () => {
        mockFetch.mockImplementation(() => Promise.resolve({
            ok: false,
            status: 404
        }));

        const { result } = renderHook(() => useVisitorInvite('invalid-token'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe('This invitation could not be found. It may have been cancelled or the link is incorrect.');
        expect(result.current.visitor).toBe(null);
    });
});
