/**
 * @file VisitorInsights.jsx
 * @description Phase 4.3 - Basic analytics/insights widget for residents
 * Shows visitor statistics at a glance
 * 
 * Enhanced with:
 * - Robust error handling with retry
 * - Offline-aware behavior
 * - Rate limiting awareness
 */

import React, { useState, useEffect, useCallback } from 'react';

import api from '../../utils/apiClient';
import { Card, Button } from '../ui';
import Icon from '../ui/Icon';

const VisitorInsights = () => {
  const [insights, setInsights] = useState({
    thisWeek: 0,
    thisMonth: 0,
    onPremise: 0,
    frequentVisitors: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const fetchInsights = useCallback(async () => {
    // Don't fetch if offline
    if (!navigator.onLine) {
      setIsOffline(true);
      setError('You are offline. Insights will refresh when connected.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get date ranges
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const formatDate = (date) => date.toISOString().split('T')[0];

      // Fetch all data in parallel
      const [weekRes, monthRes, onPremiseRes] = await Promise.all([
        api.get(`/api/visitors?fromDate=${formatDate(weekAgo)}&toDate=${formatDate(now)}&limit=100`),
        api.get(`/api/visitors?fromDate=${formatDate(monthAgo)}&toDate=${formatDate(now)}&limit=100`),
        api.get(`/api/visitors?status=on_premise&limit=100`)
      ]);
      const weekData = weekRes.data;
      const monthData = monthRes.data;
      const onPremiseData = onPremiseRes.data;

      const getVisitors = (payload) => {
        if (Array.isArray(payload?.data)) {
          return payload.data;
        }
        return payload?.data?.visitors || payload?.data?.data || [];
      };

      const weekVisitors = getVisitors(weekData);
      const monthVisitors = getVisitors(monthData);
      const onPremiseVisitors = getVisitors(onPremiseData);

      const thisWeekCount = weekData.success
        ? weekData.data?.pagination?.total ?? weekVisitors.length
        : 0;
      const thisMonthCount = monthData.success
        ? monthData.data?.pagination?.total ?? monthVisitors.length
        : 0;
      const onPremiseCount = onPremiseData.success
        ? onPremiseData.data?.pagination?.total ?? onPremiseVisitors.length
        : 0;

      // Calculate frequent visitors from month data
      const visitorCounts = {};
      monthVisitors.forEach(v => {
        if (v.name) {
          visitorCounts[v.name] = (visitorCounts[v.name] || 0) + 1;
        }
      });
      const frequentVisitors = Object.entries(visitorCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));

      setInsights({
        thisWeek: thisWeekCount,
        thisMonth: thisMonthCount,
        onPremise: onPremiseCount,
        frequentVisitors
      });
      
      setLastUpdated(new Date());
      setRetryCount(0);
    } catch (err) {
      console.error('Failed to fetch insights:', err);
      setError(err.message || 'Failed to load insights');
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
    
    // Refresh insights every 5 minutes when online
    const interval = setInterval(() => {
      if (navigator.onLine) {
        fetchInsights();
      }
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [fetchInsights]);

  // Auto-retry when coming back online
  useEffect(() => {
    if (!isOffline && error) {
      fetchInsights();
    }
  }, [isOffline, error, fetchInsights]);

  const handleRetry = () => {
    setRetryCount(0);
    fetchInsights();
  };

  if (loading) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="text-gray-900 dark:text-slate-200">Visitor Insights</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        </Card.Content>
      </Card>
    );
  }

  // Error state with retry option
  if (error && !insights.thisMonth) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="text-gray-900 dark:text-slate-100 flex items-center gap-2">
            {isOffline ? <Icon name="wifi-off" className="w-5 h-5 text-yellow-500" aria-hidden="true" /> : <Icon name="alert-circle" className="w-5 h-5 text-red-500" aria-hidden="true" />}
            Visitor Insights
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="text-center py-6">
            <p className="text-gray-600 dark:text-slate-300 mb-4">{error}</p>
            {!isOffline && retryCount < 3 && (
              <Button
                onClick={handleRetry}
                className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 flex items-center gap-2 mx-auto min-h-[44px]"
                aria-label="Retry loading insights"
              >
                <Icon name="refresh-cw" className="w-4 h-4" aria-hidden="true" />
                Retry
              </Button>
            )}
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <Card.Title className="text-gray-900 dark:text-slate-200 flex items-center gap-2">
            <Icon name="trending-up" className="w-5 h-5" aria-hidden="true" />
            Visitor Insights
            {isOffline && <Icon name="wifi-off" className="w-4 h-4 text-yellow-500 ml-2" aria-label="Offline - showing cached data" />}
          </Card.Title>
          {lastUpdated && (
            <span className="text-xs text-gray-500 dark:text-slate-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </Card.Header>
      <Card.Content>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* This Week */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg" aria-hidden="true">
                <Icon name="clock" className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{insights.thisWeek}</p>
                <p className="text-sm text-gray-600 dark:text-slate-400">This Week</p>
              </div>
            </div>
          </div>

          {/* This Month */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg" aria-hidden="true">
                <Icon name="users" className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">{insights.thisMonth}</p>
                <p className="text-sm text-gray-600 dark:text-slate-400">This Month</p>
              </div>
            </div>
          </div>

          {/* On Premise Now */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg" aria-hidden="true">
                <Icon name="check-circle" className="w-5 h-5 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{insights.onPremise}</p>
                <p className="text-sm text-gray-600 dark:text-slate-400">On Premise Now</p>
              </div>
            </div>
          </div>
        </div>

        {/* Frequent Visitors */}
        {insights.frequentVisitors.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3">Frequent Visitors (Last 30 Days)</h4>
            <div className="space-y-2">
              {insights.frequentVisitors.map((visitor, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-100 dark:bg-slate-800 rounded-lg p-3"
                >
                  <span className="text-gray-900 dark:text-slate-200">{visitor.name}</span>
                  <span className="text-sm text-gray-600 dark:text-slate-400">{visitor.count} visits</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card.Content>
    </Card>
  );
};

export default VisitorInsights;
