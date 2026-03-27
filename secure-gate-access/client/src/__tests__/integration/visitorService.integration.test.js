/**
 * Visitor Service Integration Tests
 * Verifies API communication using MSW
 */

import { rest } from 'msw';

import { server } from '../../mocks/server';
import * as visitorService from '../../services/visitorService';

describe('Visitor Service Integration', () => {

    // Ensure mocks are reset after each test
    afterEach(() => {
        server.resetHandlers();
    });

    describe('createVisitor', () => {
        it('should successfully create a visitor', async () => {
            const mockVisitor = { name: 'John Doe', purpose: 'Delivery' };
            const mockResponse = {
                success: true,
                data: { id: 123, ...mockVisitor }
            };

            server.use(
                rest.post('*/api/visitors', (req, res, ctx) => {
                    return res(ctx.status(201), ctx.json(mockResponse));
                })
            );

            const result = await visitorService.createVisitor(mockVisitor);
            expect(result).toEqual(mockResponse.data);
        });

        it('should throw an error on validation failure', async () => {
            server.use(
                rest.post('*/api/visitors', (req, res, ctx) => {
                    return res(
                        ctx.status(400),
                        ctx.json({ success: false, message: 'Missing required fields' })
                    );
                })
            );

            await expect(visitorService.createVisitor({})).rejects.toThrow('Missing required fields');
        });
    });

    describe('getMyVisitors', () => {
        it('should retrieve a list of visitors', async () => {
            const mockVisitors = [
                { id: 1, name: 'Guest 1' },
                { id: 2, name: 'Guest 2' }
            ];

            server.use(
                rest.get('*/api/visitors', (req, res, ctx) => {
                    return res(
                        ctx.status(200),
                        ctx.json({ success: true, data: mockVisitors })
                    );
                })
            );

            const result = await visitorService.getMyVisitors();
            expect(result).toEqual(mockVisitors);
        });

        it('should handle network errors gracefully', async () => {
            server.use(
                rest.get('*/api/visitors', (req, res, _ctx) => {
                    return res.networkError('Failed to connect');
                })
            );

            await expect(visitorService.getMyVisitors()).rejects.toThrow('Failed to fetch');
        });
    });

    describe('bulkInvite', () => {
        it('should process bulk invites successfully', async () => {
            const payload = { eventName: 'Party', guests: [] };
            const mockResponse = {
                success: true,
                data: { inviteCode: 'ABC-123' }
            };

            server.use(
                rest.post('*/api/visitors/bulk-invite', (req, res, ctx) => {
                    return res(
                        ctx.status(200),
                        ctx.json(mockResponse)
                    );
                })
            );

            const result = await visitorService.bulkInvite(payload);
            expect(result).toEqual(mockResponse.data);
        });
    });
});
