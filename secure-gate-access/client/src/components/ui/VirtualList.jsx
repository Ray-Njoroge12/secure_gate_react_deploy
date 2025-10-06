// client/src/components/ui/VirtualList.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useVirtualScrolling } from '../../utils/performanceOptimization';

const VirtualList = ({
  items = [],
  itemHeight = 50,
  containerHeight = 400,
  overscan = 5,
  renderItem,
  className = '',
  onScroll,
  ...props
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);
  const scrollElementRef = useRef(null);

  // Use virtual scrolling hook
  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll: handleVirtualScroll
  } = useVirtualScrolling(items, itemHeight, containerHeight);

  // Handle scroll events
  const handleScroll = useCallback((e) => {
    const newScrollTop = e.target.scrollTop;
    setScrollTop(newScrollTop);
    handleVirtualScroll(newScrollTop);
    onScroll?.(e);
  }, [handleVirtualScroll, onScroll]);

  // Calculate visible range with overscan
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  // Get visible items with overscan
  const visibleItemsWithOverscan = useMemo(() => {
    const { startIndex, endIndex } = visibleRange;
    return items.slice(startIndex, endIndex).map((item, index) => ({
      item,
      index: startIndex + index,
      key: startIndex + index
    }));
  }, [items, visibleRange]);

  // Scroll to specific item
  const scrollToItem = useCallback((index) => {
    if (containerRef.current) {
      const scrollTop = index * itemHeight;
      containerRef.current.scrollTop = scrollTop;
    }
  }, [itemHeight]);

  // Scroll to top
  const scrollToTop = useCallback(() => {
    scrollToItem(0);
  }, [scrollToItem]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    scrollToItem(items.length - 1);
  }, [scrollToItem, items.length]);

  // Get scroll position info
  const getScrollInfo = useCallback(() => {
    return {
      scrollTop,
      scrollHeight: totalHeight,
      clientHeight: containerHeight,
      scrollPercentage: totalHeight > 0 ? (scrollTop / (totalHeight - containerHeight)) * 100 : 0
    };
  }, [scrollTop, totalHeight, containerHeight]);

  return (
    <div className={`relative ${className}`} {...props}>
      {/* Scrollable container */}
      <div
        ref={containerRef}
        className="overflow-auto"
        style={{ height: containerHeight }}
        onScroll={handleScroll}
      >
        {/* Virtual spacer for total height */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Visible items container */}
          <div
            ref={scrollElementRef}
            style={{
              transform: `translateY(${visibleRange.startIndex * itemHeight}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0
            }}
          >
            {visibleItemsWithOverscan.map(({ item, index, key }) => (
              <div
                key={key}
                style={{ height: itemHeight }}
                className="flex items-center"
              >
                {renderItem ? renderItem(item, index) : (
                  <div className="p-2 w-full">
                    {typeof item === 'string' ? item : JSON.stringify(item)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll position indicator (optional) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
          <div>Items: {items.length}</div>
          <div>Visible: {visibleItemsWithOverscan.length}</div>
          <div>Range: {visibleRange.startIndex}-{visibleRange.endIndex}</div>
          <div>Scroll: {Math.round(scrollTop)}px</div>
        </div>
      )}
    </div>
  );
};

// Hook for virtual list state management
export const useVirtualListState = (initialItems = []) => {
  const [items, setItems] = useState(initialItems);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    
    return items.filter(item => {
      const searchableText = typeof item === 'string' 
        ? item 
        : JSON.stringify(item).toLowerCase();
      return searchableText.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [items, searchTerm]);

  // Add item
  const addItem = useCallback((item) => {
    setItems(prev => [...prev, item]);
  }, []);

  // Remove item
  const removeItem = useCallback((index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
    if (selectedIndex === index) {
      setSelectedIndex(-1);
    } else if (selectedIndex > index) {
      setSelectedIndex(prev => prev - 1);
    }
  }, [selectedIndex]);

  // Update item
  const updateItem = useCallback((index, updatedItem) => {
    setItems(prev => prev.map((item, i) => i === index ? updatedItem : item));
  }, []);

  // Clear all items
  const clearItems = useCallback(() => {
    setItems([]);
    setSelectedIndex(-1);
  }, []);

  // Select item
  const selectItem = useCallback((index) => {
    setSelectedIndex(index);
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIndex(-1);
  }, []);

  return {
    items: filteredItems,
    originalItems: items,
    selectedIndex,
    searchTerm,
    setSearchTerm,
    addItem,
    removeItem,
    updateItem,
    clearItems,
    selectItem,
    clearSelection,
    hasSelection: selectedIndex >= 0,
    selectedItem: selectedIndex >= 0 ? filteredItems[selectedIndex] : null
  };
};

// Search component for virtual list
export const VirtualListSearch = ({ 
  searchTerm, 
  onSearchChange, 
  placeholder = "Search items...",
  className = ""
}) => {
  return (
    <div className={`mb-4 ${className}`}>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
};

// Pagination component for virtual list
export const VirtualListPagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  className = ""
}) => {
  const pages = useMemo(() => {
    const pageNumbers = [];
    const maxVisible = 5;
    const start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    
    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }
    
    return pageNumbers;
  }, [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <div className={`flex justify-center items-center space-x-2 ${className}`}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        Previous
      </button>
      
      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-1 border rounded ${
            page === currentPage
              ? 'bg-blue-500 text-white border-blue-500'
              : 'border-gray-300 hover:bg-gray-50'
          }`}
        >
          {page}
        </button>
      ))}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
      >
        Next
      </button>
    </div>
  );
};

export default VirtualList;
