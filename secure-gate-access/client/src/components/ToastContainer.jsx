import React, { useState, useEffect, useRef } from 'react';
import Toast from './Toast';
import notificationService from '../services/notificationService';

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    // Subscribe to notification service
    const unsubscribe = notificationService.subscribe((newToasts) => {
      setToasts(newToasts);
    });

    // Initialize with current toasts
    setToasts(notificationService.getToasts());

    return unsubscribe;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape to close all toasts
      if (e.key === 'Escape') {
        toasts.forEach(toast => {
          notificationService.removeToast(toast.id);
        });
      }
      // Arrow keys to navigate between toasts
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const toastElements = containerRef.current?.querySelectorAll('.toast');
        if (toastElements && toastElements.length > 0) {
          const currentIndex = Array.from(toastElements).indexOf(document.activeElement);
          let nextIndex;
          if (e.key === 'ArrowDown') {
            nextIndex = currentIndex < toastElements.length - 1 ? currentIndex + 1 : 0;
          } else {
            nextIndex = currentIndex > 0 ? currentIndex - 1 : toastElements.length - 1;
          }
          toastElements[nextIndex]?.focus();
        }
      }
      // Home key to go to first toast
      if (e.key === 'Home') {
        e.preventDefault();
        const firstToast = containerRef.current?.querySelector('.toast:first-child');
        if (firstToast) {
          firstToast.focus();
        }
      }
      // End key to go to last toast
      if (e.key === 'End') {
        e.preventDefault();
        const lastToast = containerRef.current?.querySelector('.toast:last-child');
        if (lastToast) {
          lastToast.focus();
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [toasts]);

  const handleClose = (toastId) => {
    notificationService.removeToast(toastId);
  };

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div ref={containerRef} className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onClose={handleClose}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
