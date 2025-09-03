import express from 'express';
import { updateProfile } from '../controllers/userController.js';

const router = express.Router();

// Update user profile
router.put('/profile', updateProfile);

export default router;
