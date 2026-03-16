/**
 * @file AdminOperationsDashboard.jsx
 * @description Main admin operations dashboard with analytics
 * Phase A1: Admin Operations & Analytics Dashboard
 * 
 * Features:
 * - Real-time metrics overview
 * - Visitor trends charts
 * - Incident statistics
 * - Guard performance metrics
 * - Date range filtering
 * - Export functionality
 */

import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { format, subDays } from 'date-fns';
import './AdminOperationsDashboard.css';
import { COLORS, CHART_PALETTE } from '../../utils/designTokens';
import Button from '../../components/ui/Button';
import api from '../../utils/apiClient';

const AdminOperationsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  });
  
  const [overview, setOverview] = useState(null);
  const [visitorMetrics, setVisitorMetrics] = useState(null);
  const [incidentMetrics, setIncidentMetrics] = useState(null);
  const [guardMetrics, setGuardMetrics] = useState(null);
  const [error, setError] = useState(null);

  // Fetch all analytics data
  useEffect(() => {
    fetchAllAnalytics();
  }, [dateRange]);

  const fetchAllAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        dateFrom: dateRange.from,
        dateTo: dateRange.to
      });

      const [overviewRes, visitorsRes, incidentsRes, guardsRes] = await Promise.all([
        api.get(`/api/admin/analytics/overview?${params}`),
        api.get(`/api/admin/analytics/visitors?${params}`),
        api.get(`/api/admin/analytics/incidents?${params}`),
        api.get(`/api/admin/analytics/guards?${params}`)
      ]);

      setOverview(overviewRes.data.data);
      setVisitorMetrics(visitorsRes.data.data);
      setIncidentMetrics(incidentsRes.data.data);
      setGuardMetrics(guardsRes.data.data);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const exportToCSV = () => {
    // Simple CSV export
    const csv = [
      ['Metric', 'Value'],
      ['Total Visitors', overview?.visitors?.total_visitors || 0],
      ['Approved', overview?.visitors?.approved || 0],
      ['Pending', overview?.visitors?.pending || 0],
      ['Rejected', overview?.visitors?.rejected || 0],
      ['Total Incidents', overview?.incidents?.total_incidents || 0],
      ['Critical Incidents', overview?.incidents?.critical || 0]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${dateRange.from}-to-${dateRange.to}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="error-state">
          <h2>⚠️ Error Loading Analytics</h2>
          <p>{error}</p>
          <Button variant="primary" size="sm" onClick={fetchAllAnalytics}>Retry</Button>
        </div>
      </div>
    );
  }

  // Chart colors from design tokens
  const PIE_COLORS = CHART_PALETTE;

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>📊 Operations Dashboard</h1>
          <p className="subtitle">Real-time analytics and insights</p>
        </div>

        <div className="header-right">
          <div className="date-range-selector">
            <label>
              From:
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => handleDateRangeChange('from', e.target.value)}
                max={dateRange.to}
              />
            </label>
            <label>
              To:
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => handleDateRangeChange('to', e.target.value)}
                min={dateRange.from}
                max={format(new Date(), 'yyyy-MM-dd')}
              />
            </label>
          </div>
          <Button variant="secondary" size="sm" onClick={exportToCSV}>
            📥 Export CSV
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon visitors">👥</div>
          <div className="metric-content">
            <h3>Total Visitors</h3>
            <p className="metric-value">{overview?.visitors?.total_visitors || 0}</p>
            <p className="metric-detail">
              {overview?.visitors?.approved || 0} approved, {overview?.visitors?.pending || 0} pending
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon incidents">🚨</div>
          <div className="metric-content">
            <h3>Total Incidents</h3>
            <p className="metric-value">{overview?.incidents?.total_incidents || 0}</p>
            <p className="metric-detail">
              {overview?.incidents?.critical || 0} critical, {overview?.incidents?.open_incidents || 0} open
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon approval">⏱️</div>
          <div className="metric-content">
            <h3>Avg Approval Time</h3>
            <p className="metric-value">{overview?.approvals?.avg_approval_time_minutes || 0} min</p>
            <p className="metric-detail">
              Median: {overview?.approvals?.median_approval_time_minutes || 0} min
            </p>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon today">📅</div>
          <div className="metric-content">
            <h3>Today's Activity</h3>
            <p className="metric-value">{overview?.today?.visitors_today || 0}</p>
            <p className="metric-detail">
              {overview?.today?.current_visitors || 0} on premise now
            </p>
          </div>
        </div>
      </div>

      {/* Visitor Trends Chart */}
      {visitorMetrics?.trends && visitorMetrics.trends.length > 0 && (
        <div className="chart-card">
          <h2>Visitor Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={visitorMetrics.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke={COLORS.info} strokeWidth={2} name="Total" />
              <Line type="monotone" dataKey="approved" stroke={COLORS.success} strokeWidth={2} name="Approved" />
              <Line type="monotone" dataKey="pending" stroke={COLORS.warning} strokeWidth={2} name="Pending" />
              <Line type="monotone" dataKey="rejected" stroke={COLORS.error} strokeWidth={2} name="Rejected" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Two-column layout for additional charts */}
      <div className="charts-row">
        {/* Purpose Distribution */}
        {visitorMetrics?.purposes && visitorMetrics.purposes.length > 0 && (
          <div className="chart-card half-width">
            <h2>Visit Purposes</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={visitorMetrics.purposes}
                  dataKey="count"
                  nameKey="purpose"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {visitorMetrics.purposes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Peak Hours */}
        {visitorMetrics?.peakHours && visitorMetrics.peakHours.length > 0 && (
          <div className="chart-card half-width">
            <h2>Peak Hours</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={visitorMetrics.peakHours}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" label={{ value: 'Hour of Day', position: 'insideBottom', offset: -5 }} />
                <YAxis label={{ value: 'Visitors', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="count" fill={COLORS.info} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Incident Trends */}
      {incidentMetrics?.trends && incidentMetrics.trends.length > 0 && (
        <div className="chart-card">
          <h2>Incident Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={incidentMetrics.trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke={COLORS.info} strokeWidth={2} name="Total" />
              <Line type="monotone" dataKey="critical" stroke={COLORS.error} strokeWidth={2} name="Critical" />
              <Line type="monotone" dataKey="high" stroke={COLORS.warning} strokeWidth={2} name="High" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Residents */}
      {visitorMetrics?.topResidents && visitorMetrics.topResidents.length > 0 && (
        <div className="table-card">
          <h2>Top Residents by Visitor Volume</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Resident Name</th>
                <th>Email</th>
                <th>Total Visitors</th>
                <th>Approved</th>
              </tr>
            </thead>
            <tbody>
              {visitorMetrics.topResidents.map((resident, index) => (
                <tr key={index}>
                  <td>{resident.resident_name}</td>
                  <td>{resident.resident_email}</td>
                  <td><span className="badge badge-primary">{resident.visitor_count}</span></td>
                  <td><span className="badge badge-success">{resident.approved_count}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Guard Performance */}
      {guardMetrics?.performance && guardMetrics.performance.length > 0 && (
        <div className="table-card">
          <h2>Guard Performance</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Guard Name</th>
                <th>Visitors Processed</th>
                <th>Check-ins</th>
                <th>Check-outs</th>
                <th>Avg Processing Time</th>
              </tr>
            </thead>
            <tbody>
              {guardMetrics.performance.map((guard, index) => (
                <tr key={index}>
                  <td>{guard.guard_name}</td>
                  <td><span className="badge badge-primary">{guard.visitors_processed}</span></td>
                  <td>{guard.check_ins}</td>
                  <td>{guard.check_outs}</td>
                  <td>{guard.avg_processing_time_minutes} min</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminOperationsDashboard;
