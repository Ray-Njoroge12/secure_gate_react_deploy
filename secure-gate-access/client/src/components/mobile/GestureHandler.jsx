/**
 * GestureHandler Component
 * 
 * A comprehensive gesture recognition system for mobile interfaces
 * supporting swipe, pinch, tap, and long press gestures
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';

const GestureHandler = ({
  children,
  onSwipe,
  onPinch,
  onTap,
  onLongPress,
  onDoubleTap,
  enableSwipe = true,
  enablePinch = true,
  enableTap = true,
  enableLongPress = true,
  enableDoubleTap = true,
  swipeThreshold = 50,
  pinchThreshold = 0.1,
  longPressDelay = 500,
  doubleTapDelay = 300,
  className = '',
  ...props
}) => {
  const elementRef = useRef(null);
  const gestureStateRef = useRef({
    touches: [],
    startTime: 0,
    lastTapTime: 0,
    longPressTimer: null,
    initialDistance: 0,
    initialScale: 1,
    isGesturing: false
  });

  const [gestureInfo, setGestureInfo] = useState({
    type: null,
    direction: null,
    distance: 0,
    scale: 1,
    center: { x: 0, y: 0 }
  });

  // Calculate distance between two touches
  const getDistance = useCallback((touch1, touch2) => {
    if (!touch1 || !touch2 || 
        typeof touch1.clientX !== 'number' || typeof touch1.clientY !== 'number' ||
        typeof touch2.clientX !== 'number' || typeof touch2.clientY !== 'number') {
      return 0;
    }
    
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return isNaN(distance) ? 0 : distance;
  }, []);

  // Calculate center point between touches
  const getCenter = useCallback((touches) => {
    if (!touches || touches.length === 0) {
      return { x: 0, y: 0 };
    }
    
    if (touches.length === 1) {
      return { 
        x: touches[0].clientX || 0, 
        y: touches[0].clientY || 0 
      };
    }
    
    const validTouches = touches.filter(touch => 
      touch && typeof touch.clientX === 'number' && typeof touch.clientY === 'number' &&
      !isNaN(touch.clientX) && !isNaN(touch.clientY)
    );
    
    if (validTouches.length === 0) {
      return { x: 0, y: 0 };
    }
    
    const x = validTouches.reduce((sum, touch) => sum + touch.clientX, 0) / validTouches.length;
    const y = validTouches.reduce((sum, touch) => sum + touch.clientY, 0) / validTouches.length;
    
    return { 
      x: isNaN(x) ? 0 : x, 
      y: isNaN(y) ? 0 : y 
    };
  }, []);

  // Get swipe direction
  const getSwipeDirection = useCallback((startTouch, endTouch) => {
    const dx = endTouch.clientX - startTouch.clientX;
    const dy = endTouch.clientY - startTouch.clientY;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }, []);

  // Touch start handler
  const handleTouchStart = useCallback((e) => {
    const touches = Array.from(e.touches);
    const state = gestureStateRef.current;
    
    state.touches = touches;
    state.startTime = Date.now();
    state.isGesturing = true;
    
    // Clear any existing long press timer
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
    
    // Handle single touch
    if (touches.length === 1) {
      const touch = touches[0];
      
      // Check for double tap
      if (enableDoubleTap) {
        const timeSinceLastTap = Date.now() - state.lastTapTime;
        if (timeSinceLastTap < doubleTapDelay) {
          onDoubleTap?.({
            type: 'doubletap',
            position: { x: touch.clientX, y: touch.clientY },
            target: e.target
          });
          state.lastTapTime = 0; // Reset to prevent triple tap
          return;
        }
      }
      
      // Set up long press detection
      if (enableLongPress) {
        state.longPressTimer = setTimeout(() => {
          if (state.isGesturing && state.touches.length === 1) {
            onLongPress?.({
              type: 'longpress',
              position: { x: touch.clientX, y: touch.clientY },
              target: e.target,
              duration: Date.now() - state.startTime
            });
          }
        }, longPressDelay);
      }
    }
    
    // Handle multi-touch (pinch)
    if (touches.length === 2 && enablePinch) {
      state.initialDistance = getDistance(touches[0], touches[1]);
      state.initialScale = 1;
      
      setGestureInfo(prev => ({
        ...prev,
        type: 'pinch',
        center: getCenter(touches)
      }));
    }
    
    // Prevent default to avoid scrolling during gestures
    if (touches.length > 1) {
      e.preventDefault();
    }
  }, [enableDoubleTap, enableLongPress, enablePinch, doubleTapDelay, longPressDelay, getDistance, getCenter, onDoubleTap, onLongPress]);

  // Touch move handler
  const handleTouchMove = useCallback((e) => {
    const touches = Array.from(e.touches);
    const state = gestureStateRef.current;
    
    if (!state.isGesturing) return;
    
    // Clear long press timer on movement
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
    
    // Handle single touch (swipe)
    if (touches.length === 1 && state.touches.length === 1 && enableSwipe) {
      const startTouch = state.touches[0];
      const currentTouch = touches[0];
      
      const dx = currentTouch.clientX - startTouch.clientX;
      const dy = currentTouch.clientY - startTouch.clientY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > 10) { // Minimum movement to register as swipe
        const direction = getSwipeDirection(startTouch, currentTouch);
        
        setGestureInfo(prev => ({
          ...prev,
          type: 'swipe',
          direction,
          distance,
          center: { x: currentTouch.clientX, y: currentTouch.clientY }
        }));
      }
    }
    
    // Handle multi-touch (pinch)
    if (touches.length === 2 && state.touches.length === 2 && enablePinch) {
      const currentDistance = getDistance(touches[0], touches[1]);
      const scale = currentDistance / state.initialDistance;
      const center = getCenter(touches);
      
      setGestureInfo(prev => ({
        ...prev,
        type: 'pinch',
        scale,
        center
      }));
      
      // Trigger pinch callback if threshold is met
      if (Math.abs(scale - 1) > pinchThreshold) {
        onPinch?.({
          type: 'pinch',
          scale,
          center,
          direction: scale > 1 ? 'out' : 'in',
          target: e.target
        });
      }
    }
    
    // Prevent default scrolling during multi-touch
    if (touches.length > 1) {
      e.preventDefault();
    }
  }, [enableSwipe, enablePinch, swipeThreshold, pinchThreshold, getDistance, getCenter, getSwipeDirection, onPinch]);

  // Touch end handler
  const handleTouchEnd = useCallback((e) => {
    const state = gestureStateRef.current;
    const remainingTouches = Array.from(e.touches);
    
    // Clear long press timer
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
    }
    
    // Handle gesture completion
    if (remainingTouches.length === 0) {
      const duration = Date.now() - state.startTime;
      const wasQuickTap = duration < 200;
      
      // Handle swipe
      if (gestureInfo.type === 'swipe' && gestureInfo.distance > swipeThreshold) {
        onSwipe?.({
          type: 'swipe',
          direction: gestureInfo.direction,
          distance: gestureInfo.distance,
          duration,
          velocity: gestureInfo.distance / duration,
          target: e.target
        });
      }
      
      // Handle tap (only if no other gesture was detected)
      if (enableTap && wasQuickTap && state.touches.length === 1 && 
          (!gestureInfo.type || gestureInfo.distance < 10)) {
        const touch = state.touches[0];
        state.lastTapTime = Date.now();
        
        onTap?.({
          type: 'tap',
          position: { x: touch.clientX, y: touch.clientY },
          target: e.target
        });
      }
      
      // Reset state
      state.isGesturing = false;
      state.touches = [];
      setGestureInfo({
        type: null,
        direction: null,
        distance: 0,
        scale: 1,
        center: { x: 0, y: 0 }
      });
    }
  }, [enableTap, swipeThreshold, gestureInfo, onSwipe, onTap]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const state = gestureStateRef.current;
      if (state.longPressTimer) {
        clearTimeout(state.longPressTimer);
      }
    };
  }, []);

  return (
    <div
      ref={elementRef}
      className={`touch-manipulation select-none ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        touchAction: enablePinch ? 'none' : 'pan-x pan-y',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
      {...props}
    >
      {children}
      
      {/* Visual feedback for active gestures */}
      {gestureInfo.type && (
        <div className="fixed inset-0 pointer-events-none z-50">
          {gestureInfo.type === 'swipe' && gestureInfo.center.x && gestureInfo.center.y && (
            <div
              className="absolute bg-blue-500 bg-opacity-20 rounded-full"
              style={{
                left: Math.max(0, gestureInfo.center.x - 25),
                top: Math.max(0, gestureInfo.center.y - 25),
                width: 50,
                height: 50,
                transform: `scale(${Math.min(Math.max(gestureInfo.distance / 100, 0.1), 2)})`
              }}
            />
          )}
          
          {gestureInfo.type === 'pinch' && gestureInfo.center.x && gestureInfo.center.y && (
            <div
              className="absolute bg-green-500 bg-opacity-20 rounded-full border-2 border-green-500 border-opacity-50"
              style={{
                left: Math.max(0, gestureInfo.center.x - 30),
                top: Math.max(0, gestureInfo.center.y - 30),
                width: 60,
                height: 60,
                transform: `scale(${Math.max(gestureInfo.scale || 1, 0.1)})`
              }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default GestureHandler;