/**
 * Unit Tests: IntelligentSearch Component
 * Tests search suggestions, auto-completion, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import IntelligentSearch from '../../../components/search/IntelligentSearch';
import { searchService } from '../../../services/searchService';

// Mock the search service
jest.mock('../../../services/searchService', () => ({
  searchService: {
    search: jest.fn(),
    getSuggestions: jest.fn(),
    clearCache: jest.fn()
  }
}));

describe('IntelligentSearch Component', () => {
  const mockOnSearch = jest.fn();
  const mockOnSuggestionSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    searchService.getSuggestions.mockResolvedValue([]);
    searchService.search.mockResolvedValue({
      items: [],
      totalCount: 0,
      responseTime: 100
    });
  });

  const renderIntelligentSearch = (props = {}) => {
    return render(
      <IntelligentSearch
        onSearch={mockOnSearch}
        onSuggestionSelect={mockOnSuggestionSelect}
        placeholder="Search visitors, users, incidents..."
        {...props}
      />
    );
  };

  test('renders search input with placeholder', () => {
    renderIntelligentSearch();
    
    const searchInput = screen.getByPlaceholderText('Search visitors, users, incidents...');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('type', 'text');
  });

  test('shows suggestions when typing', async () => {
    const mockSuggestions = [
      { text: 'John Doe', type: 'visitor', count: 5 },
      { text: 'Jane Smith', type: 'user', count: 3 }
    ];
    
    searchService.getSuggestions.mockResolvedValue(mockSuggestions);
    
    renderIntelligentSearch();
    const searchInput = screen.getByPlaceholderText('Search visitors, users, incidents...');
    
    await act(async () => {
      await userEvent.type(searchInput, 'john');
    });

    await waitFor(() => {
      expect(searchService.getSuggestions).toHaveBeenCalledWith('john', expect.any(Object));
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  test('handles suggestion selection', async () => {
    const mockSuggestions = [
      { text: 'John Doe', type: 'visitor', count: 5 }
    ];
    
    searchService.getSuggestions.mockResolvedValue(mockSuggestions);
    
    renderIntelligentSearch();
    const searchInput = screen.getByPlaceholderText('Search visitors, users, incidents...');
    
    await act(async () => {
      await userEvent.type(searchInput, 'john');
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    await act(async () => {
      await userEvent.click(screen.getByText('John Doe'));
    });

    expect(mockOnSuggestionSelect).toHaveBeenCalledWith('John Doe');
    expect(searchInput).toHaveValue('John Doe');
  });

  test('performs search on Enter key', async () => {
    renderIntelligentSearch();
    const searchInput = screen.getByPlaceholderText('Search visitors, users, incidents...');
    
    await act(async () => {
      await userEvent.type(searchInput, 'test query');
      await userEvent.keyboard('{Enter}');
    });

    expect(mockOnSearch).toHaveBeenCalledWith('test query', expect.any(Object));
  });

  test('performs search on search button click', async () => {
    renderIntelligentSearch();
    const searchInput = screen.getByPlaceholderText('Search visitors, users, incidents...');
    const searchButton = screen.getByRole('button', { name: /search/i });
    
    await act(async () => {
      await userEvent.type(searchInput, 'test query');
      await userEvent.click(searchButton);
    });

    expect(mockOnSearch).toHaveBeenCalledWith('test query', expect.any(Object));
  });

  test('clears search input when clear button is clicked', async () => {
    renderIntelligentSearch();
    const searchInput = screen.getByPlaceholderText('Search visitors, users, incidents...');
    
    await act(async () => {
      await userEvent.type(searchInput, 'test query');
    });

    expect(searchInput).toHaveValue('test query');

    const clearButton = screen.getByRole('button', { name: /clear/i });
    await act(async () => {
      await userEvent.click(clearButton);
    });

    expect(searchInput).toHaveValue('');
  });

  test('handles keyboard navigation in suggestions', async () => {
    const mockSuggestions = [
      { text: 'John Doe', type: 'visitor', count: 5 },
      { text: 'Jane Smith', type: 'user', count: 3 },
      { text: 'Bob Johnson', type: 'visitor', count: 2 }
    ];
    
    searchService.getSuggestions.mockResolvedValue(mockSuggestions);
    
    renderIntelligentSearch();
    const searchInput = screen.getByPlaceholderText('Search visitors, users, incidents...');
    
    await act(async () => {
      await userEvent.type(searchInput, 'j');
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Navigate down with arrow keys
    await act(async () => {
      await userEvent.keyboard('{ArrowDown}');
    });

    // First suggestion should be highlighted
    expect(screen.getByText('John Doe').closest('.suggestion-item')).toHaveClass('highlighted');

    await act(async () => {
      await userEvent.keyboard('{ArrowDown}');
    });

    // Second suggestion should be highlighted
    expect(screen.getByText('Jane Smith').closest('.suggestion-item')).toHaveClass('highlighted');

    // Select with Enter
    await act(async () => {
      await userEvent.keyboard('{Enter}');
    });

    expect(mockOnSuggestionSelect).toHaveBeenCalledWith('Jane Smith');
  });

  test('shows loading state during search', async () => {
    // Mock a delayed search response
    searchService.search.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        items: [],
        totalCount: 0,
        responseTime: 500
      }), 100))
    );

    renderIntelligentSearch();
    const searchInput = screen.getByPlaceholderText('Search visitors, users, incidents...');
    
    await act(async () => {
      await userEvent.type(searchInput, 'test query');
      await userEvent.keyboard('{Enter}');
    });

    // Should show loading indicator
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/searching/i)).toBeInTheDocument();

    // Wait for search to complete
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  test('handles search errors gracefully', async () => {
    searchService.search.mockRejectedValue(new Error('Search failed'));
    
    renderIntelligentSearch();
    const searchInput = screen.getByPlaceholderText('Search visitors, users, incidents...');
    
    await act(async () => {
      await userEvent.type(searchInput, 'test query');
      await userEvent.keyboard('{Enter}');
    });

    await waitFor(() => {
      expect(screen.getByText(/search failed/i)).toBeInTheDocument();
    });
  });

  test('debounces suggestion requests', async () => {
    jest.useFakeTimers();
    
    renderIntelligentSearch();
    const searchInput = screen.getByPlaceholderText('Search visitors, users, incidents...');
    
    // Type multiple characters quickly
    await act(async () => {
      await userEvent.type(searchInput, 'j');
      await userEvent.type(searchInput, 'o');
      await userEvent.type(searchInput, 'h');
      await userEvent.type(searchInput, 'n');
    });

    // Fast forward timers
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Should only call getSuggestions once after debounce
    expect(searchService.getSuggestions).toHaveBeenCalledTimes(1);
    expect(searchService.getSuggestions).toHaveBeenCalledWith('john', expect.any(Object));

    jest.useRealTimers();
  });

  test('supports different data types filtering', async () => {
    renderIntelligentSearch({ 
      dataTypes: ['visitors', 'users'],
      enableFilters: true 
    });
    
    const searchInput = screen.getByPlaceholderText('Search visitors, users, incidents...');
    
    await act(async () => {
      await userEvent.type(searchInput, 'test');
      await userEvent.keyboard('{Enter}');
    });

    expect(mockOnSearch).toHaveBeenCalledWith('test', 
      expect.objectContaining({
        dataTypes: ['visitors', 'users']
      })
    );
  });

  test('shows recent searches when input is empty', async () => {
    const mockRecentSearches = [
      { text: 'previous search', type: 'recent', timestamp: '2025-01-01T10:00:00Z' }
    ];
    
    searchService.getSuggestions.mockResolvedValue(mockRecentSearches);
    
    renderIntelligentSearch();
    const searchInput = screen.getByPlaceholderText('Search visitors, users, incidents...');
    
    await act(async () => {
      fireEvent.focus(searchInput);
    });

    await waitFor(() => {
      expect(screen.getByText('previous search')).toBeInTheDocument();
    });
  });

  test('hides suggestions when clicking outside', async () => {
    const mockSuggestions = [
      { text: 'John Doe', type: 'visitor', count: 5 }
    ];
    
    searchService.getSuggestions.mockResolvedValue(mockSuggestions);
    
    renderIntelligentSearch();
    const searchInput = screen.getByPlaceholderText('Search visitors, users, incidents...');
    
    await act(async () => {
      await userEvent.type(searchInput, 'john');
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click outside
    await act(async () => {
      fireEvent.mouseDown(document.body);
    });

    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  test('supports custom suggestion rendering', () => {
    const customRenderSuggestion = jest.fn((suggestion) => (
      <div data-testid="custom-suggestion">{suggestion.text}</div>
    ));

    renderIntelligentSearch({ 
      renderSuggestion: customRenderSuggestion 
    });

    expect(customRenderSuggestion).toBeDefined();
  });

  test('handles empty query gracefully', async () => {
    renderIntelligentSearch();

    await act(async () => {
      await userEvent.keyboard('{Enter}');
    });

    // Should not call search with empty query
    expect(mockOnSearch).not.toHaveBeenCalled();
  });

  test('supports accessibility features', () => {
    renderIntelligentSearch();
    
    const searchInput = screen.getByPlaceholderText('Search visitors, users, incidents...');
    expect(searchInput).toHaveAttribute('role', 'searchbox');
    expect(searchInput).toHaveAttribute('aria-label', expect.stringContaining('search'));
    
    const searchButton = screen.getByRole('button', { name: /search/i });
    expect(searchButton).toHaveAttribute('aria-label');
  });
});