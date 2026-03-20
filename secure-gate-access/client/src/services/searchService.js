/**
 * Advanced Search Service
 * Provides intelligent search functionality with real-time suggestions,
 * advanced filtering, and performance optimization
 */

import api from '../utils/apiClient';
import logger from '../utils/logger';

class SearchService {
  constructor() {
    this.searchCache = new Map();
    this.suggestionCache = new Map();
    this.searchHistory = this.loadSearchHistory();
    this.popularQueries = new Map();
    this.debounceTimeout = null;
    this.abortController = null;
  }

  /**
   * Perform intelligent search with real-time suggestions
   */
  async search(query, options = {}) {
    const {
      dataTypes = ['visitors', 'users', 'incidents'],
      filters = {},
      sortBy = 'relevance',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
      includeHighlights = true
    } = options;

    // Abort previous search if still running
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    const searchKey = this.generateSearchKey(query, options);

    // Check cache first
    if (this.searchCache.has(searchKey)) {
      return this.searchCache.get(searchKey);
    }

    try {
      const startTime = performance.now();

      const response = await api.post('/api/search', {
        query: query.trim(),
        dataTypes,
        filters,
        sortBy,
        sortOrder,
        page,
        limit,
        includeHighlights
      }, { signal: this.abortController.signal });

      const result = response.data;
      const responseTime = performance.now() - startTime;

      // Process search results
      const processedResult = {
        ...result.data,
        responseTime,
        query,
        timestamp: new Date().toISOString()
      };

      // Cache results for 5 minutes
      this.searchCache.set(searchKey, processedResult);
      setTimeout(() => this.searchCache.delete(searchKey), 5 * 60 * 1000);

      // Update search history and popular queries
      this.updateSearchHistory(query);
      this.updatePopularQueries(query);

      return processedResult;

    } catch (error) {
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        return null; // Search was cancelled
      }
      throw error;
    }
  }

  /**
   * Get real-time search suggestions
   */
  async getSuggestions(query, options = {}) {
    const { maxSuggestions = 10, dataTypes = ['visitors', 'users'] } = options;

    if (!query || query.length < 2) {
      return this.getRecentSearches(maxSuggestions);
    }

    const suggestionKey = `${query.toLowerCase()}_${dataTypes.join('_')}`;

    // Check cache first
    if (this.suggestionCache.has(suggestionKey)) {
      return this.suggestionCache.get(suggestionKey);
    }

    // Debounce suggestion requests
    return new Promise((resolve) => {
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
      }

      this.debounceTimeout = setTimeout(async () => {
        try {
          const response = await api.post('/api/search/suggestions', {
            query: query.trim(),
            dataTypes,
            maxSuggestions
          });

          const result = response.data;
          const suggestions = result.data.suggestions || [];

          // Cache suggestions for 2 minutes
          this.suggestionCache.set(suggestionKey, suggestions);
          setTimeout(() => this.suggestionCache.delete(suggestionKey), 2 * 60 * 1000);

          resolve(suggestions);

        } catch (error) {
          logger.error('Failed to get suggestions:', error);
          resolve([]);
        }
      }, 300); // 300ms debounce
    });
  }

  /**
   * Create advanced filter builder
   */
  createFilterBuilder() {
    return new FilterBuilder();
  }

  /**
   * Save filter set for reuse
   */
  async saveFilterSet(name, filters, description = '') {
    try {
      const response = await api.post('/api/search/filter-sets', {
        name,
        filters,
        description
      });

      return response.data;

    } catch (error) {
      logger.error('Failed to save filter set:', error);
      throw error;
    }
  }

  /**
   * Load saved filter sets
   */
  async getFilterSets() {
    try {
      const response = await api.get('/api/search/filter-sets');
      const result = response.data;
      return result.data.filterSets || [];

    } catch (error) {
      logger.error('Failed to load filter sets:', error);
      return [];
    }
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(timeRange = '7d') {
    try {
      const response = await api.get(`/api/search/analytics?timeRange=${timeRange}`);
      const result = response.data;
      return result.data;

    } catch (error) {
      logger.error('Failed to get search analytics:', error);
      return null;
    }
  }

  /**
   * Generate cache key for search results
   */
  generateSearchKey(query, options) {
    const keyData = {
      query: query.toLowerCase().trim(),
      dataTypes: options.dataTypes?.sort(),
      filters: options.filters,
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
      page: options.page,
      limit: options.limit
    };
    return btoa(JSON.stringify(keyData));
  }

  /**
   * Update search history
   */
  updateSearchHistory(query) {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) return;

    // Remove if already exists
    this.searchHistory = this.searchHistory.filter(item => item.query !== trimmedQuery);

    // Add to beginning
    this.searchHistory.unshift({
      query: trimmedQuery,
      timestamp: new Date().toISOString()
    });

    // Keep only last 50 searches
    this.searchHistory = this.searchHistory.slice(0, 50);

    // Save to localStorage
    localStorage.setItem('searchHistory', JSON.stringify(this.searchHistory));
  }

  /**
   * Update popular queries tracking
   */
  updatePopularQueries(query) {
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery || trimmedQuery.length < 2) return;

    const count = this.popularQueries.get(trimmedQuery) || 0;
    this.popularQueries.set(trimmedQuery, count + 1);
  }

  /**
   * Get recent searches
   */
  getRecentSearches(limit = 10) {
    return this.searchHistory
      .slice(0, limit)
      .map(item => ({
        text: item.query,
        type: 'recent',
        timestamp: item.timestamp
      }));
  }

  /**
   * Get popular queries
   */
  getPopularQueries(limit = 10) {
    return Array.from(this.popularQueries.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([query, count]) => ({
        text: query,
        type: 'popular',
        count
      }));
  }

  /**
   * Load search history from localStorage
   */
  loadSearchHistory() {
    try {
      const stored = localStorage.getItem('searchHistory');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      logger.error('Failed to load search history:', error);
      return [];
    }
  }

  /**
   * Clear search cache
   */
  clearCache() {
    this.searchCache.clear();
    this.suggestionCache.clear();
  }

  /**
   * Clear search history
   */
  clearHistory() {
    this.searchHistory = [];
    localStorage.removeItem('searchHistory');
  }
}

