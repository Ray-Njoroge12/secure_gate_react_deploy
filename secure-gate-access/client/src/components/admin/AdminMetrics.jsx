// Placeholder component - AdminMetrics
// TODO: Implement full metrics dashboard with charts and statistics

import React from 'react';

const AdminMetrics = () => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">0</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Active Users</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">0</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Today's Visitors</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">0</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Pending Approvals</div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">0</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">System Alerts</div>
                </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                📊 Metrics dashboard coming soon
            </p>
        </div>
    );
};

export default AdminMetrics;
