import Joi from 'joi';

/**
 * Comprehensive input validation schemas for visitor management
 * Ensures data integrity and security for visitor operations
 */

// Kenya ID number validation
const kenyaIdSchema = Joi.string()
  .alphanum()
  .length(8)
  .required()
  .messages({
    'string.alphanum': 'ID number must contain only letters and numbers',
    'string.length': 'Kenya ID number must be exactly 8 characters'
  });

// Kenya phone number validation
const kenyaPhoneSchema = Joi.string()
  .pattern(/^\+254[0-9]{9}$/)
  .required()
  .messages({
    'string.pattern.base': 'Phone number must be in Kenya format (+254XXXXXXXXX)'
  });

// Create visitor schema
export const createVisitorSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes',
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name must not exceed 100 characters'
    }),
  
  email: Joi.string()
    .email({ tlds: { allow: true } })
    .lowercase()
    .max(255)
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'string.max': 'Email must not exceed 255 characters'
    }),
  
  phone: kenyaPhoneSchema,
  
  idNumber: kenyaIdSchema,
  
  company: Joi.string()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Company name must not exceed 100 characters'
    }),
  
  purpose: Joi.string()
    .valid('meeting', 'delivery', 'maintenance', 'interview', 'official', 'personal', 'other')
    .required()
    .messages({
      'any.only': 'Invalid visit purpose'
    }),
  
  purposeDetails: Joi.when('purpose', {
    is: 'other',
    then: Joi.string().min(5).max(500).required(),
    otherwise: Joi.string().max(500).optional()
  }).messages({
    'string.min': 'Please provide details for the visit purpose',
    'string.max': 'Purpose details must not exceed 500 characters'
  }),
  
  visitDate: Joi.date()
    .min('now')
    .max(Joi.ref('$maxDate'))
    .required()
    .messages({
      'date.min': 'Visit date cannot be in the past',
      'date.max': 'Visit date cannot be more than 90 days in the future'
    }),
  
  visitTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .required()
    .messages({
      'string.pattern.base': 'Visit time must be in 24-hour format (HH:MM)'
    }),
  
  expectedDuration: Joi.number()
    .integer()
    .min(15)
    .max(480)
    .optional()
    .default(60)
    .messages({
      'number.min': 'Visit duration must be at least 15 minutes',
      'number.max': 'Visit duration cannot exceed 8 hours (480 minutes)'
    }),
  
  hostId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.positive': 'Invalid host selection'
    }),
  
  vehicleRegistration: Joi.string()
    .pattern(/^K[A-Z]{2}\s?\d{3}[A-Z]?$/)
    .optional()
    .messages({
      'string.pattern.base': 'Vehicle registration must be in Kenya format (e.g., KAA 123A)'
    }),
  
  itemsCarried: Joi.array()
    .items(
      Joi.string()
        .max(100)
        .messages({
          'string.max': 'Item description must not exceed 100 characters'
        })
    )
    .max(10)
    .optional()
    .messages({
      'array.max': 'Cannot list more than 10 items'
    }),
  
  photoConsent: Joi.boolean()
    .required()
    .messages({
      'boolean.base': 'Photo consent must be specified'
    }),
  
  dataProcessingConsent: Joi.boolean()
    .valid(true)
    .required()
    .messages({
      'any.only': 'Data processing consent is required for visitor registration'
    })
}).options({ 
  stripUnknown: true,
  abortEarly: false,
  context: { 
    maxDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
  }
});

