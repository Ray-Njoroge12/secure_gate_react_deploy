/**
 * @file ApprovalStatusCard.jsx
 * @description Phase 3 - Guard component to show approval status for visitors
 * Shows pending/approved/rejected status with real-time updates
 */

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Button, Badge } from '../ui';
import io from 'socket.io-client';

const ApprovalStatusCard = ({ visitor, onRequestApproval }) => {
  const [socket, setSocket] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(visitor?.status || 'unknown');

  // Initialize WebSocket for real-time approval responses
  useEffect(() => {
    const token = document.cookie
      .split('; ')
      .find(row => row.startsWith('token='))
      ?.split('=')[1];

    if (!token) return;

    const socketUrl = process.env.REACT_APP_WS_URL;
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ Guard WebSocket connected for approvals');
    });

    // Listen for approval responses
    newSocket.on('visitor:approval_response', (data) => {
      if (data.data.visitor_id === visitor?.id) {
        console.log('📥 Approval response received:', data);
        setApprovalStatus(data.data.status);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [visitor?.id]);

  // Update local status when visitor prop changes
  useEffect(() => {
    if (visitor?.status) {
      setApprovalStatus(visitor.status);
    }
  }, [visitor?.status]);

  const getStatusDisplay = () => {
    switch (approvalStatus) {
      case 'pending_approval':
        return {
          icon: <Clock className="w-5 h-5 text-yellow-400" />,
          label: 'Waiting for Approval',
          color: 'warning',
          message: 'Resident is being notified...'
        };
      case 'approved':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-400" />,
          label: 'Approved',
          color: 'success',
          message: 'Open gate - Entry allowed'
        };
      case 'rejected':
        return {
          icon: <XCircle className="w-5 h-5 text-red-400" />,
          label: 'Rejected',
          color: 'danger',
          message: 'Do not admit - Denied by resident'
        };
      default:
        return {
          icon: <AlertCircle className="w-5 h-5 text-slate-400" />,
          label: 'Not Requested',
          color: 'default',
          message: 'Request approval from resident'
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {status.icon}
          <span className="font-semibold text-slate-200">{status.label}</span>
        </div>
        <Badge variant={status.color}>{approvalStatus}</Badge>
      </div>

      <p className="text-sm text-slate-300 mb-4">{status.message}</p>

      {/* Request Approval Button (only show if not yet requested) */}
      {approvalStatus !== 'pending_approval' && 
       approvalStatus !== 'approved' && 
       approvalStatus !== 'rejected' && (
        <Button
          variant="primary"
          onClick={() => onRequestApproval?.(visitor)}
          className="w-full"
        >
          Request Resident Approval
        </Button>
      )}

      {/* Action Buttons for Approved */}
      {approvalStatus === 'approved' && (
        <Button
          variant="success"
          className="w-full"
        >
          ✅ Open Gate
        </Button>
      )}

      {/* Info for Rejected */}
      {approvalStatus === 'rejected' && (
        <Button
          variant="danger"
          disabled
          className="w-full"
        >
          ❌ Entry Denied
        </Button>
      )}
    </div>
  );
};

export default ApprovalStatusCard;
