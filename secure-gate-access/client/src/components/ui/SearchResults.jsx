/**
 * @fileoverview SearchResults component for Secure Gate Access
 * @description Displays search results with highlighting and export functionality
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { memo } from 'react';
import Icon from './Icon';

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
  onExport,
  exportFormat = 'csv',
  className = '',
  ...props
}) => {
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



