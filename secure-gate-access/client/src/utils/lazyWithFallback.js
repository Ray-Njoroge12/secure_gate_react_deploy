import React, { Suspense } from 'react';
import { Skeleton } from '../components/ui';
import logger from './logger';

/**
 * Wrapper for lazy loaded components with automatic fallback
 * @param {React.LazyExoticComponent} Component - The lazy loaded component
 * @param {React.Component} fallback - Optional custom fallback component
 * @returns {React.Component} Wrapped component with Suspense
 */
export function withLazyLoading(Component, fallback = null) {
  return function LazyWrapper(props) {
    const defaultFallback = (
      <div className="p-4">
        <Skeleton className="h-8 w-full mb-4" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );

    return (
      <Suspense fallback={fallback || defaultFallback}>
        <Component {...props} />
      </Suspense>
    );
  };
}

/**
 * Create a lazy component with retry logic
 * @param {Function} importFn - The dynamic import function
 * @param {number} retries - Number of retries on failure
 * @returns {React.LazyExoticComponent} Lazy loaded component
 */
export function lazyWithRetry(importFn, retries = 3) {
  return React.lazy(() => {
    const retry = async (fn, retriesLeft = retries, interval = 1000) => {
      try {
        return await fn();
      } catch (error) {
        if (retriesLeft) {
          logger.warn(`Retrying lazy load... (${retriesLeft} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, interval));
          return retry(fn, retriesLeft - 1, interval * 2);
        }
        logger.error('Failed to lazy load component after retries:', error);
        throw error;
      }
    };
    return retry(importFn);
  });
}

/**
 * Preload a lazy component
 * @param {React.LazyExoticComponent} Component - The lazy component to preload
 */
export function preloadComponent(Component) {
  if (Component._payload && Component._payload._status === -1) {
    Component._payload._result();
  }
}

/**
 * HOC for code splitting route components
 * @param {Function} importFn - Dynamic import function
 * @returns {React.Component} Route component with lazy loading
 */
export function lazyRoute(importFn) {
  const LazyComponent = lazyWithRetry(importFn);
  
  return withLazyLoading(LazyComponent, (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    </div>
  ));
}

export default {
  withLazyLoading,
  lazyWithRetry,
  preloadComponent,
  lazyRoute
};