/**
 * Advanced Filter Builder
 * Supports complex AND/OR logic with nested conditions
 */
class FilterBuilder {
  constructor() {
    this.conditions = [];
    this.logic = 'AND'; // Default logic operator
  }

  /**
   * Add a condition to the filter
   */
  addCondition(field, operator, value, dataType = 'string') {
    this.conditions.push({
      field,
      operator,
      value,
      dataType,
      id: this.generateConditionId()
    });
    return this;
  }

  /**
   * Add a group of conditions with specific logic
   */
  addGroup(logic = 'AND') {
    const group = new FilterBuilder();
    group.logic = logic;
    this.conditions.push({
      type: 'group',
      group,
      id: this.generateConditionId()
    });
    return group;
  }

  /**
   * Set the logic operator for this level
   */
  setLogic(logic) {
    this.logic = logic;
    return this;
  }

  /**
   * Remove a condition by ID
   */
  removeCondition(conditionId) {
    this.conditions = this.conditions.filter(condition => condition.id !== conditionId);
    return this;
  }

  /**
   * Build the filter object
   */
  build() {
    return {
      logic: this.logic,
      conditions: this.conditions.map(condition => {
        if (condition.type === 'group') {
          return {
            type: 'group',
            ...condition.group.build()
          };
        }
        return condition;
      })
    };
  }

  /**
   * Generate unique condition ID
   */
  generateConditionId() {
    return `condition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate the filter structure
   */
  validate() {
    const errors = [];

    if (this.conditions.length === 0) {
      errors.push('At least one condition is required');
    }

    this.conditions.forEach((condition, index) => {
      if (condition.type === 'group') {
        const groupErrors = condition.group.validate();
        errors.push(...groupErrors.map(error => `Group ${index + 1}: ${error}`));
      } else {
        if (!condition.field) {
          errors.push(`Condition ${index + 1}: Field is required`);
        }
        if (!condition.operator) {
          errors.push(`Condition ${index + 1}: Operator is required`);
        }
        if (condition.value === undefined || condition.value === null || condition.value === '') {
          errors.push(`Condition ${index + 1}: Value is required`);
        }
      }
    });

    return errors;
  }
}

// Export singleton instance
export const searchService = new SearchService();
export { FilterBuilder };
