// Placeholder component - AuditLogs
// TODO: Implement full audit log table with filtering and search

import React from 'react';

const AuditLogs = () => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
            <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="w-2 h-2 mt-2 rounded-full bg-green-500"></div>
                    <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white font-medium">System initialized</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Just now</p>
                    </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                    📝 Audit logs will appear here
                </p>
            </div>
        </div>
    );
};

export default AuditLogs;
