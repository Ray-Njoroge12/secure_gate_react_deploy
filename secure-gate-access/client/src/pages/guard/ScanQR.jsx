import React, { useState, useEffect } from 'react';
import { navigateTo } from '../../utils/appNavigation';
import { Card, Button, PageHeader } from '../../components/ui';
import QRScanner from '../../components/QRScanner';
import { QrCode, RefreshCw, Search, CheckCircle, XCircle, WifiOff, CloudOff, Loader2 } from 'lucide-react';
import offlineService from '../../services/offlineService';
import { useAuth } from '../../contexts/AuthContext';

const ScanQR = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [error, setError] = useState(null);
  const [testMode] = useState(process.env.NODE_ENV === 'test' || process.env.REACT_APP_TEST_MODE === 'true');
  const [testInput, setTestInput] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { user } = useAuth();

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Get pending sync count
    const updatePendingCount = async () => {
      try {
        const pending = await offlineService.getPendingOfflineCheckIns();
        setPendingSyncCount(pending.length);
      } catch (err) {
        console.error('Failed to get pending sync count:', err);
      }
    };
    
    updatePendingCount();
    
    // Listen for offline service events
    const unsubscribe = offlineService.addConnectionListener((event) => {
      if (event === 'sync_completed' || event === 'offline_checkin_queued') {
        updatePendingCount();
      }
    });
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + S to start scanning
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isScanning) {
          setIsScanning(true);
        }
      }
      // Escape to stop scanning
      if (e.key === 'Escape' && isScanning) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isScanning]);

  const handleScan = (data) => {
    if (data) {
      setScannedData(data);
      setIsScanning(false);
      processQRCode(data);
    }
  };

  const handleError = (errorMessage) => {
    setError(errorMessage);
    setIsScanning(false);
  };

  const handleClose = () => {
    setIsScanning(false);
    setError(null);
  };

  const processQRCode = async (qrData) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Extract visitor ID from QR code data
      const visitorId = qrData.split('-').pop(); // Assuming format: PASS-{visitorId}-{timestamp}

      if (!visitorId) {
        setError('Invalid QR code format');
        setScannedData({ status: 'error', message: 'Invalid QR code format' });
        setIsProcessing(false);
        return;
      }

      if (isOnline) {
        // ONLINE MODE: Verify with server
        await processOnlineCheckIn(visitorId, qrData);
      } else {
        // OFFLINE MODE: Validate locally and queue
        await processOfflineCheckIn(visitorId, qrData);
      }
    } catch (err) {
      setError('Failed to process QR code: ' + err.message);
      setScannedData({ status: 'error', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const processOnlineCheckIn = async (visitorId, qrData) => {
    try {
      const response = await fetch(`/api/visitors/${visitorId}/check-in`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setScannedData({ 
          qrData,
          status: 'success', 
          message: 'Visitor checked in successfully!',
          visitorInfo: result.data || result,
          mode: 'online'
        });
      } else {
        const errorData = await response.json();
        setScannedData({ 
          qrData,
          status: 'error', 
          message: errorData.message || 'Check-in failed',
          mode: 'online'
        });
      }
    } catch (err) {
      // Network error - fall back to offline mode
      console.warn('Online check-in failed, falling back to offline mode:', err);
      await processOfflineCheckIn(visitorId, qrData);
    }
  };

  const processOfflineCheckIn = async (qrData, visitorId) => {
    try {
      // Step 1: Try to validate QR code against local cache
      const localValidation = await offlineService.validateQRCodeOffline(qrData);
      
      if (localValidation) {
        if (localValidation.expired) {
          setScannedData({
            qrData,
            status: 'warning',
            message: 'QR code has expired. Visitor may need a new pass.',
            visitorInfo: localValidation,
            mode: 'offline',
            canOverride: true
          });
          return;
        }
        
        if (localValidation.invalid) {
          setScannedData({
            qrData,
            status: 'error',
            message: localValidation.message || 'Visitor pass is not valid',
            visitorInfo: localValidation,
            mode: 'offline'
          });
          return;
        }
        
        if (localValidation.valid) {
          // Queue the check-in for sync
          await offlineService.queueOfflineCheckIn(
            localValidation.visitor_id || visitorId,
            localValidation,
            user?.id
          );
          
          // Update pending count
          const pending = await offlineService.getPendingOfflineCheckIns();
          setPendingSyncCount(pending.length);
          
          setScannedData({
            qrData,
            status: 'success',
            message: 'Check-in queued (offline mode)',
            visitorInfo: localValidation,
            mode: 'offline',
            pendingSync: true
          });
          return;
        }
      }
      
      // Step 2: QR not found in cache - show warning
      setScannedData({
        qrData,
        status: 'warning',
        message: 'Visitor not found in offline cache. Check-in will be queued for verification when online.',
        mode: 'offline',
        unknownVisitor: true,
        visitorId: visitorId
      });
      
    } catch (err) {
      console.error('Offline check-in error:', err);
      setScannedData({
        qrData,
        status: 'error',
        message: 'Offline validation failed: ' + err.message,
        mode: 'offline'
      });
    }
  };

  const handleForceOfflineCheckIn = async () => {
    // Allow guard to force check-in for unknown visitor (with warning)
    if (!scannedData?.visitorId) return;
    
    try {
      await offlineService.queueOfflineCheckIn(
        scannedData.visitorId,
        { name: 'Unknown (Offline)', qr_code: scannedData.qrData },
        user?.id
      );
      
      const pending = await offlineService.getPendingOfflineCheckIns();
      setPendingSyncCount(pending.length);
      
      setScannedData({
        ...scannedData,
        status: 'success',
        message: 'Check-in queued for verification when online',
        pendingSync: true,
        forcedOffline: true
      });
    } catch (err) {
      setError('Failed to queue check-in: ' + err.message);
    }
  };

  const handleSyncNow = async () => {
    if (!isOnline) {
      setError('Cannot sync while offline');
      return;
    }
    
    try {
      const result = await offlineService.syncPendingOperations();
      if (result.success) {
        const pending = await offlineService.getPendingOfflineCheckIns();
        setPendingSyncCount(pending.length);
      }
    } catch (err) {
      setError('Sync failed: ' + err.message);
    }
  };

  const resetScan = () => {
    setScannedData(null);
    setError(null);
  };

  useEffect(() => {
    return () => {
      setIsScanning(false);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <PageHeader
        title="Scan QR Code"
        subtitle="Quick check-in by scanning visitor passes"
        icon={<QrCode className="w-6 h-6 text-blue-600" />}
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
            {pendingSyncCount > 0 && (
              <button
                onClick={handleSyncNow}
                disabled={!isOnline}
                className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full hover:bg-orange-200 disabled:opacity-50"
                title={isOnline ? 'Click to sync now' : 'Go online to sync'}
              >
                <CloudOff className="w-3 h-3" />
                {pendingSyncCount} pending
              </button>
            )}
            <Button
              onClick={() => setIsScanning(true)}
              disabled={isScanning || isProcessing}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Start Scan
            </Button>
          </div>
        }
      />

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Offline Mode Banner */}
        {!isOnline && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <WifiOff className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Offline Mode Active</p>
              <p className="text-xs text-yellow-700 mt-1">
                QR codes will be validated against cached data. Check-ins will be queued and synced when you're back online.
              </p>
            </div>
          </div>
        )}

        <Card>
          <Card.Content className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            {isProcessing && (
              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                <span className="text-blue-700">Processing QR code...</span>
              </div>
            )}

            {scannedData ? (
              <div className="text-center space-y-4">
                {/* Enhanced Result Card with Offline Support */}
                <Card
                  data-testid="scan-result-card"
                  className={`border-2 ${
                    scannedData.status === 'success'
                      ? 'border-green-400 bg-green-50'
                      : scannedData.status === 'warning'
                      ? 'border-yellow-400 bg-yellow-50'
                      : 'border-red-400 bg-red-50'
                  }`}>
                  <Card.Content className="p-4 md:p-6">
                    <div className="flex flex-col items-center">
                      {/* Status Icon */}
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                        scannedData.status === 'success'
                          ? 'bg-green-500'
                          : scannedData.status === 'warning'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}>
                        {scannedData.status === 'success' ? (
                          <CheckCircle className="w-10 h-10 text-white" />
                        ) : scannedData.status === 'warning' ? (
                          <WifiOff className="w-10 h-10 text-white" />
                        ) : (
                          <XCircle className="w-10 h-10 text-white" />
                        )}
                      </div>

                      {/* Mode Indicator */}
                      {scannedData.mode === 'offline' && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 mb-2 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                          <WifiOff className="w-3 h-3" />
                          Offline Mode
                        </span>
                      )}

                      {/* Pending Sync Indicator */}
                      {scannedData.pendingSync && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 mb-2 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                          <CloudOff className="w-3 h-3" />
                          Pending Sync
                        </span>
                      )}

                      <h3
                        data-testid="scan-result-status"
                        className={`text-xl font-bold mb-2 ${
                          scannedData.status === 'success'
                            ? 'text-green-900'
                            : scannedData.status === 'warning'
                            ? 'text-yellow-900'
                            : 'text-red-900'
                        }`}>
                        {scannedData.status === 'success' 
                          ? (scannedData.pendingSync ? 'Check-In Queued' : 'Visitor Checked In')
                          : scannedData.status === 'warning'
                          ? 'Requires Attention'
                          : 'Check-in Failed'}
                      </h3>

                      <p
                        data-testid="scan-result-message"
                        className={`text-sm md:text-base mb-4 ${
                          scannedData.status === 'success'
                            ? 'text-green-700'
                            : scannedData.status === 'warning'
                            ? 'text-yellow-700'
                            : 'text-red-700'
                        }`}>
                        {scannedData.message}
                      </p>

                      {/* Visitor Info Card */}
                      {scannedData.visitorInfo && (
                        <div className="bg-white rounded-lg p-3 mb-4 w-full border border-gray-200">
                          <p className="text-sm text-gray-600 dark:text-gray-200">
                            <span className="font-medium">Name:</span> {scannedData.visitorInfo.name || 'Unknown'}
                          </p>
                          {scannedData.visitorInfo.phone && (
                            <p className="text-sm text-gray-600 dark:text-gray-200">
                              <span className="font-medium">Phone:</span> {scannedData.visitorInfo.phone}
                            </p>
                          )}
                          {scannedData.visitorInfo.host_name && (
                            <p className="text-sm text-gray-600 dark:text-gray-200">
                              <span className="font-medium">Host:</span> {scannedData.visitorInfo.host_name}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 dark:text-gray-200">
                            <span className="font-medium">Time:</span> {new Date().toLocaleTimeString()}
                          </p>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-col sm:flex-row gap-2 w-full">
                        {/* Force Check-in for unknown visitors (offline) */}
                        {scannedData.unknownVisitor && (
                          <Button
                            onClick={handleForceOfflineCheckIn}
                            variant="outline"
                            className="flex-1 border-yellow-400 text-yellow-700 hover:bg-yellow-50"
                          >
                            Queue Check-In Anyway
                          </Button>
                        )}

                        {/* Primary Action - Scan Another */}
                        <Button
                          onClick={resetScan}
                          size="lg"
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold"
                        >
                          <RefreshCw className="w-5 h-5 mr-2" />
                          Scan Another Code
                        </Button>
                      </div>

                      {/* Secondary Guidance */}
                      {scannedData.status === 'error' && (
                        <p className="text-xs text-gray-600 dark:text-gray-200 mt-3">
                          Try manual check if scanning continues to fail
                        </p>
                      )}
                      
                      {scannedData.pendingSync && (
                        <p className="text-xs text-gray-500 mt-3">
                          This check-in will be synced automatically when you're back online
                        </p>
                      )}
                    </div>
                  </Card.Content>
                </Card>
              </div>
            ) : (
              <div className="text-center space-y-4">
                {/* Test Mode Input */}
                {testMode && !isScanning && (
                  <div data-testid="test-mode-container" className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 mb-3">
                      ⚠️ Test Mode Active
                    </p>
                    <input
                      data-testid="qr-test-input"
                      type="text"
                      placeholder="Enter QR code for testing"
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && testInput.trim()) {
                          handleScan(testInput.trim());
                          setTestInput('');
                        }
                      }}
                      className="w-full p-3 border-2 border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 font-mono text-sm"
                    />
                    <p className="text-xs text-yellow-700 mt-2">
                      Press Enter to simulate QR scan
                    </p>
                  </div>
                )}

                {!isScanning && (
                  <div className="space-y-4">
                    <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4M4 8h4m0 0V4m0 4h12m0 0V4m0 4v4M4 16h4m0 0v4m0-4h12m0 0v4" />
                      </svg>
                    </div>
                    <p className="text-gray-600 dark:text-gray-200">
                      {testMode ? 'Enter QR code above or click "Start Scanning"' : 'Click "Start Scanning" to begin'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card.Content>
        </Card>

        {isScanning && (
          <QRScanner
            onScan={handleScan}
            onError={handleError}
            onClose={handleClose}
          />
        )}

        <Card>
          <Card.Header>
            <Card.Title>Manual Entry</Card.Title>
          </Card.Header>
          <Card.Content>
            <p className="text-gray-600 dark:text-gray-200 mb-4">
              If QR scanning is not available, you can manually enter visitor information.
            </p>
            <Button
              onClick={() => navigateTo('/dashboard/guard/manual-check')}
              variant="outline"
            >
              Go to Manual Check
            </Button>
          </Card.Content>
        </Card>
      </div>
    </div>
  );
};

export default ScanQR;

