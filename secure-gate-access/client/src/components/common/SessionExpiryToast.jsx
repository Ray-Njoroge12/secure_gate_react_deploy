import { useEffect } from 'react';

import { useToast } from '../../contexts/ToastContext';

/**
 * Listens for 'session-expired' CustomEvent (dispatched by apiClient.js
 * when token refresh fails) and shows a toast notification.
 * Must be rendered inside ToastProvider.
 */
export default function SessionExpiryToast() {
  const { toast } = useToast();

  useEffect(() => {
    const handleSessionExpired = (e) => {
      toast.error({
        title: 'Session Expired',
        message: e.detail?.message || 'Your session has expired. Please log in again.'
      });
    };
    window.addEventListener('session-expired', handleSessionExpired);
    return () => window.removeEventListener('session-expired', handleSessionExpired);
  }, [toast]);

  return null;
}
