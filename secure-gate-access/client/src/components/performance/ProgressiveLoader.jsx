/**
 * @fileoverview Progressive Loader Component
 * @description Provides progressive loading with skeleton screens for large datasets
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useIntersectionObserver } from '../../utils/performanceOptimization.js';
import performanceService from '../../services/performanceService.js';
import logger from '../../utils/logger.js';
import './ProgressiveLoader.css';
import Button from '../ui/Button';

/**
 * Skeleton Screen Component
 */
const SkeletonScreen = ({ type = 'default', count = 3, className = '' }) => {
  const skeletonTypes = {
    default: () => (
      <div className="skeleton-item">
        <div className="skeleton-avatar"></div>
        <div className="skeleton-content">
          <div className="skeleton-line skeleton-line-title"></div>
          <div className="skeleton-line skeleton-line-text"></div>
          <div className="skeleton-line skeleton-line-text short"></div>
        </div>
      </div>
    ),
    card: () => (
      <div className="skeleton-card">
        <div className="skeleton-image"></div>
        <div className="skeleton-card-content">
          <div className="skeleton-line skeleton-line-title"></div>
          <div className="skeleton-line skeleton-line-text"></div>
        </div>
      </div>
    ),
    table: () => (
      <div className="skeleton-table-row">
        <div className="skeleton-cell"></div>
        <div className="skeleton-cell"></div>
        <div className="skeleton-cell"></div>
        <div className="skeleton-cell"></div>
      </div>
    ),
    list: () => (
      <div className="skeleton-list-item">
        <div className="skeleton-icon"></div>
        <div className="skeleton-line skeleton-line-text"></div>
        <div className="skeleton-badge"></div>
      </div>
    )
  };

  const SkeletonItem = skeletonTypes[type] || skeletonTypes.default;

  return (
    <div className={`skeleton-container ${className}`}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonItem key={index} />
      ))}
    </div>
  );
};

/**
 * Progressive Loader Component
 */
