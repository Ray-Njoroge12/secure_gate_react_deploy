/**
 * MobileNavigation Component
 * 
 * Mobile-specific navigation component with touch-optimized interface
 * and gesture support
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEnhancedResponsive } from '../../hooks/useEnhancedResponsive.js';
import TouchOptimizedButton from './TouchOptimizedButton.jsx';

const MobileNavigation = ({
  items = [],
  position = 'bottom', // 'bottom', 'top', 'side'
  showLabels = true,
  enableSwipeGestures = true,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState(null);
  const navRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  
  const location = useLocation();
  const navigate = useNavigate();
  const responsive = useEnhancedResponsive();

  // Auto-hide navigation on scroll (mobile optimization)
  useEffect(() => {
    if (!responsive.isMobile) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDifference = Math.abs(currentScrollY - lastScrollY);
      
      // Only hide/show if scroll difference is significant
      if (scrollDifference > 10) {
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          // Scrolling down - hide navigation
          setIsVisible(false);
        } else {
          // Scrolling up - show navigation
          setIsVisible(true);
        }
        setLastScrollY(currentScrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, responsive.isMobile]);

  // Touch gesture handlers
  const handleTouchStart = useCallback((e) => {
    if (!enableSwipeGestures) return;
    
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  }, [enableSwipeGestures]);

  const handleTouchMove = useCallback((e) => {
    if (!enableSwipeGestures || !touchStartRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    
    // Determine swipe direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      setSwipeDirection(deltaX > 0 ? 'right' : 'left');
    } else {
      setSwipeDirection(deltaY > 0 ? 'down' : 'up');
    }
  }, [enableSwipeGestures]);

  const handleTouchEnd = useCallback((e) => {
    if (!enableSwipeGestures || !touchStartRef.current) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    
    // Check if it's a valid swipe (minimum distance and speed)
    const minSwipeDistance = 50;
    const maxSwipeTime = 300;
    
    if (deltaTime < maxSwipeTime) {
      if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe - navigate between tabs
        const currentIndex = items.findIndex(item => item.path === location.pathname);
        if (deltaX > 0 && currentIndex > 0) {
          // Swipe right - previous tab
          navigate(items[currentIndex - 1].path);
        } else if (deltaX < 0 && currentIndex < items.length - 1) {
          // Swipe left - next tab
          navigate(items[currentIndex + 1].path);
        }
      } else if (Math.abs(deltaY) > minSwipeDistance && position === 'bottom') {
        if (deltaY < 0) {
          // Swipe up - show navigation
          setIsVisible(true);
        } else if (deltaY > 0) {
          // Swipe down - hide navigation
          setIsVisible(false);
        }
      }
    }
    
    setSwipeDirection(null);
    touchStartRef.current = null;
  }, [enableSwipeGestures, items, location.pathname, navigate, position]);

  // Position-specific classes
  const positionClasses = {
    bottom: 'fixed bottom-0 left-0 right-0 border-t',
    top: 'fixed top-0 left-0 right-0 border-b',
    side: 'fixed left-0 top-0 bottom-0 border-r flex-col w-16'
  };

  const containerClasses = [
    'bg-white dark:bg-slate-800',
    'dark:bg-slate-900',
    'border-gray-200 dark:border-slate-700',
    'dark:border-slate-700',
    'z-50',
    'transition-transform',
    'duration-300',
    'ease-in-out',
    positionClasses[position],
    !isVisible && position === 'bottom' ? 'transform translate-y-full' : '',
    !isVisible && position === 'top' ? 'transform -translate-y-full' : '',
    !isVisible && position === 'side' ? 'transform -translate-x-full' : '',
    className
  ].filter(Boolean).join(' ');

  const navClasses = [
    'flex',
    position === 'side' ? 'flex-col' : 'flex-row',
    'items-center',
    'justify-around',
    position === 'bottom' || position === 'top' ? 'h-16' : 'flex-1',
    'px-2',
    'py-1'
  ].join(' ');

  return (
    <div
      ref={navRef}
      className={containerClasses}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <nav className={navClasses}>
        {items.map((item, _index) => {
          const isActive = location.pathname === item.path;
          
          return (
            <TouchOptimizedButton
              key={item.path}
              onClick={() => navigate(item.path)}
              variant="ghost"
              className={[
                'flex',
                position === 'side' ? 'flex-col w-full mb-2' : 'flex-col flex-1',
                'items-center',
                'justify-center',
                'min-h-[48px]', // Ensure minimum 48px height for navigation items
                'min-w-[44px]', // Ensure minimum 44px width for navigation items
                'rounded-lg',
                'transition-colors',
                'duration-150',
                isActive ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300',
                !isActive ? 'hover:bg-gray-100 dark:hover:bg-slate-700' : ''
              ].join(' ')}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Icon */}
              <div className="flex items-center justify-center w-6 h-6 mb-1">
                {typeof item.icon === 'string' ? (
                  <span className="text-xl">{item.icon}</span>
                ) : (
                  item.icon
                )}
              </div>
              
              {/* Label */}
              {showLabels && (
                <span className="text-xs font-medium leading-none">
                  {item.label}
                </span>
              )}
              
              {/* Active indicator */}
              {isActive && (
                <div className={[
                  'absolute',
                  position === 'bottom' ? 'top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-b' : '',
                  position === 'top' ? 'bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-t' : '',
                  position === 'side' ? 'right-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-l' : ''
                ].join(' ')} />
              )}
            </TouchOptimizedButton>
          );
        })}
      </nav>
      
      {/* Swipe indicator */}
      {swipeDirection && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
            {swipeDirection === 'left' && '← Swipe'}
            {swipeDirection === 'right' && 'Swipe →'}
            {swipeDirection === 'up' && '↑ Show'}
            {swipeDirection === 'down' && '↓ Hide'}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileNavigation;