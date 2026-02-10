/**
 * @file QuickFilters.jsx
 * @description Phase G3 - Quick filter chips for guard dashboard
 * Allows guards to quickly filter visitors by common criteria
 */

import React from 'react';
import { Icon } from '../ui';
import Button from '../ui/Button';

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
    <div className="flex flex-col space-y-3 mb-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500 flex items-center gap-2">
          <Icon name="Filter" className="w-4 h-4" />
          Quick Filters
        </h3>
        {activeFilter !== 'all' && (
          <Button
            onClick={onClearFilter}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <Icon name="X" className="w-3 h-3" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map(filter => (
          <Button
            key={filter.id}
            onClick={() => onFilterChange(filter)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
              ${activeFilter === filter.id 
                ? `${filter.color} text-white shadow-md scale-105` 
                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }
            `}
          >
            {filter.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default QuickFilters;
