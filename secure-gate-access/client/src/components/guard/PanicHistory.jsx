/**
 * Panic History Component
 * Phase 1.1: Guard Panic Button - History View
 * 
 * Privacy: Guards can only see their own emergency history.
 * Location data is not displayed (privacy protection).
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import emergencyService from '../../services/emergencyService';
import logger from '../../utils/logger';

const PanicHistory = ({ limit = 10, className = '' }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [privacyInfo, setPrivacyInfo] = useState(null);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [historyData, privacyData] = await Promise.all([
          emergencyService.getMyEmergencyHistory(limit),
          emergencyService.getPanicPrivacyInfo()
        ]);
        setHistory(historyData);
        setPrivacyInfo(privacyData);
      } catch (err) {
        setError(err.message || 'Failed to load history');
        logger.error('Failed to fetch panic history:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [limit]);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status, isFalseAlarm) => {
    if (isFalseAlarm) {
      return (
        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
          False Alarm
        </span>
      );
    }
    
    const styles = {
      triggered: 'bg-red-100 text-red-800',
      acknowledged: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.triggered}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-100 rounded w-full"></div>
          <div className="h-4 bg-gray-100 rounded w-full"></div>
          <div className="h-4 bg-gray-100 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg p-6 ${className}`}>
        <div className="text-center text-red-600">
          <svg className="w-12 h-12 mx-auto mb-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            My Emergency History
          </h3>
          <button
            onClick={() => setShowPrivacy(!showPrivacy)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Privacy Info
          </button>
        </div>
        
        {/* Privacy Notice */}
        <p className="text-sm text-gray-500 mt-1">
          This shows only your own emergency alerts. Location data is not displayed.
        </p>
      </div>

      {/* Privacy Info Panel */}
      {showPrivacy && privacyInfo && (
        <div className="bg-blue-50 border-b border-blue-100 p-4">
          <h4 className="font-medium text-blue-900 mb-2">{privacyInfo.title}</h4>
          <ul className="space-y-2">
            {privacyInfo.policies?.map((policy, idx) => (
              <li key={idx} className="flex gap-2 text-sm text-blue-800">
                <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span><strong>{policy.item}:</strong> {policy.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* History List */}
      <div className="divide-y divide-gray-100">
        {history.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No emergency alerts in your history</p>
            <p className="text-sm mt-1">We hope it stays this way!</p>
          </div>
        ) : (
          history.map((item) => (
            <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-900 font-medium">
                      Emergency #{item.id}
                    </span>
                    {getStatusBadge(item.status, item.is_false_alarm)}
                  </div>
                  
                  <div className="text-sm text-gray-500 space-y-1">
                    <p>
                      <span className="text-gray-600">Triggered:</span>{' '}
                      {formatDate(item.triggered_at)}
                    </p>
                    {item.acknowledged_at && (
                      <p>
                        <span className="text-gray-600">Acknowledged:</span>{' '}
                        {formatDate(item.acknowledged_at)}
                      </p>
                    )}
                    {item.resolved_at && (
                      <p>
                        <span className="text-gray-600">Resolved:</span>{' '}
                        {formatDate(item.resolved_at)}
                      </p>
                    )}
                    {item.gate_name && (
                      <p>
                        <span className="text-gray-600">Gate:</span>{' '}
                        {item.gate_name}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Response Time */}
                {item.acknowledged_at && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Response time</p>
                    <p className="text-sm font-medium text-gray-700">
                      {Math.round((new Date(item.acknowledged_at) - new Date(item.triggered_at)) / 1000)}s
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {history.length > 0 && (
        <div className="p-3 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-500">
            Showing last {history.length} emergency alerts
          </p>
        </div>
      )}
    </div>
  );
};

PanicHistory.propTypes = {
  limit: PropTypes.number,
  className: PropTypes.string
};

export default PanicHistory;
