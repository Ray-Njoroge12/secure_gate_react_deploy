import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock privacyService (default export is an instance of PrivacyService)
jest.mock('../../../services/privacyService', () => ({
  __esModule: true,
  default: {
    getPrivacySettings: jest.fn(),
    getDataInventory: jest.fn(),
    getConsentHistory: jest.fn(),
    updatePrivacySettings: jest.fn(),
    requestDataExport: jest.fn(),
    getExportStatus: jest.fn(),
    downloadExport: jest.fn(),
    requestDataDeletion: jest.fn(),
  },
}));

// Mock the Button UI component
jest.mock('../../../components/ui/Button', () => {
  const MockButton = ({ children, onClick, className, role, ...rest }) => (
    <button onClick={onClick} className={className} role={role} {...rest}>
      {children}
    </button>
  );
  MockButton.displayName = 'MockButton';
  return MockButton;
});

import privacyService from '../../../services/privacyService';

const mockPrivacyService = privacyService;

const defaultSettings = {};
const defaultInventory = {
  personalInfo: { name: 'Test User', email: 'test@example.com', phone: '+254700000000', unit: 'A1' },
  visitors: [],
  deliveries: [],
};
const defaultConsents = [];

beforeEach(() => {
  mockPrivacyService.getPrivacySettings.mockResolvedValue(defaultSettings);
  mockPrivacyService.getDataInventory.mockResolvedValue(defaultInventory);
  mockPrivacyService.getConsentHistory.mockResolvedValue(defaultConsents);
});

describe('PrivacyDashboard KDPA', () => {
  test('renders Kenya Data Protection Act section', async () => {
    const PrivacyDashboard = (await import('../../../components/settings/PrivacyDashboard')).default;

    render(
      <MemoryRouter>
        <PrivacyDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      const elements = screen.getAllByText(/kenya data protection act/i);
      expect(elements.length).toBeGreaterThanOrEqual(1);
    });
  });

  test('lists KDPA Section 26 rights', async () => {
    const PrivacyDashboard = (await import('../../../components/settings/PrivacyDashboard')).default;

    render(
      <MemoryRouter>
        <PrivacyDashboard />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/right to access/i)).toBeInTheDocument();
      expect(screen.getByText(/right to rectification/i)).toBeInTheDocument();
      expect(screen.getByText(/right to erasure/i)).toBeInTheDocument();
    });
  });
});
