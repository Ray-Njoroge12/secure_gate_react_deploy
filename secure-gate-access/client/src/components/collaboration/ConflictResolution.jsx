import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collaborationService } from '../../services/collaborationService';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import './ConflictResolution.css';
import Button from '../ui/Button';

const ConflictResolution = ({ className = '' }) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('active_conflicts');
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [conflictFilters, setConflictFilters] = useState({
    type: 'active',
    severity: null,
    page: 1,
    limit: 20
  });

  // Fetch conflicts
  const { 
    data: conflictsData, 
    isLoading: conflictsLoading, 
    error: conflictsError 
  } = useQuery({
    queryKey: ['conflicts', conflictFilters],
    queryFn: () => collaborationService.getConflicts(conflictFilters),
    refetchInterval: 30000,
    staleTime: 10000
  });

  // Escalate conflict mutation
  const escalateConflictMutation = useMutation({
    mutationFn: collaborationService.escalateConflict,
    onSuccess: () => {
      queryClient.invalidateQueries(['conflicts']);
      showNotification('Conflict escalated successfully', 'success');
    },
    onError: (error) => {
      showNotification(error.message || 'Failed to escalate conflict', 'error');
    }
  });

  // Resolve conflict mutation
  const resolveConflictMutation = useMutation({
    mutationFn: collaborationService.resolveConflict,
    onSuccess: () => {
      queryClient.invalidateQueries(['conflicts']);
      showNotification('Conflict resolved successfully', 'success');
      setSelectedConflict(null);
    },
    onError: (error) => {
      showNotification(error.message || 'Failed to resolve conflict', 'error');
    }
  });

  // Create conflict mutation
  const createConflictMutation = useMutation({
    mutationFn: collaborationService.createConflict,
    onSuccess: () => {
      queryClient.invalidateQueries(['conflicts']);
      setIsCreating(false);
      showNotification('Conflict reported successfully', 'success');
    },
    onError: (error) => {
      showNotification(error.message || 'Failed to report conflict', 'error');
    }
  });

  const conflicts = conflictsData?.conflicts || [];

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedConflict(null);
    
    const newFilters = { ...conflictFilters, page: 1 };
    
    switch (tab) {
      case 'active_conflicts':
        newFilters.type = 'active';
        break;
      case 'my_conflicts':
        newFilters.type = 'my_conflicts';
        break;
      case 'resolved':
        newFilters.type = 'resolved';
        break;
      default:
        newFilters.type = 'active';
    }
    
    setConflictFilters(newFilters);
  };

  const handleConflictSelect = (conflict) => {
    setSelectedConflict(conflict);
  };

  const handleEscalateConflict = (conflictId, escalationData) => {
    escalateConflictMutation.mutate({ conflictId, ...escalationData });
  };

  const handleResolveConflict = (conflictId, resolutionData) => {
    resolveConflictMutation.mutate({ conflictId, ...resolutionData });
  };

  const handleCreateConflict = () => {
    setIsCreating(true);
    setSelectedConflict(null);
  };

  if (conflictsError) {
    return (
      <div className={`conflict-resolution error ${className}`}>
        <div className="error-message">
          <h3>Unable to load conflicts</h3>
          <p>{conflictsError.message}</p>
          <Button 
            onClick={() => queryClient.invalidateQueries(['conflicts'])}
            className="retry-button"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`conflict-resolution ${className}`}>
      <div className="conflicts-header">
        <h2>Conflict Resolution</h2>
        <Button 
          onClick={handleCreateConflict}
          className="create-button primary"
          isLoading={createConflictMutation.isPending}
          label="Report Conflict"
          icon="⚠️"
        />
      </div>

      <div className="conflicts-tabs">
        <Button
          className={`tab ${activeTab === 'active_conflicts' ? 'active' : ''}`}
          onClick={() => handleTabChange('active_conflicts')}
        >
          Active Conflicts
          {conflicts.filter(c => c.status === 'active').length > 0 && (
            <span className="active-count">
              {conflicts.filter(c => c.status === 'active').length}
            </span>
          )}
        </Button>
        <Button
          className={`tab ${activeTab === 'my_conflicts' ? 'active' : ''}`}
          onClick={() => handleTabChange('my_conflicts')}
        >
          My Conflicts
        </Button>
        <Button
          className={`tab ${activeTab === 'resolved' ? 'active' : ''}`}
          onClick={() => handleTabChange('resolved')}
        >
          Resolved
        </Button>
      </div>

      <div className="conflicts-content">
        <div className="conflict-list">
          {conflictsLoading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading conflicts...</p>
            </div>
          ) : conflicts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✅</div>
              <h3>No conflicts</h3>
              <p>
                {activeTab === 'active_conflicts' 
                  ? "No active conflicts found. Great teamwork!"
                  : activeTab === 'my_conflicts'
                  ? "You don't have any conflicts to manage."
                  : "No resolved conflicts found."
                }
              </p>
            </div>
          ) : (
            <div className="conflict-items">
              {conflicts.map((conflict) => (
                <ConflictItem
                  key={conflict.id}
                  conflict={conflict}
                  currentUser={user}
                  isSelected={selectedConflict?.id === conflict.id}
                  onClick={() => handleConflictSelect(conflict)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="conflict-detail">
          {isCreating ? (
            <CreateConflict
              onSend={(conflictData) => createConflictMutation.mutate(conflictData)}
              onCancel={() => {
                setIsCreating(false);
                setSelectedConflict(null);
              }}
              isLoading={createConflictMutation.isPending}
            />
          ) : selectedConflict ? (
            <ConflictDetail
              conflict={selectedConflict}
              currentUser={user}
              onEscalate={handleEscalateConflict}
              onResolve={handleResolveConflict}
              isEscalating={escalateConflictMutation.isPending}
              isResolving={resolveConflictMutation.isPending}
            />
          ) : (
            <div className="no-selection">
              <div className="no-selection-icon">⚖️</div>
              <h3>Select a conflict</h3>
              <p>Choose a conflict from the list to view details and take action.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ConflictItem = ({ conflict, currentUser, isSelected, onClick }) => {
  const isInvolved = conflict.reporter_id === currentUser.id || 
                   conflict.involved_parties?.includes(currentUser.id) ||
                   conflict.assigned_mediator_id === currentUser.id;
  
  const severityColor = {
    low: 'green',
    medium: 'orange',
    high: 'red',
    critical: 'darkred'
  }[conflict.severity] || 'gray';

  const statusIcon = {
    active: '🔴',
    escalated: '⬆️',
    mediation: '⚖️',
    resolved: '✅',
    closed: '🔒'
  }[conflict.status] || '❓';

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div 
      className={`conflict-item ${isSelected ? 'selected' : ''} ${conflict.status}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-pressed={isSelected}
    >
      <div className="conflict-icon">
        <div className={`icon ${conflict.conflict_type}`}>
          {statusIcon}
        </div>
      </div>
      
      <div className="conflict-content">
        <div className="conflict-header">
          <span className="conflict-title">{conflict.title}</span>
          <span className="conflict-time">
            {new Date(conflict.created_at).toLocaleDateString()}
          </span>
        </div>
        
        <div className="conflict-meta">
          <span className={`severity-badge ${conflict.severity}`} style={{ color: severityColor }}>
            {conflict.severity.toUpperCase()}
          </span>
          <span className="conflict-type">{conflict.conflict_type}</span>
          {isInvolved && <span className="involved-badge">Involved</span>}
        </div>
        
        <div className="conflict-description">
          {conflict.description.substring(0, 100)}
          {conflict.description.length > 100 && '...'}
        </div>
        
        <div className="conflict-parties">
          Reporter: {conflict.reporter_username}
          {conflict.involved_parties?.length > 0 && (
            <span> | Parties: {conflict.involved_parties.length}</span>
          )}
        </div>
      </div>

      <div className="conflict-status">
        <span className={`status-badge ${conflict.status}`}>
          {conflict.status}
        </span>
        {conflict.escalation_level > 0 && (
          <span className="escalation-level">
            Level {conflict.escalation_level}
          </span>
        )}
      </div>
    </div>
  );
};

const ConflictDetail = ({ 
  conflict, 
  currentUser, 
  onEscalate, 
  onResolve, 
  isEscalating, 
  isResolving 
}) => {
  const [showEscalationForm, setShowEscalationForm] = useState(false);
  const [showResolutionForm, setShowResolutionForm] = useState(false);
  const [escalationReason, setEscalationReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolutionType, setResolutionType] = useState('agreement');

  const canEscalate = conflict.status === 'active' && 
                     (conflict.reporter_id === currentUser.id || 
                      currentUser.role === 'admin' || 
                      currentUser.role === 'super_admin');

  const canResolve = conflict.status !== 'resolved' && conflict.status !== 'closed' &&
                    (conflict.assigned_mediator_id === currentUser.id ||
                     currentUser.role === 'admin' || 
                     currentUser.role === 'super_admin');

  const handleEscalation = () => {
    onEscalate(conflict.id, {
      reason: escalationReason,
      escalatedBy: currentUser.id
    });
    setShowEscalationForm(false);
    setEscalationReason('');
  };

  const handleResolution = () => {
    onResolve(conflict.id, {
      resolutionType,
      resolutionNotes,
      resolvedBy: currentUser.id
    });
    setShowResolutionForm(false);
    setResolutionNotes('');
  };

  return (
    <div className="conflict-detail-content">
      <div className="conflict-detail-header">
        <div className="conflict-info">
          <h3>{conflict.title}</h3>
          <div className="conflict-meta">
            <span className="reporter">
              Reported by: {conflict.reporter_username}
            </span>
            <span className="timestamp">
              {new Date(conflict.created_at).toLocaleString()}
            </span>
            <span className={`severity-badge ${conflict.severity}`}>
              {conflict.severity.toUpperCase()}
            </span>
            <span className={`status-badge ${conflict.status}`}>
              {conflict.status}
            </span>
          </div>
        </div>
        
        <div className="conflict-actions">
          {canEscalate && (
            <Button
              onClick={() => setShowEscalationForm(true)}
              className="escalate-button warning"
              disabled={isEscalating}
            >
              {isEscalating ? 'Escalating...' : 'Escalate'}
            </Button>
          )}
          {canResolve && (
            <Button
              onClick={() => setShowResolutionForm(true)}
              className="resolve-button success"
              disabled={isResolving}
            >
              {isResolving ? 'Resolving...' : 'Resolve'}
            </Button>
          )}
        </div>
      </div>

      <div className="conflict-body">
        <div className="conflict-details">
          <h4>Conflict Details</h4>
          <p><strong>Type:</strong> {conflict.conflict_type}</p>
          <p><strong>Severity:</strong> {conflict.severity}</p>
          <p><strong>Escalation Level:</strong> {conflict.escalation_level}</p>
          {conflict.assigned_mediator_username && (
            <p><strong>Assigned Mediator:</strong> {conflict.assigned_mediator_username}</p>
          )}
        </div>

        <div className="conflict-description">
          <h4>Description</h4>
          <div className="description-text">
            {conflict.description.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
        </div>

        {conflict.involved_parties && conflict.involved_parties.length > 0 && (
          <div className="involved-parties">
            <h4>Involved Parties</h4>
            <div className="parties-list">
              {conflict.involved_parties.map((party, index) => (
                <div key={index} className="party-item">
                  <span className="party-name">{party.username}</span>
                  <span className="party-role">({party.role})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {conflict.escalation_history && conflict.escalation_history.length > 0 && (
          <div className="escalation-history">
            <h4>Escalation History</h4>
            <div className="history-timeline">
              {conflict.escalation_history.map((escalation, index) => (
                <div key={index} className="escalation-item">
                  <div className="escalation-time">
                    {new Date(escalation.escalated_at).toLocaleString()}
                  </div>
                  <div className="escalation-details">
                    <p><strong>Escalated by:</strong> {escalation.escalated_by_username}</p>
                    <p><strong>Reason:</strong> {escalation.reason}</p>
                    <p><strong>Level:</strong> {escalation.level}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {conflict.resolution_notes && (
          <div className="resolution-info">
            <h4>Resolution</h4>
            <p><strong>Type:</strong> {conflict.resolution_type}</p>
            <p><strong>Resolved by:</strong> {conflict.resolved_by_username}</p>
            <p><strong>Resolved at:</strong> {new Date(conflict.resolved_at).toLocaleString()}</p>
            <div className="resolution-notes">
              <strong>Notes:</strong>
              <p>{conflict.resolution_notes}</p>
            </div>
          </div>
        )}
      </div>

      {showEscalationForm && (
        <div className="form-overlay">
          <div className="escalation-form">
            <h4>Escalate Conflict</h4>
            <p>This will escalate the conflict to the next level for review.</p>
            
            <div className="form-group">
              <label htmlFor="escalationReason">Escalation Reason:</label>
              <textarea
                id="escalationReason"
                value={escalationReason}
                onChange={(e) => setEscalationReason(e.target.value)}
                placeholder="Explain why this conflict needs to be escalated..."
                rows={4}
                required
              />
            </div>

            <div className="form-actions">
              <Button
                type="button"
                onClick={() => {
                  setShowEscalationForm(false);
                  setEscalationReason('');
                }}
                className="cancel-button"
                disabled={isEscalating}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleEscalation}
                className="escalate-button warning"
                disabled={isEscalating || !escalationReason.trim()}
              >
                {isEscalating ? 'Escalating...' : 'Escalate Conflict'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showResolutionForm && (
        <div className="form-overlay">
          <div className="resolution-form">
            <h4>Resolve Conflict</h4>
            
            <div className="form-group">
              <label htmlFor="resolutionType">Resolution Type:</label>
              <select
                id="resolutionType"
                value={resolutionType}
                onChange={(e) => setResolutionType(e.target.value)}
              >
                <option value="agreement">Mutual Agreement</option>
                <option value="mediation">Mediated Resolution</option>
                <option value="administrative">Administrative Decision</option>
                <option value="escalation">Escalated Resolution</option>
                <option value="withdrawn">Conflict Withdrawn</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="resolutionNotes">Resolution Notes:</label>
              <textarea
                id="resolutionNotes"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Describe how the conflict was resolved..."
                rows={6}
                required
              />
            </div>

            <div className="form-actions">
              <Button
                type="button"
                onClick={() => {
                  setShowResolutionForm(false);
                  setResolutionNotes('');
                }}
                className="cancel-button"
                disabled={isResolving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleResolution}
                className="resolve-button success"
                disabled={isResolving || !resolutionNotes.trim()}
              >
                {isResolving ? 'Resolving...' : 'Resolve Conflict'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CreateConflict = ({ onSend, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    conflictType: '',
    severity: 'medium',
    involvedParties: [],
    requestedMediator: '',
    urgentResolution: false
  });

  const [errors, setErrors] = useState({});
  const { data: usersData } = useQuery({
    queryKey: ['users', 'for-conflicts'],
    queryFn: () => collaborationService.getAvailableUsers(),
    staleTime: 300000
  });

  const users = usersData?.users || [];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handlePartyToggle = (userId) => {
    setFormData(prev => ({
      ...prev,
      involvedParties: prev.involvedParties.includes(userId)
        ? prev.involvedParties.filter(id => id !== userId)
        : [...prev.involvedParties, userId]
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    if (!formData.conflictType.trim()) {
      newErrors.conflictType = 'Conflict type is required';
    }
    if (formData.involvedParties.length === 0) {
      newErrors.involvedParties = 'At least one involved party is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const conflictData = {
      ...formData,
      involvedParties: formData.involvedParties.map(id => parseInt(id)),
      requestedMediator: formData.requestedMediator ? parseInt(formData.requestedMediator) : null
    };

    onSend(conflictData);
  };

  return (
    <div className="create-conflict">
      <div className="create-header">
        <h3>Report Conflict</h3>
        <Button onClick={onCancel} className="close-button" aria-label="Close">×</Button>
      </div>

      <form onSubmit={handleSubmit} className="create-form">
        <div className="form-group">
          <label htmlFor="title">Conflict Title:</label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className={errors.title ? 'error' : ''}
            placeholder="Brief description of the conflict"
          />
          {errors.title && <span className="error-text">{errors.title}</span>}
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="conflictType">Conflict Type:</label>
            <select
              id="conflictType"
              value={formData.conflictType}
              onChange={(e) => handleInputChange('conflictType', e.target.value)}
              className={errors.conflictType ? 'error' : ''}
            >
              <option value="">Select type...</option>
              <option value="communication">Communication Issue</option>
              <option value="resource">Resource Conflict</option>
              <option value="policy">Policy Disagreement</option>
              <option value="scheduling">Scheduling Conflict</option>
              <option value="authority">Authority Dispute</option>
              <option value="performance">Performance Issue</option>
              <option value="interpersonal">Interpersonal Conflict</option>
              <option value="other">Other</option>
            </select>
            {errors.conflictType && <span className="error-text">{errors.conflictType}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="severity">Severity:</label>
            <select
              id="severity"
              value={formData.severity}
              onChange={(e) => handleInputChange('severity', e.target.value)}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="description">Detailed Description:</label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className={errors.description ? 'error' : ''}
            placeholder="Provide a detailed description of the conflict, including what happened, when, and who was involved..."
            rows={6}
          />
          {errors.description && <span className="error-text">{errors.description}</span>}
        </div>

        <div className="form-group">
          <label>Involved Parties:</label>
          <div className="users-selection">
            {users.map(user => (
              <label key={user.id} className="user-checkbox">
                <input
                  type="checkbox"
                  checked={formData.involvedParties.includes(user.id)}
                  onChange={() => handlePartyToggle(user.id)}
                />
                <span className="user-info">
                  {user.username} ({user.role})
                </span>
              </label>
            ))}
          </div>
          {errors.involvedParties && <span className="error-text">{errors.involvedParties}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="requestedMediator">Requested Mediator (Optional):</label>
          <select
            id="requestedMediator"
            value={formData.requestedMediator}
            onChange={(e) => handleInputChange('requestedMediator', e.target.value)}
          >
            <option value="">No preference</option>
            {users.filter(u => u.role === 'admin' || u.role === 'super_admin').map(user => (
              <option key={user.id} value={user.id}>
                {user.username} ({user.role})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.urgentResolution}
              onChange={(e) => handleInputChange('urgentResolution', e.target.checked)}
            />
            Urgent Resolution Required
          </label>
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
            className="submit-button primary"
            disabled={isLoading}
          >
            {isLoading ? 'Reporting...' : 'Report Conflict'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ConflictResolution;