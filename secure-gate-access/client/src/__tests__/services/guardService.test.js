import guardService from '../../services/guardService';
import apiClient from '../../utils/apiClient';

// Mock the apiClient module
jest.mock('../../utils/apiClient', () => ({
    __esModule: true,
    default: {
        get: jest.fn(),
        post: jest.fn(),
        put: jest.fn(),
        delete: jest.fn()
    }
}));

// Mock logger to avoid console noise during tests
jest.mock('../../utils/logger', () => ({
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
}));

describe('guardService', () => {
    // Clear mocks before each test
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getVisitorHistory', () => {
        it('should fetch visitor history successfully', async () => {
            const mockData = { data: { data: [{ id: 1, name: 'John Doe' }] } };
            apiClient.get.mockResolvedValueOnce(mockData);

            const result = await guardService.getVisitorHistory();

            expect(apiClient.get).toHaveBeenCalledWith('/api/guard/visitor-history');
            expect(result).toEqual(mockData.data.data);
        });

        it('should return empty array when data is missing', async () => {
            const mockData = { data: {} };
            apiClient.get.mockResolvedValueOnce(mockData);

            const result = await guardService.getVisitorHistory();

            expect(apiClient.get).toHaveBeenCalledWith('/api/guard/visitor-history');
            expect(result).toEqual([]);
        });

        it('should throw error when api call fails', async () => {
            const mockError = new Error('Network error');
            apiClient.get.mockRejectedValueOnce(mockError);

            await expect(guardService.getVisitorHistory()).rejects.toThrow(mockError);
        });
    });

    describe('verifyVisitor', () => {
        it('should verify visitor successfully', async () => {
            const mockPassId = 'PASS-123';
            const mockResponse = { data: { valid: true, visitor: { name: 'Jane' } } };
            apiClient.post.mockResolvedValueOnce(mockResponse);

            const result = await guardService.verifyVisitor(mockPassId);

            expect(apiClient.post).toHaveBeenCalledWith('/api/guard/verify', { passId: mockPassId });
            expect(result).toEqual(mockResponse.data);
        });
    });

    describe('manualCheckIn', () => {
        it('should perform manual check-in', async () => {
            const mockVisitorData = { name: 'Visitor', purpose: 'Visit' };
            const mockResponse = { data: { success: true } };
            apiClient.post.mockResolvedValueOnce(mockResponse);

            const result = await guardService.manualCheckIn(mockVisitorData);

            expect(apiClient.post).toHaveBeenCalledWith('/api/guard/manual-checkin', mockVisitorData);
            expect(result).toEqual(mockResponse.data);
        });
    });

    describe('checkOutVisitor', () => {
        it('should check out visitor', async () => {
            const mockVisitorId = '123';
            const mockResponse = { data: { success: true } };
            apiClient.post.mockResolvedValueOnce(mockResponse);

            const result = await guardService.checkOutVisitor(mockVisitorId);

            expect(apiClient.post).toHaveBeenCalledWith('/api/guard/checkout', { visitorId: mockVisitorId });
            expect(result).toEqual(mockResponse.data);
        });
    });

    describe('registerWalkIn', () => {
        it('should register walk-in visitor', async () => {
            const mockData = { name: 'Walk In', idNumber: '999' };
            const mockResponse = { data: { success: true, id: 10 } };
            apiClient.post.mockResolvedValueOnce(mockResponse);

            const result = await guardService.registerWalkIn(mockData);

            expect(apiClient.post).toHaveBeenCalledWith('/api/guard/walk-in', mockData);
            expect(result).toEqual(mockResponse.data);
        });
    });

    describe('reportIncident', () => {
        it('should report an incident', async () => {
            const mockIncident = { title: 'Issue', description: 'Desc' };
            const mockResponse = { data: { success: true } };
            apiClient.post.mockResolvedValueOnce(mockResponse);

            const result = await guardService.reportIncident(mockIncident);

            expect(apiClient.post).toHaveBeenCalledWith('/api/guard/incident', mockIncident);
            expect(result).toEqual(mockResponse.data);
        });
    });

    describe('getGuardAnalytics', () => {
        it('should fetch analytics with params', async () => {
            const mockParams = { period: 'today' };
            const mockResponse = { data: { total: 10 } };
            apiClient.get.mockResolvedValueOnce(mockResponse);

            const result = await guardService.getGuardAnalytics(mockParams);

            expect(apiClient.get).toHaveBeenCalledWith('/api/guard/analytics', { params: mockParams });
            expect(result).toEqual(mockResponse.data);
        });

        it('should fetch analytics without params', async () => {
            const mockResponse = { data: { total: 10 } };
            apiClient.get.mockResolvedValueOnce(mockResponse);

            const result = await guardService.getGuardAnalytics();

            expect(apiClient.get).toHaveBeenCalledWith('/api/guard/analytics', { params: {} });
            expect(result).toEqual(mockResponse.data);
        });
    });

    describe('getActiveVisitors', () => {
        it('should fetch active visitors', async () => {
            const mockResponse = { data: { data: [{ id: 1, status: 'checked-in' }] } };
            apiClient.get.mockResolvedValueOnce(mockResponse);

            const result = await guardService.getActiveVisitors();

            expect(apiClient.get).toHaveBeenCalledWith('/api/guard/active-visitors');
            expect(result).toEqual(mockResponse.data.data);
        });
    });

    describe('getPendingApprovals', () => {
        it('should fetch pending approvals', async () => {
            const mockResponse = { data: { data: [{ id: 2, status: 'pending' }] } };
            apiClient.get.mockResolvedValueOnce(mockResponse);

            const result = await guardService.getPendingApprovals();

            expect(apiClient.get).toHaveBeenCalledWith('/api/guard/pending-approvals');
            expect(result).toEqual(mockResponse.data.data);
        });
    });

    describe('processApproval', () => {
        it('should process approval (approve)', async () => {
            const mockVisitorId = '456';
            const mockResponse = { data: { success: true } };
            apiClient.post.mockResolvedValueOnce(mockResponse);

            const result = await guardService.processApproval(mockVisitorId, true);

            expect(apiClient.post).toHaveBeenCalledWith('/api/guard/process-approval', {
                visitorId: mockVisitorId,
                approved: true,
                reason: ''
            });
            expect(result).toEqual(mockResponse.data);
        });

        it('should process approval (reject with reason)', async () => {
            const mockVisitorId = '456';
            const reason = 'Invalid ID';
            const mockResponse = { data: { success: true } };
            apiClient.post.mockResolvedValueOnce(mockResponse);

            const result = await guardService.processApproval(mockVisitorId, false, reason);

            expect(apiClient.post).toHaveBeenCalledWith('/api/guard/process-approval', {
                visitorId: mockVisitorId,
                approved: false,
                reason: reason
            });
            expect(result).toEqual(mockResponse.data);
        });
    });
});
