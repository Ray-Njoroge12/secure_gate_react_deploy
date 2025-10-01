import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook that debounces a value
 * @param {*} value - The value to debounce
 * @param {number} delay - The delay in milliseconds
 * @returns {*} The debounced value
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cancel the timeout if value changes (also on delay change or unmount)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Custom hook that provides debounced callback functionality
 * @param {Function} callback - The callback function to debounce
 * @param {number} delay - The delay in milliseconds
 * @param {Array} deps - Dependencies array for the callback
 * @returns {Function} The debounced callback function
 */
export const useDebouncedCallback = (callback, delay = 500, deps = []) => {
  const timeoutRef = useRef(null);

  const debouncedCallback = (...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, deps);

  return debouncedCallback;
};

/**
 * Custom hook for debounced search functionality
 * @param {string} initialValue - Initial search value
 * @param {Function} onSearch - Search callback function
 * @param {number} delay - Debounce delay in milliseconds
 * @returns {Object} Search state and handlers
 */
export const useDebouncedSearch = (initialValue = '', onSearch = () => {}, delay = 300) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, delay);

  useEffect(() => {
    if (debouncedSearchTerm) {
      setIsSearching(true);
      onSearch(debouncedSearchTerm).finally(() => {
        setIsSearching(false);
      });
    } else {
      // Clear search results when search term is empty
      onSearch('');
      setIsSearching(false);
    }
  }, [debouncedSearchTerm, onSearch]);

  const clearSearch = () => {
    setSearchTerm('');
  };

  return {
    searchTerm,
    setSearchTerm,
    debouncedSearchTerm,
    isSearching,
    clearSearch
  };
};

export default useDebounce;
