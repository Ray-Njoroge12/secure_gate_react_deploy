// client/src/components/LazyRoute.jsx
import React, { Suspense, memo } from 'react';
import { Loading, ErrorBoundary } from './ui';

const LazyRoute = memo(({ 
  component: Component, 
  fallback = null, 
  errorBoundary = true,
  ...props 
}) => {
  const defaultFallback = (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loading size="lg" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );

  const LoadingSuspense = () => (
    <Suspense fallback={fallback || defaultFallback}>
      <Component {...props} />
    </Suspense>
  );

  if (errorBoundary) {
    return (
      <ErrorBoundary>
        <LoadingSuspense />
      </ErrorBoundary>
    );
  }

  return <LoadingSuspense />;
});

LazyRoute.displayName = 'LazyRoute';

export default LazyRoute;