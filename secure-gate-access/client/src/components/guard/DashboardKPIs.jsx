/**
 * @file DashboardKPIs.jsx
 * @description Phase G3 - Guard dashboard KPI cards
 * Shows key operational metrics: on-premise, arriving today, pending approvals, denied today
 */

import React, { useState, useEffect } from 'react';
import { Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '../ui';

const DashboardKPIs = ({ onFilterClick }) => {
  const [kpis, setKpis] = useState({
    onPremise: 0,
    arrivingToday: 0,
    pendingApproval: 0,
    deniedToday: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKPIs();
    // Refresh every 30 seconds
    const interval = setInterval(fetchKPIs, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchKPIs = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // Fetch all KPIs in parallel
      const [onPremRes, arrivingRes, pendingRes, deniedRes] = await Promise.all([
        fetch('/api/visitors?status=on_premise&limit=1', { 
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`/api/visitors?fromDate=${today}&toDate=${today}&status=approved&limit=1`, { 
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch('/api/visitors?status=pending_approval&limit=1', { 
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`/api/visitors?status=rejected&fromDate=${today}&toDate=${today}&limit=1`, { 
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      // Parse all responses
      const [onPrem, arriving, pending, denied] = await Promise.all([
        onPremRes.json(),
        arrivingRes.json(),
        pendingRes.json(),
        deniedRes.json()
      ]);

      // Extract totals from pagination data
      setKpis({
        onPremise: onPrem.data?.pagination?.total || 0,
        arrivingToday: arriving.data?.pagination?.total || 0,
        pendingApproval: pending.data?.pagination?.total || 0,
        deniedToday: denied.data?.pagination?.total || 0
      });
    } catch (error) {
      console.error('Failed to fetch KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = [
    {
      id: 'on_premise',
      label: 'On Premise Now',
      value: kpis.onPremise,
      icon: Users,
      color: 'bg-green-500',
      bgLight: 'bg-green-50',
      textColor: 'text-green-600',
      borderColor: 'border-green-200'
    },
    {
      id: 'arriving',
      label: 'Arriving Today',
      value: kpis.arrivingToday,
      icon: Clock,
      color: 'bg-blue-500',
      bgLight: 'bg-blue-50',
      textColor: 'text-blue-600',
      borderColor: 'border-blue-200'
    },
    {
      id: 'pending',
      label: 'Pending Approval',
      value: kpis.pendingApproval,
      icon: Clock,
      color: 'bg-yellow-500',
      bgLight: 'bg-yellow-50',
      textColor: 'text-yellow-600',
      borderColor: 'border-yellow-200'
    },
    {
      id: 'denied',
      label: 'Denied Today',
      value: kpis.deniedToday,
      icon: XCircle,
      color: 'bg-red-500',
      bgLight: 'bg-red-50',
      textColor: 'text-red-600',
      borderColor: 'border-red-200'
    }
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-gray-100 rounded-lg p-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpiCards.map(kpi => {
        const Icon = kpi.icon;
        return (
          <div
            key={kpi.id}
            onClick={() => onFilterClick?.(kpi.id)}
            className={`${kpi.bgLight} border-2 ${kpi.borderColor} rounded-lg p-6 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 ${kpi.color} rounded-lg`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              {kpi.value > 0 && (
                <span className={`text-xs font-medium ${kpi.textColor} bg-white px-2 py-1 rounded-full`}>
                  {kpi.value}
                </span>
              )}
            </div>
            <div className={`text-3xl font-bold ${kpi.textColor} mb-1`}>
              {kpi.value}
            </div>
            <div className="text-sm font-medium text-gray-600 dark:text-gray-200">
              {kpi.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardKPIs;
