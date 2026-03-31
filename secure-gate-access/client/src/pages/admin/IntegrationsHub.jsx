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

import React, { useState, useEffect, useCallback } from 'react';

import { Card, Button, Badge, Modal, Loading, EmptyState } from '../../components/ui';
import './IntegrationsHub.css';

const TAB_LABELS = {
  webhooks: 'Webhooks',
  automation: 'Automation',
  apikeys: 'API Keys'
};

const WEBHOOK_EVENTS = [
  { value: 'visitor.created', label: 'Visitor Created' },
  { value: 'visitor.approved', label: 'Visitor Approved' },
  { value: 'incident.created', label: 'Incident Created' },
  { value: 'incident.closed', label: 'Incident Closed' }
];

const AUTOMATION_EVENTS = [
  { value: 'incident.created', label: 'Incident Created' },
  { value: 'visitor.approved', label: 'Visitor Approved' },
  { value: 'watchlist.match', label: 'Watchlist Match' }
];

const PERMISSION_OPTIONS = ['read', 'write', 'admin'];

const toPrettyJson = (value, fallback) => {
  try {
    return JSON.stringify(value ?? fallback, null, 2);
  } catch {
    return fallback;
  }
};

const IntegrationsHub = () => {
  const [activeTab, setActiveTab] = useState('webhooks'); // webhooks, automation, apikeys
  const [webhooks, setWebhooks] = useState([]);
  const [automationRules, setAutomationRules] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'webhook', 'automation', 'apikey'
  const [editingItem, setEditingItem] = useState(null);
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [newApiKey, setNewApiKey] = useState(null);

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

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setEditingItem(null);
    setFormError('');
    setNewApiKey(null);
  };

  const clearNotice = () => setNotice(null);

  const showSuccess = (message) => setNotice({ type: 'success', message });
  const showError = (message) => setNotice({ type: 'error', message });

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/webhooks', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load webhooks');
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.data || []);
      }
    } catch (err) {
      showError(err.message || 'Unable to load webhooks');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAutomationRules = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/automations', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load automation rules');
      if (response.ok) {
        const data = await response.json();
        setAutomationRules(data.data || []);
      }
    } catch (err) {
      showError(err.message || 'Unable to load automation rules');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAPIKeys = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/api-keys', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load API keys');
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.data || []);
      }
    } catch (err) {
      showError(err.message || 'Unable to load API keys');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'webhooks') {
      fetchWebhooks();
    } else if (activeTab === 'automation') {
      fetchAutomationRules();
    } else if (activeTab === 'apikeys') {
      fetchAPIKeys();
    }
  }, [activeTab, fetchAPIKeys, fetchAutomationRules, fetchWebhooks]);

  const handleWebhookSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      let parsedHeaders;
      try {
        parsedHeaders = JSON.parse(webhookForm.headers);
      } catch {
        setFormError('Webhook headers must be valid JSON.');
        return;
      }

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
          headers: parsedHeaders
        })
      });

      if (!response.ok) throw new Error('Failed to save webhook');

      await fetchWebhooks();
      showSuccess(`Webhook ${editingItem ? 'updated' : 'created'} successfully.`);
      closeModal();
    } catch (err) {
      setFormError(err.message || 'Failed to save webhook');
    }
  };

  const handleAutomationSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      let parsedConditions;
      let parsedActions;
      try {
        parsedConditions = JSON.parse(automationForm.conditions);
        parsedActions = JSON.parse(automationForm.actions);
      } catch {
        setFormError('Conditions and actions must be valid JSON.');
        return;
      }

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
          conditions: parsedConditions,
          actions: parsedActions
        })
      });

      if (!response.ok) throw new Error('Failed to save automation');

      await fetchAutomationRules();
      showSuccess(`Automation rule ${editingItem ? 'updated' : 'created'} successfully.`);
      closeModal();
    } catch (err) {
      setFormError(err.message || 'Failed to save automation');
    }
  };

  const handleAPIKeyGenerate = async (e) => {
    e.preventDefault();
    setFormError('');
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
      showSuccess('API key generated successfully. Copy it now because it will not be shown again.');
      await fetchAPIKeys();
    } catch (err) {
      setFormError(err.message || 'Failed to generate API key');
    }
  };

  const testWebhook = async (id) => {
    try {
      setActionLoading({ type: 'webhook-test', id });
      const response = await fetch(`/api/admin/webhooks/${id}/test`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Test failed');
      showSuccess('Webhook test successful.');
    } catch (err) {
      showError(err.message || 'Webhook test failed');
    } finally {
      setActionLoading(null);
    }
  };

  const requestConfirmAction = (type, item) => {
    const configByType = {
      'delete-webhook': {
        title: `Delete ${item.name}?`,
        description: 'This will permanently remove the webhook and stop future deliveries.',
        confirmLabel: 'Delete webhook'
      },
      'delete-automation': {
        title: `Delete ${item.name}?`,
        description: 'This will permanently remove the automation rule from the system.',
        confirmLabel: 'Delete rule'
      },
      'revoke-apikey': {
        title: `Revoke ${item.name}?`,
        description: 'This API key will stop working immediately and cannot be restored.',
        confirmLabel: 'Revoke key'
      }
    };

    setConfirmAction({
      type,
      item,
      ...configByType[type]
    });
  };

  const performConfirmAction = async () => {
    if (!confirmAction?.item) return;

    setActionLoading({ type: confirmAction.type, id: confirmAction.item.id });

    try {
      if (confirmAction.type === 'delete-webhook') {
        const response = await fetch(`/api/admin/webhooks/${confirmAction.item.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to delete webhook');
        await fetchWebhooks();
        showSuccess('Webhook deleted successfully.');
      } else if (confirmAction.type === 'delete-automation') {
        const response = await fetch(`/api/admin/automations/${confirmAction.item.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to delete automation');
        await fetchAutomationRules();
        showSuccess('Automation rule deleted successfully.');
      } else if (confirmAction.type === 'revoke-apikey') {
        const response = await fetch(`/api/admin/api-keys/${confirmAction.item.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to revoke API key');
        await fetchAPIKeys();
        showSuccess('API key revoked successfully.');
      }

      setConfirmAction(null);
    } catch (err) {
      showError(err.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const copyApiKey = async () => {
    try {
      await navigator.clipboard.writeText(newApiKey);
      showSuccess('API key copied to clipboard.');
    } catch {
      showError('Unable to copy the API key.');
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
    setFormError('');
  };

  const openModal = (type, item = null) => {
    resetForms();
    setModalType(type);
    setEditingItem(item);
    setFormError('');
    setNewApiKey(null);
    
    if (item) {
      if (type === 'webhook') {
        setWebhookForm({
          name: item.name,
          url: item.url,
          event_type: item.event_type,
          secret: item.secret || '',
          headers: toPrettyJson(item.headers, '{}'),
          enabled: item.enabled
        });
      } else if (type === 'automation') {
        setAutomationForm({
          name: item.name,
          description: item.description || '',
          trigger_event: item.trigger_event,
          conditions: toPrettyJson(item.conditions, '{}'),
          actions: toPrettyJson(item.actions, '[]'),
          enabled: item.enabled,
          priority: item.priority || 0
        });
      }
    } else {
      resetForms();
    }
    
    setShowModal(true);
  };

  const tabCounts = {
    webhooks: webhooks.length,
    automation: automationRules.length,
    apikeys: apiKeys.length
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Card className="flex w-full max-w-md items-center justify-center gap-3 p-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <Loading />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading integrations...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="integrations-hub space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Integrations Hub
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Webhooks, automation rules, and API access in one place.
          </p>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {tabCounts[activeTab]} {TAB_LABELS[activeTab].toLowerCase()}
        </p>
      </div>

      {notice && (
        <div
          role={notice.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
            notice.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-200'
          }`}
        >
          <span>{notice.message}</span>
          <Button variant="ghost" size="sm" onClick={clearNotice} className="shrink-0">
            Dismiss
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Integrations sections">
        <Button 
          variant="ghost"
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            activeTab === 'webhooks'
              ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-500/10 dark:text-brand-300'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
          onClick={() => setActiveTab('webhooks')}
          role="tab"
          aria-selected={activeTab === 'webhooks'}
          aria-controls="webhooks-panel"
          id="webhooks-tab"
        >
          Webhooks ({tabCounts.webhooks})
        </Button>
        <Button 
          variant="ghost"
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            activeTab === 'automation'
              ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-500/10 dark:text-brand-300'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
          onClick={() => setActiveTab('automation')}
          role="tab"
          aria-selected={activeTab === 'automation'}
          aria-controls="automation-panel"
          id="automation-tab"
        >
          Automation ({tabCounts.automation})
        </Button>
        <Button 
          variant="ghost"
          className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
            activeTab === 'apikeys'
              ? 'border-brand-500 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-500/10 dark:text-brand-300'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }`}
          onClick={() => setActiveTab('apikeys')}
          role="tab"
          aria-selected={activeTab === 'apikeys'}
          aria-controls="apikeys-panel"
          id="apikeys-tab"
        >
          API Keys ({tabCounts.apikeys})
        </Button>
      </div>

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <section
          id="webhooks-panel"
          role="tabpanel"
          aria-labelledby="webhooks-tab"
          className="space-y-4"
        >
          <Card className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Webhooks</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Route product events to external systems.</p>
              </div>
              <Button variant="primary" onClick={() => openModal('webhook')}>
                Add Webhook
              </Button>
            </div>
          </Card>

          <div className="grid gap-4">
            {webhooks.map(webhook => (
              <Card key={webhook.id} className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{webhook.name}</h3>
                      <Badge variant={webhook.enabled ? 'success' : 'default'} size="sm">
                        {webhook.enabled ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="break-all text-sm text-slate-500 dark:text-slate-300">{webhook.url}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-300">Event: {webhook.event_type}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>Successes: {webhook.success_count || 0}</span>
                      <span>Failures: {webhook.failure_count || 0}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => testWebhook(webhook.id)}
                      disabled={actionLoading?.type === 'webhook-test' && actionLoading.id === webhook.id}
                    >
                      Test
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openModal('webhook', webhook)}>
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => requestConfirmAction('delete-webhook', webhook)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {webhooks.length === 0 && (
              <EmptyState title="No Webhooks" description="Create a webhook to send integration events outside the platform." />
            )}
          </div>
        </section>
      )}

      {/* Automation Tab */}
      {activeTab === 'automation' && (
        <section
          id="automation-panel"
          role="tabpanel"
          aria-labelledby="automation-tab"
          className="space-y-4"
        >
          <Card className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Automation Rules</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Trigger internal workflows based on security events.</p>
              </div>
              <Button variant="primary" onClick={() => openModal('automation')}>
                Add Rule
              </Button>
            </div>
          </Card>

          <div className="grid gap-4">
            {automationRules.map(rule => (
              <Card key={rule.id} className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{rule.name}</h3>
                      <Badge variant={rule.enabled ? 'success' : 'default'} size="sm">
                        {rule.enabled ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-300">{rule.description || 'No description'}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-300">Trigger: {rule.trigger_event}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>Executed: {rule.execution_count || 0}</span>
                      <span>Priority: {rule.priority}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => openModal('automation', rule)}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => requestConfirmAction('delete-automation', rule)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
            {automationRules.length === 0 && (
              <EmptyState title="No Automation Rules" description="Add rules to automatically react to security events." />
            )}
          </div>
        </section>
      )}

      {/* API Keys Tab */}
      {activeTab === 'apikeys' && (
        <section
          id="apikeys-panel"
          role="tabpanel"
          aria-labelledby="apikeys-tab"
          className="space-y-4"
        >
          <Card className="p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">API Keys</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Issue and revoke programmatic access keys.</p>
              </div>
              <Button variant="primary" onClick={() => openModal('apikey')}>
                Generate API Key
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Key Prefix</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Permissions</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Rate Limit</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Last Used</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {apiKeys.map(key => (
                    <tr key={key.id} className={!key.active ? 'bg-slate-50/70 dark:bg-slate-900/40' : ''}>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{key.name}</td>
                      <td className="px-4 py-3 font-mono text-sm text-slate-600 dark:text-slate-300">{key.key_prefix}***</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        {key.permissions?.join(', ') || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{key.rate_limit_per_hour}/hr</td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                        {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => requestConfirmAction('revoke-apikey', key)}
                          >
                            Revoke
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {apiKeys.length === 0 && (
              <div className="border-t border-slate-200 p-5 dark:border-slate-700">
                <EmptyState title="No API Keys" description="Generate a key for service-to-service integrations." />
              </div>
            )}
          </Card>
        </section>
      )}

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={closeModal}
          title={
            modalType === 'webhook'
              ? (editingItem ? 'Edit Webhook' : 'Add Webhook')
              : modalType === 'automation'
                ? (editingItem ? 'Edit Automation' : 'Add Automation')
                : 'Generate API Key'
          }
          size="xl"
        >
          <div className="space-y-4">
            {formError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/30 dark:bg-red-950/40 dark:text-red-200"
              >
                {formError}
              </div>
            )}

            {modalType === 'webhook' && (
              <form onSubmit={handleWebhookSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200 sm:col-span-2">
                    <span>Name *</span>
                    <input
                      type="text"
                      value={webhookForm.name}
                      onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200 sm:col-span-2">
                    <span>URL *</span>
                    <input
                      type="url"
                      value={webhookForm.url}
                      onChange={(e) => setWebhookForm({ ...webhookForm, url: e.target.value })}
                      required
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                </div>
                <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span>Event Type *</span>
                  <select
                    value={webhookForm.event_type}
                    onChange={(e) => setWebhookForm({ ...webhookForm, event_type: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {WEBHOOK_EVENTS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <span>Secret (for signing)</span>
                    <input
                      type="text"
                      value={webhookForm.secret}
                      onChange={(e) => setWebhookForm({ ...webhookForm, secret: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <span>Enabled</span>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600">
                      <input
                        type="checkbox"
                        checked={webhookForm.enabled}
                        onChange={(e) => setWebhookForm({ ...webhookForm, enabled: e.target.checked })}
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-300">Webhook is active</span>
                    </div>
                  </label>
                </div>
                <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span>Headers (JSON)</span>
                  <textarea
                    rows="4"
                    value={webhookForm.headers}
                    onChange={(e) => setWebhookForm({ ...webhookForm, headers: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={closeModal}>Cancel</Button>
                  <Button variant="primary" type="submit">{editingItem ? 'Update' : 'Create'}</Button>
                </div>
              </form>
            )}

            {modalType === 'automation' && (
              <form onSubmit={handleAutomationSubmit} className="space-y-4">
                <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span>Name *</span>
                  <input
                    type="text"
                    value={automationForm.name}
                    onChange={(e) => setAutomationForm({ ...automationForm, name: e.target.value })}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>
                <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span>Description</span>
                  <textarea
                    rows="2"
                    value={automationForm.description}
                    onChange={(e) => setAutomationForm({ ...automationForm, description: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                </label>
                <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span>Trigger Event *</span>
                  <select
                    value={automationForm.trigger_event}
                    onChange={(e) => setAutomationForm({ ...automationForm, trigger_event: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  >
                    {AUTOMATION_EVENTS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <span>Priority</span>
                    <input
                      type="number"
                      value={automationForm.priority}
                      onChange={(e) => setAutomationForm({ ...automationForm, priority: parseInt(e.target.value, 10) || 0 })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                    <span>Enabled</span>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-600">
                      <input
                        type="checkbox"
                        checked={automationForm.enabled}
                        onChange={(e) => setAutomationForm({ ...automationForm, enabled: e.target.checked })}
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-300">Rule is active</span>
                    </div>
                  </label>
                </div>
                <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span>Conditions (JSON) *</span>
                  <textarea
                    rows="4"
                    value={automationForm.conditions}
                    onChange={(e) => setAutomationForm({ ...automationForm, conditions: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <small className="text-xs text-slate-500 dark:text-slate-400">Example: {"{\"severity\": \"critical\"}"}</small>
                </label>
                <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span>Actions (JSON Array) *</span>
                  <textarea
                    rows="4"
                    value={automationForm.actions}
                    onChange={(e) => setAutomationForm({ ...automationForm, actions: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <small className="text-xs text-slate-500 dark:text-slate-400">Example: {"[{\"type\": \"notify\", \"channel\": \"slack\"}]"} </small>
                </label>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={closeModal}>Cancel</Button>
                  <Button variant="primary" type="submit">{editingItem ? 'Update' : 'Create'}</Button>
                </div>
              </form>
            )}

            {modalType === 'apikey' && (
              <>
                {newApiKey ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-100">
                      <h3 className="font-semibold">API key generated</h3>
                      <p className="mt-1 text-sm">Copy it now. It will not be shown again.</p>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Secret key</label>
                      <div className="flex flex-col gap-3 rounded-lg border border-slate-300 bg-white p-4 dark:border-slate-600 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
                        <code className="break-all font-mono text-sm text-slate-900 dark:text-slate-100">{newApiKey}</code>
                        <Button variant="secondary" onClick={copyApiKey}>Copy</Button>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button variant="primary" onClick={closeModal}>Done</Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleAPIKeyGenerate} className="space-y-4">
                    <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      <span>Key Name *</span>
                      <input
                        type="text"
                        value={apiKeyForm.name}
                        onChange={(e) => setApiKeyForm({ ...apiKeyForm, name: e.target.value })}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </label>
                    <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      <span>Description</span>
                      <textarea
                        rows="2"
                        value={apiKeyForm.description}
                        onChange={(e) => setApiKeyForm({ ...apiKeyForm, description: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </label>
                    <div className="space-y-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Permissions</span>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {PERMISSION_OPTIONS.map((perm) => (
                          <label key={perm} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:text-slate-200">
                            <input
                              type="checkbox"
                              checked={apiKeyForm.permissions.includes(perm)}
                              onChange={(e) => {
                                const perms = e.target.checked
                                  ? [...apiKeyForm.permissions, perm]
                                  : apiKeyForm.permissions.filter((p) => p !== perm);
                                setApiKeyForm({ ...apiKeyForm, permissions: perms });
                              }}
                            />
                            <span className="capitalize">{perm}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <label className="block space-y-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      <span>Rate Limit (per hour)</span>
                      <input
                        type="number"
                        value={apiKeyForm.rate_limit_per_hour}
                        onChange={(e) => setApiKeyForm({ ...apiKeyForm, rate_limit_per_hour: parseInt(e.target.value, 10) || 0 })}
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
                      />
                    </label>
                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={closeModal}>Cancel</Button>
                      <Button variant="primary" type="submit">Generate Key</Button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </Modal>
      )}

      {confirmAction && (
        <Modal
          isOpen={Boolean(confirmAction)}
          onClose={() => setConfirmAction(null)}
          title={confirmAction.title}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {confirmAction.description}
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmAction(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={performConfirmAction}
                disabled={actionLoading?.id === confirmAction.item.id && actionLoading?.type === confirmAction.type}
              >
                {confirmAction.confirmLabel}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default IntegrationsHub;
