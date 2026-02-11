import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ScanQR from '../../../pages/guard/ScanQR';
import offlineService from '../../../services/offlineService';

const mockNavigateTo = jest.fn();

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 17, role: 'guard' } })
}));

jest.mock('../../../utils/appNavigation', () => ({
  navigateTo: (...args) => mockNavigateTo(...args)
}));

jest.mock('../../../services/offlineService', () => ({
  __esModule: true,
  default: {
    getPendingOfflineCheckIns: jest.fn(),
    addConnectionListener: jest.fn(),
    validateQRCodeOffline: jest.fn(),
    queueOfflineCheckIn: jest.fn(),
    syncPendingOperations: jest.fn()
  }
}));

jest.mock('../../../components/ui', () => {
  const React = require('react');
  const Card = ({ children, className = '', ...props }) => (
    <div className={className} {...props}>{children}</div>
  );
  Card.Content = ({ children, className = '', ...props }) => (
    <div className={className} {...props}>{children}</div>
  );
  Card.Header = ({ children }) => <div>{children}</div>;
  Card.Title = ({ children, className = '' }) => <h3 className={className}>{children}</h3>;

  return {
    Card,
    Button: ({ children, onClick, ...props }) => (
      <button onClick={onClick} {...props}>{children}</button>
    ),
    PageHeader: ({ title, actions }) => (
      <div>
        <h1>{title}</h1>
        {actions}
      </div>
    ),
    Icon: ({ name }) => <span>{name}</span>
  };
});

jest.mock('../../../components/QRScanner', () => ({ onScan }) => (
  <div data-testid="qr-scanner-mock">
    <button onClick={() => onScan(JSON.stringify({ token: 'tok_abc123', qrId: 'qr_1', v: '2.0' }))}>
      Scan Token QR
    </button>
    <button onClick={() => onScan('PASS-123-1700000000')}>Scan Legacy QR</button>
  </div>
));

describe('ScanQR Page', () => {
  const renderPage = async () => {
    render(<ScanQR />);
    await waitFor(() => {
      expect(offlineService.getPendingOfflineCheckIns).toHaveBeenCalled();
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();

    global.fetch = jest.fn();

    offlineService.getPendingOfflineCheckIns.mockResolvedValue([]);
    offlineService.addConnectionListener.mockReturnValue(() => {});
    offlineService.validateQRCodeOffline.mockResolvedValue(null);
    offlineService.queueOfflineCheckIn.mockResolvedValue({});
    offlineService.syncPendingOperations.mockResolvedValue({
      success: true,
      results: {
        checkIns: { synced: 0, failed: 0 }
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders initial state and activates scanner', async () => {
    await renderPage();

    const startButton = screen.getByRole('button', { name: /Start Camera/i });
    expect(startButton).toBeInTheDocument();

    fireEvent.click(startButton);
    expect(screen.getByTestId('qr-scanner-mock')).toBeInTheDocument();
  });

  test('uses tokenized QR check-in endpoint when token is present', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: 'Visitor checked in successfully',
        data: { visitor: { id: 1, name: 'Token Visitor' } }
      })
    });

    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Start Camera/i }));
    fireEvent.click(screen.getByRole('button', { name: /Scan Token QR/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/qr/checkin', expect.objectContaining({ method: 'POST' }));
    });

    const [, requestOptions] = global.fetch.mock.calls[0];
    expect(JSON.parse(requestOptions.body)).toEqual({ qrToken: 'tok_abc123' });

    expect(await screen.findByText(/Access Granted/i)).toBeInTheDocument();
  });

  test('falls back to legacy visitor check-in endpoint when QR token is absent', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 123, name: 'Legacy Visitor' } })
    });

    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Start Camera/i }));
    fireEvent.click(screen.getByRole('button', { name: /Scan Legacy QR/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/visitors/123/check-in', expect.objectContaining({ method: 'POST' }));
    });
  });

  test('navigates to manual check route', async () => {
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: /Enter Code Manually/i }));
    expect(mockNavigateTo).toHaveBeenCalledWith('/dashboard/guard/manual-check');
  });
});
