/**
 * TouchOptimizedButton Component
 * 
 * A button component specifically designed for mobile touch interfaces
 * with 44px minimum touch targets and enhanced touch feedback
 */

import React, { useState, useRef, useCallback } from 'react';
import { useEnhancedResponsive } from '../../hooks/useEnhancedResponsive.js';

const TouchOptimizedButton = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  loading = false,
  hapticFeedback = true,
  className = '',
  ...props
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [touchPosition, setTouchPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef(null);
  const responsive = useEnhancedResponsive();

  // Touch event handlers with haptic feedback
  const handleTouchStart = useCallback((e) => {
    if (disabled || loading) return;
    
    setIsPressed(true);
    
    // Calculate touch position for ripple effect
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const touch = e.touches[0];
      setTouchPosition({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      });
    }
    
    // Haptic feedback on supported devices
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10); // Short vibration
    }
  }, [disabled, loading, hapticFeedback]);

  const handleTouchEnd = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleClick = useCallback((e) => {
    if (disabled || loading) {
      e.preventDefault();
      return;
    }
    
    onClick?.(e);
  }, [disabled, loading, onClick]);

  // Responsive size calculations - ensure all sizes meet 44px minimum
  const sizeClasses = responsive.getResponsiveValue({
    xs: {
      small: 'min-h-[44px] px-3 py-2 text-sm',
      medium: 'min-h-[48px] px-4 py-3 text-base',
      large: 'min-h-[52px] px-6 py-4 text-lg'
    },
    md: {
      small: 'min-h-[44px] px-3 py-2 text-sm', // Changed from 40px to 44px
      medium: 'min-h-[48px] px-4 py-2.5 text-base', // Changed from 44px to 48px
      large: 'min-h-[52px] px-6 py-3 text-lg' // Changed from 48px to 52px
    }
  })[size];

  // Variant styles
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white border-transparent',
    secondary: 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 active:bg-gray-300 text-gray-900 dark:text-white border-gray-300 dark:border-slate-600',
    outline: 'bg-transparent hover:bg-gray-50 dark:hover:bg-slate-700 active:bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-slate-600',
    ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-slate-700 active:bg-gray-200 text-gray-700 dark:text-gray-300 border-transparent',
    danger: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white border-transparent',
    success: 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white border-transparent'
  };

  const baseClasses = [
    'relative',
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'rounded-lg',
    'border',
    'transition-all',
    'duration-150',
    'ease-in-out',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-blue-500',
    'focus:ring-offset-2',
    'select-none',
    'overflow-hidden',
    // Touch-specific styles
    'touch-manipulation',
    'user-select-none',
    '-webkit-user-select-none',
    // Ensure minimum touch target
    'min-w-[44px]',
    fullWidth ? 'w-full' : '',
    disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
    isPressed ? 'transform scale-95' : '',
    sizeClasses,
    variantClasses[variant],
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={buttonRef}
      className={baseClasses}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {/* Ripple effect */}
      {isPressed && (
        <span
          className="absolute inset-0 bg-white opacity-20 rounded-full animate-ping"
          style={{
            left: touchPosition.x - 10,
            top: touchPosition.y - 10,
            width: 20,
            height: 20
          }}
        />
      )}
      
      {/* Loading spinner */}
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      
      {children}
    </button>
  );
};

export default TouchOptimizedButton;