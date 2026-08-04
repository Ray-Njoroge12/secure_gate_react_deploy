import React, { memo } from 'react';
import { useApiForm } from '../../hooks/useApiForm';
import { Card, Button, Loading, Toast } from '../ui';

/**
 * Reusable API form component that handles form submission, validation, and error states
 * @param {Object} props - Component props
 * @param {Function} props.submitFn - API function to call on form submission
 * @param {Object} props.initialFormData - Initial form data
 * @param {Function} props.validateFn - Optional validation function
 * @param {Function} props.onSuccess - Optional success callback
 * @param {Function} props.onError - Optional error callback
 * @param {string} props.successAction - Action key for success message mapping
 * @param {React.Component} props.children - Form fields/content
 * @param {Object} props.formProps - Additional props for the form element
 * @param {Object} props.cardProps - Additional props for the Card wrapper
 * @param {string} props.submitButtonText - Text for submit button
 * @param {boolean} props.showSuccessToast - Whether to show success toast
 * @param {boolean} props.showErrorToast - Whether to show error toast
 */
export const ApiForm = memo(({
  submitFn,
  initialFormData = {},
  validateFn = null,
  onSuccess = null,
  onError = null,
  successAction = null,
  children,
  formProps = {},
  cardProps = {},
  showSuccessToast = true,
  showErrorToast = true,
  ...props
}) => {
  const {
    formData,
    loading,
    error,
    success,
    validationErrors,
    updateField,
    updateFields,
    clearError,
    clearSuccess,
    handleSubmit,
    setFieldError,
    getFieldValue
  } = useApiForm({
    submitFn,
    initialFormData,
    validateFn,
    onSuccess,
    onError,
    successAction
  });

  // Clone children and inject form state
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        formData,
        updateField,
        updateFields,
        validationErrors,
        setFieldError,
        getFieldValue,
        loading,
        ...child.props
      });
    }
    return child;
  });

  return (
    <>
      <Card {...cardProps}>
        <form
          onSubmit={handleSubmit}
          {...formProps}
          {...props}
        >
          {enhancedChildren}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-4">
              <Loading size="md" text="Submitting..." />
            </div>
          )}
        </form>
      </Card>

      {/* Success Toast */}
      {showSuccessToast && success && (
        <Toast
          type="success"
          message={success.message}
          onClose={clearSuccess}
        />
      )}

      {/* Error Toast */}
      {showErrorToast && error && (
        <Toast
          type="error"
          message={error}
          onClose={clearError}
        />
      )}
    </>
  );
});

ApiForm.displayName = 'ApiForm';

/**
 * Submit button component for use within ApiForm
 */
export const ApiFormSubmit = ({
  children,
  disabled,
  loading,
  formLoading,
  ...props
}) => {
  const isDisabled = disabled || loading || formLoading;

  return (
    <Button
      type="submit"
      disabled={isDisabled}
      loading={loading || formLoading}
      {...props}
    >
      {children}
    </Button>
  );
};

/**
 * Reset button component for use within ApiForm
 */
export const ApiFormReset = ({
  children = 'Reset',
  onReset,
  disabled,
  loading,
  ...props
}) => {
  const handleReset = (e) => {
    e.preventDefault();
    if (onReset) {
      onReset();
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      onClick={handleReset}
      disabled={disabled || loading}
      {...props}
    >
      {children}
    </Button>
  );
};

export default ApiForm;
