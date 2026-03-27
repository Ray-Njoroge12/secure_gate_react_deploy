import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import VisitorPass from '../../../pages/resident/VisitorPass';
import api from '../../../utils/apiClient';

jest.mock('../../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

jest.mock('../../../utils/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn()
  }
}));

function renderWithRoute(path = '/resident/visitor-pass/1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/resident/visitor-pass/:visitorId" element={<VisitorPass />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('VisitorPass resident view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows existing pass artifact when visitor already has a token', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          visitors: [
            { id: 1, name: 'Alice', status: 'pending', visitor_token: 'vst_existing_token' }
          ]
        }
      }
    });

    renderWithRoute('/resident/visitor-pass/1');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/visitors');
    });

    const fullPassLink = await screen.findByRole('link', { name: /open full pass view/i });
    expect(fullPassLink.getAttribute('href')).toContain('/v/vst_existing_token');
    expect(screen.queryByRole('button', { name: /generate pass/i })).not.toBeInTheDocument();
  });

  test('generates pass and then exposes full pass view link', async () => {
    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          visitors: [{ id: 2, name: 'Bob', status: 'pending' }]
        }
      }
    });

    api.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          visitorToken: 'vst_generated_token',
          qrCode: 'data:image/png;base64,abc123'
        }
      }
    });

    renderWithRoute('/resident/visitor-pass/2');

    const generateButton = await screen.findByRole('button', { name: /generate pass/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/visitors/2/pass');
    });

    const fullPassLink = await screen.findByRole('link', { name: /open full pass view/i });
    expect(fullPassLink.getAttribute('href')).toContain('/v/vst_generated_token');
    expect(screen.getByAltText(/visitor pass qr code/i)).toBeInTheDocument();
  });

  test('recovers on 409 pass conflict by resolving existing pass artifact', async () => {
    api.get
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            visitors: [
              {
                id: 3,
                name: 'Charlie',
                status: 'pending_confirmation',
                inviteCode: 'inv_charlie_3',
                residentId: 9,
                hostId: 9
              }
            ]
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            visitors: [
              {
                id: 3,
                name: 'Charlie',
                status: 'pending_confirmation',
                inviteCode: 'inv_charlie_3',
                visitorToken: 'vst_existing_after_conflict',
                tokenExpiresAt: '2026-03-31T23:59:59.000Z',
                residentId: 9,
                hostId: 9
              }
            ]
          }
        }
      });

    api.post.mockRejectedValueOnce({
      response: {
        status: 409,
        data: {
          message: 'Pass already issued for this visitor'
        }
      }
    });

    renderWithRoute('/resident/visitor-pass/3');

    const generateButton = await screen.findByRole('button', { name: /generate pass/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/visitors/3/pass');
    });

    const fullPassLink = await screen.findByRole('link', { name: /open full pass view/i });
    expect(fullPassLink.getAttribute('href')).toContain('/v/vst_existing_after_conflict');
    expect(screen.getByText(/qr image is not cached here/i)).toBeInTheDocument();
    expect(screen.queryByTestId('visitor-pass-error')).not.toBeInTheDocument();
  });

  test('recovers on normalized 409 apiClient error payload by hydrating existing pass artifact', async () => {
    api.get
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            visitors: [
              {
                id: 4,
                name: 'Diana',
                status: 'pending_confirmation'
              }
            ]
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          data: {
            visitors: [
              {
                id: 4,
                name: 'Diana',
                status: 'pending_confirmation',
                visitor_token: 'vst_existing_after_normalized_conflict'
              }
            ]
          }
        }
      });

    api.post.mockRejectedValueOnce({
      status: 409,
      message: 'Pass already issued for this visitor',
      data: {
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Pass already issued for this visitor'
        }
      },
      response: {
        payload: {
          success: false,
          error: {
            code: 'CONFLICT',
            message: 'Pass already issued for this visitor'
          }
        }
      }
    });

    renderWithRoute('/resident/visitor-pass/4');

    const generateButton = await screen.findByRole('button', { name: /generate pass/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/visitors/4/pass');
    });

    const fullPassLink = await screen.findByRole('link', { name: /open full pass view/i });
    expect(fullPassLink.getAttribute('href')).toContain('/v/vst_existing_after_normalized_conflict');
    expect(screen.queryByTestId('visitor-pass-error')).not.toBeInTheDocument();
  });
});
