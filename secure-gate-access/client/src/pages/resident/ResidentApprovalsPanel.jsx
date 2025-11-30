/**
 * @file ResidentApprovalsPanel.jsx
 * @description Phase 3 - One-tap visitor approval panel for residents
 * Replaces guard phone calls with real-time digital approvals
 */

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, Phone, Car, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Card, Badge, ErrorDisplay, SuccessDisplay } from '../../components/ui';
import { handleApiError } from '../../utils/errorMapper';
import io from 'socket.io-client';

const ResidentApprovalsPanel = () => {
  const { user } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [socket, setSocket] = useState(null);
  const [processingIds, setProcessingIds] = useState(new Set());

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

  // Initialize WebSocket connection
  useEffect(() => {
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];

    if (!token) return;

    const socketUrl = process.env.REACT_APP_WS_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected for approvals');
    });

    // Listen for new approval requests
    newSocket.on('visitor:approval_request', (data) => {
      console.log('🔔 New approval request:', data);
      
      // Add new approval to the list
      setPendingApprovals(prev => {
        // Avoid duplicates
        const exists = prev.some(a => a.id === data.data.visitor_id);
        if (exists) return prev;
        
        return [{
          id: data.data.visitor_id,
          name: data.data.name,
          phone: data.data.phone,
          vehicle_plate: data.data.vehicle_plate,
          purpose: data.data.purpose,
          approval_requested_at: data.data.requested_at,
          guard_name: data.data.guard_name,
          status: 'pending_approval'
        }, ...prev];
      });

      // Show success notification
      setSuccess(`New visitor approval request: ${data.data.name}`);
      setTimeout(() => setSuccess(''), 5000);
    });

    newSocket.on('connect_error', (err) => {
      console.error('❌ WebSocket connection error:', err);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-200">
            Visitor Approvals
          </h2>
          <p className="text-slate-400 text-sm mt-1">
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
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-200 mb-2">
            All Clear!
          </h3>
          <p className="text-slate-400">
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
                        <h3 className="text-xl font-bold text-slate-200">
                          {approval.name || 'Unknown Visitor'}
                        </h3>
                        <Badge variant="warning" className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {timeAgo(approval.approval_requested_at)}
                        </Badge>
                      </div>

                      {/* Contact Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {approval.phone && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <Phone className="w-4 h-4 text-slate-400" />
                            <span>{approval.phone}</span>
                          </div>
                        )}
                        {approval.vehicle_plate && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <Car className="w-4 h-4 text-slate-400" />
                            <span>{approval.vehicle_plate}</span>
                          </div>
                        )}
                      </div>

                      {/* Purpose */}
                      {approval.purpose && (
                        <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                          <p className="text-sm text-slate-300">
                            <span className="font-medium text-slate-400">Purpose:</span> {approval.purpose}
                          </p>
                        </div>
                      )}

                      {/* Guard Info */}
                      {approval.guard_name && (
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <User className="w-4 h-4" />
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
                            <CheckCircle className="w-4 h-4" />
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
                            <XCircle className="w-4 h-4" />
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
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
          <div className="text-sm text-slate-300">
            <p className="font-medium text-blue-400 mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
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
