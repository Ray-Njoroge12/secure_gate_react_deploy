import Joi from 'joi';

/**
 * Comprehensive input validation schemas for authentication
 * Implements strong security requirements for Kenya DPA compliance
 */

// Password complexity requirements
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .required()
  .messages({
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters'
  });

// Email validation with additional security checks
const emailSchema = Joi.string()
  .email({ tlds: { allow: true } })
  .lowercase()
  .max(255)
  .required()
  .messages({
    'string.email': 'Please provide a valid email address',
    'string.max': 'Email must not exceed 255 characters'
  });

// Username validation - alphanumeric with underscores
const usernameSchema = Joi.string()
  .alphanum()
  .min(3)
  .max(30)
  .required()
  .messages({
    'string.alphanum': 'Username must contain only letters and numbers',
    'string.min': 'Username must be at least 3 characters long',
    'string.max': 'Username must not exceed 30 characters'
  });

// Registration validation schema
export const registerSchema = Joi.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .optional()
    .messages({
      'any.only': 'Passwords do not match'
    }),
  role: Joi.string()
    .valid('admin', 'resident', 'guard')
    .default('resident')
    .messages({
      'any.only': 'Invalid role specified'
    }),
  phone: Joi.string()
    .pattern(/^(\+254|0)[17]\d{8}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Phone number must be in Kenya format (+254XXXXXXXXX or 0XXXXXXXXX)'
    }),
  consent: Joi.boolean()
    .valid(true)
    .optional()
    .messages({
      'any.only': 'You must consent to data processing to register'
    }),
  estate_id: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.base': 'Estate ID must be a number',
      'number.min': 'Estate ID must be a positive number',
      'any.required': 'Estate ID is required'
    })
}).options({ 
  stripUnknown: true,  // Remove unknown fields for security
  abortEarly: false    // Return all validation errors
});

// Login validation schema - supports both 'username' and 'email' field names
export const loginSchema = Joi.object({
  // Accept either 'username' or 'email' field name for user identifier
  username: Joi.alternatives()
    .try(
      emailSchema,
      usernameSchema
    )
    .optional()
    .messages({
      'alternatives.match': 'Please provide a valid username or email'
    }),
  email: Joi.alternatives()
    .try(
      emailSchema,
      usernameSchema
    )
    .optional()
    .messages({
      'alternatives.match': 'Please provide a valid username or email'
    }),
  password: Joi.string()
    .min(1)
    .max(128)
    .required()
    .messages({
      'string.min': 'Password is required',
      'string.max': 'Password is too long'
    }),
  remember: Joi.boolean()
    .optional()
    .default(false)
  ,
  estate_id: Joi.number()
    .integer()
    .optional()
    .messages({
      'number.base': 'Estate ID must be a number'
    })
})
// Ensure at least one identifier is provided
.or('username', 'email')
.messages({
  'object.missing': 'Either username or email is required'
})
.options({ 
  stripUnknown: true,
  abortEarly: false 
});

// Password reset request schema
export const passwordResetRequestSchema = Joi.object({
  email: emailSchema
}).options({ 
  stripUnknown: true 
});

// Password reset schema
export const passwordResetSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Reset token is required'
    }),
  password: passwordSchema,
  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords do not match'
    })
}).options({ 
  stripUnknown: true,
  abortEarly: false 
});

// Refresh request schema (token optional to allow cookie-based refresh)
export const refreshSchema = Joi.object({
  refreshToken: Joi.string()
    .min(20)
    .optional()
    .messages({
      'string.min': 'Refresh token is invalid'
    })
}).options({
  stripUnknown: true,
  abortEarly: false
});

// Change password schema (for logged-in users)
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'Current password is required'
    }),
  newPassword: passwordSchema
    .invalid(Joi.ref('currentPassword'))
    .messages({
      'any.invalid': 'New password must be different from current password'
    }),
  confirmPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Passwords do not match'
    })
}).options({ 
  stripUnknown: true,
  abortEarly: false 
});

// Profile update schema
export const profileUpdateSchema = Joi.object({
  username: usernameSchema.optional(),
  email: emailSchema.optional(),
  phone: Joi.string()
    .pattern(/^\+254[0-9]{9}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Phone number must be in Kenya format (+254XXXXXXXXX)'
    }),
  firstName: Joi.string()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'First name can only contain letters, spaces, hyphens, and apostrophes'
    }),
  lastName: Joi.string()
    .min(1)
    .max(50)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Last name can only contain letters, spaces, hyphens, and apostrophes'
    }),
  address: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Address must not exceed 500 characters'
    })
}).options({ 
  stripUnknown: true,
  abortEarly: false 
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// Validation middleware factory
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));
      
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors,
        timestamp: new Date().toISOString()
      });
    }
    
    // Replace request body with sanitized values
    req.body = value;
    next();
  };
};

// Export validation middleware
export const validateRegistration = validate(registerSchema);
export const validateLogin = validate(loginSchema);
export const validatePasswordResetRequest = validate(passwordResetRequestSchema);
export const validatePasswordReset = validate(passwordResetSchema);
export const validateRefreshRequest = validate(refreshSchema);
export const validateChangePassword = validate(changePasswordSchema);
export const validateProfileUpdate = validate(profileUpdateSchema);
