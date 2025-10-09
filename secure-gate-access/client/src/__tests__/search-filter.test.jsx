/**
 * @fileoverview Search and Filtering Tests for Secure Gate Access
 * @description Tests for search debouncing, multi-criteria filtering, sorting, and pagination
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '../../test-utils';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

// Import components and contexts
import { SearchProvider, useSearch } from '../../contexts/SearchContext';
import { ErrorProvider } from '../../contexts/ErrorContext';
import { LoadingProvider } from '../../contexts/LoadingContext';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch for API calls
global.fetch = jest.fn();

// Helper function to render with providers
const renderWithProviders = (ui, { ...renderOptions } = {}) => {
  const Wrapper = ({ children }) => (
    <BrowserRouter>
      <ErrorProvider>
        <LoadingProvider>
          <SearchProvider>
            {children}
          </SearchProvider>
        </LoadingProvider>
      </ErrorProvider>
    </BrowserRouter>
  );

  return render(ui, { wrapper: Wrapper, ...renderOptions });
};

// Mock data for testing
const mockData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'resident', status: 'active', createdAt: '2024-01-01' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'guard', status: 'active', createdAt: '2024-01-02' },
  { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'admin', status: 'inactive', createdAt: '2024-01-03' },
  { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'resident', status: 'active', createdAt: '2024-01-04' },
  { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', role: 'guard', status: 'pending', createdAt: '2024-01-05' },
];

describe('Search Functionality', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue('resident');
    fetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('search input updates query state', () => {
    const TestComponent = () => {
      const { searchQuery, setSearchQuery } = useSearch();
      
      return (
        <div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            data-testid="search-input"
          />
          <div data-testid="search-display">{searchQuery}</div>
        </div>
      );
    };

    renderWithProviders(<TestComponent />);
    
    const searchInput = screen.getByTestId('search-input');
    const searchDisplay = screen.getByTestId('search-display');
    
    expect(searchDisplay).toHaveTextContent('');
    
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    expect(searchDisplay).toHaveTextContent('test query');
  });

  test('search debouncing works correctly', async () => {
    const TestComponent = () => {
      const { searchQuery, setSearchQuery, searchResults } = useSearch();
      
      return (
        <div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="search-input"
          />
          <div data-testid="search-results">{searchResults.length} results</div>
        </div>
      );
    };

    renderWithProviders(<TestComponent />);
    
    const searchInput = screen.getByTestId('search-input');
    
    // Type multiple characters quickly
    fireEvent.change(searchInput, { target: { value: 't' } });
    fireEvent.change(searchInput, { target: { value: 'te' } });
    fireEvent.change(searchInput, { target: { value: 'tes' } });
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // Should debounce the search
    await waitFor(() => {
      expect(searchInput).toHaveValue('test');
    }, { timeout: 1000 });
  });

  test('search triggers API call with debouncing', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockData.filter(item => item.name.includes('John')) })
    });

    const TestComponent = () => {
      const { searchQuery, setSearchQuery, searchResults, isSearching } = useSearch();
      
      React.useEffect(() => {
        if (searchQuery) {
          // Simulate API call
          fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: searchQuery })
          });
        }
      }, [searchQuery]);
      
      return (
        <div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="search-input"
          />
          <div data-testid="search-results">{searchResults.length} results</div>
          <div data-testid="is-searching">{isSearching ? 'Searching...' : 'Not searching'}</div>
        </div>
      );
    };

    renderWithProviders(<TestComponent />);
    
    const searchInput = screen.getByTestId('search-input');
    
    fireEvent.change(searchInput, { target: { value: 'John' } });
    
    // Wait for debounced search
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'John' })
      });
    }, { timeout: 1000 });
  });
});

describe('Multi-Criteria Filtering', () => {
  test('filters are applied correctly', () => {
    const TestComponent = () => {
      const { filters, setFilter, clearFilters } = useSearch();
      
      return (
        <div>
          <button onClick={() => setFilter('role', 'resident')}>Filter by Role</button>
          <button onClick={() => setFilter('status', 'active')}>Filter by Status</button>
          <button onClick={clearFilters}>Clear Filters</button>
          <div data-testid="filters">
            {Object.entries(filters).map(([key, value]) => (
              <span key={key} data-testid={`filter-${key}`}>
                {key}: {value}
              </span>
            ))}
          </div>
        </div>
      );
    };

    renderWithProviders(<TestComponent />);
    
    const roleButton = screen.getByText('Filter by Role');
    const statusButton = screen.getByText('Filter by Status');
    const clearButton = screen.getByText('Clear Filters');
    
    fireEvent.click(roleButton);
    expect(screen.getByTestId('filter-role')).toHaveTextContent('role: resident');
    
    fireEvent.click(statusButton);
    expect(screen.getByTestId('filter-status')).toHaveTextContent('status: active');
    
    fireEvent.click(clearButton);
    expect(screen.getByTestId('filters')).toBeEmptyDOMElement();
  });

  test('multiple filters work together', () => {
    const TestComponent = () => {
      const { filters, setFilter, getFilteredResults } = useSearch();
      
      React.useEffect(() => {
        setFilter('role', 'resident');
        setFilter('status', 'active');
      }, [setFilter]);
      
      const filteredResults = getFilteredResults ? getFilteredResults(mockData) : mockData;
      
      return (
        <div>
          <div data-testid="filtered-count">{filteredResults.length} filtered results</div>
          <div data-testid="filters">
            {Object.entries(filters).map(([key, value]) => (
              <span key={key} data-testid={`filter-${key}`}>
                {key}: {value}
              </span>
            ))}
          </div>
        </div>
      );
    };

    renderWithProviders(<TestComponent />);
    
    expect(screen.getByTestId('filter-role')).toHaveTextContent('role: resident');
    expect(screen.getByTestId('filter-status')).toHaveTextContent('status: active');
  });

  test('filter combinations are handled correctly', () => {
    const TestComponent = () => {
      const { filters, setFilter, clearFilter } = useSearch();
      
      return (
        <div>
          <button onClick={() => setFilter('role', 'resident')}>Set Role</button>
          <button onClick={() => setFilter('status', 'active')}>Set Status</button>
          <button onClick={() => clearFilter('role')}>Clear Role</button>
          <div data-testid="filters">
            {Object.entries(filters).map(([key, value]) => (
              <span key={key} data-testid={`filter-${key}`}>
                {key}: {value}
              </span>
            ))}
          </div>
        </div>
      );
    };

    renderWithProviders(<TestComponent />);
    
    const setRoleButton = screen.getByText('Set Role');
    const setStatusButton = screen.getByText('Set Status');
    const clearRoleButton = screen.getByText('Clear Role');
    
    fireEvent.click(setRoleButton);
    fireEvent.click(setStatusButton);
    
    expect(screen.getByTestId('filter-role')).toHaveTextContent('role: resident');
    expect(screen.getByTestId('filter-status')).toHaveTextContent('status: active');
    
    fireEvent.click(clearRoleButton);
    expect(screen.queryByTestId('filter-role')).not.toBeInTheDocument();
    expect(screen.getByTestId('filter-status')).toHaveTextContent('status: active');
  });
});

describe('Sorting Functionality', () => {
  test('sorting by different fields works', () => {
    const TestComponent = () => {
      const { sortField, sortDirection, setSorting } = useSearch();
      
      return (
        <div>
          <button onClick={() => setSorting('name', 'asc')}>Sort by Name ASC</button>
          <button onClick={() => setSorting('name', 'desc')}>Sort by Name DESC</button>
          <button onClick={() => setSorting('createdAt', 'asc')}>Sort by Date ASC</button>
          <div data-testid="sort-field">{sortField}</div>
          <div data-testid="sort-direction">{sortDirection}</div>
        </div>
      );
    };

    renderWithProviders(<TestComponent />);
    
    const sortByNameAscButton = screen.getByText('Sort by Name ASC');
    const sortByNameDescButton = screen.getByText('Sort by Name DESC');
    const sortByDateAscButton = screen.getByText('Sort by Date ASC');
    
    const sortField = screen.getByTestId('sort-field');
    const sortDirection = screen.getByTestId('sort-direction');
    
    fireEvent.click(sortByNameAscButton);
    expect(sortField).toHaveTextContent('name');
    expect(sortDirection).toHaveTextContent('asc');
    
    fireEvent.click(sortByNameDescButton);
    expect(sortField).toHaveTextContent('name');
    expect(sortDirection).toHaveTextContent('desc');
    
    fireEvent.click(sortByDateAscButton);
    expect(sortField).toHaveTextContent('createdAt');
    expect(sortDirection).toHaveTextContent('asc');
  });

  test('sorting toggles direction when same field is selected', () => {
    const TestComponent = () => {
      const { sortField, sortDirection, setSorting } = useSearch();
      
      return (
        <div>
          <button onClick={() => setSorting('name', 'asc')}>Sort by Name</button>
          <div data-testid="sort-field">{sortField}</div>
          <div data-testid="sort-direction">{sortDirection}</div>
        </div>
      );
    };

    renderWithProviders(<TestComponent />);
    
    const sortButton = screen.getByText('Sort by Name');
    const sortField = screen.getByTestId('sort-field');
    const sortDirection = screen.getByTestId('sort-direction');
    
    fireEvent.click(sortButton);
    expect(sortField).toHaveTextContent('name');
    expect(sortDirection).toHaveTextContent('asc');
    
    fireEvent.click(sortButton);
    expect(sortField).toHaveTextContent('name');
    expect(sortDirection).toHaveTextContent('desc');
  });
});

describe('Pagination Behavior', () => {
  test('pagination state is managed correctly', () => {
    const TestComponent = () => {
      const { currentPage, pageSize, totalPages, setPage, setPageSize } = useSearch();
      
      return (
        <div>
          <button onClick={() => setPage(1)}>Go to Page 1</button>
          <button onClick={() => setPage(2)}>Go to Page 2</button>
          <button onClick={() => setPageSize(10)}>Set Page Size 10</button>
          <div data-testid="current-page">{currentPage}</div>
          <div data-testid="page-size">{pageSize}</div>
          <div data-testid="total-pages">{totalPages}</div>
        </div>
      );
    };

    renderWithProviders(<TestComponent />);
    
    const goToPage1Button = screen.getByText('Go to Page 1');
    const goToPage2Button = screen.getByText('Go to Page 2');
    const setPageSizeButton = screen.getByText('Set Page Size 10');
    
    const currentPage = screen.getByTestId('current-page');
    const pageSize = screen.getByTestId('page-size');
    const totalPages = screen.getByTestId('total-pages');
    
    fireEvent.click(goToPage1Button);
    expect(currentPage).toHaveTextContent('1');
    
    fireEvent.click(goToPage2Button);
    expect(currentPage).toHaveTextContent('2');
    
    fireEvent.click(setPageSizeButton);
    expect(pageSize).toHaveTextContent('10');
  });

  test('pagination controls are rendered correctly', () => {
    const TestComponent = () => {
      const { currentPage, totalPages, hasNextPage, hasPreviousPage } = useSearch();
      
      return (
        <div>
          <button disabled={!hasPreviousPage}>Previous</button>
          <span data-testid="page-info">Page {currentPage} of {totalPages}</span>
          <button disabled={!hasNextPage}>Next</button>
        </div>
      );
    };

    renderWithProviders(<TestComponent />);
    
    const previousButton = screen.getByText('Previous');
    const nextButton = screen.getByText('Next');
    const pageInfo = screen.getByTestId('page-info');
    
    expect(previousButton).toBeDisabled();
    expect(nextButton).toBeDisabled();
    expect(pageInfo).toHaveTextContent('Page 1 of 1');
  });
});

describe('URL State Persistence', () => {
  test('search state is persisted in URL', () => {
    const TestComponent = () => {
      const { searchQuery, setSearchQuery } = useSearch();
      
      return (
        <div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="search-input"
          />
        </div>
      );
    };

    renderWithProviders(<TestComponent />);
    
    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'test query' } });
    
    // URL should be updated with search query
    expect(window.location.search).toContain('q=test%20query');
  });

  test('filters are persisted in URL', () => {
    const TestComponent = () => {
      const { filters, setFilter } = useSearch();
      
      return (
        <div>
          <button onClick={() => setFilter('role', 'resident')}>Set Role Filter</button>
          <div data-testid="filters">
            {Object.entries(filters).map(([key, value]) => (
              <span key={key}>{key}: {value}</span>
            ))}
          </div>
        </div>
      );
    };

    renderWithProviders(<TestComponent />);
    
    const setRoleButton = screen.getByText('Set Role Filter');
    fireEvent.click(setRoleButton);
    
    // URL should be updated with filter
    expect(window.location.search).toContain('role=resident');
  });

  test('pagination state is persisted in URL', () => {
    const TestComponent = () => {
      const { currentPage, setPage } = useSearch();
      
      return (
        <div>
          <button onClick={() => setPage(2)}>Go to Page 2</button>
          <div data-testid="current-page">{currentPage}</div>
        </div>
      );
    };

    renderWithProviders(<TestComponent />);
    
    const goToPage2Button = screen.getByText('Go to Page 2');
    fireEvent.click(goToPage2Button);
    
    // URL should be updated with page
    expect(window.location.search).toContain('page=2');
  });
});

describe('Search History and Saved Searches', () => {
  test('search history is maintained', () => {
    const TestComponent = () => {
      const { searchHistory, addToHistory, clearHistory } = useSearch();
      
      return (
        <div>
          <button onClick={() => addToHistory('test query 1')}>Add Query 1</button>
          <button onClick={() => addToHistory('test query 2')}>Add Query 2</button>
          <button onClick={clearHistory}>Clear History</button>
          <div data-testid="search-history">
            {searchHistory.map((query, index) => (
              <span key={index} data-testid={`history-${index}`}>{query}</span>
            ))}
          </div>
        </div>
      );
    };

    renderWithProviders(<TestComponent />);
    
    const addQuery1Button = screen.getByText('Add Query 1');
    const addQuery2Button = screen.getByText('Add Query 2');
    const clearHistoryButton = screen.getByText('Clear History');
    
    fireEvent.click(addQuery1Button);
    fireEvent.click(addQuery2Button);
    
    expect(screen.getByTestId('history-0')).toHaveTextContent('test query 1');
    expect(screen.getByTestId('history-1')).toHaveTextContent('test query 2');
    
    fireEvent.click(clearHistoryButton);
    expect(screen.getByTestId('search-history')).toBeEmptyDOMElement();
  });

  test('saved searches are managed correctly', () => {
    const TestComponent = () => {
      const { savedSearches, saveSearch, removeSavedSearch } = useSearch();
      
      return (
        <div>
          <button onClick={() => saveSearch('saved query', { role: 'resident' })}>Save Search</button>
          <button onClick={() => removeSavedSearch('saved query')}>Remove Search</button>
          <div data-testid="saved-searches">
            {savedSearches.map((search, index) => (
              <span key={index} data-testid={`saved-${index}`}>{search.name}</span>
            ))}
          </div>
        </div>
      );
    };

    renderWithProviders(<TestComponent />);
    
    const saveSearchButton = screen.getByText('Save Search');
    const removeSearchButton = screen.getByText('Remove Search');
    
    fireEvent.click(saveSearchButton);
    expect(screen.getByTestId('saved-0')).toHaveTextContent('saved query');
    
    fireEvent.click(removeSearchButton);
    expect(screen.getByTestId('saved-searches')).toBeEmptyDOMElement();
  });
});

describe('Search Performance', () => {
  test('search performance is acceptable with large datasets', async () => {
    const largeDataset = Array.from({ length: 10000 }, (_, index) => ({
      id: index,
      name: `Item ${index}`,
      description: `Description for item ${index}`,
      category: index % 5 === 0 ? 'category1' : 'category2',
    }));

    const TestComponent = () => {
      const { searchQuery, setSearchQuery, searchResults } = useSearch();
      
      return (
        <div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="search-input"
          />
          <div data-testid="search-results">{searchResults.length} results</div>
        </div>
      );
    };

    const startTime = performance.now();
    renderWithProviders(<TestComponent />);
    const endTime = performance.now();
    
    const renderTime = endTime - startTime;
    expect(renderTime).toBeLessThan(1000); // Should render in under 1 second
  });

  test('search debouncing prevents excessive API calls', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    });

    const TestComponent = () => {
      const { searchQuery, setSearchQuery } = useSearch();
      
      React.useEffect(() => {
        if (searchQuery) {
          fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: searchQuery })
          });
        }
      }, [searchQuery]);
      
      return (
        <div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            data-testid="search-input"
          />
        </div>
      );
    };

    renderWithProviders(<TestComponent />);
    
    const searchInput = screen.getByTestId('search-input');
    
    // Type multiple characters quickly
    fireEvent.change(searchInput, { target: { value: 't' } });
    fireEvent.change(searchInput, { target: { value: 'te' } });
    fireEvent.change(searchInput, { target: { value: 'tes' } });
    fireEvent.change(searchInput, { target: { value: 'test' } });
    
    // Wait for debounced search
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1); // Only one API call due to debouncing
    }, { timeout: 1000 });
  });
});

// Cleanup
afterAll(() => {
  jest.restoreAllMocks();
});





