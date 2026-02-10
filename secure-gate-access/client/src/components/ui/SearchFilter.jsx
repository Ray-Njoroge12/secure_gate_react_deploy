/**
 * @fileoverview SearchFilter component for Secure Gate Access
 * @description Combined search and filter component with advanced features
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { memo, useState, useCallback } from 'react';
import Icon from './Icon';
import Button from './Button';
import SearchBar from './SearchBar';
import FilterPanel from './FilterPanel';
import { useSearch } from '../../hooks/useSearch';

/**
 * SearchFilter component combining search and filtering functionality
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Array} props.data - Data to search and filter
 * @param {Array} props.searchFields - Fields to search in
 * @param {Array} props.filterFields - Filter field configurations
 * @param {Function} props.onSearch - Function called when search changes
 * @param {Function} props.onFilter - Function called when filters change
 * @param {string} props.placeholder - Search placeholder text
 * @param {boolean} props.showAdvanced - Whether to show advanced filters
 * @param {boolean} props.enableSorting - Whether to enable sorting
 * @param {boolean} props.enablePagination - Whether to enable pagination
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} SearchFilter component
 * 
 * @example
 * <SearchFilter
 *   data={visitors}
 *   searchFields={['name', 'email', 'phone']}
 *   filterFields={[
 *     { key: 'status', label: 'Status', type: 'select', options: ['checked_in', 'checked_out'] }
 *   ]}
 *   onSearch={setSearchTerm}
 *   onFilter={setFilters}
 *   placeholder="Search visitors..."
 *   showAdvanced={true}
 * />
 */
