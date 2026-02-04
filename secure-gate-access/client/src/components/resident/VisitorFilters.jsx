/**
 * @file VisitorFilters.jsx
 * @description Phase 4 - Visitor history filters component
 * Provides search, status filter, and date range filtering
 */

import React from 'react';
import { Search, Filter, X, Calendar } from 'lucide-react';
import { Input, Button, Badge } from '../ui';

const VisitorFilters = ({ 
  filters, 
  onFilterChange, 
  onClearFilters, 
  totalResults,
  isLoading 
}) => {
  const { search, status, fromDate, toDate } = filters;

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'on_premise', label: 'On Premise' },
    { value: 'checked_out', label: 'Checked Out' }
  ];

  const hasActiveFilters = search || status || fromDate || toDate;

  // Get today and 30 days ago for quick presets
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const applyQuickFilter = (preset) => {
    switch (preset) {
      case 'today':
        onFilterChange({ ...filters, fromDate: today, toDate: today });
        break;
      case 'week':
        onFilterChange({ ...filters, fromDate: sevenDaysAgo, toDate: today });
        break;
      case 'month':
        onFilterChange({ ...filters, fromDate: thirtyDaysAgo, toDate: today });
        break;
      default:
        break;
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-slate-400" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-slate-200">Filters</h3>
          {hasActiveFilters && (
            <Badge variant="primary">{totalResults} results</Badge>
          )}
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="text-slate-400 hover:text-slate-200"
            aria-label="Clear all filters"
          >
            <X className="w-4 h-4 mr-1" aria-hidden="true" />
            Clear All
          </Button>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search by name, phone, email, or plate..."
          value={search || ''}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          disabled={isLoading}
          aria-label="Search visitors"
        />
      </div>

      {/* Quick Date Presets */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400 mr-2">Quick:</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyQuickFilter('today')}
          disabled={isLoading}
        >
          Today
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyQuickFilter('week')}
          disabled={isLoading}
        >
          Last 7 Days
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => applyQuickFilter('month')}
          disabled={isLoading}
        >
          Last 30 Days
        </Button>
      </div>

      {/* Detailed Filters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Status
          </label>
          <select
            value={status || ''}
            onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            disabled={isLoading}
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* From Date */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" aria-hidden="true" />
            From Date
          </label>
          <input
            type="date"
            value={fromDate || ''}
            onChange={(e) => onFilterChange({ ...filters, fromDate: e.target.value })}
            max={toDate || today}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            disabled={isLoading}
            aria-label="Filter from date"
          />
        </div>

        {/* To Date */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            To Date
          </label>
          <input
            type="date"
            value={toDate || ''}
            onChange={(e) => onFilterChange({ ...filters, toDate: e.target.value })}
            min={fromDate}
            max={today}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700">
          {search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: "{search}"
              <button
                onClick={() => onFilterChange({ ...filters, search: '' })}
                className="ml-1 hover:text-red-400"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {status && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Status: {statusOptions.find(o => o.value === status)?.label}
              <button
                onClick={() => onFilterChange({ ...filters, status: '' })}
                className="ml-1 hover:text-red-400"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {fromDate && (
            <Badge variant="secondary" className="flex items-center gap-1">
              From: {fromDate}
              <button
                onClick={() => onFilterChange({ ...filters, fromDate: '' })}
                className="ml-1 hover:text-red-400"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
          {toDate && (
            <Badge variant="secondary" className="flex items-center gap-1">
              To: {toDate}
              <button
                onClick={() => onFilterChange({ ...filters, toDate: '' })}
                className="ml-1 hover:text-red-400"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default VisitorFilters;
