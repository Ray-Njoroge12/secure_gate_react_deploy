import { renderHook, act } from '@testing-library/react';
import { useFormValidation } from '../useFormValidation';

describe('useFormValidation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useFormValidation({
      email: '',
      password: ''
    }));

    expect(result.current.values).toEqual({ email: '', password: '' });
    expect(result.current.errors).toEqual({});
    expect(result.current.isValid()).toBe(false);
    expect(result.current.isDirty).toBe(false);
  });

  it('updates values when handleFieldChange is called', () => {
    const { result } = renderHook(() => useFormValidation({
      email: '',
      password: ''
    }));

    act(() => {
      result.current.handleFieldChange('email', 'test@example.com');
    });

    expect(result.current.values.email).toBe('test@example.com');
    expect(result.current.isDirty).toBe(true);
  });

  it('validates fields on blur', () => {
    const { result } = renderHook(() => useFormValidation({
      email: '',
      password: ''
    }, {
      email: { required: true, email: true },
      password: { required: true, minLength: 8 }
    }));

    act(() => {
      result.current.handleFieldChange('email', 'invalid-email');
    });

    act(() => {
      result.current.handleBlur('email');
    });

    expect(result.current.errors.email).toBeDefined();
    expect(result.current.isValid()).toBe(false);
  });

  it('validates fields on change with debounce', () => {
    const { result } = renderHook(() => useFormValidation({
      email: '',
      password: ''
    }, {
      email: { required: true, email: true },
      password: { required: true, minLength: 8 }
    }));

    act(() => {
      result.current.handleFieldChange('email', 'invalid-email');
    });

    act(() => {
      result.current.handleChange('email', 'invalid-email');
    });

    // Should not validate immediately due to debounce
    expect(result.current.errors.email).toBeUndefined();

    // Fast-forward debounce time
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.errors.email).toBeDefined();
  });

  it('clears errors when field becomes valid', () => {
    const { result } = renderHook(() => useFormValidation({
      email: '',
      password: ''
    }, {
      email: { required: true, email: true },
      password: { required: true, minLength: 8 }
    }));

    // Set invalid email
    act(() => {
      result.current.handleFieldChange('email', 'invalid-email');
    });

    act(() => {
      result.current.handleBlur('email');
    });

    expect(result.current.errors.email).toBeDefined();

    // Fix email
    act(() => {
      result.current.handleFieldChange('email', 'valid@example.com');
    });

    act(() => {
      result.current.handleBlur('email');
    });

    expect(result.current.errors.email).toBeUndefined();
  });

  it('validates entire form on submit', () => {
    const { result } = renderHook(() => useFormValidation({
      email: '',
      password: ''
    }, {
      email: { required: true, email: true },
      password: { required: true, minLength: 8 }
    }));

    act(() => {
      result.current.handleSubmit();
    });

    expect(result.current.errors.email).toBeDefined();
    expect(result.current.errors.password).toBeDefined();
    expect(result.current.isValid()).toBe(false);
  });

  it('resets form to initial values', () => {
    const { result } = renderHook(() => useFormValidation({
      email: '',
      password: ''
    }));

    act(() => {
      result.current.handleFieldChange('email', 'test@example.com');
      result.current.handleFieldChange('password', 'password123');
    });

    expect(result.current.values.email).toBe('test@example.com');
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.values).toEqual({ email: '', password: '' });
    expect(result.current.isDirty).toBe(false);
    expect(result.current.errors).toEqual({});
  });

  it('handles custom validation rules', () => {
    const customValidation = {
      password: {
        required: true,
        custom: (value) => {
          if (!value.includes('@')) {
            return 'Password must contain @ symbol';
          }
          return null;
        }
      }
    };

    const { result } = renderHook(() => useFormValidation({
      password: ''
    }, customValidation));

    act(() => {
      result.current.handleFieldChange('password', 'password123');
    });

    act(() => {
      result.current.handleBlur('password');
    });

    expect(result.current.errors.password).toBe('Password must contain @ symbol');
  });

  it('handles async validation', async () => {
    const asyncValidation = {
      email: {
        required: true,
        async: async (value) => {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 100));
          if (value === 'taken@example.com') {
            return 'Email is already taken';
          }
          return null;
        }
      }
    };

    const { result } = renderHook(() => useFormValidation({
      email: ''
    }, asyncValidation));

    act(() => {
      result.current.handleFieldChange('email', 'taken@example.com');
    });

    act(() => {
      result.current.handleBlur('email');
    });

    // Wait for async validation
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 150));
    });

    expect(result.current.errors.email).toBe('Email is already taken');
  });

  it('tracks field-level validation state', () => {
    const { result } = renderHook(() => useFormValidation({
      email: '',
      password: ''
    }, {
      email: { required: true, email: true },
      password: { required: true, minLength: 8 }
    }));

    act(() => {
      result.current.handleFieldChange('email', 'valid@example.com');
    });

    act(() => {
      result.current.handleBlur('email');
    });

    expect(result.current.getFieldState('email').isValid).toBe(true);
    expect(result.current.getFieldState('email').isDirty).toBe(true);
    expect(result.current.getFieldState('password').isValid).toBe(false);
    expect(result.current.getFieldState('password').isDirty).toBe(false);
  });

  it('handles form submission with validation', () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() => useFormValidation({
      email: 'test@example.com',
      password: 'password123'
    }, {
      email: { required: true, email: true },
      password: { required: true, minLength: 8 }
    }, onSubmit));

    act(() => {
      result.current.handleSubmit();
    });

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    });
  });

  it('prevents submission when form is invalid', () => {
    const onSubmit = jest.fn();
    const { result } = renderHook(() => useFormValidation({
      email: 'invalid-email',
      password: '123'
    }, {
      email: { required: true, email: true },
      password: { required: true, minLength: 8 }
    }, onSubmit));

    act(() => {
      result.current.handleSubmit();
    });

    expect(onSubmit).not.toHaveBeenCalled();
    expect(result.current.isValid()).toBe(false);
  });
});

