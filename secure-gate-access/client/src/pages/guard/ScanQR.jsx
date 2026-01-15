import React, { useState, useEffect } from 'react';
import { navigateTo } from '../../utils/appNavigation';
import { Card, Button, PageHeader } from '../../components/ui';
import QRScanner from '../../components/QRScanner';
import { QrCode, RefreshCw, Search, CheckCircle, XCircle } from 'lucide-react';

const ScanQR = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [error, setError] = useState(null);
  const [testMode] = useState(process.env.NODE_ENV === 'test' || process.env.REACT_APP_TEST_MODE === 'true');
  const [testInput, setTestInput] = useState('');

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
    try {
      // Extract visitor ID from QR code data
      const visitorId = qrData.split('-').pop(); // Assuming format: PASS-{visitorId}-{timestamp}
      
      if (!visitorId) {
        setError('Invalid QR code format');
        return;
      }

      // Check visitor status
      const response = await fetch(`/api/visitors/${visitorId}/check-in`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setScannedData({ ...scannedData, status: 'success', message: 'Visitor checked in successfully!' });
      } else {
        const error = await response.json();
        setScannedData({ ...scannedData, status: 'error', message: error.message || 'Check-in failed' });
      }
    } catch (err) {
      setError('Failed to process QR code: ' + err.message);
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
          <Button
            onClick={() => setIsScanning(true)}
            disabled={isScanning}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <QrCode className="w-4 h-4 mr-2" />
            Start Scan
          </Button>
        }
      />
      
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      <Card>
        <Card.Content className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {scannedData ? (
            <div className="text-center space-y-4">
              {/* PHASE B5: Structured Result Card */}
              <Card 
                data-test-id="scan-result-card"
                className={`border-2 ${
                  scannedData.status === 'success' 
                    ? 'border-green-400 bg-green-50' 
                    : 'border-red-400 bg-red-50'
                }`}>
                <Card.Content className="p-4 md:p-6">
                  <div className="flex flex-col items-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                      scannedData.status === 'success'
                        ? 'bg-green-500'
                        : 'bg-red-500'
                    }`}>
                      {scannedData.status === 'success' ? (
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    
                    <h3 
                      data-test-id="scan-result-status"
                      className={`text-xl font-bold mb-2 ${
                        scannedData.status === 'success'
                          ? 'text-green-900'
                          : 'text-red-900'
                      }`}>
                      {scannedData.status === 'success' ? 'Visitor Checked In' : 'Check-in Failed'}
                    </h3>
                    
                    <p 
                      data-test-id="scan-result-message"
                      className={`text-sm md:text-base mb-4 ${
                        scannedData.status === 'success'
                          ? 'text-green-700'
                          : 'text-red-700'
                      }`}>
                      {scannedData.message}
                    </p>
                    
                    {scannedData.visitorInfo && (
                      <div className="bg-white rounded-lg p-3 mb-4 w-full border border-gray-200">
                        <p className="text-sm text-gray-600 dark:text-gray-200">
                          <span className="font-medium">Name:</span> {scannedData.visitorInfo.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-200">
                          <span className="font-medium">Time:</span> {new Date().toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                    
                    {/* Primary Action */}
                    <Button 
                      onClick={resetScan} 
                      size="lg"
                      className="w-full md:w-auto bg-blue-500 hover:bg-blue-600 text-white font-bold"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 16h4m-4 0h4m-4 0v4m-4-4h4m-4 0h4" />
                      </svg>
                      Scan Another Code
                    </Button>
                    
                    {/* Secondary Guidance */}
                    {scannedData.status === 'error' && (
                      <p className="text-xs text-gray-600 dark:text-gray-200 mt-3">
                        Try manual check if scanning continues to fail
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
                <div data-test-id="test-mode-container" className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                  <p className="text-sm font-medium text-yellow-800 mb-3">
                    ⚠️ Test Mode Active
                  </p>
                  <input
                    data-test-id="qr-test-input"
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

