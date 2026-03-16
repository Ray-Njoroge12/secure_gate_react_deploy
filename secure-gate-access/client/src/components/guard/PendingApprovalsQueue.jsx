/**
 * @file PendingApprovalsQueue.jsx
 * @description Phase G3 - Queue of visitors waiting for resident approval
 * Shows real-time list of pending approvals with time waiting
 */

import React, { useState, useEffect } from 'react';
import { Icon, Card, Badge } from '../ui';

const PendingApprovalsQueue = () => {
  const [pendingVisitors, setPendingVisitors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingApprovals();
    // Refresh every 10 seconds for real-time updates
    const interval = setInterval(fetchPendingApprovals, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/visitors?status=pending_approval&limit=20', {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const result = await response.json();
        setPendingVisitors(result.data?.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch pending approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeWaiting = (approvalRequestedAt) => {
    if (!approvalRequestedAt) return 'Just now';
    
    const now = new Date();
    const requested = new Date(approvalRequestedAt);
    const diffMs = now - requested;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 min';
    if (diffMins < 60) return `${diffMins} mins`;
    
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours} hr${diffHours > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <Card className="h-full flex items-center justify-center p-8" data-tour="pending-approvals">
        <div className="animate-spin text-blue-600">
          <Icon name="Clock" className="w-8 h-8" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full" data-tour="pending-approvals">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Icon name="Clock" className="w-5 h-5 text-yellow-500" />
          Pending Approvals
          <Badge variant="warning" className="ml-2">
            {pendingVisitors.length}
          </Badge>
        </h3>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2">
        {pendingVisitors.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            <Icon name="CheckCircle" className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p>No pending approvals</p>
          </div>
        ) : (
          pendingVisitors.map((visitor) => (
            <div 
              key={visitor.id}
              className="p-3 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-2 text-xs font-semibold text-gray-400 dark:text-slate-400 bg-gray-50 dark:bg-slate-700 rounded-bl-lg border-b border-l dark:border-slate-600">
                {getTimeWaiting(visitor.created_at)}
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Icon name="User" className="w-5 h-5 text-blue-600" />
                </div>
                
                <div className="flex-1 min-w-0 pr-12">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {visitor.name}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <Icon name="Home" className="w-3 h-3 text-gray-400" />
                    <span>Unit {visitor.estate_id || 'N/A'}</span>
                  </div>
                  
                  {visitor.is_suspicious && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded w-fit">
                      <Icon name="AlertCircle" className="w-3 h-3" />
                      <span>Security Flag</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default PendingApprovalsQueue;
