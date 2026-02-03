/**
 * @fileoverview Bulk Checkout Page for Guards
 * @description Allows guards to perform bulk checkout of visitors at end of day
 * or shift transitions. Includes EOD workflow capabilities.
 * @author Secure Gate Access Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useError } from '../../contexts/ErrorContext';
import { useLoading } from '../../contexts/LoadingContext';
import { Card, Button, Badge } from '../../components/ui';
import PageHeader from '../../components/PageHeader';
import { useMFAVerification, SENSITIVE_OPERATIONS } from '../../components/guard/MFAVerificationModal';
import logger from '../../utils/logger';

// Icons
const CheckAllIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const UserGroupIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const WarningIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default function BulkCheckout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { handleApiError } = useError();
  const { setLoading, isLoading } = useLoading();
  
  // MFA verification hook for sensitive operations
  const { requestVerification, MFAModal } = useMFAVerification();

  // State
  const [activeVisitors, setActiveVisitors] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [checkoutResults, setCheckoutResults] = useState(null);
  const [showEODConfirm, setShowEODConfirm] = useState(false);
  const [eodNotes, setEodNotes] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, overdue, recent

  // Fetch active visitors
  const fetchActiveVisitors = useCallback(async () => {
    try {
      setLoading('bulkCheckout', true);

      const res = await fetch('/api/visitors/active', {
        credentials: 'include'
      });
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || 'Failed to fetch visitors');
      }

      // Transform and calculate duration for each visitor
      const visitors = (json.data || []).map(v => {
        const checkInTime = new Date(v.check_in);
        const now = new Date();
        const durationMs = now - checkInTime;
        const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
        const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

        return {
          ...v,
          duration: `${durationHours}h ${durationMinutes}m`,
          durationHours,
          isOverdue: durationHours >= 8 // Consider overdue if on premise for 8+ hours
        };
      });

      setActiveVisitors(visitors);
    } catch (error) {
      handleApiError(error, 'Bulk Checkout');
      logger.error('Failed to fetch active visitors:', error);
    } finally {
      setLoading('bulkCheckout', false);
    }
  }, [handleApiError, setLoading]);

  useEffect(() => {
    fetchActiveVisitors();
  }, [fetchActiveVisitors]);

  // Filter visitors
  const filteredVisitors = activeVisitors.filter(v => {
    if (filterType === 'overdue') return v.isOverdue;
    if (filterType === 'recent') return v.durationHours < 2;
    return true;
  });

  // Handle select all toggle
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredVisitors.map(v => v.id)));
    }
    setSelectAll(!selectAll);
  };

  // Handle individual selection
  const handleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
    setSelectAll(newSelected.size === filteredVisitors.length && filteredVisitors.length > 0);
  };

  // Perform bulk checkout
  const handleBulkCheckout = async () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one visitor to check out.');
      return;
    }

    // Require MFA verification for bulk checkout of 5+ visitors
    if (selectedIds.size >= 5) {
      const verification = await requestVerification(
        SENSITIVE_OPERATIONS.BULK_CHECKOUT,
        `Checking out ${selectedIds.size} visitors`
      );

      if (!verification.verified && verification.cancelled) {
        return; // User cancelled
      }
    } else if (!window.confirm(`Are you sure you want to check out ${selectedIds.size} visitor(s)?`)) {
      return;
    }

    try {
      setLoading('performCheckout', true);

      const results = { success: 0, failed: 0, errors: [] };

      // Process each checkout
      for (const visitorId of selectedIds) {
        try {
          const res = await fetch(`/api/visitors/${visitorId}/check-out`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
          });

          const json = await res.json();

          if (json.success) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push({
              id: visitorId,
              error: json.error || 'Unknown error'
            });
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            id: visitorId,
            error: error.message
          });
        }
      }

      setCheckoutResults(results);
      setSelectedIds(new Set());
      setSelectAll(false);

      // Refresh the list
      await fetchActiveVisitors();

    } catch (error) {
      handleApiError(error, 'Bulk Checkout');
    } finally {
      setLoading('performCheckout', false);
    }
  };

  // Perform EOD (End of Day) checkout - checks out ALL remaining visitors
  const handleEODCheckout = async () => {
    try {
      setLoading('eodCheckout', true);

      // Select all visitors for EOD
      const allIds = new Set(activeVisitors.map(v => v.id));
      const results = { success: 0, failed: 0, errors: [] };

      for (const visitorId of allIds) {
        try {
          const res = await fetch(`/api/visitors/${visitorId}/check-out`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              notes: `EOD Checkout - ${eodNotes || 'End of day batch checkout'}`
            })
          });

          const json = await res.json();

          if (json.success) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push({
              id: visitorId,
              error: json.error || 'Unknown error'
            });
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            id: visitorId,
            error: error.message
          });
        }
      }

      setCheckoutResults(results);
      setShowEODConfirm(false);
      setEodNotes('');

      // Refresh the list
      await fetchActiveVisitors();

      // Log EOD action
      logger.info('EOD checkout completed', { results, guardId: user.id });

    } catch (error) {
      handleApiError(error, 'EOD Checkout');
    } finally {
      setLoading('eodCheckout', false);
    }
  };

  // Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader
        title="Bulk Checkout"
        description="Check out multiple visitors at once"
        backTo="/dashboard/guard"
      />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <UserGroupIcon className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeVisitors.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">On Premise</p>
          </Card>
          <Card className="p-4 text-center">
            <WarningIcon className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
            <p className="text-2xl font-bold text-yellow-600">
              {activeVisitors.filter(v => v.isOverdue).length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Overdue (8h+)</p>
          </Card>
          <Card className="p-4 text-center">
            <CheckAllIcon className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-green-600">{selectedIds.size}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Selected</p>
          </Card>
          <Card className="p-4 text-center">
            <ClockIcon className="w-8 h-8 mx-auto text-purple-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Current Time</p>
          </Card>
        </div>

        {/* Checkout Results */}
        {checkoutResults && (
          <Card className={`p-4 ${checkoutResults.failed > 0 ? 'border-yellow-500' : 'border-green-500'} border-l-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Checkout Complete
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {checkoutResults.success} successful, {checkoutResults.failed} failed
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCheckoutResults(null)}
              >
                Dismiss
              </Button>
            </div>
            {checkoutResults.errors.length > 0 && (
              <div className="mt-3 text-sm text-red-600 dark:text-red-400">
                <p className="font-medium">Errors:</p>
                <ul className="list-disc list-inside">
                  {checkoutResults.errors.slice(0, 3).map((err, i) => (
                    <li key={i}>Visitor #{err.id}: {err.error}</li>
                  ))}
                  {checkoutResults.errors.length > 3 && (
                    <li>...and {checkoutResults.errors.length - 3} more</li>
                  )}
                </ul>
              </div>
            )}
          </Card>
        )}

        {/* Action Bar */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setSelectedIds(new Set());
                  setSelectAll(false);
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Visitors ({activeVisitors.length})</option>
                <option value="overdue">Overdue Only ({activeVisitors.filter(v => v.isOverdue).length})</option>
                <option value="recent">Recent (&lt;2h) ({activeVisitors.filter(v => v.durationHours < 2).length})</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchActiveVisitors}
                disabled={isLoading('bulkCheckout')}
              >
                <RefreshIcon className={isLoading('bulkCheckout') ? 'animate-spin' : ''} />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                onClick={handleBulkCheckout}
                disabled={selectedIds.size === 0 || isLoading('performCheckout')}
              >
                {isLoading('performCheckout') ? 'Checking out...' : `Checkout Selected (${selectedIds.size})`}
              </Button>
              <Button
                variant="danger"
                onClick={() => setShowEODConfirm(true)}
                disabled={activeVisitors.length === 0 || isLoading('eodCheckout')}
              >
                EOD Checkout
              </Button>
            </div>
          </div>
        </Card>

        {/* Visitor List */}
        <Card>
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                disabled={filteredVisitors.length === 0}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select All ({filteredVisitors.length})
              </span>
            </label>
          </div>

          {/* Visitor List */}
          {isLoading('bulkCheckout') ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500 dark:text-gray-400">Loading visitors...</p>
            </div>
          ) : filteredVisitors.length === 0 ? (
            <div className="p-8 text-center">
              <UserGroupIcon className="w-12 h-12 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500 dark:text-gray-400">No visitors on premise.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredVisitors.map((visitor) => (
                <div
                  key={visitor.id}
                  className={`px-4 py-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    selectedIds.has(visitor.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(visitor.id)}
                    onChange={() => handleSelect(visitor.id)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {visitor.name}
                      </p>
                      {visitor.isOverdue && (
                        <Badge variant="warning" size="sm">Overdue</Badge>
                      )}
                      {visitor.is_walk_in && (
                        <Badge variant="info" size="sm">Walk-in</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Host: {visitor.host_name || 'Unknown'} • Unit: {visitor.host_unit || '-'}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {visitor.duration}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      In: {formatTime(visitor.check_in)}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (window.confirm(`Check out ${visitor.name}?`)) {
                        try {
                          const res = await fetch(`/api/visitors/${visitor.id}/check-out`, {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' }
                          });
                          const json = await res.json();
                          if (json.success) {
                            fetchActiveVisitors();
                          } else {
                            throw new Error(json.error);
                          }
                        } catch (error) {
                          handleApiError(error, 'Checkout');
                        }
                      }
                    }}
                  >
                    <CheckIcon />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* EOD Confirmation Modal */}
        {showEODConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <WarningIcon className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    End of Day Checkout
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    This will check out ALL {activeVisitors.length} visitors
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  EOD Notes (Optional)
                </label>
                <textarea
                  value={eodNotes}
                  onChange={(e) => setEodNotes(e.target.value)}
                  rows={3}
                  placeholder="Add any notes about this EOD checkout..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowEODConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={handleEODCheckout}
                  disabled={isLoading('eodCheckout')}
                >
                  {isLoading('eodCheckout') ? 'Processing...' : 'Confirm EOD Checkout'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* MFA Verification Modal */}
        <MFAModal />
      </main>
    </div>
  );
}
