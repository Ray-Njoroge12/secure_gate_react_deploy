import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// Mock useVisitorInvite — NAMED export, not default
jest.mock('../../../hooks/useVisitorInvite', () => ({
  useVisitorInvite: () => ({
    visitor: {
      name: 'John Doe',
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

// Mock offlineService to avoid IndexedDB in tests
jest.mock('../../../services/offlineService', () => ({
  __esModule: true,
  default: { addToSyncQueue: jest.fn().mockResolvedValue(true) }
}));

// Mock dependencies that VisitorInvitePage imports
jest.mock('qrcode.react', () => ({
  QRCodeSVG: (props) => <svg data-testid="qr-svg" {...props} />
}));
jest.mock('../../../components/visitor/SavePassModal', () => () => null);
jest.mock('../../../components/visitor/VisitorDirections', () => () => null);
jest.mock('../../../components/ui/Button', () => ({ children, ...props }) => <button {...props}>{children}</button>);

// Mock i18n to verify t() is called
const mockT = jest.fn((key) => `[${key}]`);
jest.mock('../../../i18n/index.js', () => ({
  useI18n: () => ({
    t: mockT,
    language: 'en',
    setLanguage: jest.fn(),
    formatDate: jest.fn((d) => String(d)),
    isRTL: false,
    direction: 'ltr'
  }),
  I18nProvider: ({ children }) => children,
  LanguageSelector: () => null
}));

describe('VisitorInvitePage i18n', () => {
  beforeEach(() => {
    mockT.mockClear();
    mockT.mockImplementation((key) => `[${key}]`);
  });

  test('uses t() for UI strings instead of hardcoded text', async () => {
    const VisitorInvitePage = (await import('../../../pages/public/VisitorInvitePage')).default;

    render(
      <MemoryRouter initialEntries={['/v/test-token']}>
        <Routes>
          <Route path="/v/:token" element={<VisitorInvitePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      // Verify t() was called with visitor-related keys
      const calledKeys = mockT.mock.calls.map(c => c[0]);
      expect(calledKeys.some(k => k.includes('visitor.'))).toBe(true);
    });
  });

  test('does not contain hardcoded English strings that should be translated', async () => {
    const VisitorInvitePage = (await import('../../../pages/public/VisitorInvitePage')).default;

    const { container } = render(
      <MemoryRouter initialEntries={['/v/test-token']}>
        <Routes>
          <Route path="/v/:token" element={<VisitorInvitePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      // These hardcoded strings should NOT appear — they should be replaced with t() keys
      const text = container.textContent;
      expect(text).not.toContain('Loading your invite...');
      expect(text).not.toContain('Invite Not Available');
    });
  });
});
