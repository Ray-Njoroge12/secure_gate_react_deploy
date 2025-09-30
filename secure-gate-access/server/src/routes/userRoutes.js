import express from 'express';
import { registerUser, loginUser, updateProfile, refreshToken, logoutUser } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { authRateLimit, registrationLimit, passwordResetLimit } from '../middleware/rateLimitMiddleware.js';
import { validateRequest, ValidationSchemas } from '../middleware/validationMiddleware.js';
import enhancedSessionManager from '../middleware/enhancedSessionMiddleware.js';

const router = express.Router();

// Authentication routes with validation
router.post('/register', 
  registrationLimit(), 
  validateRequest(ValidationSchemas.userRegistration),
  registerUser
);

router.post('/login', 
  authRateLimit(), 
  validateRequest(ValidationSchemas.userLogin),
  loginUser,
  enhancedSessionManager.loginSessionMiddleware()
);

router.post('/logout', logoutUser);

// Token management
router.post('/auth/refresh', refreshToken);

// Protected routes with validation
router.put('/profile', 
  authenticateToken, 
  validateRequest(ValidationSchemas.userProfileUpdate),
  updateProfile
);

export default router;
