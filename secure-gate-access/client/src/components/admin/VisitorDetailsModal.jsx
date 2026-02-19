import React from 'react';
import { Modal, Button } from '../ui';

const VisitorDetailsModal = ({ isOpen, onClose, visitor }) => {
    if (!isOpen || !visitor) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Visitor Details">
            <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {(visitor.name || 'V').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {visitor.name}
                            </h3>
                            <div className="mt-1">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                  ${visitor.status === 'checked_in' ? 'bg-green-100 text-green-800' :
                                        visitor.status === 'checked_out' ? 'bg-gray-100 text-gray-800' :
                                            visitor.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-blue-100 text-blue-800'}`}>
                                    {visitor.status?.replace('_', ' ').toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white border-b pb-2">Visitor Information</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wide">Phone</label>
                                <p className="font-medium text-gray-900 dark:text-white">{visitor.phone || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wide">Email</label>
                                <p className="font-medium text-gray-900 dark:text-white">{visitor.email || 'N/A'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wide">Purpose</label>
                                <p className="font-medium text-gray-900 dark:text-white">{visitor.purpose || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white border-b pb-2">Visit Details</h4>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wide">Host</label>
                                <p className="font-medium text-gray-900 dark:text-white">{visitor.host_name || visitor.host_id || 'Unknown'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wide">Date of Visit</label>
                                <p className="font-medium text-gray-900 dark:text-white">{new Date(visitor.date_of_visit).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wide">Access Code</label>
                                <p className="font-mono text-gray-900 dark:text-white">{visitor.access_code || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 md:col-span-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wide">Check In Time</label>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{visitor.check_in ? new Date(visitor.check_in).toLocaleString() : '-'}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wide">Check Out Time</label>
                                <p className="text-sm text-gray-700 dark:text-gray-300">{visitor.check_out ? new Date(visitor.check_out).toLocaleString() : '-'}</p>
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

export default VisitorDetailsModal;
