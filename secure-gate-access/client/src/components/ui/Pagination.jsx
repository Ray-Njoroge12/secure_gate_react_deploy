/**
 * @fileoverview Pagination component for Secure Gate Access
 * @description Accessible pagination component with keyboard navigation
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { memo, useCallback } from 'react';

import Icon from './Icon';

/**
 * Pagination component with accessibility features
 * 
 * @component
 * @param {Object} props - Component props
 * @param {number} props.currentPage - Current active page
 * @param {number} props.totalPages - Total number of pages
 * @param {Function} props.onPageChange - Function called when page changes
 * @param {number} props.maxVisiblePages - Maximum number of page buttons to show
 * @param {boolean} props.showFirstLast - Whether to show first/last page buttons
 * @param {boolean} props.showPrevNext - Whether to show previous/next buttons
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.size - Size variant ('sm', 'md', 'lg')
 * @returns {JSX.Element} Pagination component
 * 
 * @example
 * <Pagination
 *   currentPage={2}
 *   totalPages={10}
 *   onPageChange={setPage}
 *   maxVisiblePages={5}
 *   showFirstLast={true}
 *   showPrevNext={true}
 * />
 */
const Pagination = memo(({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  maxVisiblePages = 5,
  showFirstLast = true,
  showPrevNext = true,
  className = '',
  size = 'md',
  ...props
}) => {
  // Size variants - ensuring minimum 44x44px touch targets on mobile
  const sizeClasses = {
    sm: {
      button: 'px-3 py-2 min-w-[40px] min-h-[40px] text-xs',
      icon: 'w-4 h-4'
    },
    md: {
      button: 'px-3 py-2 min-w-[44px] min-h-[44px] text-sm',
      icon: 'w-5 h-5'
    },
    lg: {
      button: 'px-4 py-3 min-w-[48px] min-h-[48px] text-base',
      icon: 'w-5 h-5'
    }
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  // Calculate visible page range
  const getVisiblePages = useCallback(() => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    let end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages, maxVisiblePages]);

  // Handle page change
  const handlePageChange = useCallback((page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  }, [currentPage, totalPages, onPageChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e, page) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        handlePageChange(page);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (page > 1) {
          handlePageChange(page - 1);
        }
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (page < totalPages) {
          handlePageChange(page + 1);
        }
        break;
      case 'Home':
        e.preventDefault();
        handlePageChange(1);
        break;
      case 'End':
        e.preventDefault();
        handlePageChange(totalPages);
        break;
    }
  }, [handlePageChange, totalPages]);

  // Don't render if only one page
  if (totalPages <= 1) return null;

  const visiblePages = getVisiblePages();
  const showStartEllipsis = visiblePages[0] > 2;
  const showEndEllipsis = visiblePages[visiblePages.length - 1] < totalPages - 1;

  return (
    <nav
      className={`flex items-center justify-center space-x-1 ${className}`}
      role="navigation"
      aria-label="Pagination Navigation"
      {...props}
    >
      {/* First Page Button */}
      {showFirstLast && currentPage > 1 && (
        <button
          onClick={() => handlePageChange(1)}
          onKeyDown={(e) => handleKeyDown(e, 1)}
          className={`${currentSize.button} flex items-center gap-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500`}
          aria-label="Go to first page"
        >
          <Icon name="chevron-left" className={currentSize.icon} />
          <Icon name="chevron-left" className={currentSize.icon} />
        </button>
      )}

      {/* Previous Button */}
      {showPrevNext && currentPage > 1 && (
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          onKeyDown={(e) => handleKeyDown(e, currentPage - 1)}
          className={`${currentSize.button} flex items-center gap-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500`}
          aria-label="Go to previous page"
        >
          <Icon name="chevron-left" className={currentSize.icon} />
          <span className="hidden sm:inline">Previous</span>
        </button>
      )}

      {/* Start Ellipsis */}
      {showStartEllipsis && (
        <span className={`${currentSize.button} text-gray-400 dark:text-slate-400`} aria-hidden="true">
          <Icon name="more-horizontal" className={currentSize.icon} />
        </span>
      )}

      {/* Page Numbers */}
      {visiblePages.map((page) => (
        <button
          key={page}
          onClick={() => handlePageChange(page)}
          onKeyDown={(e) => handleKeyDown(e, page)}
          className={`${currentSize.button} ${
            page === currentPage
              ? 'bg-brand-500 text-white'
              : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200'
          } rounded transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500`}
          aria-label={`Go to page ${page}`}
          aria-current={page === currentPage ? 'page' : undefined}
        >
          {page}
        </button>
      ))}

      {/* End Ellipsis */}
      {showEndEllipsis && (
        <span className={`${currentSize.button} text-gray-400 dark:text-slate-400`} aria-hidden="true">
          <Icon name="more-horizontal" className={currentSize.icon} />
        </span>
      )}

      {/* Next Button */}
      {showPrevNext && currentPage < totalPages && (
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          onKeyDown={(e) => handleKeyDown(e, currentPage + 1)}
          className={`${currentSize.button} flex items-center gap-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500`}
          aria-label="Go to next page"
        >
          <span className="hidden sm:inline">Next</span>
          <Icon name="chevron-right" className={currentSize.icon} />
        </button>
      )}

      {/* Last Page Button */}
      {showFirstLast && currentPage < totalPages && (
        <button
          onClick={() => handlePageChange(totalPages)}
          onKeyDown={(e) => handleKeyDown(e, totalPages)}
          className={`${currentSize.button} flex items-center gap-1 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500`}
          aria-label="Go to last page"
        >
          <Icon name="chevron-right" className={currentSize.icon} />
          <Icon name="chevron-right" className={currentSize.icon} />
        </button>
      )}
    </nav>
  );
});

Pagination.displayName = 'Pagination';

export default Pagination;



