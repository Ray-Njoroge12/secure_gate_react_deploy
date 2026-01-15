/**
 * @file QuickFilters.jsx
 * @description Phase G3 - Quick filter chips for guard dashboard
 * Allows guards to quickly filter visitors by common criteria
 */

import React from 'react';
import { Filter, X } from 'lucide-react';

const QuickFilters = ({ activeFilter, onFilterChange, onClearFilter }) => {
  const filters = [
    { 
      id: 'all', 
      label: 'All Visitors', 
      query: '',
      color: 'bg-gray-600 hover:bg-gray-700'
    },
    { 
      id: 'on_premise', 
      label: 'On Premise', 
      query: 'status=on_premise',
      color: 'bg-green-600 hover:bg-green-700'
    },
    { 
      id: 'pending', 
      label: 'Pending Approval', 
      query: 'status=pending_approval',
      color: 'bg-yellow-600 hover:bg-yellow-700'
    },
    { 
      id: 'arriving', 
      label: 'Arriving Today', 
      query: `fromDate=${new Date().toISOString().split('T')[0]}&toDate=${new Date().toISOString().split('T')[0]}`,
      color: 'bg-blue-600 hover:bg-blue-700'
    },
    { 
      id: 'approved', 
      label: 'Approved', 
      query: 'status=approved',
      color: 'bg-indigo-600 hover:bg-indigo-700'
    },
    { 
      id: 'rejected', 
      label: 'Denied', 
      query: 'status=rejected',
      color: 'bg-red-600 hover:bg-red-700'
    }
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-600 dark:text-gray-200" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Quick Filters</h3>
        </div>
        {activeFilter !== 'all' && (
          <button
            onClick={onClearFilter}
            className="text-xs text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:text-white flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {filters.map(filter => (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${activeFilter === filter.id 
                ? `${filter.color} text-white shadow-md scale-105` 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default QuickFilters;
