/**
 * @fileoverview Visitor Details Modal
 * @description Modal showing full visitor details with action buttons
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useEffect } from 'react';

import { getStatusChipClass, getStatusIcon } from '../../utils/statusColors';
import { Button, Input, Icon } from '../ui';

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

  const normalizeStatus = (status) => String(status || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  const normalizedStatus = normalizeStatus(visitor.status);
  const canCheckIn = normalizedStatus === 'APPROVED' || normalizedStatus === 'CONFIRMED';
  const canCheckOut = normalizedStatus === 'ON_PREMISE' || normalizedStatus === 'CHECKED_IN';
  const visitorName = visitor.name || `Visitor #${visitor.id || 'N/A'}`;
  const StatusIcon = getStatusIcon(visitor.status) || 'HelpCircle';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b dark:border-slate-700 flex items-center justify-between bg-white dark:bg-slate-800 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h2 id="modal-title" className="text-xl font-bold text-gray-900 dark:text-slate-100">
              Visitor Details
            </h2>
            <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1.5 ${getStatusChipClass(visitor.status)}`}>
               {/* Use dynamic component rendering for status icon, or fallback to Icon if getStatusIcon returns name string */}
                {typeof StatusIcon === 'string' ? (
                   <Icon name={StatusIcon} className="w-4 h-4" />
                ) : (
                   <StatusIcon className="w-4 h-4" />
                )}
              {normalizedStatus.replace(/_/g, ' ') || 'UNKNOWN'}
            </span>
          </div>
          <Button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors text-gray-500 dark:text-gray-300"
            aria-label="Close modal"
          >
            <Icon name="X" className="w-6 h-6" />
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Main Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left Column: Personal & Visit Details */}
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-3">
                  Visitor Information
                </h3>
                <div className="bg-gray-50 dark:bg-slate-700/70 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl">
                      {visitorName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-gray-900 dark:text-white">{visitorName}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-300 flex items-center gap-1">
                        <Icon name="Phone" className="w-3 h-3" /> 
                        {visitor.phone || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  {visitor.email && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-200">
                      <Icon name="Mail" className="w-4 h-4" />
                      <span>{visitor.email}</span>
                    </div>
                  )}

                  {visitor.company && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-200">
                      <Icon name="Building2" className="w-4 h-4" />
                      <span>{visitor.company}</span>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                  Visit Details
                </h3>
                <div className="bg-white dark:bg-slate-700 border dark:border-slate-600 rounded-xl p-4 space-y-3 shadow-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <Icon name="Clock" className="w-4 h-4" />
                        <span>Expected Arrival</span>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {visitor.arrival_time ? new Date(visitor.arrival_time).toLocaleTimeString() : 'N/A'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                         <Icon name="Calendar" className="w-4 h-4" />
                        <span>Date</span>
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {visitor.arrival_date ? new Date(visitor.arrival_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <hr className="border-dashed border-gray-300 dark:border-slate-600" />

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Icon name="MapPin" className="w-4 h-4" />
                      <span>Destination</span>
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Unit {visitor.estate_id || 'N/A'} • {visitor.resident_name || 'Unknown Resident'}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Column: Vehicle & Security */}
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-3">
                  Vehicle Information
                </h3>
                {visitor.license_plate ? (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-medium mb-1">
                        <Icon name="Car" className="w-4 h-4" />
                        <span>{visitor.vehicle_model || 'Vehicle'}</span>
                      </div>
                      <div className="text-2xl font-mono font-bold text-gray-900 dark:text-slate-100 tracking-wider bg-white dark:bg-slate-700 px-2 py-1 rounded border dark:border-slate-600 inline-block">
                        {visitor.license_plate}
                      </div>
                    </div>
                    <div className="text-right">
                       <span className="text-xs text-blue-600 dark:text-blue-300 font-semibold uppercase bg-blue-100 dark:bg-blue-900/40 px-2 py-1 rounded">
                         Registered
                       </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-slate-700/50 border border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-6 text-center text-gray-500 dark:text-gray-300">
                    <Icon name="Car" className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No vehicle registered</p>
                  </div>
                )}
              </section>

              <section>
                 <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider mb-3">
                  Security Actions
                 </h3>
                 <div className="mb-3">
                   <label htmlFor="visitor-otp" className="block text-xs font-medium text-gray-500 dark:text-gray-300 mb-1">
                     OTP (required for identity verification)
                   </label>
                   <Input
                     id="visitor-otp"
                     value={otp}
                     onChange={(event) => setOtp(event.target.value)}
                     placeholder="Enter OTP"
                     inputMode="numeric"
                     maxLength={6}
                     className="w-full"
                   />
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline" 
                      className="h-auto py-3 flex flex-col gap-2 items-center justify-center border-gray-200 dark:border-slate-600 hover:border-brand-500 hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-700"
                      onClick={() => onVerify(visitor.id, otp.trim())}
                      disabled={!otp.trim() || isLoading}
                    >
                      <Icon name="UserCheck" className="w-6 h-6 mb-1" />
                      <span>Verify Identity</span>
                    </Button>
                    <Button 
                       variant="outline"
                       className="h-auto py-3 flex flex-col gap-2 items-center justify-center border-gray-200 dark:border-slate-600 hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300"
                       onClick={() => onDeny(visitor.id)}
                       disabled={isLoading}
                    >
                      <Icon name="UserX" className="w-6 h-6 mb-1" />
                      <span>Report Issue</span>
                    </Button>
                 </div>
              </section>

              {visitor.notes && (
                <section className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-xl p-4">
                  <h4 className="text-yellow-800 dark:text-yellow-200 font-semibold mb-2 flex items-center gap-2">
                    <Icon name="AlertTriangle" className="w-4 h-4" />
                    Guard Notes
                  </h4>
                  <p className="text-sm text-yellow-900 dark:text-yellow-100 leading-relaxed">
                    {visitor.notes}
                  </p>
                </section>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4">
           {normalizedStatus === 'PENDING_APPROVAL' && (
             <div className="flex-1 w-full sm:w-auto">
                <p className="text-sm text-gray-500 dark:text-gray-300 mb-2 sm:mb-0">
                  <span className="font-semibold text-orange-600 animate-pulse">Waiting for approval</span>
                  <span className="mx-2">•</span>
                  Sent to {visitor.resident_name}
                </p>
             </div>
           )}

           <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <Button variant="ghost" onClick={onClose} disabled={isLoading}>
                Cancel
              </Button>
              
              {canCheckIn && (
                 <Button 
                   onClick={() => onCheckIn(visitor.id)}
                   disabled={isLoading}
                   className="bg-brand-600 hover:bg-brand-700 min-w-[140px]"
                 >
                   {isLoading ? 'Processing...' : (
                      <>
                        <Icon name="UserCheck" className="w-4 h-4 mr-2" />
                        Check In
                      </>
                   )}
                 </Button>
              )}

              {canCheckOut && (
                 <Button 
                   onClick={() => onCheckOut(visitor.id)}
                   disabled={isLoading}
                   className="bg-gray-800 hover:bg-gray-900 min-w-[140px]"
                 >
                   {isLoading ? 'Processing...' : (
                      <>
                        <Icon name="LogOut" className="w-4 h-4 mr-2" />
                        Check Out
                      </>
                   )}
                 </Button>
              )}
           </div>
        </div>
      </div>
    </div>
  );
};
