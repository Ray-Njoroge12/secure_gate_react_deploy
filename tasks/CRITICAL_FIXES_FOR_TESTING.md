# Critical Fixes Required for Test Execution

*Priority: IMMEDIATE - Must be completed before production deployment*

---

## 🔴 Issue 1: Add Test Mode Selectors

### Files to Update:

#### 1. Login.jsx
```javascript
// Add data-test-id attributes to all form elements
<form onSubmit={handleLogin} data-test-id="login-form">
  <input 
    data-test-id="login-email"
    id="email"
    name="email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className="..."
    placeholder="Email"
    required
  />
  
  <input 
    data-test-id="login-password"
    id="password"
    name="password"
    type="password"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="..."
    placeholder="Password"
    required
  />
  
  <button 
    data-test-id="login-submit"
    type="submit"
    className="..."
  >
    Login
  </button>
</form>
```

#### 2. ResidentDashboard.jsx
```javascript
// Add to primary CTA button
<Button
  data-test-id="cta-invite-visitor"
  onClick={() => navigate('/resident/add-visitor')}
  className="..."
>
  Invite Visitor
</Button>
```

#### 3. AddVisitor.jsx
```javascript
// Add to form inputs
<input
  data-test-id="visitor-name"
  name="name"
  value={formData.name}
  onChange={handleChange}
  className="..."
  placeholder="Visitor Name"
  required
/>

<input
  data-test-id="visitor-phone"
  name="phone"
  value={formData.phone}
  onChange={handleChange}
  className="..."
  placeholder="Phone Number"
  required
/>

<input
  data-test-id="visit-date"
  name="date"
  type="date"
  value={formData.date}
  onChange={handleChange}
  className="..."
  required
/>

<button
  data-test-id="submit-invite"
  type="submit"
  className="..."
>
  Send Invitation
</button>

// Add to success card
<div data-test-id="invite-success-card" className="success-card">
  <div data-test-id="invite-link">{inviteLink}</div>
  <img data-test-id="invite-qr" src={qrCode} alt="QR Code" />
</div>
```

---

## 🔴 Issue 2: Add Test Mode for QR Scanner

### File: ScanQR.jsx
```javascript
import React, { useState, useEffect } from 'react';
import { QrReader } from 'react-qr-reader';

const ScanQR = () => {
  const [scanResult, setScanResult] = useState(null);
  const [testMode] = useState(process.env.NODE_ENV === 'test' || process.env.REACT_APP_TEST_MODE === 'true');

  const handleScan = async (data) => {
    if (data) {
      setScanResult(data);
      // Process QR code
      try {
        const response = await fetch('/api/guards/scan-qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ qrCode: data })
        });
        const result = await response.json();
        setScanResult(result);
      } catch (error) {
        setScanResult({ status: 'error', message: error.message });
      }
    }
  };

  const handleError = (err) => {
    console.error(err);
    setScanResult({ status: 'error', message: 'Scanner error' });
  };

  return (
    <div className="scan-qr-container">
      <h2>Scan Visitor QR Code</h2>
      
      {/* Test Mode Input */}
      {testMode && (
        <div data-test-id="test-mode-container" className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-sm text-yellow-800 mb-2">Test Mode Active</p>
          <input
            data-test-id="qr-test-input"
            type="text"
            placeholder="Enter QR code for testing"
            className="w-full p-2 border rounded"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleScan(e.target.value);
              }
            }}
          />
        </div>
      )}

      {/* Regular QR Scanner */}
      {!testMode && (
        <QrReader
          delay={300}
          onError={handleError}
          onResult={(result, error) => {
            if (!!result) {
              handleScan(result?.text);
            }
            if (!!error) {
              handleError(error);
            }
          }}
          style={{ width: '100%' }}
        />
      )}

      {/* Result Display */}
      {scanResult && (
        <div 
          data-test-id="scan-result-card"
          className={`mt-4 p-4 rounded ${
            scanResult.status === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}
        >
          <div data-test-id="scan-result-status">{scanResult.status}</div>
          <div data-test-id="scan-result-message">{scanResult.message}</div>
        </div>
      )}
    </div>
  );
};