// Update visitor schema
export const updateVisitorSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Name can only contain letters, spaces, hyphens, and apostrophes'
    }),
  
  email: Joi.string()
    .email({ tlds: { allow: true } })
    .lowercase()
    .max(255)
    .optional(),
  
  phone: Joi.string()
    .pattern(/^\+254[0-9]{9}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Phone number must be in Kenya format (+254XXXXXXXXX)'
    }),
  
  company: Joi.string()
    .max(100)
    .optional(),
  
  visitDate: Joi.date()
    .min('now')
    .max(Joi.ref('$maxDate'))
    .optional()
    .messages({
      'date.min': 'Visit date cannot be in the past',
      'date.max': 'Visit date cannot be more than 90 days in the future'
    }),
  
  visitTime: Joi.string()
    .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional(),
  
  expectedDuration: Joi.number()
    .integer()
    .min(15)
    .max(480)
    .optional(),
  
  status: Joi.string()
    .valid('pending', 'approved', 'checked-in', 'checked-out', 'cancelled')
    .optional()
    .messages({
      'any.only': 'Invalid status'
    })
}).options({ 
  stripUnknown: true,
  abortEarly: false,
  context: { 
    maxDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  }
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

// Check-in validation schema
export const checkInSchema = Joi.object({
  visitorId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.positive': 'Invalid visitor ID'
    }),
  
  verificationCode: Joi.string()
    .alphanum()
    .length(6)
    .optional()
    .messages({
      'string.length': 'Verification code must be 6 characters'
    }),
  
  temperature: Joi.number()
    .min(35)
    .max(42)
    .precision(1)
    .optional()
    .messages({
      'number.min': 'Temperature reading seems incorrect',
      'number.max': 'Temperature reading seems incorrect'
    }),
  
  securityCheckPassed: Joi.boolean()
    .required()
    .messages({
      'boolean.base': 'Security check status must be specified'
    }),
  
  actualItemsCarried: Joi.array()
    .items(Joi.string().max(100))
    .max(20)
    .optional(),
  
  gateNumber: Joi.string()
    .max(20)
    .optional(),
  
  guardNotes: Joi.string()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Notes must not exceed 500 characters'
    })
}).options({ 
  stripUnknown: true,
  abortEarly: false 
});

// Check-out validation schema
export const checkOutSchema = Joi.object({
  visitorId: Joi.number()
    .integer()
    .positive()
    .required()
    .messages({
      'number.positive': 'Invalid visitor ID'
    }),
  
  itemsReturned: Joi.array()
    .items(Joi.string().max(100))
    .optional(),
  
  incidentReport: Joi.string()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Incident report must not exceed 1000 characters'
    }),
  
  guardNotes: Joi.string()
    .max(500)
    .optional()
}).options({ 
  stripUnknown: true,
  abortEarly: false 
});

// Search visitors schema
export const searchVisitorsSchema = Joi.object({
  query: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Search query must be at least 2 characters'
    }),
  
  status: Joi.string()
    .valid('pending', 'approved', 'checked-in', 'checked-out', 'cancelled', 'all')
    .optional()
    .default('all'),
  
  fromDate: Joi.date()
    .optional(),
  
  toDate: Joi.date()
    .min(Joi.ref('fromDate'))
    .optional()
    .messages({
      'date.min': 'End date must be after start date'
    }),
  
  hostId: Joi.number()
    .integer()
    .positive()
    .optional(),
  
  page: Joi.number()
    .integer()
    .min(1)
    .optional()
    .default(1),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .messages({
      'number.max': 'Cannot retrieve more than 100 records at once'
    }),
  
  sortBy: Joi.string()
    .valid('visitDate', 'name', 'status', 'createdAt')
    .optional()
    .default('visitDate'),
  
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .optional()
    .default('desc')
}).options({ 
  stripUnknown: true 
});

// Bulk invite schema
export const bulkInviteSchema = Joi.object({
  visitors: Joi.array()
    .items(createVisitorSchema)
    .min(1)
    .max(50)
    .required()
    .messages({
      'array.min': 'At least one visitor must be provided',
      'array.max': 'Cannot invite more than 50 visitors at once'
    }),
  
  sendNotifications: Joi.boolean()
    .optional()
    .default(true)
}).options({ 
  stripUnknown: true,
  abortEarly: false 
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
export const validateCreateVisitor = validate(createVisitorSchema);
export const validateUpdateVisitor = validate(updateVisitorSchema);
export const validateCheckIn = validate(checkInSchema);
export const validateCheckOut = validate(checkOutSchema);
export const validateSearchVisitors = validate(searchVisitorsSchema);
export const validateBulkInvite = validate(bulkInviteSchema);
