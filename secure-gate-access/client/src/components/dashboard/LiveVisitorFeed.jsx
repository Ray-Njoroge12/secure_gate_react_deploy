/**
 * @fileoverview Live Visitor Feed Component
 * @description Displays real-time visitor activity feed
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  UserCheck, 
  UserX, 
  LogIn, 
  LogOut, 
  Clock, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Wifi,
  WifiOff,
  Volume2,
  VolumeX
} from 'lucide-react';

/**
 * Get icon for event type
 */
const getEventIcon = (type) => {
  switch (type) {
    case 'visitor.check_in':
    case 'visitor.self_check_in':
      return <LogIn className="w-4 h-4 text-green-500" />;
    case 'visitor.check_out':
      return <LogOut className="w-4 h-4 text-blue-500" />;
    case 'visitor.approved':
      return <UserCheck className="w-4 h-4 text-green-500" />;
    case 'visitor.denied':
      return <UserX className="w-4 h-4 text-red-500" />;
    case 'visitor.arrival':
      return <Clock className="w-4 h-4 text-amber-500" />;
    case 'security.alert':
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    default:
      return <Clock className="w-4 h-4 text-gray-500 dark:text-gray-300" />;
  }
};

/**
 * Get event color class
 */
const getEventColorClass = (type) => {
  switch (type) {
    case 'visitor.check_in':
    case 'visitor.self_check_in':
    case 'visitor.approved':
      return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800';
    case 'visitor.check_out':
      return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800';
    case 'visitor.denied':
    case 'security.alert':
      return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800';
    case 'visitor.arrival':
      return 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800';
    default:
      return 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 dark:bg-slate-800 dark:border-slate-700';
  }
};

/**
 * Get human-readable event description
 */
const getEventDescription = (event) => {
  const name = event.visitorName || event.name || 'Visitor';
  const host = event.hostName || event.host || '';
  
  switch (event.type) {
    case 'visitor.check_in':
      return `${name} checked in${host ? ` to visit ${host}` : ''}`;
    case 'visitor.self_check_in':
      return `${name} self-checked in${host ? ` to visit ${host}` : ''}`;
    case 'visitor.check_out':
      return `${name} checked out`;
    case 'visitor.approved':
      return `${name} was approved for entry${host ? ` by ${host}` : ''}`;
    case 'visitor.denied':
      return `${name} was denied entry`;
    case 'visitor.arrival':
      return `${name} arrived at gate`;
    case 'visitor.invited':
      return `${name} was invited${host ? ` by ${host}` : ''}`;
    case 'visitor.cancelled':
      return `Invitation for ${name} was cancelled`;
    case 'security.alert':
      return event.message || 'Security alert triggered';
    default:
      return event.message || 'Visitor event';
  }
};

/**
 * Format relative time
 */
const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const eventTime = new Date(timestamp);
  const diffMs = now - eventTime;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  
  if (diffSeconds < 10) return 'Just now';
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  
  return eventTime.toLocaleDateString();
};

/**
 * Live Visitor Feed Component
 */
export function LiveVisitorFeed({
  events = [],
  maxVisible = 5,
  showControls = true,
  connectionStatus = 'connected',
  onRefresh,
  onClear,
  className = ''
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const feedRef = useRef(null);
  
  const visibleEvents = isExpanded ? events : events.slice(0, maxVisible);
  const hasMore = events.length > maxVisible;

  // Auto-scroll to top on new events
  useEffect(() => {
    if (autoScroll && feedRef.current && events.length > 0) {
      feedRef.current.scrollTop = 0;
    }
  }, [events, autoScroll]);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500 animate-pulse' :
            connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
            'bg-red-500'
          }`} />
          <h3 className="font-semibold text-gray-900 dark:text-white">Live Activity</h3>
          <span className="text-xs text-gray-500 dark:text-gray-300">
            {events.length} events
          </span>
        </div>
        
        {showControls && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
              title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
            >
              {soundEnabled ? (
                <Volume2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              ) : (
                <VolumeX className="w-4 h-4 text-gray-400 dark:text-gray-300" />
              )}
            </button>
            {onRefresh && (
              <button
                onClick={onRefresh}
                className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            )}
            {connectionStatus === 'connected' ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
          </div>
        )}
      </div>

      {/* Feed */}
      <div 
        ref={feedRef}
        className={`overflow-y-auto transition-all duration-300 ${
          isExpanded ? 'max-h-96' : 'max-h-80'
        }`}
      >
        {visibleEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-300">
            <Clock className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No recent activity</p>
            <p className="text-xs opacity-75">Events will appear here in real-time</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {visibleEvents.map((event, index) => (
              <div
                key={event.id || index}
                className={`px-4 py-3 transition-all duration-300 ${
                  event.isNew ? 'animate-pulse bg-green-50 dark:bg-green-900/10' : ''
                } hover:bg-gray-50 dark:hover:bg-slate-700/50`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 p-2 rounded-lg ${getEventColorClass(event.type)}`}>
                    {getEventIcon(event.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {getEventDescription(event)}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500 dark:text-gray-300">
                        {formatRelativeTime(event.timestamp)}
                      </span>
                      {event.location && (
                        <span className="text-xs text-gray-500 dark:text-gray-300">
                          • {event.location}
                        </span>
                      )}
                    </div>
                  </div>
                  {event.isNew && (
                    <span className="flex-shrink-0 px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30 rounded-full">
                      New
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - Show more/less */}
      {hasMore && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2 flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 border-t border-gray-200 dark:border-slate-700 transition-colors"
        >
          {isExpanded ? (
            <>
              Show less <ChevronUp className="w-4 h-4" />
            </>
          ) : (
            <>
              Show {events.length - maxVisible} more <ChevronDown className="w-4 h-4" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

/**
 * Compact Live Stats Bar
 */
export function LiveStatsBar({
  stats = {},
  connectionStatus = 'connected',
  lastUpdate,
  className = ''
}) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            Live Stats
          </span>
        </div>
        {lastUpdate && (
          <span className="text-xs text-gray-500 dark:text-gray-300">
            Updated {formatRelativeTime(lastUpdate)}
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.todayCheckIns || 0}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">Today's Check-ins</div>
        </div>
        
        <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats.currentlyOnPremises || 0}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">On Premises</div>
        </div>
        
        <div className="text-center p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats.pendingApprovals || 0}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">Pending</div>
        </div>
        
        <div className="text-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {stats.recentArrivals || 0}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">Recent Arrivals</div>
        </div>
      </div>
    </div>
  );
}

export default LiveVisitorFeed;
