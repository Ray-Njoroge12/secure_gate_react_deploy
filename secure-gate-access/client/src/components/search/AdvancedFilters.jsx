/**
 * Advanced Filters Component
 * Provides complex filter builder with AND/OR logic and saved filter sets
 */

import React, { useState, useEffect } from 'react';
import { FilterBuilder, searchService } from '../../services/searchService';
import './AdvancedFilters.css';
import Button from '../ui/Button';

const AdvancedFilters = ({
  onChange,
  dataTypes = ['visitors', 'users', 'incidents'],
  className = ''
}) => {
  const [filterBuilder, setFilterBuilder] = useState(new FilterBuilder());
  const [savedFilters, setSavedFilters] = useState([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [saveFilterDescription, setSaveFilterDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load saved filters on mount
  useEffect(() => {
    loadSavedFilters();
  }, []);

  // Load saved filter sets
  const loadSavedFilters = async () => {
    try {
      const filterSets = await searchService.getFilterSets();
      setSavedFilters(filterSets);
    } catch (error) {
      console.error('Failed to load saved filters:', error);
    }
  };

  // Get available fields for each data type
  const getFieldsForDataType = (dataType) => {
    const fieldMaps = {
      visitors: [
        { value: 'name', label: 'Name', type: 'string' },
        { value: 'email', label: 'Email', type: 'string' },
        { value: 'phone', label: 'Phone', type: 'string' },
        { value: 'status', label: 'Status', type: 'enum', options: ['PENDING', 'APPROVED', 'VERIFIED', 'ON_PREMISE', 'CHECKED_OUT', 'REVOKED'] },
        { value: 'purpose', label: 'Purpose', type: 'string' },
        { value: 'created_at', label: 'Created Date', type: 'date' },
        { value: 'expected_arrival', label: 'Expected Arrival', type: 'datetime' }
      ],
      users: [
        { value: 'username', label: 'Username', type: 'string' },
        { value: 'email', label: 'Email', type: 'string' },
        { value: 'role', label: 'Role', type: 'enum', options: ['admin', 'guard', 'resident'] },
        { value: 'account_status', label: 'Account Status', type: 'enum', options: ['pending', 'active', 'suspended'] },
        { value: 'verified', label: 'Verified', type: 'boolean' },
        { value: 'created_at', label: 'Created Date', type: 'date' }
      ],
      incidents: [
        { value: 'category', label: 'Category', type: 'enum', options: ['security', 'safety', 'maintenance', 'visitor', 'other'] },
        { value: 'severity', label: 'Severity', type: 'enum', options: ['low', 'medium', 'high', 'critical'] },
        { value: 'status', label: 'Status', type: 'enum', options: ['open', 'in_progress', 'resolved', 'closed'] },
        { value: 'description', label: 'Description', type: 'string' },
        { value: 'created_at', label: 'Created Date', type: 'date' }
      ]
    };

    return fieldMaps[dataType] || [];
  };

  // Get available operators for field type
  const getOperatorsForType = (fieldType) => {
    const operatorMaps = {
      string: [
        { value: 'contains', label: 'Contains' },
        { value: 'equals', label: 'Equals' },
        { value: 'starts_with', label: 'Starts with' },
        { value: 'ends_with', label: 'Ends with' },
        { value: 'not_equals', label: 'Not equals' },
        { value: 'is_empty', label: 'Is empty' },
        { value: 'is_not_empty', label: 'Is not empty' }
      ],
      enum: [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Not equals' },
        { value: 'in', label: 'In list' },
        { value: 'not_in', label: 'Not in list' }
      ],
      date: [
        { value: 'equals', label: 'On date' },
        { value: 'before', label: 'Before' },
        { value: 'after', label: 'After' },
        { value: 'between', label: 'Between' },
        { value: 'last_days', label: 'Last N days' },
        { value: 'next_days', label: 'Next N days' }
      ],
      datetime: [
        { value: 'equals', label: 'At time' },
        { value: 'before', label: 'Before' },
        { value: 'after', label: 'After' },
        { value: 'between', label: 'Between' },
        { value: 'last_hours', label: 'Last N hours' },
        { value: 'next_hours', label: 'Next N hours' }
      ],
      boolean: [
        { value: 'equals', label: 'Is' },
        { value: 'not_equals', label: 'Is not' }
      ],
      number: [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Not equals' },
        { value: 'greater_than', label: 'Greater than' },
        { value: 'less_than', label: 'Less than' },
        { value: 'between', label: 'Between' }
      ]
    };

    return operatorMaps[fieldType] || operatorMaps.string;
  };

  // Add new condition
  const addCondition = () => {
    const newBuilder = new FilterBuilder();
    newBuilder.conditions = [...filterBuilder.conditions];
    newBuilder.logic = filterBuilder.logic;
    
    newBuilder.addCondition('', 'contains', '', 'string');
    setFilterBuilder(newBuilder);
    updateFilters(newBuilder);
  };

  // Update condition
  const updateCondition = (conditionId, field, value) => {
    const newBuilder = new FilterBuilder();
    newBuilder.logic = filterBuilder.logic;
    newBuilder.conditions = filterBuilder.conditions.map(condition => {
      if (condition.id === conditionId) {
        return { ...condition, [field]: value };
      }
      return condition;
    });
    
    setFilterBuilder(newBuilder);
    updateFilters(newBuilder);
  };

  // Remove condition
  const removeCondition = (conditionId) => {
    const newBuilder = new FilterBuilder();
    newBuilder.logic = filterBuilder.logic;
    newBuilder.conditions = filterBuilder.conditions.filter(
      condition => condition.id !== conditionId
    );
    
    setFilterBuilder(newBuilder);
    updateFilters(newBuilder);
  };

  // Update logic operator
  const updateLogic = (logic) => {
    const newBuilder = new FilterBuilder();
    newBuilder.conditions = [...filterBuilder.conditions];
    newBuilder.logic = logic;
    
    setFilterBuilder(newBuilder);
    updateFilters(newBuilder);
  };

  // Update parent with current filters
  const updateFilters = (builder) => {
    if (onChange) {
      const builtFilters = builder.build();
      onChange(builtFilters);
    }
  };

  // Clear all filters
  const clearFilters = () => {
    const newBuilder = new FilterBuilder();
    setFilterBuilder(newBuilder);
    updateFilters(newBuilder);
  };

  // Load saved filter set
  const loadFilterSet = (filterSet) => {
    const newBuilder = new FilterBuilder();
    newBuilder.conditions = filterSet.filters.conditions || [];
    newBuilder.logic = filterSet.filters.logic || 'AND';
    
    setFilterBuilder(newBuilder);
    updateFilters(newBuilder);
  };

  // Save current filter set
  const saveFilterSet = async () => {
    if (!saveFilterName.trim()) return;

    setIsLoading(true);
    try {
      const filterData = filterBuilder.build();
      await searchService.saveFilterSet(
        saveFilterName.trim(),
        filterData,
        saveFilterDescription.trim()
      );
      
      // Reload saved filters
      await loadSavedFilters();
      
      // Reset save dialog
      setShowSaveDialog(false);
      setSaveFilterName('');
      setSaveFilterDescription('');
      
    } catch (error) {
      console.error('Failed to save filter set:', error);
      alert('Failed to save filter set. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Render condition input based on field type
  const renderConditionInput = (condition, _field) => {
    const fieldInfo = getFieldsForDataType('visitors')
      .concat(getFieldsForDataType('users'))
      .concat(getFieldsForDataType('incidents'))
      .find(f => f.value === condition.field);

    if (!fieldInfo) {
      return (
        <input
          type="text"
          value={condition.value || ''}
          onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
          placeholder="Enter value"
          className="condition-input"
        />
      );
    }

    switch (fieldInfo.type) {
      case 'enum':
        if (condition.operator === 'in' || condition.operator === 'not_in') {
          return (
            <select
              multiple
              value={Array.isArray(condition.value) ? condition.value : []}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                updateCondition(condition.id, 'value', values);
              }}
              className="condition-input condition-select-multiple"
            >
              {fieldInfo.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          );
        } else {
          return (
            <select
              value={condition.value || ''}
              onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
              className="condition-input condition-select"
            >
              <option value="">Select value</option>
              {fieldInfo.options?.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          );
        }

      case 'boolean':
        return (
          <select
            value={condition.value || ''}
            onChange={(e) => updateCondition(condition.id, 'value', e.target.value === 'true')}
            className="condition-input condition-select"
          >
            <option value="">Select value</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        );

      case 'date':
      case 'datetime':
        return (
          <input
            type={fieldInfo.type === 'date' ? 'date' : 'datetime-local'}
            value={condition.value || ''}
            onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
            className="condition-input"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={condition.value || ''}
            onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
            placeholder="Enter number"
            className="condition-input"
          />
        );

      default:
        return (
          <input
            type="text"
            value={condition.value || ''}
            onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
            placeholder="Enter value"
            className="condition-input"
          />
        );
    }
  };

  return (
    <div className={`advanced-filters ${className}`}>
      <div className="filters-header">
        <h3>Advanced Filters</h3>
        <div className="filters-actions">
          <Button
            onClick={addCondition}
            className="btn btn-sm btn-primary"
            type="button"
          >
            Add Condition
          </Button>
          <Button
            onClick={clearFilters}
            className="btn btn-sm btn-secondary"
            type="button"
          >
            Clear All
          </Button>
          <Button
            onClick={() => setShowSaveDialog(true)}
            className="btn btn-sm btn-outline"
            disabled={filterBuilder.conditions.length === 0}
            type="button"
          >
            Save Filters
          </Button>
        </div>
      </div>

      {/* Logic Operator */}
      {filterBuilder.conditions.length > 1 && (
        <div className="logic-selector">
          <label>Match:</label>
          <select
            value={filterBuilder.logic}
            onChange={(e) => updateLogic(e.target.value)}
            className="logic-select"
          >
            <option value="AND">All conditions (AND)</option>
            <option value="OR">Any condition (OR)</option>
          </select>
        </div>
      )}

      {/* Filter Conditions */}
      <div className="filter-conditions">
        {filterBuilder.conditions.map((condition, _index) => (
          <div key={condition.id} className="filter-condition">
            <div className="condition-row">
              {/* Field Selection */}
              <select
                value={condition.field || ''}
                onChange={(e) => updateCondition(condition.id, 'field', e.target.value)}
                className="condition-field"
              >
                <option value="">Select field</option>
                {dataTypes.map(dataType => (
                  <optgroup key={dataType} label={dataType.charAt(0).toUpperCase() + dataType.slice(1)}>
                    {getFieldsForDataType(dataType).map(field => (
                      <option key={`${dataType}.${field.value}`} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              {/* Operator Selection */}
              <select
                value={condition.operator || ''}
                onChange={(e) => updateCondition(condition.id, 'operator', e.target.value)}
                className="condition-operator"
                disabled={!condition.field}
              >
                <option value="">Select operator</option>
                {condition.field && getOperatorsForType(condition.dataType).map(operator => (
                  <option key={operator.value} value={operator.value}>
                    {operator.label}
                  </option>
                ))}
              </select>

              {/* Value Input */}
              <div className="condition-value">
                {renderConditionInput(condition)}
              </div>

              {/* Remove Button */}
              <Button
                onClick={() => removeCondition(condition.id)}
                className="btn btn-sm btn-danger condition-remove"
                type="button"
                aria-label="Remove condition"
              >
                ✕
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Saved Filters */}
      {savedFilters.length > 0 && (
        <div className="saved-filters">
          <h4>Saved Filter Sets</h4>
          <div className="saved-filters-list">
            {savedFilters.map(filterSet => (
              <div key={filterSet.id} className="saved-filter-item">
                <div className="saved-filter-info">
                  <div className="saved-filter-name">{filterSet.name}</div>
                  {filterSet.description && (
                    <div className="saved-filter-description">{filterSet.description}</div>
                  )}
                </div>
                <Button
                  onClick={() => loadFilterSet(filterSet)}
                  className="btn btn-sm btn-outline"
                  type="button"
                >
                  Load
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <div className="save-filter-dialog">
          <div className="dialog-content">
            <h4>Save Filter Set</h4>
            <div className="form-group">
              <label htmlFor="filter-name">Name:</label>
              <input
                id="filter-name"
                type="text"
                value={saveFilterName}
                onChange={(e) => setSaveFilterName(e.target.value)}
                placeholder="Enter filter set name"
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="filter-description">Description (optional):</label>
              <textarea
                id="filter-description"
                value={saveFilterDescription}
                onChange={(e) => setSaveFilterDescription(e.target.value)}
                placeholder="Enter description"
                className="form-textarea"
                rows="3"
              />
            </div>
            <div className="dialog-actions">
              <Button
                onClick={() => setShowSaveDialog(false)}
                className="btn btn-secondary"
                type="button"
              >
                Cancel
              </Button>
              <Button
                onClick={saveFilterSet}
                className="btn btn-primary"
                disabled={!saveFilterName.trim() || isLoading}
                type="button"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilters;