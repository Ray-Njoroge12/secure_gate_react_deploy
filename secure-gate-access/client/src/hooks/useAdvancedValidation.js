/**
 * Advanced Form Validation Hook
 * 
 * Enhanced validation system with:
 * - Async validation support
 * - Real-time feedback with visual indicators
 * - Validation caching and optimization
 * - Cross-field validation
 * - Validation rules engine
 * - Accessibility compliance
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import logger from 'utils/logger';

import { VALIDATION_MESSAGES } from '../constants/validation';
import { debounce } from '../utils/validationRules';

// Validation result types
export const VALIDATION_STATES = {
  IDLE: 'idle',
  VALIDATING: 'validating',
  VALID: 'valid',
  INVALID: 'invalid',
  WARNING: 'warning',
  SUCCESS: 'success'
};

// Validation rule types
export const RULE_TYPES = {
  REQUIRED: 'required',
  EMAIL: 'email',
  PHONE: 'phone',
  MIN_LENGTH: 'minLength',
  MAX_LENGTH: 'maxLength',
  PATTERN: 'pattern',
  CUSTOM: 'custom',
  ASYNC: 'async',
  CROSS_FIELD: 'crossField'
};

export const useAdvancedValidation = (initialValues = {}, options = {}) => {
  const {
    validateOnChange = true,
    validateOnBlur = true,
    validateOnSubmit = true,
    debounceDelay = 300,
    enableCaching = true,
    enableCrossFieldValidation = true,
    validationMode = 'aggressive' // 'aggressive', 'conservative', 'lazy'
  } = options;

  // State management
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});
  const [successes, setSuccesses] = useState({});
  const [touched, setTouched] = useState({});
  const [isValidating, setIsValidating] = useState({});
  const [validationState, setValidationState] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [validationCache, setValidationCache] = useState({});

  // Refs for validation functions and timers
  const validatorsRef = useRef({});
  const debouncedValidatorsRef = useRef({});
  const validationTimersRef = useRef({});
  const crossFieldValidatorsRef = useRef({});

  // Validation rules registry
  const [validationRules, setValidationRules] = useState({});

  // Register validation rules
  const registerRules = useCallback((fieldName, rules) => {
    setValidationRules(prev => ({
      ...prev,
      [fieldName]: rules
    }));
  }, []);

  // Create validation rule
  const createRule = useCallback((type, options = {}) => {
    const rule = {
      type,
      ...options,
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Add default messages
    if (!rule.message) {
      switch (type) {
        case RULE_TYPES.REQUIRED:
          rule.message = VALIDATION_MESSAGES.REQUIRED;
          break;
        case RULE_TYPES.EMAIL:
          rule.message = VALIDATION_MESSAGES.EMAIL_INVALID;
          break;
        case RULE_TYPES.PHONE:
          rule.message = VALIDATION_MESSAGES.PHONE_INVALID;
          break;
        case RULE_TYPES.MIN_LENGTH:
          rule.message = VALIDATION_MESSAGES.MIN_LENGTH.replace('{min}', options.min);
          break;
        case RULE_TYPES.MAX_LENGTH:
          rule.message = VALIDATION_MESSAGES.MAX_LENGTH.replace('{max}', options.max);
          break;
        default:
          rule.message = 'Invalid value';
      }
    }

    return rule;
  }, []);

  // Built-in validation rules
  const builtInRules = useMemo(() => ({
    required: (value, options = {}) => {
      if (!value || (typeof value === 'string' && !value.trim())) {
        return { isValid: false, message: options.message || VALIDATION_MESSAGES.REQUIRED };
      }
      return { isValid: true };
    },

    email: (value, options = {}) => {
      if (!value) return { isValid: true }; // Let required rule handle empty values
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return { isValid: false, message: options.message || VALIDATION_MESSAGES.EMAIL_INVALID };
      }
      return { isValid: true };
    },

    phone: (value, options = {}) => {
      if (!value) return { isValid: true };
      const phoneRegex = /^0\d{9}$/;
      if (!phoneRegex.test(value)) {
        return { isValid: false, message: options.message || VALIDATION_MESSAGES.PHONE_INVALID };
      }
      return { isValid: true };
    },

    minLength: (value, options = {}) => {
      if (!value) return { isValid: true };
      if (value.length < options.min) {
        return { 
          isValid: false, 
          message: options.message || VALIDATION_MESSAGES.MIN_LENGTH.replace('{min}', options.min) 
        };
      }
      return { isValid: true };
    },

    maxLength: (value, options = {}) => {
      if (!value) return { isValid: true };
      if (value.length > options.max) {
        return { 
          isValid: false, 
          message: options.message || VALIDATION_MESSAGES.MAX_LENGTH.replace('{max}', options.max) 
        };
      }
      return { isValid: true };
    },

    pattern: (value, options = {}) => {
      if (!value) return { isValid: true };
      if (!options.pattern.test(value)) {
        return { isValid: false, message: options.message || 'Invalid format' };
      }
      return { isValid: true };
    }
  }), []);

  // Execute validation rule
  const executeRule = useCallback(async (rule, value, fieldName, allValues = values) => {
    try {
      if (rule.type === RULE_TYPES.CUSTOM && rule.validate) {
        return await rule.validate(value, fieldName, allValues);
      }
      
      if (rule.type === RULE_TYPES.ASYNC && rule.validate) {
        return await rule.validate(value, fieldName, allValues);
      }
      
      if (rule.type === RULE_TYPES.CROSS_FIELD && rule.validate) {
        return await rule.validate(value, fieldName, allValues);
      }
      
      if (builtInRules[rule.type]) {
        return builtInRules[rule.type](value, rule);
      }
      
      return { isValid: true };
    } catch (error) {
      logger.error(`Validation rule error for ${fieldName}:`, error);
      return { 
        isValid: false, 
        message: rule.message || 'Validation failed' 
      };
    }
  }, [builtInRules, values]);

  // Validate single field
  const validateField = useCallback(async (fieldName, value = values[fieldName], options = {}) => {
    const allValues = options.allValues || values;
    const rules = validationRules[fieldName] || validatorsRef.current[fieldName] || [];
    if (rules.length === 0) return { isValid: true, errors: [], warnings: [], successes: [] };

    // Check cache if enabled
    const cacheKey = `${fieldName}_${value}_${JSON.stringify(allValues)}`;
    if (enableCaching && validationCache[cacheKey]) {
      return validationCache[cacheKey];
    }

    setIsValidating(prev => ({ ...prev, [fieldName]: true }));
    setValidationState(prev => ({ ...prev, [fieldName]: VALIDATION_STATES.VALIDATING }));

    const errors = [];
    const warnings = [];
    const successes = [];

    try {
      // Execute all rules
      for (const rule of rules) {
        const result = await executeRule(rule, value, fieldName, allValues);
        
        if (result && !result.isValid) {
          if (rule.severity === 'warning') {
            warnings.push(result.message);
          } else {
            errors.push(result.message);
          }
        } else if (result && result.isValid && rule.showSuccess) {
          successes.push(result.message || 'Valid');
        }
      }

      const isValid = errors.length === 0;
      const hasWarnings = warnings.length > 0;
      const hasSuccesses = successes.length > 0;

      // Update validation state
      let state = VALIDATION_STATES.IDLE;
      if (isValid && hasSuccesses) {
        state = VALIDATION_STATES.SUCCESS;
      } else if (isValid && hasWarnings) {
        state = VALIDATION_STATES.WARNING;
      } else if (isValid) {
        state = VALIDATION_STATES.VALID;
      } else {
        state = VALIDATION_STATES.INVALID;
      }

      setValidationState(prev => ({ ...prev, [fieldName]: state }));

      // Update field-specific state
      setErrors(prev => ({
        ...prev,
        [fieldName]: errors.length > 0 ? errors : undefined
      }));

      setWarnings(prev => ({
        ...prev,
        [fieldName]: warnings.length > 0 ? warnings : undefined
      }));

      setSuccesses(prev => ({
        ...prev,
        [fieldName]: successes.length > 0 ? successes : undefined
      }));

      const result = {
        isValid,
        errors,
        warnings,
        successes,
        state,
        fieldName,
        value
      };

      // Cache result if enabled
      if (enableCaching) {
        setValidationCache(prev => ({
          ...prev,
          [cacheKey]: result
        }));
      }

      return result;
    } catch (error) {
      logger.error(`Validation error for field ${fieldName}:`, error);
      const errorResult = {
        isValid: false,
        errors: ['Validation failed. Please try again.'],
        warnings: [],
        successes: [],
        state: VALIDATION_STATES.INVALID,
        fieldName,
        value
      };

      setValidationState(prev => ({ ...prev, [fieldName]: VALIDATION_STATES.INVALID }));
      setErrors(prev => ({ ...prev, [fieldName]: errorResult.errors }));

      return errorResult;
    } finally {
      setIsValidating(prev => ({ ...prev, [fieldName]: false }));
    }
  }, [validationRules, values, executeRule, enableCaching, validationCache]);

  // Cross-field validation
  const validateCrossFields = useCallback(async (fieldName, value, allValues = values) => {
    if (!enableCrossFieldValidation) return;

    const currentValues = allValues || values;

    const crossFieldRules = Object.values(crossFieldValidatorsRef.current)
      .filter(rule => rule.dependsOn.includes(fieldName));

    for (const rule of crossFieldRules) {
      const dependentField = rule.field;
      const dependentValue = currentValues[dependentField];
      
      if (dependentValue !== undefined) {
        await validateField(dependentField, dependentValue, { allValues: currentValues });
      }
    }
  }, [enableCrossFieldValidation, values, validateField]);

  // Debounced validation
  const debouncedValidate = useCallback((fieldName, value) => {
    if (validationTimersRef.current[fieldName]) {
      clearTimeout(validationTimersRef.current[fieldName]);
    }

    validationTimersRef.current[fieldName] = setTimeout(() => {
      validateField(fieldName, value);
    }, debounceDelay);
  }, [validateField, debounceDelay]);

  // Register field validator
  const registerField = useCallback((fieldName, rules, options = {}) => {
    validatorsRef.current[fieldName] = rules;
    
    // Create debounced validator
    debouncedValidatorsRef.current[fieldName] = debounce(
      (value) => validateField(fieldName, value),
      options.debounceDelay || debounceDelay
    );

    // Register cross-field validators
    if (options.crossField) {
      crossFieldValidatorsRef.current[fieldName] = {
        field: fieldName,
        dependsOn: options.dependsOn || [],
        validate: options.crossFieldValidate
      };
    }
  }, [validateField, debounceDelay]);

  // Handle field change
  const handleFieldChange = useCallback((fieldName, value) => {
    const nextValues = { ...values, [fieldName]: value };
    setValues(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear cache for this field
    if (enableCaching) {
      setValidationCache(prev => {
        const newCache = { ...prev };
        Object.keys(newCache).forEach(key => {
          if (key.startsWith(`${fieldName}_`)) {
            delete newCache[key];
          }
        });
        return newCache;
      });
    }

    // Validate based on mode
    if (validationMode === 'aggressive' && validateOnChange) {
      debouncedValidate(fieldName, value);
    } else if (validationMode === 'conservative' && validateOnChange && touched[fieldName]) {
      debouncedValidate(fieldName, value);
    }

    // Trigger cross-field validation
    validateCrossFields(fieldName, value, nextValues);
  }, [validateOnChange, validationMode, touched, debouncedValidate, validateCrossFields, enableCaching, values]);

  // Handle field blur
  const handleFieldBlur = useCallback((fieldName, value = values[fieldName]) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    if (validateOnBlur) {
      validateField(fieldName, value);
    }
  }, [validateOnBlur, validateField, values]);

  // Handle field focus
  const handleFieldFocus = useCallback((fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  }, []);

  // Validate all fields
  const validateAll = useCallback(async () => {
    const fieldNames = Object.keys(validatorsRef.current);
    const validationPromises = fieldNames.map(fieldName => validateField(fieldName));
    
    const results = await Promise.all(validationPromises);
    
    const allValid = results.every(result => result.isValid);
    const allErrors = results.reduce((acc, result) => {
      if (result.errors && result.errors.length > 0) {
        acc[result.fieldName] = result.errors;
      }
      return acc;
    }, {});

    const allWarnings = results.reduce((acc, result) => {
      if (result.warnings && result.warnings.length > 0) {
        acc[result.fieldName] = result.warnings;
      }
      return acc;
    }, {});

    const allSuccesses = results.reduce((acc, result) => {
      if (result.successes && result.successes.length > 0) {
        acc[result.fieldName] = result.successes;
      }
      return acc;
    }, {});

    return {
      isValid: allValid,
      errors: allErrors,
      warnings: allWarnings,
      successes: allSuccesses,
      results
    };
  }, [validateField]);

  // Handle form submission
  const handleSubmit = useCallback(async (submitFn) => {
    setSubmitAttempted(true);
    setIsSubmitting(true);

    try {
      if (validateOnSubmit) {
        const validationResult = await validateAll();
        if (!validationResult.isValid) {
          return { success: false, errors: validationResult.errors, warnings: validationResult.warnings };
        }
      }

      const result = await submitFn(values);
      return { success: true, data: result };
    } catch (error) {
      logger.error('Form submission error:', error);
      return { success: false, error: error.message || 'Submission failed' };
    } finally {
      setIsSubmitting(false);
    }
  }, [validateOnSubmit, validateAll, values]);

  // Get field validation state
  const getFieldState = useCallback((fieldName) => {
    const fieldErrors = errors[fieldName] || [];
    const fieldWarnings = warnings[fieldName] || [];
    const fieldSuccesses = successes[fieldName] || [];
    const isFieldValidating = isValidating[fieldName] || false;
    const fieldValidationState = validationState[fieldName] || VALIDATION_STATES.IDLE;
    const isFieldTouched = touched[fieldName] || false;

    return {
      hasErrors: fieldErrors.length > 0,
      hasWarnings: fieldWarnings.length > 0,
      hasSuccesses: fieldSuccesses.length > 0,
      isValid: fieldErrors.length === 0 && !isFieldValidating,
      isTouched: isFieldTouched,
      isValidating: isFieldValidating,
      state: fieldValidationState,
      errors: fieldErrors,
      warnings: fieldWarnings,
      successes: fieldSuccesses
    };
  }, [errors, warnings, successes, isValidating, validationState, touched]);

  // Clear validation cache
  const clearValidationCache = useCallback(() => {
    setValidationCache({});
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setWarnings({});
    setSuccesses({});
    setTouched({});
    setIsValidating({});
    setValidationState({});
    setSubmitAttempted(false);
    setValidationCache({});
  }, [initialValues]);

  // Clear field errors
  const clearFieldError = useCallback((fieldName) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  // Clear all errors
  const clearAllErrors = useCallback(() => {
    setErrors({});
    setWarnings({});
    setSuccesses({});
  }, []);

  // Check if form has any errors
  const hasErrors = useCallback(() => {
    return Object.values(errors).some(fieldErrors => fieldErrors && fieldErrors.length > 0);
  }, [errors]);

  // Check if form has any warnings
  const hasWarnings = useCallback(() => {
    return Object.values(warnings).some(fieldWarnings => fieldWarnings && fieldWarnings.length > 0);
  }, [warnings]);

  // Check if form has any successes
  const hasSuccesses = useCallback(() => {
    return Object.values(successes).some(fieldSuccesses => fieldSuccesses && fieldSuccesses.length > 0);
  }, [successes]);

  // Check if form is valid
  const isValid = useCallback(() => {
    return !hasErrors() && !Object.values(isValidating).some(validating => validating);
  }, [hasErrors, isValidating]);

  // Check if form is dirty
  const isDirty = useCallback(() => {
    return Object.keys(touched).length > 0;
  }, [touched]);

  // Get validation summary
  const getValidationSummary = useCallback(() => {
    const fieldStates = Object.keys(validatorsRef.current).map(fieldName => ({
      field: fieldName,
      ...getFieldState(fieldName)
    }));

    return {
      totalFields: fieldStates.length,
      validFields: fieldStates.filter(field => field.isValid).length,
      invalidFields: fieldStates.filter(field => field.hasErrors).length,
      warningFields: fieldStates.filter(field => field.hasWarnings).length,
      successFields: fieldStates.filter(field => field.hasSuccesses).length,
      validatingFields: fieldStates.filter(field => field.isValidating).length,
      touchedFields: fieldStates.filter(field => field.isTouched).length,
      isValid: !hasErrors() && !Object.values(isValidating).some(validating => validating),
      hasErrors: hasErrors(),
      hasWarnings: hasWarnings(),
      hasSuccesses: hasSuccesses(),
      isValidating: Object.values(isValidating).some(validating => validating),
      isDirty: isDirty(),
      fields: fieldStates
    };
  }, [getFieldState, hasErrors, hasWarnings, hasSuccesses, isValidating, isDirty]);

  return {
    // State
    values,
    errors,
    warnings,
    successes,
    touched,
    isValidating,
    validationState,
    isSubmitting,
    submitAttempted,
    validationCache,
    validationRules,
    validatorsRef,

    // Actions
    registerField,
    registerRules,
    createRule,
    validateField,
    validateAll,
    handleFieldChange,
    handleFieldBlur,
    handleFieldFocus,
    handleSubmit,
    resetForm,
    clearFieldError,
    clearAllErrors,
    clearValidationCache,

    // Helpers
    getFieldState,
    hasErrors,
    hasWarnings,
    hasSuccesses,
    isValid,
    isDirty,
    getValidationSummary,

    // Constants
    VALIDATION_STATES,
    RULE_TYPES
  };
};

export default useAdvancedValidation;




