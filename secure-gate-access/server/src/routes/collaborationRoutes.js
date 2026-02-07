import express from 'express';
import { collaborationService } from '../services/collaborationService.js';
import { authenticateToken, requireRole, requireEstate } from '../middleware/authMiddleware.js';
import { requireRolePolicy } from '../middleware/rolePolicy.js';
import { validateRequest as validateInput } from '../middleware/validationMiddleware.js';
import { successResponse, errorResponse } from '../utils/responseUtils.js';
import loggingService from '../services/loggingService.js';
import Joi from 'joi';

const router = express.Router();

// ==================== MESSAGE ROUTES ====================

// Validation schemas
const sendMessageSchema = Joi.object({
  recipientId: Joi.number().integer().positive().required(),
  subject: Joi.string().min(1).max(255).required(),
  content: Joi.string().min(1).max(5000).required(),
  messageType: Joi.string().valid('direct', 'broadcast', 'workflow', 'system').default('direct'),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal'),
  visibilityScope: Joi.string().valid('private', 'role', 'estate', 'public').default('private'),
  allowedRoles: Joi.array().items(Joi.string()).default([]),
  parentMessageId: Joi.number().integer().positive().optional(),
  attachments: Joi.array().items(Joi.object()).default([])
});

const getMessagesSchema = Joi.object({
  type: Joi.string().valid('sent', 'received', 'all').default('all'),
  status: Joi.string().valid('draft', 'sent', 'delivered', 'read', 'archived').optional(),
  threadId: Joi.number().integer().positive().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

// Send message
router.post('/messages', 
  authenticateToken, 
  requireEstate,
  validateInput(sendMessageSchema),
  async (req, res) => {
    try {
      const message = await collaborationService.sendMessage(req.body, req.user);
      
      loggingService.logInfo('Message sent successfully', {
        messageId: message.id,
        senderId: req.user.id,
        recipientId: req.body.recipientId,
        estateId: req.user.estate_id
      });

      successResponse(res, { message }, 'Message sent successfully', 201);
    } catch (error) {
      loggingService.logError('Failed to send message', error, {
        senderId: req.user.id,
        recipientId: req.body.recipientId,
        estateId: req.user.estate_id
      });
      errorResponse(res, error.message, 'MESSAGE_SEND_FAILED', 400);
    }
  }
);

// Get messages
router.get('/messages',
  authenticateToken,
  requireEstate,
  validateInput(getMessagesSchema, 'query'),
  async (req, res) => {
    try {
      const messages = await collaborationService.getMessages(req.user.id, req.query);
      
      successResponse(res, { messages }, 'Messages retrieved successfully');
    } catch (error) {
      loggingService.logError('Failed to get messages', error, {
        userId: req.user.id,
        estateId: req.user.estate_id
      });
      errorResponse(res, error.message, 'MESSAGE_RETRIEVAL_FAILED', 400);
    }
  }
);

// Mark message as read
router.patch('/messages/:messageId/read',
  authenticateToken,
  requireEstate,
  async (req, res) => {
    try {
      const { messageId } = req.params;
      await collaborationService.markMessageAsRead(messageId, req.user.id);
      
      successResponse(res, null, 'Message marked as read');
    } catch (error) {
      loggingService.logError('Failed to mark message as read', error, {
        messageId: req.params.messageId,
        userId: req.user.id
      });
      errorResponse(res, error.message, 'MESSAGE_READ_FAILED', 400);
    }
  }
);

// ==================== WORKFLOW HANDOFF ROUTES ====================

const createHandoffSchema = Joi.object({
  toUserId: Joi.number().integer().positive().required(),
  workflowType: Joi.string().min(1).max(100).required(),
  entityType: Joi.string().min(1).max(50).required(),
  entityId: Joi.string().min(1).max(100).required(),
  contextData: Joi.object().required(),
  handoffNotes: Joi.string().max(1000).optional(),
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal')
});

// Create workflow handoff
router.post('/handoffs',
  authenticateToken,
  requireEstate,
  validateInput(createHandoffSchema),
  async (req, res) => {
    try {
      const handoff = await collaborationService.createWorkflowHandoff(req.body, req.user);
      
      loggingService.logInfo('Workflow handoff created', {
        handoffId: handoff.id,
        fromUserId: req.user.id,
        toUserId: req.body.toUserId,
        workflowType: req.body.workflowType,
        estateId: req.user.estate_id
      });

      successResponse(res, { handoff }, 'Workflow handoff created successfully', 201);
    } catch (error) {
      loggingService.logError('Failed to create workflow handoff', error, {
        fromUserId: req.user.id,
        toUserId: req.body.toUserId,
        workflowType: req.body.workflowType
      });
      errorResponse(res, error.message, 'HANDOFF_CREATION_FAILED', 400);
    }
  }
);

// Accept workflow handoff
router.patch('/handoffs/:handoffId/accept',
  authenticateToken,
  requireEstate,
  async (req, res) => {
    try {
      const { handoffId } = req.params;
      const handoff = await collaborationService.acceptWorkflowHandoff(handoffId, req.user.id);
      
      loggingService.logInfo('Workflow handoff accepted', {
        handoffId,
        userId: req.user.id,
        estateId: req.user.estate_id
      });

      successResponse(res, { handoff }, 'Workflow handoff accepted successfully');
    } catch (error) {
      loggingService.logError('Failed to accept workflow handoff', error, {
        handoffId: req.params.handoffId,
        userId: req.user.id
      });
      errorResponse(res, error.message, 'HANDOFF_ACCEPTANCE_FAILED', 400);
    }
  }
);

// Get user's handoffs
router.get('/handoffs',
  authenticateToken,
  requireEstate,
  async (req, res) => {
    try {
      const { type = 'received', status = null, page = 1, limit = 20 } = req.query;
      
      let whereClause = '';
      const params = [req.user.estate_id];
      let paramIndex = 2;

      if (type === 'sent') {
        whereClause = 'WHERE wh.from_user_id = $2 AND wh.estate_id = $1';
        params.push(req.user.id);
        paramIndex = 3;
      } else if (type === 'received') {
        whereClause = 'WHERE wh.to_user_id = $2 AND wh.estate_id = $1';
        params.push(req.user.id);
        paramIndex = 3;
      } else {
        whereClause = 'WHERE (wh.from_user_id = $2 OR wh.to_user_id = $2) AND wh.estate_id = $1';
        params.push(req.user.id);
        paramIndex = 3;
      }

      if (status) {
        whereClause += ` AND wh.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      const offset = (page - 1) * limit;
      whereClause += ` ORDER BY wh.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await collaborationService.dbManager.query(
        `SELECT wh.*,
          fu.username as from_username,
          tu.username as to_username
        FROM workflow_handoffs wh
        LEFT JOIN users fu ON wh.from_user_id = fu.id
        LEFT JOIN users tu ON wh.to_user_id = tu.id
        ${whereClause}`,
        params
      );

      successResponse(res, { handoffs: result.rows }, 'Handoffs retrieved successfully');
    } catch (error) {
      loggingService.logError('Failed to get handoffs', error, {
        userId: req.user.id,
        estateId: req.user.estate_id
      });
      errorResponse(res, error.message, 'HANDOFF_RETRIEVAL_FAILED', 400);
    }
  }
);

// ==================== APPROVAL WORKFLOW ROUTES ====================

const createApprovalWorkflowSchema = Joi.object({
  workflowName: Joi.string().min(1).max(255).required(),
  workflowType: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(1000).optional(),
  approvalSteps: Joi.array().items(Joi.object({
    stepName: Joi.string().required(),
    approverRole: Joi.string().required(),
    approverId: Joi.number().integer().positive().optional(),
    required: Joi.boolean().default(true),
    timeoutHours: Joi.number().integer().min(1).max(168).default(24)
  })).min(1).required(),
  entityType: Joi.string().min(1).max(50).required(),
  entityId: Joi.string().min(1).max(100).required(),
  expiresAt: Joi.date().greater('now').optional()
});

// Create approval workflow
router.post('/workflows',
  authenticateToken,
  requireEstate,
  requireRolePolicy('adminOnly'),
  validateInput(createApprovalWorkflowSchema),
  async (req, res) => {
    try {
      const workflow = await collaborationService.createApprovalWorkflow(req.body, req.user);
      
      loggingService.logInfo('Approval workflow created', {
        workflowId: workflow.id,
        workflowType: req.body.workflowType,
        requestedBy: req.user.id,
        estateId: req.user.estate_id
      });

      successResponse(res, { workflow }, 'Approval workflow created successfully', 201);
    } catch (error) {
      loggingService.logError('Failed to create approval workflow', error, {
        workflowType: req.body.workflowType,
        requestedBy: req.user.id
      });
      errorResponse(res, error.message, 'WORKFLOW_CREATION_FAILED', 400);
    }
  }
);

// Process approval step
router.patch('/workflows/steps/:stepId/:action',
  authenticateToken,
  requireEstate,
  async (req, res) => {
    try {
      const { stepId, action } = req.params;
      const { comments } = req.body;

      if (!['approve', 'reject'].includes(action)) {
        return errorResponse(res, 'Invalid action', 'INVALID_ACTION', 400);
      }

      const step = await collaborationService.processApprovalStep(stepId, action, req.user.id, comments);
      
      loggingService.logInfo(`Approval step ${action}d`, {
        stepId,
        action,
        userId: req.user.id,
        estateId: req.user.estate_id
      });

      successResponse(res, { step }, `Approval step ${action}d successfully`);
    } catch (error) {
      loggingService.logError(`Failed to ${req.params.action} approval step`, error, {
        stepId: req.params.stepId,
        action: req.params.action,
        userId: req.user.id
      });
      errorResponse(res, error.message, 'APPROVAL_PROCESSING_FAILED', 400);
    }
  }
);

// Get user's approval workflows
router.get('/workflows',
  authenticateToken,
  requireEstate,
  async (req, res) => {
    try {
      const { status = null, type = 'all', page = 1, limit = 20 } = req.query;
      
      let whereClause = 'WHERE aw.estate_id = $1';
      const params = [req.user.estate_id];
      let paramIndex = 2;

      if (type === 'requested') {
        whereClause += ` AND aw.requested_by = $${paramIndex}`;
        params.push(req.user.id);
        paramIndex++;
      } else if (type === 'pending_approval') {
        // Get workflows where user has pending approval steps
        whereClause += ` AND EXISTS (
          SELECT 1 FROM approval_steps ast 
          WHERE ast.workflow_id = aw.id 
          AND ast.status = 'pending' 
          AND (ast.approver_id = $${paramIndex} OR ast.approver_role = $${paramIndex + 1})
        )`;
        params.push(req.user.id, req.user.role);
        paramIndex += 2;
      }

      if (status) {
        whereClause += ` AND aw.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      const offset = (page - 1) * limit;
      whereClause += ` ORDER BY aw.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await collaborationService.dbManager.query(
        `SELECT aw.*,
          u.username as requested_by_username
        FROM approval_workflows aw
        LEFT JOIN users u ON aw.requested_by = u.id
        ${whereClause}`,
        params
      );

      successResponse(res, { workflows: result.rows }, 'Workflows retrieved successfully');
    } catch (error) {
      loggingService.logError('Failed to get workflows', error, {
        userId: req.user.id,
        estateId: req.user.estate_id
      });
      errorResponse(res, error.message, 'WORKFLOW_RETRIEVAL_FAILED', 400);
    }
  }
);

// ==================== DOCUMENT SHARING ROUTES ====================

const shareDocumentSchema = Joi.object({
  documentName: Joi.string().min(1).max(255).required(),
  documentType: Joi.string().min(1).max(100).required(),
  filePath: Joi.string().required(),
  fileSize: Joi.number().integer().min(0).required(),
  mimeType: Joi.string().required(),
  sharedWithRoles: Joi.array().items(Joi.string()).default([]),
  sharedWithUsers: Joi.array().items(Joi.number().integer().positive()).default([]),
  accessLevel: Joi.string().valid('read', 'comment', 'edit', 'admin').default('read'),
  downloadAllowed: Joi.boolean().default(true),
  printAllowed: Joi.boolean().default(true),
  description: Joi.string().max(1000).optional(),
  tags: Joi.array().items(Joi.string()).default([]),
  expiresAt: Joi.date().greater('now').optional()
});

// Share document
router.post('/documents',
  authenticateToken,
  requireEstate,
  validateInput(shareDocumentSchema),
  async (req, res) => {
    try {
      const document = await collaborationService.shareDocument(req.body, req.user);
      
      loggingService.logInfo('Document shared', {
        documentId: document.id,
        documentName: req.body.documentName,
        sharedBy: req.user.id,
        estateId: req.user.estate_id
      });

      successResponse(res, { document }, 'Document shared successfully', 201);
    } catch (error) {
      loggingService.logError('Failed to share document', error, {
        documentName: req.body.documentName,
        sharedBy: req.user.id
      });
      errorResponse(res, error.message, 'DOCUMENT_SHARING_FAILED', 400);
    }
  }
);

// Get shared documents
router.get('/documents',
  authenticateToken,
  requireEstate,
  async (req, res) => {
    try {
      const { type = 'accessible', status = 'active', page = 1, limit = 20 } = req.query;
      
      let whereClause = 'WHERE sd.estate_id = $1 AND sd.status = $2';
      const params = [req.user.estate_id, status];
      let paramIndex = 3;

      if (type === 'shared_by_me') {
        whereClause += ` AND sd.shared_by = $${paramIndex}`;
        params.push(req.user.id);
        paramIndex++;
      } else if (type === 'accessible') {
        // Documents accessible to user (by role or direct sharing)
        whereClause += ` AND (
          $${paramIndex} = ANY(sd.shared_with_users) OR 
          $${paramIndex + 1} = ANY(sd.shared_with_roles) OR
          sd.shared_by = $${paramIndex}
        )`;
        params.push(req.user.id, req.user.role);
        paramIndex += 2;
      }

      const offset = (page - 1) * limit;
      whereClause += ` ORDER BY sd.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await collaborationService.dbManager.query(
        `SELECT sd.*,
          u.username as shared_by_username
        FROM shared_documents sd
        LEFT JOIN users u ON sd.shared_by = u.id
        ${whereClause}`,
        params
      );

      successResponse(res, { documents: result.rows }, 'Documents retrieved successfully');
    } catch (error) {
      loggingService.logError('Failed to get documents', error, {
        userId: req.user.id,
        estateId: req.user.estate_id
      });
      errorResponse(res, error.message, 'DOCUMENT_RETRIEVAL_FAILED', 400);
    }
  }
);

// Log document access
router.post('/documents/:documentId/access',
  authenticateToken,
  requireEstate,
  async (req, res) => {
    try {
      const { documentId } = req.params;
      const { action, metadata = {} } = req.body;

      await collaborationService.logDocumentAccess(documentId, req.user.id, action, {
        ...metadata,
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      successResponse(res, null, 'Document access logged');
    } catch (error) {
      loggingService.logError('Failed to log document access', error, {
        documentId: req.params.documentId,
        userId: req.user.id,
        action: req.body.action
      });
      errorResponse(res, error.message, 'DOCUMENT_ACCESS_LOG_FAILED', 400);
    }
  }
);

export default router;