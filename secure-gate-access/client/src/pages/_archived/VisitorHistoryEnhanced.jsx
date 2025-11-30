/**
 * Enhanced Visitor History Page
 * 
 * Demonstrates the new loading states system with:
 * - Progressive loading
 * - Contextual loading messages
 * - Skeleton screens
 * - Performance monitoring
 * - Error handling
 */

import React, { useEffect, useState, useCallback } from "react";
import logger from 'utils/logger';
import { Button, SearchFilter, SearchResults, Pagination, ResponsiveTable } from "../../components/ui";
import { RefreshCw, Download, Filter, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useSearchData } from "../../hooks/useSearch";
import { useLoadingStates, LOADING_TYPES, LOADING_PRIORITIES } from "../../hooks/useLoadingStates";
import EnhancedLoading from "../../components/ui/EnhancedLoading";
import AdvancedSkeleton from "../../components/ui/AdvancedSkeleton";
import ProgressiveLoading from "../../components/ui/ProgressiveLoading";

// Utility function for masking sensitive data
function mask(value) {
  if (!value) return "";
  if (String(value).includes("@")) return `${value[0]}***${value.slice(-1)}`;
  const d = String(value).replace(/\D+/g, "");
  return d.length >= 4 ? `${d.slice(0, 2)}***${d.slice(-2)}` : "***";
}

// Status icon component
const StatusIcon = ({ status }) => {
  const iconProps = { className: "w-4 h-4" };
  
  switch (status) {
    case 'checked_in':
      return <CheckCircle {...iconProps} className="w-4 h-4 text-green-500" />;
    case 'checked_out':
      return <XCircle {...iconProps} className="w-4 h-4 text-gray-500" />;
    case 'pending':
      return <Clock {...iconProps} className="w-4 h-4 text-yellow-500" />;
    default:
      return <AlertCircle {...iconProps} className="w-4 h-4 text-red-500" />;
  }
};

// Status badge component
const StatusBadge = ({ status }) => {
  const baseClasses = "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium";
  
  const statusClasses = {
    checked_in: "bg-green-100 text-green-800",
    checked_out: "bg-gray-100 text-gray-800",
    pending: "bg-yellow-100 text-yellow-800",
    cancelled: "bg-red-100 text-red-800",
  };
  
  return (
    <span className={`${baseClasses} ${statusClasses[status] || statusClasses.cancelled}`}>
      <StatusIcon status={status} />
      {status || "Unknown"}
    </span>
  );
};

