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
import { Card, Button, Badge, Skeleton, EmptyState } from '../../components/ui';
import PageHeader from '../../components/PageHeader';
import { useMFAVerification, SENSITIVE_OPERATIONS } from '../../components/guard/MFAVerificationModal';
import { useConfirmation } from '../../components/common/ConfirmationDialog';
import notificationService from '../../services/notificationService';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import OfflineBanner from '../../components/common/OfflineBanner';
import usePullToRefresh from '../../hooks/usePullToRefresh';
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
  // Confirmation dialog hook for replacing window.confirm
  const { confirm, dialogProps, Dialog: ConfirmDialog } = useConfirmation();
  const { isOnline, wasOffline } = useOnlineStatus();

  // State
  const [activeVisitors, setActiveVisitors] = useState([]);
  const [fetchError, setFetchError] = useState(null);
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
      setFetchError(null);

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
      setFetchError(error.message || 'Failed to load visitors. Please try again.');
      handleApiError(error, 'Bulk Checkout');
      logger.error('Failed to fetch active visitors:', error);
    } finally {
      setLoading('bulkCheckout', false);
    }
  }, [handleApiError, setLoading]);

  const { PullToRefreshIndicator } = usePullToRefresh(fetchActiveVisitors);

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
      notificationService.warning('No Selection', 'Please select at least one visitor to check out.');
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
    } else {
      const confirmed = await confirm({
        variant: 'warning',
        title: 'Bulk Checkout',
        message: `Are you sure you want to check out ${selectedIds.size} visitor(s)? This will end their visit.`,
        confirmText: `Check Out ${selectedIds.size} Visitor${selectedIds.size !== 1 ? 's' : ''}`,
        cancelText: 'Cancel',
      });
      if (!confirmed) return;
    }

    try {
      setLoading('performCheckout', true);

      // Single bulk API call instead of N individual calls
      const res = await fetch('/api/bulk-operations/execute', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationType: 'checkout_visitors',
          itemIds: Array.from(selectedIds)
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Bulk checkout failed');

      const bulkResults = json.data?.results || json.results || {};
      const results = {
        success: Array.isArray(bulkResults.success) ? bulkResults.success.length : (bulkResults.success || 0),
        failed: Array.isArray(bulkResults.failed) ? bulkResults.failed.length : (bulkResults.failed || 0),
        errors: Array.isArray(bulkResults.failed) ? bulkResults.failed : []
      };

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

      // Single bulk API call for EOD checkout of all visitors
      const allIds = activeVisitors.map(v => v.id);
      const res = await fetch('/api/bulk-operations/execute', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationType: 'checkout_visitors',
          itemIds: allIds,
          data: { notes: `EOD Checkout - ${eodNotes || 'End of day batch checkout'}` }
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'EOD checkout failed');

      const bulkResults = json.data?.results || json.results || {};
      const results = {
        success: Array.isArray(bulkResults.success) ? bulkResults.success.length : (bulkResults.success || 0),
        failed: Array.isArray(bulkResults.failed) ? bulkResults.failed.length : (bulkResults.failed || 0),
        errors: Array.isArray(bulkResults.failed) ? bulkResults.failed : []
      };

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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <PageHeader
        title="Bulk Checkout"
        description="Check out multiple visitors at once"
        backTo="/dashboard/guard"
      />

      <main className="max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-8 space-y-6">
        {/* Pull to Refresh Indicator */}
        <PullToRefreshIndicator />

        {/* Offline Banner */}
        <OfflineBanner isOnline={isOnline} wasOffline={wasOffline} onRetry={fetchActiveVisitors} />

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <UserGroupIcon className="w-8 h-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeVisitors.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-300">On Premise</p>
          </Card>
          <Card className="p-4 text-center">
            <WarningIcon className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
            <p className="text-2xl font-bold text-yellow-600">
              {activeVisitors.filter(v => v.isOverdue).length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-300">Overdue (8h+)</p>
          </Card>
          <Card className="p-4 text-center">
            <CheckAllIcon className="w-8 h-8 mx-auto text-green-500 mb-2" />
            <p className="text-2xl font-bold text-green-600">{selectedIds.size}</p>
            <p className="text-sm text-gray-500 dark:text-gray-300">Selected</p>
          </Card>
          <Card className="p-4 text-center">
            <ClockIcon className="w-8 h-8 mx-auto text-purple-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-300">Current Time</p>
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
                <p className="text-sm text-gray-500 dark:text-gray-300">
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
          <div className="space-y-3 md:space-y-0 md:flex md:flex-wrap md:items-center md:justify-between md:gap-4">
            <div className="flex items-center gap-3">
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setSelectedIds(new Set());
                  setSelectAll(false);
                }}
                className="mobile-select flex-1 md:flex-none md:w-auto"
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
                className="min-h-[44px] min-w-[44px]"
              >
                <RefreshIcon className={isLoading('bulkCheckout') ? 'animate-spin' : ''} />
              </Button>
            </div>

            {/* Desktop action buttons */}
            <div className="hidden md:flex items-center gap-2">
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

        {/* Mobile Sticky Action Bar */}
        <div className="mobile-sticky-actions md:hidden">
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              className="flex-1 min-h-[44px]"
              onClick={handleBulkCheckout}
              disabled={selectedIds.size === 0 || isLoading('performCheckout')}
            >
              {isLoading('performCheckout') ? 'Checking out...' : `Checkout (${selectedIds.size})`}
            </Button>
            <Button
              variant="danger"
              className="min-h-[44px]"
              onClick={() => setShowEODConfirm(true)}
              disabled={activeVisitors.length === 0 || isLoading('eodCheckout')}
            >
              EOD
            </Button>
          </div>
        </div>

        {/* Visitor List */}
        <Card>
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-slate-600 focus:ring-blue-500"
                disabled={filteredVisitors.length === 0}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select All ({filteredVisitors.length})
              </span>
            </label>
          </div>

          {/* Visitor List */}
          {isLoading('bulkCheckout') && activeVisitors.length === 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="px-4 py-3 flex items-center gap-4">
                  <Skeleton className="w-4 h-4 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </div>
                  <div className="text-right space-y-1">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded" />
                </div>
              ))}
            </div>
          ) : fetchError && !isLoading('bulkCheckout') ? (
            <div className="text-center py-10" role="alert">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <WarningIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Failed to Load Visitors</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{fetchError}</p>
              <Button onClick={fetchActiveVisitors} variant="primary" size="sm">
                <RefreshIcon className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : filteredVisitors.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon="UserGroup"
                title={
                  filterType === 'overdue' 
                    ? "No Overdue Visitors" 
                    : filterType === 'recent'
                    ? "No Recent Visitors"
                    : "No Active Visitors"
                }
                message={
                  filterType !== 'all'
                    ? "Try selecting a different filter to view more visitors."
                    : "All visitors have been checked out. Great job keeping the premises secure!"
                }
                variant="success"
                actions={
                  filterType !== 'all'
                    ? [
                        {
                          label: 'Show All Visitors',
                          onClick: () => setFilterType('all'),
                          variant: 'outline'
                        }
                      ]
                    : [
                        {
                          label: 'Check In New Visitor',
                          onClick: () => navigate('/dashboard/guard/scan-qr'),
                          variant: 'primary',
                          icon: 'qr-code'
                        }
                      ]
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredVisitors.map((visitor) => (
                <div
                  key={visitor.id}
                  className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors touch-active ${
                    selectedIds.has(visitor.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  {/* Mobile Layout */}
                  <div className="md:hidden">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(visitor.id)}
                        onChange={() => handleSelect(visitor.id)}
                        aria-label={`Select ${visitor.name || 'visitor'} for checkout`}
                        className="w-5 h-5 mt-0.5 text-blue-600 rounded border-gray-300 dark:border-slate-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {visitor.name}
                          </p>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {visitor.isOverdue && <Badge variant="warning" size="sm">Overdue</Badge>}
                            {visitor.is_walk_in && <Badge variant="info" size="sm">Walk-in</Badge>}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-300 mb-2">
                          Host: {visitor.host_name || 'Unknown'} • Unit: {visitor.host_unit || '-'}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-medium text-gray-700 dark:text-gray-200">{visitor.duration}</span>
                            <span className="ml-2">In: {formatTime(visitor.check_in)}</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="min-h-[36px] min-w-[36px]"
                            onClick={async () => {
                              const confirmed = await confirm({
                                variant: 'info',
                                title: 'Check Out Visitor',
                                message: `Check out ${visitor.name}?`,
                                confirmText: 'Check Out',
                                cancelText: 'Cancel',
                              });
                              if (confirmed) {
                                try {
                                  const res = await fetch(`/api/visitors/${visitor.id}/check-out`, {
                                    method: 'POST',
                                    credentials: 'include',
                                    headers: { 'Content-Type': 'application/json' }
                                  });
                                  const json = await res.json();
                                  if (json.success) {
                                    notificationService.success('Checked Out', `${visitor.name} has been checked out.`);
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
                      </div>
                    </div>
                  </div>

                  {/* Desktop Layout */}
                  <div className="hidden md:flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(visitor.id)}
                      onChange={() => handleSelect(visitor.id)}
                      aria-label={`Select ${visitor.name || 'visitor'} for checkout`}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 dark:border-slate-600 focus:ring-blue-500"
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
                      <p className="text-sm text-gray-500 dark:text-gray-300">
                        Host: {visitor.host_name || 'Unknown'} • Unit: {visitor.host_unit || '-'}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {visitor.duration}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-300">
                        In: {formatTime(visitor.check_in)}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        const confirmed = await confirm({
                          variant: 'info',
                          title: 'Check Out Visitor',
                          message: `Check out ${visitor.name}?`,
                          confirmText: 'Check Out',
                          cancelText: 'Cancel',
                        });
                        if (confirmed) {
                          try {
                            const res = await fetch(`/api/visitors/${visitor.id}/check-out`, {
                              method: 'POST',
                              credentials: 'include',
                              headers: { 'Content-Type': 'application/json' }
                            });
                            const json = await res.json();
                            if (json.success) {
                              notificationService.success('Checked Out', `${visitor.name} has been checked out.`);
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
                  <p className="text-sm text-gray-500 dark:text-gray-300">
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
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

        {/* Confirmation Dialog */}
        <ConfirmDialog {...dialogProps} />

        {/* MFA Verification Modal */}
        <MFAModal />
      </main>
    </div>
  );
}
