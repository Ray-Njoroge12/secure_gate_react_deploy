import React from 'react';
import { Modal, Button } from '../ui';

const ResidentDetailsModal = ({ isOpen, onClose, resident }) => {
    if (!isOpen || !resident) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Resident Details">
            <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center text-2xl font-bold text-brand-600 dark:text-brand-400">
                            {(resident.username || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {resident.first_name} {resident.last_name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">@{resident.username}</p>
                            <div className="mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${resident.status === 'active' ? 'green' : 'gray'}-100 text-${resident.status === 'active' ? 'green' : 'gray'}-800`}>
                                    {resident.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white border-b pb-2">Contact Information</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wide">Email</label>
                                <p className="font-medium text-gray-900 dark:text-white">{resident.email}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wide">Phone</label>
                                <p className="font-medium text-gray-900 dark:text-white">{resident.phone || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white border-b pb-2">Property Details</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wide">Unit Number</label>
                                <p className="font-medium text-gray-900 dark:text-white">{resident.unit_number || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wide">House Number</label>
                                <p className="font-medium text-gray-900 dark:text-white">{resident.house || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wide">Estate ID</label>
                                <p className="font-medium text-gray-900 dark:text-white">{resident.estate_id || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 md:col-span-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white border-b pb-2">System Meta</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wide">Created At</label>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{new Date(resident.created_at).toLocaleString()}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wide">Last Updated</label>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{new Date(resident.updated_at).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-slate-700">
                    <Button onClick={onClose}>Close</Button>
                </div>
            </div>
        </Modal>
    );
};

export default ResidentDetailsModal;
