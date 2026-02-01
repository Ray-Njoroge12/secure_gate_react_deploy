/**
 * @file ResolveIncidentModal.jsx
 * @description Modal for resolving security incidents
 * Allows authorized guards/admins to mark incidents as resolved with notes
 */

import React, { useState } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { Button } from '../ui';
import { useError } from '../../contexts/ErrorContext';

const ResolveIncidentModal = ({ isOpen, onClose, incident, onResolve }) => {
    const [resolution, setResolution] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { handleApiError } = useError();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!resolution.trim()) return;

        try {
            setIsSubmitting(true);

            const response = await fetch(`/api/guard/incidents/${incident.id}/resolve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include', // Important for cookies
                body: JSON.stringify({ resolution })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to resolve incident');
            }

            onResolve(data.data);
            onClose();
            // Reset form
            setResolution('');
        } catch (error) {
            handleApiError(error, 'Resolve Incident');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="resolve-modal" role="dialog" aria-modal="true">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>

            {/* Modal */}
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            Resolve Incident
                        </h2>
                        <button
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="text-gray-400 hover:text-gray-600 dark:text-gray-200 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700">
                            <span className="font-semibold">Incident:</span> {incident.category.replace('_', ' ')}
                            <div className="mt-1 text-gray-600">{incident.description}</div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Resolution Notes *
                            </label>
                            <textarea
                                value={resolution}
                                onChange={(e) => setResolution(e.target.value)}
                                placeholder="Details about how the incident was resolved..."
                                rows={4}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                These notes will be permanently recorded in the incident log.
                            </p>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onClose}
                                disabled={isSubmitting}
                                className="flex-1"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="default"
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                disabled={isSubmitting || !resolution.trim()}
                            >
                                {isSubmitting ? 'Resolving...' : 'Mark as Resolved'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResolveIncidentModal;
