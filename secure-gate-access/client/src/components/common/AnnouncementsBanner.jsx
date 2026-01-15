/**
 * @file AnnouncementsBanner.jsx
 * @description Community announcements banner for residents/guards
 * Phase 3.4: Community Announcements
 * 
 * Features:
 * - Display unread announcements
 * - Priority-based styling
 * - Mark as read functionality
 * - Privacy-first (no individual tracking)
 */

import React, { useState, useEffect, useCallback } from 'react';
import announcementsService from '../../services/announcementsService';

const priorityStyles = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    icon: '🚨',
    iconBg: 'bg-red-100'
  },
  high: {
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    text: 'text-orange-800',
    icon: '⚠️',
    iconBg: 'bg-orange-100'
  },
  normal: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: '📢',
    iconBg: 'bg-blue-100'
  },
  low: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    icon: 'ℹ️',
    iconBg: 'bg-gray-100'
  }
};

const AnnouncementsBanner = ({ 
  maxVisible = 3, 
  autoHideDelay = 0,
  className = '' 
}) => {
  const [announcements, setAnnouncements] = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // Fetch unread announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      setLoading(true);
      const { announcements: data } = await announcementsService.getUnreadAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
    
    // Refresh announcements every 5 minutes
    const interval = setInterval(fetchAnnouncements, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAnnouncements]);

  // Handle dismissing an announcement
  const handleDismiss = useCallback(async (announcement) => {
    // Mark as read (privacy: aggregate only)
    await announcementsService.markAsRead(announcement.id);
    
    // Add to dismissed set
    setDismissedIds(prev => new Set([...prev, announcement.id]));
  }, []);

  // Filter out dismissed announcements
  const visibleAnnouncements = announcements.filter(
    a => !dismissedIds.has(a.id)
  );

  // Get announcements to display
  const displayedAnnouncements = expanded 
    ? visibleAnnouncements 
    : visibleAnnouncements.slice(0, maxVisible);

  const hasMore = visibleAnnouncements.length > maxVisible;

  if (loading || visibleAnnouncements.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {displayedAnnouncements.map((announcement) => {
        const style = priorityStyles[announcement.priority] || priorityStyles.normal;
        
        return (
          <div
            key={announcement.id}
            className={`flex items-start gap-3 p-4 rounded-lg border ${style.bg} ${style.border} animate-fadeIn`}
            role="alert"
          >
            {/* Icon */}
            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${style.iconBg} flex items-center justify-center text-xl`}>
              {style.icon}
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <h4 className={`text-sm font-semibold ${style.text}`}>
                {announcement.title}
                {announcement.is_pinned && (
                  <span className="ml-2 text-xs">📌</span>
                )}
              </h4>
              <p className={`mt-1 text-sm ${style.text} opacity-90`}>
                {announcement.content}
              </p>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-300">
                {new Date(announcement.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            
            {/* Dismiss Button */}
            {announcement.priority !== 'critical' && (
              <button
                onClick={() => handleDismiss(announcement)}
                className={`flex-shrink-0 p-1 rounded-full hover:bg-white/50 ${style.text}`}
                aria-label="Dismiss announcement"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        );
      })}

      {/* Show More/Less Button */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          {expanded 
            ? 'Show Less' 
            : `Show ${visibleAnnouncements.length - maxVisible} More`}
        </button>
      )}
    </div>
  );
};

export default AnnouncementsBanner;
