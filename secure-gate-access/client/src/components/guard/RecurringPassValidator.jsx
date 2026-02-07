/**
 * RecurringPassValidator Component
 * P4: Guard interface for validating recurring visitor passes
 */

import React, { useState } from 'react';
import recurringPassService from '../../services/recurringPassService';

const RecurringPassValidator = () => {
  const [credential, setCredential] = useState('');
  const [method, setMethod] = useState('pin');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleValidate = async (e) => {
    e.preventDefault();
    if (!credential.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await recurringPassService.validatePass(credential.trim(), method);
      
      if (response.valid) {
        setResult({ valid: true, pass: response.pass });
      } else {
        setResult({ valid: false, error: response.error, passInfo: response.passInfo });
      }
    } catch (err) {
      const errorData = err?.response?.data;
      if (errorData?.valid === false) {
        setResult({ valid: false, error: errorData.error, passInfo: errorData.passInfo });
      } else {
        setError(errorData?.error || 'Validation failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearResult = () => {
    setResult(null);
    setCredential('');
    setError(null);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 dark:border-slate-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">🔑 Recurring Pass Check</h2>
        <p className="text-sm text-gray-500 dark:text-gray-300">Validate daily workers & regular visitors</p>
      </div>

      <div className="p-4">
        <form onSubmit={handleValidate} className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMethod('pin')}
              className={`flex-1 py-2 rounded-md text-sm font-medium ${
                method === 'pin'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              🔢 PIN Entry
            </button>
            <button
              type="button"
              onClick={() => setMethod('qr')}
              className={`flex-1 py-2 rounded-md text-sm font-medium ${
                method === 'qr'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              📱 QR Scan
            </button>
          </div>

          <div>
            <input
              type={method === 'pin' ? 'text' : 'text'}
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              placeholder={method === 'pin' ? 'Enter 6-digit PIN' : 'Enter or scan QR token'}
              className="w-full border-gray-300 dark:border-slate-600 rounded-md text-center text-xl tracking-wider"
              maxLength={method === 'pin' ? 6 : 50}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading || !credential.trim()}
            className="w-full py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {loading ? 'Validating...' : 'Validate Pass'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">❌ {error}</p>
          </div>
        )}

        {result && (
          <div className={`mt-4 p-4 rounded-lg border ${
            result.valid 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            {result.valid ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">✅</span>
                  <span className="text-xl font-bold text-green-700">VALID PASS</span>
                </div>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Visitor:</span> {result.pass.visitorName}</p>
                  <p><span className="font-medium">Type:</span> {result.pass.passType}</p>
                  {result.pass.purpose && (
                    <p><span className="font-medium">Purpose:</span> {result.pass.purpose}</p>
                  )}
                  <p><span className="font-medium">Resident:</span> {result.pass.residentName}</p>
                  <p><span className="font-medium">Unit:</span> {result.pass.residentUnit}</p>
                  {result.pass.vehiclePlate && (
                    <p><span className="font-medium">Vehicle:</span> {result.pass.vehiclePlate}</p>
                  )}
                  <p className="text-gray-500 dark:text-gray-300">Total entries: {result.pass.totalEntries + 1}</p>
                </div>
                <p className="mt-3 text-green-700 font-medium">Entry recorded ✓</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-3xl">❌</span>
                  <span className="text-xl font-bold text-red-700">INVALID</span>
                </div>
                <p className="text-red-700">{result.error}</p>
                {result.passInfo && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-200">
                    <p>Pass holder: {result.passInfo.visitorName}</p>
                    <p>Status: {result.passInfo.status}</p>
                  </div>
                )}
              </div>
            )}
            
            <button
              onClick={clearResult}
              className="mt-4 w-full py-2 bg-gray-200 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300"
            >
              Check Another
            </button>
          </div>
        )}
      </div>

      <div className="p-3 bg-gray-50 dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 text-xs text-gray-500 dark:text-gray-300">
        💡 Recurring passes are pre-authorized by residents for regular visitors
      </div>
    </div>
  );
};

export default RecurringPassValidator;
