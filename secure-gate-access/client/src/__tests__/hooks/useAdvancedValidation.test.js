import { renderHook, act, waitFor } from '@testing-library/react';
import useAdvancedValidation, { RULE_TYPES, VALIDATION_STATES } from '../../hooks/useAdvancedValidation';
import { VALIDATION_MESSAGES } from '../../constants/validation';

jest.mock('utils/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('useAdvancedValidation', () => {
  test('createRule supplies default messages (required)', () => {
    const { result } = renderHook(() =>
      useAdvancedValidation(
        {},
        {
          validateOnChange: false,
          validateOnBlur: false,
          validateOnSubmit: false,
          enableCaching: true,
          enableCrossFieldValidation: true
        }
      )
    );

    const rule = result.current.createRule(RULE_TYPES.REQUIRED);
    expect(rule.type).toBe(RULE_TYPES.REQUIRED);
    expect(rule.message).toBe(VALIDATION_MESSAGES.REQUIRED);
    expect(rule.id).toBeTruthy();
  });

  test('registerRules + validateField returns INVALID state and sets errors', async () => {
    const { result } = renderHook(() =>
      useAdvancedValidation(
        { email: '' },
        {
          validateOnChange: false,
          validateOnBlur: false,
          validateOnSubmit: false,
          enableCaching: true,
          enableCrossFieldValidation: true
        }
      )
    );

    await act(async () => {
      result.current.registerRules('email', [result.current.createRule(RULE_TYPES.REQUIRED)]);
    });

    let res;
    await act(async () => {
      res = await result.current.validateField('email', '');
    });

    expect(res.isValid).toBe(false);
    expect(res.state).toBe(VALIDATION_STATES.INVALID);
    expect(res.errors).toContain(VALIDATION_MESSAGES.REQUIRED);

    await waitFor(() => {
      expect(result.current.validationState.email).toBe(VALIDATION_STATES.INVALID);
    });
  });

  test('caches results when enableCaching=true (custom rule called once for same input)', async () => {
    const validate = jest.fn(async () => ({ isValid: true }));

    const { result } = renderHook(() =>
      useAdvancedValidation(
        { username: 'ray' },
        {
          validateOnChange: false,
          validateOnBlur: false,
          validateOnSubmit: false,
          enableCaching: true,
          enableCrossFieldValidation: true
        }
      )
    );

    const rule = result.current.createRule(RULE_TYPES.CUSTOM, { validate });

    await act(async () => {
      result.current.registerRules('username', [rule]);
    });

    await act(async () => {
      await result.current.validateField('username', 'ray');
    });

    await waitFor(() => {
      expect(Object.keys(result.current.validationCache).length).toBeGreaterThan(0);
    });

    await act(async () => {
      await result.current.validateField('username', 'ray');
    });

    expect(validate).toHaveBeenCalledTimes(1);
  });

  test('handleFieldChange clears cache entries for that field', async () => {
    const validate = jest.fn(async () => ({ isValid: true }));

    const { result } = renderHook(() =>
      useAdvancedValidation(
        { username: 'ray' },
        {
          validateOnChange: false,
          validateOnBlur: false,
          validateOnSubmit: false,
          enableCaching: true,
          enableCrossFieldValidation: true
        }
      )
    );

    const rule = result.current.createRule(RULE_TYPES.CUSTOM, { validate });

    await act(async () => {
      result.current.registerRules('username', [rule]);
    });

    await act(async () => {
      await result.current.validateField('username', 'ray');
    });

    await waitFor(() => {
      expect(Object.keys(result.current.validationCache).length).toBeGreaterThan(0);
    });

    await act(async () => {
      result.current.handleFieldChange('username', 'ray2');
    });

    await waitFor(() => {
      expect(Object.keys(result.current.validationCache).length).toBe(0);
    });
  });

  test('cross-field validation re-validates dependent field when dependency changes', async () => {
    const { result } = renderHook(() =>
      useAdvancedValidation(
        { password: 'secret123', confirmPassword: 'secret123' },
        {
          validateOnChange: false,
          validateOnBlur: false,
          validateOnSubmit: false,
          enableCaching: true,
          enableCrossFieldValidation: true
        }
      )
    );

    const matchRule = result.current.createRule(RULE_TYPES.CROSS_FIELD, {
      validate: async (value, _field, allValues) => {
        const ok = value === allValues.password;
        return { isValid: ok, message: ok ? undefined : 'Must match password' };
      }
    });

    await act(async () => {
      result.current.registerField('confirmPassword', [matchRule], {
        crossField: true,
        dependsOn: ['password']
      });
    });

    await act(async () => {
      await result.current.validateField('confirmPassword', 'secret123');
    });

    expect(result.current.errors.confirmPassword).toBeUndefined();

    await act(async () => {
      result.current.handleFieldChange('password', 'different123');
    });

    await waitFor(() => {
      expect(result.current.errors.confirmPassword).toContain('Must match password');
      expect(result.current.validationState.confirmPassword).toBe(VALIDATION_STATES.INVALID);
    });
  });
});
