/**
 * @file ResidentApprovalsPanel.jsx
 * @description Phase 3 - One-tap visitor approval panel for residents
 * Replaces guard phone calls with real-time digital approvals
 */

import React, { useState, useEffect, useCallback } from 'react';

import { Button, Card, Badge, ErrorDisplay, SuccessDisplay, Icon } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import useWebSocket from '../../hooks/useWebSocket';
import { handleApiError } from '../../utils/errorMapper';

const ResidentApprovalsPanel = () => {
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processingIds, setProcessingIds] = useState(new Set());
  const { addEventListener } = useWebSocket({
    enabled: !!user,
    autoConnect: true,
    subscribeDashboard: false,
    subscribeVisitors: false,
    subscribeAdmin: false
  });

  // Fetch pending approvals from API
  const fetchPendingApprovals = useCallback(async () => {
    try {
      const response = await fetch('/api/visitors/pending-approvals', {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pending approvals');
      }

      const result = await response.json();
      setPendingApprovals(result.data || []);
      setError('');
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for new approval requests in real time
  useEffect(() => {
    if (!user) {
      return undefined;
    }

    return addEventListener('visitor:approval_request', (event) => {
      const request = event?.data || event;
      if (!request?.visitor_id) {
        return;
      }

      setPendingApprovals(prev => {
        const exists = prev.some((approval) => String(approval.id) === String(request.visitor_id));
        if (exists) return prev;

        return [{
          id: request.visitor_id,
          name: request.name,
          phone: request.phone,
          vehicle_plate: request.vehicle_plate,
          purpose: request.purpose,
          approval_requested_at: request.requested_at,
          guard_name: request.guard_name,
          status: 'pending_approval'
        }, ...prev];
      });

      setSuccess(`New visitor approval request: ${request.name || 'Unknown visitor'}`);
      setTimeout(() => setSuccess(''), 5000);
    });
  }, [addEventListener, user]);

  // Initial fetch
  useEffect(() => {
    fetchPendingApprovals();
  }, [fetchPendingApprovals]);

  // Handle approve action
  const handleApprove = async (visitorId, visitorName) => {
    setProcessingIds(prev => new Set(prev).add(visitorId));
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/visitors/${visitorId}/approve`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to approve visitor');
      }

      // Remove from pending list
      setPendingApprovals(prev => prev.filter(a => a.id !== visitorId));
      setSuccess(`✅ ${visitorName} approved! Guard will be notified.`);
      
      // Clear success after 5 seconds
      setTimeout(() => setSuccess(''), 5000);

    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(visitorId);
        return newSet;
      });
    }
  };

  // Handle reject action
  const handleReject = async (visitorId, visitorName) => {
    // Optional: Show reason dialog
    const reason = window.prompt('Reason for rejection (optional):');
    
    setProcessingIds(prev => new Set(prev).add(visitorId));
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/visitors/${visitorId}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'Not expecting this visitor' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reject visitor');
      }

      // Remove from pending list
      setPendingApprovals(prev => prev.filter(a => a.id !== visitorId));
      setSuccess(`❌ ${visitorName} rejected. Guard will be notified.`);
      
      // Clear success after 5 seconds
      setTimeout(() => setSuccess(''), 5000);

    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(visitorId);
        return newSet;
      });
    }
  };

  // Format time ago
  const timeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now - time) / 1000); // seconds

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div data-tour="approvals-panel" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-200">
            Visitor Approvals
          </h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
            Approve or reject visitors requesting entry
          </p>
        </div>
        {pendingApprovals.length > 0 && (
          <Badge variant="warning" className="text-lg px-4 py-2">
            {pendingApprovals.length} pending
          </Badge>
        )}
      </div>

      {/* Success/Error Messages */}
      {success && <SuccessDisplay message={success} />}
      {error && <ErrorDisplay message={error} />}

      {/* Pending Approvals List */}
      {pendingApprovals.length === 0 ? (
        <Card className="text-center py-12">
          <Icon name="CheckCircle" className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-slate-200 mb-2">
            All Clear!
          </h3>
          <p className="text-gray-500 dark:text-slate-400">
            No pending visitor approvals at the moment.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingApprovals.map((approval) => {
            const isProcessing = processingIds.has(approval.id);
            
            return (
              <Card
                key={approval.id}
                className="border-2 border-yellow-500/30 bg-yellow-500/5 hover:border-yellow-500/50 transition-all"
              >
                <Card.Content className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Visitor Info */}
                    <div className="flex-1 space-y-3">
                      {/* Name & Time */}
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-slate-200">
                          {approval.name || 'Unknown Visitor'}
                        </h3>
                        <Badge variant="warning" className="flex items-center gap-1">
                          <Icon name="Clock" className="w-3 h-3" />
                          {timeAgo(approval.approval_requested_at)}
                        </Badge>
                      </div>

                      {/* Contact Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {approval.phone && (
                          <div className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
                            <Icon name="Phone" className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                            <span>{approval.phone}</span>
                          </div>
                        )}
                        {approval.vehicle_plate && (
                          <div className="flex items-center gap-2 text-gray-700 dark:text-slate-300">
                            <Icon name="Car" className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                            <span>{approval.vehicle_plate}</span>
                          </div>
                        )}
                      </div>

                      {/* Purpose */}
                      {approval.purpose && (
                        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                          <p className="text-sm text-gray-600 dark:text-slate-300">
                            <span className="font-medium text-gray-500 dark:text-slate-400">Purpose:</span> {approval.purpose}
                          </p>
                        </div>
                      )}

                      {/* Guard Info */}
                      {approval.guard_name && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
                          <Icon name="User" className="w-4 h-4" />
                          <span>Requested by guard: {approval.guard_name}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 min-w-[140px]">
                      <Button
                        variant="success"
                        onClick={() => handleApprove(approval.id, approval.name)}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <Icon name="CheckCircle" className="w-4 h-4" />
                            Allow Entry
                          </>
                        )}
                      </Button>
                      
                      <Button
                        variant="danger"
                        onClick={() => handleReject(approval.id, approval.name)}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-2"
                      >
                        {isProcessing ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Processing...
                          </>
                        ) : (
                          <>
                            <Icon name="XCircle" className="w-4 h-4" />
                            Decline
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </Card.Content>
              </Card>
            );
          })}
        </div>
      )}

      {/* Info Notice */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Icon name="AlertCircle" className="w-6 h-6 text-blue-600 dark:text-blue-300 mt-0.5" />
          <div className="text-sm text-gray-700 dark:text-slate-300">
            <p className="font-medium text-blue-700 dark:text-blue-300 mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-slate-400">
              <li>Guards request approval when walk-in visitors arrive</li>
              <li>You'll see requests here in real-time</li>
              <li>Tap "Allow Entry" to approve or "Decline" to reject</li>
              <li>Guards are notified immediately of your decision</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResidentApprovalsPanel;
