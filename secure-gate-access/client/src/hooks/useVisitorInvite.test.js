import { renderHook, act, waitFor } from '@testing-library/react';
import { useVisitorInvite } from './useVisitorInvite';

global.fetch = jest.fn();

describe('useVisitorInvite', () => {
    beforeEach(() => {
        fetch.mockClear();
    });

    it('should fetch visitor details on mount', async () => {
        const mockVisitor = {
            id: 1,
            name: 'Test Visitor',
            estateId: 123,
            status: 'pending_approval'
        };

        fetch.mockImplementation((url) => {
            if (url.includes('/api/public/visitors/by-token/')) {
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ success: true, data: mockVisitor })
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
        fetch.mockImplementation(() => Promise.resolve({
            ok: false,
            status: 404
        }));

        const { result } = renderHook(() => useVisitorInvite('invalid-token'));

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe('Invite not found or has expired');
        expect(result.current.visitor).toBe(null);
    });
});
