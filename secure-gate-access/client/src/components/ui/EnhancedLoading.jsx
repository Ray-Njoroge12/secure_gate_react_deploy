/**
 * Enhanced Loading Component
 * 
 * Comprehensive loading component with:
 * - Contextual loading messages
 * - Progressive loading indicators
 * - Success/error states
 * - Accessibility support
 * - Performance monitoring
 */

import React, { useEffect, useRef, useState } from 'react';
import { useLoadingStates, LOADING_TYPES, LOADING_PRIORITIES } from '../../hooks/useLoadingStates';

// Loading animation variants
const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <svg 
      className={`animate-spin ${sizeClasses[size]} text-brand-500 ${className}`} 
      fill="none" 
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4" 
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
      />
    </svg>
  );
};

const LoadingDots = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
    xl: 'w-5 h-5'
  };

  return (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${sizeClasses[size]} bg-brand-500 rounded-full animate-pulse`}
          style={{
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s'
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
};

const LoadingPulse = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <div className={`${sizeClasses[size]} bg-brand-500 rounded-full animate-pulse ${className}`} aria-hidden="true" />
  );
};

const LoadingProgress = ({ progress = 0, size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
    xl: 'h-4'
  };

  return (
    <div className={`w-full max-w-xs ${className}`}>
      <div className={`bg-slate-700 rounded-full ${sizeClasses[size]}`}>
        <div 
          className="bg-brand-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="text-center text-sm text-slate-400 mt-1">
        {Math.round(progress)}%
      </div>
    </div>
  );
};

const LoadingWave = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-1 h-4',
    md: 'w-1 h-6',
    lg: 'w-1 h-8',
    xl: 'w-1 h-10'
  };

  return (
    <div className={`flex items-end space-x-1 ${className}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`${sizeClasses[size]} bg-brand-500 rounded-full animate-pulse`}
          style={{
            animationDelay: `${i * 0.1}s`,
            animationDuration: '1.2s'
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
};

// Main Enhanced Loading Component
const EnhancedLoading = ({
  // Loading state props
  type = LOADING_TYPES.INITIAL,
  priority = LOADING_PRIORITIES.NORMAL,
  message = null,
  progress = null,
  showProgress = false,
  
  // Visual props
  variant = 'spinner',
  size = 'md',
  overlay = false,
  fullscreen = false,
  
  // Interaction props
  allowCancel = false,
  onCancel = null,
  
  // State props
  isActive = false,
  success = false,
  error = null,
  cancelled = false,
  
  // Styling props
  className = '',
  messageClassName = '',
  progressClassName = '',
  
  // Accessibility props
  ariaLabel = null,
  ariaLive = 'polite',
  
  // Other props
  ...props
}) => {
  const loadingRef = useRef(null);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [displayMessage, setDisplayMessage] = useState(message);

  // Update display progress with smooth animation
  useEffect(() => {
    if (progress !== null) {
      const timer = setTimeout(() => {
        setDisplayProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [progress]);

  // Update display message
  useEffect(() => {
    setDisplayMessage(message);
  }, [message]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && allowCancel && onCancel) {
        onCancel();
      }
    };

    const loading = loadingRef.current;
    if (loading && isActive) {
      loading.addEventListener('keydown', handleKeyDown);
      return () => loading.removeEventListener('keydown', handleKeyDown);
    }
  }, [allowCancel, onCancel, isActive]);

  // Render loading animation based on variant
  const renderAnimation = () => {
    const animationProps = { size, className: 'flex-shrink-0' };
    
    switch (variant) {
      case 'dots':
        return <LoadingDots {...animationProps} />;
      case 'pulse':
        return <LoadingPulse {...animationProps} />;
      case 'progress':
        return <LoadingProgress progress={displayProgress} size={size} className={progressClassName} />;
      case 'wave':
        return <LoadingWave {...animationProps} />;
      default:
        return <LoadingSpinner {...animationProps} />;
    }
  };

  // Render success state
  const renderSuccess = () => (
    <div className="flex items-center gap-3 text-success-500">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-sm font-medium">Success!</span>
    </div>
  );

  // Render error state
  const renderError = () => (
    <div className="flex items-center gap-3 text-error-500">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
      <span className="text-sm font-medium">Error occurred</span>
    </div>
  );

  // Render cancelled state
  const renderCancelled = () => (
    <div className="flex items-center gap-3 text-slate-400">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
      </svg>
      <span className="text-sm font-medium">Cancelled</span>
    </div>
  );

  // Render main content
  const renderContent = () => {
    if (success) return renderSuccess();
    if (error) return renderError();
    if (cancelled) return renderCancelled();
    
    return (
      <div className="flex items-center gap-3">
        {renderAnimation()}
        {displayMessage && (
          <span className={`text-slate-300 ${messageClassName}`}>
            {displayMessage}
          </span>
        )}
      </div>
    );
  };

  // Render cancel button
  const renderCancelButton = () => {
    if (!allowCancel || !onCancel || !isActive) return null;
    
    return (
      <button
        onClick={onCancel}
        className="ml-4 p-1 text-slate-400 hover:text-slate-200 transition-colors"
        aria-label="Cancel loading"
        title="Cancel (Esc)"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    );
  };

  // Main content
  const content = (
    <div 
      ref={loadingRef}
      className={`inline-flex items-center ${className}`}
      role="status"
      aria-label={ariaLabel || `Loading: ${displayMessage || type}`}
      aria-live={ariaLive}
      tabIndex={allowCancel ? 0 : -1}
      {...props}
    >
      {renderContent()}
      {renderCancelButton()}
    </div>
  );

  // Overlay variant
  if (overlay || fullscreen) {
    const overlayClasses = fullscreen 
      ? 'fixed inset-0 bg-slate-900 bg-opacity-90 flex items-center justify-center z-50'
      : 'absolute inset-0 bg-slate-900 bg-opacity-75 flex items-center justify-center z-50';
    
    return (
      <div className={overlayClasses}>
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 text-center max-w-sm mx-4">
          {content}
          {showProgress && progress !== null && (
            <div className="mt-4">
              <LoadingProgress progress={displayProgress} size="md" />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Inline variant
  return content;
};

// Loading Button Component
const LoadingButton = ({
  loading = false,
  loadingText = 'Loading...',
  loadingType = LOADING_TYPES.SUBMIT,
  children,
  disabled = false,
  onCancel = null,
  className = '',
  ...props
}) => {
  const [isLoading, setIsLoading] = useState(loading);
  const [currentLoadingText, setCurrentLoadingText] = useState(loadingText);

  useEffect(() => {
    setIsLoading(loading);
    setCurrentLoadingText(loadingText);
  }, [loading, loadingText]);

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
      setIsLoading(false);
    }
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-colors
        ${disabled || isLoading 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2'
        }
        ${className}
      `}
      {...props}
    >
      {isLoading && (
        <EnhancedLoading
          type={loadingType}
          variant="spinner"
          size="sm"
          message={currentLoadingText}
          allowCancel={!!onCancel}
          onCancel={handleCancel}
        />
      )}
      {isLoading ? currentLoadingText : children}
    </button>
  );
};

// Loading Card Component
const LoadingCard = ({
  loading = false,
  loadingType = LOADING_TYPES.INITIAL,
  loadingMessage = 'Loading...',
  children,
  className = '',
  showSkeleton = true,
  ...props
}) => {
  if (loading && showSkeleton) {
    return (
      <div className={`bg-slate-800 rounded-lg border border-slate-700 p-6 ${className}`} {...props}>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-700 rounded"></div>
            <div className="h-4 bg-slate-700 rounded w-5/6"></div>
          </div>
          <div className="h-4 bg-slate-700 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-slate-800 rounded-lg border border-slate-700 p-6 ${className}`} {...props}>
        <div className="flex items-center justify-center py-8">
          <EnhancedLoading
            type={loadingType}
            message={loadingMessage}
            size="lg"
          />
        </div>
      </div>
    );
  }

  return <div className={className} {...props}>{children}</div>;
};

// Loading Table Component
const LoadingTable = ({
  loading = false,
  loadingType = LOADING_TYPES.INITIAL,
  loadingMessage = 'Loading data...',
  children,
  className = '',
  rows = 5,
  columns = 4,
  showSkeleton = true,
  ...props
}) => {
  if (loading && showSkeleton) {
    return (
      <div className={`bg-slate-800 rounded-lg border border-slate-700 overflow-hidden ${className}`} {...props}>
        <div className="animate-pulse">
          {/* Header */}
          <div className="bg-slate-700 px-6 py-3 border-b border-slate-600">
            <div className="flex space-x-4">
              {Array.from({ length: columns }, (_, index) => (
                <div key={index} className="h-4 bg-slate-600 rounded w-24"></div>
              ))}
            </div>
          </div>
          {/* Rows */}
          <div className="divide-y divide-slate-700">
            {Array.from({ length: rows }, (_, rowIndex) => (
              <div key={rowIndex} className="px-6 py-4">
                <div className="flex space-x-4">
                  {Array.from({ length: columns }, (_, colIndex) => (
                    <div key={colIndex} className="h-4 bg-slate-600 rounded w-20"></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-slate-800 rounded-lg border border-slate-700 ${className}`} {...props}>
        <div className="flex items-center justify-center py-8">
          <EnhancedLoading
            type={loadingType}
            message={loadingMessage}
            size="lg"
          />
        </div>
      </div>
    );
  }

  return <div className={className} {...props}>{children}</div>;
};

// Export components
EnhancedLoading.Button = LoadingButton;
EnhancedLoading.Card = LoadingCard;
EnhancedLoading.Table = LoadingTable;

export default EnhancedLoading;
