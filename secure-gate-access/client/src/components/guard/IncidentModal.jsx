/**
 * @file IncidentModal.jsx
 * @description Phase G4 - Modal for logging incidents
 * Allows guards to quickly report incidents with categorization
 */

import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '../ui';
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
    { value: 'suspicious', label: '🚨 Suspicious Behavior', description: 'Unusual or concerning visitor behavior' },
    { value: 'document_issue', label: '📄 Document Issue', description: 'ID verification or document problems' },
    { value: 'vehicle', label: '🚗 Vehicle Concern', description: 'Vehicle-related incidents' },
    { value: 'behavior', label: '⚠️ Inappropriate Behavior', description: 'Conduct violations' },
    { value: 'system_error', label: '💻 System Error', description: 'Technical or system issues' },
    { value: 'other', label: '📝 Other', description: 'Other incidents not covered above' }
  ];

  const severityLevels = [
    { value: 'low', label: 'Low', color: 'text-green-600 bg-green-50 border-green-200' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
    { value: 'high', label: 'High', color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { value: 'critical', label: 'Critical', color: 'text-red-600 bg-red-50 border-red-200' }
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
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="incident-modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={handleClose}></div>

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div ref={modalRef} tabIndex={-1} className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
            <h2 id="incident-modal-title" className="text-xl font-semibold text-gray-900 dark:text-white">Log Incident</h2>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 dark:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Visitor Info */}
            {visitor && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm font-medium text-blue-900">Incident Related To:</div>
                <div className="text-sm text-blue-700 mt-1">
                  {visitor.name} {visitor.phone && `• ${visitor.phone}`}
                </div>
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">{error}</div>
              </div>
            )}

            {/* Category Selection */}
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
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:border-slate-600'
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
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{cat.label}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-200 mt-0.5">{cat.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Severity Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Severity Level *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {severityLevels.map(level => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, severity: level.value })}
                    className={`
                      px-4 py-2 rounded-lg border-2 font-medium transition-all
                      ${formData.severity === level.value 
                        ? `${level.color} border-current` 
                        : 'bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-200 hover:border-gray-300 dark:border-slate-600'
                      }
                    `}
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
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

            {/* Actions */}
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
    </div>
  );
};

export default IncidentModal;
