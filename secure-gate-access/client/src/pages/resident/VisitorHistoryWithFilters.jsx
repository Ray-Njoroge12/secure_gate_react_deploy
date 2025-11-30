/**
 * @file VisitorHistoryWithFilters.jsx
 * @description Phase 4 - Enhanced visitor history with backend filters
 * Replaces client-side filtering with server-side filters for better performance
 */

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Download, Calendar, User, Phone, Car } from 'lucide-react';
import { Button, Card, Badge } from '../../components/ui';
import VisitorFilters from '../../components/resident/VisitorFilters';
import { handleApiError } from '../../utils/errorMapper';

const VisitorHistoryWithFilters = () => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0, hasMore: false });
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    fromDate: '',
    toDate: ''
  });

  // Fetch visitors with filters
  const fetchVisitors = useCallback(async (currentFilters = filters, offset = 0) => {
    try {
      setLoading(true);
      setError('');

      // Build query string
      const params = new URLSearchParams();
      params.append('limit', '20');
      params.append('offset', offset.toString());
      
      if (currentFilters.search) params.append('search', currentFilters.search);
      if (currentFilters.status) params.append('status', currentFilters.status);
      if (currentFilters.fromDate) params.append('fromDate', currentFilters.fromDate);
      if (currentFilters.toDate) params.append('toDate', currentFilters.toDate);

      const response = await fetch(`/api/visitors?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch visitors');
      }

      const result = await response.json();
      
      if (result.success) {
        setVisitors(result.data.data || []);
        setPagination(result.data.pagination || { total: 0, limit: 20, offset: 0, hasMore: false });
      } else {
        throw new Error(result.message || 'Failed to fetch visitors');
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Initial fetch
  useEffect(() => {
    fetchVisitors();
  }, []);

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    fetchVisitors(newFilters, 0); // Reset to first page
  };

  // Handle clear filters
  const handleClearFilters = () => {
    const clearedFilters = { search: '', status: '', fromDate: '', toDate: '' };
    setFilters(clearedFilters);
    fetchVisitors(clearedFilters, 0);
  };

  // Handle pagination
  const handleNextPage = () => {
    if (pagination.hasMore) {
      const newOffset = pagination.offset + pagination.limit;
      fetchVisitors(filters, newOffset);
    }
  };

  const handlePrevPage = () => {
    if (pagination.offset > 0) {
      const newOffset = Math.max(0, pagination.offset - pagination.limit);
      fetchVisitors(filters, newOffset);
    }
  };

  // Export functionality
  const handleExport = () => {
    const csvData = visitors.map(v => ({
      Name: v.name || '',
      Phone: v.phone || '',
      Email: v.email || '',
      Status: v.status || '',
      'Vehicle Plate': v.vehicle_plate || '',
      'Visit Date': v.date_of_visit || '',
      'Check In': v.check_in || '',
      'Check Out': v.check_out || ''
    }));

    const headers = Object.keys(csvData[0] || {});
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(h => `"${row[h]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visitor-history-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  // Format date/time
  const formatDateTime = (dateTime) => {
    if (!dateTime) return '-';
    const date = new Date(dateTime);
    return date.toLocaleString('en-KE', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Get status badge color
  const getStatusColor = (status) => {
    const colors = {
      pending: 'warning',
      pending_approval: 'warning',
      approved: 'success',
      rejected: 'danger',
      on_premise: 'primary',
      checked_out: 'default'
    };
    return colors[status] || 'default';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-200">Visitor History</h2>
          <p className="text-slate-400 text-sm mt-1">
            Search and filter your visitor records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => fetchVisitors()}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!visitors.length || loading}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <VisitorFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        totalResults={pagination.total}
        isLoading={loading}
      />

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>
          Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} visitors
        </span>
        {loading && <span className="text-brand-400">Loading...</span>}
      </div>

      {/* Visitors List */}
      {visitors.length === 0 && !loading ? (
        <Card className="text-center py-12">
          <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-300 mb-2">
            No Visitors Found
          </h3>
          <p className="text-slate-400">
            Try adjusting your filters or invite your first visitor
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {visitors.map((visitor) => (
            <Card key={visitor.id} className="hover:border-slate-600 transition-colors">
              <Card.Content className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Visitor Info */}
                  <div className="flex-1 space-y-2">
                    {/* Name & Status */}
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-slate-200">
                        {visitor.name || 'Unknown Visitor'}
                      </h3>
                      <Badge variant={getStatusColor(visitor.status)}>
                        {visitor.status?.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Contact Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                      {visitor.phone && (
                        <div className="flex items-center gap-2 text-slate-300">
                          <Phone className="w-4 h-4 text-slate-400" />
                          <span>{visitor.phone}</span>
                        </div>
                      )}
                      {visitor.vehicle_plate && (
                        <div className="flex items-center gap-2 text-slate-300">
                          <Car className="w-4 h-4 text-slate-400" />
                          <span>{visitor.vehicle_plate}</span>
                        </div>
                      )}
                    </div>

                    {/* Visit Times */}
                    <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                      {visitor.date_of_visit && (
                        <div>
                          <span className="font-medium">Visit Date:</span> {visitor.date_of_visit}
                        </div>
                      )}
                      {visitor.check_in && (
                        <div>
                          <span className="font-medium">Check In:</span> {formatDateTime(visitor.check_in)}
                        </div>
                      )}
                      {visitor.check_out && (
                        <div>
                          <span className="font-medium">Check Out:</span> {formatDateTime(visitor.check_out)}
                        </div>
                      )}
                    </div>

                    {/* Approval Info */}
                    {visitor.approved_at && (
                      <div className="text-xs text-green-400">
                        ✓ Approved {formatDateTime(visitor.approved_at)}
                      </div>
                    )}
                    {visitor.rejected_at && (
                      <div className="text-xs text-red-400">
                        ✗ Rejected {formatDateTime(visitor.rejected_at)}
                        {visitor.rejection_reason && `: ${visitor.rejection_reason}`}
                      </div>
                    )}
                  </div>
                </div>
              </Card.Content>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {visitors.length > 0 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevPage}
            disabled={pagination.offset === 0 || loading}
          >
            Previous
          </Button>
          <span className="text-sm text-slate-400">
            Page {Math.floor(pagination.offset / pagination.limit) + 1}
          </span>
          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={!pagination.hasMore || loading}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default VisitorHistoryWithFilters;
