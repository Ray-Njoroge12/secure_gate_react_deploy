import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock useVisitorInvite — NAMED export, not default
jest.mock('../../../hooks/useVisitorInvite', () => ({
  useVisitorInvite: () => ({
    visitor: {
      id: 'v123',
      name: 'Test Visitor',
      status: 'pending_confirmation',
      isBulkInvite: false
    },
    estateInfo: { name: 'Test Estate' },
    loading: false,
    error: null,
    token: 'test-token',
    fetchVisitorDetails: jest.fn()
  })
}));

// Mock offlineService
jest.mock('../../../services/offlineService', () => ({
  __esModule: true,
  default: {
    addToSyncQueue: jest.fn().mockResolvedValue(true)
  }
}));

// Mock i18n (already added by Task 13)
jest.mock('../../../i18n/index.js', () => ({
  useI18n: () => ({ t: (key) => key, language: 'en', setLanguage: jest.fn() }),
  I18nProvider: ({ children }) => children
}));

// Mock other dependencies
jest.mock('qrcode.react', () => ({
  QRCodeSVG: (props) => <svg data-testid="qr-svg" {...props} />
}));
jest.mock('../../../components/visitor/SavePassModal', () => () => null);
jest.mock('../../../components/visitor/VisitorDirections', () => () => null);
jest.mock('../../../components/ui/Button', () => ({ children, ...props }) => <button {...props}>{children}</button>);

const offlineService = require('../../../services/offlineService').default;

// setupTests.js defines navigator.onLine as a writable own property,
// so we can assign it directly.

describe('VisitorInvitePage offline queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    offlineService.addToSyncQueue.mockResolvedValue(true);
    navigator.onLine = true; // default: online
  });

  afterEach(() => {
    navigator.onLine = true; // restore online
  });

  test('queues confirmation POST when offline and shows queued message', async () => {
    navigator.onLine = false;

    const VisitorInvitePage = (await import('../../../pages/public/VisitorInvitePage')).default;

    render(
      <MemoryRouter initialEntries={['/v/test-token']}>
        <Routes>
          <Route path="/v/:token" element={<VisitorInvitePage />} />
        </Routes>
      </MemoryRouter>
    );

    // The page should show the confirmation form for pending_confirmation status
    await waitFor(() => {
      const submitBtn = screen.queryByRole('button', { name: /confirm/i });
      expect(submitBtn).toBeInTheDocument();
    });

    // Check consent checkbox
    const consentCheckbox = screen.queryByRole('checkbox');
    expect(consentCheckbox).toBeInTheDocument();
    fireEvent.click(consentCheckbox);

    // Fill ID number — the label is rendered via t('visitor.idPassportNumber') → 'visitor.idPassportNumber'
    // Use the input's id attribute directly
    const idInput = document.getElementById('self-reg-id') || screen.queryByPlaceholderText(/enter your id/i);
    expect(idInput).toBeInTheDocument();
    fireEvent.change(idInput, { target: { value: '12345678' } });

    // Submit — button text is `✅ visitor.confirmGetPass` which matches /confirm/i
    const submitBtn = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(offlineService.addToSyncQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'visitor_confirmation',
          url: expect.stringContaining('/confirm')
        })
      );
    });
  });

  test('does not call addToSyncQueue when online', async () => {
    navigator.onLine = true;

    // Mock global fetch to return a successful response
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {} })
    });

    const VisitorInvitePage = (await import('../../../pages/public/VisitorInvitePage')).default;

    render(
      <MemoryRouter initialEntries={['/v/test-token']}>
        <Routes>
          <Route path="/v/:token" element={<VisitorInvitePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      const submitBtn = screen.queryByRole('button', { name: /confirm/i });
      expect(submitBtn).toBeInTheDocument();
    });

    // Check consent checkbox
    const consentCheckbox = screen.queryByRole('checkbox');
    expect(consentCheckbox).toBeInTheDocument();
    fireEvent.click(consentCheckbox);

    // Fill ID number
    const idInput = document.getElementById('self-reg-id') || screen.queryByPlaceholderText(/enter your id/i);
    expect(idInput).toBeInTheDocument();
    fireEvent.change(idInput, { target: { value: '12345678' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /confirm/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });

    expect(offlineService.addToSyncQueue).not.toHaveBeenCalled();

    global.fetch = originalFetch;
  });
});
