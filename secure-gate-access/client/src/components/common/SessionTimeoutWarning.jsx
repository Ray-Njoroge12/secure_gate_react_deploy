/**
 * @file SessionTimeoutWarning.jsx
 * @description Session timeout warning modal for user notification
 * Phase 3: UI/UX Improvement - P1 Priority
 * 
 * Features:
 * - Displays warning before session expires
 * - Allows user to extend session
 * - Shows countdown timer
 * - Automatic logout after timeout
 * - Role-based session timeout configuration (super_admin, admin, guard have shorter timeouts)
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { navigateToLogin } from '../../utils/authNavigation';
import { getSessionConfigForRole } from '../../utils/navigationFlow';

const SessionTimeoutWarning = ({ 
  warningTime: propWarningTime,  // Optional override
  sessionTimeout: propSessionTimeout, // Optional override
  onExtendSession,
  className = '' 
}) => {
  const { isAuthenticated, logout, refreshToken, user } = useAuth();
  
  // Get role-based session configuration
  const sessionConfig = useMemo(() => {
    const role = user?.role || 'default';
    return getSessionConfigForRole(role);
  }, [user?.role]);
  
  // Use role-based config with prop overrides
  const warningTime = propWarningTime || sessionConfig.sessionWarningMs;
  const sessionTimeout = propSessionTimeout || sessionConfig.sessionTimeoutMs;
  
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(warningTime / 1000);
  const [lastActivity, setLastActivity] = useState(Date.now());
  
  const warningTimeoutRef = useRef(null);
  const logoutTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Track user activity
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
    setShowWarning(false);
    setCountdown(warningTime / 1000);
  }, [warningTime]);

  // Handle session extension
  const handleExtendSession = useCallback(async () => {
    try {
      if (refreshToken) {
        await refreshToken();
      }
      if (onExtendSession) {
        await onExtendSession();
      }
      updateActivity();
    } catch (error) {
      console.error('Failed to extend session:', error);
    }
  }, [refreshToken, onExtendSession, updateActivity]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigateToLogin({ search: '?session=expired' });
    } catch (error) {
      console.error('Logout error:', error);
      navigateToLogin();
    }
  }, [logout]);

  // Set up activity listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    const throttledUpdate = (() => {
      let lastCall = 0;
      return () => {
        const now = Date.now();
        if (now - lastCall >= 60000) { // Throttle to once per minute
          lastCall = now;
          updateActivity();
        }
      };
    })();

    activityEvents.forEach(event => {
      window.addEventListener(event, throttledUpdate, { passive: true });
    });

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, throttledUpdate);
      });
    };
  }, [isAuthenticated, updateActivity]);

  // Set up session timeout logic
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkSession = () => {
      const timeSinceActivity = Date.now() - lastActivity;
      const timeUntilWarning = (sessionTimeout - warningTime) - timeSinceActivity;
      const timeUntilLogout = sessionTimeout - timeSinceActivity;

      // Clear existing timeouts
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

      if (timeUntilWarning > 0) {
        // Schedule warning
        warningTimeoutRef.current = setTimeout(() => {
          setShowWarning(true);
          setCountdown(warningTime / 1000);
          
          // Start countdown
          countdownIntervalRef.current = setInterval(() => {
            setCountdown(prev => {
              if (prev <= 1) {
                clearInterval(countdownIntervalRef.current);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }, timeUntilWarning);

        // Schedule logout
        logoutTimeoutRef.current = setTimeout(() => {
          handleLogout();
        }, timeUntilLogout);
      } else if (timeUntilLogout > 0) {
        // Already in warning period
        setShowWarning(true);
        setCountdown(Math.floor(timeUntilLogout / 1000));
        
        countdownIntervalRef.current = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(countdownIntervalRef.current);
              handleLogout();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        // Session already expired
        handleLogout();
      }
    };

    checkSession();

    return () => {
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current);
      if (logoutTimeoutRef.current) clearTimeout(logoutTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [isAuthenticated, lastActivity, sessionTimeout, warningTime, handleLogout]);

  // Format countdown
  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!showWarning || !isAuthenticated) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div 
        className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${className}`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-timeout-title"
        aria-describedby="session-timeout-description"
      >
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
          {/* Warning Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <svg 
                className="w-8 h-8 text-yellow-600 dark:text-yellow-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <h2 
            id="session-timeout-title"
            className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2"
          >
            Session Expiring Soon
          </h2>

          {/* Description */}
          <p 
            id="session-timeout-description"
            className="text-center text-gray-600 dark:text-gray-200 mb-4"
          >
            {sessionConfig.isPrivilegedRole 
              ? `Your ${sessionConfig.description} will expire due to inactivity for enhanced security.`
              : 'Your session will expire due to inactivity. Would you like to continue?'
            }
          </p>

          {/* Countdown */}
          <div className="text-center mb-6">
            <span className="text-3xl font-mono font-bold text-yellow-600 dark:text-yellow-400">
              {formatCountdown(countdown)}
            </span>
            <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
              Time remaining
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-6">
            <div 
              className="bg-yellow-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(countdown / (warningTime / 1000)) * 100}%` }}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleLogout}
              className="flex-1 py-3 px-4 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Log Out Now
            </button>
            <button
              onClick={handleExtendSession}
              className="flex-1 py-3 px-4 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              autoFocus
            >
              Stay Logged In
            </button>
          </div>

          {/* Keyboard hint */}
          <p className="text-xs text-center text-gray-400 dark:text-gray-400 mt-4">
            Press <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono">Enter</kbd> to stay logged in
          </p>
        </div>
      </div>
    </>
  );
};

export default SessionTimeoutWarning;
