# Search and Filtering System

This document outlines the advanced search and filtering system implemented in the Secure Gate Access application.

## Overview

The search and filtering system provides comprehensive search capabilities across all data views, including real-time search, advanced filtering, sorting, and pagination.

## Features

### 1. Real-time Search
- Instant search as you type with debouncing
- Search across multiple fields simultaneously
- Fuzzy search with scoring
- Search suggestions and autocomplete
- Search history tracking

### 2. Advanced Filtering
- Multi-criteria filtering
- Filter by date ranges, status, categories
- Filter combinations with AND/OR logic
- Filter persistence in URL parameters
- Saved search functionality

### 3. Sorting and Pagination
- Multi-column sorting (ascending/descending)
- Pagination with configurable page sizes
- Virtual scrolling for large datasets
- Sort and pagination state persistence

### 4. Search State Management
- Global search context
- URL state synchronization
- Local storage persistence
- Search history and saved searches

## Components

### SearchFilter
Main search and filter component with advanced options.

```jsx
import { SearchFilter } from './components/ui';

<SearchFilter
  data={visitors}
  searchFields={['name', 'email', 'phone']}
  filterFields={[
    { key: 'status', label: 'Status', type: 'select' },
    { key: 'date', label: 'Date', type: 'date' }
  ]}
  onSearch={handleSearch}
  onFilter={handleFilter}
  placeholder="Search visitors..."
  showAdvanced={true}
  enableSorting={true}
  enablePagination={true}
/>
```

### SearchResults
Displays search results with summary and actions.

```jsx
import { SearchResults } from './components/ui';

<SearchResults
  data={filteredData}
  searchTerm={searchTerm}
  filters={filters}
  onClearSearch={clearSearch}
  onClearFilters={clearFilters}
  renderItem={renderVisitorItem}
  emptyMessage="No visitors found"
/>
```

### Pagination
Advanced pagination component with navigation controls.

```jsx
import { Pagination } from './components/ui';

<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  onPageChange={handlePageChange}
  showFirstLast={true}
  showPrevNext={true}
  maxVisiblePages={5}
/>
```

## Hooks

### useSearchData
Main hook for search and filtering functionality.

```jsx
import { useSearchData } from './hooks/useSearch';

const {
  data: filteredData,
  pagination,
  searchTerm,
  filters,
  setSearchTerm,
  setFilters,
  clearFilters,
  setPage,
  isSearching,
  hasFilters,
  hasResults
} = useSearchData(originalData, searchFields, filterFields, {
  enablePagination: true,
  pageSize: 10
});
```

### useSearchSuggestions
Hook for search suggestions and autocomplete.

```jsx
import { useSearchSuggestions } from './hooks/useSearch';

const {
  suggestions,
  searchHistory,
  hasSuggestions
} = useSearchSuggestions(data, fields, maxSuggestions);
```

### useSavedSearches
Hook for managing saved searches.

```jsx
import { useSavedSearches } from './hooks/useSearch';

const {
  savedSearches,
  saveSearch,
  loadSavedSearch,
  deleteSavedSearch,
  hasSavedSearches
} = useSavedSearches();
```

## Context

### SearchProvider
Global search state management provider.

```jsx
import { SearchProvider } from './contexts/SearchContext';

<SearchProvider
  enableUrlState={true}
  enableLocalStorage={true}
  storageKey="searchState"
  debounceDelay={300}
>
  <YourApp />
</SearchProvider>
```

## Utilities

### searchUtils
Core search and filtering utilities.

```jsx
import { searchUtils } from './utils/searchUtils';

// Basic text search
const results = searchUtils.searchText(data, searchTerm, fields);

// Fuzzy search
const results = searchUtils.fuzzySearch(data, searchTerm, fields, threshold);

// Filter data
const results = searchUtils.filterData(data, filters);

// Sort data
const results = searchUtils.sortData(data, sortField, direction);

// Paginate data
const paginated = searchUtils.paginateData(data, page, pageSize);

// Get unique values for filters
const options = searchUtils.getUniqueValues(data, field);

// Get search suggestions
const suggestions = searchUtils.getSuggestions(data, searchTerm, fields);

// Highlight search terms
const highlighted = searchUtils.highlightText(text, searchTerm, className);

// Save/load search state
searchUtils.saveSearchState(searchParams);
const state = searchUtils.loadSearchState();
```

## Configuration

### Search Fields
Define which fields to search in:

```jsx
const searchFields = ['name', 'email', 'phone', 'status'];
```

### Filter Fields
Configure filter options:

```jsx
const filterFields = [
  { key: 'status', label: 'Status', type: 'select' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'category', label: 'Category', type: 'multiselect' },
  { key: 'amount', label: 'Amount', type: 'number' }
];
```

### Filter Types
- `text` - Text input
- `select` - Dropdown selection
- `multiselect` - Multiple selection
- `date` - Date picker
- `number` - Number input
- `range` - Range slider

## Advanced Features

### 1. Fuzzy Search
Fuzzy search with configurable threshold:

```jsx
const results = searchUtils.fuzzySearch(data, searchTerm, fields, 0.6);
```

### 2. Search Operators
Advanced filtering with operators:

```jsx
const filters = {
  amount: {
    operator: 'between',
    value: [100, 500]
  },
  status: {
    operator: 'in',
    value: ['active', 'pending']
  }
};
```

### 3. Search Highlighting
Highlight search terms in results:

```jsx
const highlighted = searchUtils.highlightText(text, searchTerm, 'bg-yellow-200');
```

### 4. URL State Management
Automatic URL state synchronization:

```jsx
// Search state is automatically saved to URL
// ?search=john&filters={"status":"active"}&sort=name&page=1
```

### 5. Local Storage Persistence
Search state persistence across sessions:

