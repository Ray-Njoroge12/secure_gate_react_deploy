import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

import AdminUserApprovals from '../../../components/admin/AdminUserApprovals';
import api from '../../../utils/apiClient';

const mockHandleError = jest.fn();
const mockHandleSuccess = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('../../../utils/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn()
  }
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth()
}));

jest.mock('../../../contexts/ErrorContext', () => ({
  useError: () => ({
    handleError: mockHandleError,
    handleSuccess: mockHandleSuccess
  })
}));

describe('AdminUserApprovals', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: { role: 'admin' }
    });
  });

  it('loads pending users without requiring authFetch from context', async () => {
    api.get.mockResolvedValue({
      data: {
        data: [
          {
            id: 1,
            username: 'pending-user',
            email: 'pending@example.com',
            role: 'resident',
            created_at: '2026-03-26T10:00:00Z'
          }
        ]
      }
    });

    render(<AdminUserApprovals siteId="estate-1" />);

    await waitFor(() => {
      expect(screen.getByText(/Pending Approvals \(1\)/i)).toBeInTheDocument();
    });
    expect(mockHandleError).not.toHaveBeenCalled();
    expect(api.get).toHaveBeenCalledWith('/api/admin/users/pending?siteId=estate-1');
  });

  it('still surfaces real fetch errors via handleError', async () => {
    const error = new Error('Network down');
    api.get.mockRejectedValue(error);

    render(<AdminUserApprovals siteId="estate-1" />);

    await waitFor(() => {
      expect(mockHandleError).toHaveBeenCalledTimes(1);
    });
    expect(mockHandleError).toHaveBeenCalledWith(error, { context: 'Fetching Pending Users' });
  });
});
