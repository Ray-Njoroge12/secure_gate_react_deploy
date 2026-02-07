/**
 * Panic Button Component
 * Phase 1.1: Guard Panic Button Implementation
 * 
 * Features:
 * - One-tap emergency alert
 * - Confirmation modal (prevent accidental triggers)
 * - 30-second cancel window
 * - Location capture with privacy notice
 * - Real-time status updates
 * 
 * Privacy:
 * - GPS captured only at trigger moment
 * - Clear privacy notice before activation
 * - Location optional - button works without GPS
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import emergencyService from '../../services/emergencyService';
import notificationService from '../../services/notificationService';
import logger from '../../utils/logger';

// States for the panic button flow
const STATES = {
  IDLE: 'idle',
  CONFIRMING: 'confirming',
  TRIGGERING: 'triggering',
  TRIGGERED: 'triggered',
  CANCELLING: 'cancelling',
  ACKNOWLEDGED: 'acknowledged',
  RESOLVED: 'resolved',
  ERROR: 'error'
};

const PanicButton = ({ 
  gateId = null,
  className = '',
  size = 'default', // 'small', 'default', 'large'
  floating = true,  // Show as floating button
  onStateChange = () => {},
  disabled = false
}) => {
  const [state, setState] = useState(STATES.IDLE);
  const [emergencyId, setEmergencyId] = useState(null);
  const [cancelTimeLeft, setCancelTimeLeft] = useState(0);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);
  const [privacyInfo, setPrivacyInfo] = useState(null);
  const [error, setError] = useState(null);
  
  const cancelTimerRef = useRef(null);
  const confirmTimeoutRef = useRef(null);

  // Cancel window countdown
  useEffect(() => {
    if (state === STATES.TRIGGERED && cancelTimeLeft > 0) {
      cancelTimerRef.current = setTimeout(() => {
        setCancelTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
    };
  }, [state, cancelTimeLeft]);

  // Notify parent of state changes
  useEffect(() => {
    onStateChange(state);
  }, [state, onStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cancelTimerRef.current) clearTimeout(cancelTimerRef.current);
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    };
  }, []);

  // Load privacy info
  useEffect(() => {
    const loadPrivacyInfo = async () => {
      try {
        const info = await emergencyService.getPanicPrivacyInfo();
        setPrivacyInfo(info);
      } catch (err) {
        logger.error('Failed to load privacy info:', err);
      }
    };
    loadPrivacyInfo();
  }, []);

  /**
   * Step 1: Show confirmation modal
   */
  const handlePanicPress = useCallback(() => {
    if (disabled || state !== STATES.IDLE) return;
    
    setState(STATES.CONFIRMING);
    setError(null);
    
    // Auto-cancel confirmation after 10 seconds
    confirmTimeoutRef.current = setTimeout(() => {
      if (state === STATES.CONFIRMING) {
        setState(STATES.IDLE);
      }
    }, 10000);
  }, [disabled, state]);

  /**
   * Step 2: Confirm and trigger panic
   */
  const handleConfirmPanic = useCallback(async () => {
    if (state !== STATES.CONFIRMING) return;
    
    if (confirmTimeoutRef.current) {
      clearTimeout(confirmTimeoutRef.current);
    }
    
    setState(STATES.TRIGGERING);
    
    try {
      // Get location (optional - works without it)
      const location = await emergencyService.getCurrentLocation();
      
      // Trigger the panic alert
      const result = await emergencyService.triggerPanicButton(location, gateId);
      
      if (result.success) {
        setEmergencyId(result.data.emergencyId);
        setCancelTimeLeft(result.data.cancelWindow || 30);
        setState(STATES.TRIGGERED);
        
        notificationService.warning(
          '🆘 Emergency Alert Sent',
          'Help is on the way. You can cancel within 30 seconds if this was accidental.'
        );
        
        logger.info('Panic button triggered', { emergencyId: result.data.emergencyId });
      } else {
        throw new Error(result.message || 'Failed to trigger alert');
      }
    } catch (err) {
      setError(err.message || 'Failed to send emergency alert');
      setState(STATES.ERROR);
      
      notificationService.error(
        'Alert Failed',
        err.message || 'Could not send emergency alert. Please try again or call for help.'
      );
      
      logger.error('Panic button failed:', err);
    }
  }, [state, gateId]);

  /**
   * Cancel the panic alert (within 30-second window)
   */
  const handleCancelPanic = useCallback(async () => {
    if (!emergencyId || cancelTimeLeft <= 0) return;
    
    setState(STATES.CANCELLING);
    
    try {
      const result = await emergencyService.cancelPanicAlert(emergencyId);
      
      if (result.success) {
        setState(STATES.IDLE);
        setEmergencyId(null);
        setCancelTimeLeft(0);
        
        notificationService.success(
          'Alert Cancelled',
          'Emergency alert has been cancelled. No action needed.'
        );
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      setError(err.message);
      notificationService.error('Cancel Failed', err.message);
      // Return to triggered state - alert is still active
      setState(STATES.TRIGGERED);
    }
  }, [emergencyId, cancelTimeLeft]);

  /**
   * Cancel the confirmation modal
   */
  const handleCancelConfirm = useCallback(() => {
    if (confirmTimeoutRef.current) {
      clearTimeout(confirmTimeoutRef.current);
    }
    setState(STATES.IDLE);
    setError(null);
  }, []);

  /**
   * Reset after error
   */
  const handleRetry = useCallback(() => {
    setState(STATES.IDLE);
    setError(null);
    setEmergencyId(null);
  }, []);

  /**
   * Reset after emergency resolved
   */
  const handleReset = useCallback(() => {
    setState(STATES.IDLE);
    setEmergencyId(null);
    setCancelTimeLeft(0);
    setError(null);
  }, []);

  // Size variants
  const sizeClasses = {
    small: 'w-12 h-12 text-sm',
    default: 'w-16 h-16 text-base',
    large: 'w-20 h-20 text-lg'
  };

  // Render the main panic button
  const renderPanicButton = () => (
    <button
      onClick={handlePanicPress}
      disabled={disabled || state !== STATES.IDLE}
      className={`
        ${sizeClasses[size]}
        rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800
        text-white font-bold
        shadow-lg hover:shadow-xl
        transition-all duration-200
        flex items-center justify-center
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${floating ? 'fixed bottom-6 right-6 z-50' : ''}
        ${className}
        focus:outline-none focus:ring-4 focus:ring-red-300
        animate-pulse hover:animate-none
      `}
      aria-label="Emergency Panic Button"
      title="Press for emergency assistance"
    >
      <svg 
        className="w-8 h-8" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2.5} 
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
        />
      </svg>
    </button>
  );

  // Render confirmation modal
  const renderConfirmationModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-slideUp">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Emergency Alert</h2>
          <p className="text-gray-600 dark:text-gray-200 mt-2">
            This will immediately notify all security personnel and administrators.
          </p>
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium">Privacy Notice</p>
              <p className="mt-1">
                Your current location will be captured <strong>once</strong> to help responders find you. 
                We do not continuously track your location.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleCancelConfirm}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 text-gray-800 dark:text-gray-200 font-medium rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmPanic}
            className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
          >
            🆘 SEND ALERT
          </button>
        </div>

        {/* Learn More Link */}
        <button
          onClick={() => setShowPrivacyInfo(true)}
          className="w-full mt-4 text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Learn more about panic button privacy
        </button>
      </div>
    </div>
  );

  // Render triggered state (with cancel option)
  const renderTriggeredState = () => (
    <div className="fixed inset-0 bg-red-900 bg-opacity-95 flex items-center justify-center z-50 p-4">
      <div className="text-center text-white max-w-md">
        {/* Animated Alert Icon */}
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 animate-ping">
          <svg className="w-16 h-16 text-red-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>

        <h1 className="text-3xl font-bold mb-2">ALERT SENT!</h1>
        <p className="text-xl mb-6">Help is on the way</p>
        
        {/* Cancel Option */}
        {cancelTimeLeft > 0 && (
          <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-6">
            <p className="text-sm mb-2">Triggered by accident?</p>
            <button
              onClick={handleCancelPanic}
              disabled={state === STATES.CANCELLING}
              className="px-6 py-3 bg-white dark:bg-slate-800 text-red-600 font-bold rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {state === STATES.CANCELLING ? 'Cancelling...' : `Cancel (${cancelTimeLeft}s)`}
            </button>
          </div>
        )}

        {cancelTimeLeft <= 0 && (
          <div className="bg-white bg-opacity-20 rounded-lg p-4">
            <p className="text-sm">
              Cancel window expired. Wait for responders or contact admin.
            </p>
            <button
              onClick={handleReset}
              className="mt-4 px-6 py-2 bg-white dark:bg-slate-800 text-red-600 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Render error state
  const renderErrorState = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Alert Failed</h2>
          <p className="text-gray-600 dark:text-gray-200 mb-4">{error}</p>
          <p className="text-sm text-gray-500 dark:text-gray-300 mb-6">
            If this is a real emergency, please call for help directly.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg"
            >
              Try Again
            </button>
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 text-gray-800 dark:text-gray-200 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render privacy info modal
  const renderPrivacyModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Panic Button Privacy</h2>
          <button
            onClick={() => setShowPrivacyInfo(false)}
            className="text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {privacyInfo ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-300">
              Last updated: {privacyInfo.lastUpdated}
            </p>
            {privacyInfo.policies?.map((policy, index) => (
              <div key={index} className="border-b border-gray-100 pb-4">
                <h3 className="font-medium text-gray-900 dark:text-white">{policy.item}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">{policy.description}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-gray-300 dark:border-slate-600 border-t-blue-600 rounded-full mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-300">Loading privacy information...</p>
          </div>
        )}
        
        <button
          onClick={() => setShowPrivacyInfo(false)}
          className="w-full mt-6 px-4 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 text-gray-800 dark:text-gray-200 font-medium rounded-lg"
        >
          Close
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Main Button (always visible in idle state) */}
      {state === STATES.IDLE && renderPanicButton()}
      
      {/* Confirmation Modal */}
      {state === STATES.CONFIRMING && renderConfirmationModal()}
      
      {/* Triggering Overlay */}
      {state === STATES.TRIGGERING && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center text-white">
            <div className="animate-spin w-16 h-16 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-xl">Sending emergency alert...</p>
          </div>
        </div>
      )}
      
      {/* Triggered State */}
      {(state === STATES.TRIGGERED || state === STATES.CANCELLING) && renderTriggeredState()}
      
      {/* Error State */}
      {state === STATES.ERROR && renderErrorState()}
      
      {/* Privacy Info Modal */}
      {showPrivacyInfo && renderPrivacyModal()}
    </>
  );
};

PanicButton.propTypes = {
  gateId: PropTypes.number,
  className: PropTypes.string,
  size: PropTypes.oneOf(['small', 'default', 'large']),
  floating: PropTypes.bool,
  onStateChange: PropTypes.func,
  disabled: PropTypes.bool
};

export default PanicButton;