export default function VisitorHistoryEnhanced() {
  const [rows, setRows] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Enhanced loading states
  const {
    loadingState: dataLoading,
    startLoading: startDataLoading,
    completeLoading: completeDataLoading,
    handleError: handleDataError,
  } = useLoadingStates({
    type: LOADING_TYPES.INITIAL,
    priority: LOADING_PRIORITIES.HIGH,
    message: 'Loading visitor history...',
    showProgress: true,
    onComplete: (result) => {
      logger.debug('Data loading completed:', result);
      setLastRefresh(new Date());
    },
    onError: (error) => {
      logger.error('Data loading error:', error);
    },
  });

  const {
    loadingState: exportLoading,
    startLoading: startExportLoading,
    completeLoading: completeExportLoading,
    handleError: handleExportError,
  } = useLoadingStates({
    type: LOADING_TYPES.EXPORT,
    priority: LOADING_PRIORITIES.NORMAL,
    message: 'Exporting data...',
    showProgress: true,
  });

  // Search and filter configuration
  const searchFields = ['name', 'phone', 'email', 'status'];
  const filterFields = [
    { key: 'status', label: 'Status', type: 'select' },
    { key: 'check_in', label: 'Check-in Date', type: 'date' },
    { key: 'check_out', label: 'Check-out Date', type: 'date' }
  ];

  // Use search hook
  const {
    data: filteredRows,
    pagination,
    searchTerm,
    filters,
    setSearchTerm,
    setFilters,
    clearFilters,
    setPage,
    isSearching,
    hasFilters,
    hasResults
  } = useSearchData(rows, searchFields, filterFields, {
    enablePagination: true,
    pageSize: 10
  });

  // Fetch visitor data with enhanced loading
  const fetchVisitorData = useCallback(async (showProgress = true) => {
    try {
      if (showProgress) {
        startDataLoading('Loading visitor history...');
      }

      // Use httpOnly cookies for authentication
      const response = await fetch('/api/visitors', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      
      if (json?.success) {
        setRows(json.data || []);
        completeDataLoading({ success: true, message: 'Visitor history loaded successfully' });
      } else {
        throw new Error(json.message || 'Failed to load visitor history');
      }
    } catch (error) {
      handleDataError(error, 'Failed to load visitor history');
    }
  }, [startDataLoading, completeDataLoading, handleDataError]);

  // Export functionality with loading states
  const handleExport = useCallback(async () => {
    try {
      startExportLoading('Preparing export...');

      // Simulate export processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const headers = columns.map(col => col.label);
      const tableData = filteredRows.map(row => 
        columns.map(col => {
          const value = col.render ? col.render(row[col.key], row, col) : row[col.key];
          return typeof value === 'string' ? value : value?.props?.children || value;
        })
      );
      
      const csvContent = [
        headers.join(','),
        ...tableData.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `visitor-history-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      completeExportLoading({ success: true, message: 'Export completed successfully' });
    } catch (error) {
      handleExportError(error, 'Export failed');
    }
  }, [filteredRows, startExportLoading, completeExportLoading, handleExportError]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + R to refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        if (!dataLoading.isActive) {
          fetchVisitorData();
        }
      }
      // Ctrl/Cmd + E to export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        if (!exportLoading.isActive) {
          handleExport();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dataLoading.isActive, exportLoading.isActive, fetchVisitorData, handleExport]);

  // Initial data load
  useEffect(() => {
    fetchVisitorData();
    
    // Set up auto-refresh
    const interval = setInterval(() => {
      fetchVisitorData(false); // Silent refresh
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [fetchVisitorData]);

  // Table columns configuration
  const columns = [
    {
      key: 'name',
      label: 'Name',
      priority: 1,
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-slate-600">
              {(row.name || row.phone || 'U')[0].toUpperCase()}
            </span>
          </div>
          <span className="font-medium">
            {row.name || mask(row.phone) || "Unknown"}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      priority: 2,
      sortable: true,
      render: (value) => <StatusBadge status={value} />
    },
    {
      key: 'check_in',
      label: 'Check-in',
      priority: 3,
      sortable: true,
      render: (value, row) => (
        <div className="text-sm">
          <div className="font-medium">
            {row.check_in || row.check_in_time || "Not checked in"}
          </div>
          {row.check_in_time && (
            <div className="text-slate-500 text-xs">
              {new Date(row.check_in_time).toLocaleTimeString()}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'check_out',
      label: 'Check-out',
      priority: 4,
      sortable: true,
      render: (value, row) => (
        <div className="text-sm">
          <div className="font-medium">
            {row.check_out || row.check_out_time || "Not checked out"}
          </div>
          {row.check_out_time && (
            <div className="text-slate-500 text-xs">
              {new Date(row.check_out_time).toLocaleTimeString()}
            </div>
          )}
        </div>
      )
    }
  ];

  // Handle sort
  const handleSort = (columnKey, direction) => {
    logger.debug('Sort by:', columnKey, direction);
    // Implement sorting logic here
  };

  // Handle row click
  const handleRowClick = (row) => {
    logger.debug('Row clicked:', row);
    // Navigate to visitor details or show modal
  };

  // Render loading state
  const renderLoadingState = () => {
    if (dataLoading.isActive) {
      return (
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <AdvancedSkeleton.Base height="2rem" width="12rem" />
              <AdvancedSkeleton.Base height="1rem" width="20rem" />
            </div>
            <div className="flex space-x-2">
              <AdvancedSkeleton.Base height="2.5rem" width="8rem" />
              <AdvancedSkeleton.Base height="2.5rem" width="8rem" />
            </div>
          </div>

          {/* Search skeleton */}
          <div className="space-y-2">
            <AdvancedSkeleton.Base height="2.5rem" width="100%" />
            <div className="flex space-x-2">
              <AdvancedSkeleton.Base height="2rem" width="6rem" />
              <AdvancedSkeleton.Base height="2rem" width="6rem" />
            </div>
          </div>

          {/* Table skeleton */}
          <AdvancedSkeleton.Table rows={5} columns={4} showHeader />
        </div>
      );
    }

    return null;
  };

  // Render error state
  const renderErrorState = () => {
    if (dataLoading.error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error loading data</h3>
              <p className="text-sm text-red-600 mt-1">{dataLoading.error}</p>
            </div>
          </div>
          <div className="mt-3">
            <Button
              onClick={() => fetchVisitorData()}
              variant="outline"
              size="sm"
              className="text-red-700 border-red-300 hover:bg-red-50"
            >
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  // Render success state
  const renderSuccessState = () => {
    if (dataLoading.success && lastRefresh) {
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-700">
              Data refreshed at {lastRefresh.toLocaleTimeString()}
            </span>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visitor History</h1>
          <p className="text-slate-600 mt-1">
            View and manage visitor check-ins and check-outs
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => fetchVisitorData()}
            disabled={dataLoading.isActive}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${dataLoading.isActive ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleExport}
            disabled={exportLoading.isActive || filteredRows.length === 0}
            className="flex items-center gap-2"
          >
            {exportLoading.isActive ? (
              <EnhancedLoading
                type={LOADING_TYPES.EXPORT}
                variant="spinner"
                size="sm"
                message="Exporting..."
              />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export
          </Button>
        </div>
      </div>

      {/* Loading States */}
      {renderLoadingState()}
      {renderErrorState()}
      {renderSuccessState()}

      {/* Main Content */}
      {!dataLoading.isActive && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <SearchFilter
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  placeholder="Search visitors..."
                  className="w-full"
                />
              </div>
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
                {hasFilters && (
                  <span className="bg-brand-500 text-white text-xs rounded-full px-2 py-0.5">
                    {Object.keys(filters).length}
                  </span>
                )}
              </Button>
            </div>

            {showFilters && (
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {filterFields.map(field => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {field.label}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          value={filters[field.key] || ''}
                          onChange={(e) => setFilters(prev => ({
                            ...prev,
                            [field.key]: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="">All {field.label}</option>
                          <option value="checked_in">Checked In</option>
                          <option value="checked_out">Checked Out</option>
                          <option value="pending">Pending</option>
                        </select>
                      ) : (
                        <input
                          type="date"
                          value={filters[field.key] || ''}
                          onChange={(e) => setFilters(prev => ({
                            ...prev,
                            [field.key]: e.target.value
                          }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
                {hasFilters && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={clearFilters}
                      variant="outline"
                      size="sm"
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Results */}
          {hasResults ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Showing {pagination.startIndex + 1}-{pagination.endIndex} of {pagination.total} visitors
                </p>
                {isSearching && (
                  <div className="flex items-center space-x-2 text-sm text-slate-500">
                    <EnhancedLoading
                      type={LOADING_TYPES.SEARCH}
                      variant="spinner"
                      size="sm"
                      message="Searching..."
                    />
                  </div>
                )}
              </div>

              <ResponsiveTable
                data={filteredRows}
                columns={columns}
                onSort={handleSort}
                onRowClick={handleRowClick}
                className="bg-white rounded-lg border border-slate-200"
              />

              {pagination.totalPages > 1 && (
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                  className="flex justify-center"
                />
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-slate-400 mb-4">
                <Filter className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No visitors found</h3>
              <p className="text-slate-600 mb-4">
                {searchTerm || hasFilters 
                  ? 'Try adjusting your search or filters'
                  : 'No visitor history available yet'
                }
              </p>
              {(searchTerm || hasFilters) && (
                <Button
                  onClick={() => {
                    setSearchTerm('');
                    clearFilters();
                  }}
                  variant="outline"
                >
                  Clear Search & Filters
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}




