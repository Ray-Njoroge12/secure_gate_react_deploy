/**
 * @fileoverview MFA Verification Modal for Sensitive Operations
 * @description Modal component that prompts guards (and other users) to verify
 * their identity via MFA before performing sensitive operations
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import useModalAccessibility from '../../hooks/useModalAccessibility';
import api from '../../utils/apiClient';
import logger from '../../utils/logger';
import { Card, Button } from '../ui';

// Icons
const ShieldIcon = () => (
  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const CloseIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

/**
 * Operations that require MFA verification for guards
 */
export const SENSITIVE_OPERATIONS = {
  EMERGENCY_ACCESS_OVERRIDE: {
    id: 'emergency_access_override',
    name: 'Emergency Access Override',
    description: 'Override access controls in emergency situations',
    requireReason: true
  },
  BULK_CHECKOUT: {
    id: 'bulk_checkout',
    name: 'Bulk Checkout',
    description: 'Check out multiple visitors at once',
    requireReason: false,
    minCount: 5 // Only require MFA for 5+ visitors
  },
  INCIDENT_RESOLUTION: {
    id: 'incident_resolution',
    name: 'Incident Resolution',
    description: 'Mark an incident as resolved',
    requireReason: true
  },
  MANUAL_OVERRIDE: {
    id: 'manual_override',
    name: 'Manual Override',
    description: 'Manually override visitor status',
    requireReason: true
  },
  SHIFT_HANDOVER: {
    id: 'shift_handover',
    name: 'Shift Handover',
    description: 'Complete shift handover',
    requireReason: false
  },
  PANIC_TRIGGER: {
    id: 'panic_trigger',
    name: 'Panic Alert',
    description: 'Trigger emergency panic alert',
    requireReason: true,
    skipVerification: true // Panic should not be blocked by MFA
  }
};

/**
 * MFA Verification Modal Component
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether the modal is visible
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Function} props.onVerified - Callback when MFA is successfully verified
 * @param {Object} props.operation - The sensitive operation being performed
 * @param {string} props.operationDetails - Additional details about the operation
 */
