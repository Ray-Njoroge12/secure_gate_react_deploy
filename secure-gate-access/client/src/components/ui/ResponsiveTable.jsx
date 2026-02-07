/**
 * @fileoverview ResponsiveTable component for Secure Gate Access
 * @description A comprehensive responsive table component with mobile-first design,
 * column priority system, virtual scrolling, and accessibility features
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import logger from 'utils/logger';
import { useCurrentBreakpoint } from '../../utils/responsive';

/**
 * ResponsiveTable component with mobile-first design and advanced features
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Array} props.columns - Column configuration array
 * @param {Array} props.data - Data array to display
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onRowClick - Row click handler
 * @param {Function} props.onSort - Sort handler
 * @param {string} props.sortBy - Current sort column
 * @param {string} props.sortDirection - Sort direction ('asc' or 'desc')
 * @param {boolean} props.enableVirtualScrolling - Enable virtual scrolling for large datasets
 * @param {number} props.virtualScrollThreshold - Minimum items to enable virtual scrolling
 * @param {number} props.rowHeight - Height of each row for virtual scrolling
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.emptyState - Custom empty state configuration
 * @returns {JSX.Element} ResponsiveTable component
 * 
 * @example
 * <ResponsiveTable
 *   columns={[
 *     { key: 'name', label: 'Name', priority: 1, sortable: true },
 *     { key: 'email', label: 'Email', priority: 2, sortable: true },
 *     { key: 'status', label: 'Status', priority: 3, render: (value) => <Badge>{value}</Badge> }
 *   ]}
 *   data={visitors}
 *   onRowClick={(row) => logger.debug('Clicked:', row)}
 *   onSort={(column, direction) => handleSort(column, direction)}
 * />
 */
