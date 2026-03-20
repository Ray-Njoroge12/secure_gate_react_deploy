/**
 * Search Results Component
 * Displays search results with highlighting and categorization
 */

import React from 'react';
import DOMPurify from 'dompurify';
import './SearchResults.css';
import Button from '../ui/Button';

const SearchResults = ({
  results,
  query,
  onResultSelect,
  isLoading = false,
  className = ''
}) => {
  
  // Highlight matching text in results
  const highlightMatch = (text, query) => {
    if (!query || !text) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="result-highlight">{part}</mark>
      ) : part
    );
  };

  // Get icon for result type
  const getResultIcon = (result) => {
    switch (result.type) {
      case 'visitor':
        return '👤';
      case 'user':
        return '👨‍💼';
      case 'incident':
        return '⚠️';
      case 'estate':
        return '🏢';
      default:
        return '📄';
    }
  };

  // Get status badge color
  const getStatusBadgeClass = (status, type) => {
    const statusMap = {
      visitor: {
        'PENDING': 'status-warning',
        'APPROVED': 'status-success',
        'VERIFIED': 'status-info',
        'ON_PREMISE': 'status-primary',
        'CHECKED_OUT': 'status-secondary',
        'REVOKED': 'status-danger',
        'EXPIRED': 'status-danger'
      },
      user: {
        'pending': 'status-warning',
        'active': 'status-success',
        'suspended': 'status-danger'
      },
      incident: {
        'open': 'status-danger',
        'in_progress': 'status-warning',
        'resolved': 'status-success',
        'closed': 'status-secondary'
      }
    };

    return statusMap[type]?.[status] || 'status-default';
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Handle result click
  const handleResultClick = (result) => {
    if (onResultSelect) {
      onResultSelect(result);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e, result) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleResultClick(result);
    }
  };

  if (isLoading) {
    return (
      <div className={`search-results loading ${className}`}>
        <div className="results-loading">
          <div className="spinner"></div>
          <span>Searching...</span>
        </div>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  if (results.error) {
    return (
      <div className={`search-results error ${className}`}>
        <div className="results-error">
          <div className="error-icon">⚠️</div>
          <div className="error-message">{results.error}</div>
        </div>
      </div>
    );
  }

  if (!results.items || results.items.length === 0) {
    return (
      <div className={`search-results empty ${className}`}>
        <div className="results-empty">
          <div className="empty-icon">🔍</div>
          <div className="empty-message">
            No results found for "{query}"
          </div>
          <div className="empty-suggestions">
            Try adjusting your search terms or filters
          </div>
        </div>
      </div>
    );
  }

  // Group results by type
  const groupedResults = results.items.reduce((groups, result) => {
    const type = result.type || 'other';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(result);
    return groups;
  }, {});

  return (
    <div className={`search-results ${className}`}>
      {Object.entries(groupedResults).map(([type, items]) => (
        <div key={type} className="results-group">
          <div className="results-group-header">
            <h4 className="results-group-title">
              {getResultIcon({ type })} {type.charAt(0).toUpperCase() + type.slice(1)}s
              <span className="results-count">({items.length})</span>
            </h4>
          </div>
          
          <div className="results-list">
            {items.map((result, index) => (
              <div role="button" tabIndex={0}
                key={`${type}-${result.id || index}`}
                className="result-item"
                onClick={() => handleResultClick(result)}
                onKeyDown={(e) => handleKeyDown(e, result)}
                tabIndex={0}
                role="button"
                aria-label={`View ${type}: ${result.title || result.name}`}
              >
                <div className="result-icon">
                  {getResultIcon(result)}
                </div>
                
                <div className="result-content">
                  <div className="result-header">
                    <h5 className="result-title">
                      {highlightMatch(result.title || result.name, query)}
                    </h5>
                    
                    {result.status && (
                      <span className={`status-badge ${getStatusBadgeClass(result.status, type)}`}>
                        {result.status}
                      </span>
                    )}
                  </div>
                  
                  {result.description && (
                    <div className="result-description">
                      {highlightMatch(result.description, query)}
                    </div>
                  )}
                  
                  <div className="result-meta">
                    {result.email && (
                      <span className="result-email">
                        {highlightMatch(result.email, query)}
                      </span>
                    )}
                    
                    {result.phone && (
                      <span className="result-phone">
                        {highlightMatch(result.phone, query)}
                      </span>
                    )}
                    
                    {result.created_at && (
                      <span className="result-date">
                        {formatDate(result.created_at)}
                      </span>
                    )}
                    
                    {result.relevanceScore && (
                      <span className="result-relevance">
                        {Math.round(result.relevanceScore * 100)}% match
                      </span>
                    )}
                  </div>
                  
                  {result.highlights && result.highlights.length > 0 && (
                    <div className="result-highlights">
                      {result.highlights.map((highlight, idx) => (
                        <div key={idx} className="result-highlight-item">
                          <strong>{highlight.field}:</strong> 
                          <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(highlight.text) }} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="result-actions">
                  <Button
                    className="result-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleResultClick(result);
                    }}
                    aria-label={`View details for ${result.title || result.name}`}
                  >
                    →
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {results.pagination && results.pagination.hasMore && (
        <div className="results-pagination">
          <Button
            className="btn btn-outline load-more-btn"
            onClick={() => {
              // Handle load more - this would be passed from parent
              console.log('Load more results');
            }}
          >
            Load More Results
          </Button>
        </div>
      )}
    </div>
  );
};

export default SearchResults;