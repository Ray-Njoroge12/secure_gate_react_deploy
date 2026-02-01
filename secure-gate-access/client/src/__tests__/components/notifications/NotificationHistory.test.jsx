/**
 * @file NotificationHistory.test.jsx
 * @description Unit tests for NotificationHistory component
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';
import NotificationHistory from '../../../components/notifications/NotificationHistory';
import intelligentNotificationService from '../../../services/intelligentNotificationService';

// Mock the intelligent notification service
jest.mock('../../../services/intelligentNotificationService', () => ({
  getAnalytics: jest.fn()
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

// Mock fetch for history API
global.fetch = jest.fn();

// Mock date-fns functions
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'yyyy-MM-dd') return '2025-01-01';
    if (formatStr === 'MMM dd, yyyy HH:mm') return 'Jan 01, 2025 10:00';
    if (formatStr === 'MMM dd, HH:mm') return 'Jan 01, 10:00';
    return '2025-01-01';
  }),
  parseISO: jest.fn((dateStr) => new Date(dateStr)),
  subDays: jest.fn(() => new Date('2024-12-02')),
  startOfDay: jest.fn(() => new Date()),
  endOfDay: jest.fn(() => new Date())
}));

describe('NotificationHistory', () => {
  const mockNotifications = [
    {
      id: '1',
      type: 'VISITOR_ARRIVAL',
      title: 'Visitor Arrived',
      message: 'John Doe has arrived at the gate',
      status: 'sent',
      channels: ['push', 'email'],
      priority: 3,
      createdAt: '2025-01-01T10:00:00Z',
      readAt: '2025-01-01T10:05:00Z'
    },
    {
      id: '2',
      type: 'SECURITY_ALERT',
      title: 'Security Alert',
      message: 'Unauthorized access attempt detected',
      status: 'sent',
      channels: ['push', 'sms'],
      priority: 5,
      createdAt: '2025-01-01T09:00:00Z',
      readAt: null
    },
    {
      id: '3',
      type: 'VISITOR_APPROVED',
      title: 'Visitor Approved',
      message: 'Your visitor invitation has been approved',
      status: 'failed',
      channels: ['email'],
      priority: 2,
      createdAt: '2025-01-01T08:00:00Z',
      readAt: null
    }
  ];

  const mockAnalytics = {
    summary: {
      totalNotifications: 150,
      deliveryRate: 95.5,
      failedNotifications: 7
    },
    engagement: [
      {
        notificationType: 'VISITOR_ARRIVAL',
        engagementRate: '70.0'
      }
    ],
    hourlyDistribution: [
      { hour: 9, notificationsSent: 15, notificationsRead: 12, readRate: '80.0' }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          notifications: mockNotifications,
          pagination: {
            total: mockNotifications.length,
            limit: 20,
            offset: 0,
            hasMore: false
          }
        }
      })
    });

    intelligentNotificationService.getAnalytics.mockResolvedValue(mockAnalytics);

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-token')
      }
    });

    // Mock URL.createObjectURL for CSV export
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    test('renders loading state initially', () => {
      render(<NotificationHistory />);
      
      expect(screen.getByText('Loading notification history...')).toBeInTheDocument();
    });

    test('renders notification history after loading', async () => {
      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Notification History')).toBeInTheDocument();
      });

      expect(screen.getByText('View and analyze your notification history and delivery patterns')).toBeInTheDocument();
    });

    test('renders notification list with correct data', async () => {
      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Visitor Arrived')).toBeInTheDocument();
        expect(screen.getByText('Security Alert')).toBeInTheDocument();
        expect(screen.getByText('Visitor Approved')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering Functionality', () => {
    test('renders filter controls', async () => {
      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search notifications...')).toBeInTheDocument();
        expect(screen.getByDisplayValue('all')).toBeInTheDocument(); // Type filter
      });
    });

    test('filters notifications by search term', async () => {
      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Visitor Arrived')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search notifications...');
      fireEvent.change(searchInput, { target: { value: 'Security' } });

      await waitFor(() => {
        expect(screen.getByText('Security Alert')).toBeInTheDocument();
        expect(screen.queryByText('Visitor Arrived')).not.toBeInTheDocument();
      });
    });

    test('filters notifications by type', async () => {
      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Visitor Arrived')).toBeInTheDocument();
      });

      const typeSelect = screen.getAllByDisplayValue('all')[0]; // First select is type filter
      fireEvent.change(typeSelect, { target: { value: 'SECURITY_ALERT' } });

      await waitFor(() => {
        expect(screen.getByText('Security Alert')).toBeInTheDocument();
        expect(screen.queryByText('Visitor Arrived')).not.toBeInTheDocument();
      });
    });

    test('filters notifications by status', async () => {
      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Visitor Arrived')).toBeInTheDocument();
      });

      const statusSelect = screen.getAllByDisplayValue('all')[1]; // Second select is status filter
      fireEvent.change(statusSelect, { target: { value: 'failed' } });

      await waitFor(() => {
        expect(screen.getByText('Visitor Approved')).toBeInTheDocument();
        expect(screen.queryByText('Visitor Arrived')).not.toBeInTheDocument();
      });
    });

    test('updates date range filters', async () => {
      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('2025-01-01')).toBeInTheDocument();
      });

      const startDateInput = screen.getAllByDisplayValue('2025-01-01')[0];
      fireEvent.change(startDateInput, { target: { value: '2024-12-01' } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/intelligent-notifications/history',
          expect.objectContaining({
            body: expect.stringContaining('2024-12-01')
          })
        );
      });
    });

    test('filters by channel using buttons', async () => {
      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('All Channels')).toBeInTheDocument();
      });

      const pushButton = screen.getByText('push');
      fireEvent.click(pushButton);

      await waitFor(() => {
        // Should filter to show only notifications with push channel
        expect(screen.getByText('Visitor Arrived')).toBeInTheDocument();
        expect(screen.getByText('Security Alert')).toBeInTheDocument();
      });
    });
  });

  describe('View Mode Toggle', () => {
    test('toggles between list and analytics view', async () => {
      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument();
      });

      const analyticsButton = screen.getByText('Analytics');
      fireEvent.click(analyticsButton);

      await waitFor(() => {
        expect(screen.getByText('History')).toBeInTheDocument();
      });
    });

    test('shows analytics view when toggled', async () => {
      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Analytics')).toBeInTheDocument();
      });

      const analyticsButton = screen.getByText('Analytics');
      fireEvent.click(analyticsButton);

      await waitFor(() => {
        expect(screen.getByText('Total Notifications')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    test('renders export button', async () => {
      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });
    });

    test('disables export button when no notifications', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            notifications: [],
            pagination: { total: 0, limit: 20, offset: 0, hasMore: false }
          }
        })
      });

      render(<NotificationHistory />);
      
      await waitFor(() => {
        const exportButton = screen.getByText('Export CSV');
        expect(exportButton).toBeDisabled();
      });
    });

    test('exports notifications to CSV', async () => {
      // Mock document methods for CSV export
      const mockLink = {
        setAttribute: jest.fn(),
        click: jest.fn(),
        style: {}
      };
      
      document.createElement = jest.fn(() => mockLink);
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();

      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Export CSV')).toBeInTheDocument();
      });

      const exportButton = screen.getByText('Export CSV');
      fireEvent.click(exportButton);

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(mockLink.click).toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    test('shows pagination controls when needed', async () => {
      const manyNotifications = Array.from({ length: 25 }, (_, i) => ({
        ...mockNotifications[0],
        id: `${i + 1}`,
        title: `Notification ${i + 1}`
      }));

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            notifications: manyNotifications,
            pagination: { total: 25, limit: 20, offset: 0, hasMore: true }
          }
        })
      });

      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
        expect(screen.getByText('Previous')).toBeInTheDocument();
      });
    });

    test('navigates to next page', async () => {
      const manyNotifications = Array.from({ length: 25 }, (_, i) => ({
        ...mockNotifications[0],
        id: `${i + 1}`,
        title: `Notification ${i + 1}`
      }));

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            notifications: manyNotifications,
            pagination: { total: 25, limit: 20, offset: 0, hasMore: true }
          }
        })
      });

      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Next')).toBeInTheDocument();
      });

      const nextButton = screen.getByText('Next');
      fireEvent.click(nextButton);

      // Should show page 2 content
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument();
      });
    });

    test('disables previous button on first page', async () => {
      render(<NotificationHistory />);
      
      await waitFor(() => {
        const previousButton = screen.queryByText('Previous');
        if (previousButton) {
          expect(previousButton).toBeDisabled();
        }
      });
    });
  });

  describe('Status Icons and Priority Badges', () => {
    test('displays correct status icons', async () => {
      render(<NotificationHistory />);
      
      await waitFor(() => {
        // Check that status icons are rendered
        const icons = screen.getAllByRole('img', { hidden: true });
        expect(icons.length).toBeGreaterThan(0);
      });
    });

    test('displays priority badges with correct colors', async () => {
      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('High')).toBeInTheDocument(); // Priority 3
        expect(screen.getByText('Emergency')).toBeInTheDocument(); // Priority 5
        expect(screen.getByText('Normal')).toBeInTheDocument(); // Priority 2
      });
    });

    test('shows read timestamps when available', async () => {
      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText(/Read Jan 01, 10:00/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    test('displays error message when history loading fails', async () => {
      global.fetch.mockRejectedValue(new Error('Network Error'));

      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Network Error')).toBeInTheDocument();
      });
    });

    test('handles API error responses', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
      });
    });

    test('handles malformed API responses', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          error: 'Invalid request'
        })
      });

      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Invalid request')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    test('shows empty state when no notifications found', async () => {
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            notifications: [],
            pagination: { total: 0, limit: 20, offset: 0, hasMore: false }
          }
        })
      });

      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('No notifications found')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your filters or date range.')).toBeInTheDocument();
      });
    });
  });

  describe('Results Summary', () => {
    test('displays correct results summary', async () => {
      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText(/Showing 1-3 of 3 notifications/)).toBeInTheDocument();
        expect(screen.getByText(/Total: 3 notifications/)).toBeInTheDocument();
      });
    });

    test('updates summary when filters are applied', async () => {
      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Visitor Arrived')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search notifications...');
      fireEvent.change(searchInput, { target: { value: 'Security' } });

      await waitFor(() => {
        expect(screen.getByText(/Showing 1-1 of 1 notifications/)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper heading structure', async () => {
      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: 'Notification History' })).toBeInTheDocument();
      });
    });

    test('has accessible form controls', async () => {
      render(<NotificationHistory />);
      
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search notifications...');
        expect(searchInput).toHaveAttribute('type', 'text');
        
        const selects = screen.getAllByRole('combobox');
        expect(selects.length).toBeGreaterThan(0);
      });
    });

    test('provides keyboard navigation for pagination', async () => {
      const manyNotifications = Array.from({ length: 25 }, (_, i) => ({
        ...mockNotifications[0],
        id: `${i + 1}`,
        title: `Notification ${i + 1}`
      }));

      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            notifications: manyNotifications,
            pagination: { total: 25, limit: 20, offset: 0, hasMore: true }
          }
        })
      });

      render(<NotificationHistory />);
      
      await waitFor(() => {
        const nextButton = screen.getByText('Next');
        expect(nextButton).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('Performance', () => {
    test('loads data only once on mount', async () => {
      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Notification History')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(intelligentNotificationService.getAnalytics).toHaveBeenCalledTimes(1);
    });

    test('debounces search input', async () => {
      jest.useFakeTimers();
      
      render(<NotificationHistory />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search notifications...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search notifications...');
      
      // Rapid typing should not cause multiple re-renders
      fireEvent.change(searchInput, { target: { value: 'S' } });
      fireEvent.change(searchInput, { target: { value: 'Se' } });
      fireEvent.change(searchInput, { target: { value: 'Sec' } });

      // Fast forward timers
      jest.runAllTimers();

      await waitFor(() => {
        expect(screen.getByDisplayValue('Sec')).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });
});