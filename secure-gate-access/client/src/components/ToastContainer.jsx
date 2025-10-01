import React, { useState, useEffect } from 'react';
import Toast from './Toast';
import notificationService from '../services/notificationService';

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Subscribe to notification service
    const unsubscribe = notificationService.subscribe((newToasts) => {
      setToasts(newToasts);
    });

    // Initialize with current toasts
    setToasts(notificationService.getToasts());

    return unsubscribe;
  }, []);

  const handleClose = (toastId) => {
    notificationService.removeToast(toastId);
  };

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
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
