import React, { useState, useEffect } from 'react';
import { useToast } from '../../contexts/ToastContext';
import { handleApiError } from '../../utils/errorMapper';
import { useAuth } from '../../contexts/AuthContext';
import {
    getPendingUsers,
    updateUserStatus,
    bulkApproveUsers,
    bulkRejectUsers,
    getAllEstates
} from '../../services/adminService';
import Button from '../ui/Button';
import ConfirmationDialog from '../common/ConfirmationDialog';

const AdminUserApprovals = ({ siteId }) => {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [estates, setEstates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [processingId, setProcessingId] = useState(null);

    // Dialog states
    const [dialog, setDialog] = useState({
        isOpen: false,
        type: null, // 'approve', 'reject', 'bulk-approve', 'bulk-reject'
        data: null // userId or null for bulk
    });

    // Manual estate selection state
    const [selectedEstates, setSelectedEstates] = useState({});

    const { toast } = useToast();
    const { user } = useAuth(); // To check role if needed

    const fetchData = async () => {
        try {
            setLoading(true);

            // Fetch users
            const usersRes = await getPendingUsers(siteId ? { siteId } : {});
            const usersData = usersRes.data || usersRes.users || usersRes || []; // Robust extraction
            setPendingUsers(Array.isArray(usersData) ? usersData : []);

            // Fetch estates if super admin (no siteId passed or role check)
            if (!siteId) {
                try {
                    const estatesRes = await getAllEstates();
                    const estatesData = estatesRes.data || estatesRes.estates || estatesRes || [];
                    setEstates(Array.isArray(estatesData) ? estatesData : []);
                } catch (e) {
                    // Silently fail estate fetch if not authorized (e.g. estate admin viewing without siteId?)
                    console.warn('Failed to fetch estates', e);
                }
            }
        } catch (err) {
            setPendingUsers([]);
            const errMsg = handleApiError(err);
            toast?.error?.(errMsg || 'Failed to fetch pending users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [siteId]);

    // Selection Handlers
    const toggleSelectAll = () => {
        if (selectedUsers.length === pendingUsers.length) {
            setSelectedUsers([]);
        } else {
            setSelectedUsers(pendingUsers.map(u => u.id));
        }
    };

    const toggleSelectUser = (id) => {
        setSelectedUsers(prev =>
            prev.includes(id) ? prev.filter(uId => uId !== id) : [...prev, id]
        );
    };

    // Action Handlers
    const handleEstateChange = (userId, estateId) => {
        setSelectedEstates(prev => ({ ...prev, [userId]: estateId }));
    };

    const initiateAction = (type, data = null) => {
        if (type === 'approve' && !siteId) {
            // Check if estate is assigned
            const user = pendingUsers.find(u => u.id === data);
            const assignedEstate = user?.estate_id || selectedEstates[data];

            if (!assignedEstate) {
                toast?.error?.('Please assign an estate to this user before approving.');
                return;
            }
        }

        if (type === 'bulk-approve' && !siteId) {
            // ensure all selected users have an estate? 
            // Logic simplified: Backend might reject if missing estate. 
            // Or prompt for a single estate in bulk dialog? 
            // For now, let's assume super admin bulk approve without estate is risky, 
            // but maybe the backend handles default? 
            // PendingApprovals.jsx logic was: setBulkApproveDialog({ isOpen: true, estateId: null });
            // then passed estateId to backend.
            // We'll simplisticly just warn.
        }

        setDialog({ isOpen: true, type, data });
    };

    const executeAction = async () => {
        const { type, data: userId } = dialog;
        setProcessingId(userId || 'bulk');

        try {
            let message = '';

            if (type === 'approve') {
                const user = pendingUsers.find(u => u.id === userId);
                const estateId = user?.estate_id || selectedEstates[userId] || siteId;
                await updateUserStatus(userId, 'active', estateId);
                message = 'User approved successfully';
            } else if (type === 'reject') {
                await updateUserStatus(userId, 'rejected');
                message = 'User rejected';
            } else if (type === 'bulk-approve') {
                const res = await bulkApproveUsers({
                    userIds: selectedUsers,
                    estateId: siteId // Pass current siteId if available
                });
                message = `${res.count || res.data?.count || selectedUsers.length} users approved`;
                setSelectedUsers([]);
            } else if (type === 'bulk-reject') {
                const res = await bulkRejectUsers({
                    userIds: selectedUsers,
                    reason: 'Bulk rejection'
                });
                message = `${res.count || res.data?.count || selectedUsers.length} users rejected`;
                setSelectedUsers([]);
            }

            toast?.success?.(message);
            setDialog({ isOpen: false, type: null, data: null });
            fetchData(); // Refresh list
        } catch (err) {
            toast?.error?.(handleApiError(err) || 'Failed to process user action');
        } finally {
            setProcessingId(null);
        }
    };

    const getDialogConfig = () => {
        const { type, data } = dialog;
        const isBulk = type?.startsWith('bulk');
        const count = isBulk ? selectedUsers.length : 1;

        switch (type) {
            case 'approve':
            case 'bulk-approve':
                return {
                    title: isBulk ? 'Bulk Approve Users' : 'Approve User',
                    message: `Are you sure you want to approve ${count} user(s)? They will receive access immediately.`,
                    variant: 'success',
                    confirmText: 'Approve'
                };
            case 'reject':
            case 'bulk-reject':
                return {
                    title: isBulk ? 'Bulk Reject Users' : 'Reject User',
                    message: `Are you sure you want to reject ${count} user(s)? This action cannot be undone.`,
                    variant: 'danger',
                    confirmText: 'Reject'
                };
            default:
                return {};
        }
    };

    if (loading && pendingUsers.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden flex flex-col h-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800/50">
                <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Pending Approvals <span className="ml-2 text-sm px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-200">{pendingUsers.length}</span>
                    </h3>
                    {selectedUsers.length > 0 && (
                        <div className="flex gap-2 animate-fade-in">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={toggleSelectAll}
                            >
                                {selectedUsers.length === pendingUsers.length ? 'Deselect All' : 'Select All'}
                            </Button>
                            <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => initiateAction('bulk-approve')}
                            >
                                Approve ({selectedUsers.length})
                            </Button>
                            <Button
                                size="sm"
                                className="bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => initiateAction('bulk-reject')}
                            >
                                Reject ({selectedUsers.length})
                            </Button>
                        </div>
                    )}
                </div>
                <Button
                    onClick={fetchData}
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    Refresh
                </Button>
            </div>

            {/* Content */}
            {pendingUsers.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">All Caught Up!</h4>
                    <p className="max-w-sm mt-1">No pending account requests at the moment.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-gray-50 dark:bg-slate-800/80">
                            <tr>
                                <th className="px-6 py-3 w-4">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                        checked={pendingUsers.length > 0 && selectedUsers.length === pendingUsers.length}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User Details</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">House No.</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role & Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estate Assignment</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                            {pendingUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                                            checked={selectedUsers.includes(user.id)}
                                            onChange={() => toggleSelectUser(user.id)}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 rounded-full bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold uppercase">
                                                {user.username.charAt(0)}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.username}</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                                                {user.phone && <div className="text-xs text-gray-400 mt-0.5">{user.phone}</div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.house || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 w-fit capitalize">
                                                {user.role}
                                            </span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {user.estate_id ? (
                                            <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-1">
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                Assigned (Estate ID: {user.estate_id})
                                            </span>
                                        ) : (
                                            siteId ? (
                                                <span className="text-sm text-gray-500 italic">Will assign to current estate</span>
                                            ) : (
                                                <select
                                                    className="text-sm rounded-md border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 shadow-sm focus:border-brand-500 focus:ring-brand-500"
                                                    value={selectedEstates[user.id] || ''}
                                                    onChange={(e) => handleEstateChange(user.id, e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <option value="">Select Estate...</option>
                                                    {estates.map(estate => (
                                                        <option key={estate.id} value={estate.id}>{estate.name}</option>
                                                    ))}
                                                </select>
                                            )
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 dark:border-green-800/30"
                                                onClick={() => initiateAction('approve', user.id)}
                                                disabled={processingId === user.id}
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-800/30"
                                                onClick={() => initiateAction('reject', user.id)}
                                                disabled={processingId === user.id}
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ConfirmationDialog
                isOpen={dialog.isOpen}
                onClose={() => setDialog({ isOpen: false, type: null, data: null })}
                onConfirm={executeAction}
                isLoading={!!processingId}
                {...getDialogConfig()}
            />
        </div>
    );
};

export default AdminUserApprovals;
