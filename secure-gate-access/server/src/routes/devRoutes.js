import express from 'express';
import { requireRole } from '../middleware/authMiddleware.js';
import localMessageStore from '../services/localMessageStore.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';

const router = express.Router();

// Middleware to ensure we are in a safe environment
const requireDevMode = (req, res, next) => {
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEV_ROUTES !== 'true') {
        return errorResponse(res, 'Development routes are disabled', 'FORBIDDEN', 403);
    }
    next();
};

/**
 * Get all stored local messages (SMS/Email)
 * GET /api/dev/messages
 */
router.get('/messages', requireDevMode, requireRole(['admin', 'super_admin']), (req, res) => {
    try {
        const messages = localMessageStore.getAll();
        successResponse(res, messages, 'Messages retrieved successfully');
    } catch (error) {
        errorResponse(res, 'Failed to retrieve messages', 'INTERNAL_ERROR', 500);
    }
});

/**
 * Clear stored messages
 * DELETE /api/dev/messages
 */
router.delete('/messages', requireDevMode, requireRole(['admin', 'super_admin']), (req, res) => {
    try {
        localMessageStore.clear();
        successResponse(res, null, 'Message history cleared');
    } catch (error) {
        errorResponse(res, 'Failed to clear history', 'INTERNAL_ERROR', 500);
    }
});

export default router;
