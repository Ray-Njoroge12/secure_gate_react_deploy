// FormField component with integrated validation
import React, { memo, useCallback } from 'react';
import ValidatedInput from './ValidatedInput';
import { validationFunctions } from '../../utils/validationRules';

const FormField = memo(({
  name,
  label,
  type = 'text',
  required = false,
  placeholder,
  helperText,
  example,
  icon,
  validationType,
  customValidator,
  showValidationIcon = true,
  showExample = true,
  className = '',
  formValidation,
  ...props
}) => {
  // Get validator for this field
  const getValidator = useCallback(() => {
    if (customValidator) return customValidator;
    if (validationType && validationFunctions[validationType]) {
      return validationFunctions[validationType];
    }
    if (required) return validationFunctions.required;
    return null; // No validation for optional fields
  }, [customValidator, validationType, required]);

  // Handle field change
  const handleChange = useCallback((e) => {
    const value = e.target.value;
    
    if (formValidation) {
      formValidation.handleFieldChange(name, value);
    }
    
    if (props.onChange) {
      props.onChange(e);
    }
  }, [name, formValidation, props.onChange]);

  // Handle field blur
  const handleBlur = useCallback((e) => {
    if (formValidation) {
      formValidation.handleFieldBlur(name, e.target.value);
    }
    
    if (props.onBlur) {
      props.onBlur(e);
    }
  }, [name, formValidation, props.onBlur]);

  // Handle field focus
  const handleFocus = useCallback((e) => {
    if (formValidation) {
      formValidation.handleFieldFocus(name);
    }
    
    if (props.onFocus) {
      props.onFocus(e);
    }
  }, [name, formValidation, props.onFocus]);

  // Handle validation change
  const handleValidationChange = useCallback((validationResult) => {
    // This is called by ValidatedInput when validation state changes
    // We can use this to update form-level validation state if needed
  }, []);

  // Get field validation state
  const fieldState = formValidation ? formValidation.getFieldState(name) : {
    hasErrors: false,
    hasWarnings: false,
    isValid: true,
    isTouched: false,
    isValidating: false,
    state: 'idle',
    errors: [],
    warnings: []
  };

  // Get field value
  const value = formValidation ? formValidation.values[name] : props.value || '';

  // Get error message
  const errorMessage = fieldState.hasErrors ? fieldState.errors[0] : null;

  // Get helper text
  const displayHelperText = showExample && example ? example : helperText;

  // Register field with form validation on mount
  React.useEffect(() => {
    if (formValidation) {
      const validator = getValidator();
      formValidation.registerField(name, validator);
    }
  }, [formValidation, name, getValidator]);

  return (
    <ValidatedInput
      name={name}
      label={label}
      type={type}
      required={required}
      placeholder={placeholder}
      helperText={displayHelperText}
      icon={icon}
      error={errorMessage}
      validator={getValidator()}
      showValidationIcon={showValidationIcon}
      showExample={showExample}
      className={className}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      onValidationChange={handleValidationChange}
      {...props}
    />
  );
});

FormField.displayName = 'FormField';

export default FormField;