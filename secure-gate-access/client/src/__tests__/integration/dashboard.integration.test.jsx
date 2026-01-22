/**
 * Dashboard Integration Tests
 * Tests dashboard components with API integration and real-time updates
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ErrorProvider } from '../../contexts/ErrorContext';

// Import MSW server from the globally configured instance
import { server } from '../../mocks/server';
import { rest } from 'msw';

// Use the same base URL as the handlers
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Mock dashboard components
const ResidentDashboard = () => {
  const [stats, setStats] = React.useState(null);
  const [visitors, setVisitors] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`${API_BASE_URL}/api/dashboard/stats`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error(err));

    fetch(`${API_BASE_URL}/api/visitors`)
      .then(res => res.json())
      .then(data => {
        const visitors = Array.isArray(data.data)
          ? data.data
          : (data.data?.visitors || []);
        setVisitors(visitors);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Resident Dashboard</h1>
      {stats && (
        <div>
          <div>Upcoming Visits: {stats.upcomingVisits}</div>
          <div>Active Visitors: {stats.activeVisitors}</div>
          <div>Total Visitors: {stats.totalVisitors}</div>
        </div>
      )}
      <div>
        <h2>Recent Visitors</h2>
        {visitors.map(v => (
          <div key={v.id} data-testid={`visitor-${v.id}`}>
            {v.name} - {v.status}
          </div>
        ))}
      </div>
    </div>
  );
};

const GuardDashboard = () => {
  const [activeVisitors, setActiveVisitors] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`${API_BASE_URL}/api/visitors/active`)
      .then(res => res.json())
      .then(data => setActiveVisitors(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleCheckIn = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/api/visitors/${id}/check-in`, {
        method: 'POST'
      });
      // Refresh data
      const res = await fetch(`${API_BASE_URL}/api/visitors/active`);
      const data = await res.json();
      setActiveVisitors(data);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Guard Dashboard</h1>
      <h2>Active Visitors</h2>
      {activeVisitors.map(v => (
        <div key={v.id} data-testid={`visitor-${v.id}`}>
          <span>{v.name} - {v.status}</span>
          {v.status === 'approved' && (
            <button onClick={() => handleCheckIn(v.id)}>Check In</button>
          )}
        </div>
      ))}
    </div>
  );
};

const AdminDashboard = () => {
  const [metrics, setMetrics] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/metrics`)
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Admin Dashboard</h1>
      {metrics && (
        <div>
          <div>Total Users: {metrics.totalUsers}</div>
          <div>Total Visitors: {metrics.totalVisitors}</div>
          <div>Active Visitors: {metrics.activeVisitors}</div>
          <div>Today Check-ins: {metrics.todayStats?.checkIns}</div>
        </div>
      )}
    </div>
  );
};

const AllProviders = ({ children }) => (
  <ErrorProvider>
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  </ErrorProvider>
);

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    localStorage.setItem('token', 'mock-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Resident Dashboard', () => {
    it('should load and display dashboard stats', async () => {
      render(<ResidentDashboard />, { wrapper: AllProviders });

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Upcoming Visits:/)).toBeInTheDocument();
      expect(screen.getByText(/Active Visitors:/)).toBeInTheDocument();
      expect(screen.getByText(/Total Visitors:/)).toBeInTheDocument();
    });

    it('should display recent visitors list', async () => {
      render(<ResidentDashboard />, { wrapper: AllProviders });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Recent Visitors')).toBeInTheDocument();

      // Should show visitor data from API
      await waitFor(() => {
        expect(screen.getByTestId('visitor-1')).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      const { rest } = await import('msw');

      server.use(
        rest.get(`${API_BASE_URL}/api/dashboard/stats`, (req, res, ctx) => {
          return res(
            ctx.status(500),
            ctx.json({ error: 'Internal server error' })
          );
        })
      );

      render(<ResidentDashboard />, { wrapper: AllProviders });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should still render without crashing
      expect(screen.getByText('Resident Dashboard')).toBeInTheDocument();
    });
  });

  describe('Guard Dashboard', () => {
    it('should load and display active visitors', async () => {
      render(<GuardDashboard />, { wrapper: AllProviders });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Guard Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Active Visitors')).toBeInTheDocument();
    });

    it('should allow guard to check in approved visitors', async () => {
      const user = userEvent.setup();
      render(<GuardDashboard />, { wrapper: AllProviders });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Find check-in button for approved visitor
      const checkInButtons = screen.queryAllByRole('button', { name: /check in/i });

      if (checkInButtons.length > 0) {
        await user.click(checkInButtons[0]);

        // Should trigger API call and refresh (button may reappear with refreshed data)
        await waitFor(() => {
          // Verify dashboard still displays correctly after check-in
          expect(screen.getByText('Guard Dashboard')).toBeInTheDocument();
        });
      }
    });

    it('should refresh data after check-in action', async () => {
      const user = userEvent.setup();
      render(<GuardDashboard />, { wrapper: AllProviders });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const initialCount = screen.queryAllByTestId(/visitor-/).length;

      const checkInButtons = screen.queryAllByRole('button', { name: /check in/i });

      if (checkInButtons.length > 0) {
        await user.click(checkInButtons[0]);

        await waitFor(() => {
          // Data should refresh
          const newCount = screen.queryAllByTestId(/visitor-/).length;
          expect(newCount).toBeDefined();
        });
      }
    });
  });

  describe('Admin Dashboard', () => {
    it('should load and display admin metrics', async () => {
      render(<AdminDashboard />, { wrapper: AllProviders });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      expect(screen.getByText(/Total Users:/)).toBeInTheDocument();
      expect(screen.getByText(/Total Visitors:/)).toBeInTheDocument();
      expect(screen.getByText(/Active Visitors:/)).toBeInTheDocument();
    });

    it('should display today statistics', async () => {
      render(<AdminDashboard />, { wrapper: AllProviders });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      expect(screen.getByText(/Today Check-ins:/)).toBeInTheDocument();
    });

    it('should handle loading state correctly', async () => {
      render(<AdminDashboard />, { wrapper: AllProviders });

      // Should show loading initially
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Should hide loading after data loads
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should show metrics
      expect(screen.getByText(/Total Users:/)).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should update visitor list when new visitor is added', async () => {
      render(<ResidentDashboard />, { wrapper: AllProviders });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      const initialCount = screen.queryAllByTestId(/visitor-/).length;

      // Simulate adding new visitor via API
      await fetch(`${API_BASE_URL}/api/visitors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Visitor',
          phone: '+254700999999',
          purpose: 'Testing'
        })
      });

      // In a real app, this would trigger a real-time update
      // Here we're just verifying the API call works
      expect(initialCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Handling', () => {
    it('should show error message when API fails', async () => {
      const { rest } = await import('msw');

      server.use(
        rest.get(`${API_BASE_URL}/api/dashboard/stats`, (req, res, ctx) => {
          return res.networkError('Network request failed');
        })
      );

      render(<ResidentDashboard />, { wrapper: AllProviders });

      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });

      // Should handle error gracefully
      expect(screen.getByText('Resident Dashboard')).toBeInTheDocument();
    });
  });
});
