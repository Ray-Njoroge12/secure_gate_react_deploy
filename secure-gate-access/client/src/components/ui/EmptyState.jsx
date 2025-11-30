/**
 * EmptyState Component
 * 
 * A reusable component for displaying empty states with optional illustrations,
 * icons, descriptions, and call-to-action buttons.
 * 
 * @component
 * @example
 * <EmptyState
 *   icon={CalendarIcon}
 *   title="No upcoming visits"
 *   description="Create your first visitor invitation to get started"
 *   primaryAction={{
 *     label: "Create Invitation",
 *     onClick: handleCreate
 *   }}
 * />
 */

import React from 'react';
import Button from './Button';

const EmptyState = ({
  illustration,
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  variant = 'default',
  className = '',
  compact = false
}) => {
  return (
    <div className={`flex flex-col items-center justify-center ${compact ? 'py-6' : 'py-8 md:py-12'} px-4 text-center ${className}`}>
      {/* Illustration or Icon */}
      {illustration && (
        <div className={`${compact ? 'mb-3' : 'mb-6'}`}>
          <img 
            src={illustration} 
            alt="" 
            className={`${compact ? 'w-32 h-32' : 'w-40 h-40 md:w-48 md:h-48'} object-contain`}
            aria-hidden="true"
          />
        </div>
      )}
      
      {Icon && !illustration && (
        <div className={`${compact ? 'mb-3' : 'mb-4 md:mb-6'}`}>
          <div className={`
            ${compact ? 'w-14 h-14' : 'w-16 h-16 md:w-20 md:h-20'} rounded-full flex items-center justify-center
            ${variant === 'info' ? 'bg-blue-100' : 
              variant === 'success' ? 'bg-green-100' : 
              variant === 'warning' ? 'bg-amber-100' : 
              variant === 'error' ? 'bg-red-100' :
              variant === 'search' ? 'bg-purple-100' :
              'bg-gray-100'}
          `}>
            <Icon className={`
              ${compact ? 'w-8 h-8' : 'w-8 h-8 md:w-10 md:h-10'}
              ${variant === 'info' ? 'text-blue-600' : 
                variant === 'success' ? 'text-green-600' : 
                variant === 'warning' ? 'text-amber-600' : 
                variant === 'error' ? 'text-red-600' :
                variant === 'search' ? 'text-purple-600' :
                'text-gray-500'}
            `} />
          </div>
        </div>
      )}

      {/* Title */}
      {title && (
        <h3 className={`${compact ? 'text-base' : 'text-lg md:text-xl'} font-semibold text-gray-900 mb-2`}>
          {title}
        </h3>
      )}

      {/* Description */}
      {description && (
        <p className={`${compact ? 'text-sm' : 'text-sm md:text-base'} text-gray-600 ${primaryAction || secondaryAction ? 'mb-4 md:mb-6' : ''} max-w-md`}>
          {description}
        </p>
      )}

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full sm:w-auto">
          {primaryAction && (
            <Button
              onClick={primaryAction.onClick}
              size={compact ? 'sm' : 'md'}
              variant={primaryAction.variant || 'primary'}
              className="w-full sm:w-auto min-w-[120px]"
            >
              {primaryAction.icon && <span className="mr-2">{primaryAction.icon}</span>}
              {primaryAction.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              size={compact ? 'sm' : 'md'}
              variant={secondaryAction.variant || 'outline'}
              className="w-full sm:w-auto"
            >
              {secondaryAction.icon && <span className="mr-2">{secondaryAction.icon}</span>}
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

// PHASE A6: Predefined empty state variants for common scenarios
export const UpcomingVisitsEmpty = ({ onCreate, onViewHistory, compact = false }) => (
  <EmptyState
    icon={({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )}
    title="No upcoming visitors"
    description="You don't have any scheduled visitors. Invite someone to get started."
    primaryAction={{
      label: "➕ Invite Visitor",
      onClick: onCreate,
      variant: 'primary'
    }}
    secondaryAction={onViewHistory && {
      label: "View History",
      onClick: onViewHistory
    }}
    variant="info"
    compact={compact}
  />
);

export const RecentVisitorsEmpty = ({ onInvite, compact = false }) => (
  <EmptyState
    icon={({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )}
    title="No recent visitors"
    description="Your recent visitors will appear here once they check in."
    primaryAction={onInvite && {
      label: "Invite Someone",
      onClick: onInvite
    }}
    variant="default"
    compact={compact}
  />
);

export const SearchEmpty = ({ query, onClearSearch, compact = false }) => (
  <EmptyState
    icon={({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    )}
    title={query ? `No results for "${query}"` : "No matches found"}
    description="Try different search terms or clear filters to see all items"
    primaryAction={onClearSearch && {
      label: "Clear Search",
      onClick: onClearSearch,
      variant: 'outline'
    }}
    variant="search"
    compact={compact}
  />
);

export const ErrorState = ({ onRetry, errorMessage, compact = false }) => (
  <EmptyState
    icon={({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )}
    title="Something went wrong"
    description={errorMessage || "We couldn't load this content. Please try again."}
    variant="error"
    primaryAction={onRetry && {
      label: "🔄 Try Again",
      onClick: onRetry
    }}
    compact={compact}
  />
);

// New variants for Phase A6
export const ActiveVisitorsEmpty = ({ onScanQR, onManualCheck, compact = false }) => (
  <EmptyState
    icon={({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )}
    title="No active visitors"
    description="Visitors will appear here when they check in"
    primaryAction={onScanQR && {
      label: "📷 Scan QR Code",
      onClick: onScanQR
    }}
    secondaryAction={onManualCheck && {
      label: "Manual Check",
      onClick: onManualCheck
    }}
    variant="info"
    compact={compact}
  />
);

export const HistoryEmpty = ({ timeframe = "yet", onInvite, compact = false }) => (
  <EmptyState
    icon={({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )}
    title={`No visitors ${timeframe}`}
    description="Your visitor history will be displayed here"
    primaryAction={onInvite && {
      label: "Create First Invite",
      onClick: onInvite
    }}
    variant="default"
    compact={compact}
  />
);

export const ApprovalsEmpty = ({ compact = false }) => (
  <EmptyState
    icon={({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )}
    title="No pending approvals"
    description="Walk-in visitors requiring your approval will appear here"
    variant="success"
    compact={compact}
  />
);

export const BulkInviteEmpty = ({ onGetStarted, compact = false }) => (
  <EmptyState
    icon={({ className }) => (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    )}
    title="Ready to bulk invite?"
    description="Upload a CSV file with visitor details to send multiple invitations at once"
    primaryAction={{
      label: "📁 Select CSV File",
      onClick: onGetStarted
    }}
    variant="info"
    compact={compact}
  />
);

EmptyState.displayName = 'EmptyState';

export default EmptyState;
