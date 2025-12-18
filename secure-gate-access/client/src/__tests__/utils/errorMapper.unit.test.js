/**
 * Error Mapper Unit Tests
 * Tests for error handling and mapping utilities
 */

// Simulated error mapper for testing
const errorCodes = {
  AUTH_TOKEN_MISSING: {
    message: 'Please log in to continue',
    action: 'redirect_login'
  },
  AUTH_TOKEN_EXPIRED: {
    message: 'Your session has expired. Please log in again',
    action: 'redirect_login'
  },
  AUTH_TOKEN_INVALID: {
    message: 'Invalid authentication. Please log in again',
    action: 'redirect_login'
  },
  AUTH_USER_NOT_FOUND: {
    message: 'User account not found',
    action: 'show_error'
  },
  VALIDATION_ERROR: {
    message: 'Please check your input and try again',
    action: 'show_error'
  },
  DUPLICATE_ENTRY: {
    message: 'This record already exists',
    action: 'show_error'
  },
  NOT_FOUND: {
    message: 'The requested resource was not found',
    action: 'show_error'
  },
  FORBIDDEN: {
    message: 'You do not have permission to perform this action',
    action: 'show_error'
  },
  RATE_LIMITED: {
    message: 'Too many requests. Please wait a moment and try again',
    action: 'show_error'
  },
  SERVER_ERROR: {
    message: 'Something went wrong. Please try again later',
    action: 'show_error'
  },
  NETWORK_ERROR: {
    message: 'Unable to connect. Please check your internet connection',
    action: 'show_error'
  }
};

const handleApiError = (error) => {
  // Handle network errors
  if (!error.response) {
    return {
      code: 'NETWORK_ERROR',
      message: errorCodes.NETWORK_ERROR.message,
      action: errorCodes.NETWORK_ERROR.action,
      original: error.message
    };
  }

  const { status, data } = error.response;
  const code = data?.error?.code || data?.code || getCodeFromStatus(status);
  
  const errorInfo = errorCodes[code] || {
    message: data?.error?.message || data?.message || 'An unexpected error occurred',
    action: 'show_error'
  };

  return {
    code,
    status,
    message: data?.error?.message || errorInfo.message,
    action: errorInfo.action,
    details: data?.error?.details || null
  };
};

const getCodeFromStatus = (status) => {
  switch (status) {
    case 400: return 'VALIDATION_ERROR';
    case 401: return 'AUTH_TOKEN_INVALID';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'DUPLICATE_ENTRY';
    case 429: return 'RATE_LIMITED';
    default: return 'SERVER_ERROR';
  }
};

const mapSuccessMessage = (code) => {
  const successMessages = {
    USER_CREATED: 'Account created successfully!',
    USER_UPDATED: 'Profile updated successfully',
    LOGIN_SUCCESS: 'Welcome back!',
    LOGOUT_SUCCESS: 'You have been logged out',
    VISITOR_CREATED: 'Visitor registered successfully',
    VISITOR_APPROVED: 'Visitor approved',
    VISITOR_REJECTED: 'Visitor rejected',
    PASS_GENERATED: 'Access pass generated',
    INCIDENT_REPORTED: 'Incident reported successfully',
    INCIDENT_RESOLVED: 'Incident marked as resolved'
  };

  return successMessages[code] || 'Operation completed successfully';
};

const formatValidationErrors = (errors) => {
  if (!errors) return [];
  
  if (Array.isArray(errors)) {
    return errors.map(err => ({
      field: err.field || err.path,
      message: err.message || err.msg
    }));
  }

  if (typeof errors === 'object') {
    return Object.entries(errors).map(([field, message]) => ({
      field,
      message: Array.isArray(message) ? message[0] : message
    }));
  }

  return [{ field: 'general', message: String(errors) }];
};

