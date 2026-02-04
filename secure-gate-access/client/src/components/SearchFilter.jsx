import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Input, Card, Badge } from './ui';
import { useDebouncedValue } from '../utils/performanceOptimization';

const SearchFilter = ({
  data = [],
  searchFields = [],
  filterFields = [],
  onSearch,
  onFilter,
  placeholder = "Search...",
  className = "",
  showAdvanced = false,
  enableSorting = true,
  enablePagination = true,
  pageSize = 10
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showSortOptions, setShowSortOptions] = useState(false);

  // Debounce search term
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  // Filter and search data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (debouncedSearchTerm && searchFields.length > 0) {
      result = result.filter(item =>
        searchFields.some(field => {
          const value = getNestedValue(item, field);
          return value && value.toString().toLowerCase().includes(debouncedSearchTerm.toLowerCase());
        })
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([field, filterValue]) => {
      if (filterValue && filterValue !== '') {
        result = result.filter(item => {
          const value = getNestedValue(item, field);
          if (Array.isArray(filterValue)) {
            return filterValue.includes(value);
          }
          return value && value.toString().toLowerCase().includes(filterValue.toLowerCase());
        });
      }
    });

    // Apply sorting
    if (sortField) {
      result.sort((a, b) => {
        const aValue = getNestedValue(a, sortField);
        const bValue = getNestedValue(b, sortField);
        
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, debouncedSearchTerm, filters, sortField, sortDirection, searchFields]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!enablePagination) return filteredData;
    
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage, pageSize, enablePagination]);

  // Get unique values for filter options
  const getFilterOptions = useCallback((field) => {
    const values = data.map(item => getNestedValue(item, field)).filter(Boolean);
    return [...new Set(values)].sort();
  }, [data]);

  // Get nested value from object
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // Handle search change
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1); // Reset to first page
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchTerm('');
    setCurrentPage(1);
  }, []);

  // Handle sort change
  const handleSortChange = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // Handle page change
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  // Notify parent components
  useEffect(() => {
    if (onSearch) {
      onSearch(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onSearch]);

  useEffect(() => {
    if (onFilter) {
      onFilter(filters);
    }
  }, [filters, onFilter]);

  // Calculate pagination info
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search and Filter Controls */}
      <Card>
        <Card.Content className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder={placeholder}
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="pl-10 pr-4"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {Object.keys(filters).length > 0 && (
                <Badge variant="secondary" size="sm">
                  {Object.keys(filters).length}
                </Badge>
              )}
            </Button>

            {/* Sort Toggle */}
            {enableSorting && (
              <Button
                variant="outline"
                onClick={() => setShowSortOptions(!showSortOptions)}
                className="flex items-center gap-2"
              >
                Sort
                {sortField && (
                  <Badge variant="secondary" size="sm">
                    {sortField}
                  </Badge>
                )}
              </Button>
            )}

            {/* Clear Filters */}
            {(searchTerm || Object.keys(filters).length > 0) && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filterFields.map(field => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      {field.label}
                    </label>
                    {field.type === 'select' ? (
                      <select
                        value={filters[field.key] || ''}
                        onChange={(e) => handleFilterChange(field.key, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                      >
                        <option value="">All {field.label}</option>
                        {getFilterOptions(field.key).map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field.type === 'multiselect' ? (
                      <div className="space-y-2">
                        {getFilterOptions(field.key).map(option => (
                          <label key={option} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={filters[field.key]?.includes(option) || false}
                              onChange={(e) => {
                                const currentValues = filters[field.key] || [];
                                const newValues = e.target.checked
                                  ? [...currentValues, option]
                                  : currentValues.filter(v => v !== option);
                                handleFilterChange(field.key, newValues);
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm text-gray-700 dark:text-slate-300">{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <Input
                        type={field.type || 'text'}
                        placeholder={`Filter by ${field.label}`}
                        value={filters[field.key] || ''}
                        onChange={(e) => handleFilterChange(field.key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sort Options */}
          {showSortOptions && enableSorting && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchFields.map(field => (
                  <Button
                    key={field}
                    variant={sortField === field ? "primary" : "outline"}
                    onClick={() => handleSortChange(field)}
                    className="flex items-center gap-2"
                  >
                    {field}
                    {sortField === field && (
                      sortDirection === 'asc' ? 
                        <ChevronUp className="h-4 w-4" /> : 
                        <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Card.Content>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-200">
        <div>
          Showing {paginatedData.length} of {filteredData.length} results
          {searchTerm && ` for "${searchTerm}"`}
        </div>
        {enablePagination && totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={!hasPrevPage}
            >
              Previous
            </Button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={!hasNextPage}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchFilter;

