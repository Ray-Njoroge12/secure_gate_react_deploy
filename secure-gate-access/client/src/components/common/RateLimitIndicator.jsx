/**
 * @file RateLimitIndicator.jsx
 * @description Visual feedback component for API rate limiting
 * Shows remaining API calls and warns users when approaching limits
 */

import React, { useState, useEffect, useCallback } from 'react';
import Icon from '../ui/Icon';
import Button from '../ui/Button';

const RateLimitIndicator = ({ 
  threshold = 10, // Warn when this many requests remain
  showAlways = false, // Always show or only when approaching limit
  position = 'bottom-right', // Position on screen
  className = ''
}) => {
  const [rateLimitInfo, setRateLimitInfo] = useState({
    remaining: null,
    limit: null,
    resetTime: null,
    isLimited: false
  });
  const [isVisible, setIsVisible] = useState(showAlways);

  // Extract rate limit info from response headers
  const extractRateLimitHeaders = useCallback((headers) => {
    const remaining = headers.get('X-RateLimit-Remaining');
    const limit = headers.get('X-RateLimit-Limit');
    const reset = headers.get('X-RateLimit-Reset');
    const retryAfter = headers.get('Retry-After');

    if (remaining !== null || retryAfter !== null) {
      setRateLimitInfo({
        remaining: remaining ? parseInt(remaining, 10) : 0,
        limit: limit ? parseInt(limit, 10) : 100,
        resetTime: reset ? new Date(parseInt(reset, 10) * 1000) : null,
        isLimited: retryAfter !== null
      });

      // Show indicator if approaching limit
      if (remaining && parseInt(remaining, 10) <= threshold) {
        setIsVisible(true);
      } else if (!showAlways) {
        setIsVisible(false);
      }
    }
  }, [threshold, showAlways]);

  // Intercept fetch to monitor rate limits
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        // Extract rate limit headers if present
        extractRateLimitHeaders(response.headers);
        
        // Check if rate limited
        if (response.status === 429) {
          setRateLimitInfo(prev => ({
            ...prev,
            isLimited: true,
            remaining: 0
          }));
          setIsVisible(true);
        }
        
        return response;
      } catch (error) {
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [extractRateLimitHeaders]);

  // Auto-hide after reset time
  useEffect(() => {
    if (rateLimitInfo.resetTime && rateLimitInfo.isLimited) {
      const now = Date.now();
      const resetMs = rateLimitInfo.resetTime.getTime() - now;
      
      if (resetMs > 0) {
        const timer = setTimeout(() => {
          setRateLimitInfo(prev => ({
            ...prev,
            isLimited: false
          }));
          if (!showAlways) {
            setIsVisible(false);
          }
        }, resetMs);
        
        return () => clearTimeout(timer);
      }
    }
  }, [rateLimitInfo.resetTime, rateLimitInfo.isLimited, showAlways]);

  // Calculate time until reset
  const getResetTimeDisplay = () => {
    if (!rateLimitInfo.resetTime) return '';
    
    const now = Date.now();
    const diff = rateLimitInfo.resetTime.getTime() - now;
    
    if (diff <= 0) return 'Resetting...';
    
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s`;
    
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (!rateLimitInfo.limit || rateLimitInfo.remaining === null) return 100;
    return (rateLimitInfo.remaining / rateLimitInfo.limit) * 100;
  };

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4'
  };

  if (!isVisible) return null;

  const progress = getProgressPercentage();
  const isWarning = progress <= 20;
  const isCritical = rateLimitInfo.isLimited || progress <= 5;

  return (
    <div 
      className={`
        fixed ${positionClasses[position] || positionClasses['bottom-right']}
        z-50 ${className}
      `}
      role="status"
      aria-live="polite"
    >
      <div className={`
        flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
        ${isCritical 
          ? 'bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800' 
          : isWarning 
            ? 'bg-amber-50 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-800'
            : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700'
        }
      `}>
        {/* Icon */}
        <div className={`
          flex-shrink-0 
          ${isCritical ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-gray-500 dark:text-gray-300'}
        `}>
          {rateLimitInfo.isLimited ? (
            <Icon name="refresh-cw" className="w-5 h-5 animate-spin" aria-hidden="true" />
          ) : (
            <Icon name="alert-triangle" className="w-5 h-5" aria-hidden="true" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {rateLimitInfo.isLimited ? (
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Rate limited
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <Icon name="clock" className="w-3 h-3" aria-hidden="true" />
                Retry in {getResetTimeDisplay()}
              </p>
            </div>
          ) : (
            <div>
              <p className={`text-sm font-medium ${
                isCritical ? 'text-red-700 dark:text-red-300' : 
                isWarning ? 'text-amber-700 dark:text-amber-300' : 
                'text-gray-700 dark:text-gray-300'
              }`}>
                {rateLimitInfo.remaining} requests remaining
              </p>
              {rateLimitInfo.resetTime && (
                <p className="text-xs text-gray-500 dark:text-gray-300 flex items-center gap-1">
                  <Icon name="clock" className="w-3 h-3" aria-hidden="true" />
                  Resets in {getResetTimeDisplay()}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-16 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${
              isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-green-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Close button */}
        {!showAlways && (
          <Button
            onClick={() => setIsVisible(false)}
            className="flex-shrink-0 text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-300"
            aria-label="Dismiss rate limit indicator"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        )}
      </div>
    </div>
  );
};

export default RateLimitIndicator;
