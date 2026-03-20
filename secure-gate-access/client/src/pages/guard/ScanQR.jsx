import React, { useState, useEffect } from 'react';
import api from '../../utils/apiClient';
import logger from '../../utils/logger';

import QRScanner from '../../components/QRScanner';
import { Card, Button, PageHeader, Icon } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import offlineService from '../../services/offlineService';
import { navigateTo } from '../../utils/appNavigation';
import { extractQrTokenFromQrData, extractVisitorIdFromQrData } from '../../utils/guardScanUtils';

const ScanQR = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [error, setError] = useState(null);
  const [cameraPermission, setCameraPermission] = useState('prompt'); // 'prompt' | 'granted' | 'denied'
  const [testMode] = useState(process.env.NODE_ENV === 'test' || process.env.REACT_APP_TEST_MODE === 'true');
  const [testInput] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState(null);
  
  const { user } = useAuth();

  // Check camera permission on mount
  useEffect(() => {
    let permResult = null;
    const handleChange = () => {
      if (permResult) setCameraPermission(permResult.state);
    };

    const checkCameraPermission = async () => {
      try {
        if (navigator.permissions && navigator.permissions.query) {
          permResult = await navigator.permissions.query({ name: 'camera' });
          setCameraPermission(permResult.state);
          permResult.addEventListener('change', handleChange);
        }
      } catch {
        // permissions API not supported, rely on getUserMedia error
      }
    };
    checkCameraPermission();

    return () => {
      if (permResult) {
        permResult.removeEventListener('change', handleChange);
      }
    };
  }, []);

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
        logger.error('Failed to get pending sync count:', err);
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
    // Detect camera permission denied errors
    const permDenied = typeof errorMessage === 'string' && (
      errorMessage.toLowerCase().includes('permission denied') ||
      errorMessage.toLowerCase().includes('not allowed') ||
      errorMessage.toLowerCase().includes('notallowederror') ||
      errorMessage.toLowerCase().includes('permission dismissed')
    );
    if (permDenied) {
      setCameraPermission('denied');
    }
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
    setSyncMessage(null);
    
    try {
      const qrToken = extractQrTokenFromQrData(qrData);
      const visitorId = extractVisitorIdFromQrData(qrData);

      if (!qrToken && !visitorId) {
        setError('Invalid QR code format');
        setScannedData({ status: 'error', message: 'Invalid QR code format' });
        setIsProcessing(false);
        return;
      }

      if (isOnline) {
        // ONLINE MODE: Verify with server
        await processOnlineCheckIn({ qrData, qrToken, visitorId });
      } else {
        // OFFLINE MODE: Validate locally and queue
        await processOfflineCheckIn({ qrData, visitorId });
      }
    } catch (err) {
      setError('Failed to process QR code: ' + err.message);
      setScannedData({ status: 'error', message: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const readJsonSafely = async (response) => {
    try {
      return await response.json();
    } catch {
      return {};
    }
  };

  const processLegacyCheckIn = async (visitorId, qrData) => {
    if (!visitorId) {
      setScannedData({
        qrData,
        status: 'error',
        message: 'No visitor identifier found in QR code',
        mode: 'online'
      });
      return;
    }

    try {
      const response = await api.post(`/api/visitors/${visitorId}/check-in`);
      const result = response.data;
      setScannedData({
        qrData,
        status: 'success',
        message: 'Visitor checked in successfully!',
        visitorInfo: result.data || result,
        mode: 'online'
      });
    } catch (err) {
      const errorData = err.response?.data || {};
      setScannedData({
        qrData,
        status: 'error',
        message: errorData.message || 'Check-in failed',
        mode: 'online'
      });
    }
  };

  const processOnlineCheckIn = async ({ visitorId, qrData, qrToken }) => {
    try {
      if (qrToken) {
        try {
          const tokenResponse = await api.post('/api/qr/checkin', { qrToken });
          const result = tokenResponse.data;
          setScannedData({
            qrData,
            status: 'success',
            message: result.message || 'Visitor checked in successfully!',
            visitorInfo: result.data?.visitor || result.data || result,
            mode: 'online'
          });
          return;
        } catch (tokenErr) {
          const errorData = tokenErr.response?.data || {};

          if (tokenErr.response?.status === 428) {
            setScannedData({
              qrData,
              status: 'warning',
              message: errorData.message || 'OTP required before check-in. Use Manual Check to verify OTP first.',
              mode: 'online'
            });
            return;
          }

          if (visitorId) {
            await processLegacyCheckIn(visitorId, qrData);
            return;
          }

          setScannedData({
            qrData,
            status: 'error',
            message: errorData.message || 'Check-in failed',
            mode: 'online'
          });
          return;
        }
      }

      await processLegacyCheckIn(visitorId, qrData);
    } catch (err) {
      // Network error - fall back to offline mode
      console.warn('Online check-in failed, falling back to offline mode:', err);
      await processOfflineCheckIn({ qrData, visitorId });
    }
  };

  const processOfflineCheckIn = async ({ qrData, visitorId }) => {
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
          const queueVisitorId = localValidation.visitor_id || visitorId;
          if (!queueVisitorId) {
            setScannedData({
              qrData,
              status: 'warning',
              message: 'Visitor not found in offline cache. Connect to internet to complete check-in.',
              visitorInfo: localValidation,
              mode: 'offline'
            });
            return;
          }

          // Queue the check-in for sync
          await offlineService.queueOfflineCheckIn(
            queueVisitorId,
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
      const canQueueUnknownVisitor = Boolean(visitorId);
      setScannedData({
        qrData,
        status: 'warning',
        message: canQueueUnknownVisitor
          ? 'Visitor not found in offline cache. Check-in will be queued for verification when online.'
          : 'Visitor not found in offline cache. Connect to internet to verify tokenized QR codes.',
        mode: 'offline',
        unknownVisitor: canQueueUnknownVisitor,
        visitorId: visitorId
      });
      
    } catch (err) {
      logger.error('Offline check-in error:', err);
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
      setError(null);
      setSyncMessage(null);
      setIsSyncing(true);
      const result = await offlineService.syncPendingOperations();

      const pending = await offlineService.getPendingOfflineCheckIns();
      setPendingSyncCount(pending.length);

      if (result.success) {
        const synced = result.results?.checkIns?.synced || 0;
        const failed = result.results?.checkIns?.failed || 0;
        if (failed > 0) {
          setSyncMessage({
            tone: 'warning',
            text: `Synced ${synced} item(s), ${failed} failed.`
          });
        } else {
          setSyncMessage({
            tone: 'success',
            text: synced > 0 ? `Synced ${synced} queued check-in(s).` : 'No queued check-ins to sync.'
          });
        }
      } else {
        setError(`Sync failed${result.reason ? `: ${result.reason}` : ''}`);
      }
    } catch (err) {
      setError('Sync failed: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const resetScan = () => {
    setScannedData(null);
    setError(null);
    setSyncMessage(null);
    setIsProcessing(false);
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      setIsScanning(false);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 relative">
      <PageHeader
        title="Scan QR Code"
        subtitle="Verify digital passes"
        icon={<Icon name="QrCode" className="w-6 h-6 text-purple-600" />}
        showBack={true}
        backTo="/dashboard/guard"
        actions={
          <div className="flex items-center gap-2">
            {!isOnline && (
              <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-medium rounded-full">
                <Icon name="WifiOff" className="w-3 h-3" />
                Offline
              </span>
            )}
            {pendingSyncCount > 0 && (
              <Button
                onClick={handleSyncNow}
                disabled={!isOnline || isSyncing}
                size="xs"
                variant="ghost"
                className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 text-xs font-medium rounded-full hover:bg-orange-200 dark:hover:bg-orange-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                title={isOnline ? 'Sync pending check-ins now' : 'Connect to the internet to sync pending check-ins'}
              >
                <Icon name="CloudOff" className="w-3 h-3" />
                {isSyncing ? 'Syncing...' : `${pendingSyncCount} pending`}
              </Button>
            )}
            {testMode && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleScan(testInput)}
                disabled={!testInput}
              >
                Test Scan
              </Button>
            )}
          </div>
        }
      />
      
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8 space-y-6">
        {/* Main Content */}
        <div className="flex flex-col items-center">
          {/* Scanner View */}
          <div className="w-full max-w-sm aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl relative mb-8">
            {isScanning ? (
              <QRScanner
                onScan={handleScan}
                onError={handleError}
                className="w-full h-full object-cover"
              />
            ) : cameraPermission === 'denied' ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                  <Icon name="CameraOff" className="w-8 h-8 text-red-400" />
                </div>
                <p className="font-semibold text-red-300 mb-2">Camera Access Denied</p>
                <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                  Camera permission is required to scan QR codes. Please allow camera access in your browser settings and reload.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-800 mb-2"
                  onClick={() => navigateTo('/dashboard/guard/manual-check')}
                >
                  <Icon name="Keyboard" className="w-4 h-4 mr-1" />
                  Use Manual Entry
                </Button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
                <Icon name="QrCode" className="w-16 h-16 text-gray-500 mb-4 opacity-50" />
                <p className="text-gray-400">Camera inactive</p>
              </div>
            )}
            
            {/* Overlay UI */}
             <div className="absolute inset-0 pointer-events-none border-[30px] border-black/30 rounded-3xl">
               <div className="absolute inset-0 border-2 border-white/20 rounded-lg m-8">
                {/* Scanning Line Animation */}
                {isScanning && (
                  <div className="absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-[scan_2s_linear_infinite]"></div>
                )}
               </div>
             </div>
          </div>
          
          {/* Controls */}
          <div className="w-full max-w-sm space-y-4">
             {/* Offline Warning Banner */}
             {!isOnline && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 flex gap-2 w-full mb-4">
                <Icon name="WifiOff" className="w-5 h-5 text-yellow-600 dark:text-yellow-300 flex-shrink-0" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium">Offline Mode</p>
                  <p className="text-xs mt-1 text-yellow-700 dark:text-yellow-300">
                    Scans will be validated locally against cached data. Sync required when online.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {syncMessage && (
              <div className={`rounded-lg p-3 text-sm border ${
                syncMessage.tone === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                  : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
              }`}>
                {syncMessage.text}
              </div>
            )}
            
            <Button
              size="lg"
              className={`w-full h-14 text-lg font-medium shadow-lg transition-all ${
                isScanning 
                  ? 'bg-red-500 hover:bg-red-600 text-white border-none' 
                  : cameraPermission === 'denied'
                  ? 'bg-gray-400 hover:bg-gray-500 text-white border-none cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white border-none'
              }`}
              onClick={() => {
                if (cameraPermission === 'denied') {
                  navigateTo('/dashboard/guard/manual-check');
                } else {
                  setIsScanning(!isScanning);
                }
              }}
            >
              {isScanning ? 'Stop Scanning' : cameraPermission === 'denied' ? 'Use Manual Entry Instead' : 'Start Camera'}
            </Button>

            {/* Inline manual code entry fallback */}
            {cameraPermission === 'denied' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-3">
                  Enter visitor code or invite code manually:
                </p>
                <form 
                  className="flex flex-col sm:flex-row gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const code = e.target.elements.manualCode.value.trim();
                    if (code) {
                      processQRCode(code);
                    }
                  }}
                >
                  <input
                    name="manualCode"
                    type="text"
                    placeholder="Enter code..."
                    aria-label="Enter QR code manually"
                    className="mobile-input flex-1"
                    autoFocus
                  />
                  <Button type="submit" size="sm" variant="primary" className="min-h-[44px] w-full sm:w-auto">
                    Verify
                  </Button>
                </form>
              </div>
            )}
            
            {isProcessing && (
              <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-300 py-2">
                <Icon name="Loader2" className="w-5 h-5 animate-spin" />
                <span>Processing scan...</span>
              </div>
            )}

            {/* Manual Entry Option */}
             <div className="text-center pt-4">
                <Button 
                  onClick={() => navigateTo('/dashboard/guard/manual-check')}
                  variant="ghost"
                  size="sm"
                  className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white underline"
                >
                  Enter Code Manually
                </Button>
             </div>
          </div>
        </div>

        {/* Scan Result Card */}
        {scannedData && (
          <Card className={`border-l-4 ${
             scannedData.status === 'success'
               ? 'border-l-green-500'
               : scannedData.status === 'warning'
               ? 'border-l-yellow-500'
               : 'border-l-red-500'
          }`}>
            <Card.Content className="p-4 flex items-start gap-4">
              <div className={`p-2 rounded-full ${
                scannedData.status === 'success'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300'
                  : scannedData.status === 'warning'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-300'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300'
              }`}>
                {scannedData.status === 'success' ? <Icon name="CheckCircle" size={24} /> : 
                 scannedData.status === 'warning' ? <Icon name="AlertTriangle" size={24} /> :
                 <Icon name="XCircle" size={24} />}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-white">
                  {scannedData.status === 'success'
                    ? (scannedData.pendingSync ? 'Check-In Queued' : 'Access Granted')
                    : scannedData.status === 'warning'
                    ? 'Requires Attention'
                    : 'Access Denied'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  {scannedData.message}
                </p>
                
                {scannedData.mode === 'offline' && (
                   <div className="mt-2 flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                      <Icon name="WifiOff" size={12} />
                      <span>Offline validation active. Sync required when online.</span>
                   </div>
                )}
                
                {scannedData.pendingSync && (
                   <div className="mt-2 flex items-center gap-2 text-xs text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/20 p-2 rounded">
                      <Icon name="CloudOff" size={12} />
                      <span>Action queued for sync.</span>
                      {isOnline && (
                        <Button 
                          size="xs" 
                          variant="ghost" 
                          className="h-6 ml-auto"
                          disabled={isSyncing}
                          onClick={handleSyncNow}
                        >
                         <Icon name="RefreshCw" size={12} className={`mr-1 ${isSyncing ? 'animate-spin' : ''}`}/> {isSyncing ? 'Syncing' : 'Sync'}
                        </Button>
                      )}
                   </div>
                )}

                {scannedData.visitorInfo && (
                  <div className="mt-2 p-2 rounded bg-gray-50 dark:bg-slate-700/60 text-xs text-gray-700 dark:text-gray-200 space-y-1">
                    <p><span className="font-medium">Visitor:</span> {scannedData.visitorInfo.name || 'Unknown'}</p>
                    {scannedData.visitorInfo.host_name && (
                      <p><span className="font-medium">Host:</span> {scannedData.visitorInfo.host_name}</p>
                    )}
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {scannedData.unknownVisitor && (
                    <Button
                      onClick={handleForceOfflineCheckIn}
                      size="sm"
                      variant="outline"
                      className="border-yellow-400 text-yellow-700 dark:text-yellow-300 dark:border-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                    >
                      Queue Check-In Anyway
                    </Button>
                  )}
                  <Button
                    onClick={resetScan}
                    size="sm"
                    variant="outline"
                  >
                    <Icon name="RefreshCw" size={14} className="mr-1" />
                    Scan Another
                  </Button>
                </div>
              </div>
            </Card.Content>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ScanQR;
