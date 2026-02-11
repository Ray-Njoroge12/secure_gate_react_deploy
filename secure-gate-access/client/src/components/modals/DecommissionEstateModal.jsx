import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import GradientButton from '../ui/GradientButton';
import Icon from '../ui/Icon';
import Button from '../ui/Button';

/**
 * DecommissionEstateModal
 * Requires user to type estate name to confirm decommissioning
 * Shows impact summary before proceeding
 */
export default function DecommissionEstateModal({ isOpen, onClose, estate, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [fetchingImpact, setFetchingImpact] = useState(false);
    const [error, setError] = useState(null);
    const [impact, setImpact] = useState(null);
    const [confirmationText, setConfirmationText] = useState('');
    const [reason, setReason] = useState('');

    const API_BASE_URL = process.env.REACT_APP_API_URL || '';

    // Fetch impact when modal opens
    useEffect(() => {
        if (isOpen && estate?.id) {
            fetchImpact();
        } else {
            // Reset state when modal closes
            setImpact(null);
            setConfirmationText('');
            setReason('');
            setError(null);
        }
    }, [isOpen, estate?.id]);

    const fetchImpact = async () => {
        setFetchingImpact(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/super-admin/estates/${estate.id}/decommission-impact`, {
                credentials: 'include'
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || 'Failed to fetch impact summary');
            }
            setImpact(data.data || data);
        } catch (err) {
            setError(err.message || 'Failed to load impact data');
        } finally {
            setFetchingImpact(false);
        }
    };

    const isConfirmationValid = useCallback(() => {
        if (!impact?.confirmationRequired) return false;
        return confirmationText.toUpperCase().replace(/\s+/g, '') === impact.confirmationRequired;
    }, [confirmationText, impact?.confirmationRequired]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isConfirmationValid()) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/super-admin/estates/${estate.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ confirmationText, reason })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Failed to decommission estate');
            }

            onSuccess?.(data);
            onClose();
        } catch (err) {
            // Show field-specific validation errors if available
            const fieldError = err.errors?.[0]?.message;
            setError(fieldError || err.message || 'Failed to decommission estate');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Decommission Estate"
            size="lg"
        >
            <div className="space-y-6">
                {/* Warning Header */}
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                        <Icon name="alert-triangle" className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                        <div>
                            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                                Danger Zone
                            </h3>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                                This action cannot be easily undone. All users from this estate will lose access immediately.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {fetchingImpact && (
                    <div className="flex items-center justify-center py-8">
                        <Icon name="loader-2" className="h-8 w-8 animate-spin text-indigo-600" aria-hidden="true" />
                        <span className="ml-3 text-gray-600 dark:text-gray-300">Loading impact summary...</span>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4">
                        <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
                    </div>
                )}

                {/* Impact Summary */}
                {impact && !fetchingImpact && (
                    <>
                        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                <Icon name="building-2" className="h-4 w-4" aria-hidden="true" />
                                Estate Details
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500 dark:text-gray-300">Name:</span>
                                    <span className="ml-2 font-medium text-gray-900 dark:text-white">{impact.estate?.name}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500 dark:text-gray-300">Status:</span>
                                    <span className="ml-2 font-medium text-gray-900 dark:text-white capitalize">{impact.estate?.status}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-3 flex items-center gap-2">
                                <Icon name="file-warning" className="h-4 w-4" aria-hidden="true" />
                                Impact Summary
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                    <Icon name="users" className="h-4 w-4 text-amber-600" aria-hidden="true" />
                                    <span className="text-gray-700 dark:text-gray-300">
                                        <strong>{impact.affectedCounts?.totalUsers || 0}</strong> users
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icon name="users" className="h-4 w-4 text-amber-600" aria-hidden="true" />
                                    <span className="text-gray-700 dark:text-gray-300">
                                        <strong>{impact.affectedCounts?.admins || 0}</strong> admins
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icon name="users" className="h-4 w-4 text-amber-600" aria-hidden="true" />
                                    <span className="text-gray-700 dark:text-gray-300">
                                        <strong>{impact.affectedCounts?.guards || 0}</strong> guards
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icon name="users" className="h-4 w-4 text-amber-600" aria-hidden="true" />
                                    <span className="text-gray-700 dark:text-gray-300">
                                        <strong>{impact.affectedCounts?.residents || 0}</strong> residents
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icon name="eye" className="h-4 w-4 text-amber-600" aria-hidden="true" />
                                    <span className="text-gray-700 dark:text-gray-300">
                                        <strong>{impact.affectedCounts?.visitors || 0}</strong> visitors
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Icon name="alert-triangle" className="h-4 w-4 text-amber-600" aria-hidden="true" />
                                    <span className="text-gray-700 dark:text-gray-300">
                                        <strong>{impact.affectedCounts?.incidents || 0}</strong> incidents
                                    </span>
                                </div>
                            </div>

                            {impact.warnings && impact.warnings.length > 0 && (
                                <ul className="mt-3 space-y-1">
                                    {impact.warnings.map((warning, idx) => (
                                        <li key={idx} className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2">
                                            <span>•</span> {warning}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* Confirmation Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Reason for decommissioning (optional)
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Enter reason for audit trail..."
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                                    rows={2}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Type <code className="bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded font-mono text-red-600 dark:text-red-400">{impact.confirmationRequired}</code> to confirm
                                </label>
                                <input
                                    type="text"
                                    value={confirmationText}
                                    onChange={(e) => setConfirmationText(e.target.value)}
                                    placeholder="Type estate name to confirm"
                                    className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${isConfirmationValid()
                                            ? 'border-green-500 focus:ring-green-500'
                                            : 'border-gray-300 dark:border-slate-600 focus:ring-red-500'
                                        }`}
                                    autoComplete="off"
                                />
                                {confirmationText && !isConfirmationValid() && (
                                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                        Confirmation text doesn't match
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                                <Button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-700 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors"
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={!isConfirmationValid() || loading}
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                >
                                    {loading && <Icon name="loader-2" className="h-4 w-4 animate-spin" aria-hidden="true" />}
                                    Decommission Estate
                                </Button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </Modal>
    );
}
