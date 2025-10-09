import React from 'react';
import { Card, Badge, Button } from './ui';
import { Search, Filter, SortAsc, SortDesc, X } from 'lucide-react';

const SearchResults = ({
  data = [],
  searchTerm = '',
  filters = {},
  sortField = '',
  sortDirection = 'asc',
  onClearSearch,
  onClearFilters,
  onSortChange,
  renderItem,
  emptyMessage = "No results found",
  className = ""
}) => {
  const hasSearchTerm = searchTerm && searchTerm.length > 0;
  const hasFilters = Object.keys(filters).length > 0;
  const hasResults = data.length > 0;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Summary */}
      {(hasSearchTerm || hasFilters) && (
        <Card>
          <Card.Content className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600">
                  {hasResults ? `${data.length} results` : 'No results'}
                </span>
                
                {hasSearchTerm && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Search className="h-3 w-3" />
                    "{searchTerm}"
                    <button
                      onClick={() => onClearSearch?.()}
                      className="ml-1 hover:text-red-600"
                      aria-label="Clear search"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {hasFilters && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Filter className="h-3 w-3" />
                    {Object.keys(filters).length} filter{Object.keys(filters).length > 1 ? 's' : ''}
                    <button
                      onClick={() => onClearFilters?.()}
                      className="ml-1 hover:text-red-600"
                      aria-label="Clear filters"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                
                {sortField && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    {sortDirection === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
                    {sortField}
                    <button
                      onClick={() => onSortChange?.(sortField, sortDirection === 'asc' ? 'desc' : 'asc')}
                      className="ml-1 hover:text-blue-600"
                      aria-label="Change sort direction"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>
              
              {(hasSearchTerm || hasFilters) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onClearSearch?.();
                    onClearFilters?.();
                  }}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear all
                </Button>
              )}
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Results */}
      {hasResults ? (
        <div className="space-y-2">
          {data.map((item, index) => (
            <div key={item.id || index}>
              {renderItem ? renderItem(item, index) : (
                <Card>
                  <Card.Content className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {item.name || item.title || `Item ${index + 1}`}
                        </h3>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {item.description}
                          </p>
                        )}
                      </div>
                      {item.status && (
                        <Badge variant="outline">
                          {item.status}
                        </Badge>
                      )}
                    </div>
                  </Card.Content>
                </Card>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <Card.Content className="p-8 text-center">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {emptyMessage}
            </h3>
            <p className="text-gray-600 mb-4">
              {hasSearchTerm || hasFilters
                ? "Try adjusting your search terms or filters"
                : "Start typing to search or apply filters"
              }
            </p>
            {(hasSearchTerm || hasFilters) && (
              <Button
                variant="outline"
                onClick={() => {
                  onClearSearch?.();
                  onClearFilters?.();
                }}
              >
                Clear search and filters
              </Button>
            )}
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

export default SearchResults;

