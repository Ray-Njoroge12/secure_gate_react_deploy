/**
 * AddDirections Component
 * Phase 2.3: Resident interface to add custom directions for visitors
 * 
 * Privacy: Instructions visible only to the specific visitor
 */

import React, { useState } from 'react';
import directionsService from '../../services/directionsService';

const AddDirections = ({ visitorId, onSave, onSkip }) => {
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Common instruction templates
  const templates = [
    {
      label: '🚗 Parking',
      text: 'Park in the visitor parking area near the gate. The guard will direct you.'
    },
    {
      label: '🚶 Walking',
      text: 'Take the left path after entering, my block is the second on the right.'
    },
    {
      label: '📞 Call on arrival',
      text: 'Please call me when you arrive at the gate.'
    },
    {
      label: '🏢 Building',
      text: 'Take the elevator to the 3rd floor, apartment 3B.'
    }
  ];

  const handleTemplateClick = (text) => {
    setInstructions(prev => prev ? `${prev}\n\n${text}` : text);
  };

  const handleSubmit = async () => {
    if (!instructions.trim()) {
      if (onSkip) onSkip();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await directionsService.addCustomDirections(visitorId, instructions);
      if (onSave) onSave();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save directions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <span>🗺️</span> Add Directions for Your Guest
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Help your visitor find your place more easily
        </p>
      </div>

      <div className="p-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Quick Templates */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick add:
          </label>
          <div className="flex flex-wrap gap-2">
            {templates.map((template, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleTemplateClick(template.text)}
                className="px-3 py-1 text-sm border border-gray-200 rounded-full hover:bg-gray-50"
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Instructions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custom Instructions
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
            placeholder="e.g., Once you enter the gate, take the first right. My house is the third one with the blue gate..."
            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            🔒 Visible only to this specific visitor
          </p>
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 p-3 rounded-md">
          <p className="text-xs text-blue-700">
            <strong>Privacy:</strong> Your visitor will see the estate gate location (public info) 
            plus these custom instructions. Your exact address or unit coordinates are not shared.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onSkip}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Directions'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddDirections;
