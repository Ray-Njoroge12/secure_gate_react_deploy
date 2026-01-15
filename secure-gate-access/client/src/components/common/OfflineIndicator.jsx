/**
 * @file OfflineIndicator.jsx
 * @description Offline status indicator component
 * Phase 3.1: Offline Mode & Sync
 * 
 * Features:
 * - Shows current online/offline status
 * - Displays pending changes count
 * - Manual sync trigger
 * - Last sync time display
 */

import React, { useState, useEffect, useCallback } from 'react';
import syncService from '../../services/syncService';

const OfflineIndicator = ({ 
  showDetails = false, 
  position = 'bottom-right',
  className = '' 
}) => {
  const [status, setStatus] = useState({
    isOnline: navigator.onLine,
    hasPendingChanges: false,
    pendingChangesCount: 0,
    lastDownload: null,
    hasOfflineData: false
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch status on mount and subscribe to changes
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const currentStatus = await syncService.getStatus();
        setStatus(currentStatus);
      } catch (error) {
        console.error('Error fetching sync status:', error);
      }
    };

    fetchStatus();

    // Subscribe to sync events
    const unsubscribe = syncService.subscribe((event) => {
      fetchStatus();
      
      if (event.type === 'syncComplete') {
        setIsSyncing(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Manual sync handler
  const handleSync = useCallback(async () => {
    if (!status.isOnline || isSyncing) return;
    
    setIsSyncing(true);
    try {
      await syncService.syncPendingChanges();
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [status.isOnline, isSyncing]);

  // Download offline package handler
  const handleDownloadOffline = useCallback(async () => {
    if (!status.isOnline || isDownloading) return;
    
    setIsDownloading(true);
    try {
      await syncService.downloadOfflinePackage();
    } catch (error) {
      console.error('Error downloading offline package:', error);
    } finally {
      setIsDownloading(false);
    }
  }, [status.isOnline, isDownloading]);

  // Format last sync time
  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return date.toLocaleDateString();
  };

  // Position classes
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4'
  };

  return (
    <div 
      className={`fixed ${positionClasses[position]} z-50 ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Status Badge */}
      <div 
        className={`flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg cursor-pointer transition-all ${
          status.isOnline 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-yellow-50 border border-yellow-300'
        }`}
      >
        {/* Status Icon */}
        <div className={`w-3 h-3 rounded-full ${
          status.isOnline 
            ? 'bg-green-500' 
            : 'bg-yellow-500 animate-pulse'
        }`} />
        
        {/* Status Text */}
        <span className={`text-sm font-medium ${
          status.isOnline ? 'text-green-700' : 'text-yellow-700'
        }`}>
          {status.isOnline ? 'Online' : 'Offline'}
        </span>
        
        {/* Pending Changes Badge */}
        {status.hasPendingChanges && (
          <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-orange-500 rounded-full">
            {status.pendingChangesCount}
          </span>
        )}
        
        {/* Syncing Indicator */}
        {isSyncing && (
          <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>

      {/* Tooltip / Details Panel */}
      {showTooltip && showDetails && (
        <div className="absolute bottom-full right-0 mb-2 w-64 p-4 bg-white rounded-lg shadow-xl border border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Sync Status
          </h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-300">Connection:</span>
              <span className={status.isOnline ? 'text-green-600' : 'text-yellow-600'}>
                {status.isOnline ? 'Connected' : 'Offline'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-300">Last Sync:</span>
              <span className="text-gray-700">
                {formatLastSync(status.lastDownload)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-300">Pending:</span>
              <span className="text-gray-700">
                {status.pendingChangesCount} changes
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-300">Offline Data:</span>
              <span className={status.hasOfflineData ? 'text-green-600' : 'text-gray-400'}>
                {status.hasOfflineData ? 'Available' : 'Not cached'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-4 space-y-2">
            {status.isOnline && status.hasPendingChanges && (
              <button
                onClick={handleSync}
                disabled={isSyncing}
                className="w-full px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </button>
            )}
            
            {status.isOnline && !status.hasOfflineData && (
              <button
                onClick={handleDownloadOffline}
                disabled={isDownloading}
                className="w-full px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
              >
                {isDownloading ? 'Downloading...' : 'Enable Offline Mode'}
              </button>
            )}
          </div>

          {/* Privacy Notice */}
          <p className="mt-3 text-xs text-gray-400">
            Offline data is encrypted and auto-purges after 8 hours or on logout.
          </p>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;