const ResponsiveTable = memo(({
  columns = [],
  data = [],
  loading = false,
  onRowClick,
  onSort,
  sortBy,
  sortDirection = 'asc',
  enableVirtualScrolling = true,
  virtualScrollThreshold = 100,
  rowHeight = 48,
  className = '',
  emptyState = {
    title: 'No data available',
    description: 'There are no items to display at this time.',
    icon: null
  },
  ...props
}) => {
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [isMobile, setIsMobile] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const tableRef = useRef(null);
  const containerRef = useRef(null);
  const currentBreakpoint = useCurrentBreakpoint();

  // Determine if we should show mobile view
  useEffect(() => {
    setIsMobile(['xs', 'sm'].includes(currentBreakpoint));
  }, [currentBreakpoint]);

  // Calculate visible columns based on screen size and priority
  useEffect(() => {
    if (isMobile) {
      // On mobile, show only high priority columns (priority 1-2)
      setVisibleColumns(columns.filter(col => col.priority <= 2));
    } else if (currentBreakpoint === 'md') {
      // On tablet, show priority 1-3 columns
      setVisibleColumns(columns.filter(col => col.priority <= 3));
    } else {
      // On desktop, show all columns
      setVisibleColumns(columns);
    }
  }, [columns, isMobile, currentBreakpoint]);

  // Virtual scrolling calculations
  const virtualScrollData = useMemo(() => {
    if (!enableVirtualScrolling || !data || data.length < virtualScrollThreshold) {
      return { startIndex: 0, endIndex: data?.length || 0, visibleData: data || [] };
    }

    const startIndex = Math.floor(scrollTop / rowHeight);
    const endIndex = Math.min(startIndex + Math.ceil(containerHeight / rowHeight) + 1, data.length);
    const visibleData = data.slice(startIndex, endIndex);

    return { startIndex, endIndex, visibleData };
  }, [data, scrollTop, containerHeight, rowHeight, enableVirtualScrolling, virtualScrollThreshold]);

  // Handle scroll for virtual scrolling
  const handleScroll = (e) => {
    if (enableVirtualScrolling && data && data.length >= virtualScrollThreshold) {
      setScrollTop(e.target.scrollTop);
    }
  };

  // Update container height
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Handle sort
  const handleSort = (columnKey) => {
    if (onSort) {
      const newDirection = sortBy === columnKey && sortDirection === 'asc' ? 'desc' : 'asc';
      onSort(columnKey, newDirection);
    }
  };

  // Render cell content
  const renderCell = (item, column) => {
    if (column.render) {
      return column.render(item[column.key], item, column);
    }
    return item[column.key] || '-';
  };

  // Render sort icon
  const renderSortIcon = (columnKey) => {
    if (!onSort || !columns.find(col => col.key === columnKey)?.sortable) return null;
    
    if (sortBy === columnKey) {
      return sortDirection === 'asc' ? '↑' : '↓';
    }
    return '↕';
  };

  // Loading state
  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 ${className}`}>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-slate-400">Loading data...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0 || !columns || columns.length === 0) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 ${className}`}>
        <div className="p-8 text-center">
          {emptyState.icon && (
            <div className="mb-4 text-gray-600 dark:text-slate-400">
              {emptyState.icon}
            </div>
          )}
          <h3 className="text-lg font-medium text-gray-900 dark:text-slate-200 mb-2">
            {emptyState.title}
          </h3>
          <p className="text-gray-600 dark:text-slate-400">
            {emptyState.description}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 ${className}`} {...props}>
      {/* Desktop/Tablet Table View */}
      {!isMobile && (
        <div className="overflow-x-auto">
          <table className="w-full" ref={tableRef}>
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700">
                {visibleColumns.map((column) => (
                  <th
                    key={column.key}
                    className={`
                      px-4 py-3 text-left text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider
                      ${column.sortable ? 'cursor-pointer hover:text-gray-900 dark:hover:text-slate-200 select-none' : ''}
                      ${column.className || ''}
                    `}
                    onClick={() => column.sortable && handleSort(column.key)}
                    aria-sort={sortBy === column.key ? sortDirection : 'none'}
                  >
                    <div className="flex items-center gap-2">
                      <span>{column.label}</span>
                      {column.sortable && (
                        <span className="text-gray-500 dark:text-slate-300" aria-hidden="true">
                          {renderSortIcon(column.key)}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              className="divide-y divide-gray-200 dark:divide-slate-700"
              ref={containerRef}
              onScroll={handleScroll}
              style={{
                height: enableVirtualScrolling && data && data.length >= virtualScrollThreshold 
                  ? `${data.length * rowHeight}px` 
                  : 'auto',
                overflow: enableVirtualScrolling && data && data.length >= virtualScrollThreshold 
                  ? 'auto' 
                  : 'visible'
              }}
            >
              {virtualScrollData.visibleData.map((item, index) => (
                <tr
                  key={item.id || index}
                  className={`
                    hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer
                    ${onRowClick ? 'hover:bg-gray-50 dark:hover:bg-slate-700/50' : ''}
                  `}
                  onClick={() => onRowClick?.(item)}
                  style={{
                    transform: enableVirtualScrolling && data && data.length >= virtualScrollThreshold
                      ? `translateY(${virtualScrollData.startIndex * rowHeight}px)`
                      : 'none'
                  }}
                >
                  {visibleColumns.map((column) => (
                    <td
                      key={column.key}
                      className={`
                        px-4 py-3 text-sm text-gray-900 dark:text-slate-200
                        ${column.className || ''}
                      `}
                    >
                      {renderCell(item, column)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Card View */}
      {isMobile && (
        <div className="space-y-3 p-4">
          {(data || []).map((item, index) => (
            <div
              key={item.id || index}
              className={`
                bg-gray-50 dark:bg-slate-700/30 rounded-lg p-4 border border-gray-200 dark:border-slate-600
                ${onRowClick ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors' : ''}
              `}
              onClick={() => onRowClick?.(item)}
            >
              <div className="space-y-3">
                {visibleColumns.map((column) => (
                  <div key={column.key} className="flex justify-between items-start">
                    <span className="text-xs font-medium text-gray-600 dark:text-slate-400 uppercase tracking-wider min-w-0 flex-shrink-0 mr-2">
                      {column.label}
                    </span>
                    <div className="text-sm text-gray-900 dark:text-slate-200 text-right max-w-[60%] break-words min-w-0">
                      {renderCell(item, column)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Column priority indicator for mobile */}
      {isMobile && columns.some(col => col.priority > 2) && (
        <div className="px-4 py-2 border-t border-gray-200 dark:border-slate-700">
          <p className="text-xs text-gray-500 dark:text-slate-400 text-center">
            Showing {visibleColumns.length} of {columns.length} columns. 
            Switch to desktop view to see all columns.
          </p>
        </div>
      )}
    </div>
  );
});

ResponsiveTable.displayName = 'ResponsiveTable';

export default ResponsiveTable;
