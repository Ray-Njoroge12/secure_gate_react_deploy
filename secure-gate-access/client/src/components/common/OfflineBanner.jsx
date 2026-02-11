/**
 * @file OfflineBanner.jsx
 * @description Inline offline banner for guard pages
 * Phase 1: Shows when user is offline with auto-retry hint
 */

import React from 'react';
import Button from '../ui/Button';

const OfflineBanner = ({ 
  isOnline, 
  wasOffline, 
  onRetry, 
  className = '',
  message = 'You are currently offline. Some features may be unavailable.'
}) => {
  if (isOnline && wasOffline) {
    return (
      <div className={`bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center justify-between gap-3 ${className}`} role="status">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm text-green-700 dark:text-green-300">Back online! Your data will refresh automatically.</span>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="flex-shrink-0">
            Refresh
          </Button>
        )}
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className={`bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center justify-between gap-3 ${className}`} role="alert">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m-2.829-2.829a5 5 0 000-7.07m-4.243 9.9a9 9 0 01-4.95-4.95M3 3l18 18" />
          </svg>
          <span className="text-sm text-amber-700 dark:text-amber-300">{message}</span>
        </div>
      </div>
    );
  }

  return null;
};

export default OfflineBanner;