export default ScanQR;
```

---

## 🔴 Issue 3: Add Test Mode for Kiosk Camera

### File: SelfCheckInKiosk.jsx
```javascript
// In the photo capture step
const renderPhotoCapture = () => {
  const testMode = process.env.NODE_ENV === 'test' || process.env.REACT_APP_TEST_MODE === 'true';
  
  return (
    <div className="kiosk-photo">
      <h2>{getText('takePhoto')}</h2>
      
      {!photo ? (
        <>
          {!testMode && (
            <video ref={videoRef} className="kiosk-video" autoPlay />
          )}
          
          {testMode && (
            <div data-test-id="photo-test-mode" className="test-photo-placeholder">
              <p>Camera disabled in test mode</p>
            </div>
          )}
          
          <canvas ref={canvasRef} width="320" height="240" style={{ display: 'none' }} />
          
          <div className="kiosk-actions">
            {!testMode && (
              <button className="kiosk-btn kiosk-btn-primary" onClick={capturePhoto}>
                {getText('takePhoto')}
              </button>
            )}
            
            {testMode && (
              <button 
                data-test-id="skip-photo-test"
                className="kiosk-btn kiosk-btn-primary" 
                onClick={() => {
                  setPhoto('data:image/jpeg;base64,TEST_PHOTO_DATA');
                  nextStep();
                }}
              >
                Skip Photo (Test Mode)
              </button>
            )}
            
            <button className="kiosk-btn kiosk-btn-secondary" onClick={prevStep}>
              {getText('back')}
            </button>
          </div>
        </>
      ) : (
        <div className="photo-preview">
          <img src={photo} alt="Captured" className="kiosk-photo-preview" />
          <div className="kiosk-actions">
            <button className="kiosk-btn kiosk-btn-secondary" onClick={() => setPhoto(null)}>
              {getText('retakePhoto')}
            </button>
            <button className="kiosk-btn kiosk-btn-primary" onClick={nextStep}>
              {getText('continue')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## 🔴 Issue 4: Remove Console.log Statements

### Create a Global Logger Utility

#### File: utils/logger.js (Update existing)
```javascript
const isDevelopment = process.env.NODE_ENV === 'development';
const isTest = process.env.NODE_ENV === 'test';

const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  error: (...args) => {
    if (isDevelopment || isTest) {
      console.error(...args);
    }
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // sendToErrorTracking(args);
    }
  },
  
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  debug: (...args) => {
    if (isDevelopment && process.env.REACT_APP_DEBUG === 'true') {
      console.debug(...args);
    }
  }
};

export default logger;
```

### Replace All console.log Instances

#### Example Replacements:
```javascript
// Before:
console.log('User logged in', user);

// After:
import logger from 'utils/logger';
logger.log('User logged in', user);

// Or for errors:
// Before:
console.error('Login failed:', error);

// After:
logger.error('Login failed:', error);
```

---

## 🔴 Issue 5: Add WebSocket/Polling for Real-time Updates

### File: Create hooks/useRealTimeUpdates.js
```javascript
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const useRealTimeUpdates = (endpoint, interval = 5000) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  const fetchData = useCallback(async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const response = await fetch(endpoint, {
        credentials: 'include'
      });
      
      if (!response.ok) throw new Error('Fetch failed');
      
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, user]);

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Set up polling
    const intervalId = setInterval(fetchData, interval);

    // Cleanup
    return () => clearInterval(intervalId);
  }, [fetchData, interval]);

  return { data, loading, error, refetch: fetchData };
};

// Usage in components:
// const { data: visitors, refetch } = useRealTimeUpdates('/api/visitors/active', 3000);
```

---

## 🔴 Issue 6: Environment Variables for Testing

### File: .env.test (Create new)
```env
# Test Environment Configuration
REACT_APP_TEST_MODE=true
REACT_APP_API_URL=http://localhost:5000
REACT_APP_DEBUG=false

# Test User MFA Secrets (for TOTP generation in tests)
RESIDENT_MFA_SECRET=JBSWY3DPEHPK3PXP
GUARD_MFA_SECRET=JBSWY3DPEHPK3PXQ
ADMIN_MFA_SECRET=JBSWY3DPEHPK3PXR

# Disable certain features in test
REACT_APP_ENABLE_CAMERA=false
REACT_APP_ENABLE_QR_SCANNER=false
```

---

## 🔴 Issue 7: Package.json Updates

```json
{
  "scripts": {
    "test": "react-scripts test",
    "test:e2e": "node tasks/TEST_EXECUTION_RUNNER.js",
    "test:e2e:headless": "HEADLESS=true node tasks/TEST_EXECUTION_RUNNER.js",
    "test:coverage": "npm test -- --coverage --watchAll=false"
  },
  "devDependencies": {
    "puppeteer": "^21.0.0",
    "chai": "^4.3.10",
    "chalk": "^4.1.2",
    "otplib": "^12.0.1",
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/user-event": "^14.4.3"
  }
}
```

---

## 📋 Implementation Checklist

1. [ ] Add data-test-id attributes to all interactive elements
2. [ ] Implement test mode for QR scanner
3. [ ] Implement test mode for camera in kiosk
4. [ ] Replace all console.log with logger utility
5. [ ] Create useRealTimeUpdates hook
6. [ ] Set up .env.test configuration
7. [ ] Update package.json with test scripts
8. [ ] Run TEST_EXECUTION_RUNNER.js to validate fixes
9. [ ] Generate final test report
10. [ ] Deploy to staging for final validation

---

## 🚀 Quick Start Testing

After implementing the above fixes:

```bash
# Install test dependencies
npm install

# Run manual test suite
npm run test:e2e

# Run headless for CI/CD
npm run test:e2e:headless

# Generate coverage report
npm run test:coverage
```

---

*Estimated time to implement all fixes: 4-6 hours*  
*Critical fixes (1-4): 2-3 hours*  
*Nice-to-have (5-7): 2-3 hours*
