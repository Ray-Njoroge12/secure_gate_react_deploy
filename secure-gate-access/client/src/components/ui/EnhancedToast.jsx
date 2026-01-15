/**
 * @file EnhancedToast.jsx
 * @description Enhanced toast notification system with actions, undo, and rich content
 * Phase 4: UI/UX Improvement - Priority 1.2
 * 
 * Features:
 * - Stacked toast display (max 4 visible)
 * - Action buttons with callbacks
 * - Undo functionality with countdown
 * - Progress bar for duration
 * - Swipe to dismiss on mobile
 * - Pause on hover
 * - Screen reader announcements
 * - Custom icons per toast type
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

// Icons for different toast types
const ToastIcons = {
  success: (
    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// Toast type styles
const toastStyles = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    title: 'text-green-800 dark:text-green-200',
    message: 'text-green-700 dark:text-green-300',
    progress: 'bg-green-500',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    title: 'text-red-800 dark:text-red-200',
    message: 'text-red-700 dark:text-red-300',
    progress: 'bg-red-500',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    title: 'text-amber-800 dark:text-amber-200',
    message: 'text-amber-700 dark:text-amber-300',
    progress: 'bg-amber-500',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    title: 'text-blue-800 dark:text-blue-200',
    message: 'text-blue-700 dark:text-blue-300',
    progress: 'bg-blue-500',
  },
};

/**
 * Individual Toast Component
 */
const Toast = ({
  id,
  type = 'info',
  title,
  message,
  duration = 5000,
  action,
  undo,
  icon,
  progress = true,
  pauseOnHover = true,
  onDismiss,
}) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [remaining, setRemaining] = useState(duration);
  const [undoCountdown, setUndoCountdown] = useState(undo ? 5 : null);
  const startTimeRef = useRef(Date.now());
  const touchStartRef = useRef(null);
  const translateXRef = useRef(0);
  const toastRef = useRef(null);

  const styles = toastStyles[type] || toastStyles.info;
  const toastIcon = icon || ToastIcons[type];

  // Handle timer
  useEffect(() => {
    if (isPaused || duration === Infinity) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const newRemaining = Math.max(0, duration - elapsed);
      setRemaining(newRemaining);

      if (newRemaining === 0) {
        handleDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [isPaused, duration]);

  // Handle undo countdown
  useEffect(() => {
    if (!undo || undoCountdown === null || undoCountdown <= 0) return;

    const timer = setInterval(() => {
      setUndoCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [undo]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(id), 300);
  }, [id, onDismiss]);

  const handlePause = () => {
    if (pauseOnHover) {
      setIsPaused(true);
    }
  };

  const handleResume = () => {
    if (pauseOnHover) {
      startTimeRef.current = Date.now() - (duration - remaining);
      setIsPaused(false);
    }
  };

  // Swipe to dismiss (mobile)
  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    if (!touchStartRef.current) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartRef.current;
    translateXRef.current = diff;
    if (toastRef.current) {
      toastRef.current.style.transform = `translateX(${diff}px)`;
      toastRef.current.style.opacity = Math.max(0, 1 - Math.abs(diff) / 200);
    }
  };

  const handleTouchEnd = () => {
    if (Math.abs(translateXRef.current) > 100) {
      handleDismiss();
    } else {
      if (toastRef.current) {
        toastRef.current.style.transform = 'translateX(0)';
        toastRef.current.style.opacity = '1';
      }
    }
    touchStartRef.current = null;
    translateXRef.current = 0;
  };

  const handleUndo = async () => {
    if (undo?.onClick) {
      try {
        await undo.onClick();
        handleDismiss();
      } catch (error) {
        console.error('Undo failed:', error);
      }
    }
  };

  const handleAction = () => {
    if (action?.onClick) {
      action.onClick();
      if (action.dismissOnClick !== false) {
        handleDismiss();
      }
    }
  };

  return (
    <div
      ref={toastRef}
      role="alert"
      aria-live="polite"
      className={`
        relative w-full max-w-sm overflow-hidden rounded-lg border shadow-lg
        transition-all duration-300 ease-out
        ${styles.bg} ${styles.border}
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        touch-pan-y
      `}
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Progress bar */}
      {progress && duration !== Infinity && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200/50 dark:bg-gray-700/50">
          <div
            className={`h-full ${styles.progress} transition-all duration-100`}
            style={{ width: `${(remaining / duration) * 100}%` }}
          />
        </div>
      )}

      <div className="p-4 pt-5">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">{toastIcon}</div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {title && (
              <p className={`text-sm font-semibold ${styles.title}`}>{title}</p>
            )}
            {message && (
              <p className={`mt-1 text-sm ${styles.message}`}>{message}</p>
            )}

            {/* Actions */}
            {(action || undo) && (
              <div className="mt-3 flex items-center gap-2">
                {action && (
                  <button
                    onClick={handleAction}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-2 py-1"
                  >
                    {action.label}
                  </button>
                )}
                {undo && undoCountdown > 0 && (
                  <button
                    onClick={handleUndo}
                    className="text-sm font-medium text-gray-600 dark:text-gray-200 hover:text-gray-500 dark:text-gray-300 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 rounded px-2 py-1"
                  >
                    {undo.label || 'Undo'} ({undoCountdown}s)
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-gray-600 dark:text-gray-200 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label="Dismiss notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Toast Container Component
 * Renders all toasts in a portal at the top-right of the screen
 */
const ToastContainer = ({ toasts, onDismiss, position = 'top-right', maxVisible = 4 }) => {
  const positions = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  };

  const visibleToasts = toasts.slice(0, maxVisible);
  const hiddenCount = Math.max(0, toasts.length - maxVisible);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed z-[9999] flex flex-col gap-3 pointer-events-none ${positions[position]}`}
      style={{ maxWidth: '400px' }}
    >
      {/* Hidden toast count indicator */}
      {hiddenCount > 0 && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-full px-3 py-1 shadow-sm self-center pointer-events-auto">
          +{hiddenCount} more notification{hiddenCount > 1 ? 's' : ''}
        </div>
      )}

      {/* Visible toasts */}
      {visibleToasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast {...toast} onDismiss={onDismiss} />
        </div>
      ))}

      {/* Screen reader announcement region */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {visibleToasts.length > 0 && (
          <span>
            {visibleToasts[0].title}: {visibleToasts[0].message}
          </span>
        )}
      </div>
    </div>,
    document.body
  );
};

export { Toast, ToastContainer };
export default Toast;
