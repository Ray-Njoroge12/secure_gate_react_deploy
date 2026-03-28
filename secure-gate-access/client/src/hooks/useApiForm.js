import { useState, useCallback } from 'react';

import { handleApiError, mapSuccessMessage } from '../utils/errorMapper.js';

/**
 * Custom hook for managing API form submissions with consistent error handling and loading states
 * @param {Object} config - Configuration object
 * @param {Function} config.submitFn - The API function to call on form submission
 * @param {Object} config.initialFormData - Initial form data object
 * @param {Function} config.validateFn - Optional validation function that returns error message or null
 * @param {Function} config.onSuccess - Optional callback for successful submission
 * @param {Function} config.onError - Optional callback for failed submission
 * @param {string} config.successAction - Action key for success message mapping
 * @returns {Object} Form state and handlers
 */
export const useApiForm = ({
  submitFn,
  initialFormData = {},
  validateFn = null,
  onSuccess = null,
  onError = null,
  successAction = null
}) => {
  const [formData, setFormData] = useState(initialFormData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Update form field
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear field-specific validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  }, [validationErrors]);

  // Update multiple fields at once
  const updateFields = useCallback((updates) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }));

    // Clear validation errors for updated fields
    const updatedFields = Object.keys(updates);
    setValidationErrors(prev => {
      const newErrors = { ...prev };
      updatedFields.forEach(field => {
        if (newErrors[field]) {
          newErrors[field] = null;
        }
      });
      return newErrors;
    });
  }, []);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setError('');
    setSuccess(null);
    setValidationErrors({});
  }, [initialFormData]);

  // Clear error state
  const clearError = useCallback(() => {
    setError('');
    setValidationErrors({});
  }, []);

  // Clear success state
  const clearSuccess = useCallback(() => {
    setSuccess(null);
  }, []);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();

    // Clear previous states
    setError('');
    setSuccess(null);
    setValidationErrors({});

    // Run validation if provided
    if (validateFn) {
      const validationError = validateFn(formData);
      if (validationError) {
        if (typeof validationError === 'string') {
          setError(validationError);
        } else if (typeof validationError === 'object') {
          setValidationErrors(validationError);
          setError('Please fix the validation errors below.');
        }
        return false;
      }
    }

    setLoading(true);

    try {
      const result = await submitFn(formData);

      // Set success message
      const successMessage = successAction
        ? mapSuccessMessage(successAction)
        : 'Operation completed successfully!';

      setSuccess({
        message: successMessage,
        data: result
      });

      // Call success callback if provided
      if (onSuccess) {
        onSuccess(result, formData);
      }

      return result;
    } catch (err) {
      const errorMessage = handleApiError(err, 'Form submission');
      setError(errorMessage);

      // Call error callback if provided
      if (onError) {
        onError(err, formData);
      }

      return null;
    } finally {
      setLoading(false);
    }
  }, [formData, submitFn, validateFn, onSuccess, onError, successAction]);

  // Set specific validation error
  const setFieldError = useCallback((field, message) => {
    setValidationErrors(prev => ({
      ...prev,
      [field]: message
    }));
  }, []);

  // Get field value
  const getFieldValue = useCallback((field) => {
    return formData[field];
  }, [formData]);

  // Check if form has any errors
  const hasErrors = useCallback(() => {
    return error || Object.values(validationErrors).some(err => err);
  }, [error, validationErrors]);

  // Check if form is valid
  const isValid = useCallback(() => {
    return !hasErrors() && !loading;
  }, [hasErrors, loading]);

  return {
    // State
    formData,
    loading,
    error,
    success,
    validationErrors,

    // Actions
    updateField,
    updateFields,
    resetForm,
    clearError,
    clearSuccess,
    handleSubmit,
    setFieldError,

    // Helpers
    getFieldValue,
    hasErrors,
    isValid
  };
};

export default useApiForm;
