/**
 * Unit Tests: SearchResults Component
 * Tests search result ranking, highlighting, and categorization
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchResults from '../../../components/search/SearchResults';

describe('SearchResults Component', () => {
  const mockOnResultClick = jest.fn();
  const mockOnLoadMore = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockSearchResults = {
    items: [
      {
        id: 1,
        title: 'John Doe',
        type: 'visitor',
        relevanceScore: 0.95,
        highlights: [
          { field: 'name', text: '<mark>John</mark> Doe' }
        ],
        metadata: {
          phone: '+254712345678',
          status: 'approved',
          expectedArrival: '2025-01-01T14:00:00Z'
        }
      },
      {
        id: 2,
        title: 'Jane Smith',
        type: 'user',
        relevanceScore: 0.87,
        highlights: [
          { field: 'email', text: 'jane.<mark>smith</mark>@example.com' }
        ],
        metadata: {
          role: 'resident',
          email: 'jane.smith@example.com',
          verified: true
        }
      },
      {
        id: 3,
        title: 'Security Incident #123',
        type: 'incident',
        relevanceScore: 0.72,
        highlights: [
          { field: 'description', text: 'Visitor <mark>John</mark> reported suspicious activity' }
        ],
        metadata: {
          severity: 'medium',
          status: 'resolved',
          createdAt: '2025-01-01T10:00:00Z'
        }
      }
    ],
    totalCount: 3,
    query: 'john',
    responseTime: 150,
    timestamp: '2025-01-01T12:00:00Z'
  };

  const renderSearchResults = (props = {}) => {
    return render(
      <SearchResults
        results={mockSearchResults}
        onResultClick={mockOnResultClick}
        onLoadMore={mockOnLoadMore}
        loading={false}
        {...props}
      />
    );
  };

  test('renders search results with proper structure', () => {
    renderSearchResults();
    
    expect(screen.getByText('3 results found')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Security Incident #123')).toBeInTheDocument();
  });

  test('displays results ordered by relevance score', () => {
    renderSearchResults();
    
    const resultItems = screen.getAllByTestId('search-result-item');
    
    // First result should be John Doe (highest relevance: 0.95)
    expect(resultItems[0]).toHaveTextContent('John Doe');
    
    // Second result should be Jane Smith (relevance: 0.87)
    expect(resultItems[1]).toHaveTextContent('Jane Smith');
    
    // Third result should be Security Incident (relevance: 0.72)
    expect(resultItems[2]).toHaveTextContent('Security Incident #123');
  });

  test('highlights matching terms in results', () => {
    renderSearchResults();
    
    // Check for highlighted terms using mark tags
    expect(screen.getByText('John', { selector: 'mark' })).toBeInTheDocument();
    expect(screen.getByText('smith', { selector: 'mark' })).toBeInTheDocument();
  });

  test('categorizes results by type with icons', () => {
    renderSearchResults();
    
    // Check for type indicators
    expect(screen.getByText('visitor')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('incident')).toBeInTheDocument();
    
    // Check for type-specific icons
    expect(screen.getByTestId('visitor-icon')).toBeInTheDocument();
    expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    expect(screen.getByTestId('incident-icon')).toBeInTheDocument();
  });

  test('handles result click events', async () => {
    renderSearchResults();
    
    const firstResult = screen.getByText('John Doe').closest('[data-testid="search-result-item"]');
    
    await act(async () => {
      await userEvent.click(firstResult);
    });

    expect(mockOnResultClick).toHaveBeenCalledWith(mockSearchResults.items[0]);
  });

  test('displays metadata for each result type', () => {
    renderSearchResults();
    
    // Visitor metadata
    expect(screen.getByText('+254712345678')).toBeInTheDocument();
    expect(screen.getByText('approved')).toBeInTheDocument();
    
    // User metadata
    expect(screen.getByText('resident')).toBeInTheDocument();
    expect(screen.getByText('jane.smith@example.com')).toBeInTheDocument();
    
    // Incident metadata
    expect(screen.getByText('medium')).toBeInTheDocument();
    expect(screen.getByText('resolved')).toBeInTheDocument();
  });

  test('shows loading state', () => {
    renderSearchResults({ loading: true });
    
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    
    // Should show skeleton placeholders
    expect(screen.getAllByTestId('result-skeleton')).toHaveLength(3);
  });

  test('shows empty state when no results', () => {
    const emptyResults = {
      ...mockSearchResults,
      items: [],
      totalCount: 0
    };
    
    renderSearchResults({ results: emptyResults });
    
    expect(screen.getByText(/no results found/i)).toBeInTheDocument();
    expect(screen.getByText(/try adjusting your search/i)).toBeInTheDocument();
  });

  test('displays search performance metrics', () => {
    renderSearchResults();
    
    expect(screen.getByText(/150ms/)).toBeInTheDocument();
    expect(screen.getByText(/3 results/)).toBeInTheDocument();
  });

  test('supports pagination with load more', async () => {
    const paginatedResults = {
      ...mockSearchResults,
      hasMore: true,
      page: 1,
      totalPages: 3
    };
    
    renderSearchResults({ results: paginatedResults });
    
    const loadMoreButton = screen.getByRole('button', { name: /load more/i });
    expect(loadMoreButton).toBeInTheDocument();
    
    await act(async () => {
      await userEvent.click(loadMoreButton);
    });

    expect(mockOnLoadMore).toHaveBeenCalledWith(2); // Next page
  });

  test('groups results by category when enabled', () => {
    renderSearchResults({ groupByType: true });
    
    expect(screen.getByText('Visitors (1)')).toBeInTheDocument();
    expect(screen.getByText('Users (1)')).toBeInTheDocument();
    expect(screen.getByText('Incidents (1)')).toBeInTheDocument();
  });

  test('supports different view modes', () => {
    renderSearchResults({ viewMode: 'compact' });
    
    const resultItems = screen.getAllByTestId('search-result-item');
    resultItems.forEach(item => {
      expect(item).toHaveClass('compact-view');
    });
  });

  test('handles keyboard navigation', async () => {
    renderSearchResults();
    
    const firstResult = screen.getAllByTestId('search-result-item')[0];
    
    // Focus first result
    await act(async () => {
      firstResult.focus();
    });

    expect(firstResult).toHaveFocus();

    // Navigate with arrow keys
    await act(async () => {
      await userEvent.keyboard('{ArrowDown}');
    });

    const secondResult = screen.getAllByTestId('search-result-item')[1];
    expect(secondResult).toHaveFocus();

    // Select with Enter
    await act(async () => {
      await userEvent.keyboard('{Enter}');
    });

    expect(mockOnResultClick).toHaveBeenCalledWith(mockSearchResults.items[1]);
  });

  test('shows relevance scores when enabled', () => {
    renderSearchResults({ showRelevanceScore: true });
    
    expect(screen.getByText('95%')).toBeInTheDocument(); // John Doe
    expect(screen.getByText('87%')).toBeInTheDocument(); // Jane Smith
    expect(screen.getByText('72%')).toBeInTheDocument(); // Incident
  });

  test('supports result filtering by type', async () => {
    renderSearchResults({ enableTypeFilter: true });
    
    const visitorFilter = screen.getByRole('button', { name: /visitors/i });
    
    await act(async () => {
      await userEvent.click(visitorFilter);
    });

    // Should only show visitor results
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    expect(screen.queryByText('Security Incident #123')).not.toBeInTheDocument();
  });

  test('displays search suggestions when no results', () => {
    const emptyResults = {
      ...mockSearchResults,
      items: [],
      totalCount: 0,
      suggestions: [
        'Try searching for "visitor"',
        'Check spelling and try again',
        'Use fewer keywords'
      ]
    };
    
    renderSearchResults({ results: emptyResults });
    
    expect(screen.getByText('Try searching for "visitor"')).toBeInTheDocument();
    expect(screen.getByText('Check spelling and try again')).toBeInTheDocument();
  });

  test('handles result actions (view, edit, delete)', async () => {
    const mockOnAction = jest.fn();
    renderSearchResults({ 
      onResultAction: mockOnAction,
      enableActions: true 
    });
    
    // Click on action menu
    const actionButton = screen.getAllByRole('button', { name: /actions/i })[0];
    await act(async () => {
      await userEvent.click(actionButton);
    });

    // Click view action
    const viewAction = screen.getByRole('menuitem', { name: /view/i });
    await act(async () => {
      await userEvent.click(viewAction);
    });

    expect(mockOnAction).toHaveBeenCalledWith('view', mockSearchResults.items[0]);
  });

  test('supports custom result rendering', () => {
    const customRenderResult = jest.fn((result) => (
      <div data-testid="custom-result">{result.title}</div>
    ));

    renderSearchResults({ renderResult: customRenderResult });

    expect(screen.getAllByTestId('custom-result')).toHaveLength(3);
    expect(customRenderResult).toHaveBeenCalledTimes(3);
  });

  test('shows error state when search fails', () => {
    renderSearchResults({ 
      error: 'Search service unavailable',
      results: null 
    });
    
    expect(screen.getByText(/search service unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  test('supports accessibility features', () => {
    renderSearchResults();
    
    // Check ARIA labels and roles
    expect(screen.getByRole('region', { name: /search results/i })).toBeInTheDocument();
    
    const resultItems = screen.getAllByTestId('search-result-item');
    resultItems.forEach(item => {
      expect(item).toHaveAttribute('role', 'button');
      expect(item).toHaveAttribute('tabIndex', '0');
    });
  });

  test('formats timestamps correctly', () => {
    renderSearchResults();
    
    // Should format expected arrival time
    expect(screen.getByText(/jan 1, 2025/i)).toBeInTheDocument();
  });

  test('handles long result lists with virtualization', () => {
    const longResults = {
      ...mockSearchResults,
      items: Array.from({ length: 100 }, (_, i) => ({
        ...mockSearchResults.items[0],
        id: i + 1,
        title: `Result ${i + 1}`
      })),
      totalCount: 100
    };
    
    renderSearchResults({ 
      results: longResults,
      enableVirtualization: true 
    });
    
    // Should only render visible items
    const visibleResults = screen.getAllByTestId('search-result-item');
    expect(visibleResults.length).toBeLessThan(100);
  });
});