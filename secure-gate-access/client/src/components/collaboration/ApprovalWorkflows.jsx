import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collaborationService } from '../../services/collaborationService';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import './ApprovalWorkflows.css';
import Button from '../ui/Button';

const ApprovalWorkflows = ({ className = '' }) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('pending_approval');
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [workflowFilters, setWorkflowFilters] = useState({
    type: 'pending_approval',
    status: null,
    page: 1,
    limit: 20
  });

  // Fetch workflows
  const { 
    data: workflowsData, 
    isLoading: workflowsLoading, 
    error: workflowsError 
  } = useQuery({
    queryKey: ['approval-workflows', workflowFilters],
    queryFn: () => collaborationService.getApprovalWorkflows(workflowFilters),
    refetchInterval: 30000,
    staleTime: 10000
  });

  // Process approval step mutation
  const processApprovalMutation = useMutation({
    mutationFn: ({ stepId, action, comments }) => 
      collaborationService.processApprovalStep(stepId, action, comments),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['approval-workflows']);
      showNotification(
        `Approval step ${variables.action}d successfully`, 
        'success'
      );
      setSelectedWorkflow(null);
    },
    onError: (error) => {
      showNotification(error.message || 'Failed to process approval', 'error');
    }
  });

  // Create workflow mutation
  const createWorkflowMutation = useMutation({
    mutationFn: collaborationService.createApprovalWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries(['approval-workflows']);
      setIsCreating(false);
      showNotification('Approval workflow created successfully', 'success');
    },
    onError: (error) => {
      showNotification(error.message || 'Failed to create workflow', 'error');
    }
  });

  const workflows = workflowsData?.workflows || [];

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedWorkflow(null);
    
    const newFilters = { ...workflowFilters, page: 1 };
    
    switch (tab) {
      case 'pending_approval':
        newFilters.type = 'pending_approval';
        break;
      case 'requested':
        newFilters.type = 'requested';
        break;
      case 'all':
        newFilters.type = 'all';
        break;
      default:
        newFilters.type = 'pending_approval';
    }
    
    setWorkflowFilters(newFilters);
  };

  const handleWorkflowSelect = (workflow) => {
    setSelectedWorkflow(workflow);
  };

  const handleProcessApproval = (stepId, action, comments = null) => {
    processApprovalMutation.mutate({ stepId, action, comments });
  };

  const handleCreateWorkflow = () => {
    setIsCreating(true);
    setSelectedWorkflow(null);
  };

  if (workflowsError) {
    return (
      <div className={`approval-workflows error ${className}`}>
        <div className="error-message">
          <h3>Unable to load approval workflows</h3>
          <p>{workflowsError.message}</p>
          <Button 
            onClick={() => queryClient.invalidateQueries(['approval-workflows'])}
            className="retry-button"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`approval-workflows ${className}`}>
      <div className="workflows-header">
        <h2>Approval Workflows</h2>
        {(user.role === 'admin' || user.role === 'super_admin') && (
          <Button 
            onClick={handleCreateWorkflow}
            className="create-button primary"
            disabled={createWorkflowMutation.isPending}
          >
            <span className="icon">📋</span>
            Create Workflow
          </Button>
        )}
      </div>

      <div className="workflows-tabs">
        <Button
          className={`tab ${activeTab === 'pending_approval' ? 'active' : ''}`}
          onClick={() => handleTabChange('pending_approval')}
        >
          Pending Approval
          {workflows.filter(w => w.status === 'pending').length > 0 && (
            <span className="pending-count">
              {workflows.filter(w => w.status === 'pending').length}
            </span>
          )}
        </Button>
        <Button
          className={`tab ${activeTab === 'requested' ? 'active' : ''}`}
          onClick={() => handleTabChange('requested')}
        >
          My Requests
        </Button>
        <Button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          All Workflows
        </Button>
      </div>

      <div className="workflows-content">
        <div className="workflow-list">
          {workflowsLoading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading workflows...</p>
            </div>
          ) : workflows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No workflows</h3>
              <p>
                {activeTab === 'pending_approval' 
                  ? "You don't have any workflows pending your approval."
                  : activeTab === 'requested'
                  ? "You haven't requested any approval workflows yet."
                  : "No approval workflows found."
                }
              </p>
            </div>
          ) : (
            <div className="workflow-items">
              {workflows.map((workflow) => (
                <WorkflowItem
                  key={workflow.id}
                  workflow={workflow}
                  currentUser={user}
                  isSelected={selectedWorkflow?.id === workflow.id}
                  onClick={() => handleWorkflowSelect(workflow)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="workflow-detail">
          {isCreating ? (
            <CreateWorkflow
              onSend={(workflowData) => createWorkflowMutation.mutate(workflowData)}
              onCancel={() => {
                setIsCreating(false);
                setSelectedWorkflow(null);
              }}
              isLoading={createWorkflowMutation.isPending}
            />
          ) : selectedWorkflow ? (
            <WorkflowDetail
              workflow={selectedWorkflow}
              currentUser={user}
              onProcessApproval={handleProcessApproval}
              isProcessing={processApprovalMutation.isPending}
            />
          ) : (
            <div className="no-selection">
              <div className="no-selection-icon">📋</div>
              <h3>Select a workflow</h3>
              <p>Choose an approval workflow from the list to view its details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const WorkflowItem = ({ workflow, currentUser, isSelected, onClick }) => {
  const isRequested = workflow.requested_by === currentUser.id;
  const isPending = workflow.status === 'pending';
  const statusColor = {
    pending: 'orange',
    approved: 'green',
    rejected: 'red',
    cancelled: 'gray',
    expired: 'gray'
  }[workflow.status] || 'gray';

  return (
    <div 
      className={`workflow-item ${isSelected ? 'selected' : ''} ${isPending ? 'pending' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-pressed={isSelected}
    >
      <div className="workflow-icon">
        <div className={`icon ${workflow.workflow_type}`}>
          📋
        </div>
      </div>
      
      <div className="workflow-content">
        <div className="workflow-header">
          <span className="workflow-name">{workflow.workflow_name}</span>
          <span className="workflow-time">
            {new Date(workflow.created_at).toLocaleDateString()}
          </span>
        </div>
        
        <div className="workflow-type">
          <span className="type-badge">{workflow.workflow_type}</span>
          {isRequested && <span className="requested-badge">Requested by me</span>}
        </div>
        
        <div className="workflow-entity">
          {workflow.entity_type}: {workflow.entity_id}
        </div>
        
        {workflow.description && (
          <div className="workflow-description">
            {workflow.description.substring(0, 100)}
            {workflow.description.length > 100 && '...'}
          </div>
        )}
      </div>

      <div className="workflow-status">
        <span className={`status-badge ${workflow.status}`} style={{ color: statusColor }}>
          {workflow.status}
        </span>
        {workflow.expires_at && (
          <span className="expires-at">
            Expires: {new Date(workflow.expires_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
};

const WorkflowDetail = ({ workflow, currentUser, onProcessApproval, isProcessing }) => {
  const [selectedStep, setSelectedStep] = useState(null);
  const [approvalComments, setApprovalComments] = useState('');
  const [showApprovalForm, setShowApprovalForm] = useState(false);
  const [approvalAction, setApprovalAction] = useState('approve');

  const approvalSteps = workflow.approval_steps || [];
  const canApprove = approvalSteps.some(step => 
    step.status === 'pending' && 
    (step.approver_id === currentUser.id || step.approver_role === currentUser.role)
  );

  const handleApprovalSubmit = () => {
    if (selectedStep) {
      onProcessApproval(selectedStep.id, approvalAction, approvalComments);
      setShowApprovalForm(false);
      setApprovalComments('');
      setSelectedStep(null);
    }
  };

  const handleApprovalAction = (step, action) => {
    setSelectedStep(step);
    setApprovalAction(action);
    setShowApprovalForm(true);
  };

  return (
    <div className="workflow-detail-content">
      <div className="workflow-detail-header">
        <div className="workflow-info">
          <h3>{workflow.workflow_name}</h3>
          <div className="workflow-meta">
            <span className="requested-by">
              Requested by: {workflow.requested_by_username}
            </span>
            <span className="timestamp">
              {new Date(workflow.created_at).toLocaleString()}
            </span>
            <span className={`status-badge ${workflow.status}`}>
              {workflow.status}
            </span>
          </div>
        </div>
      </div>

      <div className="workflow-body">
        <div className="entity-info">
          <h4>Entity Information</h4>
          <p><strong>Type:</strong> {workflow.entity_type}</p>
          <p><strong>ID:</strong> {workflow.entity_id}</p>
          <p><strong>Workflow Type:</strong> {workflow.workflow_type}</p>
        </div>

        {workflow.description && (
          <div className="workflow-description">
            <h4>Description</h4>
            <p>{workflow.description}</p>
          </div>
        )}

        <div className="approval-steps">
          <h4>Approval Steps</h4>
          <div className="steps-list">
            {approvalSteps.map((step, index) => (
              <ApprovalStep
                key={step.id}
                step={step}
                stepNumber={index + 1}
                currentUser={currentUser}
                canApprove={step.status === 'pending' && 
                  (step.approver_id === currentUser.id || step.approver_role === currentUser.role)}
                onApprove={() => handleApprovalAction(step, 'approve')}
                onReject={() => handleApprovalAction(step, 'reject')}
                isProcessing={isProcessing}
              />
            ))}
          </div>
        </div>

        {workflow.expires_at && (
          <div className="expiration-info">
            <h4>Expiration</h4>
            <p>This workflow expires on {new Date(workflow.expires_at).toLocaleString()}</p>
          </div>
        )}
      </div>

      {showApprovalForm && (
        <div className="approval-form-overlay">
          <div className="approval-form">
            <h4>{approvalAction === 'approve' ? 'Approve' : 'Reject'} Step</h4>
            <p>Step: {selectedStep?.step_name}</p>
            
            <div className="form-group">
              <label htmlFor="comments">Comments:</label>
              <textarea
                id="comments"
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                placeholder={`Add comments for your ${approvalAction} decision...`}
                rows={4}
              />
            </div>

            <div className="form-actions">
              <Button
                type="button"
                onClick={() => {
                  setShowApprovalForm(false);
                  setApprovalComments('');
                  setSelectedStep(null);
                }}
                className="cancel-button"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleApprovalSubmit}
                className={`submit-button ${approvalAction === 'approve' ? 'approve' : 'reject'}`}
                disabled={isProcessing}
              >
                {isProcessing ? 'Processing...' : 
                  approvalAction === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ApprovalStep = ({ 
  step, 
  stepNumber, 
  currentUser, 
  canApprove, 
  onApprove, 
  onReject, 
  isProcessing 
}) => {
  const statusIcon = {
    pending: '⏳',
    approved: '✅',
    rejected: '❌',
    skipped: '⏭️',
    expired: '⏰'
  }[step.status] || '❓';

  const statusColor = {
    pending: 'orange',
    approved: 'green',
    rejected: 'red',
    skipped: 'gray',
    expired: 'gray'
  }[step.status] || 'gray';

  return (
    <div className={`approval-step ${step.status} ${canApprove ? 'can-approve' : ''}`}>
      <div className="step-header">
        <div className="step-number">{stepNumber}</div>
        <div className="step-info">
          <h5>{step.step_name}</h5>
          <p>Approver: {step.approver_role} {step.approver_id && `(ID: ${step.approver_id})`}</p>
          {step.required && <span className="required-badge">Required</span>}
        </div>
        <div className="step-status">
          <span className="status-icon" style={{ color: statusColor }}>
            {statusIcon}
          </span>
          <span className={`status-text ${step.status}`}>
            {step.status}
          </span>
        </div>
      </div>

      {step.status !== 'pending' && (
        <div className="step-details">
          {step.approved_at && (
            <p><strong>Approved:</strong> {new Date(step.approved_at).toLocaleString()}</p>
          )}
          {step.rejected_at && (
            <p><strong>Rejected:</strong> {new Date(step.rejected_at).toLocaleString()}</p>
          )}
          {step.comments && (
            <div className="step-comments">
              <strong>Comments:</strong>
              <p>{step.comments}</p>
            </div>
          )}
        </div>
      )}

      {canApprove && step.status === 'pending' && (
        <div className="step-actions">
          <Button
            onClick={onApprove}
            className="approve-button"
            disabled={isProcessing}
          >
            ✅ Approve
          </Button>
          <Button
            onClick={onReject}
            className="reject-button"
            disabled={isProcessing}
          >
            ❌ Reject
          </Button>
        </div>
      )}

      {step.timeout_hours && step.status === 'pending' && (
        <div className="step-timeout">
          <small>Timeout: {step.timeout_hours} hours</small>
        </div>
      )}
    </div>
  );
};

const CreateWorkflow = ({ onSend, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    workflowName: '',
    workflowType: '',
    description: '',
    entityType: '',
    entityId: '',
    approvalSteps: [
      {
        stepName: '',
        approverRole: '',
        approverId: '',
        required: true,
        timeoutHours: 24
      }
    ],
    expiresAt: ''
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleStepChange = (index, field, value) => {
    const newSteps = [...formData.approvalSteps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setFormData(prev => ({ ...prev, approvalSteps: newSteps }));
  };

  const addApprovalStep = () => {
    setFormData(prev => ({
      ...prev,
      approvalSteps: [
        ...prev.approvalSteps,
        {
          stepName: '',
          approverRole: '',
          approverId: '',
          required: true,
          timeoutHours: 24
        }
      ]
    }));
  };

  const removeApprovalStep = (index) => {
    if (formData.approvalSteps.length > 1) {
      const newSteps = formData.approvalSteps.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, approvalSteps: newSteps }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.workflowName.trim()) {
      newErrors.workflowName = 'Workflow name is required';
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

    // Validate approval steps
    formData.approvalSteps.forEach((step, index) => {
      if (!step.stepName.trim()) {
        newErrors[`step_${index}_name`] = 'Step name is required';
      }
      if (!step.approverRole.trim()) {
        newErrors[`step_${index}_role`] = 'Approver role is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const workflowData = {
      ...formData,
      expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null
    };

    onSend(workflowData);
  };

  return (
    <div className="create-workflow">
      <div className="create-header">
        <h3>Create Approval Workflow</h3>
        <Button onClick={onCancel} className="close-button" aria-label="Close">×</Button>
      </div>

      <form onSubmit={handleSubmit} className="create-form">
        <div className="form-group">
          <label htmlFor="workflowName">Workflow Name:</label>
          <input
            type="text"
            id="workflowName"
            value={formData.workflowName}
            onChange={(e) => handleInputChange('workflowName', e.target.value)}
            className={errors.workflowName ? 'error' : ''}
            placeholder="Enter workflow name"
          />
          {errors.workflowName && <span className="error-text">{errors.workflowName}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="workflowType">Workflow Type:</label>
            <select
              id="workflowType"
              value={formData.workflowType}
              onChange={(e) => handleInputChange('workflowType', e.target.value)}
              className={errors.workflowType ? 'error' : ''}
            >
              <option value="">Select type...</option>
              <option value="visitor_approval">Visitor Approval</option>
              <option value="user_registration">User Registration</option>
              <option value="incident_escalation">Incident Escalation</option>
              <option value="maintenance_request">Maintenance Request</option>
              <option value="policy_change">Policy Change</option>
            </select>
            {errors.workflowType && <span className="error-text">{errors.workflowType}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="expiresAt">Expires At:</label>
            <input
              type="datetime-local"
              id="expiresAt"
              value={formData.expiresAt}
              onChange={(e) => handleInputChange('expiresAt', e.target.value)}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe the workflow purpose"
            rows={3}
          />
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
              placeholder="e.g., visitor, user, incident"
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

        <div className="approval-steps-section">
          <div className="section-header">
            <h4>Approval Steps</h4>
            <Button
              type="button"
              onClick={addApprovalStep}
              className="add-step-button"
            >
              + Add Step
            </Button>
          </div>

          {formData.approvalSteps.map((step, index) => (
            <div key={index} className="approval-step-form">
              <div className="step-header">
                <h5>Step {index + 1}</h5>
                {formData.approvalSteps.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => removeApprovalStep(index)}
                    className="remove-step-button"
                  >
                    ×
                  </Button>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Step Name:</label>
                  <input
                    type="text"
                    value={step.stepName}
                    onChange={(e) => handleStepChange(index, 'stepName', e.target.value)}
                    className={errors[`step_${index}_name`] ? 'error' : ''}
                    placeholder="e.g., Manager Approval"
                  />
                  {errors[`step_${index}_name`] && (
                    <span className="error-text">{errors[`step_${index}_name`]}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Approver Role:</label>
                  <select
                    value={step.approverRole}
                    onChange={(e) => handleStepChange(index, 'approverRole', e.target.value)}
                    className={errors[`step_${index}_role`] ? 'error' : ''}
                  >
                    <option value="">Select role...</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="guard">Guard</option>
                    <option value="resident">Resident</option>
                  </select>
                  {errors[`step_${index}_role`] && (
                    <span className="error-text">{errors[`step_${index}_role`]}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Approver ID (Optional):</label>
                  <input
                    type="number"
                    value={step.approverId}
                    onChange={(e) => handleStepChange(index, 'approverId', e.target.value)}
                    placeholder="Specific user ID"
                  />
                </div>

                <div className="form-group">
                  <label>Timeout (Hours):</label>
                  <input
                    type="number"
                    value={step.timeoutHours}
                    onChange={(e) => handleStepChange(index, 'timeoutHours', parseInt(e.target.value))}
                    min="1"
                    max="168"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={step.required}
                    onChange={(e) => handleStepChange(index, 'required', e.target.checked)}
                  />
                  Required Step
                </label>
              </div>
            </div>
          ))}
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
            className="create-button primary"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Workflow'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ApprovalWorkflows;