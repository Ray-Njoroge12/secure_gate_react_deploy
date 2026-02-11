/**
 * @fileoverview Live Visitor Feed Component
 * @description Displays real-time visitor activity feed
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useRef } from 'react';
// FIX: Substituted direct Lucide icons with Icon component usage in render method
// import { 
//   UserCheck, 
//   UserX, 
//   LogIn, 
//   LogOut, 
//   Clock, 
//   AlertTriangle,
//   ChevronDown,
//   ChevronUp,
//   RefreshCw,
//   Wifi,
//   WifiOff,
//   Volume2,
//   VolumeX,
//   MapPin,
//   Calendar
// } from 'lucide-react';
import Icon from '../ui/Icon.jsx';
import Button from '../ui/Button';

/**
 * Get icon for event type
 */
const getEventIcon = (type) => {
  switch (type) {
    case 'visitor.check_in':
    case 'visitor.self_check_in':
      return 'log-in';
    case 'visitor.check_out':
      return 'log-out';
    case 'visitor.approved':
      return 'user-check';
    case 'visitor.denied':
      return 'user-x';
    case 'visitor.arrival':
      return 'map-pin';
    case 'security.alert':
      return 'alert-triangle';
    case 'visitor.invited':
      return 'calendar';
    default:
      return 'clock';
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
 * LiveVisitorFeed Component
 */
export const LiveVisitorFeed = ({
  maxItems = 10,
  refreshInterval = 5000,
  className = '',
  initialEvents = []
}) => {
  const [events, setEvents] = useState(initialEvents);
  const [isLive, setIsLive] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const feedRef = useRef(null);
  
  // FIX: Define autoScroll state which was missing
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to top on new events
  useEffect(() => {
    if (autoScroll && feedRef.current && events.length > 0) {
      feedRef.current.scrollTop = 0;
    }
  }, [events, autoScroll]);

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <div className={`relative flex h-3 w-3`}>
            {isLive ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-gray-400"></span>
            )}
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white">Live Feed</h3>
          
          {!isConnected && (
            <span className="flex items-center text-xs text-red-500 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
              <Icon name="wifi-off" className="w-3 h-3 mr-1" />
              Disconnected
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            title={isMuted ? "Unmute sounds" : "Mute sounds"}
          >
            <Icon name={isMuted ? 'volume-x' : 'volume-2'} size={16} />
          </Button>
          
          <Button 
            onClick={() => setIsLive(!isLive)}
            className={`p-1.5 rounded-md transition-colors ${
              isLive 
                ? 'text-green-600 bg-green-50 dark:bg-green-900/20' 
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`}
            title={isLive ? "Pause feed" : "Resume feed"}
          >
            <Icon name={isLive ? 'activity' : 'pause'} size={16} /> {/* Note: pause icon might need update if not in Icon map */}
          </Button>
        </div>
      </div>

      {/* Feed Content */}
      <div 
        ref={feedRef}
        className="flex flex-col max-h-[400px] overflow-y-auto custom-scrollbar"
      >
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Icon name="clock" size={48} className="mb-2 opacity-20" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-slate-700">
            {events.map((event) => (
              <div 
                key={event.id}
                className="flex items-start gap-3 p-4 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors animate-fade-in"
              >
                {/* Icon */}
                <div className={`
                  flex-shrink-0 p-2 rounded-lg
                  ${event.type.includes('alert') ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 
                    event.type.includes('check_in') ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                    event.type.includes('check_out') ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' :
                    'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'}
                `}>
                  <Icon name={getEventIcon(event.type)} size={18} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {event.visitorName || event.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {event.description || event.location}
                  </p>
                </div>

                {/* Time */}
                <div className="flex flex-col items-end text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Icon name="clock" size={10} />
                    {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-700 flex justify-center">
        <Button 
          className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          View All History
          <Icon name="chevron-down" size={14} />
        </Button>
      </div>
    </div>
  );
};

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
