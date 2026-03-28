/**
 * Navigation Analytics Component
 * 
 * Displays navigation analytics and insights including:
 * - Navigation patterns
 * - Most visited routes
 * - Session statistics
 * - Navigation efficiency metrics
 */

import React, { useState, useEffect, useMemo } from 'react';

import { useNavigation } from '../../contexts/NavigationContext';

import Card from './Card';
import Icon from './Icon';

const NavigationAnalytics = ({
  showDetailed = false,
  className = ''
}) => {
  const { getNavigationAnalytics, navigationHistory, currentRoute } = useNavigation();
  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState('session'); // session, hour, day, week

  // Calculate analytics
  useEffect(() => {
    const analyticsData = getNavigationAnalytics();
    setAnalytics(analyticsData);
  }, [getNavigationAnalytics, navigationHistory]);

  // Filter data by time range
  const filteredHistory = useMemo(() => {
    if (!navigationHistory.length) return [];
    
    const now = Date.now();
    const timeRanges = {
      session: 0, // All time
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    };

    const cutoff = now - (timeRanges[timeRange] || 0);
    return navigationHistory.filter(route => route.timestamp >= cutoff);
  }, [navigationHistory, timeRange]);

  // Calculate route frequency
  const routeFrequency = useMemo(() => {
    const frequency = {};
    filteredHistory.forEach(route => {
      frequency[route.path] = (frequency[route.path] || 0) + 1;
    });
    
    return Object.entries(frequency)
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredHistory]);

  // Calculate navigation patterns
  const navigationPatterns = useMemo(() => {
    if (filteredHistory.length < 2) return [];

    const patterns = [];
    for (let i = 0; i < filteredHistory.length - 1; i++) {
      const from = filteredHistory[i].path;
      const to = filteredHistory[i + 1].path;
      const pattern = `${from} → ${to}`;
      
      const existing = patterns.find(p => p.pattern === pattern);
      if (existing) {
        existing.count++;
      } else {
        patterns.push({ pattern, from, to, count: 1 });
      }
    }

    return patterns.sort((a, b) => b.count - a.count).slice(0, 5);
  }, [filteredHistory]);

  // Calculate session metrics
  const sessionMetrics = useMemo(() => {
    if (!filteredHistory.length) return null;

    const firstRoute = filteredHistory[0];
    const lastRoute = filteredHistory[filteredHistory.length - 1];
    const sessionDuration = lastRoute.timestamp - firstRoute.timestamp;
    
    const uniqueRoutes = new Set(filteredHistory.map(route => route.path)).size;
    const totalNavigations = filteredHistory.length;
    const averageTimePerRoute = sessionDuration / totalNavigations;

    return {
      sessionDuration,
      uniqueRoutes,
      totalNavigations,
      averageTimePerRoute,
      routesPerMinute: (totalNavigations / (sessionDuration / 60000)) || 0
    };
  }, [filteredHistory]);

  if (!analytics) return null;

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  const formatRouteName = (path) => {
    return path.split('/').pop().replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className={`navigation-analytics ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-50 flex items-center">
          <Icon name="activity" className="w-5 h-5 mr-2" />
          Navigation Analytics
        </h3>
        
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-md px-3 py-1 text-sm"
        >
          <option value="session">This Session</option>
          <option value="hour">Last Hour</option>
          <option value="day">Last Day</option>
          <option value="week">Last Week</option>
        </select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center">
            <Icon name="map-pin" className="w-8 h-8 text-brand-500 mr-3" />
            <div>
              <p className="text-sm text-slate-400">Routes Visited</p>
              <p className="text-2xl font-bold text-slate-50">
                {sessionMetrics?.uniqueRoutes || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <Icon name="trending-up" className="w-8 h-8 text-success-500 mr-3" />
            <div>
              <p className="text-sm text-slate-400">Total Navigations</p>
              <p className="text-2xl font-bold text-slate-50">
                {sessionMetrics?.totalNavigations || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <Icon name="clock" className="w-8 h-8 text-warning-500 mr-3" />
            <div>
              <p className="text-sm text-slate-400">Session Duration</p>
              <p className="text-2xl font-bold text-slate-50">
                {sessionMetrics ? formatDuration(sessionMetrics.sessionDuration) : '0m 0s'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <Icon name="users" className="w-8 h-8 text-info-500 mr-3" />
            <div>
              <p className="text-sm text-slate-400">Routes/Min</p>
              <p className="text-2xl font-bold text-slate-50">
                {sessionMetrics?.routesPerMinute?.toFixed(1) || '0.0'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Analytics */}
      {showDetailed && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Visited Routes */}
          <Card className="p-6">
            <h4 className="text-lg font-semibold text-slate-50 mb-4 flex items-center">
              <Icon name="bar-chart-3" className="w-5 h-5 mr-2" />
              Most Visited Routes
            </h4>
            
            {routeFrequency.length > 0 ? (
              <div className="space-y-3">
                {routeFrequency.map((route, index) => (
                  <div key={route.path} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-brand-500 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3">
                        {index + 1}
                      </span>
                      <span className="text-gray-600 dark:text-slate-300 text-sm">
                        {formatRouteName(route.path)}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-20 bg-gray-200 dark:bg-slate-700 rounded-full h-2 mr-3">
                        <div 
                          className="bg-brand-500 h-2 rounded-full"
                          style={{ 
                            width: `${(route.count / routeFrequency[0].count) * 100}%` 
                          }}
                        />
                      </div>
                      <span className="text-gray-500 dark:text-slate-400 text-sm font-medium">
                        {route.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-slate-400 text-center py-4">No navigation data available</p>
            )}
          </Card>

          {/* Navigation Patterns */}
          <Card className="p-6">
            <h4 className="text-lg font-semibold text-slate-50 mb-4 flex items-center">
              <Icon name="trending-up" className="w-5 h-5 mr-2" />
              Common Navigation Patterns
            </h4>
            
            {navigationPatterns.length > 0 ? (
              <div className="space-y-3">
                {navigationPatterns.map((pattern, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="w-6 h-6 bg-gray-300 dark:bg-slate-600 text-gray-700 dark:text-slate-300 rounded-full flex items-center justify-center text-xs font-bold mr-3">
                        {index + 1}
                      </span>
                      <div className="text-gray-600 dark:text-slate-300 text-sm">
                        <div className="font-medium">
                          {formatRouteName(pattern.from)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-slate-400">
                          → {formatRouteName(pattern.to)}
                        </div>
                      </div>
                    </div>
                    <span className="text-gray-500 dark:text-slate-400 text-sm font-medium">
                      {pattern.count}x
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-slate-400 text-center py-4">No patterns detected</p>
            )}
          </Card>
        </div>
      )}

      {/* Current Route Info */}
      {currentRoute && (
        <Card className="p-4 mt-6">
          <h4 className="text-lg font-semibold text-slate-50 mb-3 flex items-center">
            <Icon name="map-pin" className="w-5 h-5 mr-2" />
            Current Route
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-slate-400">Path:</span>
              <span className="text-gray-600 dark:text-slate-300 ml-2 font-mono">{currentRoute.path}</span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-slate-400">Search:</span>
              <span className="text-gray-600 dark:text-slate-300 ml-2 font-mono">
                {currentRoute.search || 'None'}
              </span>
            </div>
            <div>
              <span className="text-gray-500 dark:text-slate-400">Hash:</span>
              <span className="text-gray-600 dark:text-slate-300 ml-2 font-mono">
                {currentRoute.hash || 'None'}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default NavigationAnalytics;

