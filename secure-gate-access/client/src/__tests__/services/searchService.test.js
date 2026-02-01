/**
 * Unit Tests: SearchService
 * Tests search functionality, caching, and performance optimization
 */

import { searchService, FilterBuilder } from '../../services/searchService';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
global.localStorage = localStorageMock;

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now())
};

describe('SearchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    localStorageMock.getItem.mockReturnValue(null);
    searchService.clearCache();
    searchService.clearHistory();
  });

  describe('search functionality', () => {
    test('performs basic search with default options', async () => {
      const mockResponse = {
        data: {
          items: [
            { id: 1, title: 'John Doe', type: 'visitor', relevanceScore: 0.95 }
          ],
          totalCount: 1
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await searchService.search('john');

      expect(fetch).toHaveBeenCalledWith('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer null'
        },
        body: JSON.stringify({
          query: 'john',
          dataTypes: ['visitors', 'users', 'incidents'],
          filters: {},
          sortBy: 'relevance',
          sortOrder: 'desc',
          page: 1,
          limit: 20,
          includeHighlights: true
        }),
        signal: expect.any(AbortSignal)
      });

      expect(result.items).toHaveLength(1);
      expect(result.query).toBe('john');
      expect(result.responseTime).toBeGreaterThan(0);
    });

    test('performs search with custom options', async () => {
      const mockResponse = {
        data: {
          items: [],
          totalCount: 0
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const options = {
        dataTypes: ['visitors'],
        filters: { status: 'active' },
        sortBy: 'name',
        sortOrder: 'asc',
        page: 2,
        limit: 10
      };

      await searchService.search('test', options);

      expect(fetch).toHaveBeenCalledWith('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer null'
        },
        body: JSON.stringify({
          query: 'test',
          ...options,
          includeHighlights: true
        }),
        signal: expect.any(AbortSignal)
      });
    });

    test('handles search errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(searchService.search('test')).rejects.toThrow('Network error');
    });

    test('handles HTTP error responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      });

      await expect(searchService.search('test')).rejects.toThrow('Search failed: Internal Server Error');
    });

    test('aborts previous search when new search starts', async () => {
      const mockAbort = jest.fn();
      const mockAbortController = {
        abort: mockAbort,
        signal: { aborted: false }
      };

      global.AbortController = jest.fn(() => mockAbortController);

      // Start first search
      const firstSearchPromise = searchService.search('first');
      
      // Start second search immediately
      const secondSearchPromise = searchService.search('second');

      expect(mockAbort).toHaveBeenCalled();
    });
  });

  describe('caching functionality', () => {
    test('caches search results', async () => {
      const mockResponse = {
        data: {
          items: [{ id: 1, title: 'John Doe' }],
          totalCount: 1
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // First search
      const result1 = await searchService.search('john');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second search with same parameters should use cache
      const result2 = await searchService.search('john');
      expect(fetch).toHaveBeenCalledTimes(1); // No additional fetch
      expect(result2).toEqual(result1);
    });

    test('generates different cache keys for different options', async () => {
      const mockResponse = {
        data: { items: [], totalCount: 0 }
      };

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      await searchService.search('john', { dataTypes: ['visitors'] });
      await searchService.search('john', { dataTypes: ['users'] });

      expect(fetch).toHaveBeenCalledTimes(2);
    });

    test('clears cache when requested', async () => {
      const mockResponse = {
        data: { items: [], totalCount: 0 }
      };

      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      // First search
      await searchService.search('john');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Clear cache
      searchService.clearCache();

      // Second search should fetch again
      await searchService.search('john');
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('suggestions functionality', () => {
    test('gets search suggestions', async () => {
      const mockSuggestions = [
        { text: 'John Doe', type: 'visitor', count: 5 }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { suggestions: mockSuggestions } })
      });

      const suggestions = await searchService.getSuggestions('john');

      expect(fetch).toHaveBeenCalledWith('/api/search/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer null'
        },
        body: JSON.stringify({
          query: 'john',
          dataTypes: ['visitors', 'users'],
          maxSuggestions: 10
        })
      });

      expect(suggestions).toEqual(mockSuggestions);
    });

    test('returns recent searches for short queries', async () => {
      const recentSearches = [
        { text: 'previous search', type: 'recent', timestamp: '2025-01-01T10:00:00Z' }
      ];

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
      fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { suggestions: mockSuggestions } })
      });

      // Make multiple rapid requests
      const promise1 = searchService.getSuggestions('john');
      const promise2 = searchService.getSuggestions('john doe');

      // Fast forward timers
      jest.advanceTimersByTime(300);

      await Promise.all([promise1, promise2]);

      // Should only make one request after debounce
      expect(fetch).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    test('caches suggestions', async () => {
      const mockSuggestions = [
        { text: 'John Doe', type: 'visitor' }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { suggestions: mockSuggestions } })
      });

      // First request
      const suggestions1 = await searchService.getSuggestions('john');
      expect(fetch).toHaveBeenCalledTimes(1);

      // Second request should use cache
      const suggestions2 = await searchService.getSuggestions('john');
      expect(fetch).toHaveBeenCalledTimes(1);
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

      // Create new service instance to trigger loading
      const newService = new (searchService.constructor)();
      const recentSearches = newService.getRecentSearches();

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

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 1, ...filterSet } })
      });

      const result = await searchService.saveFilterSet(
        filterSet.name,
        filterSet.filters,
        filterSet.description
      );

      expect(fetch).toHaveBeenCalledWith('/api/search/filter-sets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer null'
        },
        body: JSON.stringify(filterSet)
      });

      expect(result.data.name).toBe('Active Users');
    });

    test('loads filter sets', async () => {
      const mockFilterSets = [
        { id: 1, name: 'Active Users', filters: {} }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { filterSets: mockFilterSets } })
      });

      const filterSets = await searchService.getFilterSets();

      expect(fetch).toHaveBeenCalledWith('/api/search/filter-sets', {
        headers: {
          'Authorization': 'Bearer null'
        }
      });

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

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockAnalytics })
      });

      const analytics = await searchService.getSearchAnalytics('30d');

      expect(fetch).toHaveBeenCalledWith('/api/search/analytics?timeRange=30d', {
        headers: {
          'Authorization': 'Bearer null'
        }
      });

      expect(analytics).toEqual(mockAnalytics);
    });

    test('handles analytics errors gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Analytics unavailable'));

      const analytics = await searchService.getSearchAnalytics();

      expect(analytics).toBeNull();
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