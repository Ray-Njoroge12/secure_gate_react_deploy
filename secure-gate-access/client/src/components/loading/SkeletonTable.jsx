/**
 * @fileoverview SkeletonTable component for loading states
 * @description Animated skeleton loader for table data
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { memo } from 'react';

/**
 * Skeleton row component
 * @param {Object} props
 * @param {number} props.columns - Number of columns
 */
const SkeletonRow = memo(({ columns = 5 }) => (
  <tr className="animate-pulse">
    {Array.from({ length: columns }).map((_, index) => (
      <td key={index} className="px-4 py-3">
        <div 
          className="h-4 bg-gray-200 dark:bg-slate-700 rounded"
          style={{ width: `${60 + Math.random() * 30}%` }}
        />
      </td>
    ))}
  </tr>
));

SkeletonRow.displayName = 'SkeletonRow';

/**
 * SkeletonTable component for displaying loading state
 * 
 * @component
 * @param {Object} props
 * @param {number} [props.rows=5] - Number of skeleton rows
 * @param {number} [props.columns=5] - Number of columns
 * @param {boolean} [props.showHeader=true] - Whether to show header skeleton
 * @param {string} [props.className=''] - Additional CSS classes
 * @returns {JSX.Element} Skeleton table
 * 
 * @example
 * // Basic usage
 * {isLoading ? <SkeletonTable rows={10} columns={6} /> : <ActualTable />}
 */
const SkeletonTable = memo(({ 
  rows = 5, 
  columns = 5, 
  showHeader = true,
  className = '' 
}) => {
  return (
    <div className={`overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700 ${className}`}>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
        {showHeader && (
          <thead className="bg-gray-50 dark:bg-slate-800">
            <tr className="animate-pulse">
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="px-4 py-3 text-left">
                  <div className="h-4 bg-gray-300 dark:bg-slate-600 rounded w-24" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
          {Array.from({ length: rows }).map((_, index) => (
            <SkeletonRow key={index} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
});

SkeletonTable.displayName = 'SkeletonTable';

/**
 * SkeletonCard component for stats/metrics loading state
 */
export const SkeletonCard = memo(({ className = '' }) => (
  <div className={`animate-pulse p-4 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 ${className}`}>
    <div className="flex items-center justify-between mb-3">
      <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-24" />
      <div className="h-8 w-8 bg-gray-200 dark:bg-slate-700 rounded-full" />
    </div>
    <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-16 mb-2" />
    <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-32" />
  </div>
));

SkeletonCard.displayName = 'SkeletonCard';

/**
 * SkeletonStats component for dashboard stats grid
 * @param {Object} props
 * @param {number} [props.count=4] - Number of stat cards
 */
export const SkeletonStats = memo(({ count = 4, className = '' }) => (
  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCard key={index} />
    ))}
  </div>
));

SkeletonStats.displayName = 'SkeletonStats';

/**
 * SkeletonChart component for chart loading state
 */
export const SkeletonChart = memo(({ height = 300, className = '' }) => (
  <div 
    className={`animate-pulse rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 ${className}`}
    style={{ height }}
  >
    <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-32 mb-4" />
    <div className="flex items-end justify-between h-[calc(100%-40px)] gap-2">
      {Array.from({ length: 7 }).map((_, index) => (
        <div 
          key={index}
          className="bg-gray-200 dark:bg-slate-700 rounded-t flex-1"
          style={{ height: `${30 + Math.random() * 60}%` }}
        />
      ))}
    </div>
  </div>
));

SkeletonChart.displayName = 'SkeletonChart';

/**
 * SkeletonList component for list loading state
 */
export const SkeletonList = memo(({ items = 5, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="animate-pulse flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
        <div className="h-10 w-10 bg-gray-200 dark:bg-slate-700 rounded-full shrink-0" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
        </div>
        <div className="h-8 w-20 bg-gray-200 dark:bg-slate-700 rounded" />
      </div>
    ))}
  </div>
));

SkeletonList.displayName = 'SkeletonList';

export default SkeletonTable;
