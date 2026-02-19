// AdminMetrics - Displays real metrics from API
import React from 'react';
import Icon from '../ui/Icon';

const AdminMetrics = ({ metrics = {}, loading = false, error = null }) => {
    const users = metrics?.users || {};
    const visitors = metrics?.visitors || {};

    if (loading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Metrics</h2>
                <div className="flex justify-center items-center h-24">
                    <Icon name="loader-2" className="h-8 w-8 text-blue-500 animate-spin" aria-label="Loading metrics" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Metrics</h2>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <Icon name="users" className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">Active Users</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {users.totalUsers ?? 0}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                        {users.residents ?? 0} residents • {users.guards ?? 0} guards
                    </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <Icon name="user-check" className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden="true" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">Today's Visitors</span>
                    </div>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {visitors.checkedInVisitors ?? 0}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                        {visitors.totalVisitors ?? 0} total • {visitors.pendingVisitors ?? 0} pending
                    </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <Icon name="shield" className="h-5 w-5 text-purple-600 dark:text-purple-400" aria-hidden="true" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">Verified</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {visitors.verifiedVisitors ?? 0}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                        {visitors.checkedOutVisitors ?? 0} checked out
                    </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                        <Icon name="alert-circle" className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">Admins</span>
                    </div>
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {users.admins ?? 0}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                        {metrics.timestamp ? new Date(metrics.timestamp).toLocaleTimeString() : 'Just now'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminMetrics;
