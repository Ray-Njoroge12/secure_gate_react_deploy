/**
 * @fileoverview SearchBar component for Secure Gate Access
 * @description Advanced search bar with autocomplete, search history, and saved searches
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Search, X, Clock, Star, ChevronDown } from '../icons';
import { useSearchSuggestions, useSavedSearches } from '../../hooks/useSearch';
import { searchUtils } from '../../utils/searchUtils';

/**
 * SearchBar component with autocomplete and search history
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.value - Current search value
 * @param {Function} props.onChange - Function called when search value changes
 * @param {Function} props.onSearch - Function called when search is submitted
 * @param {Array} props.data - Data to search through for suggestions
 * @param {Array} props.searchFields - Fields to search in
 * @param {string} props.placeholder - Placeholder text
 * @param {boolean} props.showHistory - Whether to show search history
 * @param {boolean} props.showSavedSearches - Whether to show saved searches
 * @param {boolean} props.showSuggestions - Whether to show autocomplete suggestions
 * @param {number} props.maxSuggestions - Maximum number of suggestions to show
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.disabled - Whether the search bar is disabled
 * @param {boolean} props.autoFocus - Whether to auto-focus the input
 * @returns {JSX.Element} SearchBar component
 * 
 * @example
 * <SearchBar
 *   value={searchTerm}
 *   onChange={setSearchTerm}
 *   onSearch={handleSearch}
 *   data={visitors}
 *   searchFields={['name', 'email', 'phone']}
 *   placeholder="Search visitors..."
 *   showHistory={true}
 *   showSavedSearches={true}
 * />
 */
