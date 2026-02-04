/**
 * @file WalkInRegistration.jsx
 * @description Phase G2 - Guard walk-in visitor registration with real-time approval
 * Enhanced with offline support (Phase 4)
 * Allows guards to register unexpected visitors and request resident approval
 */

import React, { useState, useEffect } from 'react';
import { Card, Button, Input, PageHeader } from '../../components/ui';
import { User, Phone, Home, FileText, AlertCircle, UserPlus, WifiOff, CloudOff, RefreshCw, Clock } from 'lucide-react';
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
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingWalkIns, setPendingWalkIns] = useState([]);
  const [showPendingList, setShowPendingList] = useState(false);

  const { handleError, handleApiError, clearAllErrors } = useError();
  const { setLoading, isLoading } = useLoading();
  const { user } = useAuth();

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when back online
      syncPendingWalkIns();
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
  }, []);

  const loadPendingWalkIns = async () => {
    try {
      const pending = await offlineService.getPendingWalkIns();
      setPendingWalkIns(pending);
    } catch (err) {
      console.error('Failed to load pending walk-ins:', err);
    }
  };

  const syncPendingWalkIns = async () => {
    if (!isOnline) return;

    try {
      setLoading('syncWalkIns', true, { message: 'Syncing pending registrations...' });
      const result = await offlineService.syncPendingOperations();
      if (result.success) {
        await loadPendingWalkIns();
      }
    } catch (err) {
      console.error('Failed to sync pending walk-ins:', err);
    } finally {
      setLoading('syncWalkIns', false);
    }
  };

  const handleRetrySync = async (visitor) => {
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
      clearAllErrors();

      const response = await fetch('/api/visitors/walk-in', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(walkInData)
      });

      if (!response.ok) {
        const error = new Error('Failed to register walk-in visitor');
        error.response = { status: response.status, data: await response.json() };
        throw error;
      }

      const result = await response.json();
      const visitor = result.data || result;

      setRegisteredVisitor({ ...visitor, mode: 'online' });
      setShowApprovalCard(true);

    } catch (err) {
      // Network error - fall back to offline registration
      if (err.message.includes('fetch') || err.message.includes('network')) {
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
      clearAllErrors();

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

  const handleRequestApproval = async (visitor) => {
    if (!isOnline) {
      handleError('Cannot request approval while offline. Approval will be requested when you\'re back online.', { context: 'Approval Request' });
      return;
    }

    if (visitor.pendingSync) {
      handleError('This registration is pending sync. Please wait for it to sync before requesting approval.', { context: 'Approval Request' });
      return;
    }

    try {
      setLoading('approval', true, { message: 'Requesting resident approval...' });

      const response = await fetch(`/api/visitors/${visitor.id}/request-approval`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: 'Walk-in visitor at gate',
          guardNotes: formData.purpose
        })
      });

      if (!response.ok) {
        const error = new Error('Failed to request approval');
        error.response = { status: response.status };
        throw error;
      }

      // Update visitor status
      setRegisteredVisitor(prev => ({
        ...prev,
        status: 'pending_approval'
      }));

    } catch (err) {
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
    clearAllErrors();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <PageHeader
        title="Walk-In Registration"
        subtitle="Register unexpected visitors at the gate"
        icon={<UserPlus className="w-6 h-6 text-blue-600" />}
        showBack={true}
        backTo="/dashboard/guard"
        actions={
          <div className="flex items-center gap-2">
            {/* Offline indicator */}
            {!isOnline && (
              <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                <WifiOff className="w-3 h-3" />
                Offline
              </span>
            )}
            {/* Pending sync badge */}
            {pendingWalkIns.length > 0 && (
              <button
                onClick={() => setShowPendingList(!showPendingList)}
                className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full hover:bg-orange-200"
              >
                <CloudOff className="w-3 h-3" />
                {pendingWalkIns.length} pending
              </button>
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
        {/* Offline Mode Banner */}
        {!isOnline && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <WifiOff className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
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
                <Clock className="w-5 h-5 text-orange-600" />
                Pending Registrations ({pendingWalkIns.length})
              </Card.Title>
              {isOnline && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={syncPendingWalkIns}
                  disabled={isLoading('syncWalkIns')}
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${isLoading('syncWalkIns') ? 'animate-spin' : ''}`} />
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
                      <p className="font-medium text-gray-900">{walkIn.name}</p>
                      <p className="text-xs text-gray-500">
                        {walkIn.phone} • House: {walkIn.houseNumber}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(walkIn.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">
                      <CloudOff className="w-3 h-3" />
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="w-4 h-4 inline mr-1" />
                    Visitor Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    data-testid="walk-in-visitor-name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter visitor's full name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    required
                  />
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    data-testid="walk-in-visitor-phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g., +254712345678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    required
                  />
                </div>

                {/* House Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Home className="w-4 h-4 inline mr-1" />
                    House Number *
                  </label>
                  <input
                    type="text"
                    name="houseNumber"
                    data-testid="walk-in-house-number"
                    value={formData.houseNumber}
                    onChange={handleInputChange}
                    placeholder="e.g., A-14, B-23, Villa 101"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter the resident's house/unit number for accurate lookup</p>
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Purpose (Optional)
                  </label>
                  <textarea
                    name="purpose"
                    data-testid="walk-in-purpose"
                    value={formData.purpose}
                    onChange={handleInputChange}
                    placeholder="Reason for visit"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                {/* Vehicle Plate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🚗 Vehicle Plate (Optional)
                  </label>
                  <input
                    type="text"
                    name="vehiclePlate"
                    value={formData.vehiclePlate}
                    onChange={handleInputChange}
                    placeholder="e.g., KXX 123A"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                {/* Info Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
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
                  <div className="text-center text-gray-500 py-4">
                    No pending registrations found.
                  </div>
                ) : (
                  pendingWalkIns.map(visitor => (
                    <div key={visitor.localId} className="p-4 bg-gray-50 rounded-md shadow-sm flex justify-between items-center">
                      <div>
                        <div className="font-medium">{visitor.name}</div>
                        <div className="text-sm text-gray-500">
                          {visitor.phone} &bull; {visitor.houseNumber}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Registered {new Date(visitor.dateOfVisit).toLocaleDateString()} at {visitor.timeOfVisit}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRetrySync(visitor)}
                          className="flex items-center gap-1"
                        >
                          <RefreshCw className="w-4 h-4" />
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
                <WifiOff className="w-5 h-5" />
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

