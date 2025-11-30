/**
 * @file ToastContext.jsx
 * @description Global toast notification context with actions and undo support
 * Phase 4: UI/UX Improvement - Priority 1.2
 * 
 * Usage:
 * const { toast } = useToast();
 * 
 * toast.success({
 *   title: 'Visitor Invited',
 *   message: 'John Doe has been sent an invite',
 *   action: { label: 'View', onClick: () => navigate('/visitor/123') },
 *   undo: { label: 'Undo', onClick: () => revokeInvite(123) }
 * });
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { ToastContainer } from '../components/ui/EnhancedToast';

// Generate unique IDs
let toastId = 0;
const generateId = () => `toast-${++toastId}-${Date.now()}`;

// Create context
const ToastContext = createContext(null);

/**
 * Toast Provider Component
 */
export const ToastProvider = ({ children, position = 'top-right', maxVisible = 4 }) => {
  const [toasts, setToasts] = useState([]);
  const toastTimeoutsRef = useRef({});

  // Add a new toast
  const addToast = useCallback((options) => {
    const id = generateId();
    const toast = {
      id,
      type: 'info',
      duration: 5000,
      progress: true,
      pauseOnHover: true,
      ...options,
    };

    setToasts((prev) => [toast, ...prev]);

    // Auto-dismiss after duration (unless paused)
    if (toast.duration !== Infinity) {
      toastTimeoutsRef.current[id] = setTimeout(() => {
        dismissToast(id);
      }, toast.duration + 300); // Extra time for exit animation
    }

    return id;
  }, []);

  // Dismiss a toast
  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    
    // Clear timeout if exists
    if (toastTimeoutsRef.current[id]) {
      clearTimeout(toastTimeoutsRef.current[id]);
      delete toastTimeoutsRef.current[id];
    }
  }, []);

  // Dismiss all toasts
  const dismissAll = useCallback(() => {
    // Clear all timeouts
    Object.values(toastTimeoutsRef.current).forEach(clearTimeout);
    toastTimeoutsRef.current = {};
    
    setToasts([]);
  }, []);

  // Convenience methods for different toast types
  const toast = {
    // Success toast
    success: (options) => {
      const opts = typeof options === 'string' ? { title: options } : options;
      return addToast({ type: 'success', ...opts });
    },

    // Error toast
    error: (options) => {
      const opts = typeof options === 'string' ? { title: options } : options;
      return addToast({ type: 'error', duration: 8000, ...opts }); // Errors last longer
    },

    // Warning toast
    warning: (options) => {
      const opts = typeof options === 'string' ? { title: options } : options;
      return addToast({ type: 'warning', duration: 6000, ...opts });
    },

    // Info toast
    info: (options) => {
      const opts = typeof options === 'string' ? { title: options } : options;
      return addToast({ type: 'info', ...opts });
    },

    // Promise toast (shows loading, then success or error)
    promise: async (promise, { loading, success, error }) => {
      const id = addToast({
        type: 'info',
        title: loading?.title || 'Loading...',
        message: loading?.message,
        duration: Infinity,
        progress: false,
      });

      try {
        const result = await promise;
        
        // Remove loading toast
        dismissToast(id);
        
        // Show success toast
        const successOpts = typeof success === 'function' ? success(result) : success;
        addToast({
          type: 'success',
          ...successOpts,
        });
        
        return result;
      } catch (err) {
        // Remove loading toast
        dismissToast(id);
        
        // Show error toast
        const errorOpts = typeof error === 'function' ? error(err) : error;
        addToast({
          type: 'error',
          ...errorOpts,
        });
        
        throw err;
      }
    },

    // Custom toast
    custom: (options) => addToast(options),

    // Dismiss methods
    dismiss: dismissToast,
    dismissAll,
  };

  const value = {
    toasts,
    toast,
    addToast,
    dismissToast,
    dismissAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismissToast}
        position={position}
        maxVisible={maxVisible}
      />
    </ToastContext.Provider>
  );
};

/**
 * Hook to use toast notifications
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
};

export default ToastContext;
