// client/src/components/ui/OptimizedImage.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLazyImage } from '../../utils/performanceOptimization';

const OptimizedImage = ({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder = null,
  fallback = null,
  quality = 80,
  format = 'auto',
  sizes = '100vw',
  loading = 'lazy',
  onLoad,
  onError,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // Use lazy loading hook
  const { imgProps: lazyProps } = useLazyImage(src, {
    threshold: 0.1,
    style: { width, height }
  });

  // Generate optimized image URL
  const generateOptimizedUrl = useCallback((originalSrc, options = {}) => {
    if (!originalSrc || typeof originalSrc !== 'string') return originalSrc;

    // If it's already an optimized URL or external URL, return as is
    if (originalSrc.includes('data:') || originalSrc.startsWith('http')) {
      return originalSrc;
    }

    // For local images, you could integrate with an image optimization service
    // For now, we'll return the original src
    return originalSrc;
  }, []);

  // Handle image load
  const handleLoad = useCallback((e) => {
    setIsLoaded(true);
    setHasError(false);
    onLoad?.(e);
  }, [onLoad]);

  // Handle image error
  const handleError = useCallback((e) => {
    setHasError(true);
    setIsLoaded(false);
    onError?.(e);
  }, [onError]);

  // Set up intersection observer for lazy loading
  useEffect(() => {
    if (loading !== 'lazy' || !imgRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    observer.observe(imgRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loading]);

  // Update current source when in view
  useEffect(() => {
    if (isInView && src) {
      const optimizedSrc = generateOptimizedUrl(src, { quality, format, width, height });
      setCurrentSrc(optimizedSrc);
    }
  }, [isInView, src, generateOptimizedUrl, quality, format, width, height]);

  // Preload critical images
  useEffect(() => {
    if (loading === 'eager' && src) {
      const optimizedSrc = generateOptimizedUrl(src, { quality, format, width, height });
      setCurrentSrc(optimizedSrc);
    }
  }, [loading, src, generateOptimizedUrl, quality, format, width, height]);

  // Render placeholder while loading
  if (!isInView && loading === 'lazy') {
    return (
      <div
        ref={imgRef}
        className={`bg-gray-200 animate-pulse ${className}`}
        style={{ width, height }}
        {...props}
      >
        {placeholder || (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </div>
    );
  }

  // Render error state
  if (hasError && fallback) {
    return (
      <div
        className={`bg-gray-100 flex items-center justify-center ${className}`}
        style={{ width, height }}
        {...props}
      >
        {fallback}
      </div>
    );
  }

  // Render the actual image
  return (
    <img
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      className={`transition-opacity duration-300 ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      loading={loading}
      onLoad={handleLoad}
      onError={handleError}
      sizes={sizes}
      {...props}
    />
  );
};

// Higher-order component for image optimization
export const withImageOptimization = (WrappedComponent) => {
  return React.memo((props) => {
    const { src, ...otherProps } = props;
    
    return (
      <OptimizedImage
        src={src}
        {...otherProps}
      />
    );
  });
};

// Hook for image preloading
export const useImagePreloader = () => {
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [loadingImages, setLoadingImages] = useState(new Set());

  const preloadImage = useCallback((src) => {
    if (loadedImages.has(src) || loadingImages.has(src)) {
      return Promise.resolve();
    }

    setLoadingImages(prev => new Set(prev).add(src));

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        setLoadedImages(prev => new Set(prev).add(src));
        setLoadingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(src);
          return newSet;
        });
        resolve();
      };
      img.onerror = () => {
        setLoadingImages(prev => {
          const newSet = new Set(prev);
          newSet.delete(src);
          return newSet;
        });
        reject(new Error(`Failed to load image: ${src}`));
      };
      img.src = src;
    });
  }, [loadedImages, loadingImages]);

  const preloadImages = useCallback(async (srcs) => {
    const promises = srcs.map(src => preloadImage(src));
    return Promise.allSettled(promises);
  }, [preloadImage]);

  return {
    preloadImage,
    preloadImages,
    loadedImages: Array.from(loadedImages),
    loadingImages: Array.from(loadingImages),
    isImageLoaded: (src) => loadedImages.has(src),
    isImageLoading: (src) => loadingImages.has(src)
  };
};

export default OptimizedImage;
