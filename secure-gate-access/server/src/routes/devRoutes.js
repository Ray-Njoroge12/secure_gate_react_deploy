import express from 'express';
import { requireRole, optionalAuth } from '../middleware/authMiddleware.js';
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
 * In demo mode, this is public for easy access
 */
router.get('/messages', requireDevMode, optionalAuth, (req, res) => {
    try {
        const messages = localMessageStore.getAll();
        const { type, limit } = req.query;
        
        let filtered = messages;
        
        // Filter by type if specified
        if (type && ['sms', 'email'].includes(type)) {
            filtered = filtered.filter(m => m.type === type);
        }
        
        // Limit results
        if (limit && !isNaN(parseInt(limit))) {
            filtered = filtered.slice(0, parseInt(limit));
        }
        
        successResponse(res, {
            messages: filtered,
            total: filtered.length,
            allTotal: messages.length
        }, 'Messages retrieved successfully');
    } catch (error) {
        errorResponse(res, 'Failed to retrieve messages', 'INTERNAL_ERROR', 500);
    }
});

/**
 * Get SMS messages only
 * GET /api/dev/sms
 */
router.get('/sms', requireDevMode, optionalAuth, (req, res) => {
    try {
        const messages = localMessageStore.getAll();
        const smsMessages = messages.filter(m => m.type === 'sms');
        
        successResponse(res, {
            messages: smsMessages,
            total: smsMessages.length
        }, 'SMS messages retrieved');
    } catch (error) {
        errorResponse(res, 'Failed to retrieve SMS messages', 'INTERNAL_ERROR', 500);
    }
});

/**
 * Get Email messages only
 * GET /api/dev/emails
 */
router.get('/emails', requireDevMode, optionalAuth, (req, res) => {
    try {
        const messages = localMessageStore.getAll();
        const emailMessages = messages.filter(m => m.type === 'email');
        
        successResponse(res, {
            messages: emailMessages,
            total: emailMessages.length
        }, 'Email messages retrieved');
    } catch (error) {
        errorResponse(res, 'Failed to retrieve email messages', 'INTERNAL_ERROR', 500);
    }
});

/**
 * Get messages for a specific phone number or email
 * GET /api/dev/messages/:recipient
 */
router.get('/messages/:recipient', requireDevMode, optionalAuth, (req, res) => {
    try {
        const { recipient } = req.params;
        const messages = localMessageStore.getAll();
        const filtered = messages.filter(m => 
            m.to && m.to.toLowerCase().includes(recipient.toLowerCase())
        );
        
        successResponse(res, {
            messages: filtered,
            recipient,
            total: filtered.length
        }, `Messages for ${recipient} retrieved`);
    } catch (error) {
        errorResponse(res, 'Failed to retrieve messages', 'INTERNAL_ERROR', 500);
    }
});

/**
 * Simulate receiving an SMS (for testing visitor flows)
 * POST /api/dev/simulate-sms
 * Body: { from: "+254...", message: "..." }
 */
router.post('/simulate-sms', requireDevMode, optionalAuth, async (req, res) => {
    try {
        const { from, message } = req.body;
        
        if (!from || !message) {
            return errorResponse(res, 'Both "from" and "message" are required', 'VALIDATION_ERROR', 400);
        }
        
        // Log the simulated incoming SMS
        console.log('\n' + '═'.repeat(60));
        console.log('📲 SIMULATED INCOMING SMS');
        console.log('═'.repeat(60));
        console.log(`From: ${from}`);
        console.log(`Message: ${message}`);
        console.log(`Time: ${new Date().toISOString()}`);
        console.log('═'.repeat(60) + '\n');
        
        // Store the incoming message
        await localMessageStore.save('sms_incoming', from, message, {
            direction: 'incoming',
            simulated: true
        });
        
        successResponse(res, {
            received: true,
            from,
            message,
            timestamp: new Date().toISOString()
        }, 'SMS reply simulated successfully');
    } catch (error) {
        errorResponse(res, 'Failed to simulate SMS', 'INTERNAL_ERROR', 500);
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

/**
 * Get demo credentials (only in dev mode)
 * GET /api/dev/demo-credentials
 */
router.get('/demo-credentials', requireDevMode, (req, res) => {
    const credentials = [
        { role: 'super_admin', username: 'super_admin', email: 'super.admin@securegate.demo', password: 'SuperAdmin@2026!' },
        { role: 'admin', username: 'admin_oakridge', email: 'admin@oakridge.demo', password: 'Admin@2026!' },
        { role: 'guard', username: 'guard_main', email: 'guard.main@oakridge.demo', password: 'Guard@2026!' },
        { role: 'guard', username: 'guard_back', email: 'guard.back@oakridge.demo', password: 'Guard@2026!' },
        { role: 'resident', username: 'john_resident', email: 'john.smith@resident.demo', password: 'Resident@2026!' },
        { role: 'resident', username: 'jane_resident', email: 'jane.doe@resident.demo', password: 'Resident@2026!' },
        { role: 'resident', username: 'mike_resident', email: 'mike.johnson@resident.demo', password: 'Resident@2026!' },
        { role: 'resident (pending)', username: 'pending_resident', email: 'pending@resident.demo', password: 'Pending@2026!' }
    ];
    
    successResponse(res, {
        credentials,
        services: {
            mailhog: 'http://localhost:8025',
            smsLog: '/api/dev/sms',
            allMessages: '/api/dev/messages'
        }
    }, 'Demo credentials retrieved');
});

/**
 * Health check for demo mode
 * GET /api/dev/status
 */
router.get('/status', requireDevMode, (req, res) => {
    successResponse(res, {
        mode: process.env.NODE_ENV,
        demoEnabled: true,
        mailhogUrl: 'http://localhost:8025',
        smsSimulation: true,
        timestamp: new Date().toISOString()
    }, 'Demo mode active');
});

export default router;
