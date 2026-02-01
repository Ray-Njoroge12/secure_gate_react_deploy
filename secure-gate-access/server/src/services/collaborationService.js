import { dbManager } from '../database/db.enhanced.js';
import loggingService from './loggingService.js';
import { auditLog } from './auditService.js';

// Adapter: wrap auditLog as auditService.logAction for this module
const auditService = {
  logAction: (userId, action, entityType, entityId, details, ip, estateId) =>
    auditLog(userId, action, entityType, entityId, details, ip, estateId),
};

// Notification adapter - delegates to logging until full notification integration
const notificationService = {
  async sendNotification({ userId, type, title, message, data }) {
    loggingService.logInfo(`[NOTIFICATION] ${type}: ${title}`, { userId, message, data });
  },
};

/**
 * Collaboration Service
 * Handles cross-role collaboration features including messaging, workflows, and document sharing
 */
class CollaborationService {
  constructor() {
    this.name = 'CollaborationService';
  }

  // ==================== MESSAGING SYSTEM ====================

  /**
   * Send a message between users with role-appropriate visibility controls
   */
  async sendMessage(messageData, senderUser) {
    const {
      recipientId,
      subject,
      content,
      messageType = 'direct',
      priority = 'normal',
      visibilityScope = 'private',
      allowedRoles = [],
      parentMessageId = null,
      attachments = []
    } = messageData;

    try {
      // Validate recipient exists and is in same estate (unless super_admin)
      const recipient = await this.getUserById(recipientId);
      if (!recipient) {
        throw new Error('Recipient not found');
      }

      // Check if sender can message recipient based on roles
      if (!this.canSendMessage(senderUser, recipient)) {
        throw new Error('Insufficient permissions to send message to this user');
      }

      // Generate thread ID for new conversations
      let threadId = null;
      if (parentMessageId) {
        const parentMessage = await this.getMessageById(parentMessageId);
        threadId = parentMessage.thread_id || parentMessage.id;
      } else {
        threadId = await this.generateThreadId();
      }

      const messageId = await dbManager.query(
        `INSERT INTO messages (
          sender_id, recipient_id, estate_id, subject, content, 
          message_type, priority, visibility_scope, allowed_roles,
          parent_message_id, thread_id, attachments
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id`,
        [
          senderUser.id,
          recipientId,
          senderUser.estate_id,
          subject,
          content,
          messageType,
          priority,
          visibilityScope,
          allowedRoles,
          parentMessageId,
          threadId,
          JSON.stringify(attachments)
        ]
      );

      const message = await this.getMessageById(messageId.rows[0].id);

      // Send notification to recipient
      await this.notifyMessageRecipient(message, recipient);

      // Log the message sending
      await auditService.logAction(
        senderUser.id,
        'message_sent',
        'message',
        message.id,
        `Message sent to ${recipient.username}`,
        senderUser.estate_id
      );

      return message;
    } catch (error) {
      loggingService.logError('Failed to send message', error, {
        senderId: senderUser.id,
        recipientId,
        estateId: senderUser.estate_id
      });
      throw error;
    }
  }

