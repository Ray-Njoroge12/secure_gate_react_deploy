import { renderHook, act } from '@testing-library/react';
import React from 'react';

import SearchContext from '../../contexts/SearchContext';
import { useSearchData } from '../../hooks/useSearch';

describe('useSearchData', () => {
    let mockGetPaginatedData;
    let mockUpdateSearchTerm;
    let mockUpdatePage;
    let mockContextValue;
    let wrapper;

    const testData = [
        { id: 1, name: 'Apple' },
        { id: 2, name: 'Banana' }
    ];
    const searchFields = ['name'];
    const filterFields = [];

    beforeEach(() => {
        jest.clearAllMocks();

        // Define mocks
        mockGetPaginatedData = jest.fn().mockImplementation((data) => ({
            data: data,
            currentPage: 1,
            totalPages: 1,
            totalItems: data.length,
            hasNextPage: false,
            hasPrevPage: false
        }));

        mockUpdateSearchTerm = jest.fn();
        mockUpdatePage = jest.fn();

        mockContextValue = {
            searchState: {
                searchTerm: '',
                filters: {},
                sortField: null,
                sortDirection: 'asc',
                pageSize: 10
            },
            searchData: jest.fn((d) => d),
            getPaginatedData: mockGetPaginatedData,
            getSearchStats: jest.fn(() => ({ total: 0, filtered: 0 })),
            updateSearchTerm: mockUpdateSearchTerm,
            updateFilters: jest.fn(),
            clearFilters: jest.fn(),
            updateSort: jest.fn(),
            updatePage: mockUpdatePage,
            updatePageSize: jest.fn(),
            clearSearch: jest.fn()
        };

        wrapper = ({ children }) => (
            <SearchContext.Provider value={mockContextValue}>
                {children}
            </SearchContext.Provider>
        );
    });

    it('should return data and methods', () => {
        const { result } = renderHook(() => useSearchData(testData, searchFields, filterFields), { wrapper });

        expect(result.current.data).toEqual(testData);
        expect(result.current.originalData).toEqual(testData);
        expect(result.current.searchTerm).toBe('');
        expect(mockGetPaginatedData).toHaveBeenCalled();
    });

    it('should call context methods when actions are triggered', () => {
        const { result } = renderHook(() => useSearchData(testData, searchFields, filterFields), { wrapper });

        act(() => {
            result.current.setSearchTerm('test');
        });
        expect(mockUpdateSearchTerm).toHaveBeenCalledWith('test');

        act(() => {
            result.current.setPage(2);
        });
        expect(mockUpdatePage).toHaveBeenCalledWith(2);
    });

    it('should calculate boolean flags', () => {
        const { result } = renderHook(() => useSearchData(testData, searchFields, filterFields), { wrapper });

        expect(result.current.isSearching).toBe(false);
        expect(result.current.hasResults).toBe(true);
    });

    // Debug test to verify context
    it('should have valid context', () => {
        // useSearch is the default export
        const { useSearch } = require('../../hooks/useSearch');
        const { result } = renderHook(() => useSearch(), { wrapper });

        expect(result.current).toBeDefined();
        expect(result.current.getPaginatedData).toBeDefined();
        expect(result.current.getPaginatedData([])).toEqual({
            data: [],
            currentPage: 1,
            totalPages: 1,
            totalItems: 0,
            hasNextPage: false,
            hasPrevPage: false
        });
    });
});

describe('useSearchSuggestions', () => {
    // We need to verify that useSearchSuggestions calls getSuggestions from context
    // We can rely on the same mocks but we need to mock getSuggestions in the context value

    let mockGetSuggestions;
    let mockContextValue;
    let wrapper;

    beforeEach(() => {
        mockGetSuggestions = jest.fn().mockReturnValue(['Apple', 'Banana']);

        mockContextValue = {
            searchState: { searchTerm: '' },
            getSuggestions: mockGetSuggestions,
            searchHistory: [],
            // Add other required props to prevent crash if hook accesses them
            searchData: jest.fn(),
            getPaginatedData: jest.fn(),
            getSearchStats: jest.fn(),
            updateSearchTerm: jest.fn(),
            updateFilters: jest.fn(),
            clearFilters: jest.fn(),
            updateSort: jest.fn(),
            updatePage: jest.fn(),
            updatePageSize: jest.fn(),
            clearSearch: jest.fn()
        };

        wrapper = ({ children }) => (
            <SearchContext.Provider value={mockContextValue}>
                {children}
            </SearchContext.Provider>
        );
    });

    it('should return suggestions', () => {
        const { useSearchSuggestions } = require('../../hooks/useSearch');
        const data = [{ name: 'Apple' }, { name: 'Banana' }];

        const { result } = renderHook(() => useSearchSuggestions(data, ['name']), { wrapper });

        expect(result.current.suggestions).toEqual(['Apple', 'Banana']);
        expect(mockGetSuggestions).toHaveBeenCalledWith(data, ['name'], 5);
        expect(result.current.hasSuggestions).toBe(true);
    });
});
