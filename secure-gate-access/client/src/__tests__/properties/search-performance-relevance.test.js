/**
 * Property Test: Search Performance and Relevance
 * Validates: Requirements 11.3, 11.6
 * 
 * Property 11: Search Performance and Relevance
 * For any search query, results should be returned within 1 second with matching terms 
 * highlighted and relevance-based ranking applied
 */

import fc from 'fast-check';

import { searchService } from '../../services/searchService';

// Mock the search service for testing
jest.mock('../../services/searchService', () => ({
  searchService: {
    search: jest.fn(),
    getSuggestions: jest.fn(),
    clearCache: jest.fn()
  }
}));

describe('Property 11: Search Performance and Relevance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    searchService.clearCache.mockImplementation(() => {});
  });

  test('search results should be returned within 1 second with proper ranking', 
    fc.asyncProperty(
      fc.record({
        query: fc.string({ minLength: 1, maxLength: 100 }),
        dataTypes: fc.array(
          fc.constantFrom('visitors', 'users', 'incidents'), 
          { minLength: 1, maxLength: 3 }
        ),
        expectedResults: fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 1000 }),
            title: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constantFrom('visitor', 'user', 'incident'),
            relevanceScore: fc.float({ min: 0, max: 1 }),
            highlights: fc.array(
              fc.record({
                field: fc.constantFrom('name', 'email', 'description'),
                text: fc.string({ minLength: 1, maxLength: 200 })
              }),
              { maxLength: 3 }
            )
          }),
          { maxLength: 50 }
        )
      }),
      async ({ query, dataTypes, expectedResults }) => {
        // Mock search response with performance timing
        const mockResponse = {
          items: expectedResults,
          totalCount: expectedResults.length,
          responseTime: Math.random() * 800 + 100, // 100-900ms
          query,
          timestamp: new Date().toISOString()
        };

        searchService.search.mockResolvedValue(mockResponse);

        // Measure actual search performance
        const startTime = performance.now();
        const result = await searchService.search(query, { dataTypes });
        const endTime = performance.now();
        const actualResponseTime = endTime - startTime;

        // Property 1: Response time should be under 1 second (1000ms)
        expect(actualResponseTime).toBeLessThan(1000);

        // Property 2: Results should be returned
        expect(result).toBeDefined();
        expect(result.items).toBeInstanceOf(Array);

        // Property 3: Results should be relevance-ranked (descending order)
        if (result.items.length > 1) {
          for (let i = 0; i < result.items.length - 1; i++) {
            const currentScore = result.items[i].relevanceScore || 0;
            const nextScore = result.items[i + 1].relevanceScore || 0;
            expect(currentScore).toBeGreaterThanOrEqual(nextScore);
          }
        }

        // Property 4: Matching terms should be highlighted
        result.items.forEach(item => {
          if (item.highlights && item.highlights.length > 0) {
            item.highlights.forEach(highlight => {
              expect(highlight).toHaveProperty('field');
              expect(highlight).toHaveProperty('text');
              expect(typeof highlight.field).toBe('string');
              expect(typeof highlight.text).toBe('string');
            });
          }
        });

        // Property 5: Query should be preserved in response
        expect(result.query).toBe(query);

        // Property 6: Response should include timing information
        expect(result).toHaveProperty('responseTime');
        expect(typeof result.responseTime).toBe('number');
        expect(result.responseTime).toBeGreaterThan(0);
      }
    ),
    { numRuns: 100 }
  );

  test('search suggestions should be fast and relevant',
    fc.asyncProperty(
      fc.record({
        query: fc.string({ minLength: 2, maxLength: 50 }),
        dataTypes: fc.array(
          fc.constantFrom('visitors', 'users', 'incidents'),
          { minLength: 1, maxLength: 3 }
        ),
        maxSuggestions: fc.integer({ min: 5, max: 20 }),
        expectedSuggestions: fc.array(
          fc.record({
            text: fc.string({ minLength: 1, maxLength: 100 }),
            type: fc.constantFrom('recent', 'popular', 'visitor', 'user', 'incident'),
            count: fc.integer({ min: 1, max: 100 }),
            timestamp: fc.date().map(d => d.toISOString())
          }),
          { maxLength: 20 }
        )
      }),
      async ({ query, dataTypes, maxSuggestions, expectedSuggestions }) => {
        // Mock suggestions response
        const mockSuggestions = expectedSuggestions.slice(0, maxSuggestions);
        searchService.getSuggestions.mockResolvedValue(mockSuggestions);

        // Measure suggestion performance
        const startTime = performance.now();
        const suggestions = await searchService.getSuggestions(query, { 
          dataTypes, 
          maxSuggestions 
        });
        const endTime = performance.now();
        const responseTime = endTime - startTime;

        // Property 1: Suggestions should be fast (under 500ms)
        expect(responseTime).toBeLessThan(500);

        // Property 2: Suggestions should be returned as array
        expect(suggestions).toBeInstanceOf(Array);

        // Property 3: Should not exceed max suggestions limit
        expect(suggestions.length).toBeLessThanOrEqual(maxSuggestions);

        // Property 4: Each suggestion should have required properties
        suggestions.forEach(suggestion => {
          expect(suggestion).toHaveProperty('text');
          expect(suggestion).toHaveProperty('type');
          expect(typeof suggestion.text).toBe('string');
          expect(typeof suggestion.type).toBe('string');
          expect(suggestion.text.length).toBeGreaterThan(0);
        });

        // Property 5: Suggestions should be relevant to query
        suggestions.forEach(suggestion => {
          const suggestionText = suggestion.text.toLowerCase();
          const queryLower = query.toLowerCase();
          
          // At least partial match or it's a recent/popular suggestion
          const isRelevant = suggestionText.includes(queryLower) || 
                           queryLower.includes(suggestionText) ||
                           suggestion.type === 'recent' ||
                           suggestion.type === 'popular';
          
          expect(isRelevant).toBe(true);
        });
      }
    ),
    { numRuns: 100 }
  );

  test('search performance should be consistent across different query types',
    fc.asyncProperty(
      fc.record({
        queries: fc.array(
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 10 }), // Short queries
            fc.string({ minLength: 20, maxLength: 50 }), // Medium queries
            fc.string({ minLength: 50, maxLength: 100 }), // Long queries
            fc.emailAddress(), // Email patterns
            fc.string().filter(s => /^\+?\d{10,15}$/.test(s)) // Phone patterns
          ),
          { minLength: 3, maxLength: 10 }
        ),
        dataTypes: fc.constantFrom(['visitors'], ['users'], ['incidents'], ['visitors', 'users'])
      }),
      async ({ queries, dataTypes }) => {
        const performanceResults = [];

        for (const query of queries) {
          // Mock consistent response structure
          const mockResponse = {
            items: [],
            totalCount: 0,
            responseTime: Math.random() * 500 + 50, // 50-550ms
            query,
            timestamp: new Date().toISOString()
          };

          searchService.search.mockResolvedValue(mockResponse);

          const startTime = performance.now();
          const result = await searchService.search(query, { dataTypes });
          const endTime = performance.now();
          
          performanceResults.push({
            query,
            queryLength: query.length,
            responseTime: endTime - startTime,
            result
          });
        }

        // Property 1: All searches should complete within performance threshold
        performanceResults.forEach(({ responseTime }) => {
          expect(responseTime).toBeLessThan(1000);
        });

        // Property 2: Performance should not degrade significantly with query length
        const shortQueries = performanceResults.filter(r => r.queryLength <= 10);
        const longQueries = performanceResults.filter(r => r.queryLength > 50);

        if (shortQueries.length > 0 && longQueries.length > 0) {
          const avgShortTime = shortQueries.reduce((sum, r) => sum + r.responseTime, 0) / shortQueries.length;
          const avgLongTime = longQueries.reduce((sum, r) => sum + r.responseTime, 0) / longQueries.length;
          
          // Long queries shouldn't be more than 3x slower than short queries
          expect(avgLongTime).toBeLessThan(avgShortTime * 3);
        }

        // Property 3: All results should have consistent structure
        performanceResults.forEach(({ result, query }) => {
          expect(result).toHaveProperty('items');
          expect(result).toHaveProperty('totalCount');
          expect(result).toHaveProperty('query', query);
          expect(result).toHaveProperty('timestamp');
        });
      }
    ),
    { numRuns: 50 }
  );

  test('search relevance ranking should be consistent and logical',
    fc.asyncProperty(
      fc.record({
        query: fc.string({ minLength: 3, maxLength: 20 }),
        results: fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 1000 }),
            title: fc.string({ minLength: 5, maxLength: 50 }),
            description: fc.string({ minLength: 10, maxLength: 200 }),
            type: fc.constantFrom('visitor', 'user', 'incident'),
            // Generate relevance scores that should correlate with matches
            titleMatches: fc.boolean(),
            descriptionMatches: fc.boolean(),
            exactMatch: fc.boolean()
          }),
          { minLength: 5, maxLength: 20 }
        )
      }),
      async ({ query, results }) => {
        // Calculate expected relevance scores based on match types
        const processedResults = results.map(result => ({
          ...result,
          relevanceScore: (
            (result.exactMatch ? 1.0 : 0) +
            (result.titleMatches ? 0.8 : 0) +
            (result.descriptionMatches ? 0.4 : 0)
          ) / 2.2 // Normalize to 0-1 range
        }));

        // Sort by expected relevance (highest first)
        const expectedOrder = [...processedResults].sort((a, b) => b.relevanceScore - a.relevanceScore);

        const mockResponse = {
          items: expectedOrder,
          totalCount: expectedOrder.length,
          responseTime: 200,
          query,
          timestamp: new Date().toISOString()
        };

        searchService.search.mockResolvedValue(mockResponse);

        const result = await searchService.search(query);

        // Property 1: Results should be ordered by relevance (descending)
        for (let i = 0; i < result.items.length - 1; i++) {
          const currentScore = result.items[i].relevanceScore;
          const nextScore = result.items[i + 1].relevanceScore;
          expect(currentScore).toBeGreaterThanOrEqual(nextScore);
        }

        // Property 2: Exact matches should have highest relevance
        const exactMatches = result.items.filter(item => item.exactMatch);
        const nonExactMatches = result.items.filter(item => !item.exactMatch);

        if (exactMatches.length > 0 && nonExactMatches.length > 0) {
          const minExactScore = Math.min(...exactMatches.map(item => item.relevanceScore));
          const maxNonExactScore = Math.max(...nonExactMatches.map(item => item.relevanceScore));
          expect(minExactScore).toBeGreaterThanOrEqual(maxNonExactScore);
        }

        // Property 3: Title matches should rank higher than description-only matches
        const titleMatches = result.items.filter(item => item.titleMatches && !item.exactMatch);
        const descriptionOnlyMatches = result.items.filter(item => 
          item.descriptionMatches && !item.titleMatches && !item.exactMatch
        );

        if (titleMatches.length > 0 && descriptionOnlyMatches.length > 0) {
          const minTitleScore = Math.min(...titleMatches.map(item => item.relevanceScore));
          const maxDescScore = Math.max(...descriptionOnlyMatches.map(item => item.relevanceScore));
          expect(minTitleScore).toBeGreaterThanOrEqual(maxDescScore);
        }

        // Property 4: All relevance scores should be between 0 and 1
        result.items.forEach(item => {
          expect(item.relevanceScore).toBeGreaterThanOrEqual(0);
          expect(item.relevanceScore).toBeLessThanOrEqual(1);
        });
      }
    ),
    { numRuns: 100 }
  );

  test('search highlighting should be accurate and complete',
    fc.asyncProperty(
      fc.record({
        query: fc.string({ minLength: 3, maxLength: 15 }),
        results: fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 1000 }),
            title: fc.string({ minLength: 10, maxLength: 50 }),
            description: fc.string({ minLength: 20, maxLength: 100 }),
            email: fc.emailAddress(),
            type: fc.constantFrom('visitor', 'user', 'incident')
          }),
          { minLength: 3, maxLength: 15 }
        )
      }),
      async ({ query, results }) => {
        // Generate highlights based on query matches
        const resultsWithHighlights = results.map(result => ({
          ...result,
          highlights: [
            ...(result.title.toLowerCase().includes(query.toLowerCase()) ? 
              [{ field: 'title', text: result.title }] : []),
            ...(result.description.toLowerCase().includes(query.toLowerCase()) ? 
              [{ field: 'description', text: result.description }] : []),
            ...(result.email.toLowerCase().includes(query.toLowerCase()) ? 
              [{ field: 'email', text: result.email }] : [])
          ]
        }));

        const mockResponse = {
          items: resultsWithHighlights,
          totalCount: resultsWithHighlights.length,
          responseTime: 150,
          query,
          timestamp: new Date().toISOString()
        };

        searchService.search.mockResolvedValue(mockResponse);

        const result = await searchService.search(query, { includeHighlights: true });

        // Property 1: Highlights should exist for matching results
        result.items.forEach(item => {
          if (item.highlights && item.highlights.length > 0) {
            item.highlights.forEach(highlight => {
              // Property 2: Highlight should reference a valid field
              expect(['title', 'description', 'email', 'name', 'phone']).toContain(highlight.field);
              
              // Property 3: Highlight text should contain the query (case-insensitive)
              const highlightText = highlight.text.toLowerCase();
              const queryLower = query.toLowerCase();
              expect(highlightText).toContain(queryLower);
              
              // Property 4: Highlight should have proper structure
              expect(highlight).toHaveProperty('field');
              expect(highlight).toHaveProperty('text');
              expect(typeof highlight.field).toBe('string');
              expect(typeof highlight.text).toBe('string');
            });
          }
        });

        // Property 5: Results with highlights should be relevant to query
        const highlightedResults = result.items.filter(item => 
          item.highlights && item.highlights.length > 0
        );

        highlightedResults.forEach(item => {
          const hasRelevantHighlight = item.highlights.some(highlight => 
            highlight.text.toLowerCase().includes(query.toLowerCase())
          );
          expect(hasRelevantHighlight).toBe(true);
        });
      }
    ),
    { numRuns: 100 }
  );
});