  /**
   * Get messages for a user with proper filtering
   */
  async getMessages(userId, filters = {}) {
    const {
      type = 'all', // 'sent', 'received', 'all'
      status = null,
      threadId = null,
      page = 1,
      limit = 20
    } = filters;

    try {
      let whereClause = '';
      const params = [userId];
      let paramIndex = 2;

      if (type === 'sent') {
        whereClause = 'WHERE m.sender_id = $1';
      } else if (type === 'received') {
        whereClause = 'WHERE m.recipient_id = $1';
      } else {
        whereClause = 'WHERE (m.sender_id = $1 OR m.recipient_id = $1)';
      }

      if (status) {
        whereClause += ` AND m.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (threadId) {
        whereClause += ` AND m.thread_id = $${paramIndex}`;
        params.push(threadId);
        paramIndex++;
      }

      const offset = (page - 1) * limit;
      whereClause += ` ORDER BY m.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await dbManager.query(
        `SELECT 
          m.*,
          s.username as sender_username,
          s.role as sender_role,
          r.username as recipient_username,
          r.role as recipient_role
        FROM messages m
        LEFT JOIN users s ON m.sender_id = s.id
        LEFT JOIN users r ON m.recipient_id = r.id
        ${whereClause}`,
        params
      );

      return result.rows;
    } catch (error) {
      loggingService.logError('Failed to get messages', error, { userId });
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId, userId) {
    try {
      await dbManager.query(
        `UPDATE messages 
        SET status = 'read', read_at = NOW() 
        WHERE id = $1 AND recipient_id = $2`,
        [messageId, userId]
      );

      return true;
    } catch (error) {
      loggingService.logError('Failed to mark message as read', error, {
        messageId,
        userId
      });
      throw error;
    }
  }

  // ==================== WORKFLOW HANDOFFS ====================

  /**
   * Create a workflow handoff with context preservation
   */
  async createWorkflowHandoff(handoffData, fromUser) {
    const {
      toUserId,
      workflowType,
      entityType,
      entityId,
      contextData,
      handoffNotes,
      priority = 'normal'
    } = handoffData;

    try {
      // Validate target user
      const toUser = await this.getUserById(toUserId);
      if (!toUser || toUser.estate_id !== fromUser.estate_id) {
        throw new Error('Invalid target user for handoff');
      }

      const result = await dbManager.query(
        `INSERT INTO workflow_handoffs (
          estate_id, from_user_id, to_user_id, from_role, to_role,
          workflow_type, entity_type, entity_id, context_data,
          handoff_notes, priority
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
          fromUser.estate_id,
          fromUser.id,
          toUserId,
          fromUser.role,
          toUser.role,
          workflowType,
          entityType,
          entityId,
          JSON.stringify(contextData),
          handoffNotes,
          priority
        ]
      );

      const handoffId = result.rows[0].id;
      const handoff = await this.getWorkflowHandoffById(handoffId);

      // Notify the target user
      await this.notifyWorkflowHandoff(handoff, toUser);

      // Log the handoff
      await auditService.logAction(
        fromUser.id,
        'workflow_handoff_created',
        'workflow_handoff',
        handoffId,
        `Workflow handoff created for ${workflowType}`,
        fromUser.estate_id
      );

      return handoff;
    } catch (error) {
      loggingService.logError('Failed to create workflow handoff', error, {
        fromUserId: fromUser.id,
        toUserId,
        workflowType,
        entityType,
        entityId
      });
      throw error;
    }
  }

  /**
   * Accept a workflow handoff
   */
  async acceptWorkflowHandoff(handoffId, userId) {
    try {
      const handoff = await this.getWorkflowHandoffById(handoffId);
      
      if (!handoff || handoff.to_user_id !== userId) {
        throw new Error('Handoff not found or not authorized');
      }

      if (handoff.status !== 'pending') {
        throw new Error('Handoff is not in pending status');
      }

      await dbManager.query(
        `UPDATE workflow_handoffs 
        SET status = 'accepted', accepted_at = NOW() 
        WHERE id = $1`,
        [handoffId]
      );

      // Log the acceptance
      await auditService.logAction(
        userId,
        'workflow_handoff_accepted',
        'workflow_handoff',
        handoffId,
        'Workflow handoff accepted',
        handoff.estate_id
      );

      return await this.getWorkflowHandoffById(handoffId);
    } catch (error) {
      loggingService.logError('Failed to accept workflow handoff', error, {
        handoffId,
        userId
      });
      throw error;
    }
  }

  // ==================== APPROVAL WORKFLOWS ====================

  /**
   * Create an approval workflow
   */
  async createApprovalWorkflow(workflowData, requestedBy) {
    const {
      workflowName,
      workflowType,
      description,
      approvalSteps,
      entityType,
      entityId,
      expiresAt
    } = workflowData;

    try {
      const result = await dbManager.query(
        `INSERT INTO approval_workflows (
          estate_id, workflow_name, workflow_type, description,
          approval_steps, entity_type, entity_id, requested_by, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          requestedBy.estate_id,
          workflowName,
          workflowType,
          description,
          JSON.stringify(approvalSteps),
          entityType,
          entityId,
          requestedBy.id,
          expiresAt
        ]
      );

      const workflowId = result.rows[0].id;

      // Create individual approval steps
      for (let i = 0; i < approvalSteps.length; i++) {
        const step = approvalSteps[i];
        await dbManager.query(
          `INSERT INTO approval_steps (
            workflow_id, step_order, step_name, approver_role,
            approver_id, required, timeout_hours
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            workflowId,
            i + 1,
            step.stepName,
            step.approverRole,
            step.approverId || null,
            step.required !== false,
            step.timeoutHours || 24
          ]
        );
      }

      const workflow = await this.getApprovalWorkflowById(workflowId);

      // Notify first approver
      await this.notifyNextApprover(workflow);

      // Log workflow creation
      await auditService.logAction(
        requestedBy.id,
        'approval_workflow_created',
        'approval_workflow',
        workflowId,
        `Approval workflow created: ${workflowName}`,
        requestedBy.estate_id
      );

      return workflow;
    } catch (error) {
      loggingService.logError('Failed to create approval workflow', error, {
        workflowType,
        entityType,
        entityId,
        requestedBy: requestedBy.id
      });
      throw error;
    }
  }

  /**
   * Process approval step
   */
  async processApprovalStep(stepId, action, userId, comments = null) {
    if (!['approve', 'reject'].includes(action)) {
      throw new Error('Invalid approval action');
    }

    try {
      const step = await this.getApprovalStepById(stepId);
      if (!step) {
        throw new Error('Approval step not found');
      }

      // Validate user can approve this step
      if (step.approver_id && step.approver_id !== userId) {
        throw new Error('Not authorized to approve this step');
      }

      const user = await this.getUserById(userId);
      if (step.approver_role && user.role !== step.approver_role) {
        throw new Error('Role not authorized for this approval step');
      }

      // Update the step
      const status = action === 'approve' ? 'approved' : 'rejected';
      const timestampField = action === 'approve' ? 'approved_at' : 'rejected_at';

      await dbManager.query(
        `UPDATE approval_steps 
        SET status = $1, ${timestampField} = NOW(), comments = $2
        WHERE id = $3`,
        [status, comments, stepId]
      );

      // Update workflow status if needed
      await this.updateWorkflowStatus(step.workflow_id, action);

      // Log the approval action
      await auditService.logAction(
        userId,
        `approval_step_${action}d`,
        'approval_step',
        stepId,
        `Approval step ${action}d: ${step.step_name}`,
        user.estate_id
      );

      return await this.getApprovalStepById(stepId);
    } catch (error) {
      loggingService.logError('Failed to process approval step', error, {
        stepId,
        action,
        userId
      });
      throw error;
    }
  }

  // ==================== DOCUMENT SHARING ====================

  /**
   * Share a document with specific roles/users
   */
  async shareDocument(documentData, sharedBy) {
    const {
      documentName,
      documentType,
      filePath,
      fileSize,
      mimeType,
      sharedWithRoles = [],
      sharedWithUsers = [],
      accessLevel = 'read',
      downloadAllowed = true,
      printAllowed = true,
      description,
      tags = [],
      expiresAt
    } = documentData;

    try {
      const result = await dbManager.query(
        `INSERT INTO shared_documents (
          estate_id, document_name, document_type, file_path,
          file_size, mime_type, shared_by, shared_with_roles,
          shared_with_users, access_level, download_allowed,
          print_allowed, description, tags, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id`,
        [
          sharedBy.estate_id,
          documentName,
          documentType,
          filePath,
          fileSize,
          mimeType,
          sharedBy.id,
          sharedWithRoles,
          sharedWithUsers,
          accessLevel,
          downloadAllowed,
          printAllowed,
          description,
          tags,
          expiresAt
        ]
      );

      const documentId = result.rows[0].id;
      const document = await this.getSharedDocumentById(documentId);

      // Notify users who have access
      await this.notifyDocumentSharing(document, sharedBy);

      // Log document sharing
      await auditService.logAction(
        sharedBy.id,
        'document_shared',
        'shared_document',
        documentId,
        `Document shared: ${documentName}`,
        sharedBy.estate_id
      );

      return document;
    } catch (error) {
      loggingService.logError('Failed to share document', error, {
        documentName,
        sharedBy: sharedBy.id,
        estateId: sharedBy.estate_id
      });
      throw error;
    }
  }

  /**
   * Log document access for audit trail
   */
  async logDocumentAccess(documentId, userId, action, metadata = {}) {
    try {
      const user = await this.getUserById(userId);
      
      await dbManager.query(
        `INSERT INTO document_access_logs (
          document_id, user_id, estate_id, action, metadata
        ) VALUES ($1, $2, $3, $4, $5)`,
        [documentId, userId, user.estate_id, action, JSON.stringify(metadata)]
      );

      return true;
    } catch (error) {
      loggingService.logError('Failed to log document access', error, {
        documentId,
        userId,
        action
      });
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Check if user can send message to another user based on roles
   */
  canSendMessage(sender, recipient) {
    // Super admin can message anyone
    if (sender.role === 'super_admin') return true;
    
    // Users in same estate can message each other
    if (sender.estate_id === recipient.estate_id) return true;
    
    // Cross-estate messaging not allowed for regular users
    return false;
  }

  /**
   * Generate unique thread ID
   */
  async generateThreadId() {
    const result = await dbManager.query(
      'SELECT COALESCE(MAX(thread_id), 0) + 1 as next_thread_id FROM messages'
    );
    return result.rows[0].next_thread_id;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    const result = await dbManager.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0];
  }

  /**
   * Get message by ID
   */
  async getMessageById(messageId) {
    const result = await dbManager.query(
      `SELECT m.*, 
        s.username as sender_username, s.role as sender_role,
        r.username as recipient_username, r.role as recipient_role
      FROM messages m
      LEFT JOIN users s ON m.sender_id = s.id
      LEFT JOIN users r ON m.recipient_id = r.id
      WHERE m.id = $1`,
      [messageId]
    );
    return result.rows[0];
  }

  /**
   * Get workflow handoff by ID
   */
  async getWorkflowHandoffById(handoffId) {
    const result = await dbManager.query(
      `SELECT wh.*,
        fu.username as from_username,
        tu.username as to_username
      FROM workflow_handoffs wh
      LEFT JOIN users fu ON wh.from_user_id = fu.id
      LEFT JOIN users tu ON wh.to_user_id = tu.id
      WHERE wh.id = $1`,
      [handoffId]
    );
    return result.rows[0];
  }

  /**
   * Get approval workflow by ID
   */
  async getApprovalWorkflowById(workflowId) {
    const result = await dbManager.query(
      `SELECT aw.*,
        u.username as requested_by_username
      FROM approval_workflows aw
      LEFT JOIN users u ON aw.requested_by = u.id
      WHERE aw.id = $1`,
      [workflowId]
    );
    return result.rows[0];
  }

  /**
   * Get approval step by ID
   */
  async getApprovalStepById(stepId) {
    const result = await dbManager.query(
      'SELECT * FROM approval_steps WHERE id = $1',
      [stepId]
    );
    return result.rows[0];
  }

  /**
   * Get shared document by ID
   */
  async getSharedDocumentById(documentId) {
    const result = await dbManager.query(
      `SELECT sd.*,
        u.username as shared_by_username
      FROM shared_documents sd
      LEFT JOIN users u ON sd.shared_by = u.id
      WHERE sd.id = $1`,
      [documentId]
    );
    return result.rows[0];
  }

  /**
   * Notify message recipient
   */
  async notifyMessageRecipient(message, recipient) {
    try {
      await notificationService.sendNotification({
        userId: recipient.id,
        type: 'message_received',
        title: `New message: ${message.subject}`,
        message: `You have received a new message from ${message.sender_username}`,
        data: { messageId: message.id, threadId: message.thread_id }
      });
    } catch (error) {
      loggingService.logError('Failed to notify message recipient', error);
    }
  }

  /**
   * Notify workflow handoff
   */
  async notifyWorkflowHandoff(handoff, toUser) {
    try {
      await notificationService.sendNotification({
        userId: toUser.id,
        type: 'workflow_handoff',
        title: 'Workflow Handoff Received',
        message: `You have received a workflow handoff for ${handoff.workflow_type}`,
        data: { handoffId: handoff.id, workflowType: handoff.workflow_type }
      });
    } catch (error) {
      loggingService.logError('Failed to notify workflow handoff', error);
    }
  }

  /**
   * Notify next approver in workflow
   */
  async notifyNextApprover(workflow) {
    try {
      // Get next pending step
      const result = await dbManager.query(
        `SELECT * FROM approval_steps 
        WHERE workflow_id = $1 AND status = 'pending' 
        ORDER BY step_order LIMIT 1`,
        [workflow.id]
      );

      if (result.rows.length > 0) {
        const step = result.rows[0];
        if (step.approver_id) {
          await notificationService.sendNotification({
            userId: step.approver_id,
            type: 'approval_required',
            title: 'Approval Required',
            message: `Your approval is required for: ${workflow.workflow_name}`,
            data: { workflowId: workflow.id, stepId: step.id }
          });
        }
      }
    } catch (error) {
      loggingService.logError('Failed to notify next approver', error);
    }
  }

  /**
   * Notify document sharing
   */
  async notifyDocumentSharing(document, sharedBy) {
    try {
      // Notify users with direct access
      for (const userId of document.shared_with_users || []) {
        await notificationService.sendNotification({
          userId,
          type: 'document_shared',
          title: 'Document Shared',
          message: `${sharedBy.username} shared a document: ${document.document_name}`,
          data: { documentId: document.id }
        });
      }

      // Notify users by role (would need to query users by role)
      // This is a simplified version - in practice, you'd query users by role
    } catch (error) {
      loggingService.logError('Failed to notify document sharing', error);
    }
  }

  /**
   * Update workflow status based on step completion
   */
  async updateWorkflowStatus(workflowId, lastAction) {
    try {
      if (lastAction === 'reject') {
        // If any step is rejected, reject the entire workflow
        await dbManager.query(
          `UPDATE approval_workflows 
          SET status = 'rejected', rejected_at = NOW() 
          WHERE id = $1`,
          [workflowId]
        );
      } else {
        // Check if all required steps are approved
        const result = await dbManager.query(
          `SELECT COUNT(*) as total_required,
            COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count
          FROM approval_steps 
          WHERE workflow_id = $1 AND required = true`,
          [workflowId]
        );

        const { total_required, approved_count } = result.rows[0];
        
        if (parseInt(total_required) === parseInt(approved_count)) {
          await dbManager.query(
            `UPDATE approval_workflows 
            SET status = 'approved', approved_at = NOW() 
            WHERE id = $1`,
            [workflowId]
          );
        }
      }
    } catch (error) {
      loggingService.logError('Failed to update workflow status', error);
    }
  }

  // ==================== CONFLICT RESOLUTION ====================

  /**
   * Get conflicts with filtering and pagination
   */
  async getConflicts(filters = {}) {
    const {
      type = 'active',
      severity = null,
      page = 1,
      limit = 20,
      estateId
    } = filters;

    try {
      let whereClause = 'WHERE c.estate_id = $1';
      const params = [estateId];
      let paramIndex = 2;

      // Filter by type
      if (type === 'active') {
        whereClause += ` AND c.status IN ('active', 'escalated', 'mediation')`;
      } else if (type === 'resolved') {
        whereClause += ` AND c.status IN ('resolved', 'closed')`;
      } else if (type === 'my_conflicts') {
        whereClause += ` AND (c.reporter_id = $${paramIndex} OR c.assigned_mediator_id = $${paramIndex})`;
        params.push(filters.userId);
        paramIndex++;
      }

      // Filter by severity
      if (severity) {
        whereClause += ` AND c.severity = $${paramIndex}`;
        params.push(severity);
        paramIndex++;
      }

      const offset = (page - 1) * limit;
      whereClause += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await dbManager.query(
        `SELECT 
          c.*,
          r.username as reporter_username,
          m.username as assigned_mediator_username,
          rb.username as resolved_by_username
        FROM conflicts c
        LEFT JOIN users r ON c.reporter_id = r.id
        LEFT JOIN users m ON c.assigned_mediator_id = m.id
        LEFT JOIN users rb ON c.resolved_by = rb.id
        ${whereClause}`,
        params
      );

      return { conflicts: result.rows };
    } catch (error) {
      loggingService.logError('Failed to get conflicts', error);
      throw error;
    }
  }

  /**
   * Create a new conflict
   */
  async createConflict(conflictData, reportedBy) {
    const {
      title,
      description,
      conflictType,
      severity = 'medium',
      involvedParties = [],
      requestedMediator = null,
      urgentResolution = false
    } = conflictData;

    try {
      const result = await dbManager.query(
        `INSERT INTO conflicts (
          estate_id, title, description, conflict_type, severity,
          reporter_id, involved_parties, requested_mediator_id,
          urgent_resolution, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id`,
        [
          reportedBy.estate_id,
          title,
          description,
          conflictType,
          severity,
          reportedBy.id,
          involvedParties,
          requestedMediator,
          urgentResolution,
          'active'
        ]
      );

      const conflictId = result.rows[0].id;
      const conflict = await this.getConflictById(conflictId);

      // Auto-assign mediator if requested
      if (requestedMediator) {
        await this.assignMediator(conflictId, requestedMediator);
      }

      // Log conflict creation
      await auditService.logAction(
        reportedBy.id,
        'conflict_created',
        'conflict',
        conflictId,
        `Conflict reported: ${title}`,
        reportedBy.estate_id
      );

      return conflict;
    } catch (error) {
      loggingService.logError('Failed to create conflict', error);
      throw error;
    }
  }

  /**
   * Escalate a conflict
   */
  async escalateConflict({ conflictId, reason, escalatedBy }) {
    try {
      const conflict = await this.getConflictById(conflictId);
      if (!conflict) {
        throw new Error('Conflict not found');
      }

      const newLevel = conflict.escalation_level + 1;

      await dbManager.query(
        `UPDATE conflicts 
        SET escalation_level = $1, status = 'escalated', updated_at = NOW()
        WHERE id = $2`,
        [newLevel, conflictId]
      );

      // Add escalation history
      await dbManager.query(
        `INSERT INTO conflict_escalations (
          conflict_id, escalated_by, escalation_level, reason
        ) VALUES ($1, $2, $3, $4)`,
        [conflictId, escalatedBy, newLevel, reason]
      );

      // Log escalation
      await auditService.logAction(
        escalatedBy,
        'conflict_escalated',
        'conflict',
        conflictId,
        `Conflict escalated to level ${newLevel}`,
        conflict.estate_id
      );

      return await this.getConflictById(conflictId);
    } catch (error) {
      loggingService.logError('Failed to escalate conflict', error);
      throw error;
    }
  }

  /**
   * Resolve a conflict
   */
  async resolveConflict({ conflictId, resolutionType, resolutionNotes, resolvedBy }) {
    try {
      const conflict = await this.getConflictById(conflictId);
      if (!conflict) {
        throw new Error('Conflict not found');
      }

      await dbManager.query(
        `UPDATE conflicts 
        SET status = 'resolved', resolution_type = $1, resolution_notes = $2,
            resolved_by = $3, resolved_at = NOW(), updated_at = NOW()
        WHERE id = $4`,
        [resolutionType, resolutionNotes, resolvedBy, conflictId]
      );

      // Log resolution
      await auditService.logAction(
        resolvedBy,
        'conflict_resolved',
        'conflict',
        conflictId,
        `Conflict resolved: ${resolutionType}`,
        conflict.estate_id
      );

      return await this.getConflictById(conflictId);
    } catch (error) {
      loggingService.logError('Failed to resolve conflict', error);
      throw error;
    }
  }

  /**
   * Get conflict by ID
   */
  async getConflictById(conflictId) {
    try {
      const result = await dbManager.query(
        `SELECT 
          c.*,
          r.username as reporter_username,
          m.username as assigned_mediator_username,
          rb.username as resolved_by_username
        FROM conflicts c
        LEFT JOIN users r ON c.reporter_id = r.id
        LEFT JOIN users m ON c.assigned_mediator_id = m.id
        LEFT JOIN users rb ON c.resolved_by = rb.id
        WHERE c.id = $1`,
        [conflictId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const conflict = result.rows[0];

      // Get escalation history
      const escalationResult = await dbManager.query(
        `SELECT ce.*, u.username as escalated_by_username
        FROM conflict_escalations ce
        LEFT JOIN users u ON ce.escalated_by = u.id
        WHERE ce.conflict_id = $1
        ORDER BY ce.escalated_at ASC`,
        [conflictId]
      );

      conflict.escalation_history = escalationResult.rows;

      return conflict;
    } catch (error) {
      loggingService.logError('Failed to get conflict by ID', error);
      throw error;
    }
  }

  /**
   * Get available users for conflict assignment
   */
  async getAvailableUsers(estateId = null) {
    try {
      let whereClause = '';
      const params = [];

      if (estateId) {
        whereClause = 'WHERE estate_id = $1 AND account_status = \'active\'';
        params.push(estateId);
      } else {
        whereClause = 'WHERE account_status = \'active\'';
      }

      const result = await dbManager.query(
        `SELECT id, username, email, role, estate_id
        FROM users 
        ${whereClause}
        ORDER BY username`,
        params
      );

      return { users: result.rows };
    } catch (error) {
      loggingService.logError('Failed to get available users', error);
      throw error;
    }
  }

  // ==================== TEAM COORDINATION ====================

  /**
   * Get shared calendars for an estate
   */
  async getSharedCalendars(estateId) {
    try {
      const result = await dbManager.query(
        `SELECT sc.*, u.username as owner_username
        FROM shared_calendars sc
        LEFT JOIN users u ON sc.owner_id = u.id
        WHERE sc.estate_id = $1 AND sc.active = true
        ORDER BY sc.calendar_name`,
        [estateId]
      );

      return { calendars: result.rows };
    } catch (error) {
      loggingService.logError('Failed to get shared calendars', error);
      throw error;
    }
  }

  /**
   * Get calendar events with filtering
   */
  async getCalendarEvents(filters = {}) {
    const {
      estateId,
      startDate,
      endDate,
      calendars = [],
      roles = [],
      eventTypes = []
    } = filters;

    try {
      let whereClause = 'WHERE ce.estate_id = $1';
      const params = [estateId];
      let paramIndex = 2;

      // Date range filter
      if (startDate) {
        whereClause += ` AND ce.start_time >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        whereClause += ` AND ce.end_time <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      // Calendar filter
      if (calendars.length > 0) {
        whereClause += ` AND ce.calendar_id = ANY($${paramIndex})`;
        params.push(calendars);
        paramIndex++;
      }

      // Event type filter (stored in metadata)
      if (eventTypes.length > 0) {
        whereClause += ` AND ce.metadata->>'event_type' = ANY($${paramIndex})`;
        params.push(eventTypes);
        paramIndex++;
      }

      const result = await dbManager.query(
        `SELECT 
          ce.*,
          sc.calendar_name,
          sc.color as calendar_color,
          u.username as organizer_username
        FROM calendar_events ce
        LEFT JOIN shared_calendars sc ON ce.calendar_id = sc.id
        LEFT JOIN users u ON ce.organizer_id = u.id
        ${whereClause}
        ORDER BY ce.start_time ASC`,
        params
      );

      return { events: result.rows };
    } catch (error) {
      loggingService.logError('Failed to get calendar events', error);
      throw error;
    }
  }

  /**
   * Get team availability for a specific date
   */
  async getTeamAvailability({ estateId, date }) {
    try {
      // Get all users in the estate
      const usersResult = await dbManager.query(
        `SELECT id, username, role, account_status
        FROM users 
        WHERE estate_id = $1 AND account_status = 'active'
        ORDER BY role, username`,
        [estateId]
      );

      const users = usersResult.rows;
      const availability = {};

      // Group users by role
      for (const user of users) {
        if (!availability[user.role]) {
          availability[user.role] = [];
        }

        // Get user's events for the day
        const eventsResult = await dbManager.query(
          `SELECT ce.*, sc.calendar_name
          FROM calendar_events ce
          LEFT JOIN shared_calendars sc ON ce.calendar_id = sc.id
          WHERE ce.estate_id = $1 
            AND (ce.organizer_id = $2 OR ce.attendees::jsonb ? $3)
            AND DATE(ce.start_time) = DATE($4)
          ORDER BY ce.start_time`,
          [estateId, user.id, user.id.toString(), date]
        );

        const userEvents = eventsResult.rows;
        const now = new Date();
        const currentEvent = userEvents.find(event => 
          new Date(event.start_time) <= now && new Date(event.end_time) >= now
        );
        const nextEvent = userEvents.find(event => 
          new Date(event.start_time) > now
        );

        // Determine availability status
        const isOnShift = currentEvent && 
          (currentEvent.title.toLowerCase().includes('shift') || 
           currentEvent.metadata?.event_type === 'shift');
        const hasEvents = userEvents.length > 0;
        const isAvailable = !currentEvent && user.account_status === 'active';

        availability[user.role].push({
          ...user,
          isOnShift,
          hasEvents,
          isAvailable,
          currentEvent,
          nextEvent,
          eventsCount: userEvents.length
        });
      }

      return { availability };
    } catch (error) {
      loggingService.logError('Failed to get team availability', error);
      throw error;
    }
  }

  /**
   * Create a calendar event
   */
  async createCalendarEvent(eventData) {
    const {
      calendarId,
      title,
      description = '',
      location = '',
      startTime,
      endTime,
      allDay = false,
      attendees = [],
      reminders = [],
      organizerId,
      estateId
    } = eventData;

    try {
      const result = await dbManager.query(
        `INSERT INTO calendar_events (
          calendar_id, estate_id, title, description, location,
          start_time, end_time, all_day, organizer_id, attendees, reminders
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id`,
        [
          calendarId,
          estateId,
          title,
          description,
          location,
          startTime,
          endTime,
          allDay,
          organizerId,
          JSON.stringify(attendees),
          JSON.stringify(reminders)
        ]
      );

      const eventId = result.rows[0].id;
      const event = await this.getCalendarEventById(eventId);

      // Log event creation
      await auditService.logAction(
        organizerId,
        'calendar_event_created',
        'calendar_event',
        eventId,
        `Calendar event created: ${title}`,
        estateId
      );

      return event;
    } catch (error) {
      loggingService.logError('Failed to create calendar event', error);
      throw error;
    }
  }

  /**
   * Update a calendar event
   */
  async updateCalendarEvent({ eventId, ...eventData }) {
    try {
      const event = await this.getCalendarEventById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      const updateFields = [];
      const params = [];
      let paramIndex = 1;

      // Build dynamic update query
      for (const [key, value] of Object.entries(eventData)) {
        if (value !== undefined) {
          const dbField = key === 'startTime' ? 'start_time' :
                         key === 'endTime' ? 'end_time' :
                         key === 'allDay' ? 'all_day' :
                         key === 'calendarId' ? 'calendar_id' : key;
          
          updateFields.push(`${dbField} = $${paramIndex}`);
          params.push(typeof value === 'object' ? JSON.stringify(value) : value);
          paramIndex++;
        }
      }

      if (updateFields.length > 0) {
        updateFields.push(`updated_at = NOW()`);
        params.push(eventId);

        await dbManager.query(
          `UPDATE calendar_events SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
          params
        );
      }

      return await this.getCalendarEventById(eventId);
    } catch (error) {
      loggingService.logError('Failed to update calendar event', error);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteCalendarEvent(eventId) {
    try {
      const event = await this.getCalendarEventById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      await dbManager.query('DELETE FROM calendar_events WHERE id = $1', [eventId]);

      // Log event deletion
      await auditService.logAction(
        event.organizer_id,
        'calendar_event_deleted',
        'calendar_event',
        eventId,
        `Calendar event deleted: ${event.title}`,
        event.estate_id
      );

      return true;
    } catch (error) {
      loggingService.logError('Failed to delete calendar event', error);
      throw error;
    }
  }

  /**
   * Get calendar event by ID
   */
  async getCalendarEventById(eventId) {
    try {
      const result = await dbManager.query(
        `SELECT 
          ce.*,
          sc.calendar_name,
          sc.color as calendar_color,
          u.username as organizer_username
        FROM calendar_events ce
        LEFT JOIN shared_calendars sc ON ce.calendar_id = sc.id
        LEFT JOIN users u ON ce.organizer_id = u.id
        WHERE ce.id = $1`,
        [eventId]
      );

      return result.rows[0] || null;
    } catch (error) {
      loggingService.logError('Failed to get calendar event by ID', error);
      throw error;
    }
  }

  /**
   * Find optimal meeting times (smart scheduling)
   */
  async findOptimalMeetingTimes({ attendees, date, duration, workingHours }) {
    try {
      const suggestions = [];
      const startHour = parseInt(workingHours.start.split(':')[0]);
      const endHour = parseInt(workingHours.end.split(':')[0]);
      
      // Generate time slots for the day
      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const startTime = new Date(date);
          startTime.setHours(hour, minute, 0, 0);
          
          const endTime = new Date(startTime);
          endTime.setMinutes(endTime.getMinutes() + duration);
          
          // Check if end time is within working hours
          if (endTime.getHours() >= endHour) {
            continue;
          }

          // Check attendee availability
          const conflicts = [];
          const availableAttendees = [];

          for (const attendeeId of attendees) {
            const hasConflict = await this.checkUserConflict(attendeeId, startTime, endTime);
            
            if (hasConflict) {
              conflicts.push({
                userId: attendeeId,
                username: hasConflict.username,
                reason: hasConflict.reason
              });
            } else {
              availableAttendees.push({ userId: attendeeId });
            }
          }

          // Calculate score based on availability
          const availabilityScore = (availableAttendees.length / attendees.length) * 100;
          
          // Only include suggestions with at least 50% availability
          if (availabilityScore >= 50) {
            suggestions.push({
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              score: Math.round(availabilityScore),
              conflicts,
              availableAttendees
            });
          }
        }
      }

      // Sort by score (highest first) and return top 5
      return suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    } catch (error) {
      loggingService.logError('Failed to find optimal meeting times', error);
      throw error;
    }
  }

  /**
   * Check if user has conflict at specific time
   */
  async checkUserConflict(userId, startTime, endTime) {
    try {
      const result = await dbManager.query(
        `SELECT ce.title, ce.start_time, ce.end_time, u.username
        FROM calendar_events ce
        LEFT JOIN users u ON ce.organizer_id = u.id
        WHERE (ce.organizer_id = $1 OR ce.attendees::jsonb ? $2)
          AND ce.start_time < $4 AND ce.end_time > $3
        LIMIT 1`,
        [userId, userId.toString(), startTime, endTime]
      );

      if (result.rows.length > 0) {
        const conflict = result.rows[0];
        return {
          username: conflict.username,
          reason: `Busy: ${conflict.title}`
        };
      }

      return null;
    } catch (error) {
      loggingService.logError('Failed to check user conflict', error);
      return null;
    }
  }
}

export const collaborationService = new CollaborationService();