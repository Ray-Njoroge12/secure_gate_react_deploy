import React from 'react';
import { Button } from './ui';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  showFirstLast = true,
  showPrevNext = true,
  maxVisiblePages = 5,
  className = ""
}) => {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const pages = [];
    const halfVisible = Math.floor(maxVisiblePages / 2);
    
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, currentPage + halfVisible);
    
    // Adjust if we're near the beginning or end
    if (endPage - startPage + 1 < maxVisiblePages) {
      if (startPage === 1) {
        endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      } else {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
    }
    
    // Add first page and ellipsis if needed
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push('ellipsis-start');
      }
    }
    
    // Add visible pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    // Add ellipsis and last page if needed
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push('ellipsis-end');
      }
      pages.push(totalPages);
    }
    
    return pages;
  };

  const visiblePages = getVisiblePages();

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange?.(page);
    }
  };

  return (
    <div className={`flex items-center justify-center space-x-1 ${className}`}>
      {/* First Page */}
      {showFirstLast && currentPage > 1 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(1)}
          className="px-2"
          aria-label="Go to first page"
        >
          1
        </Button>
      )}

      {/* Previous Page */}
      {showPrevNext && currentPage > 1 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          className="px-2"
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Page Numbers */}
      {visiblePages.map((page, index) => {
        if (page === 'ellipsis-start' || page === 'ellipsis-end') {
          return (
            <span
              key={`ellipsis-${index}`}
              className="px-2 py-1 text-gray-500"
            >
              <MoreHorizontal className="h-4 w-4" />
            </span>
          );
        }

        return (
          <Button
            key={page}
            variant={page === currentPage ? "primary" : "outline"}
            size="sm"
            onClick={() => handlePageChange(page)}
            className="px-3"
            aria-label={`Go to page ${page}`}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </Button>
        );
      })}

      {/* Next Page */}
      {showPrevNext && currentPage < totalPages && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          className="px-2"
          aria-label="Go to next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* Last Page */}
      {showFirstLast && currentPage < totalPages && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(totalPages)}
          className="px-2"
          aria-label="Go to last page"
        >
          {totalPages}
        </Button>
      )}
    </div>
  );
};

export default Pagination;

