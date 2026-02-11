/**
 * @file usePullToRefresh.js
 * @description Touch-based pull-to-refresh hook for mobile data pages.
 * Attaches to a scrollable container and triggers a refresh callback
 * when the user pulls down from the top.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

const THRESHOLD = 80; // px to pull before triggering refresh
const MAX_PULL = 120; // max visual pull distance

export default function usePullToRefresh(onRefresh, { enabled = true } = {}) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e) => {
    if (!enabled || isRefreshing) return;
    const el = containerRef.current;
    // Only activate when scrolled to top
    if (el && el.scrollTop > 0) return;
    if (!el && window.scrollY > 0) return;

    startY.current = e.touches[0].clientY;
    pulling.current = false;
  }, [enabled, isRefreshing]);

  const handleTouchMove = useCallback((e) => {
    if (!enabled || isRefreshing) return;
    const el = containerRef.current;
    if (el && el.scrollTop > 0) return;
    if (!el && window.scrollY > 0) return;

    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;

    if (diff > 10) {
      pulling.current = true;
      setIsPulling(true);
      // Apply resistance curve
      const distance = Math.min(MAX_PULL, diff * 0.5);
      setPullDistance(distance);

      // Prevent default scroll when pulling
      if (diff > 20) {
        e.preventDefault();
      }
    }
  }, [enabled, isRefreshing]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current || isRefreshing) {
      setPullDistance(0);
      setIsPulling(false);
      return;
    }

    if (pullDistance >= THRESHOLD && onRefresh) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD * 0.5); // Hold at indicator position
      try {
        await onRefresh();
      } catch {
        // Caller handles errors
      } finally {
        setIsRefreshing(false);
      }
    }

    setPullDistance(0);
    setIsPulling(false);
    pulling.current = false;
  }, [pullDistance, onRefresh, isRefreshing]);

  useEffect(() => {
    if (!enabled) return;

    const target = containerRef.current || document;
    const options = { passive: false };

    target.addEventListener('touchstart', handleTouchStart, { passive: true });
    target.addEventListener('touchmove', handleTouchMove, options);
    target.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      target.removeEventListener('touchstart', handleTouchStart);
      target.removeEventListener('touchmove', handleTouchMove);
      target.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const progress = Math.min(1, pullDistance / THRESHOLD);

  return {
    containerRef,
    isPulling,
    isRefreshing,
    pullDistance,
    progress,
    PullToRefreshIndicator: () => (
      (isPulling || isRefreshing) ? (
        <div
          className="flex items-center justify-center overflow-hidden transition-all duration-200 ease-out"
          style={{ height: isPulling || isRefreshing ? `${Math.max(pullDistance, isRefreshing ? 40 : 0)}px` : '0px' }}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            {isRefreshing ? (
              <>
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Refreshing…</span>
              </>
            ) : progress >= 1 ? (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Release to refresh</span>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 transition-transform duration-150"
                  style={{ transform: `rotate(${progress * 180}deg)` }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span>Pull to refresh</span>
              </>
            )}
          </div>
        </div>
      ) : null
    ),
  };
}
