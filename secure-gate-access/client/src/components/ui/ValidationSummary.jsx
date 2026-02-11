/**
 * Validation Summary Component
 * 
 * Displays comprehensive validation status for forms:
 * - Error and warning summaries
 * - Field-by-field validation status
 * - Progress indicators
 * - Accessibility compliance
 * - Mobile-responsive design
 */

import React, { useState, useCallback, useMemo } from 'react';
import Icon from './Icon';
import { Button, Card, Badge, Progress } from './index';
import { componentTokens } from '../../design-system';

const ValidationSummary = ({
  // Validation data
  validationState = {},
  errors = {},
  warnings = {},
  successes = {},
  isValidating = {},
  touched = {},
  
  // Display options
  showProgress = true,
  showFieldDetails = true,
  showSummary = true,
  showRefreshButton = false,
  collapsible = true,
  defaultExpanded = false,
  
  // Styling
  variant = 'default', // default, compact, detailed
  size = 'md', // sm, md, lg
  className = '',
  
  // Event handlers
  onRefresh,
  onFieldClick,
  onDismiss,
  
  // Accessibility
  ariaLabel = 'Validation summary',
  
  // Other props
  ...props
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [dismissedFields, setDismissedFields] = useState(new Set());

  // Calculate validation statistics
  const validationStats = useMemo(() => {
    const fields = Object.keys(validationState);
    const totalFields = fields.length;
    const validFields = fields.filter(field => 
      !errors[field]?.length && 
      !warnings[field]?.length && 
      !isValidating[field]
    ).length;
    const errorFields = fields.filter(field => errors[field]?.length > 0).length;
    const warningFields = fields.filter(field => warnings[field]?.length > 0).length;
    const successFields = fields.filter(field => successes[field]?.length > 0).length;
    const validatingFields = fields.filter(field => isValidating[field]).length;
    const touchedFields = fields.filter(field => touched[field]).length;

    return {
      totalFields,
      validFields,
      errorFields,
      warningFields,
      successFields,
      validatingFields,
      touchedFields,
      progress: totalFields > 0 ? Math.round((validFields / totalFields) * 100) : 0
    };
  }, [validationState, errors, warnings, successes, isValidating, touched]);

  // Get field validation status
  const getFieldStatus = useCallback((fieldName) => {
    const hasErrors = errors[fieldName]?.length > 0;
    const hasWarnings = warnings[fieldName]?.length > 0;
    const hasSuccesses = successes[fieldName]?.length > 0;
    const isValidatingField = isValidating[fieldName];
    const isTouchedField = touched[fieldName];

    return {
      hasErrors,
      hasWarnings,
      hasSuccesses,
      isValidating: isValidatingField,
      isTouched: isTouchedField,
      isValid: !hasErrors && !hasWarnings && !isValidatingField,
      state: hasErrors ? 'error' : 
             hasWarnings ? 'warning' : 
             hasSuccesses ? 'success' : 
             isValidatingField ? 'validating' : 'idle'
    };
  }, [errors, warnings, successes, isValidating, touched]);

  // Handle field click
  const handleFieldClick = useCallback((fieldName) => {
    if (onFieldClick) {
      onFieldClick(fieldName);
    }
  }, [onFieldClick]);

  // Handle field dismiss
  const handleFieldDismiss = useCallback((fieldName) => {
    setDismissedFields(prev => new Set([...prev, fieldName]));
    if (onDismiss) {
      onDismiss(fieldName);
    }
  }, [onDismiss]);

  // Handle refresh
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    }
  }, [onRefresh]);

  // Get size-specific styles
  const getSizeStyles = useCallback(() => {
    const sizes = {
      sm: {
        container: 'p-3',
        text: 'text-xs',
        title: 'text-sm',
        icon: 'w-4 h-4',
        spacing: 'space-y-2'
      },
      md: {
        container: 'p-4',
        text: 'text-sm',
        title: 'text-base',
        icon: 'w-5 h-5',
        spacing: 'space-y-3'
      },
      lg: {
        container: 'p-6',
        text: 'text-base',
        title: 'text-lg',
        icon: 'w-6 h-6',
        spacing: 'space-y-4'
      }
    };
    return sizes[size] || sizes.md;
  }, [size]);

  // Get variant-specific styles
  const getVariantStyles = useCallback(() => {
    const variants = {
      default: {
        container: 'bg-slate-800 border border-slate-700',
        header: 'bg-slate-700',
        field: 'bg-slate-800 hover:bg-slate-700'
      },
      compact: {
        container: 'bg-slate-900 border border-slate-600',
        header: 'bg-slate-800',
        field: 'bg-slate-900 hover:bg-slate-800'
      },
      detailed: {
        container: 'bg-slate-800 border border-slate-600 shadow-lg',
        header: 'bg-slate-700',
        field: 'bg-slate-800 hover:bg-slate-700'
      }
    };
    return variants[variant] || variants.default;
  }, [variant]);

  const sizeStyles = getSizeStyles();
  const variantStyles = getVariantStyles();

  // Don't render if no validation data
  if (validationStats.totalFields === 0) {
    return null;
  }

  // Render status icon
  const renderStatusIcon = (status) => {
    switch (status) {
      case 'error':
        return <Icon name="AlertCircle" className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <Icon name="AlertTriangle" className="w-5 h-5 text-yellow-500" />;
      case 'success':
        return <Icon name="CheckCircle" className="w-5 h-5 text-green-500" />;
      case 'validating':
        return <Icon name="RefreshCw" className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Icon name="Info" className="w-5 h-5 text-gray-400 dark:text-slate-400" />;
    }
  };

  return (
    <Card 
      variant={variant === 'minimal' ? 'flat' : 'default'}
      className={`validation-summary ${className}`}
      {...props}
    >
      <div 
        className="flex items-center justify-between p-4 cursor-pointer" 
        onClick={() => collapsible && setIsExpanded(!isExpanded)}
        role={collapsible ? "button" : undefined}
        tabIndex={collapsible ? 0 : undefined}
        onKeyDown={(e) => {
          if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        aria-expanded={collapsible ? isExpanded : undefined}
      >
        <div className="flex items-center space-x-3">
          {renderStatusIcon(
            validationStats.errorFields > 0 ? 'error' : 
            validationStats.warningFields > 0 ? 'warning' : 
            validationStats.validatingFields > 0 ? 'validating' : 
            'success'
          )}
          
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-slate-100">
              {validationStats.errorFields > 0 ? `${validationStats.errorFields} errors found` :
               validationStats.warningFields > 0 ? 'Validation warnings' :
               'Validation passed'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              {validationStats.progress}% complete
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {showRefreshButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onRefresh?.();
              }}
              aria-label="Refresh validation"
            >
              <Icon name="RefreshCw" className="w-4 h-4" />
            </Button>
          )}
          
          {collapsible && (
            <Icon 
              name={isExpanded ? "ChevronUp" : "ChevronDown"} 
              className="w-4 h-4 text-gray-400 dark:text-slate-400"
            />
          )}

           {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss?.();
              }}
              aria-label="Dismiss summary"
            >
              <Icon name="X" className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {(!collapsible || isExpanded) && (
        <div className={`${sizeStyles.container} ${sizeStyles.spacing}`}>
          {/* Summary Statistics */}
          {showSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center">
                <div className={`${sizeStyles.title} font-semibold text-slate-200`}>
                  {validationStats.totalFields}
                </div>
                <div className={`${sizeStyles.text} text-slate-400`}>Total Fields</div>
              </div>
              
              <div className="text-center">
                <div className={`${sizeStyles.title} font-semibold text-green-400`}>
                  {validationStats.validFields}
                </div>
                <div className={`${sizeStyles.text} text-slate-400`}>Valid</div>
              </div>
              
              <div className="text-center">
                <div className={`${sizeStyles.title} font-semibold text-red-400`}>
                  {validationStats.errorFields}
                </div>
                <div className={`${sizeStyles.text} text-slate-400`}>Errors</div>
              </div>
              
              <div className="text-center">
                <div className={`${sizeStyles.title} font-semibold text-yellow-400`}>
                  {validationStats.warningFields}
                </div>
                <div className={`${sizeStyles.text} text-slate-400`}>Warnings</div>
              </div>
            </div>
          )}

          {/* Field Details */}
          {showFieldDetails && (
            <div className="space-y-2">
              <h4 className={`${sizeStyles.title} font-medium text-slate-200 mb-3`}>
                Field Validation Status
              </h4>
              
              {Object.keys(validationState).map(fieldName => {
                const fieldStatus = getFieldStatus(fieldName);
                const isDismissed = dismissedFields.has(fieldName);
                
                if (isDismissed) return null;

                return (
                  <div role="button" tabIndex={0}
                    key={fieldName}
                    className={`${variantStyles.field} p-3 rounded-lg transition-colors ${
                      onFieldClick ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => handleFieldClick(fieldName)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {/* Status Icon */}
                        <div className="flex-shrink-0">
                          {fieldStatus.isValidating && (
                            <Icon name="RefreshCw" className={`${sizeStyles.icon} animate-spin text-blue-400`} />
                          )}
                          {!fieldStatus.isValidating && fieldStatus.hasErrors && (
                            <Icon name="AlertCircle" className={`${sizeStyles.icon} text-red-400`} />
                          )}
                          {!fieldStatus.isValidating && fieldStatus.hasWarnings && (
                            <Icon name="AlertTriangle" className={`${sizeStyles.icon} text-yellow-400`} />
                          )}
                          {!fieldStatus.isValidating && fieldStatus.hasSuccesses && (
                            <Icon name="CheckCircle" className={`${sizeStyles.icon} text-green-400`} />
                          )}
                          {!fieldStatus.isValidating && fieldStatus.isValid && (
                            <Icon name="CheckCircle" className={`${sizeStyles.icon} text-green-400`} />
                          )}
                        </div>

                        {/* Field Name */}
                        <div className="flex-1">
                          <div className={`${sizeStyles.text} font-medium text-slate-200`}>
                            {fieldName}
                          </div>
                          
                          {/* Field Messages */}
                          <div className="space-y-1">
                            {errors[fieldName]?.map((error, index) => (
                              <div key={index} className={`${sizeStyles.text} text-red-400`}>
                                {error}
                              </div>
                            ))}
                            
                            {warnings[fieldName]?.map((warning, index) => (
                              <div key={index} className={`${sizeStyles.text} text-yellow-400`}>
                                {warning}
                              </div>
                            ))}
                            
                            {successes[fieldName]?.map((success, index) => (
                              <div key={index} className={`${sizeStyles.text} text-green-400`}>
                                {success}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Dismiss Button */}
                      {onDismiss && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFieldDismiss(fieldName);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900 rounded"
                          aria-label={`Dismiss ${fieldName} validation`}
                        >
                          <Icon name="X" className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default ValidationSummary;




