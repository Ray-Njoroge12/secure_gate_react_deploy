import { useState, useCallback, useMemo } from 'react';

/**
 * Custom hook for managing pagination state and logic
 * @param {Object} config - Configuration object
 * @param {number} config.initialPage - Initial page number (default: 1)
 * @param {number} config.initialPageSize - Initial page size (default: 10)
 * @param {number} config.totalItems - Total number of items
 * @param {Function} config.onPageChange - Callback when page changes
 * @param {Function} config.onPageSizeChange - Callback when page size changes
 * @returns {Object} Pagination state and handlers
 */
export const usePagination = ({
  initialPage = 1,
  initialPageSize = 10,
  totalItems = 0,
  onPageChange = null,
  onPageSizeChange = null
}) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / pageSize);
  }, [totalItems, pageSize]);

  // Calculate pagination info
  const paginationInfo = useMemo(() => {
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    return {
      currentPage,
      pageSize,
      totalPages,
      totalItems,
      startItem,
      endItem,
      hasNextPage,
      hasPrevPage,
      isFirstPage: currentPage === 1,
      isLastPage: currentPage === totalPages
    };
  }, [currentPage, pageSize, totalPages, totalItems]);

  // Go to specific page
  const goToPage = useCallback((page) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    if (validPage !== currentPage) {
      setCurrentPage(validPage);
      if (onPageChange) {
        onPageChange(validPage, pageSize);
      }
    }
  }, [currentPage, totalPages, pageSize, onPageChange]);

  // Go to next page
  const nextPage = useCallback(() => {
    if (paginationInfo.hasNextPage) {
      goToPage(currentPage + 1);
    }
  }, [paginationInfo.hasNextPage, currentPage, goToPage]);

  // Go to previous page
  const prevPage = useCallback(() => {
    if (paginationInfo.hasPrevPage) {
      goToPage(currentPage - 1);
    }
  }, [paginationInfo.hasPrevPage, currentPage, goToPage]);

  // Go to first page
  const firstPage = useCallback(() => {
    goToPage(1);
  }, [goToPage]);

  // Go to last page
  const lastPage = useCallback(() => {
    goToPage(totalPages);
  }, [goToPage, totalPages]);

  // Change page size
  const changePageSize = useCallback((newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when page size changes

    if (onPageSizeChange) {
      onPageSizeChange(newPageSize);
    }
    if (onPageChange) {
      onPageChange(1, newPageSize);
    }
  }, [onPageSizeChange, onPageChange]);

  // Reset pagination
  const reset = useCallback(() => {
    setCurrentPage(initialPage);
    setPageSize(initialPageSize);
  }, [initialPage, initialPageSize]);

  // Get page numbers for display (with ellipsis for large page counts)
  const getPageNumbers = useCallback((maxVisible = 7) => {
    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    const halfVisible = Math.floor(maxVisible / 2);

    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);

    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }

    // Add first page and ellipsis if needed
    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push('...');
      }
    }

    // Add visible pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis and last page if needed
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  return {
    // State
    currentPage,
    pageSize,
    totalPages,
    totalItems,

    // Info
    ...paginationInfo,

    // Actions
    goToPage,
    nextPage,
    prevPage,
    firstPage,
    lastPage,
    changePageSize,
    reset,
    getPageNumbers
  };
};

/**
 * Hook for managing table pagination with sorting
 * @param {Object} config - Configuration object
 * @param {Array} config.data - The data array to paginate
 * @param {Object} config.initialSort - Initial sort configuration { field, direction }
 * @param {number} config.initialPageSize - Initial page size
 * @returns {Object} Paginated and sorted data with controls
 */
export const useTablePagination = ({
  data = [],
  initialSort = { field: null, direction: 'asc' },
  initialPageSize = 10
}) => {
  const [sortConfig, setSortConfig] = useState(initialSort);

  const pagination = usePagination({
    initialPageSize,
    totalItems: data.length
  });

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.field) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  // Paginate sorted data
  const paginatedData = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize;
    const endIndex = startIndex + pagination.pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, pagination.currentPage, pagination.pageSize]);

  // Handle sort
  const handleSort = useCallback((field) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  return {
    ...pagination,
    data: paginatedData,
    allData: sortedData,
    sortConfig,
    handleSort,
    totalItems: data.length
  };
};

export default usePagination;
