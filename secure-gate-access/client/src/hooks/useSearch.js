import { useContext } from 'react';
import SearchContext from '../contexts/SearchContext';

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};

// Hook for search with specific data
export const useSearchData = (data, searchFields, filterFields, options = {}) => {
  const {
    enablePagination = true,
    enableSorting = true,
    enableFiltering = true
  } = options;

  const {
    searchState,
    searchData,
    getPaginatedData,
    getSearchStats,
    updateSearchTerm,
    updateFilters,
    clearFilters,
    updateSort,
    updatePage,
    updatePageSize,
    clearSearch
  } = useSearch();

  // Search and filter data
  const filteredData = searchData(data, searchFields, filterFields);

  // Get paginated data
  const paginatedResult = enablePagination 
    ? getPaginatedData(filteredData)
    : { data: filteredData, totalPages: 1, currentPage: 1, totalItems: filteredData.length };

  // Get search statistics
  const stats = getSearchStats(data, filteredData);

  return {
    // Data
    data: paginatedResult.data,
    filteredData,
    originalData: data,
    
    // Pagination
    pagination: {
      currentPage: paginatedResult.currentPage,
      totalPages: paginatedResult.totalPages,
      totalItems: paginatedResult.totalItems,
      hasNextPage: paginatedResult.hasNextPage,
      hasPrevPage: paginatedResult.hasPrevPage,
      pageSize: searchState.pageSize
    },
    
    // Search state
    searchTerm: searchState.searchTerm,
    filters: searchState.filters,
    sortField: searchState.sortField,
    sortDirection: searchState.sortDirection,
    
    // Statistics
    stats,
    
    // Actions
    setSearchTerm: updateSearchTerm,
    setFilters: updateFilters,
    clearFilters,
    setSort: updateSort,
    setPage: updatePage,
    setPageSize: updatePageSize,
    clearSearch,
    
    // Utilities
    isSearching: searchState.searchTerm.length > 0,
    hasFilters: Object.keys(searchState.filters).length > 0,
    hasResults: filteredData.length > 0
  };
};

// Hook for search suggestions
export const useSearchSuggestions = (data, fields, maxSuggestions = 5) => {
  const { getSuggestions, searchHistory } = useSearch();
  
  const suggestions = getSuggestions(data, fields, maxSuggestions);
  
  return {
    suggestions,
    searchHistory,
    hasSuggestions: suggestions.length > 0
  };
};

// Hook for saved searches
export const useSavedSearches = () => {
  const {
    savedSearches,
    saveSearch,
    loadSavedSearch,
    deleteSavedSearch
  } = useSearch();
  
  return {
    savedSearches,
    saveSearch,
    loadSavedSearch,
    deleteSavedSearch,
    hasSavedSearches: savedSearches.length > 0
  };
};

export default useSearch;