const SearchFilter = memo(({
  data = [],
  searchFields = [],
  filterFields = [],
  onSearch,
  onFilter,
  placeholder = 'Search...',
  showAdvanced = false,
  enableSorting = true,
  enablePagination = true,
  className = '',
  ...props
}) => {
  const [showFilters, setShowFilters] = useState(showAdvanced);
  const [showSortOptions, setShowSortOptions] = useState(false);

  const {
    searchState,
    updateSearchTerm,
    updateFilters,
    clearFilters,
    updateSort,
    clearSearch,
    getSearchStats
  } = useSearch();

  // Handle search change
  const handleSearchChange = useCallback((searchTerm) => {
    updateSearchTerm(searchTerm);
    if (onSearch) {
      onSearch(searchTerm);
    }
  }, [updateSearchTerm, onSearch]);

  // Handle filter change
  const handleFilterChange = useCallback((filters) => {
    updateFilters(filters);
    if (onFilter) {
      onFilter(filters);
    }
  }, [updateFilters, onFilter]);

  // Handle clear all
  const handleClearAll = useCallback(() => {
    clearSearch();
    clearFilters();
    if (onSearch) onSearch('');
    if (onFilter) onFilter({});
  }, [clearSearch, clearFilters, onSearch, onFilter]);

  // Handle sort change
  const handleSortChange = useCallback((field, direction) => {
    updateSort(field, direction);
    setShowSortOptions(false);
  }, [updateSort]);

  // Get search statistics
  const stats = getSearchStats(data, data);

  // Get active filters count
  const activeFiltersCount = Object.keys(searchState.filters).filter(key => {
    const value = searchState.filters[key];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v !== '');
    }
    return value !== '';
  }).length;

  // Get sortable fields from filter fields
  const sortableFields = filterFields
    .filter(field => field.sortable !== false)
    .map(field => ({
      key: field.key,
      label: field.label
    }));

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <SearchBar
          value={searchState.searchTerm}
          onChange={handleSearchChange}
          onSearch={handleSearchChange}
          data={data}
          searchFields={searchFields}
          placeholder={placeholder}
          showHistory={true}
          showSavedSearches={true}
          showSuggestions={true}
          className="w-full"
          {...props}
        />
        
        {/* Clear All Button */}
        {(searchState.searchTerm || activeFiltersCount > 0) && (
          <Button
            onClick={handleClearAll}
            variant="ghost"
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 !p-1 !h-auto !min-h-0 text-gray-400 dark:text-slate-400"
            aria-label="Clear all search and filters"
          >
            <Icon name="x" className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Controls Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Search Stats */}
        <div className="text-sm text-gray-600 dark:text-slate-400">
          {searchState.searchTerm || activeFiltersCount > 0 ? (
            <>
              Showing {stats.filteredItems} of {stats.totalItems} results
              {searchState.searchTerm && ` for "${searchState.searchTerm}"`}
              {activeFiltersCount > 0 && ` with ${activeFiltersCount} filter${activeFiltersCount === 1 ? '' : 's'}`}
            </>
          ) : (
            `Total: ${stats.totalItems} items`
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Sort Button */}
          {enableSorting && sortableFields.length > 0 && (
            <div className="relative">
              <Button
                onClick={() => setShowSortOptions(!showSortOptions)}
                variant="secondary"
                size="sm"
                className="!h-auto !min-h-0 !px-3 !py-2 !text-sm"
              >
                {searchState.sortField ? (
                  <>
                    {searchState.sortDirection === 'asc' ? (
                      <Icon name="sort-asc" className="w-4 h-4" />
                    ) : (
                      <Icon name="sort-desc" className="w-4 h-4" />
                    )}
                    {sortableFields.find(f => f.key === searchState.sortField)?.label || 'Sort'}
                  </>
                ) : (
                  <>
                    <Icon name="sort-asc" className="w-4 h-4" />
                    Sort
                  </>
                )}
              </Button>

              {showSortOptions && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg shadow-lg z-50">
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-2 px-2">Sort by</div>
                    {sortableFields.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <Button
                          onClick={() => handleSortChange(field.key, 'asc')}
                          variant="ghost"
                          size="sm"
                          className={`!w-full !text-left !px-2 !py-1 !text-sm !h-auto !min-h-0 !rounded ${
                            searchState.sortField === field.key && searchState.sortDirection === 'asc'
                              ? '!bg-brand-500 !text-white'
                              : 'text-gray-700 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon name="sort-asc" className="w-3 h-3" />
                            {field.label} (A-Z)
                          </div>
                        </Button>
                        <Button
                          onClick={() => handleSortChange(field.key, 'desc')}
                          variant="ghost"
                          size="sm"
                          className={`!w-full !text-left !px-2 !py-1 !text-sm !h-auto !min-h-0 !rounded ${
                            searchState.sortField === field.key && searchState.sortDirection === 'desc'
                              ? '!bg-brand-500 !text-white'
                              : 'text-gray-700 dark:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon name="sort-desc" className="w-3 h-3" />
                            {field.label} (Z-A)
                          </div>
                        </Button>
                      </div>
                    ))}
                    {searchState.sortField && (
                      <Button
                        onClick={() => {
                          updateSort('', 'asc');
                          setShowSortOptions(false);
                        }}
                        variant="ghost"
                        size="sm"
                        className="!w-full !text-left !px-2 !py-1 !text-sm !h-auto !min-h-0 text-gray-600 dark:text-slate-400 mt-2 pt-2 border-t border-gray-200 dark:border-slate-600"
                      >
                        Clear Sort
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filter Toggle Button */}
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters || activeFiltersCount > 0 ? 'primary' : 'secondary'}
            size="sm"
            className="!h-auto !min-h-0 !px-3 !py-2 !text-sm"
            icon={<Icon name="filter" className="w-4 h-4" />}
          >
            Filters
            {activeFiltersCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-white bg-opacity-20 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <FilterPanel
          data={data}
          filterFields={filterFields}
          filters={searchState.filters}
          onFiltersChange={handleFilterChange}
          onClearFilters={() => {
            clearFilters();
            if (onFilter) onFilter({});
          }}
          isOpen={showFilters}
          onToggle={setShowFilters}
        />
      )}

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(searchState.filters).map(([key, value]) => {
            if (!value || (Array.isArray(value) && value.length === 0)) return null;
            
            const field = filterFields.find(f => f.key === key);
            const label = field?.label || key;
            
            let displayValue = '';
            if (Array.isArray(value)) {
              displayValue = value.join(', ');
            } else if (typeof value === 'object' && value !== null) {
              if (value.start && value.end) {
                displayValue = `${value.start} - ${value.end}`;
              } else if (value.start) {
                displayValue = `From ${value.start}`;
              } else if (value.end) {
                displayValue = `Until ${value.end}`;
              } else if (value.min && value.max) {
                displayValue = `${value.min} - ${value.max}`;
              } else if (value.min) {
                displayValue = `≥ ${value.min}`;
              } else if (value.max) {
                displayValue = `≤ ${value.max}`;
              }
            } else {
              displayValue = value.toString();
            }

            return (
              <div
                key={key}
                className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200 rounded-full text-sm"
              >
                <span className="font-medium">{label}:</span>
                <span>{displayValue}</span>
                <Button
                  onClick={() => {
                    const newFilters = { ...searchState.filters };
                    delete newFilters[key];
                    handleFilterChange(newFilters);
                  }}
                  variant="ghost"
                  size="sm"
                  className="!p-0 !h-auto !min-h-0 text-gray-600 dark:text-slate-400"
                  aria-label={`Remove ${label} filter`}
                >
                  <Icon name="x" className="w-3 h-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

SearchFilter.displayName = 'SearchFilter';

export default SearchFilter;



