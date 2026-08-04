/**
 * Form Step Component
 * 
 * A reusable component for individual steps in a form wizard:
 * - Field grouping and layout management
 * - Conditional field rendering
 * - Step-specific validation
 * - Progress indicators
 * - Accessibility compliance
 */

import React, { useState, useCallback, useMemo } from 'react';
import Icon from './Icon';
import { Button, Badge, Tooltip } from './index';
import ValidatedInput from './ValidatedInput';
import { useFormValidation } from '../../hooks/useFormValidation';

const FormStep = ({
  // Step configuration
  stepId,
  title,
  description,
  fields = [],
  groups = [],
  
  // Data and validation
  data = {},
  errors = {},
  onDataChange,
  onValidationChange,
  
  // Display options
  showTitle = true,
  showDescription = true,
  showProgress = true,
  showFieldHelp = true,
  showFieldIcons = true,
  
  // Layout options
  layout = 'vertical', // vertical, horizontal, grid
  columns = 1,
  spacing = 'normal', // tight, normal, loose
  
  // Behavior options
  validateOnChange = true,
  validateOnBlur = true,
  showValidationSummary = true,
  allowSkip = false,
  
  // Styling
  size = 'md', // sm, md, lg
  className = '',
  
  // Event handlers
  onFieldFocus,
  onFieldBlur,
  onFieldChange,
  onStepComplete,
  onStepSkip,
  
  // Children
  children
}) => {
  const [focusedField, setFocusedField] = useState(null);
  const [, setFieldStates] = useState({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const { validateField, validateAllFields, getFieldError } = useFormValidation();

  // Get size-specific styles
  const getSizeStyles = useCallback(() => {
    const sizes = {
      sm: {
        container: 'p-4',
        title: 'text-lg',
        description: 'text-sm',
        field: 'mb-3',
        group: 'mb-4',
        spacing: 'space-y-3'
      },
      md: {
        container: 'p-6',
        title: 'text-xl',
        description: 'text-base',
        field: 'mb-4',
        group: 'mb-6',
        spacing: 'space-y-4'
      },
      lg: {
        container: 'p-8',
        title: 'text-2xl',
        description: 'text-lg',
        field: 'mb-6',
        group: 'mb-8',
        spacing: 'space-y-6'
      }
    };
    return sizes[size] || sizes.md;
  }, [size]);

  // Get layout-specific styles
  const getLayoutStyles = useCallback(() => {
    const layouts = {
      vertical: 'flex flex-col',
      horizontal: 'flex flex-row flex-wrap',
      grid: `grid grid-cols-1 ${columns > 1 ? `md:grid-cols-${Math.min(columns, 4)}` : ''} gap-4`
    };
    return layouts[layout] || layouts.vertical;
  }, [layout, columns]);

  // Get spacing styles
  const getSpacingStyles = useCallback(() => {
    const spacings = {
      tight: 'space-y-2',
      normal: 'space-y-4',
      loose: 'space-y-6'
    };
    return spacings[spacing] || spacings.normal;
  }, [spacing]);

  // Handle field change
  const handleFieldChange = useCallback(async (fieldId, value, fieldConfig) => {
    const newData = { ...data, [fieldId]: value };
    onDataChange?.(newData);
    onFieldChange?.(fieldId, value, fieldConfig);
    
    // Update field state
    setFieldStates(prev => ({
      ...prev,
      [fieldId]: { ...prev[fieldId], value, touched: true }
    }));
    
    // Validate field if needed
    if (validateOnChange && fieldConfig?.validate) {
      const validation = await validateField(fieldId, value, fieldConfig, newData);
      onValidationChange?.(fieldId, validation);
    }
  }, [data, onDataChange, onFieldChange, validateOnChange, validateField, onValidationChange]);

  // Handle field focus
  const handleFieldFocus = useCallback((fieldId, fieldConfig) => {
    setFocusedField(fieldId);
    onFieldFocus?.(fieldId, fieldConfig);
  }, [onFieldFocus]);

  // Handle field blur
  const handleFieldBlur = useCallback(async (fieldId, value, fieldConfig) => {
    setFocusedField(null);
    onFieldBlur?.(fieldId, value, fieldConfig);
    
    // Validate field if needed
    if (validateOnBlur && fieldConfig?.validate) {
      const validation = await validateField(fieldId, value, fieldConfig, data);
      onValidationChange?.(fieldId, validation);
    }
  }, [onFieldBlur, validateOnBlur, validateField, data, onValidationChange]);

  // Validate all fields
  const validateAll = useCallback(async () => {
    const allFields = [...fields, ...groups.flatMap(group => group.fields || [])];
    const validation = await validateAllFields(allFields, data);
    onValidationChange?.(validation);
    return validation;
  }, [fields, groups, data, validateAllFields, onValidationChange]);

  // Check if step is complete
  const isStepComplete = useMemo(() => {
    const allFields = [...fields, ...groups.flatMap(group => group.fields || [])];
    const requiredFields = allFields.filter(field => field.required);
    
    return requiredFields.every(field => {
      const value = data[field.id];
      return value !== undefined && value !== null && value !== '';
    });
  }, [fields, groups, data]);


  // Get field help text
  const getFieldHelp = useCallback((field) => {
    if (field.help) return field.help;
    if (field.required) return 'This field is required';
    return null;
  }, []);

  // Render field
  const renderField = useCallback((field, _groupIndex = null) => {
    const fieldId = field.id;
    const value = data[fieldId] || '';
    const error = getFieldError(fieldId);
    const help = getFieldHelp(field);
    const isFocused = focusedField === fieldId;
    const isAdvanced = field.advanced && !showAdvanced;
    
    // Skip advanced fields if not showing advanced
    if (isAdvanced) return null;
    
    const fieldProps = {
      id: fieldId,
      name: fieldId,
      label: field.label,
      value: value,
      onChange: (e) => handleFieldChange(fieldId, e.target.value, field),
      onFocus: () => handleFieldFocus(fieldId, field),
      onBlur: (e) => handleFieldBlur(fieldId, e.target.value, field),
      error: error,
      help: help,
      required: field.required,
      disabled: field.disabled,
      placeholder: field.placeholder,
      type: field.type || 'text',
      options: field.options,
      icon: showFieldIcons ? field.icon : null,
      size: size,
      className: `${getSizeStyles().field} ${field.className || ''}`
    };

    return (
      <div key={fieldId} className="form-field">
        {field.type === 'custom' && field.render ? (
          field.render(fieldProps, { 
            data, 
            errors, 
            isFocused, 
            isAdvanced,
            onDataChange: (newData) => onDataChange?.({ ...data, ...newData })
          })
        ) : (
          <ValidatedInput {...fieldProps} />
        )}
        
        {/* Field help tooltip */}
        {showFieldHelp && help && (
          <Tooltip content={help} position="top">
            <Icon name="HelpCircle" className="w-4 h-4 text-gray-400 dark:text-slate-400 ml-2 inline" />
          </Tooltip>
        )}
      </div>
    );
  }, [
    data, 
    getFieldError, 
    getFieldHelp, 
    focusedField, 
    showAdvanced, 
    showFieldIcons, 
    size, 
    getSizeStyles, 
    handleFieldChange, 
    handleFieldFocus, 
    handleFieldBlur, 
    onDataChange
  ]);

  // Render field group
  const renderFieldGroup = useCallback((group, groupIndex) => {
    if (group.advanced && !showAdvanced) return null;
    
    return (
      <div key={group.id || groupIndex} className={`field-group ${getSizeStyles().group}`}>
        {group.title && (
          <h4 className="text-lg font-medium text-gray-900 dark:text-slate-200 mb-3">
            {group.title}
          </h4>
        )}
        
        {group.description && (
          <p className="text-gray-500 dark:text-slate-400 mb-4">
            {group.description}
          </p>
        )}
        
        <div className={getLayoutStyles()}>
          {group.fields?.map((field, _fieldIndex) => 
            renderField(field, groupIndex)
          )}
        </div>
      </div>
    );
  }, [showAdvanced, getSizeStyles, getLayoutStyles, renderField]);

  const sizeStyles = getSizeStyles();
  const spacingStyles = getSpacingStyles();

  return (
    <div className={`form-step ${sizeStyles.container} ${className}`}>
      {/* Step Header */}
      {showTitle && (
        <div className="mb-6">
          <h2 className={`${sizeStyles.title} font-semibold text-gray-900 dark:text-slate-100 mb-2`}>
            {title}
          </h2>
          {showDescription && description && (
            <p className={`${sizeStyles.description} text-gray-500 dark:text-slate-400`}>
              {description}
            </p>
          )}
        </div>
      )}

      {/* Progress Indicator */}
      {showProgress && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-slate-400">Step Progress</span>
            <div className="flex items-center space-x-2">
              {isStepComplete && (
                <Badge variant="success" size="sm">
                  <Icon name="CheckCircle" className="w-3 h-3 mr-1" />
                  Complete
                </Badge>
              )}
              {Object.keys(errors).length > 0 && (
                <Badge variant="error" size="sm">
                  <Icon name="AlertCircle" className="w-3 h-3 mr-1" />
                  {Object.keys(errors).length} Error{Object.keys(errors).length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isStepComplete ? 'bg-green-500' : 'bg-brand-500'
              }`}
              style={{ 
                width: `${isStepComplete ? 100 : 75}%` 
              }}
            />
          </div>
        </div>
      )}

      {/* Validation Summary */}
      {showValidationSummary && Object.keys(errors).length > 0 && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="AlertCircle" className="w-5 h-5 text-red-400" />
            <h4 className="text-red-400 font-medium">Validation Errors</h4>
          </div>
          <div className="space-y-1">
            {Object.entries(errors).map(([fieldId, error]) => {
              const field = [...fields, ...groups.flatMap(g => g.fields || [])]
                .find(f => f.id === fieldId);
              return (
                <div key={fieldId} className="text-sm text-red-300">
                  {field?.label || fieldId}: {error}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fields */}
      <div className={`fields-container ${spacingStyles}`}>
        {/* Individual Fields */}
        {fields.map((field, index) => renderField(field, index))}
        
        {/* Field Groups */}
        {groups.map((group, index) => renderFieldGroup(group, index))}
      </div>

      {/* Advanced Fields Toggle */}
      {fields.some(f => f.advanced) || groups.some(g => g.fields?.some(f => f.advanced)) && (
        <div className="mt-6 pt-4 border-t border-slate-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            icon={showAdvanced ? <Icon name="EyeOff" className="w-4 h-4" /> : <Icon name="Eye" className="w-4 h-4" />}
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Fields
          </Button>
        </div>
      )}

      {/* Step Actions */}
      <div className="mt-8 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          {allowSkip && (
            <Button
              variant="ghost"
              onClick={() => onStepSkip?.(stepId)}
              icon={<Icon name="ExternalLink" className="w-4 h-4" />}
            >
              Skip Step
            </Button>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={validateAll}
            icon={<Icon name="CheckCircle" className="w-4 h-4" />}
          >
            Validate All
          </Button>
          
          {isStepComplete && (
            <Button
              variant="primary"
              onClick={() => onStepComplete?.(stepId, data)}
              icon={<Icon name="CheckCircle" className="w-4 h-4" />}
            >
              Complete Step
            </Button>
          )}
        </div>
      </div>

      {/* Custom Children */}
      {children && (
        <div className="mt-6">
          {typeof children === 'function' 
            ? children({ 
                data, 
                errors, 
                isStepComplete, 
                validateAll,
                showAdvanced,
                setShowAdvanced
              })
            : children
          }
        </div>
      )}
    </div>
  );
};

export default FormStep;
