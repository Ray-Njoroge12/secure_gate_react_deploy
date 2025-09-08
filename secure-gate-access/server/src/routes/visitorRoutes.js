import express from 'express';
import { createVisitor, getMyVisitors, createPass, bulkInvite, getBulkInvite, completeInvite } from '../controllers/visitorController.js';
import { attachUser } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected routes (resident-auth required)
router.post('/', attachUser, createVisitor);
router.get('/', attachUser, getMyVisitors);
router.post('/:visitorId/pass', attachUser, createPass);
router.post('/bulk-invite', attachUser, bulkInvite);

// Public routes (guests)
router.get('/bulk-invite/:inviteCode', getBulkInvite);
router.post('/complete/:inviteCode', completeInvite);

export default router;
