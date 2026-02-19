/**
 * @file IncidentModal.jsx
 * @description Phase G4 - Modal for logging incidents
 * Allows guards to quickly report incidents with categorization
 */

import React, { useState } from 'react';
import { Button, Icon } from '../ui';
import useModalAccessibility from '../../hooks/useModalAccessibility';

const IncidentModal = ({ isOpen, onClose, visitor }) => {
  const { modalRef } = useModalAccessibility(isOpen, onClose);
  const [formData, setFormData] = useState({
    category: '',
    severity: 'medium',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const categories = [
    { value: 'suspicious', label: 'Suspicious Behavior', icon: 'ShieldAlert', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', description: 'Unusual or concerning visitor behavior' },
    { value: 'document_issue', label: 'Document Issue', icon: 'FileWarning', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', description: 'ID verification or document problems' },
    { value: 'vehicle', label: 'Vehicle Concern', icon: 'Car', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', description: 'Vehicle-related incidents' },
    { value: 'behavior', label: 'Inappropriate Behavior', icon: 'UserX', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', description: 'Conduct violations' },
    { value: 'system_error', label: 'System Error', icon: 'Cpu', color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-900/20', description: 'Technical or system issues' },
    { value: 'other', label: 'Other', icon: 'MoreHorizontal', color: 'text-gray-400', bg: 'bg-gray-50 dark:bg-gray-900/20', description: 'Other incidents not covered above' }
  ];

  const severityLevels = [
    { value: 'low', label: 'Low', color: 'text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' },
    { value: 'high', label: 'High', color: 'text-orange-600 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' },
    { value: 'critical', label: 'Critical', color: 'text-red-600 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.category) {
      setError('Please select an incident category');
      return;
    }

    if (!formData.description.trim()) {
      setError('Please provide a description of the incident');
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch('/api/guard/incidents', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          visitorId: visitor?.id || null,
          category: formData.category,
          severity: formData.severity,
          description: formData.description.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to log incident');
      }

      // Success
      onClose({ success: true, message: 'Incident logged successfully' });

      // Reset form
      setFormData({
        category: '',
        severity: 'medium',
        description: ''
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({ category: '', severity: 'medium', description: '' });
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={modalRef}
        className="bg-white dark:bg-slate-800 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-700"
        role="dialog"
        aria-labelledby="incident-modal-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
          <h2 id="incident-modal-title" className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Icon name="AlertCircle" className="w-5 h-5 text-red-600" />
            Report Incident
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-3 rounded-lg text-sm border border-red-200 dark:border-red-800 flex items-center gap-2">
              <Icon name="AlertCircle" className="w-4 h-4" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Incident Category *
            </label>
            <div className="grid grid-cols-1 gap-2 overflow-y-auto max-h-[300px] pr-1">
              {categories.map(cat => (
                <label
                  key={cat.value}
                  className={`
                    flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all
                    ${formData.category === cat.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="category"
                    value={cat.value}
                    checked={formData.category === cat.value}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="sr-only" /* Hide radio but keep accessible */
                  />
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center mr-3 flex-shrink-0
                    ${formData.category === cat.value ? 'bg-blue-100 dark:bg-blue-800' : 'bg-gray-100 dark:bg-slate-700'}
                  `}>
                    <Icon name={cat.icon} className={`w-5 h-5 ${cat.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-900 dark:text-white text-sm md:text-base">{cat.label}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{cat.description}</div>
                  </div>
                  {formData.category === cat.value && (
                    <Icon name="check" className="w-5 h-5 text-blue-600 ml-2" />
                  )}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Severity Level *
            </label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {severityLevels.map(lvl => (
                <button
                  key={lvl.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, severity: lvl.value })}
                  className={`
                    py-2.5 px-3 text-xs font-bold rounded-xl border-2 transition-all
                    ${formData.severity === lvl.value
                      ? `${lvl.activeClass} border-transparent ring-2 ring-offset-2 ring-blue-500/20 shadow-sm scale-[1.02]`
                      : 'border-gray-100 dark:border-slate-700 text-gray-500 dark:text-gray-400 hover:border-gray-200 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                    }
                  `}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Incident Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-100 dark:border-slate-700 rounded-xl dark:bg-slate-800 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none text-sm md:text-base"
              placeholder="Describe the incident details (location, people involved, actions taken)..."
            />
            <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
              Be as specific as possible. Include time, location, and any witnesses.
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Logging Incident...' : 'Log Incident'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default IncidentModal;
