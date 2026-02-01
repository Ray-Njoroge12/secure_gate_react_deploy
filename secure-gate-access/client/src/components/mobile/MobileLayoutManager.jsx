/**
 * MobileLayoutManager Component
 * 
 * Advanced layout manager specifically designed for mobile interfaces
 * with touch-optimized interactions and responsive behavior
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useEnhancedResponsive } from '../../hooks/useEnhancedResponsive.js';
import GestureHandler from './GestureHandler.jsx';

const MobileLayoutManager = ({
  children,
  layout = 'stack', // 'stack', 'grid', 'masonry', 'carousel'
  columns = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = { xs: '1rem', md: '1.5rem' },
  padding = { xs: '1rem', md: '2rem' },
  enableReorder = false,
  enableSwipeNavigation = false,
  onLayoutChange,
  className = '',
  ...props
}) => {
  const [currentLayout, setCurrentLayout] = useState(layout);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const containerRef = useRef(null);
  const responsive = useEnhancedResponsive();

  // Get responsive values
  const currentColumns = responsive.getResponsiveValue(columns);
  const currentGap = responsive.getResponsiveValue(gap);
  const currentPadding = responsive.getResponsiveValue(padding);

  // Handle swipe navigation for carousel layout
  const handleSwipe = useCallback((gesture) => {
    if (!enableSwipeNavigation || currentLayout !== 'carousel') return;
    
    const childrenArray = React.Children.toArray(children);
    
    if (gesture.direction === 'left' && activeIndex < childrenArray.length - 1) {
      setActiveIndex(prev => prev + 1);
    } else if (gesture.direction === 'right' && activeIndex > 0) {
      setActiveIndex(prev => prev - 1);
    }
  }, [enableSwipeNavigation, currentLayout, activeIndex, children]);

  // Handle drag and drop for reordering
  const handleDragStart = useCallback((index) => {
    if (!enableReorder) return;
    
    setIsDragging(true);
    setDraggedItem(index);
  }, [enableReorder]);

  const handleDragEnd = useCallback((targetIndex) => {
    if (!enableReorder || draggedItem === null) return;
    
    if (draggedItem !== targetIndex) {
      const childrenArray = React.Children.toArray(children);
      const newChildren = [...childrenArray];
      const [removed] = newChildren.splice(draggedItem, 1);
      newChildren.splice(targetIndex, 0, removed);
      
      onLayoutChange?.(newChildren);
    }
    
    setIsDragging(false);
    setDraggedItem(null);
  }, [enableReorder, draggedItem, children, onLayoutChange]);

  // Layout-specific styles
  const getLayoutStyles = useCallback(() => {
    const baseStyles = {
      padding: currentPadding,
      gap: currentGap
    };

    switch (currentLayout) {
      case 'grid':
        return {
          ...baseStyles,
          display: 'grid',
          gridTemplateColumns: `repeat(${currentColumns}, 1fr)`,
          gridAutoRows: 'min-content'
        };
      
      case 'masonry':
        return {
          ...baseStyles,
          display: 'grid',
          gridTemplateColumns: `repeat(${currentColumns}, 1fr)`,
          gridAutoRows: 'min-content',
          gridAutoFlow: 'row dense'
        };
      
      case 'carousel':
        return {
          ...baseStyles,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative'
        };
      
      case 'stack':
      default:
        return {
          ...baseStyles,
          display: 'flex',
          flexDirection: 'column'
        };
    }
  }, [currentLayout, currentColumns, currentGap, currentPadding]);

  // Render children based on layout
  const renderChildren = useCallback(() => {
    const childrenArray = React.Children.toArray(children);
    
    if (currentLayout === 'carousel') {
      return (
        <div
          className="flex transition-transform duration-300 ease-in-out"
          style={{
            transform: `translateX(-${activeIndex * 100}%)`,
            width: `${childrenArray.length * 100}%`
          }}
        >
          {childrenArray.map((child, index) => (
            <div
              key={index}
              className="flex-shrink-0"
              style={{ width: `${100 / childrenArray.length}%` }}
            >
              {child}
            </div>
          ))}
        </div>
      );
    }

    return childrenArray.map((child, index) => {
      const isBeingDragged = draggedItem === index;
      
      return (
        <MobileLayoutItem
          key={index}
          index={index}
          isDragging={isBeingDragged}
          enableReorder={enableReorder}
          onDragStart={() => handleDragStart(index)}
          onDragEnd={handleDragEnd}
          className={isBeingDragged ? 'opacity-50 scale-95' : ''}
        >
          {child}
        </MobileLayoutItem>
      );
    });
  }, [children, currentLayout, activeIndex, draggedItem, enableReorder, handleDragStart, handleDragEnd]);

  const containerClasses = [
    'mobile-layout-manager',
    'relative',
    'w-full',
    isDragging ? 'select-none' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <GestureHandler
      onSwipe={handleSwipe}
      enableSwipe={enableSwipeNavigation}
      className={containerClasses}
      {...props}
    >
      <div
        ref={containerRef}
        style={getLayoutStyles()}
        className="w-full"
      >
        {renderChildren()}
      </div>
      
      {/* Carousel indicators */}
      {currentLayout === 'carousel' && React.Children.count(children) > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {React.Children.map(children, (_, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={[
                'w-2 h-2 rounded-full transition-all duration-200',
                'min-w-[44px] min-h-[44px] flex items-center justify-center',
                index === activeIndex
                  ? 'bg-blue-600 scale-125'
                  : 'bg-gray-300 hover:bg-gray-400'
              ].join(' ')}
              aria-label={`Go to slide ${index + 1}`}
            >
              <span className="sr-only">Slide {index + 1}</span>
            </button>
          ))}
        </div>
      )}
      
      {/* Layout switcher for development/admin */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-2 z-50">
          <div className="flex space-x-1">
            {['stack', 'grid', 'masonry', 'carousel'].map((layoutType) => (
              <button
                key={layoutType}
                onClick={() => setCurrentLayout(layoutType)}
                className={[
                  'px-2 py-1 text-xs rounded',
                  'min-w-[44px] min-h-[44px] flex items-center justify-center',
                  currentLayout === layoutType
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                ].join(' ')}
              >
                {layoutType}
              </button>
            ))}
          </div>
        </div>
      )}
    </GestureHandler>
  );
};

