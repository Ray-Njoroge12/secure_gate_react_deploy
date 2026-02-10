/**
 * @file NotificationAnalyticsDashboard.jsx
 * @description Advanced notification analytics dashboard with insights and recommendations
 * Features:
 * - User behavior analytics
 * - Delivery pattern analysis
 * - Channel effectiveness metrics
 * - Personalized recommendations
 */

import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import Icon from '../ui/Icon';
import intelligentNotificationService from '../../services/intelligentNotificationService';
import logger from '../../utils/logger';

const NotificationAnalyticsDashboard = () => {
  const [insights, setInsights] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30);

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  /**
   * Load analytics and insights data
   */
  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load both analytics and insights in parallel
      const [analyticsData, insightsData] = await Promise.all([
        intelligentNotificationService.getAnalytics(selectedPeriod),
        loadInsights()
      ]);

      setAnalytics(analyticsData);
      setInsights(insightsData);
    } catch (err) {
      logger.error('Failed to load analytics data', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load insights from API
   */
  const loadInsights = async () => {
    try {
      const response = await fetch(`/api/intelligent-notifications/insights?days=${selectedPeriod}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to load insights');
      }

      const data = await response.json();
      return data.success ? data.data : null;
    } catch (err) {
      logger.error('Failed to load insights', err);
      return null;
    }
  };

  /**
   * Get channel icon
   */
  const getChannelIcon = (channel) => {
    switch (channel.toLowerCase()) {
      case 'email':
        return <Icon name="Mail" className="h-5 w-5" />;
      case 'sms':
        return <Icon name="Smartphone" className="h-5 w-5" />;
      case 'push':
      case 'in_app':
        return <Icon name="Bell" className="h-5 w-5" />;
      default:
        return <Icon name="BarChart3" className="h-5 w-5" />;
    }
  };

  /**
   * Get recommendation priority color
   */
  const getRecommendationColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900';
    }
  };

  /**
   * Get recommendation icon
   */
  const getRecommendationIcon = (type) => {
    switch (type) {
      case 'engagement':
        return <Icon name="TrendingDown" className="h-5 w-5 text-red-500" />;
      case 'timing':
        return <Icon name="Clock" className="h-5 w-5 text-blue-500" />;
      case 'channel':
        return <Icon name="TrendingUp" className="h-5 w-5 text-green-500" />;
      case 'volume':
        return <Icon name="AlertTriangle" className="h-5 w-5 text-yellow-500" />;
      default:
        return <Icon name="Lightbulb" className="h-5 w-5 text-purple-500" />;
    }
  };

  /**
   * Get day of week name
   */
  const getDayName = (dayOfWeek) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayOfWeek] || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-300">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <Icon name="AlertTriangle" className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Notification Analytics</h2>
          <p className="text-gray-600 dark:text-gray-300">
            Insights into your notification patterns and engagement
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
            className="border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Icon name="Bell" className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Notifications</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {analytics.summary?.totalNotifications || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <Icon name="TrendingUp" className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Delivery Rate</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {analytics.summary?.deliveryRate || 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Icon name="BarChart3" className="w-5 h-5 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Avg Engagement</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {analytics.engagement?.length > 0 
                    ? (analytics.engagement.reduce((sum, item) => sum + parseFloat(item.engagementRate), 0) / analytics.engagement.length).toFixed(1)
                    : 0}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <Icon name="Clock" className="w-5 h-5 text-yellow-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Period</p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {selectedPeriod}d
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {insights?.recommendations && insights.recommendations.length > 0 && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
            <Icon name="Lightbulb" className="h-5 w-5 text-yellow-500 mr-2" />
            Personalized Recommendations
          </h3>
          <div className="space-y-4">
            {insights.recommendations.map((recommendation, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getRecommendationColor(recommendation.priority)}`}
              >
                <div className="flex items-start space-x-3">
                  {getRecommendationIcon(recommendation.type)}
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {recommendation.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {recommendation.description}
                    </p>
                    <p className="text-sm font-medium text-blue-600 mt-2">
                      💡 {recommendation.action}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    recommendation.priority === 'high' ? 'bg-red-100 text-red-800' :
                    recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {recommendation.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Effectiveness */}
        {insights?.channelEffectiveness && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Channel Effectiveness</h3>
            <div className="space-y-4">
              {insights.channelEffectiveness.map((channel, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 text-gray-400 dark:text-gray-300">
                      {getChannelIcon(channel.channel)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {channel.channel}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {channel.totalSent} sent
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {channel.readRate}% read
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {channel.clickRate}% clicked
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Behavior */}
        {insights?.userBehavior && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Engagement by Type</h3>
            <div className="space-y-4">
              {insights.userBehavior.slice(0, 5).map((behavior, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {behavior.notificationType.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {behavior.engagementRate}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          parseFloat(behavior.engagementRate) > 50 ? 'bg-green-500' :
                          parseFloat(behavior.engagementRate) > 25 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(behavior.engagementRate, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>{behavior.deliveredCount} delivered</span>
                      <span>{behavior.clickedCount} clicked</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Delivery Patterns */}
      {insights?.deliveryPatterns && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Delivery Patterns</h3>
          
          {/* Hourly Pattern */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Best Times to Receive Notifications</h4>
            <div className="grid grid-cols-12 gap-1">
              {Array.from({ length: 24 }, (_, hour) => {
                const hourData = insights.deliveryPatterns.find(p => p.hour === hour);
                const maxCount = Math.max(...insights.deliveryPatterns.map(p => p.notificationCount));
                const height = hourData ? (hourData.notificationCount / maxCount) * 60 : 4;
                const readRate = hourData ? parseFloat(hourData.readRate) : 0;
                
                return (
                  <div key={hour} className="text-center">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{hour}</div>
                    <div
                      className={`rounded ${
                        readRate > 70 ? 'bg-green-400' :
                        readRate > 40 ? 'bg-yellow-400' :
                        readRate > 0 ? 'bg-red-400' : 'bg-gray-200'
                      }`}
                      style={{ height: `${height}px` }}
                      title={hourData ? `${hourData.notificationCount} notifications, ${hourData.readRate}% read rate` : 'No data'}
                    ></div>
                    <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                      {hourData ? hourData.notificationCount : 0}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center space-x-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-400 rounded mr-1"></div>
                <span>High engagement (70%+)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-400 rounded mr-1"></div>
                <span>Medium engagement (40-70%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-400 rounded mr-1"></div>
                <span>Low engagement (&lt;40%)</span>
              </div>
            </div>
          </div>

          {/* Weekly Pattern */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Weekly Pattern</h4>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, day) => {
                const dayData = insights.deliveryPatterns
                  .filter(p => p.dayOfWeek === day)
                  .reduce((acc, p) => ({
                    notificationCount: acc.notificationCount + p.notificationCount,
                    readCount: acc.readCount + p.readCount
                  }), { notificationCount: 0, readCount: 0 });
                
                const readRate = dayData.notificationCount > 0 ? 
                  ((dayData.readCount / dayData.notificationCount) * 100).toFixed(1) : 0;
                
                return (
                  <div key={day} className="text-center p-3 bg-gray-50 dark:bg-slate-900 rounded">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {getDayName(day).slice(0, 3)}
                    </div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                      {dayData.notificationCount}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {readRate}% read
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationAnalyticsDashboard;
