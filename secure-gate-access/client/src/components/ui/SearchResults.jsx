/**
 * @fileoverview SearchResults component for Secure Gate Access
 * @description Displays search results with highlighting and export functionality
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { memo, useCallback } from 'react';
import logger from 'utils/logger';
import Icon from './Icon';
import { searchUtils } from '../../utils/searchUtils';

/**
 * SearchResults component for displaying search results
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Array} props.results - Search results to display
 * @param {string} props.searchTerm - Current search term
 * @param {Array} props.searchFields - Fields that were searched
 * @param {Function} props.onExport - Function called when export is requested
 * @param {string} props.exportFormat - Export format ('csv', 'pdf', 'json')
 * @param {boolean} props.showHighlighting - Whether to highlight search terms
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} SearchResults component
 * 
 * @example
 * <SearchResults
 *   results={filteredData}
 *   searchTerm={searchTerm}
 *   searchFields={['name', 'email']}
 *   onExport={handleExport}
 *   exportFormat="csv"
 *   showHighlighting={true}
 * />
 */
const SearchResults = memo(({
  results = [],
  searchTerm = '',
  searchFields = [],
  onExport,
  exportFormat = 'csv',
  showHighlighting = true,
  className = '',
  ...props
}) => {
  // Highlight search terms in text
  const highlightText = useCallback((text, term) => {
    if (!term || !showHighlighting) return text;
    
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  }, [showHighlighting]);

  // Get highlighted value for a field
  const getHighlightedValue = useCallback((item, field) => {
    const value = getNestedValue(item, field);
    if (!value) return '';
    
    const textValue = value.toString();
    return highlightText(textValue, searchTerm);
  }, [searchTerm, highlightText]);

  // Get nested value from object
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // Handle export
  const handleExport = useCallback((format) => {
    if (onExport) {
      onExport(format, results);
    } else {
      // Default export functionality
      switch (format) {
        case 'csv':
          exportToCSV(results);
          break;
        case 'json':
          exportToJSON(results);
          break;
        case 'pdf':
          exportToPDF(results);
          break;
        default:
          logger.warn('Unknown export format:', format);
      }
    }
  }, [onExport, results]);

  // Export to CSV
  const exportToCSV = (data) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = getNestedValue(row, header);
          return `"${(value || '').toString().replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Export to JSON
  const exportToJSON = (data) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-results-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Export to PDF (simplified - would need a proper PDF library in production)
  const exportToPDF = (data) => {
    // This is a simplified implementation
    // In production, you'd use a library like jsPDF or Puppeteer
    logger.debug('PDF export not implemented. Data:', data);
    alert('PDF export not implemented. Please use CSV or JSON export.');
  };

  // Render result item
  const renderResultItem = (item, index) => {
    const searchableFields = searchFields.filter(field => {
      const value = getNestedValue(item, field);
      return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
    });

    return (
      <div
        key={index}
        className="p-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
      >
        <div className="space-y-2">
          {/* Primary fields */}
          {searchableFields.slice(0, 3).map(field => {
            const value = getNestedValue(item, field);
            if (!value) return null;
            
            return (
              <div key={field} className="flex items-start gap-2">
                <span className="text-sm font-medium text-gray-500 dark:text-slate-400 capitalize min-w-0 flex-shrink-0">
                  {field.replace(/_/g, ' ')}:
                </span>
                <span className="text-sm text-gray-900 dark:text-slate-200">
                  {getHighlightedValue(item, field)}
                </span>
              </div>
            );
          })}
          
          {/* Additional fields if any */}
          {searchableFields.length > 3 && (
            <div className="text-xs text-gray-500 dark:text-slate-400">
              +{searchableFields.length - 3} more field{searchableFields.length - 3 === 1 ? '' : 's'}
            </div>
          )}
        </div>
      </div>
    );
  };

  // No results found message
  const renderNoResults = () => {
    if (searchTerm && results.length === 0) {
      return (
        <div className={`text-center py-8 text-gray-500 dark:text-gray-400 ${className}`}>
          <Icon name="search" className="w-12 h-12 mx-auto mb-3 opacity-50" aria-hidden="true" />
          <p className="text-lg font-medium">No results found</p>
          <p className="text-sm mt-1">
            Try adjusting your search for "{searchTerm}" or checking different fields.
          </p>
        </div>
      );
    } else if (results.length === 0) {
      return null;
    }
    
    return null;
  };
  
  if (results.length === 0 && !searchTerm) {
    return null;
  }
  
  return (
    <div className={`space-y-4 ${className}`} {...props}>
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Found <span className="font-bold text-gray-900 dark:text-white">{results.length}</span> results
        </div>
        
        {onExport && results.length > 0 && (
          <button
            onClick={() => onExport(results, exportFormat)}
            className="flex items-center text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
            data-testid="export-button"
          >
            {exportFormat === 'csv' && <Icon name="file-spreadsheet" className="w-4 h-4 mr-1.5" />}
            {exportFormat === 'pdf' && <Icon name="file-text" className="w-4 h-4 mr-1.5" />}
            {exportFormat !== 'csv' && exportFormat !== 'pdf' && <Icon name="download" className="w-4 h-4 mr-1.5" />}
            Export results
          </button>
        )}
      </div>
      
      {/* Results content (should be provided via children or handled by parent) */}
      {/* This component mainly provides search context/controls, the parent maps the data */}
    </div>
  );
});

SearchResults.displayName = 'SearchResults';

export default SearchResults;



