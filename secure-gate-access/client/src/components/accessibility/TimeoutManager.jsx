/**
 * Timeout Manager Component
 * 
 * Provides configurable timeout extensions for users with motor impairments
 * Implements WCAG 2.1 AA compliance for timing adjustments
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAccessibilityContext } from './AccessibilityProvider.jsx';
import './TimeoutManager.css';
import Button from '../ui/Button';

/**
 * Default timeout configurations
 */
const DEFAULT_TIMEOUTS = {
  session: 30 * 60 * 1000, // 30 minutes
  form: 10 * 60 * 1000,    // 10 minutes
  interaction: 30 * 1000,   // 30 seconds
  notification: 10 * 1000,  // 10 seconds
  modal: 60 * 1000         // 1 minute
};

/**
 * Extended timeout multipliers for accessibility
 */
const TIMEOUT_EXTENSIONS = {
  none: 1,      // No extension
  moderate: 2,  // 2x longer
  extended: 5,  // 5x longer
  unlimited: 0  // No timeout
};

/**
 * Timeout Manager Component
 */
export const TimeoutManager = ({ 
  className = '',
  enabled = true,
  onTimeoutWarning,
  onTimeoutExtended
}) => {
  const { settings, updateSetting, announce } = useAccessibilityContext();
  const [activeTimeouts, setActiveTimeouts] = useState(new Map());
  const [warningDialogs, setWarningDialogs] = useState(new Map());
  const [extensionLevel, setExtensionLevel] = useState('moderate');
  
  const timeoutRefs = useRef(new Map());
  const warningRefs = useRef(new Map());

  // Calculate extended timeout duration
  const getExtendedTimeout = useCallback((baseTimeout, type = 'interaction') => {
    if (!settings.extendedTimeouts) {
      return baseTimeout;
    }

    const multiplier = TIMEOUT_EXTENSIONS[extensionLevel] || 1;
    
    // Unlimited timeouts
    if (multiplier === 0) {
      return null; // No timeout
    }

    return baseTimeout * multiplier;
  }, [settings.extendedTimeouts, extensionLevel]);

  // Create timeout with accessibility extensions
  const createTimeout = useCallback((
    callback, 
    duration, 
    options = {}
  ) => {
    const {
      type = 'interaction',
      warningTime = 0.2, // Show warning at 20% remaining
      allowExtension = true,
      description = 'Operation timeout',
      id = `timeout-${Date.now()}`
    } = options;

    // Get extended duration
    const extendedDuration = getExtendedTimeout(duration, type);
    
    // No timeout if unlimited
    if (extendedDuration === null) {
      return { id, cancel: () => {}, extend: () => {} };
    }

    const timeoutData = {
      id,
      type,
      description,
      originalDuration: duration,
      extendedDuration,
      startTime: Date.now(),
      callback,
      allowExtension,
      warningTime: extendedDuration * warningTime,
      isWarningShown: false,
      extensionCount: 0
    };

    // Set warning timeout
    if (allowExtension && timeoutData.warningTime > 0) {
      const warningTimeout = setTimeout(() => {
        showTimeoutWarning(timeoutData);
      }, extendedDuration - timeoutData.warningTime);
      
      warningRefs.current.set(id, warningTimeout);
    }

    // Set main timeout
    const mainTimeout = setTimeout(() => {
      executeTimeout(timeoutData);
    }, extendedDuration);

    timeoutRefs.current.set(id, mainTimeout);
    setActiveTimeouts(prev => new Map(prev.set(id, timeoutData)));

    // Return control object
    return {
      id,
      cancel: () => cancelTimeout(id),
      extend: (additionalTime) => extendTimeout(id, additionalTime),
      getRemainingTime: () => getRemainingTime(id)
    };
  }, [getExtendedTimeout, settings.extendedTimeouts]);

  // Show timeout warning dialog
  const showTimeoutWarning = useCallback((timeoutData) => {
    const { id, description, warningTime } = timeoutData;
    
    timeoutData.isWarningShown = true;
    
    const warningDialog = {
      id,
      description,
      remainingTime: warningTime,
      onExtend: () => extendTimeout(id),
      onContinue: () => dismissWarning(id),
      onCancel: () => cancelTimeout(id)
    };

    setWarningDialogs(prev => new Map(prev.set(id, warningDialog)));
    
    // Announce warning
    announce(
      `Timeout warning: ${description} will expire in ${Math.round(warningTime / 1000)} seconds`,
      'assertive'
    );

    // Callback for external handling
    if (onTimeoutWarning) {
      onTimeoutWarning(timeoutData);
    }
  }, [announce, onTimeoutWarning]);

  // Execute timeout callback
  const executeTimeout = useCallback((timeoutData) => {
    const { id, callback, description } = timeoutData;
    
    // Clean up
    cancelTimeout(id);
    
    // Announce timeout
    announce(`Timeout expired: ${description}`, 'assertive');
    
    // Execute callback
    if (callback) {
      callback();
    }
  }, [announce]);

  // Extend timeout
  const extendTimeout = useCallback((id, additionalTime = null) => {
    const timeoutData = activeTimeouts.get(id);
    if (!timeoutData) return false;

    // Calculate extension time
    const extensionTime = additionalTime || timeoutData.originalDuration;
    const newDuration = extensionTime;

    // Cancel existing timeouts
    const existingTimeout = timeoutRefs.current.get(id);
    const existingWarning = warningRefs.current.get(id);
    
    if (existingTimeout) clearTimeout(existingTimeout);
    if (existingWarning) clearTimeout(existingWarning);

    // Update timeout data
    timeoutData.extensionCount++;
    timeoutData.startTime = Date.now();
    timeoutData.extendedDuration = newDuration;
    timeoutData.isWarningShown = false;

    // Set new timeouts
    const warningTimeout = setTimeout(() => {
      showTimeoutWarning(timeoutData);
    }, newDuration - timeoutData.warningTime);

    const mainTimeout = setTimeout(() => {
      executeTimeout(timeoutData);
    }, newDuration);

    timeoutRefs.current.set(id, mainTimeout);
    warningRefs.current.set(id, warningTimeout);

    // Update state
    setActiveTimeouts(prev => new Map(prev.set(id, timeoutData)));
    dismissWarning(id);

    // Announce extension
    announce(
      `Timeout extended for ${timeoutData.description}. ${Math.round(newDuration / 1000)} seconds remaining.`,
      'polite'
    );

    // Callback for external handling
    if (onTimeoutExtended) {
      onTimeoutExtended(timeoutData);
    }

    return true;
  }, [activeTimeouts, announce, onTimeoutExtended]);

  // Cancel timeout
  const cancelTimeout = useCallback((id) => {
    const existingTimeout = timeoutRefs.current.get(id);
    const existingWarning = warningRefs.current.get(id);
    
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      timeoutRefs.current.delete(id);
    }
    
    if (existingWarning) {
      clearTimeout(existingWarning);
      warningRefs.current.delete(id);
    }

    setActiveTimeouts(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });

    dismissWarning(id);
  }, []);

  // Dismiss warning dialog
  const dismissWarning = useCallback((id) => {
    setWarningDialogs(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  // Get remaining time for timeout
  const getRemainingTime = useCallback((id) => {
    const timeoutData = activeTimeouts.get(id);
    if (!timeoutData) return 0;

    const elapsed = Date.now() - timeoutData.startTime;
    const remaining = timeoutData.extendedDuration - elapsed;
    
    return Math.max(0, remaining);
  }, [activeTimeouts]);

  // Handle extension level change
  const handleExtensionLevelChange = useCallback((level) => {
    setExtensionLevel(level);
    updateSetting('timeoutExtensionLevel', level);
    
    announce(`Timeout extension level set to ${level}`, 'polite');
  }, [updateSetting, announce]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all timeouts
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      warningRefs.current.forEach(warning => clearTimeout(warning));
    };
  }, []);

  // Don't render if not enabled
  if (!enabled) {
    return null;
  }

  return (
    <div className={`timeout-manager ${className}`}>
      {/* Timeout Settings */}
      <div className="timeout-manager__settings">
        <h3 className="timeout-manager__title">Timeout Settings</h3>
        
        <div className="timeout-manager__control">
          <label className="timeout-manager__toggle">
            <input
              type="checkbox"
              checked={settings.extendedTimeouts}
              onChange={() => updateSetting('extendedTimeouts', !settings.extendedTimeouts)}
              aria-describedby="extended-timeouts-desc"
            />
            <span className="timeout-manager__toggle-slider"></span>
            <span className="timeout-manager__toggle-label">Extended Timeouts</span>
          </label>
          <p id="extended-timeouts-desc" className="timeout-manager__description">
            Provides additional time for form completion and interactions
          </p>
        </div>

        {settings.extendedTimeouts && (
          <div className="timeout-manager__extension-levels">
            <label className="timeout-manager__label">
              Extension Level:
            </label>
            <div className="timeout-manager__radio-group" role="radiogroup" aria-labelledby="extension-level-label">
              {Object.entries(TIMEOUT_EXTENSIONS).map(([key, multiplier]) => (
                <label key={key} className="timeout-manager__radio">
                  <input
                    type="radio"
                    name="extension-level"
                    value={key}
                    checked={extensionLevel === key}
                    onChange={() => handleExtensionLevelChange(key)}
                  />
                  <span className="timeout-manager__radio-label">
                    {key.charAt(0).toUpperCase() + key.slice(1)}
                    {multiplier > 0 && ` (${multiplier}x)`}
                    {multiplier === 0 && ' (No timeout)'}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Active Timeouts Display */}
      {activeTimeouts.size > 0 && (
        <div className="timeout-manager__active">
          <h4 className="timeout-manager__active-title">Active Timeouts</h4>
          <div className="timeout-manager__timeout-list">
            {Array.from(activeTimeouts.values()).map((timeout) => (
              <TimeoutDisplay
                key={timeout.id}
                timeout={timeout}
                onExtend={() => extendTimeout(timeout.id)}
                onCancel={() => cancelTimeout(timeout.id)}
                getRemainingTime={() => getRemainingTime(timeout.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Warning Dialogs */}
      {Array.from(warningDialogs.values()).map((dialog) => (
        <TimeoutWarningDialog
          key={dialog.id}
          dialog={dialog}
          onExtend={dialog.onExtend}
          onContinue={dialog.onContinue}
          onCancel={dialog.onCancel}
        />
      ))}
    </div>
  );
};

/**
 * Timeout Display Component
 */
const TimeoutDisplay = ({ 
  timeout, 
  onExtend, 
  onCancel, 
  getRemainingTime 
}) => {
  const [remainingTime, setRemainingTime] = useState(getRemainingTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingTime(getRemainingTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [getRemainingTime]);

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${remainingSeconds}s`;
  };

  return (
    <div className="timeout-display">
      <div className="timeout-display__info">
        <span className="timeout-display__description">{timeout.description}</span>
        <span className="timeout-display__time">{formatTime(remainingTime)}</span>
      </div>
      <div className="timeout-display__actions">
        {timeout.allowExtension && (
          <Button
            className="timeout-display__extend"
            onClick={onExtend}
            aria-label={`Extend timeout for ${timeout.description}`}
          >
            Extend
          </Button>
        )}
        <Button
          className="timeout-display__cancel"
          onClick={onCancel}
          aria-label={`Cancel timeout for ${timeout.description}`}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

/**
 * Timeout Warning Dialog Component
 */
const TimeoutWarningDialog = ({ 
  dialog, 
  onExtend, 
  onContinue, 
  onCancel 
}) => {
  const [countdown, setCountdown] = useState(Math.round(dialog.remainingTime / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="timeout-warning-dialog" role="alertdialog" aria-labelledby="timeout-warning-title">
      <div className="timeout-warning-dialog__backdrop" onClick={onContinue} role="presentation" aria-hidden="true"></div>
      <div className="timeout-warning-dialog__content">
        <h3 id="timeout-warning-title" className="timeout-warning-dialog__title">
          ⚠️ Timeout Warning
        </h3>
        <p className="timeout-warning-dialog__message">
          {dialog.description} will expire in <strong>{countdown} seconds</strong>.
          Would you like to extend the timeout?
        </p>
        <div className="timeout-warning-dialog__actions">
          <Button
            className="timeout-warning-dialog__extend"
            onClick={onExtend}
            autoFocus
          >
            Extend Time
          </Button>
          <Button
            className="timeout-warning-dialog__continue"
            onClick={onContinue}
          >
            Continue
          </Button>
          <Button
            className="timeout-warning-dialog__cancel"
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook for using timeout manager
 */
export const useTimeoutManager = () => {
  const { settings } = useAccessibilityContext();
  const timeoutManagerRef = useRef(null);

  const createAccessibleTimeout = useCallback((callback, duration, options = {}) => {
    if (!timeoutManagerRef.current) {
      console.warn('TimeoutManager not initialized');
      return { id: null, cancel: () => {}, extend: () => {} };
    }

    return timeoutManagerRef.current.createTimeout(callback, duration, options);
  }, []);

  return {
    createTimeout: createAccessibleTimeout,
    isExtendedTimeoutsEnabled: settings.extendedTimeouts,
    setTimeoutManagerRef: (ref) => { timeoutManagerRef.current = ref; }
  };
};

export default TimeoutManager;