describe('Error Mapper', () => {
  describe('handleApiError', () => {
    test('should handle network errors', () => {
      const error = new Error('Network Error');
      const result = handleApiError(error);
      
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.message).toContain('internet connection');
      expect(result.action).toBe('show_error');
    });

    test('should handle 401 unauthorized', () => {
      const error = {
        response: {
          status: 401,
          data: { error: { code: 'AUTH_TOKEN_EXPIRED' } }
        }
      };
      
      const result = handleApiError(error);
      expect(result.code).toBe('AUTH_TOKEN_EXPIRED');
      expect(result.action).toBe('redirect_login');
    });

    test('should handle 403 forbidden', () => {
      const error = {
        response: {
          status: 403,
          data: {}
        }
      };
      
      const result = handleApiError(error);
      expect(result.code).toBe('FORBIDDEN');
      expect(result.message).toContain('permission');
    });

    test('should handle 404 not found', () => {
      const error = {
        response: {
          status: 404,
          data: {}
        }
      };
      
      const result = handleApiError(error);
      expect(result.code).toBe('NOT_FOUND');
    });

    test('should handle 409 duplicate entry', () => {
      const error = {
        response: {
          status: 409,
          data: { error: { code: 'DUPLICATE_ENTRY' } }
        }
      };
      
      const result = handleApiError(error);
      expect(result.code).toBe('DUPLICATE_ENTRY');
      expect(result.message).toContain('already exists');
    });

    test('should handle 429 rate limited', () => {
      const error = {
        response: {
          status: 429,
          data: {}
        }
      };
      
      const result = handleApiError(error);
      expect(result.code).toBe('RATE_LIMITED');
      expect(result.message).toContain('Too many requests');
    });

    test('should handle 500 server error', () => {
      const error = {
        response: {
          status: 500,
          data: {}
        }
      };
      
      const result = handleApiError(error);
      expect(result.code).toBe('SERVER_ERROR');
    });

    test('should use custom error message from response', () => {
      const error = {
        response: {
          status: 400,
          data: { error: { message: 'Custom error message' } }
        }
      };
      
      const result = handleApiError(error);
      expect(result.message).toBe('Custom error message');
    });

    test('should include error details when present', () => {
      const error = {
        response: {
          status: 400,
          data: { 
            error: { 
              code: 'VALIDATION_ERROR',
              details: { field: 'email', reason: 'invalid' }
            } 
          }
        }
      };
      
      const result = handleApiError(error);
      expect(result.details).toEqual({ field: 'email', reason: 'invalid' });
    });
  });

  describe('getCodeFromStatus', () => {
    test.each([
      [400, 'VALIDATION_ERROR'],
      [401, 'AUTH_TOKEN_INVALID'],
      [403, 'FORBIDDEN'],
      [404, 'NOT_FOUND'],
      [409, 'DUPLICATE_ENTRY'],
      [429, 'RATE_LIMITED'],
      [500, 'SERVER_ERROR'],
      [502, 'SERVER_ERROR'],
      [503, 'SERVER_ERROR']
    ])('should map status %i to %s', (status, expectedCode) => {
      expect(getCodeFromStatus(status)).toBe(expectedCode);
    });
  });

  describe('mapSuccessMessage', () => {
    test('should return message for known code', () => {
      expect(mapSuccessMessage('USER_CREATED')).toBe('Account created successfully!');
    });

    test('should return message for login success', () => {
      expect(mapSuccessMessage('LOGIN_SUCCESS')).toBe('Welcome back!');
    });

    test('should return default message for unknown code', () => {
      expect(mapSuccessMessage('UNKNOWN_CODE')).toBe('Operation completed successfully');
    });

    test.each([
      ['VISITOR_CREATED', 'Visitor registered successfully'],
      ['VISITOR_APPROVED', 'Visitor approved'],
      ['PASS_GENERATED', 'Access pass generated'],
      ['INCIDENT_REPORTED', 'Incident reported successfully']
    ])('should return correct message for %s', (code, expected) => {
      expect(mapSuccessMessage(code)).toBe(expected);
    });
  });

  describe('formatValidationErrors', () => {
    test('should format array of errors', () => {
      const errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' }
      ];
      
      const result = formatValidationErrors(errors);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ field: 'email', message: 'Invalid email' });
    });

    test('should format object errors', () => {
      const errors = {
        email: 'Invalid email',
        password: 'Too short'
      };
      
      const result = formatValidationErrors(errors);
      expect(result).toHaveLength(2);
      expect(result.find(e => e.field === 'email')?.message).toBe('Invalid email');
    });

    test('should handle array messages in object', () => {
      const errors = {
        email: ['Invalid email', 'Already exists']
      };
      
      const result = formatValidationErrors(errors);
      expect(result[0].message).toBe('Invalid email');
    });

    test('should return empty array for null', () => {
      expect(formatValidationErrors(null)).toEqual([]);
    });

    test('should handle string error', () => {
      const result = formatValidationErrors('Something went wrong');
      expect(result).toEqual([{ field: 'general', message: 'Something went wrong' }]);
    });

    test('should handle path instead of field', () => {
      const errors = [{ path: 'email', msg: 'Invalid' }];
      const result = formatValidationErrors(errors);
      expect(result[0]).toEqual({ field: 'email', message: 'Invalid' });
    });
  });
});

describe('Error Code Categories', () => {
  test('should identify auth errors', () => {
    const authCodes = ['AUTH_TOKEN_MISSING', 'AUTH_TOKEN_EXPIRED', 'AUTH_TOKEN_INVALID', 'AUTH_USER_NOT_FOUND'];
    
    authCodes.forEach(code => {
      expect(errorCodes[code]).toBeDefined();
    });
  });

  test('should identify redirect actions', () => {
    const redirectCodes = Object.entries(errorCodes)
      .filter(([_, info]) => info.action === 'redirect_login')
      .map(([code]) => code);
    
    expect(redirectCodes).toContain('AUTH_TOKEN_MISSING');
    expect(redirectCodes).toContain('AUTH_TOKEN_EXPIRED');
  });

  test('should have user-friendly messages', () => {
    Object.values(errorCodes).forEach(info => {
      expect(info.message).toBeTruthy();
      expect(info.message.length).toBeGreaterThan(5);
      // Should not contain technical jargon
      expect(info.message).not.toMatch(/undefined|null|error/i);
    });
  });
});
