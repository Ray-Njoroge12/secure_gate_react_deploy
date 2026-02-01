/**
 * Unit Tests: SearchHistory Component
 * Tests search history, saved filters, and performance optimization
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchHistory from '../../../components/search/SearchHistory';
import { searchService } from '../../../services/searchService';

// Mock the search service
jest.mock('../../../services/searchService', () => ({
  searchService: {
    getRecentSearches: jest.fn(),
    getPopularQueries: jest.fn(),
    clearHistory: jest.fn()
  }
}));

describe('SearchHistory Component', () => {
  const mockOnHistorySelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRecentSearches = [
    { text: 'John Doe', type: 'recent', timestamp: '2025-01-01T10:00:00Z' },
    { text: 'visitor status', type: 'recent', timestamp: '2025-01-01T09:30:00Z' },
    { text: 'security incident', type: 'recent', timestamp: '2025-01-01T09:00:00Z' }
  ];

  const mockPopularQueries = [
    { text: 'visitor', type: 'popular', count: 25 },
    { text: 'user', type: 'popular', count: 18 },
    { text: 'incident', type: 'popular', count: 12 }
  ];

  const renderSearchHistory = (props = {}) => {
    searchService.getRecentSearches.mockReturnValue(mockRecentSearches);
    searchService.getPopularQueries.mockReturnValue(mockPopularQueries);

    return render(
      <SearchHistory
        onHistorySelect={mockOnHistorySelect}
        maxItems={10}
        {...props}
      />
    );
  };

  test('renders recent searches tab by default', () => {
    renderSearchHistory();
    
    expect(screen.getByRole('button', { name: /recent/i })).toHaveClass('active');
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('visitor status')).toBeInTheDocument();
    expect(screen.getByText('security incident')).toBeInTheDocument();
  });

  test('switches to popular queries tab', async () => {
    renderSearchHistory();
    
    const popularTab = screen.getByRole('button', { name: /popular/i });
    await act(async () => {
      await userEvent.click(popularTab);
    });

    expect(popularTab).toHaveClass('active');
    expect(screen.getByText('visitor')).toBeInTheDocument();
    expect(screen.getByText('25 searches')).toBeInTheDocument();
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('18 searches')).toBeInTheDocument();
  });

  test('handles history item selection', async () => {
    renderSearchHistory();
    
    const historyItem = screen.getByText('John Doe').closest('[role="button"]');
    
    await act(async () => {
      await userEvent.click(historyItem);
    });

    expect(mockOnHistorySelect).toHaveBeenCalledWith('John Doe');
  });

  test('handles popular query selection', async () => {
    renderSearchHistory();
    
    // Switch to popular tab
    const popularTab = screen.getByRole('button', { name: /popular/i });
    await act(async () => {
      await userEvent.click(popularTab);
    });

    const popularItem = screen.getByText('visitor').closest('[role="button"]');
    
    await act(async () => {
      await userEvent.click(popularItem);
    });

    expect(mockOnHistorySelect).toHaveBeenCalledWith('visitor');
  });

  test('clears search history', async () => {
    renderSearchHistory();
    
    const clearButton = screen.getByRole('button', { name: /clear/i });
    
    await act(async () => {
      await userEvent.click(clearButton);
    });

    expect(searchService.clearHistory).toHaveBeenCalled();
  });

  test('formats time ago correctly', () => {
    // Mock current time
    const mockNow = new Date('2025-01-01T12:00:00Z');
    jest.spyOn(Date, 'now').mockReturnValue(mockNow.getTime());

    const recentSearches = [
      { text: 'Just now', type: 'recent', timestamp: '2025-01-01T12:00:00Z' },
      { text: '30 minutes ago', type: 'recent', timestamp: '2025-01-01T11:30:00Z' },
      { text: '2 hours ago', type: 'recent', timestamp: '2025-01-01T10:00:00Z' },
      { text: '1 day ago', type: 'recent', timestamp: '2024-12-31T12:00:00Z' }
    ];

    searchService.getRecentSearches.mockReturnValue(recentSearches);

    renderSearchHistory();

    expect(screen.getByText('Just now')).toBeInTheDocument();
    expect(screen.getByText('30m ago')).toBeInTheDocument();
    expect(screen.getByText('2h ago')).toBeInTheDocument();
    expect(screen.getByText('1d ago')).toBeInTheDocument();

    Date.now.mockRestore();
  });

  test('shows empty state when no history', () => {
    searchService.getRecentSearches.mockReturnValue([]);
    searchService.getPopularQueries.mockReturnValue([]);

    renderSearchHistory();
    
    expect(screen.getByText('No search history yet')).toBeInTheDocument();
    expect(screen.getByText('Start searching to see your recent queries here')).toBeInTheDocument();
  });

  test('shows empty state for recent searches only', () => {
    searchService.getRecentSearches.mockReturnValue([]);
    searchService.getPopularQueries.mockReturnValue(mockPopularQueries);

    renderSearchHistory();
    
    expect(screen.getByText('No recent searches')).toBeInTheDocument();
  });

  test('shows empty state for popular queries only', async () => {
    searchService.getRecentSearches.mockReturnValue(mockRecentSearches);
    searchService.getPopularQueries.mockReturnValue([]);

    renderSearchHistory();
    
    // Switch to popular tab
    const popularTab = screen.getByRole('button', { name: /popular/i });
    await act(async () => {
      await userEvent.click(popularTab);
    });

    expect(screen.getByText('No popular searches yet')).toBeInTheDocument();
  });

  test('supports keyboard navigation', async () => {
    renderSearchHistory();
    
    const firstItem = screen.getByText('John Doe').closest('[role="button"]');
    
    // Focus first item
    await act(async () => {
      firstItem.focus();
    });

    expect(firstItem).toHaveFocus();

    // Navigate with Tab
    await act(async () => {
      await userEvent.keyboard('{Tab}');
    });

    const secondItem = screen.getByText('visitor status').closest('[role="button"]');
    expect(secondItem).toHaveFocus();

    // Select with Enter
    await act(async () => {
      await userEvent.keyboard('{Enter}');
    });

    expect(mockOnHistorySelect).toHaveBeenCalledWith('visitor status');
  });

  test('supports keyboard navigation with Space key', async () => {
    renderSearchHistory();
    
    const firstItem = screen.getByText('John Doe').closest('[role="button"]');
    
    await act(async () => {
      firstItem.focus();
      await userEvent.keyboard(' ');
    });

    expect(mockOnHistorySelect).toHaveBeenCalledWith('John Doe');
  });

  test('limits items to maxItems prop', () => {
    const manySearches = Array.from({ length: 20 }, (_, i) => ({
      text: `Search ${i + 1}`,
      type: 'recent',
      timestamp: new Date().toISOString()
    }));

    searchService.getRecentSearches.mockReturnValue(manySearches);

    renderSearchHistory({ maxItems: 5 });

    expect(searchService.getRecentSearches).toHaveBeenCalledWith(5);
  });

  test('applies custom className', () => {
    renderSearchHistory({ className: 'custom-history' });
    
    const historyContainer = screen.getByRole('region');
    expect(historyContainer).toHaveClass('custom-history');
  });

  test('shows appropriate icons for different item types', () => {
    renderSearchHistory();
    
    // Recent searches should have clock icon
    expect(screen.getAllByText('🕒')).toHaveLength(3);

    // Switch to popular tab
    const popularTab = screen.getByRole('button', { name: /popular/i });
    act(() => {
      userEvent.click(popularTab);
    });

    // Popular queries should have fire icon
    expect(screen.getAllByText('🔥')).toHaveLength(3);
  });

  test('handles missing onHistorySelect prop gracefully', async () => {
    renderSearchHistory({ onHistorySelect: undefined });
    
    const historyItem = screen.getByText('John Doe').closest('[role="button"]');
    
    // Should not throw error when clicking
    await act(async () => {
      await userEvent.click(historyItem);
    });

    // No callback should be called
    expect(mockOnHistorySelect).not.toHaveBeenCalled();
  });

  test('updates history when service data changes', () => {
    const { rerender } = renderSearchHistory();
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();

    // Update mock data
    const newSearches = [
      { text: 'New Search', type: 'recent', timestamp: '2025-01-01T11:00:00Z' }
    ];
    searchService.getRecentSearches.mockReturnValue(newSearches);

    rerender(
      <SearchHistory
        onHistorySelect={mockOnHistorySelect}
        maxItems={10}
      />
    );

    expect(screen.getByText('New Search')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  test('shows clear button only for recent searches', async () => {
    renderSearchHistory();
    
    // Should show clear button on recent tab
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();

    // Switch to popular tab
    const popularTab = screen.getByRole('button', { name: /popular/i });
    await act(async () => {
      await userEvent.click(popularTab);
    });

    // Should not show clear button on popular tab
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
  });

  test('supports accessibility features', () => {
    renderSearchHistory();
    
    // Check ARIA labels and roles
    const historyItems = screen.getAllByRole('button');
    historyItems.forEach(item => {
      expect(item).toHaveAttribute('tabIndex', '0');
    });

    // Check tab navigation
    const recentTab = screen.getByRole('button', { name: /recent/i });
    const popularTab = screen.getByRole('button', { name: /popular/i });
    
    expect(recentTab).toHaveAttribute('role', 'button');
    expect(popularTab).toHaveAttribute('role', 'button');
  });
});