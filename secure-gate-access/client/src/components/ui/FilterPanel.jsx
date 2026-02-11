/**
 * @fileoverview FilterPanel component for Secure Gate Access
 * @description Advanced filter panel with multi-select, date ranges, and saved filters
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { memo, useState, useCallback, useEffect } from 'react';
import logger from 'utils/logger';
import Icon from './Icon';
import { searchUtils } from '../../utils/searchUtils';

/**
 * FilterPanel component with advanced filtering options
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Array} props.data - Data to filter
 * @param {Array} props.filterFields - Filter field configurations
 * @param {Object} props.filters - Current filter values
 * @param {Function} props.onFiltersChange - Function called when filters change
 * @param {Function} props.onClearFilters - Function called to clear all filters
 * @param {boolean} props.isOpen - Whether the panel is open
 * @param {Function} props.onToggle - Function to toggle panel visibility
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} FilterPanel component
 * 
 * @example
 * <FilterPanel
 *   data={visitors}
 *   filterFields={[
 *     { key: 'status', label: 'Status', type: 'select', options: ['checked_in', 'checked_out'] },
 *     { key: 'dateRange', label: 'Date Range', type: 'dateRange' }
 *   ]}
 *   filters={filters}
 *   onFiltersChange={setFilters}
 *   onClearFilters={clearFilters}
 *   isOpen={showFilters}
 *   onToggle={setShowFilters}
 * />
 */
