import { validationResult } from 'express-validator';

export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('[VALIDATION] Validation errors:', JSON.stringify(errors.array(), null, 2));
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  console.log('[VALIDATION] Validation passed');
  next();
}
