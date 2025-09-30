// client/src/pages/guard/ScanQR.jsx
import React, { useState } from 'react';
import { Button, Card, Input, Badge, Loading, StatusAnnouncement } from '../../components/ui';
import { useCurrentBreakpoint, getContainerClasses } from '../../utils/responsive';

export default function ScanQR() {
  const [scanning, setScanning] = useState(false);
  const [manualOtp, setManualOtp] = useState('');
  const [lastResult, setLastResult] = useState(null);
  const [processing, setProcessing] = useState(false);

  const simulateValidScan = async () => {
    setScanning(true);
    setProcessing(true);
    
    // Simulate scan processing delay
    setTimeout(() => {
      setLastResult({
        type: 'success',
        visitor: {
          name: 'John Doe',
          purpose: 'Meeting with resident',
          host: 'Alice Smith',
          validUntil: new Date(Date.now() + 3600000).toLocaleTimeString()
        },
        timestamp: new Date().toLocaleString()
      });
      setScanning(false);
      setProcessing(false);
    }, 1500);
  };

  const simulateInvalidScan = async () => {
    setScanning(true);
    setProcessing(true);
    
    setTimeout(() => {
      setLastResult({
        type: 'error',
        message: 'QR code expired or invalid',
        timestamp: new Date().toLocaleString()
      });
      setScanning(false);
      setProcessing(false);
    }, 1500);
  };

  const simulateExpiredScan = async () => {
    setScanning(true);
    setProcessing(true);
    
    setTimeout(() => {
      setLastResult({
        type: 'warning',
        message: 'Visitor pass has expired',
        visitor: {
          name: 'Jane Smith',
          expiredAt: new Date(Date.now() - 3600000).toLocaleString()
        },
        timestamp: new Date().toLocaleString()
      });
      setScanning(false);
      setProcessing(false);
    }, 1500);
  };

  const handleManualOtpCheck = () => {
    if (!manualOtp.trim()) return;
    
    setProcessing(true);
    
    // Simulate OTP validation
    setTimeout(() => {
      if (manualOtp === '123456') {
        setLastResult({
          type: 'success',
          visitor: {
            name: 'Manual Entry User',
            purpose: 'Verified by OTP',
            host: 'System',
            validUntil: new Date(Date.now() + 3600000).toLocaleTimeString()
          },
          timestamp: new Date().toLocaleString(),
          method: 'OTP'
        });
      } else {
        setLastResult({
          type: 'error',
          message: 'Invalid OTP code',
          timestamp: new Date().toLocaleString()
        });
      }
      setProcessing(false);
      setManualOtp('');
    }, 1000);
  };

  const resetScanner = () => {
    setLastResult(null);
    setScanning(false);
    setProcessing(false);
    setManualOtp('');
  };

  const breakpoint = useCurrentBreakpoint();

  return (
    <div className={`space-y-4 xs:space-y-6 ${getContainerClasses()}`}>
      {/* QR Scanner Section */}
      <Card>
        <Card.Header>
          <h2 className="text-lg xs:text-xl sm:text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <svg className="w-5 h-5 xs:w-6 xs:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4M4 8h4m0 0V4m0 4h12m0 0V4m0 4v4M4 16h4m0 0v4m0-4h12m0 0v4" />
            </svg>
            <span className="hidden xs:inline">QR Code Scanner</span>
            <span className="xs:hidden">Scanner</span>
          </h2>
        </Card.Header>
        
        <Card.Content>
          {/* Camera Placeholder */}
          <div className="mb-4">
            <div 
              className={`relative bg-gray-900 rounded-lg border-2 ${
                scanning ? 'border-green-500' : 'border-gray-300'
              } flex items-center justify-center w-full aspect-video xs:aspect-square`}
              style={{ 
                minHeight: breakpoint === 'xs' ? '200px' : '280px',
                maxHeight: breakpoint === 'xs' ? '240px' : '320px'
              }}
              role="img"
              aria-label="Camera viewfinder for QR scanning"
            >
              {scanning ? (
                <div className="text-center text-white">
                  <div className="animate-pulse">
                    <div className="w-24 h-24 border-4 border-green-500 rounded-lg mx-auto mb-4 relative">
                      <div className="absolute inset-2 border-2 border-green-500 rounded-md animate-ping"></div>
                    </div>
                    <p>Scanning QR Code...</p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p>Position QR code in camera view</p>
                  <p className="text-sm mt-1">Camera feed would appear here</p>
                </div>
              )}
              
              {/* Scan overlay */}
              {!scanning && (
                <div className="absolute inset-4 border-2 border-green-500 border-dashed rounded-lg opacity-50"></div>
              )}
            </div>
          </div>

          {/* Test Buttons */}
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3">
            <Button
              variant="primary"
              onClick={simulateValidScan}
              disabled={scanning || processing}
              loading={scanning}
              className="w-full min-h-touch"
              size={breakpoint === 'xs' ? 'sm' : 'md'}
            >
              <span className="xs:hidden">Valid</span>
              <span className="hidden xs:inline">Test Valid QR</span>
            </Button>
            
            <Button
              variant="danger"
              onClick={simulateInvalidScan}
              disabled={scanning || processing}
              className="w-full min-h-touch"
              size={breakpoint === 'xs' ? 'sm' : 'md'}
            >
              <span className="xs:hidden">Invalid</span>
              <span className="hidden xs:inline">Test Invalid QR</span>
            </Button>
            
            <Button
              variant="outline"
              onClick={simulateExpiredScan}
              disabled={scanning || processing}
              className="w-full min-h-touch xs:col-span-2 sm:col-span-1"
              size={breakpoint === 'xs' ? 'sm' : 'md'}
            >
              <span className="xs:hidden">Expired</span>
              <span className="hidden xs:inline">Test Expired QR</span>
            </Button>
          </div>
        </Card.Content>
      </Card>

      {/* Manual OTP Entry */}
      <Card>
        <Card.Header>
          <h3 className="text-base xs:text-lg font-semibold text-gray-900">Manual OTP Entry</h3>
          <p className="text-xs xs:text-sm text-gray-600">For visitors without QR codes</p>
        </Card.Header>
        
        <Card.Content>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                label="Enter OTP Code"
                value={manualOtp}
                onChange={(e) => setManualOtp(e.target.value)}
                placeholder="e.g., 123456"
                disabled={processing}
                maxLength={10}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                }
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="primary"
                onClick={handleManualOtpCheck}
                disabled={!manualOtp.trim() || processing}
                loading={processing}
              >
                Verify
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Test with OTP: <code className="bg-gray-100 px-1 rounded">123456</code>
          </p>
        </Card.Content>
      </Card>

      {/* Scan Results */}
      {lastResult && (
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {lastResult.method === 'OTP' ? 'OTP Verification' : 'Scan Result'}
              </h3>
              <Badge 
                variant={
                  lastResult.type === 'success' ? 'success' :
                  lastResult.type === 'warning' ? 'warning' : 'danger'
                }
              >
                {lastResult.type === 'success' ? 'APPROVED' :
                 lastResult.type === 'warning' ? 'EXPIRED' : 'DENIED'}
              </Badge>
            </div>
          </Card.Header>
          
          <Card.Content>
            {lastResult.type === 'success' && lastResult.visitor && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium text-green-800">Visitor:</span>
                    <span className="text-green-700">{lastResult.visitor.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-green-800">Purpose:</span>
                    <span className="text-green-700">{lastResult.visitor.purpose}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-green-800">Host:</span>
                    <span className="text-green-700">{lastResult.visitor.host}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-green-800">Valid Until:</span>
                    <span className="text-green-700">{lastResult.visitor.validUntil}</span>
                  </div>
                </div>
              </div>
            )}
            
            {lastResult.type === 'error' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700 font-medium">❌ Access Denied</p>
                <p className="text-red-600">{lastResult.message}</p>
              </div>
            )}
            
            {lastResult.type === 'warning' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 font-medium">⚠️ Pass Expired</p>
                <p className="text-yellow-700">{lastResult.message}</p>
                {lastResult.visitor && (
                  <div className="mt-2 text-sm text-yellow-600">
                    <p>Visitor: {lastResult.visitor.name}</p>
                    <p>Expired: {lastResult.visitor.expiredAt}</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Scanned at: {lastResult.timestamp}
              </p>
            </div>
          </Card.Content>
          
          <Card.Footer>
            <Button variant="outline" onClick={resetScanner} className="w-full">
              Scan Another Code
            </Button>
          </Card.Footer>
        </Card>
      )}

      <StatusAnnouncement
        message={
          processing ? (lastResult?.method === 'OTP' ? "Verifying OTP..." : "Processing scan...") :
          scanning ? "Scanning QR code..." :
          ""
        }
      />
    </div>
  );
}
