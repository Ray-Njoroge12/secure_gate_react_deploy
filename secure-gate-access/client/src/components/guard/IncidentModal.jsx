/**
 * @file IncidentModal.jsx
 * @description Phase G4 - Modal for logging incidents
 * Allows guards to quickly report incidents with categorization
 */

import React, { useState } from 'react';
import { Button, Icon } from '../ui';
import useModalAccessibility from '../../hooks/useModalAccessibility';
import api from '../../utils/apiClient';

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
    { value: 'suspicious', label: 'Suspicious Behavior', icon: 'ShieldAlert', description: 'Unusual or concerning visitor behavior' },
    { value: 'document_issue', label: 'Document Issue', icon: 'FileWarning', description: 'ID verification or document problems' },
    { value: 'vehicle', label: 'Vehicle Concern', icon: 'Car', description: 'Vehicle-related incidents' },
    { value: 'behavior', label: 'Inappropriate Behavior', icon: 'AlertTriangle', description: 'Conduct violations' },
    { value: 'system_error', label: 'System Error', icon: 'Monitor', description: 'Technical or system issues' },
    { value: 'other', label: 'Other', icon: 'FileText', description: 'Other incidents not covered above' }
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

      await api.post('/api/guard/incidents', {
        visitorId: visitor?.id || null,
        category: formData.category,
        severity: formData.severity,
        description: formData.description.trim()
      });

      // Success
      onClose({ success: true, message: 'Incident logged successfully' });
      
      // Reset form
      setFormData({
        category: '',
        severity: 'medium',
        description: ''
      });

    } catch (err) {
      setError(err.response?.data?.message || err.message);
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
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close incident report dialog">
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
            <div className="grid grid-cols-1 gap-2">
              {categories.map(cat => (
                <label
                  key={cat.value}
                  className={`
                    flex items-start p-3 border-2 rounded-lg cursor-pointer transition-all
                    ${formData.category === cat.value 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-500'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="category"
                    value={cat.value}
                    checked={formData.category === cat.value}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="mt-1 mr-3"
                  />
                  <div className="flex items-start gap-2">
                    <Icon name={cat.icon} className="w-5 h-5 mt-0.5 flex-shrink-0 text-gray-600 dark:text-gray-300" aria-hidden="true" />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{cat.label}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-200 mt-0.5">{cat.description}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Severity Level *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {severityLevels.map(level => (
                <Button
                  key={level.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, severity: level.value })}
                  className={`
                    px-4 py-2 rounded-lg border-2 font-medium transition-all
                    ${formData.severity === level.value 
                      ? `${level.color} border-current` 
                      : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-200 hover:border-gray-300 dark:hover:border-slate-500'
                    }
                  `}
                >
                  {level.label}
                </Button>
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
              placeholder="Describe what happened in detail..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
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
