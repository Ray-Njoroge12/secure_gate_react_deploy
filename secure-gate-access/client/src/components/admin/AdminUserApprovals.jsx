import React, { useState, useEffect } from 'react';

import { useAuth } from '../../contexts/AuthContext';
import { useError } from '../../contexts/ErrorContext';
import api from '../../utils/apiClient';
import Button from '../ui/Button';

const AdminUserApprovals = ({ siteId }) => {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { handleError, handleSuccess } = useError();
    const { user } = useAuth();
    const requiresSiteSelection = user?.role === 'super_admin' && !siteId;

    const fetchPendingUsers = async () => {
        if (requiresSiteSelection) {
            setPendingUsers([]);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const query = siteId ? `?siteId=${siteId}` : '';
            const response = await api.get(`/api/admin/users/pending${query}`);
            const data = response.data;

            // Robust array extraction
            let usersArray = [];
            if (Array.isArray(data)) {
                usersArray = data;
            } else if (data && Array.isArray(data.data)) {
                usersArray = data.data;
            } else if (data && Array.isArray(data.users)) {
                usersArray = data.users;
            }
            setPendingUsers(usersArray);
        } catch (err) {
            setPendingUsers([]); // Reset on error
            handleError(err, { context: 'Fetching Pending Users' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingUsers();
    }, [siteId, requiresSiteSelection]);

    const handleStatusUpdate = async (userId, newStatus) => {
        try {
            // Optimistic update
            setPendingUsers(prev => prev.filter(u => u.id !== userId));

            await api.put(`/api/admin/users/${userId}/status`, {
                status: newStatus
            });

            handleSuccess(`User ${newStatus === 'active' ? 'approved' : 'rejected'} successfully.`);
        } catch (err) {
            // Revert on failure
            await fetchPendingUsers();
            handleError(err, { context: 'Updating User Status' });
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    if (requiresSiteSelection) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
                <div className="p-8 text-center text-gray-500 dark:text-gray-300">
                    Select an estate to view pending account requests.
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Pending Approvals ({pendingUsers.length})
                </h3>
                <Button
                    onClick={fetchPendingUsers}
                    className="text-sm text-brand-600 hover:text-brand-700 dark:text-brand-400"
                >
                    Refresh
                </Button>
            </div>

            {pendingUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-300">
                    No pending account requests.
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                        <thead className="bg-gray-50 dark:bg-slate-800">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                            {pendingUsers.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.username}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-300">ID: {user.id}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900 dark:text-gray-100">{user.email}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-300">{user.phone || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 capitalize">
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <Button
                                            onClick={() => handleStatusUpdate(user.id, 'active')}
                                            className="text-green-600 hover:text-green-900 dark:hover:text-green-400"
                                        >
                                            Approve
                                        </Button>
                                        <Button
                                            onClick={() => handleStatusUpdate(user.id, 'rejected')}
                                            className="text-red-600 hover:text-red-900 dark:hover:text-red-400"
                                        >
                                            Reject
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AdminUserApprovals;