const FilterPanel = memo(({
  data = [],
  filterFields = [],
  filters = {},
  onFiltersChange,
  onClearFilters,
  isOpen = false,
  onToggle,
  className = '',
  ...props
}) => {
  const [expandedSections, setExpandedSections] = useState({});
  const [savedFilters, setSavedFilters] = useState([]);

  // Load saved filters from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('savedFilters');
      if (saved) {
        setSavedFilters(JSON.parse(saved));
      }
    } catch (error) {
      logger.warn('[FILTER] Failed to load saved filters:', error);
    }
  }, []);

  // Save filters to localStorage
  const saveFilters = useCallback((filterName) => {
    const newSavedFilter = {
      id: Date.now().toString(),
      name: filterName,
      filters: { ...filters },
      createdAt: new Date().toISOString()
    };
    
    const updatedSavedFilters = [newSavedFilter, ...savedFilters.slice(0, 9)];
    setSavedFilters(updatedSavedFilters);
    
    try {
      localStorage.setItem('savedFilters', JSON.stringify(updatedSavedFilters));
    } catch (error) {
      logger.warn('[FILTER] Failed to save filters:', error);
    }
  }, [filters, savedFilters]);

  // Load saved filter
  const loadSavedFilter = useCallback((savedFilter) => {
    onFiltersChange(savedFilter.filters);
  }, [onFiltersChange]);

  // Delete saved filter
  const deleteSavedFilter = useCallback((id) => {
    const updatedSavedFilters = savedFilters.filter(filter => filter.id !== id);
    setSavedFilters(updatedSavedFilters);
    
    try {
      localStorage.setItem('savedFilters', JSON.stringify(updatedSavedFilters));
    } catch (error) {
      logger.warn('[FILTER] Failed to delete saved filter:', error);
    }
  }, [savedFilters]);

  // Toggle section expansion
  const toggleSection = useCallback((fieldKey) => {
    setExpandedSections(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  }, []);

  // Update filter value
  const updateFilter = useCallback((fieldKey, value) => {
    onFiltersChange({
      ...filters,
      [fieldKey]: value
    });
  }, [filters, onFiltersChange]);

  // Clear specific filter
  const clearFilter = useCallback((fieldKey) => {
    const newFilters = { ...filters };
    delete newFilters[fieldKey];
    onFiltersChange(newFilters);
  }, [filters, onFiltersChange]);

  // Get unique values for select filters
  const getUniqueValues = useCallback((field) => {
    return searchUtils.getUniqueValues(data, field.key);
  }, [data]);

  // Render select filter
  const renderSelectFilter = (field) => {
    const values = field.options || getUniqueValues(field);
    const currentValue = filters[field.key] || [];
    const isExpanded = expandedSections[field.key];

    return (
      <div key={field.key} className="space-y-2">
        <button
          onClick={() => toggleSection(field.key)}
          className="flex items-center justify-between w-full p-3 text-left bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-slate-200">{field.label}</span>
            {currentValue.length > 0 && (
              <span className="px-2 py-1 text-xs bg-brand-500 text-white rounded-full">
                {currentValue.length}
              </span>
            )}
          </div>
          {isExpanded ? (
            <Icon name="chevron-up" className="w-4 h-4 text-gray-500 dark:text-slate-400" />
          ) : (
            <Icon name="chevron-down" className="w-4 h-4 text-gray-500 dark:text-slate-400" />
          )}
        </button>

        {isExpanded && (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {values.map((value) => {
              const isSelected = currentValue.includes(value);
              return (
                <label
                  key={value}
                  className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateFilter(field.key, [...currentValue, value]);
                      } else {
                        updateFilter(field.key, currentValue.filter(v => v !== value));
                      }
                    }}
                    className="w-4 h-4 text-brand-500 bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 rounded focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-900 dark:text-slate-200">{value}</span>
                  {isSelected && <Icon name="check" className="w-4 h-4 text-brand-400" />}
                </label>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render date range filter
  const renderDateRangeFilter = (field) => {
    const currentValue = filters[field.key] || { start: '', end: '' };
    const isExpanded = expandedSections[field.key];

    return (
      <div key={field.key} className="space-y-2">
        <button
          onClick={() => toggleSection(field.key)}
          className="flex items-center justify-between w-full p-3 text-left bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <Icon name="calendar" className="w-4 h-4 text-gray-500 dark:text-slate-400" />
            <span className="font-medium text-gray-900 dark:text-slate-200">{field.label}</span>
            {(currentValue.start || currentValue.end) && (
              <span className="px-2 py-1 text-xs bg-brand-500 text-white rounded-full">
                Active
              </span>
            )}
          </div>
          {isExpanded ? (
            <Icon name="chevron-up" className="w-4 h-4 text-gray-500 dark:text-slate-400" />
          ) : (
            <Icon name="chevron-down" className="w-4 h-4 text-gray-500 dark:text-slate-400" />
          )}
        </button>

        {isExpanded && (
          <div className="space-y-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={currentValue.start}
                onChange={(e) => updateFilter(field.key, { ...currentValue, start: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={currentValue.end}
                onChange={(e) => updateFilter(field.key, { ...currentValue, end: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render text filter
  const renderTextFilter = (field) => {
    const currentValue = filters[field.key] || '';
    const isExpanded = expandedSections[field.key];

    return (
      <div key={field.key} className="space-y-2">
        <button
          onClick={() => toggleSection(field.key)}
          className="flex items-center justify-between w-full p-3 text-left bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-slate-200">{field.label}</span>
            {currentValue && (
              <span className="px-2 py-1 text-xs bg-brand-500 text-white rounded-full">
                Active
              </span>
            )}
          </div>
          {isExpanded ? (
            <Icon name="chevron-up" className="w-4 h-4 text-gray-500 dark:text-slate-400" />
          ) : (
            <Icon name="chevron-down" className="w-4 h-4 text-gray-500 dark:text-slate-400" />
          )}
        </button>

        {isExpanded && (
          <div className="p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <input
              type="text"
              value={currentValue}
              onChange={(e) => updateFilter(field.key, e.target.value)}
              placeholder={`Filter by ${field.label.toLowerCase()}...`}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded text-gray-900 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        )}
      </div>
    );
  };

  // Render number range filter
  const renderNumberRangeFilter = (field) => {
    const currentValue = filters[field.key] || { min: '', max: '' };
    const isExpanded = expandedSections[field.key];

    return (
      <div key={field.key} className="space-y-2">
        <button
          onClick={() => toggleSection(field.key)}
          className="flex items-center justify-between w-full p-3 text-left bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-slate-200">{field.label}</span>
            {(currentValue.min || currentValue.max) && (
              <span className="px-2 py-1 text-xs bg-brand-500 text-white rounded-full">
                Active
              </span>
            )}
          </div>
          {isExpanded ? (
            <Icon name="chevron-up" className="w-4 h-4 text-gray-500 dark:text-slate-400" />
          ) : (
            <Icon name="chevron-down" className="w-4 h-4 text-gray-500 dark:text-slate-400" />
          )}
        </button>

        {isExpanded && (
          <div className="space-y-3 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">
                Minimum
              </label>
              <input
                type="number"
                value={currentValue.min}
                onChange={(e) => updateFilter(field.key, { ...currentValue, min: e.target.value })}
                placeholder="Min value"
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-slate-300 mb-1">
                Maximum
              </label>
              <input
                type="number"
                value={currentValue.max}
                onChange={(e) => updateFilter(field.key, { ...currentValue, max: e.target.value })}
                placeholder="Max value"
                className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded text-gray-900 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render filter based on type
  const renderFilter = (field) => {
    switch (field.type) {
      case 'select':
        return renderSelectFilter(field);
      case 'dateRange':
        return renderDateRangeFilter(field);
      case 'text':
        return renderTextFilter(field);
      case 'numberRange':
        return renderNumberRangeFilter(field);
      default:
        return renderTextFilter(field);
    }
  };

  // Get active filters count
  const activeFiltersCount = Object.keys(filters).filter(key => {
    const value = filters[key];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v !== '');
    }
    return value !== '';
  }).length;

  if (!isOpen) return null;

  return (
    <div className={`bg-slate-800 border border-slate-600 rounded-lg p-4 space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="filter" className="w-5 h-5 text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-200">Filters</h3>
          {activeFiltersCount > 0 && (
            <span className="px-2 py-1 text-xs bg-brand-500 text-white rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={onClearFilters}
              className="text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
            >
              Clear All
            </button>
          )}
          {onToggle && (
            <button
              onClick={onToggle}
              className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200"
              aria-label="Close filters"
            >
              <Icon name="x" className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Saved Filters */}
      {savedFilters.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-600 dark:text-slate-300">Saved Filters</h4>
          <div className="space-y-1">
            {savedFilters.map((savedFilter) => (
              <div
                key={savedFilter.id}
                className="flex items-center justify-between p-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded"
              >
                <button
                  onClick={() => loadSavedFilter(savedFilter)}
                  className="flex items-center gap-2 text-sm text-gray-900 dark:text-slate-200 hover:text-brand-400"
                >
                  <Icon name="star" className="w-4 h-4 text-yellow-400" />
                  {savedFilter.name}
                </button>
                <button
                  onClick={() => deleteSavedFilter(savedFilter.id)}
                  className="text-gray-400 dark:text-slate-400 hover:text-red-400"
                  aria-label={`Delete saved filter: ${savedFilter.name}`}
                >
                  <Icon name="x" className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Fields */}
      <div className="space-y-3">
        {filterFields.map(renderFilter)}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-slate-600">
        <div className="text-sm text-gray-500 dark:text-slate-400">
          {activeFiltersCount > 0 ? `${activeFiltersCount} filter${activeFiltersCount === 1 ? '' : 's'} active` : 'No filters applied'}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const name = prompt('Enter a name for this filter set:');
              if (name) saveFilters(name);
            }}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded"
          >
            Save Filters
          </button>
        </div>
      </div>
    </div>
  );
});

FilterPanel.displayName = 'FilterPanel';

export default FilterPanel;



