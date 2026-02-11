/**
 * @fileoverview Advanced Search & Filter Panel - Task 14
 * @description Provides unified search with auto-completion, advanced filters,
 * saved filter sets, and result highlighting.
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useSearch } from '../../contexts/SearchContext.jsx';
import { useToast } from '../../contexts/ToastContext.jsx';
import './AdvancedSearchPanel.css';
import Button from '../ui/Button';

const FILTER_OPERATORS = {
  text: ['contains', 'equals', 'starts_with', 'ends_with', 'not_contains'],
  number: ['equals', 'gt', 'gte', 'lt', 'lte', 'between'],
  date: ['equals', 'before', 'after', 'between'],
  select: ['equals', 'not_equals', 'in'],
};

const AdvancedSearchPanel = ({
  fields = [],
  onSearch,
  onSaveFilter,
  savedFilters = [],
  suggestions = [],
  placeholder = 'Search...',
  showAdvanced = true,
}) => {
  const toast = useToast();
  const inputRef = useRef(null);

  const [query, setQuery] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [filters, setFilters] = useState([]);
  const [filterLogic, setFilterLogic] = useState('AND');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filterName, setFilterName] = useState('');

  const filteredSuggestions = useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 8);
  }, [query, suggestions]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (onSearch && query.length >= 2) {
        onSearch({ query, filters, filterLogic });
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [query, filters, filterLogic, onSearch]);

  const addFilter = useCallback(() => {
    if (fields.length === 0) return;
    const field = fields[0];
    setFilters((prev) => [
      ...prev,
      {
        id: Date.now(),
        field: field.key,
        operator: FILTER_OPERATORS[field.type || 'text'][0],
        value: '',
        value2: '',
      },
    ]);
  }, [fields]);

  const updateFilter = useCallback((id, updates) => {
    setFilters((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const updated = { ...f, ...updates };
        if (updates.field) {
          const fieldDef = fields.find((fd) => fd.key === updates.field);
          const ops = FILTER_OPERATORS[fieldDef?.type || 'text'];
          if (!ops.includes(updated.operator)) {
            updated.operator = ops[0];
          }
        }
        return updated;
      })
    );
  }, [fields]);

  const removeFilter = useCallback((id) => {
    setFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleSaveFilter = useCallback(() => {
    if (!filterName.trim()) {
      toast.warning('Enter a name for this filter set.');
      return;
    }
    if (onSaveFilter) {
      onSaveFilter({ name: filterName, filters, logic: filterLogic });
      toast.success(`Filter "${filterName}" saved.`);
      setFilterName('');
    }
  }, [filterName, filters, filterLogic, onSaveFilter, toast]);

  const loadSavedFilter = useCallback((saved) => {
    setFilters(saved.filters || []);
    setFilterLogic(saved.logic || 'AND');
    toast.info(`Loaded filter "${saved.name}".`);
  }, [toast]);

  const clearAll = useCallback(() => {
    setQuery('');
    setFilters([]);
    setFilterLogic('AND');
    if (onSearch) onSearch({ query: '', filters: [], filterLogic: 'AND' });
  }, [onSearch]);

  const handleSuggestionClick = useCallback((suggestion) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  }, []);

  return (
    <div className="advanced-search-panel">
      {/* Search Bar */}
      <div className="search-bar-wrapper">
        <div className="search-input-group">
          <span className="search-icon" aria-hidden="true">&#128269;</span>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            aria-label="Search"
            role="searchbox"
          />
          {query && (
            <Button className="clear-search" onClick={() => setQuery('')} aria-label="Clear search">
              &times;
            </Button>
          )}
        </div>

        {showAdvanced && (
          <Button
            className={`advanced-toggle ${isAdvancedOpen ? 'active' : ''}`}
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            aria-expanded={isAdvancedOpen}
          >
            Filters {filters.length > 0 && <span className="filter-count">{filters.length}</span>}
          </Button>
        )}

        {(query || filters.length > 0) && (
          <Button className="clear-all-btn" onClick={clearAll}>
            Clear All
          </Button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="suggestions-dropdown" role="listbox">
          {filteredSuggestions.map((s, i) => (
            <li
              key={i}
              className="suggestion-item"
              role="option"
              onMouseDown={() => handleSuggestionClick(s)}
            >
              <HighlightMatch text={s} query={query} />
            </li>
          ))}
        </ul>
      )}

      {/* Advanced Filter Builder */}
      {isAdvancedOpen && (
        <div className="advanced-filters">
          <div className="filter-header">
            <h4>Advanced Filters</h4>
            <div className="filter-logic-toggle">
              <Button
                className={filterLogic === 'AND' ? 'active' : ''}
                onClick={() => setFilterLogic('AND')}
              >
                Match All (AND)
              </Button>
              <Button
                className={filterLogic === 'OR' ? 'active' : ''}
                onClick={() => setFilterLogic('OR')}
              >
                Match Any (OR)
              </Button>
            </div>
          </div>

          <div className="filter-rows">
            {filters.map((filter, index) => {
              const fieldDef = fields.find((f) => f.key === filter.field) || fields[0];
              const operators = FILTER_OPERATORS[fieldDef?.type || 'text'];

              return (
                <div key={filter.id} className="filter-row">
                  {index > 0 && (
                    <span className="filter-connector">{filterLogic}</span>
                  )}

                  <select
                    value={filter.field}
                    onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                    aria-label="Filter field"
                  >
                    {fields.map((f) => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>

                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(filter.id, { operator: e.target.value })}
                    aria-label="Filter operator"
                  >
                    {operators.map((op) => (
                      <option key={op} value={op}>{op.replace('_', ' ')}</option>
                    ))}
                  </select>

                  {fieldDef?.type === 'select' ? (
                    <select
                      value={filter.value}
                      onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                      aria-label="Filter value"
                    >
                      <option value="">Select...</option>
                      {(fieldDef.options || []).map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={fieldDef?.type === 'date' ? 'date' : fieldDef?.type === 'number' ? 'number' : 'text'}
                      value={filter.value}
                      onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                      placeholder="Value"
                      aria-label="Filter value"
                    />
                  )}

                  {filter.operator === 'between' && (
                    <input
                      type={fieldDef?.type === 'date' ? 'date' : 'number'}
                      value={filter.value2}
                      onChange={(e) => updateFilter(filter.id, { value2: e.target.value })}
                      placeholder="To"
                      aria-label="Filter end value"
                    />
                  )}

                  <Button
                    className="remove-filter"
                    onClick={() => removeFilter(filter.id)}
                    aria-label="Remove filter"
                  >
                    &times;
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="filter-actions">
            <Button className="add-filter-btn" onClick={addFilter}>
              + Add Filter
            </Button>

            {filters.length > 0 && (
              <div className="save-filter">
                <input
                  type="text"
                  placeholder="Filter name..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  aria-label="Filter set name"
                />
                <Button onClick={handleSaveFilter} disabled={!filterName.trim()}>
                  Save
                </Button>
              </div>
            )}
          </div>

          {/* Saved Filters */}
          {savedFilters.length > 0 && (
            <div className="saved-filters">
              <h5>Saved Filters</h5>
              <div className="saved-filter-list">
                {savedFilters.map((sf, i) => (
                  <Button key={i} className="saved-filter-chip" onClick={() => loadSavedFilter(sf)}>
                    {sf.name}
                    <span className="chip-count">{sf.filters?.length || 0}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** Highlight matching text in search suggestions */
const HighlightMatch = ({ text, query }) => {
  if (!query) return <span>{text}</span>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <span>{text}</span>;

  return (
    <span>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </span>
  );
};

export default AdvancedSearchPanel;
