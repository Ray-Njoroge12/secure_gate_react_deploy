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
import Button from '../ui/Button';

const priorityStyles = {
  critical: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    border: 'border-red-300 dark:border-red-700',
    text: 'text-red-800 dark:text-red-300',
    icon: '🚨',
    iconBg: 'bg-red-100 dark:bg-red-900/50'
  },
  high: {
    bg: 'bg-orange-50 dark:bg-orange-900/30',
    border: 'border-orange-300 dark:border-orange-700',
    text: 'text-orange-800 dark:text-orange-300',
    icon: '⚠️',
    iconBg: 'bg-orange-100 dark:bg-orange-900/50'
  },
  normal: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    border: 'border-blue-200 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-300',
    icon: '📢',
    iconBg: 'bg-blue-100 dark:bg-blue-900/50'
  },
  low: {
    bg: 'bg-gray-50 dark:bg-slate-800',
    border: 'border-gray-200 dark:border-slate-700',
    text: 'text-gray-700 dark:text-gray-300',
    icon: 'ℹ️',
    iconBg: 'bg-gray-100 dark:bg-slate-700'
  }
};

const AnnouncementsBanner = ({ 
  maxVisible = 3, 
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
              <Button
                onClick={() => handleDismiss(announcement)}
                className={`flex-shrink-0 p-1 rounded-full hover:bg-white/50 ${style.text}`}
                aria-label="Dismiss announcement"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            )}
          </div>
        );
      })}

      {/* Show More/Less Button */}
      {hasMore && (
        <Button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium min-h-[44px]"
        >
          {expanded 
            ? 'Show Less' 
            : `Show ${visibleAnnouncements.length - maxVisible} More`}
        </Button>
      )}
    </div>
  );
};

export default AnnouncementsBanner;
