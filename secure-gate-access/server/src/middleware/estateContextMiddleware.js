import { AppError } from './standardizedErrorHandler.js';

export const requireEstateContext = (req, res, next) => {
  if (!req.user || req.user.estate_id == null) {
    throw new AppError('Estate access required', 403, 'ESTATE_REQUIRED');
  }

  return next();
};

export default requireEstateContext;
