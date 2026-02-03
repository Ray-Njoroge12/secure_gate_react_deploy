/**
 * @fileoverview Visitor Details Modal
 * @description Modal showing full visitor details with action buttons
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useEffect } from 'react';
import {
  X, Phone, Mail, Clock, Calendar, MapPin, Car,
  UserCheck, UserX, Shield, AlertTriangle, User
} from 'lucide-react';
import { Button, Input } from '../ui';
import { getStatusChipClass, getStatusIcon } from '../../utils/statusColors';

/**
 * VisitorDetailsModal - Full-screen modal with visitor information
 * @param {Object} props
 * @param {Object} props.visitor - Visitor data object
 * @param {Function} props.onClose - Callback to close modal
 * @param {Function} props.onCheckIn - Callback for check-in action
 * @param {Function} props.onCheckOut - Callback for check-out action
 * @param {Function} props.onVerify - Callback for verify action
 * @param {Function} props.onDeny - Callback for deny action
 * @param {Function} props.onContact - Callback for contact action
 * @param {boolean} props.isLoading - Loading state for actions
 */
export default function VisitorDetailsModal({
  visitor,
  onClose,
  onCheckIn,
  onCheckOut,
  onVerify,
  onDeny,
  onContact,
  isLoading = false
}) {
  const [otp, setOtp] = React.useState('');
  // Close on escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!visitor) return null;

  // Determine available actions based on status
  const isPending = visitor.status === 'PENDING' || visitor.status === 'pending_approval' || visitor.status === 'pending-verification';
  const isConfirmed = visitor.status === 'CONFIRMED';
  const isOnPremise = visitor.status === 'ON_PREMISE' || visitor.status === 'on-premise';
  const isRevoked = visitor.status === 'REVOKED';

  const canCheckIn = isConfirmed;
  const canCheckOut = isOnPremise || (visitor.check_in_time && !visitor.check_out_time);
  const canVerify = isPending;
  const canDeny = isPending || isConfirmed;

  // Format time helper
  const formatTime = (time) => {
    if (!time) return 'N/A';
    if (typeof time === 'string' && time.includes(':')) return time;
    try {
      return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return time;
    }
  };

  // Format date helper
  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return date;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="visitor-modal-title"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
              {visitor.name ? visitor.name.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
            </div>

            <div>
              <h2 id="visitor-modal-title" className="text-xl font-bold">
                {visitor.name || `Visitor #${visitor.id}`}
              </h2>
              <p className="text-green-100">{visitor.purpose || 'General Visit'}</p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mt-4">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-white/20 text-white`}>
              {getStatusIcon(visitor.status)} {visitor.status || 'Unknown'}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Check-in Time */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300 text-xs mb-1">
                <Clock className="w-3.5 h-3.5" />
                Check-in
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatTime(visitor.check_in_time || visitor.checkInTime)}
              </p>
            </div>

            {/* Duration / Check-out */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300 text-xs mb-1">
                <Clock className="w-3.5 h-3.5" />
                {visitor.check_out_time ? 'Check-out' : 'Duration'}
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {visitor.check_out_time
                  ? formatTime(visitor.check_out_time)
                  : visitor.duration || 'In progress'
                }
              </p>
            </div>

            {/* Host */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300 text-xs mb-1">
                <User className="w-3.5 h-3.5" />
                Host
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {visitor.host || visitor.resident_name || 'N/A'}
              </p>
            </div>

            {/* Visit Date */}
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300 text-xs mb-1">
                <Calendar className="w-3.5 h-3.5" />
                Date
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {formatDate(visitor.date_of_visit || visitor.created_at)}
              </p>
            </div>

            {/* Vehicle (if present) */}
            {(visitor.vehicleNumber || visitor.vehicle_number) && (
              <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300 text-xs mb-1">
                  <Car className="w-3.5 h-3.5" />
                  Vehicle
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {visitor.vehicleNumber || visitor.vehicle_number}
                </p>
              </div>
            )}

            {/* Phone (if present) */}
            {(visitor.phone || visitor.phone_number) && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300 text-xs mb-1">
                  <Phone className="w-3.5 h-3.5" />
                  Phone
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {visitor.phone || visitor.phone_number}
                </p>
              </div>
            )}

            {/* Email (if present) */}
            {visitor.email && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300 text-xs mb-1">
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {visitor.email}
                </p>
              </div>
            )}
          </div>

          {/* Notes (if present) */}
          {visitor.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
              <div className="flex items-center gap-2 text-amber-700 text-xs mb-1 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                Notes
              </div>
              <p className="text-sm text-amber-800">{visitor.notes}</p>
            </div>
          )}
          {/* OTP Input for Verification */}
          {canVerify && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <label htmlFor="otp-input" className="block text-sm font-medium text-blue-900 mb-2">
                Verification Code (OTP)
              </label>
              <Input
                id="otp-input"
                type="text"
                maxLength={6}
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="bg-white"
              />
              <p className="text-xs text-blue-700 mt-2">
                Ask the visitor for the code sent to their phone/email.
              </p>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex flex-wrap gap-2">
            {/* Pending Actions */}
            {canVerify && (
              <>
                <Button
                  onClick={() => {
                    onVerify?.(visitor.id, otp);
                    onClose();
                  }}
                  disabled={isLoading || !otp || otp.length < 6}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Verify
                </Button>
                <Button
                  onClick={() => {
                    onDeny?.(visitor.id);
                    onClose();
                  }}
                  disabled={isLoading}
                  variant="destructive"
                  className="flex-1"
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Deny
                </Button>
              </>
            )}

            {/* Confirmed Actions */}
            {canCheckIn && !canVerify && (
              <Button
                onClick={() => {
                  onCheckIn?.(visitor.id);
                  onClose();
                }}
                disabled={isLoading}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Check In
              </Button>
            )}

            {/* On Premise Actions */}
            {canCheckOut && !canVerify && (
              <Button
                onClick={() => {
                  onCheckOut?.(visitor.id);
                  onClose();
                }}
                disabled={isLoading}
                variant="outline"
                className="flex-1"
              >
                <UserX className="w-4 h-4 mr-2" />
                Check Out
              </Button>
            )}

            {/* Contact Action */}
            {(visitor.phone || visitor.phone_number) && onContact && (
              <Button
                onClick={() => onContact(visitor)}
                variant="outline"
                className="flex-1"
              >
                <Phone className="w-4 h-4 mr-2" />
                Contact
              </Button>
            )}

            {/* Close Button (always shown) */}
            <Button
              onClick={onClose}
              variant="ghost"
              className="flex-1 min-w-[100px]"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
