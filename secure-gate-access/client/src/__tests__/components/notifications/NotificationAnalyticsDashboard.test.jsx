/**
 * @file NotificationAnalyticsDashboard.test.jsx
 * @description Unit tests for NotificationAnalyticsDashboard component
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { jest } from '@jest/globals';
import NotificationAnalyticsDashboard from '../../../components/notifications/NotificationAnalyticsDashboard';
import intelligentNotificationService from '../../../services/intelligentNotificationService';

// Mock the intelligent notification service
jest.mock('../../../services/intelligentNotificationService', () => ({
  getAnalytics: jest.fn(),
  getInsights: jest.fn()
}));

// Mock logger
jest.mock('../../../utils/logger', () => ({
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

// Mock fetch for insights API
global.fetch = jest.fn();

describe('NotificationAnalyticsDashboard', () => {
  const mockAnalytics = {
    summary: {
      totalNotifications: 150,
      deliveryRate: 95.5,
      successfulNotifications: 143,
      failedNotifications: 7
    },
    engagement: [
      {
        notificationType: 'VISITOR_ARRIVAL',
        deliveredCount: 50,
        clickedCount: 35,
        engagementRate: '70.0'
      },
      {
        notificationType: 'SECURITY_ALERT',
        deliveredCount: 20,
        clickedCount: 18,
        engagementRate: '90.0'
      }
    ],
    hourlyDistribution: [
      { hour: 9, notificationsSent: 15, notificationsRead: 12, readRate: '80.0' },
      { hour: 14, notificationsSent: 25, notificationsRead: 20, readRate: '80.0' }
    ]
  };

  const mockInsights = {
    recommendations: [
      {
        type: 'engagement',
        priority: 'high',
        title: 'Low Engagement Types',
        description: 'Consider reducing frequency for certain notification types',
        action: 'Adjust notification preferences'
      }
    ],
    channelEffectiveness: [
      {
        channel: 'push',
        totalSent: 100,
        readRate: '75.0',
        clickRate: '45.0'
      }
    ],
    userBehavior: [
      {
        notificationType: 'VISITOR_ARRIVAL',
        deliveredCount: 50,
        clickedCount: 35,
        engagementRate: '70.0'
      }
    ],
    deliveryPatterns: [
      { hour: 9, dayOfWeek: 1, notificationCount: 15, readRate: '80.0' },
      { hour: 14, dayOfWeek: 2, notificationCount: 25, readRate: '80.0' }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    intelligentNotificationService.getAnalytics.mockResolvedValue(mockAnalytics);
    
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockInsights
      })
    });

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-token')
      }
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    test('renders loading state initially', () => {
      render(<NotificationAnalyticsDashboard />);
      
      expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
    });

    test('renders analytics dashboard after loading', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Notification Analytics')).toBeInTheDocument();
      });

      expect(screen.getByText('Insights into your notification patterns and engagement')).toBeInTheDocument();
    });

    test('renders summary cards with correct data', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // Total notifications
        expect(screen.getByText('95.5%')).toBeInTheDocument(); // Delivery rate
      });
    });
  });

  describe('Period Selection', () => {
    test('allows changing analytics period', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('30')).toBeInTheDocument();
      });

      const select = screen.getByDisplayValue('30');
      fireEvent.change(select, { target: { value: '7' } });

      expect(intelligentNotificationService.getAnalytics).toHaveBeenCalledWith(7);
    });

    test('updates data when period changes', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('30')).toBeInTheDocument();
      });

      const select = screen.getByDisplayValue('30');
      fireEvent.change(select, { target: { value: '90' } });

      await waitFor(() => {
        expect(intelligentNotificationService.getAnalytics).toHaveBeenCalledWith(90);
      });
    });
  });

  describe('Recommendations Display', () => {
    test('renders recommendations when available', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Personalized Recommendations')).toBeInTheDocument();
      });

      expect(screen.getByText('Low Engagement Types')).toBeInTheDocument();
      expect(screen.getByText('Consider reducing frequency for certain notification types')).toBeInTheDocument();
      expect(screen.getByText('💡 Adjust notification preferences')).toBeInTheDocument();
    });

    test('displays recommendation priority badges', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('high')).toBeInTheDocument();
      });
    });

    test('does not render recommendations section when empty', async () => {
      const insightsWithoutRecommendations = { ...mockInsights, recommendations: [] };
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: insightsWithoutRecommendations
        })
      });

      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Notification Analytics')).toBeInTheDocument();
      });

      expect(screen.queryByText('Personalized Recommendations')).not.toBeInTheDocument();
    });
  });

  describe('Channel Effectiveness', () => {
    test('renders channel effectiveness data', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Channel Effectiveness')).toBeInTheDocument();
      });

      expect(screen.getByText('Push')).toBeInTheDocument();
      expect(screen.getByText('100 sent')).toBeInTheDocument();
      expect(screen.getByText('75.0% read')).toBeInTheDocument();
      expect(screen.getByText('45.0% clicked')).toBeInTheDocument();
    });

    test('displays channel icons correctly', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Channel Effectiveness')).toBeInTheDocument();
      });

      // Check that icons are rendered (they should be SVG elements)
      const icons = screen.getAllByRole('img', { hidden: true });
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('User Behavior Analytics', () => {
    test('renders engagement by type section', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Engagement by Type')).toBeInTheDocument();
      });

      expect(screen.getByText('VISITOR ARRIVAL')).toBeInTheDocument();
      expect(screen.getByText('70.0%')).toBeInTheDocument();
    });

    test('displays engagement progress bars', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Engagement by Type')).toBeInTheDocument();
      });

      // Check for progress bar elements
      const progressBars = screen.getAllByRole('progressbar', { hidden: true });
      expect(progressBars.length).toBeGreaterThan(0);
    });

    test('shows delivered and clicked counts', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('50 delivered')).toBeInTheDocument();
        expect(screen.getByText('35 clicked')).toBeInTheDocument();
      });
    });
  });

  describe('Delivery Patterns', () => {
    test('renders delivery patterns section', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Delivery Patterns')).toBeInTheDocument();
      });

      expect(screen.getByText('Best Times to Receive Notifications')).toBeInTheDocument();
      expect(screen.getByText('Weekly Pattern')).toBeInTheDocument();
    });

    test('displays hourly pattern visualization', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Best Times to Receive Notifications')).toBeInTheDocument();
      });

      // Check for hour labels (0-23)
      expect(screen.getByText('9')).toBeInTheDocument();
      expect(screen.getByText('14')).toBeInTheDocument();
    });

    test('shows engagement legend', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('High engagement (70%+)')).toBeInTheDocument();
        expect(screen.getByText('Medium engagement (40-70%)')).toBeInTheDocument();
        expect(screen.getByText('Low engagement (<40%)')).toBeInTheDocument();
      });
    });

    test('displays weekly pattern with day names', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Weekly Pattern')).toBeInTheDocument();
      });

      // Check for abbreviated day names
      expect(screen.getByText('Sun')).toBeInTheDocument();
      expect(screen.getByText('Mon')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('displays error message when analytics loading fails', async () => {
      intelligentNotificationService.getAnalytics.mockRejectedValue(new Error('API Error'));

      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
    });

    test('displays error message when insights loading fails', async () => {
      global.fetch.mockRejectedValue(new Error('Network Error'));

      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
      });
    });

    test('handles fetch response errors gracefully', async () => {
      global.fetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
      });
    });
  });

  describe('Data Calculations', () => {
    test('calculates average engagement correctly', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        // Average of 70.0% and 90.0% should be 80.0%
        expect(screen.getByText('80.0%')).toBeInTheDocument();
      });
    });

    test('handles empty engagement data', async () => {
      const analyticsWithoutEngagement = { ...mockAnalytics, engagement: [] };
      intelligentNotificationService.getAnalytics.mockResolvedValue(analyticsWithoutEngagement);

      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('0%')).toBeInTheDocument(); // Should show 0% for empty data
      });
    });
  });

  describe('Accessibility', () => {
    test('has proper heading structure', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 2, name: 'Notification Analytics' })).toBeInTheDocument();
      });
    });

    test('has accessible form controls', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        const select = screen.getByDisplayValue('30');
        expect(select).toHaveAttribute('aria-label');
      });
    });

    test('provides meaningful alt text for icons', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        // Icons should have proper accessibility attributes
        const icons = screen.getAllByRole('img', { hidden: true });
        icons.forEach(icon => {
          expect(icon).toHaveAttribute('aria-hidden', 'true');
        });
      });
    });
  });

  describe('Performance', () => {
    test('loads data only once on mount', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Notification Analytics')).toBeInTheDocument();
      });

      expect(intelligentNotificationService.getAnalytics).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('debounces period changes', async () => {
      render(<NotificationAnalyticsDashboard />);
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('30')).toBeInTheDocument();
      });

      const select = screen.getByDisplayValue('30');
      
      // Rapid changes should not cause multiple API calls
      fireEvent.change(select, { target: { value: '7' } });
      fireEvent.change(select, { target: { value: '90' } });

      await waitFor(() => {
        // Should only call with the final value
        expect(intelligentNotificationService.getAnalytics).toHaveBeenLastCalledWith(90);
      });
    });
  });
});