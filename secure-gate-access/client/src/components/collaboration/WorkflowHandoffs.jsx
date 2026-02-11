import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collaborationService } from '../../services/collaborationService';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import './WorkflowHandoffs.css';
import Button from '../ui/Button';

const WorkflowHandoffs = ({ className = '' }) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('received');
  const [selectedHandoff, setSelectedHandoff] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [handoffFilters, setHandoffFilters] = useState({
    type: 'received',
    status: null,
    page: 1,
    limit: 20
  });

  // Fetch handoffs
  const { 
    data: handoffsData, 
    isLoading: handoffsLoading, 
    error: handoffsError 
  } = useQuery({
    queryKey: ['workflow-handoffs', handoffFilters],
    queryFn: () => collaborationService.getWorkflowHandoffs(handoffFilters),
    refetchInterval: 30000,
    staleTime: 10000
  });

  // Accept handoff mutation
  const acceptHandoffMutation = useMutation({
    mutationFn: collaborationService.acceptWorkflowHandoff,
    onSuccess: () => {
      queryClient.invalidateQueries(['workflow-handoffs']);
      showNotification('Workflow handoff accepted successfully', 'success');
      setSelectedHandoff(null);
    },
    onError: (error) => {
      showNotification(error.message || 'Failed to accept handoff', 'error');
    }
  });

  // Create handoff mutation
  const createHandoffMutation = useMutation({
    mutationFn: collaborationService.createWorkflowHandoff,
    onSuccess: () => {
      queryClient.invalidateQueries(['workflow-handoffs']);
      setIsCreating(false);
      showNotification('Workflow handoff created successfully', 'success');
    },
    onError: (error) => {
      showNotification(error.message || 'Failed to create handoff', 'error');
    }
  });

  const handoffs = handoffsData?.handoffs || [];

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedHandoff(null);
    
    const newFilters = { ...handoffFilters, page: 1 };
    
    switch (tab) {
      case 'received':
        newFilters.type = 'received';
        break;
      case 'sent':
        newFilters.type = 'sent';
        break;
      case 'all':
        newFilters.type = 'all';
        break;
      default:
        newFilters.type = 'received';
    }
    
    setHandoffFilters(newFilters);
  };

  const handleHandoffSelect = (handoff) => {
    setSelectedHandoff(handoff);
  };

  const handleAcceptHandoff = (handoffId) => {
    acceptHandoffMutation.mutate(handoffId);
  };

  const handleCreateHandoff = () => {
    setIsCreating(true);
    setSelectedHandoff(null);
  };

  if (handoffsError) {
    return (
      <div className={`workflow-handoffs error ${className}`}>
        <div className="error-message">
          <h3>Unable to load workflow handoffs</h3>
          <p>{handoffsError.message}</p>
          <Button 
            onClick={() => queryClient.invalidateQueries(['workflow-handoffs'])}
            className="retry-button"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`workflow-handoffs ${className}`}>
      <div className="handoffs-header">
        <h2>Workflow Handoffs</h2>
        <Button 
          onClick={handleCreateHandoff}
          className="create-button primary"
          isLoading={createHandoffMutation.isPending}
        >
          <span className="icon">🔄</span>
          Create Handoff
        </Button>
      </div>

      <div className="handoffs-tabs">
        <Button
          className={`tab ${activeTab === 'received' ? 'active' : ''}`}
          onClick={() => handleTabChange('received')}
        >
          Received
          {handoffs.filter(h => h.to_user_id === user.id && h.status === 'pending').length > 0 && (
            <span className="pending-count">
              {handoffs.filter(h => h.to_user_id === user.id && h.status === 'pending').length}
            </span>
          )}
        </Button>
        <Button
          className={`tab ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => handleTabChange('sent')}
        >
          Sent
        </Button>
        <Button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          All Handoffs
        </Button>
      </div>

      <div className="handoffs-content">
        <div className="handoff-list">
          {handoffsLoading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading handoffs...</p>
            </div>
          ) : handoffs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔄</div>
              <h3>No handoffs</h3>
              <p>
                {activeTab === 'received' 
                  ? "You don't have any workflow handoffs to review."
                  : activeTab === 'sent'
                  ? "You haven't created any workflow handoffs yet."
                  : "No workflow handoffs found."
                }
              </p>
            </div>
          ) : (
            <div className="handoff-items">
              {handoffs.map((handoff) => (
                <HandoffItem
                  key={handoff.id}
                  handoff={handoff}
                  currentUser={user}
                  isSelected={selectedHandoff?.id === handoff.id}
                  onClick={() => handleHandoffSelect(handoff)}
                  onAccept={() => handleAcceptHandoff(handoff.id)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="handoff-detail">
          {isCreating ? (
            <CreateHandoff
              onSend={(handoffData) => createHandoffMutation.mutate(handoffData)}
              onCancel={() => {
                setIsCreating(false);
                setSelectedHandoff(null);
              }}
              isLoading={createHandoffMutation.isPending}
            />
          ) : selectedHandoff ? (
            <HandoffDetail
              handoff={selectedHandoff}
              currentUser={user}
              onAccept={() => handleAcceptHandoff(selectedHandoff.id)}
              isAccepting={acceptHandoffMutation.isPending}
            />
          ) : (
            <div className="no-selection">
              <div className="no-selection-icon">🔄</div>
              <h3>Select a handoff</h3>
              <p>Choose a workflow handoff from the list to view its details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const HandoffItem = ({ handoff, currentUser, isSelected, onClick, onAccept }) => {
  const isReceived = handoff.to_user_id === currentUser.id;
  const isPending = handoff.status === 'pending';
  const displayName = isReceived ? handoff.from_username : handoff.to_username;
  const displayRole = isReceived ? handoff.from_role : handoff.to_role;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div 
      className={`handoff-item ${isSelected ? 'selected' : ''} ${isPending ? 'pending' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-pressed={isSelected}
    >
      <div className="handoff-avatar">
        <div className={`avatar ${displayRole}`}>
          {displayName?.charAt(0).toUpperCase()}
        </div>
      </div>
      
      <div className="handoff-content">
        <div className="handoff-header">
          <span className="user-name">{displayName}</span>
          <span className="user-role">({displayRole})</span>
          <span className="handoff-time">
            {new Date(handoff.created_at).toLocaleDateString()}
          </span>
        </div>
        
        <div className="handoff-workflow">
          {handoff.priority !== 'normal' && (
            <span className={`priority-badge ${handoff.priority}`}>
              {handoff.priority.toUpperCase()}
            </span>
          )}
          <span className="workflow-type">{handoff.workflow_type}</span>
        </div>
        
        <div className="handoff-entity">
          {handoff.entity_type}: {handoff.entity_id}
        </div>
      </div>

      <div className="handoff-actions">
        <span className={`status-badge ${handoff.status}`}>
          {handoff.status}
        </span>
        {isReceived && isPending && (
          <Button
            className="accept-button"
            onClick={(e) => {
              e.stopPropagation();
              onAccept();
            }}
            title="Accept Handoff"
          >
            ✓
          </Button>
        )}
      </div>
    </div>
  );
};

const HandoffDetail = ({ handoff, currentUser, onAccept, isAccepting }) => {
  const isReceived = handoff.to_user_id === currentUser.id;
  const isPending = handoff.status === 'pending';
  const displayName = isReceived ? handoff.from_username : handoff.to_username;
  const displayRole = isReceived ? handoff.from_role : handoff.to_role;

  return (
    <div className="handoff-detail-content">
      <div className="handoff-detail-header">
        <div className="handoff-info">
          <h3>{handoff.workflow_type}</h3>
          <div className="handoff-meta">
            <span className="from-to">
              {isReceived ? 'From' : 'To'}: {displayName} ({displayRole})
            </span>
            <span className="timestamp">
              {new Date(handoff.created_at).toLocaleString()}
            </span>
            {handoff.priority !== 'normal' && (
              <span className={`priority-badge ${handoff.priority}`}>
                {handoff.priority.toUpperCase()}
              </span>
            )}
            <span className={`status-badge ${handoff.status}`}>
              {handoff.status}
            </span>
          </div>
        </div>
        
        {isReceived && isPending && (
          <div className="handoff-actions">
            <Button
              onClick={onAccept}
              className="accept-button primary"
              disabled={isAccepting}
            >
              {isAccepting ? 'Accepting...' : 'Accept Handoff'}
            </Button>
          </div>
        )}
      </div>

      <div className="handoff-body">
        <div className="entity-info">
          <h4>Entity Information</h4>
          <p><strong>Type:</strong> {handoff.entity_type}</p>
          <p><strong>ID:</strong> {handoff.entity_id}</p>
        </div>

        {handoff.handoff_notes && (
          <div className="handoff-notes">
            <h4>Handoff Notes</h4>
            <div className="notes-text">
              {handoff.handoff_notes.split('\n').map((line, index) => (
                <p key={index}>{line}</p>
              ))}
            </div>
          </div>
        )}

        {handoff.context_data && Object.keys(handoff.context_data).length > 0 && (
          <div className="context-data">
            <h4>Context Data</h4>
            <div className="context-items">
              {Object.entries(handoff.context_data).map(([key, value]) => (
                <div key={key} className="context-item">
                  <span className="context-key">{key}:</span>
                  <span className="context-value">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const CreateHandoff = ({ onSend, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    toUserId: '',
    workflowType: '',
    entityType: '',
    entityId: '',
    contextData: '{}',
    handoffNotes: '',
    priority: 'normal'
  });

  const [errors, setErrors] = useState({});
  const { data: usersData } = useQuery({
    queryKey: ['users', 'for-handoffs'],
    queryFn: () => collaborationService.getAvailableRecipients(),
    staleTime: 300000
  });

  const users = usersData?.users || [];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.toUserId) {
      newErrors.toUserId = 'Please select a recipient';
    }
    if (!formData.workflowType.trim()) {
      newErrors.workflowType = 'Workflow type is required';
    }
    if (!formData.entityType.trim()) {
      newErrors.entityType = 'Entity type is required';
    }
    if (!formData.entityId.trim()) {
      newErrors.entityId = 'Entity ID is required';
    }

    // Validate JSON context data
    try {
      JSON.parse(formData.contextData);
    } catch (e) {
      newErrors.contextData = 'Context data must be valid JSON';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const handoffData = {
      ...formData,
      toUserId: parseInt(formData.toUserId),
      contextData: JSON.parse(formData.contextData)
    };

    onSend(handoffData);
  };

  return (
    <div className="create-handoff">
      <div className="create-header">
        <h3>Create Workflow Handoff</h3>
        <Button onClick={onCancel} className="close-button" aria-label="Close">×</Button>
      </div>

      <form onSubmit={handleSubmit} className="create-form">
        <div className="form-group">
          <label htmlFor="toUser">To:</label>
          <select
            id="toUser"
            value={formData.toUserId}
            onChange={(e) => handleInputChange('toUserId', e.target.value)}
            className={errors.toUserId ? 'error' : ''}
          >
            <option value="">Select recipient...</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.username} ({user.role})
              </option>
            ))}
          </select>
          {errors.toUserId && <span className="error-text">{errors.toUserId}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="workflowType">Workflow Type:</label>
            <input
              type="text"
              id="workflowType"
              value={formData.workflowType}
              onChange={(e) => handleInputChange('workflowType', e.target.value)}
              className={errors.workflowType ? 'error' : ''}
              placeholder="e.g., visitor_approval"
            />
            {errors.workflowType && <span className="error-text">{errors.workflowType}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="priority">Priority:</label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="entityType">Entity Type:</label>
            <input
              type="text"
              id="entityType"
              value={formData.entityType}
              onChange={(e) => handleInputChange('entityType', e.target.value)}
              className={errors.entityType ? 'error' : ''}
              placeholder="e.g., visitor, incident"
            />
            {errors.entityType && <span className="error-text">{errors.entityType}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="entityId">Entity ID:</label>
            <input
              type="text"
              id="entityId"
              value={formData.entityId}
              onChange={(e) => handleInputChange('entityId', e.target.value)}
              className={errors.entityId ? 'error' : ''}
              placeholder="e.g., 123, VIS-001"
            />
            {errors.entityId && <span className="error-text">{errors.entityId}</span>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="contextData">Context Data (JSON):</label>
          <textarea
            id="contextData"
            value={formData.contextData}
            onChange={(e) => handleInputChange('contextData', e.target.value)}
            className={errors.contextData ? 'error' : ''}
            placeholder='{"key": "value"}'
            rows={4}
          />
          {errors.contextData && <span className="error-text">{errors.contextData}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="handoffNotes">Handoff Notes:</label>
          <textarea
            id="handoffNotes"
            value={formData.handoffNotes}
            onChange={(e) => handleInputChange('handoffNotes', e.target.value)}
            placeholder="Additional notes for the handoff recipient"
            rows={4}
          />
        </div>

        <div className="form-actions">
          <Button
            type="button"
            onClick={onCancel}
            className="cancel-button"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="send-button primary"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Handoff'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default WorkflowHandoffs;