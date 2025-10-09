import React, { useEffect, useState } from "react";
import logger from 'utils/logger';
import { Button, SearchFilter, SearchResults, Pagination, ResponsiveTable } from "../../components/ui";
import { RefreshCw, Download, Filter } from "lucide-react";
import { useSearchData } from "../../hooks/useSearch";

function mask(value) {
  if (!value) return "";
  if (String(value).includes("@")) return `${value[0]}***${value.slice(-1)}`;
  const d = String(value).replace(/\D+/g, "");
  return d.length >= 4 ? `${d.slice(0, 2)}***${d.slice(-2)}` : "***";
}

export default function VisitorHistory() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Search and filter configuration
  const searchFields = ['name', 'phone', 'email', 'status'];
  const filterFields = [
    { 
      key: 'status', 
      label: 'Status', 
      type: 'select',
      options: ['checked_in', 'checked_out', 'pending', 'cancelled'],
      sortable: true
    },
    { 
      key: 'check_in', 
      label: 'Check-in Date Range', 
      type: 'dateRange',
      sortable: true
    },
    { 
      key: 'check_out', 
      label: 'Check-out Date Range', 
      type: 'dateRange',
      sortable: true
    },
    {
      key: 'visitor_type',
      label: 'Visitor Type',
      type: 'select',
      options: ['guest', 'contractor', 'delivery', 'maintenance'],
      sortable: true
    }
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + R to refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        if (!loading) {
          fetchMine();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading]);

  async function fetchMine() {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch('/api/visitors', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json?.success) setRows(json.data || []);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchMine();
    const t = setInterval(fetchMine, 10000);
    return () => clearInterval(t);
  }, []);

  // Transform data for ResponsiveTable
  const columns = [
    {
      key: 'name',
      label: 'Name',
      priority: 1,
      sortable: true,
      render: (value, row) => row.name || mask(row.phone) || "Unknown"
    },
    {
      key: 'status',
      label: 'Status',
      priority: 2,
      sortable: true,
      render: (value) => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          value === 'checked_in' ? 'bg-green-100 text-green-800' :
          value === 'checked_out' ? 'bg-gray-100 text-gray-800' :
          value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {value || "Unknown"}
        </span>
      )
    },
    {
      key: 'check_in',
      label: 'Check-in',
      priority: 3,
      sortable: true,
      render: (value, row) => row.check_in || row.check_in_time || "Not checked in"
    },
    {
      key: 'check_out',
      label: 'Check-out',
      priority: 4,
      sortable: true,
      render: (value, row) => row.check_out || row.check_out_time || "Not checked out"
    }
  ];

  // Handle sort
  const handleSort = (columnKey, direction) => {
    // Implement sorting logic here
    logger.debug('Sort by:', columnKey, direction);
  };

  // Handle row click
  const handleRowClick = (row) => {
    logger.debug('Row clicked:', row);
    // Navigate to visitor details or show modal
  };

  // Enhanced export functionality
  const handleExport = (format = 'csv') => {
    const headers = columns.map(col => col.label);
    const tableData = filteredRows.map(row => 
      columns.map(col => {
        const value = col.render ? col.render(row[col.key], row, col) : row[col.key];
        return typeof value === 'string' ? value : value?.props?.children || value;
      })
    );
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `visitor-history-${timestamp}`;
    
    switch (format) {
      case 'csv':
        const csvContent = [
          headers.join(','),
          ...tableData.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
        
        const csvBlob = new Blob([csvContent], { type: 'text/csv' });
        const csvUrl = window.URL.createObjectURL(csvBlob);
        const csvLink = document.createElement('a');
        csvLink.href = csvUrl;
        csvLink.download = `${filename}.csv`;
        csvLink.click();
        window.URL.revokeObjectURL(csvUrl);
        break;
        
      case 'json':
        const jsonData = filteredRows.map(row => {
          const jsonRow = {};
          columns.forEach(col => {
            const value = col.render ? col.render(row[col.key], row, col) : row[col.key];
            jsonRow[col.key] = typeof value === 'string' ? value : value?.props?.children || value;
          });
          return jsonRow;
        });
        
        const jsonContent = JSON.stringify(jsonData, null, 2);
        const jsonBlob = new Blob([jsonContent], { type: 'application/json' });
        const jsonUrl = window.URL.createObjectURL(jsonBlob);
        const jsonLink = document.createElement('a');
        jsonLink.href = jsonUrl;
        jsonLink.download = `${filename}.json`;
        jsonLink.click();
        window.URL.revokeObjectURL(jsonUrl);
        break;
        
      case 'pdf':
        // For PDF export, we'd typically use a library like jsPDF
        // For now, we'll show an alert and suggest CSV/JSON
        alert('PDF export requires additional setup. Please use CSV or JSON export for now.');
        break;
        
      default:
        logger.warn('Unknown export format:', format);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-200">Visitor History</h2>
          <p className="text-sm text-slate-400 mt-1">
            View and manage visitor records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
            icon={<Filter className="w-4 h-4" />}
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </Button>
          <div className="relative group">
            <Button
              onClick={() => handleExport('csv')}
              variant="outline"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              disabled={!hasResults}
            >
              Export
            </Button>
            <div className="absolute right-0 top-full mt-1 w-32 bg-slate-800 border border-slate-600 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <div className="p-1">
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded"
                >
                  Export as JSON
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full text-left px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded"
                >
                  Export as PDF
                </button>
              </div>
            </div>
          </div>
          <Button
            onClick={fetchMine}
            disabled={loading}
            variant="outline"
            size="sm"
            icon={<RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Advanced Search and Filters */}
      <SearchFilter
        data={rows}
        searchFields={searchFields}
        filterFields={filterFields}
        onSearch={setSearchTerm}
        onFilter={setFilters}
        placeholder="Search visitors by name, phone, email, or status..."
        showAdvanced={showFilters}
        enableSorting={true}
        enablePagination={false}
      />

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-slate-400">
        <div>
          {isSearching || hasFilters ? (
            <>
              Showing {filteredRows.length} of {rows.length} visitors
              {searchTerm && ` for "${searchTerm}"`}
            </>
          ) : (
            `Total: ${rows.length} visitors`
          )}
        </div>
        {pagination.totalPages > 1 && (
          <div className="text-slate-400">
            Page {pagination.currentPage} of {pagination.totalPages}
          </div>
        )}
      </div>

      {/* Table */}
      {hasResults ? (
        <div className="space-y-4">
          <ResponsiveTable
            columns={columns}
            data={filteredRows}
            onRowClick={handleRowClick}
            onSort={handleSort}
            loading={loading}
            enableVirtualScrolling={true}
            virtualScrollThreshold={50}
            emptyState={{
              title: 'No visitors found',
              description: 'No visitor records match your current search criteria.',
              icon: <Filter className="w-12 h-12 mx-auto opacity-50" />
            }}
          />
          
          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
              className="mt-6"
            />
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-4">
            {isSearching || hasFilters ? (
              <>
                <Filter className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No visitors found</h3>
                <p>Try adjusting your search terms or filters</p>
              </>
            ) : (
              <>
                <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No visitor records</h3>
                <p>Visitor history will appear here once visitors are checked in</p>
              </>
            )}
          </div>
          {(isSearching || hasFilters) && (
            <Button
              onClick={() => {
                setSearchTerm('');
                clearFilters();
              }}
              variant="outline"
            >
              Clear search and filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
