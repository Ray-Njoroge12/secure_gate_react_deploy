import { Router } from 'express';
import { registerUser, loginUser, updateProfile } from '../controllers/userController.js';

const router = Router();

// Register
router.post('/register', registerUser);
// Login
router.post('/login', loginUser);
// Update profile
router.put('/profile', updateProfile);

export default router;
