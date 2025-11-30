/**
 * @file IncidentDetailModal.jsx
 * @description Detailed incident view with comments, history, and SLA tracking
 * Phase A4: Incident Workflow & Escalations
 */

import React, { useState, useEffect } from 'react';
import './IncidentDetailModal.css';

const IncidentDetailModal = ({ incident, guards, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState('details');
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [slaInfo, setSlaInfo] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    if (activeTab === 'comments') {
      fetchComments();
    } else if (activeTab === 'history') {
      fetchHistory();
    } else if (activeTab === 'sla') {
      fetchSLAInfo();
    }
  }, [activeTab, incident.id]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/admin/incidents/${incident.id}/comments`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setComments(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching comments:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`/api/admin/incidents/${incident.id}/history`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const fetchSLAInfo = async () => {
    try {
      const response = await fetch(`/api/admin/incidents/${incident.id}/sla`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setSlaInfo(data.data);
      }
    } catch (err) {
      console.error('Error fetching SLA info:', err);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      const response = await fetch(`/api/admin/incidents/${incident.id}/comments`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment, internal: true })
      });

      if (!response.ok) throw new Error('Failed to add comment');

      setNewComment('');
      await fetchComments();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const response = await fetch(`/api/admin/incidents/${incident.id}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update status');

      onUpdate();
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleAssignment = async (guardId) => {
    try {
      const response = await fetch(`/api/admin/incidents/${incident.id}/assign`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: guardId })
      });

      if (!response.ok) throw new Error('Failed to assign');

      onUpdate();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: '#991b1b',
      high: '#9a3412',
      medium: '#92400e',
      low: '#065f46'
    };
    return colors[severity] || '#6b7280';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="incident-detail-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="header-content">
            <h2>Incident #{incident.id}</h2>
            <div className="header-badges">
              <span 
                className="severity-badge"
                style={{ backgroundColor: getSeverityColor(incident.severity) + '20', color: getSeverityColor(incident.severity) }}
              >
                {incident.severity}
              </span>
              <span className="status-badge">{incident.status.replace('_', ' ')}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button 
            className={`tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button 
            className={`tab ${activeTab === 'comments' ? 'active' : ''}`}
            onClick={() => setActiveTab('comments')}
          >
            Comments ({comments.length})
          </button>
          <button 
            className={`tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            History
          </button>
          <button 
            className={`tab ${activeTab === 'sla' ? 'active' : ''}`}
            onClick={() => setActiveTab('sla')}
          >
            SLA
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="details-content">
              <div className="detail-section">
                <h3>Description</h3>
                <p>{incident.description || 'No description provided'}</p>
              </div>

              <div className="detail-section">
                <h3>Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Category</label>
                    <span>{incident.category?.replace('_', ' ') || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <label>Priority</label>
                    <span>P{incident.priority || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <label>Reported By</label>
                    <span>{incident.reported_by_name || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <label>Created</label>
                    <span>{formatDate(incident.created_at)}</span>
                  </div>
                  <div className="info-item">
                    <label>Assigned To</label>
                    <span>{incident.assigned_name || 'Unassigned'}</span>
                  </div>
                  {incident.location && (
                    <div className="info-item">
                      <label>Location</label>
                      <span>{incident.location}</span>
                    </div>
                  )}
                </div>
              </div>

              {incident.status !== 'closed' && (
                <div className="detail-section">
                  <h3>Actions</h3>
                  <div className="action-buttons">
                    {!incident.assigned_to && (
                      <div className="assign-group">
                        <label>Assign to:</label>
                        <select 
                          onChange={(e) => handleAssignment(e.target.value)}
                          defaultValue=""
                        >
                          <option value="" disabled>Select guard...</option>
                          {guards.map(guard => (
                            <option key={guard.id} value={guard.id}>
                              {guard.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {incident.status === 'open' && (
                      <button 
                        className="btn-primary"
                        onClick={() => handleStatusChange('under_review')}
                      >
                        Start Review
                      </button>
                    )}

                    {incident.status === 'under_review' && (
                      <>
                        <button 
                          className="btn-warning"
                          onClick={() => handleStatusChange('escalated')}
                        >
                          Escalate
                        </button>
                        <button 
                          className="btn-success"
                          onClick={() => handleStatusChange('closed')}
                        >
                          Close Incident
                        </button>
                      </>
                    )}

                    {incident.status === 'escalated' && (
                      <button 
                        className="btn-success"
                        onClick={() => handleStatusChange('closed')}
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="comments-content">
              <form onSubmit={handleCommentSubmit} className="comment-form">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows="3"
                />
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={submittingComment || !newComment.trim()}
                >
                  {submittingComment ? 'Adding...' : 'Add Comment'}
                </button>
              </form>

              <div className="comments-list">
                {comments.length === 0 ? (
                  <p className="no-comments">No comments yet.</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="comment-item">
                      <div className="comment-header">
                        <strong>{comment.user_name || 'Unknown User'}</strong>
                        <span className="comment-date">{formatDate(comment.created_at)}</span>
                      </div>
                      <p className="comment-text">{comment.comment}</p>
                      {comment.internal && (
                        <span className="internal-badge">Internal</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="history-content">
              {history.length === 0 ? (
                <p className="no-history">No history available.</p>
              ) : (
                <div className="timeline">
                  {history.map((item, index) => (
                    <div key={index} className="timeline-item">
                      <div className="timeline-marker"></div>
                      <div className="timeline-content">
                        <strong>{item.action}</strong>
                        <p>{item.description}</p>
                        <span className="timeline-date">{formatDate(item.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SLA Tab */}
          {activeTab === 'sla' && (
            <div className="sla-content">
              {slaInfo ? (
                <>
                  <div className="sla-section">
                    <h3>Response SLA</h3>
                    <div className="sla-progress">
                      <div className="sla-bar">
                        <div 
                          className={`sla-fill ${slaInfo.response_sla_met ? 'success' : 'danger'}`}
                          style={{ width: `${Math.min((slaInfo.response_minutes / slaInfo.response_sla_minutes) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="sla-details">
                        <span>Target: {slaInfo.response_sla_minutes} minutes</span>
                        <span>Actual: {slaInfo.response_minutes || 'Pending'} minutes</span>
                        <span className={slaInfo.response_sla_met ? 'success' : 'danger'}>
                          {slaInfo.response_sla_met ? '✓ Met' : '✗ Breached'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="sla-section">
                    <h3>Resolution SLA</h3>
                    <div className="sla-progress">
                      <div className="sla-bar">
                        <div 
                          className={`sla-fill ${slaInfo.resolution_sla_met ? 'success' : 'danger'}`}
                          style={{ width: `${Math.min((slaInfo.resolution_minutes / slaInfo.resolution_sla_minutes) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="sla-details">
                        <span>Target: {slaInfo.resolution_sla_minutes} minutes</span>
                        <span>Actual: {slaInfo.resolution_minutes || 'Pending'} minutes</span>
                        <span className={slaInfo.resolution_sla_met ? 'success' : 'danger'}>
                          {slaInfo.resolution_sla_met ? '✓ Met' : '✗ Breached'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p>Loading SLA information...</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentDetailModal;
