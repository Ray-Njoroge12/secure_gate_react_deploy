/**
 * Advanced Validation Hook Tests
 * 
 * Comprehensive test suite for the useAdvancedValidation hook:
 * - Basic validation functionality
 * - Async validation support
 * - Cross-field validation
 * - Validation caching
 * - Error handling
 * - Performance optimization
 */

import { renderHook, act } from '@testing-library/react';
import { useAdvancedValidation, VALIDATION_STATES, RULE_TYPES } from '../../hooks/useAdvancedValidation';

// Mock validation functions
const mockValidationFunctions = {
  required: (value) => ({
    isValid: !!(value && value.trim()),
    message: 'This field is required'
  }),
  
  email: (value) => ({
    isValid: !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: 'Invalid email format'
  }),
  
  minLength: (value, options) => ({
    isValid: !value || value.length >= options.min,
    message: `Must be at least ${options.min} characters`
  })
};

// Mock async validation function
const mockAsyncValidation = jest.fn().mockResolvedValue({
  isValid: true,
  message: 'Valid'
});

describe('useAdvancedValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useAdvancedValidation({
        name: 'John',
        email: 'john@example.com'
      }));

      expect(result.current.values).toEqual({
        name: 'John',
        email: 'john@example.com'
      });
      expect(result.current.errors).toEqual({});
      expect(result.current.warnings).toEqual({});
      expect(result.current.successes).toEqual({});
      expect(result.current.touched).toEqual({});
      expect(result.current.isValidating).toEqual({});
      expect(result.current.validationState).toEqual({});
      expect(result.current.isSubmitting).toBe(false);
      expect(result.current.submitAttempted).toBe(false);
    });

    it('should handle field changes', () => {
      const { result } = renderHook(() => useAdvancedValidation());

      act(() => {
        result.current.handleFieldChange('name', 'John Doe');
      });

      expect(result.current.values.name).toBe('John Doe');
    });

    it('should handle field blur', () => {
      const { result } = renderHook(() => useAdvancedValidation());

      act(() => {
        result.current.handleFieldBlur('name', 'John Doe');
      });

      expect(result.current.touched.name).toBe(true);
    });

    it('should handle field focus', () => {
      const { result } = renderHook(() => useAdvancedValidation());

      act(() => {
        result.current.handleFieldFocus('name');
      });

      expect(result.current.touched.name).toBe(true);
    });
  });

  describe('Validation Rules', () => {
    it('should create validation rules', () => {
      const { result } = renderHook(() => useAdvancedValidation());

      const rule = result.current.createRule(RULE_TYPES.REQUIRED, {
        message: 'Custom required message'
      });

      expect(rule.type).toBe(RULE_TYPES.REQUIRED);
      expect(rule.message).toBe('Custom required message');
      expect(rule.id).toBeDefined();
    });

    it('should register validation rules', () => {
      const { result } = renderHook(() => useAdvancedValidation());

      const rules = [
        result.current.createRule(RULE_TYPES.REQUIRED),
        result.current.createRule(RULE_TYPES.EMAIL)
      ];

      act(() => {
        result.current.registerRules('email', rules);
      });

      // Wait for state update
      expect(result.current.validationRules).toBeDefined();
      expect(result.current.validationRules.email).toEqual(rules);
    });

    it('should register field validators', () => {
      const { result } = renderHook(() => useAdvancedValidation());

      const rules = [
        result.current.createRule(RULE_TYPES.REQUIRED),
        result.current.createRule(RULE_TYPES.EMAIL)
      ];

      act(() => {
        result.current.registerField('email', rules);
      });

      // Wait for state update and check validatorsRef
      expect(result.current.validatorsRef).toBeDefined();
      expect(result.current.validatorsRef.current).toBeDefined();
      expect(result.current.validatorsRef.current.email).toEqual(rules);
    });
  });

  describe('Field Validation', () => {
    it('should validate required fields', async () => {
      const { result } = renderHook(() => useAdvancedValidation());

      const rules = [
        result.current.createRule(RULE_TYPES.REQUIRED)
      ];

      act(() => {
        result.current.registerField('name', rules);
      });

      await act(async () => {
        const validationResult = await result.current.validateField('name', '');
      });

      // Wait for state updates
      expect(result.current.errors).toBeDefined();
      expect(result.current.errors.name).toBeDefined();
      expect(result.current.errors.name).toContain('This field is required');
      expect(result.current.validationState).toBeDefined();
      expect(result.current.validationState.name).toBe(VALIDATION_STATES.INVALID);
    });

    it('should validate email fields', async () => {
      const { result } = renderHook(() => useAdvancedValidation());

      const rules = [
        result.current.createRule(RULE_TYPES.EMAIL)
      ];

      act(() => {
        result.current.registerField('email', rules);
      });

      await act(async () => {
        await result.current.validateField('email', 'invalid-email');
      });

      // Wait for state updates
      expect(result.current.errors).toBeDefined();
      expect(result.current.errors.email).toBeDefined();
      expect(result.current.errors.email).toContain('Please enter a valid email address');
    });

    it('should validate minLength fields', async () => {
      const { result } = renderHook(() => useAdvancedValidation());

      const rules = [
        result.current.createRule(RULE_TYPES.MIN_LENGTH, { min: 5 })
      ];

      act(() => {
        result.current.registerField('password', rules);
      });

      await act(async () => {
        await result.current.validateField('password', '123');
      });

      // Wait for state updates
      expect(result.current.errors).toBeDefined();
      expect(result.current.errors.password).toBeDefined();
      expect(result.current.errors.password).toContain('Must be at least 5 characters');
    });

    it('should handle validation success', async () => {
      const { result } = renderHook(() => useAdvancedValidation());

      const rules = [
        result.current.createRule(RULE_TYPES.REQUIRED)
      ];

      act(() => {
        result.current.registerField('name', rules);
      });

      await act(async () => {
        await result.current.validateField('name', 'John Doe');
      });

      // Wait for state updates
      expect(result.current.errors).toBeDefined();
      expect(result.current.errors.name).toBeUndefined();
      expect(result.current.validationState).toBeDefined();
      expect(result.current.validationState.name).toBe(VALIDATION_STATES.VALID);
    });
  });

  describe('Async Validation', () => {
    it('should handle async validation', async () => {
      const { result } = renderHook(() => useAdvancedValidation());

      const rules = [
        result.current.createRule(RULE_TYPES.ASYNC, {
          validate: mockAsyncValidation
        })
      ];

      act(() => {
        result.current.registerField('email', rules);
      });

      await act(async () => {
        await result.current.validateField('email', 'test@example.com');
      });

      expect(mockAsyncValidation).toHaveBeenCalledWith('test@example.com', 'email', {});
      expect(result.current.validationState.email).toBe(VALIDATION_STATES.VALID);
    });

    it('should handle async validation errors', async () => {
      const { result } = renderHook(() => useAdvancedValidation());

      const mockAsyncError = jest.fn().mockRejectedValue(new Error('Async validation failed'));

      const rules = [
        result.current.createRule(RULE_TYPES.ASYNC, {
          validate: mockAsyncError
        })
      ];

      act(() => {
        result.current.registerField('email', rules);
      });

      await act(async () => {
        await result.current.validateField('email', 'test@example.com');
      });

      expect(result.current.errors.email).toContain('Invalid value');
      expect(result.current.validationState.email).toBe(VALIDATION_STATES.INVALID);
    });
  });

  describe('Cross-Field Validation', () => {
    it('should handle cross-field validation', async () => {
      const { result } = renderHook(() => useAdvancedValidation({
        password: 'password123',
        confirmPassword: 'password123'
      }));

      const rules = [
        result.current.createRule(RULE_TYPES.CROSS_FIELD, {
          validate: (value, fieldName, allValues) => ({
            isValid: value === allValues.password,
            message: 'Passwords do not match'
          })
        })
      ];

      act(() => {
        result.current.registerField('confirmPassword', rules);
      });

      await act(async () => {
        await result.current.validateField('confirmPassword', 'password123');
      });

      expect(result.current.errors.confirmPassword).toBeUndefined();
      expect(result.current.validationState.confirmPassword).toBe(VALIDATION_STATES.VALID);
    });

    it('should handle cross-field validation errors', async () => {
      const { result } = renderHook(() => useAdvancedValidation({
        password: 'password123',
        confirmPassword: 'different123'
      }));

      const rules = [
        result.current.createRule(RULE_TYPES.CROSS_FIELD, {
          validate: (value, fieldName, allValues) => ({
            isValid: value === allValues.password,
            message: 'Passwords do not match'
          })
        })
      ];

      act(() => {
        result.current.registerField('confirmPassword', rules);
      });

      await act(async () => {
        await result.current.validateField('confirmPassword', 'different123');
      });

      expect(result.current.errors.confirmPassword).toContain('Passwords do not match');
      expect(result.current.validationState.confirmPassword).toBe(VALIDATION_STATES.INVALID);
    });
  });

  describe('Validation Caching', () => {
    it('should cache validation results', async () => {
      const { result } = renderHook(() => useAdvancedValidation({}, {
        enableCaching: true
      }));

      const rules = [
        result.current.createRule(RULE_TYPES.REQUIRED)
      ];

      act(() => {
        result.current.registerField('name', rules);
      });

      // First validation
      await act(async () => {
        await result.current.validateField('name', 'John');
      });

      expect(result.current.validationCache).toHaveProperty('name_John_{}');

      // Second validation should use cache
      await act(async () => {
        await result.current.validateField('name', 'John');
      });

      expect(result.current.validationCache).toHaveProperty('name_John_{}');
    });

    it('should clear validation cache', async () => {
      const { result } = renderHook(() => useAdvancedValidation({}, {
        enableCaching: true
      }));

      // First, create some cache by validating a field
      const rules = [
        result.current.createRule(RULE_TYPES.REQUIRED)
      ];

      act(() => {
        result.current.registerField('name', rules);
      });

      await act(async () => {
        await result.current.validateField('name', 'John');
      });

      // Verify cache exists
      expect(Object.keys(result.current.validationCache).length).toBeGreaterThan(0);

      // Clear the cache
      act(() => {
        result.current.clearValidationCache();
      });

      expect(result.current.validationCache).toEqual({});
    });
  });

  describe('Form Submission', () => {
    it('should handle form submission with validation', async () => {
      const { result } = renderHook(() => useAdvancedValidation({
        name: 'John',
        email: 'john@example.com'
      }));

      const mockSubmitFn = jest.fn().mockResolvedValue({ success: true });

      const rules = [
        result.current.createRule(RULE_TYPES.REQUIRED)
      ];

      act(() => {
        result.current.registerField('name', rules);
        result.current.registerField('email', rules);
      });

      await act(async () => {
        const submitResult = await result.current.handleSubmit(mockSubmitFn);
      });

      expect(mockSubmitFn).toHaveBeenCalledWith({
        name: 'John',
        email: 'john@example.com'
      });
    });

    it('should prevent submission with validation errors', async () => {
      const { result } = renderHook(() => useAdvancedValidation({
        name: '',
        email: 'john@example.com'
      }));

      const mockSubmitFn = jest.fn().mockResolvedValue({ success: true });

      const rules = [
        result.current.createRule(RULE_TYPES.REQUIRED)
      ];

      act(() => {
        result.current.registerField('name', rules);
        result.current.registerField('email', rules);
      });

      let submitResult;
      await act(async () => {
        submitResult = await result.current.handleSubmit(mockSubmitFn);
      });

      expect(submitResult.success).toBe(false);
      expect(submitResult.errors).toHaveProperty('name');
      expect(mockSubmitFn).not.toHaveBeenCalled();
    });
  });

  describe('Form State Management', () => {
    it('should reset form', () => {
      const { result } = renderHook(() => useAdvancedValidation({
        name: 'John',
        email: 'john@example.com'
      }));

      act(() => {
        result.current.handleFieldChange('name', 'Jane');
        result.current.handleFieldBlur('name');
      });

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.values).toEqual({
        name: 'John',
        email: 'john@example.com'
      });
      expect(result.current.touched).toEqual({});
      expect(result.current.errors).toEqual({});
    });

    it('should clear field errors', async () => {
      const { result } = renderHook(() => useAdvancedValidation());

      // First create an error by validating an invalid field
      const rules = [
        result.current.createRule(RULE_TYPES.REQUIRED)
      ];

      act(() => {
        result.current.registerField('name', rules);
      });

      await act(async () => {
        await result.current.validateField('name', '');
      });

      // Verify error exists
      expect(result.current.errors.name).toBeDefined();

      // Clear the error
      act(() => {
        result.current.clearFieldError('name');
      });

      expect(result.current.errors.name).toBeUndefined();
    });

    it('should clear all errors', async () => {
      const { result } = renderHook(() => useAdvancedValidation());

      // Create errors by validating invalid fields
      const rules = [
        result.current.createRule(RULE_TYPES.REQUIRED)
      ];

      act(() => {
        result.current.registerField('name', rules);
        result.current.registerField('email', rules);
      });

      await act(async () => {
        await result.current.validateField('name', '');
        await result.current.validateField('email', '');
      });

      // Verify errors exist
      expect(result.current.errors.name).toBeDefined();
      expect(result.current.errors.email).toBeDefined();

      // Clear all errors
      act(() => {
        result.current.clearAllErrors();
      });

      expect(result.current.errors.name).toBeUndefined();
      expect(result.current.errors.email).toBeUndefined();
    });
  });

  describe('Field State Helpers', () => {
    it('should get field state', async () => {
      const { result } = renderHook(() => useAdvancedValidation());

      // Create an error state by validating an invalid field
      const rules = [
        result.current.createRule(RULE_TYPES.REQUIRED)
      ];

      act(() => {
        result.current.registerField('name', rules);
      });

      await act(async () => {
        await result.current.validateField('name', '');
      });

      // Touch the field
      act(() => {
        result.current.handleFieldBlur('name');
      });

      // Wait for validation to complete
      await act(async () => {
        // Give time for async validation to complete
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      const fieldState = result.current.getFieldState('name');

      expect(fieldState).toEqual({
        hasErrors: true,
        hasWarnings: false,
        hasSuccesses: false,
        isValid: false,
        isTouched: true,
        isValidating: false,
        state: VALIDATION_STATES.INVALID,
        errors: ['This field is required'],
        warnings: [],
        successes: []
      });
    });

    it('should check if form has errors', async () => {
      const { result } = renderHook(() => useAdvancedValidation());

      // Initially no errors
      expect(result.current.hasErrors()).toBe(false);

      // Create an error by validating an invalid field
      const rules = [
        result.current.createRule(RULE_TYPES.REQUIRED)
      ];

      act(() => {
        result.current.registerField('name', rules);
      });

      await act(async () => {
        await result.current.validateField('name', '');
      });

      expect(result.current.hasErrors()).toBe(true);

      // Clear the error
      act(() => {
        result.current.clearFieldError('name');
      });

      expect(result.current.hasErrors()).toBe(false);
    });

    it('should check if form has warnings', () => {
      const { result } = renderHook(() => useAdvancedValidation());

      // Initially no warnings
      expect(result.current.hasWarnings()).toBe(false);
    });

    it('should check if form is valid', async () => {
      const { result } = renderHook(() => useAdvancedValidation());

      // Initially valid (no fields registered)
      expect(result.current.isValid()).toBe(true);

      // Create an error by validating an invalid field
      const rules = [
        result.current.createRule(RULE_TYPES.REQUIRED)
      ];

      act(() => {
        result.current.registerField('name', rules);
      });

      await act(async () => {
        await result.current.validateField('name', '');
      });

      expect(result.current.isValid()).toBe(false);

      // Fix the field
      await act(async () => {
        await result.current.validateField('name', 'John Doe');
      });

      expect(result.current.isValid()).toBe(true);
    });

    it('should check if form is dirty', () => {
      const { result } = renderHook(() => useAdvancedValidation());

      // Initially not dirty
      expect(result.current.isDirty()).toBe(false);

      // Touch a field
      act(() => {
        result.current.handleFieldBlur('name');
      });

      expect(result.current.isDirty()).toBe(true);
    });
  });

  describe('Validation Summary', () => {
    it('should get validation summary', () => {
      const { result } = renderHook(() => useAdvancedValidation());

      const summary = result.current.getValidationSummary();

      expect(summary.totalFields).toBe(0); // No registered fields
      expect(summary.validFields).toBe(0);
      expect(summary.invalidFields).toBe(0);
      expect(summary.warningFields).toBe(0);
      expect(summary.successFields).toBe(0);
      expect(summary.validatingFields).toBe(0);
      expect(summary.touchedFields).toBe(0);
      expect(summary.isValid).toBe(true);
      expect(summary.hasErrors).toBe(false);
      expect(summary.hasWarnings).toBe(false);
      expect(summary.hasSuccesses).toBe(false);
      expect(summary.isValidating).toBe(false);
      expect(summary.isDirty).toBe(false);
    });
  });

  describe('Performance Optimization', () => {
    it('should debounce validation calls', async () => {
      const { result } = renderHook(() => useAdvancedValidation({}, {
        debounceDelay: 100
      }));

      const rules = [
        result.current.createRule(RULE_TYPES.REQUIRED)
      ];

      act(() => {
        result.current.registerField('name', rules);
      });

      // Multiple rapid changes should be debounced
      act(() => {
        result.current.handleFieldChange('name', 'J');
        result.current.handleFieldChange('name', 'Jo');
        result.current.handleFieldChange('name', 'Joh');
        result.current.handleFieldChange('name', 'John');
      });

      // Wait for debounce delay
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 150));
      });

      // Should only validate once
      expect(result.current.validationState.name).toBe(VALIDATION_STATES.VALID);
    });
  });
});




