import React from 'react';
import { Card, Badge, Button } from './ui';
import Icon from './ui/Icon';

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
                <span className="text-sm text-gray-600 dark:text-gray-200">
                  {hasResults ? `${data.length} results` : 'No results'}
                </span>
                
                {hasSearchTerm && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Icon name="search" className="h-3 w-3" aria-hidden="true" />
                    "{searchTerm}"
                    <Button
                      onClick={() => onClearSearch?.()}
                      className="ml-1 hover:text-red-600"
                      aria-label="Clear search"
                    >
                      <Icon name="x" className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </Badge>
                )}
                
                {hasFilters && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Icon name="filter" className="h-3 w-3" aria-hidden="true" />
                    {Object.keys(filters).length} filter{Object.keys(filters).length > 1 ? 's' : ''}
                    <Button
                      onClick={() => onClearFilters?.()}
                      className="ml-1 hover:text-red-600"
                      aria-label="Clear filters"
                    >
                      <Icon name="x" className="h-3 w-3" aria-hidden="true" />
                    </Button>
                  </Badge>
                )}
                
                {sortField && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    {sortDirection === 'asc' ? <Icon name="sort-asc" className="h-3 w-3" aria-hidden="true" /> : <Icon name="sort-desc" className="h-3 w-3" aria-hidden="true" />}
                    {sortField}
                    <Button
                      onClick={() => onSortChange?.(sortField, sortDirection === 'asc' ? 'desc' : 'asc')}
                      className="ml-1 hover:text-blue-600"
                      aria-label="Change sort direction"
                    >
                      <Icon name="x" className="h-3 w-3" aria-hidden="true" />
                    </Button>
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
                  <Icon name="x" className="h-4 w-4" aria-hidden="true" />
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
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {item.name || item.title || `Item ${index + 1}`}
                        </h3>
                        {item.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">
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
            <Icon name="search" className="h-12 w-12 text-gray-400 dark:text-gray-300 mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {emptyMessage}
            </h3>
            <p className="text-gray-600 dark:text-gray-200 mb-4">
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

