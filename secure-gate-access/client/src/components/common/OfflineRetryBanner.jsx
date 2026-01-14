/**
 * @file OfflineRetryBanner.jsx
 * @description Banner that informs users about offline status and retries auth refresh when online.
 */

import React, { useEffect, useState } from 'react';
import { refreshAccessTokenWithRetry } from '../../utils/apiClient';

const OfflineRetryBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      await refreshAccessTokenWithRetry();
    } catch (error) {
      // Ignore errors here; banner remains visible until connectivity returns.
    } finally {
      setIsRetrying(false);
    }
  };

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-50 border-b border-yellow-200 text-yellow-900 text-sm px-4 py-2 flex items-center justify-between">
      <span>
        You&apos;re offline. We&apos;ll retry session refresh when you reconnect.
      </span>
      <button
        type="button"
        onClick={handleRetry}
        disabled={isRetrying}
        className="ml-4 text-sm font-medium text-yellow-900 underline disabled:opacity-50"
      >
        {isRetrying ? 'Retrying...' : 'Retry now'}
      </button>
    </div>
  );
};

export default OfflineRetryBanner;