export default function MFAVerificationModal({
  isOpen,
  onClose,
  onVerified,
  operation,
  operationDetails = ''
}) {
  const { user } = useAuth();
  const { modalRef } = useModalAccessibility(isOpen, onClose);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [reason, setReason] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef([]);

  // Check if user has MFA enabled
  useEffect(() => {
    if (isOpen && user) {
      setMfaEnabled(user.mfa_enabled || false);
    }
  }, [isOpen, user]);

  // Auto-focus first input when modal opens
  useEffect(() => {
    if (isOpen && mfaEnabled) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen, mfaEnabled]);

  // Handle countdown for rate limiting
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCode(['', '', '', '', '', '']);
      setError('');
      setReason('');
      setIsVerifying(false);
    }
  }, [isOpen]);

  // Handle input change
  const handleInputChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (value && index === 5 && newCode.every(d => d)) {
      handleVerify(newCode.join(''));
    }
  };

  // Handle keydown for backspace navigation
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pasted)) {
      const digits = pasted.split('');
      setCode(digits);
      inputRefs.current[5]?.focus();
      handleVerify(pasted);
    }
  };

  // Verify MFA code
  const handleVerify = async (codeStr) => {
    const verificationCode = codeStr || code.join('');

    if (verificationCode.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    if (operation?.requireReason && !reason.trim()) {
      setError('Please provide a reason for this action');
      return;
    }

    try {
      setIsVerifying(true);

      const res = await api.post('/api/mfa/verify-operation', {
        code: verificationCode,
        operation: operation?.id,
        operationDetails,
        reason: reason.trim() || undefined
      });

      const json = res.data;

      if (!json.success) {
        if (json.rateLimited) {
          setCountdown(json.retryAfter || 30);
          setError(`Too many attempts. Please wait ${json.retryAfter || 30} seconds.`);
        } else {
          setError(json.message || 'Invalid verification code');
        }
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }

      // Success
      logger.info('MFA verification successful for operation', {
        operation: operation?.id,
        userId: user?.id
      });

      onVerified({
        verified: true,
        token: json.operationToken,
        reason: reason.trim()
      });

    } catch (error) {
      logger.error('MFA verification failed:', error);
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Handle proceeding without MFA (for users without MFA enabled)
  const handleProceedWithoutMFA = () => {
    if (operation?.requireReason && !reason.trim()) {
      setError('Please provide a reason for this action');
      return;
    }

    logger.warn('Proceeding with sensitive operation without MFA', {
      operation: operation?.id,
      userId: user?.id
    });

    onVerified({
      verified: false,
      mfaSkipped: true,
      reason: reason.trim()
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="mfa-modal-title">
      <div ref={modalRef} tabIndex={-1} className="outline-none">
      <Card className="max-w-md w-full p-6 relative">
        {/* Close button */}
        <Button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Close"
        >
          <CloseIcon />
        </Button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mx-auto mb-4">
            <ShieldIcon className="text-blue-600 dark:text-blue-400" />
          </div>
          <h2 id="mfa-modal-title" className="text-xl font-semibold text-gray-900 dark:text-white">
            Security Verification
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
            {operation?.name || 'Sensitive Operation'}
          </p>
        </div>

        {/* Operation Description */}
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <LockIcon className="flex-shrink-0 text-gray-400 dark:text-gray-300 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {operation?.description || 'This action requires verification'}
              </p>
              {operationDetails && (
                <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                  {operationDetails}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* MFA Input or Warning */}
        {mfaEnabled === false ? (
          <div className="mb-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>MFA Not Enabled:</strong> For enhanced security, we recommend enabling 
                two-factor authentication in your settings.
              </p>
            </div>

            {operation?.requireReason && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason for this action *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setError('');
                  }}
                  rows={2}
                  placeholder="Please explain why this action is necessary..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
        ) : mfaEnabled === true ? (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
              Enter your 6-digit verification code
            </label>

            {/* Code Input */}
            <div className="flex justify-center gap-2 mb-4" onPaste={handlePaste}>
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={el => inputRefs.current[index] = el}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={isVerifying || countdown > 0}
                  className="w-12 h-14 text-center text-2xl font-mono border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-slate-800"
                />
              ))}
            </div>

            {operation?.requireReason && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason for this action *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setError('');
                  }}
                  rows={2}
                  placeholder="Please explain why this action is necessary..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="mb-6 text-center">
            <SpinnerIcon className="mx-auto text-blue-600" />
            <p className="text-sm text-gray-500 dark:text-gray-300 mt-2">
              Checking security settings...
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isVerifying}
          >
            Cancel
          </Button>

          {mfaEnabled === false ? (
            <Button
              variant="primary"
              className="flex-1"
              onClick={handleProceedWithoutMFA}
            >
              Proceed
            </Button>
          ) : mfaEnabled === true ? (
            <Button
              variant="primary"
              className="flex-1"
              onClick={() => handleVerify()}
              disabled={isVerifying || countdown > 0 || code.some(d => !d)}
            >
              {isVerifying ? (
                <>
                  <SpinnerIcon className="mr-2" />
                  Verifying...
                </>
              ) : countdown > 0 ? (
                `Wait ${countdown}s`
              ) : (
                'Verify'
              )}
            </Button>
          ) : null}
        </div>

        {/* Help text */}
        <p className="text-xs text-center text-gray-500 dark:text-gray-300 mt-4">
          Open your authenticator app to get the verification code
        </p>
      </Card>
      </div>
    </div>
  );
}

/**
 * Hook to use MFA verification for sensitive operations
 */
export function useMFAVerification() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingOperation, setPendingOperation] = useState(null);
  const resolverRef = useRef(null);

  const requestVerification = useCallback((operation, operationDetails = '') => {
    return new Promise((resolve) => {
      // Skip MFA for operations that don't require it
      if (operation?.skipVerification) {
        resolve({ verified: true, skipped: true });
        return;
      }

      setPendingOperation({ operation, operationDetails });
      resolverRef.current = resolve;
      setIsModalOpen(true);
    });
  }, []);

  const handleVerified = useCallback((result) => {
    setIsModalOpen(false);
    if (resolverRef.current) {
      resolverRef.current(result);
      resolverRef.current = null;
    }
    setPendingOperation(null);
  }, []);

  const handleClose = useCallback(() => {
    setIsModalOpen(false);
    if (resolverRef.current) {
      resolverRef.current({ verified: false, cancelled: true });
      resolverRef.current = null;
    }
    setPendingOperation(null);
  }, []);

  const MFAModal = useCallback(() => (
    <MFAVerificationModal
      isOpen={isModalOpen}
      onClose={handleClose}
      onVerified={handleVerified}
      operation={pendingOperation?.operation}
      operationDetails={pendingOperation?.operationDetails}
    />
  ), [isModalOpen, pendingOperation, handleClose, handleVerified]);

  return {
    requestVerification,
    MFAModal,
    isVerifying: isModalOpen
  };
}
