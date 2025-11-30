import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import attachRequestAudit from '../middleware/auditLogger.js';
import { checkOutVisitor } from '../controllers/visitorCheckInController.js';

const router = express.Router();

/**
 * Check-out routes for QR code scanning
 * These routes handle visitor check-out operations
 */

// Check-out visitor (typically used by guards with QR scanner)
router.post('/', authenticateToken, attachRequestAudit(), async (req, res) => {
  try {
    // Extract visitor ID from request body
    const { visitorId, checkOutTime, guardNotes } = req.body;
    
    if (!visitorId) {
      return res.status(400).json({
        success: false,
        message: 'Visitor ID is required',
        timestamp: new Date().toISOString()
      });
    }

    // Create a mock request object for the existing controller
    const mockReq = {
      ...req,
      params: { id: visitorId },
      body: { checkOutTime, guardNotes }
    };

    // Call the existing controller
    await checkOutVisitor(mockReq, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Check-out failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
