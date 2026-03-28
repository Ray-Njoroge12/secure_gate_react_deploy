import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// Mock PWAContext — must use require('react') inside factory because jest.mock is hoisted above imports
jest.mock('../../../components/pwa/PWAManager', () => {
  const React = require('react');
  return {
    PWAContext: React.createContext({ pwaStatus: { isOnline: false, isInstalled: false, hasPendingSync: false } })
  };
});

// Mock offlineService
jest.mock('../../../services/offlineService', () => ({
  __esModule: true,
  default: {
    cacheVisitors: jest.fn(),
    getCachedVisitors: jest.fn()
  }
}));

// Mock backgroundSyncService
jest.mock('../../../services/backgroundSyncService', () => ({
  __esModule: true,
  default: { syncVisitorAction: jest.fn() }
}));

// Mock Button
jest.mock('../../../components/ui/Button', () => ({
  __esModule: true,
  default: ({ children, ...props }) => <button {...props}>{children}</button>
}));

describe('OfflineVisitorList staleness', () => {
  test('shows "Last updated X minutes ago" when viewing offline cached data', async () => {
    const offlineService = require('../../../services/offlineService').default;
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    offlineService.getCachedVisitors.mockResolvedValue([
      { id: 1, name: 'Alice', status: 'APPROVED', cached_at: fiveMinutesAgo }
    ]);

    const { default: OfflineVisitorList } = await import('../../../components/pwa/OfflineVisitorList');

    render(<OfflineVisitorList />);

    await waitFor(() => {
      expect(screen.getByText(/last updated.*\d+\s*min/i)).toBeInTheDocument();
    });
  });

  test('shows "Last updated just now" for very recent cache', async () => {
    const offlineService = require('../../../services/offlineService').default;
    offlineService.getCachedVisitors.mockResolvedValue([
      { id: 1, name: 'Bob', status: 'PENDING', cached_at: Date.now() - 30 * 1000 }
    ]);

    const { default: OfflineVisitorList } = await import('../../../components/pwa/OfflineVisitorList');

    render(<OfflineVisitorList />);

    await waitFor(() => {
      expect(screen.getByText(/last updated.*(just now|less than)/i)).toBeInTheDocument();
    });
  });
});
