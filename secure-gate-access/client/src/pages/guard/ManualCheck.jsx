import React, { useState, useEffect } from 'react';

import OfflineBanner from '../../components/common/OfflineBanner';
import IncidentModal from '../../components/guard/IncidentModal'; // Phase G4
import { Card, Button, PageHeader, Icon, Skeleton, EmptyState } from '../../components/ui';
import { useError } from '../../contexts/ErrorContext';
import { useLoading } from '../../contexts/LoadingContext';
import useOnlineStatus from '../../hooks/useOnlineStatus';
import notificationService from '../../services/notificationService';
import api from '../../utils/apiClient';
import { navigateTo } from '../../utils/appNavigation';
import {
  formatVisitorStatus,
  canVisitorCheckIn,
  canVisitorCheckOut
} from '../../utils/guardScanUtils';
import { getStatusChipClass } from '../../utils/statusColors'; // Phase A8


const ManualCheck = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [incidentModal, setIncidentModal] = useState({ isOpen: false, visitor: null }); // Phase G4
  const { handleError, handleApiError, clearAllErrors } = useError();
  const { setLoading, isLoading } = useLoading();
  const { isOnline, wasOffline } = useOnlineStatus();

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

    try {
      setLoading('manualCheck', true, { message: 'Searching visitors...' });
      clearAllErrors();

      // Server-side search — the backend handles OTP (6-digit), name, phone, and invite code
      const query = encodeURIComponent(searchTerm.trim());
      const response = await api.get(`/api/visitors?search=${query}`);
      const data = response.data;
      const visitors = data.data || [];
      setSearchResults(visitors);

      if (/^\d{6}$/.test(searchTerm.trim()) && visitors.length > 0) {
        notificationService.success('OTP Match', 'Visitor found by OTP');
      }
    } catch (err) {
      handleApiError(err, 'Manual Check Search');
    } finally {
      setLoading('manualCheck', false);
    }
  };

  const handleCheckIn = async (visitorId) => {
    try {
      setLoading('checkIn', true, { message: 'Checking in visitor...' });
      await api.post(`/api/visitors/${visitorId}/check-in`);
      setSearchResults(prev =>
        prev.map(v =>
          v.id === visitorId
            ? { ...v, status: 'on_premise', check_in: new Date().toISOString() }
            : v
        )
      );
    } catch (err) {
      handleApiError(err, 'Visitor Check-in');
    } finally {
      setLoading('checkIn', false);
    }
  };

  const handleCheckOut = async (visitorId) => {
    try {
      setLoading('checkOut', true, { message: 'Checking out visitor...' });
      await api.post(`/api/visitors/${visitorId}/check-out`);
      setSearchResults(prev =>
        prev.map(v =>
          v.id === visitorId
            ? { ...v, status: 'checked_out', check_out: new Date().toISOString() }
            : v
        )
      );
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
        icon={<Icon name="search" className="w-6 h-6 text-blue-600" />}
        showBack={true}
        backTo="/dashboard/guard"
        actions={
          <Button
            onClick={() => navigateTo('/dashboard/guard/scan-qr')}
            variant="outline"
          >
            <Icon name="qr-code" className="w-4 h-4 mr-2" />
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
                  placeholder="Search by name, phone, invite code, or 6-digit OTP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  aria-label="Search visitor by name, phone, invite code, or OTP"
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
                {searchResults.map(visitor => (
                  <div key={visitor.id} className="bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 rounded-xl p-4 md:p-5 hover:border-blue-300 hover:shadow-md transition-all">
                    {/* Header with Status */}
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 dark:text-white text-base md:text-lg truncate">
                          {visitor.name}
                        </h3>
                        <div className="space-y-1 mt-1">
                          <p className="text-sm text-gray-600 dark:text-gray-200 flex items-center">
                            <Icon name="smartphone" className="w-4 h-4 mr-2 text-gray-400" />
                            {visitor.phone || 'No phone'}
                          </p>
                          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-300 flex items-center">
                            <Icon name="ticket" className="w-4 h-4 mr-2 text-gray-400" />
                            Code: <span className="font-mono ml-1">{visitor.invite_code}</span>
                          </p>
                        </div>
                      </div>
                      <span className={getStatusChipClass(visitor.status, 'sm')}>
                        {formatVisitorStatus(visitor.status)}
                      </span>
                    </div>

                    {/* Host and Purpose Info */}
                    {(visitor.host_name || visitor.purpose) && (
                      <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-3 mb-3 space-y-1">
                        {visitor.host_name && (
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            <span className="font-medium">🏠 Host:</span> {visitor.host_name}
                          </p>
                        )}
                        {visitor.purpose && (
                          <p className="text-sm text-gray-600 dark:text-gray-200">
                            <span className="font-medium">📝 Purpose:</span> {visitor.purpose}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Action Buttons - Mobile Optimized */}
                    <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
                      {(canVisitorCheckIn(visitor.status) || visitor._otpVerified) && (
                        <Button
                          size="sm"
                          className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-bold"
                          onClick={() => handleCheckIn(visitor.id)}
                          disabled={isLoading('checkIn')}
                        >
                          <Icon name="check" className="w-4 h-4 mr-1" />
                          Check In
                        </Button>
                      )}
                      {canVisitorCheckOut(visitor.status) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full md:w-auto border-orange-300 text-orange-600 hover:bg-orange-50 font-bold"
                          onClick={() => handleCheckOut(visitor.id)}
                          disabled={isLoading('checkOut')}
                        >
                          <Icon name="door" className="w-4 h-4 mr-1" />
                          Check Out
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full md:w-auto text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                        onClick={() => setIncidentModal({ isOpen: true, visitor })}
                      >
                        <Icon name="exclamation-triangle" className="w-4 h-4 mr-1" />
                        Report
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        )}

        {/* Enhanced Empty State */}
        {!isLoading('manualCheck') && searchResults.length === 0 && searchTerm && (
          <Card>
            <Card.Content>
              <EmptyState
                icon="search"
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
                icon="search"
                title="Ready to Search"
                message="Enter a name, phone number, invite code, or 6-digit OTP to find a visitor."
                actions={[
                  {
                    label: 'Use QR Scanner Instead',
                    onClick: () => navigateTo('/dashboard/guard/scan-qr'),
                    variant: 'primary',
                    icon: 'qr-code'
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
