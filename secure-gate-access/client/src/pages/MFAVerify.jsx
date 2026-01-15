import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../utils/apiClient';

/**
 * MFA Verification Component
 * Used during login to verify the second factor
 */
const MFAVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);

  // Get userId from location state (passed from login)
  const userId = location.state?.userId;
  const username = location.state?.username || 'your account';

  // Redirect if no userId
  React.useEffect(() => {
    if (!userId) {
      navigate('/login');
    }
  }, [userId, navigate]);

  // Handle MFA verification
  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!token || (useBackupCode ? token.length !== 8 : token.length !== 6)) {
      setError(useBackupCode ? 'Please enter an 8-character backup code' : 'Please enter a 6-digit code');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/api/mfa/verify', {
        userId,
        token,
        useBackupCode
      });

      if (response.data.success) {
        // MFA verification successful - redirect to dashboard
        navigate('/dashboard');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Verification failed';
      setError(errorMessage);
      
      // Track failed attempts
      if (attemptsLeft > 1) {
        setAttemptsLeft(attemptsLeft - 1);
      } else {
        // Too many failed attempts
        setTimeout(() => {
          navigate('/login', { state: { message: 'Too many failed attempts. Please try again.' } });
        }, 2000);
      }
      
      setToken('');
    } finally {
      setLoading(false);
    }
  };

  // Handle going back to login
  const handleCancel = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white dark:bg-slate-800 shadow-2xl rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-center">
            <div className="inline-block p-3 bg-white bg-opacity-20 rounded-full mb-3">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white">Two-Factor Authentication</h2>
            <p className="text-blue-100 mt-1 text-sm">
              Enter your verification code for {username}
            </p>
          </div>

          {/* Content */}
          <div className="px-8 py-6">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                    <p className="text-xs text-red-600 mt-1">
                      Attempts remaining: {attemptsLeft}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="mb-6 text-center">
              {!useBackupCode ? (
                <>
                  <p className="text-gray-700 dark:text-gray-200 mb-2">
                    Open your authenticator app and enter the 6-digit code
                  </p>
                  <div className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-300">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Code refreshes every 30 seconds
                  </div>
                </>
              ) : (
                <p className="text-gray-700 dark:text-gray-200">
                  Enter one of your 8-character backup codes
                </p>
              )}
            </div>

            {/* Verification Form */}
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label htmlFor="token" className="sr-only">
                  {useBackupCode ? 'Backup Code' : 'Verification Code'}
                </label>
                <input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase())}
                  maxLength={useBackupCode ? 8 : 6}
                  placeholder={useBackupCode ? 'ABCD1234' : '000000'}
                  className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg text-center text-3xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  autoComplete="off"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || (!useBackupCode && token.length !== 6) || (useBackupCode && token.length !== 8)}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-lg shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  'Verify Code'
                )}
              </button>
            </form>

            {/* Alternative Options */}
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setToken('');
                  setError('');
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors"
              >
                {useBackupCode ? (
                  '← Use authenticator code instead'
                ) : (
                  'Lost your phone? Use a backup code →'
                )}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className="w-full text-center text-sm text-gray-600 dark:text-gray-200 hover:text-gray-800 hover:underline transition-colors"
              >
                ← Back to login
              </button>
            </div>

            {/* Security Info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-start space-x-3 text-xs text-gray-600 dark:text-gray-200">
                <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-700 mb-1">Why do I need this?</p>
                  <p>Two-factor authentication adds an extra layer of security to your account by requiring a verification code in addition to your password.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-200">
          <p>
            Need help?{' '}
            <a href="/support" className="text-blue-600 hover:text-blue-800 hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default MFAVerify;
