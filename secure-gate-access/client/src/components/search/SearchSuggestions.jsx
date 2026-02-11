/**
 * Search Suggestions Component
 * Displays real-time search suggestions with keyboard navigation
 */

import React, { forwardRef } from 'react';
import './SearchSuggestions.css';

const SearchSuggestions = forwardRef(({
  suggestions = [],
  selectedIndex = -1,
  onSelect,
  query = '',
  maxVisible = 8
}, ref) => {
  
  // Highlight matching text in suggestions
  const highlightMatch = (text, query) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="suggestion-highlight">{part}</mark>
      ) : part
    );
  };

  // Get icon for suggestion type
  const getSuggestionIcon = (suggestion) => {
    switch (suggestion.type) {
      case 'recent':
        return '🕒';
      case 'popular':
        return '🔥';
      case 'visitor':
        return '👤';
      case 'user':
        return '👨‍💼';
      case 'incident':
        return '⚠️';
      case 'estate':
        return '🏢';
      default:
        return '🔍';
    }
  };

  // Get suggestion description
  const getSuggestionDescription = (suggestion) => {
    switch (suggestion.type) {
      case 'recent':
        return 'Recent search';
      case 'popular':
        return `Popular (${suggestion.count} searches)`;
      case 'visitor':
        return suggestion.description || 'Visitor';
      case 'user':
        return suggestion.description || 'User';
      case 'incident':
        return suggestion.description || 'Incident';
      case 'estate':
        return suggestion.description || 'Estate';
      default:
        return suggestion.description || '';
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion, index) => {
    if (onSelect) {
      onSelect(suggestion, index);
    }
  };

  // Handle keyboard events
  const handleKeyDown = (e, suggestion, index) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSuggestionClick(suggestion, index);
    }
  };

  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  const visibleSuggestions = suggestions.slice(0, maxVisible);

  return (
    <div 
      ref={ref}
      className="search-suggestions"
      role="listbox"
      aria-label="Search suggestions"
    >
      {visibleSuggestions.map((suggestion, index) => (
        <div role="button" tabIndex={0}
          key={`${suggestion.type}-${suggestion.text}-${index}`}
          className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
          onClick={() => handleSuggestionClick(suggestion, index)}
          onKeyDown={(e) => handleKeyDown(e, suggestion, index)}
          role="option"
          aria-selected={index === selectedIndex}
          tabIndex={index === selectedIndex ? 0 : -1}
        >
          <div className="suggestion-icon">
            {getSuggestionIcon(suggestion)}
          </div>
          
          <div className="suggestion-content">
            <div className="suggestion-text">
              {highlightMatch(suggestion.text, query)}
            </div>
            
            {suggestion.description && (
              <div className="suggestion-description">
                {getSuggestionDescription(suggestion)}
              </div>
            )}
          </div>
          
          {suggestion.category && (
            <div className="suggestion-category">
              {suggestion.category}
            </div>
          )}
          
          {suggestion.type === 'recent' && (
            <div className="suggestion-meta">
              {new Date(suggestion.timestamp).toLocaleDateString()}
            </div>
          )}
        </div>
      ))}
      
      {suggestions.length > maxVisible && (
        <div className="suggestions-more">
          +{suggestions.length - maxVisible} more suggestions
        </div>
      )}
    </div>
  );
});

SearchSuggestions.displayName = 'SearchSuggestions';

export default SearchSuggestions;