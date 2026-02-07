import React, { useState, useEffect } from 'react';
import { navigateTo } from '../../utils/appNavigation';
import { Card, Button, PageHeader } from '../../components/ui';
import { useError } from '../../contexts/ErrorContext';
import { useLoading } from '../../contexts/LoadingContext';
import IncidentModal from '../../components/guard/IncidentModal'; // Phase G4
import { getStatusChipClass } from '../../utils/statusColors'; // Phase A8
import { Search, QrCode, Key } from 'lucide-react';
import { verifyOtp } from '../../services/visitorService';
import notificationService from '../../services/notificationService';

const ManualCheck = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [incidentModal, setIncidentModal] = useState({ isOpen: false, visitor: null }); // Phase G4
  const { handleError, handleApiError, clearAllErrors } = useError();
  const { setLoading, isLoading } = useLoading();

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
      // Enter to search
      if (e.key === 'Enter' && e.target.type === 'text') {
        e.preventDefault();
        handleSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchTerm]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      handleError('Please enter a search term', { context: 'Manual Check Search' });
      return;
    }

    try {
      setLoading('manualCheck', true, { message: 'Searching visitors...' });
      clearAllErrors();

      // Check if search term is a 6-digit OTP
      const isOTP = /^\d{6}$/.test(searchTerm.trim());

      if (isOTP) {
        // Search by OTP - find visitors with status otp_sent or pending
        const response = await fetch('/api/visitors', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          const visitors = data.data || [];

          // Filter for visitors awaiting OTP verification
          const otpPending = visitors.filter(v =>
            v.status === 'otp_sent' || v.status === 'PENDING' || v.status === 'pending'
          );

          // Try to verify OTP for each pending visitor
          const verified = [];
          for (const visitor of otpPending) {
            try {
              await verifyOtp(visitor.id, searchTerm.trim());
              verified.push({ ...visitor, _otpVerified: true });
              break; // Found the match
            } catch (e) {
              // OTP doesn't match this visitor, continue
            }
          }

          if (verified.length > 0) {
            setSearchResults(verified);
            notificationService.success('OTP Verified', 'Visitor verified successfully');
          } else {
            setSearchResults([]);
            handleError('Invalid OTP or OTP expired', { context: 'OTP Verification' });
          }
        }
      } else {
        // Regular search by name, phone, or invite code
        const response = await fetch('/api/visitors', {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          const visitors = data.data || [];

          const filtered = visitors.filter(visitor =>
            visitor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            visitor.phone?.includes(searchTerm) ||
            visitor.invite_code?.toLowerCase().includes(searchTerm.toLowerCase())
          );

          setSearchResults(filtered);
        } else {
          const error = new Error('Failed to fetch visitors');
          error.response = { status: response.status };
          throw error;
        }
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
              ? { ...v, status: 'CHECKED_IN', check_in: new Date().toISOString() }
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
              ? { ...v, status: 'CHECKED_OUT', check_out: new Date().toISOString() }
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
        icon={<Search className="w-6 h-6 text-blue-600" />}
        showBack={true}
        backTo="/dashboard/guard"
        actions={
          <Button
            onClick={() => navigateTo('/dashboard/guard/scan-qr')}
            variant="outline"
          >
            <QrCode className="w-4 h-4 mr-2" />
            QR Scanner
          </Button>
        }
      />

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <Card>
          <Card.Header>
            <Card.Title>Search Visitors</Card.Title>
          </Card.Header>
          <Card.Content>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search by name, phone, invite code, or 6-digit OTP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
                <Button onClick={handleSearch} disabled={isLoading('manualCheck')}>
                  {isLoading('manualCheck') ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>
          </Card.Content>
        </Card>

        {searchResults.length > 0 && (
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
                            <span className="mr-2">📱</span>
                            {visitor.phone || 'No phone'}
                          </p>
                          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-300 flex items-center">
                            <span className="mr-2">🎫</span>
                            Code: <span className="font-mono ml-1">{visitor.invite_code}</span>
                          </p>
                        </div>
                      </div>
                      <span className={getStatusChipClass(visitor.status, 'sm')}>
                        {visitor.status}
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
                      {visitor.status === 'VERIFIED' && (
                        <Button
                          size="sm"
                          className="w-full md:w-auto bg-green-500 hover:bg-green-600 text-white font-bold"
                          onClick={() => handleCheckIn(visitor.id)}
                          disabled={isLoading('checkIn')}
                        >
                          <span className="mr-1">✅</span>
                          Check In
                        </Button>
                      )}
                      {visitor.status === 'CHECKED_IN' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full md:w-auto border-orange-300 text-orange-600 hover:bg-orange-50 font-bold"
                          onClick={() => handleCheckOut(visitor.id)}
                          disabled={isLoading('checkOut')}
                        >
                          <span className="mr-1">🚪</span>
                          Check Out
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full md:w-auto text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
                        onClick={() => setIncidentModal({ isOpen: true, visitor })}
                      >
                        <span className="mr-1">⚠️</span>
                        Report
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        )}

        {searchResults.length === 0 && !isLoading('manualCheck') && searchTerm && (
          <Card>
            <Card.Content className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-300 mt-2">No visitors found matching "{searchTerm}"</p>
            </Card.Content>
          </Card>
        )}

        {/* Phase G4: Incident Modal */}
        <IncidentModal
          isOpen={incidentModal.isOpen}
          visitor={incidentModal.visitor}
          onClose={(result) => {
            if (result?.success) {
              // Show success notification
              alert(result.message || 'Incident logged successfully');
            }
            setIncidentModal({ isOpen: false, visitor: null });
          }}
        />
      </div>
    </div>
  );
};

export default ManualCheck;

