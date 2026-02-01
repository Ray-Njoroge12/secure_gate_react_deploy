/**
 * Unit Tests for System Health Dashboard Component
 * 
 * Tests real-time health monitoring dashboard, component status display,
 * performance charts, and alert management.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SystemHealthDashboard from '../../../components/monitoring/SystemHealthDashboard';
import { systemHealthService } from '../../../services/systemHealthService';

// Mock the system health service
jest.mock('../../../services/systemHealthService', () => ({
  systemHealthService: {
    getSystemHealth: jest.fn(),
    subscribeToHealthUpdates: jest.fn(),
    triggerHealthCheck: jest.fn()
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

jest.mock('../../../components/ui/Badge', () => ({
  Badge: ({ children, variant }) => (
    <span data-testid="badge" data-variant={variant}>{children}</span>
  )
}));

jest.mock('../../../components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, variant, size }) => (
    <button
      data-testid="button"
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  )
}));

jest.mock('../../../components/ui/Spinner', () => ({
  Spinner: ({ size }) => <div data-testid="spinner" data-size={size} />
}));

jest.mock('../../../components/ui/Alert', () => ({
  Alert: ({ children, variant }) => (
    <div data-testid="alert" data-variant={variant}>{children}</div>
  ),
  AlertDescription: ({ children }) => (
    <div data-testid="alert-description">{children}</div>
  )
}));

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Activity: () => <div data-testid="activity-icon" />,
  Server: () => <div data-testid="server-icon" />,
  Database: () => <div data-testid="database-icon" />,
  Wifi: () => <div data-testid="wifi-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  Clock: () => <div data-testid="clock-icon" />
}));

describe('SystemHealthDashboard', () => {
  const mockHealthData = {
    status: 'healthy',
    timestamp: '2025-01-15T10:00:00Z',
    responseTime: 150,
    components: {
      database: {
        name: 'Database Connection',
        status: 'healthy',
        responseTime: 45,
        details: {
          connectionPool: {
            total: 5,
            max: 20,
            utilization: 25
          }
        }
      },
      redis: {
        name: 'Redis Cache',
        status: 'healthy',
        responseTime: 20,
        details: {
          memory: {
            usage: 60
          }
        }
      },
      external_services: {
        name: 'External Services',
        status: 'degraded',
        responseTime: 1500,
        details: {
          services: [
            { name: 'Email Service', status: 'healthy' },
            { name: 'SMS Service', status: 'degraded' }
          ]
        }
      }
    },
    metrics: {
      cpu: {
        usage: 0.65,
        cores: 4
      },
      memory: {
        usage: 0.72,
        total: 8589934592,
        used: 6174015078
      },
      disk: {
        usage: 0.45
      },
      uptime: 86400
    },
    alerts: [
      {
        component: 'external_services',
        severity: 'warning',
        message: 'SMS service response time is high'
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    test('should render loading state initially', () => {
      systemHealthService.getSystemHealth.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<SystemHealthDashboard />);

      expect(screen.getByTestId('spinner')).toBeInTheDocument();
      expect(screen.getByText('Loading system health data...')).toBeInTheDocument();
    });

    test('should render error state when health data fails to load', async () => {
      const error = new Error('Failed to fetch health data');
      systemHealthService.getSystemHealth.mockRejectedValueOnce(error);

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument();
        expect(screen.getByText(/Failed to load system health data/)).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    test('should render dashboard with health data', async () => {
      systemHealthService.getSystemHealth.mockResolvedValueOnce({
        data: mockHealthData
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('System Health Dashboard')).toBeInTheDocument();
        expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
        expect(screen.getByText('Healthy')).toBeInTheDocument();
      });
    });
  });

  describe('Component Status Display', () => {
    test('should display all component status cards', async () => {
      systemHealthService.getSystemHealth.mockResolvedValueOnce({
        data: mockHealthData
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Database Connection')).toBeInTheDocument();
        expect(screen.getByText('Redis Cache')).toBeInTheDocument();
        expect(screen.getByText('External Services')).toBeInTheDocument();
      });
    });

    test('should show component response times', async () => {
      systemHealthService.getSystemHealth.mockResolvedValueOnce({
        data: mockHealthData
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('45ms')).toBeInTheDocument(); // Database response time
        expect(screen.getByText('20ms')).toBeInTheDocument(); // Redis response time
      });
    });

    test('should display component details', async () => {
      systemHealthService.getSystemHealth.mockResolvedValueOnce({
        data: mockHealthData
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Pool: 5\/20 \(25%\)/)).toBeInTheDocument();
        expect(screen.getByText(/Memory: 60%/)).toBeInTheDocument();
        expect(screen.getByText(/Services: 1\/2 healthy/)).toBeInTheDocument();
      });
    });

    test('should show error messages for unhealthy components', async () => {
      const healthDataWithError = {
        ...mockHealthData,
        components: {
          database: {
            name: 'Database Connection',
            status: 'unhealthy',
            error: 'Connection timeout'
          }
        }
      };

      systemHealthService.getSystemHealth.mockResolvedValueOnce({
        data: healthDataWithError
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Connection timeout')).toBeInTheDocument();
      });
    });
  });

  describe('System Metrics Display', () => {
    test('should display system resource metrics', async () => {
      systemHealthService.getSystemHealth.mockResolvedValueOnce({
        data: mockHealthData
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('System Resources')).toBeInTheDocument();
        expect(screen.getByText('CPU Usage')).toBeInTheDocument();
        expect(screen.getByText('Memory Usage')).toBeInTheDocument();
        expect(screen.getByText('Disk Usage')).toBeInTheDocument();
        expect(screen.getByText('65%')).toBeInTheDocument(); // CPU usage
        expect(screen.getByText('72%')).toBeInTheDocument(); // Memory usage
        expect(screen.getByText('45%')).toBeInTheDocument(); // Disk usage
      });
    });

    test('should display memory details', async () => {
      systemHealthService.getSystemHealth.mockResolvedValueOnce({
        data: mockHealthData
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/5.75GB \/ 8GB/)).toBeInTheDocument();
      });
    });

    test('should display uptime information', async () => {
      systemHealthService.getSystemHealth.mockResolvedValueOnce({
        data: mockHealthData
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Uptime: 24h 0m/)).toBeInTheDocument();
      });
    });

    test('should show appropriate colors for resource usage', async () => {
      const highUsageData = {
        ...mockHealthData,
        metrics: {
          ...mockHealthData.metrics,
          cpu: { usage: 0.85 }, // High CPU
          memory: { usage: 0.9, total: 8589934592, used: 7730941337 }, // High memory
          disk: { usage: 0.95 } // High disk
        }
      };

      systemHealthService.getSystemHealth.mockResolvedValueOnce({
        data: highUsageData
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        const progressBars = screen.getAllByRole('progressbar', { hidden: true });
        // Should have red progress bars for high usage
        expect(progressBars.some(bar => 
          bar.className.includes('bg-red-500')
        )).toBeTruthy();
      });
    });
  });

  describe('Alerts Panel', () => {
    test('should display active alerts', async () => {
      systemHealthService.getSystemHealth.mockResolvedValueOnce({
        data: mockHealthData
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('System Alerts (1)')).toBeInTheDocument();
        expect(screen.getByText(/external_services:/)).toBeInTheDocument();
        expect(screen.getByText('SMS service response time is high')).toBeInTheDocument();
      });
    });

    test('should show no alerts message when no alerts exist', async () => {
      const healthDataNoAlerts = {
        ...mockHealthData,
        alerts: []
      };

      systemHealthService.getSystemHealth.mockResolvedValueOnce({
        data: healthDataNoAlerts
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('No active alerts')).toBeInTheDocument();
      });
    });

    test('should display alert severity badges', async () => {
      const healthDataWithCriticalAlert = {
        ...mockHealthData,
        alerts: [
          {
            component: 'database',
            severity: 'critical',
            message: 'Database connection failed'
          }
        ]
      };

      systemHealthService.getSystemHealth.mockResolvedValueOnce({
        data: healthDataWithCriticalAlert
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        const badge = screen.getByText('critical');
        expect(badge).toBeInTheDocument();
        expect(badge.closest('[data-testid="badge"]')).toHaveAttribute('data-variant', 'destructive');
      });
    });
  });

  describe('Performance Chart', () => {
    test('should render performance chart with historical data', async () => {
      systemHealthService.getSystemHealth.mockResolvedValueOnce({
        data: mockHealthData
      });

      render(<SystemHealthDashboard />);

      // Wait for initial load and then trigger updates to build historical data
      await waitFor(() => {
        expect(screen.getByText('System Health Dashboard')).toBeInTheDocument();
      });

      // Simulate multiple health updates to build chart data
      act(() => {
        jest.advanceTimersByTime(30000); // Advance 30 seconds
      });

      await waitFor(() => {
        expect(screen.getByText('Response Time Trend')).toBeInTheDocument();
        expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      });
    });

    test('should not render chart when no historical data exists', async () => {
      systemHealthService.getSystemHealth.mockResolvedValueOnce({
        data: mockHealthData
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.queryByText('Response Time Trend')).not.toBeInTheDocument();
      });
    });
  });

  describe('Auto-refresh Functionality', () => {
    test('should auto-refresh health data by default', async () => {
      systemHealthService.getSystemHealth.mockResolvedValue({
        data: mockHealthData
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(systemHealthService.getSystemHealth).toHaveBeenCalledTimes(1);
      });

      // Advance time by 30 seconds (default refresh interval)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(systemHealthService.getSystemHealth).toHaveBeenCalledTimes(2);
      });
    });

    test('should pause and resume auto-refresh', async () => {
      systemHealthService.getSystemHealth.mockResolvedValue({
        data: mockHealthData
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Pause Auto-refresh')).toBeInTheDocument();
      });

      // Click pause button
      fireEvent.click(screen.getByText('Pause Auto-refresh'));

      expect(screen.getByText('Resume Auto-refresh')).toBeInTheDocument();

      // Advance time - should not refresh when paused
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(systemHealthService.getSystemHealth).toHaveBeenCalledTimes(1);

      // Click resume button
      fireEvent.click(screen.getByText('Resume Auto-refresh'));

      expect(screen.getByText('Pause Auto-refresh')).toBeInTheDocument();
    });
  });

  describe('Manual Refresh', () => {
    test('should trigger manual refresh when refresh button clicked', async () => {
      systemHealthService.getSystemHealth.mockResolvedValue({
        data: mockHealthData
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Refresh'));

      expect(systemHealthService.getSystemHealth).toHaveBeenCalledTimes(2);
    });

    test('should show loading spinner during manual refresh', async () => {
      let resolvePromise;
      systemHealthService.getSystemHealth
        .mockResolvedValueOnce({ data: mockHealthData })
        .mockImplementationOnce(() => new Promise(resolve => {
          resolvePromise = resolve;
        }));

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Refresh'));

      expect(screen.getByTestId('spinner')).toBeInTheDocument();

      // Resolve the promise
      act(() => {
        resolvePromise({ data: mockHealthData });
      });

      await waitFor(() => {
        expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
      });
    });

    test('should disable refresh button during loading', async () => {
      let resolvePromise;
      systemHealthService.getSystemHealth
        .mockResolvedValueOnce({ data: mockHealthData })
        .mockImplementationOnce(() => new Promise(resolve => {
          resolvePromise = resolve;
        }));

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Refresh')).toBeInTheDocument();
      });

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      expect(refreshButton.closest('button')).toBeDisabled();

      // Resolve the promise
      act(() => {
        resolvePromise({ data: mockHealthData });
      });

      await waitFor(() => {
        expect(refreshButton.closest('button')).not.toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    test('should show retry button on error', async () => {
      systemHealthService.getSystemHealth.mockRejectedValueOnce(
        new Error('Network error')
      );

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    test('should retry loading data when retry button clicked', async () => {
      systemHealthService.getSystemHealth
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: mockHealthData });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(screen.getByText('System Health Dashboard')).toBeInTheDocument();
        expect(systemHealthService.getSystemHealth).toHaveBeenCalledTimes(2);
      });
    });

    test('should continue showing data after error if data was previously loaded', async () => {
      systemHealthService.getSystemHealth
        .mockResolvedValueOnce({ data: mockHealthData })
        .mockRejectedValueOnce(new Error('Refresh failed'));

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('System Health Dashboard')).toBeInTheDocument();
      });

      // Trigger refresh that fails
      fireEvent.click(screen.getByText('Refresh'));

      await waitFor(() => {
        // Should still show the dashboard with previous data
        expect(screen.getByText('System Health Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Database Connection')).toBeInTheDocument();
      });
    });
  });

  describe('Status Display Logic', () => {
    test('should show correct overall status icon and badge', async () => {
      const degradedHealthData = {
        ...mockHealthData,
        status: 'degraded'
      };

      systemHealthService.getSystemHealth.mockResolvedValueOnce({
        data: degradedHealthData
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
        const badge = screen.getByText('Degraded');
        expect(badge.closest('[data-testid="badge"]')).toHaveAttribute('data-variant', 'warning');
      });
    });

    test('should show unhealthy status correctly', async () => {
      const unhealthyHealthData = {
        ...mockHealthData,
        status: 'unhealthy'
      };

      systemHealthService.getSystemHealth.mockResolvedValueOnce({
        data: unhealthyHealthData
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
        const badge = screen.getByText('Unhealthy');
        expect(badge.closest('[data-testid="badge"]')).toHaveAttribute('data-variant', 'destructive');
      });
    });
  });

  describe('Timestamp Display', () => {
    test('should display last updated timestamp', async () => {
      systemHealthService.getSystemHealth.mockResolvedValueOnce({
        data: mockHealthData
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
        expect(screen.getByText(/Health check completed in 150ms/)).toBeInTheDocument();
      });
    });

    test('should handle missing timestamp gracefully', async () => {
      const healthDataNoTimestamp = {
        ...mockHealthData,
        timestamp: undefined
      };

      systemHealthService.getSystemHealth.mockResolvedValueOnce({
        data: healthDataNoTimestamp
      });

      render(<SystemHealthDashboard />);

      await waitFor(() => {
        expect(screen.getByText('System Health Dashboard')).toBeInTheDocument();
        expect(screen.queryByText(/Last updated:/)).not.toBeInTheDocument();
      });
    });
  });
});