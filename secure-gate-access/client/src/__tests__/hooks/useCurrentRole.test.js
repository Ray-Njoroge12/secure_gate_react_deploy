import { renderHook } from '@testing-library/react';
import React from 'react';

import { AuthContext } from '../../contexts/AuthContext';
import { useCurrentRole } from '../../hooks/useCurrentRole';

const createWrapper = (user) => {
  return ({ children }) => (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
};

describe('useCurrentRole', () => {
  test('returns null when user is null', () => {
    const { result } = renderHook(() => useCurrentRole(), {
      wrapper: createWrapper(null)
    });
    expect(result.current).toBeNull();
  });

  test('returns null when user has no role', () => {
    const { result } = renderHook(() => useCurrentRole(), {
      wrapper: createWrapper({ id: 1, email: 'test@test.com' })
    });
    expect(result.current).toBeNull();
  });

  test('returns "resident" for resident user', () => {
    const { result } = renderHook(() => useCurrentRole(), {
      wrapper: createWrapper({ id: 1, role: 'resident' })
    });
    expect(result.current).toBe('resident');
  });

  test('returns "guard" for guard user', () => {
    const { result } = renderHook(() => useCurrentRole(), {
      wrapper: createWrapper({ id: 2, role: 'guard' })
    });
    expect(result.current).toBe('guard');
  });

  test('returns "admin" for admin user', () => {
    const { result } = renderHook(() => useCurrentRole(), {
      wrapper: createWrapper({ id: 3, role: 'admin' })
    });
    expect(result.current).toBe('admin');
  });
});
