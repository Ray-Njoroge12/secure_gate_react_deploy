import apiClient from './api';

/**
 * Collaboration Service
 * Handles cross-role collaboration features including messaging, workflows, and document sharing
 */
class CollaborationService {
  constructor() {
    this.baseURL = '/api/collaboration';
    this._intervals = [];
  }

  // ==================== MESSAGING METHODS ====================

  /**
   * Send a message to another user
   */
  async sendMessage(messageData) {
    try {
      const response = await apiClient.post(`${this.baseURL}/messages`, messageData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to send message');
    }
  }

  /**
   * Get messages for the current user
   */
  async getMessages(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, value);
        }
      });

      const response = await apiClient.get(`${this.baseURL}/messages?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to retrieve messages');
    }
  }

  /**
   * Mark a message as read
   */
  async markMessageAsRead(messageId) {
    try {
      const response = await apiClient.patch(`${this.baseURL}/messages/${messageId}/read`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to mark message as read');
    }
  }

  /**
   * Get available recipients for messaging
   */
  async getAvailableRecipients() {
    try {
      const response = await apiClient.get('/api/users?for_messaging=true');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to get available recipients');
    }
  }

  // ==================== WORKFLOW HANDOFF METHODS ====================

  /**
   * Create a workflow handoff
   */
  async createWorkflowHandoff(handoffData) {
    try {
      const response = await apiClient.post(`${this.baseURL}/handoffs`, handoffData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create workflow handoff');
    }
  }

  /**
   * Accept a workflow handoff
   */
  async acceptWorkflowHandoff(handoffId) {
    try {
      const response = await apiClient.patch(`${this.baseURL}/handoffs/${handoffId}/accept`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to accept workflow handoff');
    }
  }

  /**
   * Get workflow handoffs for the current user
   */
  async getWorkflowHandoffs(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, value);
        }
      });

      const response = await apiClient.get(`${this.baseURL}/handoffs?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to retrieve workflow handoffs');
    }
  }

  // ==================== APPROVAL WORKFLOW METHODS ====================

  /**
   * Create an approval workflow
   */
  async createApprovalWorkflow(workflowData) {
    try {
      const response = await apiClient.post(`${this.baseURL}/workflows`, workflowData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to create approval workflow');
    }
  }

  /**
   * Process an approval step (approve or reject)
   */
  async processApprovalStep(stepId, action, comments = null) {
    try {
      const response = await apiClient.patch(
        `${this.baseURL}/workflows/steps/${stepId}/${action}`,
        { comments }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || `Failed to ${action} approval step`);
    }
  }

  /**
   * Get approval workflows for the current user
   */
  async getApprovalWorkflows(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, value);
        }
      });

      const response = await apiClient.get(`${this.baseURL}/workflows?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to retrieve approval workflows');
    }
  }

  // ==================== DOCUMENT SHARING METHODS ====================

  /**
   * Share a document with specific users/roles
   */
  async shareDocument(documentData) {
    try {
      const response = await apiClient.post(`${this.baseURL}/documents`, documentData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to share document');
    }
  }

  /**
   * Get shared documents accessible to the current user
   */
  async getSharedDocuments(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, value);
        }
      });

      const response = await apiClient.get(`${this.baseURL}/documents?${params}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to retrieve shared documents');
    }
  }

  /**
   * Log document access for audit trail
   */
  async logDocumentAccess(documentId, action, metadata = {}) {
    try {
      const response = await apiClient.post(
        `${this.baseURL}/documents/${documentId}/access`,
        { action, metadata }
      );
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to log document access');
    }
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get collaboration statistics for dashboard
   */
  async getCollaborationStats() {
    try {
      const [messagesResponse, handoffsResponse, workflowsResponse] = await Promise.all([
        this.getMessages({ type: 'received', status: 'sent', limit: 1 }),
        this.getWorkflowHandoffs({ type: 'received', status: 'pending', limit: 1 }),
        this.getApprovalWorkflows({ type: 'pending_approval', limit: 1 })
      ]);

      return {
        unreadMessages: messagesResponse.messages?.length || 0,
        pendingHandoffs: handoffsResponse.handoffs?.length || 0,
        pendingApprovals: workflowsResponse.workflows?.length || 0
      };
    } catch (error) {
      console.error('Failed to get collaboration stats:', error);
      return {
        unreadMessages: 0,
        pendingHandoffs: 0,
        pendingApprovals: 0
      };
    }
  }

  /**
   * Search across collaboration content
   */
  async searchCollaborationContent(query, filters = {}) {
    try {
      const searchPromises = [];

      // Search messages
      if (!filters.type || filters.type === 'messages') {
        searchPromises.push(
          this.getMessages({ ...filters, search: query })
            .then(data => ({ type: 'messages', results: data.messages || [] }))
            .catch(() => ({ type: 'messages', results: [] }))
        );
      }

      // Search workflows
      if (!filters.type || filters.type === 'workflows') {
        searchPromises.push(
          this.getApprovalWorkflows({ ...filters, search: query })
            .then(data => ({ type: 'workflows', results: data.workflows || [] }))
            .catch(() => ({ type: 'workflows', results: [] }))
        );
      }

      // Search documents
      if (!filters.type || filters.type === 'documents') {
        searchPromises.push(
          this.getSharedDocuments({ ...filters, search: query })
            .then(data => ({ type: 'documents', results: data.documents || [] }))
            .catch(() => ({ type: 'documents', results: [] }))
        );
      }

      const results = await Promise.all(searchPromises);
      
      return results.reduce((acc, result) => {
        acc[result.type] = result.results;
        return acc;
      }, {});
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to search collaboration content');
    }
  }

  // ==================== REAL-TIME METHODS ====================

  /**
   * Subscribe to real-time collaboration updates
   */
  subscribeToUpdates(callback) {
    // This would integrate with WebSocket service
    // For now, we'll use polling as a fallback
    const pollInterval = setInterval(async () => {
      try {
        const stats = await this.getCollaborationStats();
        callback({ type: 'stats_update', data: stats });
      } catch (error) {
        console.error('Failed to poll collaboration updates:', error);
      }
    }, 30000); // Poll every 30 seconds
    this._intervals.push(pollInterval);

    return () => {
      clearInterval(pollInterval);
      this._intervals = this._intervals.filter(id => id !== pollInterval);
    };
  }

  // ==================== VALIDATION HELPERS ====================

  /**
   * Validate message data before sending
   */
  validateMessageData(messageData) {
    const errors = {};

    if (!messageData.recipientId) {
      errors.recipientId = 'Recipient is required';
    }

    if (!messageData.subject?.trim()) {
      errors.subject = 'Subject is required';
    }

    if (!messageData.content?.trim()) {
      errors.content = 'Message content is required';
    }

    if (messageData.subject && messageData.subject.length > 255) {
      errors.subject = 'Subject must be less than 255 characters';
    }

    if (messageData.content && messageData.content.length > 5000) {
      errors.content = 'Message content must be less than 5000 characters';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Validate workflow handoff data
   */
  validateHandoffData(handoffData) {
    const errors = {};

    if (!handoffData.toUserId) {
      errors.toUserId = 'Target user is required';
    }

    if (!handoffData.workflowType?.trim()) {
      errors.workflowType = 'Workflow type is required';
    }

    if (!handoffData.entityType?.trim()) {
      errors.entityType = 'Entity type is required';
    }

    if (!handoffData.entityId?.trim()) {
      errors.entityId = 'Entity ID is required';
    }

    if (!handoffData.contextData || typeof handoffData.contextData !== 'object') {
      errors.contextData = 'Context data is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Validate approval workflow data
   */
  validateApprovalWorkflowData(workflowData) {
    const errors = {};

    if (!workflowData.workflowName?.trim()) {
      errors.workflowName = 'Workflow name is required';
    }

    if (!workflowData.workflowType?.trim()) {
      errors.workflowType = 'Workflow type is required';
    }

    if (!workflowData.entityType?.trim()) {
      errors.entityType = 'Entity type is required';
    }

    if (!workflowData.entityId?.trim()) {
      errors.entityId = 'Entity ID is required';
    }

    if (!Array.isArray(workflowData.approvalSteps) || workflowData.approvalSteps.length === 0) {
      errors.approvalSteps = 'At least one approval step is required';
    } else {
      workflowData.approvalSteps.forEach((step, index) => {
        if (!step.stepName?.trim()) {
          errors[`approvalSteps.${index}.stepName`] = 'Step name is required';
        }
        if (!step.approverRole?.trim()) {
          errors[`approvalSteps.${index}.approverRole`] = 'Approver role is required';
        }
      });
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Validate document sharing data
   */
  validateDocumentData(documentData) {
    const errors = {};

    if (!documentData.documentName?.trim()) {
      errors.documentName = 'Document name is required';
    }

    if (!documentData.documentType?.trim()) {
      errors.documentType = 'Document type is required';
    }

    if (!documentData.filePath?.trim()) {
      errors.filePath = 'File path is required';
    }

    if (typeof documentData.fileSize !== 'number' || documentData.fileSize < 0) {
      errors.fileSize = 'Valid file size is required';
    }

    if (!documentData.mimeType?.trim()) {
      errors.mimeType = 'MIME type is required';
    }

    if (!Array.isArray(documentData.sharedWithRoles) && !Array.isArray(documentData.sharedWithUsers)) {
      errors.sharing = 'Document must be shared with at least one role or user';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  destroy() {
    (this._intervals || []).forEach(id => clearInterval(id));
    this._intervals = [];
  }
}

export const collaborationService = new CollaborationService();
export default collaborationService;