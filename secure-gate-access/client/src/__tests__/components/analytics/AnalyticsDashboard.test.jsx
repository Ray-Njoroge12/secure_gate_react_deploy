/**
 * Unit Tests for Analytics Dashboard Component
 * 
 * Tests comprehensive analytics display, user adoption metrics,
 * feature usage visualization, and launch readiness indicators.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AnalyticsDashboard from '../../../components/analytics/AnalyticsDashboard';
import { analyticsService } from '../../../services/analyticsService';
import { userFeedbackService } from '../../../services/userFeedbackService';

// Mock services
jest.mock('../../../services/analyticsService', () => ({
  analyticsService: {
    getAnalyticsDashboard: jest.fn(),
    getLaunchReadinessIndicators: jest.fn()
  }
}));

jest.mock('../../../services/userFeedbackService', () => ({
  userFeedbackService: {
    getFeedbackAnalytics: jest.fn()
  }
}));

// Mock recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children, data }) => (
    <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Line: ({ dataKey }) => <div data-testid={`line-${dataKey}`} />,
  BarChart: ({ children, data }) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Bar: ({ dataKey }) => <div data-testid={`bar-${dataKey}`} />,
  PieChart: ({ children }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ data: _data, dataKey, nameKey }) => (
    <div data-testid="pie" data-key={dataKey} data-name-key={nameKey} />
  ),
  Cell: () => <div data-testid="pie-cell" />,
  AreaChart: ({ children, data }) => (
    <div data-testid="area-chart" data-chart-data={JSON.stringify(data)}>
      {children}
    </div>
  ),
  Area: ({ dataKey }) => <div data-testid={`area-${dataKey}`} />,
  XAxis: ({ dataKey }) => <div data-testid={`x-axis-${dataKey}`} />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }) => (
    <div data-testid="responsive-container">{children}</div>
  )
}));

// Mock UI components
jest.mock('../../../components/ui/Card', () => ({
  Card: ({ children, className }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  CardHeader: ({ children }) => <div data-testid="card-header">{children}</div>,
  CardContent: ({ children }) => <div data-testid="card-content">{children}</div>
}));

jest.mock('../../../components/ui/Button', () => ({
  Button: ({ children, onClick, variant }) => (
    <button data-testid="button" onClick={onClick} data-variant={variant}>
      {children}
    </button>
  )
}));

jest.mock('../../../components/ui/Badge', () => ({
  Badge: ({ children, variant, className }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  )
}));

jest.mock('../../../components/ui/Tabs', () => ({
  Tabs: ({ children, value, onValueChange }) => (
    <div data-testid="tabs" data-value={value} onChange={onValueChange}>
      {children}
    </div>
  ),
  TabsContent: ({ children, value }) => (
    <div data-testid="tab-content" data-value={value}>{children}</div>
  ),
  TabsList: ({ children }) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value, onClick }) => (
    <button data-testid="tab-trigger" data-value={value} onClick={onClick}>
      {children}
    </button>
  )
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Users: () => <div data-testid="users-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Star: () => <div data-testid="star-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  BarChart3: () => <div data-testid="bar-chart-icon" />,
  PieChart: () => <div data-testid="pie-chart-icon" />,
  LineChart: () => <div data-testid="line-chart-icon" />,
  Target: () => <div data-testid="target-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />
}));

describe('AnalyticsDashboard', () => {
  const mockAnalyticsData = {
    userAdoption: {
      totalUsers: 150,
      activeUsers: 89,
      newUsersToday: 12,
      retentionRate: 75,
      trends: [
        { date: '2025-01-10', users: 140 },
        { date: '2025-01-11', users: 145 },
        { date: '2025-01-12', users: 150 }
      ]
    },
    featureUsage: {
      topFeatures: [
        { name: 'visitor_invitations', usageCount: 250, uniqueUsers: 45 },
        { name: 'visitor_management', usageCount: 180, uniqueUsers: 32 },
        { name: 'reports', usageCount: 95, uniqueUsers: 18 },
        { name: 'settings', usageCount: 75, uniqueUsers: 15 },
        { name: 'dashboard', usageCount: 120, uniqueUsers: 28 }
      ],
      trends: [
        { date: '2025-01-10', feature_name: 'visitor_invitations', daily_usage: 25 }
      ]
    },
    systemPerformance: {
      metrics: {
        cpu_usage: [
          { timestamp: '2025-01-15T10:00:00Z', average: 0.65, maximum: 0.85 }
        ],
        memory_usage: [
          { timestamp: '2025-01-15T10:00:00Z', average: 0.72, maximum: 0.89 }
        ]
      }
    },
    summary: {
      totalUsers: 150,
      activeUsers: 89,
      topFeature: 'visitor_invitations',
      systemHealth: 'healthy',
      generatedAt: '2025-01-15T10:00:00Z'
    }
  };

  const mockFeedbackAnalytics = {
    overview: {
      total_feedback: 45,
      avg_rating: 4.2,
      negative_feedback: 5,
      positive_feedback: 35
    },
    feedbackByType: [
      { feedback_type: 'feature_request', count: 20, avg_rating: 4.5 },
      { feedback_type: 'bug_report', count: 15, avg_rating: 3.2 }
    ],
    satisfactionByCategory: [
      { category: 'overall_experience', avg_rating: 4.3, count: 25 },
      { category: 'ease_of_use', avg_rating: 4.1, count: 20 }
    ]
  };

  const mockLaunchReadiness = {
    userAdoption: {
      score: 85,
      status: 'ready',
      metrics: { totalUsers: 150, activeUsers: 89 }
    },
    systemPerformance: {
      score: 92,
      status: 'ready',
      metrics: { averageResponseTime: 800, errorRate: 0.02 }
    },
    featureUsage: {
      score: 78,
      status: 'warning',
      metrics: { featuresUsed: 5, avgUsage: 15 }
    },
    overall: {
      score: 85,
      status: 'ready',
      readyForLaunch: true
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('should render loading state initially', () => {
      analyticsService.getAnalyticsDashboard.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<AnalyticsDashboard />);

      expect(screen.getByText('Loading analytics data...')).toBeInTheDocument();
    });

    test('should render error state when data fails to load', async () => {
      const error = new Error('Failed to fetch analytics');
      analyticsService.getAnalyticsDashboard.mockRejectedValueOnce(error);
      userFeedbackService.getFeedbackAnalytics.mockRejectedValueOnce(error);
      analyticsService.getLaunchReadinessIndicators.mockRejectedValueOnce(error);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load analytics')).toBeInTheDocument();
        expect(screen.getByText('Failed to fetch analytics')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    test('should render dashboard with analytics data', async () => {
      analyticsService.getAnalyticsDashboard.mockResolvedValueOnce(mockAnalyticsData);
      userFeedbackService.getFeedbackAnalytics.mockResolvedValueOnce(mockFeedbackAnalytics);
      analyticsService.getLaunchReadinessIndicators.mockResolvedValueOnce(mockLaunchReadiness);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Overview')).toBeInTheDocument();
      });
    });
  });

  describe('Time Range Selection', () => {
    test('should render time range selector buttons', async () => {
      analyticsService.getAnalyticsDashboard.mockResolvedValueOnce(mockAnalyticsData);
      userFeedbackService.getFeedbackAnalytics.mockResolvedValueOnce(mockFeedbackAnalytics);
      analyticsService.getLaunchReadinessIndicators.mockResolvedValueOnce(mockLaunchReadiness);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('7 Days')).toBeInTheDocument();
        expect(screen.getByText('30 Days')).toBeInTheDocument();
        expect(screen.getByText('90 Days')).toBeInTheDocument();
        expect(screen.getByText('1 Year')).toBeInTheDocument();
      });
    });

    test('should reload data when time range changes', async () => {
      analyticsService.getAnalyticsDashboard.mockResolvedValue(mockAnalyticsData);
      userFeedbackService.getFeedbackAnalytics.mockResolvedValue(mockFeedbackAnalytics);
      analyticsService.getLaunchReadinessIndicators.mockResolvedValue(mockLaunchReadiness);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Click on 7 Days button
      fireEvent.click(screen.getByText('7 Days'));

      await waitFor(() => {
        expect(analyticsService.getAnalyticsDashboard).toHaveBeenCalledTimes(2);
        expect(userFeedbackService.getFeedbackAnalytics).toHaveBeenCalledTimes(2);
      });
    });

    test('should highlight active time range', async () => {
      analyticsService.getAnalyticsDashboard.mockResolvedValueOnce(mockAnalyticsData);
      userFeedbackService.getFeedbackAnalytics.mockResolvedValueOnce(mockFeedbackAnalytics);
      analyticsService.getLaunchReadinessIndicators.mockResolvedValueOnce(mockLaunchReadiness);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const thirtyDaysButton = screen.getByText('30 Days');
        expect(thirtyDaysButton.closest('button')).toHaveClass('active');
      });
    });
  });

  describe('Overview Tab', () => {
    test('should display key metrics cards', async () => {
      analyticsService.getAnalyticsDashboard.mockResolvedValueOnce(mockAnalyticsData);
      userFeedbackService.getFeedbackAnalytics.mockResolvedValueOnce(mockFeedbackAnalytics);
      analyticsService.getLaunchReadinessIndicators.mockResolvedValueOnce(mockLaunchReadiness);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('150')).toBeInTheDocument(); // Total users
        expect(screen.getByText('89')).toBeInTheDocument(); // Active users
        expect(screen.getByText('visitor_invitations')).toBeInTheDocument(); // Top feature
        expect(screen.getByText('4.2/5')).toBeInTheDocument(); // Average rating
      });
    });

    test('should display metric change indicators', async () => {
      analyticsService.getAnalyticsDashboard.mockResolvedValueOnce(mockAnalyticsData);
      userFeedbackService.getFeedbackAnalytics.mockResolvedValueOnce(mockFeedbackAnalytics);
      analyticsService.getLaunchReadinessIndicators.mockResolvedValueOnce(mockLaunchReadiness);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('12% vs last period')).toBeInTheDocument();
        expect(screen.getByText('8% vs last period')).toBeInTheDocument();
      });
    });

    test('should render user growth trend chart', async () => {
      analyticsService.getAnalyticsDashboard.mockResolvedValueOnce(mockAnalyticsData);
      userFeedbackService.getFeedbackAnalytics.mockResolvedValueOnce(mockFeedbackAnalytics);
      analyticsService.getLaunchReadinessIndicators.mockResolvedValueOnce(mockLaunchReadiness);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('User Growth Trend')).toBeInTheDocument();
        expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      });
    });

    test('should render feature usage distribution chart', async () => {
      analyticsService.getAnalyticsDashboard.mockResolvedValueOnce(mockAnalyticsData);
      userFeedbackService.getFeedbackAnalytics.mockResolvedValueOnce(mockFeedbackAnalytics);
      analyticsService.getLaunchReadinessIndicators.mockResolvedValueOnce(mockLaunchReadiness);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Feature Usage Distribution')).toBeInTheDocument();
        expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
      });
    });
  });

  describe('Launch Readiness Tab', () => {
    test('should display overall readiness score', async () => {
      analyticsService.getAnalyticsDashboard.mockResolvedValueOnce(mockAnalyticsData);
      userFeedbackService.getFeedbackAnalytics.mockResolvedValueOnce(mockFeedbackAnalytics);
      analyticsService.getLaunchReadinessIndicators.mockResolvedValueOnce(mockLaunchReadiness);

      render(<AnalyticsDashboard />);

      // Switch to readiness tab
      fireEvent.click(screen.getByText('Launch Readiness'));

      await waitFor(() => {
        expect(screen.getByText('Overall Launch Readiness')).toBeInTheDocument();
        expect(screen.getByText('85%')).toBeInTheDocument();
        expect(screen.getByText('Ready')).toBeInTheDocument();
        expect(screen.getByText('Ready for Launch')).toBeInTheDocument();
      });
    });

    test('should display individual readiness indicators', async () => {
      analyticsService.getAnalyticsDashboard.mockResolvedValueOnce(mockAnalyticsData);
      userFeedbackService.getFeedbackAnalytics.mockResolvedValueOnce(mockFeedbackAnalytics);
      analyticsService.getLaunchReadinessIndicators.mockResolvedValueOnce(mockLaunchReadiness);

      render(<AnalyticsDashboard />);

      fireEvent.click(screen.getByText('Launch Readiness'));

      await waitFor(() => {
        expect(screen.getByText('User Adoption')).toBeInTheDocument();
        expect(screen.getByText('System Performance')).toBeInTheDocument();
        expect(screen.getByText('Feature Usage')).toBeInTheDocument();
      });
    });

    test('should show correct status icons and colors', async () => {
      analyticsService.getAnalyticsDashboard.mockResolvedValueOnce(mockAnalyticsData);
      userFeedbackService.getFeedbackAnalytics.mockResolvedValueOnce(mockFeedbackAnalytics);
      analyticsService.getLaunchReadinessIndicators.mockResolvedValueOnce(mockLaunchReadiness);

      render(<AnalyticsDashboard />);

      fireEvent.click(screen.getByText('Launch Readiness'));

      await waitFor(() => {
        expect(screen.getAllByTestId('check-circle-icon')).toHaveLength(2); // Ready indicators
        expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument(); // Warning indicator
      });
    });

    test('should display readiness score bars', async () => {
      analyticsService.getAnalyticsDashboard.mockResolvedValueOnce(mockAnalyticsData);
      userFeedbackService.getFeedbackAnalytics.mockResolvedValueOnce(mockFeedbackAnalytics);
      analyticsService.getLaunchReadinessIndicators.mockResolvedValueOnce(mockLaunchReadiness);

      render(<AnalyticsDashboard />);

      fireEvent.click(screen.getByText('Launch Readiness'));

      await waitFor(() => {
        expect(screen.getByText('85%')).toBeInTheDocument(); // User adoption score
        expect(screen.getByText('92%')).toBeInTheDocument(); // System performance score
        expect(screen.getByText('78%')).toBeInTheDocument(); // Feature usage score
      });
    });

    test('should handle not ready for launch status', async () => {
      const notReadyData = {
        ...mockLaunchReadiness,
        overall: {
          score: 65,
          status: 'warning',
          readyForLaunch: false
        }
      };

      analyticsService.getAnalyticsDashboard.mockResolvedValueOnce(mockAnalyticsData);
      userFeedbackService.getFeedbackAnalytics.mockResolvedValueOnce(mockFeedbackAnalytics);
      analyticsService.getLaunchReadinessIndicators.mockResolvedValueOnce(notReadyData);

      render(<AnalyticsDashboard />);

      fireEvent.click(screen.getByText('Launch Readiness'));

      await waitFor(() => {
        expect(screen.getByText('Not Ready')).toBeInTheDocument();
        const badge = screen.getByText('Not Ready');
        expect(badge.closest('[data-testid="badge"]')).toHaveAttribute('data-variant', 'warning');
      });
    });
  });

  describe('Tab Navigation', () => {
    test('should switch between tabs correctly', async () => {
      analyticsService.getAnalyticsDashboard.mockResolvedValueOnce(mockAnalyticsData);
      userFeedbackService.getFeedbackAnalytics.mockResolvedValueOnce(mockFeedbackAnalytics);
      analyticsService.getLaunchReadinessIndicators.mockResolvedValueOnce(mockLaunchReadiness);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      // Should start on Overview tab
      expect(screen.getByText('Total Users')).toBeInTheDocument();

      // Switch to Launch Readiness tab
      fireEvent.click(screen.getByText('Launch Readiness'));

      await waitFor(() => {
        expect(screen.getByText('Overall Launch Readiness')).toBeInTheDocument();
      });

      // Switch back to Overview
      fireEvent.click(screen.getByText('Overview'));

      await waitFor(() => {
        expect(screen.getByText('Total Users')).toBeInTheDocument();
      });
    });

    test('should render all tab triggers', async () => {
      analyticsService.getAnalyticsDashboard.mockResolvedValueOnce(mockAnalyticsData);
      userFeedbackService.getFeedbackAnalytics.mockResolvedValueOnce(mockFeedbackAnalytics);
      analyticsService.getLaunchReadinessIndicators.mockResolvedValueOnce(mockLaunchReadiness);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Overview')).toBeInTheDocument();
        expect(screen.getByText('User Analytics')).toBeInTheDocument();
        expect(screen.getByText('Feature Usage')).toBeInTheDocument();
        expect(screen.getByText('Performance')).toBeInTheDocument();
        expect(screen.getByText('Feedback')).toBeInTheDocument();
        expect(screen.getByText('Launch Readiness')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh Functionality', () => {
    test('should refresh data when refresh button clicked', async () => {
      analyticsService.getAnalyticsDashboard.mockResolvedValue(mockAnalyticsData);
      userFeedbackService.getFeedbackAnalytics.mockResolvedValue(mockFeedbackAnalytics);
      analyticsService.getLaunchReadinessIndicators.mockResolvedValue(mockLaunchReadiness);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Refresh'));

      await waitFor(() => {
        expect(analyticsService.getAnalyticsDashboard).toHaveBeenCalledTimes(2);
        expect(userFeedbackService.getFeedbackAnalytics).toHaveBeenCalledTimes(2);
        expect(analyticsService.getLaunchReadinessIndicators).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Error Recovery', () => {
    test('should retry loading data when retry button clicked', async () => {
      analyticsService.getAnalyticsDashboard
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockAnalyticsData);
      userFeedbackService.getFeedbackAnalytics
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockFeedbackAnalytics);
      analyticsService.getLaunchReadinessIndicators
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockLaunchReadiness);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load analytics')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(screen.getByText('Analytics Dashboard')).toBeInTheDocument();
        expect(analyticsService.getAnalyticsDashboard).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Data Formatting', () => {
    test('should format large numbers correctly', async () => {
      const largeNumbersData = {
        ...mockAnalyticsData,
        userAdoption: {
          ...mockAnalyticsData.userAdoption,
          totalUsers: 1500000, // 1.5M
          activeUsers: 250000   // 250K
        }
      };

      analyticsService.getAnalyticsDashboard.mockResolvedValueOnce(largeNumbersData);
      userFeedbackService.getFeedbackAnalytics.mockResolvedValueOnce(mockFeedbackAnalytics);
      analyticsService.getLaunchReadinessIndicators.mockResolvedValueOnce(mockLaunchReadiness);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('1.5M')).toBeInTheDocument();
        expect(screen.getByText('250K')).toBeInTheDocument();
      });
    });

    test('should handle missing data gracefully', async () => {
      const incompleteData = {
        userAdoption: {
          totalUsers: 150,
          activeUsers: 89
          // Missing other fields
        },
        featureUsage: {
          topFeatures: []
        },
        summary: {
          totalUsers: 150,
          activeUsers: 89,
          topFeature: null,
          systemHealth: 'healthy'
        }
      };

      analyticsService.getAnalyticsDashboard.mockResolvedValueOnce(incompleteData);
      userFeedbackService.getFeedbackAnalytics.mockResolvedValueOnce({
        overview: { avg_rating: null }
      });
      analyticsService.getLaunchReadinessIndicators.mockResolvedValueOnce(mockLaunchReadiness);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getByText('N/A')).toBeInTheDocument(); // Top feature
        expect(screen.getByText('N/A')).toBeInTheDocument(); // Average rating
      });
    });
  });

  describe('Responsive Design', () => {
    test('should render metric cards in grid layout', async () => {
      analyticsService.getAnalyticsDashboard.mockResolvedValueOnce(mockAnalyticsData);
      userFeedbackService.getFeedbackAnalytics.mockResolvedValueOnce(mockFeedbackAnalytics);
      analyticsService.getLaunchReadinessIndicators.mockResolvedValueOnce(mockLaunchReadiness);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        const metricsGrid = screen.getByTestId('card').closest('.metrics-grid');
        expect(metricsGrid).toBeInTheDocument();
      });
    });

    test('should render charts in responsive containers', async () => {
      analyticsService.getAnalyticsDashboard.mockResolvedValueOnce(mockAnalyticsData);
      userFeedbackService.getFeedbackAnalytics.mockResolvedValueOnce(mockFeedbackAnalytics);
      analyticsService.getLaunchReadinessIndicators.mockResolvedValueOnce(mockLaunchReadiness);

      render(<AnalyticsDashboard />);

      await waitFor(() => {
        expect(screen.getAllByTestId('responsive-container')).toHaveLength(2);
      });
    });
  });
});