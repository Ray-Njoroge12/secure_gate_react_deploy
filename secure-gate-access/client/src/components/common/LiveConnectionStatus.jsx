/**
 * @fileoverview Live Connection Status Indicator
 * @description Shows real-time connection status with visual feedback
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

/**
 * LiveConnectionStatus - Displays connection status with icon and text
 * @param {Object} props
 * @param {boolean} props.isConnected - Whether the connection is active
 * @param {string} props.lastUpdate - Timestamp of last update
 * @param {Function} props.onReconnect - Callback to attempt reconnection
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.showLabel - Whether to show text label
 * @param {boolean} props.compact - Use compact mode
 */
export default function LiveConnectionStatus({
  isConnected = true,
  lastUpdate,
  onReconnect,
  className = '',
  showLabel = true,
  compact = false
}) {
  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        {isConnected ? (
          <>
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            {showLabel && <span className="text-xs text-green-600 font-medium">Live</span>}
          </>
        ) : (
          <>
            <span className="w-2 h-2 bg-red-500 rounded-full" />
            {showLabel && <span className="text-xs text-red-600 font-medium">Offline</span>}
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {isConnected ? (
        <>
          <Wifi className="w-4 h-4 text-green-500" />
          {showLabel && (
            <span className="text-sm text-green-600 font-medium">Live</span>
          )}
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-red-500" />
          {showLabel && (
            <span className="text-sm text-red-600 font-medium">Offline</span>
          )}
          {onReconnect && (
            <button
              onClick={onReconnect}
              className="p-1 text-red-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              aria-label="Reconnect"
              title="Click to reconnect"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </>
      )}
      
      {lastUpdate && isConnected && (
        <span className="text-xs text-gray-500 dark:text-gray-300 ml-2">
          Updated {lastUpdate}
        </span>
      )}
    </div>
  );
}

/**
 * ConnectionStatusBadge - Compact badge version for headers
 */
export function ConnectionStatusBadge({ isConnected, className = '' }) {
  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
        isConnected 
          ? 'bg-green-100 text-green-700' 
          : 'bg-red-100 text-red-700'
      } ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
      {isConnected ? 'Live' : 'Offline'}
    </div>
  );
}
