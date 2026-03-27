/**
 * AutoApprovalRules Component
 * Phase 2.2: Resident interface to manage auto-approval rules
 * 
 * Privacy: Rules encrypted, visible only to rule owner
 */

import React, { useState, useEffect } from 'react';

import autoApprovalService from '../../services/autoApprovalService';
import Button from '../ui/Button';

const AutoApprovalRules = () => {
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  useEffect(() => {
    loadRules();
    loadCategories();
  }, []);

  const loadRules = async () => {
    try {
      setLoading(true);
      const response = await autoApprovalService.getRules();
      setRules(response.data || []);
    } catch (err) {
      setError('Failed to load rules');
      console.error('Load rules error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await autoApprovalService.getCategories();
      setCategories(response.categories || []);
    } catch (err) {
      console.error('Load categories error:', err);
    }
  };

  const handleToggle = async (ruleId) => {
    try {
      await autoApprovalService.toggleRule(ruleId);
      loadRules();
    } catch (err) {
      setError('Failed to toggle rule');
    }
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm('Delete this auto-approval rule?')) return;
    
    try {
      await autoApprovalService.deleteRule(ruleId);
      loadRules();
    } catch (err) {
      setError('Failed to delete rule');
    }
  };

  const handleExport = async () => {
    try {
      const data = await autoApprovalService.exportRules();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'auto-approval-rules-export.json';
      a.click();
    } catch (err) {
      setError('Failed to export rules');
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      family: '👨‍👩‍👧‍👦',
      friend: '🤝',
      service: '🔧',
      delivery: '📦',
      business: '💼',
      custom: '⚙️'
    };
    return icons[category] || '📋';
  };

  const formatTimeRestrictions = (restrictions) => {
    if (!restrictions || Object.keys(restrictions).length === 0) {
      return 'Anytime';
    }
    
    const parts = [];
    if (restrictions.days?.length) {
      parts.push(restrictions.days.join(', ').toUpperCase());
    }
    if (restrictions.start_time && restrictions.end_time) {
      parts.push(`${restrictions.start_time} - ${restrictions.end_time}`);
    }
    return parts.join(' • ') || 'Anytime';
  };

  if (loading && rules.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div data-tour="auto-approval" className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">🤖 Auto-Approval Rules</h2>
            <p className="text-sm text-gray-500 dark:text-gray-300">
              Trusted visitors are automatically approved without your confirmation
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleExport}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              📥 Export
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              + Add Rule
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Privacy Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-2">🔒 Privacy Protection</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Your rules are <strong>encrypted</strong> and visible only to you</li>
          <li>• Guards see only "Auto-approved by resident", not rule details</li>
          <li>• Admins cannot view your individual rules</li>
          <li>• You can export or delete your rules anytime</li>
        </ul>
      </div>

      {/* Rules List */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow divide-y divide-gray-200">
        {rules.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-300">
            <span className="text-4xl">📋</span>
            <p className="mt-2">No auto-approval rules yet</p>
            <p className="text-sm">Create rules to automatically approve trusted visitors</p>
          </div>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className="p-4 hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">
                    {getCategoryIcon(rule.matchCriteria?.category)}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white">{rule.ruleName}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        rule.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-600 dark:text-gray-200'
                      }`}>
                        {rule.isActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-200 mt-1">
                      {rule.matchCriteria?.visitorName && (
                        <span>Name: {rule.matchCriteria.visitorName}</span>
                      )}
                      {rule.matchCriteria?.visitorPhone && (
                        <span className="ml-2">Phone: {rule.matchCriteria.visitorPhone}</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                      📅 {formatTimeRestrictions(rule.timeRestrictions)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Used {rule.matchCount || 0} times
                      {rule.lastMatchedAt && (
                        <span className="ml-2">
                          • Last: {new Date(rule.lastMatchedAt).toLocaleDateString()}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleToggle(rule.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      rule.isActive ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-slate-800 transition-transform ${
                      rule.isActive ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </Button>
                  <Button
                    onClick={() => setEditingRule(rule)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:text-gray-200"
                  >
                    ✏️
                  </Button>
                  <Button
                    onClick={() => handleDelete(rule.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    🗑️
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingRule) && (
        <RuleModal
          rule={editingRule}
          categories={categories}
          onClose={() => {
            setShowCreateModal(false);
            setEditingRule(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingRule(null);
            loadRules();
          }}
        />
      )}
    </div>
  );
};

/**
 * Rule Create/Edit Modal
 */
const RuleModal = ({ rule, categories, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    ruleName: rule?.ruleName || '',
    visitorName: rule?.matchCriteria?.visitorName || '',
    visitorPhone: rule?.matchCriteria?.visitorPhone || '',
    category: rule?.matchCriteria?.category || 'custom',
    days: rule?.timeRestrictions?.days || [],
    startTime: rule?.timeRestrictions?.start_time || '',
    endTime: rule?.timeRestrictions?.end_time || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const daysOfWeek = [
    { value: 'mon', label: 'Mon' },
    { value: 'tue', label: 'Tue' },
    { value: 'wed', label: 'Wed' },
    { value: 'thu', label: 'Thu' },
    { value: 'fri', label: 'Fri' },
    { value: 'sat', label: 'Sat' },
    { value: 'sun', label: 'Sun' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const ruleData = {
        ruleName: formData.ruleName,
        visitorName: formData.visitorName,
        visitorPhone: formData.visitorPhone,
        category: formData.category,
        timeRestrictions: {
          days: formData.days.length > 0 ? formData.days : undefined,
          start_time: formData.startTime || undefined,
          end_time: formData.endTime || undefined
        }
      };

      if (rule) {
        await autoApprovalService.updateRule(rule.id, {
          ruleName: ruleData.ruleName,
          matchCriteria: {
            visitorName: ruleData.visitorName,
            visitorPhone: ruleData.visitorPhone,
            category: ruleData.category
          },
          timeRestrictions: ruleData.timeRestrictions
        });
      } else {
        await autoApprovalService.createRule(ruleData);
      }

      onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save rule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">
            {rule ? 'Edit Rule' : 'Create Auto-Approval Rule'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Rule Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rule Name *
            </label>
            <input
              type="text"
              name="ruleName"
              value={formData.ruleName}
              onChange={handleChange}
              required
              placeholder="e.g., Mom's weekly visit"
              className="w-full border-gray-300 rounded-md shadow-sm"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full border-gray-300 rounded-md shadow-sm"
            >
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Visitor Match Criteria */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Match Visitor By
            </label>
            <input
              type="text"
              name="visitorName"
              value={formData.visitorName}
              onChange={handleChange}
              placeholder="Visitor name (partial match)"
              className="w-full border-gray-300 rounded-md shadow-sm"
            />
            <input
              type="tel"
              name="visitorPhone"
              value={formData.visitorPhone}
              onChange={handleChange}
              placeholder="Visitor phone number"
              className="w-full border-gray-300 rounded-md shadow-sm"
            />
            <p className="text-xs text-gray-500 dark:text-gray-300">Enter name, phone, or both</p>
          </div>

          {/* Time Restrictions */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Time Restrictions (Optional)
            </label>
            
            <div className="flex flex-wrap gap-2">
              {daysOfWeek.map(day => (
                <Button
                  key={day.value}
                  type="button"
                  onClick={() => handleDayToggle(day.value)}
                  className={`px-3 py-1 text-sm rounded-full border ${
                    formData.days.includes(day.value)
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {day.label}
                </Button>
              ))}
            </div>

            <div className="flex gap-2 items-center">
              <input
                type="time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                className="border-gray-300 rounded-md shadow-sm"
              />
              <span className="text-gray-500 dark:text-gray-300">to</span>
              <input
                type="time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                className="border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-300">Leave empty for anytime approval</p>
          </div>

          {/* Privacy Notice */}
          <div className="bg-gray-50 p-3 rounded-md">
            <p className="text-xs text-gray-600 dark:text-gray-200">
              🔒 This rule is encrypted and only you can see its details.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (rule ? 'Update Rule' : 'Create Rule')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AutoApprovalRules;
