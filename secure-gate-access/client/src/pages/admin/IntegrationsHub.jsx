/**
 * @file IntegrationsHub.jsx
 * @description Unified hub for webhooks, automation rules, and API keys
 * Phase A5: Multi-Site, Integrations & Automation
 * 
 * Features:
 * - Webhook management
 * - Automation rule builder
 * - API key management
 */

import React, { useState, useEffect } from 'react';
import './IntegrationsHub.css';

const IntegrationsHub = () => {
  const [activeTab, setActiveTab] = useState('webhooks'); // webhooks, automation, apikeys
  const [webhooks, setWebhooks] = useState([]);
  const [automationRules, setAutomationRules] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'webhook', 'automation', 'apikey'
  const [editingItem, setEditingItem] = useState(null);

  // Webhook form data
  const [webhookForm, setWebhookForm] = useState({
    name: '',
    url: '',
    event_type: 'visitor.created',
    secret: '',
    headers: '{}',
    enabled: true
  });

  // Automation form data
  const [automationForm, setAutomationForm] = useState({
    name: '',
    description: '',
    trigger_event: 'incident.created',
    conditions: '{}',
    actions: '[]',
    enabled: true,
    priority: 0
  });

  // API Key form data
  const [apiKeyForm, setApiKeyForm] = useState({
    name: '',
    description: '',
    permissions: ['read'],
    rate_limit_per_hour: 100
  });

  const [newApiKey, setNewApiKey] = useState(null);

  useEffect(() => {
    if (activeTab === 'webhooks') {
      fetchWebhooks();
    } else if (activeTab === 'automation') {
      fetchAutomationRules();
    } else if (activeTab === 'apikeys') {
      fetchAPIKeys();
    }
  }, [activeTab]);

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/webhooks', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAutomationRules = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/automations', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setAutomationRules(data.data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAPIKeys = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/api-keys', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.data || []);
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWebhookSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingItem 
        ? `/api/admin/webhooks/${editingItem.id}`
        : '/api/admin/webhooks';
      
      const method = editingItem ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...webhookForm,
          headers: JSON.parse(webhookForm.headers)
        })
      });

      if (!response.ok) throw new Error('Failed to save webhook');

      await fetchWebhooks();
      setShowModal(false);
      resetForms();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleAutomationSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingItem 
        ? `/api/admin/automations/${editingItem.id}`
        : '/api/admin/automations';
      
      const method = editingItem ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...automationForm,
          conditions: JSON.parse(automationForm.conditions),
          actions: JSON.parse(automationForm.actions)
        })
      });

      if (!response.ok) throw new Error('Failed to save automation');

      await fetchAutomationRules();
      setShowModal(false);
      resetForms();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleAPIKeyGenerate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiKeyForm)
      });

      if (!response.ok) throw new Error('Failed to generate API key');

      const data = await response.json();
      setNewApiKey(data.data.api_key);
      await fetchAPIKeys();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const deleteWebhook = async (id) => {
    if (!window.confirm('Delete this webhook?')) return;
    try {
      const response = await fetch(`/api/admin/webhooks/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete webhook');
      await fetchWebhooks();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const deleteAutomation = async (id) => {
    if (!window.confirm('Delete this automation rule?')) return;
    try {
      const response = await fetch(`/api/admin/automations/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to delete automation');
      await fetchAutomationRules();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const revokeAPIKey = async (id) => {
    if (!window.confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      const response = await fetch(`/api/admin/api-keys/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to revoke API key');
      await fetchAPIKeys();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const testWebhook = async (id) => {
    try {
      const response = await fetch(`/api/admin/webhooks/${id}/test`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Test failed');
      alert('Webhook test successful!');
    } catch (err) {
      alert('Test failed: ' + err.message);
    }
  };

  const resetForms = () => {
    setEditingItem(null);
    setWebhookForm({
      name: '',
      url: '',
      event_type: 'visitor.created',
      secret: '',
      headers: '{}',
      enabled: true
    });
    setAutomationForm({
      name: '',
      description: '',
      trigger_event: 'incident.created',
      conditions: '{}',
      actions: '[]',
      enabled: true,
      priority: 0
    });
    setApiKeyForm({
      name: '',
      description: '',
      permissions: ['read'],
      rate_limit_per_hour: 100
    });
    setNewApiKey(null);
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    
    if (item) {
      if (type === 'webhook') {
        setWebhookForm({
          name: item.name,
          url: item.url,
          event_type: item.event_type,
          secret: item.secret || '',
          headers: JSON.stringify(item.headers || {}, null, 2),
          enabled: item.enabled
        });
      } else if (type === 'automation') {
        setAutomationForm({
          name: item.name,
          description: item.description || '',
          trigger_event: item.trigger_event,
          conditions: JSON.stringify(item.conditions || {}, null, 2),
          actions: JSON.stringify(item.actions || [], null, 2),
          enabled: item.enabled,
          priority: item.priority || 0
        });
      }
    }
    
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="integrations-hub">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="integrations-hub">
      <div className="hub-header">
        <div className="header-left">
          <h1>⚡ Integrations Hub</h1>
          <p className="subtitle">Webhooks, Automation & API Access</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="hub-tabs">
        <button 
          className={`tab ${activeTab === 'webhooks' ? 'active' : ''}`}
          onClick={() => setActiveTab('webhooks')}
        >
          🔗 Webhooks ({webhooks.length})
        </button>
        <button 
          className={`tab ${activeTab === 'automation' ? 'active' : ''}`}
          onClick={() => setActiveTab('automation')}
        >
          🤖 Automation ({automationRules.length})
        </button>
        <button 
          className={`tab ${activeTab === 'apikeys' ? 'active' : ''}`}
          onClick={() => setActiveTab('apikeys')}
        >
          🔑 API Keys ({apiKeys.length})
        </button>
      </div>

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="tab-content">
          <div className="content-header">
            <h2>Webhooks</h2>
            <button className="btn-create" onClick={() => openModal('webhook')}>
              + Add Webhook
            </button>
          </div>

          <div className="items-grid">
            {webhooks.map(webhook => (
              <div key={webhook.id} className="item-card">
                <div className="card-header">
                  <h3>{webhook.name}</h3>
                  <span className={`status-badge ${webhook.enabled ? 'active' : 'inactive'}`}>
                    {webhook.enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="card-body">
                  <p className="item-url">{webhook.url}</p>
                  <p className="item-event">Event: {webhook.event_type}</p>
                  <div className="item-stats">
                    <span>✓ {webhook.success_count || 0}</span>
                    <span>✗ {webhook.failure_count || 0}</span>
                  </div>
                </div>
                <div className="card-actions">
                  <button className="btn-sm btn-test" onClick={() => testWebhook(webhook.id)}>Test</button>
                  <button className="btn-sm btn-edit" onClick={() => openModal('webhook', webhook)}>Edit</button>
                  <button className="btn-sm btn-delete" onClick={() => deleteWebhook(webhook.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Automation Tab */}
      {activeTab === 'automation' && (
        <div className="tab-content">
          <div className="content-header">
            <h2>Automation Rules</h2>
            <button className="btn-create" onClick={() => openModal('automation')}>
              + Add Rule
            </button>
          </div>

          <div className="items-grid">
            {automationRules.map(rule => (
              <div key={rule.id} className="item-card">
                <div className="card-header">
                  <h3>{rule.name}</h3>
                  <span className={`status-badge ${rule.enabled ? 'active' : 'inactive'}`}>
                    {rule.enabled ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="card-body">
                  <p className="item-description">{rule.description || 'No description'}</p>
                  <p className="item-event">Trigger: {rule.trigger_event}</p>
                  <div className="item-stats">
                    <span>Executed: {rule.execution_count || 0}</span>
                    <span>Priority: {rule.priority}</span>
                  </div>
                </div>
                <div className="card-actions">
                  <button className="btn-sm btn-edit" onClick={() => openModal('automation', rule)}>Edit</button>
                  <button className="btn-sm btn-delete" onClick={() => deleteAutomation(rule.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === 'apikeys' && (
        <div className="tab-content">
          <div className="content-header">
            <h2>API Keys</h2>
            <button className="btn-create" onClick={() => openModal('apikey')}>
              + Generate API Key
            </button>
          </div>

          <div className="apikeys-table">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Key Prefix</th>
                  <th>Permissions</th>
                  <th>Rate Limit</th>
                  <th>Last Used</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map(key => (
                  <tr key={key.id} className={!key.active ? 'inactive' : ''}>
                    <td><strong>{key.name}</strong></td>
                    <td><code>{key.key_prefix}***</code></td>
                    <td>{key.permissions?.join(', ') || 'N/A'}</td>
                    <td>{key.rate_limit_per_hour}/hr</td>
                    <td>{key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}</td>
                    <td>
                      <button className="btn-sm btn-delete" onClick={() => revokeAPIKey(key.id)}>
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for creating/editing */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {modalType === 'webhook' && (editingItem ? 'Edit Webhook' : 'Add Webhook')}
                {modalType === 'automation' && (editingItem ? 'Edit Automation' : 'Add Automation')}
                {modalType === 'apikey' && 'Generate API Key'}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="modal-body">
              {/* Webhook Form */}
              {modalType === 'webhook' && (
                <form onSubmit={handleWebhookSubmit}>
                  <div className="form-group">
                    <label>Name *</label>
                    <input type="text" value={webhookForm.name} 
                      onChange={(e) => setWebhookForm({...webhookForm, name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>URL *</label>
                    <input type="url" value={webhookForm.url} 
                      onChange={(e) => setWebhookForm({...webhookForm, url: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Event Type *</label>
                    <select value={webhookForm.event_type} 
                      onChange={(e) => setWebhookForm({...webhookForm, event_type: e.target.value})}>
                      <option value="visitor.created">Visitor Created</option>
                      <option value="visitor.approved">Visitor Approved</option>
                      <option value="incident.created">Incident Created</option>
                      <option value="incident.closed">Incident Closed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Secret (for signing)</label>
                    <input type="text" value={webhookForm.secret} 
                      onChange={(e) => setWebhookForm({...webhookForm, secret: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Headers (JSON)</label>
                    <textarea rows="4" value={webhookForm.headers} className="code-editor"
                      onChange={(e) => setWebhookForm({...webhookForm, headers: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="checkbox-label">
                      <input type="checkbox" checked={webhookForm.enabled}
                        onChange={(e) => setWebhookForm({...webhookForm, enabled: e.target.checked})} />
                      <span>Enabled</span>
                    </label>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn-primary">{editingItem ? 'Update' : 'Create'}</button>
                  </div>
                </form>
              )}

              {/* Automation Form */}
              {modalType === 'automation' && (
                <form onSubmit={handleAutomationSubmit}>
                  <div className="form-group">
                    <label>Name *</label>
                    <input type="text" value={automationForm.name} 
                      onChange={(e) => setAutomationForm({...automationForm, name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea rows="2" value={automationForm.description}
                      onChange={(e) => setAutomationForm({...automationForm, description: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Trigger Event *</label>
                    <select value={automationForm.trigger_event}
                      onChange={(e) => setAutomationForm({...automationForm, trigger_event: e.target.value})}>
                      <option value="incident.created">Incident Created</option>
                      <option value="visitor.approved">Visitor Approved</option>
                      <option value="watchlist.match">Watchlist Match</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Conditions (JSON) *</label>
                    <textarea rows="4" value={automationForm.conditions} className="code-editor"
                      onChange={(e) => setAutomationForm({...automationForm, conditions: e.target.value})} required />
                    <small>Example: {`{"severity": "critical"}`}</small>
                  </div>
                  <div className="form-group">
                    <label>Actions (JSON Array) *</label>
                    <textarea rows="4" value={automationForm.actions} className="code-editor"
                      onChange={(e) => setAutomationForm({...automationForm, actions: e.target.value})} required />
                    <small>Example: {`[{"type": "notify", "channel": "slack"}]`}</small>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Priority</label>
                      <input type="number" value={automationForm.priority}
                        onChange={(e) => setAutomationForm({...automationForm, priority: parseInt(e.target.value)})} />
                    </div>
                    <div className="form-group">
                      <label className="checkbox-label">
                        <input type="checkbox" checked={automationForm.enabled}
                          onChange={(e) => setAutomationForm({...automationForm, enabled: e.target.checked})} />
                        <span>Enabled</span>
                      </label>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn-primary">{editingItem ? 'Update' : 'Create'}</button>
                  </div>
                </form>
              )}

              {/* API Key Form */}
              {modalType === 'apikey' && (
                <>
                  {newApiKey ? (
                    <div className="apikey-result">
                      <div className="success-message">
                        <h3>✓ API Key Generated Successfully!</h3>
                        <p>Copy this key now - you won't be able to see it again.</p>
                      </div>
                      <div className="apikey-display">
                        <code>{newApiKey}</code>
                        <button className="btn-copy" onClick={() => {
                          navigator.clipboard.writeText(newApiKey);
                          alert('Copied to clipboard!');
                        }}>Copy</button>
                      </div>
                      <button className="btn-primary" onClick={() => { setShowModal(false); resetForms(); }}>
                        Done
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleAPIKeyGenerate}>
                      <div className="form-group">
                        <label>Key Name *</label>
                        <input type="text" value={apiKeyForm.name}
                          onChange={(e) => setApiKeyForm({...apiKeyForm, name: e.target.value})} required />
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <textarea rows="2" value={apiKeyForm.description}
                          onChange={(e) => setApiKeyForm({...apiKeyForm, description: e.target.value})} />
                      </div>
                      <div className="form-group">
                        <label>Permissions</label>
                        <div className="checkbox-group">
                          {['read', 'write', 'admin'].map(perm => (
                            <label key={perm} className="checkbox-label">
                              <input type="checkbox" 
                                checked={apiKeyForm.permissions.includes(perm)}
                                onChange={(e) => {
                                  const perms = e.target.checked
                                    ? [...apiKeyForm.permissions, perm]
                                    : apiKeyForm.permissions.filter(p => p !== perm);
                                  setApiKeyForm({...apiKeyForm, permissions: perms});
                                }} />
                              <span>{perm}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Rate Limit (per hour)</label>
                        <input type="number" value={apiKeyForm.rate_limit_per_hour}
                          onChange={(e) => setApiKeyForm({...apiKeyForm, rate_limit_per_hour: parseInt(e.target.value)})} />
                      </div>
                      <div className="modal-footer">
                        <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                        <button type="submit" className="btn-primary">Generate Key</button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationsHub;
