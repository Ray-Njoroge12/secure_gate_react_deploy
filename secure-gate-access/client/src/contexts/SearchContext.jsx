import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import logger from 'utils/logger';
import { searchUtils } from '../utils/searchUtils';

const SearchContext = createContext(null);

export const SearchProvider = ({ children, options = {} }) => {
  const {
    enableUrlState = true,
    enableLocalStorage = true,
    storageKey = 'searchState',
    debounceDelay = 300
  } = options;

  const [searchState, setSearchState] = useState({
    searchTerm: '',
    filters: {},
    sortField: '',
    sortDirection: 'asc',
    currentPage: 1,
    pageSize: 10
  });

  const [searchHistory, setSearchHistory] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);

  // Load state from URL on mount
  useEffect(() => {
    if (enableUrlState) {
      const urlState = searchUtils.loadSearchState();
      setSearchState(prev => ({
        ...prev,
        ...urlState,
        filters: (urlState && urlState.filters) || {}
      }));
    }
  }, [enableUrlState]);

  // Load state from localStorage on mount
  useEffect(() => {
    if (enableLocalStorage) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsedState = JSON.parse(saved);
          setSearchState(prev => ({
            ...prev,
            ...parsedState
          }));
        }
      } catch (error) {
        logger.warn('[SEARCH] Failed to load search state from localStorage:', error);
      }
    }
  }, [enableLocalStorage, storageKey]);

  // Save state to localStorage
  useEffect(() => {
    if (enableLocalStorage) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(searchState));
      } catch (error) {
        logger.warn('[SEARCH] Failed to save search state to localStorage:', error);
      }
    }
  }, [searchState, enableLocalStorage, storageKey]);

  // Save state to URL
  useEffect(() => {
    if (enableUrlState) {
      searchUtils.saveSearchState({
        search: searchState.searchTerm,
        filters: JSON.stringify(searchState.filters),
        sort: searchState.sortField,
        page: searchState.currentPage
      });
    }
  }, [searchState, enableUrlState]);

  // Update search term
  const updateSearchTerm = useCallback((term) => {
    setSearchState(prev => ({
      ...prev,
      searchTerm: term,
      currentPage: 1 // Reset to first page
    }));

    // Add to search history
    if (term && term.length > 2) {
      setSearchHistory(prev => {
        const newHistory = [term, ...prev.filter(item => item !== term)].slice(0, 10);
        return newHistory;
      });
    }
  }, []);

  // Update filters
  const updateFilters = useCallback((filters) => {
    setSearchState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...filters },
      currentPage: 1 // Reset to first page
    }));
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchState(prev => ({
      ...prev,
      filters: {},
      currentPage: 1
    }));
  }, []);

  // Update sort
  const updateSort = useCallback((field, direction = 'asc') => {
    setSearchState(prev => ({
      ...prev,
      sortField: field,
      sortDirection: direction,
      currentPage: 1 // Reset to first page
    }));
  }, []);

  // Update page
  const updatePage = useCallback((page) => {
    setSearchState(prev => ({
      ...prev,
      currentPage: page
    }));
  }, []);

  // Update page size
  const updatePageSize = useCallback((size) => {
    setSearchState(prev => ({
      ...prev,
      pageSize: size,
      currentPage: 1 // Reset to first page
    }));
  }, []);

  // Clear all search state
  const clearSearch = useCallback(() => {
    setSearchState({
      searchTerm: '',
      filters: {},
      sortField: '',
      sortDirection: 'asc',
      currentPage: 1,
      pageSize: 10
    });
  }, []);

  // Save current search
  const saveSearch = useCallback((name) => {
    const newSavedSearch = {
      id: Date.now().toString(),
      name,
      state: { ...searchState },
      createdAt: new Date().toISOString()
    };

    setSavedSearches(prev => [newSavedSearch, ...prev.slice(0, 9)]); // Keep only 10 saved searches
  }, [searchState]);

  // Load saved search
  const loadSavedSearch = useCallback((savedSearch) => {
    setSearchState(savedSearch.state);
  }, []);

  // Delete saved search
  const deleteSavedSearch = useCallback((id) => {
    setSavedSearches(prev => prev.filter(search => search.id !== id));
  }, []);

  // Get search suggestions
  const getSuggestions = useCallback((data, fields, maxSuggestions = 5) => {
    return searchUtils.getSuggestions(data, searchState.searchTerm, fields, maxSuggestions);
  }, [searchState.searchTerm]);

  // Search data with current state
  const searchData = useCallback((data, searchFields, filterFields) => {
    // Ensure data is an array to prevent "data is not iterable" error
    if (!Array.isArray(data)) {
      return [];
    }
    let result = [...data];

    // Apply search
    if (searchState.searchTerm && searchFields.length > 0) {
      result = searchUtils.searchText(result, searchState.searchTerm, searchFields);
    }

    // Apply filters
    if (Object.keys(searchState.filters).length > 0) {
      result = searchUtils.filterData(result, searchState.filters);
    }

    // Apply sorting
    if (searchState.sortField) {
      result = searchUtils.sortData(result, searchState.sortField, searchState.sortDirection);
    }

    return result;
  }, [searchState]);

  // Get paginated data
  const getPaginatedData = useCallback((data) => {
    return searchUtils.paginateData(data, searchState.currentPage, searchState.pageSize);
  }, [searchState.currentPage, searchState.pageSize]);

  // Get search statistics
  const getSearchStats = useCallback((originalData, filteredData) => {
    return {
      totalItems: originalData.length,
      filteredItems: filteredData.length,
      searchTerm: searchState.searchTerm,
      activeFilters: Object.keys(searchState.filters).length,
      currentPage: searchState.currentPage,
      totalPages: Math.ceil(filteredData.length / searchState.pageSize)
    };
  }, [searchState]);

  const value = {
    // State
    searchState,
    searchHistory,
    savedSearches,

    // Actions
    updateSearchTerm,
    updateFilters,
    clearFilters,
    updateSort,
    updatePage,
    updatePageSize,
    clearSearch,
    saveSearch,
    loadSavedSearch,
    deleteSavedSearch,

    // Utilities
    getSuggestions,
    searchData,
    getPaginatedData,
    getSearchStats
  };

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

export { SearchContext };
export default SearchContext;