// Individual layout item component
const MobileLayoutItem = ({
  children,
  index,
  isDragging,
  enableReorder,
  onDragStart,
  onDragEnd,
  className = ''
}) => {
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const itemRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

  const handleTouchStart = useCallback((e) => {
    if (!enableReorder) return;
    
    const touch = e.touches[0];
    dragStartRef.current = { x: touch.clientX, y: touch.clientY };
    onDragStart?.();
  }, [enableReorder, onDragStart]);

  const handleTouchMove = useCallback((e) => {
    if (!enableReorder || !isDragging) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStartRef.current.x;
    const deltaY = touch.clientY - dragStartRef.current.y;
    
    setDragPosition({ x: deltaX, y: deltaY });
  }, [enableReorder, isDragging]);

  const handleTouchEnd = useCallback((e) => {
    if (!enableReorder || !isDragging) return;
    
    // Find the element under the touch point
    const touch = e.changedTouches[0];
    const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetItem = elementBelow?.closest('[data-layout-item]');
    
    if (targetItem) {
      const targetIndex = parseInt(targetItem.dataset.layoutItem, 10);
      onDragEnd?.(targetIndex);
    } else {
      onDragEnd?.(index);
    }
    
    setDragPosition({ x: 0, y: 0 });
  }, [enableReorder, isDragging, onDragEnd, index]);

  const itemClasses = [
    'mobile-layout-item',
    'transition-all',
    'duration-200',
    'ease-in-out',
    isDragging ? 'z-50' : '',
    className
  ].filter(Boolean).join(' ');

  const itemStyle = isDragging ? {
    transform: `translate(${dragPosition.x}px, ${dragPosition.y}px)`,
    zIndex: 1000
  } : {};

  return (
    <div
      ref={itemRef}
      className={itemClasses}
      style={itemStyle}
      data-layout-item={index}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
      
      {/* Drag handle for reorderable items */}
      {enableReorder && (
        <div className="absolute top-2 right-2 p-1 bg-gray-200 dark:bg-gray-700 rounded opacity-50 hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </div>
      )}
    </div>
  );
};

export default MobileLayoutManager;