import { AppError } from './standardizedErrorHandler.js';
import loggingService from '../services/loggingService.js';

export const requireEstateContext = (req, res, next) => {
  if (!req.user || req.user.estate_id == null) {
    // Log estate requirement failure
    loggingService.logSecurity('warn', 'Estate access required but not provided', {
      code: 'ESTATE_REQUIRED',
      status: 403,
      request_id: req.headers['x-request-id'],
      user_id: req.user?.id ?? null,
      route: req.originalUrl,
      method: req.method
    });
    
    throw new AppError('Estate access required', 403, 'ESTATE_REQUIRED');
  }

  return next();
};

export default requireEstateContext;