```jsx
// Search state is automatically saved to localStorage
// and restored on page load
```

## Performance Optimization

### 1. Debouncing
Search input is debounced to prevent excessive API calls:

```jsx
const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
```

### 2. Memoization
Search results are memoized to prevent unnecessary recalculations:

```jsx
const filteredData = useMemo(() => {
  return searchUtils.searchText(data, searchTerm, fields);
}, [data, searchTerm, fields]);
```

### 3. Virtual Scrolling
Large datasets use virtual scrolling for better performance:

```jsx
import { VirtualList } from './components/ui';

<VirtualList
  items={largeDataset}
  itemHeight={50}
  containerHeight={400}
  renderItem={renderItem}
/>
```

## Integration Examples

### Visitor History
```jsx
import { useSearchData } from './hooks/useSearch';

function VisitorHistory() {
  const [visitors, setVisitors] = useState([]);
  
  const searchFields = ['name', 'phone', 'email', 'status'];
  const filterFields = [
    { key: 'status', label: 'Status', type: 'select' },
    { key: 'check_in', label: 'Check-in Date', type: 'date' }
  ];
  
  const {
    data: filteredVisitors,
    pagination,
    searchTerm,
    setSearchTerm,
    setFilters,
    clearFilters
  } = useSearchData(visitors, searchFields, filterFields);
  
  return (
    <div>
      <SearchFilter
        data={visitors}
        searchFields={searchFields}
        filterFields={filterFields}
        onSearch={setSearchTerm}
        onFilter={setFilters}
        placeholder="Search visitors..."
      />
      
      <SearchResults
        data={filteredVisitors}
        searchTerm={searchTerm}
        onClearSearch={() => setSearchTerm('')}
        onClearFilters={clearFilters}
        renderItem={renderVisitorItem}
      />
      
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
```

### Guard Dashboard
```jsx
function GuardDashboard() {
  const [activeVisitors, setActiveVisitors] = useState([]);
  
  const searchFields = ['name', 'host', 'status'];
  const filterFields = [
    { key: 'status', label: 'Status', type: 'select' },
    { key: 'check_in_time', label: 'Check-in Time', type: 'date' }
  ];
  
  const {
    data: filteredVisitors,
    searchTerm,
    setSearchTerm,
    setFilters
  } = useSearchData(activeVisitors, searchFields, filterFields);
  
  return (
    <div>
      <SearchFilter
        data={activeVisitors}
        searchFields={searchFields}
        filterFields={filterFields}
        onSearch={setSearchTerm}
        onFilter={setFilters}
        placeholder="Search active visitors..."
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVisitors.map(visitor => (
          <VisitorCard key={visitor.id} visitor={visitor} />
        ))}
      </div>
    </div>
  );
}
```

### Admin Dashboard
```jsx
function AdminDashboard() {
  const [auditLogs, setAuditLogs] = useState([]);
  
  const searchFields = ['action', 'user_id', 'entity_type', 'ip_address'];
  const filterFields = [
    { key: 'action', label: 'Action', type: 'select' },
    { key: 'entity_type', label: 'Entity Type', type: 'select' },
    { key: 'created_at', label: 'Date', type: 'date' }
  ];
  
  const {
    data: filteredLogs,
    pagination,
    searchTerm,
    setSearchTerm,
    setFilters
  } = useSearchData(auditLogs, searchFields, filterFields);
  
  return (
    <div>
      <SearchFilter
        data={auditLogs}
        searchFields={searchFields}
        filterFields={filterFields}
        onSearch={setSearchTerm}
        onFilter={setFilters}
        placeholder="Search audit logs..."
      />
      
      <Table
        headers={['Time', 'User', 'Action', 'Entity', 'Details', 'IP']}
        rows={filteredLogs.map(log => [
          log.created_at,
          log.user_id,
          log.action,
          `${log.entity_type}:${log.entity_id}`,
          log.details ? JSON.stringify(log.details) : '',
          log.ip_address
        ])}
      />
      
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        onPageChange={setPage}
      />
    </div>
  );
}
```

## Best Practices

### 1. Performance
- Use debouncing for search input
- Implement virtual scrolling for large datasets
- Memoize expensive calculations
- Limit search results to reasonable numbers

### 2. User Experience
- Provide clear search feedback
- Show search result counts
- Implement search suggestions
- Save search state across sessions

### 3. Accessibility
- Use proper ARIA labels
- Ensure keyboard navigation
- Provide screen reader support
- Test with assistive technologies

### 4. Error Handling
- Handle search errors gracefully
- Provide fallback options
- Show loading states
- Validate search inputs

## Troubleshooting

### Common Issues

1. **Search not working**
   - Check search fields configuration
   - Verify data structure
   - Check for typos in field names

2. **Filters not applying**
   - Verify filter field configuration
   - Check filter value format
   - Ensure proper data types

3. **Performance issues**
   - Implement debouncing
   - Use virtual scrolling
   - Optimize search algorithms
   - Limit result sets

4. **State not persisting**
   - Check localStorage availability
   - Verify URL state configuration
   - Check for storage quotas

### Debug Tools

1. **Search State Inspector**
   ```jsx
   const { searchState } = useSearch();
   console.log('Search State:', searchState);
   ```

2. **Performance Monitoring**
   ```jsx
   const startTime = performance.now();
   // ... search operation
   const endTime = performance.now();
   console.log(`Search took ${endTime - startTime} milliseconds`);
   ```

3. **Search Analytics**
   ```jsx
   // Track search usage
   const trackSearch = (term, results) => {
     analytics.track('search_performed', {
       term,
       resultCount: results.length,
       timestamp: new Date().toISOString()
     });
   };
   ```

## License

This search and filtering system is part of the Secure Gate Access application and follows the same licensing terms.

