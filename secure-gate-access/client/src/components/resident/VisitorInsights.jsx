/**
 * @file VisitorInsights.jsx
 * @description Phase 4.3 - Basic analytics/insights widget for residents
 * Shows visitor statistics at a glance
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Clock, CheckCircle } from 'lucide-react';
import { Card } from '../ui';

const VisitorInsights = () => {
  const [insights, setInsights] = useState({
    thisWeek: 0,
    thisMonth: 0,
    onPremise: 0,
    frequentVisitors: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      
      // Get date ranges
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const formatDate = (date) => date.toISOString().split('T')[0];

      // Fetch this week's visitors
      const weekResponse = await fetch(
        `/api/visitors?fromDate=${formatDate(weekAgo)}&toDate=${formatDate(now)}&limit=100`,
        { method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' } }
      );
      const weekData = await weekResponse.json();
      const thisWeekCount = weekData.success ? weekData.data.pagination.total : 0;

      // Fetch this month's visitors
      const monthResponse = await fetch(
        `/api/visitors?fromDate=${formatDate(monthAgo)}&toDate=${formatDate(now)}&limit=100`,
        { method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' } }
      );
      const monthData = await monthResponse.json();
      const thisMonthCount = monthData.success ? monthData.data.pagination.total : 0;

      // Fetch current on-premise visitors
      const onPremiseResponse = await fetch(
        `/api/visitors?status=on_premise&limit=100`,
        { method: 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json' } }
      );
      const onPremiseData = await onPremiseResponse.json();
      const onPremiseCount = onPremiseData.success ? onPremiseData.data.pagination.total : 0;

      // Calculate frequent visitors from month data
      const visitors = monthData.success ? monthData.data.data : [];
      const visitorCounts = {};
      visitors.forEach(v => {
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
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="text-slate-200">Visitor Insights</Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title className="text-slate-200 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Visitor Insights
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* This Week */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{insights.thisWeek}</p>
                <p className="text-sm text-slate-400">This Week</p>
              </div>
            </div>
          </div>

          {/* This Month */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">{insights.thisMonth}</p>
                <p className="text-sm text-slate-400">This Month</p>
              </div>
            </div>
          </div>

          {/* On Premise Now */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">{insights.onPremise}</p>
                <p className="text-sm text-slate-400">On Premise Now</p>
              </div>
            </div>
          </div>
        </div>

        {/* Frequent Visitors */}
        {insights.frequentVisitors.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-3">Frequent Visitors (Last 30 Days)</h4>
            <div className="space-y-2">
              {insights.frequentVisitors.map((visitor, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between bg-slate-800 rounded-lg p-3"
                >
                  <span className="text-slate-200">{visitor.name}</span>
                  <span className="text-sm text-slate-400">{visitor.count} visits</span>
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
