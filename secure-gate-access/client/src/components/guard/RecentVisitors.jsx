/**
 * Active Visitors Component
 * Phase 1.3: Active Visitors Quick Lookup for Guards
 * 
 * Privacy Features:
 * - Shows ONLY active (ON_PREMISE) visitors
 * - Phone/Email masked by backend
 * - Only check-out actions allowed
 */

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import apiClient from '../../utils/apiClient';
import notificationService from '../../services/notificationService';
import logger from '../../utils/logger';
import Button from '../ui/Button';
import { getStatusChipClass } from '../../utils/statusColors';

const RecentVisitors = ({
  onSelectVisitor = () => { },
  className = '',
  limit = 100
}) => {
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(false);

  // Fetch active visitors
  const fetchRecentVisitors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/api/visitors/recent', {
        params: { limit }
      });

      if (response.data.success) {
        setVisitors(response.data.data || []);
      } else {
        throw new Error(response.data.error || 'Failed to load');
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch active visitors');
      logger.error('Failed to fetch active visitors:', err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchRecentVisitors();
  }, [fetchRecentVisitors]);

  // Filter visitors by search term
  const filteredVisitors = visitors.filter(v =>
    v.visitorName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.residentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.residentUnit?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle quick check-in click (now effectively only Check Out)
  const handleQuickCheckIn = (visitor) => {
    onSelectVisitor(visitor);
    notificationService.info(
      'Visitor Selected',
      `${visitor.visitorName} selected for processing`
    );
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 p-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-10 bg-gray-100 dark:bg-slate-700 rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 dark:bg-slate-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 p-4 ${className}`}>
        <div className="text-center py-6">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-200 mb-3">{error}</p>
          <Button
            onClick={fetchRecentVisitors}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Active Visitors (On Premise)
            </h3>
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
          </div>
          <Button
            onClick={() => setShowPrivacyNotice(!showPrivacyNotice)}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-200 p-1"
            title="Privacy info"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Button>
        </div>

        {/* Privacy Notice */}
        {showPrivacyNotice && (
          <div className="mb-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            <p className="font-medium mb-1">Privacy Protection</p>
            <ul className="text-xs space-y-1">
              <li>• Only showing visitors currently inside the estate</li>
              <li>• Phone and email are masked for privacy</li>
              <li>• Use Manual Check to search for past visitors</li>
            </ul>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, resident, or unit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* Visitor List */}
      <div className="divide-y divide-gray-100 dark:divide-slate-700 max-h-96 overflow-y-auto">
        {filteredVisitors.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-300">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {searchTerm ? (
              <p>No visitors matching "{searchTerm}"</p>
            ) : (
              <p>No active visitors on premise</p>
            )}
          </div>
        ) : (
          filteredVisitors.map((visitor) => (
            <div role="button" tabIndex={0}
              key={visitor.id}
              className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-white truncate">
                      {visitor.visitorName}
                    </span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                      Inside
                    </span>
                    <span className={getStatusChipClass(visitor.status, 'xs')}>
                      {visitor.status || 'Active'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-300 flex items-center gap-2">
                    <span>→ {visitor.residentName}</span>
                    {visitor.residentUnit && (
                      <span className="bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded text-xs">
                        {visitor.residentUnit}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                    Entered: {visitor.checkInTime || visitor.lastVisitDate}
                  </div>
                </div>

                {/* Check Out Button (Always Check Out for Active list) */}
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickCheckIn(visitor);
                  }}
                  className="ml-3 flex-shrink-0 bg-orange-100 hover:bg-orange-200 text-orange-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors flex items-center gap-1 border border-orange-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Check Out
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {filteredVisitors.length > 0 && (
        <div className="p-3 bg-gray-50 dark:bg-slate-900 border-t border-gray-100 text-center">
          <Button
            onClick={fetchRecentVisitors}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center justify-center gap-1 mx-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh List
          </Button>
        </div>
      )}
    </div>
  );
};

RecentVisitors.propTypes = {
  onSelectVisitor: PropTypes.func,
  className: PropTypes.string,
  limit: PropTypes.number
};

export default RecentVisitors;
