/**
 * @file DashboardKPIs.jsx
 * @description Phase G3 - Guard dashboard KPI cards
 * Shows key operational metrics: on-premise, arriving today, pending approvals, denied today
 */

import React, { useState, useEffect } from 'react';

import api from '../../utils/apiClient';
import logger from '../../utils/logger';
import { Icon } from '../ui';
import Button from '../ui/Button';

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
      const [onPrem, arriving, pending, denied] = await Promise.all([
        api.get('/api/visitors?status=on_premise&limit=1'),
        api.get(`/api/visitors?fromDate=${today}&toDate=${today}&status=approved&limit=1`),
        api.get('/api/visitors?status=pending_approval&limit=1'),
        api.get(`/api/visitors?status=rejected&fromDate=${today}&toDate=${today}&limit=1`)
      ]);

      // Extract totals from pagination data
      setKpis({
        onPremise: onPrem.data?.data?.pagination?.total || 0,
        arrivingToday: arriving.data?.data?.pagination?.total || 0,
        pendingApproval: pending.data?.data?.pagination?.total || 0,
        deniedToday: denied.data?.data?.pagination?.total || 0
      });
    } catch (error) {
      logger.error('Failed to fetch KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      id: "on_premise",
      label: "Currently On-site",
      value: kpis.onPremise,
      icon: "Users",
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100"
    },
    {
      id: "arriving",
      label: "Arriving Today",
      value: kpis.arrivingToday,
      icon: "Clock",
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-100"
    },
    {
      id: "pending",
      label: "Pending Checks",
      value: kpis.pendingApproval,
      icon: "CheckCircle",
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      border: "border-yellow-100"
    },
    {
      id: "rejected",
      label: "Denied Entry",
      value: kpis.deniedToday,
      icon: "XCircle",
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-100"
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <Button
          key={stat.id}
          onClick={() => onFilterClick(stat.id)}
          className={`text-left p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${stat.bg} ${stat.border}`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`p-2 rounded-lg bg-white dark:bg-slate-700 ${stat.color}`}>
              <Icon name={stat.icon} className="w-5 h-5" />
            </span>
            {loading ? (
              <div className="w-8 h-4 bg-gray-200 dark:bg-slate-600 animate-pulse rounded"></div>
            ) : (
              <span className="text-2xl font-bold text-gray-900 dark:text-slate-100">{stat.value}</span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-slate-300">{stat.label}</p>
        </Button>
      ))}
    </div>
  );
};

export default DashboardKPIs;
