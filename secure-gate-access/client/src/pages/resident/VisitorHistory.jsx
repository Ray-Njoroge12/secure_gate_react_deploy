import React, { useEffect, useState, useCallback } from "react";
import logger from 'utils/logger';

import { Button, SearchFilter, Pagination, ResponsiveTable, PageHeader, Icon } from "../../components/ui";
import api from '../../utils/apiClient';
import { useToast } from '../../contexts/ToastContext';
import Modal from "../../components/ui/Modal";
import { useSearchData } from "../../hooks/useSearch";
import { useResidentVisitorEvents, VISITOR_EVENTS } from "../../hooks/useVisitorEvents";
// import AppShell from "../../layouts/AppShell";
// import { useCurrentRole } from "../../hooks/useCurrentRole";

function mask(value) {
  if (!value) return "";
  if (String(value).includes("@")) return `${value[0]}***${value.slice(-1)}`;
  const d = String(value).replace(/\D+/g, "");
  return d.length >= 4 ? `${d.slice(0, 2)}***${d.slice(-2)}` : "***";
}

export default function VisitorHistory() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);

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

  // Sort state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Use search hook
  const {
    data: filteredRows,
    pagination,
    searchTerm,
    setSearchTerm,
    setFilters,
    clearFilters,
    setPage,
    setSort,
    isSearching,
    hasFilters,
    hasResults
  } = useSearchData(rows, searchFields, filterFields, {
    enablePagination: true,
    pageSize: 10
  });

  // WebSocket: subscribe to real-time visitor events
  const handleVisitorEvent = useCallback((event) => {
    // On any visitor event, update the rows in-place or re-fetch
    const visitorData = event.visitor || event.data?.visitor || event;
    const visitorId = visitorData.id || visitorData.visitor_id;
    const eventType = event.type;

    if (!visitorId) {
      // Cannot match to a row — do a full refresh
      fetchMine();
      return;
    }

    setRows(prev => {
      const idx = prev.findIndex(r => r.id === visitorId);
      if (idx === -1) {
        // New visitor — prepend if it's an invite or check-in
        if (
          eventType === VISITOR_EVENTS.INVITED ||
          eventType === VISITOR_EVENTS.CHECK_IN ||
          eventType === VISITOR_EVENTS.SELF_CHECK_IN ||
          eventType === VISITOR_EVENTS.ARRIVAL
        ) {
          return [visitorData, ...prev];
        }
        // Unknown visitor for other events — trigger full refresh
        fetchMine();
        return prev;
      }
      // Update existing row in-place
      const updated = [...prev];
      updated[idx] = { ...updated[idx], ...visitorData };
      return updated;
    });
  }, []);

  const {
    isConnected: wsConnected,
    connectionStatus: wsStatus
  } = useResidentVisitorEvents({
    enabled: true,
    onVisitorEvent: handleVisitorEvent,
    showNotifications: false
  });


  async function fetchMine() {
    try {
      setLoading(true);
      const res = await api.get('/api/visitors');
      const json = res.data;
      if (json?.success) {
        // Handle response format: { data: { visitors: [] } } or { data: [] }
        const visitors = Array.isArray(json.data)
          ? json.data
          : (json.data?.visitors || []);
        setRows(visitors);
      }
    } finally {
      setLoading(false);
    }
  }

  // Initial fetch on mount (no polling — WebSocket handles live updates)
  React.useEffect(() => {
    fetchMine();
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
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${value === 'checked_in' ? 'bg-green-100 text-green-800' :
            value === 'checked_out' ? 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200' :
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

  // Handle sort — toggle direction if same column, reset to asc for new column
  const handleSort = (columnKey, direction) => {
    const newDirection = sortConfig.key === columnKey && sortConfig.direction === 'asc'
      ? 'desc'
      : (direction || 'asc');
    setSortConfig({ key: columnKey, direction: newDirection });
    setSort(columnKey, newDirection);
  };

  // Handle row click — open detail modal
  const handleRowClick = (row) => {
    setSelectedVisitor(row);
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
        toast.info({ title: 'PDF export requires additional setup. Please use CSV or JSON export for now.' });
        break;

      default:
        logger.warn('Unknown export format:', format);
    }
  };

  // PHASE B4: Mobile Card Component
  const VisitorCard = ({ visitor }) => (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">{visitor.name || 'Unknown'}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-200">📱 {visitor.phone || 'No phone'}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${visitor.status === 'checked_in' ? 'bg-green-100 text-green-800' :
            visitor.status === 'checked_out' ? 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200' :
              visitor.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
          }`}>
          {visitor.status}
        </span>
      </div>

      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-200">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-300">📅</span>
          <span>{visitor.check_in ? new Date(visitor.check_in).toLocaleDateString() : 'Not checked in'}</span>
        </div>
        {visitor.check_out && (
          <div className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-300">⏰</span>
            <span>{visitor.check_out}</span>
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        {visitor.status === 'pending' && (
          <Button size="sm" variant="outline" className="flex-1">
            Resend Invite
          </Button>
        )}
        <Button size="sm" variant="ghost" className="flex-1">
          View Details
        </Button>
      </div>
    </div>
  );

//   const role = useCurrentRole();

  return (
    // <AppShell role={role}>
      <div data-tour="visitor-history" className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <PageHeader
          title="Visitor History"
          subtitle="View and manage visitor records"
          icon={<Icon name="Clock" className="w-6 h-6 text-green-600" />}
          showBack={true}
          backTo="/dashboard/resident"
          actions={
            <div className="flex items-center gap-2">
              {/* Live connection indicator */}
              {wsConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-400">
                  <span className="relative flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gray-400" />
                  </span>
                  Offline
                </span>
              )}
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                size="sm"
              >
                <Icon name="Filter" className="w-4 h-4 mr-1" />
                Filters
              </Button>
              <Button
                onClick={() => handleExport('csv')}
                variant="outline"
                size="sm"
                disabled={!hasResults}
              >
                <Icon name="Download" className="w-4 h-4 mr-1" />
                Export
              </Button>
              <Button
                onClick={fetchMine}
                disabled={loading}
                variant="outline"
                size="sm"
                title={wsConnected ? "Refresh data" : "WebSocket offline — click to refresh manually"}
              >
                <Icon name="RefreshCw" className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {!wsConnected && <span className="ml-1">Refresh</span>}
              </Button>
            </div>
          }
        />

        <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
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
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-slate-400">
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
              <div className="text-gray-500 dark:text-slate-400">
                Page {pagination.currentPage} of {pagination.totalPages}
              </div>
            )}
          </div>

          {/* Table */}
          {hasResults ? (
            <div className="space-y-4">
              <div className="hidden md:block">
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
                    icon: <Icon name="Filter" className="w-12 h-12 mx-auto opacity-50" />
                  }}
                />
              </div>

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
              <div className="text-gray-500 dark:text-slate-400 mb-4">
                {isSearching || hasFilters ? (
                  <>
                    <Icon name="Filter" className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No visitors found</h3>
                    <p>Try adjusting your search terms or filters</p>
                  </>
                ) : (
                  <>
                    <Icon name="RefreshCw" className="w-12 h-12 mx-auto mb-4 opacity-50" />
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

          {/* Mobile Card View */}
          {hasResults && (
            <div className="space-y-4 md:hidden">
              {filteredRows.map((visitor) => (
                <VisitorCard key={visitor.id || `${visitor.name}-${visitor.check_in || 'na'}`} visitor={visitor} />
              ))}
            </div>
          )}
        </div>

        {/* Visitor Detail Modal */}
        {selectedVisitor && (
          <Modal
            isOpen={!!selectedVisitor}
            onClose={() => setSelectedVisitor(null)}
            title="Visitor Details"
            size="md"
          >
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Name</p>
                <p className="font-medium text-gray-900 dark:text-white">{selectedVisitor.name || 'Unknown'}</p>
              </div>
              {selectedVisitor.phone && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedVisitor.phone}</p>
                </div>
              )}
              {selectedVisitor.email && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedVisitor.email}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                <p className="font-medium text-gray-900 dark:text-white capitalize">
                  {(selectedVisitor.status || 'Unknown').replace(/_/g, ' ')}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Visit Date</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedVisitor.visit_date
                    ? new Date(selectedVisitor.visit_date).toLocaleString()
                    : selectedVisitor.check_in
                      ? new Date(selectedVisitor.check_in).toLocaleString()
                      : selectedVisitor.created_at
                        ? new Date(selectedVisitor.created_at).toLocaleString()
                        : 'N/A'}
                </p>
              </div>
              {selectedVisitor.check_out && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Check-out</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {new Date(selectedVisitor.check_out).toLocaleString()}
                  </p>
                </div>
              )}
              {selectedVisitor.purpose && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Purpose</p>
                  <p className="font-medium text-gray-900 dark:text-white">{selectedVisitor.purpose}</p>
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    // </AppShell>
  );
}
