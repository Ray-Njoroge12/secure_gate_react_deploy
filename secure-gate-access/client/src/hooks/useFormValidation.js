// Custom hook for enhanced form validation with real-time feedback
import { useState, useCallback, useRef } from 'react';
import logger from 'utils/logger';

import { VALIDATION_TIMING } from '../constants/validation';
import { debounce } from '../utils/validationRules';

export const useFormValidation = (initialValues = {}, options = {}) => {
  const {
    validateOnChange = VALIDATION_TIMING.VALIDATE_ON_CHANGE,
    validateOnBlur = VALIDATION_TIMING.VALIDATE_ON_BLUR,
    validateOnSubmit = VALIDATION_TIMING.VALIDATE_ON_SUBMIT,
    debounceDelay = VALIDATION_TIMING.DEBOUNCE_DELAY
  } = options;

  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState({});
  const [touched, setTouched] = useState({});
  const [isValidating, setIsValidating] = useState({});
  const [validationState, setValidationState] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Store validation functions for each field
  const validatorsRef = useRef({});
  const debouncedValidatorsRef = useRef({});

  // Register a validator for a field
  const registerField = useCallback((fieldName, validator, fieldOptions = {}) => {
    validatorsRef.current[fieldName] = validator;
    
    // Create debounced validator
    debouncedValidatorsRef.current[fieldName] = debounce(async (value) => {
      if (!validator) return;

      setIsValidating(prev => ({ ...prev, [fieldName]: true }));
      
      try {
        const result = await validator(value, fieldName);
        
        setErrors(prev => ({
          ...prev,
          [fieldName]: result.errors || []
        }));
        
        setWarnings(prev => ({
          ...prev,
          [fieldName]: result.warnings || []
        }));
        
        setValidationState(prev => ({
          ...prev,
          [fieldName]: result.state || 'idle'
        }));
      } catch (err) {
        logger.error(`Validation error for field ${fieldName}:`, err);
        setErrors(prev => ({
          ...prev,
          [fieldName]: ['Validation failed. Please try again.']
        }));
        setValidationState(prev => ({
          ...prev,
          [fieldName]: 'invalid'
        }));
      } finally {
        setIsValidating(prev => ({ ...prev, [fieldName]: false }));
      }
    }, fieldOptions.debounceDelay || debounceDelay);
  }, [debounceDelay]);

  // Validate a single field
  const validateField = useCallback(async (fieldName, value = values[fieldName]) => {
    const validator = validatorsRef.current[fieldName];
    if (!validator) return { isValid: true, errors: [], warnings: [] };

    setIsValidating(prev => ({ ...prev, [fieldName]: true }));
    
    try {
      const result = await validator(value, fieldName);
      
      setErrors(prev => ({
        ...prev,
        [fieldName]: result.errors || []
      }));
      
      setWarnings(prev => ({
        ...prev,
        [fieldName]: result.warnings || []
      }));
      
      setValidationState(prev => ({
        ...prev,
        [fieldName]: result.state || 'idle'
      }));

      return result;
    } catch (err) {
      logger.error(`Validation error for field ${fieldName}:`, err);
      const errorResult = {
        isValid: false,
        errors: ['Validation failed. Please try again.'],
        warnings: []
      };
      
      setErrors(prev => ({
        ...prev,
        [fieldName]: errorResult.errors
      }));
      
      setValidationState(prev => ({
        ...prev,
        [fieldName]: 'invalid'
      }));

      return errorResult;
    } finally {
      setIsValidating(prev => ({ ...prev, [fieldName]: false }));
    }
  }, [values]);

  // Validate all fields
  const validateAll = useCallback(async () => {
    const fieldNames = Object.keys(validatorsRef.current);
    const validationPromises = fieldNames.map(fieldName => validateField(fieldName));
    
    const results = await Promise.all(validationPromises);
    
    const allValid = results.every(result => result.isValid);
    const allErrors = results.reduce((acc, result, index) => {
      if (result.errors && result.errors.length > 0) {
        acc[fieldNames[index]] = result.errors;
      }
      return acc;
    }, {});

    return {
      isValid: allValid,
      errors: allErrors
    };
  }, [validateField]);

  // Handle field change
  const handleFieldChange = useCallback((fieldName, value) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    
    // Validate on change if enabled
    if (validateOnChange && debouncedValidatorsRef.current[fieldName]) {
      debouncedValidatorsRef.current[fieldName](value);
    }
  }, [validateOnChange]);

  // Handle field blur
  const handleFieldBlur = useCallback((fieldName, value = values[fieldName]) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    // Validate on blur if enabled
    if (validateOnBlur && debouncedValidatorsRef.current[fieldName]) {
      debouncedValidatorsRef.current[fieldName](value);
    }
  }, [validateOnBlur, values]);

  // Handle field focus
  const handleFieldFocus = useCallback((fieldName) => {
    // Mark as touched when focused
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (submitFn) => {
    setSubmitAttempted(true);
    setIsSubmitting(true);

    try {
      // Validate all fields if enabled
      if (validateOnSubmit) {
        const validationResult = await validateAll();
        if (!validationResult.isValid) {
          setErrors(validationResult.errors);
          return { success: false, errors: validationResult.errors };
        }
      }

      // Submit the form
      const result = await submitFn(values);
      return { success: true, data: result };
    } catch (error) {
      logger.error('Form submission error:', error);
      return { success: false, error: error.message || 'Submission failed' };
    } finally {
      setIsSubmitting(false);
    }
  }, [validateOnSubmit, validateAll, values]);

  // Reset form
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setWarnings({});
    setTouched({});
    setIsValidating({});
    setValidationState({});
    setSubmitAttempted(false);
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
  }, []);

  // Get field validation state
  const getFieldState = useCallback((fieldName) => {
    const fieldErrors = errors[fieldName] || [];
    const fieldWarnings = warnings[fieldName] || [];
    const isFieldValidating = isValidating[fieldName] || false;
    const fieldValidationState = validationState[fieldName] || 'idle';
    const isFieldTouched = touched[fieldName] || false;

    return {
      hasErrors: fieldErrors.length > 0,
      hasWarnings: fieldWarnings.length > 0,
      isValid: fieldErrors.length === 0 && !isFieldValidating,
      isTouched: isFieldTouched,
      isValidating: isFieldValidating,
      state: fieldValidationState,
      errors: fieldErrors,
      warnings: fieldWarnings
    };
  }, [errors, warnings, isValidating, validationState, touched]);

  // Check if form has any errors
  const hasErrors = useCallback(() => {
    return Object.values(errors).some(fieldErrors => fieldErrors.length > 0);
  }, [errors]);

  // Check if form has any warnings
  const hasWarnings = useCallback(() => {
    return Object.values(warnings).some(fieldWarnings => fieldWarnings.length > 0);
  }, [warnings]);

  // Check if form is valid
  const isValid = useCallback(() => {
    return !hasErrors() && !Object.values(isValidating).some(validating => validating);
  }, [hasErrors, isValidating]);

  // Check if form is dirty (has been modified)
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
      validatingFields: fieldStates.filter(field => field.isValidating).length,
      fields: fieldStates
    };
  }, [getFieldState]);

  return {
    // State
    values,
    errors,
    warnings,
    touched,
    isValidating,
    validationState,
    isSubmitting,
    submitAttempted,

    // Actions
    registerField,
    validateField,
    validateAll,
    handleFieldChange,
    handleFieldBlur,
    handleFieldFocus,
    handleSubmit,
    resetForm,
    clearFieldError,
    clearAllErrors,

    // Helpers
    getFieldState,
    hasErrors,
    hasWarnings,
    isValid,
    isDirty,
    getValidationSummary
  };
};

export default useFormValidation;
