/**
 * @file PendingApprovalsQueue.jsx
 * @description Phase G3 - Queue of visitors waiting for resident approval
 * Shows real-time list of pending approvals with time waiting
 */

import React, { useState, useEffect } from 'react';
import { Clock, User, Home, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, Badge } from '../ui';

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
    return `${diffHours}h ${diffMins % 60}m`;
  };

  if (loading && pendingVisitors.length === 0) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending Approvals
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </Card.Content>
      </Card>
    );
  }

  if (pendingVisitors.length === 0) {
    return (
      <Card>
        <Card.Header>
          <Card.Title className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Pending Approvals
            <Badge variant="default">0</Badge>
          </Card.Title>
        </Card.Header>
        <Card.Content>
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-200">No visitors waiting for approval</p>
            <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">All walk-ins have been processed</p>
          </div>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Header>
        <Card.Title className="flex items-center gap-2">
          <Clock className="w-5 h-5 animate-pulse text-yellow-500" />
          Pending Approvals
          <Badge variant="warning">{pendingVisitors.length}</Badge>
        </Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="space-y-3">
          {pendingVisitors.map(visitor => (
            <div
              key={visitor.id}
              className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-4 h-4 text-gray-600 dark:text-gray-200" />
                    <span className="font-semibold text-gray-900 dark:text-white">{visitor.name}</span>
                  </div>
                  {visitor.phone && (
                    <div className="text-sm text-gray-600 dark:text-gray-200 ml-6">
                      📱 {visitor.phone}
                    </div>
                  )}
                  {visitor.purpose && (
                    <div className="text-sm text-gray-600 dark:text-gray-200 ml-6 mt-1">
                      💼 {visitor.purpose}
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <Badge variant="warning" className="mb-1">
                    Waiting
                  </Badge>
                  <div className="text-xs text-gray-600 dark:text-gray-200">
                    {getTimeWaiting(visitor.approval_requested_at)}
                  </div>
                </div>
              </div>

              {visitor.resident_id && (
                <div className="flex items-center gap-2 text-sm text-gray-700 bg-white px-3 py-2 rounded mt-2">
                  <Home className="w-4 h-4" />
                  <span>Requesting approval from resident</span>
                </div>
              )}

              {!visitor.resident_id && (
                <div className="flex items-center gap-2 text-sm text-orange-700 bg-orange-100 px-3 py-2 rounded mt-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>Resident not found in system</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card.Content>
    </Card>
  );
};


export default PendingApprovalsQueue;
