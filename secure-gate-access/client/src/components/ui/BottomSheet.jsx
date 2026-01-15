/**
 * @file BottomSheet.jsx
 * @description Mobile-first bottom sheet component with drag-to-dismiss
 * Phase 4: UI/UX Improvement - Priority 2.1
 * 
 * Features:
 * - Drag to expand/collapse
 * - Snap points (25%, 50%, 75%, 90%)
 * - Backdrop blur
 * - Focus trap
 * - Escape to close
 * - Touch gesture support
 * - Reduced motion support
 * 
 * Usage:
 * <BottomSheet
 *   isOpen={showDetails}
 *   onClose={() => setShowDetails(false)}
 *   snapPoints={['25%', '50%', '90%']}
 *   defaultSnap="50%"
 * >
 *   <VisitorDetails visitor={selectedVisitor} />
 * </BottomSheet>
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

// Parse snap point to percentage
const parseSnapPoint = (snap) => {
  if (typeof snap === 'number') return snap;
  if (typeof snap === 'string') {
    if (snap.endsWith('%')) return parseInt(snap, 10);
    if (snap === 'content') return null; // Will be calculated based on content
  }
  return 50;
};

// Calculate snap position from percentage
const getSnapPosition = (percentage, containerHeight) => {
  return containerHeight * (1 - percentage / 100);
};

/**
 * Bottom Sheet Handle Component
 */
const BottomSheetHandle = () => (
  <div className="flex items-center justify-center py-3">
    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
  </div>
);

/**
 * Bottom Sheet Component
 */
const BottomSheet = ({
  isOpen,
  onClose,
  children,
  snapPoints = ['25%', '50%', '90%'],
  defaultSnap = '50%',
  backdrop = true,
  backdropBlur = true,
  header,
  footer,
  onSnapChange,
  title,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showHandle = true,
  maxWidth = '100%',
  className = '',
}) => {
  const [currentSnap, setCurrentSnap] = useState(defaultSnap);
  const [isDragging, setIsDragging] = useState(false);
  const [translateY, setTranslateY] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  
  const sheetRef = useRef(null);
  const dragStartY = useRef(0);
  const currentY = useRef(0);
  const containerHeight = useRef(0);
  
  // Parse snap points
  const parsedSnapPoints = snapPoints.map(parseSnapPoint);
  const defaultSnapPercent = parseSnapPoint(defaultSnap);

  // Check for reduced motion preference
  const prefersReducedMotion = 
    typeof window !== 'undefined' && 
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Calculate container height on mount/resize
  useEffect(() => {
    const updateHeight = () => {
      containerHeight.current = window.innerHeight;
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Handle escape key
  useEffect(() => {
    if (!closeOnEscape || !isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape]);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !sheetRef.current) return;

    const focusableElements = sheetRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTab = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    firstElement?.focus();
    
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // Handle close with animation
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, prefersReducedMotion ? 0 : 300);
  }, [onClose, prefersReducedMotion]);

  // Find nearest snap point
  const findNearestSnap = (currentPercent) => {
    let nearestSnap = parsedSnapPoints[0];
    let minDistance = Math.abs(currentPercent - parsedSnapPoints[0]);

    parsedSnapPoints.forEach((snap) => {
      const distance = Math.abs(currentPercent - snap);
      if (distance < minDistance) {
        minDistance = distance;
        nearestSnap = snap;
      }
    });

    return nearestSnap;
  };

  // Touch/mouse handlers
  const handleDragStart = (clientY) => {
    setIsDragging(true);
    dragStartY.current = clientY;
    currentY.current = 0;
  };

  const handleDrag = (clientY) => {
    if (!isDragging) return;
    
    const diff = clientY - dragStartY.current;
    currentY.current = diff;
    setTranslateY(diff);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    // Calculate current position as percentage
    const currentPercent = parseSnapPoint(currentSnap);
    const dragPercent = (currentY.current / containerHeight.current) * 100;
    const newPercent = currentPercent - dragPercent;

    // If dragged down significantly, close
    if (currentY.current > 100 && newPercent < parsedSnapPoints[0] - 10) {
      handleClose();
      return;
    }

    // Find nearest snap point
    const nearestSnap = findNearestSnap(newPercent);
    const snapString = `${nearestSnap}%`;
    
    setCurrentSnap(snapString);
    setTranslateY(0);
    onSnapChange?.(snapString);
  };

  // Mouse event handlers
  const handleMouseDown = (e) => {
    e.preventDefault();
    handleDragStart(e.clientY);
    
    const handleMouseMove = (e) => handleDrag(e.clientY);
    const handleMouseUp = () => {
      handleDragEnd();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Touch event handlers
  const handleTouchStart = (e) => {
    handleDragStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    handleDrag(e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  // Calculate sheet height based on current snap
  const getSheetStyle = () => {
    const snapPercent = parseSnapPoint(currentSnap);
    const heightStyle = {
      height: `${snapPercent}vh`,
      transform: isDragging ? `translateY(${translateY}px)` : 'translateY(0)',
      transition: isDragging || prefersReducedMotion ? 'none' : 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    };
    
    if (maxWidth !== '100%') {
      heightStyle.maxWidth = maxWidth;
      heightStyle.margin = '0 auto';
    }
    
    return heightStyle;
  };

  if (!isOpen && !isClosing) return null;

  const sheetContent = (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      {backdrop && (
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${
            backdropBlur ? 'backdrop-blur-sm' : ''
          } ${isClosing ? 'opacity-0' : 'opacity-100'}`}
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
          onClick={closeOnBackdropClick ? handleClose : undefined}
          aria-hidden="true"
        />
      )}

      {/* Sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'bottom-sheet-title' : undefined}
        className={`
          absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 
          rounded-t-2xl shadow-2xl overflow-hidden
          ${isClosing ? 'translate-y-full' : ''}
          ${className}
        `}
        style={getSheetStyle()}
      >
        {/* Handle (draggable area) */}
        {showHandle && (
          <div
            className="touch-none cursor-grab active:cursor-grabbing"
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <BottomSheetHandle />
          </div>
        )}

        {/* Header */}
        {(header || title) && (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            {title && (
              <div className="flex items-center justify-between">
                <h2 
                  id="bottom-sheet-title"
                  className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                >
                  {title}
                </h2>
                <button
                  onClick={handleClose}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-200 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            {header}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            {footer}
          </div>
        )}

        {/* Safe area for iOS */}
        <div className="pb-safe" />
      </div>
    </div>
  );

  // Render in portal
  if (typeof document === 'undefined') return null;
  return createPortal(sheetContent, document.body);
};

export default BottomSheet;
