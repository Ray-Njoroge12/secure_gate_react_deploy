import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock logger
jest.mock('utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}));

// Mock UI components
jest.mock('../../components/ui/Button', () => ({
  Button: ({ children, onClick, ...props }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

jest.mock('../../components/ui/Card', () => ({
  Card: ({ children, ...props }) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }) => <div {...props}>{children}</div>,
}));

jest.mock('../../components/ui/Checkbox', () => ({
  Checkbox: ({ checked, onChange, ...props }) => (
    <input type="checkbox" checked={checked} onChange={onChange} {...props} />
  ),
}));

jest.mock('../../components/ui/Icon', () => ({
  __esModule: true,
  default: ({ name, ...props }) => <span data-testid={`icon-${name}`} {...props} />,
}));

jest.mock('../../components/ui/Label', () => ({
  Label: ({ children, ...props }) => <label {...props}>{children}</label>,
}));

// Import after mocks
import CookieConsentBanner from '../../components/CookieConsentBanner';

describe('CookieConsentBanner version tracking', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  const renderBanner = () =>
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <CookieConsentBanner />
      </MemoryRouter>
    );

  test('re-shows banner when stored version differs from current version', () => {
    // Store consent with old version
    localStorage.setItem(
      'cookieConsent',
      JSON.stringify({ version: '1.0', accepted: true, necessary: true })
    );

    renderBanner();

    expect(screen.getByText('Cookie Consent')).toBeInTheDocument();
  });

  test('does not re-show banner when version matches current version', () => {
    // Store consent with current version (1.1)
    localStorage.setItem(
      'cookieConsent',
      JSON.stringify({ version: '1.1', accepted: true, necessary: true })
    );

    renderBanner();

    expect(screen.queryByText('Cookie Consent')).not.toBeInTheDocument();
  });
});
