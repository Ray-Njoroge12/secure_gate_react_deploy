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
import Icon from './Icon';

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
            ${variant === 'info' ? 'bg-blue-100 dark:bg-blue-900/30' : 
              variant === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 
              variant === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' : 
              variant === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
              variant === 'search' ? 'bg-purple-100 dark:bg-purple-900/30' :
              'bg-gray-100 dark:bg-slate-700'}
          `}>
            <Icon className={`
              ${compact ? 'w-8 h-8' : 'w-8 h-8 md:w-10 md:h-10'}
              ${variant === 'info' ? 'text-blue-600 dark:text-blue-400' : 
                variant === 'success' ? 'text-green-600 dark:text-green-400' : 
                variant === 'warning' ? 'text-amber-600 dark:text-amber-400' : 
                variant === 'error' ? 'text-red-600 dark:text-red-400' :
                variant === 'search' ? 'text-purple-600 dark:text-purple-400' :
                'text-gray-500 dark:text-gray-300'}
            `} />
          </div>
        </div>
      )}

      {/* Title */}
      {title && (
        <h3 className={`${compact ? 'text-base' : 'text-lg md:text-xl'} font-semibold text-gray-900 dark:text-white mb-2`}>
          {title}
        </h3>
      )}

      {/* Description */}
      {description && (
        <p className={`${compact ? 'text-sm' : 'text-sm md:text-base'} text-gray-600 dark:text-gray-200 ${primaryAction || secondaryAction ? 'mb-4 md:mb-6' : ''} max-w-md`}>
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
    icon={({ className }) => <Icon name="calendar" className={className} aria-hidden="true" />}
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
    icon={({ className }) => <Icon name="users" className={className} aria-hidden="true" />}
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
    icon={({ className }) => <Icon name="search" className={className} aria-hidden="true" />}
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
    icon={({ className }) => <Icon name="alert-circle" className={className} aria-hidden="true" />}
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
    icon={({ className }) => <Icon name="file-text" className={className} aria-hidden="true" />}
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
    icon={({ className }) => <Icon name="clock" className={className} aria-hidden="true" />}
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
    icon={({ className }) => <Icon name="check-circle" className={className} aria-hidden="true" />}
    title="No pending approvals"
    description="Walk-in visitors requiring your approval will appear here"
    variant="success"
    compact={compact}
  />
);

export const BulkInviteEmpty = ({ onGetStarted, compact = false }) => (
  <EmptyState
    icon={({ className }) => <Icon name="upload" className={className} aria-hidden="true" />}
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
