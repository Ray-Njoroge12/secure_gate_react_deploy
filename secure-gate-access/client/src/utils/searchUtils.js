// Advanced search and filtering utilities
export const searchUtils = {
  // Basic text search
  searchText: (data, searchTerm, fields) => {
    if (!searchTerm || !fields || fields.length === 0) return data;
    
    const term = searchTerm.toLowerCase();
    return data.filter(item =>
      fields.some(field => {
        const value = getNestedValue(item, field);
        return value && value.toString().toLowerCase().includes(term);
      })
    );
  },

  // Fuzzy search with scoring
  fuzzySearch: (data, searchTerm, fields, threshold = 0.6) => {
    if (!searchTerm || !fields || fields.length === 0) return data;
    
    const term = searchTerm.toLowerCase();
    return data
      .map(item => ({
        item,
        score: Math.max(...fields.map(field => {
          const value = getNestedValue(item, field);
          return value ? fuzzyScore(value.toString().toLowerCase(), term) : 0;
        }))
      }))
      .filter(({ score }) => score >= threshold)
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
  },

  // Advanced filtering
  filterData: (data, filters) => {
    return data.filter(item => {
      return Object.entries(filters).every(([field, filterValue]) => {
        if (!filterValue || filterValue === '') return true;
        
        const value = getNestedValue(item, field);
        
        if (Array.isArray(filterValue)) {
          return filterValue.includes(value);
        }
        
        if (typeof filterValue === 'object' && filterValue.operator) {
          return applyOperator(value, filterValue.value, filterValue.operator);
        }
        
        return value && value.toString().toLowerCase().includes(filterValue.toLowerCase());
      });
    });
  },

  // Sort data
  sortData: (data, sortField, direction = 'asc') => {
    if (!sortField) return data;
    
    return [...data].sort((a, b) => {
      const aValue = getNestedValue(a, sortField);
      const bValue = getNestedValue(b, sortField);
      
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  },

  // Paginate data
  paginateData: (data, page, pageSize) => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return {
      data: data.slice(startIndex, endIndex),
      totalPages: Math.ceil(data.length / pageSize),
      currentPage: page,
      totalItems: data.length,
      hasNextPage: page < Math.ceil(data.length / pageSize),
      hasPrevPage: page > 1
    };
  },

  // Get unique values for filter options
  getUniqueValues: (data, field) => {
    const values = data.map(item => getNestedValue(item, field)).filter(Boolean);
    return [...new Set(values)].sort();
  },

  // Get search suggestions
  getSuggestions: (data, searchTerm, fields, maxSuggestions = 5) => {
    if (!searchTerm || searchTerm.length < 2) return [];
    
    const term = searchTerm.toLowerCase();
    const suggestions = new Set();
    
    data.forEach(item => {
      fields.forEach(field => {
        const value = getNestedValue(item, field);
        if (value) {
          const words = value.toString().toLowerCase().split(/\s+/);
          words.forEach(word => {
            if (word.startsWith(term) && word.length > term.length) {
              suggestions.add(word);
            }
          });
        }
      });
    });
    
    return Array.from(suggestions).slice(0, maxSuggestions);
  },

  // Highlight search terms
  highlightText: (text, searchTerm, className = 'bg-yellow-200') => {
    if (!searchTerm) return text;
    
    const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
    return text.replace(regex, `<span class="${className}">$1</span>`);
  },

  // Save search state to URL
  saveSearchState: (searchParams) => {
    const url = new URL(window.location.href);
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      } else {
        url.searchParams.delete(key);
      }
    });
    window.history.replaceState({}, '', url);
  },

  // Load search state from URL
  loadSearchState: () => {
    const url = new URL(window.location.href);
    return {
      search: url.searchParams.get('search') || '',
      filters: JSON.parse(url.searchParams.get('filters') || '{}'),
      sort: url.searchParams.get('sort') || '',
      page: parseInt(url.searchParams.get('page') || '1')
    };
  }
};

// Helper functions
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

const fuzzyScore = (str, pattern) => {
  const strLen = str.length;
  const patternLen = pattern.length;
  
  if (patternLen === 0) return 1;
  if (strLen === 0) return 0;
  
  let score = 0;
  let patternIdx = 0;
  
  for (let i = 0; i < strLen; i++) {
    if (str[i] === pattern[patternIdx]) {
      score += 1;
      patternIdx++;
    }
  }
  
  return score / patternLen;
};

const applyOperator = (value, filterValue, operator) => {
  switch (operator) {
    case 'equals':
      return value === filterValue;
    case 'notEquals':
      return value !== filterValue;
    case 'contains':
      return value && value.toString().toLowerCase().includes(filterValue.toLowerCase());
    case 'notContains':
      return !value || !value.toString().toLowerCase().includes(filterValue.toLowerCase());
    case 'startsWith':
      return value && value.toString().toLowerCase().startsWith(filterValue.toLowerCase());
    case 'endsWith':
      return value && value.toString().toLowerCase().endsWith(filterValue.toLowerCase());
    case 'greaterThan':
      return Number(value) > Number(filterValue);
    case 'lessThan':
      return Number(value) < Number(filterValue);
    case 'greaterThanOrEqual':
      return Number(value) >= Number(filterValue);
    case 'lessThanOrEqual':
      return Number(value) <= Number(filterValue);
    case 'between':
      const [min, max] = filterValue;
      return Number(value) >= Number(min) && Number(value) <= Number(max);
    case 'in':
      return Array.isArray(filterValue) && filterValue.includes(value);
    case 'notIn':
      return Array.isArray(filterValue) && !filterValue.includes(value);
    case 'isNull':
      return value === null || value === undefined;
    case 'isNotNull':
      return value !== null && value !== undefined;
    default:
      return true;
  }
};

const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Export default
export default searchUtils;

