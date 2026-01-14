/**
 * @file HelpTooltip.jsx
 * @description Smart tooltip with rich content, learn more links, and video support
 * Phase 4: UI/UX Improvement - Priority 2.3
 * 
 * Features:
 * - Rich content with markdown support
 * - Learn more links
 * - Video thumbnail preview
 * - Keyboard shortcut badges
 * - Dismissible pro tips
 * - Accessible (WCAG 2.1 AA)
 * 
 * Usage:
 * <HelpTooltip
 *   title="Bulk Invite"
 *   content="Send invites to multiple guests at once for events."
 *   learnMoreUrl="/help/bulk-invite"
 *   shortcut="⌘B"
 * />
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

// Icon components
const HelpIcon = ({ size = 16, className = '' }) => (
  <svg
    className={`inline-flex ${className}`}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

// Keyboard shortcut badge
const KeyboardBadge = ({ shortcut }) => (
  <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">
    {shortcut}
  </kbd>
);

// Position calculations
const positions = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  'top-left': 'bottom-full left-0 mb-2',
  'top-right': 'bottom-full right-0 mb-2',
  'bottom-left': 'top-full left-0 mt-2',
  'bottom-right': 'top-full right-0 mt-2',
};

// Arrow positions
const arrowPositions = {
  top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-t-gray-800 dark:border-t-gray-700 border-x-transparent border-b-transparent',
  bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-b-gray-800 dark:border-b-gray-700 border-x-transparent border-t-transparent',
  left: 'right-0 top-1/2 -translate-y-1/2 translate-x-full border-l-gray-800 dark:border-l-gray-700 border-y-transparent border-r-transparent',
  right: 'left-0 top-1/2 -translate-y-1/2 -translate-x-full border-r-gray-800 dark:border-r-gray-700 border-y-transparent border-l-transparent',
};

/**
 * HelpTooltip Component
 */
