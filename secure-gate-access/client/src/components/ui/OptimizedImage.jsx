import React, { useState, useCallback, memo } from 'react';

import LoadingStates from './LoadingStates';

const OptimizedImage = memo(({
  src,
  alt,
  className = '',
  placeholder = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjNmNGY2Ii8vPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZTwvdGV4dD48L3N2Zz4=',
  fallback = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZWY0NDQ0Ii8vPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IndoaXRlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+RXJyb3I8L3RleHQ+PC9zdmc+',
  loading = 'lazy',
  sizes,
  onLoad,
  onError,
  ...props
}) => {
  const [imageState, setImageState] = useState({
    loading: true,
    error: false,
    loaded: false
  });

  const handleLoad = useCallback((e) => {
    setImageState({
      loading: false,
      error: false,
      loaded: true
    });
    onLoad?.(e);
  }, [onLoad]);

  const handleError = useCallback((e) => {
    setImageState({
      loading: false,
      error: true,
      loaded: false
    });
    onError?.(e);
  }, [onError]);

  const imageSrc = imageState.error ? fallback : src;

  return (
    <div className={`relative overflow-hidden ${className}`} {...props}>
      {imageState.loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
          <LoadingStates size="sm" />
        </div>
      )}
      
      <img
        src={imageSrc}
        alt={alt}
        loading={loading}
        sizes={sizes}
        onLoad={handleLoad}
        onError={handleError}
        className={`
          w-full h-full object-cover transition-opacity duration-300
          ${imageState.loaded ? 'opacity-100' : 'opacity-0'}
          ${imageState.error ? 'opacity-50' : ''}
        `}
        style={{
          display: imageState.loading ? 'none' : 'block'
        }}
      />
      
      {imageState.loading && (
        <img
          src={placeholder}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-50"
          aria-hidden="true"
        />
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;