import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
jest.mock('../../../utils/apiClient');
jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ theme: 'light', resolvedTheme: 'light', isDark: false }),
  ThemeProvider: ({ children }) => children
}));
jest.mock('../../../components/common/OnboardingTour', () => ({
  useOnboardingTour: () => ({ restartTour: jest.fn() })
}));
jest.mock('../../../components/settings/NotificationSettings', () => () => <div>NotificationSettings</div>);
jest.mock('../../../components/accessibility/AccessibilitySettings', () => () => <div>AccessibilitySettings</div>);

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

// Must import after mocks
const { default: api } = require('../../../utils/apiClient');

describe('Settings MFA password change', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Profile fetch (uses raw fetch, not apiClient)
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ data: { first_name: 'Test', last_name: 'User', email: 'test@test.com' } })
    });
    // MFA status - enabled (fetched on mount after our fix)
    api.get.mockResolvedValue({
      data: { success: true, data: { mfaEnabled: true, mfaRequired: false } }
    });
  });

  test('shows MFA code input when MFA is enabled and user tries to change password', async () => {
    const Settings = (await import('../../../pages/resident/Settings')).default;

    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    );

    // Wait for MFA status to be fetched (now fetches on mount)
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/api/mfa/status');
    });

    // Navigate to password tab
    const passwordTab = screen.getByText('Password');
    fireEvent.click(passwordTab);

    // Fill in passwords
    await waitFor(() => {
      expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'OldPass123' } });
    fireEvent.change(screen.getByLabelText(/new password/i), { target: { value: 'NewPass456' } });

    // Submit - should show MFA prompt instead of sending request
    fireEvent.click(screen.getByRole('button', { name: /change password/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/authenticator code/i)).toBeInTheDocument();
    });
  });
});
