/**
 * @file ApprovalStatusCard.jsx
 * @description Phase 3 - Guard component to show approval status for visitors
 * Shows pending/approved/rejected status with real-time updates
 */

import React, { useState, useEffect } from 'react';
import { Button, Icon } from '../ui';
import io from 'socket.io-client';

const normalizeApprovalStatus = (status) => String(status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');

const ApprovalStatusCard = ({ visitor, onRequestApproval }) => {
  const [approvalStatus, setApprovalStatus] = useState(() => normalizeApprovalStatus(visitor?.status) || 'UNKNOWN');

  const isApproved = approvalStatus === 'APPROVED';
  const isRejected = approvalStatus === 'REJECTED' || approvalStatus === 'DENIED';
  const isPending = approvalStatus === 'PENDING_APPROVAL' || approvalStatus === 'PENDING' || approvalStatus === 'OTP_SENT';
  const isUnknown = approvalStatus === 'UNKNOWN';

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

    // Listen for approval responses
    newSocket.on('visitor:approval_response', (data) => {
      if (data?.data?.visitor_id === visitor?.id) {
        setApprovalStatus(normalizeApprovalStatus(data.data.status) || 'UNKNOWN');
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [visitor?.id]);

  // Update local status when visitor prop changes
  useEffect(() => {
    if (visitor?.status) {
      setApprovalStatus(normalizeApprovalStatus(visitor.status) || 'UNKNOWN');
    } else {
      setApprovalStatus('UNKNOWN');
    }
  }, [visitor?.status]);

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 h-full flex flex-col items-center justify-center text-center">
      <div className="mb-3">
        {isApproved && (
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
            <Icon name="CheckCircle" className="w-6 h-6" />
          </div>
        )}
        {isRejected && (
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
            <Icon name="XCircle" className="w-6 h-6" />
          </div>
        )}
        {(isPending || isUnknown) && (
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 animate-pulse">
            <Icon name="Clock" className="w-6 h-6" />
          </div>
        )}
      </div>

      <h3 className="font-semibold text-gray-900 dark:text-slate-100 mb-1">
        {isApproved && 'Access Granted'}
        {isRejected && 'Access Denied'}
        {isPending && 'Waiting for Resident'}
        {isUnknown && 'Status Unknown'}
      </h3>

      <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
        {isApproved && 'Resident has approved this visit.'}
        {isRejected && 'Resident has denied this visit.'}
        {isPending && 'Request sent to resident device.'}
        {isUnknown && 'No active approval request found.'}
      </p>

      {isPending && (
        <Button 
          variant="outline" 
          size="sm"
          className="w-full text-red-600 hover:bg-red-50 border-red-200"
          onClick={() => onRequestApproval?.(visitor, { forceResend: true })}
        >
          <Icon name="AlertCircle" className="w-4 h-4 mr-2" />
          Resend Request
        </Button>
      )}

      {isUnknown && (
        <Button 
          variant="default"
          size="sm" 
          className="w-full"
          onClick={() => onRequestApproval?.(visitor)}
        >
          Request Approval
        </Button>
      )}
    </div>
  );
};

export default ApprovalStatusCard;