const ProgressiveLoader = ({
  children,
  loadingComponent = null,
  errorComponent = null,
  emptyComponent = null,
  skeletonType = 'default',
  skeletonCount = 3,
  loadMore = null,
  hasMore = false,
  isLoading = false,
  error = null,
  data = [],
  threshold = 0.1,
  rootMargin = '100px',
  enableVirtualization = false,
  itemHeight = 100,
  containerHeight = 400,
  preloadCount = 5,
  className = ''
}) => {
  const [loadedItems, setLoadedItems] = useState([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingRef = useRef(false);
  const performanceRef = useRef({
    loadStartTime: null,
    itemsLoaded: 0,
    totalLoadTime: 0
  });

  // Intersection observer for infinite scrolling
  const { elementRef: loadMoreRef, isIntersecting } = useIntersectionObserver({
    threshold,
    rootMargin,
    triggerOnce: false
  });

  // Initialize loaded items
  useEffect(() => {
    if (data && data.length > 0) {
      const initialItems = enableVirtualization 
        ? data.slice(0, preloadCount)
        : data;
      setLoadedItems(initialItems);
      
      // Record performance metrics
      performanceRef.current.itemsLoaded = initialItems.length;
    }
  }, [data, enableVirtualization, preloadCount]);

  // Handle load more when intersection is detected
  useEffect(() => {
    if (isIntersecting && hasMore && !isLoading && !isLoadingMore && loadMore) {
      handleLoadMore();
    }
  }, [isIntersecting, hasMore, isLoading, isLoadingMore, loadMore]);

  /**
   * Handle loading more items
   */
  const handleLoadMore = async () => {
    if (loadingRef.current) return;
    
    loadingRef.current = true;
    setIsLoadingMore(true);
    performanceRef.current.loadStartTime = performance.now();

    try {
      await loadMore();
      
      // Record performance metrics
      const loadTime = performance.now() - performanceRef.current.loadStartTime;
      performanceRef.current.totalLoadTime += loadTime;
      
      performanceService.recordMetric('progressive_loading', {
        type: 'load_more',
        loadTime,
        itemsLoaded: data.length - performanceRef.current.itemsLoaded,
        totalItems: data.length,
        timestamp: Date.now()
      });
      
      performanceRef.current.itemsLoaded = data.length;
      
      logger.debug(`[PROGRESSIVE_LOADER] Loaded more items in ${loadTime.toFixed(2)}ms`);
    } catch (error) {
      logger.error('[PROGRESSIVE_LOADER] Failed to load more items:', error);
    } finally {
      setIsLoadingMore(false);
      loadingRef.current = false;
    }
  };

  /**
   * Virtual scrolling implementation
   */
  const virtualizedItems = useMemo(() => {
    if (!enableVirtualization) return data;
    
    // Simple virtualization - show items based on scroll position
    // In a real implementation, you'd calculate visible items based on scroll position
    return data.slice(0, loadedItems.length + preloadCount);
  }, [data, loadedItems, enableVirtualization, preloadCount]);

  /**
   * Render loading state
   */
  const renderLoading = () => {
    if (loadingComponent) {
      return loadingComponent;
    }
    
    return (
      <SkeletonScreen 
        type={skeletonType} 
        count={skeletonCount}
        className="progressive-loader-skeleton"
      />
    );
  };

  /**
   * Render error state
   */
  const renderError = () => {
    if (errorComponent) {
      return errorComponent;
    }
    
    return (
      <div className="progressive-loader-error">
        <div className="error-icon">⚠️</div>
        <h3>Failed to load content</h3>
        <p>{error?.message || 'An error occurred while loading data.'}</p>
        <Button 
          onClick={() => window.location.reload()}
          className="retry-button"
        >
          Retry
        </Button>
      </div>
    );
  };

  /**
   * Render empty state
   */
  const renderEmpty = () => {
    if (emptyComponent) {
      return emptyComponent;
    }
    
    return (
      <div className="progressive-loader-empty">
        <div className="empty-icon">📭</div>
        <h3>No items found</h3>
        <p>There are no items to display at this time.</p>
      </div>
    );
  };

  /**
   * Render load more indicator
   */
  const renderLoadMoreIndicator = () => {
    if (!hasMore) return null;
    
    return (
      <div ref={loadMoreRef} className="load-more-indicator">
        {isLoadingMore ? (
          <SkeletonScreen 
            type={skeletonType} 
            count={2}
            className="load-more-skeleton"
          />
        ) : (
          <div className="load-more-trigger">
            <span>Loading more...</span>
          </div>
        )}
      </div>
    );
  };

  // Handle different states
  if (error) {
    return renderError();
  }

  if (isLoading && (!data || data.length === 0)) {
    return renderLoading();
  }

  if (!isLoading && (!data || data.length === 0)) {
    return renderEmpty();
  }

  return (
    <div className={`progressive-loader ${className}`}>
      <div className="progressive-loader-content">
        {children}
      </div>
      {renderLoadMoreIndicator()}
    </div>
  );
};

/**
 * Progressive List Component
 * Specialized component for list-based progressive loading
 */
export const ProgressiveList = ({
  items = [],
  renderItem,
  loadMore,
  hasMore = false,
  isLoading = false,
  error = null,
  itemHeight = 100,
  enableVirtualization = false,
  className = ''
}) => {
  return (
    <ProgressiveLoader
      data={items}
      loadMore={loadMore}
      hasMore={hasMore}
      isLoading={isLoading}
      error={error}
      skeletonType="list"
      skeletonCount={5}
      enableVirtualization={enableVirtualization}
      itemHeight={itemHeight}
      className={`progressive-list ${className}`}
    >
      <div className="progressive-list-items">
        {items.map((item, index) => (
          <div key={item.id || index} className="progressive-list-item">
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </ProgressiveLoader>
  );
};

/**
 * Progressive Grid Component
 * Specialized component for grid-based progressive loading
 */
export const ProgressiveGrid = ({
  items = [],
  renderItem,
  loadMore,
  hasMore = false,
  isLoading = false,
  error = null,
  columns = 3,
  className = ''
}) => {
  return (
    <ProgressiveLoader
      data={items}
      loadMore={loadMore}
      hasMore={hasMore}
      isLoading={isLoading}
      error={error}
      skeletonType="card"
      skeletonCount={columns * 2}
      className={`progressive-grid ${className}`}
    >
      <div 
        className="progressive-grid-items"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: '1rem'
        }}
      >
        {items.map((item, index) => (
          <div key={item.id || index} className="progressive-grid-item">
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </ProgressiveLoader>
  );
};

/**
 * Progressive Table Component
 * Specialized component for table-based progressive loading
 */
export const ProgressiveTable = ({
  data = [],
  columns = [],
  loadMore,
  hasMore = false,
  isLoading = false,
  error = null,
  className = ''
}) => {
  return (
    <ProgressiveLoader
      data={data}
      loadMore={loadMore}
      hasMore={hasMore}
      isLoading={isLoading}
      error={error}
      skeletonType="table"
      skeletonCount={5}
      className={`progressive-table ${className}`}
    >
      <table className="progressive-table-element">
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={index}>{column.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={row.id || index}>
              {columns.map((column, colIndex) => (
                <td key={colIndex}>
                  {column.render ? column.render(row[column.key], row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ProgressiveLoader>
  );
};

export default ProgressiveLoader;
export { SkeletonScreen };