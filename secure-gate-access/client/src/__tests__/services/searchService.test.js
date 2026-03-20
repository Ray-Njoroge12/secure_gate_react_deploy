/**
 * Unit Tests: SearchService
 * Tests search functionality, caching, and performance optimization
 */

jest.mock('../../utils/apiClient', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    get: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

import { searchService, FilterBuilder } from '../../services/searchService';
import api from '../../utils/apiClient';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now())
};

// Save original AbortController
const OriginalAbortController = global.AbortController;

describe('SearchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.post.mockClear();
    api.get.mockClear();
    localStorageMock.getItem.mockReturnValue(null);
    // Restore AbortController in case a test overrode it
    global.AbortController = OriginalAbortController;
    searchService.clearCache();
    searchService.searchHistory = [];
    searchService.popularQueries = new Map();
    searchService.abortController = null;
  });

  describe('search functionality', () => {
    test('performs basic search with default options', async () => {
      const mockResponse = {
        data: {
          data: {
            items: [
              { id: 1, title: 'John Doe', type: 'visitor', relevanceScore: 0.95 }
            ],
            totalCount: 1
          }
        }
      };

      api.post.mockResolvedValueOnce(mockResponse);

      const result = await searchService.search('john');

      expect(api.post).toHaveBeenCalledWith('/api/search', {
        query: 'john',
        dataTypes: ['visitors', 'users', 'incidents'],
        filters: {},
        sortBy: 'relevance',
        sortOrder: 'desc',
        page: 1,
        limit: 20,
        includeHighlights: true
      }, { signal: expect.any(AbortSignal) });

      expect(result.items).toHaveLength(1);
      expect(result.query).toBe('john');
      expect(result.responseTime).toBeGreaterThan(0);
    });

    test('performs search with custom options', async () => {
      const mockResponse = {
        data: {
          data: {
            items: [],
            totalCount: 0
          }
        }
      };

      api.post.mockResolvedValueOnce(mockResponse);

      const options = {
        dataTypes: ['visitors'],
        filters: { status: 'active' },
        sortBy: 'name',
        sortOrder: 'asc',
        page: 2,
        limit: 10
      };

      await searchService.search('test', options);

      expect(api.post).toHaveBeenCalledWith('/api/search', {
        query: 'test',
        ...options,
        includeHighlights: true
      }, { signal: expect.any(AbortSignal) });
    });

    test('handles search errors', async () => {
      api.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(searchService.search('test')).rejects.toThrow('Network error');
    });

    test('aborts previous search when new search starts', async () => {
      const mockAbort = jest.fn();
      const mockAbortController = {
        abort: mockAbort,
        signal: { aborted: false }
      };

      global.AbortController = jest.fn(() => mockAbortController);

      // Start first search (will hang since no mock response, but that's ok)
      searchService.search('first').catch(() => {});

      // Start second search immediately
      searchService.search('second').catch(() => {});

      expect(mockAbort).toHaveBeenCalled();

      // Restore for other tests
      global.AbortController = OriginalAbortController;
    });
  });

  describe('caching functionality', () => {
    test('caches search results', async () => {
      const mockResponse = {
        data: {
          data: {
            items: [{ id: 1, title: 'John Doe' }],
            totalCount: 1
          }
        }
      };

      api.post.mockResolvedValueOnce(mockResponse);

      // First search
      const result1 = await searchService.search('john');
      expect(api.post).toHaveBeenCalledTimes(1);

      // Second search with same parameters should use cache
      const result2 = await searchService.search('john');
      expect(api.post).toHaveBeenCalledTimes(1); // No additional call
      expect(result2).toEqual(result1);
    });

    test('generates different cache keys for different options', async () => {
      const mockResponse = {
        data: {
          data: { items: [], totalCount: 0 }
        }
      };

      api.post.mockResolvedValue(mockResponse);

      await searchService.search('john', { dataTypes: ['visitors'] });
      await searchService.search('john', { dataTypes: ['users'] });

      expect(api.post).toHaveBeenCalledTimes(2);
    });

    test('clears cache when requested', async () => {
      const mockResponse = {
        data: {
          data: { items: [], totalCount: 0 }
        }
      };

      api.post.mockResolvedValue(mockResponse);

      // First search
      await searchService.search('john');
      expect(api.post).toHaveBeenCalledTimes(1);

      // Clear cache
      searchService.clearCache();

      // Second search should fetch again
      await searchService.search('john');
      expect(api.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('suggestions functionality', () => {
    test('gets search suggestions', async () => {
      jest.useFakeTimers();

      const mockSuggestions = [
        { text: 'John Doe', type: 'visitor', count: 5 }
      ];

      api.post.mockResolvedValueOnce({
        data: { data: { suggestions: mockSuggestions } }
      });

      const promise = searchService.getSuggestions('john');

      // Advance past debounce
      jest.advanceTimersByTime(300);

      const suggestions = await promise;

      expect(api.post).toHaveBeenCalledWith('/api/search/suggestions', {
        query: 'john',
        dataTypes: ['visitors', 'users'],
        maxSuggestions: 10
      });

      expect(suggestions).toEqual(mockSuggestions);

      jest.useRealTimers();
    });

    test('returns recent searches for short queries', async () => {
      // Mock getRecentSearches
      searchService.searchHistory = [
        { query: 'previous search', timestamp: '2025-01-01T10:00:00Z' }
      ];

      const suggestions = await searchService.getSuggestions('j'); // Short query

      expect(suggestions).toEqual([
        { text: 'previous search', type: 'recent', timestamp: '2025-01-01T10:00:00Z' }
      ]);
    });

    test('debounces suggestion requests', async () => {
      jest.useFakeTimers();

      const mockSuggestions = [];
      api.post.mockResolvedValue({
        data: { data: { suggestions: mockSuggestions } }
      });

      // Make multiple rapid requests - the first promise's timer gets
      // cancelled by the second call, so both promises resolve when the
      // second timer fires (they share the same resolve via closure replacement).
      searchService.getSuggestions('john');
      const promise2 = searchService.getSuggestions('john doe');

      // Fast forward timers
      jest.advanceTimersByTime(300);

      await promise2;

      // Should only make one request after debounce (the last one)
      expect(api.post).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    test('caches suggestions', async () => {
      jest.useFakeTimers();

      const mockSuggestions = [
        { text: 'John Doe', type: 'visitor' }
      ];

      api.post.mockResolvedValueOnce({
        data: { data: { suggestions: mockSuggestions } }
      });

      // First request
      const promise1 = searchService.getSuggestions('john');
      jest.advanceTimersByTime(300);
      const suggestions1 = await promise1;
      expect(api.post).toHaveBeenCalledTimes(1);

      jest.useRealTimers();

      // Second request should use cache (no debounce needed)
      const suggestions2 = await searchService.getSuggestions('john');
      expect(api.post).toHaveBeenCalledTimes(1);
      expect(suggestions2).toEqual(suggestions1);
    });
  });

  describe('search history management', () => {
    test('updates search history', () => {
      searchService.updateSearchHistory('john doe');
      searchService.updateSearchHistory('visitor status');

      const recentSearches = searchService.getRecentSearches();

      expect(recentSearches).toHaveLength(2);
      expect(recentSearches[0].text).toBe('visitor status'); // Most recent first
      expect(recentSearches[1].text).toBe('john doe');
    });

    test('removes duplicates from history', () => {
      searchService.updateSearchHistory('john doe');
      searchService.updateSearchHistory('visitor status');
      searchService.updateSearchHistory('john doe'); // Duplicate

      const recentSearches = searchService.getRecentSearches();

      expect(recentSearches).toHaveLength(2);
      expect(recentSearches[0].text).toBe('john doe'); // Moved to front
      expect(recentSearches[1].text).toBe('visitor status');
    });

    test('limits history to 50 items', () => {
      // Add 60 searches
      for (let i = 0; i < 60; i++) {
        searchService.updateSearchHistory(`search ${i}`);
      }

      const recentSearches = searchService.getRecentSearches(60);
      expect(recentSearches).toHaveLength(50);
    });

    test('ignores short queries in history', () => {
      searchService.updateSearchHistory('a'); // Too short
      searchService.updateSearchHistory(''); // Empty
      searchService.updateSearchHistory('  '); // Whitespace only

      const recentSearches = searchService.getRecentSearches();
      expect(recentSearches).toHaveLength(0);
    });

    test('saves history to localStorage', () => {
      searchService.updateSearchHistory('john doe');

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'searchHistory',
        expect.stringContaining('john doe')
      );
    });

    test('loads history from localStorage', () => {
      const storedHistory = JSON.stringify([
        { query: 'stored search', timestamp: '2025-01-01T10:00:00Z' }
      ]);

      localStorageMock.getItem.mockReturnValue(storedHistory);

      // Manually call loadSearchHistory to simulate loading
      const loaded = searchService.loadSearchHistory();
      searchService.searchHistory = loaded;
      const recentSearches = searchService.getRecentSearches();

      expect(recentSearches[0].text).toBe('stored search');
    });

    test('clears search history', () => {
      searchService.updateSearchHistory('john doe');
      searchService.clearHistory();

      const recentSearches = searchService.getRecentSearches();
      expect(recentSearches).toHaveLength(0);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('searchHistory');
    });
  });

  describe('popular queries tracking', () => {
    test('tracks popular queries', () => {
      searchService.updatePopularQueries('visitor');
      searchService.updatePopularQueries('user');
      searchService.updatePopularQueries('visitor'); // Increment count

      const popularQueries = searchService.getPopularQueries();

      expect(popularQueries).toHaveLength(2);
      expect(popularQueries[0]).toEqual({ text: 'visitor', type: 'popular', count: 2 });
      expect(popularQueries[1]).toEqual({ text: 'user', type: 'popular', count: 1 });
    });

    test('sorts popular queries by count', () => {
      searchService.updatePopularQueries('less popular');
      searchService.updatePopularQueries('more popular');
      searchService.updatePopularQueries('more popular');
      searchService.updatePopularQueries('more popular');

      const popularQueries = searchService.getPopularQueries();

      expect(popularQueries[0].text).toBe('more popular');
      expect(popularQueries[0].count).toBe(3);
      expect(popularQueries[1].text).toBe('less popular');
      expect(popularQueries[1].count).toBe(1);
    });

    test('limits popular queries results', () => {
      for (let i = 0; i < 20; i++) {
        searchService.updatePopularQueries(`query ${i}`);
      }

      const popularQueries = searchService.getPopularQueries(5);
      expect(popularQueries).toHaveLength(5);
    });
  });

  describe('filter sets management', () => {
    test('saves filter set', async () => {
      const filterSet = {
        name: 'Active Users',
        filters: { logic: 'AND', conditions: [] },
        description: 'Filter for active users'
      };

      api.post.mockResolvedValueOnce({
        data: { data: { id: 1, ...filterSet } }
      });

      const result = await searchService.saveFilterSet(
        filterSet.name,
        filterSet.filters,
        filterSet.description
      );

      expect(api.post).toHaveBeenCalledWith('/api/search/filter-sets', filterSet);

      expect(result.data.name).toBe('Active Users');
    });

    test('loads filter sets', async () => {
      const mockFilterSets = [
        { id: 1, name: 'Active Users', filters: {} }
      ];

      api.get.mockResolvedValueOnce({
        data: { data: { filterSets: mockFilterSets } }
      });

      const filterSets = await searchService.getFilterSets();

      expect(api.get).toHaveBeenCalledWith('/api/search/filter-sets');

      expect(filterSets).toEqual(mockFilterSets);
    });
  });

  describe('search analytics', () => {
    test('gets search analytics', async () => {
      const mockAnalytics = {
        totalSearches: 100,
        averageResponseTime: 150,
        popularQueries: ['visitor', 'user']
      };

      api.get.mockResolvedValueOnce({
        data: { data: mockAnalytics }
      });

      const analytics = await searchService.getSearchAnalytics('30d');

      expect(api.get).toHaveBeenCalledWith('/api/search/analytics?timeRange=30d');

      expect(analytics).toEqual(mockAnalytics);
    });

    test('handles analytics errors gracefully', async () => {
      api.get.mockRejectedValueOnce(new Error('Analytics unavailable'));

      const analytics = await searchService.getSearchAnalytics();

      expect(analytics).toBeNull();
    });
  });

  describe('source code security', () => {
    test('does not use localStorage for authentication', () => {
      const fs = require('fs');
      const path = require('path');
      const content = fs.readFileSync(
        path.join(__dirname, '../../services/searchService.js'), 'utf8'
      );
      expect(content).not.toContain("localStorage.getItem('accessToken')");
      expect(content).not.toContain("fetch('/api/");
      expect(content).not.toContain('fetch(`/api/');
    });
  });
});

describe('FilterBuilder', () => {
  let builder;

  beforeEach(() => {
    builder = new FilterBuilder();
  });

  test('creates basic filter condition', () => {
    builder.addCondition('name', 'contains', 'John');

    const filter = builder.build();

    expect(filter.logic).toBe('AND');
    expect(filter.conditions).toHaveLength(1);
    expect(filter.conditions[0]).toMatchObject({
      field: 'name',
      operator: 'contains',
      value: 'John',
      dataType: 'string'
    });
  });

  test('adds multiple conditions', () => {
    builder
      .addCondition('name', 'contains', 'John')
      .addCondition('status', 'equals', 'active');

    const filter = builder.build();

    expect(filter.conditions).toHaveLength(2);
  });

  test('sets logic operator', () => {
    builder.setLogic('OR');

    const filter = builder.build();

    expect(filter.logic).toBe('OR');
  });

  test('adds nested groups', () => {
    const group = builder.addGroup('OR');
    group.addCondition('role', 'equals', 'admin');

    const filter = builder.build();

    expect(filter.conditions).toHaveLength(1);
    expect(filter.conditions[0].type).toBe('group');
    expect(filter.conditions[0].logic).toBe('OR');
  });

  test('removes conditions by ID', () => {
    builder.addCondition('name', 'contains', 'John');
    const condition = builder.conditions[0];

    builder.removeCondition(condition.id);

    const filter = builder.build();
    expect(filter.conditions).toHaveLength(0);
  });

  test('validates filter structure', () => {
    // Empty filter should have errors
    let errors = builder.validate();
    expect(errors).toContain('At least one condition is required');

    // Add invalid condition
    builder.addCondition('', '', '');
    errors = builder.validate();
    expect(errors.length).toBeGreaterThan(0);

    // Add valid condition
    builder.conditions = [];
    builder.addCondition('name', 'contains', 'John');
    errors = builder.validate();
    expect(errors).toHaveLength(0);
  });

  test('generates unique condition IDs', () => {
    builder.addCondition('name', 'contains', 'John');
    builder.addCondition('status', 'equals', 'active');

    const condition1 = builder.conditions[0];
    const condition2 = builder.conditions[1];

    expect(condition1.id).toBeDefined();
    expect(condition2.id).toBeDefined();
    expect(condition1.id).not.toBe(condition2.id);
  });

  test('validates nested groups', () => {
    const group = builder.addGroup();
    // Empty group should have validation errors

    const errors = builder.validate();
    expect(errors.some(error => error.includes('Group 1'))).toBe(true);
  });
});
