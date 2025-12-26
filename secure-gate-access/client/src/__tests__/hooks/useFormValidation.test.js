/**
 * Form Validation Hooks Unit Tests
 * Tests for useFormValidation and useAdvancedValidation hooks
 */

import { renderHook, act } from '@testing-library/react';
import useFormValidationHook from '../../hooks/useFormValidation';

// Simulated validation functions for testing
const validators = {
  required: (value, fieldName = 'Field') => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return `${fieldName} is required`;
    }
    return null;
  },

  email: (value) => {
    if (!value) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return 'Please enter a valid email address';
    }
    return null;
  },

  minLength: (min) => (value, fieldName = 'Field') => {
    if (!value) return null;
    if (value.length < min) {
      return `${fieldName} must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (max) => (value, fieldName = 'Field') => {
    if (!value) return null;
    if (value.length > max) {
      return `${fieldName} must be at most ${max} characters`;
    }
    return null;
  },

  pattern: (regex, message) => (value) => {
    if (!value) return null;
    if (!regex.test(value)) {
      return message || 'Invalid format';
    }
    return null;
  },

  phone: (value) => {
    if (!value) return null;
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    const cleaned = value.replace(/[\s\-\(\)]/g, '');
    if (!phoneRegex.test(cleaned)) {
      return 'Please enter a valid phone number';
    }
    return null;
  },

  password: (value) => {
    if (!value) return null;
    const errors = [];
    if (value.length < 8) errors.push('at least 8 characters');
    if (!/[A-Z]/.test(value)) errors.push('one uppercase letter');
    if (!/[a-z]/.test(value)) errors.push('one lowercase letter');
    if (!/\d/.test(value)) errors.push('one number');
    if (!/[!@#$%^&*]/.test(value)) errors.push('one special character');
    
    if (errors.length > 0) {
      return `Password must contain ${errors.join(', ')}`;
    }
    return null;
  },

  match: (matchField, matchFieldName) => (value, _, formData) => {
    if (!value) return null;
    if (value !== formData[matchField]) {
      return `Must match ${matchFieldName}`;
    }
    return null;
  },

  date: (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return 'Please enter a valid date';
    }
    return null;
  },

  futureDate: (value) => {
    if (!value) return null;
    const date = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return 'Date must be in the future';
    }
    return null;
  }
};

// Form validation hook simulation (using mutable state for testing)
const useFormValidation = (initialValues, validationRules) => {
  // Use a state object to track mutable state
  const state = {
    values: { ...initialValues },
    errors: {},
    touched: {}
  };

  const validateField = (name, value) => {
    const rules = validationRules[name];
    if (!rules) return null;

    for (const rule of rules) {
      const error = rule(value, name, state.values);
      if (error) return error;
    }
    return null;
  };

  const validateAll = () => {
    const newErrors = {};
    let isValid = true;

    for (const [name, rules] of Object.entries(validationRules)) {
      const error = validateField(name, state.values[name]);
      if (error) {
        newErrors[name] = error;
        isValid = false;
      }
    }

    // Update the state.errors object
    Object.keys(state.errors).forEach(key => delete state.errors[key]);
    Object.assign(state.errors, newErrors);
    return isValid;
  };

  const setValue = (name, value) => {
    state.values[name] = value;
    state.touched[name] = true;
    state.errors[name] = validateField(name, value);
  };

  const reset = () => {
    // Clear and reset values
    Object.keys(state.values).forEach(key => delete state.values[key]);
    Object.assign(state.values, { ...initialValues });

    // Clear errors and touched
    Object.keys(state.errors).forEach(key => delete state.errors[key]);
    Object.keys(state.touched).forEach(key => delete state.touched[key]);
  };

  return {
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    setValue,
    validateField,
    validateAll,
    reset
  };
};

describe.skip('Validators', () => {
  describe('required', () => {
    test('should return error for empty string', () => {
      expect(validators.required('')).toBe('Field is required');
    });

    test('should return error for whitespace only', () => {
      expect(validators.required('   ')).toBe('Field is required');
    });

    test('should return null for valid value', () => {
      expect(validators.required('test')).toBeNull();
    });

    test('should return error for null', () => {
      expect(validators.required(null)).toBe('Field is required');
    });

    test('should use custom field name', () => {
      expect(validators.required('', 'Email')).toBe('Email is required');
    });
  });

  describe('email', () => {
    test('should return null for valid email', () => {
      expect(validators.email('test@example.com')).toBeNull();
    });

    test('should return error for invalid email', () => {
      expect(validators.email('invalid')).toBe('Please enter a valid email address');
    });

    test('should return error for email without domain', () => {
      expect(validators.email('test@')).toBe('Please enter a valid email address');
    });

    test('should return null for empty value', () => {
      expect(validators.email('')).toBeNull();
    });

    test.each([
      ['user@domain.com', true],
      ['user.name@domain.com', true],
      ['user+tag@domain.com', true],
      ['user@sub.domain.com', true],
      ['invalid', false],
      ['@domain.com', false],
      ['user@', false],
      ['user@domain', false]
    ])('should validate email %s as %s', (email, shouldBeValid) => {
      const result = validators.email(email);
      expect(result === null).toBe(shouldBeValid);
    });
  });

  describe('minLength', () => {
    const minLength5 = validators.minLength(5);

    test('should return error for short string', () => {
      expect(minLength5('test')).toContain('at least 5');
    });

    test('should return null for valid length', () => {
      expect(minLength5('testing')).toBeNull();
    });

    test('should return null for exact length', () => {
      expect(minLength5('tests')).toBeNull();
    });

    test('should return null for empty value', () => {
      expect(minLength5('')).toBeNull();
    });
  });

  describe('maxLength', () => {
    const maxLength10 = validators.maxLength(10);

    test('should return error for long string', () => {
      expect(maxLength10('this is too long')).toContain('at most 10');
    });

    test('should return null for valid length', () => {
      expect(maxLength10('short')).toBeNull();
    });

    test('should return null for exact length', () => {
      expect(maxLength10('1234567890')).toBeNull();
    });
  });

  describe('phone', () => {
    test('should return null for valid international format', () => {
      expect(validators.phone('+254712345678')).toBeNull();
    });

    test('should return error for invalid format', () => {
      expect(validators.phone('invalid')).toBe('Please enter a valid phone number');
    });

    test('should handle spaces and dashes', () => {
      expect(validators.phone('+254 712 345 678')).toBeNull();
    });

    test('should handle parentheses', () => {
      expect(validators.phone('+254 (712) 345-678')).toBeNull();
    });

    test('should return null for empty value', () => {
      expect(validators.phone('')).toBeNull();
    });
  });

  describe('password', () => {
    test('should return null for strong password', () => {
      expect(validators.password('SecurePass123!')).toBeNull();
    });

    test('should return error for weak password', () => {
      const result = validators.password('weak');
      expect(result).toContain('at least 8 characters');
    });

    test('should require uppercase', () => {
      const result = validators.password('password123!');
      expect(result).toContain('uppercase');
    });

    test('should require lowercase', () => {
      const result = validators.password('PASSWORD123!');
      expect(result).toContain('lowercase');
    });

    test('should require number', () => {
      const result = validators.password('SecurePass!');
      expect(result).toContain('number');
    });

    test('should require special character', () => {
      const result = validators.password('SecurePass123');
      expect(result).toContain('special');
    });
  });

  describe('match', () => {
    const matchPassword = validators.match('password', 'Password');

    test('should return null when values match', () => {
      const formData = { password: 'test123', confirmPassword: 'test123' };
      expect(matchPassword('test123', 'confirmPassword', formData)).toBeNull();
    });

    test('should return error when values do not match', () => {
      const formData = { password: 'test123', confirmPassword: 'different' };
      expect(matchPassword('different', 'confirmPassword', formData)).toBe('Must match Password');
    });
  });

  describe('date', () => {
    test('should return null for valid date', () => {
      expect(validators.date('2024-01-15')).toBeNull();
    });

    test('should return error for invalid date', () => {
      expect(validators.date('invalid')).toBe('Please enter a valid date');
    });

    test('should return null for empty value', () => {
      expect(validators.date('')).toBeNull();
    });
  });

  describe('futureDate', () => {
    test('should return null for future date', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(validators.futureDate(tomorrow.toISOString())).toBeNull();
    });

    test('should return error for past date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(validators.futureDate(yesterday.toISOString())).toBe('Date must be in the future');
    });
  });
});

describe.skip('useFormValidation', () => {
  test('should initialize with values', () => {
    const form = useFormValidation(
      { email: '', password: '' },
      {}
    );
    expect(form.values.email).toBe('');
    expect(form.values.password).toBe('');
  });

  test('should validate field on change', () => {
    const form = useFormValidation(
      { email: '' },
      { email: [validators.required, validators.email] }
    );

    form.setValue('email', 'invalid');
    expect(form.errors.email).toBe('Please enter a valid email address');
  });

  test('should clear error when valid', () => {
    const form = useFormValidation(
      { email: '' },
      { email: [validators.required, validators.email] }
    );

    form.setValue('email', 'invalid');
    expect(form.errors.email).toBeTruthy();

    form.setValue('email', 'valid@example.com');
    expect(form.errors.email).toBeNull();
  });

  test('should validate all fields', () => {
    const form = useFormValidation(
      { email: '', password: '' },
      { 
        email: [validators.required, validators.email],
        password: [validators.required, validators.minLength(8)]
      }
    );

    const isValid = form.validateAll();
    expect(isValid).toBe(false);
    expect(form.errors.email).toBeTruthy();
    expect(form.errors.password).toBeTruthy();
  });

  test('should return true when all fields valid', () => {
    const form = useFormValidation(
      { email: 'test@example.com', password: 'longpassword' },
      { 
        email: [validators.required, validators.email],
        password: [validators.required, validators.minLength(8)]
      }
    );

    const isValid = form.validateAll();
    expect(isValid).toBe(true);
  });

  test('should reset form', () => {
    const form = useFormValidation(
      { email: '' },
      { email: [validators.required] }
    );

    form.setValue('email', 'test@example.com');
    expect(form.values.email).toBe('test@example.com');

    form.reset();
    expect(form.values.email).toBe('');
  });

  test('should track touched fields', () => {
    const form = useFormValidation(
      { email: '' },
      {}
    );

    expect(form.touched.email).toBeUndefined();
    form.setValue('email', 'test');
    expect(form.touched.email).toBe(true);
  });
});

describe('useFormValidation (real hook)', () => {
  test('should initialize with provided values', () => {
    const { result } = renderHook(() =>
      useFormValidationHook(
        { email: '', password: '' },
        { validateOnChange: false, validateOnBlur: false, validateOnSubmit: false }
      )
    );

    expect(result.current.values.email).toBe('');
    expect(result.current.values.password).toBe('');
    expect(result.current.errors).toEqual({});
  });

  test('registerField + validateField should populate errors for invalid values', async () => {
    const { result } = renderHook(() =>
      useFormValidationHook(
        { email: '' },
        { validateOnChange: false, validateOnBlur: false, validateOnSubmit: false }
      )
    );

    await act(async () => {
      result.current.registerField('email', async (value) => {
        const ok = typeof value === 'string' && value.includes('@');
        return {
          isValid: ok,
          errors: ok ? [] : ['Invalid email'],
          warnings: [],
          state: ok ? 'valid' : 'invalid'
        };
      });
    });

    await act(async () => {
      await result.current.validateField('email', 'invalid');
    });

    expect(result.current.errors.email).toEqual(['Invalid email']);
  });

  test('validateAll aggregates field errors', async () => {
    const { result } = renderHook(() =>
      useFormValidationHook(
        { email: '', password: '' },
        { validateOnChange: false, validateOnBlur: false, validateOnSubmit: false }
      )
    );

    await act(async () => {
      result.current.registerField('email', async (value) => {
        const ok = !!value;
        return { isValid: ok, errors: ok ? [] : ['Required'], warnings: [], state: ok ? 'valid' : 'invalid' };
      });
      result.current.registerField('password', async (value) => {
        const ok = typeof value === 'string' && value.length >= 8;
        return { isValid: ok, errors: ok ? [] : ['Too short'], warnings: [], state: ok ? 'valid' : 'invalid' };
      });
    });

    let validationResult;
    await act(async () => {
      validationResult = await result.current.validateAll();
    });

    expect(validationResult.isValid).toBe(false);
    expect(validationResult.errors.email).toEqual(['Required']);
    expect(validationResult.errors.password).toEqual(['Too short']);
  });

  test('handleSubmit blocks submission when validation fails', async () => {
    const submitFn = jest.fn(async () => ({ ok: true }));

    const { result } = renderHook(() =>
      useFormValidationHook(
        { email: '', password: '' },
        { validateOnChange: false, validateOnBlur: false, validateOnSubmit: true }
      )
    );

    await act(async () => {
      result.current.registerField('email', async (value) => {
        const ok = typeof value === 'string' && value.includes('@');
        return { isValid: ok, errors: ok ? [] : ['Invalid email'], warnings: [], state: ok ? 'valid' : 'invalid' };
      });
      result.current.registerField('password', async (value) => {
        const ok = typeof value === 'string' && value.length >= 8;
        return { isValid: ok, errors: ok ? [] : ['Too short'], warnings: [], state: ok ? 'valid' : 'invalid' };
      });
    });

    let submitResult;
    await act(async () => {
      submitResult = await result.current.handleSubmit(submitFn);
    });

    expect(submitResult.success).toBe(false);
    expect(submitFn).not.toHaveBeenCalled();
    expect(result.current.errors.email).toEqual(['Invalid email']);
    expect(result.current.errors.password).toEqual(['Too short']);
  });

  test('handleSubmit calls submitFn when valid', async () => {
    const submitFn = jest.fn(async (vals) => ({ echo: vals }));

    const { result } = renderHook(() =>
      useFormValidationHook(
        { email: '', password: '' },
        { validateOnChange: false, validateOnBlur: false, validateOnSubmit: true }
      )
    );

    await act(async () => {
      result.current.registerField('email', async (value) => {
        const ok = typeof value === 'string' && value.includes('@');
        return { isValid: ok, errors: ok ? [] : ['Invalid email'], warnings: [], state: ok ? 'valid' : 'invalid' };
      });
      result.current.registerField('password', async (value) => {
        const ok = typeof value === 'string' && value.length >= 8;
        return { isValid: ok, errors: ok ? [] : ['Too short'], warnings: [], state: ok ? 'valid' : 'invalid' };
      });
    });

    await act(async () => {
      result.current.handleFieldChange('email', 'test@example.com');
      result.current.handleFieldChange('password', 'longpassword');
    });

    let submitResult;
    await act(async () => {
      submitResult = await result.current.handleSubmit(submitFn);
    });

    expect(submitResult.success).toBe(true);
    expect(submitFn).toHaveBeenCalledWith({ email: 'test@example.com', password: 'longpassword' });
  });
});
