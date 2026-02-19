import React, { useState, useEffect } from 'react';
import { navigateTo } from '../../utils/appNavigation';
import { useLocation } from 'react-router-dom';
import { maskPhoneNumber } from '../../utils/formatters';
import { Card, Button, PageHeader, Icon, Skeleton, EmptyState } from '../../components/ui';
import { useError } from '../../contexts/ErrorContext';
import { useLoading } from '../../contexts/LoadingContext';
import IncidentModal from '../../components/guard/IncidentModal'; // Phase G4
import { getStatusChipClass } from '../../utils/statusColors'; // Phase A8
import { verifyOtp } from '../../services/visitorService';
import notificationService from '../../services/notificationService';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import OfflineBanner from '../../components/common/OfflineBanner';

import {
  normalizeVisitorStatus,
  formatVisitorStatus,
  canVisitorCheckIn,
  canVisitorCheckOut
} from '../../utils/guardScanUtils';

const ManualCheck = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [incidentModal, setIncidentModal] = useState({ isOpen: false, visitor: null }); // Phase G4
  const { handleError, handleApiError, clearAllErrors } = useError();
  const { setLoading, isLoading } = useLoading();
  const { isOnline, wasOffline } = useOnlineStatus();
  const location = useLocation();

  // Check for pre-selected visitor from RecentVisitors
  useEffect(() => {
    if (location.state?.selectedVisitor) {
      const visitor = location.state.selectedVisitor;
      // Prefer Invite Code for exact match, otherwise Name
      const term = visitor.inviteCode || visitor.invite_code || visitor.visitorName || visitor.name;
      if (term) {
        setSearchTerm(term);
        // We can't directly call handleSearch here because it relies on the state being updated
        // and we want to avoid stale closures. 
        // Instead, we can set a flag or just call a searching function.
        // For simplicity, we'll just set the term and let the user hit search, 
        // OR better: Execute search immediately

        // We need to define the fetch logic outside or in a useCallback to use it here, 
        // but handleSearch uses state... 
        // Let's refactor handleSearch to accept a term, or just call it after a timeout
        setTimeout(() => {
          // We need to pass the term directly to avoid state timing issues
          performSearch(term);
        }, 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const performSearch = async (term) => {
    if (!term.trim()) return;

    try {
      setLoading('manualCheck', true, { message: 'Searching visitors...' });
      clearAllErrors();

      // Always perform a server-side search first
      const query = encodeURIComponent(term.trim());
      const response = await fetch(`/api/visitors?search=${query}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const json = await response.json();
        const visitors = json.data?.visitors || json.visitors || json.data || [];
        setSearchResults(visitors);

        if (visitors.length === 0) {
          notificationService.info('No Results', 'No visitors found matching your search');
        }
      }
    } catch (err) {
      handleApiError(err, 'Manual Check Search');
    } finally {
      setLoading('manualCheck', false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="text"]');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      handleError('Please enter a search term', { context: 'Manual Check Search' });
      return;
    }
    await performSearch(searchTerm);
  };

  const handleCheckIn = async (visitorId) => {
    try {
      setLoading('checkIn', true, { message: 'Checking in visitor...' });
      const response = await fetch(`/api/visitors/${visitorId}/check-in`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setSearchResults(prev =>
          prev.map(v =>
            v.id === visitorId
              ? { ...v, status: 'on_premise', check_in: new Date().toISOString() }
              : v
          )
        );
      } else {
        const error = new Error('Check-in failed');
        error.response = { status: response.status, data: await response.json() };
        throw error;
      }
    } catch (err) {
      handleApiError(err, 'Visitor Check-in');
    } finally {
      setLoading('checkIn', false);
    }
  };

  const handleCheckOut = async (visitorId) => {
    try {
      setLoading('checkOut', true, { message: 'Checking out visitor...' });
      const response = await fetch(`/api/visitors/${visitorId}/check-out`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setSearchResults(prev =>
          prev.map(v =>
            v.id === visitorId
              ? { ...v, status: 'checked_out', check_out: new Date().toISOString() }
              : v
          )
        );
      } else {
        const error = new Error('Check-out failed');
        error.response = { status: response.status, data: await response.json() };
        throw error;
      }
    } catch (err) {
      handleApiError(err, 'Visitor Check-out');
    } finally {
      setLoading('checkOut', false);
    }
  };

  // Removed getStatusColor - now using consistent statusColors utility

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <PageHeader
        title="Manual Check"
        subtitle="Search and verify visitors manually"
        icon={<Icon name="Search" className="w-6 h-6 text-blue-600" />}
        showBack={true}
        backTo="/dashboard/guard"
        actions={
          <Button
            onClick={() => navigateTo('/dashboard/guard/scan-qr')}
            variant="outline"
          >
            <Icon name="QrCode" className="w-4 h-4 mr-2" />
            QR Scanner
          </Button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 py-6 pb-24 md:pb-8 space-y-6">
        <OfflineBanner
          isOnline={isOnline}
          wasOffline={wasOffline}
          onRetry={searchTerm ? handleSearch : undefined}
          message="You are offline. Searches require an internet connection."
        />

        <Card>
          <Card.Header>
            <Card.Title>Search Visitors</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Search by name, phone, invite code, or 6-digit Pass Code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  aria-label="Search visitor by name, phone, invite code, or Pass Code"
                  className="mobile-input flex-1"
                />
                <Button onClick={handleSearch} disabled={isLoading('manualCheck')} className="w-full sm:w-auto min-h-[44px]">
                  {isLoading('manualCheck') ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>
          </Card.Content>
        </Card>

        {/* Skeleton Loading State */}
        {isLoading('manualCheck') && (
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center">
                <Skeleton className="h-6 w-32" />
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="space-y-3 md:space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="border-2 border-gray-200 dark:border-slate-700 rounded-xl p-4 md:p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                      <Skeleton className="h-6 w-24 rounded-full" />
                    </div>
                    <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 mb-3">
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                    <div className="grid grid-cols-2 md:flex gap-2">
                      <Skeleton className="h-9 w-full md:w-24" />
                      <Skeleton className="h-9 w-full md:w-24" />
                      <Skeleton className="h-9 w-full md:w-24" />
                    </div>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        )}

        {/* Search Results */}
        {!isLoading('manualCheck') && searchResults.length > 0 && (
          <Card>
            <Card.Header>
              <Card.Title className="flex items-center">
                <span className="text-lg md:text-xl">Search Results</span>
                <span className="ml-2 px-2 py-1 bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-200 text-sm rounded-full">
                  {searchResults.length}
                </span>
              </Card.Title>
            </Card.Header>
            <Card.Content>
              {/* PHASE B6: Optimized Mobile Card Layout */}
              <div className="space-y-3 md:space-y-4">
                {searchResults.map(visitor => {
                  // Compatibility for camelCase (API) vs snake_case (DB)
                  // The respond.js utility camelizes keys, so we should expect camelCase
                  const v = {
                    ...visitor,
                    invite_code: visitor.inviteCode || visitor.invite_code,
                    host_name: visitor.hostName || visitor.host_name || (visitor.resident ? (visitor.resident.name || visitor.resident.username) : null),
                    check_in: visitor.checkIn || visitor.check_in,
                    check_out: visitor.checkOut || visitor.check_out,
                    plate: visitor.vehiclePlate || visitor.vehicle_plate
                  };

                  return (
                    <div key={v.id} className="bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl p-4 md:p-5 hover:border-blue-300 hover:shadow-md transition-all">
                      {/* Header with Status */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 dark:text-white text-base md:text-lg truncate">
                            {v.name}
                          </h3>
                          <div className="space-y-1 mt-1">
                            <p className="text-sm text-gray-600 dark:text-gray-200 flex items-center">
                              <Icon name="Smartphone" className="w-4 h-4 mr-2 text-gray-400" />
                              {maskPhoneNumber(v.phone) || 'No phone'}
                            </p>
                            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-300 flex items-center">
                              <Icon name="Ticket" className="w-4 h-4 mr-2 text-gray-400" />
                              Code: <span className="font-mono ml-1">{v.invite_code || '-'}</span>
                            </p>
                            {v.plate && (
                              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-300 flex items-center">
                                <Icon name="Truck" className="w-4 h-4 mr-2 text-gray-400" />
                                Plate: <span className="font-mono ml-1">{v.plate}</span>
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={getStatusChipClass(v.status, 'sm')}>
                          {formatVisitorStatus(v.status)}
                        </span>
                      </div>

                      {/* Host and Purpose Info */}
                      {(v.host_name || v.purpose) && (
                        <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 mb-3 space-y-1">
                          {v.host_name && (
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              <span className="font-medium">🏠 Host:</span> {v.host_name}
                            </p>
                          )}
                          {v.purpose && (
                            <p className="text-sm text-gray-600 dark:text-gray-200">
                              <span className="font-medium">📝 Purpose:</span> {v.purpose}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Action Buttons - Mobile Optimized */}
                      <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
                        {(canVisitorCheckIn(v.status) || v._otpVerified) && (
                          <Button
                            size="sm"
                            className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold"
                            onClick={() => handleCheckIn(v.id)}
                            disabled={isLoading('checkIn')}
                          >
                            <Icon name="Check" className="w-4 h-4 mr-1" />
                            Check In
                          </Button>
                        )}
                        {canVisitorCheckOut(v.status) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full md:w-auto border-orange-300 text-orange-600 hover:bg-orange-50 font-bold"
                            onClick={() => handleCheckOut(v.id)}
                            disabled={isLoading('checkOut')}
                          >
                            <Icon name="DoorOpen" className="w-4 h-4 mr-1" />
                            Check Out
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full md:w-auto text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                          onClick={() => setIncidentModal({ isOpen: true, visitor: v })}
                        >
                          <Icon name="AlertTriangle" className="w-4 h-4 mr-1" />
                          Report
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card.Content>
          </Card>
        )}

        {/* Enhanced Empty State */}
        {!isLoading('manualCheck') && searchResults.length === 0 && searchTerm && (
          <Card>
            <Card.Content>
              <EmptyState
                icon="Search"
                title="No Visitors Found"
                message={`No visitors match "${searchTerm}". Try a different search term or check for typos.`}
                actions={[
                  {
                    label: 'Clear Search',
                    onClick: () => {
                      setSearchTerm('');
                      setSearchResults([]);
                    },
                    variant: 'outline'
                  },
                  {
                    label: 'Register Walk-In',
                    onClick: () => navigateTo('/dashboard/guard/walk-in'),
                    variant: 'primary'
                  }
                ]}
              />
            </Card.Content>
          </Card>
        )}

        {/* Initial State - No Search Yet */}
        {!isLoading('manualCheck') && searchResults.length === 0 && !searchTerm && (
          <Card>
            <Card.Content>
              <EmptyState
                icon="Search"
                title="Ready to Search"
                message="Enter a name, phone number, invite code, or 6-digit Pass Code to find a visitor."
                actions={[
                  {
                    label: 'Use QR Scanner Instead',
                    onClick: () => navigateTo('/dashboard/guard/scan-qr'),
                    variant: 'primary',
                    icon: 'QrCode'
                  }
                ]}
              />
            </Card.Content>
          </Card>
        )}

        {/* Phase G4: Incident Modal */}
        <IncidentModal
          isOpen={incidentModal.isOpen}
          visitor={incidentModal.visitor}
          onClose={(result) => {
            if (result?.success) {
              notificationService.success('Incident Logged', result.message || 'Incident logged successfully');
            }
            setIncidentModal({ isOpen: false, visitor: null });
          }}
        />
      </div>
    </div>
  );
};

export default ManualCheck;
