/**
 * @file useOnlineStatus.js
 * @description Hook for tracking online/offline status
 * Phase 1: Offline support for guard pages
 */

import { useState, useEffect, useCallback } from 'react';

export default function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Track that we were offline and came back
      setWasOffline(true);
      // Clear the "was offline" flag after 5 seconds
      setTimeout(() => setWasOffline(false), 5000);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-store',
      });
      const online = response.ok;
      setIsOnline(online);
      return online;
    } catch {
      setIsOnline(false);
      return false;
    }
  }, []);

  return { isOnline, wasOffline, checkConnection };
}