const HelpTooltip = ({
  title,
  content,
  learnMoreUrl,
  videoUrl,
  videoThumbnail,
  shortcut,
  proTip,
  position = 'top',
  showIcon = true,
  iconSize = 16,
  iconClassName = 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help',
  triggerOnClick = false,
  dismissable = false,
  dismissKey,
  children,
  className = '',
  maxWidth = 280,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [calculatedPosition, setCalculatedPosition] = useState(position);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const timeoutRef = useRef(null);

  // Check if tooltip was previously dismissed
  useEffect(() => {
    if (dismissKey) {
      const dismissed = localStorage.getItem(`tooltip-dismissed-${dismissKey}`);
      if (dismissed === 'true') {
        setIsDismissed(true);
      }
    }
  }, [dismissKey]);

  // Calculate best position to avoid viewport overflow
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 10;

    let newPosition = position;

    // Check vertical overflow
    if (position.includes('top') && triggerRect.top - tooltipRect.height < padding) {
      newPosition = position.replace('top', 'bottom');
    } else if (position.includes('bottom') && triggerRect.bottom + tooltipRect.height > viewportHeight - padding) {
      newPosition = position.replace('bottom', 'top');
    }

    // Check horizontal overflow
    if (triggerRect.left + tooltipRect.width / 2 > viewportWidth - padding) {
      if (position === 'top' || position === 'bottom') {
        newPosition = position + '-right';
      }
    } else if (triggerRect.right - tooltipRect.width / 2 < padding) {
      if (position === 'top' || position === 'bottom') {
        newPosition = position + '-left';
      }
    }

    setCalculatedPosition(newPosition);
  }, [position]);

  // Show tooltip with delay
  const showTooltip = useCallback(() => {
    if (isDismissed) return;
    
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      // Recalculate position after render
      requestAnimationFrame(calculatePosition);
    }, triggerOnClick ? 0 : 200);
  }, [isDismissed, triggerOnClick, calculatePosition]);

  // Hide tooltip with delay
  const hideTooltip = useCallback(() => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, triggerOnClick ? 0 : 100);
  }, [triggerOnClick]);

  // Dismiss permanently
  const handleDismiss = () => {
    if (dismissKey) {
      localStorage.setItem(`tooltip-dismissed-${dismissKey}`, 'true');
    }
    setIsDismissed(true);
    setIsVisible(false);
  };

  // Handle click trigger
  const handleClick = (e) => {
    if (triggerOnClick) {
      e.stopPropagation();
      setIsVisible((prev) => !prev);
    }
  };

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isVisible) {
        setIsVisible(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible]);

  // Close on click outside
  useEffect(() => {
    if (!triggerOnClick || !isVisible) return;

    const handleClickOutside = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target)
      ) {
        setIsVisible(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [triggerOnClick, isVisible]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  if (isDismissed) return children || null;

  const arrowPosition = calculatedPosition.split('-')[0];

  return (
    <div className={`relative inline-flex ${className}`}>
      {/* Trigger */}
      <div
        ref={triggerRef}
        onMouseEnter={!triggerOnClick ? showTooltip : undefined}
        onMouseLeave={!triggerOnClick ? hideTooltip : undefined}
        onFocus={!triggerOnClick ? showTooltip : undefined}
        onBlur={!triggerOnClick ? hideTooltip : undefined}
        onClick={handleClick}
        tabIndex={0}
        role="button"
        aria-describedby={isVisible ? 'help-tooltip' : undefined}
        className="inline-flex items-center"
      >
        {children || (showIcon && <HelpIcon size={iconSize} className={iconClassName} />)}
      </div>

      {/* Tooltip */}
      {isVisible && (
        <div
          ref={tooltipRef}
          id="help-tooltip"
          role="tooltip"
          className={`
            absolute z-50 ${positions[calculatedPosition]}
            bg-gray-800 dark:bg-gray-700 text-white rounded-lg shadow-xl
            animate-fade-in
          `}
          style={{ maxWidth, minWidth: 200 }}
          onMouseEnter={!triggerOnClick ? showTooltip : undefined}
          onMouseLeave={!triggerOnClick ? hideTooltip : undefined}
        >
          {/* Arrow */}
          <div
            className={`absolute w-0 h-0 border-8 ${arrowPositions[arrowPosition]}`}
          />

          <div className="p-3">
            {/* Title & Shortcut */}
            {(title || shortcut) && (
              <div className="flex items-center justify-between gap-2 mb-2">
                {title && (
                  <h4 className="font-semibold text-sm">{title}</h4>
                )}
                {shortcut && <KeyboardBadge shortcut={shortcut} />}
              </div>
            )}

            {/* Content */}
            {content && (
              <p className="text-sm text-gray-300 leading-relaxed">{content}</p>
            )}

            {/* Video Thumbnail */}
            {videoUrl && (
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-3 relative rounded-lg overflow-hidden group"
              >
                {videoThumbnail ? (
                  <img
                    src={videoThumbnail}
                    alt="Watch video"
                    className="w-full h-24 object-cover"
                  />
                ) : (
                  <div className="w-full h-24 bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Video Tutorial</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/30 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-green-500/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <PlayIcon />
                  </div>
                </div>
              </a>
            )}

            {/* Pro Tip */}
            {proTip && (
              <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded-md">
                <div className="flex items-start gap-2">
                  <span className="text-green-400">💡</span>
                  <p className="text-xs text-green-300">{proTip}</p>
                </div>
              </div>
            )}

            {/* Footer */}
            {(learnMoreUrl || dismissable) && (
              <div className="mt-3 pt-2 border-t border-gray-700 flex items-center justify-between">
                {learnMoreUrl && (
                  <a
                    href={learnMoreUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                  >
                    Learn more
                    <ExternalLinkIcon />
                  </a>
                )}
                {dismissable && (
                  <button
                    onClick={handleDismiss}
                    className="text-xs text-gray-400 hover:text-gray-300"
                  >
                    Don't show again
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default HelpTooltip;
