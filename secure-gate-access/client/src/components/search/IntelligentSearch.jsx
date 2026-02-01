/**
 * Intelligent Search Component
 * Provides real-time search with suggestions, advanced filtering, and result highlighting
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { searchService } from '../../services/searchService';
import SearchSuggestions from './SearchSuggestions';
import SearchResults from './SearchResults';
import AdvancedFilters from './AdvancedFilters';
import SearchHistory from './SearchHistory';
import './IntelligentSearch.css';

const IntelligentSearch = ({
  placeholder = "Search visitors, users, incidents...",
  dataTypes = ['visitors', 'users', 'incidents'],
  onResultSelect,
  onSearchComplete,
  className = '',
  showAdvancedFilters = true,
  showHistory = true,
  autoFocus = false
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({});
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const [searchStats, setSearchStats] = useState(null);

  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Auto-focus if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Handle input changes with debounced suggestions
  const handleInputChange = useCallback(async (value) => {
    setQuery(value);
    setSelectedSuggestion(-1);

    if (value.trim().length >= 2) {
      try {
        const suggestions = await searchService.getSuggestions(value, { dataTypes });
        setSuggestions(suggestions);
        setShowSuggestions(true);
      } catch (error) {
        console.error('Failed to get suggestions:', error);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [dataTypes]);

  // Perform search with debouncing
  const performSearch = useCallback(async (searchQuery = query, searchFilters = filters) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    setShowSuggestions(false);

    try {
      const startTime = performance.now();
      
      const searchResults = await searchService.search(searchQuery, {
        dataTypes,
        filters: searchFilters,
        includeHighlights: true
      });

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      setResults(searchResults);
      setSearchStats({
        query: searchQuery,
        totalResults: searchResults?.totalCount || 0,
        responseTime: Math.round(responseTime),
        timestamp: new Date().toISOString()
      });

      if (onSearchComplete) {
        onSearchComplete(searchResults);
      }

    } catch (error) {
      console.error('Search failed:', error);
      setResults({
        items: [],
        totalCount: 0,
        error: 'Search failed. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [query, filters, dataTypes, onSearchComplete]);

  // Handle search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch();
      }, 500); // 500ms debounce for auto-search
    } else {
      setResults(null);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, performSearch]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        performSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestion(prev => prev > 0 ? prev - 1 : -1);
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedSuggestion >= 0) {
          const suggestion = suggestions[selectedSuggestion];
          handleSuggestionSelect(suggestion);
        } else {
          performSearch();
        }
        break;

      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
        break;

      default:
        break;
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    setSelectedSuggestion(-1);
    
    // Perform search immediately
    setTimeout(() => {
      performSearch(suggestion.text);
    }, 100);
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    if (query.trim()) {
      performSearch(query, newFilters);
    }
  };

  // Handle result selection
  const handleResultSelect = (result) => {
    if (onResultSelect) {
      onResultSelect(result);
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    if (query.length >= 2) {
      setShowSuggestions(true);
    }
  };

  // Handle input blur (with delay to allow suggestion clicks)
  const handleInputBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedSuggestion(-1);
    }, 200);
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setResults(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchStats(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div className={`intelligent-search ${className}`}>
      {/* Search Input */}
      <div className="search-input-container">
        <div className="search-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder={placeholder}
            className="search-input"
            aria-label="Search"
            aria-expanded={showSuggestions}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            role="combobox"
          />
          
          <div className="search-input-actions">
            {isLoading && (
              <div className="search-loading" aria-label="Searching...">
                <div className="spinner"></div>
              </div>
            )}
            
            {query && !isLoading && (
              <button
                onClick={clearSearch}
                className="clear-search-btn"
                aria-label="Clear search"
                type="button"
              >
                ✕
              </button>
            )}
            
            {showAdvancedFilters && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`filters-toggle-btn ${showFilters ? 'active' : ''}`}
                aria-label="Toggle advanced filters"
                type="button"
              >
                🔍
              </button>
            )}
          </div>
        </div>

        {/* Search Suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <SearchSuggestions
            ref={suggestionsRef}
            suggestions={suggestions}
            selectedIndex={selectedSuggestion}
            onSelect={handleSuggestionSelect}
            query={query}
          />
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && showAdvancedFilters && (
        <AdvancedFilters
          filters={filters}
          onChange={handleFiltersChange}
          dataTypes={dataTypes}
        />
      )}

      {/* Search Stats */}
      {searchStats && (
        <div className="search-stats">
          <span className="results-count">
            {searchStats.totalResults.toLocaleString()} results
          </span>
          <span className="response-time">
            ({searchStats.responseTime}ms)
          </span>
        </div>
      )}

      {/* Search Results */}
      {results && (
        <SearchResults
          results={results}
          query={query}
          onResultSelect={handleResultSelect}
          isLoading={isLoading}
        />
      )}

      {/* Search History (when no query) */}
      {!query && showHistory && (
        <SearchHistory
          onHistorySelect={(historyQuery) => {
            setQuery(historyQuery);
            performSearch(historyQuery);
          }}
        />
      )}
    </div>
  );
};

export default IntelligentSearch;