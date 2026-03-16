/**
 * @file PolicyManagement.jsx
 * @description Policy engine management interface
 * Phase A3: Policy Engine & Watchlists
 */

import React, { useState, useEffect } from 'react';
import useModalAccessibility from '../../hooks/useModalAccessibility';
import Button from '../../components/ui/Button';
import api from '../../utils/apiClient';
import './PolicyManagement.css';

const PolicyManagement = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const closeModal = () => setShowModal(false);
  const { modalRef } = useModalAccessibility(showModal, closeModal);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'visitor_limit',
    conditions: '{}',
    actions: '{}',
    enabled: true,
    priority: 0
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/admin/policies');
      setPolicies(response.data.data || []);
    } catch (err) {
      console.error('Error fetching policies:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = editingPolicy 
        ? `/api/admin/policies/${editingPolicy.id}`
        : '/api/admin/policies';
      
      const payload = {
        ...formData,
        conditions: JSON.parse(formData.conditions),
        actions: JSON.parse(formData.actions)
      };

      if (editingPolicy) {
        await api.put(url, payload);
      } else {
        await api.post(url, payload);
      }

      await fetchPolicies();
      setShowModal(false);
      resetForm();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const deletePolicy = async (id) => {
    if (!window.confirm('Are you sure you want to delete this policy?')) return;

    try {
      await api.delete(`/api/admin/policies/${id}`);
      await fetchPolicies();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const togglePolicy = async (policy) => {
    try {
      await api.put(`/api/admin/policies/${policy.id}`, { ...policy, enabled: !policy.enabled });
      await fetchPolicies();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const openEditModal = (policy) => {
    setEditingPolicy(policy);
    setFormData({
      name: policy.name,
      description: policy.description || '',
      type: policy.type,
      conditions: JSON.stringify(policy.conditions, null, 2),
      actions: JSON.stringify(policy.actions, null, 2),
      enabled: policy.enabled,
      priority: policy.priority
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditingPolicy(null);
    setFormData({
      name: '',
      description: '',
      type: 'visitor_limit',
      conditions: '{}',
      actions: '{}',
      enabled: true,
      priority: 0
    });
  };

  const policyTemplates = {
    visitor_limit: {
      conditions: { maxVisitorsPerDay: 5, scope: 'per_unit' },
      actions: { action: 'block', message: 'Daily visitor limit reached', notifyResident: true }
    },
    time_restriction: {
      conditions: { restrictAfter: '22:00', restrictBefore: '06:00' },
      actions: { action: 'require_admin_approval', message: 'Late night visitors require approval' }
    },
    approval_requirement: {
      conditions: { visitorType: 'contractor', requireApprovalFrom: 'admin' },
      actions: { action: 'require_admin_approval', notifyAdmin: true }
    },
    data_retention: {
      conditions: { dataType: 'visitor_pii', retentionDays: 90 },
      actions: { action: 'auto_delete', notifyBeforeDays: 7 }
    },
    vehicle_rule: {
      conditions: { requireVehiclePlate: true },
      actions: { action: 'block', message: 'Vehicle registration required' }
    }
  };

  const applyTemplate = (type) => {
    const template = policyTemplates[type];
    setFormData(prev => ({
      ...prev,
      conditions: JSON.stringify(template.conditions, null, 2),
      actions: JSON.stringify(template.actions, null, 2)
    }));
  };

  const getPolicyTypeIcon = (type) => {
    const icons = {
      visitor_limit: '👥',
      time_restriction: '⏰',
      approval_requirement: '✅',
      data_retention: '🗄️',
      vehicle_rule: '🚗'
    };
    return icons[type] || '📋';
  };

  if (loading) {
    return (
      <div className="policy-management">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading policies...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="policy-management">
      <div className="policy-header">
        <div className="header-left">
          <h1>📋 Policy Management</h1>
          <p className="subtitle">Manage business rules and automation policies</p>
        </div>
        <Button 
          className="btn-create"
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
        >
          + Create Policy
        </Button>
      </div>

      <div className="policies-list">
        {policies.length === 0 ? (
          <div className="empty-state">
            <p>No policies configured yet.</p>
            <Button className="btn-primary" onClick={() => setShowModal(true)}>
              Create First Policy
            </Button>
          </div>
        ) : (
          <div className="policies-grid">
            {policies.map(policy => (
              <div key={policy.id} className={`policy-card ${!policy.enabled ? 'disabled' : ''}`}>
                <div className="policy-card-header">
                  <div className="policy-title">
                    <span className="policy-icon">{getPolicyTypeIcon(policy.type)}</span>
                    <h3>{policy.name}</h3>
                  </div>
                  <div className="policy-actions">
                    <Button
                      variant="ghost"
                      className={`toggle-btn ${policy.enabled ? 'active' : ''}`}
                      onClick={() => togglePolicy(policy)}
                      aria-label={policy.enabled ? 'Disable policy' : 'Enable policy'}
                    >
                      {policy.enabled ? '✓' : '○'}
                    </Button>
                  </div>
                </div>

                <p className="policy-description">{policy.description || 'No description'}</p>

                <div className="policy-meta">
                  <span className="policy-type">{policy.type.replace('_', ' ')}</span>
                  <span className="policy-priority">Priority: {policy.priority}</span>
                </div>

                <div className="policy-footer">
                  <Button 
                    className="btn-edit"
                    onClick={() => openEditModal(policy)}
                  >
                    Edit
                  </Button>
                  <Button 
                    className="btn-delete"
                    onClick={() => deletePolicy(policy.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal} role="presentation" aria-hidden="true">
          <div
            className="modal-content large"
            onClick={(e) => e.stopPropagation()}
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="policy-modal-title"
            tabIndex={-1}
          >
            <div className="modal-header">
              <h2 id="policy-modal-title">{editingPolicy ? 'Edit Policy' : 'Create Policy'}</h2>
              <Button variant="ghost" className="modal-close" onClick={closeModal} aria-label="Close">×</Button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label>Policy Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Policy Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      setFormData({...formData, type: e.target.value});
                      applyTemplate(e.target.value);
                    }}
                    required
                  >
                    <option value="visitor_limit">Visitor Limit</option>
                    <option value="time_restriction">Time Restriction</option>
                    <option value="approval_requirement">Approval Requirement</option>
                    <option value="data_retention">Data Retention</option>
                    <option value="vehicle_rule">Vehicle Rule</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  rows="2"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Priority</label>
                  <input
                    type="number"
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value)})}
                    min="0"
                  />
                  <small>Higher number = higher priority</small>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
                    />
                    <span>Enabled</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Conditions (JSON) *</label>
                <textarea
                  value={formData.conditions}
                  onChange={(e) => setFormData({...formData, conditions: e.target.value})}
                  rows="6"
                  className="code-editor"
                  required
                />
                <small>Define when this policy should trigger</small>
              </div>

              <div className="form-group">
                <label>Actions (JSON) *</label>
                <textarea
                  value={formData.actions}
                  onChange={(e) => setFormData({...formData, actions: e.target.value})}
                  rows="6"
                  className="code-editor"
                  required
                />
                <small>Define what happens when policy is triggered</small>
              </div>

              <div className="modal-footer">
                <Button variant="secondary" className="btn-cancel" onClick={closeModal}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" className="btn-primary">
                  {editingPolicy ? 'Update Policy' : 'Create Policy'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyManagement;
