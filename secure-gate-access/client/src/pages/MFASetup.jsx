import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/apiClient';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

/**
 * MFA Setup Component
 * Allows users to enable Multi-Factor Authentication (TOTP)
 */
const MFASetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, completeMfa } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState(1); // 1: Setup, 2: Verify, 3: Complete
  
  // Get message and return URL from navigation state or query params
  const searchParams = new URLSearchParams(location.search);
  const setupMessage = location.state?.message;
  const returnUrl = location.state?.returnUrl || location.state?.redirectTo || searchParams.get('returnUrl') || '/dashboard';
  
  // MFA setup data
  const [mfaData, setMfaData] = useState({
    qrCode: '',
    manualEntryKey: '',
    backupCodes: []
  });
  
  const [verificationToken, setVerificationToken] = useState('');

  // Step 1: Initialize MFA Setup
  const initializeMFA = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/api/mfa/setup', {});
      
      if (response.data.success) {
        setMfaData({
          qrCode: response.data.data.qrCode,
          manualEntryKey: response.data.data.manualEntryKey,
          backupCodes: []
        });
        setStep(2);
        setSuccess('QR Code generated! Scan it with Google Authenticator.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to initialize MFA setup');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify and Enable MFA
  const verifyAndEnable = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    if (!verificationToken || verificationToken.length !== 6) {
      setError('Please enter a valid 6-digit code');
      setLoading(false);
      return;
    }
    
    try {
      const response = await api.post('/api/mfa/verify-setup', {
        token: verificationToken
      });
      
      if (response.data.success) {
        setMfaData(prev => ({
          ...prev,
          backupCodes: response.data.data.backupCodes
        }));
        setStep(3);
        setSuccess('MFA enabled successfully! Save your backup codes.');
        // Update auth context so Login.jsx redirect-guard sees mfaEnabled=true
        if (user) {
          completeMfa({ ...user, mfaEnabled: true });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  // Download backup codes
  const downloadBackupCodes = () => {
    const codesText = mfaData.backupCodes.join('\n');
    const blob = new Blob([codesText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `secure-gate-backup-codes-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Auto-initialize on mount
  useEffect(() => {
    if (step === 1) {
      initializeMFA();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
            🔐 Enable Two-Factor Authentication
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-200">
            Add an extra layer of security to your account
          </p>
          
          {/* Setup Requirement Message */}
          {setupMessage && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                ⚠️ {setupMessage}
              </p>
            </div>
          )}
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex items-center ${step >= 1 ? 'text-blue-600' : 'text-gray-500 dark:text-gray-300'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                1
              </div>
              <span className="ml-2">Setup</span>
            </div>
            <div className="flex-1 h-1 mx-4 bg-gray-300">
              <div className={`h-full ${step >= 2 ? 'bg-blue-600' : ''} transition-all`} style={{width: step >= 2 ? '100%' : '0%'}}></div>
            </div>
            <div className={`flex items-center ${step >= 2 ? 'text-blue-600' : 'text-gray-500 dark:text-gray-300'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                2
              </div>
              <span className="ml-2">Verify</span>
            </div>
            <div className="flex-1 h-1 mx-4 bg-gray-300">
              <div className={`h-full ${step >= 3 ? 'bg-blue-600' : ''} transition-all`} style={{width: step >= 3 ? '100%' : '0%'}}></div>
            </div>
            <div className={`flex items-center ${step >= 3 ? 'text-blue-600' : 'text-gray-500 dark:text-gray-300'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-300'}`}>
                3
              </div>
              <span className="ml-2">Complete</span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 rounded" role="alert">
              <p className="font-medium">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-300 rounded" role="status">
              <p className="text-sm">{success}</p>
            </div>
          )}

          {/* Step 1: Loading */}
          {step === 1 && loading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-200">Setting up MFA...</p>
            </div>
          )}

          {/* Step 1: Error with retry */}
          {step === 1 && !loading && error && (
            <div className="text-center py-8 space-y-4">
              <p className="text-gray-600 dark:text-gray-200">MFA setup could not be initialized.</p>
              <Button
                onClick={() => { setError(''); initializeMFA(); }}
                className="min-h-[44px] bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 transition-colors font-medium"
              >
                Retry Setup
              </Button>
            </div>
          )}

          {/* Step 2: Scan QR Code */}
          {step === 2 && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Scan QR Code</h2>
              
              <div className="space-y-6">
                {/* QR Code */}
                {mfaData.qrCode && (
                  <div className="flex justify-center">
                    <img 
                      src={mfaData.qrCode} 
                      alt="MFA QR Code" 
                      className="border-4 border-gray-200 dark:border-slate-700 rounded-lg"
                      style={{ width: '250px', height: '250px' }}
                    />
                  </div>
                )}

                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">📱 Instructions:</h3>
                  <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-300 text-sm">
                    <li>Download Google Authenticator on your phone</li>
                    <li>Open the app and tap "+" or "Add account"</li>
                    <li>Select "Scan a QR code"</li>
                    <li>Scan the QR code above</li>
                    <li>Enter the 6-digit code shown in the app below</li>
                  </ol>
                </div>

                {/* Manual Entry Key */}
                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    Can't scan? Enter this code manually:
                  </p>
                  <code className="block p-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded text-center font-mono text-sm text-gray-900 dark:text-gray-100">
                    {mfaData.manualEntryKey}
                  </code>
                </div>

                {/* Verification Form */}
                <form onSubmit={verifyAndEnable} className="space-y-4">
                  <div>
                    <label htmlFor="mfa-verification-token" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Enter 6-digit code from Google Authenticator:
                    </label>
                    <input
                      id="mfa-verification-token"
                      type="text"
                      maxLength="6"
                      pattern="[0-9]{6}"
                      value={verificationToken}
                      onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg text-center text-2xl font-mono tracking-widest focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:border-blue-500"
                      required
                      autoFocus
                      aria-describedby={error ? "mfa-setup-error" : undefined}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || verificationToken.length !== 6}
                    className="w-full min-h-[44px] bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                    aria-busy={loading}
                  >
                    {loading ? 'Verifying...' : 'Verify and Enable MFA'}
                  </Button>
                </form>
              </div>
            </div>
          )}

          {/* Step 3: Backup Codes */}
          {step === 3 && (
            <div>
              <div className="text-center mb-6">
                <div className="inline-block p-3 bg-green-100 rounded-full mb-4">
                  <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">MFA Enabled Successfully!</h2>
                <p className="text-gray-600 dark:text-gray-200 mt-2">Your account is now more secure</p>
              </div>

              <div className="space-y-6">
                {/* Backup Codes */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded">
                  <h3 className="font-bold text-yellow-900 dark:text-yellow-200 mb-2">⚠️ Important: Save Your Backup Codes</h3>
                  <p className="text-yellow-800 dark:text-yellow-300 text-sm mb-4">
                    These backup codes can be used to access your account if you lose your phone.
                    Each code can only be used once. Store them in a safe place!
                  </p>
                  
                  <div className="bg-white dark:bg-slate-800 p-4 rounded border border-yellow-300 dark:border-yellow-700">
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                      {mfaData.backupCodes.map((code, index) => (
                        <div key={index} className="p-2 bg-gray-50 dark:bg-slate-700 rounded text-center text-gray-900 dark:text-gray-100">
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={downloadBackupCodes}
                    className="mt-4 w-full min-h-[44px] bg-yellow-600 text-white py-2 px-4 rounded-lg hover:bg-yellow-700 focus:ring-4 focus:ring-yellow-300 dark:focus:ring-yellow-800 transition-colors font-medium"
                    aria-label="Download backup codes as text file"
                  >
                    📥 Download Backup Codes
                  </Button>
                </div>

                {/* Next Steps */}
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">✅ What's Next?</h3>
                  <ul className="space-y-1 text-blue-800 dark:text-blue-300 text-sm">
                    <li>• Your account now requires a 6-digit code when logging in</li>
                    <li>• Open Google Authenticator to get your code</li>
                    <li>• Keep your backup codes in a safe place</li>
                    <li>• You can regenerate backup codes anytime from settings</li>
                  </ul>
                </div>

                <Button
                  onClick={() => navigate(returnUrl)}
                  className="w-full min-h-[44px] bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 dark:focus:ring-blue-800 transition-colors font-medium"
                  aria-label="Continue to dashboard"
                >
                  Continue to Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-200">
          <p>Need help? Contact support at support@securegate.com</p>
        </div>
      </div>
    </div>
  );
};

export default MFASetup;
