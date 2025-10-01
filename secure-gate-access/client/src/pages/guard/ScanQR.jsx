import React, { useState } from 'react';
import { Card, Button } from '../../components/ui';
import QRScanner from '../../components/QRScanner';

const ScanQR = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [error, setError] = useState(null);

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
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/visitors/${visitorId}/check-in`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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
      stopScanning();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">QR Code Scanner</h1>
          <p className="text-gray-600 mt-1">Scan visitor QR codes for quick check-in</p>
        </div>
        <Button
          onClick={() => setIsScanning(true)}
          disabled={isScanning}
        >
          Start Scanning
        </Button>
      </div>

      <Card>
        <Card.Content className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}

          {scannedData ? (
            <div className="text-center space-y-4">
              <div className={`p-4 rounded-md ${
                scannedData.status === 'success' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                <h3 className="font-semibold">
                  {scannedData.status === 'success' ? '✓ Success' : '✗ Error'}
                </h3>
                <p>{scannedData.message}</p>
              </div>
              <Button onClick={resetScan} variant="outline">
                Scan Another Code
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              {!isScanning && (
                <div className="space-y-4">
                  <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4M4 8h4m0 0V4m0 4h12m0 0V4m0 4v4M4 16h4m0 0v4m0-4h12m0 0v4" />
                    </svg>
                  </div>
                  <p className="text-gray-600">Click "Start Scanning" to begin</p>
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
          <p className="text-gray-600 mb-4">
            If QR scanning is not available, you can manually enter visitor information.
          </p>
          <Button 
            onClick={() => window.location.href = '/dashboard/guard/manual-check'}
            variant="outline"
          >
            Go to Manual Check
          </Button>
        </Card.Content>
      </Card>
    </div>
  );
};

export default ScanQR;