const SearchBar = memo(({
  value = '',
  onChange,
  onSearch,
  data = [],
  searchFields = [],
  placeholder = 'Search...',
  showHistory = true,
  showSavedSearches = true,
  showSuggestions = true,
  maxSuggestions = 5,
  className = '',
  disabled = false,
  autoFocus = false,
  ...props
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('suggestions');
  
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const suggestionRefs = useRef([]);

  // Get suggestions and saved searches
  const { suggestions, searchHistory, hasSuggestions } = useSearchSuggestions(data, searchFields, maxSuggestions);
  const { savedSearches, loadSavedSearch, deleteSavedSearch, hasSavedSearches } = useSavedSearches();

  // Filter search history to show only recent searches
  const recentHistory = searchHistory.slice(0, 5);

  // Handle input change
  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    if (newValue.length > 0) {
      setShowDropdown(true);
      setActiveTab('suggestions');
    } else {
      setShowDropdown(false);
    }
  }, [onChange]);

  // Handle input focus
  const handleInputFocus = useCallback(() => {
    if (value.length > 0 || recentHistory.length > 0 || hasSavedSearches) {
      setShowDropdown(true);
    }
  }, [value, recentHistory.length, hasSavedSearches]);

  // Handle input blur
  const handleInputBlur = useCallback((e) => {
    // Don't close if clicking on dropdown
    if (dropdownRef.current && dropdownRef.current.contains(e.relatedTarget)) {
      return;
    }
    setShowDropdown(false);
    setHighlightedIndex(-1);
  }, []);

  // Handle search submission
  const handleSearch = useCallback((searchValue = value) => {
    if (searchValue.trim()) {
      onSearch(searchValue.trim());
      setShowDropdown(false);
      setHighlightedIndex(-1);
    }
  }, [value, onSearch]);

  // Handle key down events
  const handleKeyDown = useCallback((e) => {
    if (!showDropdown) {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
      }
      return;
    }

    const totalItems = getTotalDropdownItems();
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < totalItems - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : totalItems - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0) {
          handleDropdownItemClick(highlightedIndex);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
      case 'Tab':
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  }, [showDropdown, highlightedIndex, handleSearch]);

  // Get total number of dropdown items
  const getTotalDropdownItems = useCallback(() => {
    let count = 0;
    if (activeTab === 'suggestions' && showSuggestions) {
      count += suggestions.length;
    }
    if (activeTab === 'history' && showHistory) {
      count += recentHistory.length;
    }
    if (activeTab === 'saved' && showSavedSearches) {
      count += savedSearches.length;
    }
    return count;
  }, [activeTab, suggestions.length, recentHistory.length, savedSearches.length, showSuggestions, showHistory, showSavedSearches]);

  // Handle dropdown item click
  const handleDropdownItemClick = useCallback((index) => {
    let item = null;
    let count = 0;

    if (activeTab === 'suggestions' && showSuggestions) {
      if (index < suggestions.length) {
        item = suggestions[index];
        onChange(item);
        handleSearch(item);
        return;
      }
      count += suggestions.length;
    }

    if (activeTab === 'history' && showHistory) {
      if (index < count + recentHistory.length) {
        item = recentHistory[index - count];
        onChange(item);
        handleSearch(item);
        return;
      }
      count += recentHistory.length;
    }

    if (activeTab === 'saved' && showSavedSearches) {
      if (index < count + savedSearches.length) {
        item = savedSearches[index - count];
        loadSavedSearch(item);
        setShowDropdown(false);
        return;
      }
    }
  }, [activeTab, suggestions, recentHistory, savedSearches, onChange, handleSearch, loadSavedSearch, showSuggestions, showHistory, showSavedSearches]);

  // Clear search
  const handleClear = useCallback(() => {
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  // Auto-focus on mount
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Update suggestion refs
  useEffect(() => {
    suggestionRefs.current = suggestionRefs.current.slice(0, getTotalDropdownItems());
  }, [getTotalDropdownItems]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && suggestionRefs.current[highlightedIndex]) {
      suggestionRefs.current[highlightedIndex].scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }
  }, [highlightedIndex]);

  // Render suggestion item
  const renderSuggestionItem = (suggestion, index) => (
    <div
      key={`suggestion-${index}`}
      ref={el => suggestionRefs.current[index] = el}
      className={`px-4 py-2 cursor-pointer text-sm text-slate-200 hover:bg-slate-700 ${
        highlightedIndex === index ? 'bg-slate-700' : ''
      }`}
      onClick={() => {
        onChange(suggestion);
        handleSearch(suggestion);
      }}
    >
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400" />
        <span>{suggestion}</span>
      </div>
    </div>
  );

  // Render history item
  const renderHistoryItem = (historyItem, index) => (
    <div
      key={`history-${index}`}
      ref={el => suggestionRefs.current[index] = el}
      className={`px-4 py-2 cursor-pointer text-sm text-slate-200 hover:bg-slate-700 ${
        highlightedIndex === index ? 'bg-slate-700' : ''
      }`}
      onClick={() => {
        onChange(historyItem);
        handleSearch(historyItem);
      }}
    >
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-slate-400" />
        <span>{historyItem}</span>
      </div>
    </div>
  );

  // Render saved search item
  const renderSavedSearchItem = (savedSearch, index) => (
    <div
      key={`saved-${savedSearch.id}`}
      ref={el => suggestionRefs.current[index] = el}
      className={`px-4 py-2 cursor-pointer text-sm text-slate-200 hover:bg-slate-700 ${
        highlightedIndex === index ? 'bg-slate-700' : ''
      }`}
      onClick={() => loadSavedSearch(savedSearch)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-400" />
          <span>{savedSearch.name}</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            deleteSavedSearch(savedSearch.id);
          }}
          className="text-slate-400 hover:text-red-400"
          aria-label={`Delete saved search: ${savedSearch.name}`}
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  // Render dropdown content
  const renderDropdownContent = () => {
    if (!showDropdown) return null;

    const hasContent = 
      (activeTab === 'suggestions' && suggestions.length > 0) ||
      (activeTab === 'history' && recentHistory.length > 0) ||
      (activeTab === 'saved' && savedSearches.length > 0);

    if (!hasContent) {
      return (
        <div className="px-4 py-8 text-center text-slate-400">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No {activeTab} available</p>
        </div>
      );
    }

    return (
      <div className="max-h-64 overflow-y-auto">
        {activeTab === 'suggestions' && showSuggestions && suggestions.map(renderSuggestionItem)}
        {activeTab === 'history' && showHistory && recentHistory.map(renderHistoryItem)}
        {activeTab === 'saved' && showSavedSearches && savedSearches.map(renderSavedSearchItem)}
      </div>
    );
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-slate-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            w-full pl-10 pr-10 py-2 sm:py-3 bg-slate-800 border border-slate-600 rounded-lg
            text-sm sm:text-base text-slate-200 placeholder-slate-400
            focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-200
          `}
          aria-label="Search input"
          aria-expanded={showDropdown}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          {...props}
        />
        {value && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg"
          role="listbox"
        >
          {/* Tabs */}
          {(showSuggestions || showHistory || showSavedSearches) && (
            <div className="flex border-b border-slate-600">
              {showSuggestions && (
                <button
                  onClick={() => setActiveTab('suggestions')}
                  className={`px-4 py-2 text-xs font-medium ${
                    activeTab === 'suggestions'
                      ? 'text-brand-400 border-b-2 border-brand-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Suggestions
                </button>
              )}
              {showHistory && (
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-2 text-xs font-medium ${
                    activeTab === 'history'
                      ? 'text-brand-400 border-b-2 border-brand-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  History
                </button>
              )}
              {showSavedSearches && (
                <button
                  onClick={() => setActiveTab('saved')}
                  className={`px-4 py-2 text-xs font-medium ${
                    activeTab === 'saved'
                      ? 'text-brand-400 border-b-2 border-brand-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Saved
                </button>
              )}
            </div>
          )}

          {/* Content */}
          {renderDropdownContent()}
        </div>
      )}
    </div>
  );
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;



