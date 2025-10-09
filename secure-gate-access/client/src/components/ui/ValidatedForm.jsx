// Enhanced form component with integrated validation
import React, { memo, useCallback, useEffect } from 'react';
import logger from 'utils/logger';
import { useFormValidation } from '../../hooks/useFormValidation';
import { Button, Card } from './index';

const ValidatedForm = memo(({
  initialValues = {},
  onSubmit,
  validationOptions = {},
  children,
  className = '',
  submitButtonText = 'Submit',
  resetButtonText = 'Reset',
  showResetButton = true,
  showValidationSummary = false,
  cardProps = {},
  ...props
}) => {
  const formValidation = useFormValidation(initialValues, validationOptions);

  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    const result = await formValidation.handleSubmit(onSubmit);
    
    if (result.success) {
      // Form submitted successfully
      logger.debug('Form submitted successfully:', result.data);
    } else {
      // Form validation failed or submission error
      logger.error('Form submission failed:', result.errors || result.error);
    }
  }, [formValidation, onSubmit]);

  // Handle form reset
  const handleReset = useCallback(() => {
    formValidation.resetForm();
  }, [formValidation]);

  // Get validation summary
  const validationSummary = formValidation.getValidationSummary();

  return (
    <Card {...cardProps}>
      <form onSubmit={handleSubmit} className={`space-y-6 ${className}`} {...props}>
        {/* Render form fields */}
        {typeof children === 'function' 
          ? children(formValidation)
          : children
        }

        {/* Validation Summary */}
        {showValidationSummary && formValidation.submitAttempted && (
          <div className="bg-slate-800 border border-slate-600 rounded-lg p-4">
            <h4 className="text-sm font-medium text-slate-200 mb-2">Validation Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Total Fields:</span>
                <span className="ml-2 text-slate-200">{validationSummary.totalFields}</span>
              </div>
              <div>
                <span className="text-slate-400">Valid:</span>
                <span className="ml-2 text-green-400">{validationSummary.validFields}</span>
              </div>
              <div>
                <span className="text-slate-400">Invalid:</span>
                <span className="ml-2 text-red-400">{validationSummary.invalidFields}</span>
              </div>
              <div>
                <span className="text-slate-400">Warnings:</span>
                <span className="ml-2 text-yellow-400">{validationSummary.warningFields}</span>
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700">
          <div className="flex items-center space-x-4">
            {showResetButton && (
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={formValidation.isSubmitting}
              >
                {resetButtonText}
              </Button>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Form Status */}
            <div className="text-sm text-slate-400">
              {formValidation.isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </span>
              ) : formValidation.isValid() ? (
                <span className="text-green-400">✓ Form is valid</span>
              ) : formValidation.hasErrors() ? (
                <span className="text-red-400">✗ Form has errors</span>
              ) : formValidation.hasWarnings() ? (
                <span className="text-yellow-400">⚠ Form has warnings</span>
              ) : (
                <span>Ready to submit</span>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              disabled={formValidation.isSubmitting || (!formValidation.isValid() && formValidation.submitAttempted)}
              loading={formValidation.isSubmitting}
            >
              {submitButtonText}
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
});

ValidatedForm.displayName = 'ValidatedForm';

export default ValidatedForm;
