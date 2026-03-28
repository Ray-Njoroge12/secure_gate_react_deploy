/**
 * @file WalkInRegistration.jsx
 * @description Phase G2 - Guard walk-in visitor registration with real-time approval
 * Enhanced with offline support (Phase 4)
 * Allows guards to register unexpected visitors and request resident approval
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../../utils/apiClient';
import logger from '../../utils/logger';
import { Card, Button, PageHeader, Icon } from '../../components/ui';
import { useError } from '../../contexts/ErrorContext';
import { useLoading } from '../../contexts/LoadingContext';
import { useAuth } from '../../contexts/AuthContext';
import ApprovalStatusCard from '../../components/guard/ApprovalStatusCard';
import offlineService from '../../services/offlineService';

const WalkInRegistration = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    purpose: '',
    houseNumber: '',
    vehiclePlate: ''
  });
  const [registeredVisitor, setRegisteredVisitor] = useState(null);
  const [showApprovalCard, setShowApprovalCard] = useState(false);
  const [houseNumberError, setHouseNumberError] = useState('');
  const [notificationWarning, setNotificationWarning] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingWalkIns, setPendingWalkIns] = useState([]);
  const [showPendingList, setShowPendingList] = useState(false);

  const { handleError, handleApiError, clearAllErrors } = useError();
  const { setLoading, isLoading } = useLoading();
  const { user } = useAuth();

  const safelyClearErrors = () => {
    try {
      clearAllErrors?.();
    } catch (error) {
      console.warn('Failed to clear global errors:', error);
    }
  };

  const loadPendingWalkIns = useCallback(async () => {
    try {
      const pending = await offlineService.getPendingWalkIns();
      setPendingWalkIns(pending);
    } catch (err) {
      logger.error('Failed to load pending walk-ins:', err);
    }
  }, []);

  const syncPendingWalkIns = useCallback(async (force = false) => {
    if (!force && !isOnline) return;

    try {
      setLoading('syncWalkIns', true, { message: 'Syncing pending registrations...' });
      const result = await offlineService.syncPendingOperations();
      if (result.success) {
        await loadPendingWalkIns();
      }
    } catch (err) {
      logger.error('Failed to sync pending walk-ins:', err);
    } finally {
      setLoading('syncWalkIns', false);
    }
  }, [isOnline, loadPendingWalkIns, setLoading]);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when back online
      syncPendingWalkIns(true);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load pending walk-ins
    loadPendingWalkIns();

    // Listen for offline service events
    const unsubscribe = offlineService.addConnectionListener((event) => {
      if (event === 'sync_completed' || event === 'offline_walkin_queued') {
        loadPendingWalkIns();
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (unsubscribe) unsubscribe();
    };
  }, [loadPendingWalkIns, syncPendingWalkIns]);

  const handleRetrySync = async () => {
    // Retry syncing all pending items
    await syncPendingWalkIns();
  };

  const generateLocalId = () => {
    return `walkin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (name === 'houseNumber') {
      setHouseNumberError('');
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      handleError('Visitor name is required', { context: 'Walk-In Registration' });
      return false;
    }
    if (!formData.phone.trim()) {
      handleError('Phone number is required', { context: 'Walk-In Registration' });
      return false;
    }
    if (!formData.houseNumber.trim()) {
      setHouseNumberError('House number is required');
      handleError('House number is required', { context: 'Walk-In Registration' });
      return false;
    }
    return true;
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const walkInData = {
      name: formData.name,
      phone: formData.phone,
      purpose: formData.purpose || 'Walk-in visit',
      houseNumber: formData.houseNumber,
      vehiclePlate: formData.vehiclePlate,
      dateOfVisit: new Date().toISOString().split('T')[0],
      timeOfVisit: new Date().toTimeString().slice(0, 5),
      guardId: user?.id,
      guardName: user?.username || user?.name
    };

    if (isOnline) {
      // Online - register immediately
      await registerOnline(walkInData);
    } else {
      // Offline - queue for sync
      await registerOffline(walkInData);
    }
  };

  const registerOnline = async (walkInData) => {
    try {
      setLoading('walkInReg', true, { message: 'Registering walk-in visitor...' });
      safelyClearErrors();

      const response = await api.post('/api/visitors/walk-in', walkInData);
      const result = response.data;
      const visitor = result.data || result;

      setRegisteredVisitor({ ...visitor, mode: 'online' });
      setShowApprovalCard(true);

      // Check if resident notification failed
      if (visitor.residentNotified === false || result.notificationStatus === 'failed') {
        setNotificationWarning('Registration saved. Resident could not be notified — please contact them manually.');
      }

    } catch (err) {
      // Detect resident-not-found error
      const status = err.response?.status;
      const errorCode = err.response?.data?.code || err.response?.data?.error?.code;
      if (status === 404 || errorCode === 'RESIDENT_NOT_FOUND' || errorCode === 'resident_not_found') {
        setHouseNumberError(`No resident found at "${formData.houseNumber}". Please verify with the visitor and try again.`);
        return;
      }
      // Network error - fall back to offline registration
      const errorMessage = String(err.message || '').toLowerCase();
      if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
        console.warn('Online registration failed, falling back to offline:', err);
        await registerOffline(walkInData);
      } else {
        handleApiError(err, 'Walk-In Registration');
      }
    } finally {
      setLoading('walkInReg', false);
    }
  };

  const registerOffline = async (walkInData) => {
    try {
      setLoading('walkInReg', true, { message: 'Saving offline registration...' });
      safelyClearErrors();

      const localId = generateLocalId();
      const offlineRecord = {
        ...walkInData,
        localId,
        registeredOffline: true,
        status: 'PENDING_SYNC'
      };

      await offlineService.queueWalkInRegistration(offlineRecord);

      // Refresh pending list
      await loadPendingWalkIns();

      setRegisteredVisitor({
        ...offlineRecord,
        mode: 'offline',
        pendingSync: true
      });
      setShowApprovalCard(true);

    } catch (err) {
      handleError('Failed to save offline registration: ' + err.message, { context: 'Walk-In Registration' });
    } finally {
      setLoading('walkInReg', false);
    }
  };

  const handleRequestApproval = async (visitor, options = {}) => {
    const targetVisitor = visitor || registeredVisitor;

    if (!targetVisitor?.id) {
      handleError('Visitor record is not ready for approval yet. Please register the visitor again.', { context: 'Approval Request' });
      return;
    }

    if (!isOnline) {
      handleError('Cannot request approval while offline. Approval will be requested when you\'re back online.', { context: 'Approval Request' });
      return;
    }

    if (targetVisitor.pendingSync) {
      handleError('This registration is pending sync. Please wait for it to sync before requesting approval.', { context: 'Approval Request' });
      return;
    }

    try {
      setLoading('approval', true, { message: 'Requesting resident approval...' });

      const response = await api.post(`/api/visitors/${targetVisitor.id}/request-approval`, {
        reason: options.forceResend ? 'Follow-up approval reminder from guard' : 'Walk-in visitor at gate',
        guardNotes: formData.purpose
      });

      const result = response.data;

      // Update visitor status
      setRegisteredVisitor(prev => ({
        ...prev,
        status: 'pending_approval'
      }));

      // Check if resident notification failed
      if (result.notificationStatus === 'failed' || result.data?.residentNotified === false) {
        setNotificationWarning('Approval requested but resident could not be notified — please contact them manually.');
      }

    } catch (err) {
      const status = err.response?.status;
      const errorCode = err.response?.data?.code || err.response?.data?.error?.code;
      if (status === 404 || errorCode === 'RESIDENT_NOT_FOUND' || errorCode === 'resident_not_found') {
        setNotificationWarning(`No resident found for house "${formData.houseNumber}". Please verify and try again.`);
        return;
      }
      handleApiError(err, 'Approval Request');
    } finally {
      setLoading('approval', false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      phone: '',
      purpose: '',
      houseNumber: '',
      vehiclePlate: ''
    });
    setRegisteredVisitor(null);
    setShowApprovalCard(false);
    setHouseNumberError('');
    setNotificationWarning('');
    safelyClearErrors();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900" data-tour="walk-in-registration">
      <PageHeader
        title="Walk-In Registration"
        subtitle="Register unexpected visitors at the gate"
        icon={<Icon name="UserPlus" className="w-6 h-6 text-blue-600" />}
        showBack={true}
        backTo="/dashboard/guard"
        actions={
          <div className="flex items-center gap-2">
            {/* Offline indicator */}
            {!isOnline && (
              <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                <Icon name="WifiOff" className="w-3 h-3" />
                Offline
              </span>
            )}
            {/* Pending sync badge */}
            {pendingWalkIns.length > 0 && (
              <Button
                onClick={() => setShowPendingList(!showPendingList)}
                className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full hover:bg-orange-200"
              >
                <Icon name="CloudOff" className="w-3 h-3" />
                {pendingWalkIns.length} pending
              </Button>
            )}
            {showApprovalCard && (
              <Button variant="outline" onClick={handleReset}>
                Register Another
              </Button>
            )}
          </div>
        }
      />

      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8 space-y-6">
        {/* Notification Warning Banner */}
        {notificationWarning && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <Icon name="AlertTriangle" className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">{notificationWarning}</p>
            </div>
            <button
              onClick={() => setNotificationWarning('')}
              className="text-amber-600 hover:text-amber-800 p-1"
              aria-label="Dismiss warning"
            >
              <Icon name="X" className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Offline Mode Banner */}
        {!isOnline && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <Icon name="WifiOff" className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Offline Mode Active</p>
              <p className="text-xs text-yellow-700 mt-1">
                Walk-in registrations will be saved locally and synced when you're back online.
                Approval requests cannot be sent while offline.
              </p>
            </div>
          </div>
        )}

        {/* Pending Walk-Ins List */}
        {showPendingList && pendingWalkIns.length > 0 && (
          <Card>
            <Card.Header className="flex items-center justify-between">
              <Card.Title className="flex items-center gap-2">
                <Icon name="Clock" className="w-5 h-5 text-orange-600" />
                Pending Registrations ({pendingWalkIns.length})
              </Card.Title>
              {isOnline && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={syncPendingWalkIns}
                  disabled={isLoading('syncWalkIns')}
                >
                  <Icon name="RefreshCw" className={`w-4 h-4 mr-1 ${isLoading('syncWalkIns') ? 'animate-spin' : ''}`} />
                  Sync Now
                </Button>
              )}
            </Card.Header>
            <Card.Content>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {pendingWalkIns.map((walkIn, index) => (
                  <div
                    key={walkIn.localId || index}
                    className="flex items-center justify-between p-3 bg-orange-50 border border-orange-100 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{walkIn.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {walkIn.phone} • House: {walkIn.houseNumber}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-300">
                        {new Date(walkIn.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                      <Icon name="CloudOff" className="w-3 h-3" />
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>
        )}

        {!showApprovalCard ? (
          <Card>
            <Card.Header>
              <Card.Title>Visitor Information</Card.Title>
            </Card.Header>
            <Card.Content>
              <form onSubmit={handleRegister} data-testid="walk-in-form" className="space-y-4">
                {/* Visitor Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Icon name="User" className="w-4 h-4 inline mr-1" />
                    Visitor Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    data-testid="walk-in-visitor-name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter visitor's full name"
                    className="mobile-input w-full"
                    required
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Icon name="Phone" className="w-4 h-4 inline mr-1" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    data-testid="walk-in-visitor-phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g., +254712345678"
                    className="mobile-input w-full"
                    required
                  />
                </div>

                {/* House Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Icon name="Home" className="w-4 h-4 inline mr-1" />
                    House Number *
                  </label>
                  <input
                    type="text"
                    name="houseNumber"
                    data-testid="walk-in-house-number"
                    value={formData.houseNumber}
                    onChange={handleInputChange}
                    placeholder="e.g., A-14, B-23, Villa 101"
                    className={`mobile-input w-full ${houseNumberError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}`}
                    required
                    aria-invalid={!!houseNumberError}
                    aria-describedby={houseNumberError ? 'house-number-error' : undefined}
                  />
                  {houseNumberError ? (
                    <p id="house-number-error" className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">{houseNumberError}</p>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Enter the resident's house/unit number for accurate lookup</p>
                  )}
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    <Icon name="FileText" className="w-4 h-4 inline mr-1" />
                    Purpose (Optional)
                  </label>
                  <textarea
                    name="purpose"
                    data-testid="walk-in-purpose"
                    value={formData.purpose}
                    onChange={handleInputChange}
                    placeholder="Reason for visit"
                    rows={3}
                    className="mobile-textarea w-full"
                  />
                </div>

                {/* Vehicle Plate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    🚗 Vehicle Plate (Optional)
                  </label>
                  <input
                    type="text"
                    name="vehiclePlate"
                    value={formData.vehiclePlate}
                    onChange={handleInputChange}
                    placeholder="e.g., KXX 123A"
                    className="mobile-input w-full"
                  />
                </div>

                {/* Info Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                  <Icon name="AlertCircle" className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Walk-In Approval Process</p>
                    <p>After registration, you can request approval from the resident. They'll receive a real-time notification and can approve/reject instantly.</p>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-2 pt-2">
                  <Button
                    type="submit"
                    data-testid="walk-in-submit"
                    disabled={isLoading('walkInReg')}
                    className="flex-1"
                  >
                    {isLoading('walkInReg') ? 'Registering...' : 'Register Walk-In'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReset}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </Card.Content>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Visitor Details Card */}
            <Card>
              <Card.Header>
                <Card.Title>Walk-In Visitor Registered</Card.Title>
              </Card.Header>
              <Card.Content>
                <div className="space-y-2">
                  <div>
                    <span className="font-medium">Name:</span> {registeredVisitor?.name}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span> {registeredVisitor?.phone}
                  </div>
                  <div>
                    <span className="font-medium">House Number:</span> {formData.houseNumber}
                  </div>
                  {registeredVisitor?.residentName && (
                    <div>
                      <span className="font-medium">Resident:</span> {registeredVisitor.residentName}
                    </div>
                  )}
                  {formData.purpose && (
                    <div>
                      <span className="font-medium">Purpose:</span> {formData.purpose}
                    </div>
                  )}
                  {formData.vehiclePlate && (
                    <div>
                      <span className="font-medium">Vehicle:</span> {formData.vehiclePlate}
                    </div>
                  )}
                </div>
              </Card.Content>
            </Card>

            {/* Approval Status Card */}
            <ApprovalStatusCard
              visitor={registeredVisitor}
              onRequestApproval={handleRequestApproval}
            />
          </div>
        )}

        {/* Pending Registrations List (Offline Mode) */}
        {showPendingList && (
          <Card>
            <Card.Header>
              <Card.Title>Pending Walk-In Registrations</Card.Title>
            </Card.Header>
            <Card.Content>
              <div className="space-y-2">
                {pendingWalkIns.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                    No pending registrations found.
                  </div>
                ) : (
                  pendingWalkIns.map(visitor => (
                    <div key={visitor.localId} className="p-4 bg-gray-50 dark:bg-slate-900 rounded-md shadow-sm flex justify-between items-center">
                      <div>
                        <div className="font-medium">{visitor.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {visitor.phone} &bull; {visitor.houseNumber}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                          Registered {new Date(visitor.dateOfVisit).toLocaleDateString()} at {visitor.timeOfVisit}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleRetrySync}
                          className="flex items-center gap-1"
                        >
                          <Icon name="RefreshCw" className="w-4 h-4" />
                          Retry Sync
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card.Content>
            <Card.Footer>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPendingList(false)}
                  className="flex-1"
                >
                  Back to Registration
                </Button>
                <Button
                  onClick={syncPendingWalkIns}
                  className="flex-1"
                  disabled={isLoading('syncWalkIns')}
                >
                  {isLoading('syncWalkIns') ? 'Syncing...' : 'Sync All Pending'}
                </Button>
              </div>
            </Card.Footer>
          </Card>
        )}

        {/* Offline Notice */}
        {!isOnline && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700 p-4 rounded-md">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <Icon name="WifiOff" className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">You are currently offline</p>
                <p>Some features may be limited. Please check your internet connection.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalkInRegistration;
