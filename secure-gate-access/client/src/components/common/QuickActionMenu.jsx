/**
 * @file QuickActionMenu.jsx
 * @description Floating Action Button with expandable quick actions
 * Phase 4: UI/UX Improvements - Mobile Quick Actions
 * 
 * Features:
 * - Expandable FAB menu
 * - Smooth animations
 * - Role-based actions
 * - Touch-optimized
 * - Keyboard accessible
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { navigateTo } from '../../utils/appNavigation';

const defaultActions = {
  resident: [
    { id: 'add-visitor', icon: '➕', label: 'Add Visitor', href: '/resident/add-visitor' },
    { id: 'quick-invite', icon: '✉️', label: 'Quick Invite', href: '/resident/quick-invite' },
    { id: 'generate-pass', icon: '🎫', label: 'Generate Pass', href: '/resident/generate-pass' },
    { id: 'scan', icon: '📷', label: 'Scan QR', href: '/resident/scan' },
  ],
  guard: [
    { id: 'scan-qr', icon: '📷', label: 'Scan QR', href: '/guard/scan-qr' },
    { id: 'manual-check', icon: '✅', label: 'Manual Check', href: '/guard/manual-check' },
    { id: 'search', icon: '🔍', label: 'Search Visitor', href: '/guard/search' },
  ],
  admin: [
    { id: 'add-user', icon: '👤', label: 'Add User', href: '/admin/add-user' },
    { id: 'reports', icon: '📊', label: 'Reports', href: '/admin/reports' },
    { id: 'settings', icon: '⚙️', label: 'Settings', href: '/admin/settings' },
  ],
};

/**
 * Single action item in the expandable menu
 */
const ActionItem = ({ 
  icon, 
  label, 
  onClick, 
  href, 
  index, 
  isExpanded,
  delay = 50 
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      navigateTo(href);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-full
        bg-white shadow-lg border border-gray-200
        hover:bg-gray-50 hover:shadow-xl
        active:scale-95
        transition-all duration-200 ease-out
        ${isExpanded 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4 pointer-events-none'
        }
      `}
      style={{
        transitionDelay: isExpanded ? `${index * delay}ms` : '0ms',
      }}
      aria-label={label}
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm font-medium text-gray-700 whitespace-nowrap">{label}</span>
    </button>
  );
};

/**
 * Main Quick Action Menu Component
 */
const QuickActionMenu = ({
  role = 'resident',
  actions,
  position = 'bottom-right',
  primaryIcon = '✨',
  expandedIcon = '✕',
  className = '',
  showOnlyMobile = true,
  onToggle,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Use custom actions or defaults for role
  const menuActions = actions || defaultActions[role] || [];

  // Position classes
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
  };

  // Toggle menu
  const toggleMenu = () => {
    setIsExpanded(!isExpanded);
    onToggle?.(!isExpanded);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current && 
        !menuRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isExpanded]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  // Mobile visibility class
  const visibilityClass = showOnlyMobile ? 'md:hidden' : '';

  const menu = (
    <div className={`fixed ${positionClasses[position]} z-50 ${visibilityClass} ${className}`}>
      {/* Backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10 animate-fade-in"
          onClick={() => setIsExpanded(false)}
          aria-hidden="true"
        />
      )}

      {/* Action Items */}
      <div 
        ref={menuRef}
        className={`
          absolute bottom-16 right-0 
          flex flex-col-reverse items-end gap-2
          mb-2
        `}
        role="menu"
        aria-orientation="vertical"
        aria-hidden={!isExpanded}
      >
        {menuActions.map((action, index) => (
          <ActionItem
            key={action.id}
            {...action}
            index={index}
            isExpanded={isExpanded}
            onClick={() => {
              action.onClick?.();
              setIsExpanded(false);
            }}
          />
        ))}
      </div>

      {/* Main FAB Button */}
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className={`
          w-14 h-14 rounded-full
          bg-gradient-to-br from-green-500 to-green-600
          hover:from-green-600 hover:to-green-700
          active:scale-95
          shadow-lg hover:shadow-xl
          flex items-center justify-center
          transition-all duration-200 ease-out
          focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2
        `}
        aria-expanded={isExpanded}
        aria-haspopup="menu"
        aria-label={isExpanded ? 'Close quick actions menu' : 'Open quick actions menu'}
      >
        <span 
          className={`
            text-2xl text-white
            transition-transform duration-200
            ${isExpanded ? 'rotate-45' : 'rotate-0'}
          `}
        >
          {isExpanded ? expandedIcon : primaryIcon}
        </span>
      </button>

      {/* Ripple effect on tap */}
      <span 
        className={`
          absolute inset-0 w-14 h-14 rounded-full
          bg-white/30 
          ${isExpanded ? 'animate-ping' : 'hidden'}
        `}
        style={{ animationDuration: '1s', animationIterationCount: 1 }}
        aria-hidden="true"
      />
    </div>
  );

  // Portal to body for proper z-index
  return typeof document !== 'undefined' 
    ? createPortal(menu, document.body) 
    : null;
};

/**
 * Speed Dial variant - shows labels on hover/focus
 */
export const SpeedDial = ({
  actions,
  label = 'Quick Actions',
  direction = 'up',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className={`relative inline-flex flex-col items-center ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      {/* Actions */}
      <div 
        className={`
          absolute bottom-full mb-2
          flex flex-col-reverse items-center gap-2
          transition-all duration-200
          ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}
        `}
      >
        {actions?.map((action, index) => (
          <button
            key={action.id}
            onClick={action.onClick}
            className={`
              group flex items-center gap-2
              transition-all duration-200
              ${isOpen ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}
            `}
            style={{ transitionDelay: `${index * 30}ms` }}
          >
            <span className="
              px-2 py-1 rounded bg-gray-800 text-white text-xs
              opacity-0 group-hover:opacity-100
              transition-opacity
            ">
              {action.label}
            </span>
            <span className="
              w-10 h-10 rounded-full
              bg-gray-100 hover:bg-gray-200
              flex items-center justify-center
              text-lg shadow
            ">
              {action.icon}
            </span>
          </button>
        ))}
      </div>

      {/* Main Button */}
      <button
        className="
          w-14 h-14 rounded-full
          bg-green-500 hover:bg-green-600
          text-white text-2xl
          shadow-lg hover:shadow-xl
          transition-all duration-200
          flex items-center justify-center
        "
        aria-label={label}
      >
        <span className={`transition-transform duration-200 ${isOpen ? 'rotate-45' : ''}`}>
          ➕
        </span>
      </button>
    </div>
  );
};

export default QuickActionMenu;
